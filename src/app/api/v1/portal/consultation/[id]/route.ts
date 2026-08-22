import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * /api/v1/portal/consultation/:id — real data behind /portal/prescription
 * (HF-57). That page used to render one hardcoded patient (Eleanor Vance,
 * "Green Valley Clinic", Dr. Julian Vane) no matter who was actually
 * signed in or which patient a doctor picked from the queue.
 *
 * `:id` is an appointments.id — the same one Queue.tsx passes when a doctor
 * clicks Start Consult / In Consult (see queue/route.ts's PATCH, which sets
 * consultation_started_at, and Queue.tsx, which then routes here with
 * ?appointment=<id>).
 *
 * Same posture as /api/v1/portal/queue: runs on the user-scoped client (a
 * doctor's JWT tenant_id is already their hospital's), and every query still
 * filters explicitly on doctor_id = the caller's own doctors.id on top of
 * tenant RLS, so one doctor can never open another doctor's patient chart by
 * guessing an appointment id in the URL.
 *
 * PATCH does one of four things, on `action`: "complete" marks the visit
 * done (0025's queue stats read off this); "update_vitals" writes weight/
 * height onto the *patient* row (0026_patients_vitals.sql); "update_patient"
 * writes date_of_birth/gender; "update_bp" writes blood pressure onto the
 * *appointment* (0027_appointments_vitals.sql) — unlike weight/height/age,
 * BP is taken fresh per visit (often by an assistant, before the doctor
 * even sees the patient), not a standing fact about the patient, so it
 * doesn't belong on `patients` the way the others do.
 *
 * Height is feet + inches (0026), not centimetres -- that's not how it's
 * read out in a Bangladeshi hospital.
 *
 * Age is never stored directly — patients only has date_of_birth. A
 * newborn's age needs to read in days or months, not "0 years", so age is
 * a derived {value, unit} the server computes off date_of_birth both ways:
 * ageFromDOB() for display (GET, and update_patient's response), and
 * dobFromAge() to turn whatever a doctor actually enters (e.g. "3 Months")
 * back into an approximate date_of_birth to store. Approximate on purpose —
 * a doctor entering "3 months" rarely knows the exact birth date, and this
 * route has no way to tell an approximate DOB from an exact one once it's
 * stored either way.
 *
 * Prescription content — complaints, examination, investigation, diagnosis,
 * medicines, advice — lives as JSONB columns directly on `appointments`
 * (0028_appointments_prescription_content.sql), same per-visit reasoning as
 * BP. "complete" now carries that content in its body and saves it in the
 * same write that flips status, so reopening an already-submitted visit
 * (e.g. Queue's "Seen Today" list) shows the real chart instead of a blank
 * one. Before submission, the client's own localStorage draft is the only
 * copy (crash recovery) — this route only ever sees it at submit time.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

type RouteContext = { params: Promise<{ id: string }> };

type Age = { value: number; unit: "years" | "months" | "days" };

/** Mirrors the `Medicine` shape the Rx builder in Prescription.tsx uses client-side. */
type PrescribedMedicine = { name: string; dosage_form: string; dose: string; frequency: string; days: string; meal: "Before Meal" | "After Meal" };
const medicineSchema = z.object({
  name: z.string(),
  // "Tablet"/"Capsule"/"Syrup"/etc -- which form of the brand was actually
  // prescribed (the same brand often comes in more than one). "" when a
  // doctor typed a name MedEx had no match for.
  dosage_form: z.string(),
  dose: z.string(),
  frequency: z.string(),
  days: z.string(),
  meal: z.enum(["Before Meal", "After Meal"]),
});

/** Display form. Days under 2 months, months under 2 years, years after that. */
const ageFromDOB = (iso: string | null): Age | null => {
  if (!iso) return null;
  const dob = new Date(`${iso}T00:00:00`);
  const days = Math.floor((Date.now() - dob.getTime()) / 86_400_000);
  if (days < 0) return null; // a future date of birth isn't a real age
  if (days < 60) return { value: days, unit: "days" };
  if (days < 730) return { value: Math.floor(days / 30.44), unit: "months" };
  return { value: Math.floor(days / 365.25), unit: "years" };
};

/** The other direction -- what a doctor enters back into a storable date_of_birth. */
const dobFromAge = (value: number, unit: Age["unit"]): string => {
  const days = unit === "days" ? value : unit === "months" ? Math.round(value * 30.44) : Math.round(value * 365.25);
  const dob = new Date(Date.now() - days * 86_400_000);
  return dob.toISOString().slice(0, 10);
};

/** Fills in dosage_form for medicines saved before that field existed, so the client's controlled Input never sees `undefined`. */
const normalizeMedicine = (m: Partial<PrescribedMedicine>): PrescribedMedicine => ({
  name: m.name ?? "",
  dosage_form: m.dosage_form ?? "",
  dose: m.dose ?? "",
  frequency: m.frequency ?? "",
  days: m.days ?? "",
  meal: m.meal ?? "After Meal",
});

const myDoctor = async (supabase: Awaited<ReturnType<typeof createServerSupabase>>, userId: string) => {
  const { data, error } = await supabase
    .from("doctors")
    .select("id, tenant_id, name, specialty, education")
    .eq("profile_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const GET = async (_request: Request, context: RouteContext) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor can open a consultation", 403);

  const { id } = await context.params;
  const supabase = await createServerSupabase();

  let doctor;
  try {
    doctor = await myDoctor(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your doctor profile", 500);
  }
  if (!doctor) return fail("No doctor profile is linked to this login.", 404);

  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .select(
      "id, patient_id, scheduled_date, department, notes, status, tenant_id, bp_systolic, bp_diastolic, complaints, examination, investigation, diagnosis, medicines, advice"
    )
    .eq("id", id)
    .eq("doctor_id", doctor.id) // never lets a doctor open another doctor's patient
    .maybeSingle();
  if (apptError) return fail(apptError.message, 500);
  if (!appointment) return fail("Consultation not found, or it isn't yours.", 404);

  const [{ data: patient, error: patientError }, { data: hospital, error: hospitalError }, { data: historyRows, error: historyError }] =
    await Promise.all([
      supabase.from("patients").select("id, full_name, gender, date_of_birth, mrn, weight_kg, height_feet, height_inches").eq("id", appointment.patient_id).maybeSingle(),
      supabase.from("tenants").select("name, address, contact_phone").eq("id", appointment.tenant_id).maybeSingle(),
      supabase
        .from("appointments")
        .select("id, scheduled_date, department, notes")
        .eq("patient_id", appointment.patient_id)
        .eq("status", "completed")
        .neq("id", appointment.id)
        .order("scheduled_date", { ascending: false })
        .limit(5),
    ]);
  if (patientError) return fail(patientError.message, 500);
  if (hospitalError) return fail(hospitalError.message, 500);
  if (historyError) return fail(historyError.message, 500);
  if (!patient) return fail("Patient record not found.", 404);

  return json({
    data: {
      hospital: hospital ?? { name: "Hospital", address: null, contact_phone: null },
      doctor: { name: doctor.name, specialty: doctor.specialty, education: doctor.education },
      patient: {
        id: patient.id,
        full_name: patient.full_name,
        gender: patient.gender,
        age: ageFromDOB(patient.date_of_birth),
        mrn: patient.mrn,
        weight_kg: patient.weight_kg,
        height_feet: patient.height_feet,
        height_inches: patient.height_inches,
      },
      appointment: {
        id: appointment.id,
        scheduled_date: appointment.scheduled_date,
        department: appointment.department,
        notes: appointment.notes,
        status: appointment.status,
        bp_systolic: appointment.bp_systolic,
        bp_diastolic: appointment.bp_diastolic,
        complaints: appointment.complaints as string[],
        examination: appointment.examination as string[],
        investigation: appointment.investigation as string[],
        diagnosis: appointment.diagnosis as string[],
        medicines: (appointment.medicines as Partial<PrescribedMedicine>[]).map(normalizeMedicine),
        advice: appointment.advice as string[],
      },
      history: (historyRows ?? []).map((h) => ({
        id: h.id,
        scheduled_date: h.scheduled_date,
        department: h.department,
        notes: h.notes,
      })),
    },
  });
};

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("complete"),
    // The whole chart, sent once at submit time -- undefined leaves a
    // section untouched (shouldn't happen from the real client, which
    // always sends all six, but a bare {action:"complete"} is still valid
    // for callers that just want to close out the visit).
    complaints: z.array(z.string()).optional(),
    examination: z.array(z.string()).optional(),
    investigation: z.array(z.string()).optional(),
    diagnosis: z.array(z.string()).optional(),
    medicines: z.array(medicineSchema).optional(),
    advice: z.array(z.string()).optional(),
  }),
  z.object({
    action: z.literal("update_vitals"),
    weight_kg: z.number().positive().nullable().optional(),
    height_feet: z.number().positive().nullable().optional(),
    height_inches: z.number().min(0).max(11).nullable().optional(),
  }),
  z.object({
    action: z.literal("update_patient"),
    // Null clears date_of_birth (age becomes unknown / "--"); an age needs
    // both fields together, so there's no separate "just the unit" case.
    age: z.object({ value: z.number().positive(), unit: z.enum(["years", "months", "days"]) }).nullable().optional(),
    gender: z.enum(["male", "female", "other"]).nullable().optional(),
  }),
  z.object({
    action: z.literal("update_bp"),
    bp_systolic: z.number().positive().nullable().optional(),
    bp_diastolic: z.number().positive().nullable().optional(),
  }),
]);

