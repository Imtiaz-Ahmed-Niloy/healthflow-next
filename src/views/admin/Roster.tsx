"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi, SectionTitle } from "@/components/admin/ui";
import { DataTable, Toolbar, Modal, Chips, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useFormatters } from "@/lib/appSettings";
import { toast } from "sonner";
import type { EmployeeRow, WardRow } from "@/redux/api/resources";
import {
  startOfWeek, addDays, subWeeks, addWeeks, format, parseISO,
} from "date-fns";
import {
  CalendarDays, Users2, Moon, PhoneCall,
  Clock, Plus, Copy, Printer, ArrowLeftRight,
  AlertTriangle, ChevronLeft, ChevronRight,
  Phone, MessageSquare, ShieldAlert,
  Grid3X3, List, UserCheck, Stethoscope,
  Building2, CheckCircle2,
} from "lucide-react";

type DutyRoster = {
  id: string;
  tenant_id?: string;
  employee_id: string;
  department?: string | null;
  shift_name: "Morning" | "Evening" | "Night" | "General" | "On-Call" | "Emergency";
  shift_date: string;
  start_time: string;
  end_time: string;
  ward_or_unit?: string | null;
  is_on_call: boolean;
  status: "scheduled" | "confirmed" | "completed" | "swapped" | "absent";
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  employees?: {
    id: string;
    name: string;
    emp_id: string;
    department?: string | null;
    designation?: string | null;
    phone?: string | null;
  } | null;
};

const SHIFT_OPTIONS = ["Morning", "Evening", "Night", "General", "On-Call", "Emergency"] as const;
const STATUS_OPTIONS = ["scheduled", "confirmed", "completed", "swapped", "absent"] as const;

