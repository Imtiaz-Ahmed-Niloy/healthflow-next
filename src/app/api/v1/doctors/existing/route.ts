import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import { parseWeek } from "@/lib/hours";

/**
 * /api/v1/doctors/existing — a doctor already on HealthFlow, added to this
 * hospital (0082).
 *
 * GET ?q= finds them by name, email or phone; POST adds one. Both run on the
 * caller's own client and call a SECURITY DEFINER function that checks the
 * caller is this hospital's admin and works in their hospital only — the
 * doctors it finds work elsewhere, where RLS rightly hides them.
 *
 * A static segment, so it resolves ahead of doctors/[[...id]].
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const ADMIN_ROLES = ["hospital_admin", "hr_admin"];

/** 42501 is the functions' "not this hospital's admin"; anything else they raise is a sentence. */
const statusOf = (code: string | undefined) => (code === "42501" ? 403 : 400);

export const GET = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.role || !ADMIN_ROLES.includes(auth.role)) return fail("Only a hospital's admin can add doctors to it", 403);

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return json({ data: [] });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("search_doctors_to_add", { p_query: q.slice(0, 200) });
  if (error) return fail(error.message, statusOf(error.code));

  return json({ data: data ?? [] });
};

/**
 * A doctor with a login is named by it; one with no login yet by their home
 * row (0085), which moves to this hospital.
 */
const addSchema = z.object({
  profile_id: z.string().uuid().optional(),
  doctor_id: z.string().uuid().optional(),
  consultation_fee: z.union([z.literal(""), z.coerce.number().min(0, "The fee can't be negative")]).optional()
    .transform(v => (v === "" || v === undefined ? null : v)),
  // A week from the editor (src/lib/hours.ts) — this hospital's hours for them.
  availability: z.string().trim().max(2000).optional()
    .refine(v => !v || parseWeek(v) !== null, "Availability isn't a valid week"),
}).refine(v => !!v.profile_id !== !!v.doctor_id, "Pick a doctor to add");

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.role || !ADMIN_ROLES.includes(auth.role)) return fail("Only a hospital's admin can add doctors to it", 403);

  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("add_doctor_to_hospital", {
    p_profile_id: parsed.data.profile_id ?? null,
    p_doctor_id: parsed.data.doctor_id ?? null,
    p_consultation_fee: parsed.data.consultation_fee,
    p_availability: parsed.data.availability || null,
  });
  if (error) return fail(error.message, statusOf(error.code));

  return json({ data: { id: data } }, 201);
};
