"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle, Kpi } from "@/components/admin/ui";
import { Chips, Modal, Field, Input, Select } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { useConfirmAction } from "@/components/common/ConfirmProvider";
import { Users2, CalendarCheck2, AlertTriangle, Plane, X, Printer } from "lucide-react";
import { getEligibleEmployees } from "@/lib/payroll";
import type { EmployeeRow } from "@/redux/api/resources";
import type { Tables } from "@/lib/supabase/types";

type AttendanceRecord = Tables<"attendance_records"> & {
  employees?: { name: string; emp_id: string; department: string | null } | null;
};
type LeaveRequest = Tables<"leave_requests"> & {
  employees?: { name: string; emp_id: string; department: string | null } | null;
};
type Holiday = Tables<"holidays">;

type AttStatus = AttendanceRecord["status"];
type LeaveType = LeaveRequest["type"];

/**
 * Statuses are stored lowercase across every module; capitalised only here.
 *
 * "Weekend" and "Holiday" are not in this map because they are not stored.
 * A Friday is a Friday for everyone and a holiday is a row in `holidays`, so
 * both are derived when the sheet is drawn — see 0050.
 */
const ATT_STATUSES = ["present", "late", "absent", "leave", "half_day"] as const;
const LEAVE_TYPES = ["sick", "casual", "vacation", "maternity", "unpaid"] as const;
const LEAVE_STATUSES = ["pending", "approved", "rejected"] as const;

/** The words for those three, in the reader's language. */
const useAttendanceWords = () => {
  const t = useTranslations("admin.attendance");
  return {
    status: (s: AttStatus) => t(`statuses.${s}`),
    leave: (l: LeaveType) => t(`leaveTypes.${l}`),
    leaveStatus: (s: LeaveRequest["status"]) => t(`leaveStatuses.${s}`),
  };
};

/**
 * Entitlement per leave type, in days. Still a constant: it is the same for
 * every hospital until someone says otherwise, and making it configurable is a
 * settings screen rather than a column.
 */
const LEAVE_QUOTA: Record<LeaveType, number> = {
  sick: 14, casual: 10, vacation: 20, maternity: 90, unpaid: 30,
};

const SHIFT_START = "09:00";
const LATE_AFTER = "09:15";
const SHIFT_END = "17:00";

const todayISO = () => new Date().toISOString().slice(0, 10);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const monthDays = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => isoDate(new Date(y, m - 1, i + 1)));
};
const dayName = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US", { weekday: "short" });
/** Friday is the weekly day off here. */
const isWeekend = (iso: string) => new Date(iso).getDay() === 5;
const diffDays = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1);
const minutesBetween = (a: string, b: string) => {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return (bh * 60 + bm) - (ah * 60 + am);
};
const fmtHours = (mins: number) => `${Math.floor(mins / 60)}h ${mins % 60}m`;
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "—");

const statusTone = (s: AttStatus) =>
  s === "present" ? "ok" : s === "late" || s === "half_day" ? "warn" : s === "absent" ? "bad" : "info";

/** What a clock-in time means: on time, or late. */
const arrivalStatus = (checkIn: string): AttStatus =>
  minutesBetween(LATE_AFTER, checkIn) > 0 ? "late" : "present";

type Tab = "log" | "sheet" | "leave" | "holidays";

