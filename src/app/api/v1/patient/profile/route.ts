import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/types";

/**
 * /api/v1/patient/profile (HF-79, rebuilt on 0066)
 *
 * The patient's OWN record: their details in `patient_profiles`, the name and
 * contact on `profiles`, and their standing clinical facts in
 * `patient_history` — allergies, chronic illnesses, medications, procedures.
 *
 * This used to read and write `patients`, which is a hospital's record of a
 * person and needs a tenant. The effect was that a patient who had never
 * booked saw a blank profile they could not save: "You do not have a patient
 * record yet". A date of birth is not something a hospital gives you, so 0066
 * moved the personal record onto the login and left `patients` as what it
 * always was — one row per hospital that has registered you, holding that
 * hospital's MRN and its own clinical file.
 *
 * No admin client any more, which is the nicer half of the change. These rows
 * belong to the caller, so RLS can express "mine" directly (`profile_id =
 * auth.uid()`) and this route runs as the person asking. Nothing here chooses
 * a row from anything the client sent.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

/** Treats "" from a form as "clear this field". */
const blankToNull = (value: unknown) => (value === "" ? null : value);
const optionalText = z.preprocess(blankToNull, z.string().trim().max(500).nullable().optional());

/** What lives on `profiles`: who you are and how to reach you. */
const identitySchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(200).optional(),
  /** An R2 object key from /api/v1/uploads, never a URL — see src/lib/media.ts. */
  avatar_url: z.preprocess(blankToNull, z.string().trim().max(300).nullable().optional()),
  email: z.preprocess(blankToNull, z.string().trim().email("That email does not look right").nullable().optional()),
  phone: optionalText,
});

/** What lives on `patient_profiles`: the rest of the person. */
const personalSchema = z.object({
  date_of_birth: z.preprocess(blankToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()),
  gender: z.preprocess(blankToNull, z.enum(["male", "female", "other"]).nullable().optional()),
  marital_status: z.preprocess(blankToNull, z.enum(["single", "married", "divorced", "widowed"]).nullable().optional()),
  national_id: optionalText,
  address: optionalText,
  blood_group: z.preprocess(
    blankToNull,
    z.enum([
      "o_positive", "o_negative", "a_positive", "a_negative",
      "b_positive", "b_negative", "ab_positive", "ab_negative",
    ]).nullable().optional(),
  ),
  height_feet: z.preprocess(blankToNull, z.coerce.number().int().min(0).max(9).nullable().optional()),
  height_inches: z.preprocess(blankToNull, z.coerce.number().int().min(0).max(11).nullable().optional()),
  weight_kg: z.preprocess(blankToNull, z.coerce.number().min(0).max(700).nullable().optional()),
  emergency_contact_name: optionalText,
  emergency_contact_phone: optionalText,
  emergency_contact_relation: optionalText,
  emergency_contact_email: z.preprocess(
    blankToNull,
    z.string().trim().email("That email does not look right").nullable().optional(),
  ),
  emergency_contact_address: optionalText,
});

const profileSchema = identitySchema.merge(personalSchema);

const historySchema = z.object({
  kind: z.enum(["allergy", "illness", "medication", "procedure"]),
  label: z.string().trim().min(1, "Give it a name").max(200),
  detail: optionalText,
  started_on: z.preprocess(blankToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()),
  ongoing: z.boolean().optional(),
});

const requirePatient = async () => {
  const auth = await getAuthContext();
  if (!auth) return { error: fail("Not signed in", 401) } as const;
  if (auth.role !== "patient") {
    return { error: fail("Only a patient can manage their own profile", 403) } as const;
  }
  return { auth } as const;
};

/** Only keys actually sent, so an omitted field is left alone rather than nulled. */
const onlySent = <T extends object>(parsed: T) => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
};

export const GET = async () => {
  const guard = await requirePatient();
  if ("error" in guard) return guard.error;

  const supabase = await createServerSupabase();
  const userId = guard.auth.userId;

  const [identity, personal, history, hospitals] = await Promise.all([
    supabase.from("profiles").select("full_name, email, phone, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("patient_profiles").select("*").eq("profile_id", userId).maybeSingle(),
    supabase
      .from("patient_history")
      .select("id, kind, label, detail, started_on, ongoing")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false }),
    // Which hospitals hold a record of this person. The personal profile is
    // the patient's; these are the links to it — shown so they can see who
    // has their details rather than having to ask.
    supabase
      .from("patients")
      .select("id, mrn, created_at, tenants ( id, name, slug )")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const firstError = identity.error || personal.error || history.error || hospitals.error;
  if (firstError) return fail(firstError.message, 400);

  return json({
    data: {
      // One object, so the page does not need to know which table each field
      // came from. A login with no personal row yet simply has nulls — the
      // form is editable either way, which is the whole point of 0066.
      profile: { ...(identity.data ?? {}), ...(personal.data ?? {}) },
      history: history.data ?? [],
      hospitals: hospitals.data ?? [],
    },
  });
};

export const PATCH = async (request: Request) => {
  const guard = await requirePatient();
  if ("error" in guard) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Those details are not valid", 422);
  }

  const supabase = await createServerSupabase();
  const userId = guard.auth.userId;

  // Cast at the boundary rather than inside onlySent: the schemas above are
  // what guarantee these keys, and a Record<string, unknown> is not something
  // the generated Update types will accept.
  const identity = onlySent(identitySchema.parse(body)) as TablesUpdate<"profiles">;
  const personal = onlySent(personalSchema.parse(body)) as Omit<TablesInsert<"patient_profiles">, "profile_id">;

  if (Object.keys(identity).length > 0) {
    // profiles_update_self allows this; the trigger from 0002 refuses any
    // attempt to touch role or tenant_id, so those cannot ride along.
    const { error } = await supabase.from("profiles").update(identity).eq("id", userId);
    if (error) return fail(error.message, 400);
  }

  if (Object.keys(personal).length > 0) {
    // Upsert, because the row may not exist yet — a patient editing their
    // profile for the first time is the normal case, not an error.
    const row: TablesInsert<"patient_profiles"> = { profile_id: userId, ...personal };
    const { error } = await supabase
      .from("patient_profiles")
      .upsert(row, { onConflict: "profile_id" });
    if (error) return fail(error.message, 400);
  }

  const [identityRow, personalRow] = await Promise.all([
    supabase.from("profiles").select("full_name, email, phone, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("patient_profiles").select("*").eq("profile_id", userId).maybeSingle(),
  ]);

  return json({ data: { ...(identityRow.data ?? {}), ...(personalRow.data ?? {}) } });
};

/** Add one entry to a standing clinical list. */
export const POST = async (request: Request) => {
  const guard = await requirePatient();
  if ("error" in guard) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = historySchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "That entry is not valid", 422);
  }

  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("patient_history")
    // profile_id from the session, never from the request.
    .insert({ ...parsed.data, profile_id: guard.auth.userId })
    .select("id, kind, label, detail, started_on, ongoing")
    .single();

  if (error) {
    if (error.code === "23505") return fail("That is already on your list.", 409);
    return fail(error.message, 400);
  }
  return json({ data }, 201);
};

/**
 * Remove one entry. Scoped by profile_id as well as id, so an id guessed from
 * someone else's record matches nothing — and RLS says the same thing again.
 */
export const DELETE = async (request: Request) => {
  const guard = await requirePatient();
  if ("error" in guard) return guard.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Which entry?", 400);

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("patient_history")
    .delete()
    .eq("id", id)
    .eq("profile_id", guard.auth.userId);

  if (error) return fail(error.message, 400);
  return json({ data: { id } });
};
