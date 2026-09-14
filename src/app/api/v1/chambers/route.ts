import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext, isSuperAdmin } from "@/lib/supabase/server";
import { parseWeek } from "@/lib/hours";
import { toChamber, type ChamberTenant } from "@/lib/chambers";

/**
 * /api/v1/chambers — a doctor's own chambers (0088).
 *
 * The doctor manages theirs from the portal; the super admin anyone's, from
 * /super/doctors. Both run on the caller's own client. Writes go through the
 * 0088 functions, which check who is asking — a chamber has no hospital admin,
 * and no one else can write to one directly.
 *
 * GET lists the caller's chambers, or `?profile_id=` a doctor's for the super
 * admin. POST opens one, PATCH changes one, or closes or reopens it with
 * `{ id, open }`.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

/** The functions' codes: 42501 not yours to manage, P0002 no such chamber; the rest are sentences. */
const statusOf = (code: string | undefined) => (code === "42501" ? 403 : code === "P0002" ? 404 : 422);

export const GET = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);

  const asked = new URL(request.url).searchParams.get("profile_id");
  const owner = isSuperAdmin(auth) && asked ? asked : auth.userId;
  if (!isSuperAdmin(auth) && auth.role !== "doctor") return fail("Only a doctor has chambers", 403);

  const supabase = await createServerSupabase();
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id, name, address, location, division, district, subdistrict, contact_phone, status, has_name")
    .eq("kind", "chamber")
    .eq("owner_profile_id", owner)
    .order("created_at", { ascending: true });
  if (error) return fail(error.message, 500);

  const rows: ChamberTenant[] = tenants ?? [];
  const { data: doctors, error: doctorsError } = rows.length
    ? await supabase
        .from("doctors")
        .select("id, tenant_id, consultation_fee, availability")
        .eq("profile_id", owner)
        .in("tenant_id", rows.map(t => t.id))
    : { data: [], error: null };
  if (doctorsError) return fail(doctorsError.message, 500);

  return json({ data: rows.map(t => toChamber(t, (doctors ?? []).find(x => x.tenant_id === t.id))) });
};

const text = (max = 500) => z.string().trim().max(max).optional().transform(v => v || null);

const detailsSchema = z.object({
  // Required only for a chamber with a name — the function checks, and makes
  // one from the doctor and area for a chamber without (0091).
  name: z.string().trim().max(200).optional().default(""),
  address: text(),
  location: text(200),
  division: text(100),
  district: text(100),
  subdistrict: text(100),
  phone: text(40),
  consultation_fee: z.union([z.literal(""), z.null(), z.coerce.number().min(0, "The fee can't be negative")]).optional()
    .transform(v => (v === "" || v === undefined ? null : v)),
  // A week from the editor (src/lib/hours.ts). Booking holds patients to it.
  availability: z.string().trim().max(2000).optional().nullable()
    .refine(v => !v || parseWeek(v) !== null, "The hours aren't a valid week"),
  // Whether it has a name of its own (0091). Left out, unchanged.
  has_name: z.boolean().optional(),
});

const args = (d: z.infer<typeof detailsSchema>) => ({
  p_name: d.name,
  p_address: d.address,
  p_location: d.location,
  p_division: d.division,
  p_district: d.district,
  p_subdistrict: d.subdistrict,
  p_phone: d.phone,
  p_consultation_fee: d.consultation_fee,
  p_availability: d.availability || null,
  p_has_name: d.has_name ?? null,
});

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);

  const parsed = detailsSchema.extend({ profile_id: z.string().uuid().optional() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("create_chamber", {
    ...args(parsed.data),
    // Whose chamber — the super admin's to say. The function refuses a doctor
    // naming anyone but themselves, so this is a convenience, not the check.
    p_profile_id: isSuperAdmin(auth) ? parsed.data.profile_id ?? null : null,
  });
  if (error) return fail(error.message, statusOf(error.code));

  return json({ data: { id: data } }, 201);
};

const patchSchema = z.union([
  z.object({ id: z.string().uuid(), open: z.boolean() }),
  detailsSchema.extend({ id: z.string().uuid() }),
]);

export const PATCH = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);

  const supabase = await createServerSupabase();
  const { error } = "open" in parsed.data
    ? await supabase.rpc("set_chamber_open", { p_tenant_id: parsed.data.id, p_open: parsed.data.open })
    : await supabase.rpc("update_chamber", { p_tenant_id: parsed.data.id, ...args(parsed.data) });
  if (error) return fail(error.message, statusOf(error.code));

  return json({ data: { id: parsed.data.id } });
};
