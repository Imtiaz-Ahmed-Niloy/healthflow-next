import type { Tables } from "@/lib/supabase/types";

/**
 * Invoice status and totals for /admin/finance.
 *
 * Pure functions, so the arithmetic that decides what a hospital thinks it is
 * owed can be tested rather than eyeballed.
 */

export type Invoice = Tables<"finance_invoices">;

export type InvoiceStatus = "paid" | "overdue" | "pending";

/**
 * Statuses are stored lowercase across every module — except this one, where
 * two of the three are not stored at all.
 *
 * The seed kept "Pending" / "Paid" / "Overdue" in a column as though all three
 * were things someone chooses. Only one is. An invoice becomes overdue because
 * a date passed, not because anybody acted, so a stored "Overdue" is stale the
 * moment it is written and a stored "Pending" is wrong the day after it is
 * due. Paid is the only real event, and that is what the table records.
 */
export const invoiceStatus = (invoice: Pick<Invoice, "paid_at" | "due_date">, today = new Date()): InvoiceStatus => {
  if (invoice.paid_at) return "paid";
  // Compared as calendar days: an invoice due today is not overdue until
  // tomorrow, whatever time it is now.
  const due = new Date(`${invoice.due_date}T00:00:00`);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return due < startOfToday ? "overdue" : "pending";
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  paid: "Paid",
  overdue: "Overdue",
  pending: "Pending",
};

export const invoiceStatusLabel = (status: InvoiceStatus) => INVOICE_STATUS_LABELS[status];

/** Postgres `numeric` arrives over the wire as a string. */
const amountOf = (invoice: Invoice) => Number(invoice.amount) || 0;

const sameMonth = (iso: string, reference: Date) => {
  const date = new Date(iso);
  return (
    date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth()
  );
};

export type FinanceTotals = {
  /** Owed to the hospital and not yet settled. */
  receivables: number;
  /** Owed by the hospital and not yet settled. */
  payables: number;
  /** Outstanding and past its due date, in either direction. */
  overdue: number;
  /** Receivables actually settled this calendar month. */
  revenueThisMonth: number;
};

/**
 * The four figures across the top of the page.
 *
 * `revenueThisMonth` replaces a KPI that read "$184K" — a hardcoded string
 * that never moved, on a card labelled "MTD Revenue".
 */
export const financeTotals = (invoices: Invoice[], today = new Date()): FinanceTotals => {
  const totals: FinanceTotals = { receivables: 0, payables: 0, overdue: 0, revenueThisMonth: 0 };

  for (const invoice of invoices) {
    const amount = amountOf(invoice);
    const status = invoiceStatus(invoice, today);

    if (status !== "paid") {
      if (invoice.kind === "receivable") totals.receivables += amount;
      else totals.payables += amount;
      if (status === "overdue") totals.overdue += amount;
    } else if (invoice.kind === "receivable" && invoice.paid_at && sameMonth(invoice.paid_at, today)) {
      totals.revenueThisMonth += amount;
    }
  }

  return totals;
};

/**
 * The reference the "New invoice" form suggests: INV-YYYYMM-NNN, numbered
 * within the month. Only a suggestion — the field is editable, and a genuine
 * collision is caught by the unique index rather than by this.
 */
export const suggestReference = (invoices: Invoice[], today = new Date()) => {
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `INV-${stamp}-`;
  const used = invoices
    .map(i => i.reference.trim().toUpperCase())
    .filter(reference => reference.startsWith(prefix))
    .map(reference => Number(reference.slice(prefix.length)))
    .filter(Number.isFinite);
  const next = used.length ? Math.max(...used) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
};
