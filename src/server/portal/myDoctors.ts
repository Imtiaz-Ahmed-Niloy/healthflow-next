import type { createServerSupabase } from "@/lib/supabase/server";

/**
 * Every `doctors` row on this login — the doctor at each hospital they work
 * at (0077).
 *
 * The portal used to look up ONE row with maybeSingle(), which is right for a
 * doctor at one hospital and throws "multiple rows" the moment a second
 * hospital adds them. Every portal route now asks for all of them and works
 * across the lot: a queue is every hospital's patients, labelled; a
 * consultation is allowed when its doctor_id is any of these.
 *
 * Runs on the caller's own client. RLS already limits it to the hospitals in
 * their token, and the profile_id filter to themselves.
 *
 * Hospital rows only: a doctor's home row (0081) is the person, not a job —
 * no queue, no consultations, nothing to label.
 */

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

export type MyDoctorRow = {
  id: string;
  tenant_id: string;
  name: string;
  specialty: string | null;
  education: string | null;
  hospital_name: string;
};

export const myDoctorRows = async (supabase: Supabase, userId: string): Promise<MyDoctorRow[]> => {
  const { data, error } = await supabase
    .from("doctors")
    .select("id, tenant_id, name, specialty, education, tenants ( name )")
    .eq("profile_id", userId)
    .not("tenant_id", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).flatMap(row => row.tenant_id === null ? [] : [{
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    specialty: row.specialty,
    education: row.education,
    hospital_name: (row.tenants as { name?: string } | null)?.name ?? "Hospital",
  }]);
};
