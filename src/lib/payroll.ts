// Payroll engine — computes salary breakdowns and payslip lines.
//
// Pure functions only, and no browser APIs at module scope, because the API
// route that processes a run imports this too. That is the point of the file:
// before HF-67 finished, payslips were computed in the browser from
// percentages kept in localStorage, so the same employee produced different
// numbers depending on whose machine pressed "Process". The amounts are money;
// they get computed in one place, from settings the whole hospital shares.
//
// Employees are PASSED IN, not loaded here — they are rows in public.employees
// (HF-68), which is an async fetch and cannot happen inside a pure function.
import type { Tables } from "@/lib/supabase/types";

/** The staff register row, exactly as the database returns it. */
export type Employee = Tables<"employees">;

/** A payslip as stored. */
export type PayslipRow = Tables<"payroll_payslips">;

/**
 * The columns a computed payslip fills in. The rest — id, tenant_id, run_id,
 * timestamps — belong to whoever writes the row.
 */
export type ComputedPayslip = {
  employee_id: string;
  emp_id: string;
  name: string;
  department: string | null;
  designation: string | null;
  period: string;
  basic: number;
  house_rent: number;
  medical: number;
  transport: number;
  gross: number;
  pf: number;
  tax: number;
  loan: number;
  total_deductions: number;
  net: number;
};

/**
 * The percentages every amount is derived from, one set per hospital
 * (public.payroll_settings).
 */
export type PayrollSettings = {
  basic_pct: number;      // % of gross
  house_rent_pct: number; // % of gross
  medical_pct: number;    // % of gross
  conveyance_pct: number; // % of gross
  pf_pct: number;         // % of basic
  tax_pct: number;        // % of gross, above the threshold
  tax_threshold: number;
};

/**
 * Used until a hospital saves its own row. Identical to the values the old
 * localStorage default carried, so nobody's numbers move on upgrade — and to
 * the column defaults in 0042, so a fresh row agrees with this.
 */
export const defaultSettings: PayrollSettings = {
  basic_pct: 50,
  house_rent_pct: 30,
  medical_pct: 10,
  conveyance_pct: 10,
  pf_pct: 8,
  tax_pct: 5,
  tax_threshold: 25000,
};

/**
 * Postgres `numeric` arrives over the wire as a string, so every settings
 * field is coerced before it is used in arithmetic. Skipping this turns
 * `gross * (basic_pct / 100)` into NaN and every payslip on the page into
 * "৳NaN".
 */
export const toSettings = (row: Partial<Record<keyof PayrollSettings, unknown>> | null | undefined): PayrollSettings => {
  const num = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    basic_pct: num(row?.basic_pct, defaultSettings.basic_pct),
    house_rent_pct: num(row?.house_rent_pct, defaultSettings.house_rent_pct),
    medical_pct: num(row?.medical_pct, defaultSettings.medical_pct),
    conveyance_pct: num(row?.conveyance_pct, defaultSettings.conveyance_pct),
    pf_pct: num(row?.pf_pct, defaultSettings.pf_pct),
    tax_pct: num(row?.tax_pct, defaultSettings.tax_pct),
    tax_threshold: num(row?.tax_threshold, defaultSettings.tax_threshold),
  };
};

/**
 * Who is on the payroll: everyone except those who have left.
 *
 * The database constrains job_status to a known set, so this is a plain
 * comparison rather than the defensive lowercasing localStorage needed.
 */
export const getEligibleEmployees = (all: Employee[]): Employee[] =>
  all.filter(e => e.job_status !== "terminated" && e.job_status !== "resigned");

/** Unique departments across the active staff. */
export const getDepartments = (all: Employee[]): string[] =>
  Array.from(new Set(getEligibleEmployees(all).map(e => e.department).filter(Boolean) as string[])).sort();

/** Standard breakdown from a gross figure. */
export const breakdown = (gross: number, settings: PayrollSettings) => {
  const basic = Math.round(gross * (settings.basic_pct / 100));
  const houseRent = Math.round(gross * (settings.house_rent_pct / 100));
  const medical = Math.round(gross * (settings.medical_pct / 100));
  // Conveyance absorbs the rounding remainder so the four always sum to gross.
  const transport = gross - basic - houseRent - medical;
  const pf = Math.round(basic * (settings.pf_pct / 100));
  const tax = gross > settings.tax_threshold ? Math.round(gross * (settings.tax_pct / 100)) : 0;
  return { basic, houseRent, medical, transport, pf, tax };
};

/** Compute one payslip for a single employee in a given period. */
export const computePayslip = (
  emp: Employee,
  period: string,
  settings: PayrollSettings,
  loan = 0,
): ComputedPayslip => {
  const gross = Number(emp.gross_salary || 0);
  const b = breakdown(gross, settings);
  const totalDeductions = b.pf + b.tax + loan;
  return {
    employee_id: emp.id,
    emp_id: emp.emp_id,
    name: emp.name,
    department: emp.department,
    designation: emp.designation,
    period,
    basic: b.basic,
    house_rent: b.houseRent,
    medical: b.medical,
    transport: b.transport,
    gross,
    pf: b.pf,
    tax: b.tax,
    loan,
    total_deductions: totalDeductions,
    net: gross - totalDeductions,
  };
};

