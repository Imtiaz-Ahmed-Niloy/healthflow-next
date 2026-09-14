import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase, createServerSupabase, getAuthContext, isSuperAdmin } from "@/lib/supabase/server";
import { parseWeek } from "@/lib/hours";
import { toChamber } from "@/lib/chambers";
import type { TablesInsert } from "@/lib/supabase/types";

/**
 * GET/PATCH /api/v1/super/doctors — every doctor on the platform, as people.
 *
 * A doctor with a login is one person with a row at each hospital they work
 * at (0077); those rows are grouped into one entry by profile_id. A row with
 * no login is a directory listing one hospital typed in, and stands alone.
 * A row with no hospital is a doctor's home row (0081): the person, before or
 * besides any hospital — never listed as one of their hospitals. A row at a
 * chamber (0088) is listed as a chamber, not a hospital; chambers are opened
 * and changed through /api/v1/chambers, not here.
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
  tenant_id: string | null;
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
  availability: string | null;
  created_at: string;
  tenants: {
    name: string;
    kind: "hospital" | "chamber";
    status: string;
    address: string | null;
    location: string | null;
    division: string | null;
    district: string | null;
    subdistrict: string | null;
    contact_phone: string | null;
  } | null;
  profiles: { is_active: boolean; email: string | null } | null;
};

const isChamber = (r: Pick<Row, "tenants">) => r.tenants?.kind === "chamber";

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const supabase = await createServerSupabase();
  const [{ data, error }, tenants] = await Promise.all([
    supabase
      .from("doctors")
      .select(
        "id, tenant_id, profile_id, name, specialty, education, bio, languages, expertise, experience_years, email, phone, photo_url, gender, bmdc_number, status, consultation_fee, availability, created_at, tenants ( name, kind, status, address, location, division, district, subdistrict, contact_phone ), profiles!doctors_profile_id_fkey ( is_active, email )",
      )
      .order("created_at", { ascending: true })
      .limit(5000),
    // The Create form's hospital picker — hospitals, not doctors' chambers.
    supabase.from("tenants").select("id, name").eq("status", "approved").eq("kind", "hospital").order("name"),
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
    hospitals: rows.flatMap(r => r.tenant_id === null || isChamber(r) ? [] : [{
      doctor_id: r.id,
      id: r.tenant_id,
      name: r.tenants?.name ?? "Hospital",
      status: r.status,
      consultation_fee: r.consultation_fee,
      availability: r.availability,
    }]),
    chambers: rows.flatMap(r => r.tenant_id === null || !r.tenants || !isChamber(r) ? [] : [
      toChamber({ ...r.tenants, id: r.tenant_id }, r),
    ]),
    home_doctor_id: rows.find(r => r.tenant_id === null)?.id ?? null,
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
  // A fresh upload's R2 key, or "" to remove the photo. The page sends it only
  // when it changed, so an older stored link is never re-validated here.
  photo_url: z.string().trim().max(500).regex(/^doctors\//, "Upload the photo again").or(z.literal(""))
    .transform(v => v || null).optional(),
});

/**
 * A week from the editor (JSON, src/lib/hours.ts), or free text. Something
 * that looks like a week but isn't one would book as no hours at all.
 */
const availability = text().refine(
  v => !v || !v.startsWith("{") || parseWeek(v) !== null,
  "Availability isn't a valid week",
);

/** One hospital the doctor works at: what it charges and when they're there. */
const hospitalSchema = z.object({
  tenant_id: z.string().uuid("Pick a hospital"),
  consultation_fee: z.union([z.literal(""), z.coerce.number().min(0)]).optional()
    .transform(v => (v === "" || v === undefined ? null : v)),
  availability: availability.optional(),
});

/**
 * POST adds a doctor — at any number of hospitals, or at none.
 *
 * The one place a tenant_id comes from a request body, and only because the
 * caller is a super admin, who has no hospital of their own to stamp and may
 * write to any of them (RLS says so too). Each hospital gets its own row with
 * its own fee and hours (0077). With no hospital, the doctor gets their home
 * row (0081): on HealthFlow, at no hospital yet, until one adds them. It has
 * no hours — a doctor's own hours are their chamber's (0088), added once they
 * have a login.
 *
 * The rows start unlinked. The page then calls /api/v1/doctors/:id/login on
 * the first — creating the login, or linking the account they already have —
 * and on the rest, which links each to that same account by email. That is
 * what makes them one person; without a login, rows at two hospitals would
 * stand as two doctors, so the page asks for one first.
 */
