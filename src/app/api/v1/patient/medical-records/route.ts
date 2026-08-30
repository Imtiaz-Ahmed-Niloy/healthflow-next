import { NextResponse } from "next/server";
import { createAdminSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * /api/v1/patient/medical-records (HF-78)
 *
 * A patient's own history, assembled from what the system already knows rather
 * than from a new table. A completed appointment already carries the whole
 * chart — complaints, examination, investigation, diagnosis, medicines, advice
 * (0028) and blood pressure (0027) — so "my medical records" is a read of my
 * own completed visits, and the medicine history is those visits' medicines
 * flattened into one list.
 *
 * Read-only, deliberately. A medical record is what a clinician wrote; a
 * patient viewing it must not be able to edit it, so there is no POST or PATCH
 * here and there never should be.
 *
 * Admin client, for the reason the neighbouring appointments route documents:
 * a patient has no tenant_id, and one login can hold a `patients` row in
 * several hospitals, so tenant RLS cannot express "mine". The filter below is
 * built from ids resolved off the caller's own profile — never from anything
 * the client sent.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

type Medicine = {
  name?: string;
  dosage_form?: string;
  dose?: string;
  frequency?: string;
  days?: string;
  meal?: string;
};

/** JSONB arrives as unknown; every section is an array of plain strings. */
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

const medicines = (value: unknown): Medicine[] =>
  Array.isArray(value) ? (value.filter(v => v && typeof v === "object") as Medicine[]) : [];

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "patient") return fail("Only a patient can read their own records", 403);

  const admin = createAdminSupabase();

  const { data: myPatients, error: patientsError } = await admin
    .from("patients")
    .select("id")
    .eq("profile_id", auth.userId);
  if (patientsError) return fail(patientsError.message, 400);

  const patientIds = (myPatients ?? []).map(p => p.id);
  if (patientIds.length === 0) {
    return json({ data: { visits: [], medicines: [], counts: { visits: 0, prescriptions: 0, diagnoses: 0 } } });
  }

  // Completed visits only. A scheduled appointment is not yet a record of
  // anything, and a cancelled one never became one.
  const { data, error } = await admin
    .from("appointments")
    // One string literal, not a concatenation: supabase-js infers the row type
    // from the select text, and a concatenated one collapses to an error type.
    .select("id, scheduled_date, scheduled_time, department, notes, bp_systolic, bp_diastolic, complaints, examination, investigation, diagnosis, medicines, advice, doctors ( name, specialty ), tenants ( name )")
    .in("patient_id", patientIds)
    .eq("status", "completed")
    .order("scheduled_date", { ascending: false });

  if (error) return fail(error.message, 400);

  const visits = (data ?? []).map(row => {
    const doctor = row.doctors as { name?: string; specialty?: string } | null;
    const hospital = row.tenants as { name?: string } | null;
    return {
      id: row.id,
      date: row.scheduled_date,
      time: row.scheduled_time,
      department: row.department,
      doctor_name: doctor?.name ?? null,
      doctor_specialty: doctor?.specialty ?? null,
      hospital_name: hospital?.name ?? null,
      notes: row.notes,
      blood_pressure:
        row.bp_systolic && row.bp_diastolic ? `${row.bp_systolic}/${row.bp_diastolic} mmHg` : null,
      complaints: strings(row.complaints),
      examination: strings(row.examination),
      investigation: strings(row.investigation),
      diagnosis: strings(row.diagnosis),
      advice: strings(row.advice),
      medicines: medicines(row.medicines),
    };
  });

  // One row per prescribed medicine, newest visit first — the "what have I
  // been on" question, which no single visit answers.
  const medicineHistory = visits.flatMap(visit =>
    visit.medicines.map(m => ({
      name: m.name ?? "",
      dose: [m.dose, m.frequency, m.days].filter(Boolean).join(" · "),
      meal: m.meal ?? "",
      reason: visit.diagnosis[0] ?? visit.complaints[0] ?? "—",
      doctor: visit.doctor_name,
      date: visit.date,
      visit_id: visit.id,
    })),
  );

  return json({
    data: {
      visits,
      medicines: medicineHistory,
      counts: {
        visits: visits.length,
        prescriptions: visits.filter(v => v.medicines.length > 0).length,
        diagnoses: visits.filter(v => v.diagnosis.length > 0).length,
      },
    },
  });
};
