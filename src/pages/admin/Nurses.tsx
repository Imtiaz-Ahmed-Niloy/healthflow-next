"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Card, Kpi, Pill, Btn, SectionTitle } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { load, save, uid } from "@/lib/storage";
import {
  HeartPulse, Users, Building2, CalendarRange, Star, Activity,
  Plus, Trash2, TrendingUp, ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

type Nurse = {
  id: string; name: string; ward: string; shift: string;
  license: string; phone: string; status: string;
  email?: string; experience?: string; qualification?: string;
};

const seed: Nurse[] = [
  { id: "n1", name: "Nadia Sultana", ward: "ICU", shift: "Morning", license: "RN-9912", phone: "+1 555 0301", status: "Active", email: "nadia@hf.pro", experience: "6", qualification: "BSc Nursing" },
  { id: "n2", name: "Farhana Akter", ward: "Pediatrics", shift: "Night", license: "RN-9913", phone: "+1 555 0302", status: "Active", email: "farhana@hf.pro", experience: "4", qualification: "Diploma in Nursing" },
  { id: "n3", name: "Roman Hassan", ward: "ER", shift: "Evening", license: "RN-9914", phone: "+1 555 0303", status: "On Leave", email: "roman@hf.pro", experience: "8", qualification: "BSc Nursing" },
];

const WARDS = ["ICU", "Pediatrics", "ER", "Maternity", "General", "Oncology", "Surgery", "Cardiology"];
const SHIFTS = ["Morning", "Evening", "Night"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TABS = ["Directory", "Department Allocation", "Shift Management", "Performance"] as const;
type Tab = (typeof TABS)[number];

const Page = () => {
  const [tab, setTab] = useState<Tab>("Directory");
  return (
    <AdminLayout title="Nurse Management" subtitle="Directory, allocation, shifts & performance">
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t ? "bg-primary text-primary-foreground shadow-soft" : "bg-card border border-border/60 text-foreground/70 hover:bg-muted/60"
            }`}>{t}</button>
        ))}
      </div>
      {tab === "Directory" && <DirectoryTab />}
      {tab === "Department Allocation" && <AllocationTab />}
      {tab === "Shift Management" && <ShiftTab />}
      {tab === "Performance" && <PerformanceTab />}
    </AdminLayout>
  );
};

const DirectoryTab = () => (
  <ResourcePage<Nurse> config={{
    storeKey: "nurses", seed, searchFields: ["name", "ward", "license"],
    statuses: ["Active", "On Leave", "Suspended"],
    columns: [
      { key: "name", label: "Name", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
      { key: "ward", label: "Ward", sortable: true, accessor: r => r.ward },
      { key: "shift", label: "Shift" },
      { key: "qualification", label: "Qualification", accessor: r => r.qualification || "" },
      { key: "license", label: "License" },
      { key: "phone", label: "Phone" },
      { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
    ],
    fields: [
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "qualification", label: "Qualification", type: "text" },
      { name: "experience", label: "Experience (years)", type: "number" },
      { name: "ward", label: "Ward / Department", type: "select", options: WARDS },
      { name: "shift", label: "Shift", type: "select", options: SHIFTS },
      { name: "license", label: "License #", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "status", label: "Status", type: "select", options: ["Active", "On Leave", "Suspended"] },
    ],
  }} />
);

// ---------- Department Allocation ----------
const AllocationTab = () => {
  const nurses = load<Nurse[]>("nurses", seed);
  const [list, setList] = useState<Nurse[]>(nurses);
  useEffect(() => { save("nurses", list); }, [list]);

  const byWard = useMemo(() => {
    const m: Record<string, Nurse[]> = {};
    WARDS.forEach(w => (m[w] = []));
    list.forEach(n => { (m[n.ward] ||= []).push(n); });
    return m;
  }, [list]);

  const move = (id: string, ward: string) =>
    setList(prev => prev.map(n => n.id === id ? { ...n, ward } : n));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Total Nurses" value={String(list.length)} tone="primary" />
        <Kpi icon={Building2} label="Departments" value={String(WARDS.length)} tone="accent" />
        <Kpi icon={HeartPulse} label="ICU Coverage" value={String(byWard["ICU"]?.length || 0)} tone="destructive" />
        <Kpi icon={Activity} label="ER Coverage" value={String(byWard["ER"]?.length || 0)} tone="chip" />
      </div>

      <Card className="p-5">
        <SectionTitle title="Department Allocation" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {WARDS.map(w => (
            <div key={w} className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="font-display text-sm text-primary">{w}</p>
                <Pill tone="info">{byWard[w]?.length || 0}</Pill>
              </div>
              <ul className="space-y-2">
                {(byWard[w] || []).map(n => (
                  <li key={n.id} className="rounded-lg bg-card border border-border/40 p-2">
                    <div className="font-semibold text-sm text-primary truncate">{n.name}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-muted-foreground">{n.shift}</span>
                      <select value={n.ward} onChange={e => move(n.id, e.target.value)}
                        className="text-[11px] bg-muted/40 rounded px-1 py-0.5">
                        {WARDS.map(x => <option key={x}>{x}</option>)}
                      </select>
                    </div>
                  </li>
                ))}
                {(byWard[w] || []).length === 0 && (
                  <li className="text-[11px] text-muted-foreground text-center py-3">Unassigned</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ---------- Shift Management ----------
type Shift = { id: string; nurseId: string; day: string; type: "Morning" | "Evening" | "Night" | "Off"; ward: string };

const SHIFT_TONES: Record<Shift["type"], string> = {
  "Morning": "bg-primary/15 text-primary border-primary/30",
  "Evening": "bg-accent/40 text-accent-foreground border-accent/60",
  "Night": "bg-chip text-chip-foreground border-border",
  "Off": "bg-muted text-muted-foreground border-border",
};

const ShiftTab = () => {
  const nurses = load<Nurse[]>("nurses", seed);
  const [shifts, setShifts] = useState<Shift[]>(() => load<Shift[]>("nurse-shifts", [
    { id: uid(), nurseId: nurses[0]?.id || "", day: "Mon", type: "Morning", ward: "ICU" },
    { id: uid(), nurseId: nurses[1]?.id || nurses[0]?.id || "", day: "Tue", type: "Night", ward: "Pediatrics" },
  ]));
  const [form, setForm] = useState<Omit<Shift, "id">>({ nurseId: nurses[0]?.id || "", day: "Mon", type: "Morning", ward: "" });
  useEffect(() => { save("nurse-shifts", shifts); }, [shifts]);

  const add = () => {
    if (!form.nurseId) return toast.error("Pick a nurse");
    setShifts(s => [...s, { ...form, id: uid() }]);
    toast.success("Shift added");
  };
  const remove = (id: string) => setShifts(s => s.filter(x => x.id !== id));
  const cell = (nid: string, day: string) => shifts.filter(s => s.nurseId === nid && s.day === day);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={CalendarRange} label="Shifts Scheduled" value={String(shifts.length)} tone="primary" />
        <Kpi icon={HeartPulse} label="Morning" value={String(shifts.filter(s => s.type === "Morning").length)} tone="accent" />
        <Kpi icon={Activity} label="Evening" value={String(shifts.filter(s => s.type === "Evening").length)} tone="chip" />
        <Kpi icon={ClipboardList} label="Night" value={String(shifts.filter(s => s.type === "Night").length)} tone="destructive" />
      </div>

      <Card className="p-5">
        <SectionTitle title="Add Shift" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select value={form.nurseId} onChange={e => setForm({ ...form, nurseId: e.target.value })}
            className="md:col-span-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <option value="">Select nurse…</option>
            {nurses.map(n => <option key={n.id} value={n.id}>{n.name} — {n.ward}</option>)}
          </select>
          <select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            {DAYS.map(d => <option key={d}>{d}</option>)}
          </select>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Shift["type"] })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            {(Object.keys(SHIFT_TONES) as Shift["type"][]).map(t => <option key={t}>{t}</option>)}
          </select>
          <input placeholder="Ward" value={form.ward} onChange={e => setForm({ ...form, ward: e.target.value })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end mt-4">
          <Btn onClick={add}><Plus className="h-4 w-4" /> Add Shift</Btn>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Weekly Roster" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-widest font-bold text-muted-foreground">
                <th className="py-2 pr-3 sticky left-0 bg-card">NURSE</th>
                {DAYS.map(d => <th key={d} className="py-2 px-2 text-center">{d.toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
              {nurses.map(n => (
                <tr key={n.id} className="border-t border-border/40 align-top">
                  <td className="py-3 pr-3 sticky left-0 bg-card">
                    <div className="font-semibold text-primary text-sm">{n.name}</div>
                    <div className="text-xs text-muted-foreground">{n.ward}</div>
                  </td>
                  {DAYS.map(day => (
                    <td key={day} className="py-2 px-1 min-w-[110px]">
                      <div className="flex flex-col gap-1">
                        {cell(n.id, day).map(s => (
                          <div key={s.id} className={`relative group rounded-lg border px-2 py-1.5 text-[11px] ${SHIFT_TONES[s.type]}`}>
                            <div className="font-bold">{s.type}</div>
                            {s.ward && <div className="opacity-70 truncate">{s.ward}</div>}
                            <button onClick={() => remove(s.id)}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 grid place-items-center">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {nurses.length === 0 && (
                <tr><td colSpan={DAYS.length + 1} className="py-8 text-center text-muted-foreground">Add nurses first.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border/40">
          <span className="text-xs font-semibold text-muted-foreground">Legend:</span>
          {(Object.keys(SHIFT_TONES) as Shift["type"][]).map(t => (
            <span key={t} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${SHIFT_TONES[t]}`}>{t}</span>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ---------- Performance ----------
type Perf = {
  nurseId: string;
  patientsHandled: number;
  hoursWorked: number;
  attendance: number; // %
  incidents: number;
  feedback: number; // 0-5
};

const seedPerf = (nurses: Nurse[]): Perf[] => nurses.map((n, i) => ({
  nurseId: n.id,
  patientsHandled: 60 + i * 20,
  hoursWorked: 140 + i * 8,
  attendance: 92 + (i % 6),
  incidents: i % 3,
  feedback: 4.2 + ((i % 5) * 0.15),
}));

const PerformanceTab = () => {
  const nurses = load<Nurse[]>("nurses", seed);
  const [perf, setPerf] = useState<Perf[]>(() => {
    const stored = load<Perf[]>("nurse-perf", []);
    return nurses.map(n => stored.find(p => p.nurseId === n.id) || seedPerf([n])[0]);
  });
  useEffect(() => { save("nurse-perf", perf); }, [perf]);

  const totals = useMemo(() => ({
    patients: perf.reduce((s, p) => s + p.patientsHandled, 0),
    hours: perf.reduce((s, p) => s + p.hoursWorked, 0),
    attendance: perf.length ? (perf.reduce((s, p) => s + p.attendance, 0) / perf.length).toFixed(1) : "0",
    feedback: perf.length ? (perf.reduce((s, p) => s + p.feedback, 0) / perf.length).toFixed(2) : "0",
  }), [perf]);

  const update = (id: string, patch: Partial<Perf>) =>
    setPerf(prev => prev.map(p => p.nurseId === id ? { ...p, ...patch } : p));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Patients Handled" value={totals.patients.toLocaleString()} tone="primary" />
        <Kpi icon={Activity} label="Hours Worked" value={totals.hours.toLocaleString()} tone="accent" />
        <Kpi icon={HeartPulse} label="Avg Attendance" value={`${totals.attendance}%`} tone="chip" trend="+2%" />
        <Kpi icon={Star} label="Avg Feedback" value={`${totals.feedback} / 5`} tone="primary" />
      </div>

      <Card className="p-5">
        <SectionTitle title="Nurse Performance" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-widest font-bold text-muted-foreground border-b border-border/60">
                <th className="py-2 pr-3">NURSE</th>
                <th className="py-2 pr-3">PATIENTS</th>
                <th className="py-2 pr-3">HOURS</th>
                <th className="py-2 pr-3">ATTENDANCE %</th>
                <th className="py-2 pr-3">INCIDENTS</th>
                <th className="py-2 pr-3">FEEDBACK</th>
              </tr>
            </thead>
            <tbody>
              {nurses.map(n => {
                const p = perf.find(x => x.nurseId === n.id) || seedPerf([n])[0];
                return (
                  <tr key={n.id} className="border-b border-border/40">
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-primary">{n.name}</div>
                      <div className="text-xs text-muted-foreground">{n.ward} · {n.shift}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <input type="number" value={p.patientsHandled}
                        onChange={e => update(n.id, { patientsHandled: Number(e.target.value) })}
                        className="w-24 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                    </td>
                    <td className="py-3 pr-3">
                      <input type="number" value={p.hoursWorked}
                        onChange={e => update(n.id, { hoursWorked: Number(e.target.value) })}
                        className="w-24 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" max="100" value={p.attendance}
                          onChange={e => update(n.id, { attendance: Number(e.target.value) })}
                          className="w-20 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                        <div className="w-24 h-2 bg-muted/50 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-primary-glow"
                            style={{ width: `${Math.min(100, p.attendance)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <input type="number" min="0" value={p.incidents}
                        onChange={e => update(n.id, { incidents: Number(e.target.value) })}
                        className="w-20 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <input type="number" step="0.1" min="0" max="5" value={p.feedback}
                          onChange={e => update(n.id, { feedback: Number(e.target.value) })}
                          className="w-20 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {nurses.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No nurses yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-4">
          <Btn onClick={() => { save("nurse-perf", perf); toast.success("Performance saved"); }}>
            <TrendingUp className="h-4 w-4" /> Save Metrics
          </Btn>
        </div>
      </Card>
    </div>
  );
};

export default Page;

