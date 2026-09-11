import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase, createServerSupabase, getAuthContext, isSuperAdmin } from "@/lib/supabase/server";
import { provisionUser } from "@/server/provisioning";

/**
 * GET/PATCH /api/v1/super/patients — every patient on the platform, as people.
 *
 * A patient with a login is one person: their account (profiles), their own
 * details (patient_profiles), and a record at each hospital that has treated
 * them (patients, joined on profile_id). A hospital record with no login — a
 * walk-in — is listed on its own and is that hospital's to edit.
 *
 * PATCH corrects a patient's personal details: name and phone on profiles,
 * the rest on patient_profiles (0079 lets a super admin update those).
 * Suspending a login is /api/v1/super/accounts.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

type HospitalRecord = {
  id: string;
  tenant_id: string;
  profile_id: string | null;
  mrn: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  created_at: string;
  tenants: { name: string } | null;
};

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const supabase = await createServerSupabase();
  const [accounts, details, records, verified] = await Promise.all([
    supabase.from("profiles")
      .select("id, full_name, email, phone, avatar_url, is_active, created_at")
      .eq("role", "patient")
      .limit(10000),
    supabase.from("patient_profiles")
      .select("profile_id, date_of_birth, gender, marital_status, national_id, address, blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relation")
      .limit(10000),
    supabase.from("patients")
      .select("id, tenant_id, profile_id, mrn, full_name, phone, email, gender, date_of_birth, created_at, tenants ( name )")
      .order("created_at", { ascending: true })
      .limit(10000),
    supabase.from("identity_documents")
      .select("profile_id")
      .eq("holder", "self")
      .eq("status", "verified")
      .limit(10000),
  ]);
  const failed = accounts.error ?? details.error ?? records.error ?? verified.error;
  if (failed) return fail(failed.message, 500);

  const detailsOf = new Map((details.data ?? []).map(d => [d.profile_id, d]));
  const verifiedIds = new Set((verified.data ?? []).map(v => v.profile_id));
  const recordsOf = new Map<string, HospitalRecord[]>();
  const walkIns: HospitalRecord[] = [];
  for (const r of (records.data ?? []) as unknown as HospitalRecord[]) {
    if (!r.profile_id) {
      walkIns.push(r);
      continue;
    }
    const list = recordsOf.get(r.profile_id);
    if (list) list.push(r);
    else recordsOf.set(r.profile_id, [r]);
  }

  const hospitalsOf = (rows: HospitalRecord[]) =>
    rows.map(r => ({ record_id: r.id, id: r.tenant_id, name: r.tenants?.name ?? "Hospital", mrn: r.mrn, since: r.created_at }));

  const people = [
    ...(accounts.data ?? []).map(a => {
      const d = detailsOf.get(a.id);
      return {
        key: a.id,
        profile_id: a.id as string | null,
        full_name: a.full_name ?? "Unnamed patient",
        email: a.email,
        phone: a.phone,
        avatar_url: a.avatar_url,
        has_login: true,
        is_active: a.is_active as boolean | null,
        verified: verifiedIds.has(a.id),
        joined_at: a.created_at,
        has_details: !!d,
        date_of_birth: d?.date_of_birth ?? null,
        gender: d?.gender ?? null,
        marital_status: d?.marital_status ?? null,
        blood_group: d?.blood_group ?? null,
        national_id: d?.national_id ?? null,
        address: d?.address ?? null,
        emergency_contact: d?.emergency_contact_name
          ? { name: d.emergency_contact_name, phone: d.emergency_contact_phone, relation: d.emergency_contact_relation }
          : null,
        hospitals: hospitalsOf(recordsOf.get(a.id) ?? []),
      };
    }),
    ...walkIns.map(r => ({
      key: `record:${r.id}`,
      profile_id: null,
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      avatar_url: null,
      has_login: false,
      is_active: null,
      verified: false,
      joined_at: r.created_at,
      has_details: false,
      date_of_birth: r.date_of_birth,
      gender: r.gender,
      marital_status: null,
      blood_group: null,
      national_id: null,
      address: null,
      emergency_contact: null,
      hospitals: hospitalsOf([r]),
    })),
  ];

  people.sort((a, b) => a.full_name.localeCompare(b.full_name));
  return json({ data: people });
};

const text = (max = 2000) => z.string().trim().max(max).transform(v => (v === "" ? null : v));
/** A select's "—" posts "", which clears the column. */
const blank = <T,>(v: T | "") => (v === "" ? null : v);

