"use client";

import { useState, useMemo } from "react";
import { Printer, Play, FileText, Download, Search, Settings2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill } from "@/components/admin/ui";
import { useCrud, DataTable, Toolbar, Modal, Field, Input, statusTone, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { processPayroll, getPayslips, updatePayslipStatus, printPayslip, exportPayslipsCSV, getEligibleEmployees, getDepartments, computePayslip, getSettings, saveSettings, defaultSettings, type Payslip, type PayrollSettings } from "@/lib/payroll";
import { load, save } from "@/lib/storage";

type DeductionOverride = { tax?: number; other?: number };
const OVERRIDES_KEY = "payroll-deduction-overrides-v1";

type Run = { id: string; period: string; employees: string; gross: string; net: string; status: string };
const seed: Run[] = [
  { id: "PR-2026-04", period: "Apr 2026", employees: "184", gross: "412000", net: "356000", status: "Paid" },
  { id: "PR-2026-05", period: "May 2026", employees: "186", gross: "418500", net: "361200", status: "Draft" },
];
const flow = ["Draft", "Approved", "Paid"];

const fmt = (n: number) => `৳${n.toLocaleString()}`;

const Payroll = () => {
  const crud = useCrud<Run>("payroll", seed);
  const { push } = useNotifications();
  const [add, setAdd] = useState(false);
  const [q, setQ] = useState("");
  const [empQ, setEmpQ] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<PayrollSettings>(getSettings());
  const [slipsRun, setSlipsRun] = useState<Run | null>(null);
  const [slips, setSlips] = useState<Payslip[]>([]);
  const [overrides, setOverrides] = useState<Record<string, DeductionOverride>>(() => load(OVERRIDES_KEY, {}));
  const setOverride = (empId: string, patch: DeductionOverride) => {
    setOverrides(prev => {
      const next = { ...prev, [empId]: { ...prev[empId], ...patch } };
      save(OVERRIDES_KEY, next);
      return next;
    });
  };
  const rows = crud.items.filter(r => !q || r.period.toLowerCase().includes(q.toLowerCase()));

  const advance = (r: Run) => {
    const i = flow.indexOf(r.status);
    if (i < flow.length - 1) {
      const next = flow[i + 1];
      crud.update(r.id, { status: next });
      if (next === "Paid") updatePayslipStatus(r.id, "Paid");
      push({ title: `${r.id} → ${next}`, tone: next === "Paid" ? "ok" : "info" });
    }
  };

  const process = (r: Run) => {
    const result = processPayroll(r.period, r.id);
    crud.update(r.id, {
      employees: String(result.employees),
      gross: String(result.gross),
      net: String(result.net),
    });
    push({
      title: `Processed ${result.employees} payslips`,
      body: `${r.id} · Gross ${fmt(result.gross)} · Net ${fmt(result.net)}`,
      tone: "ok",
    });
  };

  const openSlips = (r: Run) => {
    setSlipsRun(r);
    setSlips(getPayslips(r.id));
  };

  const cols: Column<Run>[] = [
    { key: "id", label: "Run", accessor: r => r.id, render: r => <span className="font-mono text-xs text-primary font-semibold">{r.id}</span> },
    { key: "period", label: "Period", sortable: true, accessor: r => r.period },
    { key: "employees", label: "Employees", accessor: r => Number(r.employees), sortable: true },
    { key: "gross", label: "Gross", render: r => fmt(Number(r.gross)) },
    { key: "net", label: "Net", render: r => fmt(Number(r.net)) },
    { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
  ];

  const eligibleCount = useMemo(() => getEligibleEmployees().length, [crud.items]);

  // Current month payroll summary — computed live from onboarded employees
  const now = new Date();
  const defaultPeriodId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [periodId, setPeriodId] = useState(defaultPeriodId);
  const [deptFilter, setDeptFilter] = useState<string>("All");
  const periodLabel = useMemo(() => {
    const [y, m] = periodId.split("-").map(Number);
    return new Date(y, (m || 1) - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
  }, [periodId]);
  const departments = useMemo(() => getDepartments(), [crud.items]);
  const monthSummary = useMemo(() => {
    const eligible = getEligibleEmployees();
    return eligible.map(e => {
      const base = computePayslip(e, periodId, `PR-${periodId}-PREVIEW`);
      const ov = overrides[e.empId] || {};
      const tax = ov.tax !== undefined ? ov.tax : base.tax;
      const otherBase = base.pf + base.loan;
      const other = ov.other !== undefined ? ov.other : otherBase;
      const totalDeductions = tax + other;
      const slip: Payslip = {
        ...base,
        tax,
        pf: other,
        loan: 0,
        totalDeductions,
        net: base.gross - totalDeductions,
      };
      return { emp: e, slip };
    });
  }, [crud.items, periodId, settings, overrides]);
  const filteredSummary = useMemo(() => {
    const t = empQ.trim().toLowerCase();
    return monthSummary.filter(({ emp, slip }) => {
      if (deptFilter !== "All" && (emp.department || "") !== deptFilter) return false;
      if (!t) return true;
      return [emp.name, emp.empId, emp.designation, emp.department, emp.jobStatus, emp.startDate,
        String(slip.basic), String(slip.houseRent), String(slip.medical), String(slip.transport),
        String(slip.gross), String(slip.tax), String(slip.net)]
        .some(v => (v || "").toString().toLowerCase().includes(t));
    });
  }, [monthSummary, empQ, deptFilter]);
  const summaryTotals = filteredSummary.reduce(
    (a, { slip }) => ({
      gross: a.gross + slip.gross,
      tax: a.tax + slip.tax,
      other: a.other + slip.pf + slip.loan,
      net: a.net + slip.net,
    }),
    { gross: 0, tax: 0, other: 0, net: 0 },
  );
  const generateOne = (slip: Payslip) => {
    printPayslip(slip);
    push({ title: `Payslip generated`, body: `${slip.name} · ${periodLabel}`, tone: "ok" });
  };
  const generateAll = () => {
    if (filteredSummary.length === 0) {
      push({ title: "No employees to process", tone: "warn" });
      return;
    }
    const w = window.open("", "_blank", "width=1100,height=900");
    if (!w) return;
    const rowsHtml = filteredSummary.map(({ emp, slip }) => `
      <tr>
        <td><b>${emp.name}</b><div class="sub">${emp.empId}</div></td>
        <td>${emp.designation || "—"}</td>
        <td>${emp.department || "—"}</td>
        <td>${emp.startDate || "—"}</td>
        <td>${emp.jobStatus || "Active"}</td>
        <td class="r">${slip.basic.toLocaleString()}</td>
        <td class="r">${slip.houseRent.toLocaleString()}</td>
        <td class="r">${slip.medical.toLocaleString()}</td>
        <td class="r">${slip.transport.toLocaleString()}</td>
        <td class="r"><b>${slip.gross.toLocaleString()}</b></td>
        <td class="r">${slip.tax.toLocaleString()}</td>
        <td class="r">${(slip.pf + slip.loan).toLocaleString()}</td>
        <td class="r"><b>${slip.net.toLocaleString()}</b></td>
      </tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>Payroll · ${periodLabel}</title>
<style>
  *{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto}
  body{margin:0;padding:28px;color:#0f172a;background:#fff;font-size:12px}
  header{display:flex;justify-content:space-between;align-items:end;border-bottom:2px solid #0f172a;padding-bottom:14px;margin-bottom:18px}
  h1{margin:0;font-size:22px;letter-spacing:.3px}
  .sub{color:#64748b;font-size:10px;margin-top:2px}
  .meta{text-align:right;font-size:11px;color:#64748b}
  .meta b{display:block;color:#0f172a;font-size:13px}
  table{width:100%;border-collapse:collapse}
  th,td{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}
  th{background:#0f172a;color:#fff;font-size:10px;letter-spacing:1.5px;text-transform:uppercase}
  td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}
  tfoot td{font-weight:700;background:#f8fafc;border-top:2px solid #0f172a}
  footer{margin-top:24px;display:flex;justify-content:space-between;font-size:10px;color:#64748b}
  .sig{margin-top:48px;display:flex;gap:80px}
  .sig div{flex:1;border-top:1px solid #94a3b8;padding-top:6px;text-align:center;font-size:11px;color:#475569}
  @media print {body{padding:0 12px}}
</style></head><body>
<header>
  <div><h1>Payroll Statement</h1><div class="sub">Hospital Group · Generated ${new Date().toLocaleString()}</div></div>
  <div class="meta"><b>${periodLabel}</b>${deptFilter === "All" ? "All Departments" : deptFilter} · ${filteredSummary.length} employees</div>
</header>
<table>
  <thead><tr>
    <th>Employee</th><th>Designation</th><th>Department</th><th>Joined</th><th>Status</th>
    <th class="r">Basic</th><th class="r">House</th><th class="r">Medical</th><th class="r">Conv.</th>
    <th class="r">Gross</th><th class="r">Tax</th><th class="r">Other</th><th class="r">Net</th>
  </tr></thead>
  <tbody>${rowsHtml}</tbody>
  <tfoot><tr>
    <td colspan="9">Totals · ${filteredSummary.length} employees</td>
    <td class="r">${summaryTotals.gross.toLocaleString()}</td>
    <td class="r">${summaryTotals.tax.toLocaleString()}</td>
    <td class="r">${summaryTotals.other.toLocaleString()}</td>
    <td class="r">${summaryTotals.net.toLocaleString()}</td>
  </tr></tfoot>
</table>
<div class="sig">
  <div>Prepared by</div><div>Approved by</div><div>Authorized Signature</div>
</div>
<footer><span>Computer-generated payroll statement</span><span>Page 1 of 1</span></footer>
<script>window.onload=()=>setTimeout(()=>window.print(),250)</script>
</body></html>`);
    w.document.close();
    push({ title: `Payroll generated`, body: `${filteredSummary.length} employees · ${periodLabel}`, tone: "ok" });
  };

  return (
    <AdminLayout title="Payroll Management" subtitle="Run, process, approve and disburse salaries">
      {/* Current month payroll summary */}
      <Card className="p-5">
        <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Payroll Summary</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {periodLabel} · {deptFilter === "All" ? "All departments" : deptFilter} · {filteredSummary.length} of {monthSummary.length} employees
            </p>
          </div>
          <div className="flex gap-4 text-[11px] text-muted-foreground">
            <div><div className="uppercase tracking-widest">Gross</div><div className="font-mono text-sm text-foreground font-semibold">{fmt(summaryTotals.gross)}</div></div>
            <div><div className="uppercase tracking-widest">Tax</div><div className="font-mono text-sm text-destructive font-semibold">{fmt(summaryTotals.tax)}</div></div>
            <div><div className="uppercase tracking-widest">Other Deduct</div><div className="font-mono text-sm text-destructive font-semibold">{fmt(summaryTotals.other)}</div></div>
            <div><div className="uppercase tracking-widest">Net Payable</div><div className="font-mono text-sm text-primary font-semibold">{fmt(summaryTotals.net)}</div></div>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={empQ}
              onChange={e => setEmpQ(e.target.value)}
              placeholder="Search employees…"
              className="w-full bg-muted/40 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <input
            type="month"
            value={periodId}
            onChange={e => setPeriodId(e.target.value)}
            className="bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="All">All departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button
            onClick={() => { setSettings(getSettings()); setSettingsOpen(true); }}
            className="px-3 py-2 rounded-lg text-xs font-semibold border border-border inline-flex items-center gap-1.5 hover:bg-muted/50"
          >
            <Settings2 className="h-3.5 w-3.5" /> Salary Calculation
          </button>
          <button
            onClick={generateAll}
            className="ml-auto px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1.5 hover:opacity-90"
          >
            <Printer className="h-3.5 w-3.5" /> Generate Payroll
          </button>
        </div>
        <div className="overflow-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="text-[10px] tracking-widest text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left py-2.5 px-3">EMPLOYEE</th>
                <th className="text-left py-2.5 px-3">DESIGNATION</th>
                <th className="text-left py-2.5 px-3">DEPARTMENT</th>
                <th className="text-left py-2.5 px-3">JOINED</th>
                <th className="text-left py-2.5 px-3">STATUS</th>
                <th className="text-right py-2.5 px-3">BASIC</th>
                <th className="text-right py-2.5 px-3">HOUSE</th>
                <th className="text-right py-2.5 px-3">MEDICAL</th>
                <th className="text-right py-2.5 px-3">CONVEY.</th>
                <th className="text-right py-2.5 px-3">GROSS</th>
                <th className="text-right py-2.5 px-3">TAX</th>
                <th className="text-right py-2.5 px-3">OTHER</th>
                <th className="text-right py-2.5 px-3">NET</th>
                <th className="text-right py-2.5 px-3">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredSummary.length === 0 ? (
                <tr><td colSpan={14} className="text-center py-8 text-muted-foreground text-xs">{monthSummary.length === 0 ? "No active employees in Onboarding." : "No matches for your search."}</td></tr>
              ) : filteredSummary.map(({ emp, slip }) => (
                <tr key={emp.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-primary">{emp.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{emp.empId}</div>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{emp.designation || "—"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{emp.department || "—"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs">{emp.startDate || "—"}</td>
                  <td className="py-2.5 px-3"><Pill tone={statusTone(emp.jobStatus || "Active")}>{emp.jobStatus || "Active"}</Pill></td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{fmt(slip.basic)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{fmt(slip.houseRent)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{fmt(slip.medical)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{fmt(slip.transport)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">{fmt(slip.gross)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      min={0}
                      value={slip.tax}
                      onChange={e => setOverride(emp.empId, { tax: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-20 bg-muted/40 rounded px-2 py-1 text-right font-mono text-xs text-destructive outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      min={0}
                      value={slip.pf + slip.loan}
                      onChange={e => setOverride(emp.empId, { other: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-20 bg-muted/40 rounded px-2 py-1 text-right font-mono text-xs text-destructive outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-primary">{fmt(slip.net)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button onClick={() => generateOne(slip)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary/10 text-primary inline-flex items-center gap-1 hover:bg-primary/20">
                      <Printer className="h-3 w-3" /> Generate Payslip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New run */}
      <Modal open={add} onClose={() => setAdd(false)} title="New payroll run"
        footer={<><Btn variant="outline" onClick={() => setAdd(false)}>Cancel</Btn>
          <button form="pr-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Create &amp; Process</button></>}>
        <form id="pr-form" onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const period = String(fd.get("period"));
          const department = String(fd.get("department") || "All");
          const suffix = department === "All" ? "" : `-${department.replace(/\s+/g, "")}`;
          const id = `PR-${period}${suffix}`;
          const run: Run = { id, period: department === "All" ? period : `${period} · ${department}`, employees: "0", gross: "0", net: "0", status: "Draft" };
          crud.create(run as never);
          const result = processPayroll(period, id, department);
          crud.update(id, {
            employees: String(result.employees),
            gross: String(result.gross),
            net: String(result.net),
          });
          push({
            title: `Payroll for ${period}${department === "All" ? "" : ` (${department})`} created`,
            body: `${result.employees} payslips · Gross ${fmt(result.gross)} · Net ${fmt(result.net)}`,
            tone: "ok",
          });
          setAdd(false);
          setSlipsRun({ ...run, employees: String(result.employees), gross: String(result.gross), net: String(result.net) });
          setSlips(result.payslips);
        }}>
          <Field label="Period (e.g. 2026-06)"><Input name="period" required /></Field>
          <Field label="Department">
            <select name="department" defaultValue="All"
              className="w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm">
              <option value="All">All departments</option>
              {getDepartments().map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <p className="text-[11px] text-muted-foreground mt-2">Payslips are generated automatically from active employees in Onboarding.</p>
        </form>
      </Modal>

      {/* Payslips drawer-modal */}
      <Modal open={!!slipsRun} onClose={() => setSlipsRun(null)}
        size="xl"
        title={`Payslips · ${slipsRun?.id || ""} (${slipsRun?.period || ""})`}
        footer={<>
          <Btn variant="outline" onClick={() => slipsRun && exportPayslipsCSV(slipsRun.id)}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Btn>
          <Btn variant="outline" onClick={() => setSlipsRun(null)}>Close</Btn>
        </>}>
        {slips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-3">No payslips generated yet for this run.</p>
            {slipsRun && (
              <button onClick={() => { process(slipsRun); setSlips(getPayslips(slipsRun.id)); }}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" /> Process payroll now
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="text-[10px] tracking-widest text-muted-foreground sticky top-0 bg-card">
                <tr className="border-b border-border/60">
                  <th className="text-left py-2 px-2">EMP</th>
                  <th className="text-left py-2 px-2">NAME</th>
                  <th className="text-left py-2 px-2">DEPT</th>
                  <th className="text-right py-2 px-2">GROSS</th>
                  <th className="text-right py-2 px-2">DEDUCT</th>
                  <th className="text-right py-2 px-2">NET</th>
                  <th className="text-right py-2 px-2">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {slips.map(s => (
                  <tr key={s.id} className="border-b border-border/40">
                    <td className="py-2 px-2 font-mono text-xs">{s.empId}</td>
                    <td className="py-2 px-2 font-semibold text-primary">{s.name}</td>
                    <td className="py-2 px-2 text-muted-foreground">{s.department}</td>
                    <td className="py-2 px-2 text-right font-mono">{fmt(s.gross)}</td>
                    <td className="py-2 px-2 text-right font-mono text-destructive">{fmt(s.totalDeductions)}</td>
                    <td className="py-2 px-2 text-right font-mono font-semibold">{fmt(s.net)}</td>
                    <td className="py-2 px-2 text-right">
                      <button onClick={() => printPayslip(s)}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold border border-border inline-flex items-center gap-1">
                        <Printer className="h-3 w-3" /> Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={3} className="py-3 px-2">Totals · {slips.length} employees</td>
                  <td className="py-3 px-2 text-right font-mono">{fmt(slips.reduce((a, s) => a + s.gross, 0))}</td>
                  <td className="py-3 px-2 text-right font-mono">{fmt(slips.reduce((a, s) => a + s.totalDeductions, 0))}</td>
                  <td className="py-3 px-2 text-right font-mono">{fmt(slips.reduce((a, s) => a + s.net, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal>

      {/* Salary calculation settings */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Salary calculation settings"
        footer={<>
          <Btn variant="outline" onClick={() => setSettings(defaultSettings)}>Reset</Btn>
          <Btn variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Btn>
          <button
            onClick={() => {
              const totalEarn = settings.basicPct + settings.houseRentPct + settings.medicalPct + settings.conveyancePct;
              if (Math.round(totalEarn) !== 100) {
                push({ title: "Earnings must total 100%", body: `Currently ${totalEarn}%`, tone: "warn" });
                return;
              }
              saveSettings(settings);
              setSettingsOpen(false);
              push({ title: "Salary calculation updated", body: "All payslips recalculated.", tone: "ok" });
            }}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">
            Save
          </button>
        </>}>
        <p className="text-xs text-muted-foreground mb-4">
          Earnings are split as percentages of the gross salary. Conveyance auto-absorbs rounding.
          Earnings must add up to <span className="font-semibold">100%</span>.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {([
            ["basicPct", "Basic (%)"],
            ["houseRentPct", "House Rent (%)"],
            ["medicalPct", "Medical (%)"],
            ["conveyancePct", "Conveyance (%)"],
            
          ] as [keyof PayrollSettings, string][]).map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                type="number"
                step="0.01"
                value={settings[key]}
                onChange={e => setSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
              />
            </Field>
          ))}
        </div>
      </Modal>
    </AdminLayout>
  );
};
export default Payroll;

