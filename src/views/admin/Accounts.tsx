"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi, SectionTitle } from "@/components/admin/ui";
import { Modal, Field, Input, Select, ConfirmDialog, RowActions, exportCSV } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import { useAppDispatch } from "@/redux/hooks";
import {
  invalidateResource,
  useCreateResourceMutation,
  useListResourceQuery,
  useRemoveResourceMutation,
  useUpdateResourceMutation,
} from "@/redux/api/createResourceApi";
import {
  BookOpen, Wallet, Receipt, Landmark, ScrollText, BookMarked, Calculator,
  TrendingUp, TrendingDown, Banknote, Boxes, Percent, Building2, PiggyBank,
  Plus, Download, Search, FileBarChart, ArrowDownUp, CircleDollarSign, Target,
  ShieldAlert, Pencil, Trash2, Send, Undo2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

/**
 * Accounts & Finance — the Tally-style design, on the hospital's real books.
 *
 * Twelve tabs over one ledger (0063) and the registers beside it (0074).
 * Every figure is posted vouchers added up, by /api/v1/accounts/summary; the
 * page lays the same balances out as a trial balance, a P&L and a balance
 * sheet, because each is one set of rows grouped another way.
 *
 * Four things can be written here, each with its full lifecycle:
 *   vouchers      record, edit the words, post a draft, delete a draft
 *   ledgers       the chart of accounts
 *   stock items   the stores register
 *   cost centers and budgets
 *
 * A posted voucher's amounts cannot be edited — the database refuses. That is
 * the one place this page departs from "edit anything": a ledger that can be
 * rewritten is not a ledger.
 */

/* ================================ TYPES ================================ */

type Group = "asset" | "liability" | "income" | "expense" | "capital";

type Balance = {
  account_id: string; code: string; name: string; group: Group; subgroup: string;
  active: boolean; opening_balance: number; debit_total: number; credit_total: number; balance: number;
};

type MovementLine = {
  id: string; entry_id: string; entry_no: string; entry_date: string; type: string;
  party: string | null; narration: string | null; reconciled_on: string | null;
  account: string; debit: number; credit: number;
};

type Summary = {
  has_chart: boolean;
  balances: Balance[];
  monthly: { month: string; income: number; expense: number }[];
  weekly: { date: string; inflow: number; outflow: number }[];
  spent_by_center: Record<string, number>;
  actuals: Record<string, number>;
  drafts: number;
  bank_lines: MovementLine[];
  tax_lines: MovementLine[];
};

type LedgerRow = {
  id: string; code: string; name: string; group: Group; subgroup: string;
  opening_balance: number; active: boolean;
};

type VoucherType =
  | "payment" | "receipt" | "contra" | "journal" | "sales" | "purchase" | "credit_note" | "debit_note";

type Voucher = {
  id: string; entry_no: string; entry_date: string; type: VoucherType;
  party: string | null; narration: string | null; status: "draft" | "posted";
  cost_center_id: string | null; reconciled_on: string | null;
  cost_centers: { id: string; name: string } | null;
  journal_lines: {
    id: string; debit: number; credit: number; account_id: string;
    ledger_accounts: { id: string; code: string; name: string } | null;
  }[];
};

type StockItem = {
  id: string; name: string; unit: string; qty: number; rate: number; value: number; reorder: number;
};

type CostCenter = { id: string; name: string; budget: number; active: boolean };

type Budget = {
  id: string; account_id: string; period: string; planned: number;
  ledger_accounts: { id: string; code: string; name: string; group: Group } | null;
};

/* =============================== CONSTANTS =============================== */

const TABS = [
  { id: "dashboard", icon: TrendingUp },
  { id: "vouchers", icon: ScrollText },
  { id: "daybook", icon: BookOpen },
  { id: "ledgers", icon: BookMarked },
  { id: "trial", icon: Calculator },
  { id: "pl", icon: TrendingUp },
  { id: "balance", icon: Landmark },
  { id: "cashflow", icon: Banknote },
  { id: "inventory", icon: Boxes },
  { id: "tax", icon: Percent },
  { id: "cost", icon: Building2 },
  { id: "budget", icon: Target },
] as const;
type TabId = typeof TABS[number]["id"];

const VOUCHER_TYPES: { value: VoucherType; prefix: string }[] = [
  { value: "payment", prefix: "PMT" },
  { value: "receipt", prefix: "RCT" },
  { value: "contra", prefix: "CON" },
  { value: "journal", prefix: "JRN" },
  { value: "sales", prefix: "SAL" },
  { value: "purchase", prefix: "PUR" },
  { value: "credit_note", prefix: "CRN" },
  { value: "debit_note", prefix: "DRN" },
];

/** Tally's groups, in the order its "Group" picker lists them. Keys are 0074's. */
const SUBGROUPS = [
  "cash_in_hand", "bank_accounts", "current_assets", "sundry_debtors", "fixed_assets",
  "sundry_creditors", "duties_taxes", "current_liabilities", "loans", "capital",
  "direct_income", "indirect_income", "direct_expenses", "indirect_expenses",
] as const;

const UNITS = ["pcs", "box", "strip", "vial", "pack", "kg", "ltr"] as const;

/** Table headings, by key. The label comes from the language; the key decides alignment. */
type ColKey =
  | "no" | "date" | "type" | "party" | "drAc" | "crAc" | "amount" | "status" | "voucher" | "particulars"
  | "debit" | "credit" | "ledger" | "group" | "opening" | "closing" | "bankStatement" | "books"
  | "item" | "unit" | "qty" | "rate" | "value" | "reorder" | "outputVat" | "inputVat"
  | "head" | "period" | "planned" | "actual" | "variance" | "utilization";

const MIX_COLORS = ["hsl(var(--primary))", "hsl(var(--primary-glow))", "hsl(var(--accent))", "hsl(var(--chip))"];
const TOOLTIP_STYLE = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 };

/** Assets and expenses grow with debits; everything else with credits. */
const debitNature = (g: Group) => g === "asset" || g === "expense";

/**
 * Which column a balance sits in. A natural balance stays on its own side;
 * one gone the other way — an overdrawn bank, a refund larger than the sales —
 * crosses over, which is what a trial balance is for spotting.
 */
const sideOf = (b: { group: Group; balance: number }) =>
  (debitNature(b.group) ? b.balance >= 0 : b.balance < 0) ? "Dr" as const : "Cr" as const;

const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

