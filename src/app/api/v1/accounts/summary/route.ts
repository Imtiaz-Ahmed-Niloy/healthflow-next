import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";

/**
 * GET /api/v1/accounts/summary — the trial balance, and the statements drawn
 * from it.
 *
 * Every figure comes from `ledger_balances` (0063), which is posted vouchers
 * only. Nothing here is stored: a profit and loss account IS its income and
 * expense accounts added up, and storing that total would be one more number
 * able to disagree with the ledger under it.
 *
 * POST /api/v1/accounts/chart creates the standard chart for a hospital that
 * has none; this route reports `has_chart: false` so the page can offer it.
 */

const BOOKS_ROLES: AppRole[] = ["hospital_admin", "finance_admin"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

type Balance = {
  account_id: string;
  code: string;
  name: string;
  group: "asset" | "liability" | "income" | "expense" | "capital";
  active: boolean;
  opening_balance: number;
  debit_total: number;
  credit_total: number;
  balance: number;
};

const sum = (rows: Balance[]) => rows.reduce((total, r) => total + Number(r.balance), 0);

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.tenantId || !auth.role || !BOOKS_ROLES.includes(auth.role)) {
    return fail("Not allowed to read the books", 403);
  }

  const supabase = await createServerSupabase();

  const [balancesResult, recentResult] = await Promise.all([
    supabase.from("ledger_balances").select("*").order("code", { ascending: true }),
    supabase
      .from("journal_entries")
      .select(
        "id, entry_no, entry_date, type, party, narration, status, "
        + "journal_lines ( id, debit, credit, ledger_accounts ( code, name ) )",
      )
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  if (balancesResult.error) return fail(balancesResult.error.message, 500);
  if (recentResult.error) return fail(recentResult.error.message, 500);

  const balances = (balancesResult.data ?? []) as unknown as Balance[];
  const of = (group: Balance["group"]) => balances.filter(b => b.group === group);

  const income = of("income");
  const expense = of("expense");
  const assets = of("asset");
  const liabilities = of("liability");
  const capital = of("capital");

  const incomeTotal = sum(income);
  const expenseTotal = sum(expense);

  return json({
    data: {
      has_chart: balances.length > 0,

      /**
       * The trial balance proper: every account in its own column. It balances
       * when the two totals match, and if they ever do not the posting rules
       * have been bypassed — which the database should have made impossible.
       */
      trial_balance: {
        rows: balances.map(b => ({
          account_id: b.account_id,
          code: b.code,
          name: b.name,
          group: b.group,
          debit: ["asset", "expense"].includes(b.group) ? Number(b.balance) : 0,
          credit: ["asset", "expense"].includes(b.group) ? 0 : Number(b.balance),
        })),
        debit_total: sum(assets) + sum(expense),
        credit_total: sum(liabilities) + sum(capital) + sum(income),
      },

      profit_and_loss: {
        income: income.map(b => ({ code: b.code, name: b.name, amount: Number(b.balance) })),
        expense: expense.map(b => ({ code: b.code, name: b.name, amount: Number(b.balance) })),
        income_total: incomeTotal,
        expense_total: expenseTotal,
        net: incomeTotal - expenseTotal,
      },

      balance_sheet: {
        assets: assets.map(b => ({ code: b.code, name: b.name, amount: Number(b.balance) })),
        liabilities: liabilities.map(b => ({ code: b.code, name: b.name, amount: Number(b.balance) })),
        capital: capital.map(b => ({ code: b.code, name: b.name, amount: Number(b.balance) })),
        assets_total: sum(assets),
        // The period's profit belongs to the owners until it is distributed,
        // which is why it sits on this side rather than nowhere.
        liabilities_total: sum(liabilities),
        capital_total: sum(capital),
        retained: incomeTotal - expenseTotal,
      },

      /** Cash and bank, for the tile that answers "what have we got". */
      cash_on_hand: sum(assets.filter(a => a.code === "1010" || a.code === "1020")),

      day_book: recentResult.data ?? [],
    },
  });
};
