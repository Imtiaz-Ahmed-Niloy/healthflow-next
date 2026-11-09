"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle, Kpi } from "@/components/admin/ui";
import { Chips, Modal, Field, Input, Select, exportCSV } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { useConfirmAction } from "@/components/common/ConfirmProvider";
import {
  Users2, CalendarCheck2, AlertTriangle, Plane, X, Printer,
  Upload, Download, Clock, CheckCircle2, FileSpreadsheet,
  PhoneCall, ShieldAlert, Check,
} from "lucide-react";
import { getEligibleEmployees } from "@/lib/payroll";
import type { EmployeeRow } from "@/redux/api/resources";
import type { Tables } from "@/lib/supabase/types";
import { DateInput } from "@/components/ui/date-input";

type AttendanceRecord = Tables<"attendance_records"> & {
  employees?: { name: string; emp_id: string; department: string | null } | null;
};
type LeaveRequest = Tables<"leave_requests"> & {
  employees?: { name: string; emp_id: string; department: string | null } | null;
};
type Holiday = Tables<"holidays">;

type DutyRoster = {
  id: string;
  employee_id: string;
  department?: string | null;
  shift_name: "Morning" | "Evening" | "Night" | "General" | "On-Call" | "Emergency";
  shift_date: string;
  start_time: string;
  end_time: string;
  ward_or_unit?: string | null;
  is_on_call: boolean;
};

type AttStatus = AttendanceRecord["status"];
type LeaveType = LeaveRequest["type"];

const ATT_STATUSES = ["present", "late", "absent", "leave", "half_day"] as const;
const LEAVE_TYPES = ["sick", "casual", "vacation", "maternity", "unpaid"] as const;
const LEAVE_STATUSES = ["pending", "approved", "rejected"] as const;

const useAttendanceWords = () => {
  const t = useTranslations("admin.attendance");
  return {
    status: (s: AttStatus) => t(`statuses.${s}`),
    leave: (l: LeaveType) => t(`leaveTypes.${l}`),
    leaveStatus: (s: LeaveRequest["status"]) => t(`leaveStatuses.${s}`),
  };
};

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
const isWeekend = (iso: string) => new Date(iso).getDay() === 5; // Friday is weekend in BD
const diffDays = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1);
const minutesBetween = (a: string, b: string) => {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return (bh * 60 + bm) - (ah * 60 + am);
};
const addMinutesToTime = (timeStr: string, mins: number) => {
  const [h, m] = timeStr.split(":").map(Number);
  const total = (h * 60 + m + mins + 1440) % 1440;
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
};
const fmtHours = (mins: number) => `${Math.floor(mins / 60)}h ${mins % 60}m`;
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "—");

const statusTone = (s: AttStatus) =>
  s === "present" ? "ok" : s === "late" || s === "half_day" ? "warn" : s === "absent" ? "bad" : "info";

const calcHoursAndOvertime = (checkIn: string | null, checkOut: string | null) => {
  if (!checkIn || !checkOut) return { workedMins: 0, regularMins: 0, otMins: 0, workedText: "—", otText: "" };
  let workedMins = minutesBetween(checkIn.slice(0, 5), checkOut.slice(0, 5));
  if (workedMins < 0) workedMins += 1440; // overnight night shift
  if (workedMins <= 0) return { workedMins: 0, regularMins: 0, otMins: 0, workedText: "—", otText: "" };

  const regularMins = Math.min(workedMins, 480); // 8-hour standard shift
  const otMins = Math.max(0, workedMins - 480);
  const workedText = fmtHours(workedMins);
  const otText = otMins > 0 ? `+${fmtHours(otMins)} OT` : "";
  return { workedMins, regularMins, otMins, workedText, otText };
};

type Tab = "log" | "sheet" | "leave" | "holidays";

