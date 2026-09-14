import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * GET /api/v1/portal/me
 *
 * Which doctor the caller is. Every other portal route resolves this for
 * itself — `doctors.profile_id = auth.uid()`, the same two lines in five
 * files — but the browser has never had the answer, and /portal/community
 * needs it: to draw the composer's avatar, to know which reaction in a post's
 * list is yours, and to know which posts you may edit.
 *
 * It is deliberately not "the profile": a doctor's name, specialty and photo
 * live on `doctors`, and that is what the portal shows.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);

  const supabase = await createServerSupabase();
  const { data: rows, error } = await supabase
    .from("doctors")
    .select("id, tenant_id, name, specialty, education, photo_url, tenants ( name, kind, has_name, address, contact_phone )")
    .eq("profile_id", auth.userId)
    .order("created_at", { ascending: true });

  if (error) return fail(error.message, 400);

  // Not an error: a hospital admin opening a portal page is signed in and is
  // simply not a doctor. The caller decides what that means for them.
  if (!rows || rows.length === 0) return json({ data: null });

  // A doctor at several hospitals (0077) is still one person. "Which doctor
  // am I" is the row at their main hospital — the same one the community's
  // auth_doctor_id() resolves to — and the hospitals ride along for the UI.
  // A home row (0081) is no hospital — never listed, and "which doctor am I"
  // only for a doctor with no hospital yet, as auth_doctor_id() decides.
  const hospitalRows = rows.filter(r => r.tenant_id !== null);
  const main = rows.find(r => r.tenant_id && r.tenant_id === auth.tenantId) ?? hospitalRows[0] ?? rows[0];
  return json({
    data: {
      id: main.id,
      tenant_id: main.tenant_id,
      name: main.name,
      specialty: main.specialty,
      education: main.education,
      photo_url: main.photo_url,
      // Hospitals and chambers alike — every place they see patients, with
      // what a prescription's header needs for each (0091).
      hospitals: hospitalRows.map(r => ({
        doctor_id: r.id,
        id: r.tenant_id,
        name: r.tenants?.name ?? "Hospital",
        kind: r.tenants?.kind ?? "hospital",
        has_name: r.tenants?.has_name ?? true,
        address: r.tenants?.address ?? null,
        contact_phone: r.tenants?.contact_phone ?? null,
      })),
    },
  });
};
