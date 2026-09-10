import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";

/**
 * GET /api/v1/accounts/summary — the numbers every tab of /admin/accounts is
 * drawn from.
 *
 * All of it is posted vouchers, read through `ledger_balances` and
 * `ledger_movements` (0063, 0074). Nothing here is stored: a profit and loss
 * account IS its income and expense accounts added up, a cost center's spend
 * IS the expense booked to it, and storing either would be one more number
 * able to disagree with the ledger under it.
 *
 * The statements themselves — trial balance, P&L, balance sheet — are laid
 * out by the page from `balances`, because each is the same rows grouped a
 * different way and the grouping is presentation.
 *
 * POST /api/v1/accounts/chart creates the standard chart for a hospital that
 * has none; this route reports `has_chart: false` so the page can offer it.
 */

const BOOKS_ROLES: AppRole[] = ["hospital_admin", "finance_admin"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

type Group = "asset" | "liability" | "income" | "expense" | "capital";

type Balance = {
  account_id: string;
  code: string;
  name: string;
  group: Group;
  subgroup: string;
  active: boolean;
  opening_balance: number;
  debit_total: number;
  credit_total: number;
  balance: number;
};

type Movement = {
  account_id: string;
  cost_center_id: string | null;
  month: string;
  debit: number;
  credit: number;
};

type LineRow = {
  id: string;
  debit: number;
  credit: number;
  ledger_accounts: { name: string; subgroup: string } | null;
  journal_entries: {
    id: string; entry_no: string; entry_date: string; type: string;
    party: string | null; narration: string | null; status: string; reconciled_on: string | null;
  } | null;
};

/** yyyy-mm-dd for a Date, in UTC — entry_date is a plain date. */
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** The first of the month, `months` back from this one. */
const monthStart = (months: number) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
};

/** Lines on accounts in the given subgroups, posted, newest first. */
const linesFor = async (
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  subgroups: string[],
  options: { since?: string; limit: number },
) => {
  let query = supabase
    .from("journal_lines")
    .select(
      "id, debit, credit, "
      + "ledger_accounts!inner ( name, subgroup ), "
      + "journal_entries!inner ( id, entry_no, entry_date, type, party, narration, status, reconciled_on )",
    )
    .in("ledger_accounts.subgroup", subgroups)
    .eq("journal_entries.status", "posted")
    .order("created_at", { ascending: false })
    .limit(options.limit);

  if (options.since) query = query.gte("journal_entries.entry_date", options.since);

  const { data, error } = await query;
  return { rows: (data ?? []) as unknown as LineRow[], error };
};

/** A line as the page shows it: the voucher it belongs to, and which way it went. */
const toMovementLine = (line: LineRow) => ({
  id: line.id,
  entry_id: line.journal_entries?.id ?? "",
  entry_no: line.journal_entries?.entry_no ?? "",
  entry_date: line.journal_entries?.entry_date ?? "",
  type: line.journal_entries?.type ?? "",
  party: line.journal_entries?.party ?? null,
  narration: line.journal_entries?.narration ?? null,
  reconciled_on: line.journal_entries?.reconciled_on ?? null,
  account: line.ledger_accounts?.name ?? "",
  debit: Number(line.debit),
  credit: Number(line.credit),
});

const byDateDesc = (a: { entry_date: string }, b: { entry_date: string }) =>
  b.entry_date.localeCompare(a.entry_date);

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.tenantId || !auth.role || !BOOKS_ROLES.includes(auth.role)) {
    return fail("Not allowed to read the books", 403);
  }

  const supabase = await createServerSupabase();

  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);

  const [balancesResult, movementsResult, draftsResult, cashWeek, bank, tax] = await Promise.all([
    supabase.from("ledger_balances").select("*").order("code", { ascending: true }),
    supabase.from("ledger_movements").select("account_id, cost_center_id, month, debit, credit"),
    supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("status", "draft"),
    linesFor(supabase, ["cash_in_hand", "bank_accounts"], { since: isoDay(weekStart), limit: 1000 }),
    linesFor(supabase, ["bank_accounts"], { limit: 100 }),
    linesFor(supabase, ["duties_taxes"], { limit: 100 }),
  ]);

  const firstError = [balancesResult.error, movementsResult.error, draftsResult.error, cashWeek.error, bank.error, tax.error]
    .find(Boolean);
  if (firstError) return fail(firstError.message, 500);

  const balances = ((balancesResult.data ?? []) as unknown as Balance[]).map(b => ({
    ...b,
    opening_balance: Number(b.opening_balance),
    debit_total: Number(b.debit_total),
    credit_total: Number(b.credit_total),
    balance: Number(b.balance),
  }));
  const movements = (movementsResult.data ?? []) as unknown as Movement[];
  const groupOf = new Map(balances.map(b => [b.account_id, b.group]));

  /**
   * What a movement did to its account, in the account's natural direction:
   * a debit raises an expense, a credit raises income.
   */
  const net = (m: Movement) => {
    const group = groupOf.get(m.account_id);
    const debit = Number(m.debit);
    const credit = Number(m.credit);
    return group === "asset" || group === "expense" ? debit - credit : credit - debit;
  };

  // Income against expense for the last six months, oldest first.
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const start = isoDay(monthStart(5 - i));
    const inMonth = movements.filter(m => m.month === start);
    const sumOf = (group: Group) =>
      inMonth.filter(m => groupOf.get(m.account_id) === group).reduce((s, m) => s + net(m), 0);
    return { month: start, income: sumOf("income"), expense: sumOf("expense") };
  });

  // Money into and out of cash and bank, each of the last seven days.
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setUTCDate(weekStart.getUTCDate() + i);
    const date = isoDay(day);
    const lines = cashWeek.rows.filter(l => l.journal_entries?.entry_date === date);
    return {
      date,
      inflow: lines.reduce((s, l) => s + Number(l.debit), 0),
      outflow: lines.reduce((s, l) => s + Number(l.credit), 0),
    };
  });

  // Expense booked to each cost center, all time.
  const spentByCenter: Record<string, number> = {};
  for (const m of movements) {
    if (!m.cost_center_id || groupOf.get(m.account_id) !== "expense") continue;
    spentByCenter[m.cost_center_id] = (spentByCenter[m.cost_center_id] ?? 0) + net(m);
  }

  // Each account's net movement per month — a budget's "actual" is one cell.
  const actuals: Record<string, number> = {};
  for (const m of movements) {
    const key = `${m.account_id}:${m.month}`;
    actuals[key] = (actuals[key] ?? 0) + net(m);
  }

  return json({
    data: {
      has_chart: balances.length > 0,
      balances,
      monthly,
      weekly,
      spent_by_center: spentByCenter,
      actuals,
      drafts: draftsResult.count ?? 0,
      bank_lines: bank.rows.map(toMovementLine).sort(byDateDesc),
      tax_lines: tax.rows.map(toMovementLine).sort(byDateDesc),
    },
  });
};