const Attendance = () => {
  const t = useTranslations("admin.attendance");
  const tc = useTranslations("common");
  const confirmAction = useConfirmAction();
  const locale = useLocale();
  const words = useAttendanceWords();
  const { push } = useNotifications();
  const staff = useResourceCrud<EmployeeRow>("employees");
  const attendance = useResourceCrud<AttendanceRecord>("attendance-records");
  const leaves = useResourceCrud<LeaveRequest>("leave-requests");
  const holidays = useResourceCrud<Holiday>("holidays");

  const [tab, setTab] = useState<Tab>("log");
  const [period, setPeriod] = useState<string>(() => todayISO().slice(0, 7));
  const [dept, setDept] = useState("All");
  const [q, setQ] = useState("");

  const [leaveModal, setLeaveModal] = useState(false);
  const [holidayModal, setHolidayModal] = useState(false);
  const [marking, setMarking] = useState<EmployeeRow | null>(null);

  // The month behind the sheet. The generic list endpoint filters by exact
  // match only, so a date range needs its own read.
  const [sheet, setSheet] = useState<{ records: AttendanceRecord[]; holidays: Holiday[] }>({ records: [], holidays: [] });
  const [sheetLoading, setSheetLoading] = useState(false);

  useEffect(() => {
    if (tab !== "sheet") return;
    let cancelled = false;
    const load = async () => {
      setSheetLoading(true);
      try {
        const res = await fetch(`/api/v1/attendance/sheet?period=${period}`);
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          push({ title: body?.error?.message || t("loadMonthFailed"), tone: "warn" });
          return;
        }
        setSheet(body.data);
      } finally {
        if (!cancelled) setSheetLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
    // push is stable; re-running on it would refetch the month on every toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, period]);

  const employees = useMemo(() => getEligibleEmployees(staff.items), [staff.items]);
  const departments = useMemo(
    () => ["All", ...Array.from(new Set(employees.map(e => e.department).filter(Boolean) as string[])).sort()],
    [employees],
  );

  const visibleStaff = employees.filter(e => {
    if (dept !== "All" && (e.department ?? "") !== dept) return false;
    if (!q) return true;
    const term = q.toLowerCase();
    return `${e.name} ${e.emp_id}`.toLowerCase().includes(term);
  });

  const today = todayISO();
  const todayByEmployee = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance.items.filter(r => r.work_date === today).forEach(r => map.set(r.employee_id, r));
    return map;
  }, [attendance.items, today]);

  const kpis = useMemo(() => {
    const marked = employees.map(e => todayByEmployee.get(e.id)?.status);
    return {
      total: employees.length,
      present: marked.filter(s => s === "present").length,
      late: marked.filter(s => s === "late").length,
      onLeave: marked.filter(s => s === "leave").length,
      absent: marked.filter(s => s === "absent").length,
    };
  }, [employees, todayByEmployee]);

  // ---- actions -------------------------------------------------------------

  const clockIn = async (employee: EmployeeRow) => {
    const now = new Date().toTimeString().slice(0, 5);
    const existing = todayByEmployee.get(employee.id);
    if (existing) { push({ title: t("alreadyMarked", { name: employee.name }), tone: "warn" }); return; }
    await attendance.create({
      employee_id: employee.id,
      work_date: today,
      check_in: now,
      status: arrivalStatus(now),
    } as never);
  };

  const clockOut = async (record: AttendanceRecord) => {
    const now = new Date().toTimeString().slice(0, 5);
    if (record.check_in && minutesBetween(record.check_in.slice(0, 5), now) <= 0) {
      // The table refuses this too; catching it here gives a sentence.
      push({ title: t("clockOutAfterIn"), tone: "warn" });
      return;
    }
    await attendance.update(record.id, { check_out: now } as never);
  };

  const markManually = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!marking) return;
    const fd = new FormData(e.currentTarget);
    const status = String(fd.get("status")) as AttStatus;
    const checkIn = String(fd.get("check_in") || "");
    const existing = todayByEmployee.get(marking.id);
    const body = {
      employee_id: marking.id,
      work_date: String(fd.get("work_date") || today),
      status,
      check_in: checkIn || null,
      check_out: String(fd.get("check_out") || "") || null,
      note: String(fd.get("note") || "") || null,
    };
    const saved = existing
      ? await attendance.update(existing.id, body as never)
      : await attendance.create(body as never);
    if (!saved) return;
    push({ title: t("markedToast", { name: marking.name, status: words.status(status) }), tone: "ok" });
    setMarking(null);
  };

  const decideLeave = async (leave: LeaveRequest, status: LeaveRequest["status"]) => {
    await leaves.update(leave.id, { status } as never);
    push({ title: t("leaveDecided", { status: words.leaveStatus(status) }), tone: status === "approved" ? "ok" : "info" });
  };

  // ---- monthly sheet -------------------------------------------------------

  const days = useMemo(() => monthDays(period), [period]);
  const holidayDates = useMemo(() => new Set(sheet.holidays.map(h => h.holiday_on)), [sheet.holidays]);

  /**
   * What a cell shows. Only recorded events come from the table; weekend and
   * holiday are worked out from the date, which is why they are not stored.
   */
  const cellFor = (employeeId: string, date: string) => {
    const record = sheet.records.find(r => r.employee_id === employeeId && r.work_date === date);
    if (record) return { char: record.status === "present" ? "P" : record.status === "late" ? "L" : record.status === "absent" ? "A" : record.status === "leave" ? "LV" : "½", tone: statusTone(record.status) };
    if (holidayDates.has(date)) return { char: "H", tone: "info" as const };
    if (isWeekend(date)) return { char: "W", tone: "default" as const };
    return { char: "·", tone: "default" as const };
  };

  const sheetRows = useMemo(() => visibleStaff.map(emp => {
    const mine = sheet.records.filter(r => r.employee_id === emp.id);
    return {
      emp,
      present: mine.filter(r => r.status === "present" || r.status === "late").length,
      absent: mine.filter(r => r.status === "absent").length,
      leave: mine.filter(r => r.status === "leave").length,
    };
  }), [visibleStaff, sheet.records]);

  const printSheet = () => {
    const w = window.open("", "_blank", "width=1200,height=900");
    if (!w) return;
    const rowsHtml = sheetRows.map(s => {
      const cells = days.map(d => {
        const { char } = cellFor(s.emp.id, d);
        const color = char === "A" ? "#ef4444" : char === "L" ? "#f59e0b" : char === "LV" ? "#3b82f6"
          : char === "H" ? "#8b5cf6" : char === "W" || char === "·" ? "#9ca3af" : "#10b981";
        return `<td style="text-align:center;color:${color};font-weight:600">${char}</td>`;
      }).join("");
      return `<tr><td>${s.emp.emp_id}</td><td>${s.emp.name}</td><td>${s.emp.department ?? ""}</td>${cells}<td><b>${s.present}</b></td><td>${s.absent}</td><td>${s.leave}</td></tr>`;
    }).join("");
    w.document.write(`<html lang="${locale}"><head><title>${t("print.title", { period })}</title>
      <style>body{font-family:system-ui;padding:24px}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:16px}th,td{border:1px solid #ddd;padding:4px 6px}th{background:#f3f4f6;text-align:left}.legend{margin-top:16px;font-size:11px;color:#555}</style>
      </head><body>
      <h1>${t("print.heading", { period })}</h1>
      <p style="color:#666;margin:0">${t("print.meta", { department: dept, count: sheetRows.length })}</p>
      <table><thead><tr><th>${t("columns.empId")}</th><th>${t("columns.name")}</th><th>${t("columns.dept")}</th>
        ${days.map(d => `<th style="text-align:center">${d.slice(8)}<br/><span style="font-weight:400;color:#888">${dayName(d, locale)[0]}</span></th>`).join("")}
        <th>${t("statuses.present")}</th><th>${t("statuses.absent")}</th><th>${t("statuses.leave")}</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>
      <p class="legend">${t("print.legend")}</p>
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    w.document.close();
  };

  const leaveBalance = useMemo(() => {
    const used = new Map<string, number>();
    leaves.items.filter(l => l.status === "approved").forEach(l => {
      const key = `${l.employee_id}:${l.type}`;
      used.set(key, (used.get(key) ?? 0) + diffDays(l.start_date, l.end_date));
    });
    return used;
  }, [leaves.items]);

  const loading = staff.isLoading || attendance.isLoading;

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Kpi icon={Users2} label={t("kpi.employees")} value={String(kpis.total)} tone="primary" />
        <Kpi icon={CalendarCheck2} label={t("kpi.presentToday")} value={String(kpis.present)} tone="accent" />
        <Kpi icon={AlertTriangle} label={t("kpi.lateToday")} value={String(kpis.late)} tone="chip" />
        <Kpi icon={Plane} label={t("kpi.onLeave")} value={String(kpis.onLeave)} tone="chip" />
        <Kpi icon={X} label={t("statuses.absent")} value={String(kpis.absent)} tone="destructive" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <Chips value={tab} onChange={setTab as never}
          options={[
            { value: "log", label: t("tabs.log") },
            { value: "sheet", label: t("tabs.sheet") },
            { value: "leave", label: t("tabs.leave") },
            { value: "holidays", label: t("tabs.holidays") },
          ]} />
        <div className="flex flex-wrap items-center gap-2">
          {(tab === "log" || tab === "sheet" || tab === "leave") && (
            <select value={dept} onChange={e => setDept(e.target.value)} aria-label={t("columns.dept")}
              className="bg-card border border-border rounded-full px-3 py-1.5 text-xs font-semibold">
              {departments.map(d => <option key={d} value={d}>{d === "All" ? t("allDepartments") : d}</option>)}
            </select>
          )}
          {tab === "sheet" && (
            <input type="month" value={period} onChange={e => setPeriod(e.target.value)} aria-label={t("month")}
              className="bg-card border border-border rounded-full px-3 py-1.5 text-xs font-semibold" />
          )}
          {(tab === "log" || tab === "leave") && (
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={tc("search")} aria-label={tc("search")}
              className="bg-card border border-border rounded-full px-3 py-1.5 text-xs w-44" />
          )}
        </div>
      </div>

      {tab === "log" && (
        <Card className="p-5">
          <SectionTitle title={t("todayIs", { date: new Date().toLocaleDateString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) })} />
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{tc("loading")}</p>
          ) : visibleStaff.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {employees.length === 0 ? t("noEmployees") : t("noMatch")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60 mt-3">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {[t("columns.employee"), t("columns.department"), t("columns.in"), t("columns.out"), t("columns.worked"), t("columns.status"), ""].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleStaff.map(emp => {
                    const rec = todayByEmployee.get(emp.id);
                    const worked = rec?.check_in && rec?.check_out
                      ? fmtHours(minutesBetween(rec.check_in.slice(0, 5), rec.check_out.slice(0, 5)))
                      : "—";
                    return (
                      <tr key={emp.id} className="border-t border-border/40 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-primary">{emp.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{emp.emp_id}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{emp.department ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{hhmm(rec?.check_in ?? null)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{hhmm(rec?.check_out ?? null)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{worked}</td>
                        <td className="px-4 py-3">
                          {rec ? <Pill tone={statusTone(rec.status)}>{words.status(rec.status)}</Pill>
                            : <span className="text-xs text-muted-foreground">{t("notRecorded")}</span>}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {!rec && <Btn variant="ghost" onClick={() => void clockIn(emp)}>{t("clockIn")}</Btn>}
                          {rec && !rec.check_out && rec.check_in && <Btn variant="ghost" onClick={() => void clockOut(rec)}>{t("clockOut")}</Btn>}
                          <Btn variant="ghost" onClick={() => setMarking(emp)}>{t("mark")}</Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">
            {t("shiftNote", { start: SHIFT_START, end: SHIFT_END, late: LATE_AFTER })}
          </p>
        </Card>
      )}

      {tab === "sheet" && (
        <Card className="p-5">
          <SectionTitle title={t("sheetTitle", { period })}
            action={<Btn variant="outline" onClick={printSheet}><span className="inline-flex items-center gap-1.5"><Printer className="h-4 w-4" /> {t("print.button")}</span></Btn>} />
          {sheetLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("loadingMonth")}</p>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="px-2 py-2 text-left sticky left-0 bg-muted/40">{t("columns.employee")}</th>
                    {days.map(d => (
                      <th key={d} className="px-1 py-2 text-center font-normal">
                        <div>{d.slice(8)}</div>
                        <div className="text-[9px] text-muted-foreground">{dayName(d, locale)[0]}</div>
                      </th>
                    ))}
                    <th className="px-2 py-2">P</th><th className="px-2 py-2">A</th><th className="px-2 py-2">LV</th>
                  </tr>
                </thead>
                <tbody>
                  {sheetRows.map(({ emp, present, absent, leave }) => (
                    <tr key={emp.id} className="border-t border-border/40">
                      <td className="px-2 py-2 whitespace-nowrap sticky left-0 bg-card">
                        <span className="font-semibold text-primary">{emp.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground ml-2">{emp.emp_id}</span>
                      </td>
                      {days.map(d => {
                        const { char } = cellFor(emp.id, d);
                        return <td key={d} className="px-1 py-2 text-center font-semibold">{char}</td>;
                      })}
                      <td className="px-2 py-2 text-center font-bold">{present}</td>
                      <td className="px-2 py-2 text-center">{absent}</td>
                      <td className="px-2 py-2 text-center">{leave}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">
            {t("sheetLegend")}
          </p>
        </Card>
      )}

      {tab === "leave" && (
        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle title={t("tabs.leave")} action={<Btn onClick={() => setLeaveModal(true)}>{t("requestLeave")}</Btn>} />
            {leaves.items.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("noLeaveRequests")}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/60 mt-3">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      {[t("columns.employee"), t("columns.type"), t("columns.from"), t("columns.to"), t("columns.days"), t("columns.reason"), t("columns.status"), ""].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.items.map(l => (
                      <tr key={l.id} className="border-t border-border/40">
                        <td className="px-4 py-3 font-semibold text-primary">{l.employees?.name ?? "—"}</td>
                        <td className="px-4 py-3">{words.leave(l.type)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{l.start_date}</td>
                        <td className="px-4 py-3 text-muted-foreground">{l.end_date}</td>
                        <td className="px-4 py-3">{diffDays(l.start_date, l.end_date)}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">{l.reason ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Pill tone={l.status === "approved" ? "ok" : l.status === "rejected" ? "bad" : "warn"}>
                            {words.leaveStatus(l.status)}
                          </Pill>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {l.status === "pending" && <>
                            <Btn variant="ghost" onClick={async () => { if (await confirmAction(t("approve"), { name: l.employees?.name })) void decideLeave(l, "approved"); }}>{t("approve")}</Btn>
                            <Btn variant="danger" onClick={async () => { if (await confirmAction(t("reject"), { name: l.employees?.name, danger: true })) void decideLeave(l, "rejected"); }}>{t("reject")}</Btn>
                          </>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle title={t("leaveBalance")} />
            <div className="overflow-x-auto rounded-lg border border-border/60 mt-3">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t("columns.employee")}</th>
                    {LEAVE_TYPES.map(type => (
                      <th key={type} className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                        {words.leave(type)} <span className="text-muted-foreground/60">/{LEAVE_QUOTA[type]}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleStaff.map(emp => (
                    <tr key={emp.id} className="border-t border-border/40">
                      <td className="px-4 py-3 font-semibold text-primary">{emp.name}</td>
                      {LEAVE_TYPES.map(type => {
                        const used = leaveBalance.get(`${emp.id}:${type}`) ?? 0;
                        return (
                          <td key={type} className="px-4 py-3">
                            <span className={used > LEAVE_QUOTA[type] ? "text-destructive font-semibold" : ""}>{used}</span>
                            <span className="text-muted-foreground"> / {LEAVE_QUOTA[type]}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "holidays" && (
        <Card className="p-5">
          <SectionTitle title={t("holidayCalendar")} action={<Btn onClick={() => setHolidayModal(true)}>{t("addHoliday")}</Btn>} />
          <p className="text-xs text-muted-foreground mt-1">{t("holidayNote")}</p>
          {holidays.items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("noHolidays")}</p>
          ) : (
            <div className="mt-4 space-y-2">
              {holidays.items.map(h => (
                <div key={h.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-chip/30">
                  <span className="font-mono text-xs text-muted-foreground">{h.holiday_on}</span>
                  <span className="font-semibold text-primary">{h.name}</span>
                  <Btn variant="danger" className="ml-auto" onClick={async () => { if (await confirmAction(tc("remove"), { name: h.name, danger: true })) void holidays.remove(h.id); }}>{tc("remove")}</Btn>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Mark attendance by hand */}
      <Modal open={!!marking} onClose={() => setMarking(null)} title={marking ? t("markFor", { name: marking.name }) : ""}
        footer={<>
          <Btn variant="outline" onClick={() => setMarking(null)}>{tc("cancel")}</Btn>
          <button form="mark-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">{tc("save")}</button>
        </>}>
        <form id="mark-form" onSubmit={markManually}>
          <Field label={t("fields.date")} required><Input name="work_date" type="date" required defaultValue={today} /></Field>
          <Field label={t("columns.status")} required>
            <Select name="status" required defaultValue={marking ? todayByEmployee.get(marking.id)?.status ?? "present" : "present"}>
              {ATT_STATUSES.map(s => (
                <option key={s} value={s}>{words.status(s)}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("clockIn")}><Input name="check_in" type="time" defaultValue={marking ? todayByEmployee.get(marking.id)?.check_in?.slice(0, 5) ?? "" : ""} /></Field>
          <Field label={t("clockOut")}><Input name="check_out" type="time" defaultValue={marking ? todayByEmployee.get(marking.id)?.check_out?.slice(0, 5) ?? "" : ""} /></Field>
          <Field label={t("fields.note")}><Input name="note" defaultValue={marking ? todayByEmployee.get(marking.id)?.note ?? "" : ""} /></Field>
        </form>
      </Modal>

      {/* Leave request */}
      <Modal open={leaveModal} onClose={() => setLeaveModal(false)} title={t("requestLeaveTitle")}
        footer={<>
          <Btn variant="outline" onClick={() => setLeaveModal(false)}>{tc("cancel")}</Btn>
          <button form="leave-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">{tc("submit")}</button>
        </>}>
        <form id="leave-form" onSubmit={async e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const created = await leaves.create({
            employee_id: String(fd.get("employee_id")),
            type: String(fd.get("type")) as LeaveType,
            start_date: String(fd.get("start_date")),
            end_date: String(fd.get("end_date")),
            reason: String(fd.get("reason") || "") || null,
          } as never);
          if (!created) return;
          push({ title: t("leaveRequested"), tone: "info" });
          setLeaveModal(false);
        }}>
          <Field label={t("columns.employee")} required>
            <Select name="employee_id" required>
              <option value="">{t("select")}</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} · {e.emp_id}</option>)}
            </Select>
          </Field>
          <Field label={t("columns.type")} required>
            <Select name="type" required>
              {LEAVE_TYPES.map(type => (
                <option key={type} value={type}>{t("leaveOption", { type: words.leave(type), days: LEAVE_QUOTA[type] })}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("columns.from")} required><Input name="start_date" type="date" required defaultValue={today} /></Field>
          <Field label={t("columns.to")} required><Input name="end_date" type="date" required defaultValue={today} /></Field>
          <Field label={t("columns.reason")}><Input name="reason" /></Field>
        </form>
      </Modal>

      {/* Holiday */}
      <Modal open={holidayModal} onClose={() => setHolidayModal(false)} title={t("addHolidayTitle")}
        footer={<>
          <Btn variant="outline" onClick={() => setHolidayModal(false)}>{tc("cancel")}</Btn>
          <button form="holiday-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">{tc("add")}</button>
        </>}>
        <form id="holiday-form" onSubmit={async e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const created = await holidays.create({
            holiday_on: String(fd.get("holiday_on")),
            name: String(fd.get("name") || "").trim(),
          } as never);
          if (!created) return;
          push({ title: t("holidayAdded"), tone: "ok" });
          setHolidayModal(false);
        }}>
          <Field label={t("fields.date")} required><Input name="holiday_on" type="date" required defaultValue={today} /></Field>
          <Field label={t("fields.name")} required><Input name="name" required placeholder={t("holidayPlaceholder")} /></Field>
        </form>
      </Modal>
    </AdminLayout>
  );
};

export default Attendance;