/** The first day of the current financial year. Bangladesh's runs July to June. */
const financialYearStart = () => {
  const now = new Date();
  const year = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${year}-07-01`;
};

/** Bangla month and weekday names, with the Western digits the rest of the app uses. */
const intlOf = (locale: string) => (locale === "bn" ? "bn-BD-u-nu-latn" : "en");

/** Month and weekday names from a plain date, read as UTC so no timezone moves the day. */
const monthName = (iso: string, locale: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleString(intlOf(locale), { month: "short", timeZone: "UTC" });
const monthYear = (iso: string, locale: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleString(intlOf(locale), { month: "long", year: "numeric", timeZone: "UTC" });
const weekday = (iso: string, locale: string) => new Date(`${iso}T00:00:00Z`).toLocaleString(intlOf(locale), { weekday: "short", timeZone: "UTC" });
const compactIn = (locale: string) => (n: number) => new Intl.NumberFormat(intlOf(locale), { notation: "compact" }).format(n);

type ApiError = { data?: { error?: { message?: string } } };
const errorOf = (e: unknown, fallback: string) => (e as ApiError)?.data?.error?.message ?? fallback;

/** The labels every part of this page shares — voucher types, groups, units. */
const useAccountWords = () => {
  const t = useTranslations("admin.accounts");
  return {
    t,
    typeLabel: (type: string) =>
      VOUCHER_TYPES.some(v => v.value === type) ? t(`voucherTypes.${type as VoucherType}`) : type,
    subgroupLabel: (s: string) =>
      (SUBGROUPS as readonly string[]).includes(s) ? t(`subgroups.${s as (typeof SUBGROUPS)[number]}`) : s,
    unitLabel: (u: string) =>
      (UNITS as readonly string[]).includes(u) ? t(`units.${u as (typeof UNITS)[number]}`) : u,
  };
};

/* ================================ COMPONENT ================================ */

const Accounts = () => {
  const { t, typeLabel, subgroupLabel, unitLabel } = useAccountWords();
  const tc = useTranslations("common");
  const locale = useLocale();
  const compact = compactIn(locale);
  const { formatCurrency: fmt, formatDate } = useFormatters();
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<TabId>("dashboard");

  /* ---- the numbers ---- */
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/accounts/summary");
      const body = await res.json().catch(() => null);
      if (!res.ok) { setError(body?.error?.message || t("loadFailed")); return; }
      setError(null);
      setSummary(body.data);
    } catch {
      setError(tc("networkError"));
    } finally {
      setLoading(false);
    }
  }, [t, tc]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);

  /* ---- the registers ---- */
  const ledgersQuery = useListResourceQuery({ resource: "ledger-accounts", limit: 100 });
  const vouchersQuery = useListResourceQuery({ resource: "journal-entries", limit: 100 });
  const stockQuery = useListResourceQuery({ resource: "stock-items", limit: 100 });
  const centersQuery = useListResourceQuery({ resource: "cost-centers", limit: 100 });
  const budgetsQuery = useListResourceQuery({ resource: "budgets", limit: 100 });

  const ledgers = (ledgersQuery.data?.data ?? []) as LedgerRow[];
  const vouchers = (vouchersQuery.data?.data ?? []) as Voucher[];
  const stock = (stockQuery.data?.data ?? []) as StockItem[];
  const centers = (centersQuery.data?.data ?? []) as CostCenter[];
  const budgets = (budgetsQuery.data?.data ?? []) as Budget[];
  const activeLedgers = ledgers.filter(l => l.active);

  const [createRow] = useCreateResourceMutation();
  const [updateRow] = useUpdateResourceMutation();
  const [removeRow] = useRemoveResourceMutation();

  /** Anything that moves a balance: the vouchers list and the summary both. */
  const refreshBooks = () => {
    dispatch(invalidateResource("journal-entries"));
    void loadSummary();
  };

  /* ---- modal state ---- */
  const [vOpen, setVOpen] = useState(false);
  const [viewing, setViewing] = useState<Voucher | null>(null);
  const [editingV, setEditingV] = useState<Voucher | null>(null);
  const [lEdit, setLEdit] = useState<LedgerRow | "new" | null>(null);
  const [sEdit, setSEdit] = useState<StockItem | "new" | null>(null);
  const [cEdit, setCEdit] = useState<CostCenter | "new" | null>(null);
  const [bEdit, setBEdit] = useState<Budget | "new" | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; description: string; run: () => Promise<void> } | null>(null);
  const [busy, setBusy] = useState(false);

  const [q, setQ] = useState("");
  const [vType, setVType] = useState<string>("all");

  /* ---- derived totals ---- */
  const balances = useMemo(() => summary?.balances ?? [], [summary]);
  const totals = useMemo(() => {
    const sumOf = (pred: (b: Balance) => boolean) => balances.filter(pred).reduce((s, b) => s + b.balance, 0);
    const income = sumOf(b => b.group === "income");
    const directIncome = sumOf(b => b.subgroup === "direct_income");
    const directExp = sumOf(b => b.subgroup === "direct_expenses");
    const indirectExp = sumOf(b => b.subgroup === "indirect_expenses");
    const expense = directExp + indirectExp;
    return {
      income, expense, directExp, indirectExp,
      grossProfit: directIncome - directExp,
      netProfit: income - expense,
      cashBal: sumOf(b => b.subgroup === "cash_in_hand"),
      bankBal: sumOf(b => b.subgroup === "bank_accounts"),
      receivables: sumOf(b => b.subgroup === "sundry_debtors"),
      payables: sumOf(b => b.subgroup === "sundry_creditors"),
      taxDue: sumOf(b => b.subgroup === "duties_taxes"),
    };
  }, [balances]);

  /**
   * Income less expense posted since the financial year began, for the tile.
   * `actuals` is every account's net movement per month, already in each
   * account's own direction, so this is a sum over the months that count.
   */
  const fyNetProfit = useMemo(() => {
    const groupOf = new Map(balances.map(b => [b.account_id, b.group]));
    const start = financialYearStart();
    return Object.entries(summary?.actuals ?? {}).reduce((sum, [key, amount]) => {
      const [accountId, month] = key.split(":");
      if (month < start) return sum;
      const group = groupOf.get(accountId);
      return group === "income" ? sum + amount : group === "expense" ? sum - amount : sum;
    }, 0);
  }, [balances, summary]);

  /** This month's result against last month's, for the net profit tile. */
  const trend = useMemo(() => {
    const m = summary?.monthly ?? [];
    if (m.length < 2) return undefined;
    const now = m[m.length - 1].income - m[m.length - 1].expense;
    const before = m[m.length - 2].income - m[m.length - 2].expense;
    if (!before) return undefined;
    const pct = ((now - before) / Math.abs(before)) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  }, [summary]);

  const filteredVouchers = vouchers.filter(v =>
    (vType === "all" || v.type === vType) &&
    (!q || `${v.entry_no} ${v.party ?? ""} ${v.narration ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );

  const statusWord = (status: Voucher["status"]) => (status === "posted" ? t("posted") : t("draft"));

  /* ---- actions ---- */
  const setupChart = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/v1/accounts/chart", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(body?.error?.message || t("noChart.failed")); return; }
      toast.success(t("noChart.created"));
      dispatch(invalidateResource("ledger-accounts"));
      await loadSummary();
    } finally {
      setSeeding(false);
    }
  };

  const postDraft = async (v: Voucher) => {
    const res = await fetch(`/api/v1/accounts/vouchers/${v.id}/post`, { method: "POST" });
    const body = await res.json().catch(() => null);
    if (!res.ok) { toast.error(body?.error?.message || t("vouchers.postFailed")); return; }
    toast.success(t("vouchers.postedToast", { no: v.entry_no }));
    refreshBooks();
  };

  /** Deletes through the factory, reporting the reason the server gives. */
  const remove = async (
    resource: string, id: string, what: "voucher" | "ledger" | "stockItem" | "costCenter" | "budget", after?: () => void,
  ) => {
    try {
      await removeRow({ resource, id }).unwrap();
      toast.success(t(`deleted.${what}`));
      after?.();
    } catch (e) {
      toast.error(errorOf(e, t(`deleteFailed.${what}`)));
    }
  };

  const setReconciled = async (entryId: string, date: string | null) => {
    try {
      await updateRow({ resource: "journal-entries", id: entryId, body: { reconciled_on: date } }).unwrap();
      return true;
    } catch (e) {
      toast.error(errorOf(e, t("cash.reconcileFailed")));
      return false;
    }
  };

  /* ============================ STATES ============================ */
  const shell = (children: React.ReactNode) => (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>{children}</AdminLayout>
  );

  if (loading) return shell(<Card className="p-10 text-center text-sm text-muted-foreground">{t("loadingBooks")}</Card>);

  if (error || !summary) {
    return shell(
      <Card className="p-10 text-center">
        <ShieldAlert className="h-6 w-6 text-destructive mx-auto mb-3" />
        <p className="text-sm text-foreground/80">{error ?? t("noData")}</p>
        <Btn variant="outline" className="mt-4" onClick={() => { setLoading(true); void loadSummary(); }}>{t("tryAgain")}</Btn>
      </Card>,
    );
  }

  if (!summary.has_chart) {
    return shell(
      <Card className="p-10 text-center max-w-xl mx-auto">
        <BookOpen className="h-7 w-7 text-primary mx-auto mb-3" />
        <p className="font-display text-2xl text-primary">{t("noChart.title")}</p>
        <p className="text-sm text-muted-foreground mt-2">{t("noChart.body")}</p>
        <Btn className="mt-5" onClick={setupChart} disabled={seeding}>
          {seeding ? t("noChart.settingUp") : t("noChart.setup")}
        </Btn>
      </Card>,
    );
  }

  const cashAndBank = balances.filter(b => b.subgroup === "cash_in_hand" || b.subgroup === "bank_accounts");
  const revenueMix = balances.filter(b => b.group === "income" && b.balance > 0).map(b => ({ name: b.name, value: b.balance }));
  const pendingBank = summary.bank_lines.filter(l => !l.reconciled_on);

  /* ============================ RENDER ============================ */
  return shell(
    <>
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi icon={CircleDollarSign} label={t("kpis.netProfitFy")} value={fmt(fyNetProfit)} trend={trend} />
        <Kpi icon={Wallet} label={t("kpis.cashBank")} value={fmt(totals.cashBal + totals.bankBal)} tone="accent" />
        <Kpi icon={Receipt} label={t("kpis.receivables")} value={fmt(totals.receivables)} tone="chip" />
        <Kpi icon={TrendingDown} label={t("kpis.payables")} value={fmt(totals.payables)} tone="destructive" />
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-card border border-border/60 shadow-soft">
        {TABS.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === item.id ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-muted/60"
            }`}>
            <item.icon className="h-3.5 w-3.5" /> {t(`tabs.${item.id}`)}
          </button>
        ))}
      </div>

      {/* ====================== DASHBOARD ====================== */}
      {tab === "dashboard" && (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="p-5 lg:col-span-2">
            <SectionTitle title={t("dashboard.incomeVsExpense")} />
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={summary.monthly.map(m => ({ ...m, m: monthName(m.month, locale) }))}>
                <defs>
                  <linearGradient id="gi" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ge" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={compact} />
                <RTip contentStyle={TOOLTIP_STYLE} formatter={v => fmt(Number(v))} />
                <Area type="monotone" dataKey="income" name={t("chart.income")} stroke="hsl(var(--primary))" fill="url(#gi)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name={t("chart.expense")} stroke="hsl(var(--destructive))" fill="url(#ge)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5">
            <SectionTitle title={t("dashboard.revenueMix")} />
            {revenueMix.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={revenueMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {revenueMix.map((_, i) => <Cell key={i} fill={MIX_COLORS[i % MIX_COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <RTip contentStyle={TOOLTIP_STYLE} formatter={v => fmt(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty>{t("dashboard.noIncome")}</Empty>
            )}
          </Card>

          <Card className="p-5 lg:col-span-2">
            <SectionTitle title={t("dashboard.weeklyCashFlow")} />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={summary.weekly.map(d => ({ ...d, d: weekday(d.date, locale) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={compact} />
                <RTip contentStyle={TOOLTIP_STYLE} formatter={v => fmt(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="inflow" name={t("chart.inflow")} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="outflow" name={t("chart.outflow")} fill="hsl(var(--accent-foreground))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <SectionTitle title={t("dashboard.quickStats")} />
            <ul className="space-y-3 text-sm">
              <Stat label={t("dashboard.grossProfit")} value={fmt(totals.grossProfit)} tone={totals.grossProfit >= 0 ? "ok" : "bad"} />
              <Stat label={t("dashboard.directExpenses")} value={fmt(totals.directExp)} />
              <Stat label={t("dashboard.indirectExpenses")} value={fmt(totals.indirectExp)} />
              <Stat label={t("dashboard.vatPayable")} value={fmt(totals.taxDue)} tone="warn" />
              <Stat label={t("dashboard.openVouchers")} value={String(summary.drafts)} />
              <Stat label={t("dashboard.activeLedgers")} value={String(activeLedgers.length)} />
            </ul>
          </Card>
        </div>
      )}

      {/* ====================== VOUCHERS ====================== */}
      {tab === "vouchers" && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("vouchers.searchPlaceholder")}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-muted/40 text-sm outline-none" />
            </div>
            <select value={vType} onChange={e => setVType(e.target.value)} className="bg-muted/40 rounded-full px-4 py-2 text-sm outline-none">
              <option value="all">{t("vouchers.allTypes")}</option>
              {VOUCHER_TYPES.map(v => <option key={v.value} value={v.value}>{typeLabel(v.value)}</option>)}
            </select>
            <Btn variant="outline" onClick={() => exportCSV(filteredVouchers.map(v => ({
              [t("cols.no")]: v.entry_no, [t("cols.date")]: v.entry_date, [t("cols.type")]: typeLabel(v.type),
              [t("cols.party")]: v.party ?? "", [t("cols.drAc")]: drAccounts(v), [t("cols.crAc")]: crAccounts(v),
              [t("cols.amount")]: voucherAmount(v), [t("cols.status")]: statusWord(v.status),
              [t("form.costCenter")]: v.cost_centers?.name ?? "", [t("form.narration")]: v.narration ?? "",
            })), "vouchers.csv")}><Download className="h-4 w-4" /> {t("export")}</Btn>
            <Btn onClick={() => setVOpen(true)}><Plus className="h-4 w-4" /> {t("form.newVoucher")}</Btn>
          </div>
          <TableShell head={["no", "date", "type", "party", "drAc", "crAc", "amount", "status"]} actions>
            {filteredVouchers.map(v => (
              <tr key={v.id} className="border-t border-border/40 hover:bg-muted/30 cursor-pointer" onClick={() => setViewing(v)}>
                <td className="px-3 py-2.5 font-mono text-xs">{v.entry_no}</td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDate(v.entry_date)}</td>
                <td className="px-3 py-2.5"><Pill tone={voucherTone(v.type)}>{typeLabel(v.type)}</Pill></td>
                <td className="px-3 py-2.5 font-semibold text-primary">{v.party || "—"}</td>
                <td className="px-3 py-2.5 text-xs">{drAccounts(v)}</td>
                <td className="px-3 py-2.5 text-xs">{crAccounts(v)}</td>
                <td className="px-3 py-2.5 text-right font-semibold">{fmt(voucherAmount(v))}</td>
                <td className="px-3 py-2.5"><Pill tone={v.status === "posted" ? "ok" : "warn"}>{statusWord(v.status)}</Pill></td>
                <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                  <RowActions
                    onView={() => setViewing(v)}
                    onEdit={() => setEditingV(v)}
                    onDelete={v.status === "draft" ? () => setConfirm({
                      title: t("deleteTitle", { name: v.entry_no }),
                      description: t("vouchers.deleteBody"),
                      run: () => remove("journal-entries", v.id, "voucher", refreshBooks),
                    }) : undefined}
                    extra={v.status === "draft" ? (
                      <button onClick={() => postDraft(v)} className="p-1.5 rounded-lg hover:bg-muted text-primary" title={t("vouchers.post")}>
                        <Send className="h-4 w-4" />
                      </button>
                    ) : undefined}
                  />
                </td>
              </tr>
            ))}
            {!filteredVouchers.length && <EmptyRow cols={9}>{vouchers.length ? t("vouchers.noMatch") : t("vouchers.none")}</EmptyRow>}
          </TableShell>
        </Card>
      )}

      {/* ====================== DAY BOOK ====================== */}
      {tab === "daybook" && (
        <Card className="p-5">
          <SectionTitle title={t("daybook.title")}
            action={<Btn variant="outline" onClick={() => exportCSV(vouchers.flatMap(v => v.journal_lines.map(l => ({
              [t("cols.date")]: v.entry_date, [t("cols.voucher")]: v.entry_no, [t("cols.type")]: typeLabel(v.type),
              [t("cols.party")]: v.party ?? "", [t("cols.ledger")]: l.ledger_accounts?.name ?? "",
              [t("cols.debit")]: Number(l.debit) || "", [t("cols.credit")]: Number(l.credit) || "",
            }))), "daybook.csv")}><Download className="h-4 w-4" /> {t("export")}</Btn>} />
          <TableShell head={["date", "voucher", "type", "particulars", "debit", "credit"]}>
            {[...vouchers].sort((a, b) => b.entry_date.localeCompare(a.entry_date)).map(v => (
              <tr key={v.id} className="border-t border-border/40 hover:bg-muted/30">
                <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDate(v.entry_date)}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{v.entry_no}</td>
                <td className="px-3 py-2.5"><Pill tone={voucherTone(v.type)}>{typeLabel(v.type)}</Pill></td>
                <td className="px-3 py-2.5 text-xs">
                  <div className="font-semibold text-primary">
                    {v.party || v.narration || "—"}
                    {v.status === "draft" && <span className="ml-2 font-normal text-yellow-700">{t("daybook.draftTag")}</span>}
                  </div>
                  <div className="text-muted-foreground">{t("daybook.drCr", { dr: drAccounts(v), cr: crAccounts(v) })}</div>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-primary">{fmt(voucherAmount(v))}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-primary">{fmt(voucherAmount(v, "credit"))}</td>
              </tr>
            ))}
            {!vouchers.length && <EmptyRow cols={6}>{t("daybook.nothing")}</EmptyRow>}
          </TableShell>
        </Card>
      )}

      {/* ====================== LEDGERS ====================== */}
      {tab === "ledgers" && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl text-primary">{t("ledgers.title")}</h2>
            <div className="flex gap-2">
              <Btn variant="outline" onClick={() => exportCSV(balances.map(b => ({
                [t("form.code")]: b.code, [t("cols.ledger")]: b.name, [t("cols.group")]: subgroupLabel(b.subgroup),
                [t("cols.opening")]: b.opening_balance, [t("cols.debit")]: b.debit_total, [t("cols.credit")]: b.credit_total,
                [t("cols.closing")]: Math.abs(b.balance), [t("ledgers.side")]: sideOf(b),
              })), "ledgers.csv")}><Download className="h-4 w-4" /> {t("export")}</Btn>
              <Btn onClick={() => setLEdit("new")}><Plus className="h-4 w-4" /> {t("form.newLedger")}</Btn>
            </div>
          </div>
          <TableShell head={["ledger", "group", "opening", "debit", "credit", "closing"]} actions>
            {balances.map(b => {
              const side = sideOf(b);
              const row = ledgers.find(l => l.id === b.account_id);
              return (
                <tr key={b.account_id} className={`border-t border-border/40 hover:bg-muted/30 ${b.active ? "" : "opacity-60"}`}>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-primary">{b.name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{b.code}{!b.active && ` · ${t("inactive")}`}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs"><Pill tone="info">{subgroupLabel(b.subgroup)}</Pill></td>
                  <td className="px-3 py-2.5 text-right text-xs">{fmt(b.opening_balance)}</td>
                  <td className="px-3 py-2.5 text-right text-xs">{fmt(b.debit_total)}</td>
                  <td className="px-3 py-2.5 text-right text-xs">{fmt(b.credit_total)}</td>
                  <td className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${side === "Cr" ? "text-destructive" : "text-primary"}`}>
                    {fmt(Math.abs(b.balance))} {side}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <RowActions
                      onEdit={row ? () => setLEdit(row) : undefined}
                      onDelete={() => setConfirm({
                        title: t("deleteTitle", { name: b.name }),
                        description: t("ledgers.deleteBody"),
                        run: () => remove("ledger-accounts", b.account_id, "ledger", () => void loadSummary()),
                      })}
                    />
                  </td>
                </tr>
              );
            })}
          </TableShell>
        </Card>
      )}

      {/* ====================== TRIAL BALANCE ====================== */}
      {tab === "trial" && (() => {
        // Every ledger, as the design lists them — a zero shows as a dash on
        // both sides rather than the row disappearing.
        const totalDr = balances.filter(b => sideOf(b) === "Dr").reduce((s, b) => s + Math.abs(b.balance), 0);
        const totalCr = balances.filter(b => sideOf(b) === "Cr").reduce((s, b) => s + Math.abs(b.balance), 0);
        return (
          <Card className="p-5">
            <SectionTitle title={t("trial.title")} />
            <TableShell head={["ledger", "group", "debit", "credit"]}>
              {balances.map(b => (
                <tr key={b.account_id} className="border-t border-border/40">
                  <td className="px-3 py-2.5 font-semibold text-primary">{b.name}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{subgroupLabel(b.subgroup)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{b.balance && sideOf(b) === "Dr" ? fmt(Math.abs(b.balance)) : "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{b.balance && sideOf(b) === "Cr" ? fmt(Math.abs(b.balance)) : "—"}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-primary/30 bg-primary/5 font-bold">
                <td className="px-3 py-3 uppercase" colSpan={2}>{t("trial.total")}</td>
                <td className="px-3 py-3 text-right text-primary">{fmt(totalDr)}</td>
                <td className="px-3 py-3 text-right text-primary">{fmt(totalCr)}</td>
              </tr>
            </TableShell>
          </Card>
        );
      })()}

      {/* ====================== P&L ====================== */}
      {tab === "pl" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <SectionTitle title={t("pl.income")} />
            <ul className="space-y-2 text-sm">
              {balances.filter(b => b.group === "income").map(b => (
                <Stat key={b.account_id} label={b.name} value={fmt(b.balance)} tone="ok" />
              ))}
              <li className="border-t border-border/60 pt-3 mt-3 flex justify-between font-bold text-primary">
                <span>{t("pl.totalIncome")}</span><span>{fmt(totals.income)}</span>
              </li>
            </ul>
          </Card>
          <Card className="p-5">
            <SectionTitle title={t("pl.expenses")} />
            <ul className="space-y-2 text-sm">
              {balances.filter(b => b.group === "expense").map(b => (
                <Stat key={b.account_id} label={b.name} value={fmt(b.balance)} tone="bad" />
              ))}
              <li className="border-t border-border/60 pt-3 mt-3 flex justify-between font-bold text-primary">
                <span>{t("pl.totalExpenses")}</span><span>{fmt(totals.expense)}</span>
              </li>
            </ul>
          </Card>
          <Card className="p-6 lg:col-span-2 bg-gradient-to-r from-primary/10 to-accent/30">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-widest font-bold text-muted-foreground uppercase">{totals.netProfit >= 0 ? t("pl.netProfit") : t("pl.netLoss")}</p>
                <p className={`font-display text-4xl mt-1 ${totals.netProfit >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(Math.abs(totals.netProfit))}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("pl.formula", { income: fmt(totals.income), expense: fmt(totals.expense) })}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] tracking-widest font-bold text-muted-foreground uppercase">{t("dashboard.grossProfit")}</p>
                <p className="font-display text-3xl text-primary mt-1">{fmt(totals.grossProfit)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("pl.margin", { pct: totals.income ? ((totals.netProfit / totals.income) * 100).toFixed(1) : "0.0" })}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ====================== BALANCE SHEET ====================== */}
      {tab === "balance" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <SectionTitle title={t("balance.assets")} />
            <ul className="space-y-2 text-sm">
              {balances.filter(b => b.group === "asset").map(b => (
                <Stat key={b.account_id} label={b.name} value={fmt(b.balance)} />
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <SectionTitle title={t("balance.liabilitiesCapital")} />
            <ul className="space-y-2 text-sm">
              {balances.filter(b => b.group === "liability" || b.group === "capital").map(b => (
                <Stat key={b.account_id} label={b.name} value={fmt(b.balance)} />
              ))}
              <Stat label={t("balance.retained")} value={fmt(totals.netProfit)} tone={totals.netProfit >= 0 ? "ok" : "bad"} />
            </ul>
          </Card>
        </div>
      )}

      {/* ====================== CASH & BANK ====================== */}
      {tab === "cashflow" && (
        <div className="grid lg:grid-cols-3 gap-5">
          {cashAndBank.map(b => (
            <Card key={b.account_id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  {b.subgroup === "cash_in_hand" ? <Wallet className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
                </div>
                <Pill tone="info">{subgroupLabel(b.subgroup)}</Pill>
              </div>
              <p className="text-xs text-muted-foreground">{b.name}</p>
              <p className={`font-display text-2xl mt-1 ${b.balance < 0 ? "text-destructive" : "text-primary"}`}>{fmt(b.balance)}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground">{t("chart.inflow")}</p>
                  <p className="font-bold text-primary">{fmt(b.debit_total)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground">{t("chart.outflow")}</p>
                  <p className="font-bold text-destructive">{fmt(b.credit_total)}</p>
                </div>
              </div>
            </Card>
          ))}
          {!cashAndBank.length && (
            <Card className="p-5 lg:col-span-3"><Empty>{t("cash.noLedger")}</Empty></Card>
          )}
          <Card className="p-5 lg:col-span-3">
            <SectionTitle title={t("reconcile.title")}
              action={<Btn variant="outline" onClick={() => setReconciling(true)} disabled={!pendingBank.length}>
                <ArrowDownUp className="h-4 w-4" /> {t("cash.reconcile")}
              </Btn>} />
            <TableShell head={["date", "voucher", "particulars", "bankStatement", "books", "status"]} actions>
              {summary.bank_lines.slice(0, 50).map(l => {
                const amount = l.debit - l.credit;
                return (
                  <tr key={l.id} className="border-t border-border/40">
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDate(l.entry_date)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{l.entry_no}</td>
                    <td className="px-3 py-2.5 text-xs">{l.narration || l.party || typeLabel(l.type)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{l.reconciled_on ? fmt(amount) : "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(amount)}</td>
                    <td className="px-3 py-2.5">
                      <Pill tone={l.reconciled_on ? "ok" : "warn"}>{l.reconciled_on ? t("cash.matched", { date: formatDate(l.reconciled_on) }) : t("cash.pending")}</Pill>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {l.reconciled_on && (
                        <button title={t("cash.undo")} className="p-1.5 rounded-lg hover:bg-muted text-foreground/70"
                          onClick={async () => { if (await setReconciled(l.entry_id, null)) { toast.success(t("cash.unmatched", { no: l.entry_no })); void loadSummary(); } }}>
                          <Undo2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!summary.bank_lines.length && <EmptyRow cols={7}>{t("cash.nothingPosted")}</EmptyRow>}
            </TableShell>
          </Card>
        </div>
      )}

      {/* ====================== INVENTORY ====================== */}
      {tab === "inventory" && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl text-primary">{t("inventory.title")}</h2>
            <div className="flex gap-2">
              <Btn variant="outline" onClick={() => exportCSV(stock.map(i => ({
                [t("cols.item")]: i.name, [t("cols.unit")]: unitLabel(i.unit), [t("cols.qty")]: i.qty,
                [t("cols.rate")]: Number(i.rate), [t("cols.value")]: Number(i.value), [t("cols.reorder")]: i.reorder,
              })), "stock.csv")}><Download className="h-4 w-4" /> {t("export")}</Btn>
              <Btn onClick={() => setSEdit("new")}><Plus className="h-4 w-4" /> {t("inventory.addItem")}</Btn>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <Kpi icon={Boxes} label={t("inventory.totalSkus")} value={String(stock.length)} />
            <Kpi icon={PiggyBank} label={t("inventory.stockValue")} value={fmt(stock.reduce((s, i) => s + Number(i.value), 0))} tone="accent" />
            <Kpi icon={TrendingDown} label={t("inventory.reorderNeeded")} value={String(stock.filter(i => i.qty <= i.reorder).length)} tone="destructive" />
          </div>
          <TableShell head={["item", "unit", "qty", "rate", "value", "reorder", "status"]} actions>
            {stock.map(i => {
              const low = i.qty <= i.reorder;
              return (
                <tr key={i.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-semibold text-primary">{i.name}</td>
                  <td className="px-3 py-2.5 text-xs">{unitLabel(i.unit)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{i.qty}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(Number(i.rate))}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-primary">{fmt(Number(i.value))}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{i.reorder}</td>
                  <td className="px-3 py-2.5"><Pill tone={low ? "bad" : "ok"}>{low ? t("inventory.low") : t("inventory.healthy")}</Pill></td>
                  <td className="px-3 py-2.5 text-right">
                    <RowActions
                      onEdit={() => setSEdit(i)}
                      onDelete={() => setConfirm({
                        title: t("deleteTitle", { name: i.name }),
                        description: t("inventory.deleteBody"),
                        run: () => remove("stock-items", i.id, "stockItem"),
                      })}
                    />
                  </td>
                </tr>
              );
            })}
            {!stock.length && <EmptyRow cols={8}>{t("inventory.none")}</EmptyRow>}
          </TableShell>
        </Card>
      )}

      {/* ====================== TAX ====================== */}
      {tab === "tax" && (() => {
        const returnLines = summary.tax_lines.filter(l => l.entry_date.startsWith(thisMonth()));
        return (
          <div className="grid lg:grid-cols-3 gap-5">
            <Card className="p-6 lg:col-span-1">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 text-destructive grid place-items-center mb-3">
                <Percent className="h-6 w-6" />
              </div>
              <p className="text-[11px] tracking-widest font-bold text-muted-foreground uppercase">{t("dashboard.vatPayable")}</p>
              <p className="font-display text-3xl text-primary mt-1">{fmt(totals.taxDue)}</p>
              <p className="text-xs text-muted-foreground mt-2">{t("tax.due")}</p>
              <Btn className="mt-4 w-full justify-center" onClick={() => exportCSV(returnLines.map(l => ({
                [t("cols.date")]: l.entry_date, [t("cols.voucher")]: l.entry_no, [t("cols.party")]: l.party ?? "",
                [t("cols.particulars")]: l.narration ?? "", [t("cols.ledger")]: l.account,
                [t("cols.outputVat")]: l.credit || "", [t("cols.inputVat")]: l.debit || "",
              })), `vat-return-${thisMonth()}.csv`)}>
                <FileBarChart className="h-4 w-4" /> {t("tax.generate")}
              </Btn>
            </Card>
            <Card className="p-5 lg:col-span-2">
              <SectionTitle title={t("tax.movements")} />
              <TableShell head={["date", "voucher", "particulars", "outputVat", "inputVat"]}>
                {summary.tax_lines.map(l => (
                  <tr key={l.id} className="border-t border-border/40">
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDate(l.entry_date)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{l.entry_no}</td>
                    <td className="px-3 py-2.5 text-xs">{[l.party, l.narration].filter(Boolean).join(" — ") || l.account}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{l.credit ? fmt(l.credit) : "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{l.debit ? fmt(l.debit) : "—"}</td>
                  </tr>
                ))}
                {!summary.tax_lines.length && <EmptyRow cols={5}>{t("tax.none")}</EmptyRow>}
              </TableShell>
            </Card>
          </div>
        );
      })()}

      {/* ====================== COST CENTERS ====================== */}
      {tab === "cost" && (
        <>
          {/* The design is the cards alone; the button is the one addition,
              because without it there would be no way to make a card. */}
          <div className="flex justify-end mb-4">
            <Btn onClick={() => setCEdit("new")}><Plus className="h-4 w-4" /> {t("form.newCenter")}</Btn>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {centers.map(c => {
              const spent = summary.spent_by_center[c.id] ?? 0;
              const budget = Number(c.budget);
              const pct = budget ? Math.round((spent / budget) * 100) : 0;
              const over = pct > 90;
              return (
                <Card key={c.id} className={`p-5 ${c.active ? "" : "opacity-60"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg text-primary truncate">{c.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <Pill tone={over ? "bad" : pct > 75 ? "warn" : "ok"}>{pct}%</Pill>
                      <button title={tc("edit")} onClick={() => setCEdit(c)} className="p-1.5 rounded-lg hover:bg-muted text-foreground/70"><Pencil className="h-3.5 w-3.5" /></button>
                      <button title={tc("delete")} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                        onClick={() => setConfirm({
                          title: t("deleteTitle", { name: c.name }),
                          description: t("cost.deleteBody"),
                          run: () => remove("cost-centers", c.id, "costCenter", refreshBooks),
                        })}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t("cost.budgetLine", { amount: fmt(budget) })}{!c.active && ` · ${t("inactive")}`}</p>
                  <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${over ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="mt-3 flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("cost.spent")}</span>
                    <span className="font-bold text-primary">{fmt(spent)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("cost.remaining")}</span>
                    <span className={`font-bold ${budget - spent < 0 ? "text-destructive" : "text-primary"}`}>{fmt(budget - spent)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
          {!centers.length && (
            <Card className="p-5">
              <Empty>{t("cost.none")}</Empty>
            </Card>
          )}
        </>
      )}

      {/* ====================== BUDGETS ====================== */}
      {tab === "budget" && (() => {
        const rows = budgets.map(b => {
          const actual = summary.actuals[`${b.account_id}:${b.period}`] ?? 0;
          const planned = Number(b.planned);
          return { ...b, head: b.ledger_accounts?.name ?? "—", planned, actual };
        });
        return (
          <Card className="p-5">
            <SectionTitle title={t("budget.title")}
              action={<Btn onClick={() => setBEdit("new")}><Plus className="h-4 w-4" /> {t("form.newBudget")}</Btn>} />
            {rows.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rows.map(b => ({ head: b.head, planned: b.planned, actual: b.actual }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="head" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={compact} />
                  <RTip contentStyle={TOOLTIP_STYLE} formatter={v => fmt(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="planned" name={t("cols.planned")} fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="actual" name={t("cols.actual")} fill="hsl(var(--primary-glow))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
            <div className="mt-5">
              <TableShell head={["head", "period", "planned", "actual", "variance", "utilization"]} actions>
                {rows.map(b => {
                  const variance = b.planned - b.actual;
                  const pct = b.planned ? Math.round((b.actual / b.planned) * 100) : 0;
                  return (
                    <tr key={b.id} className="border-t border-border/40">
                      <td className="px-3 py-2.5 font-semibold text-primary">{b.head}</td>
                      <td className="px-3 py-2.5 text-xs">{monthYear(b.period, locale)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(b.planned)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(b.actual)}</td>
                      <td className={`px-3 py-2.5 text-right font-bold ${variance < 0 ? "text-destructive" : "text-primary"}`}>{fmt(variance)}</td>
                      <td className="px-3 py-2.5"><Pill tone={pct > 95 ? "bad" : pct > 80 ? "warn" : "ok"}>{pct}%</Pill></td>
                      <td className="px-3 py-2.5 text-right">
                        <RowActions
                          onEdit={() => setBEdit(b)}
                          onDelete={() => setConfirm({
                            title: t("budget.deleteTitle", { head: b.head, period: monthYear(b.period, locale) }),
                            description: t("budget.deleteBody"),
                            run: () => remove("budgets", b.id, "budget"),
                          })}
                        />
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && <EmptyRow cols={7}>{t("budget.none")}</EmptyRow>}
              </TableShell>
            </div>
          </Card>
        );
      })()}

      {/* ====================== MODALS ====================== */}
      <VoucherModal
        open={vOpen}
        onClose={() => setVOpen(false)}
        ledgers={activeLedgers}
        centers={centers.filter(c => c.active)}
        vouchers={vouchers}
        onSaved={() => { setVOpen(false); refreshBooks(); }}
      />

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${typeLabel(viewing.type)} ${viewing.entry_no}` : ""} size="lg"
        footer={<Btn variant="ghost" onClick={() => setViewing(null)}>{tc("close")}</Btn>}>
        {viewing && (
          <>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
              <Detail label={t("cols.date")} value={formatDate(viewing.entry_date)} />
              <Detail label={t("cols.status")} value={statusWord(viewing.status)} />
              <Detail label={t("cols.party")} value={viewing.party || "—"} />
              <Detail label={t("form.costCenter")} value={viewing.cost_centers?.name || "—"} />
              <Detail label={t("view.bankMatch")} value={viewing.reconciled_on ? formatDate(viewing.reconciled_on) : "—"} />
              <Detail label={t("form.narration")} value={viewing.narration || "—"} />
            </div>
            <TableShell head={["ledger", "debit", "credit"]}>
              {viewing.journal_lines.map(l => (
                <tr key={l.id} className="border-t border-border/40">
                  <td className="px-3 py-2 text-xs">{l.ledger_accounts ? `${l.ledger_accounts.code} · ${l.ledger_accounts.name}` : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{Number(l.debit) ? fmt(Number(l.debit)) : ""}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{Number(l.credit) ? fmt(Number(l.credit)) : ""}</td>
                </tr>
              ))}
            </TableShell>
          </>
        )}
      </Modal>

      <VoucherEditModal
        voucher={editingV}
        centers={centers}
        onClose={() => setEditingV(null)}
        onSave={async body => {
          if (!editingV) return;
          try {
            await updateRow({ resource: "journal-entries", id: editingV.id, body }).unwrap();
            toast.success(t("toasts.voucherUpdated", { no: editingV.entry_no }));
            setEditingV(null);
            refreshBooks();
          } catch (e) {
            toast.error(errorOf(e, t("toasts.voucherUpdateFailed")));
          }
        }}
      />

      <LedgerModal
        value={lEdit}
        onClose={() => setLEdit(null)}
        onSave={async body => {
          try {
            if (lEdit === "new") await createRow({ resource: "ledger-accounts", body }).unwrap();
            else if (lEdit) await updateRow({ resource: "ledger-accounts", id: lEdit.id, body }).unwrap();
            toast.success(lEdit === "new" ? t("toasts.ledgerCreated", { name: body.name }) : t("toasts.ledgerUpdated", { name: body.name }));
            setLEdit(null);
            void loadSummary();
          } catch (e) {
            toast.error(errorOf(e, t("toasts.ledgerSaveFailed")));
          }
        }}
      />

      <StockModal
        value={sEdit}
        onClose={() => setSEdit(null)}
        onSave={async body => {
          try {
            if (sEdit === "new") await createRow({ resource: "stock-items", body }).unwrap();
            else if (sEdit) await updateRow({ resource: "stock-items", id: sEdit.id, body }).unwrap();
            toast.success(sEdit === "new" ? t("toasts.added", { name: body.name }) : t("toasts.updated", { name: body.name }));
            setSEdit(null);
          } catch (e) {
            toast.error(errorOf(e, t("toasts.itemSaveFailed")));
          }
        }}
      />

      <CostCenterModal
        value={cEdit}
        onClose={() => setCEdit(null)}
        onSave={async body => {
          try {
            if (cEdit === "new") await createRow({ resource: "cost-centers", body }).unwrap();
            else if (cEdit) await updateRow({ resource: "cost-centers", id: cEdit.id, body }).unwrap();
            toast.success(cEdit === "new" ? t("toasts.created", { name: body.name }) : t("toasts.updated", { name: body.name }));
            setCEdit(null);
          } catch (e) {
            toast.error(errorOf(e, t("toasts.centerSaveFailed")));
          }
        }}
      />

      <BudgetModal
        value={bEdit}
        ledgers={activeLedgers}
        onClose={() => setBEdit(null)}
        onSave={async body => {
          try {
            if (bEdit === "new") await createRow({ resource: "budgets", body }).unwrap();
            else if (bEdit) await updateRow({ resource: "budgets", id: bEdit.id, body }).unwrap();
            toast.success(bEdit === "new" ? t("toasts.budgetCreated") : t("toasts.budgetUpdated"));
            setBEdit(null);
          } catch (e) {
            toast.error(errorOf(e, t("toasts.budgetSaveFailed")));
          }
        }}
      />

      <ReconcileModal
        open={reconciling}
        lines={pendingBank}
        onClose={() => setReconciling(false)}
        onReconcile={async (entryIds, date) => {
          setBusy(true);
          try {
            const results = await Promise.all(entryIds.map(id => setReconciled(id, date)));
            const done = results.filter(Boolean).length;
            if (done) toast.success(t("toasts.matched", { count: done }));
            setReconciling(false);
            void loadSummary();
          } finally {
            setBusy(false);
          }
        }}
        busy={busy}
      />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { void confirm?.run(); }}
        title={confirm?.title}
        description={confirm?.description}
      />
    </>,
  );
};

/* ============================== MODALS ============================== */

/** The next free number for a voucher type: PMT-0001, PMT-0002… */
const nextNumber = (type: VoucherType, vouchers: Voucher[]) => {
  const prefix = VOUCHER_TYPES.find(v => v.value === type)?.prefix ?? "JRN";
  const used = vouchers
    .map(v => v.entry_no.match(new RegExp(`^${prefix}-(\\d+)$`, "i"))?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number);
  return `${prefix}-${String((used.length ? Math.max(...used) : 0) + 1).padStart(4, "0")}`;
};

const VoucherModal = ({ open, onClose, ledgers, centers, vouchers, onSaved }: {
  open: boolean; onClose: () => void; ledgers: LedgerRow[]; centers: CostCenter[];
  vouchers: Voucher[]; onSaved: () => void;
}) => {
  const { t, typeLabel } = useAccountWords();
  const tc = useTranslations("common");
  const blank = () => ({
    no: "", date: today(), type: "payment" as VoucherType, party: "", ledgerDr: "", ledgerCr: "",
    amount: "", narration: "", status: "posted" as "posted" | "draft", cost_center_id: "",
  });
  const [f, setF] = useState(blank);
  const [saving, setSaving] = useState(false);

  // A fresh form each time it opens, numbered for the default type.
  useEffect(() => {
    if (open) setF({ ...blank(), no: nextNumber("payment", vouchers) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    const amount = Number(f.amount);
    if (!f.no.trim() || !f.ledgerDr || !f.ledgerCr || !(amount > 0)) {
      toast.error(t("form.missing"), { description: t("form.voucherMissing") });
      return;
    }
    if (f.ledgerDr === f.ledgerCr) {
      toast.error(t("form.sameLedger"), { description: t("form.sameLedgerBody") });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/accounts/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_no: f.no.trim(),
          entry_date: f.date,
          type: f.type,
          party: f.party.trim(),
          narration: f.narration.trim(),
          cost_center_id: f.cost_center_id,
          post: f.status === "posted",
          lines: [
            { account_id: f.ledgerDr, debit: amount, credit: 0 },
            { account_id: f.ledgerCr, debit: 0, credit: amount },
          ],
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(body?.error?.message || t("form.recordFailed")); return; }
      toast.success(f.status === "posted" ? t("form.voucherPosted") : t("form.draftSaved"), {
        description: `${typeLabel(f.type)} ${f.no.trim()}`,
      });
      onSaved();
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !saving && onClose()} title={t("form.newVoucher")}
      footer={<><Btn variant="ghost" onClick={onClose} disabled={saving}>{tc("cancel")}</Btn>
        <Btn onClick={submit} disabled={saving}>{saving ? tc("saving") : f.status === "posted" ? t("form.postVoucher") : t("form.saveDraft")}</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t("form.voucherNo")} required><Input value={f.no} onChange={e => setF({ ...f, no: e.target.value })} placeholder="PMT-0190" /></Field>
        <Field label={t("cols.date")} required><Input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
        <Field label={t("cols.type")}>
          <Select value={f.type} onChange={e => {
            const type = e.target.value as VoucherType;
            // Renumber only while the number is still the one we suggested.
            const suggested = f.no === nextNumber(f.type, vouchers);
            setF({ ...f, type, no: suggested || !f.no ? nextNumber(type, vouchers) : f.no });
          }}>
            {VOUCHER_TYPES.map(v => <option key={v.value} value={v.value}>{typeLabel(v.value)}</option>)}
          </Select>
        </Field>
        <Field label={t("form.party")}><Input value={f.party} onChange={e => setF({ ...f, party: e.target.value })} /></Field>
        <Field label={t("form.debitLedger")} required>
          <Select value={f.ledgerDr} onChange={e => setF({ ...f, ledgerDr: e.target.value })}>
            <option value="">{t("form.select")}</option>
            {ledgers.map(l => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
          </Select>
        </Field>
        <Field label={t("form.creditLedger")} required>
          <Select value={f.ledgerCr} onChange={e => setF({ ...f, ledgerCr: e.target.value })}>
            <option value="">{t("form.select")}</option>
            {ledgers.map(l => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
          </Select>
        </Field>
        <Field label={t("cols.amount")} required><Input type="number" min={0} step="0.01" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label={t("cols.status")}>
          <Select value={f.status} onChange={e => setF({ ...f, status: e.target.value as "posted" | "draft" })}>
            <option value="posted">{t("posted")}</option><option value="draft">{t("draft")}</option>
          </Select>
        </Field>
        <Field label={t("form.costCenter")}>
          <Select value={f.cost_center_id} onChange={e => setF({ ...f, cost_center_id: e.target.value })}>
            <option value="">{t("form.none")}</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <div className="sm:col-span-2"><Field label={t("form.narration")}><Input value={f.narration} onChange={e => setF({ ...f, narration: e.target.value })} /></Field></div>
      </div>
      {f.status === "posted" && (
        <p className="text-[11px] text-muted-foreground -mt-1">{t("form.postedNote")}</p>
      )}
    </Modal>
  );
};

const VoucherEditModal = ({ voucher, centers, onClose, onSave }: {
  voucher: Voucher | null; centers: CostCenter[]; onClose: () => void;
  onSave: (body: { party: string; narration: string; cost_center_id: string }) => Promise<void>;
}) => {
  const t = useTranslations("admin.accounts");
  const tc = useTranslations("common");
  const [f, setF] = useState({ party: "", narration: "", cost_center_id: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (voucher) setF({ party: voucher.party ?? "", narration: voucher.narration ?? "", cost_center_id: voucher.cost_center_id ?? "" });
  }, [voucher]);

  return (
    <Modal open={!!voucher} onClose={() => !saving && onClose()} title={voucher ? t("form.editTitle", { no: voucher.entry_no }) : ""}
      footer={<><Btn variant="ghost" onClick={onClose} disabled={saving}>{tc("cancel")}</Btn>
        <Btn disabled={saving} onClick={async () => { setSaving(true); await onSave(f); setSaving(false); }}>{saving ? tc("saving") : tc("save")}</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t("form.party")}><Input value={f.party} onChange={e => setF({ ...f, party: e.target.value })} /></Field>
        <Field label={t("form.costCenter")}>
          <Select value={f.cost_center_id} onChange={e => setF({ ...f, cost_center_id: e.target.value })}>
            <option value="">{t("form.none")}</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <div className="sm:col-span-2"><Field label={t("form.narration")}><Input value={f.narration} onChange={e => setF({ ...f, narration: e.target.value })} /></Field></div>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-1">{t("form.fixedNote")}</p>
    </Modal>
  );
};

type LedgerBody = { code: string; name: string; subgroup: string; opening_balance: string; active: boolean };

const LedgerModal = ({ value, onClose, onSave }: {
  value: LedgerRow | "new" | null; onClose: () => void; onSave: (body: LedgerBody) => Promise<void>;
}) => {
  const { t, subgroupLabel } = useAccountWords();
  const tc = useTranslations("common");
  const [f, setF] = useState<LedgerBody>({ code: "", name: "", subgroup: "current_assets", opening_balance: "0", active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (value === "new") setF({ code: "", name: "", subgroup: "current_assets", opening_balance: "0", active: true });
    else if (value) setF({ code: value.code, name: value.name, subgroup: value.subgroup, opening_balance: String(value.opening_balance), active: value.active });
  }, [value]);

  const submit = async () => {
    if (!f.name.trim() || !f.code.trim()) { toast.error(t("form.missing"), { description: t("form.ledgerMissing") }); return; }
    setSaving(true);
    await onSave({ ...f, code: f.code.trim(), name: f.name.trim() });
    setSaving(false);
  };

  return (
    <Modal open={!!value} onClose={() => !saving && onClose()} title={value === "new" ? t("form.newLedger") : t("form.editLedger")}
      footer={<><Btn variant="ghost" onClick={onClose} disabled={saving}>{tc("cancel")}</Btn>
        <Btn onClick={submit} disabled={saving}>{saving ? tc("saving") : value === "new" ? t("form.create") : tc("save")}</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t("form.ledgerName")} required><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Field label={t("form.code")} required><Input value={f.code} onChange={e => setF({ ...f, code: e.target.value })} placeholder="1030" /></Field>
        <Field label={t("cols.group")}>
          <Select value={f.subgroup} onChange={e => setF({ ...f, subgroup: e.target.value })}>
            {SUBGROUPS.map(g => <option key={g} value={g}>{subgroupLabel(g)}</option>)}
          </Select>
        </Field>
        <Field label={t("form.openingBalance")} hint={t("form.openingHint")}>
          <Input type="number" step="0.01" value={f.opening_balance} onChange={e => setF({ ...f, opening_balance: e.target.value })} />
        </Field>
        {value !== "new" && (
          <Field label={t("cols.status")}>
            <Select value={f.active ? "true" : "false"} onChange={e => setF({ ...f, active: e.target.value === "true" })}>
              <option value="true">{t("active")}</option><option value="false">{t("inactiveStatus")}</option>
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
};

type StockBody = { name: string; unit: string; qty: string; rate: string; reorder: string };

const StockModal = ({ value, onClose, onSave }: {
  value: StockItem | "new" | null; onClose: () => void; onSave: (body: StockBody) => Promise<void>;
}) => {
  const { t, unitLabel } = useAccountWords();
  const tc = useTranslations("common");
  const blank: StockBody = { name: "", unit: "pcs", qty: "0", rate: "0", reorder: "0" };
  const [f, setF] = useState<StockBody>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (value === "new") setF(blank);
    else if (value) setF({ name: value.name, unit: value.unit, qty: String(value.qty), rate: String(value.rate), reorder: String(value.reorder) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const submit = async () => {
    if (!f.name.trim()) { toast.error(t("form.missing"), { description: t("form.itemMissing") }); return; }
    setSaving(true);
    await onSave({ ...f, name: f.name.trim() });
    setSaving(false);
  };

  return (
    <Modal open={!!value} onClose={() => !saving && onClose()} title={value === "new" ? t("form.newItem") : t("form.editItem")}
      footer={<><Btn variant="ghost" onClick={onClose} disabled={saving}>{tc("cancel")}</Btn>
        <Btn onClick={submit} disabled={saving}>{saving ? tc("saving") : value === "new" ? tc("add") : tc("save")}</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t("form.itemName")} required><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Field label={t("cols.unit")}>
          <Select value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })}>
            {UNITS.map(u => <option key={u} value={u}>{unitLabel(u)}</option>)}
          </Select>
        </Field>
        <Field label={t("form.quantity")}><Input type="number" min={0} step="1" value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} /></Field>
        <Field label={t("cols.rate")}><Input type="number" min={0} step="0.01" value={f.rate} onChange={e => setF({ ...f, rate: e.target.value })} /></Field>
        <Field label={t("form.reorderLevel")}><Input type="number" min={0} step="1" value={f.reorder} onChange={e => setF({ ...f, reorder: e.target.value })} /></Field>
      </div>
    </Modal>
  );
};

type CenterBody = { name: string; budget: string; active: boolean };

const CostCenterModal = ({ value, onClose, onSave }: {
  value: CostCenter | "new" | null; onClose: () => void; onSave: (body: CenterBody) => Promise<void>;
}) => {
  const t = useTranslations("admin.accounts");
  const tc = useTranslations("common");
  const [f, setF] = useState<CenterBody>({ name: "", budget: "0", active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (value === "new") setF({ name: "", budget: "0", active: true });
    else if (value) setF({ name: value.name, budget: String(value.budget), active: value.active });
  }, [value]);

  const submit = async () => {
    if (!f.name.trim()) { toast.error(t("form.missing"), { description: t("form.centerMissing") }); return; }
    setSaving(true);
    await onSave({ ...f, name: f.name.trim() });
    setSaving(false);
  };

  return (
    <Modal open={!!value} onClose={() => !saving && onClose()} title={value === "new" ? t("form.newCenter") : t("form.editCenter")}
      footer={<><Btn variant="ghost" onClick={onClose} disabled={saving}>{tc("cancel")}</Btn>
        <Btn onClick={submit} disabled={saving}>{saving ? tc("saving") : value === "new" ? t("form.create") : tc("save")}</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t("form.name")} required><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder={t("form.namePlaceholder")} /></Field>
        <Field label={t("form.budget")}><Input type="number" min={0} step="0.01" value={f.budget} onChange={e => setF({ ...f, budget: e.target.value })} /></Field>
        {value !== "new" && (
          <Field label={t("cols.status")}>
            <Select value={f.active ? "true" : "false"} onChange={e => setF({ ...f, active: e.target.value === "true" })}>
              <option value="true">{t("active")}</option><option value="false">{t("inactiveStatus")}</option>
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
};

type BudgetBody = { account_id: string; period: string; planned: string };

const BudgetModal = ({ value, ledgers, onClose, onSave }: {
  value: Budget | "new" | null; ledgers: LedgerRow[]; onClose: () => void; onSave: (body: BudgetBody) => Promise<void>;
}) => {
  const t = useTranslations("admin.accounts");
  const tc = useTranslations("common");
  const [f, setF] = useState<BudgetBody>({ account_id: "", period: thisMonth(), planned: "0" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (value === "new") setF({ account_id: "", period: thisMonth(), planned: "0" });
    else if (value) setF({ account_id: value.account_id, period: value.period.slice(0, 7), planned: String(value.planned) });
  }, [value]);

  // Expense heads first — that is what gets budgeted — then income targets.
  const heads = [...ledgers.filter(l => l.group === "expense"), ...ledgers.filter(l => l.group === "income")];

  const submit = async () => {
    if (!f.account_id || !f.period) { toast.error(t("form.missing"), { description: t("form.budgetMissing") }); return; }
    setSaving(true);
    await onSave(f);
    setSaving(false);
  };

  return (
    <Modal open={!!value} onClose={() => !saving && onClose()} title={value === "new" ? t("form.newBudget") : t("form.editBudget")}
      footer={<><Btn variant="ghost" onClick={onClose} disabled={saving}>{tc("cancel")}</Btn>
        <Btn onClick={submit} disabled={saving}>{saving ? tc("saving") : value === "new" ? t("form.create") : tc("save")}</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Field label={t("cols.head")} required>
            <Select value={f.account_id} onChange={e => setF({ ...f, account_id: e.target.value })}>
              <option value="">{t("form.select")}</option>
              {heads.map(l => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={t("cols.period")} required><Input type="month" value={f.period} onChange={e => setF({ ...f, period: e.target.value })} /></Field>
        <Field label={t("cols.planned")}><Input type="number" min={0} step="0.01" value={f.planned} onChange={e => setF({ ...f, planned: e.target.value })} /></Field>
      </div>
    </Modal>
  );
};

const ReconcileModal = ({ open, lines, onClose, onReconcile, busy }: {
  open: boolean; lines: MovementLine[]; onClose: () => void; busy: boolean;
  onReconcile: (entryIds: string[], date: string) => Promise<void>;
}) => {
  const t = useTranslations("admin.accounts");
  const tc = useTranslations("common");
  const { formatCurrency: fmt, formatDate } = useFormatters();
  const [picked, setPicked] = useState<string[]>([]);
  const [date, setDate] = useState(today());

  useEffect(() => { if (open) { setPicked([]); setDate(today()); } }, [open]);

  const entryIds = [...new Set(lines.filter(l => picked.includes(l.id)).map(l => l.entry_id))];

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={t("reconcile.title")} size="lg"
      footer={<><Btn variant="ghost" onClick={onClose} disabled={busy}>{tc("cancel")}</Btn>
        <Btn disabled={busy || !entryIds.length} onClick={() => onReconcile(entryIds, date)}>
          {busy ? t("reconcile.matching") : t("reconcile.mark", { count: entryIds.length })}
        </Btn></>}>
      <p className="text-sm text-muted-foreground mb-3">{t("reconcile.intro")}</p>
      <Field label={t("reconcile.statementDate")}><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <div className="rounded-xl border border-border/40 divide-y divide-border/40 max-h-[45vh] overflow-y-auto">
        {lines.map(l => (
          <label key={l.id} className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/30">
            <input type="checkbox" checked={picked.includes(l.id)}
              onChange={e => setPicked(p => e.target.checked ? [...p, l.id] : p.filter(x => x !== l.id))} />
            <span className="font-mono text-xs w-24 shrink-0">{l.entry_no}</span>
            <span className="text-xs text-muted-foreground w-24 shrink-0">{formatDate(l.entry_date)}</span>
            <span className="flex-1 truncate text-xs">{l.narration || l.party || l.account}</span>
            <span className="font-mono text-xs">{fmt(l.debit - l.credit)}</span>
          </label>
        ))}
      </div>
    </Modal>
  );
};

/* ============================== SUB COMPONENTS ============================== */

const NUMERIC = new Set<ColKey>([
  "amount", "debit", "credit", "opening", "closing", "qty", "rate", "value", "reorder",
  "bankStatement", "books", "outputVat", "inputVat", "planned", "actual", "variance",
]);

const TableShell = ({ head, children, actions = false }: { head: ColKey[]; children: React.ReactNode; actions?: boolean }) => {
  const t = useTranslations("admin.accounts.cols");
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] tracking-widest font-bold text-muted-foreground uppercase">
            {head.map(h => (
              <th key={h} className={`px-3 py-2 ${NUMERIC.has(h) ? "text-right" : "text-left"}`}>{t(h)}</th>
            ))}
            {actions && <th className="px-3 py-2 w-24" />}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
};

const EmptyRow = ({ cols, children }: { cols: number; children: React.ReactNode }) => (
  <tr><td colSpan={cols} className="px-3 py-12 text-center text-sm text-muted-foreground">{children}</td></tr>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="py-12 text-center text-sm text-muted-foreground">{children}</p>
);

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" | "warn" }) => (
  <li className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-bold ${tone === "ok" ? "text-primary" : tone === "bad" ? "text-destructive" : tone === "warn" ? "text-yellow-700" : "text-primary"}`}>{value}</span>
  </li>
);

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] tracking-widest font-bold text-muted-foreground uppercase">{label}</p>
    <p className="text-foreground/90">{value}</p>
  </div>
);

/** The ledgers on one side of a voucher, named — or counted, when there are several. */
const sideAccounts = (v: Voucher, side: "debit" | "credit") => {
  const names = v.journal_lines.filter(l => Number(l[side]) > 0).map(l => l.ledger_accounts?.name ?? "—");
  return names.length > 2 ? `${names[0]} +${names.length - 1}` : names.join(", ") || "—";
};
const drAccounts = (v: Voucher) => sideAccounts(v, "debit");
const crAccounts = (v: Voucher) => sideAccounts(v, "credit");

/** A voucher's total — debits and credits are equal on a posted one. */
const voucherAmount = (v: Voucher, side: "debit" | "credit" = "debit") =>
  v.journal_lines.reduce((s, l) => s + Number(l[side]), 0);

const voucherTone = (t: VoucherType): "ok" | "info" | "warn" | "bad" | "default" => {
  switch (t) {
    case "receipt": case "sales": return "ok";
    case "payment": case "purchase": return "info";
    case "journal": case "contra": return "default";
    case "credit_note": return "warn";
    case "debit_note": return "bad";
  }
};

export default Accounts;
