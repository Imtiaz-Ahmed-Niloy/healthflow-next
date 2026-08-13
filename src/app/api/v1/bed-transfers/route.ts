import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * The one endpoint in this codebase that is not a createResourceRoute() call.
 *
 * A transfer closes the admission's current bed_stays row and opens a new
 * one in a single transaction — see transfer_admission() in
 * supabase/migrations/0010_admissions_bed_stays.sql, which this endpoint
 * does nothing but invoke via supabase.rpc(). No query logic lives here.
 *
 * Not nested under admissions/[id]/transfer: admissions/[[...id]] already
 * occupies that route segment as a catch-all, and Next 15 forbids two
 * different dynamic-segment shapes at the same level. Hence a sibling
 * top-level route instead.
 */

// The generated Database type doesn't know about transfer_admission() until
// `supabase gen types` runs against a database that has this migration
// applied — same reasoning as createResourceRoute.ts's own `untyped()`.
const untyped = async (): Promise<SupabaseClient> =>
  (await createServerSupabase()) as unknown as SupabaseClient;

const ALLOWED_ROLES = ["hospital_admin", "hr_admin", "doctor"] as const;

const bodySchema = z
  .object({
    admission_id: z.string().uuid(),
    bed_id: z.string().uuid().nullable().optional(),
    cabin_id: z.string().uuid().nullable().optional(),
  })
  .refine((value) => !(value.bed_id && value.cabin_id), {
    message: "Choose a bed or a cabin, not both",
  });

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

const fail = (message: string, status: number, details?: unknown) =>
  json({ error: { message, ...(details ? { details } : {}) } }, status);

/** Maps transfer_admission()'s raise exception messages onto HTTP status. */
const fromRpcError = (error: PostgrestError) => {
  if (error.code === "42501") return fail("Not allowed", 403);
  if (error.message?.includes("not allowed")) return fail("Not allowed", 403);
  if (error.message?.includes("not found")) return fail(error.message, 404);
  if (error.message?.includes("already discharged")) return fail(error.message, 422);
  return fail(error.message, 400, error.details);
};

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);

  if (auth.role !== "super_admin" && !ALLOWED_ROLES.includes(auth.role as (typeof ALLOWED_ROLES)[number])) {
    return fail("Not allowed", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Body must be valid JSON", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

  // User-scoped client, never the admin client: transfer_admission() is
  // security definer and bypasses RLS on its own, but it re-checks tenant/
  // role itself from auth.jwt() — the same "RLS is the boundary" principle,
  // just enforced inside the function body instead of a policy.
  const supabase = await untyped();
  const { data, error } = await supabase.rpc("transfer_admission", {
    p_admission_id: parsed.data.admission_id,
    p_bed_id: parsed.data.bed_id ?? null,
    p_cabin_id: parsed.data.cabin_id ?? null,
  });

  if (error) return fromRpcError(error);

  return json({ data });
};
