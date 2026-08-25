import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * GET /api/v1/portal/directory
 *
 * Real data behind /portal/directory. That page used to render three
 * hardcoded patients (Eleanor Vance, Marcus Reynolds, David Chen) with a
 * fake "High Risk" status, a fake stepped visit timeline, and vitals
 * (Heart Rate, SpO2) that don't exist anywhere in the schema.
 *
 * This is a doctor's own patient list — every patient they've ever had an
 * appointment with, one row per patient, built by grouping this doctor's
 * `appointments` (scoped by doctor_id, same posture as /portal/schedule and
 * /portal/queue) by patient_id.
 *
 * What's real and what got cut:
 *   - Blood pressure and weight/height: real (bp_systolic/diastolic per
 *     visit on appointments; weight_kg/height on patients).
 *   - Heart rate, SpO2: nothing stores these. Not included.
 *   - Conditions: the deduped set of `diagnosis` entries across every one
 *     of this patient's visits with this doctor.
 *   - Chief complaint / medications: pulled from the most recent visit that
 *     actually has content, not just the most recent visit chronologically
 *     (a freshly-scheduled, not-yet-seen visit has none yet).
 *   - "Requires Action": a real, narrow claim — this patient has an
 *     upcoming (not cancelled, not yet completed) appointment marked
 *     high-priority. Not a clinical risk score; nothing here diagnoses risk.
 *   - Visit Timeline (Patient Intake / Vitals & ECG / Doctor Consultation):
 *     there is no per-step tracking of a visit anywhere in the schema, only
 *     a single status (scheduled/completed/cancelled). Cut rather than
 *     invented steps.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

type Age = { value: number; unit: "years" | "months" | "days" };

/** Same convention as /api/v1/portal/consultation/[id]: days under 2 months, months under 2 years, years after. */
const ageFromDOB = (iso: string | null): Age | null => {
  if (!iso) return null;
  const dob = new Date(`${iso}T00:00:00`);
  const days = Math.floor((Date.now() - dob.getTime()) / 86_400_000);
  if (days < 0) return null;
  if (days < 60) return { value: days, unit: "days" };
  if (days < 730) return { value: Math.floor(days / 30.44), unit: "months" };
  return { value: Math.floor(days / 365.25), unit: "years" };
};

const asStringArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

type Medicine = { name: string; dosage_form?: string; dose: string; frequency: string; days: string; meal?: string };
const asMedicines = (v: unknown): Medicine[] => (Array.isArray(v) ? (v as Medicine[]) : []);

const myDoctor = async (supabase: Awaited<ReturnType<typeof createServerSupabase>>, userId: string) => {
  const { data, error } = await supabase
    .from("doctors")
    .select("id, tenant_id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

type PatientRow = {
  id: string;
  full_name: string;
  mrn: string;
  gender: string | null;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  blood_group: string | null;
  weight_kg: number | null;
  height_feet: number | null;
  height_inches: number | null;
};

type ApptRow = {
  id: string;
  patient_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "scheduled" | "completed" | "cancelled";
  priority: "high" | "standard" | "routine";
  department: string | null;
  notes: string | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  complaints: unknown;
  diagnosis: unknown;
  medicines: unknown;
  advice: unknown;
  patients: PatientRow | null;
};

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor can view their patient directory", 403);

  const supabase = await createServerSupabase();

  let doctor;
  try {
    doctor = await myDoctor(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your doctor profile", 500);
  }
  if (!doctor) return fail("No doctor profile is linked to this login.", 404);

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      "id, patient_id, scheduled_date, scheduled_time, status, priority, department, notes, bp_systolic, bp_diastolic, complaints, diagnosis, medicines, advice, patients(id, full_name, mrn, gender, date_of_birth, phone, email, blood_group, weight_kg, height_feet, height_inches)",
    )
    .eq("doctor_id", doctor.id)
    .order("scheduled_date", { ascending: false })
    .order("scheduled_time", { ascending: false });

  if (error) return fail(error.message, 500);

  // Group this doctor's appointments by patient. The query is already
  // sorted most-recent-first, so within each group rows[0] is the latest.
  const groups = new Map<string, { patient: PatientRow; rows: ApptRow[] }>();
  for (const row of (appointments ?? []) as unknown as ApptRow[]) {
    if (!row.patients) continue;
    const existing = groups.get(row.patient_id);
    if (existing) existing.rows.push(row);
    else groups.set(row.patient_id, { patient: row.patients, rows: [row] });
  }

  const now = Date.now();

  const data = Array.from(groups.values()).map(({ patient, rows }) => {
    const lastCompleted = rows.find((r) => r.status === "completed") ?? null;

    const upcoming = rows
      .filter((r) => r.status === "scheduled" && new Date(`${r.scheduled_date}T${r.scheduled_time}`).getTime() >= now)
      .sort((a, b) => `${a.scheduled_date}${a.scheduled_time}`.localeCompare(`${b.scheduled_date}${b.scheduled_time}`));
    const nextAppt = upcoming[0] ?? null;

    const contentSource =
      rows.find((r) => asStringArray(r.complaints).length || asStringArray(r.diagnosis).length || asMedicines(r.medicines).length) ??
      rows[0] ??
      null;

    const bpSource = rows.find((r) => r.bp_systolic != null && r.bp_diastolic != null) ?? null;

    const conditions: string[] = [];
    for (const r of rows) {
      for (const d of asStringArray(r.diagnosis)) {
        if (!conditions.includes(d)) conditions.push(d);
      }
    }

    const recentNotes = rows
      .filter((r) => r.status === "completed" && (r.notes || asStringArray(r.advice).length))
      .slice(0, 3)
      .map((r) => ({ id: r.id, scheduled_date: r.scheduled_date, department: r.department, notes: r.notes, advice: asStringArray(r.advice) }));

    return {
      id: patient.id,
      mrn: patient.mrn,
      full_name: patient.full_name,
      gender: patient.gender,
      date_of_birth: patient.date_of_birth,
      age: ageFromDOB(patient.date_of_birth),
      phone: patient.phone,
      email: patient.email,
      blood_group: patient.blood_group,
      weight_kg: patient.weight_kg,
      height_feet: patient.height_feet,
      height_inches: patient.height_inches,
      last_visit: lastCompleted?.scheduled_date ?? null,
      next_appointment: nextAppt ? { id: nextAppt.id, scheduled_date: nextAppt.scheduled_date, scheduled_time: nextAppt.scheduled_time } : null,
      high_priority: upcoming.some((r) => r.priority === "high"),
      latest_bp: bpSource ? { systolic: bpSource.bp_systolic as number, diastolic: bpSource.bp_diastolic as number } : null,
      chief_complaint: asStringArray(contentSource?.complaints),
      medications: asMedicines(contentSource?.medicines),
      conditions,
      recent_notes: recentNotes,
      open_appointment_id: nextAppt?.id ?? rows[0]?.id ?? null,
    };
  });

  // Most recently active patient first: an upcoming appointment date beats a
  // past visit date, since it's what the doctor needs to see next.
  data.sort((a, b) => (b.next_appointment?.scheduled_date ?? b.last_visit ?? "").localeCompare(a.next_appointment?.scheduled_date ?? a.last_visit ?? ""));

  return json({ data });
};
