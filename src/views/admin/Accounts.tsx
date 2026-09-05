"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi, SectionTitle } from "@/components/admin/ui";
import { Modal, Field, Input, Select, exportCSV } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import { useListResourceQuery } from "@/redux/api/createResourceApi";
import {
  BookOpen, Landmark, Scale, TrendingUp, Wallet, Plus, Download, ShieldAlert, Trash2,
} from "lucide-react";

/**
 * The hospital's books, on `ledger_accounts`, `journal_entries` and
 * `journal_lines` (0063).
 *
 * Six views over one set of numbers: the day book, the chart of accounts with
 * balances, the trial balance, profit and loss, the balance sheet, and the
 * form that writes a voucher. Nothing here is stored twice — a trial balance
 * IS the accounts added up, so it is computed by /api/v1/accounts/summary
 * rather than kept in a column that could drift from the ledger under it.
 *
 * What the demo had and this does not: budgets, cost centres, stock valuation
 * and bank reconciliation. Each needs a table of its own, and drawing them
 * from nothing was how the old page came to show a balance sheet that always
 * balanced.
 */

type Group = "asset" | "liability" | "income" | "expense" | "capital";

type Summary = {
  has_chart: boolean;
  trial_balance: {
    rows: { account_id: string; code: string; name: string; group: Group; debit: number; credit: number }[];
    debit_total: number;
    credit_total: number;
  };
  profit_and_loss: {
    income: { code: string; name: string; amount: number }[];
    expense: { code: string; name: string; amount: number }[];
    income_total: number;
    expense_total: number;
    net: number;
  };
  balance_sheet: {
    assets: { code: string; name: string; amount: number }[];
    liabilities: { code: string; name: string; amount: number }[];
    capital: { code: string; name: string; amount: number }[];
    assets_total: number;
    liabilities_total: number;
    capital_total: number;
    retained: number;
  };
  cash_on_hand: number;
  day_book: {
    id: string; entry_no: string; entry_date: string; type: string;
    party: string | null; narration: string | null; status: string;
    journal_lines: { id: string; debit: number; credit: number; ledger_accounts: { code: string; name: string } | null }[];
  }[];
};

type AccountRow = {
  id: string; code: string; name: string; group: Group;
  opening_balance: number; active: boolean;
};

const TABS = [
  { id: "daybook", label: "Day Book" },
  { id: "accounts", label: "Chart of Accounts" },
  { id: "trial", label: "Trial Balance" },
  { id: "pl", label: "Profit & Loss" },
  { id: "balance", label: "Balance Sheet" },
] as const;

const VOUCHER_TYPES = [
  { value: "receipt", label: "Receipt" },
  { value: "payment", label: "Payment" },
  { value: "journal", label: "Journal" },
  { value: "contra", label: "Contra" },
  { value: "sales", label: "Sales" },
  { value: "purchase", label: "Purchase" },
  { value: "credit_note", label: "Credit note" },
  { value: "debit_note", label: "Debit note" },
];

type DraftLine = { account_id: string; debit: string; credit: string };
const emptyLines = (): DraftLine[] => [
  { account_id: "", debit: "", credit: "" },
  { account_id: "", debit: "", credit: "" },
];

