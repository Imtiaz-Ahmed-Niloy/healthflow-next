import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";
import { withConfirmedPassword } from "@/server/vouchers";

/**
 * POST /api/v1/accounts/vouchers/:id/status — moves a voucher along its
 * approval workflow. Body: { status, note?, password? }.
 *
 *   pending    submit a draft for approval
 *   draft      withdraw a pending voucher, or reopen a rejected one
 *   approved   approve (hospital admin)
 *   rejected   send back, with the reason in `note` (hospital admin)
 *   cancelled  cancel, with the reason in `note`
 *
 * Posting is POST /api/v1/accounts/vouchers/:id/post. `set_voucher_status`
 * (0114) holds every rule: which moves are allowed, who may approve, and that
 * cancelling a posted voucher needs a fresh password sign-in — which is what
 * `password` is for.
 */

const BOOKS_ROLES: AppRole[] = ["hospital_admin", "finance_admin"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const bodySchema = z.object({
  status: z.enum(["pending", "draft", "approved", "rejected", "cancelled"]),
  note: z.string().trim().max(1000).optional(),
  password: z.string().min(1).optional(),
});

export const POST = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.tenantId || !auth.role || !BOOKS_ROLES.includes(auth.role)) {
    return fail("Not allowed to write to the books", 403);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid status", 400);

  const { id } = await context.params;
  const { status, note, password } = parsed.data;
  const args = { p_entry_id: id, p_status: status, p_note: note || null };

  const result = password
    ? await withConfirmedPassword(auth, password, client => client.rpc("set_voucher_status", args))
    : await (await createServerSupabase()).rpc("set_voucher_status", args);

  if (!result) return fail("That password is not right", 401);
  // RLS hides another hospital's voucher, so it arrives here as "not found".
  if (result.error) return fail(result.error.message, 400);

  return json({ data: result.data });
};
