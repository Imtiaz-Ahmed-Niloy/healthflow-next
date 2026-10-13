import "server-only";

import { NextResponse } from "next/server";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase, getAuthContext, type AppRole, type AuthContext } from "@/lib/supabase/server";

/**
 * What every /api/v1/pharmacy route starts with.
 *
 * The pharmacy's writes are database functions (0127), not statements made
 * here, so a route's whole job is: is this person pharmacy staff, is the body
 * the right shape, call the function, pass its answer on. Every call runs on
 * the caller's own client. RLS (0126) is what keeps one hospital's pharmacy
 * out of another's; the role check below only turns a silent empty answer into
 * a clear 403.
 */

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

/**
 * `code` is the short key a pharmacy function raises in HINT — "drawer_closed",
 * "insufficient_stock". The page says it in the reader's language from that,
 * and falls back to `message` (English) for a key it has no words for.
 */
export const fail = (message: string, status: number, extra: { code?: string; detail?: string } = {}) =>
  json({ error: { message, ...extra } }, status);

/** Who works the pharmacy. */
export const PHARMACY_STAFF: AppRole[] = ["hospital_admin", "pharmacy_admin"];
/** Who may read its books as well: sales are hospital income, and finance counts it. */
export const PHARMACY_READERS: AppRole[] = [...PHARMACY_STAFF, "finance_admin"];

export type PharmacyGrant = { auth: AuthContext; supabase: SupabaseClient };
type Granted = PharmacyGrant;

/**
 * The pharmacy tables and functions are addressed through an untyped client,
 * as createResourceRoute does: src/lib/supabase/types.ts is generated, and a
 * route that only compiles once somebody has regenerated it is a route that
 * breaks the build on the day a column is added.
 */
export const pharmacyAccess = async (
  mode: "read" | "write" = "write",
): Promise<Granted | { refusal: NextResponse }> => {
  const auth = await getAuthContext();
  if (!auth) return { refusal: fail("Not signed in", 401) };

  const allowed = mode === "read" ? PHARMACY_READERS : PHARMACY_STAFF;
  if (!auth.role || !allowed.includes(auth.role)) {
    return { refusal: fail("Only pharmacy staff can do this.", 403, { code: "not_pharmacy_staff" }) };
  }
  if (!auth.tenantId) {
    return { refusal: fail("This login is not attached to a hospital.", 403, { code: "no_hospital" }) };
  }

  return { auth, supabase: (await createServerSupabase()) as unknown as SupabaseClient };
};

/**
 * For the routes that have to use the service-role client afterwards (making
 * a login, resetting a password), where the database is not there to say no:
 * is this person allowed to administer the pharmacy (0133)? Asked of the
 * database, on the caller's own client, so there is one definition of it.
 */
export const pharmacyAdministrator = async (): Promise<Granted | { refusal: NextResponse }> => {
  const who = await pharmacyAccess("write");
  if ("refusal" in who) return who;

  const allowed = await who.supabase.rpc("pharmacy_can", { p_perm: "administer" });
  if (allowed.error || !allowed.data) {
    return { refusal: fail("You do not have permission to do this.", 403, { code: "no_permission" }) };
  }

  return who;
};

/** A refusal from the database, as HTTP. PH001/PH002 are the ones a person can fix. */
export const fromRpc = (error: PostgrestError) => {
  const extra = { code: error.hint || undefined, detail: error.details || undefined };

  if (error.code === "PH001" || error.code === "PH002") return fail(error.message, 422, extra);
  if (error.code === "PH403") return fail(error.message, 403, extra);
  // An RLS policy said no.
  if (error.code === "42501") return fail("Not allowed", 403);
  // A value that is not a number, a date or a uuid where one was needed.
  if (error.code === "22P02" || error.code === "22007" || error.code === "22008") return fail("Invalid values", 422);
  if (error.code === "23505") return fail("Already exists", 409);

  return fail(error.message, 500);
};

export const readJson = async (request: Request): Promise<unknown> => request.json().catch(() => null);
