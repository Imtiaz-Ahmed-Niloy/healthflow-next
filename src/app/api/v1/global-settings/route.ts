import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext, isSuperAdmin } from "@/lib/supabase/server";
import { TIMEZONES, DATE_FORMATS, TIME_FORMATS, CURRENCIES, LANGUAGES } from "@/lib/globalSettings";
import type { Database } from "@/lib/supabase/types";

type GlobalSettingsUpdate = Database["public"]["Tables"]["global_settings"]["Update"];

/**
 * /api/v1/global-settings — the platform's own defaults (0057).
 *
 * Outside createResourceRoute because there is no collection here: the table
 * holds exactly one row, enforced in the database, so addressing it by id
 * would be a URL that can only ever have one value in it.
 *
 * GET is open to everyone, signed in or not. A timezone, a currency and a
 * maintenance notice are not secrets, and the public site formats dates with
 * them too. PATCH is super_admin only, in the policy and again here.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number, details?: unknown) =>
  json({ error: { message, ...(details ? { details } : {}) } }, status);

const blankToNull = (value: unknown) => (value === "" ? null : value);

/**
 * Every field optional: this is a PATCH, and a screen that saves one changed
 * field should not have to send the other eight back unchanged.
 *
 * The enumerated fields are validated against the same lists the picker is
 * built from, so what the API accepts and what the screen offers cannot drift
 * apart. The check constraints say the same thing a third time; this is the
 * layer that turns a 23514 into a message naming the field.
 */
const patchSchema = z.object({
  timezone: z.enum(TIMEZONES).optional(),
  language: z.enum(LANGUAGES).optional(),
  currency: z.enum(CURRENCIES).optional(),
  date_format: z.enum(DATE_FORMATS).optional(),
  time_format: z.enum(TIME_FORMATS).optional(),
  support_email: z.preprocess(
    blankToNull,
    z.string().trim().email("That is not an email address").nullable().optional(),
  ),
  maintenance_mode: z.boolean().optional(),
  maintenance_message: z.preprocess(
    blankToNull,
    z.string().trim().max(500).nullable().optional(),
  ),
});

export const GET = async () => {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("global_settings").select("*").single();

  if (error) return fail(error.message, 400);
  return json({ data });
};

export const PATCH = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Body must be valid JSON", 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

  // Dropping the undefined keys is what makes this a PATCH; the cast is
  // because fromEntries widens to an index signature, which the schema-typed
  // client refuses. Zod has already decided the shape by this point.
  const payload = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined),
  ) as GlobalSettingsUpdate;

  if (Object.keys(payload).length === 0) return fail("No changes provided", 400);

  const supabase = await createServerSupabase();

  // No `.eq("id", …)`: the row is the table. `singleton` is unique and checked
  // true, so this can only ever match the one row there is.
  const { data, error } = await supabase
    .from("global_settings")
    .update(payload)
    .eq("singleton", true)
    .select("*")
    .single();

  if (error) {
    if (error.code === "42501") return fail("Not allowed", 403);
    if (error.code === "23514") return fail("Invalid values", 422, error.details);
    return fail(error.message, 400);
  }

  return json({ data });
};