const createSchema = z.object({
  hospitals: z.array(hospitalSchema).max(20, "That's more hospitals than one form should add").default([])
    .refine(list => new Set(list.map(h => h.tenant_id)).size === list.length, "Each hospital can be added once"),
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("A valid email is required"),
  specialty: text(200),
  bmdc_number: text(40),
  phone: text(40),
  education: text(),
  experience_years: z.union([z.literal(""), z.coerce.number().int().min(0).max(80)])
    .transform(v => (v === "" ? null : v)),
  gender: z.union([z.literal(""), z.enum(["male", "female", "other"])]).transform(v => (v === "" ? null : v)),
  languages: text().optional(),
  expertise: text().optional(),
  bio: text().optional(),
  // The R2 object key the photo field uploaded to, never a URL (src/lib/media.ts).
  photo_url: z.string().trim().max(500).regex(/^doctors\//, "Upload the photo again").or(z.literal(""))
    .optional().transform(v => v || null),
});

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);

  const { hospitals, ...person } = parsed.data;
  const supabase = await createServerSupabase();

  if (hospitals.length) {
    const ids = hospitals.map(h => h.tenant_id);
    const { data: found, error: tenantError } = await supabase
      .from("tenants").select("id").in("id", ids).eq("kind", "hospital");
    if (tenantError) return fail(tenantError.message, 500);
    if ((found ?? []).length !== ids.length) return fail("One of those hospitals doesn't exist", 422);
  }

  // "" asks doctors_set_slug to build each slug from the name.
  const rows: TablesInsert<"doctors">[] = hospitals.length
    ? hospitals.map(h => ({
      ...person, slug: "", tenant_id: h.tenant_id,
      consultation_fee: h.consultation_fee, availability: h.availability ?? null,
    }))
    : [{ ...person, slug: "", tenant_id: null, consultation_fee: null, availability: null }];

  const { data, error } = await supabase.from("doctors").insert(rows).select("id, tenant_id");
  if (error) return fail(error.message, 400);

  // In the order the hospitals were given — the first is the one the login is made on.
  const inserted = data ?? [];
  const ordered = hospitals.length
    ? hospitals.map(h => inserted.find(r => r.tenant_id === h.tenant_id)?.id).filter((id): id is string => !!id)
    : inserted.map(r => r.id);

  return json({ data: { ids: ordered } }, 201);
};

/**
 * PATCH also carries where the doctor works, alongside who they are:
 *
 *   - `hospitals`: an existing hospital's fee and hours, per row. Each row must
 *     be one of this doctor's own — checked, not trusted.
 *   - `add_hospitals`: new hospitals, each with its fee and hours. A doctor with
 *     a login gets a row linked to it (0077's pull trigger copies their details
 *     onto it). One without a login can only be placed at a first hospital —
 *     their home row moves there; at a second, the rows would be two doctors.
 *   - `remove_hospitals`: their rows at hospitals they no longer work at. As a
 *     hospital's own removal does, this releases the hospital from their login
 *     (release_doctor_affiliation, 0077/0081) and deletes the row — so that
 *     hospital's appointments, admissions and lab orders keep their history
 *     without the link, and its shifts and performance records for them go.
 *     Unlike a hospital's, it never takes the doctor off HealthFlow: removing
 *     their last hospital leaves them a home row with their details (or their
 *     chamber, if they have one), and the login stays. A saved password moves
 *     to a row that remains.
 *
 * Chambers are rows of theirs too, but never hospitals here: they can't be
 * edited, removed or added through these fields.
 */
const editSchema = patchSchema.extend({
  hospitals: z.array(z.object({
    doctor_id: z.string().uuid(),
    consultation_fee: hospitalSchema.shape.consultation_fee,
    availability: availability.optional(),
  })).max(50).optional(),
  add_hospitals: z.array(hospitalSchema).max(20).optional()
    .refine(list => !list || new Set(list.map(h => h.tenant_id)).size === list.length, "Each hospital can be added once"),
  remove_hospitals: z.array(z.string().uuid()).max(50).optional(),
});

/** The person's own details, copied onto a home row when their last hospital goes. */
const PERSONAL = "name, specialty, education, bio, languages, expertise, experience_years, email, phone, photo_url, gender, bmdc_number";

