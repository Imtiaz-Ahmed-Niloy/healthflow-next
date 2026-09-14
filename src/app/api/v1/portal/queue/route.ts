import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import { nowTimeIn, todayIn } from "@/lib/timezone";
import { myDoctorRows } from "@/server/portal/myDoctors";

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
 * "Today" is the hospital's today, in the global-settings timezone — see
 * hospitalClock below.
 *
 * Priority and consultation_started_at are 0025_appointments_queue.sql —
 * see that file for why consultation state is a separate nullable timestamp
 * rather than overloading `status` (booking status; scheduled/completed/
 * cancelled means something else entirely, see 0020_appointments.sql).
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

/**
 * Today and now on the hospital's clock: the platform timezone from global
 * settings (0057).
 *
 * Not toISOString(), which is UTC — midnight to 6am in Dhaka that is still
 * yesterday, so the queue showed nothing and a walk-in filed itself under the
 * wrong day. And not the server's own local time either, which is what this
 * used before: right on a laptop in Bangladesh, and UTC again on the droplet.
 */
const hospitalClock = async (supabase: Awaited<ReturnType<typeof createServerSupabase>>) => {
  const { data } = await supabase.from("global_settings").select("timezone").limit(1).maybeSingle();
  const timeZone = data?.timezone || "Asia/Dhaka";
  return { today: todayIn(timeZone), nowTime: `${nowTimeIn(timeZone)}:00` };
};

const minutesBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 60000);

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor can view their own queue", 403);

  const supabase = await createServerSupabase();

  let doctors;
  try {
    doctors = await myDoctorRows(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your doctor profile", 500);
  }
  if (doctors.length === 0) return fail("No doctor profile is linked to this login.", 404);

  // Every hospital this doctor works at, in one queue (0077). Each row says
  // which hospital it belongs to.
  const doctorIds = doctors.map(d => d.id);
  const hospitalOf = new Map(doctors.map(d => [d.tenant_id, d.hospital_name]));

  const date = (await hospitalClock(supabase)).today;

  // Everything today except cancelled, for the stats — a cancelled slot was
  // never really "on the schedule" from the patient's point of view.
  const { data: todayRows, error: statsError } = await supabase
    .from("appointments")
    .select("status, scheduled_time, consultation_started_at")
    .in("doctor_id", doctorIds)
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
    .select("id, tenant_id, scheduled_time, priority, consultation_started_at, notes, patients(id, full_name, date_of_birth, phone)")
    .in("doctor_id", doctorIds)
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
      hospital: { id: r.tenant_id, name: hospitalOf.get(r.tenant_id) ?? "Hospital" },
      patient: r.patients
        ? { id: r.patients.id, full_name: r.patients.full_name, date_of_birth: r.patients.date_of_birth, phone: r.patients.phone }
        : null,
    }));

  // Separate list, not folded into `queue` -- a patient already seen isn't
  // "waiting" in any sense, and the page renders them in their own section
  // at the bottom rather than mixed into the live queue.
  const { data: completedRows, error: completedError } = await supabase
    .from("appointments")
    .select("id, tenant_id, scheduled_time, consultation_started_at, notes, patients(id, full_name, date_of_birth, phone)")
    .in("doctor_id", doctorIds)
    .eq("scheduled_date", date)
    .eq("status", "completed")
    .order("consultation_started_at", { ascending: false, nullsFirst: false });
  if (completedError) return fail(completedError.message, 500);

  const completed = (completedRows ?? []).map((r) => ({
    id: r.id,
    scheduled_time: r.scheduled_time,
    reason: r.notes,
    hospital: { id: r.tenant_id, name: hospitalOf.get(r.tenant_id) ?? "Hospital" },
    patient: r.patients
      ? { id: r.patients.id, full_name: r.patients.full_name, date_of_birth: r.patients.date_of_birth, phone: r.patients.phone }
      : null,
  }));

  return json({
    data: {
      queue,
      completed,
      stats: { seen, remaining, total: rows.length, avg_wait_minutes: avgWait },
      // For the walk-in form: which hospital is this patient here at? One
      // entry for most doctors, and then the question is never asked.
      hospitals: doctors.map(d => ({ id: d.tenant_id, name: d.hospital_name })),
    },
  });
};

const walkInSchema = z.object({
  full_name: z.string().trim().min(1, "Patient name is required").max(200),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  // Optional: a name is enough to get someone into the queue. Blank arrives
  // as "" from the dialog and is stored as null, not an empty note.
  reason: z.string().trim().max(500).optional().or(z.literal("")),
  priority: z.enum(["high", "standard", "routine"]).default("standard"),
  /**
   * Which of the doctor's hospitals the walk-in is at. Checked against the
   * doctor's own rows below — never trusted as sent — and only needed when
   * they work at more than one.
   */
  hospital_id: z.string().uuid().optional(),
});

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor can add to their own queue", 403);
  // Any tenant will do — the walk-in is filed at one of the doctor's own rows
  // below. A doctor added to a hospital, or with only a chamber, can have no
  // main tenant_id at all.
  if (!auth.tenantIds.length) return fail("No hospital or chamber on this account", 403);

  const body = await request.json().catch(() => null);
  const parsed = walkInSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid walk-in details", 400);
  const { full_name, phone, reason, priority } = parsed.data;
  const date_of_birth = parsed.data.date_of_birth || undefined;
  const phoneValue = phone || undefined;
  const reasonValue = reason || null;

  const supabase = await createServerSupabase();

  let doctors;
  try {
    doctors = await myDoctorRows(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your doctor profile", 500);
  }
  if (doctors.length === 0) return fail("No doctor profile is linked to this login.", 404);

  // The doctor row at the hospital this walk-in is at: the one asked for, if
  // it is one of theirs, or their only one.
  const doctor = parsed.data.hospital_id
    ? doctors.find(d => d.tenant_id === parsed.data.hospital_id)
    : doctors.length === 1 ? doctors[0] : undefined;
  if (!doctor) {
    return fail(doctors.length > 1 ? "Pick the hospital this patient is at." : "That isn't one of your hospitals.", 400);
  }

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

  const clock = await hospitalClock(supabase);
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      tenant_id: doctor.tenant_id,
      patient_id: patientId,
      doctor_id: doctor.id,
      department: doctor.specialty,
      scheduled_date: clock.today,
      scheduled_time: clock.nowTime,
      status: "scheduled",
      priority,
      notes: reasonValue,
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

  let doctors;
  try {
    doctors = await myDoctorRows(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your doctor profile", 500);
  }
  if (doctors.length === 0) return fail("No doctor profile is linked to this login.", 404);

  const { data, error } = await supabase
    .from("appointments")
    .update({ consultation_started_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .in("doctor_id", doctors.map(d => d.id)) // never lets a doctor start another doctor's consult
    .eq("status", "scheduled")
    .select("id, consultation_started_at")
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!data) return fail("Appointment not found, or it's no longer scheduled", 404);

  return json({ data });
};