const patchSchema = z.object({
  profile_id: z.string().uuid(),
  full_name: z.string().trim().min(1, "Name is required").max(200).optional(),
  phone: text(40).optional(),
  date_of_birth: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a real date")])
    .transform(v => (v === "" ? null : v)).optional(),
  gender: z.union([z.literal(""), z.enum(["male", "female", "other"])]).transform(blank).optional(),
  marital_status: z.union([z.literal(""), z.enum(["single", "married", "divorced", "widowed"])]).transform(blank).optional(),
  blood_group: z.union([
    z.literal(""),
    z.enum(["o_positive", "o_negative", "a_positive", "a_negative", "b_positive", "b_negative", "ab_positive", "ab_negative"]),
  ]).transform(blank).optional(),
  national_id: text(40).optional(),
  address: text().optional(),
});

/**
 * POST creates a patient's own HealthFlow login — the same account they'd get
 * by signing up, belonging to no hospital until one treats them. The password
 * comes back once, for the super admin to hand over.
 *
 * provisionUser makes the auth user and its profile; the patient_profiles row
 * is provisioning too, so it goes in with the service role (a super admin has
 * no insert policy there — the patient normally creates it themselves).
 */
const createSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  phone: text(40),
  date_of_birth: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a real date")]).transform(blank),
  gender: z.union([z.literal(""), z.enum(["male", "female", "other"])]).transform(blank),
  blood_group: z.union([
    z.literal(""),
    z.enum(["o_positive", "o_negative", "a_positive", "a_negative", "b_positive", "b_negative", "ab_positive", "ab_negative"]),
  ]).transform(blank),
});

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);
  const { full_name, email, phone, ...details } = parsed.data;

  const provisioned = await provisionUser({ email, role: "patient", tenantId: null, fullName: full_name, phone });
  if (!provisioned.ok) return fail(provisioned.message, provisioned.code === "email_taken" ? 409 : 400);

  const { error } = await createAdminSupabase()
    .from("patient_profiles")
    .insert({ profile_id: provisioned.userId, ...details });
  if (error) {
    // The login works; only the extra details are missing, and the patient
    // can fill them in from their own profile.
    return json({
      data: { email: provisioned.email, password: provisioned.password },
      warning: `The login was created, but the date of birth, gender and blood group couldn't be saved: ${error.message}`,
    }, 201);
  }

  return json({ data: { email: provisioned.email, password: provisioned.password } }, 201);
};

export const PATCH = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);

  const { profile_id, full_name, phone, ...details } = parsed.data;
  const supabase = await createServerSupabase();

  const account: { full_name?: string; phone?: string | null } = {};
  if (full_name !== undefined) account.full_name = full_name;
  if (phone !== undefined) account.phone = phone;
  if (Object.keys(account).length) {
    const { data, error } = await supabase.from("profiles").update(account)
      .eq("id", profile_id).eq("role", "patient").select("id").maybeSingle();
    if (error) return fail(error.message, 400);
    if (!data) return fail("Patient not found", 404);
  }

  // Omitted keys stay undefined, and JSON drops them from the update.
  if (Object.values(details).some(v => v !== undefined)) {
    const { data, error } = await supabase.from("patient_profiles").update(details)
      .eq("profile_id", profile_id).select("profile_id").maybeSingle();
    if (error) return fail(error.message, 400);
    // No row yet: the patient has never filled in their profile. Their name
    // and phone saved; the rest has nowhere to go until they do.
    if (!data) return fail("This patient hasn't set up their profile yet, so only the name and phone can be changed.", 409);
  }

  return json({ data: { ok: true } });
};