export const PATCH = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);

  const {
    doctor_id, hospitals = [], add_hospitals: adds = [], remove_hospitals: removals = [], ...fields
  } = parsed.data;
  if (Object.keys(fields).length === 0 && !hospitals.length && !adds.length && !removals.length) {
    return fail("Nothing to update", 422);
  }

  const supabase = await createServerSupabase();

  // The person: every row on their login, or this one row when they have none.
  const { data: head, error: headError } = await supabase
    .from("doctors").select("id, profile_id, name").eq("id", doctor_id).maybeSingle();
  if (headError) return fail(headError.message, 400);
  if (!head) return fail("Doctor not found", 404);

  const { data: personRows, error: rowsError } = head.profile_id
    ? await supabase.from("doctors").select("id, tenant_id, tenants ( kind )").eq("profile_id", head.profile_id)
    : await supabase.from("doctors").select("id, tenant_id, tenants ( kind )").eq("id", head.id);
  if (rowsError) return fail(rowsError.message, 400);
  const rows = personRows ?? [];
  let hospitalRows = rows.filter(r => r.tenant_id !== null && r.tenants?.kind !== "chamber");
  const chamberRows = rows.filter(r => r.tenants?.kind === "chamber");
  let homeRow = rows.find(r => r.tenant_id === null) ?? null;

  if (removals.some(id => !hospitalRows.some(r => r.id === id))) {
    return fail("That hospital isn't one of this doctor's", 422);
  }

  if (Object.keys(fields).length) {
    // One row is enough: the sync trigger copies the person's details to the rest.
    const { error } = await supabase.from("doctors").update(fields).eq("id", doctor_id);
    if (error) return fail(error.message, 400);
  }

  // Before adding, so a doctor with no login can be moved from one hospital to another.
  for (const rowId of removals) {
    const remaining = hospitalRows.filter(r => r.id !== rowId);

    // Their last hospital: keep them on HealthFlow, with their details, at none.
    // A chamber already does that.
    if (!homeRow && remaining.length === 0 && chamberRows.length === 0) {
      const { data: person, error: readError } = await supabase.from("doctors").select(PERSONAL).eq("id", rowId).single();
      if (readError) return fail(readError.message, 400);
      const { data: made, error: homeError } = await supabase.from("doctors")
        .insert({ ...person, tenant_id: null, profile_id: head.profile_id, slug: "" })
        .select("id, tenant_id").single();
      if (homeError) return fail(`Couldn't keep them on HealthFlow: ${homeError.message}`, 400);
      homeRow = { ...made, tenants: null };
    }

    // doctor_login_secrets has no policy for signed-in users at all (0021);
    // the service role is the only way to it, as in /api/v1/doctors/:id/login.
    const admin = createAdminSupabase();
    const target = homeRow ?? remaining[0] ?? chamberRows[0] ?? null;
    if (target) {
      const { data: kept } = await admin.from("doctor_login_secrets").select("doctor_id").eq("doctor_id", target.id).maybeSingle();
      if (!kept) {
        await admin.from("doctor_login_secrets")
          .update({ doctor_id: target.id, tenant_id: target.tenant_id })
          .eq("doctor_id", rowId);
      }
    }

    // As a hospital's own removal: the login stops opening that hospital.
    // With a home row or another hospital left, the account stays.
    if (head.profile_id) {
      const { error: releaseError } = await admin.rpc("release_doctor_affiliation", { p_doctor_id: rowId });
      if (releaseError) return fail(releaseError.message, 400);
    }

    const { error: deleteError } = await supabase.from("doctors").delete().eq("id", rowId);
    if (deleteError) return fail(deleteError.message, 400);
    hospitalRows = remaining;
  }

  for (const h of hospitals) {
    if (removals.includes(h.doctor_id)) continue;
    if (!hospitalRows.some(r => r.id === h.doctor_id)) return fail("That hospital isn't one of this doctor's", 422);
    const change = {
      consultation_fee: h.consultation_fee,
      ...(h.availability !== undefined ? { availability: h.availability } : {}),
    };
    const { error } = await supabase.from("doctors").update(change).eq("id", h.doctor_id);
    if (error) return fail(error.message, 400);
  }

  if (adds.length) {
    const already = new Set(hospitalRows.map(r => r.tenant_id));
    if (adds.some(a => already.has(a.tenant_id))) return fail("They're already at one of those hospitals", 422);

    const { data: found, error: tenantError } = await supabase
      .from("tenants").select("id").in("id", adds.map(a => a.tenant_id)).eq("kind", "hospital");
    if (tenantError) return fail(tenantError.message, 500);
    if ((found ?? []).length !== adds.length) return fail("One of those hospitals doesn't exist", 422);

    if (head.profile_id) {
      // Linked to their login; the pull trigger replaces the name with theirs.
      const { error } = await supabase.from("doctors").insert(adds.map(a => ({
        name: head.name, slug: "", tenant_id: a.tenant_id, profile_id: head.profile_id,
        consultation_fee: a.consultation_fee, availability: a.availability ?? null,
      })));
      if (error) return fail(error.message, 400);

      // A doctor with no main hospital gets the first one added.
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", head.profile_id).maybeSingle();
      if (profile && !profile.tenant_id) {
        await supabase.from("profiles").update({ tenant_id: adds[0].tenant_id }).eq("id", head.profile_id);
      }
    } else {
      if (hospitalRows.length || adds.length > 1 || !homeRow) {
        return fail("Give them a login first — it's what makes them one doctor at every hospital.", 422);
      }
      // No login, no hospital: their home row becomes the doctor at this one.
      const { error } = await supabase.from("doctors").update({
        tenant_id: adds[0].tenant_id, consultation_fee: adds[0].consultation_fee, availability: adds[0].availability ?? null,
      }).eq("id", homeRow.id);
      if (error) return fail(error.message, 400);
    }
  }

  return json({ data: { ok: true } });
};
