import { NextResponse } from "next/server";
import { createAdminSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * /api/v1/patient/lab-reports
 *
 * A patient's own diagnostic lab test requests and reports from `lab_orders`.
 * Reads orders placed across any hospital the patient is registered at.
 * Read-only for patients.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "patient" && auth.role !== "super_admin") {
    return fail("Only a patient can read their own lab reports", 403);
  }

  const admin = createAdminSupabase();

  const { data: myPatients, error: patientsError } = await admin
    .from("patients")
    .select("id")
    .eq("profile_id", auth.userId);

  if (patientsError) return fail(patientsError.message, 400);

  const patientIds = (myPatients ?? []).map((p) => p.id);
  if (patientIds.length === 0) {
    return json({ data: [] });
  }

  const { data, error } = await admin
    .from("lab_orders")
    .select(
      "id, reference, test_name, status, requested_at, result, reported_at, doctors ( name, specialty ), tenants ( name, address, contact_phone )",
    )
    .in("patient_id", patientIds)
    .order("requested_at", { ascending: false });

  if (error) return fail(error.message, 400);

  const reports = (data ?? []).map((row) => {
    const doctor = row.doctors as { name?: string; specialty?: string | null } | null;
    const hospital = row.tenants as { name?: string; address?: string | null; contact_phone?: string | null } | null;

    return {
      id: row.id,
      reference: row.reference,
      test_name: row.test_name,
      status: row.status, // "pending" | "sample_collected" | "processing" | "reported"
      requested_at: row.requested_at,
      reported_at: row.reported_at,
      result: row.result,
      doctor: doctor ? { name: doctor.name, specialty: doctor.specialty ?? null } : null,
      hospital: hospital ? { name: hospital.name ?? null, address: hospital.address ?? null, phone: hospital.contact_phone ?? null } : null,
    };
  });

  return json({ data: reports });
};