export const PATCH = async (request: Request, context: RouteContext) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor can manage their own consultation", 403);

  const body = await request.json().catch(() => ({ action: "complete" }));
  const parsed = patchSchema.safeParse(body ?? { action: "complete" });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 400);
  if (parsed.data.action === "update_vitals" && parsed.data.weight_kg === undefined && parsed.data.height_feet === undefined && parsed.data.height_inches === undefined) {
    return fail("Nothing to update.", 400);
  }
  if (parsed.data.action === "update_patient" && parsed.data.age === undefined && parsed.data.gender === undefined) {
    return fail("Nothing to update.", 400);
  }
  if (parsed.data.action === "update_bp" && parsed.data.bp_systolic === undefined && parsed.data.bp_diastolic === undefined) {
    return fail("Nothing to update.", 400);
  }

  const { id } = await context.params;
  const supabase = await createServerSupabase();

  let doctor;
  try {
    doctor = await myDoctor(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your doctor profile", 500);
  }
  if (!doctor) return fail("No doctor profile is linked to this login.", 404);

  // Both branches touch a row scoped to this doctor's own appointment, so
  // load it once up front.
  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .select("id, patient_id")
    .eq("id", id)
    .eq("doctor_id", doctor.id)
    .maybeSingle();
  if (apptError) return fail(apptError.message, 500);
  if (!appointment) return fail("Consultation not found, or it isn't yours.", 404);

  if (parsed.data.action === "complete") {
    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "completed",
        ...(parsed.data.complaints !== undefined ? { complaints: parsed.data.complaints } : {}),
        ...(parsed.data.examination !== undefined ? { examination: parsed.data.examination } : {}),
        ...(parsed.data.investigation !== undefined ? { investigation: parsed.data.investigation } : {}),
        ...(parsed.data.diagnosis !== undefined ? { diagnosis: parsed.data.diagnosis } : {}),
        ...(parsed.data.medicines !== undefined ? { medicines: parsed.data.medicines } : {}),
        ...(parsed.data.advice !== undefined ? { advice: parsed.data.advice } : {}),
      })
      .eq("id", id)
      .eq("status", "scheduled")
      .select("id, status")
      .maybeSingle();

    if (error) return fail(error.message, 500);
    if (!data) return fail("Consultation not found, or it's already finished.", 404);

    // Usage counts (0029_doctor_medicine_usage.sql, for the picker's "most
    // used" list) are NOT recorded here -- that happens the moment a
    // medicine is added to the Rx (POST /api/v1/portal/medicines, called
    // from saveMedicine), not on final submit. Doing it again here would
    // double-count every medicine already on this chart.

    return json({ data });
  }

  if (parsed.data.action === "update_vitals") {
    // A real measurement, written onto the patient -- it outlives this one
    // visit, same as gender or MRN. Undefined means "leave alone"; explicit
    // null means "clear it" -- same convention as the appointments PATCH routes.
    const { data, error } = await supabase
      .from("patients")
      .update({
        ...(parsed.data.weight_kg !== undefined ? { weight_kg: parsed.data.weight_kg } : {}),
        ...(parsed.data.height_feet !== undefined ? { height_feet: parsed.data.height_feet } : {}),
        ...(parsed.data.height_inches !== undefined ? { height_inches: parsed.data.height_inches } : {}),
      })
      .eq("id", appointment.patient_id)
      .select("id, weight_kg, height_feet, height_inches")
      .maybeSingle();

    if (error) return fail(error.message, 500);
    if (!data) return fail("Patient record not found.", 404);

    return json({ data });
  }

  if (parsed.data.action === "update_bp") {
    // Unlike weight/height, this writes onto the appointment, not the
    // patient -- see the file header for why.
    const { data, error } = await supabase
      .from("appointments")
      .update({
        ...(parsed.data.bp_systolic !== undefined ? { bp_systolic: parsed.data.bp_systolic } : {}),
        ...(parsed.data.bp_diastolic !== undefined ? { bp_diastolic: parsed.data.bp_diastolic } : {}),
      })
      .eq("id", id)
      .eq("doctor_id", doctor.id)
      .select("id, bp_systolic, bp_diastolic")
      .maybeSingle();

    if (error) return fail(error.message, 500);
    if (!data) return fail("Consultation not found, or it isn't yours.", 404);

    return json({ data });
  }

  // update_patient: age has nowhere of its own to live -- it's converted to
  // an approximate date_of_birth (dobFromAge) and stored there, same as
  // every other screen reads a patient's age off date_of_birth. Undefined
  // means "leave alone"; explicit null clears it (age/gender becomes
  // unknown again).
  const { data, error } = await supabase
    .from("patients")
    .update({
      ...(parsed.data.age !== undefined
        ? { date_of_birth: parsed.data.age ? dobFromAge(parsed.data.age.value, parsed.data.age.unit) : null }
        : {}),
      ...(parsed.data.gender !== undefined ? { gender: parsed.data.gender } : {}),
    })
    .eq("id", appointment.patient_id)
    .select("id, date_of_birth, gender")
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!data) return fail("Patient record not found.", 404);

  return json({ data: { id: data.id, gender: data.gender, age: ageFromDOB(data.date_of_birth) } });
};
