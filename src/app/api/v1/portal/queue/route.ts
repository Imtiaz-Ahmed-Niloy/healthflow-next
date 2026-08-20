import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * /api/v1/portal/queue — the doctor's live "today's patients" (the screen
 * behind /portal/queue). Outside createResourceRoute on purpose, same
 * reasoning as /api/v1/patient/appointments: this isn't CRUD on
 * `appointments`, it's three narrow doctor-only actions (today's list, add a
 * walk-in, start a consult) plus stats nothing else needs.
 *
 * Runs entirely on the user-scoped client. Unlike the patient booking route,
 * a doctor's JWT tenant_id is already their hospital's (set at provisioning
 * time — src/app/api/v1/doctors/[id]/login/route.ts), so the standard tenant
 * RLS policy (tenant_id = auth_tenant_id()) is exactly right here. No admin
 * client needed.
 *
 * RLS only scopes to *tenant*, not to *this specific doctor* — a busy
 * hospital has more than one doctor logged in at once, and one must never
 * see or touch another's queue. Every query below filters explicitly on
 * doctor_id = the caller's own doctors.id on top of RLS for that reason.
 *
 * "Today" is computed in JS, same convention as /api/v1/dashboard.
 *
 * Priority and consultation_started_at are 0025_appointments_queue.sql —
 * see that file for why consultation state is a separate nullable timestamp
 * rather than overloading `status` (booking status; scheduled/completed/
 * cancelled means something else entirely, see 0020_appointments.sql).
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const today = () => new Date().toISOString().slice(0, 10);

const nowTime = () => new Date().toTimeString().slice(0, 8); // "HH:MM:SS"

/** The caller's own doctors.id, or a 403/404 Response if there isn't one. */
const myDoctor = async (supabase: Awaited<ReturnType<typeof createServerSupabase>>, userId: string) => {
  const { data, error } = await supabase
    .from("doctors")
    .select("id, tenant_id, specialty")
    .eq("profile_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const minutesBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 60000);

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor can view their own queue", 403);

  const supabase = await createServerSupabase();

  let doctor;
  try {
    doctor = await myDoctor(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your doctor profile", 500);
  }
  if (!doctor) return fail("No doctor profile is linked to this login.", 404);

  const date = today();

  // Everything today except cancelled, for the stats — a cancelled slot was
  // never really "on the schedule" from the patient's point of view.
  const { data: todayRows, error: statsError } = await supabase
    .from("appointments")
    .select("status, scheduled_time, consultation_started_at")
    .eq("doctor_id", doctor.id)
    .eq("scheduled_date", date)
    .neq("status", "cancelled");
  if (statsError) return fail(statsError.message, 500);

  const rows = todayRows ?? [];
  const seen = rows.filter((r) => r.status === "completed").length;
  const remaining = rows.filter((r) => r.status === "scheduled").length;
  const now = new Date();
  const waitedMinutesFor = (scheduledTime: string) =>
    Math.max(0, minutesBetween(now, new Date(`${date}T${scheduledTime}`)));
  const waitingMinutes = rows
    .filter((r) => r.status === "scheduled" && !r.consultation_started_at)
    .map((r) => waitedMinutesFor(r.scheduled_time));
  const avgWait = waitingMinutes.length
    ? Math.round(waitingMinutes.reduce((a, b) => a + b, 0) / waitingMinutes.length)
    : 0;

  // The actual queue: today's still-scheduled appointments with the patient
  // attached.
  const { data: queueRows, error: queueError } = await supabase
    .from("appointments")
    .select("id, scheduled_time, priority, consultation_started_at, notes, patients(id, full_name, date_of_birth, phone)")
    .eq("doctor_id", doctor.id)
    .eq("scheduled_date", date)
    .eq("status", "scheduled")
    .order("scheduled_time", { ascending: true });
  if (queueError) return fail(queueError.message, 500);

  const priorityWeight = { high: 0, standard: 1, routine: 2 } as const;
  const queue = (queueRows ?? [])
    .slice()
    .sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority])
    .map((r) => ({
      id: r.id,
      scheduled_time: r.scheduled_time,
      priority: r.priority,
      reason: r.notes,
      in_consultation: !!r.consultation_started_at,
      waited_minutes: waitedMinutesFor(r.scheduled_time),
      patient: r.patients
        ? { id: r.patients.id, full_name: r.patients.full_name, date_of_birth: r.patients.date_of_birth, phone: r.patients.phone }
        : null,
    }));

  return json({
    data: {
      queue,
      stats: { seen, remaining, total: rows.length, avg_wait_minutes: avgWait },
    },
  });
};

