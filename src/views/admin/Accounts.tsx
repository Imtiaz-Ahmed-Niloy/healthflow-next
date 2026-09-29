"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi, SectionTitle } from "@/components/admin/ui";
import { Modal, Field, Input, Select, TextArea, ConfirmDialog, RowActions, exportCSV } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import { useSession } from "@/lib/auth/useSession";
import { LEDGER_SUBGROUPS, DIRECT_INCOME_SUBGROUPS, DIRECT_EXPENSE_SUBGROUPS } from "@/constants/ledgerGroups";
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
  ShieldAlert, Pencil, Trash2, Send, Undo2, Printer,
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

/**
 * A voucher's place in its approval workflow (0114). Only posted is in the
 * books; the database decides which moves are allowed and who may make them.
 */
type VoucherStatus = "draft" | "pending" | "approved" | "rejected" | "posted" | "cancelled";
const VOUCHER_STATUSES: VoucherStatus[] = ["draft", "pending", "approved", "rejected", "posted", "cancelled"];

const statusTone = (s: VoucherStatus): "ok" | "info" | "warn" | "bad" | "default" =>
  ({ posted: "ok", approved: "info", pending: "warn", draft: "default", rejected: "bad", cancelled: "bad" } as const)[s];

/** The statuses a voucher's lines may be rewritten in, through update_voucher (0114). */
const editableStatus = (s: VoucherStatus) => s === "draft" || s === "rejected" || s === "posted";

type VoucherType =
  | "payment" | "receipt" | "contra" | "journal" | "sales" | "purchase" | "credit_note" | "debit_note"
  | "petty_cash" | "stock_journal";

type Voucher = {
  id: string; entry_no: string; entry_date: string; type: VoucherType;
  party: string | null; narration: string | null; status: VoucherStatus; status_note: string | null;
  cost_center_id: string | null; reconciled_on: string | null;
  cost_centers: { id: string; name: string } | null;
  journal_lines: {
    id: string; debit: number; credit: number; account_id: string;
    party: string | null; narration: string | null; cost_center_id: string | null;
    ledger_accounts: { id: string; code: string; name: string } | null;
  }[];
};

type StockItem = {
  id: string; name: string; unit: string; qty: number; rate: number; value: number; reorder: number;
  company_name: string | null; distributor_name: string | null;
  purchase_date: string | null; invoice_no: string | null; purchase_details: string | null;
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
  { id: "cfs", icon: ArrowDownUp },
  { id: "cashflow", icon: Banknote },
  { id: "inventory", icon: Boxes },
  { id: "tax", icon: Percent },
  { id: "cost", icon: Building2 },
  { id: "budget", icon: Target },
] as const;
type TabId = typeof TABS[number]["id"];

const VOUCHER_TYPES: { value: VoucherType; prefix: string }[] = [
  { value: "payment", prefix: "PMT" },
  { value: "petty_cash", prefix: "PCV" },
  { value: "receipt", prefix: "RCT" },
  { value: "contra", prefix: "CON" },
  { value: "journal", prefix: "JRN" },
  { value: "stock_journal", prefix: "SJV" },
  { value: "sales", prefix: "SAL" },
  { value: "purchase", prefix: "PUR" },
  { value: "credit_note", prefix: "CRN" },
  { value: "debit_note", prefix: "DRN" },
];

/** Tally's groups (0074, 0105). The form lists them A to Z, as Tally's picker does. */
const SUBGROUPS = LEDGER_SUBGROUPS;

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

/** The order a trial balance lists its heads in: capital and liabilities, then assets, income, expenses. */
const TRIAL_CLASS_ORDER: Group[] = ["capital", "liability", "asset", "income", "expense"];

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

/**
 * Ledger balances over a date range, from /api/v1/accounts/trial. With no
 * dates it fetches nothing and returns null — the caller uses the summary's
 * all-time balances instead.
 */
const useLedgerBalances = (from: string, to: string) => {
  const t = useTranslations("admin.accounts");
  const [rows, setRows] = useState<Balance[] | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!from && !to) { setRows(null); return; }
    if (from && to && from > to) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/v1/accounts/trial?${params}`)
      .then(res => res.json().then(body => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) { toast.error(body?.error?.message ?? t("trial.loadFailed")); return; }
        setRows(body.data.balances as Balance[]);
      })
      .catch(() => { if (!cancelled) toast.error(t("trial.loadFailed")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, t]);
  return { rows, loading };
};

/**
 * Heads whose cash is investing or financing on a cash flow statement; every
 * other head's is operating.
 */
const INVESTING_HEADS = ["fixed_assets", "fixed_assets_at_cost", "accumulated_depreciation", "investments", "deposits_asset"];
const FINANCING_HEADS = ["capital", "retained_earnings", "loans", "secured_loans", "unsecured_loans", "bank_od"];

type CashFlow = { flows: { account_id: string; code: string; name: string; group: Group; subgroup: string; amount: number }[]; opening: number; closing: number };

/** The Cash Flow Statement's numbers from /api/v1/accounts/cash-flow, fetched while its tab is open. */
const useCashFlow = (from: string, to: string, enabled: boolean) => {
  const t = useTranslations("admin.accounts");
  const [data, setData] = useState<CashFlow | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled || (from && to && from > to)) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/v1/accounts/cash-flow?${params}`)
      .then(res => res.json().then(body => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) { toast.error(body?.error?.message ?? t("cfs.loadFailed")); return; }
        setData(body.data as CashFlow);
      })
      .catch(() => { if (!cancelled) toast.error(t("cfs.loadFailed")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, enabled, t]);
  return { data, loading };
};

/* ================================ COMPONENT ================================ */

