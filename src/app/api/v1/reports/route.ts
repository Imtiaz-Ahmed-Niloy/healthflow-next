import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";

/**
 * GET /api/v1/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * The reports behind /admin/reports. Every one is counted from rows this
 * hospital owns, over a date range the caller picks — the page it replaces
 * offered four "presets" whose numbers were typed into the file (`Jan 184000`,
 * `CBC 412`, and so on) and a builder whose From and To did nothing.
 *
 * Six reports, chosen because the tables behind them are real:
 *
 *   receivables   finance_invoices, kind = receivable  (billed, collected, outstanding)
 *   payables      finance_invoices, kind = payable
 *   payroll       payroll_runs
 *   procurement   procurement_requisitions
 *   appointments  appointments, by status
 *   pharmacy      pharmacy_items — stock on hand, not sales: nothing records
 *                 a dispense yet, so a "sold" column would be invented
 *
 * Each comes back as { columns, rows, totals } so the page can render and
 * export any of them without knowing what it is looking at.
 */

const REPORT_ROLES: AppRole[] = ["hospital_admin", "finance_admin"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-08" from "2026-08-14". */
const monthOf = (iso: string) => iso.slice(0, 7);

type Money = number;
const money = (v: unknown): Money => Number(v ?? 0);

export const GET = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.tenantId || !auth.role || !REPORT_ROLES.includes(auth.role)) {
    return fail("Not allowed", 403);
  }

  const url = new URL(request.url);
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setMonth(defaultFrom.getMonth() - 5, 1);

  const fromParam = url.searchParams.get("from") ?? "";
  const toParam = url.searchParams.get("to") ?? "";
  const from = DATE.test(fromParam) ? fromParam : isoDate(defaultFrom);
  const to = DATE.test(toParam) ? toParam : isoDate(today);
  if (from > to) return fail("The start date is after the end date", 422);

  const supabase = await createServerSupabase();

  const [invoices, payrollRuns, requisitions, appointments, pharmacy] = await Promise.all([
    supabase
      .from("finance_invoices")
      .select("reference, party, kind, amount, due_date, paid_at")
      .gte("due_date", from)
      .lte("due_date", to)
      .limit(5000),
    supabase
      .from("payroll_runs")
      .select("period, reference, department, status, headcount, gross_total, net_total")
      .order("period", { ascending: false })
      .limit(60),
    supabase
      .from("procurement_requisitions")
      .select("reference, title, department, stage, amount, requested_at")
      .limit(2000),
    supabase
      .from("appointments")
      .select("scheduled_date, status, department")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to)
      .limit(5000),
    supabase.from("pharmacy_items").select("sku, name, category, stock, reorder").limit(2000),
  ]);

  const firstError =
    invoices.error || payrollRuns.error || requisitions.error || appointments.error || pharmacy.error;
  if (firstError) return fail(firstError.message, 500);

  // -- receivables and payables, by month -----------------------------------
  const byKind = (kind: "receivable" | "payable") => {
    const rows = (invoices.data ?? []).filter(i => i.kind === kind);
    const months = new Map<string, { billed: Money; collected: Money; outstanding: Money; count: number }>();
    rows.forEach(i => {
      const key = monthOf(i.due_date);
      const bucket = months.get(key) ?? { billed: 0, collected: 0, outstanding: 0, count: 0 };
      bucket.billed += money(i.amount);
      if (i.paid_at) bucket.collected += money(i.amount);
      else bucket.outstanding += money(i.amount);
      bucket.count += 1;
      months.set(key, bucket);
    });
    const list = Array.from(months, ([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month));
    return {
      columns: ["Month", "Invoices", "Billed", kind === "receivable" ? "Collected" : "Paid", "Outstanding"],
      rows: list.map(r => [r.month, String(r.count), r.billed, r.collected, r.outstanding]),
      totals: {
        billed: list.reduce((s, r) => s + r.billed, 0),
        collected: list.reduce((s, r) => s + r.collected, 0),
        outstanding: list.reduce((s, r) => s + r.outstanding, 0),
      },
    };
  };

  // -- appointments, by month and status ------------------------------------
  const appointmentMonths = new Map<string, { total: number; completed: number; cancelled: number; scheduled: number }>();
  (appointments.data ?? []).forEach(a => {
    const key = monthOf(a.scheduled_date);
    const bucket = appointmentMonths.get(key) ?? { total: 0, completed: 0, cancelled: 0, scheduled: 0 };
    bucket.total += 1;
    if (a.status === "completed") bucket.completed += 1;
    else if (a.status === "cancelled") bucket.cancelled += 1;
    else bucket.scheduled += 1;
    appointmentMonths.set(key, bucket);
  });
  const appointmentRows = Array.from(appointmentMonths, ([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const requisitionRows = (requisitions.data ?? []);
  const pharmacyRows = (pharmacy.data ?? []);

  return json({
    data: {
      range: { from, to },
      reports: {
        receivables: {
          title: "Receivables",
          note: "Invoices owed to the hospital, by the month they fall due.",
          ...byKind("receivable"),
        },
        payables: {
          title: "Payables",
          note: "Invoices the hospital owes, by the month they fall due.",
          ...byKind("payable"),
        },
        payroll: {
          title: "Payroll",
          note: "Every run, newest first. Gross is before deductions; net is what was paid.",
          columns: ["Period", "Reference", "Department", "Status", "Staff", "Gross", "Net"],
          rows: (payrollRuns.data ?? []).map(r => [
            r.period, r.reference ?? "—", r.department ?? "All", r.status,
            String(r.headcount), money(r.gross_total), money(r.net_total),
          ]),
          totals: {
            gross: (payrollRuns.data ?? []).reduce((s, r) => s + money(r.gross_total), 0),
            net: (payrollRuns.data ?? []).reduce((s, r) => s + money(r.net_total), 0),
          },
        },
        procurement: {
          title: "Procurement",
          note: "Requisitions raised, with what each one is worth.",
          columns: ["Reference", "Title", "Department", "Status", "Amount"],
          rows: requisitionRows.map(r => [
            r.reference ?? "—", r.title, r.department ?? "—", r.stage, money(r.amount),
          ]),
          totals: { amount: requisitionRows.reduce((s, r) => s + money(r.amount), 0) },
        },
        appointments: {
          title: "Appointments",
          note: "Volume by month, split by what happened to the booking.",
          columns: ["Month", "Booked", "Completed", "Cancelled", "Still scheduled"],
          rows: appointmentRows.map(r => [
            r.month, String(r.total), String(r.completed), String(r.cancelled), String(r.scheduled),
          ]),
          totals: { booked: appointmentRows.reduce((s, r) => s + r.total, 0) },
        },
        pharmacy: {
          title: "Pharmacy stock",
          note: "Stock on hand today. Dispensing is not recorded yet, so there is no sales column.",
          columns: ["SKU", "Item", "Category", "In stock", "Reorder at", "Below reorder"],
          rows: pharmacyRows.map(r => [
            r.sku, r.name, r.category ?? "—", String(r.stock), String(r.reorder),
            r.stock <= r.reorder ? "Yes" : "No",
          ]),
          totals: { items: pharmacyRows.length, low: pharmacyRows.filter(r => r.stock <= r.reorder).length },
        },
      },
    },
  });
};
