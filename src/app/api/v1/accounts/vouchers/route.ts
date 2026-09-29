import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";
import { voucherHeader, voucherSchema } from "@/server/vouchers";

/**
 * POST /api/v1/accounts/vouchers — records one voucher and its lines.
 *
 * Outside createResourceRoute because a voucher is two tables: the entry and
 * the debits and credits under it. Half a voucher is not a smaller voucher,
 * it is a corrupt ledger, so both go in one transaction — `record_voucher` in
 * 0063 — which also runs the balance check before posting.
 *
 * The database is the authority on the accounting rules. Everything below is
 * about giving a person a sentence they can act on instead of a Postgres
 * error code. The schema is shared with editing, in src/server/vouchers.ts.
 */

const BOOKS_ROLES: AppRole[] = ["hospital_admin", "finance_admin"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.tenantId || !auth.role || !BOOKS_ROLES.includes(auth.role)) {
    return fail("Not allowed to write to the books", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = voucherSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: { message: parsed.error.issues[0]?.message ?? "Invalid voucher", details: parsed.error.flatten() } },
      422,
    );
  }

  const { entry_no, entry_date, type, lines, post } = parsed.data;
  const { party, narration, cost_center_id } = voucherHeader(parsed.data);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("record_voucher", {
    p_entry_no: entry_no,
    p_entry_date: entry_date,
    p_type: type,
    // No default in SQL, so null goes through; the generated type forgets the column is nullable.
    p_party: party as string,
    p_narration: narration as string,
    p_lines: lines,
    p_post: post,
    p_cost_center_id: cost_center_id || undefined,
  });

  if (error) {
    // 23505 = the unique index on (tenant, entry_no).
    if (error.code === "23505") return fail(`Voucher ${entry_no} already exists`, 409);
    return fail(error.message, 400);
  }

  // Sent for approval: saved as a draft above, then marked pending. Should
  // this second step fail, the voucher is left as a draft to submit again.
  if (parsed.data.submit && !post) {
    const submitted = await supabase.rpc("set_voucher_status", { p_entry_id: data.id, p_status: "pending" });
    if (submitted.error) return fail(`Saved as a draft, but not sent for approval: ${submitted.error.message}`, 400);
    return json({ data: submitted.data }, 201);
  }

  return json({ data }, 201);
};
