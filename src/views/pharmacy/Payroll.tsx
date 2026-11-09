"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, Edit, HandCoins, Loader2, Plus, Printer, Trash2, Undo2, UserPlus, Users, WandSparkles, X,
} from "lucide-react";
import { toast } from "sonner";
import { useFormatters } from "@/lib/appSettings";
import {
  netOf, PAYROLL_METHODS, PAYSLIP_AMOUNTS, periodOf, shiftMonth, thisMonth,
  type PayrollMethod, type PayrollTotals, type PayslipAmounts, type PharmacyEmployee, type PharmacyPayslip,
} from "@/lib/staffPayroll";

/**
 * /pharmacy/payroll — everyone the pharmacy pays, and each month's payslips
 * (0152). Unlike most of this panel it reads and writes the real database:
 * /api/v1/pharmacy/payroll for the month, /api/v1/pharmacy-employees and
 * /api/v1/pharmacy-payslips for single rows. Paying a slip books it as a
 * "Salary" expense. Only a login that may administer the pharmacy gets data;
 * anyone else sees the refusal.
 */

const METHOD_LABEL: Record<PayrollMethod, string> = {
  cash: "Cash", bkash: "bKash", nagad: "Nagad", rocket: "Rocket", bank: "Bank transfer", other: "Other",
};

const AMOUNT_LABEL: Record<keyof PayslipAmounts, string> = {
  basic: "Basic salary", allowance: "Allowance", bonus: "Bonus", deduction: "Deduction", advance: "Advance taken",
};

const EMPTY_TOTALS: PayrollTotals = { count: 0, gross: 0, net: 0, paid: 0, unpaid: 0 };

type EmployeeDraft = {
  name: string; phone: string; designation: string; monthly_salary: string; joined_on: string;
  status: "active" | "inactive"; notes: string;
};

const emptyEmployee = (): EmployeeDraft => ({
  name: "", phone: "", designation: "", monthly_salary: "", joined_on: "", status: "active", notes: "",
});

type SlipDraft = PayslipAmounts & { notes: string; employee_id: string };

const today = () => new Date().toISOString().slice(0, 10);

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const request = async (url: string, method = "GET", body?: unknown) => {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? `Something went wrong (${res.status})`);
  return json;
};

const inputCls = "w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";
const labelCls = "block text-xs font-semibold text-gray-700 mb-1";

