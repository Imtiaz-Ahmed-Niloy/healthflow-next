import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const myDoctor = async (supabase: Awaited<ReturnType<typeof createServerSupabase>>, userId: string) => {
  const { data, error } = await supabase
    .from("doctors")
    .select("id, tenant_id, specialty")
    .eq("profile_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor can view their schedule", 403);

  const supabase = await createServerSupabase();

  let doctor;
  try {
    doctor = await myDoctor(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your doctor profile", 500);
  }
  if (!doctor) return fail("No doctor profile is linked to this login.", 404);

  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("id, scheduled_date, scheduled_time, priority, consultation_started_at, notes, status, patients(id, full_name, date_of_birth, phone)")
    .eq("doctor_id", doctor.id)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });

  if (appointmentsError) return fail(appointmentsError.message, 500);

  return json({
    data: appointments.map((r) => ({
      id: r.id,
      scheduled_date: r.scheduled_date,
      scheduled_time: r.scheduled_time,
      priority: r.priority,
      reason: r.notes,
      status: r.status,
      in_consultation: !!r.consultation_started_at,
      patient: r.patients
        ? { id: r.patients.id, full_name: r.patients.full_name, date_of_birth: r.patients.date_of_birth, phone: r.patients.phone }
        : null,
    })),
  });
};
