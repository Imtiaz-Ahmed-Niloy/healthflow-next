"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Receipt, Wallet, AlertCircle, TrendingUp, Play, Printer, Search, X,
  Loader2, Trash2, CheckCircle2, Ban, RotateCcw, FileText, CalendarDays,
} from "lucide-react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, Kpi, SectionTitle, Btn, Pill } from "@/components/admin/ui";
import { Modal, ConfirmDialog } from "@/components/admin/crud";
import { useGetResourceQuery } from "@/redux/api/createResourceApi";
import { platformInvoicesApi, type PlatformInvoiceRow } from "@/redux/api/resources";

/**
 * What each hospital owes HealthFlow, per month.
 *
 * The charge is usage-based: prescriptions written x the rate on the
 * hospital's package, less its discount. Everything on this screen is counted
 * by `generate_platform_invoices` (0056) — nothing is typed in. The screen
 * before this one kept invoices in localStorage next to a box a super admin
 * typed prescription counts into by hand.
 *
 * Two hospitals never get an invoice, and the generator says so by name rather
 * than leaving a gap: one that is not approved, and one whose package is not
 * active. A trial or suspended plan bills nothing.
 */

type Status = PlatformInvoiceRow["status"];

type Outcome = "created" | "exists" | "no_prescriptions" | "not_approved" | "no_active_package";

const OUTCOME_LABELS: Record<Outcome, string> = {
  created: "Invoice raised",
  exists: "Already invoiced",
  no_prescriptions: "No prescriptions this month",
  not_approved: "Hospital not approved",
  no_active_package: "Package not active",
};

const OUTCOME_TONE: Record<Outcome, "ok" | "info" | "default" | "warn"> = {
  created: "ok",
  exists: "info",
  no_prescriptions: "default",
  not_approved: "warn",
  no_active_package: "warn",
};

type GenerateRow = {
  tenant_id: string;
  hospital: string;
  outcome: Outcome;
  invoice_id: string | null;
  prescriptions: number | null;
  total: number | string | null;
};

type GenerateResult = {
  month: string;
  summary: Partial<Record<Outcome, number>>;
  billed: number;
  rows: GenerateRow[];
};