const Attendance = () => {
  const t = useTranslations("admin.attendance");
  const tc = useTranslations("common");
  const confirmAction = useConfirmAction();
  const locale = useLocale();
  const words = useAttendanceWords();
  const { push } = useNotifications();

  // Crud hooks
  const staff = useResourceCrud<EmployeeRow>("employees");
  const attendance = useResourceCrud<AttendanceRecord>("attendance-records");
  const leaves = useResourceCrud<LeaveRequest>("leave-requests");
  const holidays = useResourceCrud<Holiday>("holidays");
  const dutyRosters = useResourceCrud<DutyRoster>("duty-rosters");

  const [tab, setTab] = useState<Tab>("log");
  const [period, setPeriod] = useState<string>(() => todayISO().slice(0, 7));
  const [dept, setDept] = useState("All");
  const [q, setQ] = useState("");

  // Modals & Selection states
  const [leaveModal, setLeaveModal] = useState(false);
  const [holidayModal, setHolidayModal] = useState(false);
  const [marking, setMarking] = useState<EmployeeRow | null>(null);
  const [printMasterModal, setPrintMasterModal] = useState(false);
  const [biometricModal, setBiometricModal] = useState(false);
  const [biometricInput, setBiometricInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [bulkActing, setBulkActing] = useState(false);

  // Month sheet state
  const [sheet, setSheet] = useState<{ records: AttendanceRecord[]; holidays: Holiday[] }>({ records: [], holidays: [] });
  const [sheetLoading, setSheetLoading] = useState(false);

  const today = todayISO();

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

  const todayByEmployee = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance.items.filter(r => r.work_date === today).forEach(r => map.set(r.employee_id, r));
    return map;
  }, [attendance.items, today]);

  // Today's Rosters by Employee
  const todayRostersByEmployee = useMemo(() => {
    const map = new Map<string, DutyRoster>();
    dutyRosters.items.filter(r => r.shift_date === today).forEach(r => map.set(r.employee_id, r));
    return map;
  }, [dutyRosters.items, today]);

  // Monthly Lateness Counter per employee (for frequent tardiness alerts)
  const monthlyLateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    sheet.records.filter(r => r.status === "late").forEach(r => {
      counts.set(r.employee_id, (counts.get(r.employee_id) ?? 0) + 1);
    });
    return counts;
  }, [sheet.records]);

  const kpis = useMemo(() => {
    const marked = employees.map(e => todayByEmployee.get(e.id)?.status);
    return {
      total: employees.length,
      present: marked.filter(s => s === "present").length,
      late: marked.filter(s => s === "late").length,
      onLeave: marked.filter(s => s === "leave").length,
      absent: marked.filter(s => s === "absent").length,
      rosteredToday: employees.filter(e => todayRostersByEmployee.has(e.id)).length,
    };
  }, [employees, todayByEmployee, todayRostersByEmployee]);

  /** Shift-Aware Punctuality Engine: compares check-in against actual roster shift */
  const getArrivalStatus = (checkIn: string, empId: string): AttStatus => {
    const roster = todayRostersByEmployee.get(empId);
    const expectedStart = roster?.start_time || SHIFT_START;
    const lateCutoff = addMinutesToTime(expectedStart, 15); // 15-minute grace period
    return minutesBetween(lateCutoff, checkIn) > 0 ? "late" : "present";
  };

  // ---- Actions -------------------------------------------------------------

  const clockIn = async (employee: EmployeeRow) => {
    const now = new Date().toTimeString().slice(0, 5);
    const existing = todayByEmployee.get(employee.id);
    if (existing) { push({ title: t("alreadyMarked", { name: employee.name }), tone: "warn" }); return; }

    const roster = todayRostersByEmployee.get(employee.id);
    const status = getArrivalStatus(now, employee.id);

    await attendance.create({
      employee_id: employee.id,
      work_date: today,
      check_in: now,
      status,
      note: roster ? `${roster.shift_name} Shift (${roster.ward_or_unit || "Clinical Unit"})` : undefined,
    } as never);
    push({ title: `${employee.name} clocked in at ${now} (${words.status(status)})`, tone: status === "present" ? "ok" : "warn" });
  };

  const clockOut = async (record: AttendanceRecord) => {
    const now = new Date().toTimeString().slice(0, 5);
    if (record.check_in && minutesBetween(record.check_in.slice(0, 5), now) <= 0) {
      push({ title: t("clockOutAfterIn"), tone: "warn" });
      return;
    }
    await attendance.update(record.id, { check_out: now } as never);
    push({ title: `Clocked out at ${now}`, tone: "info" });
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

  // 1-Click Roll Call: Mark all rostered staff present
  const markAllRosteredPresent = async () => {
    const todayRosters = dutyRosters.items.filter(r => r.shift_date === today);
    const unclocked = todayRosters.filter(r => !todayByEmployee.has(r.employee_id));

    if (unclocked.length === 0) {
      push({ title: "All clinical staff scheduled for today are already clocked in!", tone: "info" });
      return;
    }

    setBulkActing(true);
    let count = 0;
    try {
      for (const r of unclocked) {
        await attendance.create({
          employee_id: r.employee_id,
          work_date: today,
          check_in: r.start_time,
          status: "present",
          note: `Auto-clocked: Rostered ${r.shift_name} on ${r.ward_or_unit || "Duty"}`,
        } as never);
        count++;
      }
      push({ title: `Successfully marked ${count} rostered clinical staff present!`, tone: "ok" });
    } catch {
      push({ title: "Failed to mark all rostered staff", tone: "warn" });
    } finally {
      setBulkActing(false);
    }
  };

  // Multi-select bulk actions
  const handleBulkMarkStatus = async (targetStatus: AttStatus) => {
    if (selectedStaffIds.length === 0) return;
    setBulkActing(true);
    let count = 0;
    try {
      const now = new Date().toTimeString().slice(0, 5);
      for (const empId of selectedStaffIds) {
        const existing = todayByEmployee.get(empId);
        if (existing) {
          await attendance.update(existing.id, {
            status: targetStatus,
            check_in: targetStatus === "present" || targetStatus === "late" ? (existing.check_in || now) : existing.check_in,
          } as never);
        } else {
          await attendance.create({
            employee_id: empId,
            work_date: today,
            status: targetStatus,
            check_in: targetStatus === "present" || targetStatus === "late" ? now : null,
          } as never);
        }
        count++;
      }
      push({ title: `Bulk updated ${count} staff members as ${words.status(targetStatus)}`, tone: "ok" });
      setSelectedStaffIds([]);
    } catch {
      push({ title: "Bulk action failed", tone: "warn" });
    } finally {
      setBulkActing(false);
    }
  };

  // Automated Leave Sync: Approving leave writes attendance records for all leave dates
  const decideLeave = async (leave: LeaveRequest, status: LeaveRequest["status"]) => {
    await leaves.update(leave.id, { status } as never);

    if (status === "approved") {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      const curr = new Date(start);
      let count = 0;

      while (curr <= end) {
        const dateStr = curr.toISOString().slice(0, 10);
        const existing = attendance.items.find(r => r.employee_id === leave.employee_id && r.work_date === dateStr);
        if (existing) {
          await attendance.update(existing.id, {
            status: "leave",
            note: `${words.leave(leave.type)} Leave Approved`,
          } as never);
        } else {
          await attendance.create({
            employee_id: leave.employee_id,
            work_date: dateStr,
            status: "leave",
            note: `${words.leave(leave.type)} Leave Approved`,
          } as never);
        }
        count++;
        curr.setDate(curr.getDate() + 1);
      }
      push({
        title: `${words.leaveStatus(status)}: ${count} days recorded on the attendance sheet`,
        tone: "ok",
      });
    } else {
      push({ title: t("leaveDecided", { status: words.leaveStatus(status) }), tone: "info" });
    }
  };

  // Biometric CSV Import Handler
  const handleImportBiometric = async () => {
    if (!biometricInput.trim()) {
      push({ title: "Please paste attendance machine logs first", tone: "warn" });
      return;
    }

    setImporting(true);
    let successCount = 0;
    try {
      const lines = biometricInput.split("\n").map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        // Expected format: emp_id, date, in_time, out_time (comma, tab, or semicolon separated)
        const parts = line.split(/[,\t;]/).map(p => p.trim());
        if (parts.length < 3) continue;

        const [empIdRaw, dateRaw, inRaw, outRaw] = parts;
        const matchedEmp = staff.items.find(s => s.emp_id?.trim().toLowerCase() === empIdRaw.toLowerCase());
        if (!matchedEmp) continue;

        const dateFormatted = dateRaw.length === 10 ? dateRaw : today;
        const inTime = inRaw ? inRaw.slice(0, 5) : null;
        const outTime = outRaw ? outRaw.slice(0, 5) : null;
        const status = inTime ? getArrivalStatus(inTime, matchedEmp.id) : "absent";

        const existing = attendance.items.find(r => r.employee_id === matchedEmp.id && r.work_date === dateFormatted);
        if (existing) {
          await attendance.update(existing.id, {
            check_in: inTime,
            check_out: outTime,
            status,
            note: "Biometric Punch Device Sync",
          } as never);
        } else {
          await attendance.create({
            employee_id: matchedEmp.id,
            work_date: dateFormatted,
            check_in: inTime,
            check_out: outTime,
            status,
            note: "Biometric Punch Device Sync",
          } as never);
        }
        successCount++;
      }
      push({ title: `Successfully imported ${successCount} attendance records from machine logs!`, tone: "ok" });
      setBiometricModal(false);
      setBiometricInput("");
    } catch {
      push({ title: "Failed to parse biometric records", tone: "warn" });
    } finally {
      setImporting(false);
    }
  };

  // ---- Monthly Sheet Calculations -------------------------------------------

  const days = useMemo(() => monthDays(period), [period]);
  const holidayDates = useMemo(() => new Set(sheet.holidays.map(h => h.holiday_on)), [sheet.holidays]);

  const cellFor = (employeeId: string, date: string) => {
    const record = sheet.records.find(r => r.employee_id === employeeId && r.work_date === date);
    if (record) {
      return {
        char: record.status === "present" ? "P" : record.status === "late" ? "L" : record.status === "absent" ? "A" : record.status === "leave" ? "LV" : "½",
        tone: statusTone(record.status),
      };
    }
    if (holidayDates.has(date)) return { char: "H", tone: "info" as const };
    if (isWeekend(date)) return { char: "W", tone: "default" as const };
    return { char: "·", tone: "default" as const };
  };

  const sheetRows = useMemo(() => visibleStaff.map(emp => {
    const mine = sheet.records.filter(r => r.employee_id === emp.id);
    let totalWorkedMins = 0;
    let totalOtMins = 0;

    mine.forEach(r => {
      if (r.check_in && r.check_out) {
        const { workedMins, otMins } = calcHoursAndOvertime(r.check_in, r.check_out);
        totalWorkedMins += workedMins;
        totalOtMins += otMins;
      }
    });

    const lates = mine.filter(r => r.status === "late").length;

    return {
      emp,
      present: mine.filter(r => r.status === "present" || r.status === "late").length,
      absent: mine.filter(r => r.status === "absent").length,
      late: lates,
      leave: mine.filter(r => r.status === "leave").length,
      halfDay: mine.filter(r => r.status === "half_day").length,
      totalHoursText: fmtHours(totalWorkedMins),
      otHoursText: fmtHours(totalOtMins),
      totalOtMins,
      isFrequentlyLate: lates >= 3,
    };
  }), [visibleStaff, sheet.records]);

  // Export Monthly Sheet to CSV for Accounts & Payroll
  const handleExportMonthCSV = () => {
    const exportData = sheetRows.map(r => ({
      "Employee ID": r.emp.emp_id || "—",
      "Full Name": r.emp.name,
      "Department": r.emp.department || "General",
      "Present Days": r.present,
      "Late Days": r.late,
      "Absent Days": r.absent,
      "Approved Leaves": r.leave,
      "Half Days": r.halfDay,
      "Total Worked Hours": r.totalHoursText,
      "Total Overtime (OT)": r.otHoursText,
    }));
    exportCSV(exportData as unknown as Record<string, unknown>[], `attendance-summary-${period}`);
    push({ title: `Exported attendance summary for ${period}`, tone: "ok" });
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
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Kpi icon={Users2} label={t("kpi.employees")} value={String(kpis.total)} tone="primary" />
        <Kpi icon={CalendarCheck2} label={t("kpi.presentToday")} value={String(kpis.present)} tone="ok" />
        <Kpi icon={AlertTriangle} label={t("kpi.lateToday")} value={String(kpis.late)} tone="chip" />
        <Kpi icon={Plane} label={t("kpi.onLeave")} value={String(kpis.onLeave)} tone="chip" />
        <Kpi icon={X} label={t("statuses.absent")} value={String(kpis.absent)} tone="destructive" />
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <Chips
          value={tab}
          onChange={setTab as never}
          options={[
            { value: "log", label: t("tabs.log") },
            { value: "sheet", label: t("tabs.sheet") },
            { value: "leave", label: t("tabs.leave") },
            { value: "holidays", label: t("tabs.holidays") },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          {tab === "log" && (
            <>
              {/* Roll Call Button */}
              <Btn
                variant="outline"
                className="text-xs px-3 py-1.5 flex items-center gap-1.5 font-bold"
                onClick={markAllRosteredPresent}
                disabled={bulkActing}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Mark Scheduled Present ({kpis.rosteredToday})</span>
              </Btn>

              {/* Biometric Sync */}
              <Btn
                variant="outline"
                className="text-xs px-3 py-1.5 flex items-center gap-1.5"
                onClick={() => setBiometricModal(true)}
              >
                <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Import Biometric Log</span>
              </Btn>
            </>
          )}

          {tab === "sheet" && (
            <>
              <Btn
                variant="outline"
                className="text-xs px-3 py-1.5 flex items-center gap-1.5 font-bold"
                onClick={handleExportMonthCSV}
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Export Payroll CSV</span>
              </Btn>
              <Btn
                variant="outline"
                className="text-xs px-3 py-1.5 flex items-center gap-1.5 font-bold"
                onClick={() => setPrintMasterModal(true)}
              >
                <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Print Master Sheet</span>
              </Btn>
            </>
          )}

          {(tab === "log" || tab === "sheet" || tab === "leave") && (
            <select
              value={dept}
              onChange={e => setDept(e.target.value)}
              aria-label={t("columns.dept")}
              className="bg-card border border-border rounded-full px-3 py-1.5 text-xs font-semibold"
            >
              {departments.map(d => (
                <option key={d} value={d}>
                  {d === "All" ? t("allDepartments") : d}
                </option>
              ))}
            </select>
          )}
          {tab === "sheet" && (
            <input
              type="month"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              aria-label={t("month")}
              className="bg-card border border-border rounded-full px-3 py-1.5 text-xs font-semibold"
            >
            </input>
          )}
          {(tab === "log" || tab === "leave") && (
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={tc("search")}
              aria-label={tc("search")}
              className="bg-card border border-border rounded-full px-3 py-1.5 text-xs w-44"
            />
          )}
        </div>
      </div>

      {/* TAB 1: TODAY'S LOG */}
      {tab === "log" && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <SectionTitle
              title={t("todayIs", {
                date: new Date().toLocaleDateString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
              })}
            />

            {/* Bulk Selection Floating Action Bar */}
            {selectedStaffIds.length > 0 && (
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-xl text-xs">
                <span className="font-bold text-primary">{selectedStaffIds.length} staff selected:</span>
                <button
                  type="button"
                  onClick={() => handleBulkMarkStatus("present")}
                  className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-semibold hover:opacity-90"
                >
                  Mark Present
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkMarkStatus("absent")}
                  className="px-2 py-0.5 rounded bg-destructive text-destructive-foreground font-semibold hover:opacity-90"
                >
                  Mark Absent
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStaffIds([])}
                  className="text-muted-foreground hover:text-foreground text-[11px] underline"
                >
                  Deselect
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{tc("loading")}</p>
          ) : visibleStaff.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {employees.length === 0 ? t("noEmployees") : t("noMatch")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.length > 0 && selectedStaffIds.length === visibleStaff.length}
                        onChange={e => {
                          if (e.target.checked) setSelectedStaffIds(visibleStaff.map(s => s.id));
                          else setSelectedStaffIds([]);
                        }}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t("columns.employee")}</th>
                    <th className="px-3 py-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Scheduled Shift & Ward</th>
                    <th className="px-3 py-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t("columns.in")}</th>
                    <th className="px-3 py-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t("columns.out")}</th>
                    <th className="px-3 py-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t("columns.worked")} & OT</th>
                    <th className="px-3 py-3 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t("columns.status")}</th>
                    <th className="px-3 py-3 text-right text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {visibleStaff.map(emp => {
                    const rec = todayByEmployee.get(emp.id);
                    const roster = todayRostersByEmployee.get(emp.id);
                    const { workedText, otText, otMins } = calcHoursAndOvertime(rec?.check_in ?? null, rec?.check_out ?? null);
                    const isSelected = selectedStaffIds.includes(emp.id);

                    return (
                      <tr key={emp.id} className={`hover:bg-muted/20 ${isSelected ? "bg-primary/[0.04]" : ""}`}>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) setSelectedStaffIds(prev => [...prev, emp.id]);
                              else setSelectedStaffIds(prev => prev.filter(id => id !== emp.id));
                            }}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-primary">{emp.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{emp.emp_id}</div>
                        </td>
                        <td className="px-3 py-3">
                          {roster ? (
                            <div>
                              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  roster.shift_name === "Night"
                                    ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                                    : roster.shift_name === "Evening"
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                    : "bg-primary/15 text-primary"
                                }`}>
                                  {roster.shift_name}
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {roster.start_time}-{roster.end_time}
                                </span>
                              </div>
                              {roster.ward_or_unit && (
                                <div className="text-[11px] text-primary font-medium mt-0.5">
                                  {roster.ward_or_unit}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">General (09:00–17:00)</span>
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs">{hhmm(rec?.check_in ?? null)}</td>
                        <td className="px-3 py-3 font-mono text-xs">{hhmm(rec?.check_out ?? null)}</td>
                        <td className="px-3 py-3 font-mono text-xs">
                          <div className="font-semibold">{workedText}</div>
                          {otMins > 0 && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 mt-0.5">
                              {otText}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {rec ? (
                            <Pill tone={statusTone(rec.status)}>{words.status(rec.status)}</Pill>
                          ) : (
                            <span className="text-xs text-muted-foreground">{t("notRecorded")}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap space-x-1">
                          {!rec && (
                            <Btn variant="primary" className="text-xs px-2.5 py-1" onClick={() => void clockIn(emp)}>
                              {t("clockIn")}
                            </Btn>
                          )}
                          {rec && !rec.check_out && rec.check_in && (
                            <Btn variant="outline" className="text-xs px-2.5 py-1" onClick={() => void clockOut(rec)}>
                              {t("clockOut")}
                            </Btn>
                          )}
                          <Btn variant="ghost" className="text-xs px-2.5 py-1" onClick={() => setMarking(emp)}>
                            {t("mark")}
                          </Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">
            💡 Clinical staff are evaluated against their assigned <strong>Duty Roster shift</strong> with a 15-minute grace period. Non-rostered staff default to standard 09:00–17:00 shift.
          </p>
        </Card>
      )}

      {/* TAB 2: MONTHLY SHEET */}
      {tab === "sheet" && (
        <Card className="p-5 space-y-4">
          <SectionTitle
            title={t("sheetTitle", { period })}
            action={
              <div className="flex items-center gap-2">
                <Btn variant="outline" onClick={handleExportMonthCSV} className="text-xs">
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
                </Btn>
                <Btn variant="primary" onClick={() => setPrintMasterModal(true)} className="text-xs">
                  <Printer className="h-3.5 w-3.5 mr-1.5" /> {t("print.button")}
                </Btn>
              </div>
            }
          />

          {sheetLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("loadingMonth")}</p>
          ) : (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="text-xs border-collapse w-full min-w-[850px]">
                <thead>
                  <tr className="bg-muted/60 text-foreground font-bold border-b border-border">
                    <th className="px-3 py-2.5 text-left sticky left-0 bg-muted/95 backdrop-blur z-10 w-[200px]">
                      {t("columns.employee")}
                    </th>
                    {days.map(d => (
                      <th key={d} className="px-1 py-2 text-center font-normal min-w-[28px] border-r border-border/60">
                        <div className="font-bold">{d.slice(8)}</div>
                        <div className="text-[9px] text-muted-foreground">{dayName(d, locale)[0]}</div>
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center bg-muted/80">P</th>
                    <th className="px-2 py-2 text-center bg-muted/80">L</th>
                    <th className="px-2 py-2 text-center bg-muted/80">A</th>
                    <th className="px-2 py-2 text-center bg-muted/80">LV</th>
                    <th className="px-2 py-2 text-center bg-muted/80">Total Worked</th>
                    <th className="px-2 py-2 text-center bg-muted/80">OT Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sheetRows.map(({ emp, present, late, absent, leave, totalHoursText, otHoursText, isFrequentlyLate }) => (
                    <tr key={emp.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 whitespace-nowrap sticky left-0 bg-card border-r border-border z-10">
                        <div className="font-semibold text-primary text-xs flex items-center gap-1.5">
                          <span>{emp.name}</span>
                          {isFrequentlyLate && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300" title="3+ late clock-ins this month">
                              ⚠️ {late} Lates
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">{emp.emp_id}</div>
                      </td>
                      {days.map(d => {
                        const { char } = cellFor(emp.id, d);
                        const isA = char === "A";
                        const isL = char === "L";
                        const isP = char === "P";
                        const isLV = char === "LV";
                        const isH = char === "H";
                        const isW = char === "W";

                        return (
                          <td
                            key={d}
                            className={`px-1 py-2 text-center font-bold border-r border-border/40 ${
                              isA ? "text-destructive" : isL ? "text-amber-600" : isP ? "text-emerald-600" : isLV ? "text-blue-600" : isH ? "text-purple-600" : "text-muted-foreground/60"
                            }`}
                          >
                            {char}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-bold text-emerald-600">{present}</td>
                      <td className="px-2 py-2 text-center font-semibold text-amber-600">{late}</td>
                      <td className="px-2 py-2 text-center font-semibold text-destructive">{absent}</td>
                      <td className="px-2 py-2 text-center font-semibold text-blue-600">{leave}</td>
                      <td className="px-2 py-2 text-center font-mono font-medium">{totalHoursText}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-amber-700 dark:text-amber-400">{otHoursText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">
            {t("sheetLegend")} · OT: Overtime hours beyond standard 8h shifts.
          </p>
        </Card>
      )}

      {/* TAB 3: LEAVE REQUESTS */}
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
                  <tbody className="divide-y divide-border/40">
                    {leaves.items.map(l => (
                      <tr key={l.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-semibold text-primary">{l.employees?.name ?? "—"}</td>
                        <td className="px-4 py-3 font-medium">{words.leave(l.type)}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{l.start_date}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{l.end_date}</td>
                        <td className="px-4 py-3 font-bold">{diffDays(l.start_date, l.end_date)}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">{l.reason ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Pill tone={l.status === "approved" ? "ok" : l.status === "rejected" ? "bad" : "warn"}>
                            {words.leaveStatus(l.status)}
                          </Pill>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                          {l.status === "pending" && (
                            <>
                              <Btn
                                variant="primary"
                                className="text-xs px-3 py-1"
                                onClick={async () => {
                                  if (await confirmAction("Approve leave and auto-record on attendance sheet?", { name: l.employees?.name })) {
                                    void decideLeave(l, "approved");
                                  }
                                }}
                              >
                                {t("approve")}
                              </Btn>
                              <Btn
                                variant="danger"
                                className="text-xs px-3 py-1"
                                onClick={async () => {
                                  if (await confirmAction(t("reject"), { name: l.employees?.name, danger: true })) {
                                    void decideLeave(l, "rejected");
                                  }
                                }}
                              >
                                {t("reject")}
                              </Btn>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Leave Entitlement Quota */}
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
                <tbody className="divide-y divide-border/40">
                  {visibleStaff.map(emp => (
                    <tr key={emp.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-semibold text-primary">{emp.name}</td>
                      {LEAVE_TYPES.map(type => {
                        const used = leaveBalance.get(`${emp.id}:${type}`) ?? 0;
                        return (
                          <td key={type} className="px-4 py-3 font-mono text-xs">
                            <span className={used > LEAVE_QUOTA[type] ? "text-destructive font-bold" : "font-semibold"}>{used}</span>
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

      {/* TAB 4: HOLIDAYS */}
      {tab === "holidays" && (
        <Card className="p-5">
          <SectionTitle title={t("holidayCalendar")} action={<Btn onClick={() => setHolidayModal(true)}>{t("addHoliday")}</Btn>} />
          <p className="text-xs text-muted-foreground mt-1">{t("holidayNote")}</p>
          {holidays.items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("noHolidays")}</p>
          ) : (
            <div className="mt-4 space-y-2">
              {holidays.items.map(h => (
                <div key={h.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-chip/30 border border-border/50">
                  <span className="font-mono text-xs text-primary font-bold">{h.holiday_on}</span>
                  <span className="font-semibold text-foreground">{h.name}</span>
                  <Btn
                    variant="danger"
                    className="ml-auto text-xs px-3 py-1"
                    onClick={async () => {
                      if (await confirmAction(tc("remove"), { name: h.name, danger: true })) {
                        void holidays.remove(h.id);
                      }
                    }}
                  >
                    {tc("remove")}
                  </Btn>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* MODAL: MARK ATTENDANCE BY HAND */}
      <Modal open={!!marking} onClose={() => setMarking(null)} title={marking ? t("markFor", { name: marking.name }) : ""}
        footer={<>
          <Btn variant="outline" onClick={() => setMarking(null)}>{tc("cancel")}</Btn>
          <button form="mark-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">{tc("save")}</button>
        </>}>
        <form id="mark-form" onSubmit={markManually}>
          <Field label={t("fields.date")} required><DateInput name="work_date" required defaultValue={today} /></Field>
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

      {/* MODAL: BIOMETRIC PUNCH LOG IMPORT */}
      <Modal open={biometricModal} onClose={() => setBiometricModal(false)} title="Import Biometric Punch Device Logs">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Paste machine punch log rows (CSV format: <span className="font-mono text-primary font-bold">EMP_ID, DATE, IN_TIME, OUT_TIME</span>).
          </p>

          <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs font-mono space-y-1">
            <div className="font-bold text-foreground">Example Log Data:</div>
            <div>EMP-101, {today}, 08:02, 16:30</div>
            <div>EMP-102, {today}, 07:55, 17:15</div>
            <div>EMP-103, {today}, 14:00, 20:20</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Raw Punch Logs (or CSV text):
            </label>
            <textarea
              rows={6}
              value={biometricInput}
              onChange={e => setBiometricInput(e.target.value)}
              placeholder="Paste comma or tab-separated lines from attendance machine..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-xs font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Btn variant="outline" onClick={() => setBiometricModal(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleImportBiometric} disabled={importing}>
              {importing ? "Importing Records..." : "Process & Import Logs"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* MODAL: OFFICIAL NOTICE BOARD MASTER SHEET PRINTOUT */}
      <Modal open={printMasterModal} onClose={() => setPrintMasterModal(false)} title="Official Hospital Master Attendance Sheet">
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-muted/40 p-3 rounded-xl border border-border">
            <div>
              <div className="font-bold text-sm text-foreground">A4 Notice Board Master Attendance Sheet</div>
              <div className="text-xs text-muted-foreground">
                Official hospital layout with full month attendance codes, OT hours, and verification signatures.
              </div>
            </div>
            <Btn variant="primary" className="flex items-center gap-1.5" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Document
            </Btn>
          </div>

          {/* Printable Sheet */}
          <div className="p-6 bg-white text-slate-900 border border-slate-300 rounded-lg shadow-sm space-y-4 text-xs font-sans print:border-none print:shadow-none print:p-0">
            <div className="text-center border-b border-slate-300 pb-3">
              <h2 className="text-lg font-black tracking-wide uppercase text-slate-900">
                OFFICIAL HOSPITAL MASTER ATTENDANCE & OVERTIME SHEET
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Period: {period} · Department: {dept === "All" ? "All Departments" : dept} · Total Staff: {sheetRows.length}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Hospital Reference: ATT-MSTR-{period} · Certified on: {today}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-1.5 border-r border-slate-300 font-bold w-[140px]">Staff Member</th>
                    <th className="p-1.5 border-r border-slate-300 font-bold w-[70px]">Dept</th>
                    {days.map(d => (
                      <th key={d} className="p-1 text-center border-r border-slate-300 last:border-r-0 font-bold min-w-[20px]">
                        <div>{d.slice(8)}</div>
                        <div className="text-[8px] text-slate-500 font-normal">{dayName(d, locale)[0]}</div>
                      </th>
                    ))}
                    <th className="p-1 text-center border-r border-slate-300 font-bold">P</th>
                    <th className="p-1 text-center border-r border-slate-300 font-bold">L</th>
                    <th className="p-1 text-center border-r border-slate-300 font-bold">A</th>
                    <th className="p-1 text-center border-r border-slate-300 font-bold">LV</th>
                    <th className="p-1 text-center font-bold">OT</th>
                  </tr>
                </thead>
                <tbody>
                  {sheetRows.map(r => (
                    <tr key={r.emp.id} className="border-b border-slate-200">
                      <td className="p-1.5 border-r border-slate-300">
                        <div className="font-bold text-slate-900">{r.emp.name}</div>
                        <div className="text-[9px] text-slate-500 font-mono">{r.emp.emp_id}</div>
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-slate-700">{r.emp.department || "—"}</td>
                      {days.map(d => {
                        const { char } = cellFor(r.emp.id, d);
                        return (
                          <td key={d} className="p-0.5 text-center border-r border-slate-300 last:border-r-0 font-bold">
                            {char}
                          </td>
                        );
                      })}
                      <td className="p-1 text-center border-r border-slate-300 font-bold text-emerald-700">{r.present}</td>
                      <td className="p-1 text-center border-r border-slate-300 font-bold text-amber-700">{r.late}</td>
                      <td className="p-1 text-center border-r border-slate-300 font-bold text-red-700">{r.absent}</td>
                      <td className="p-1 text-center border-r border-slate-300 font-bold text-blue-700">{r.leave}</td>
                      <td className="p-1 text-center font-bold text-slate-800">{r.otHoursText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-[10px] text-slate-500 pt-1">
              Legend: P=Present · L=Late · ½=Half Day · A=Absent · LV=Leave · H=Holiday · W=Weekend
            </div>

            <div className="grid grid-cols-3 gap-4 pt-8 text-center text-[10px] text-slate-700 border-t border-slate-300">
              <div>
                <div className="border-t border-slate-400 w-3/4 mx-auto pt-1 font-bold">Attendance Officer</div>
                <div className="text-[9px] text-slate-500">Prepared Daily Records</div>
              </div>
              <div>
                <div className="border-t border-slate-400 w-3/4 mx-auto pt-1 font-bold">Payroll & Accounts In-Charge</div>
                <div className="text-[9px] text-slate-500">Verified Overtime & Leaves</div>
              </div>
              <div>
                <div className="border-t border-slate-400 w-3/4 mx-auto pt-1 font-bold">Hospital Administrator</div>
                <div className="text-[9px] text-slate-500">Approved for Payroll Execution</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Btn variant="outline" onClick={() => setPrintMasterModal(false)}>Close</Btn>
          </div>
        </div>
      </Modal>

      {/* Leave request modal */}
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
          <Field label={t("columns.from")} required><DateInput name="start_date" required defaultValue={today} /></Field>
          <Field label={t("columns.to")} required><DateInput name="end_date" required defaultValue={today} /></Field>
          <Field label={t("columns.reason")}><Input name="reason" /></Field>
        </form>
      </Modal>

      {/* Holiday modal */}
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
          <Field label={t("fields.date")} required><DateInput name="holiday_on" required defaultValue={today} /></Field>
          <Field label={t("fields.name")} required><Input name="name" required placeholder={t("holidayPlaceholder")} /></Field>
        </form>
      </Modal>
    </AdminLayout>
  );
};

export default Attendance;
