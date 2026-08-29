"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle, Kpi } from "@/components/admin/ui";
import { Modal, Field, Input, Select, TextArea, Chips, exportCSV } from "@/components/admin/crud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { load, save, uid } from "@/lib/storage";
import { CalendarCheck2, Users2, Plane, AlertTriangle, LogIn, LogOut, Printer, Plus, Check, X, Trash2 } from "lucide-react";

// ============ Types ============
type Emp = {
  id: string; empId: string; name: string; department?: string; designation?: string;
  jobStatus?: string; phone?: string; email?: string;
};
type AttStatus = "Present" | "Late" | "Absent" | "Leave" | "Holiday" | "Weekend" | "Half Day";
type AttRecord = { id: string; empId: string; date: string; checkIn?: string; checkOut?: string; status: AttStatus; hours?: number; note?: string };
type Leave = {
  id: string; empId: string; employee: string; type: "Sick" | "Casual" | "Vacation" | "Maternity" | "Unpaid";
  from: string; to: string; days: number; reason: string; status: "Pending" | "Approved" | "Rejected";
  appliedAt: string;
};
type Holiday = { id: string; date: string; name: string };

// ============ Constants ============
const ONBOARDING_KEY = "hr-onboarding-v2";
const ATT_KEY = "attendance-records-v1";
const LEAVE_KEY = "leave-requests-v2";
const HOL_KEY = "holidays-v1";

const SHIFT_START = "09:00";
const LATE_AFTER = "09:15";
const SHIFT_END = "17:00";

const LEAVE_QUOTA: Record<Leave["type"], number> = { Sick: 14, Casual: 10, Vacation: 20, Maternity: 90, Unpaid: 30 };

// ============ Utilities ============
const todayISO = () => new Date().toISOString().slice(0, 10);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const monthDays = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) => isoDate(new Date(y, m - 1, i + 1)));
};
const dayName = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short" });
const isWeekend = (iso: string) => new Date(iso).getDay() === 5; // Friday
const diffDays = (a: string, b: string) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1);
const minutesBetween = (a: string, b: string) => {
  const [ah, am] = a.split(":").map(Number); const [bh, bm] = b.split(":").map(Number);
  return (bh * 60 + bm) - (ah * 60 + am);
};
const fmtHours = (mins: number) => `${Math.floor(mins / 60)}h ${mins % 60}m`;

const statusToTone = (s: AttStatus) =>
  s === "Present" ? "ok" : s === "Late" || s === "Half Day" ? "warn" : s === "Absent" ? "bad" : s === "Leave" ? "info" : "default";

// ============ Seed demo records (only first time) ============
const seedDemo = (employees: Emp[]) => {
  const existing = load<AttRecord[]>(ATT_KEY, []);
  if (existing.length > 0) return existing;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const out: AttRecord[] = [];
  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    const iso = isoDate(d);
    if (isWeekend(iso)) continue;
    employees.forEach((e, idx) => {
      const r = (idx * 7 + d.getDate()) % 10;
      let status: AttStatus = "Present";
      let checkIn: string | undefined = "08:55";
      let checkOut: string | undefined = "17:05";
      if (r === 0) { status = "Absent"; checkIn = undefined; checkOut = undefined; }
      else if (r === 1) { status = "Late"; checkIn = "09:38"; }
      else if (r === 2) { status = "Half Day"; checkOut = "13:00"; }
      const hours = checkIn && checkOut ? minutesBetween(checkIn, checkOut) : 0;
      out.push({ id: uid(), empId: e.empId, date: iso, status, checkIn, checkOut, hours });
    });
  }
  save(ATT_KEY, out);
  return out;
};

const seedHolidays = (): Holiday[] => {
  const existing = load<Holiday[]>(HOL_KEY, []);
  if (existing.length > 0) return existing;
  const y = new Date().getFullYear();
  const seed: Holiday[] = [
    { id: uid(), date: `${y}-02-21`, name: "Language Martyrs' Day" },
    { id: uid(), date: `${y}-03-26`, name: "Independence Day" },
    { id: uid(), date: `${y}-05-01`, name: "Labour Day" },
    { id: uid(), date: `${y}-12-16`, name: "Victory Day" },
  ];
  save(HOL_KEY, seed);
  return seed;
};

