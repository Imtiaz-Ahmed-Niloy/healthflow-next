import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext, isSuperAdmin } from "@/lib/supabase/server";

/**
 * POST /api/v1/super/accounts — suspend or reactivate a person's login.
 *
 * Used by the super admin's Doctors and Patients screens. A login is one
 * person across every hospital, so suspending it signs them out everywhere
 * and their next token carries no role and no hospital.
 *
 * set_account_active (0079) checks is_super_admin() itself and ends the
 * sessions inside the database, so this runs on the caller's own client.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const schema = z.object({
  profile_id: z.string().uuid(),
  active: z.boolean(),
});

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);
  if (parsed.data.profile_id === auth.userId) return fail("You can't suspend your own account.", 422);

  const supabase = await createServerSupabase();
  const { data: found, error } = await supabase.rpc("set_account_active", {
    p_profile_id: parsed.data.profile_id,
    p_active: parsed.data.active,
  });
  if (error) return fail(error.message, error.code === "42501" ? 403 : 400);
  if (!found) return fail("Account not found", 404);

  return json({ data: { active: parsed.data.active } });
};
