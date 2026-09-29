import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";

/**
 * GET /api/v1/accounts/cash-flow?from=yyyy-mm-dd&to=yyyy-mm-dd — the Cash Flow
 * Statement's numbers, direct method.
 *
 *   flows    one row per ledger cash moved against (`cash_flow_between`,
 *            0115), amount positive for cash in. The page sorts them into
 *            operating, investing and financing.
 *   opening  cash and bank at the start: every opening balance with no
 *            `from`, else the balances at the end of the day before it.
 *   closing  cash and bank at the end of `to` (today with none).
 *
 * opening + the flows = closing, always: each flow is the other side of a
 * balanced voucher that moved cash.
 */

const BOOKS_ROLES: AppRole[] = ["hospital_admin", "finance_admin"];
const CASH = ["cash_in_hand", "bank_accounts"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** yyyy-mm-dd, the day before. */
const dayBefore = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

export const GET = async (request: NextRequest) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.tenantId || !auth.role || !BOOKS_ROLES.includes(auth.role)) {
    return fail("Not allowed to read the books", 403);
  }

  const from = request.nextUrl.searchParams.get("from") || null;
  const to = request.nextUrl.searchParams.get("to") || null;
  if ((from && !DAY.test(from)) || (to && !DAY.test(to))) return fail("Dates must be yyyy-mm-dd", 400);
  if (from && to && from > to) return fail("The start date is after the end date", 400);

  const supabase = await createServerSupabase();
  const [flows, before, after] = await Promise.all([
    supabase.rpc("cash_flow_between", { p_from: from, p_to: to }),
    // With no start, the day before the books began is their opening balances.
    from
      ? supabase.rpc("ledger_balances_between", { p_from: null, p_to: dayBefore(from) })
      : supabase.rpc("ledger_balances_between", { p_from: null, p_to: "0001-01-01" }),
    supabase.rpc("ledger_balances_between", { p_from: null, p_to: to }),
  ]);

  const error = flows.error ?? before.error ?? after.error;
  if (error) return fail(error.message, 500);

  const cashIn = (rows: { subgroup: string; balance: number }[] | null) =>
    (rows ?? []).filter(r => CASH.includes(r.subgroup)).reduce((s, r) => s + Number(r.balance), 0);

  return json({
    data: {
      flows: (flows.data ?? []).map(f => ({ ...f, amount: Number(f.amount) })),
      opening: cashIn(before.data),
      closing: cashIn(after.data),
    },
  });
};