const seedLeaves = (employees: Emp[]): Leave[] => {
  const existing = load<Leave[]>(LEAVE_KEY, []);
  if (existing.length > 0) return existing;
  if (employees.length === 0) return [];
  const today = new Date();
  const iso = (off: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + off));
  const e0 = employees[0]; const e1 = employees[1] || e0; const e2 = employees[2] || e0;
  const seed: Leave[] = [
    { id: uid(), empId: e0.empId, employee: e0.name, type: "Sick", from: iso(2), to: iso(3), days: 2, reason: "Flu", status: "Pending", appliedAt: iso(0) },
    { id: uid(), empId: e1.empId, employee: e1.name, type: "Vacation", from: iso(10), to: iso(17), days: 8, reason: "Family trip", status: "Approved", appliedAt: iso(-5) },
    { id: uid(), empId: e2.empId, employee: e2.name, type: "Casual", from: iso(-3), to: iso(-3), days: 1, reason: "Personal errand", status: "Rejected", appliedAt: iso(-7) },
  ];
  save(LEAVE_KEY, seed);
  return seed;
};

// ============ Page ============
const Attendance = () => {
  const { push } = useNotifications();
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [records, setRecords] = useState<AttRecord[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [tab, setTab] = useState<"log" | "sheet" | "leave" | "holidays">("log");

  // Filters
  const [period, setPeriod] = useState<string>(() => todayISO().slice(0, 7));
  const [dept, setDept] = useState("All");
  const [q, setQ] = useState("");

  // Modals
  const [leaveModal, setLeaveModal] = useState(false);
  const [holidayModal, setHolidayModal] = useState(false);
  const [markModal, setMarkModal] = useState<{ emp: Emp; date: string } | null>(null);

  // Init
  useEffect(() => {
    const emps = load<Emp[]>(ONBOARDING_KEY, []).filter(e => (e.jobStatus || "").toLowerCase() !== "terminated" && (e.jobStatus || "").toLowerCase() !== "resigned");
    setEmployees(emps);
    setRecords(seedDemo(emps));
    setLeaves(seedLeaves(emps));
    setHolidays(seedHolidays());
  }, []);

  useEffect(() => { save(ATT_KEY, records); }, [records]);
  useEffect(() => { save(LEAVE_KEY, leaves); }, [leaves]);
  useEffect(() => { save(HOL_KEY, holidays); }, [holidays]);

  const departments = useMemo(() => ["All", ...Array.from(new Set(employees.map(e => e.department).filter(Boolean) as string[]))], [employees]);
  const filteredEmps = useMemo(() => employees.filter(e =>
    (dept === "All" || e.department === dept) &&
    (!q || e.name.toLowerCase().includes(q.toLowerCase()) || e.empId.toLowerCase().includes(q.toLowerCase()))
  ), [employees, dept, q]);

  // ============ Today's log ============
  const today = todayISO();
  const todayRecords = useMemo(() => {
    const map = new Map<string, AttRecord>();
    records.filter(r => r.date === today).forEach(r => map.set(r.empId, r));
    return map;
  }, [records, today]);

  const checkIn = (e: Emp) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const status: AttStatus = time > LATE_AFTER ? "Late" : "Present";
    const existing = todayRecords.get(e.empId);
    if (existing?.checkIn) { push({ title: `${e.name} already checked in`, tone: "warn" }); return; }
    if (existing) {
      setRecords(rs => rs.map(r => r.id === existing.id ? { ...r, checkIn: time, status } : r));
    } else {
      setRecords(rs => [{ id: uid(), empId: e.empId, date: today, checkIn: time, status }, ...rs]);
    }
    push({ title: `${e.name} checked in at ${time}`, tone: status === "Late" ? "warn" : "ok" });
  };
  const checkOut = (e: Emp) => {
    const existing = todayRecords.get(e.empId);
    if (!existing?.checkIn) { push({ title: `${e.name} hasn't checked in yet`, tone: "bad" }); return; }
    if (existing.checkOut) { push({ title: `${e.name} already checked out`, tone: "warn" }); return; }
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const hours = minutesBetween(existing.checkIn, time);
    const status: AttStatus = hours < 240 && existing.status !== "Late" ? "Half Day" : existing.status;
    setRecords(rs => rs.map(r => r.id === existing.id ? { ...r, checkOut: time, hours, status } : r));
    push({ title: `${e.name} checked out — ${fmtHours(hours)}`, tone: "info" });
  };
  const markAbsent = (e: Emp) => {
    const existing = todayRecords.get(e.empId);
    if (existing) setRecords(rs => rs.map(r => r.id === existing.id ? { ...r, status: "Absent", checkIn: undefined, checkOut: undefined, hours: 0 } : r));
    else setRecords(rs => [{ id: uid(), empId: e.empId, date: today, status: "Absent" }, ...rs]);
    push({ title: `${e.name} marked absent`, tone: "bad" });
  };

  // ============ Monthly sheet ============
  const days = useMemo(() => monthDays(period), [period]);
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
  const recordOf = (empId: string, date: string): AttRecord | undefined =>
    records.find(r => r.empId === empId && r.date === date);
  const computedStatus = (empId: string, date: string): AttStatus => {
    if (holidaySet.has(date)) return "Holiday";
    if (isWeekend(date)) return "Weekend";
    const onLeave = leaves.some(l => l.empId === empId && l.status === "Approved" && date >= l.from && date <= l.to);
    if (onLeave) return "Leave";
    const rec = recordOf(empId, date);
    if (rec) return rec.status;
    if (date < today) return "Absent";
    return "Present";
  };

  const sheetSummary = useMemo(() => filteredEmps.map(e => {
    const counts = { P: 0, L: 0, A: 0, LV: 0, H: 0, W: 0, HD: 0 };
    days.forEach(d => {
      const s = computedStatus(e.empId, d);
      if (s === "Present") counts.P++;
      else if (s === "Late") counts.L++;
      else if (s === "Absent") counts.A++;
      else if (s === "Leave") counts.LV++;
      else if (s === "Holiday") counts.H++;
      else if (s === "Weekend") counts.W++;
      else if (s === "Half Day") counts.HD++;
    });
    return { emp: e, counts };
  }), [filteredEmps, days, records, leaves, holidays]);

  // ============ KPIs (today) ============
  const kpis = useMemo(() => {
    const total = filteredEmps.length;
    let present = 0, late = 0, absent = 0, onLeave = 0;
    filteredEmps.forEach(e => {
      const s = computedStatus(e.empId, today);
      if (s === "Present") present++;
      else if (s === "Late") { present++; late++; }
      else if (s === "Leave") onLeave++;
      else if (s === "Absent") absent++;
    });
    return { total, present, late, absent, onLeave };
  }, [filteredEmps, records, leaves, holidays, today]);

  // ============ Leave handlers ============
  const submitLeave = (data: Omit<Leave, "id" | "status" | "appliedAt" | "days" | "employee">) => {
    const emp = employees.find(e => e.empId === data.empId);
    if (!emp) return;
    const days = diffDays(data.from, data.to);
    const newLeave: Leave = { ...data, id: uid(), employee: emp.name, days, status: "Pending", appliedAt: todayISO() };
    setLeaves(ls => [newLeave, ...ls]);
    push({ title: `Leave request from ${emp.name} (${days}d)`, tone: "info" });
  };
  const approve = (id: string) => { setLeaves(ls => ls.map(l => l.id === id ? { ...l, status: "Approved" } : l)); push({ title: "Leave approved", tone: "ok" }); };
  const reject = (id: string) => { setLeaves(ls => ls.map(l => l.id === id ? { ...l, status: "Rejected" } : l)); push({ title: "Leave rejected", tone: "bad" }); };
  const removeLeave = (id: string) => setLeaves(ls => ls.filter(l => l.id !== id));

  const leaveBalance = (empId: string) => {
    const used: Record<string, number> = {};
    leaves.filter(l => l.empId === empId && l.status === "Approved").forEach(l => { used[l.type] = (used[l.type] || 0) + l.days; });
    return Object.entries(LEAVE_QUOTA).map(([type, quota]) => ({ type, quota, used: used[type] || 0, remaining: quota - (used[type] || 0) }));
  };

  // ============ Holiday handlers ============
  const addHoliday = (date: string, name: string) => {
    setHolidays(h => [...h, { id: uid(), date, name }].sort((a, b) => a.date.localeCompare(b.date)));
    push({ title: `Holiday added: ${name}`, tone: "ok" });
  };
  const removeHoliday = (id: string) => setHolidays(h => h.filter(x => x.id !== id));

  // ============ Export & Print ============
  const exportSheet = () => {
    const rows = sheetSummary.map(s => ({
      "Emp ID": s.emp.empId, Name: s.emp.name, Department: s.emp.department || "",
      Present: s.counts.P, Late: s.counts.L, "Half Day": s.counts.HD, Absent: s.counts.A,
      Leave: s.counts.LV, Holiday: s.counts.H, Weekend: s.counts.W,
    }));
    exportCSV(rows, `attendance-${period}.csv`);
  };

  const printSheet = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = sheetSummary.map(s => {
      const cells = days.map(d => {
        const st = computedStatus(s.emp.empId, d);
        const ch = st === "Present" ? "P" : st === "Late" ? "L" : st === "Absent" ? "A" : st === "Leave" ? "LV" : st === "Holiday" ? "H" : st === "Weekend" ? "W" : "½";
        const color = st === "Absent" ? "#ef4444" : st === "Late" ? "#f59e0b" : st === "Leave" ? "#3b82f6" : st === "Holiday" ? "#8b5cf6" : st === "Weekend" ? "#9ca3af" : "#10b981";
        return `<td style="text-align:center;color:${color};font-weight:600">${ch}</td>`;
      }).join("");
      return `<tr><td>${s.emp.empId}</td><td>${s.emp.name}</td><td>${s.emp.department || ""}</td>${cells}<td><b>${s.counts.P + s.counts.L}</b></td><td>${s.counts.A}</td><td>${s.counts.LV}</td></tr>`;
    }).join("");
    w.document.write(`<html><head><title>Attendance ${period}</title>
      <style>body{font-family:system-ui;padding:24px}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:16px}th,td{border:1px solid #ddd;padding:4px 6px}th{background:#f3f4f6;text-align:left}.legend{margin-top:16px;font-size:11px;color:#555}</style>
      </head><body>
      <h1>Attendance Sheet — ${period}</h1>
      <p style="color:#666;margin:0">Department: ${dept} • Employees: ${sheetSummary.length}</p>
      <table><thead><tr><th>Emp ID</th><th>Name</th><th>Dept</th>
        ${days.map(d => `<th style="text-align:center">${d.slice(8)}<br/><span style="font-weight:400;color:#888">${dayName(d)[0]}</span></th>`).join("")}
        <th>Present</th><th>Absent</th><th>Leave</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>
      <p class="legend">Legend: P=Present, L=Late, ½=Half Day, A=Absent, LV=Leave, H=Holiday, W=Weekend</p>
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    w.document.close();
  };

  // ============ Render ============
  return (
    <AdminLayout title="Attendance & Leave" subtitle="Daily check-in/out · Monthly sheet · Leave approvals · Holidays">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Kpi icon={Users2} label="Employees" value={String(kpis.total)} tone="primary" />
        <Kpi icon={CalendarCheck2} label="Present today" value={String(kpis.present)} tone="accent" />
        <Kpi icon={AlertTriangle} label="Late today" value={String(kpis.late)} tone="chip" />
        <Kpi icon={Plane} label="On leave" value={String(kpis.onLeave)} tone="chip" />
        <Kpi icon={X} label="Absent" value={String(kpis.absent)} tone="destructive" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <Chips value={tab} onChange={setTab as never}
          options={[
            { value: "log", label: "Today's Log" },
            { value: "sheet", label: "Monthly Sheet" },
            { value: "leave", label: "Leave Requests" },
            { value: "holidays", label: "Holidays" },
          ]} />
        <div className="flex flex-wrap items-center gap-2">
          {(tab === "log" || tab === "sheet" || tab === "leave") && (
            <select value={dept} onChange={e => setDept(e.target.value)} className="bg-card border border-border rounded-full px-3 py-1.5 text-xs font-semibold">
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>
          )}
          {tab === "sheet" && (
            <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
              className="bg-card border border-border rounded-full px-3 py-1.5 text-xs font-semibold" />
          )}
          {(tab === "log" || tab === "leave") && (
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
              className="bg-card border border-border rounded-full px-3 py-1.5 text-xs w-44" />
          )}
        </div>
      </div>

      {/* ===== Today's log ===== */}
      {tab === "log" && (
        <Card className="p-5">
          <SectionTitle title={`Today · ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`}
            action={<span className="text-xs text-muted-foreground">Shift {SHIFT_START} – {SHIFT_END} · Late after {LATE_AFTER}</span>} />
          {filteredEmps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No employees found. Add via <a href="/admin/onboarding" className="text-primary underline">Employees</a>.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-muted/30 text-left text-[10px] tracking-widest text-muted-foreground">
                  <tr>
                    <th className="py-3 px-3">Emp ID</th><th className="px-3">Name</th><th className="px-3">Department</th>
                    <th className="px-3">Check-in</th><th className="px-3">Check-out</th><th className="px-3">Hours</th>
                    <th className="px-3">Status</th><th className="px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmps.map(e => {
                    const r = todayRecords.get(e.empId);
                    const onLeave = leaves.some(l => l.empId === e.empId && l.status === "Approved" && today >= l.from && today <= l.to);
                    const status: AttStatus = onLeave ? "Leave" : holidaySet.has(today) ? "Holiday" : isWeekend(today) ? "Weekend" : r?.status || "Present";
                    return (
                      <tr key={e.id} className="border-t border-border/40">
                        <td className="py-3 px-3 font-mono text-xs">{e.empId}</td>
                        <td className="px-3 font-semibold text-primary">{e.name}</td>
                        <td className="px-3">{e.department || "—"}</td>
                        <td className="px-3 font-mono">{r?.checkIn || "—"}</td>
                        <td className="px-3 font-mono">{r?.checkOut || "—"}</td>
                        <td className="px-3 font-mono">{r?.hours ? fmtHours(r.hours) : "—"}</td>
                        <td className="px-3"><Pill tone={statusToTone(status) as never}>{status}</Pill></td>
                        <td className="px-3 text-right">
                          <div className="inline-flex gap-1">
                            <button onClick={() => checkIn(e)} disabled={!!r?.checkIn || onLeave}
                              className="p-1.5 rounded-lg hover:bg-accent/40 text-accent-foreground disabled:opacity-30" title="Check in">
                              <LogIn className="h-4 w-4" />
                            </button>
                            <button onClick={() => checkOut(e)} disabled={!r?.checkIn || !!r?.checkOut}
                              className="p-1.5 rounded-lg hover:bg-chip text-chip-foreground disabled:opacity-30" title="Check out">
                              <LogOut className="h-4 w-4" />
                            </button>
                            <button onClick={() => markAbsent(e)} disabled={onLeave}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive disabled:opacity-30" title="Mark absent">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ===== Monthly sheet ===== */}
      {tab === "sheet" && (
        <Card className="p-5">
          <SectionTitle title={`Monthly Sheet — ${period}`}
            action={<div className="flex gap-2">
              <Btn variant="outline" onClick={exportSheet}>Export CSV</Btn>
              <Btn onClick={printSheet}><Printer className="h-4 w-4" /> Print</Btn>
            </div>} />
          <div className="overflow-x-auto rounded-xl border border-border/40">
            <table className="text-xs min-w-full">
              <thead className="bg-muted/30 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left font-bold sticky left-0 bg-muted/30 z-10">Employee</th>
                  {days.map(d => (
                    <th key={d} className={`px-1 py-2 text-center font-semibold ${isWeekend(d) || holidaySet.has(d) ? "text-destructive" : "text-muted-foreground"}`}>
                      <div>{d.slice(8)}</div>
                      <div className="font-normal text-[9px]">{dayName(d)[0]}</div>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center bg-accent/20">P</th>
                  <th className="px-2 py-2 text-center bg-destructive/10">A</th>
                  <th className="px-2 py-2 text-center bg-chip/40">LV</th>
                </tr>
              </thead>
              <tbody>
                {sheetSummary.map(({ emp, counts }) => (
                  <tr key={emp.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-2 py-2 sticky left-0 bg-card z-10">
                      <div className="font-semibold text-primary text-xs">{emp.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{emp.empId} · {emp.department}</div>
                    </td>
                    {days.map(d => {
                      const st = computedStatus(emp.empId, d);
                      const ch = st === "Present" ? "P" : st === "Late" ? "L" : st === "Absent" ? "A" : st === "Leave" ? "LV" : st === "Holiday" ? "H" : st === "Weekend" ? "W" : "½";
                      const cls = st === "Absent" ? "bg-destructive/15 text-destructive" :
                        st === "Late" ? "bg-yellow-100 text-yellow-800" :
                        st === "Leave" ? "bg-chip text-chip-foreground" :
                        st === "Holiday" ? "bg-purple-100 text-purple-800" :
                        st === "Weekend" ? "bg-muted text-muted-foreground" :
                        st === "Half Day" ? "bg-orange-100 text-orange-800" :
                        "bg-accent/40 text-accent-foreground";
                      return (
                        <td key={d} className="px-1 py-1 text-center cursor-pointer"
                          onClick={() => !isWeekend(d) && !holidaySet.has(d) && setMarkModal({ emp, date: d })}>
                          <span className={`inline-block w-6 py-1 rounded text-[10px] font-bold ${cls}`}>{ch}</span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-bold text-accent-foreground bg-accent/20">{counts.P + counts.L}</td>
                    <td className="px-2 py-2 text-center font-bold text-destructive bg-destructive/10">{counts.A}</td>
                    <td className="px-2 py-2 text-center font-bold text-chip-foreground bg-chip/40">{counts.LV}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Legend: <b>P</b>=Present <b>L</b>=Late <b>½</b>=Half Day <b>A</b>=Absent <b>LV</b>=Leave <b>H</b>=Holiday <b>W</b>=Weekend · Click a cell to override.
          </p>
        </Card>
      )}

      {/* ===== Leave Requests ===== */}
      {tab === "leave" && (
        <div className="space-y-5">
          <Card className="p-5">
            <SectionTitle title="Leave Requests"
              action={<Btn onClick={() => setLeaveModal(true)}><Plus className="h-4 w-4" /> New Request</Btn>} />
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-muted/30 text-left text-[10px] tracking-widest text-muted-foreground">
                  <tr>
                    <th className="py-3 px-3">Employee</th><th className="px-3">Type</th>
                    <th className="px-3">From</th><th className="px-3">To</th><th className="px-3">Days</th>
                    <th className="px-3">Reason</th><th className="px-3">Status</th><th className="px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.filter(l => (dept === "All" || employees.find(e => e.empId === l.empId)?.department === dept) &&
                    (!q || l.employee.toLowerCase().includes(q.toLowerCase()))).map(l => (
                    <tr key={l.id} className="border-t border-border/40">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-primary">{l.employee}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{l.empId}</div>
                      </td>
                      <td className="px-3"><Pill tone="info">{l.type}</Pill></td>
                      <td className="px-3 font-mono text-xs">{l.from}</td>
                      <td className="px-3 font-mono text-xs">{l.to}</td>
                      <td className="px-3 font-bold">{l.days}</td>
                      <td className="px-3 max-w-[200px] truncate" title={l.reason}>{l.reason}</td>
                      <td className="px-3">
                        <Pill tone={l.status === "Approved" ? "ok" : l.status === "Rejected" ? "bad" : "warn"}>{l.status}</Pill>
                      </td>
                      <td className="px-3 text-right">
                        <div className="inline-flex gap-1">
                          {l.status === "Pending" && <>
                            <button onClick={() => approve(l.id)} className="p-1.5 rounded-lg hover:bg-accent/40 text-accent-foreground" title="Approve"><Check className="h-4 w-4" /></button>
                            <button onClick={() => reject(l.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Reject"><X className="h-4 w-4" /></button>
                          </>}
                          <button onClick={() => removeLeave(l.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No leave requests yet</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Leave balances */}
          <Card className="p-5">
            <SectionTitle title="Leave Balance (current year)" />
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-muted/30 text-left text-[10px] tracking-widest text-muted-foreground">
                  <tr>
                    <th className="py-3 px-3">Employee</th>
                    {Object.keys(LEAVE_QUOTA).map(t => <th key={t} className="px-3 text-center">{t}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmps.map(e => {
                    const bal = leaveBalance(e.empId);
                    return (
                      <tr key={e.id} className="border-t border-border/40">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-primary">{e.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{e.empId}</div>
                        </td>
                        {bal.map(b => (
                          <td key={b.type} className="px-3 text-center">
                            <span className={`font-bold ${b.remaining <= 2 ? "text-destructive" : "text-primary"}`}>{b.remaining}</span>
                            <span className="text-muted-foreground text-xs"> / {b.quota}</span>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ===== Holidays ===== */}
      {tab === "holidays" && (
        <Card className="p-5">
          <SectionTitle title="Public Holidays"
            action={<Btn onClick={() => setHolidayModal(true)}><Plus className="h-4 w-4" /> Add Holiday</Btn>} />
          <ul className="space-y-2">
            {holidays.map(h => (
              <li key={h.id} className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3">
                <div>
                  <div className="font-semibold text-primary">{h.name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
                </div>
                <button onClick={() => removeHoliday(h.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {holidays.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No holidays defined</p>}
          </ul>
        </Card>
      )}

      {/* ===== Modals ===== */}
      <Modal open={leaveModal} onClose={() => setLeaveModal(false)} title="New Leave Request"
        footer={<><Btn variant="outline" onClick={() => setLeaveModal(false)}>Cancel</Btn>
          <button form="lv-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Submit</button></>}>
        <form id="lv-form" onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          submitLeave({
            empId: String(fd.get("empId")),
            type: fd.get("type") as Leave["type"],
            from: String(fd.get("from")),
            to: String(fd.get("to")),
            reason: String(fd.get("reason")),
          });
          setLeaveModal(false);
        }}>
          <Field label="Employee" required>
            <Select name="empId" required>
              <option value="">Select employee…</option>
              {employees.map(e => <option key={e.id} value={e.empId}>{e.name} ({e.empId})</option>)}
            </Select>
          </Field>
          <Field label="Leave type" required>
            <Select name="type" required>
              {Object.keys(LEAVE_QUOTA).map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" required><Input name="from" type="date" required defaultValue={today} /></Field>
            <Field label="To" required><Input name="to" type="date" required defaultValue={today} /></Field>
          </div>
          <Field label="Reason" required><TextArea name="reason" required /></Field>
        </form>
      </Modal>

      <Modal open={holidayModal} onClose={() => setHolidayModal(false)} title="Add Holiday"
        footer={<><Btn variant="outline" onClick={() => setHolidayModal(false)}>Cancel</Btn>
          <button form="hol-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Add</button></>}>
        <form id="hol-form" onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          addHoliday(String(fd.get("date")), String(fd.get("name")));
          setHolidayModal(false);
        }}>
          <Field label="Date" required><Input name="date" type="date" required /></Field>
          <Field label="Holiday name" required><Input name="name" required placeholder="e.g. Eid-ul-Fitr" /></Field>
        </form>
      </Modal>

      <Modal open={!!markModal} onClose={() => setMarkModal(null)} title={`Update — ${markModal?.emp.name} · ${markModal?.date}`}
        footer={<Btn variant="outline" onClick={() => setMarkModal(null)}>Close</Btn>}>
        {markModal && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Override attendance status for this day.</p>
            <div className="grid grid-cols-2 gap-2">
              {(["Present", "Late", "Half Day", "Absent"] as AttStatus[]).map(st => (
                <button key={st}
                  onClick={() => {
                    const existing = recordOf(markModal.emp.empId, markModal.date);
                    if (existing) setRecords(rs => rs.map(r => r.id === existing.id ? { ...r, status: st } : r));
                    else setRecords(rs => [{ id: uid(), empId: markModal.emp.empId, date: markModal.date, status: st }, ...rs]);
                    push({ title: `${markModal.emp.name} · ${markModal.date} → ${st}`, tone: "info" });
                    setMarkModal(null);
                  }}
                  className="px-4 py-3 rounded-xl border border-border hover:bg-muted/50 text-sm font-semibold text-primary">
                  {st}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
};

export default Attendance;