export default function RosterView() {
  const { formatDate } = useFormatters();
  const { items: rosters, create, update, remove } = useResourceCrud<DutyRoster>("duty-rosters");
  const { items: staffList } = useResourceCrud<EmployeeRow>("employees");
  const { items: wardsList } = useResourceCrud<WardRow>("wards");

  // View state: Grid (Matrix) vs Table (List)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [weekStartsOn, setWeekStartsOn] = useState<1 | 6>(1); // 1 = Monday, 6 = Saturday

  // Active week reference date
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());

  // Filters
  const [q, setQ] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tableDateFilter, setTableDateFilter] = useState("");

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<DutyRoster | null>(null);
  const [saving, setSaving] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [onCallModalOpen, setOnCallModalOpen] = useState(false);
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);
  const [copying, setCopying] = useState(false);

  // Form states
  const [employeeId, setEmployeeId] = useState("");
  const [shiftName, setShiftName] = useState<DutyRoster["shift_name"]>("Morning");
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("14:00");
  const [department, setDepartment] = useState("");
  const [wardOrUnit, setWardOrUnit] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [isOnCall, setIsOnCall] = useState(false);
  const [status, setStatus] = useState<DutyRoster["status"]>("scheduled");
  const [notes, setNotes] = useState("");

  // Swap Modal Form states
  const [swapShift1Id, setSwapShift1Id] = useState("");
  const [swapShift2Id, setSwapShift2Id] = useState("");
  const [swapping, setSwapping] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Calculate 7 days for the active week
  const weekStart = useMemo(() => {
    return startOfWeek(currentWeekDate, { weekStartsOn });
  }, [currentWeekDate, weekStartsOn]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekDaysISO = useMemo(() => {
    return weekDays.map((d) => format(d, "yyyy-MM-dd"));
  }, [weekDays]);

  const weekRangeLabel = useMemo(() => {
    const startStr = format(weekDays[0], "dd MMM");
    const endStr = format(weekDays[6], "dd MMM yyyy");
    return `${startStr} – ${endStr}`;
  }, [weekDays]);

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((s) => {
      if (s.department?.trim()) set.add(s.department.trim());
    });
    rosters.forEach((r) => {
      if (r.department?.trim()) set.add(r.department.trim());
    });
    return Array.from(set).sort();
  }, [staffList, rosters]);

  // KPIs
  const totalRosters = rosters.length;
  const todayCount = rosters.filter((r) => r.shift_date === todayStr).length;
  const nightCount = rosters.filter((r) => r.shift_name === "Night" && r.shift_date === todayStr).length;
  const onCallCount = rosters.filter((r) => r.is_on_call && r.shift_date === todayStr).length;

  const todayOnCallClinicians = useMemo(() => {
    return rosters.filter((r) => r.is_on_call && r.shift_date === todayStr);
  }, [rosters, todayStr]);

  // Conflict & Fatigue Warnings Generator for Shift Form
  const conflictWarnings = useMemo(() => {
    if (!employeeId || !shiftDate) return [];
    const warnings: string[] = [];

    // 1. Same-day Overlap
    const sameDay = rosters.filter(
      (r) => r.employee_id === employeeId && r.shift_date === shiftDate && r.id !== editing?.id
    );
    if (sameDay.length > 0) {
      warnings.push(
        `Staff already has ${sameDay.length} shift scheduled on ${shiftDate}: ${sameDay
          .map((s) => `${s.shift_name} (${s.start_time}-${s.end_time})`)
          .join(", ")}.`
      );
    }

    // 2. Short turnaround (< 8h) from previous night shift
    try {
      const prevDate = format(addDays(parseISO(shiftDate), -1), "yyyy-MM-dd");
      const prevNight = rosters.find(
        (r) =>
          r.employee_id === employeeId &&
          r.shift_date === prevDate &&
          (r.shift_name === "Night" || r.end_time >= "06:00")
      );
      if (prevNight && shiftName === "Morning") {
        warnings.push(
          `Fatigue Risk: Staff is assigned to Night duty on ${prevDate} (ends ${prevNight.end_time}). Morning shift starts at ${startTime} (rest turnaround < 8h).`
        );
      }
    } catch {
      // safe date parse
    }

    // 3. Consecutive shifts without rest (> 5 days in a week)
    try {
      let activeDaysCount = 0;
      for (let i = -6; i <= 6; i++) {
        const cDate = format(addDays(parseISO(shiftDate), i), "yyyy-MM-dd");
        const hasWork =
          cDate === shiftDate ||
          rosters.some((r) => r.employee_id === employeeId && r.shift_date === cDate && r.id !== editing?.id);
        if (hasWork) activeDaysCount++;
      }
      if (activeDaysCount >= 6) {
        warnings.push(
          `Consecutive Workload: Staff is active for ${activeDaysCount} days in this fortnight. Ensure clinical rest periods.`
        );
      }
    } catch {
      // safe date parse
    }

    return warnings;
  }, [employeeId, shiftDate, shiftName, startTime, rosters, editing]);

  // Filtered staff for Matrix view
  const matrixStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (deptFilter !== "all" && s.department !== deptFilter) return false;
      if (!q) return true;
      const term = q.toLowerCase();
      const name = (s.name || "").toLowerCase();
      const empId = (s.emp_id || "").toLowerCase();
      const desig = (s.designation || "").toLowerCase();
      const dept = (s.department || "").toLowerCase();
      return name.includes(term) || empId.includes(term) || desig.includes(term) || dept.includes(term);
    });
  }, [staffList, deptFilter, q]);

  // Filtered rosters for Table view
  const filteredRosters = useMemo(() => {
    return rosters.filter((r) => {
      if (shiftFilter !== "all" && r.shift_name !== shiftFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (deptFilter !== "all" && (r.department || r.employees?.department) !== deptFilter) return false;
      if (tableDateFilter && r.shift_date !== tableDateFilter) return false;
      if (!q) return true;
      const term = q.toLowerCase();
      const staffName = r.employees?.name?.toLowerCase() || "";
      const empId = r.employees?.emp_id?.toLowerCase() || "";
      const dept = (r.department || r.employees?.department || "").toLowerCase();
      const unit = (r.ward_or_unit || "").toLowerCase();
      return (
        staffName.includes(term) ||
        empId.includes(term) ||
        dept.includes(term) ||
        unit.includes(term) ||
        (r.notes && r.notes.toLowerCase().includes(term))
      );
    });
  }, [rosters, shiftFilter, statusFilter, deptFilter, tableDateFilter, q]);

  // Pre-calculated shifts by (employee_id + shift_date) for Matrix cells
  const shiftsMap = useMemo(() => {
    const map: Record<string, DutyRoster[]> = {};
    rosters.forEach((r) => {
      const key = `${r.employee_id}__${r.shift_date}`;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [rosters]);

  // Daily Shift Coverage breakdown for the active week
  const dailyCoverage = useMemo(() => {
    return weekDaysISO.map((dateStr) => {
      const dayShifts = rosters.filter((r) => {
        if (r.shift_date !== dateStr) return false;
        if (deptFilter !== "all" && (r.department || r.employees?.department) !== deptFilter) return false;
        return true;
      });

      const morning = dayShifts.filter((s) => s.shift_name === "Morning").length;
      const evening = dayShifts.filter((s) => s.shift_name === "Evening").length;
      const night = dayShifts.filter((s) => s.shift_name === "Night").length;
      const emergency = dayShifts.filter((s) => s.shift_name === "Emergency").length;
      const onCall = dayShifts.filter((s) => s.is_on_call).length;
      const total = dayShifts.length;

      return {
        dateStr,
        morning,
        evening,
        night,
        emergency,
        onCall,
        total,
        isUnderstaffed: total === 0 || (night === 0 && deptFilter === "all"),
      };
    });
  }, [weekDaysISO, rosters, deptFilter]);

  // Handlers for Add / Edit
  const handleOpenAdd = (prefillEmployeeId?: string, prefillDate?: string) => {
    setEditing(null);
    const emp = staffList.find((s) => s.id === prefillEmployeeId) || staffList[0];
    setEmployeeId(emp?.id || "");
    setShiftName("Morning");
    setShiftDate(prefillDate || new Date().toISOString().slice(0, 10));
    setStartTime("08:00");
    setEndTime("14:00");
    setDepartment(emp?.department || "");
    setWardOrUnit(wardsList[0]?.name || "ICU / CCU");
    setCustomUnit("");
    setIsOnCall(false);
    setStatus("scheduled");
    setNotes("");
    setAddOpen(true);
  };

  const handleOpenEdit = (roster: DutyRoster) => {
    setEditing(roster);
    setEmployeeId(roster.employee_id);
    setShiftName(roster.shift_name);
    setShiftDate(roster.shift_date);
    setStartTime(roster.start_time);
    setEndTime(roster.end_time);
    setDepartment(roster.department || roster.employees?.department || "");

    const matchesWard = wardsList.some((w) => w.name === roster.ward_or_unit);
    if (matchesWard || roster.ward_or_unit === "ICU / CCU" || roster.ward_or_unit === "Emergency Room (ER)") {
      setWardOrUnit(roster.ward_or_unit || "");
      setCustomUnit("");
    } else {
      setWardOrUnit("other");
      setCustomUnit(roster.ward_or_unit || "");
    }

    setIsOnCall(roster.is_on_call);
    setStatus(roster.status);
    setNotes(roster.notes || "");
    setAddOpen(true);
  };

  const handleShiftChange = (s: DutyRoster["shift_name"]) => {
    setShiftName(s);
    if (s === "Morning") {
      setStartTime("08:00");
      setEndTime("14:00");
    } else if (s === "Evening") {
      setStartTime("14:00");
      setEndTime("20:00");
    } else if (s === "Night") {
      setStartTime("20:00");
      setEndTime("08:00");
    } else if (s === "Emergency") {
      setStartTime("00:00");
      setEndTime("12:00");
    } else if (s === "General") {
      setStartTime("09:00");
      setEndTime("17:00");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error("Please select an employee for duty roster");
      return;
    }
    setSaving(true);
    try {
      const finalUnit = wardOrUnit === "other" ? customUnit.trim() : wardOrUnit.trim();
      const payload: Omit<DutyRoster, "id"> = {
        employee_id: employeeId,
        department: department.trim() || undefined,
        shift_name: shiftName,
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        ward_or_unit: finalUnit || undefined,
        is_on_call: isOnCall,
        status,
        notes: notes.trim() || undefined,
      };

      if (editing) {
        await update(editing.id, payload);
        toast.success("Shift allocation updated");
      } else {
        await create(payload);
        toast.success("Duty shift assigned successfully");
      }
      setAddOpen(false);
    } catch {
      toast.error(editing ? "Failed to update roster" : "Failed to assign roster");
    } finally {
      setSaving(false);
    }
  };

  // Copy Previous Week's Roster
  const handleCopyPreviousWeek = async () => {
    const prevWeekStart = subWeeks(weekStart, 1);
    const prevDaysISO = Array.from({ length: 7 }, (_, i) => format(addDays(prevWeekStart, i), "yyyy-MM-dd"));
    const prevShifts = rosters.filter((r) => prevDaysISO.includes(r.shift_date));

    if (prevShifts.length === 0) {
      toast.error(`No shifts found in previous week (${format(prevWeekStart, "dd MMM")} – ${format(addDays(prevWeekStart, 6), "dd MMM")}) to copy.`);
      setCopyConfirmOpen(false);
      return;
    }

    setCopying(true);
    let copiedCount = 0;
    try {
      for (const shift of prevShifts) {
        const dayIdx = prevDaysISO.indexOf(shift.shift_date);
        if (dayIdx >= 0 && dayIdx < 7) {
          const newTargetDate = weekDaysISO[dayIdx];

          // Check if already exists in target week to avoid duplicate
          const exists = rosters.some(
            (r) =>
              r.employee_id === shift.employee_id &&
              r.shift_date === newTargetDate &&
              r.shift_name === shift.shift_name
          );

          if (!exists) {
            await create({
              employee_id: shift.employee_id,
              department: shift.department,
              shift_name: shift.shift_name,
              shift_date: newTargetDate,
              start_time: shift.start_time,
              end_time: shift.end_time,
              ward_or_unit: shift.ward_or_unit,
              is_on_call: shift.is_on_call,
              status: "scheduled",
              notes: shift.notes ? `[Copied] ${shift.notes}` : undefined,
            });
            copiedCount++;
          }
        }
      }
      toast.success(`Successfully copied ${copiedCount} shifts to week (${weekRangeLabel})`);
      setCopyConfirmOpen(false);
    } catch {
      toast.error("An error occurred while copying previous week's roster");
    } finally {
      setCopying(false);
    }
  };

  // Shift Swap Handler
  const handleSwapShifts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapShift1Id || !swapShift2Id) {
      toast.error("Please pick two shifts to swap");
      return;
    }
    if (swapShift1Id === swapShift2Id) {
      toast.error("Cannot swap a shift with itself");
      return;
    }

    const s1 = rosters.find((r) => r.id === swapShift1Id);
    const s2 = rosters.find((r) => r.id === swapShift2Id);
    if (!s1 || !s2) {
      toast.error("Selected shifts not found");
      return;
    }

    setSwapping(true);
    try {
      // Swap employee allocations between the two shifts
      await update(s1.id, {
        employee_id: s2.employee_id,
        status: "swapped",
        notes: `Swapped with ${s2.employees?.name || "staff"} on ${new Date().toLocaleDateString()}`,
      });
      await update(s2.id, {
        employee_id: s1.employee_id,
        status: "swapped",
        notes: `Swapped with ${s1.employees?.name || "staff"} on ${new Date().toLocaleDateString()}`,
      });
      toast.success("Shifts successfully swapped and marked as swapped");
      setSwapModalOpen(false);
      setSwapShift1Id("");
      setSwapShift2Id("");
    } catch {
      toast.error("Failed to execute shift swap");
    } finally {
      setSwapping(false);
    }
  };

  const shiftTone = (shift: DutyRoster["shift_name"]) => {
    switch (shift) {
      case "Morning":
        return "info";
      case "Evening":
        return "warn";
      case "Night":
        return "bad";
      case "Emergency":
        return "bad";
      case "On-Call":
        return "ok";
      default:
        return "default";
    }
  };

  const statusTone = (st: DutyRoster["status"]) => {
    switch (st) {
      case "confirmed":
      case "completed":
        return "ok";
      case "scheduled":
        return "info";
      case "swapped":
        return "warn";
      case "absent":
        return "bad";
      default:
        return "default";
    }
  };

  const columns: Column<DutyRoster>[] = [
    {
      key: "shift_date",
      label: "Date & Shift",
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            {formatDate(r.shift_date)}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Pill tone={shiftTone(r.shift_name)}>{r.shift_name}</Pill>
            {r.is_on_call && (
              <Pill tone="warn">
                <span className="flex items-center gap-1">
                  <PhoneCall className="h-2.5 w-2.5" /> On-Call
                </span>
              </Pill>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "employee_id",
      label: "Staff Member",
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-bold text-foreground">{r.employees?.name || "Staff Member"}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{r.employees?.emp_id || "—"}</span>
            {r.employees?.designation && <span>· {r.employees.designation}</span>}
          </div>
          {r.employees?.phone && (
            <a
              href={`tel:${r.employees.phone}`}
              className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-0.5"
            >
              <Phone className="h-2.5 w-2.5" /> {r.employees.phone}
            </a>
          )}
        </div>
      ),
    },
    {
      key: "department",
      label: "Department & Ward",
      render: (r) => (
        <div>
          <div className="font-medium text-foreground">{r.department || r.employees?.department || "General"}</div>
          {r.ward_or_unit && (
            <div className="text-xs text-primary font-medium mt-0.5">Unit: {r.ward_or_unit}</div>
          )}
        </div>
      ),
    },
    {
      key: "timing",
      label: "Shift Timing",
      render: (r) => (
        <div className="text-xs font-mono font-medium text-foreground/90 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {r.start_time} - {r.end_time}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <Pill tone={statusTone(r.status)}>{r.status.toUpperCase()}</Pill>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <RowActions
          onEdit={() => handleOpenEdit(r)}
          onDelete={async () => {
            if (confirm("Remove this shift allocation?")) {
              await remove(r.id);
            }
          }}
        />
      ),
    },
  ];

  return (
    <AdminLayout
      title="Duty Rosters & Shift Rostering"
      subtitle="24/7 clinical coverage, rotating shifts, on-call assignments and ward allocations"
    >
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            label="Total Shift Allocations"
            value={totalRosters}
            trend="Active roster"
            icon={CalendarDays}
            tone="default"
          />
          <Kpi
            label="Today's On-Duty Staff"
            value={todayCount}
            trend={`Date: ${todayStr}`}
            icon={Users2}
            tone="ok"
          />
          <Kpi
            label="Night Duty Staff"
            value={nightCount}
            trend="Overnight coverage"
            icon={Moon}
            tone="accent"
          />
          <div
            onClick={() => setOnCallModalOpen(true)}
            className="cursor-pointer group transition-transform active:scale-[0.98]"
            title="Click to view Emergency On-Call speed dial"
          >
            <Kpi
              label="On-Call Clinicians"
              value={onCallCount}
              trend="Tap to Speed Dial 📞"
              icon={PhoneCall}
              tone="primary"
            />
          </div>
        </div>

        {/* Toolbar & View Controls */}
        <Card className="p-5 space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Week navigation (Primary for Matrix Grid) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/50">
                <button
                  type="button"
                  onClick={() => setCurrentWeekDate(subWeeks(currentWeekDate, 1))}
                  className="p-1.5 hover:bg-card rounded-lg text-muted-foreground hover:text-foreground transition-all"
                  title="Previous week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentWeekDate(new Date())}
                  className="px-3 py-1 text-xs font-bold hover:bg-card rounded-lg transition-all text-primary"
                >
                  Current Week
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentWeekDate(addWeeks(currentWeekDate, 1))}
                  className="p-1.5 hover:bg-card rounded-lg text-muted-foreground hover:text-foreground transition-all"
                  title="Next week"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="px-3 py-1.5 bg-card border border-border rounded-xl text-xs font-bold text-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                <span>{weekRangeLabel}</span>
              </div>

              {/* Start day switcher */}
              <button
                type="button"
                onClick={() => setWeekStartsOn((prev) => (prev === 1 ? 6 : 1))}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border/60 bg-muted/20"
                title="Toggle week starting day"
              >
                Starts: {weekStartsOn === 1 ? "Mon" : "Sat"}
              </button>
            </div>

            {/* Global Actions */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
              {/* Copy Prev Week */}
              <Btn
                variant="outline"
                className="text-xs px-3 py-1.5 flex items-center gap-1.5"
                onClick={() => setCopyConfirmOpen(true)}
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Copy Prev Week</span>
              </Btn>

              {/* Swap Shifts */}
              <Btn
                variant="outline"
                className="text-xs px-3 py-1.5 flex items-center gap-1.5"
                onClick={() => setSwapModalOpen(true)}
              >
                <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Swap Shifts</span>
              </Btn>

              {/* Notice Board Print */}
              <Btn
                variant="outline"
                className="text-xs px-3 py-1.5 flex items-center gap-1.5"
                onClick={() => setPrintModalOpen(true)}
              >
                <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Print Notice Board</span>
              </Btn>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "grid"
                      ? "bg-card text-primary shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "table"
                      ? "bg-card text-primary shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span>Table</span>
                </button>
              </div>

              {/* Assign Shift Button */}
              <Btn
                variant="primary"
                className="text-xs px-3.5 py-1.5 flex items-center gap-1.5"
                onClick={() => handleOpenAdd()}
              >
                <Plus className="h-4 w-4" />
                <span>Assign Shift</span>
              </Btn>
            </div>
          </div>

          {/* Filtering bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
            <Toolbar search={q} onSearch={setQ} />

            {/* Department chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
              <span className="text-xs font-bold text-muted-foreground mr-1">Dept:</span>
              <Chips
                options={[
                  { value: "all", label: "All Depts" },
                  ...departments.map((d) => ({ value: d, label: d })),
                ]}
                value={deptFilter}
                onChange={setDeptFilter}
              />
            </div>

            {viewMode === "table" && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs font-semibold text-muted-foreground">Shift:</span>
                <Chips
                  options={[
                    { value: "all", label: "All Shifts" },
                    ...SHIFT_OPTIONS.map((s) => ({ value: s, label: s })),
                  ]}
                  value={shiftFilter}
                  onChange={setShiftFilter}
                />
              </div>
            )}
          </div>

          {/* VIEW MODE 1: WEEKLY MATRIX GRID */}
          {viewMode === "grid" && (
            <div className="pt-2 space-y-3">
              <div className="border border-border rounded-xl overflow-hidden shadow-soft bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border text-foreground/80">
                        <th className="p-3 font-bold w-[230px] sticky left-0 bg-muted/95 backdrop-blur z-10 border-r border-border">
                          Staff Member & Designation
                        </th>
                        {weekDays.map((d) => {
                          const iso = format(d, "yyyy-MM-dd");
                          const isToday = iso === todayStr;
                          return (
                            <th
                              key={iso}
                              className={`p-2.5 font-bold text-center border-r border-border last:border-r-0 min-w-[125px] ${
                                isToday ? "bg-primary/10 text-primary" : ""
                              }`}
                            >
                              <div className="font-semibold text-foreground">{format(d, "EEE")}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">{format(d, "dd MMM")}</div>
                              {isToday && (
                                <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded font-black bg-primary text-primary-foreground tracking-wider uppercase">
                                  Today
                                </span>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {matrixStaff.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                            No staff members match the selected department or search filter.
                          </td>
                        </tr>
                      ) : (
                        matrixStaff.map((staff) => {
                          const staffWeeklyShifts = weekDaysISO.flatMap(
                            (dayISO) => shiftsMap[`${staff.id}__${dayISO}`] || []
                          );
                          return (
                            <tr key={staff.id} className="hover:bg-muted/20 transition-colors">
                              {/* Sticky Staff Info Column */}
                              <td className="p-3 sticky left-0 bg-card/95 backdrop-blur border-r border-border z-10">
                                <div className="font-bold text-foreground text-sm leading-tight">{staff.name}</div>
                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                  <span className="font-mono text-[11px]">{staff.emp_id || "EMP"}</span>
                                  {staff.designation && <span>· {staff.designation}</span>}
                                </div>
                                <div className="flex items-center justify-between gap-1 mt-1">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium text-foreground/80">
                                    {staff.department || "General"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-mono font-medium">
                                    {staffWeeklyShifts.length} {staffWeeklyShifts.length === 1 ? "shift" : "shifts"}
                                  </span>
                                </div>
                              </td>

                              {/* 7 Day Shift Cells */}
                              {weekDaysISO.map((dayISO) => {
                                const dayShifts = shiftsMap[`${staff.id}__${dayISO}`] || [];
                                const isToday = dayISO === todayStr;

                                return (
                                  <td
                                    key={dayISO}
                                    className={`p-1.5 align-top border-r border-border last:border-r-0 min-h-[90px] relative group ${
                                      isToday ? "bg-primary/[0.02]" : ""
                                    }`}
                                  >
                                    <div className="flex flex-col gap-1 min-h-[70px]">
                                      {dayShifts.map((sh) => (
                                        <div
                                          key={sh.id}
                                          className={`rounded-lg p-1.5 text-[11px] border shadow-xs transition-all ${
                                            sh.shift_name === "Night"
                                              ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
                                              : sh.shift_name === "Evening"
                                              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                                              : sh.shift_name === "Emergency"
                                              ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                                              : sh.is_on_call
                                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                              : "bg-primary/10 border-primary/25 text-primary"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between font-bold leading-tight">
                                            <span className="flex items-center gap-1">
                                              {sh.shift_name === "Night" && <Moon className="h-2.5 w-2.5" />}
                                              {sh.is_on_call && <PhoneCall className="h-2.5 w-2.5 text-emerald-600" />}
                                              {sh.shift_name}
                                            </span>
                                            {/* Hover Actions on shift badge */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() => handleOpenEdit(sh)}
                                                className="text-[10px] text-muted-foreground hover:text-primary"
                                                title="Edit Shift"
                                              >
                                                ✎
                                              </button>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  if (confirm(`Remove ${sh.shift_name} shift for ${staff.name}?`)) {
                                                    await remove(sh.id);
                                                  }
                                                }}
                                                className="text-[10px] text-muted-foreground hover:text-destructive"
                                                title="Remove Shift"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          </div>
                                          <div className="text-[10px] font-mono mt-0.5 flex items-center gap-1 opacity-85">
                                            <Clock className="h-2.5 w-2.5" />
                                            {sh.start_time}-{sh.end_time}
                                          </div>
                                          {sh.ward_or_unit && (
                                            <div className="text-[10px] font-medium truncate mt-0.5">
                                              {sh.ward_or_unit}
                                            </div>
                                          )}
                                        </div>
                                      ))}

                                      {/* Quick Add Shift button inside cell */}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAdd(staff.id, dayISO)}
                                        className="w-full py-1 border border-dashed border-border/70 rounded text-[10px] text-muted-foreground/60 hover:text-primary hover:border-primary/60 hover:bg-card transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 mt-auto"
                                      >
                                        <Plus className="h-2.5 w-2.5" /> Assign
                                      </button>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {/* Shift Coverage Footer Row */}
                    <tfoot>
                      <tr className="bg-muted/70 font-bold border-t border-border">
                        <td className="p-3 sticky left-0 bg-muted/95 backdrop-blur border-r border-border z-10 text-xs">
                          <div className="text-foreground">Daily Coverage Summary</div>
                          <div className="text-[10px] font-normal text-muted-foreground">Clinical Staff On-Duty</div>
                        </td>
                        {dailyCoverage.map((cov) => (
                          <td
                            key={cov.dateStr}
                            className={`p-2.5 text-center border-r border-border last:border-r-0 text-xs ${
                              cov.isUnderstaffed ? "bg-amber-500/10" : ""
                            }`}
                          >
                            <div className="font-extrabold text-foreground text-sm">{cov.total} on-duty</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 space-y-0.5">
                              <div>M: {cov.morning} · E: {cov.evening}</div>
                              <div>N: {cov.night} · OC: {cov.onCall}</div>
                            </div>
                            {cov.isUnderstaffed && (
                              <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/20 px-1 py-0.5 rounded">
                                <AlertTriangle className="h-2.5 w-2.5" /> Check Rota
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: TABLE LIST VIEW */}
          {viewMode === "table" && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  className="text-xs px-2.5 py-1.5 border border-border rounded-lg bg-card text-foreground"
                  value={tableDateFilter}
                  onChange={(e) => setTableDateFilter(e.target.value)}
                  title="Filter by shift date"
                />
                {tableDateFilter && (
                  <button
                    onClick={() => setTableDateFilter("")}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Clear date
                  </button>
                )}
                <div className="ml-auto text-xs text-muted-foreground font-mono font-medium">
                  Showing {filteredRosters.length} shifts
                </div>
              </div>

              <DataTable
                columns={columns}
                rows={filteredRosters}
                empty="No duty roster records found for the selected filter."
              />
            </div>
          )}
        </Card>
      </div>

      {/* MODAL 1: ASSIGN / EDIT SHIFT */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={editing ? "Edit Shift Allocation" : "Assign Duty Shift"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Live Conflict & Fatigue Alert Box */}
          {conflictWarnings.length > 0 && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Clinical Schedule Notice / Fatigue Risk</span>
              </div>
              <ul className="text-xs text-amber-900/90 dark:text-amber-200/90 list-disc list-inside space-y-0.5 pl-1">
                {conflictWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Select Staff Member <span className="text-destructive">*</span>
            </label>
            <select
              value={employeeId}
              onChange={(e) => {
                const id = e.target.value;
                setEmployeeId(id);
                const emp = staffList.find((s) => s.id === id);
                if (emp?.department) setDepartment(emp.department);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              required
            >
              <option value="">— Select an employee —</option>
              {staffList.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.emp_id}) — {emp.department || "No Dept"}{" "}
                  {emp.designation ? `· ${emp.designation}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">Shift Type</label>
              <select
                value={shiftName}
                onChange={(e) => handleShiftChange(e.target.value as DutyRoster["shift_name"])}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm font-medium"
              >
                {SHIFT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Duty Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">Start Time</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="08:00"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">End Time</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="14:00"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Cardiology, Surgery, ICU"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">Ward / Unit Allocation</label>
              <select
                value={wardOrUnit}
                onChange={(e) => setWardOrUnit(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              >
                <option value="">— Select Ward / Unit —</option>
                <optgroup label="Hospital Wards & Cabins">
                  {wardsList.map((w) => (
                    <option key={w.id} value={w.name}>
                      {w.name} {w.category ? `(${w.category})` : ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Emergency & Clinical Wings">
                  <option value="Emergency Room (ER)">Emergency Room (ER)</option>
                  <option value="ICU / CCU">ICU / CCU</option>
                  <option value="Operation Theatre (OT)">Operation Theatre (OT)</option>
                  <option value="Post-Op Recovery">Post-Op Recovery</option>
                  <option value="General Ward">General Ward</option>
                  <option value="other">Other / Custom Unit...</option>
                </optgroup>
              </select>
            </div>
          </div>

          {wardOrUnit === "other" && (
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">Specify Custom Unit / Cabin</label>
              <input
                type="text"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="e.g. Cabin 402, Dialysis Unit, NICU Bed 4"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">Shift Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DutyRoster["status"])}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={isOnCall}
                  onChange={(e) => setIsOnCall(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                Mark as On-Call Duty (Emergency)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">Handover & Clinical Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Coverage instructions, patient handover or backup clinician assignments..."
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Btn variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update Shift" : "Assign Shift"}
            </Btn>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: NOTICE BOARD PRINTABLE ROSTER */}
      <Modal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Official Hospital Duty Roster (Notice Board Printout)"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-muted/40 p-3 rounded-xl border border-border">
            <div>
              <div className="font-bold text-sm text-foreground">Print-Ready Clinical Roster</div>
              <div className="text-xs text-muted-foreground">
                Includes clinical rota, on-call contact directory, and official signature authorizations.
              </div>
            </div>
            <Btn variant="primary" className="flex items-center gap-1.5" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Document
            </Btn>
          </div>

          {/* Printable Document Sheet Preview */}
          <div
            id="printable-roster-sheet"
            className="p-6 bg-white text-slate-900 border border-slate-300 rounded-lg shadow-sm space-y-4 text-xs font-sans print:border-none print:shadow-none print:p-0"
          >
            {/* Header */}
            <div className="text-center border-b border-slate-300 pb-3">
              <h2 className="text-lg font-black tracking-wide uppercase text-slate-900">
                CLINICAL DUTY ROSTER & ON-CALL SCHEDULE
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Week Period: {weekRangeLabel} · Department: {deptFilter === "all" ? "All Clinical Departments" : deptFilter}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Hospital Reference: DOC-ROSTER-{format(weekStart, "yyyy")}-W{format(weekStart, "ww")} · Issued on: {todayStr}
              </p>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 font-bold w-[180px]">Staff Member</th>
                    <th className="p-2 border-r border-slate-300 font-bold w-[90px]">Dept</th>
                    {weekDays.map((d) => (
                      <th key={d.toISOString()} className="p-1.5 text-center border-r border-slate-300 last:border-r-0 font-bold">
                        <div>{format(d, "EEE")}</div>
                        <div className="text-[9px] font-normal text-slate-500">{format(d, "dd MMM")}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixStaff.map((staff) => (
                    <tr key={staff.id} className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-300">
                        <div className="font-bold text-slate-900">{staff.name}</div>
                        <div className="text-[10px] text-slate-500">{staff.designation || staff.emp_id}</div>
                      </td>
                      <td className="p-2 border-r border-slate-300 font-medium text-slate-700">
                        {staff.department || "General"}
                      </td>
                      {weekDaysISO.map((dayISO) => {
                        const dayShifts = shiftsMap[`${staff.id}__${dayISO}`] || [];
                        if (dayShifts.length === 0) {
                          return (
                            <td key={dayISO} className="p-1.5 text-center border-r border-slate-300 last:border-r-0 text-slate-400">
                              OFF
                            </td>
                          );
                        }
                        return (
                          <td key={dayISO} className="p-1.5 text-center border-r border-slate-300 last:border-r-0">
                            {dayShifts.map((s) => (
                              <div key={s.id} className="font-bold text-[10px] leading-tight">
                                <span>{s.shift_name.slice(0, 4)}</span>
                                <span className="block text-[9px] font-mono font-normal text-slate-500">
                                  {s.start_time}-{s.end_time}
                                </span>
                                {s.is_on_call && <span className="text-[8px] font-bold text-emerald-700">[On-Call]</span>}
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Emergency On-Call Clinicians Section */}
            <div className="pt-2 border-t border-slate-200">
              <div className="font-bold text-slate-800 text-xs mb-1">
                Emergency On-Call Clinician Directory (24/7 Rapid Response):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {rosters
                  .filter((r) => r.is_on_call && weekDaysISO.includes(r.shift_date))
                  .slice(0, 6)
                  .map((c) => (
                    <div key={c.id} className="p-1.5 border border-slate-200 rounded text-[10px]">
                      <span className="font-bold">{c.employees?.name}</span> ({c.shift_date})
                      <div className="text-slate-600 font-mono">{c.employees?.phone || "Phone on file"}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-8 text-center text-[10px] text-slate-700 border-t border-slate-300">
              <div>
                <div className="border-t border-slate-400 w-3/4 mx-auto pt-1 font-bold">Roster In-Charge</div>
                <div className="text-[9px] text-slate-500">Prepared & Scheduled</div>
              </div>
              <div>
                <div className="border-t border-slate-400 w-3/4 mx-auto pt-1 font-bold">Nursing Superintendent</div>
                <div className="text-[9px] text-slate-500">Verified Clinical Coverage</div>
              </div>
              <div>
                <div className="border-t border-slate-400 w-3/4 mx-auto pt-1 font-bold">Medical Superintendent</div>
                <div className="text-[9px] text-slate-500">Approved for Duty</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Btn variant="outline" onClick={() => setPrintModalOpen(false)}>
              Close
            </Btn>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: SHIFT SWAP & EXCHANGE */}
      <Modal open={swapModalOpen} onClose={() => setSwapModalOpen(false)} title="Clinical Shift Swap & Exchange">
        <form onSubmit={handleSwapShifts} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Exchange assignments between two staff members. Both records will be updated and recorded with status{" "}
            <span className="font-mono text-primary font-bold">SWAPPED</span>.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Shift Allocation 1 (First Staff Member) <span className="text-destructive">*</span>
              </label>
              <select
                value={swapShift1Id}
                onChange={(e) => setSwapShift1Id(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
                required
              >
                <option value="">— Select Shift 1 —</option>
                {rosters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.employees?.name} ({r.employees?.emp_id}) — {r.shift_name} on {r.shift_date} ({r.start_time}-{r.end_time})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-center py-1 font-bold text-xs text-primary flex items-center justify-center gap-1.5">
              <ArrowLeftRight className="h-4 w-4" /> Swapping With
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Shift Allocation 2 (Second Staff Member) <span className="text-destructive">*</span>
              </label>
              <select
                value={swapShift2Id}
                onChange={(e) => setSwapShift2Id(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
                required
              >
                <option value="">— Select Shift 2 —</option>
                {rosters
                  .filter((r) => r.id !== swapShift1Id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.employees?.name} ({r.employees?.emp_id}) — {r.shift_name} on {r.shift_date} ({r.start_time}-{r.end_time})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Btn variant="outline" onClick={() => setSwapModalOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" type="submit" disabled={swapping}>
              {swapping ? "Executing Swap..." : "Confirm Shift Swap"}
            </Btn>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: EMERGENCY ON-CALL CLINICIANS SPEED DIAL */}
      <Modal
        open={onCallModalOpen}
        onClose={() => setOnCallModalOpen(false)}
        title="Emergency On-Call Clinicians (Rapid Dial)"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Clinicians currently on-call for emergency response, surgical standby, and urgent ward coverage on{" "}
            <span className="font-bold text-foreground">{todayStr}</span>.
          </p>

          {todayOnCallClinicians.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              No clinicians are marked as On-Call for today.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto">
              {todayOnCallClinicians.map((cl) => (
                <div
                  key={cl.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-card shadow-soft gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-foreground text-sm">{cl.employees?.name || "Clinician"}</div>
                    <div className="text-xs text-muted-foreground">
                      {cl.employees?.designation || "Doctor/Nurse"} · {cl.department || "Emergency"}
                    </div>
                    <div className="text-[11px] text-primary font-medium mt-0.5">
                      Unit: {cl.ward_or_unit || "Hospital Wide"} ({cl.start_time} - {cl.end_time})
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cl.employees?.phone ? (
                      <>
                        <a
                          href={`tel:${cl.employees.phone}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          <Phone className="h-3.5 w-3.5" /> Call
                        </a>
                        <a
                          href={`https://wa.me/${cl.employees.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No phone registered</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Btn variant="outline" onClick={() => setOnCallModalOpen(false)}>
              Close
            </Btn>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: CONFIRM COPY PREVIOUS WEEK */}
      <Modal
        open={copyConfirmOpen}
        onClose={() => setCopyConfirmOpen(false)}
        title="Copy Previous Week's Shift Roster?"
      >
        <div className="space-y-4">
          <p className="text-xs text-foreground/80 leading-relaxed">
            This operation will copy all active shifts from the previous week into the active week (
            <span className="font-bold text-foreground">{weekRangeLabel}</span>).
          </p>
          <div className="p-3 bg-muted/40 border border-border rounded-xl text-xs space-y-1.5">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Automatic Conflict Avoidance:
            </div>
            <p className="text-muted-foreground">
              Any shift allocations that already exist in the target week will be skipped automatically to prevent duplicate
              bookings.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="outline" onClick={() => setCopyConfirmOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={handleCopyPreviousWeek} disabled={copying}>
              {copying ? "Copying Shifts..." : "Confirm & Copy"}
            </Btn>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
