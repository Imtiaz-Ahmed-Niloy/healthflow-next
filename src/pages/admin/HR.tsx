"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Kpi, SectionTitle, Pill, Btn } from "@/components/admin/ui";
import { load, save, uid } from "@/lib/storage";
import {
  Users2, UserPlus, UserMinus, CalendarCheck2, Wallet, Cake, Award, Sparkles,
  TrendingUp, Search, Plus, CheckCircle2, XCircle, Clock3, GraduationCap, Briefcase,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from "recharts";

// ---------- data models ----------
type Employee = {
  id: string; empId: string; name: string; department: string;
  designation: string; doj: string; status: "Active" | "Onboarding" | "Exit" | "On Leave";
  email?: string; phone?: string;
};

const seed: Employee[] = [
  { id: "e1", empId: "EMP-1001", name: "Sara Khan", department: "Nursing", designation: "Senior Nurse", doj: "2020-06-15", status: "Active" },
  { id: "e2", empId: "EMP-1002", name: "Imran Hossain", department: "Cardiology", designation: "Consultant", doj: "2018-03-01", status: "Active" },
  { id: "e3", empId: "EMP-1003", name: "Ali Karim", department: "Maintenance", designation: "Technician", doj: "2022-11-20", status: "Onboarding" },
  { id: "e4", empId: "EMP-1004", name: "Lila Ahmed", department: "Finance", designation: "Accountant", doj: "2019-09-09", status: "Active" },
  { id: "e5", empId: "EMP-1005", name: "Rafiq Mia", department: "Neurology", designation: "Resident", doj: "2023-02-12", status: "Active" },
  { id: "e6", empId: "EMP-1006", name: "Mim Akter", department: "Nursing", designation: "Nurse", doj: "2024-01-08", status: "Onboarding" },
  { id: "e7", empId: "EMP-1007", name: "Hasan Reza", department: "IT", designation: "Sys Admin", doj: "2021-07-22", status: "Active" },
  { id: "e8", empId: "EMP-1008", name: "Nadia Islam", department: "HR", designation: "HR Officer", doj: "2017-04-19", status: "Active" },
  { id: "e9", empId: "EMP-1009", name: "Tanveer Bhuiyan", department: "Pharmacy", designation: "Pharmacist", doj: "2020-10-03", status: "On Leave" },
  { id: "e10", empId: "EMP-1010", name: "Sumi Begum", department: "Cardiology", designation: "Nurse", doj: "2015-08-30", status: "Active" },
];

const headcountTrend = [
  { m: "Jan", staff: 312, hires: 14, exits: 6 },
  { m: "Feb", staff: 320, hires: 18, exits: 10 },
  { m: "Mar", staff: 328, hires: 16, exits: 8 },
  { m: "Apr", staff: 339, hires: 22, exits: 11 },
  { m: "May", staff: 348, hires: 19, exits: 10 },
  { m: "Jun", staff: 357, hires: 21, exits: 12 },
];
const attendanceWeek = [
  { d: "Mon", present: 312, leave: 18, absent: 7 },
  { d: "Tue", present: 318, leave: 14, absent: 5 },
  { d: "Wed", present: 305, leave: 22, absent: 10 },
  { d: "Thu", present: 322, leave: 11, absent: 4 },
  { d: "Fri", present: 314, leave: 17, absent: 6 },
  { d: "Sat", present: 268, leave: 51, absent: 18 },
  { d: "Sun", present: 240, leave: 80, absent: 17 },
];
const COLORS = ["hsl(var(--primary))", "hsl(var(--primary-glow))", "hsl(var(--accent))", "hsl(var(--chip))", "hsl(var(--muted))"];

type LeaveReq = { id: string; name: string; type: string; from: string; to: string; status: "Pending" | "Approved" | "Rejected" };
const seedLeave: LeaveReq[] = [
  { id: "l1", name: "Sara Khan", type: "Sick", from: "2026-05-24", to: "2026-05-26", status: "Pending" },
  { id: "l2", name: "Imran Hossain", type: "Casual", from: "2026-05-28", to: "2026-05-29", status: "Pending" },
  { id: "l3", name: "Mim Akter", type: "Annual", from: "2026-06-02", to: "2026-06-08", status: "Pending" },
  { id: "l4", name: "Hasan Reza", type: "Sick", from: "2026-05-20", to: "2026-05-21", status: "Approved" },
];

type Pipeline = { id: string; name: string; role: string; stage: "Applied" | "Interview" | "Offer" | "Hired" };
const pipeline: Pipeline[] = [
  { id: "p1", name: "Arif Mahmud", role: "Staff Nurse", stage: "Applied" },
  { id: "p2", name: "Rumana Akhter", role: "Pharmacist", stage: "Applied" },
  { id: "p3", name: "Salman Rahim", role: "Lab Tech", stage: "Interview" },
  { id: "p4", name: "Jaya Saha", role: "HR Exec", stage: "Interview" },
  { id: "p5", name: "Tariq Aziz", role: "Consultant", stage: "Offer" },
  { id: "p6", name: "Mehek Sultana", role: "Receptionist", stage: "Hired" },
];

const birthdays = [
  { n: "Sumi Begum", d: "May 25", dept: "Cardiology" },
  { n: "Rafiq Mia", d: "May 28", dept: "Neurology" },
  { n: "Nadia Islam", d: "Jun 02", dept: "HR" },
];

const HRPage = () => {
  const [employees, setEmployees] = useState<Employee[]>(() => load<Employee[]>("hr-employees-v2", seed));
  const [leaves, setLeaves] = useState<LeaveReq[]>(() => load<LeaveReq[]>("hr-leaves", seedLeave));
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>({ status: "Active" });

  const persistEmp = (next: Employee[]) => { setEmployees(next); save("hr-employees-v2", next); };
  const persistLeave = (next: LeaveReq[]) => { setLeaves(next); save("hr-leaves", next); };

  const total = employees.length;
  const active = employees.filter(e => e.status === "Active").length;
  const onboarding = employees.filter(e => e.status === "Onboarding").length;
  const onLeave = employees.filter(e => e.status === "On Leave").length;
  const exits = employees.filter(e => e.status === "Exit").length;
  const attendanceRate = Math.round((active / Math.max(total, 1)) * 100);

  const deptSummary = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach(e => map.set(e.department, (map.get(e.department) || 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [employees]);

  const departments = ["All", ...Array.from(new Set(employees.map(e => e.department)))];
  const filtered = employees.filter(e =>
    (dept === "All" || e.department === dept) &&
    (q === "" || `${e.name} ${e.empId} ${e.designation}`.toLowerCase().includes(q.toLowerCase()))
  );

  const stages: Pipeline["stage"][] = ["Applied", "Interview", "Offer", "Hired"];

  const handleLeave = (id: string, status: "Approved" | "Rejected") =>
    persistLeave(leaves.map(l => l.id === id ? { ...l, status } : l));

  const addEmployee = () => {
    if (!form.name || !form.empId) return;
    const next: Employee = {
      id: uid(), empId: form.empId!, name: form.name!,
      department: form.department || "Nursing", designation: form.designation || "Staff",
      doj: form.doj || new Date().toISOString().slice(0, 10),
      status: (form.status as Employee["status"]) || "Active",
    };
    persistEmp([next, ...employees]);
    setAdding(false); setForm({ status: "Active" });
  };

  const statusTone = (s: string) =>
    s === "Active" ? "ok" : s === "Onboarding" ? "info" : s === "On Leave" ? "warn" : "bad";

  return (
    <AdminLayout title="HR Manager Dashboard" subtitle="People · Performance · Payroll insights">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <Kpi icon={Users2} label="Total Headcount" value={String(total)} trend="+4.2%" />
        <Kpi icon={CheckCircle2} label="Active" value={String(active)} tone="accent" />
        <Kpi icon={UserPlus} label="Onboarding" value={String(onboarding)} tone="chip" trend="this month" />
        <Kpi icon={Clock3} label="On Leave Today" value={String(onLeave)} tone="chip" />
        <Kpi icon={UserMinus} label="Attrition" value={`${exits}`} tone="destructive" trend="-1.1%" />
        <Kpi icon={Wallet} label="Monthly Payroll" value="৳ 48.6L" trend="+3.0%" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Headcount & Movement" action={<Pill tone="info">Last 6 months</Pill>} />
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={headcountTrend}>
                <defs>
                  <linearGradient id="hc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Area type="monotone" dataKey="staff" stroke="hsl(var(--primary))" fill="url(#hc)" strokeWidth={2} />
                <Bar dataKey="hires" fill="hsl(var(--primary-glow))" />
                <Bar dataKey="exits" fill="hsl(var(--destructive))" />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Workforce Health" />
          <div className="h-40">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="55%" outerRadius="100%" data={[
                { name: "Attendance", value: attendanceRate, fill: "hsl(var(--primary))" },
              ]} startAngle={90} endAngle={-270}>
                <RadialBar background dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center -mt-32">
            <p className="font-display text-3xl text-primary">{attendanceRate}%</p>
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground">ATTENDANCE</p>
          </div>
          <div className="mt-28 grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xs text-muted-foreground">eNPS</p><p className="font-bold text-primary">+38</p></div>
            <div><p className="text-xs text-muted-foreground">Retention</p><p className="font-bold text-primary">94%</p></div>
            <div><p className="text-xs text-muted-foreground">Open Roles</p><p className="font-bold text-primary">7</p></div>
          </div>
        </Card>
      </div>

      {/* Attendance + dept mix */}
      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Weekly Attendance" action={<Pill tone="ok">Live</Pill>} />
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={attendanceWeek} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="present" stackId="a" fill="hsl(var(--primary))" radius={[0,0,0,0]} />
                <Bar dataKey="leave" stackId="a" fill="hsl(var(--primary-glow))" />
                <Bar dataKey="absent" stackId="a" fill="hsl(var(--destructive))" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Department Mix" />
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={deptSummary} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={3}>
                  {deptSummary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Pipeline */}
      <div className="mt-6">
        <Card className="p-5">
          <SectionTitle title="Recruitment Pipeline" action={<Btn variant="outline"><GraduationCap className="h-4 w-4" /> New Requisition</Btn>} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stages.map((s, idx) => {
              const items = pipeline.filter(p => p.stage === s);
              const tones = ["bg-chip/40", "bg-accent/30", "bg-primary/10", "bg-primary/20"];
              return (
                <div key={s} className={`rounded-2xl p-4 ${tones[idx]} border border-border/40`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs tracking-widest font-bold text-primary">{s.toUpperCase()}</p>
                    <span className="text-xs font-bold text-primary">{items.length}</span>
                  </div>
                  <ul className="space-y-2">
                    {items.map(p => (
                      <li key={p.id} className="rounded-xl bg-card border border-border/60 px-3 py-2">
                        <p className="text-sm font-semibold text-primary truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.role}</p>
                      </li>
                    ))}
                    {items.length === 0 && <li className="text-[11px] text-muted-foreground text-center py-3">Empty</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Leave + Birthdays + Top performers */}
      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Leave Requests" action={<Pill tone="warn">{leaves.filter(l => l.status === "Pending").length} pending</Pill>} />
          <ul className="space-y-2">
            {leaves.map(l => (
              <li key={l.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold">
                  {l.name.split(" ").map(s => s[0]).slice(0,2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">{l.name} <span className="text-muted-foreground font-normal">· {l.type}</span></p>
                  <p className="text-[11px] text-muted-foreground">{l.from} → {l.to}</p>
                </div>
                {l.status === "Pending" ? (
                  <div className="flex gap-1.5">
                    <button onClick={() => handleLeave(l.id, "Approved")} className="h-8 w-8 grid place-items-center rounded-full bg-accent/50 text-accent-foreground hover:opacity-80" title="Approve"><CheckCircle2 className="h-4 w-4" /></button>
                    <button onClick={() => handleLeave(l.id, "Rejected")} className="h-8 w-8 grid place-items-center rounded-full bg-destructive/15 text-destructive hover:opacity-80" title="Reject"><XCircle className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <Pill tone={l.status === "Approved" ? "ok" : "bad"}>{l.status}</Pill>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle title="Birthdays" action={<Cake className="h-4 w-4 text-primary-glow" />} />
            <ul className="space-y-3">
              {birthdays.map(b => (
                <li key={b.n} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-primary">{b.n}</p>
                    <p className="text-[11px] text-muted-foreground">{b.dept}</p>
                  </div>
                  <Pill tone="info">{b.d}</Pill>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Top Performers" action={<Award className="h-4 w-4 text-primary-glow" />} />
            <ul className="space-y-3">
              {[
                { n: "Dr. Imran Hossain", s: 98, d: "Cardiology" },
                { n: "Sara Khan", s: 95, d: "Nursing" },
                { n: "Nadia Islam", s: 92, d: "HR" },
              ].map(t => (
                <li key={t.n}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-primary">{t.n}</span>
                    <span className="text-xs text-primary-glow font-bold">{t.s}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1">{t.d}</p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary-glow" style={{ width: `${t.s}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Employee directory */}
      <div className="mt-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-xl text-primary">Employee Directory</h2>
              <p className="text-xs text-muted-foreground">{filtered.length} of {total} employees</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, ID, role"
                  className="pl-9 pr-3 py-2 rounded-full bg-muted/40 text-sm outline-none w-56" />
              </div>
              <select value={dept} onChange={e => setDept(e.target.value)}
                className="bg-muted/40 rounded-full px-3 py-2 text-xs font-semibold outline-none">
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <Btn onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add Employee</Btn>
            </div>
          </div>

          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] tracking-widest text-muted-foreground border-b border-border/60">
                  <th className="px-5 py-3 font-bold">EMPLOYEE</th>
                  <th className="px-3 py-3 font-bold">ID</th>
                  <th className="px-3 py-3 font-bold">DEPARTMENT</th>
                  <th className="px-3 py-3 font-bold">DESIGNATION</th>
                  <th className="px-3 py-3 font-bold">JOINED</th>
                  <th className="px-3 py-3 font-bold">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground grid place-items-center text-xs font-bold">
                          {e.name.split(" ").map(s => s[0]).slice(0,2).join("")}
                        </div>
                        <span className="font-semibold text-primary">{e.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{e.empId}</td>
                    <td className="px-3 py-3">{e.department}</td>
                    <td className="px-3 py-3 text-muted-foreground">{e.designation}</td>
                    <td className="px-3 py-3 text-muted-foreground">{e.doj}</td>
                    <td className="px-3 py-3"><Pill tone={statusTone(e.status) as never}>{e.status}</Pill></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-sm text-muted-foreground">No employees match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* AI insight strip */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="mt-6 rounded-2xl p-6 bg-gradient-dark text-surface-dark-foreground flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-white/15 grid place-items-center"><Sparkles className="h-6 w-6" /></div>
        <div className="flex-1">
          <p className="text-[10px] tracking-widest font-bold text-accent">HR INSIGHTS</p>
          <p className="font-display text-xl mt-1">Nursing dept is trending toward 12% overtime — consider hiring 3 staff nurses before next quarter.</p>
        </div>
        <Btn variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20"><TrendingUp className="h-4 w-4" /> View forecast</Btn>
      </motion.div>

      {/* Add employee modal */}
      {adding && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setAdding(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl border border-border/60" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Briefcase className="h-5 w-5" /></div>
              <div>
                <h3 className="font-display text-lg text-primary">Add Employee</h3>
                <p className="text-xs text-muted-foreground">Quick onboarding record</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="col-span-2 bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none" placeholder="Full name"
                value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className="bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none" placeholder="Employee ID"
                value={form.empId || ""} onChange={e => setForm({ ...form, empId: e.target.value })} />
              <input type="date" className="bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none"
                value={form.doj || ""} onChange={e => setForm({ ...form, doj: e.target.value })} />
              <select className="bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none"
                value={form.department || ""} onChange={e => setForm({ ...form, department: e.target.value })}>
                <option value="">Department</option>
                {["Nursing", "Cardiology", "Neurology", "Maintenance", "Finance", "HR", "IT", "Pharmacy"].map(d => <option key={d}>{d}</option>)}
              </select>
              <input className="bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none" placeholder="Designation"
                value={form.designation || ""} onChange={e => setForm({ ...form, designation: e.target.value })} />
              <select className="col-span-2 bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none"
                value={form.status || "Active"} onChange={e => setForm({ ...form, status: e.target.value as Employee["status"] })}>
                {["Active", "Onboarding", "On Leave", "Exit"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Btn variant="outline" onClick={() => setAdding(false)}>Cancel</Btn>
              <Btn onClick={addEmployee}>Save Employee</Btn>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default HRPage;