/**
 * Every payslip for a run, in one pass.
 *
 * `department` limits the run to one team; anything falsy, or "All", means the
 * whole hospital. Returns the lines and their totals — writing them is the
 * caller's job, because only the server may do it.
 */
export const computeRunPayslips = (
  period: string,
  employees: Employee[],
  settings: PayrollSettings,
  department?: string | null,
) => {
  let eligible = getEligibleEmployees(employees);
  if (department && department !== "All") {
    eligible = eligible.filter(e => e.department === department);
  }
  const payslips = eligible.map(e => computePayslip(e, period, settings));
  return {
    payslips,
    headcount: payslips.length,
    gross: payslips.reduce((sum, p) => sum + p.gross, 0),
    net: payslips.reduce((sum, p) => sum + p.net, 0),
  };
};

/** What the payslip UI needs from a row, whether it is stored or computed. */
type PrintablePayslip = Pick<
  ComputedPayslip,
  "emp_id" | "name" | "department" | "designation" | "period" | "basic" | "house_rent"
  | "medical" | "transport" | "gross" | "pf" | "tax" | "loan" | "total_deductions" | "net"
>;

/** Render a printable HTML payslip and trigger the browser print dialog. */
export const printPayslip = (
  slip: PrintablePayslip,
  runLabel: string,
  company = "Hospital Group",
) => {
  const w = window.open("", "_blank", "width=820,height=1000");
  if (!w) return;
  const fmt = (n: number) => `৳${Number(n).toLocaleString()}`;
  w.document.write(`<!doctype html><html><head><title>Payslip ${slip.emp_id} ${slip.period}</title>
<style>
  *{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto}
  body{margin:0;padding:32px;color:#0f172a;background:#fff}
  .wrap{max-width:760px;margin:0 auto;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}
  header{padding:20px 28px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center}
  header h1{margin:0;font-size:20px;letter-spacing:.5px}
  header span{font-size:11px;opacity:.8;letter-spacing:2px;text-transform:uppercase}
  .meta{padding:18px 28px;display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:13px;border-bottom:1px solid #e2e8f0}
  .meta b{color:#64748b;font-weight:500;font-size:11px;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:2px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{padding:10px 16px;text-align:left;border-bottom:1px solid #f1f5f9}
  th{background:#f8fafc;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#64748b}
  td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}
  .grid{display:grid;grid-template-columns:1fr 1fr}
  .grid > div{padding:0}
  .grid h3{margin:0;padding:12px 28px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#64748b;background:#f8fafc;border-bottom:1px solid #e2e8f0;border-top:1px solid #e2e8f0}
  .total{display:flex;justify-content:space-between;padding:18px 28px;background:#0f172a;color:#fff;font-weight:700;font-size:18px}
  footer{padding:14px 28px;font-size:11px;color:#94a3b8;text-align:center}
  @media print {body{padding:0}.wrap{border:0}}
</style></head><body>
<div class="wrap">
  <header><h1>${company}</h1><span>Payslip · ${slip.period}</span></header>
  <div class="meta">
    <div><b>Employee</b>${slip.name}</div>
    <div><b>Employee ID</b>${slip.emp_id}</div>
    <div><b>Department</b>${slip.department || "—"}</div>
    <div><b>Designation</b>${slip.designation || "—"}</div>
    <div><b>Run</b>${runLabel}</div>
    <div><b>Generated</b>${new Date().toLocaleString()}</div>
  </div>
  <div class="grid">
    <div>
      <h3>Earnings</h3>
      <table>
        <tr><td>Basic</td><td class="r">${fmt(slip.basic)}</td></tr>
        <tr><td>House Rent</td><td class="r">${fmt(slip.house_rent)}</td></tr>
        <tr><td>Medical</td><td class="r">${fmt(slip.medical)}</td></tr>
        <tr><td>Transport</td><td class="r">${fmt(slip.transport)}</td></tr>
        <tr><th>Gross</th><th class="r">${fmt(slip.gross)}</th></tr>
      </table>
    </div>
    <div>
      <h3>Deductions</h3>
      <table>
        <tr><td>Provident Fund</td><td class="r">${fmt(slip.pf)}</td></tr>
        <tr><td>Income Tax</td><td class="r">${fmt(slip.tax)}</td></tr>
        <tr><td>Loan / Advance</td><td class="r">${fmt(slip.loan)}</td></tr>
        <tr><th>Total</th><th class="r">${fmt(slip.total_deductions)}</th></tr>
      </table>
    </div>
  </div>
  <div class="total"><span>Net Payable</span><span>${fmt(slip.net)}</span></div>
  <footer>Computer-generated payslip · ${new Date().getFullYear()} ${company}</footer>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),200)</script>
</body></html>`);
  w.document.close();
};

/** Bulk export a run's payslips as CSV. */
export const exportPayslipsCSV = (slips: PrintablePayslip[], runLabel: string) => {
  if (!slips.length) return;
  const headers: (keyof PrintablePayslip)[] = [
    "emp_id", "name", "department", "designation", "basic", "house_rent", "medical",
    "transport", "gross", "pf", "tax", "loan", "total_deductions", "net",
  ];
  const cell = (value: unknown) => {
    const text = String(value ?? "");
    // Names and departments can carry a comma; without quoting, one of them
    // shifts every later column of that row by one.
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows = slips.map(s => headers.map(h => cell(s[h])).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payslips-${runLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
