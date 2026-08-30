import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase, getAuthContext } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/types";

/**
 * /api/v1/patient/profile (HF-79)
 *
 * The patient's own record: the details on `patients`, plus the standing
 * clinical facts in `patient_history` (0046) — allergies, chronic illnesses,
 * standing medications, past procedures.
 *
 * Admin client, for the reason the appointments and medical-records routes
 * document: a patient has no tenant_id, and one login can hold a `patients`
 * row in several hospitals, so tenant RLS cannot express "mine".
 *
 * That makes this file the boundary, so two rules hold throughout:
 *
 *   1. Every id is resolved from the caller's own profile. Nothing the client
 *      sends is ever used to choose a row.
 *   2. Writes name their columns explicitly. `patients` carries tenant_id, mrn
 *      and profile_id, and spreading the request body would let a patient move
 *      themselves between hospitals or take over another record.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

/** Treats "" from a form as "clear this field". */
const blankToNull = (value: unknown) => (value === "" ? null : value);
const optionalText = z.preprocess(blankToNull, z.string().trim().max(500).nullable().optional());

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(200).optional(),
  date_of_birth: z.preprocess(blankToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()),
  gender: z.preprocess(blankToNull, z.enum(["male", "female", "other"]).nullable().optional()),
  marital_status: z.preprocess(blankToNull, z.enum(["single", "married", "divorced", "widowed"]).nullable().optional()),
  national_id: optionalText,
  email: z.preprocess(blankToNull, z.string().trim().email("That email does not look right").nullable().optional()),
  phone: optionalText,
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
});

const historySchema = z.object({
  kind: z.enum(["allergy", "illness", "medication", "procedure"]),
  label: z.string().trim().min(1, "Give it a name").max(200),
  detail: optionalText,
  started_on: z.preprocess(blankToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()),
  ongoing: z.boolean().optional(),
});

/**
 * The caller's own patients rows, newest first.
 *
 * One login can have a row per hospital. The most recent is the one this page
 * edits — the record they are currently being seen under. The others still
 * feed their history elsewhere; they are simply not what "my profile" means.
 */
const myPatients = async (admin: ReturnType<typeof createAdminSupabase>, userId: string) => {
  const { data, error } = await admin
    .from("patients")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

const requirePatient = async () => {
  const auth = await getAuthContext();
  if (!auth) return { error: fail("Not signed in", 401) } as const;
  if (auth.role !== "patient") {
    return { error: fail("Only a patient can manage their own profile", 403) } as const;
  }
  return { auth } as const;
};

export const GET = async () => {
  const guard = await requirePatient();
  if ("error" in guard) return guard.error;

  const admin = createAdminSupabase();
  const patients = await myPatients(admin, guard.auth.userId);
  const patient = patients[0] ?? null;

  if (!patient) {
    // A login with no patients row yet: they have never booked. Not an error —
    // the page shows an empty profile rather than a failure.
    return json({ data: { profile: null, history: [] } });
  }

  const { data: history, error } = await admin
    .from("patient_history")
    .select("id, kind, label, detail, started_on, ongoing")
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false });
  if (error) return fail(error.message, 400);

  return json({ data: { profile: patient, history: history ?? [] } });
};

export const PATCH = async (request: Request) => {
  const guard = await requirePatient();
  if ("error" in guard) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Those details are not valid", 422);
  }

  const admin = createAdminSupabase();
  const patients = await myPatients(admin, guard.auth.userId);
  const patient = patients[0];
  if (!patient) return fail("You do not have a patient record yet", 404);

  // Only the fields actually sent, and only ones the schema names. Built key
  // by key rather than with Object.fromEntries, which erases the key types and
  // would let this compile against a column that does not exist.
  const updates: TablesUpdate<"patients"> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) (updates as Record<string, unknown>)[key] = value;
  }
  if (Object.keys(updates).length === 0) return json({ data: patient });

  const { data, error } = await admin
    .from("patients")
    .update(updates)
    .eq("id", patient.id)
    .select("*")
    .single();

  if (error) return fail(error.message, 400);
  return json({ data });
};

/** Add one entry to a clinical list. */
export const POST = async (request: Request) => {
  const guard = await requirePatient();
  if ("error" in guard) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = historySchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "That entry is not valid", 422);
  }

  const admin = createAdminSupabase();
  const patients = await myPatients(admin, guard.auth.userId);
  const patient = patients[0];
  if (!patient) return fail("You do not have a patient record yet", 404);

  const { data, error } = await admin
    .from("patient_history")
    .insert({
      ...parsed.data,
      patient_id: patient.id,
      // Stamped from the patient's own row, never from the request.
      tenant_id: patient.tenant_id,
    })
    .select("id, kind, label, detail, started_on, ongoing")
    .single();

  if (error) {
    // The unique index: the same condition entered twice.
    if (error.code === "23505") return fail("That is already on your list.", 409);
    return fail(error.message, 400);
  }
  return json({ data }, 201);
};

/**
 * Remove one entry. Scoped by patient_id as well as id, so an id guessed from
 * another patient's record matches nothing.
 */
export const DELETE = async (request: Request) => {
  const guard = await requirePatient();
  if ("error" in guard) return guard.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Which entry?", 400);

  const admin = createAdminSupabase();
  const patients = await myPatients(admin, guard.auth.userId);
  const patient = patients[0];
  if (!patient) return fail("You do not have a patient record yet", 404);

  const { error } = await admin
    .from("patient_history")
    .delete()
    .eq("id", id)
    .eq("patient_id", patient.id);

  if (error) return fail(error.message, 400);
  return json({ data: { id } });
};
