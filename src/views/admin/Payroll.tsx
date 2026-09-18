"use client";

import { useState, useMemo } from "react";
import { Printer, Play, Download, Search, Settings2, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill } from "@/components/admin/ui";
import { DataTable, Toolbar, Modal, ConfirmDialog, Field, Input, statusTone, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import type { EmployeeRow } from "@/redux/api/resources";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { printPayslip, exportPayslipsCSV, getEligibleEmployees, getDepartments, computePayslip, defaultSettings, type PayrollSettings, type ComputedPayslip } from "@/lib/payroll";
import { usePayrollSettings, usePayrollOverrides, useRunPayslips, processRun } from "@/data/payroll";
import { useFormatters } from "@/lib/appSettings";

// Mirrors public.payroll_runs (supabase/migrations/0037_payroll_runs.sql).
// Column names are the database's, so form values post straight through with no
// mapping. Postgres `numeric` arrives over the wire as a string, hence the
// union on the totals.
type PayrollRun = {
  id: string;
  tenant_id?: string;
  period: string;                 // "2026-04"
  department: string | null;
  reference: string | null;
  headcount: number;
  gross_total: number | string;
  net_total: number | string;
  status: "draft" | "approved" | "paid";
  created_at?: string;
  updated_at?: string;
};
const flow = ["draft", "approved", "paid"] as const;

/**
 * Statuses are stored lowercase across every module, so the label maps below
 * are the only places they get capitalised — the pill, the toast and the
 * printed payslip.
 */
const RUN_STATUSES = ["draft", "approved", "paid"] as const;

/** From 0039_employees.sql. */
const JOB_STATUSES = ["active", "probation", "suspended", "terminated", "resigned"] as const;

const Payroll = () => {
  const t = useTranslations("admin.payroll");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { formatCurrency: fmt } = useFormatters();

  const runStatusLabel = (value: string) =>
    (RUN_STATUSES as readonly string[]).includes(value) ? t(`runStatuses.${value as (typeof RUN_STATUSES)[number]}`) : value;
  const jobStatusLabel = (value: string | null) =>
    value && (JOB_STATUSES as readonly string[]).includes(value)
      ? t(`jobStatuses.${value as (typeof JOB_STATUSES)[number]}`)
      : value ?? "—";

  /** "2026-04" -> "Apr 2026", in the reader's language. */
  const fmtPeriod = (p: string) => {
    const [y, m] = p.split("-").map(Number);
    if (!y || !m) return p;
    return new Date(y, m - 1, 1).toLocaleString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US", { month: "short", year: "numeric" });
  };

  const crud = useResourceCrud<PayrollRun>("payroll-runs");
  // The staff register (HF-68). Payroll computes from these rows; it no longer
  // reads the onboarding localStorage key.
  const staff = useResourceCrud<EmployeeRow>("employees");
  const { push } = useNotifications();
  const [add, setAdd] = useState(false);
  const [q, setQ] = useState("");
  const [empQ, setEmpQ] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The hospital's percentages (0042), shared by every admin. `draftSettings`
  // is what the dialog is editing; `settings` is what is saved and what every
  // figure on this page is computed from.
  const { settings, save: saveSettings } = usePayrollSettings();
  const [draftSettings, setDraftSettings] = useState<PayrollSettings>(defaultSettings);
  const [slipsRun, setSlipsRun] = useState<PayrollRun | null>(null);
  const { payslips: slips, isLoading: slipsLoading, invalidate: reloadSlips } = useRunPayslips(slipsRun?.id ?? null);
  const [confirmDel, setConfirmDel] = useState<PayrollRun | null>(null);
  const [processing, setProcessing] = useState(false);
  const { byEmployee: overrides, setOverride } = usePayrollOverrides();

  /**
   * Persisted on blur, not on every keystroke. These are API calls now, not a
   * localStorage write — one request per digit typed would be both slow and a
   * good way to have the last two land out of order.
   */
  const commitOverride = async (employeeId: string, patch: { tax?: number; other?: number }) => {
    try {
      await setOverride(employeeId, patch);
    } catch {
      push({ title: t("deductionFailed"), tone: "warn" });
    }
  };

  const rows = crud.items.filter(r => {
    if (!q) return true;
    const t = q.toLowerCase();
    return [r.reference, r.period, fmtPeriod(r.period), r.department]
      .some(v => (v ?? "").toLowerCase().includes(t));
  });

  const runLabel = (r: PayrollRun) => r.reference ?? fmtPeriod(r.period);

  const advance = async (r: PayrollRun) => {
    const i = flow.indexOf(r.status);
    if (i < 0 || i >= flow.length - 1) return;
    const next = flow[i + 1];
    await crud.update(r.id, { status: next });
    // A payslip no longer carries its own status: it had one, it was only ever
    // set for the whole run at once, and keeping a copy per line meant the two
    // could disagree. The drawer shows the run's status instead.
    push({ title: `${runLabel(r)} → ${runStatusLabel(next)}`, tone: next === "paid" ? "ok" : "info" });
  };

  /**
   * The server recomputes the run from the staff register and the hospital's
   * settings. Nothing is calculated here — a browser that could post its own
   * payslip amounts is a browser that could pay itself.
   */
  const process = async (r: PayrollRun) => {
    setProcessing(true);
    try {
      const result = await processRun(r.id);
      reloadSlips();
      await crud.refetch();
      push({
        title: t("processed", { count: result.headcount }),
        body: t("processedBody", { run: runLabel(r), gross: fmt(result.gross), net: fmt(result.net) }),
        tone: "ok",
      });
      return result;
    } catch (cause) {
      push({
        title: t("processFailed"),
        body: cause instanceof Error && cause.message ? cause.message : undefined,
        tone: "warn",
      });
      return null;
    } finally {
      setProcessing(false);
    }
  };

  const openSlips = (r: PayrollRun) => setSlipsRun(r);

  const cols: Column<PayrollRun>[] = [
    { key: "reference", label: t("columns.run"), accessor: r => r.reference ?? r.period,
      render: r => <span className="font-mono text-xs text-primary font-semibold">{r.reference ?? r.period}</span> },
    { key: "period", label: t("columns.period"), sortable: true, accessor: r => r.period, render: r => fmtPeriod(r.period) },
    { key: "department", label: t("columns.department"), accessor: r => r.department ?? "",
      render: r => r.department ?? <span className="text-muted-foreground">{t("allDepartments")}</span> },
    { key: "headcount", label: t("columns.employees"), sortable: true, accessor: r => r.headcount },
    { key: "gross_total", label: t("columns.gross"), accessor: r => Number(r.gross_total), render: r => fmt(Number(r.gross_total)) },
    { key: "net_total", label: t("columns.net"), accessor: r => Number(r.net_total), render: r => fmt(Number(r.net_total)) },
    { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{runStatusLabel(r.status)}</Pill> },
  ];

  // Current month payroll summary — computed live from onboarded employees
  const now = new Date();
  const defaultPeriodId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [periodId, setPeriodId] = useState(defaultPeriodId);
  const [deptFilter, setDeptFilter] = useState<string>("All");
  const periodLabel = useMemo(() => {
    const [y, m] = periodId.split("-").map(Number);
    return new Date(y, (m || 1) - 1, 1).toLocaleString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US", { month: "short", year: "numeric" });
  }, [periodId, locale]);
  const departments = useMemo(() => getDepartments(staff.items), [staff.items]);
  const monthSummary = useMemo(() => {
    const eligible = getEligibleEmployees(staff.items);
    return eligible.map(e => {
      const base = computePayslip(e, periodId, settings);
      const ov = overrides.get(e.id);
      // Null means "use the computed figure"; 0 is a real override meaning
      // "deduct nothing", so the check is against null and undefined, not
      // falsiness.
      const tax = ov?.tax ?? null;
      const other = ov?.other ?? null;
      const taxValue = tax === null ? base.tax : Number(tax);
      const otherValue = other === null ? base.pf + base.loan : Number(other);
      const totalDeductions = taxValue + otherValue;
      const slip: ComputedPayslip = {
        ...base,
        tax: taxValue,
        pf: otherValue,
        loan: 0,
        total_deductions: totalDeductions,
        net: base.gross - totalDeductions,
      };
      return { emp: e, slip };
    });
  }, [staff.items, periodId, settings, overrides]);
  const filteredSummary = useMemo(() => {
    const term = empQ.trim().toLowerCase();
    return monthSummary.filter(({ emp, slip }) => {
      if (deptFilter !== "All" && (emp.department || "") !== deptFilter) return false;
      if (!term) return true;
      return [emp.name, emp.emp_id, emp.designation, emp.department, emp.job_status, emp.start_date,
        String(slip.basic), String(slip.house_rent), String(slip.medical), String(slip.transport),
        String(slip.gross), String(slip.tax), String(slip.net)]
        .some(v => (v || "").toString().toLowerCase().includes(term));
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
  const generateOne = (slip: ComputedPayslip) => {
    printPayslip(slip, `PR-${periodId}`);
    push({ title: t("payslipGenerated"), body: `${slip.name} · ${periodLabel}`, tone: "ok" });
  };
  const generateAll = () => {
    if (filteredSummary.length === 0) {
      push({ title: t("noEmployeesToProcess"), tone: "warn" });
      return;
    }
    const w = window.open("", "_blank", "width=1100,height=900");
    if (!w) return;
    const rowsHtml = filteredSummary.map(({ emp, slip }) => `
      <tr>
        <td><b>${emp.name}</b><div class="sub">${emp.emp_id}</div></td>
        <td>${emp.designation || "—"}</td>
        <td>${emp.department || "—"}</td>
        <td>${emp.start_date || "—"}</td>
        <td>${jobStatusLabel(emp.job_status)}</td>
        <td class="r">${slip.basic.toLocaleString()}</td>
        <td class="r">${slip.house_rent.toLocaleString()}</td>
        <td class="r">${slip.medical.toLocaleString()}</td>
        <td class="r">${slip.transport.toLocaleString()}</td>
        <td class="r"><b>${slip.gross.toLocaleString()}</b></td>
        <td class="r">${slip.tax.toLocaleString()}</td>
        <td class="r">${(slip.pf + slip.loan).toLocaleString()}</td>
        <td class="r"><b>${slip.net.toLocaleString()}</b></td>
      </tr>`).join("");
    w.document.write(`<!doctype html><html lang="${locale}"><head><title>${t("print.tabTitle", { period: periodLabel })}</title>
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
  <div><h1>${t("print.heading")}</h1><div class="sub">${t("print.generated", { at: new Date().toLocaleString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US") })}</div></div>
  <div class="meta"><b>${periodLabel}</b>${deptFilter === "All" ? t("allDepartments") : deptFilter} · ${t("employeeCount", { count: filteredSummary.length })}</div>
</header>
<table>
  <thead><tr>
    <th>${t("columns.employee")}</th><th>${t("columns.designation")}</th><th>${t("columns.department")}</th><th>${t("columns.joined")}</th><th>${t("columns.status")}</th>
    <th class="r">${t("columns.basic")}</th><th class="r">${t("columns.house")}</th><th class="r">${t("columns.medical")}</th><th class="r">${t("columns.conveyance")}</th>
    <th class="r">${t("columns.gross")}</th><th class="r">${t("columns.tax")}</th><th class="r">${t("columns.other")}</th><th class="r">${t("columns.net")}</th>
  </tr></thead>
  <tbody>${rowsHtml}</tbody>
  <tfoot><tr>
    <td colspan="9">${t("print.totals", { count: filteredSummary.length })}</td>
    <td class="r">${summaryTotals.gross.toLocaleString()}</td>
    <td class="r">${summaryTotals.tax.toLocaleString()}</td>
    <td class="r">${summaryTotals.other.toLocaleString()}</td>
    <td class="r">${summaryTotals.net.toLocaleString()}</td>
  </tr></tfoot>
</table>
<div class="sig">
  <div>${t("print.preparedBy")}</div><div>${t("print.approvedBy")}</div><div>${t("print.signature")}</div>
</div>
<footer><span>${t("print.footer")}</span><span>${t("print.page")}</span></footer>
<script>window.onload=()=>setTimeout(()=>window.print(),250)</script>
</body></html>`);
    w.document.close();
    push({ title: t("payrollGenerated"), body: `${t("employeeCount", { count: filteredSummary.length })} · ${periodLabel}`, tone: "ok" });
  };

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      {/* Current month payroll summary */}
      {/* mb-6: AdminLayout's <main> sets no vertical rhythm, so sibling cards
          sit flush unless the page spaces them itself — same as Attendance. */}
      <Card className="p-5 mb-6">
        <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">{t("summary")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {periodLabel} · {deptFilter === "All" ? t("allDepartments") : deptFilter} · {t("ofEmployees", { shown: filteredSummary.length, total: monthSummary.length })}
            </p>
          </div>
          <div className="flex gap-4 text-[11px] text-muted-foreground">
            <div><div className="uppercase tracking-widest">{t("columns.gross")}</div><div className="font-mono text-sm text-foreground font-semibold">{fmt(summaryTotals.gross)}</div></div>
            <div><div className="uppercase tracking-widest">{t("columns.tax")}</div><div className="font-mono text-sm text-destructive font-semibold">{fmt(summaryTotals.tax)}</div></div>
            <div><div className="uppercase tracking-widest">{t("otherDeduct")}</div><div className="font-mono text-sm text-destructive font-semibold">{fmt(summaryTotals.other)}</div></div>
            <div><div className="uppercase tracking-widest">{t("netPayable")}</div><div className="font-mono text-sm text-primary font-semibold">{fmt(summaryTotals.net)}</div></div>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={empQ}
              onChange={e => setEmpQ(e.target.value)}
              placeholder={t("searchEmployees")} aria-label={t("searchEmployees")}
              className="w-full bg-muted/40 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <input
            type="month"
            value={periodId}
            onChange={e => setPeriodId(e.target.value)}
            aria-label={t("columns.period")}
            className="bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            aria-label={t("columns.department")}
            className="bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="All">{t("allDepartments")}</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button
            onClick={() => { setDraftSettings(settings); setSettingsOpen(true); }}
            className="px-3 py-2 rounded-lg text-xs font-semibold border border-border inline-flex items-center gap-1.5 hover:bg-muted/50"
          >
            <Settings2 className="h-3.5 w-3.5" /> {t("salaryCalculation")}
          </button>
          <button
            onClick={generateAll}
            className="ml-auto px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1.5 hover:opacity-90"
          >
            <Printer className="h-3.5 w-3.5" /> {t("generatePayroll")}
          </button>
        </div>
        <div className="overflow-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="text-[10px] tracking-widest text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left py-2.5 px-3">{t("columns.employee").toUpperCase()}</th>
                <th className="text-left py-2.5 px-3">{t("columns.designation").toUpperCase()}</th>
                <th className="text-left py-2.5 px-3">{t("columns.department").toUpperCase()}</th>
                <th className="text-left py-2.5 px-3">{t("columns.joined").toUpperCase()}</th>
                <th className="text-left py-2.5 px-3">{t("columns.status").toUpperCase()}</th>
                <th className="text-right py-2.5 px-3">{t("columns.basic").toUpperCase()}</th>
                <th className="text-right py-2.5 px-3">{t("columns.house").toUpperCase()}</th>
                <th className="text-right py-2.5 px-3">{t("columns.medical").toUpperCase()}</th>
                <th className="text-right py-2.5 px-3">{t("columns.conveyance").toUpperCase()}</th>
                <th className="text-right py-2.5 px-3">{t("columns.gross").toUpperCase()}</th>
                <th className="text-right py-2.5 px-3">{t("columns.tax").toUpperCase()}</th>
                <th className="text-right py-2.5 px-3">{t("columns.other").toUpperCase()}</th>
                <th className="text-right py-2.5 px-3">{t("columns.net").toUpperCase()}</th>
                <th className="text-right py-2.5 px-3">{t("columns.action").toUpperCase()}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSummary.length === 0 ? (
                <tr><td colSpan={14} className="text-center py-8 text-muted-foreground text-xs">{monthSummary.length === 0 ? t("noActiveEmployees") : t("noMatches")}</td></tr>
              ) : filteredSummary.map(({ emp, slip }) => (
                <tr key={emp.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-primary">{emp.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{emp.emp_id}</div>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{emp.designation || "—"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{emp.department || "—"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs">{emp.start_date || "—"}</td>
                  <td className="py-2.5 px-3"><Pill tone={statusTone(emp.job_status)}>{jobStatusLabel(emp.job_status)}</Pill></td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{fmt(slip.basic)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{fmt(slip.house_rent)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{fmt(slip.medical)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{fmt(slip.transport)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">{fmt(slip.gross)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      min={0}
                      defaultValue={slip.tax}
                      key={`tax-${emp.id}-${slip.tax}`}
                      aria-label={t("taxFor", { name: emp.name })}
                      onBlur={e => {
                        const next = Math.max(0, Number(e.target.value) || 0);
                        if (next !== slip.tax) void commitOverride(emp.id, { tax: next });
                      }}
                      className="w-20 bg-muted/40 rounded px-2 py-1 text-right font-mono text-xs text-destructive outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      min={0}
                      defaultValue={slip.pf + slip.loan}
                      key={`other-${emp.id}-${slip.pf + slip.loan}`}
                      aria-label={t("otherFor", { name: emp.name })}
                      onBlur={e => {
                        const next = Math.max(0, Number(e.target.value) || 0);
                        if (next !== slip.pf + slip.loan) void commitOverride(emp.id, { other: next });
                      }}
                      className="w-20 bg-muted/40 rounded px-2 py-1 text-right font-mono text-xs text-destructive outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-primary">{fmt(slip.net)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button onClick={() => generateOne(slip)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary/10 text-primary inline-flex items-center gap-1 hover:bg-primary/20">
                      <Printer className="h-3 w-3" /> {t("generatePayslip")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payroll runs */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold tracking-tight">{t("runs")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("runsNote")}</p>
        </div>
        <Toolbar
          search={q}
          onSearch={setQ}
          onAdd={() => setAdd(true)}
          addLabel={t("newRun")}
          onExport={() => exportCSV(rows as never, "payroll-runs.csv")}
        />
        {crud.error ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-destructive">{t("loadRunsFailed")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("loadFailedHint")}</p>
            <button
              type="button"
              onClick={() => crud.refetch()}
              className="mt-3 px-4 py-2 rounded-full text-xs font-semibold border border-border hover:bg-muted"
            >
              {t("tryAgain")}
            </button>
          </div>
        ) : crud.isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{tc("loading")}</div>
        ) : (
          <DataTable<PayrollRun>
            rows={rows}
            columns={cols}
            empty={t("noRuns")}
            onRow={openSlips}
            actions={r => (
              <div className="flex items-center gap-1">
                {flow.indexOf(r.status) < flow.length - 1 && (
                  <button
                    onClick={() => void advance(r)}
                    title={t("advanceTo", { status: runStatusLabel(flow[flow.indexOf(r.status) + 1]) })}
                    aria-label={t("advanceTo", { status: runStatusLabel(flow[flow.indexOf(r.status) + 1]) })}
                    className="p-1.5 rounded-lg hover:bg-muted text-foreground/70"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                <RowActions onView={() => openSlips(r)} onDelete={() => setConfirmDel(r)} />
              </div>
            )}
          />
        )}
      </Card>

      {/* New run */}
      <Modal open={add} onClose={() => setAdd(false)} title={t("newRun")}
        footer={<><Btn variant="outline" onClick={() => setAdd(false)}>{tc("cancel")}</Btn>
          <button form="pr-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">{t("createAndProcess")}</button></>}>
        <form id="pr-form" onSubmit={async e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const period = String(fd.get("period") || "").trim();
          const picked = String(fd.get("department") || "").trim();
          const department = picked && picked !== "All" ? picked : "";
          const reference = `PR-${period}${department ? `-${department.replace(/\s+/g, "")}` : ""}`;

          const created = await crud.create({
            period,
            department: department || undefined,
            reference,
            status: "draft",
          } as never);
          if (!created) return; // useResourceCrud has already surfaced the error

          setAdd(false);
          setSlipsRun(created);
          // The run exists either way; process() reports its own failure and
          // the drawer offers "Process payroll now" to retry.
          await process(created);
        }}>
          <Field label={t("columns.period")} required><Input name="period" type="month" required defaultValue={defaultPeriodId} /></Field>
          <Field label={t("columns.department")}>
            <select name="department" defaultValue="All" aria-label={t("columns.department")}
              className="w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm">
              <option value="All">{t("allDepartments")}</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <p className="text-[11px] text-muted-foreground mt-2">{t("payslipsNote")}</p>
        </form>
      </Modal>

      {/* Payslips drawer-modal */}
      <Modal open={!!slipsRun} onClose={() => setSlipsRun(null)}
        size="xl"
        title={t("payslipsFor", { run: slipsRun ? `${slipsRun.reference ?? slipsRun.period} · ${fmtPeriod(slipsRun.period)}` : "" })}
        footer={<>
          <Btn variant="outline" onClick={() => slipsRun && exportPayslipsCSV(slips, runLabel(slipsRun))}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> {t("exportCsv")}
          </Btn>
          <Btn variant="outline" onClick={() => setSlipsRun(null)}>{tc("close")}</Btn>
        </>}>
        {slipsLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">{t("loadingPayslips")}</div>
        ) : slips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-3">{t("noPayslips")}</p>
            {slipsRun && (
              <button onClick={() => void process(slipsRun)} disabled={processing}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1.5 disabled:opacity-60">
                <Play className="h-3.5 w-3.5" /> {processing ? t("processing") : t("processNow")}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="text-[10px] tracking-widest text-muted-foreground sticky top-0 bg-card">
                <tr className="border-b border-border/60">
                  <th className="text-left py-2 px-2">{t("columns.emp").toUpperCase()}</th>
                  <th className="text-left py-2 px-2">{t("columns.name").toUpperCase()}</th>
                  <th className="text-left py-2 px-2">{t("columns.dept").toUpperCase()}</th>
                  <th className="text-right py-2 px-2">{t("columns.gross").toUpperCase()}</th>
                  <th className="text-right py-2 px-2">{t("columns.deduct").toUpperCase()}</th>
                  <th className="text-right py-2 px-2">{t("columns.net").toUpperCase()}</th>
                  <th className="text-right py-2 px-2">{t("columns.action").toUpperCase()}</th>
                </tr>
              </thead>
              <tbody>
                {slips.map(s => (
                  <tr key={s.id} className="border-b border-border/40">
                    <td className="py-2 px-2 font-mono text-xs">{s.emp_id}</td>
                    <td className="py-2 px-2 font-semibold text-primary">{s.name}</td>
                    <td className="py-2 px-2 text-muted-foreground">{s.department}</td>
                    <td className="py-2 px-2 text-right font-mono">{fmt(s.gross)}</td>
                    <td className="py-2 px-2 text-right font-mono text-destructive">{fmt(s.total_deductions)}</td>
                    <td className="py-2 px-2 text-right font-mono font-semibold">{fmt(s.net)}</td>
                    <td className="py-2 px-2 text-right">
                      <button onClick={() => slipsRun && printPayslip(s, runLabel(slipsRun))}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold border border-border inline-flex items-center gap-1">
                        <Printer className="h-3 w-3" /> {t("print.button")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={3} className="py-3 px-2">{t("print.totals", { count: slips.length })}</td>
                  <td className="py-3 px-2 text-right font-mono">{fmt(slips.reduce((a, s) => a + s.gross, 0))}</td>
                  <td className="py-3 px-2 text-right font-mono">{fmt(slips.reduce((a, s) => a + s.total_deductions, 0))}</td>
                  <td className="py-3 px-2 text-right font-mono">{fmt(slips.reduce((a, s) => a + s.net, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal>

      {/* Salary calculation settings */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t("settingsTitle")}
        footer={<>
          <Btn variant="outline" onClick={() => setDraftSettings(defaultSettings)}>{t("reset")}</Btn>
          <Btn variant="outline" onClick={() => setSettingsOpen(false)}>{tc("cancel")}</Btn>
          <button
            onClick={async () => {
              const totalEarn = draftSettings.basic_pct + draftSettings.house_rent_pct
                + draftSettings.medical_pct + draftSettings.conveyance_pct;
              if (Math.round(totalEarn) !== 100) {
                push({ title: t("earningsMustTotal"), body: t("currentlyPct", { pct: totalEarn }), tone: "warn" });
                return;
              }
              try {
                await saveSettings(draftSettings);
                setSettingsOpen(false);
                push({
                  title: t("settingsUpdated"),
                  body: t("settingsUpdatedBody"),
                  tone: "ok",
                });
              } catch (cause) {
                push({
                  title: t("settingsFailed"),
                  body: cause instanceof Error ? cause.message : undefined,
                  tone: "warn",
                });
              }
            }}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">
            {tc("save")}
          </button>
        </>}>
        <p className="text-xs text-muted-foreground mb-4">{t("settingsNote")}</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            ["basic_pct", t("settings.basic")],
            ["house_rent_pct", t("settings.houseRent")],
            ["medical_pct", t("settings.medical")],
            ["conveyance_pct", t("settings.conveyance")],
            ["pf_pct", t("settings.pf")],
            ["tax_pct", t("settings.tax")],
            ["tax_threshold", t("settings.threshold")],
          ] as [keyof PayrollSettings, string][]).map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                type="number"
                step="0.01"
                value={draftSettings[key]}
                onChange={e => setDraftSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
              />
            </Field>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => { if (confirmDel) void crud.remove(confirmDel.id); }}
        title={t("deleteRun")}
        description={t("deleteRunBody")}
      />
    </AdminLayout>
  );
};
export default Payroll;