const money = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const monthLabel = (isoDate: string) =>
  new Date(`${isoDate.slice(0, 7)}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

const dayLabel = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const thisMonth = () => new Date().toISOString().slice(0, 7);

const today = () => new Date().toISOString().slice(0, 10);

/**
 * A readable invoice number, derived rather than stored: the month it bills
 * and the head of its id. Two invoices can never collide — one hospital gets
 * one invoice per month — and it needs no counter that could drift out of step
 * with the rows themselves.
 */
const invoiceNo = (invoice: PlatformInvoiceRow) =>
  `HF-${invoice.billing_month.slice(0, 7).replace("-", "")}-${invoice.id.slice(0, 6).toUpperCase()}`;

/** Overdue is not a stored status — it is `pending` with the date gone by. */
const isOverdue = (invoice: PlatformInvoiceRow) =>
  invoice.status === "pending" && invoice.due_date < today();

const statusPill = (invoice: PlatformInvoiceRow) => {
  if (invoice.status === "paid") return <Pill tone="ok">Paid</Pill>;
  if (invoice.status === "void") return <Pill tone="default">Void</Pill>;
  return isOverdue(invoice) ? <Pill tone="bad">Overdue</Pill> : <Pill tone="warn">Pending</Pill>;
};

const Billing = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [month, setMonth] = useState(thisMonth);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status | "overdue">("all");
  const [hospitalFilter, setHospitalFilter] = useState("all");
  // Both inclusive, both YYYY-MM: a period is read in whole months here, and a
  // day-precision picker would invite ranges that cut an invoice in half.
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<GenerateResult | null>(null);
  const [viewing, setViewing] = useState<PlatformInvoiceRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PlatformInvoiceRow | null>(null);

  const { data, isLoading, error, refetch } = platformInvoicesApi.useList({ limit: 100 });
  const [updateInvoice] = platformInvoicesApi.useUpdate();
  const [removeInvoice] = platformInvoicesApi.useRemove();

  const invoices = useMemo(() => data?.data ?? [], [data]);

  /**
   * ?hospital=<tenant_id> — /super/hospitals links here to see one hospital's
   * bills, so the hospital filter arrives already set.
   *
   * The name is looked up rather than taken from the URL: a hospital with no
   * invoices yet has nothing in the list to name it, and the filter would
   * otherwise show a blank picker over an empty table with no way to tell
   * "nothing billed" from "nothing selected".
   *
   * Consumed once and cleared from the URL, so a refresh does not keep forcing
   * the filter back on after it has been cleared by hand.
   */
  const hospitalParam = searchParams.get("hospital");
  const paramHospital = useGetResourceQuery(
    { resource: "hospitals", id: hospitalParam ?? "" },
    { skip: !hospitalParam },
  );
  const handledParam = useRef<string | null>(null);

  useEffect(() => {
    if (!hospitalParam || handledParam.current === hospitalParam) return;
    if (paramHospital.isLoading) return;

    handledParam.current = hospitalParam;

    if (paramHospital.data?.data) {
      setHospitalFilter(hospitalParam);
    } else {
      // Deleted between the two screens, or the request failed. Filtering by an
      // id with no name behind it would empty the table and explain nothing.
      toast.error("Could not load that hospital", { description: "Showing every invoice instead." });
    }

    router.replace(pathname, { scroll: false });
  }, [hospitalParam, paramHospital.isLoading, paramHospital.data, router, pathname]);

  const linkedHospital = paramHospital.data?.data as { id: string; name: string } | undefined;

  /**
   * Drawn from the invoices themselves rather than from /hospitals: the only
   * hospitals worth offering here are the ones with a bill to look at, and a
   * list of every hospital in Bangladesh would be a picker where almost every
   * choice shows nothing. The one arrived at by link is added even when it has
   * no invoices, so the filter can name what it is filtering by.
   */
  const hospitalOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const invoice of invoices) {
      if (invoice.tenants) seen.set(invoice.tenants.id, invoice.tenants.name);
    }
    if (linkedHospital) seen.set(linkedHospital.id, linkedHospital.name);
    return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices, linkedHospital]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (statusFilter === "overdue" && !isOverdue(invoice)) return false;
      if (statusFilter !== "all" && statusFilter !== "overdue" && invoice.status !== statusFilter) return false;
      if (hospitalFilter !== "all" && invoice.tenant_id !== hospitalFilter) return false;

      // billing_month is the first of the month, so comparing its YYYY-MM
      // against the pickers keeps both ends inclusive without date arithmetic.
      const month = invoice.billing_month.slice(0, 7);
      if (fromMonth && month < fromMonth) return false;
      if (toMonth && month > toMonth) return false;

      if (!needle) return true;
      return (
        (invoice.tenants?.name ?? "").toLowerCase().includes(needle) ||
        invoiceNo(invoice).toLowerCase().includes(needle)
      );
    });
  }, [invoices, search, statusFilter, hospitalFilter, fromMonth, toMonth]);

  const hasFilter =
    search !== "" || statusFilter !== "all" || hospitalFilter !== "all" || fromMonth !== "" || toMonth !== "";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setHospitalFilter("all");
    setFromMonth("");
    setToMonth("");
  };

  /**
   * Totals describe every invoice, not the filtered view — a tile that moved
   * when you typed in the search box would be measuring the search. Void
   * invoices count towards nothing: that is what voiding one means.
   */
  const kpis = useMemo(() => {
    const live = invoices.filter((invoice) => invoice.status !== "void");
    const sum = (rows: PlatformInvoiceRow[]) => rows.reduce((total, row) => total + Number(row.total ?? 0), 0);
    return {
      billed: sum(live),
      collected: sum(live.filter((invoice) => invoice.status === "paid")),
      outstanding: sum(live.filter((invoice) => invoice.status === "pending")),
      overdue: sum(live.filter(isOverdue)),
    };
  }, [invoices]);

  const generate = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/v1/super/billing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const body = await response.json();

      if (!response.ok) {
        toast.error("Could not generate invoices", {
          description: body?.error?.message ?? "Please try again.",
        });
        return;
      }

      const result = body.data as GenerateResult;
      setReport(result);
      refetch();

      const created = result.summary.created ?? 0;
      const skipped = result.rows.length - created;
      toast.success(
        created === 0
          ? "Nothing to invoice"
          : `${created} invoice${created === 1 ? "" : "s"} raised — ${money(result.billed)}`,
        { description: skipped > 0 ? `${skipped} hospital${skipped === 1 ? "" : "s"} skipped. See the run below.` : undefined },
      );
    } catch {
      toast.error("Could not generate invoices", { description: "The request failed. Please try again." });
    } finally {
      setGenerating(false);
    }
  };

  const setStatus = async (invoice: PlatformInvoiceRow, status: Status) => {
    setBusyId(invoice.id);
    try {
      await updateInvoice(invoice.id, { status }).unwrap();
      toast.success(status === "paid" ? "Marked paid" : status === "void" ? "Invoice voided" : "Reopened");
      if (viewing?.id === invoice.id) setViewing({ ...viewing, status });
    } catch (cause) {
      const message =
        (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? "Please try again.";
      toast.error("Could not update the invoice", { description: message });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (invoice: PlatformInvoiceRow) => {
    setBusyId(invoice.id);
    try {
      await removeInvoice(invoice.id).unwrap();
      toast.success("Invoice deleted");
    } catch {
      toast.error("Could not delete the invoice", { description: "Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SuperLayout title="Billing" subtitle="Monthly usage invoices, per hospital">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Receipt} label="Billed" value={money(kpis.billed)} />
        <Kpi icon={Wallet} label="Collected" value={money(kpis.collected)} tone="accent" />
        <Kpi icon={TrendingUp} label="Outstanding" value={money(kpis.outstanding)} tone="chip" />
        <Kpi icon={AlertCircle} label="Overdue" value={money(kpis.overdue)} tone="destructive" />
      </div>

      {/* ------------------------------------------------------ the run --- */}
      <Card className="p-5 mt-6">
        <SectionTitle title="Generate monthly invoices" />
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="billing-month" className="block text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5">
              MONTH
            </label>
            <input
              id="billing-month"
              type="month"
              value={month}
              max={thisMonth()}
              onChange={(e) => setMonth(e.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
          <Btn onClick={() => void generate()} disabled={generating || !month}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {generating ? "Counting…" : "Generate invoices"}
          </Btn>
          <p className="text-xs text-muted-foreground max-w-md">
            Bills each approved hospital on an active package for the prescriptions its doctors
            wrote that month, at the rate on its plan. Safe to run twice — a month already
            invoiced is reported, not billed again.
          </p>
        </div>

        {report && (
          <div className="mt-5 rounded-xl border border-border/60 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/30">
              <p className="text-sm font-semibold text-primary">
                {monthLabel(`${report.month}-01`)} — {report.summary.created ?? 0} raised, {money(report.billed)}
              </p>
              <button
                onClick={() => setReport(null)}
                className="p-1.5 rounded-lg hover:bg-muted"
                aria-label="Dismiss the run report"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="divide-y divide-border/40">
              {report.rows.map((row) => (
                <li key={row.tenant_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-sm truncate">{row.hospital}</span>
                  <span className="flex items-center gap-3 shrink-0">
                    {row.prescriptions !== null && (
                      <span className="text-xs text-muted-foreground">{row.prescriptions} Rx</span>
                    )}
                    {row.total !== null && (
                      <span className="text-sm font-semibold text-primary">{money(Number(row.total))}</span>
                    )}
                    <Pill tone={OUTCOME_TONE[row.outcome]}>{OUTCOME_LABELS[row.outcome]}</Pill>
                  </span>
                </li>
              ))}
              {report.rows.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No hospital is on a package yet, so there is nothing to bill.
                </li>
              )}
            </ul>
          </div>
        )}
      </Card>

      {/* ----------------------------------------------------- invoices --- */}
      <Card className="p-5 mt-6">
        <SectionTitle
          title="Invoices"
          action={
            <p className="text-xs text-muted-foreground">
              {hasFilter
                ? `${visible.length} of ${invoices.length} shown`
                : `${invoices.length} total`}
            </p>
          }
        />

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hospital or invoice no."
              aria-label="Search invoices"
              className="h-9 w-56 pl-9 pr-3 rounded-lg border border-border bg-background text-sm"
            />
          </div>

          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            aria-label="Filter by hospital"
            className="h-9 max-w-[240px] rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">All hospitals</option>
            {hospitalOptions.map((hospital) => (
              <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
            ))}
          </select>

          {/* Billing month, not issue date: the period is what an invoice is
              about, and it is the date anyone reconciling one has in mind. */}
          <div className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-border bg-background px-3">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="month"
              value={fromMonth}
              max={toMonth || undefined}
              onChange={(e) => setFromMonth(e.target.value)}
              aria-label="From month"
              className="bg-transparent text-sm outline-none"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <input
              type="month"
              value={toMonth}
              min={fromMonth || undefined}
              onChange={(e) => setToMonth(e.target.value)}
              aria-label="To month"
              className="bg-transparent text-sm outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            aria-label="Filter by status"
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>

          {hasFilter && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-xl bg-destructive/10 text-destructive p-4">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">Could not load invoices. Refresh to try again.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl bg-muted/40 p-10 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {invoices.length === 0
                ? "No invoices yet. Pick a month above and generate the first run."
                : "No invoices match those filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="text-left text-[10px] tracking-widest text-muted-foreground bg-muted/30">
                <tr>
                  <th className="px-4 py-2.5">INVOICE</th>
                  <th>HOSPITAL</th>
                  <th>MONTH</th>
                  <th className="text-right">RX</th>
                  <th className="text-right">RATE</th>
                  <th className="text-right">TOTAL</th>
                  <th>DUE</th>
                  <th>STATUS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => setViewing(invoice)}
                    className="border-t border-border/40 cursor-pointer hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{invoiceNo(invoice)}</td>
                    <td className="font-semibold">{invoice.tenants?.name ?? "Unknown hospital"}</td>
                    <td>{monthLabel(invoice.billing_month)}</td>
                    <td className="text-right tabular-nums">{invoice.prescriptions}</td>
                    <td className="text-right tabular-nums">{money(Number(invoice.unit_price))}</td>
                    <td className="text-right tabular-nums font-semibold text-primary">
                      {money(Number(invoice.total ?? 0))}
                    </td>
                    <td className={isOverdue(invoice) ? "text-destructive font-semibold" : undefined}>
                      {dayLabel(invoice.due_date)}
                    </td>
                    <td>{statusPill(invoice)}</td>
                    <td className="pr-4">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {invoice.status !== "paid" && invoice.status !== "void" && (
                          <button
                            onClick={() => void setStatus(invoice, "paid")}
                            disabled={busyId === invoice.id}
                            title="Mark paid"
                            aria-label={`Mark ${invoiceNo(invoice)} paid`}
                            className="p-1.5 rounded-lg hover:bg-muted text-emerald-600 disabled:opacity-40"
                          >
                            {busyId === invoice.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <CheckCircle2 className="h-4 w-4" />}
                          </button>
                        )}
                        {invoice.status !== "pending" && (
                          <button
                            onClick={() => void setStatus(invoice, "pending")}
                            disabled={busyId === invoice.id}
                            title="Reopen as pending"
                            aria-label={`Reopen ${invoiceNo(invoice)}`}
                            className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 disabled:opacity-40"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        {invoice.status !== "void" && (
                          <button
                            onClick={() => void setStatus(invoice, "void")}
                            disabled={busyId === invoice.id}
                            title="Void — raised in error"
                            aria-label={`Void ${invoiceNo(invoice)}`}
                            className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 disabled:opacity-40"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setPendingDelete(invoice)}
                          disabled={busyId === invoice.id}
                          title="Delete"
                          aria-label={`Delete ${invoiceNo(invoice)}`}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <InvoiceDocument invoice={viewing} onClose={() => setViewing(null)} />

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && void remove(pendingDelete)}
        title="Delete this invoice?"
        description={
          pendingDelete
            ? `${invoiceNo(pendingDelete)} for ${pendingDelete.tenants?.name ?? "this hospital"} would be gone for good, and the month would be free to bill again. If it was raised in error, void it instead — a cancelled invoice number is easier to explain than a missing one.`
            : undefined
        }
      />
    </SuperLayout>
  );
};

/* ------------------------------------------------------- the document --- */

const Row = ({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) => (
  <div className={`flex items-center justify-between gap-6 py-1.5 ${strong ? "text-base font-bold text-primary" : "text-sm"}`}>
    <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

/**
 * The invoice as a document rather than a form: something a hospital could be
 * sent as-is. Printing it prints this element and nothing else — the rule
 * lives in globals.css next to the prescription's, and it works by printing
 * the page you are already looking at, so the preview and the paper cannot
 * disagree.
 */
const InvoiceDocument = ({
  invoice,
  onClose,
}: {
  invoice: PlatformInvoiceRow | null;
  onClose: () => void;
}) => {
  if (!invoice) return null;

  const gross = Number(invoice.prescriptions) * Number(invoice.unit_price);
  const discount = gross - Number(invoice.total ?? 0);
  const overdue = isOverdue(invoice);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Invoice ${invoiceNo(invoice)}`}
      size="lg"
      footer={
        <>
          <Btn variant="outline" onClick={onClose}>Close</Btn>
          <Btn onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Btn>
        </>
      }
    >
      <div id="invoice-print-area" className="bg-card text-foreground">
        {/* Letterhead */}
        <div className="flex items-start justify-between gap-6 pb-5 border-b border-border/60">
          <div>
            <p className="font-display text-2xl text-primary leading-tight">HealthFlow</p>
            <p className="text-xs text-muted-foreground mt-1">
              Hospital management platform<br />Dhaka, Bangladesh
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground">INVOICE</p>
            <p className="font-mono text-sm font-bold text-primary">{invoiceNo(invoice)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Issued {dayLabel(invoice.issued_on)}<br />
              Due <span className={overdue ? "text-destructive font-semibold" : ""}>{dayLabel(invoice.due_date)}</span>
            </p>
          </div>
        </div>

        {/* Parties and period */}
        <div className="grid sm:grid-cols-2 gap-6 py-5">
          <div>
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5">BILLED TO</p>
            <p className="font-semibold text-primary">{invoice.tenants?.name ?? "Unknown hospital"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{invoice.package_name} plan</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5">BILLING PERIOD</p>
            <p className="font-semibold">{monthLabel(invoice.billing_month)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {invoice.status === "paid" && invoice.paid_at
                ? `Paid ${dayLabel(invoice.paid_at.slice(0, 10))}`
                : invoice.status === "void"
                  ? "Voided — not payable"
                  : overdue
                    ? "Overdue"
                    : "Payable on the due date"}
            </p>
          </div>
        </div>

        {/* Line items */}
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] tracking-widest text-muted-foreground border-y border-border/60">
            <tr>
              <th className="py-2">DESCRIPTION</th>
              <th className="py-2 text-right">QTY</th>
              <th className="py-2 text-right">RATE</th>
              <th className="py-2 text-right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/40">
              <td className="py-3">
                <p className="font-semibold">Prescriptions written</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Completed consultations carrying at least one medicine, {monthLabel(invoice.billing_month)}
                </p>
              </td>
              <td className="py-3 text-right tabular-nums align-top">{invoice.prescriptions}</td>
              <td className="py-3 text-right tabular-nums align-top">{money(Number(invoice.unit_price))}</td>
              <td className="py-3 text-right tabular-nums align-top">{money(gross)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end pt-4">
          <div className="w-full sm:w-72">
            <Row label="Subtotal" value={money(gross)} />
            {Number(invoice.discount_pct) > 0 && (
              <Row label={`Discount (${Number(invoice.discount_pct)}%)`} value={`−${money(discount)}`} />
            )}
            <div className="border-t border-border/60 mt-1.5 pt-1.5">
              <Row label="Total due" value={money(Number(invoice.total ?? 0))} strong />
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-5 pt-4 border-t border-border/40">
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1">NOTES</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        <p className="mt-6 pt-4 border-t border-border/40 text-[11px] text-muted-foreground">
          Charged on usage: prescriptions written x the rate on the {invoice.package_name} plan
          {Number(invoice.discount_pct) > 0 ? `, less the ${Number(invoice.discount_pct)}% agreed discount` : ""}.
          Questions about this invoice go to the support desk on /super/tickets.
        </p>
      </div>
    </Modal>
  );
};

export default Billing;