const walkInSchema = z.object({
  full_name: z.string().trim().min(1, "Patient name is required").max(200),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  reason: z.string().trim().min(1, "Reason for visit is required").max(500),
  priority: z.enum(["high", "standard", "routine"]).default("standard"),
});

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor can add to their own queue", 403);
  if (!auth.tenantId) return fail("No hospital on this account", 403);

  const body = await request.json().catch(() => null);
  const parsed = walkInSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid walk-in details", 400);
  const { full_name, phone, reason, priority } = parsed.data;
  const date_of_birth = parsed.data.date_of_birth || undefined;
  const phoneValue = phone || undefined;

  const supabase = await createServerSupabase();

  let doctor;
  try {
    doctor = await myDoctor(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your doctor profile", 500);
  }
  if (!doctor) return fail("No doctor profile is linked to this login.", 404);

  // A returning walk-in with a phone already on file at this hospital reuses
  // that record rather than forking a second one with a new MRN.
  let patientId: string | null = null;
  if (phoneValue) {
    const { data, error } = await supabase
      .from("patients")
      .select("id")
      .eq("tenant_id", doctor.tenant_id)
      .eq("phone", phoneValue)
      .maybeSingle();
    if (error) return fail(error.message, 500);
    patientId = data?.id ?? null;
  }

  if (!patientId) {
    const { data, error } = await supabase
      .from("patients")
      .insert({
        tenant_id: doctor.tenant_id,
        // Trigger-generated when blank (0016_patients.sql).
        mrn: "",
        full_name,
        date_of_birth: date_of_birth ?? null,
        phone: phoneValue ?? null,
      })
      .select("id")
      .single();
    if (error) return fail(error.message, 500);
    patientId = data.id;
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      tenant_id: doctor.tenant_id,
      patient_id: patientId,
      doctor_id: doctor.id,
      department: doctor.specialty,
      scheduled_date: today(),
      scheduled_time: nowTime(),
      status: "scheduled",
      priority,
      notes: reason,
    })
    .select("id, scheduled_time, priority")
    .single();

  if (appointmentError) {
    // 23505 = appointments_doctor_slot_unique (0024) — vanishingly unlikely
    // for a walk-in stamped with the current second, but not impossible.
    if (appointmentError.code === "23505") {
      return fail("Couldn't add that walk-in right this second — try again.", 409);
    }
    return fail(appointmentError.message, 500);
  }

  return json({ data: appointment }, 201);
};

const startConsultSchema = z.object({ id: z.string().uuid("Which appointment?") });

/** Marks the start of a consultation. The only queue action a doctor takes here — completing/prescribing happens on /portal/prescription. */
export const PATCH = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor can manage their own queue", 403);

  const body = await request.json().catch(() => null);
  const parsed = startConsultSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 400);

  const supabase = await createServerSupabase();

  let doctor;
  try {
    doctor = await myDoctor(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your doctor profile", 500);
  }
  if (!doctor) return fail("No doctor profile is linked to this login.", 404);

  const { data, error } = await supabase
    .from("appointments")
    .update({ consultation_started_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("doctor_id", doctor.id) // never lets a doctor start another doctor's consult
    .eq("status", "scheduled")
    .select("id, consultation_started_at")
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!data) return fail("Appointment not found, or it's no longer scheduled", 404);

  return json({ data });
};
