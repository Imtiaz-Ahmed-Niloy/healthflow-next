import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext, isSuperAdmin } from "@/lib/supabase/server";

/**
 * GET/PATCH /api/v1/super/doctors — every doctor on the platform, as people.
 *
 * A doctor with a login is one person with a row at each hospital they work
 * at (0077); those rows are grouped into one entry by profile_id. A row with
 * no login is a directory listing one hospital typed in, and stands alone.
 *
 * PATCH edits a doctor's personal details. Written to one row — the 0077 sync
 * trigger copies it to the rest — and a super admin passes the guard that
 * otherwise keeps those details the doctor's own. Suspending a login is
 * /api/v1/super/accounts.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

type Row = {
  id: string;
  tenant_id: string;
  profile_id: string | null;
  name: string;
  specialty: string | null;
  education: string | null;
  bio: string | null;
  languages: string | null;
  expertise: string | null;
  experience_years: number | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  gender: string | null;
  bmdc_number: string | null;
  status: string;
  consultation_fee: number | null;
  created_at: string;
  tenants: { name: string } | null;
  profiles: { is_active: boolean; email: string | null } | null;
};

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const supabase = await createServerSupabase();
  const [{ data, error }, tenants] = await Promise.all([
    supabase
      .from("doctors")
      .select(
        "id, tenant_id, profile_id, name, specialty, education, bio, languages, expertise, experience_years, email, phone, photo_url, gender, bmdc_number, status, consultation_fee, created_at, tenants ( name ), profiles!doctors_profile_id_fkey ( is_active, email )",
      )
      .order("created_at", { ascending: true })
      .limit(5000),
    // The Create form's hospital picker.
    supabase.from("tenants").select("id, name").eq("status", "approved").order("name"),
  ]);
  if (error) return fail(error.message, 500);
  if (tenants.error) return fail(tenants.error.message, 500);

  const people = new Map<string, { head: Row; rows: Row[] }>();
  for (const row of (data ?? []) as unknown as Row[]) {
    const key = row.profile_id ?? `row:${row.id}`;
    const person = people.get(key);
    if (person) person.rows.push(row);
    else people.set(key, { head: row, rows: [row] });
  }

  const result = [...people.entries()].map(([key, { head, rows }]) => ({
    key,
    profile_id: head.profile_id,
    // The oldest row is the one to edit; the sync trigger fans it out.
    doctor_id: head.id,
    name: head.name,
    specialty: head.specialty,
    education: head.education,
    bio: head.bio,
    languages: head.languages,
    expertise: head.expertise,
    experience_years: head.experience_years,
    email: head.profiles?.email ?? head.email,
    phone: head.phone,
    photo_url: head.photo_url,
    gender: head.gender,
    bmdc_number: head.bmdc_number,
    has_login: !!head.profile_id,
    is_active: head.profile_id ? head.profiles?.is_active ?? true : null,
    joined_at: head.created_at,
    hospitals: rows.map(r => ({
      doctor_id: r.id,
      id: r.tenant_id,
      name: r.tenants?.name ?? "Hospital",
      status: r.status,
      consultation_fee: r.consultation_fee,
    })),
  }));

  result.sort((a, b) => a.name.localeCompare(b.name));
  return json({ data: result, hospitals: tenants.data ?? [] });
};

const text = (max = 2000) => z.string().trim().max(max).transform(v => (v === "" ? null : v));

const patchSchema = z.object({
  doctor_id: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  specialty: text(200).optional(),
  education: text().optional(),
  bio: text().optional(),
  languages: text().optional(),
  expertise: text().optional(),
  experience_years: z.union([z.literal(""), z.coerce.number().int().min(0).max(80)])
    .transform(v => (v === "" ? null : v)).optional(),
  phone: text(40).optional(),
  gender: z.union([z.literal(""), z.enum(["male", "female", "other"])]).transform(v => (v === "" ? null : v)).optional(),
  bmdc_number: text(40).optional(),
});

/**
 * POST adds a doctor to a hospital.
 *
 * The one place a tenant_id comes from a request body, and only because the
 * caller is a super admin, who has no hospital of their own to stamp and may
 * write to any of them (RLS says so too). The row is a directory listing;
 * the page then calls /api/v1/doctors/:id/login, which either links a doctor
 * who already has a HealthFlow login (matched by email or BMDC) or creates one.
 */
const createSchema = z.object({
  tenant_id: z.string().uuid("Pick a hospital"),
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("A valid email is required"),
  specialty: text(200),
  bmdc_number: text(40),
  phone: text(40),
  education: text(),
  experience_years: z.union([z.literal(""), z.coerce.number().int().min(0).max(80)])
    .transform(v => (v === "" ? null : v)),
  gender: z.union([z.literal(""), z.enum(["male", "female", "other"])]).transform(v => (v === "" ? null : v)),
  consultation_fee: z.union([z.literal(""), z.coerce.number().min(0)]).transform(v => (v === "" ? null : v)),
});

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);

  const supabase = await createServerSupabase();
  const { data: tenant } = await supabase.from("tenants").select("id").eq("id", parsed.data.tenant_id).maybeSingle();
  if (!tenant) return fail("That hospital doesn't exist", 422);

  // "" asks doctors_set_slug to build the slug from the name.
  const { data, error } = await supabase.from("doctors").insert({ ...parsed.data, slug: "" }).select("id").single();
  if (error) return fail(error.message, 400);

  return json({ data: { id: data.id } }, 201);
};

export const PATCH = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);

  const { doctor_id, ...fields } = parsed.data;
  if (Object.keys(fields).length === 0) return fail("Nothing to update", 422);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("doctors").update(fields).eq("id", doctor_id).select("id").maybeSingle();
  if (error) return fail(error.message, 400);
  if (!data) return fail("Doctor not found", 404);

  return json({ data: { ok: true } });
};
