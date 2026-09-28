import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";

/**
 * GET /api/v1/accounts/trial?from=yyyy-mm-dd&to=yyyy-mm-dd — ledger balances
 * over a date range, for the Trial Balance's date filter.
 *
 * Read through `ledger_balances_between` (0108): posted vouchers dated from
 * `from` to `to`, both inclusive, either left out for no bound. With no
 * `from`, opening balances count, so `to` alone is the trial balance as on
 * that date. Same row shape as `balances` from /api/v1/accounts/summary.
 */

const BOOKS_ROLES: AppRole[] = ["hospital_admin", "finance_admin"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const DAY = /^\d{4}-\d{2}-\d{2}$/;

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
  const { data, error } = await supabase.rpc("ledger_balances_between", { p_from: from, p_to: to });
  if (error) return fail(error.message, 500);

  const balances = ((data ?? []) as Record<string, unknown>[]).map(b => ({
    ...b,
    opening_balance: Number(b.opening_balance),
    debit_total: Number(b.debit_total),
    credit_total: Number(b.credit_total),
    balance: Number(b.balance),
  }));

  return json({ data: { balances } });
};
