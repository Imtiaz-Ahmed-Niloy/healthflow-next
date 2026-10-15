"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Search, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Btn } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { pharmacyCustomersApi, pharmacyItemsApi, usePharmacyMeQuery } from "@/redux/api/pharmacy";
import type { LoyaltyTier, Permission, PharmacyCustomer, PharmacyItem } from "@/lib/pharmacy";

/** The small things every pharmacy screen uses. The big ones are admin/ui and admin/crud. */

export const useDebounced = <T,>(value: T, ms = 300) => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
};

/**
 * May the signed-in person do this (0133)? For hiding a button they could not
 * use. False until the answer is in. The database asks the same question again
 * when the thing is attempted, so this is never the only check.
 */
export const usePharmacyCan = () => {
  const { data } = usePharmacyMeQuery();
  return (permission: Permission) => Boolean(data?.data.can[permission]);
};

const TIER_STYLE: Record<LoyaltyTier, string> = {
  bronze: "bg-orange-100 text-orange-900",
  silver: "bg-slate-200 text-slate-800",
  gold: "bg-amber-100 text-amber-900",
  platinum: "bg-violet-100 text-violet-900",
};

/** A customer's loyalty tier, as a small coloured tag. */
export const TierPill = ({ tier }: { tier: LoyaltyTier }) => {
  const t = useTranslations("pharmacy.tiers");
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${TIER_STYLE[tier]}`}>{t(tier)}</span>;
};

// ------------------------------------------------------------------ errors ---

/** The keys a pharmacy function raises in HINT (0127), which the messages have words for. */
const ERROR_CODES = [
  "not_pharmacy_staff", "no_hospital", "bad_payment_method", "empty_cart", "customer_not_found",
  "credit_needs_customer", "drawer_closed", "bad_quantity", "item_not_found", "insufficient_stock", "cash_short",
  "bad_refund_method", "reason_required", "sale_not_found", "already_returned", "nothing_to_return",
  "line_not_on_sale", "return_too_many", "drawer_insufficient", "nothing_due", "bad_amount", "payment_too_much",
  "supplier_required", "empty_order", "order_not_found", "order_closed", "nothing_received", "line_not_on_order",
  "receive_too_many", "batch_required", "expiry_required", "order_cannot_cancel", "drawer_already_open",
  "bad_cash_type", "cash_line_not_found", "cash_line_fixed", "drawer_counted", "not_your_drawer",
  "batch_not_found", "no_change", "write_off_adds", "bad_reason", "wrong_hospital", "batch_item_fixed", "email_taken",
  // 0134
  "no_permission", "customer_required", "split_needs_parts", "split_over", "split_short", "credit_short", "bad_unit",
  "loyalty_off", "redeem_too_few", "redeem_too_many", "redeem_over_total", "bad_condition", "pin_required", "bad_pin",
  "pin_locked", "register_not_found", "register_in_use", "bad_staff_role", "staff_not_found", "branch_not_found",
  "own_access", "bad_pin_format", "tiers_out_of_order",
  // the AI routes
  "ai_not_configured", "ai_feature_off", "ai_no_answer", "ai_busy", "ai_unavailable",
] as const;

type ErrorCode = (typeof ERROR_CODES)[number];
type ApiFailure = {
  data?: { error?: { message?: string; code?: string; detail?: string; details?: { fieldErrors?: Record<string, string[]> } } };
};

/**
 * Turns a failed request into a sentence in the reader's language.
 *
 * A refusal from the database carries a short key; the words for it are in
 * the messages. Anything without a key the messages know falls back to what
 * the server said, and then to "something went wrong".
 */
export const usePharmacyError = () => {
  const t = useTranslations("pharmacy.errors");
  return (error: unknown): string => {
    const failure = (error as ApiFailure | undefined)?.data?.error;
    const code = failure?.code;
    if (code && (ERROR_CODES as readonly string[]).includes(code)) {
      return t(code as ErrorCode, { detail: failure?.detail ?? "" });
    }
    const field = Object.entries(failure?.details?.fieldErrors ?? {}).find(([, messages]) => messages?.length);
    if (field) return `${field[0]}: ${field[1][0]}`;
    return failure?.message ?? t("generic");
  };
};

// ------------------------------------------------------------------ export ---

/**
 * Every row of a list that matches a search and its filters, not only the
 * page on screen — for an export, where "the first twenty" is not what was
 * asked for. Reads a hundred at a time and stops at five thousand, which is
 * a year of invoices for a busy counter and still a file a spreadsheet opens.
 */
export const fetchAllRows = async <T,>(resource: string, query: Record<string, string | undefined> = {}): Promise<T[]> => {
  const rows: T[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const params = new URLSearchParams({ page: String(page), limit: "100" });
    Object.entries(query).forEach(([key, value]) => { if (value) params.set(key, value); });

    const response = await fetch(`/api/v1/${resource}?${params}`);
    const body = await response.json();
    if (!response.ok) throw { data: body };

    rows.push(...(body.data as T[]));
    if (page >= body.meta.totalPages) break;
  }
  return rows;
};

type Cell = string | number | null | undefined;

/** The same rows as a real .xlsx workbook, for the people who live in Excel. Numbers stay numbers. */
export const exportExcel = async (rows: Record<string, Cell>[], filename: string) => {
  if (!rows.length) return false;
  try {
    // Loaded when asked for: the library is not small, and most visits never export.
    const pkg = "write-excel-file/browser";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import(/* webpackIgnore: true */ pkg) as any;
    const writeExcelFile = mod?.default ?? mod;
    const headers = Object.keys(rows[0]);
    await writeExcelFile([
      headers.map(header => ({ value: header, fontWeight: "bold" as const })),
      ...rows.map(row => headers.map(header => ({ value: row[header] ?? "" }))),
    ]).toFile(filename);
    return true;
  } catch {
    return false;
  }
};

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/**
 * A list on paper: a title, a line under it, and the rows as a table, in a
 * window of its own that prints itself. False when the pop-up was blocked.
 */
export const printTable = (title: string, subtitle: string, rows: Record<string, Cell>[]) => {
  const w = window.open("", "_blank", "width=1000,height=900");
  if (!w) return false;
  const headers = Object.keys(rows[0] ?? {});
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
      body{font-family:system-ui,-apple-system,"Segoe UI","Nirmala UI",sans-serif;color:#111;margin:0;padding:28px;font-size:12px}
      h1{font-size:18px;margin:0}p{color:#555;margin:4px 0 16px}table{width:100%;border-collapse:collapse}
      th,td{border-bottom:1px solid #e5e7eb;padding:6px;text-align:left;vertical-align:top}th{background:#f3f4f6;font-size:11px}
    </style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p>
    <table><thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(row => `<tr>${headers.map(header => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`,
  );
  w.document.close();
  return true;
};

// ------------------------------------------------------------------ pieces ---

const selectClass = "rounded-lg border border-border/60 bg-card px-2 py-1.5 text-xs font-semibold text-foreground/80 outline-none focus:border-primary/60";

/** How many rows a page shows. */
export const PerPage = ({ value, onChange, options = [10, 20, 50, 100] }: {
  value: number; onChange: (value: number) => void; options?: number[];
}) => {
  const t = useTranslations("pharmacy.common");
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground print:hidden">
      {t("perPage")}
      <select value={value} onChange={event => onChange(Number(event.target.value))} className={selectClass}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
};

/** Which order a list comes in. `value` is whatever the caller's options are keyed by. */
export const SortSelect = <T extends string>({ value, onChange, options }: {
  value: T; onChange: (value: T) => void; options: { value: T; label: string }[];
}) => {
  const t = useTranslations("pharmacy.common");
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground print:hidden">
      {t("sortBy")}
      <select value={value} onChange={event => onChange(event.target.value as T)} className={selectClass}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
};

export const SearchBox = ({ value, onChange, placeholder, className = "", autoFocus }: {
  value: string; onChange: (value: string) => void; placeholder?: string; className?: string; autoFocus?: boolean;
}) => {
  const tc = useTranslations("pharmacy.common");
  return (
    <div className={`flex items-center gap-2 bg-muted/40 rounded-full px-4 py-2 min-w-[220px] ${className}`}>
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? tc("search")}
        aria-label={tc("search")} autoFocus={autoFocus} className="bg-transparent outline-none text-sm flex-1 min-w-0" />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label={tc("close")} className="text-muted-foreground hover:text-primary">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export const Pager = ({ page, totalPages, total, onPage }: {
  page: number; totalPages: number; total: number; onPage: (page: number) => void;
}) => {
  const t = useTranslations("pharmacy.common");
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-muted-foreground print:hidden">
      <span>{t("records", { count: total })}</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Btn variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)} className="!px-3 !py-1.5">
            <ChevronLeft className="h-4 w-4" /> {t("previous")}
          </Btn>
          <span>{t("pageOf", { page, total: totalPages })}</span>
          <Btn variant="outline" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="!px-3 !py-1.5">
            {t("next")} <ChevronRight className="h-4 w-4" />
          </Btn>
        </div>
      )}
    </div>
  );
};

const TILE_TONES = {
  default: "text-primary",
  good: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-destructive",
} as const;

/** One number with its name. `hint` is the line under it. */
export const Tile = ({ icon: Icon, label, value, hint, tone = "default", className = "" }: {
  icon?: LucideIcon; label: string; value: ReactNode; hint?: ReactNode; tone?: keyof typeof TILE_TONES; className?: string;
}) => (
  <div className={`rounded-2xl bg-card border border-border/60 p-4 shadow-soft ${className}`}>
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      {Icon && <Icon className="h-4 w-4 shrink-0" />}<span className="truncate">{label}</span>
    </div>
    <p className={`font-display text-2xl mt-1 tabular-nums ${TILE_TONES[tone]}`}>{value}</p>
    {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
  </div>
);

/** What a list or a panel shows before it has rows: still loading, failed, or simply empty. */
export const StateBlock = ({ loading, error, onRetry, empty, rows = 4 }: {
  loading?: boolean; error?: unknown; onRetry?: () => void; empty?: ReactNode; rows?: number;
}) => {
  const t = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
        <p className="text-sm text-destructive mt-2">{describe(error)}</p>
        {onRetry && <Btn variant="outline" onClick={onRetry} className="mt-3">{t("retry")}</Btn>}
      </div>
    );
  }
  return <div className="text-center py-12 text-sm text-muted-foreground">{empty ?? t("nothing")}</div>;
};

// ----------------------------------------------------------------- pickers ---

type PickerProps<T> = {
  value: T | null;
  onPick: (row: T | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

/** A search box that drops a short list under itself. Shared by the two pickers below. */
function Picker<T extends { id: string }>({ value, onPick, placeholder, autoFocus, rows, loading, label, sub, q, setQ }: PickerProps<T> & {
  rows: T[]; loading: boolean; label: (row: T) => string; sub: (row: T) => ReactNode; q: string; setQ: (q: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const away = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 bg-muted/40 rounded-lg px-3 py-2 text-sm">
        <div className="min-w-0">
          <p className="font-semibold text-primary truncate">{label(value)}</p>
          <div className="text-[11px] text-muted-foreground truncate">{sub(value)}</div>
        </div>
        <button type="button" onClick={() => { onPick(null); setQ(""); }} className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={box} className="relative">
      <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder={placeholder} autoFocus={autoFocus} className="bg-transparent outline-none text-sm flex-1 min-w-0" />
      </div>
      {open && (rows.length > 0 || loading) && (
        <ul className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border/60 bg-card shadow-2xl py-1">
          {loading && rows.length === 0 && <li className="px-3 py-2"><Skeleton className="h-8 w-full" /></li>}
          {rows.map(row => (
            <li key={row.id}>
              <button type="button" onClick={() => { onPick(row); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-muted/60">
                <p className="text-sm font-semibold text-primary truncate">{label(row)}</p>
                <div className="text-[11px] text-muted-foreground truncate">{sub(row)}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Find one product by typing. Products that are off sale are left out. */
export const ItemPicker = (props: PickerProps<PharmacyItem>) => {
  const [q, setQ] = useState("");
  const settled = useDebounced(q);
  const { data, isFetching } = pharmacyItemsApi.useList({ q: settled, limit: 8, filters: { is_active: "true" } });
  return (
    <Picker {...props} q={q} setQ={setQ} rows={data?.data ?? []} loading={isFetching}
      label={row => row.name}
      sub={row => [row.generic_name, row.sku].filter(Boolean).join(" · ")} />
  );
};

/** Find one saved customer by typing a name or a phone number. */
export const CustomerPicker = (props: PickerProps<PharmacyCustomer>) => {
  const [q, setQ] = useState("");
  const settled = useDebounced(q);
  const { data, isFetching } = pharmacyCustomersApi.useList({ q: settled, limit: 8 });
  return (
    <Picker {...props} q={q} setQ={setQ} rows={data?.data ?? []} loading={isFetching}
      label={row => row.name}
      sub={row => row.phone ?? row.email ?? ""} />
  );
};