const AccountsPage = () => {
  const { formatCurrency, formatDate } = useFormatters();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("daybook");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [entryNo, setEntryNo] = useState("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("receipt");
  const [party, setParty] = useState("");
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(emptyLines);

  // The chart, for the account pickers. Same cache tag as the accounts table,
  // so adding one shows up in the voucher form without a reload.
  const accountsQuery = useListResourceQuery({ resource: "ledger-accounts", limit: 100, filters: { active: "true" } });
  const accounts = useMemo(
    () => ((accountsQuery.data?.data ?? []) as unknown as AccountRow[]),
    [accountsQuery.data],
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/accounts/summary");
      const body = await res.json().catch(() => null);
      if (!res.ok) { setError(body?.error?.message || "Couldn't load the books."); return; }
      setError(null);
      setSummary(body.data);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const setupChart = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/v1/accounts/chart", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(body?.error?.message || "Couldn't set up the chart of accounts."); return; }
      toast.success("Standard chart of accounts created");
      await load();
      void accountsQuery.refetch();
    } finally {
      setSeeding(false);
    }
  };

  const draftTotals = useMemo(() => {
    const debit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const credit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    return { debit, credit, balanced: Math.round(debit * 100) === Math.round(credit * 100) && debit > 0 };
  }, [lines]);

  const saveVoucher = async () => {
    const usable = lines
      .filter(l => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0))
      .map(l => ({ account_id: l.account_id, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 }));

    if (usable.length < 2) { toast.error("A voucher needs at least one debit and one credit"); return; }
    if (!draftTotals.balanced) { toast.error("Debits and credits must be equal"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/v1/accounts/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_no: entryNo.trim(),
          entry_date: entryDate,
          type,
          party: party.trim(),
          narration: narration.trim(),
          lines: usable,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(body?.error?.message || "Couldn't record that voucher."); return; }
      toast.success(`Voucher ${entryNo.trim()} posted`);
      setCreating(false);
      setEntryNo(""); setParty(""); setNarration(""); setLines(emptyLines());
      await load();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Accounts" subtitle="Ledgers · Vouchers · Statements">
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading…</Card>
      </AdminLayout>
    );
  }

  if (error || !summary) {
    return (
      <AdminLayout title="Accounts" subtitle="Ledgers · Vouchers · Statements">
        <Card className="p-10 text-center">
          <ShieldAlert className="h-6 w-6 text-destructive mx-auto mb-3" />
          <p className="text-sm text-foreground/80">{error ?? "No data."}</p>
          <Btn variant="outline" className="mt-4" onClick={() => { setLoading(true); void load(); }}>Try again</Btn>
        </Card>
      </AdminLayout>
    );
  }

  if (!summary.has_chart) {
    return (
      <AdminLayout title="Accounts" subtitle="Ledgers · Vouchers · Statements">
        <Card className="p-10 text-center max-w-xl mx-auto">
          <BookOpen className="h-7 w-7 text-primary mx-auto mb-3" />
          <p className="font-display text-2xl text-primary">No chart of accounts yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            The books need accounts before anything can be posted to them. This creates the
            standard eighteen — cash, bank, receivables, payables, revenue and expense heads —
            which you can rename, deactivate or add to afterwards.
          </p>
          <Btn className="mt-5" onClick={setupChart} disabled={seeding}>
            {seeding ? "Setting up…" : "Set up the standard chart"}
          </Btn>
        </Card>
      </AdminLayout>
    );
  }

  const { trial_balance, profit_and_loss, balance_sheet, day_book } = summary;
  const balanced = Math.round(trial_balance.debit_total * 100) === Math.round(trial_balance.credit_total * 100);

  return (
    <AdminLayout title="Accounts" subtitle="Ledgers · Vouchers · Statements">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Wallet} label="Cash & bank" value={formatCurrency(summary.cash_on_hand)} />
        <Kpi icon={TrendingUp} label="Income" value={formatCurrency(profit_and_loss.income_total)} tone="accent" />
        <Kpi icon={Landmark} label="Expenses" value={formatCurrency(profit_and_loss.expense_total)} tone="chip" />
        <Kpi icon={Scale} label={profit_and_loss.net >= 0 ? "Surplus" : "Deficit"}
          value={formatCurrency(Math.abs(profit_and_loss.net))}
          tone={profit_and_loss.net >= 0 ? "primary" : "destructive"} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-muted/60"
            }`}>
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Btn variant="outline" onClick={() => exportCSV(
            trial_balance.rows.map(r => ({ Code: r.code, Account: r.name, Group: r.group, Debit: r.debit, Credit: r.credit })),
            "trial-balance.csv",
          )}>
            <Download className="h-4 w-4" /> Export
          </Btn>
          <Btn onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New voucher</Btn>
        </div>
      </div>

      {tab === "daybook" && (
        <Card className="p-5 mt-4">
          <SectionTitle title="Day book" action={<Pill tone="info">{day_book.length} most recent</Pill>} />
          {day_book.length ? (
            <div className="divide-y divide-border/40">
              {day_book.map(v => (
                <div key={v.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-primary">
                        {v.entry_no} <span className="text-xs font-normal text-muted-foreground">· {v.type.replace("_", " ")}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(v.entry_date)}{v.party ? ` · ${v.party}` : ""}
                        {v.narration ? ` · ${v.narration}` : ""}
                      </p>
                    </div>
                    <Pill tone={v.status === "posted" ? "ok" : "warn"}>{v.status}</Pill>
                  </div>
                  <table className="w-full text-sm mt-2">
                    <tbody>
                      {v.journal_lines.map(l => (
                        <tr key={l.id}>
                          <td className="py-1 text-foreground/80">
                            {l.ledger_accounts ? `${l.ledger_accounts.code} · ${l.ledger_accounts.name}` : "—"}
                          </td>
                          <td className="py-1 text-right w-32">{Number(l.debit) ? formatCurrency(Number(l.debit)) : ""}</td>
                          <td className="py-1 text-right w-32">{Number(l.credit) ? formatCurrency(Number(l.credit)) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nothing posted yet. Record a voucher and it appears here.
            </p>
          )}
        </Card>
      )}

      {tab === "accounts" && (
        <Card className="p-5 mt-4">
          <SectionTitle title="Chart of accounts" action={<Pill tone="info">{accounts.length} accounts</Pill>} />
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
              <tr><th className="py-2">Code</th><th>Account</th><th>Group</th><th className="text-right">Opening</th><th className="text-right">Balance</th></tr>
            </thead>
            <tbody>
              {trial_balance.rows.map(r => (
                <tr key={r.account_id} className="border-t border-border/40">
                  <td className="py-2 font-mono text-xs">{r.code}</td>
                  <td className="font-semibold text-primary">{r.name}</td>
                  <td className="capitalize text-muted-foreground">{r.group}</td>
                  <td className="text-right text-muted-foreground">
                    {formatCurrency(Number(accounts.find(a => a.id === r.account_id)?.opening_balance ?? 0))}
                  </td>
                  <td className="text-right font-semibold">{formatCurrency(r.debit || r.credit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "trial" && (
        <Card className="p-5 mt-4">
          <SectionTitle
            title="Trial balance"
            action={<Pill tone={balanced ? "ok" : "bad"}>{balanced ? "Balanced" : "Out of balance"}</Pill>}
          />
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
              <tr><th className="py-2">Code</th><th>Account</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr>
            </thead>
            <tbody>
              {trial_balance.rows.map(r => (
                <tr key={r.account_id} className="border-t border-border/40">
                  <td className="py-2 font-mono text-xs">{r.code}</td>
                  <td>{r.name}</td>
                  <td className="text-right">{r.debit ? formatCurrency(r.debit) : ""}</td>
                  <td className="text-right">{r.credit ? formatCurrency(r.credit) : ""}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-semibold text-primary">
                <td className="py-2" colSpan={2}>Total</td>
                <td className="text-right">{formatCurrency(trial_balance.debit_total)}</td>
                <td className="text-right">{formatCurrency(trial_balance.credit_total)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {tab === "pl" && (
        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <Card className="p-5">
            <SectionTitle title="Income" />
            {profit_and_loss.income.map(r => (
              <div key={r.code} className="flex justify-between py-1.5 text-sm border-b border-border/30">
                <span>{r.name}</span><span className="font-semibold">{formatCurrency(r.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 font-semibold text-primary">
              <span>Total income</span><span>{formatCurrency(profit_and_loss.income_total)}</span>
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Expenses" />
            {profit_and_loss.expense.map(r => (
              <div key={r.code} className="flex justify-between py-1.5 text-sm border-b border-border/30">
                <span>{r.name}</span><span className="font-semibold">{formatCurrency(r.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 font-semibold text-primary">
              <span>Total expenses</span><span>{formatCurrency(profit_and_loss.expense_total)}</span>
            </div>
          </Card>
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-xl text-primary">
                {profit_and_loss.net >= 0 ? "Surplus for the period" : "Deficit for the period"}
              </span>
              <span className={`font-display text-2xl ${profit_and_loss.net >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatCurrency(Math.abs(profit_and_loss.net))}
              </span>
            </div>
          </Card>
        </div>
      )}

      {tab === "balance" && (
        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <Card className="p-5">
            <SectionTitle title="Assets" />
            {balance_sheet.assets.map(r => (
              <div key={r.code} className="flex justify-between py-1.5 text-sm border-b border-border/30">
                <span>{r.name}</span><span className="font-semibold">{formatCurrency(r.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 font-semibold text-primary">
              <span>Total assets</span><span>{formatCurrency(balance_sheet.assets_total)}</span>
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Liabilities & capital" />
            {[...balance_sheet.liabilities, ...balance_sheet.capital].map(r => (
              <div key={r.code} className="flex justify-between py-1.5 text-sm border-b border-border/30">
                <span>{r.name}</span><span className="font-semibold">{formatCurrency(r.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-1.5 text-sm border-b border-border/30">
              <span className="text-muted-foreground">Retained surplus for the period</span>
              <span className="font-semibold">{formatCurrency(balance_sheet.retained)}</span>
            </div>
            <div className="flex justify-between pt-3 font-semibold text-primary">
              <span>Total</span>
              <span>{formatCurrency(balance_sheet.liabilities_total + balance_sheet.capital_total + balance_sheet.retained)}</span>
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => !saving && setCreating(false)}
        title="New voucher"
        footer={
          <>
            <Btn variant="outline" onClick={() => setCreating(false)} disabled={saving}>Cancel</Btn>
            <Btn onClick={saveVoucher} disabled={saving || !draftTotals.balanced || !entryNo.trim()}>
              {saving ? "Posting…" : "Post voucher"}
            </Btn>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Voucher no." required>
            <Input value={entryNo} onChange={e => setEntryNo(e.target.value)} placeholder="RCT-0001" />
          </Field>
          <Field label="Date" required>
            <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={e => setType(e.target.value)}>
              {VOUCHER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Party">
            <Input value={party} onChange={e => setParty(e.target.value)} placeholder="Mr Rahman" />
          </Field>
          <div className="col-span-2">
            <Field label="Narration">
              <Input value={narration} onChange={e => setNarration(e.target.value)} placeholder="OPD consultation fee" />
            </Field>
          </div>
        </div>

        <p className="text-[10px] tracking-widest font-bold text-muted-foreground mt-2 mb-1.5">LINES</p>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_7rem_7rem_2rem] gap-2 items-center">
              <Select value={l.account_id}
                onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, account_id: e.target.value } : x))}>
                <option value="">Select account…</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
              </Select>
              <Input type="number" min={0} step="0.01" placeholder="Debit" value={l.debit}
                onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, debit: e.target.value, credit: "" } : x))} />
              <Input type="number" min={0} step="0.01" placeholder="Credit" value={l.credit}
                onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, credit: e.target.value, debit: "" } : x))} />
              <button type="button" aria-label="Remove line" disabled={lines.length <= 2}
                onClick={() => setLines(ls => ls.filter((_, j) => j !== i))}
                className="h-9 w-9 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive disabled:opacity-30">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3">
          <Btn variant="outline" onClick={() => setLines(ls => [...ls, { account_id: "", debit: "", credit: "" }])}>
            <Plus className="h-4 w-4" /> Add line
          </Btn>
          <div className="text-sm">
            <span className="text-muted-foreground">Debits </span>
            <span className="font-semibold">{formatCurrency(draftTotals.debit)}</span>
            <span className="text-muted-foreground"> · Credits </span>
            <span className="font-semibold">{formatCurrency(draftTotals.credit)}</span>
            {!draftTotals.balanced && <span className="text-destructive font-semibold"> · out of balance</span>}
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};

export default AccountsPage;
