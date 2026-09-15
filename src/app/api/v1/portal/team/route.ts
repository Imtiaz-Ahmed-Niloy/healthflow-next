import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import { myDoctorRows } from "@/server/portal/myDoctors";

/**
 * GET /api/v1/portal/team — everyone who works with this doctor, at every
 * hospital and chamber they practise at.
 *
 * Today that is the assistants a hospital assigns them (doctor_assistants,
 * 0013). A nurse or an intern joins the same list the day their table links
 * them to a doctor: add a query below that maps its rows to a TeamMember with
 * its own `role`, and the page shows them under that role with no other change.
 *
 * Runs on the doctor's own client. RLS lets them read their hospitals' staff;
 * the doctor_id filter narrows that to the people assigned to them.
 */

export type TeamRole = "assistant" | "nurse" | "intern";

export type TeamMember = {
  id: string;
  role: TeamRole;
  name: string;
  phone: string | null;
  email: string | null;
  shift: string | null;
  status: string;
  /** The hospital or chamber they work with this doctor at. */
  place: { id: string; name: string };
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor has a team", 403);

  const supabase = await createServerSupabase();

  let doctors;
  try {
    doctors = await myDoctorRows(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your doctor profile", 500);
  }
  if (doctors.length === 0) return json({ data: [], places: [] });

  const placeOf = new Map(doctors.map(d => [d.tenant_id, d.hospital_name]));

  const { data: assistants, error } = await supabase
    .from("doctor_assistants")
    .select("id, tenant_id, name, phone, email, shift, status")
    .in("doctor_id", doctors.map(d => d.id))
    .order("name", { ascending: true });
  if (error) return fail(error.message, 500);

  const members: TeamMember[] = (assistants ?? []).map(a => ({
    id: a.id,
    role: "assistant",
    name: a.name,
    phone: a.phone,
    email: a.email,
    shift: a.shift,
    status: a.status,
    place: { id: a.tenant_id, name: placeOf.get(a.tenant_id) ?? "Hospital" },
  }));

  return json({
    data: members,
    // Every place they practise, for the page's filter — even one with no one yet.
    places: [...placeOf].map(([id, name]) => ({ id, name })),
  });
};