const Accounts = () => {
  const { t, typeLabel, subgroupLabel, unitLabel } = useAccountWords();
  const tc = useTranslations("common");
  const locale = useLocale();
  const compact = compactIn(locale);
  const { formatCurrency: fmt, formatDate } = useFormatters();
  const dispatch = useAppDispatch();

  // The open tab lives in the URL (?tab=vouchers), so a reload or a shared
  // link lands on the same tab. Unknown values fall back to the dashboard.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: TabId = TABS.some(x => x.id === tabParam) ? tabParam as TabId : "dashboard";
  const setTab = (next: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "dashboard") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

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
  const [deletingV, setDeletingV] = useState<Voucher | null>(null);
  const [statusAsk, setStatusAsk] = useState<{ voucher: Voucher; status: "rejected" | "cancelled" } | null>(null);
  const [vStatus, setVStatus] = useState<VoucherStatus | "all">("all");

  // Approving and rejecting are the hospital admin's (0114); the buttons only
  // show for them, and the database refuses anyone else regardless.
  const { user } = useSession();
  const canApprove = user?.role === "hospital_admin" || user?.role === "super_admin";

  // The hospital's name, to head a printed report. Only a hospital_admin can
  // read the profile; anyone else prints without it.
  const [hospitalName, setHospitalName] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/hospital/profile")
      .then(res => (res.ok ? res.json() : null))
      .then(body => { if (!cancelled && body?.data?.name) setHospitalName(body.data.name); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const [busy, setBusy] = useState(false);

  const [q, setQ] = useState("");
  const [vType, setVType] = useState<string>("all");
  const [vFrom, setVFrom] = useState("");
  const [vTo, setVTo] = useState("");
  const [dq, setDq] = useState("");
  const [lq, setLq] = useState("");

  // The statements' period, shared by Trial Balance, Profit & Loss and Balance
  // Sheet. With neither date they use the summary's all-time balances. The
  // balance sheet is always as at a date, so with a From date it reads its
  // own cumulative balances up to To.
  const [trialFrom, setTrialFrom] = useState("");
  const [trialTo, setTrialTo] = useState("");
  const period = useLedgerBalances(trialFrom, trialTo);
  const asAt = useLedgerBalances("", trialFrom ? trialTo || today() : "");
  const cashFlow = useCashFlow(trialFrom, trialTo, tab === "cfs");
  const trialRows = period.rows;
  const trialLoading = period.loading || asAt.loading || cashFlow.loading;
  const badRange = !!trialFrom && !!trialTo && trialFrom > trialTo;

  const periodFilter = (extra?: React.ReactNode, note?: string) => (
    <>
      <div className="flex flex-wrap items-end gap-3 mb-4 print:hidden">
        <Field label={t("trial.from")}>
          <Input type="date" value={trialFrom} max={trialTo || undefined} onChange={e => setTrialFrom(e.target.value)} />
        </Field>
        <Field label={t("trial.to")}>
          <Input type="date" value={trialTo} min={trialFrom || undefined} onChange={e => setTrialTo(e.target.value)} />
        </Field>
        {(trialFrom || trialTo) && (
          <Btn variant="outline" onClick={() => { setTrialFrom(""); setTrialTo(""); }}>{t("trial.clear")}</Btn>
        )}
        {trialLoading && <span className="text-xs text-muted-foreground pb-2">{tc("loading")}</span>}
        {extra}
      </div>
      {badRange && <p className="mb-3 text-xs text-destructive">{t("trial.badRange")}</p>}
      {note && !badRange && <p className="mb-3 text-xs text-muted-foreground">{note}</p>}
    </>
  );

  /** An amount as statements print it: a negative in brackets. */
  const acc = (n: number) => (Math.abs(n) < 0.005 ? "—" : n < 0 ? `(${fmt(-n)})` : fmt(n));

  /**
   * A section's ledgers in the inner column, in chart order. When the section
   * spans more than one head, each head's name sits above its ledgers.
   */
  const statementLines = (list: Balance[], base: 1 | 2 = 1) => {
    const heads = [...new Set([...LEDGER_SUBGROUPS.filter(s => list.some(b => b.subgroup === s)), ...list.map(b => b.subgroup)])];
    if (!list.length) return <StatementRow indent={base} label={<span className="text-muted-foreground">—</span>} />;
    return heads.map(head => (
      <Fragment key={head}>
        {heads.length > 1 && <StatementRow kind="head" indent={base} label={subgroupLabel(head)} />}
        {list.filter(b => b.subgroup === head).map(b => (
          <StatementRow key={b.account_id} indent={heads.length > 1 ? (base + 1) as 2 | 3 : base} label={b.name} inner={acc(b.balance)} />
        ))}
      </Fragment>
    ));
  };

  /* ---- derived totals ---- */
  const balances = useMemo(() => summary?.balances ?? [], [summary]);
  const totals = useMemo(() => {
    const sumOf = (pred: (b: Balance) => boolean) => balances.filter(pred).reduce((s, b) => s + b.balance, 0);
    const income = sumOf(b => b.group === "income");
    // Direct groups make gross profit; every other expense group — the vehicle
    // and telephone heads, administrative, financial and so on — is indirect.
    const directIncome = sumOf(b => DIRECT_INCOME_SUBGROUPS.includes(b.subgroup));
    const expense = sumOf(b => b.group === "expense");
    const directExp = sumOf(b => DIRECT_EXPENSE_SUBGROUPS.includes(b.subgroup));
    const indirectExp = expense - directExp;
    return {
      income, expense, directIncome, directExp, indirectExp,
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

  const statusWord = (status: VoucherStatus) => t(status);

  // Everything a voucher shows, so any of it finds the voucher. Every word
  // typed must appear somewhere, in any order.
  const voucherValues = (v: Voucher) => [
    v.entry_no, v.entry_date, formatDate(v.entry_date), typeLabel(v.type), v.type,
    v.party, v.narration, v.cost_centers?.name, statusWord(v.status), v.status,
    voucherAmount(v), fmt(voucherAmount(v)),
    ...v.journal_lines.flatMap(l => [l.ledger_accounts?.code, l.ledger_accounts?.name]),
  ];

  const filteredVouchers = vouchers.filter(v =>
    (vType === "all" || v.type === vType)
    && (vStatus === "all" || v.status === vStatus)
    && (!vFrom || v.entry_date >= vFrom)
    && (!vTo || v.entry_date <= vTo)
    && matchesQuery(q, voucherValues(v)),
  );

  const dayBook = [...vouchers]
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
    .filter(v => matchesQuery(dq, voucherValues(v)));

  const filteredBalances = balances.filter(b => matchesQuery(lq, [
    b.code, b.name, b.group, b.subgroup, subgroupLabel(b.subgroup), !b.active && t("inactive"),
    b.opening_balance, fmt(b.opening_balance), b.debit_total, fmt(b.debit_total),
    b.credit_total, fmt(b.credit_total), Math.abs(b.balance), fmt(Math.abs(b.balance)), sideOf(b),
  ]));

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
    setViewing(null);
    refreshBooks();
  };

  /** A workflow move that needs no reason: submit, withdraw, reopen, approve (0114). */
  const moveStatus = async (v: Voucher, status: "pending" | "draft" | "approved") => {
    const res = await fetch(`/api/v1/accounts/vouchers/${v.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) { toast.error(body?.error?.message || t("workflow.failed")); return; }
    toast.success(t("workflow.done", { no: v.entry_no, status: statusWord(status) }));
    setViewing(null);
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
  // print-report: printed on globals.css's named `report` page, with a margin.
  const shell = (children: React.ReactNode) => (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}><div className="print-report">{children}</div></AdminLayout>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:hidden">
        <Kpi icon={CircleDollarSign} label={t("kpis.netProfitFy")} value={fmt(fyNetProfit)} trend={trend} />
        <Kpi icon={Wallet} label={t("kpis.cashBank")} value={fmt(totals.cashBal + totals.bankBal)} tone="accent" />
        <Kpi icon={Receipt} label={t("kpis.receivables")} value={fmt(totals.receivables)} tone="chip" />
        <Kpi icon={TrendingDown} label={t("kpis.payables")} value={fmt(totals.payables)} tone="destructive" />
      </div>

      {/* Tab bar, with Print for every tab but the dashboard. Printing prints
          the page itself: the layout, the tab bar, buttons, filters and row
          actions all drop out under print:, leaving the open tab's content. */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-card border border-border/60 shadow-soft print:hidden">
        {TABS.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === item.id ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-muted/60"
            }`}>
            <item.icon className="h-3.5 w-3.5" /> {t(`tabs.${item.id}`)}
          </button>
        ))}
        {tab !== "dashboard" && (
          <button onClick={() => window.print()}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-primary border border-primary/30 hover:bg-primary/5">
            <Printer className="h-3.5 w-3.5" /> {t("print.button")}
          </button>
        )}
      </div>

      {/* On paper only: who the report is for and when it was printed. The
          statements carry their own title; the registers get the tab's. */}
      <div className="hidden print:block mb-4 text-center">
        {hospitalName && <p className="font-display text-xl font-bold text-primary">{hospitalName}</p>}
        {!["trial", "pl", "balance", "cfs"].includes(tab) && (
          <p className="font-display text-lg text-primary">{t(`tabs.${tab}`)}</p>
        )}
        <p className="text-[11px] text-muted-foreground">{t("print.printedOn", { date: formatDate(today()) })}</p>
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
          <div className="flex flex-wrap items-center gap-3 mb-4 print:hidden">
            <SearchBox value={q} onChange={setQ} placeholder={t("vouchers.searchPlaceholder")} />
            <select value={vType} onChange={e => setVType(e.target.value)} className="bg-muted/40 rounded-full px-4 py-2 text-sm outline-none">
              <option value="all">{t("vouchers.allTypes")}</option>
              {VOUCHER_TYPES.map(v => <option key={v.value} value={v.value}>{typeLabel(v.value)}</option>)}
            </select>
            <select value={vStatus} onChange={e => setVStatus(e.target.value as VoucherStatus | "all")}
              aria-label={t("cols.status")} className="bg-muted/40 rounded-full px-4 py-2 text-sm outline-none">
              <option value="all">{t("workflow.allStatuses")}</option>
              {VOUCHER_STATUSES.map(s => <option key={s} value={s}>{statusWord(s)}</option>)}
            </select>
            <Btn variant="outline" onClick={() => exportCSV(filteredVouchers.map(v => ({
              [t("cols.no")]: v.entry_no, [t("cols.date")]: v.entry_date, [t("cols.type")]: typeLabel(v.type),
              [t("cols.party")]: v.party ?? "", [t("cols.drAc")]: drAccounts(v), [t("cols.crAc")]: crAccounts(v),
              [t("cols.amount")]: voucherAmount(v), [t("cols.status")]: statusWord(v.status),
              [t("form.costCenter")]: v.cost_centers?.name ?? "", [t("form.narration")]: v.narration ?? "",
            })), "vouchers.csv")}><Download className="h-4 w-4" /> {t("export")}</Btn>
            <Btn onClick={() => setVOpen(true)}><Plus className="h-4 w-4" /> {t("form.newVoucher")}</Btn>
          </div>
          <div className="flex flex-wrap items-end gap-3 mb-4 print:hidden">
            <Field label={t("trial.from")}>
              <Input type="date" value={vFrom} max={vTo || undefined} onChange={e => setVFrom(e.target.value)} />
            </Field>
            <Field label={t("trial.to")}>
              <Input type="date" value={vTo} min={vFrom || undefined} onChange={e => setVTo(e.target.value)} />
            </Field>
            {(vFrom || vTo) && (
              <Btn variant="outline" onClick={() => { setVFrom(""); setVTo(""); }}>{t("trial.clear")}</Btn>
            )}
          </div>
          {vFrom && vTo && vFrom > vTo && <p className="-mt-2 mb-3 text-xs text-destructive">{t("trial.badRange")}</p>}
          <TableShell head={["no", "date", "type", "party", "amount", "status"]} actions>
            {filteredVouchers.map(v => (
              <tr key={v.id} className="border-t border-border/40 hover:bg-muted/30 cursor-pointer" onClick={() => setViewing(v)}>
                <td className="px-3 py-2.5 font-mono text-xs">{v.entry_no}</td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDate(v.entry_date)}</td>
                <td className="px-3 py-2.5"><Pill tone={voucherTone(v.type)}>{typeLabel(v.type)}</Pill></td>
                <td className="px-3 py-2.5 font-semibold text-primary">{v.party || "—"}</td>
                <td className="px-3 py-2.5 text-right font-semibold">{fmt(voucherAmount(v))}</td>
                <td className="px-3 py-2.5"><Pill tone={statusTone(v.status)}>{statusWord(v.status)}</Pill></td>
                <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                  <RowActions
                    onView={() => setViewing(v)}
                    onEdit={editableStatus(v.status) ? () => setEditingV(v) : undefined}
                    onDelete={() => setDeletingV(v)}
                    extra={v.status === "draft" || v.status === "approved" ? (
                      <button onClick={() => postDraft(v)} className="p-1.5 rounded-lg hover:bg-muted text-primary" title={t("vouchers.post")}>
                        <Send className="h-4 w-4" />
                      </button>
                    ) : undefined}
                  />
                </td>
              </tr>
            ))}
            {!filteredVouchers.length && <EmptyRow cols={7}>{vouchers.length ? t("vouchers.noMatch") : t("vouchers.none")}</EmptyRow>}
          </TableShell>
        </Card>
      )}

      {/* ====================== DAY BOOK ====================== */}
      {tab === "daybook" && (
        <Card className="p-5">
          <SectionTitle title={t("daybook.title")} />
          <div className="flex flex-wrap items-center gap-3 mb-4 print:hidden">
            <SearchBox value={dq} onChange={setDq} placeholder={t("daybook.searchPlaceholder")} />
            <Btn variant="outline" onClick={() => exportCSV(dayBook.flatMap(v => v.journal_lines.map(l => ({
              [t("cols.date")]: v.entry_date, [t("cols.voucher")]: v.entry_no, [t("cols.type")]: typeLabel(v.type),
              [t("cols.party")]: v.party ?? "", [t("cols.ledger")]: l.ledger_accounts?.name ?? "",
              [t("cols.debit")]: Number(l.debit) || "", [t("cols.credit")]: Number(l.credit) || "",
            }))), "daybook.csv")}><Download className="h-4 w-4" /> {t("export")}</Btn>
          </div>
          <TableShell head={["date", "voucher", "type", "particulars", "debit", "credit"]}>
            {dayBook.map(v => (
              <tr key={v.id} className="border-t border-border/40 hover:bg-muted/30">
                <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatDate(v.entry_date)}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{v.entry_no}</td>
                <td className="px-3 py-2.5"><Pill tone={voucherTone(v.type)}>{typeLabel(v.type)}</Pill></td>
                <td className="px-3 py-2.5 text-xs">
                  <div className="font-semibold text-primary">
                    {v.party || v.narration || "—"}
                    {v.status !== "posted" && <span className="ml-2 font-normal text-yellow-700">({statusWord(v.status).toLowerCase()})</span>}
                  </div>
                  <div className="text-muted-foreground">{t("daybook.drCr", { dr: drAccounts(v), cr: crAccounts(v) })}</div>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-primary">{fmt(voucherAmount(v))}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-primary">{fmt(voucherAmount(v, "credit"))}</td>
              </tr>
            ))}
            {!dayBook.length && <EmptyRow cols={6}>{vouchers.length ? t("vouchers.noMatch") : t("daybook.nothing")}</EmptyRow>}
          </TableShell>
        </Card>
      )}

      {/* ====================== LEDGERS ====================== */}
      {tab === "ledgers" && (
        <Card className="p-5">
          <h2 className="font-display text-xl text-primary mb-4">{t("ledgers.title")}</h2>
          <div className="flex flex-wrap items-center gap-3 mb-4 print:hidden">
            <SearchBox value={lq} onChange={setLq} placeholder={t("ledgers.searchPlaceholder")} />
            <Btn variant="outline" onClick={() => exportCSV(filteredBalances.map(b => ({
              [t("form.code")]: b.code, [t("cols.ledger")]: b.name, [t("cols.group")]: subgroupLabel(b.subgroup),
              [t("cols.opening")]: b.opening_balance, [t("cols.debit")]: b.debit_total, [t("cols.credit")]: b.credit_total,
              [t("cols.closing")]: Math.abs(b.balance), [t("ledgers.side")]: sideOf(b),
            })), "ledgers.csv")}><Download className="h-4 w-4" /> {t("export")}</Btn>
            <Btn onClick={() => setLEdit("new")}><Plus className="h-4 w-4" /> {t("form.newLedger")}</Btn>
          </div>
          <TableShell head={["ledger", "group", "opening", "debit", "credit", "closing"]} actions>
            {filteredBalances.map(b => {
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
            {!!balances.length && !filteredBalances.length && <EmptyRow cols={7}>{t("ledgers.noMatch")}</EmptyRow>}
          </TableShell>
        </Card>
      )}

      {/* ====================== TRIAL BALANCE ====================== */}
      {tab === "trial" && (() => {
        // The accounting layout (ICAI / Tally): ledgers grouped under their
        // heads, capital and liabilities first, then assets, income and
        // expenses. Each head carries its net balance; its ledgers sit indented
        // beneath. Nil balances are left out, and if the two sides disagree
        // the gap shows as a difference in opening balances, as Tally does.
        const rows = (trialRows ?? balances).filter(b => Math.abs(b.balance) >= 0.005);
        const heads = TRIAL_CLASS_ORDER.flatMap(cls => {
          const inClass = rows.filter(b => b.group === cls);
          const order = [...new Set([...LEDGER_SUBGROUPS.filter(s => inClass.some(b => b.subgroup === s)), ...inClass.map(b => b.subgroup)])];
          return order.map(subgroup => {
            const ledgersIn = inClass.filter(b => b.subgroup === subgroup);
            // Net in debit terms: positive is a debit balance.
            const net = ledgersIn.reduce((s, b) => s + (sideOf(b) === "Dr" ? Math.abs(b.balance) : -Math.abs(b.balance)), 0);
            return { subgroup, ledgers: ledgersIn, net };
          });
        });
        const totalDr = heads.reduce((s, h) => s + (h.net > 0 ? h.net : 0), 0);
        const totalCr = heads.reduce((s, h) => s + (h.net < 0 ? -h.net : 0), 0);
        const diff = Math.round((totalDr - totalCr) * 100) / 100;
        const grand = Math.max(totalDr, totalCr);
        const subtitle = trialFrom
          ? t("trial.forPeriod", { from: formatDate(trialFrom), to: formatDate(trialTo || today()) })
          : t("trial.asAt", { date: formatDate(trialTo || today()) });
        const amount = (n: number) => (n ? fmt(n) : "");
        return (
          <Card className="p-5">
            {periodFilter(
              <Btn variant="outline" className="ml-auto" onClick={() => exportCSV(heads.flatMap(h => [
                { [t("cols.particulars")]: subgroupLabel(h.subgroup), [t("cols.debit")]: h.net > 0 ? h.net : "", [t("cols.credit")]: h.net < 0 ? -h.net : "" },
                ...h.ledgers.map(b => ({
                  [t("cols.particulars")]: `   ${b.name}`,
                  [t("cols.debit")]: sideOf(b) === "Dr" ? Math.abs(b.balance) : "",
                  [t("cols.credit")]: sideOf(b) === "Cr" ? Math.abs(b.balance) : "",
                })),
              ]).concat(
                diff ? [{ [t("cols.particulars")]: t("trial.difference"), [t("cols.debit")]: diff < 0 ? -diff : "", [t("cols.credit")]: diff > 0 ? diff : "" }] : [],
                [{ [t("cols.particulars")]: t("trial.total"), [t("cols.debit")]: grand, [t("cols.credit")]: grand }],
              ), "trial-balance.csv")}><Download className="h-4 w-4" /> {t("export")}</Btn>,
              trialFrom ? t("trial.fromNote") : undefined,
            )}

            <div className="text-center mb-5">
              <h2 className="font-display text-2xl text-primary">{t("trial.heading")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            </div>

            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y-2 border-primary/30 text-xs font-bold text-primary">
                    <th className="px-3 py-2.5 text-left">{t("cols.particulars")}</th>
                    <th className="px-3 py-2.5 text-right w-40">{t("trial.debitCol")}</th>
                    <th className="px-3 py-2.5 text-right w-40">{t("trial.creditCol")}</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {heads.map(h => (
                    <Fragment key={h.subgroup}>
                      <tr className="border-t border-border/50">
                        <td className="px-3 pt-3 pb-1 font-semibold text-primary">{subgroupLabel(h.subgroup)}</td>
                        <td className="px-3 pt-3 pb-1 text-right font-semibold">{amount(h.net > 0 ? h.net : 0)}</td>
                        <td className="px-3 pt-3 pb-1 text-right font-semibold">{amount(h.net < 0 ? -h.net : 0)}</td>
                      </tr>
                      {h.ledgers.map(b => (
                        <tr key={b.account_id}>
                          <td className="pl-8 pr-3 py-1 text-xs text-muted-foreground">
                            {b.name}<span className="ml-2 font-mono text-[10px] opacity-70">{b.code}</span>
                          </td>
                          <td className="px-3 py-1 text-right text-xs text-muted-foreground italic">{sideOf(b) === "Dr" ? amount(Math.abs(b.balance)) : ""}</td>
                          <td className="px-3 py-1 text-right text-xs text-muted-foreground italic">{sideOf(b) === "Cr" ? amount(Math.abs(b.balance)) : ""}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  {!heads.length && (
                    <tr><td colSpan={3} className="px-3 py-12 text-center text-sm text-muted-foreground">{t("trial.nothing")}</td></tr>
                  )}
                  {diff !== 0 && (
                    <tr className="border-t border-border/50 text-destructive">
                      <td className="px-3 py-3 font-semibold">{t("trial.difference")}</td>
                      <td className="px-3 py-3 text-right font-semibold">{diff < 0 ? fmt(-diff) : ""}</td>
                      <td className="px-3 py-3 text-right font-semibold">{diff > 0 ? fmt(diff) : ""}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="font-bold text-primary">
                    <td className="px-3 py-3">{t("trial.total")}</td>
                    <td className="px-3 py-3 text-right border-t-2 border-b-4 border-double border-primary/50">{fmt(grand)}</td>
                    <td className="px-3 py-3 text-right border-t-2 border-b-4 border-double border-primary/50">{fmt(grand)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">{t("trial.nilNote")}</p>
          </Card>
        );
      })()}

      {/* ====================== P&L ====================== */}
      {tab === "pl" && (() => {
        // Statement of profit or loss, vertical form: revenue less direct
        // expenses is gross profit; add other income, less indirect expenses
        // by head, is net profit.
        const rows = (trialRows ?? balances).filter(b => Math.abs(b.balance) >= 0.005);
        const revenue = rows.filter(b => b.group === "income" && DIRECT_INCOME_SUBGROUPS.includes(b.subgroup));
        const direct = rows.filter(b => b.group === "expense" && DIRECT_EXPENSE_SUBGROUPS.includes(b.subgroup));
        const other = rows.filter(b => b.group === "income" && !DIRECT_INCOME_SUBGROUPS.includes(b.subgroup));
        const indirect = rows.filter(b => b.group === "expense" && !DIRECT_EXPENSE_SUBGROUPS.includes(b.subgroup));
        const sum = (list: Balance[]) => list.reduce((s, b) => s + b.balance, 0);
        const gross = sum(revenue) - sum(direct);
        const net = gross + sum(other) - sum(indirect);
        const subtitle = trialFrom
          ? t("trial.forPeriod", { from: formatDate(trialFrom), to: formatDate(trialTo || today()) })
          : t("pl.upTo", { date: formatDate(trialTo || today()) });
        return (
          <Card className="p-5">
            {periodFilter()}
            <StatementHeading title={t("pl.heading")} subtitle={subtitle} />
            <Statement particulars={t("cols.particulars")} amount={t("pl.amount")}>
              <StatementRow kind="heading" label={t("pl.revenue")} />
              {statementLines(revenue)}
              <StatementRow kind="total" indent={1} label={t("pl.totalRevenue")} outer={acc(sum(revenue))} />

              <StatementRow kind="heading" label={t("pl.lessDirect")} />
              {statementLines(direct)}
              <StatementRow kind="total" indent={1} label={t("pl.totalDirect")} outer={acc(-sum(direct))} />

              <StatementRow kind="result" label={gross >= 0 ? t("pl.grossProfit") : t("pl.grossLoss")} outer={acc(gross)} />

              {!!other.length && <>
                <StatementRow kind="heading" label={t("pl.addOther")} />
                {statementLines(other)}
                <StatementRow kind="total" indent={1} label={t("pl.totalOther")} outer={acc(sum(other))} />
              </>}

              <StatementRow kind="heading" label={t("pl.lessIndirect")} />
              {statementLines(indirect)}
              <StatementRow kind="total" indent={1} label={t("pl.totalIndirect")} outer={acc(-sum(indirect))} />

              <StatementRow kind="result" label={net >= 0 ? t("pl.netProfit") : t("pl.netLoss")} outer={acc(net)} />
            </Statement>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {t("pl.margins", {
                gross: sum(revenue) ? ((gross / sum(revenue)) * 100).toFixed(1) : "0.0",
                net: sum(revenue) + sum(other) ? ((net / (sum(revenue) + sum(other))) * 100).toFixed(1) : "0.0",
              })}
            </p>
          </Card>
        );
      })()}

      {/* ====================== BALANCE SHEET ====================== */}
      {tab === "balance" && (() => {
        // Statement of financial position, vertical form, as at a date. Always
        // cumulative: with a From date it reads its own balances up to To. The
        // profit not yet closed to capital is income less expense to date.
        const all = (trialFrom ? asAt.rows : trialRows) ?? balances;
        const rows = all.filter(b => Math.abs(b.balance) >= 0.005);
        const sum = (list: Balance[]) => list.reduce((s, b) => s + b.balance, 0);
        const profit = sum(rows.filter(b => b.group === "income")) - sum(rows.filter(b => b.group === "expense"));
        const assets = rows.filter(b => b.group === "asset");
        const nonCurrentA = assets.filter(b => NON_CURRENT_ASSETS.includes(b.subgroup));
        const currentA = assets.filter(b => !NON_CURRENT_ASSETS.includes(b.subgroup));
        const equity = rows.filter(b => b.group === "capital");
        const liabilities = rows.filter(b => b.group === "liability");
        const nonCurrentL = liabilities.filter(b => NON_CURRENT_LIABILITIES.includes(b.subgroup));
        const currentL = liabilities.filter(b => !NON_CURRENT_LIABILITIES.includes(b.subgroup));
        const totalAssets = sum(assets);
        const totalEquity = sum(equity) + profit;
        const totalEL = totalEquity + sum(liabilities);
        const gap = Math.round((totalAssets - totalEL) * 100) / 100;
        return (
          <Card className="p-5">
            {periodFilter(undefined, trialFrom ? t("balance.fromNote") : undefined)}
            <StatementHeading title={t("balance.heading")} subtitle={t("trial.asAt", { date: formatDate(trialTo || today()) })} />
            <Statement particulars={t("cols.particulars")} amount={t("pl.amount")}>
              <StatementRow kind="heading" label={t("balance.assets")} />
              {!!nonCurrentA.length && <>
                <StatementRow kind="head" indent={1} label={t("balance.nonCurrentAssets")} />
                {nonCurrentA.map(b => <StatementRow key={b.account_id} indent={2} label={b.name} inner={acc(b.balance)} />)}
                <StatementRow kind="total" indent={1} label={t("balance.totalNonCurrentAssets")} outer={acc(sum(nonCurrentA))} />
              </>}
              <StatementRow kind="head" indent={1} label={t("balance.currentAssets")} />
              {statementLines(currentA, 2)}
              <StatementRow kind="total" indent={1} label={t("balance.totalCurrentAssets")} outer={acc(sum(currentA))} />
              <StatementRow kind="result" label={t("balance.totalAssets")} outer={acc(totalAssets)} />

              <StatementRow kind="heading" label={t("balance.equityLiabilities")} />
              <StatementRow kind="head" indent={1} label={t("balance.equity")} />
              {equity.map(b => <StatementRow key={b.account_id} indent={2} label={b.name} inner={acc(b.balance)} />)}
              <StatementRow indent={2} label={t("balance.profitLoss")} inner={acc(profit)} />
              <StatementRow kind="total" indent={1} label={t("balance.totalEquity")} outer={acc(totalEquity)} />
              {!!nonCurrentL.length && <>
                <StatementRow kind="head" indent={1} label={t("balance.nonCurrentLiabilities")} />
                {nonCurrentL.map(b => <StatementRow key={b.account_id} indent={2} label={b.name} inner={acc(b.balance)} />)}
                <StatementRow kind="total" indent={1} label={t("balance.totalNonCurrentLiabilities")} outer={acc(sum(nonCurrentL))} />
              </>}
              <StatementRow kind="head" indent={1} label={t("balance.currentLiabilities")} />
              {statementLines(currentL, 2)}
              <StatementRow kind="total" indent={1} label={t("balance.totalCurrentLiabilities")} outer={acc(sum(currentL))} />
              <StatementRow kind="result" label={t("balance.totalEquityLiabilities")} outer={acc(totalEL)} />
            </Statement>
            {gap !== 0 && (
              <p className="mt-3 text-xs text-destructive">{t("balance.gap", { amount: fmt(Math.abs(gap)) })}</p>
            )}
          </Card>
        );
      })()}

      {/* ================== CASH FLOW STATEMENT ================== */}
      {tab === "cfs" && (() => {
        // Direct method, vertical form: each ledger cash moved against, sorted
        // into operating, investing and financing by its head. Opening cash
        // plus the three nets is closing cash — /api/v1/accounts/cash-flow.
        const cf = cashFlow.data;
        const asRows = (list: CashFlow["flows"]): Balance[] => list.map(f => ({
          account_id: f.account_id, code: f.code, name: f.name, group: f.group, subgroup: f.subgroup,
          active: true, opening_balance: 0, debit_total: 0, credit_total: 0, balance: f.amount,
        }));
        const flows = cf?.flows ?? [];
        const investing = asRows(flows.filter(f => INVESTING_HEADS.includes(f.subgroup)));
        const financing = asRows(flows.filter(f => FINANCING_HEADS.includes(f.subgroup)));
        const operating = asRows(flows.filter(f => !INVESTING_HEADS.includes(f.subgroup) && !FINANCING_HEADS.includes(f.subgroup)));
        const sum = (list: Balance[]) => list.reduce((s, b) => s + b.balance, 0);
        const net = sum(operating) + sum(investing) + sum(financing);
        const gap = cf ? Math.round((cf.opening + net - cf.closing) * 100) / 100 : 0;
        const subtitle = trialFrom
          ? t("trial.forPeriod", { from: formatDate(trialFrom), to: formatDate(trialTo || today()) })
          : t("pl.upTo", { date: formatDate(trialTo || today()) });
        return (
          <Card className="p-5">
            {periodFilter()}
            <StatementHeading title={t("cfs.heading")} subtitle={subtitle} />
            <Statement particulars={t("cols.particulars")} amount={t("pl.amount")}>
              <StatementRow kind="heading" label={t("cfs.operating")} />
              {statementLines(operating)}
              <StatementRow kind="total" indent={1} label={t("cfs.netOperating")} outer={acc(sum(operating))} />

              <StatementRow kind="heading" label={t("cfs.investing")} />
              {statementLines(investing)}
              <StatementRow kind="total" indent={1} label={t("cfs.netInvesting")} outer={acc(sum(investing))} />

              <StatementRow kind="heading" label={t("cfs.financing")} />
              {statementLines(financing)}
              <StatementRow kind="total" indent={1} label={t("cfs.netFinancing")} outer={acc(sum(financing))} />

              <StatementRow kind="result" label={t("cfs.netChange")} outer={acc(net)} />
              <StatementRow kind="total" label={t("cfs.opening")} outer={acc(cf?.opening ?? 0)} />
              <StatementRow kind="result" label={t("cfs.closing")} outer={acc(cf?.closing ?? 0)} />
            </Statement>
            {gap !== 0 && <p className="mt-3 text-xs text-destructive">{t("cfs.gap", { amount: fmt(Math.abs(gap)) })}</p>}
            <p className="mt-3 text-[11px] text-muted-foreground">{t("cfs.method")}</p>
          </Card>
        );
      })()}

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
                [t("form.companyName")]: i.company_name ?? "", [t("form.distributorName")]: i.distributor_name ?? "",
                [t("form.purchaseDate")]: i.purchase_date ?? "", [t("form.invoiceNo")]: i.invoice_no ?? "",
                [t("form.purchaseNotes")]: i.purchase_details ?? "",
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
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-primary">{i.name}</div>
                    {(i.company_name || i.distributor_name) && (
                      <div className="text-[11px] text-muted-foreground">{[i.company_name, i.distributor_name].filter(Boolean).join(" · ")}</div>
                    )}
                  </td>
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
      {/* New and edit share the form. An edit may name a ledger or cost center
          deactivated since, so it lists them all. */}
      <VoucherModal
        open={vOpen || !!editingV}
        editing={editingV}
        onClose={() => { setVOpen(false); setEditingV(null); }}
        ledgers={editingV ? ledgers : activeLedgers}
        centers={editingV ? centers : centers.filter(c => c.active)}
        vouchers={vouchers}
        onSaved={() => { setVOpen(false); setEditingV(null); refreshBooks(); }}
      />

      <DeleteVoucherDialog voucher={deletingV} onClose={() => setDeletingV(null)} onDeleted={refreshBooks} />
      <StatusDialog ask={statusAsk} onClose={() => setStatusAsk(null)} onDone={() => { setViewing(null); refreshBooks(); }} />

      {/* The voucher, and the workflow moves open to it from where it stands
          (0114). The database enforces each; these only offer the right ones. */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `${typeLabel(viewing.type)} ${viewing.entry_no}` : ""} size="lg"
        footer={viewing && <div className="flex w-full flex-wrap items-center justify-end gap-2">
          {viewing.status !== "cancelled" && (
            <Btn variant="ghost" className="mr-auto text-destructive"
              onClick={() => setStatusAsk({ voucher: viewing, status: "cancelled" })}>{t("workflow.cancel")}</Btn>
          )}
          {editableStatus(viewing.status) && (
            <Btn variant="outline" onClick={() => { setEditingV(viewing); setViewing(null); }}>{tc("edit")}</Btn>
          )}
          {viewing.status === "draft" && (
            <Btn variant="outline" onClick={() => moveStatus(viewing, "pending")}>{t("workflow.submit")}</Btn>
          )}
          {viewing.status === "pending" && (
            <Btn variant="outline" onClick={() => moveStatus(viewing, "draft")}>{t("workflow.withdraw")}</Btn>
          )}
          {viewing.status === "rejected" && (
            <Btn variant="outline" onClick={() => moveStatus(viewing, "draft")}>{t("workflow.reopen")}</Btn>
          )}
          {viewing.status === "pending" && canApprove && <>
            <Btn variant="danger" onClick={() => setStatusAsk({ voucher: viewing, status: "rejected" })}>{t("workflow.reject")}</Btn>
            <Btn onClick={() => moveStatus(viewing, "approved")}>{t("workflow.approve")}</Btn>
          </>}
          {(viewing.status === "draft" || viewing.status === "approved") && (
            <Btn onClick={() => postDraft(viewing)}>{t("workflow.post")}</Btn>
          )}
          <Btn variant="ghost" onClick={() => setViewing(null)}>{tc("close")}</Btn>
        </div>}>
        {viewing && (
          <>
            {viewing.status !== "posted" && (
              <div className={`mb-4 rounded-xl border px-3 py-2 text-sm ${
                viewing.status === "rejected" || viewing.status === "cancelled" ? "border-destructive/30 bg-destructive/5" : "border-border/60 bg-muted/30"
              }`}>
                <Pill tone={statusTone(viewing.status)}>{statusWord(viewing.status)}</Pill>
                {viewing.status_note && <span className="ml-2">{t("workflow.reasonLabel", { note: viewing.status_note })}</span>}
                <span className="ml-2 text-xs text-muted-foreground">{t("workflow.notInBooks")}</span>
              </div>
            )}
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

const VoucherModal = ({ open, onClose, ledgers, centers, vouchers, onSaved, editing = null }: {
  open: boolean; onClose: () => void; ledgers: LedgerRow[]; centers: CostCenter[];
  vouchers: Voucher[]; onSaved: () => void;
  /** Set to edit that voucher in full; saving it then asks for the password (0111). */
  editing?: Voucher | null;
}) => {
  const { t, typeLabel } = useAccountWords();
  const tc = useTranslations("common");
  const { formatCurrency } = useFormatters();
  /**
   * One voucher, many entries (0106). The number, date, type and status are the
   * voucher's; each entry is a debit ledger, a credit ledger and an amount with
   * its own party, cost center and narration, and is sent as a debit line and a
   * credit line carrying those three.
   */
  const blankEntry = () => ({ party: "", ledgerDr: "", ledgerCr: "", amount: "", cost_center_id: "", narration: "" });
  type Entry = ReturnType<typeof blankEntry>;
  const blank = () => ({
    no: "", date: today(), type: "payment" as VoucherType, status: "posted" as "posted" | "draft" | "pending",
    entries: [blankEntry()],
  });
  const [f, setF] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  /**
   * A stored voucher back into the form's entries. The form saved each entry
   * as a debit line and a credit line of the same amount, so each debit is
   * paired with a credit of the same amount — preferring one with the same
   * party and narration. A voucher entered some other way (one debit against
   * two credits) has no such pairing, and comes back null.
   */
  const entriesOf = (v: Voucher): Entry[] | null => {
    const debits = v.journal_lines.filter(l => Number(l.debit) > 0);
    const credits = v.journal_lines.filter(l => Number(l.credit) > 0);
    const entries: Entry[] = [];
    for (const d of debits) {
      const same = (c: typeof d) => Number(c.credit) === Number(d.debit);
      const i = credits.findIndex(c => same(c) && c.party === d.party && c.narration === d.narration);
      const at = i >= 0 ? i : credits.findIndex(same);
      if (at < 0) return null;
      const [c] = credits.splice(at, 1);
      entries.push({
        party: d.party ?? "", narration: d.narration ?? "",
        ledgerDr: d.account_id, ledgerCr: c.account_id, amount: String(Number(d.debit)),
        cost_center_id: d.cost_center_id ?? v.cost_center_id ?? "",
      });
    }
    if (credits.length || !entries.length) return null;
    // Before 0106 party and narration lived on the voucher only.
    if (entries.length === 1 && !entries[0].party && !entries[0].narration) {
      entries[0] = { ...entries[0], party: v.party ?? "", narration: v.narration ?? "" };
    }
    return entries;
  };

  // A fresh form each time it opens: numbered for the default type, or filled
  // from the voucher being edited.
  useEffect(() => {
    if (!open) return;
    setPassword("");
    setPasswordError("");
    if (!editing) { setF({ ...blank(), no: nextNumber("payment", vouchers) }); return; }
    const entries = entriesOf(editing);
    if (!entries) { toast.error(t("form.cannotEdit")); onClose(); return; }
    // A rejected voucher comes back as a draft once edited (0114).
    setF({ no: editing.entry_no, date: editing.entry_date, type: editing.type, status: editing.status === "posted" ? "posted" : "draft", entries });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const setEntry = (index: number, patch: Partial<Entry>) =>
    setF(prev => ({ ...prev, entries: prev.entries.map((e, i) => (i === index ? { ...e, ...patch } : e)) }));
  const addEntry = () => setF(prev => ({ ...prev, entries: [...prev.entries, blankEntry()] }));
  const removeEntry = (index: number) =>
    setF(prev => ({ ...prev, entries: prev.entries.filter((_, i) => i !== index) }));

  const total = f.entries.reduce((sum, e) => sum + (Number(e.amount) > 0 ? Number(e.amount) : 0), 0);

  const isCashOrBank = (id: string) => {
    const subgroup = ledgers.find(l => l.id === id)?.subgroup;
    return subgroup === "cash_in_hand" || subgroup === "bank_accounts";
  };

  const submit = async () => {
    if (!f.no.trim() || !f.date) {
      toast.error(t("form.missing"), { description: t("form.voucherNoMissing") });
      return;
    }
    for (const [i, e] of f.entries.entries()) {
      if (!e.ledgerDr || !e.ledgerCr || !(Number(e.amount) > 0)) {
        toast.error(t("form.missing"), { description: t("form.entryMissing", { n: i + 1 }) });
        return;
      }
      if (e.ledgerDr === e.ledgerCr) {
        toast.error(t("form.sameLedger"), { description: t("form.sameLedgerEntry", { n: i + 1 }) });
        return;
      }
      // Money leaves cash or bank on a payment and arrives there on a receipt.
      // The other way round books the expense as a credit and inflates profit.
      if ((f.type === "payment" || f.type === "petty_cash") && !isCashOrBank(e.ledgerCr)) {
        toast.error(t("form.wrongSide"), { description: t("form.paymentCredit", { n: i + 1 }) });
        return;
      }
      if (f.type === "receipt" && !isCashOrBank(e.ledgerDr)) {
        toast.error(t("form.wrongSide"), { description: t("form.receiptDebit", { n: i + 1 }) });
        return;
      }
    }
    if (editing && !password) { setPasswordError(t("deleteVoucher.enterPassword")); return; }
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/v1/accounts/vouchers/${editing.id}` : "/api/v1/accounts/vouchers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { password } : {}),
          entry_no: f.no.trim(),
          entry_date: f.date,
          type: f.type,
          post: f.status === "posted",
          submit: f.status === "pending",
          // The voucher's own party, narration and cost center are filled from
          // these by the API.
          lines: f.entries.flatMap(e => {
            const amount = Number(e.amount);
            const details = { party: e.party.trim(), narration: e.narration.trim(), cost_center_id: e.cost_center_id };
            return [
              { account_id: e.ledgerDr, debit: amount, credit: 0, ...details },
              { account_id: e.ledgerCr, debit: 0, credit: amount, ...details },
            ];
          }),
        }),
      });
      const body = await res.json().catch(() => null);
      if (editing && res.status === 401) { setPasswordError(t("deleteVoucher.wrongPassword")); return; }
      if (!res.ok) { toast.error(body?.error?.message || (editing ? t("toasts.voucherUpdateFailed") : t("form.recordFailed"))); return; }
      if (editing) toast.success(t("toasts.voucherUpdated", { no: f.no.trim() }));
      else if (f.status === "pending") toast.success(t("workflow.sentForApproval", { no: f.no.trim() }));
      else toast.success(f.status === "posted" ? t("form.voucherPosted") : t("form.draftSaved"), {
        description: `${typeLabel(f.type)} ${f.no.trim()}`,
      });
      setPassword("");
      onSaved();
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !saving && onClose()} size="xl"
      title={editing ? t("form.editTitle", { no: editing.entry_no }) : t("form.newVoucher")}
      footer={<><Btn variant="ghost" onClick={onClose} disabled={saving}>{tc("cancel")}</Btn>
        <Btn onClick={submit} disabled={saving}>
          {saving ? tc("saving") : editing ? tc("save")
            : f.status === "posted" ? t("form.postVoucher") : f.status === "pending" ? t("workflow.submit") : t("form.saveDraft")}
        </Btn></>}>
      {/* The voucher: its number, date, type and whether it posts now. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        <Field label={t("cols.status")}>
          <Select value={f.status} disabled={editing?.status === "posted"}
            onChange={e => setF({ ...f, status: e.target.value as "posted" | "draft" | "pending" })}>
            <option value="posted">{t("posted")}</option>
            <option value="draft">{t("draft")}</option>
            <option value="pending">{t("workflow.pendingOption")}</option>
          </Select>
        </Field>
      </div>

      {/* Its entries: each a debit, a credit and an amount, with its own
          party, cost center and narration. */}
      <div className="space-y-3">
        <p className="text-xs font-bold tracking-wider text-muted-foreground">{t("form.entries").toUpperCase()}</p>
        {f.entries.map((e, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">{t("form.entry", { n: i + 1 })}</span>
              {f.entries.length > 1 && (
                <button type="button" onClick={() => removeEntry(i)} aria-label={t("form.removeEntry", { n: i + 1 })}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label={t("form.party")}><Input value={e.party} onChange={ev => setEntry(i, { party: ev.target.value })} /></Field>
              <Field label={t("form.debitLedger")} required>
                <Select value={e.ledgerDr} onChange={ev => setEntry(i, { ledgerDr: ev.target.value })}>
                  <option value="">{t("form.select")}</option>
                  {ledgers.map(l => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
                </Select>
              </Field>
              <Field label={t("form.creditLedger")} required>
                <Select value={e.ledgerCr} onChange={ev => setEntry(i, { ledgerCr: ev.target.value })}>
                  <option value="">{t("form.select")}</option>
                  {ledgers.map(l => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
                </Select>
              </Field>
              <Field label={t("cols.amount")} required>
                <Input type="number" min={0} step="0.01" value={e.amount} onChange={ev => setEntry(i, { amount: ev.target.value })} />
              </Field>
              <Field label={t("form.costCenter")}>
                <Select value={e.cost_center_id} onChange={ev => setEntry(i, { cost_center_id: ev.target.value })}>
                  <option value="">{t("form.none")}</option>
                  {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label={t("form.narration")}><Input value={e.narration} onChange={ev => setEntry(i, { narration: ev.target.value })} /></Field>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 pb-2">
          <Btn variant="outline" onClick={addEntry}><Plus className="h-4 w-4" /> {t("form.addEntry")}</Btn>
          <p className="text-sm">
            <span className="text-muted-foreground">{t("form.total")}: </span>
            <span className="font-semibold text-primary tabular-nums">{formatCurrency(total)}</span>
          </p>
        </div>
      </div>
      {f.status === "posted" && !editing && (
        <p className="text-[11px] text-muted-foreground -mt-1">{t("form.postedNote")}</p>
      )}
      {editing && (
        <form className="mt-4 rounded-xl border border-border/60 p-3 sm:max-w-sm" onSubmit={e => { e.preventDefault(); void submit(); }}>
          <Field label={t("form.confirmPassword")} hint={t("form.confirmPasswordHint")} error={passwordError || undefined} required>
            <Input type="password" autoComplete="current-password" value={password} aria-invalid={!!passwordError}
              onChange={e => { setPassword(e.target.value); setPasswordError(""); }} />
          </Field>
        </form>
      )}
    </Modal>
  );
};

/**
 * Rejecting or cancelling a voucher, with the reason kept on it. Cancelling a
 * posted voucher takes it out of the books, so that one also asks for the
 * password — set_voucher_status (0114) refuses it otherwise.
 */
const StatusDialog = ({ ask, onClose, onDone }: {
  ask: { voucher: Voucher; status: "rejected" | "cancelled" } | null; onClose: () => void; onDone: () => void;
}) => {
  const { t } = useAccountWords();
  const tc = useTranslations("common");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const voucher = ask?.voucher;
  const needsPassword = ask?.status === "cancelled" && voucher?.status === "posted";

  const close = () => { setNote(""); setPassword(""); setError(""); onClose(); };

  const submit = async () => {
    if (!ask || !voucher) return;
    if (needsPassword && !password) { setError(t("deleteVoucher.enterPassword")); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/accounts/vouchers/${voucher.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: ask.status, note: note.trim() || undefined, password: needsPassword ? password : undefined }),
      });
      const body = await res.json().catch(() => null);
      if (res.status === 401 && needsPassword) { setError(t("deleteVoucher.wrongPassword")); return; }
      if (!res.ok) { toast.error(body?.error?.message ?? t("workflow.failed")); return; }
      toast.success(t("workflow.done", { no: voucher.entry_no, status: t(ask.status) }));
      setNote("");
      setPassword("");
      onDone();
      onClose();
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setBusy(false);
    }
  };

  const rejecting = ask?.status === "rejected";
  return (
    <Modal open={!!ask} onClose={close} size="sm"
      title={voucher ? t(rejecting ? "workflow.rejectTitle" : "workflow.cancelTitle", { no: voucher.entry_no }) : ""}
      footer={<>
        <Btn variant="outline" onClick={close}>{tc("cancel")}</Btn>
        <Btn variant="danger" onClick={submit} disabled={busy}>
          {busy ? tc("loading") : rejecting ? t("workflow.reject") : t("workflow.cancel")}
        </Btn>
      </>}>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
        <p className="text-sm text-muted-foreground">
          {rejecting ? t("workflow.rejectBody") : needsPassword ? t("workflow.cancelPostedBody") : t("workflow.cancelBody")}
        </p>
        <Field label={t("workflow.reason")} hint={rejecting ? t("workflow.rejectReasonHint") : t("workflow.cancelReasonHint")}>
          <TextArea value={note} maxLength={1000} onChange={e => setNote(e.target.value)} />
        </Field>
        {needsPassword && (
          <Field label={t("deleteVoucher.password")} error={error || undefined} required>
            <Input type="password" autoComplete="current-password" value={password}
              aria-invalid={!!error} onChange={e => { setPassword(e.target.value); setError(""); }} />
          </Field>
        )}
      </form>
    </Modal>
  );
};

/**
 * Deleting a voucher asks for the password again. The route checks it and the
 * database refuses without a fresh sign-in (0109), so this is the only door.
 */
const DeleteVoucherDialog = ({ voucher, onClose, onDeleted }: {
  voucher: Voucher | null; onClose: () => void; onDeleted: () => void;
}) => {
  const { t } = useAccountWords();
  const tc = useTranslations("common");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => { setPassword(""); setError(""); onClose(); };

  const submit = async () => {
    if (!voucher) return;
    if (!password) { setError(t("deleteVoucher.enterPassword")); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/accounts/vouchers/${voucher.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await res.json().catch(() => null);
      if (res.status === 401) { setError(t("deleteVoucher.wrongPassword")); return; }
      if (!res.ok) { setError(body?.error?.message ?? t("deleteVoucher.failed")); return; }
      toast.success(t("deleteVoucher.deleted", { no: voucher.entry_no }));
      setPassword("");
      onDeleted();
      onClose();
    } catch {
      setError(t("deleteVoucher.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!voucher} onClose={close} size="sm" title={voucher ? t("deleteTitle", { name: voucher.entry_no }) : ""}
      footer={<>
        <Btn variant="outline" onClick={close}>{tc("cancel")}</Btn>
        <Btn variant="danger" onClick={submit} disabled={busy}>{busy ? tc("loading") : t("deleteVoucher.confirm")}</Btn>
      </>}>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
        <p className="text-sm text-muted-foreground">
          {voucher?.status === "posted" ? t("deleteVoucher.postedBody") : t("vouchers.deleteBody")}
        </p>
        <Field label={t("deleteVoucher.password")} error={error || undefined} required>
          <Input type="password" autoComplete="current-password" autoFocus value={password}
            aria-invalid={!!error} onChange={e => { setPassword(e.target.value); setError(""); }} />
        </Field>
      </form>
    </Modal>
  );
};

type LedgerBody = { code: string; name: string; subgroup: string; opening_balance: string; active: boolean };

const LedgerModal = ({ value, onClose, onSave }: {
  value: LedgerRow | "new" | null; onClose: () => void; onSave: (body: LedgerBody) => Promise<void>;
}) => {
  const { t, subgroupLabel } = useAccountWords();
  const tc = useTranslations("common");
  const locale = useLocale();
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
            {SUBGROUPS
              .map(g => ({ g, label: subgroupLabel(g) }))
              .sort((a, b) => a.label.localeCompare(b.label, locale))
              .map(({ g, label }) => <option key={g} value={g}>{label}</option>)}
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

type StockBody = {
  name: string; unit: string; qty: string; rate: string; reorder: string;
  company_name: string; distributor_name: string; purchase_date: string; invoice_no: string; purchase_details: string;
};

const StockModal = ({ value, onClose, onSave }: {
  value: StockItem | "new" | null; onClose: () => void; onSave: (body: StockBody) => Promise<void>;
}) => {
  const { t, unitLabel } = useAccountWords();
  const tc = useTranslations("common");
  const blank: StockBody = {
    name: "", unit: "pcs", qty: "0", rate: "0", reorder: "0",
    company_name: "", distributor_name: "", purchase_date: "", invoice_no: "", purchase_details: "",
  };
  const [f, setF] = useState<StockBody>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (value === "new") setF(blank);
    else if (value) setF({
      name: value.name, unit: value.unit, qty: String(value.qty), rate: String(value.rate), reorder: String(value.reorder),
      company_name: value.company_name ?? "", distributor_name: value.distributor_name ?? "",
      purchase_date: value.purchase_date ?? "", invoice_no: value.invoice_no ?? "", purchase_details: value.purchase_details ?? "",
    });
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
        <Field label={t("form.companyName")}><Input value={f.company_name} onChange={e => setF({ ...f, company_name: e.target.value })} /></Field>
        <Field label={t("form.distributorName")}><Input value={f.distributor_name} onChange={e => setF({ ...f, distributor_name: e.target.value })} /></Field>
      </div>

      <h4 className="mt-5 mb-3 font-semibold text-primary">{t("form.purchaseDetails")}</h4>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={t("form.purchaseDate")}><Input type="date" value={f.purchase_date} onChange={e => setF({ ...f, purchase_date: e.target.value })} /></Field>
        <Field label={t("form.invoiceNo")}><Input value={f.invoice_no} onChange={e => setF({ ...f, invoice_no: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <Field label={t("form.purchaseNotes")} hint={t("form.purchaseNotesHint")}>
            <TextArea value={f.purchase_details} onChange={e => setF({ ...f, purchase_details: e.target.value })} />
          </Field>
        </div>
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
            {actions && <th className="px-3 py-2 w-24 print:hidden" />}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
};

/* ---- financial statements, in the vertical accounting layout ---- */

/** Heads that sit under non-current on a balance sheet; every other asset head is current. */
const NON_CURRENT_ASSETS = ["fixed_assets", "fixed_assets_at_cost", "accumulated_depreciation", "investments"];
const NON_CURRENT_LIABILITIES = ["loans", "secured_loans", "unsecured_loans"];

/** A statement's title block: the statement's name and its date or period. */
const StatementHeading = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="text-center mb-5">
    <h2 className="font-display text-2xl text-primary">{title}</h2>
    <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
  </div>
);

/**
 * Particulars and two amount columns: the inner one for the lines of a
 * section, the outer one for its total. The usual layout of a profit and
 * loss account or balance sheet in vertical form.
 */
const Statement = ({ particulars, amount, children }: { particulars: string; amount: string; children: React.ReactNode }) => (
  <div className="overflow-x-auto -mx-2">
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="border-y-2 border-primary/30 text-xs font-bold text-primary">
          <th className="px-3 py-2.5 text-left">{particulars}</th>
          <th className="px-3 py-2.5 text-right" colSpan={2}>{amount}</th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const INDENT = ["pl-3", "pl-7", "pl-11", "pl-16"];

const StatementRow = ({ label, inner, outer, indent = 0, kind = "line" }: {
  label: React.ReactNode; inner?: string; outer?: string; indent?: 0 | 1 | 2 | 3;
  /** heading: a section's name. line: an item. head: a group label within a section. total: a section's total. result: gross or net profit, a balance sheet total. */
  kind?: "heading" | "line" | "head" | "total" | "result";
}) => {
  const labelClass = {
    heading: "pt-4 font-semibold text-primary",
    line: "text-foreground/80",
    head: "pt-2 italic text-muted-foreground",
    total: "font-semibold",
    result: "pt-3 font-bold text-primary",
  }[kind];
  return (
    <tr>
      <td className={`${INDENT[indent]} pr-3 py-1.5 ${labelClass}`}>{label}</td>
      <td className={`px-3 py-1.5 text-right w-36 ${kind === "total" ? "border-t border-foreground/30" : ""}`}>{inner}</td>
      <td className={`px-3 py-1.5 text-right w-36 ${
        kind === "result" ? "pt-3 font-bold text-primary border-t border-foreground/40 border-b-4 border-double border-b-primary/60"
          : kind === "total" ? "font-semibold" : ""
      }`}>{outer}</td>
    </tr>
  );
};

/** True when every word of the query appears somewhere in the given values. */
const matchesQuery = (query: string, values: unknown[]) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const text = values.filter(v => v !== null && v !== undefined && v !== "").join(" ").toLowerCase();
  return terms.every(term => text.includes(term));
};

const SearchBox = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="flex-1 min-w-[200px] relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
      className="w-full pl-10 pr-4 py-2 rounded-full bg-muted/40 text-sm outline-none" />
  </div>
);

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
    case "payment": case "purchase": case "petty_cash": return "info";
    case "journal": case "contra": case "stock_journal": return "default";
    case "credit_note": return "warn";
    case "debit_note": return "bad";
  }
};

export default Accounts;
