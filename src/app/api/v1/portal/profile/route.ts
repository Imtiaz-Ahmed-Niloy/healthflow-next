import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * GET/PATCH /api/v1/portal/profile — the doctor's own profile.
 *
 * A doctor is one person with a row at each hospital they work at (0077).
 * Their personal details — name, specialty, photo, BMDC number and the rest —
 * are theirs: they edit them here once, and the 0077 sync trigger copies the
 * change onto every hospital's row. The fee, availability and status stay
 * each hospital's, shown here read-only; 0078's guard refuses a doctor who
 * tries to change them.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const PERSONAL = "name, specialty, education, bio, languages, expertise, experience_years, email, phone, photo_url, gender, bmdc_number";

/** "" from a form clears the field rather than being stored as an empty string. */
const text = (max = 2000) => z.string().trim().max(max).transform(v => (v === "" ? null : v));

const profileSchema = z.object({
  name: z.string().trim().min(1, "Your name is required").max(200),
  specialty: text(200),
  education: text(),
  bio: text(),
  languages: text(),
  expertise: text(),
  experience_years: z.union([z.literal(""), z.coerce.number().int().min(0).max(80)])
    .transform(v => (v === "" ? null : v)),
  phone: text(40),
  photo_url: text(),
  gender: z.union([z.literal(""), z.enum(["male", "female", "other"])]).transform(v => (v === "" ? null : v)),
  bmdc_number: text(40),
}).partial();

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor has a doctor profile", 403);

  const supabase = await createServerSupabase();
  const { data: rows, error } = await supabase
    .from("doctors")
    .select(`id, tenant_id, ${PERSONAL}, consultation_fee, availability, status, tenants ( name )`)
    .eq("profile_id", auth.userId)
    .order("created_at", { ascending: true });
  if (error) return fail(error.message, 500);
  if (!rows?.length) return fail("No doctor profile is linked to this login.", 404);

  // A home row (0081) holds the same details but is no hospital: it is never
  // listed below, and is "main" only for a doctor with no hospital yet.
  const hospitalRows = rows.filter(r => r.tenant_id !== null);
  const main = rows.find(r => r.tenant_id && r.tenant_id === auth.tenantId) ?? hospitalRows[0] ?? rows[0];
  return json({
    data: {
      profile: {
        name: main.name, specialty: main.specialty, education: main.education, bio: main.bio,
        languages: main.languages, expertise: main.expertise, experience_years: main.experience_years,
        email: main.email, phone: main.phone, photo_url: main.photo_url, gender: main.gender,
        bmdc_number: main.bmdc_number,
      },
      hospitals: hospitalRows.map(r => ({
        id: r.tenant_id,
        name: (r.tenants as { name?: string } | null)?.name ?? "Hospital",
        main: r.id === main.id,
        consultation_fee: r.consultation_fee,
        availability: r.availability,
        status: r.status,
      })),
    },
  });
};

export const PATCH = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor has a doctor profile", 403);

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid profile", 422);
  if (Object.keys(parsed.data).length === 0) return fail("Nothing to update", 422);

  const supabase = await createServerSupabase();
  const { data: rows, error: loadError } = await supabase
    .from("doctors")
    .select("id, tenant_id")
    .eq("profile_id", auth.userId);
  if (loadError) return fail(loadError.message, 500);
  if (!rows?.length) return fail("No doctor profile is linked to this login.", 404);

  // One row is enough: the sync trigger carries the change to the others.
  const main = rows.find(r => r.tenant_id === auth.tenantId) ?? rows[0];
  const { error } = await supabase.from("doctors").update(parsed.data).eq("id", main.id);
  if (error) return fail(error.message, 400);

  return json({ data: { ok: true } });
};