const Dialog = ({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-5">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
      <div className="flex justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100">{footer}</div>
    </div>
  </div>
);

const primaryBtn = "inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 cursor-pointer";
const outlineBtn = "inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50";

const PharmacyPayrollPage = () => {
  const { formatCurrency, formatDate } = useFormatters();
  const [tab, setTab] = useState<"payslips" | "employees">("payslips");
  const [month, setMonth] = useState(thisMonth);
  const [slips, setSlips] = useState<PharmacyPayslip[]>([]);
  const [employees, setEmployees] = useState<PharmacyEmployee[]>([]);
  const [totals, setTotals] = useState<PayrollTotals>(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [employeeEdit, setEmployeeEdit] = useState<PharmacyEmployee | "new" | null>(null);
  const [employeeDraft, setEmployeeDraft] = useState<EmployeeDraft>(emptyEmployee);
  const [slipEdit, setSlipEdit] = useState<PharmacyPayslip | "new" | null>(null);
  const [slipDraft, setSlipDraft] = useState<SlipDraft | null>(null);
  const [paying, setPaying] = useState<PharmacyPayslip | null>(null);
  const [payMethod, setPayMethod] = useState<PayrollMethod>("cash");
  const [paidOn, setPaidOn] = useState(today);

  const monthLabel = useMemo(
    () => new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    [month],
  );

  const load = async (target = month) => {
    setLoading(true);
    try {
      const json = await request(`/api/v1/pharmacy/payroll?month=${target}`);
      setSlips(json.data ?? []);
      setEmployees(json.employees ?? []);
      setTotals(json.totals ?? EMPTY_TOTALS);
      setDenied(null);
    } catch (error) {
      setDenied((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(month); }, [month]);

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      await load();
      return true;
    } catch (error) {
      toast.error((error as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const active = employees.filter(e => e.status === "active");
  const missing = active.filter(e => !slips.some(s => s.employee_id === e.id));

  const generate = () =>
    run("generate", async () => {
      const json = await request("/api/v1/pharmacy/payroll", "POST", { action: "generate", month });
      if (!json?.data?.created) throw new Error("Everyone already has a payslip for this month.");
    }, "Payslips made for " + monthLabel);

  const openEmployee = (employee: PharmacyEmployee | "new") => {
    setEmployeeDraft(employee === "new" ? emptyEmployee() : {
      name: employee.name,
      phone: employee.phone ?? "",
      designation: employee.designation ?? "",
      monthly_salary: employee.monthly_salary ? String(employee.monthly_salary) : "",
      joined_on: employee.joined_on ?? "",
      status: employee.status,
      notes: employee.notes ?? "",
    });
    setEmployeeEdit(employee);
  };

  const saveEmployee = async () => {
    if (!employeeEdit) return;
    if (!employeeDraft.name.trim()) { toast.error("Enter their name"); return; }
    const body = { ...employeeDraft, monthly_salary: Number(employeeDraft.monthly_salary || 0) };
    const ok = await run(
      "employee",
      () => employeeEdit === "new"
        ? request("/api/v1/pharmacy-employees", "POST", body)
        : request(`/api/v1/pharmacy-employees/${employeeEdit.id}`, "PATCH", body),
      employeeEdit === "new" ? `${employeeDraft.name.trim()} added to payroll` : "Saved",
    );
    if (ok) setEmployeeEdit(null);
  };

  const removeEmployee = (employee: PharmacyEmployee) => {
    if (!window.confirm(`Remove ${employee.name} from payroll? Their unpaid payslips go too. To keep their history, set them inactive instead.`)) return;
    void run(employee.id, () => request(`/api/v1/pharmacy-employees/${employee.id}`, "DELETE"), "Removed");
  };

  const openSlip = (slip: PharmacyPayslip | "new") => {
    if (slip === "new") {
      const first = missing[0];
      setSlipDraft({ employee_id: first?.id ?? "", basic: Number(first?.monthly_salary ?? 0), allowance: 0, bonus: 0, deduction: 0, advance: 0, notes: "" });
    } else {
      setSlipDraft({
        employee_id: slip.employee_id,
        basic: Number(slip.basic), allowance: Number(slip.allowance), bonus: Number(slip.bonus),
        deduction: Number(slip.deduction), advance: Number(slip.advance), notes: slip.notes ?? "",
      });
    }
    setSlipEdit(slip);
  };

  const saveSlip = async () => {
    if (!slipEdit || !slipDraft) return;
    const { employee_id, ...amounts } = slipDraft;
    if (slipEdit === "new") {
      const employee = employees.find(e => e.id === employee_id);
      if (!employee) { toast.error("Pick an employee"); return; }
      const ok = await run("slip", () => request("/api/v1/pharmacy-payslips", "POST", {
        employee_id, period: periodOf(month), employee_name: employee.name, designation: employee.designation, ...amounts,
      }), "Payslip added");
      if (ok) setSlipEdit(null);
      return;
    }
    const ok = await run("slip", () => request(`/api/v1/pharmacy-payslips/${slipEdit.id}`, "PATCH", amounts), "Payslip saved");
    if (ok) setSlipEdit(null);
  };

  const pay = async () => {
    if (!paying) return;
    const ok = await run(paying.id, () => request("/api/v1/pharmacy/payroll", "POST", {
      action: "pay", id: paying.id, payment_method: payMethod, paid_on: paidOn,
    }), `${paying.employee_name} paid · booked as a Salary expense`);
    if (ok) setPaying(null);
  };

  const unpay = (slip: PharmacyPayslip) => {
    if (!window.confirm(`Undo ${slip.employee_name}'s payment? The Salary expense it booked is removed too.`)) return;
    void run(slip.id, () => request("/api/v1/pharmacy/payroll", "POST", { action: "unpay", id: slip.id }), "Payment undone");
  };

  const removeSlip = (slip: PharmacyPayslip) => {
    if (!window.confirm(`Remove ${slip.employee_name}'s payslip for ${monthLabel}?`)) return;
    void run(slip.id, () => request(`/api/v1/pharmacy-payslips/${slip.id}`, "DELETE"), "Payslip removed");
  };

  const print = (slip: PharmacyPayslip) => {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    const row = (label: string, value: number) =>
      `<tr><td>${label}</td><td class="r">${escapeHtml(formatCurrency(Number(value)))}</td></tr>`;
    w.document.write(`<!doctype html><html><head><title>Payslip · ${escapeHtml(slip.employee_name)}</title>
<style>body{font-family:system-ui,sans-serif;padding:32px;color:#111}h1{margin:0 0 4px;font-size:22px}p{margin:2px 0;color:#555}
table{width:100%;border-collapse:collapse;margin-top:18px}td{padding:8px 0;border-bottom:1px solid #eee}.r{text-align:right}
h2{font-size:14px;margin:22px 0 0}.net td{font-weight:700;font-size:16px;border-top:2px solid #111}
.sign{margin-top:64px;border-top:1px solid #999;width:220px;padding-top:6px;color:#555}</style></head><body>
<h1>Payslip</h1><p>${escapeHtml(slip.employee_name)}${slip.designation ? ` · ${escapeHtml(slip.designation)}` : ""}</p>
<p>For ${escapeHtml(monthLabel)}</p>
<h2>Earnings</h2><table>${row("Basic salary", slip.basic)}${row("Allowance", slip.allowance)}${row("Bonus", slip.bonus)}</table>
<h2>Deductions</h2><table>${row("Deduction", slip.deduction)}${row("Advance taken", slip.advance)}
<tr class="net"><td>Net pay</td><td class="r">${escapeHtml(formatCurrency(Number(slip.net)))}</td></tr></table>
${slip.status === "paid" && slip.paid_on ? `<p style="margin-top:14px">Paid ${escapeHtml(formatDate(slip.paid_on))} by ${METHOD_LABEL[slip.payment_method ?? "cash"]}</p>` : ""}
${slip.notes ? `<p style="margin-top:8px">${escapeHtml(slip.notes)}</p>` : ""}
<div class="sign">Received by</div><script>window.onload=()=>{window.print()}</script></body></html>`);
    w.document.close();
  };

  const stat = (label: string, value: string, tone: string) => (
    <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );

  const slipLocked = slipEdit && slipEdit !== "new" && slipEdit.status === "paid";

  return (
    <div className="min-h-full pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payroll</h1>
          <p className="text-sm text-gray-500 mt-1">Monthly salaries for everyone the pharmacy pays. Paying a payslip books it as a Salary expense.</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 self-start sm:self-auto">
          <button type="button" onClick={() => setMonth(m => shiftMonth(m, -1))} className="p-1.5 rounded-md hover:bg-gray-100" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-32 text-center text-sm font-semibold text-gray-800">{monthLabel}</span>
          <button type="button" onClick={() => setMonth(m => shiftMonth(m, 1))} className="p-1.5 rounded-md hover:bg-gray-100" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {denied ? (
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-10 text-center">
          <HandCoins className="w-8 h-8 mx-auto text-gray-400" />
          <p className="mt-3 font-semibold text-gray-900">Payroll isn&apos;t available to this login</p>
          <p className="mt-1 text-sm text-gray-500">{denied}. Salaries are shown to logins that may administer the pharmacy.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {stat("Total payable", formatCurrency(totals.net), "text-gray-900")}
            {stat("Paid", formatCurrency(totals.paid), "text-emerald-700")}
            {stat("Still to pay", formatCurrency(totals.unpaid), "text-amber-600")}
            {stat("On payroll", `${active.length} active`, "text-gray-900")}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="inline-flex bg-gray-100 rounded-lg p-1">
              {(["payslips", "employees"] as const).map(key => (
                <button key={key} type="button" onClick={() => setTab(key)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-800"}`}>
                  {key === "payslips" ? `Payslips (${slips.length})` : `Employees (${employees.length})`}
                </button>
              ))}
            </div>
            {tab === "payslips" ? (
              <div className="flex gap-2">
                {missing.length > 0 && (
                  <button type="button" onClick={() => void generate()} disabled={busy === "generate"} className={primaryBtn}>
                    {busy === "generate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                    Make {monthLabel} payslips
                  </button>
                )}
                {missing.length > 0 && (
                  <button type="button" onClick={() => openSlip("new")} className={outlineBtn}><Plus className="w-4 h-4" /> Add one</button>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => openEmployee("new")} className={primaryBtn}><UserPlus className="w-4 h-4" /> Add employee</button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : tab === "payslips" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200/80 bg-gray-50/50 text-xs font-semibold text-gray-500">
                      <th className="px-6 py-3.5">Employee</th>
                      <th className="px-6 py-3.5 text-right">Basic</th>
                      <th className="px-6 py-3.5 text-right">Allowance + bonus</th>
                      <th className="px-6 py-3.5 text-right">Deductions</th>
                      <th className="px-6 py-3.5 text-right">Net pay</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {slips.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          {employees.length === 0
                            ? "Nobody is on payroll yet. Add your employees with a monthly salary first."
                            : `No payslips for ${monthLabel}. Make this month's payslips to start one for every active employee.`}
                        </td>
                      </tr>
                    ) : slips.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{s.employee_name}</div>
                          {s.designation && <div className="text-xs text-gray-400">{s.designation}</div>}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(Number(s.basic))}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(Number(s.allowance) + Number(s.bonus))}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-red-600">{formatCurrency(Number(s.deduction) + Number(s.advance))}</td>
                        <td className="px-6 py-4 text-right font-semibold tabular-nums">{formatCurrency(Number(s.net))}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.status === "paid" ? "bg-[#e6f4ea] text-[#137333] border-green-200/60" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                            {s.status === "paid" ? "Paid" : "Unpaid"}
                          </span>
                          {s.status === "paid" && s.paid_on && (
                            <div className="text-xs text-gray-400 mt-1">{formatDate(s.paid_on)} · {METHOD_LABEL[s.payment_method ?? "cash"]}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {s.status === "paid" ? (
                              <button type="button" onClick={() => unpay(s)} disabled={busy === s.id} title="Undo payment"
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg">
                                {busy === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                              </button>
                            ) : (
                              <button type="button" onClick={() => { setPaying(s); setPayMethod("cash"); setPaidOn(today()); }}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium">
                                Pay
                              </button>
                            )}
                            <button type="button" onClick={() => print(s)} title="Print payslip" className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg">
                              <Printer className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => openSlip(s)} title="Edit payslip" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Edit className="w-4 h-4" />
                            </button>
                            {s.status !== "paid" && (
                              <button type="button" onClick={() => removeSlip(s)} title="Remove payslip" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200/80 bg-gray-50/50 text-xs font-semibold text-gray-500">
                      <th className="px-6 py-3.5">Name</th>
                      <th className="px-6 py-3.5">Designation</th>
                      <th className="px-6 py-3.5">Phone</th>
                      <th className="px-6 py-3.5 text-right">Monthly salary</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          <Users className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                          No employees yet. Add your pharmacists, cashiers and helpers — with or without a login.
                        </td>
                      </tr>
                    ) : employees.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {e.name}
                          {e.joined_on && <div className="text-xs text-gray-400 font-normal">Joined {formatDate(e.joined_on)}</div>}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{e.designation || "—"}</td>
                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">{e.phone || "—"}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(Number(e.monthly_salary))}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${e.status === "active" ? "bg-[#e6f4ea] text-[#137333] border-green-200/60" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                            {e.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button type="button" onClick={() => openEmployee(e)} title="Edit" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => removeEmployee(e)} disabled={busy === e.id} title="Remove" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {employeeEdit && (
        <Dialog title={employeeEdit === "new" ? "Add employee" : `Edit ${employeeEdit.name}`} onClose={() => setEmployeeEdit(null)}
          footer={<>
            <button type="button" onClick={() => setEmployeeEdit(null)} className={outlineBtn}>Cancel</button>
            <button type="button" onClick={() => void saveEmployee()} disabled={busy === "employee"} className={primaryBtn}>
              {busy === "employee" && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Name *</label>
              <input className={inputCls} value={employeeDraft.name} onChange={e => setEmployeeDraft(d => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Designation</label>
              <input className={inputCls} placeholder="Pharmacist, cashier, helper…" value={employeeDraft.designation}
                onChange={e => setEmployeeDraft(d => ({ ...d, designation: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} type="tel" value={employeeDraft.phone} onChange={e => setEmployeeDraft(d => ({ ...d, phone: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Monthly salary</label>
              <input className={inputCls} type="number" min={0} step="0.01" placeholder="0" value={employeeDraft.monthly_salary}
                onChange={e => setEmployeeDraft(d => ({ ...d, monthly_salary: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Joined on</label>
              <input className={inputCls} type="date" value={employeeDraft.joined_on} onChange={e => setEmployeeDraft(d => ({ ...d, joined_on: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={employeeDraft.status} onChange={e => setEmployeeDraft(d => ({ ...d, status: e.target.value as "active" | "inactive" }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive (left, kept for history)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea className={inputCls} rows={2} value={employeeDraft.notes} onChange={e => setEmployeeDraft(d => ({ ...d, notes: e.target.value }))} />
            </div>
          </div>
        </Dialog>
      )}

      {slipEdit && slipDraft && (
        <Dialog title={slipEdit === "new" ? `Add payslip · ${monthLabel}` : `${slipEdit.employee_name} · ${monthLabel}`} onClose={() => setSlipEdit(null)}
          footer={<>
            <button type="button" onClick={() => setSlipEdit(null)} className={outlineBtn}>Cancel</button>
            <button type="button" onClick={() => void saveSlip()} disabled={busy === "slip"} className={primaryBtn}>
              {busy === "slip" && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </>}>
          <div className="grid gap-4 sm:grid-cols-2">
            {slipEdit === "new" && (
              <div className="sm:col-span-2">
                <label className={labelCls}>Employee *</label>
                <select className={inputCls} value={slipDraft.employee_id} onChange={e => {
                  const employee = employees.find(x => x.id === e.target.value);
                  setSlipDraft(d => (d ? { ...d, employee_id: e.target.value, basic: Number(employee?.monthly_salary ?? d.basic) } : d));
                }}>
                  <option value="">Pick an employee</option>
                  {missing.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
            {slipLocked && (
              <p className="sm:col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                This payslip is paid. Undo the payment to change the amounts.
              </p>
            )}
            {PAYSLIP_AMOUNTS.map(key => (
              <div key={key}>
                <label className={labelCls}>{AMOUNT_LABEL[key]}</label>
                <input className={inputCls} type="number" min={0} step="0.01" placeholder="0" disabled={!!slipLocked}
                  value={slipDraft[key] === 0 ? "" : String(slipDraft[key])}
                  onChange={e => setSlipDraft(d => (d ? { ...d, [key]: e.target.value === "" ? 0 : Number(e.target.value) } : d))} />
              </div>
            ))}
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
              <p className="text-xs font-semibold text-gray-500">Net pay</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(netOf(slipDraft))}</p>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea className={inputCls} rows={2} value={slipDraft.notes} onChange={e => setSlipDraft(d => (d ? { ...d, notes: e.target.value } : d))} />
            </div>
          </div>
        </Dialog>
      )}

      {paying && (
        <Dialog title={`Pay ${paying.employee_name}`} onClose={() => setPaying(null)}
          footer={<>
            <button type="button" onClick={() => setPaying(null)} className={outlineBtn}>Cancel</button>
            <button type="button" onClick={() => void pay()} disabled={busy === paying.id} className={primaryBtn}>
              {busy === paying.id && <Loader2 className="w-4 h-4 animate-spin" />} Mark paid
            </button>
          </>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
              <p className="text-xs font-semibold text-gray-500">Net pay</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(Number(paying.net))}</p>
            </div>
            <div>
              <label className={labelCls}>Paid by</label>
              <select className={inputCls} value={payMethod} onChange={e => setPayMethod(e.target.value as PayrollMethod)}>
                {PAYROLL_METHODS.map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Paid on</label>
              <input className={inputCls} type="date" max={today()} value={paidOn} onChange={e => setPaidOn(e.target.value)} />
            </div>
            <p className="sm:col-span-2 text-xs text-gray-500">It is booked as a &quot;Salary&quot; expense on this day.</p>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default PharmacyPayrollPage;
