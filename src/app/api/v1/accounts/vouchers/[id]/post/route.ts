import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";

/**
 * POST /api/v1/accounts/vouchers/:id/post — posts a draft voucher.
 *
 * `post_journal_entry` (0063) runs the balance check and flips the status in
 * one statement. After this the voucher's lines are immutable; the database
 * enforces that, not this route.
 */

const BOOKS_ROLES: AppRole[] = ["hospital_admin", "finance_admin"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const POST = async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.tenantId || !auth.role || !BOOKS_ROLES.includes(auth.role)) {
    return fail("Not allowed to write to the books", 403);
  }

  const { id } = await context.params;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("post_journal_entry", { p_entry_id: id });

  // RLS hides another hospital's voucher, so it arrives here as "not found".
  if (error) return fail(error.message, 400);

  return json({ data });
};
