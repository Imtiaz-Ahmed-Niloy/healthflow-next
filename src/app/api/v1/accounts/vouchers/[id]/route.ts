import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";
import { voucherHeader, voucherSchema, withConfirmedPassword } from "@/server/vouchers";

/**
 * PATCH  /api/v1/accounts/vouchers/:id — edits a voucher in full, posted or
 *        draft. Body: the same voucher as POST, plus { password }.
 * DELETE /api/v1/accounts/vouchers/:id — deletes one. Body: { password }.
 *
 * Both need the password typed again. It is checked by signing in with it on
 * a throwaway client (withConfirmedPassword), and that fresh session is what
 * calls `update_voucher` (0111) or `delete_voucher` (0109) — each of which
 * refuses anyone without a password sign-in in the last two minutes. The rule
 * lives in the database, not here.
 */

const BOOKS_ROLES: AppRole[] = ["hospital_admin", "finance_admin"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const password = z.string().min(1, "Enter your password");

const booksCaller = async () => {
  const auth = await getAuthContext();
  if (!auth) return { response: fail("Not signed in", 401) };
  if (!auth.tenantId || !auth.role || !BOOKS_ROLES.includes(auth.role)) {
    return { response: fail("Not allowed to write to the books", 403) };
  }
  if (!auth.email) return { response: fail("This login has no password to confirm with", 400) };
  return { auth };
};

export const PATCH = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { auth, response } = await booksCaller();
  if (!auth) return response;

  const body = await request.json().catch(() => null);
  const parsed = voucherSchema.and(z.object({ password })).safeParse(body);
  if (!parsed.success) {
    return json(
      { error: { message: parsed.error.issues[0]?.message ?? "Invalid voucher", details: parsed.error.flatten() } },
      422,
    );
  }

  const { id } = await context.params;
  const { entry_no, entry_date, type, lines, post } = parsed.data;
  const { party, narration, cost_center_id } = voucherHeader(parsed.data);

  const result = await withConfirmedPassword(auth, parsed.data.password, async client => {
    const updated = await client.rpc("update_voucher", {
      p_entry_id: id,
      p_entry_no: entry_no,
      p_entry_date: entry_date,
      p_type: type,
      p_party: party,
      p_narration: narration,
      p_lines: lines,
      p_post: post,
      p_cost_center_id: cost_center_id,
    });
    // Sent for approval as part of the edit (0114).
    if (updated.error || !parsed.data.submit || post) return updated;
    return client.rpc("set_voucher_status", { p_entry_id: id, p_status: "pending" });
  });

  if (!result) return fail("That password is not right", 401);
  if (result.error) {
    // 23505 = the unique index on (tenant, entry_no).
    if (result.error.code === "23505") return fail(`Voucher ${entry_no} already exists`, 409);
    // RLS hides another hospital's voucher, so it arrives here as "not found".
    return fail(result.error.message, 400);
  }

  return json({ data: result.data });
};

export const DELETE = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { auth, response } = await booksCaller();
  if (!auth) return response;

  const parsed = z.object({ password }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter your password", 400);

  const { id } = await context.params;

  const result = await withConfirmedPassword(auth, parsed.data.password, client =>
    client.rpc("delete_voucher", { p_entry_id: id }),
  );

  if (!result) return fail("That password is not right", 401);
  if (result.error) return fail(result.error.message, 400);

  return json({ data: { id } });
};
