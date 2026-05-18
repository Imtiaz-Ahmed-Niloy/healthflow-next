// Payroll engine — pulls employees from onboarding store, computes salary
// breakdown, and produces payslips. Pure functions + localStorage persistence.
import { load, save, uid } from "./storage";

export type Employee = {
  id: string;
  empId: string;
  name: string;
  department?: string;
  designation?: string;
  email?: string;
  phone?: string;
  bloodGroup?: string;
  employmentType?: string;
  jobStatus?: string;
  grossSalary?: string | number;
  startDate?: string;
  endDate?: string;
};

export type Payslip = {
  id: string;
  runId: string;
  period: string;            // e.g. "2026-06"
  empId: string;
  name: string;
  department?: string;
  designation?: string;
  basic: number;
  houseRent: number;
  medical: number;
  transport: number;
  gross: number;
  pf: number;
  tax: number;
  loan: number;
  totalDeductions: number;
  net: number;
  generatedAt: string;
  status: "Generated" | "Sent" | "Paid";
};

const ONBOARDING_KEY = "hr-onboarding-v2";

/** Load active employees eligible for payroll. */
export const getEligibleEmployees = (): Employee[] => {
  const all = load<Employee[]>(ONBOARDING_KEY, []);
  return all.filter(e => {
    const status = (e.jobStatus || "").toLowerCase();
    return status !== "terminated" && status !== "resigned";
  });
};

export type PayrollSettings = {
  basicPct: number;      // % of gross
  houseRentPct: number;  // % of gross
  medicalPct: number;    // % of gross
  conveyancePct: number; // % of gross
  pfPct: number;         // % of basic
  taxPct: number;        // % of gross when above taxThreshold
  taxThreshold: number;
};

const SETTINGS_KEY = "payroll-settings-v1";
export const defaultSettings: PayrollSettings = {
  basicPct: 50, houseRentPct: 30, medicalPct: 10, conveyancePct: 10,
  pfPct: 8, taxPct: 5, taxThreshold: 25000,
};
export const getSettings = (): PayrollSettings => ({ ...defaultSettings, ...load<Partial<PayrollSettings>>(SETTINGS_KEY, {}) });
export const saveSettings = (s: PayrollSettings) => save(SETTINGS_KEY, s);

/** Standard breakdown from a gross figure using saved settings. */
export const breakdown = (gross: number) => {
  const s = getSettings();
  const basic = Math.round(gross * (s.basicPct / 100));
  const houseRent = Math.round(gross * (s.houseRentPct / 100));
  const medical = Math.round(gross * (s.medicalPct / 100));
  // Conveyance absorbs rounding remainder so totals match gross
  const transport = gross - basic - houseRent - medical;
  const pf = Math.round(basic * (s.pfPct / 100));
  const tax = gross > s.taxThreshold ? Math.round(gross * (s.taxPct / 100)) : 0;
  return { basic, houseRent, medical, transport, pf, tax };
};

/** Compute one payslip for a single employee in a given period. */
export const computePayslip = (
  emp: Employee,
  period: string,
  runId: string,
  loan = 0,
): Payslip => {
  const gross = Number(emp.grossSalary || 0);
  const b = breakdown(gross);
  const totalDeductions = b.pf + b.tax + loan;
  const net = gross - totalDeductions;
  return {
    id: uid(),
    runId,
    period,
    empId: emp.empId,
    name: emp.name,
    department: emp.department,
    designation: emp.designation,
    basic: b.basic,
    houseRent: b.houseRent,
    medical: b.medical,
    transport: b.transport,
    gross,
    pf: b.pf,
    tax: b.tax,
    loan,
    totalDeductions,
    net,
    generatedAt: new Date().toISOString(),
    status: "Generated",
  };
};

export type ProcessResult = {
  runId: string;
  period: string;
  employees: number;
  gross: number;
  net: number;
  payslips: Payslip[];
};

/** List of unique departments from onboarded employees. */
export const getDepartments = (): string[] =>
  Array.from(new Set(getEligibleEmployees().map(e => e.department).filter(Boolean) as string[])).sort();

/** Full payroll processing for a period — returns + persists payslips.
 *  Pass a department to limit processing to that department only. */
export const processPayroll = (period: string, runId: string, department?: string): ProcessResult => {
  let eligible = getEligibleEmployees();
  if (department && department !== "All") eligible = eligible.filter(e => e.department === department);
  const payslips = eligible.map(e => computePayslip(e, period, runId));
  const gross = payslips.reduce((s, p) => s + p.gross, 0);
  const net = payslips.reduce((s, p) => s + p.net, 0);
  save(`payslips:${runId}`, payslips);
  return { runId, period, employees: eligible.length, gross, net, payslips };
};

export const getPayslips = (runId: string): Payslip[] =>
  load<Payslip[]>(`payslips:${runId}`, []);

export const updatePayslipStatus = (runId: string, status: Payslip["status"]) => {
  const slips = getPayslips(runId).map(p => ({ ...p, status }));
  save(`payslips:${runId}`, slips);
  return slips;
};

/** Render a printable HTML payslip and trigger the browser print dialog. */
export const printPayslip = (slip: Payslip, company = "Hospital Group") => {
  const w = window.open("", "_blank", "width=820,height=1000");
  if (!w) return;
  const fmt = (n: number) => `৳${n.toLocaleString()}`;
  w.document.write(`<!doctype html><html><head><title>Payslip ${slip.empId} ${slip.period}</title>
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
    <div><b>Employee ID</b>${slip.empId}</div>
    <div><b>Department</b>${slip.department || "—"}</div>
    <div><b>Designation</b>${slip.designation || "—"}</div>
    <div><b>Run</b>${slip.runId}</div>
    <div><b>Generated</b>${new Date(slip.generatedAt).toLocaleString()}</div>
  </div>
  <div class="grid">
    <div>
      <h3>Earnings</h3>
      <table>
        <tr><td>Basic</td><td class="r">${fmt(slip.basic)}</td></tr>
        <tr><td>House Rent</td><td class="r">${fmt(slip.houseRent)}</td></tr>
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
        <tr><th>Total</th><th class="r">${fmt(slip.totalDeductions)}</th></tr>
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

/** Bulk export all payslips for a run as CSV. */
export const exportPayslipsCSV = (runId: string) => {
  const slips = getPayslips(runId);
  if (!slips.length) return;
  const headers = ["empId","name","department","designation","basic","houseRent","medical","transport","gross","pf","tax","loan","net","status"];
  const rows = slips.map(s => headers.map(h => String((s as never)[h] ?? "")).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `payslips-${runId}.csv`; a.click();
  URL.revokeObjectURL(url);
};
