"use client";

import { useMemo, useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Card, Kpi, Pill, Btn, SectionTitle } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { load, save, uid } from "@/lib/storage";
import { useListResourceQuery } from "@/redux/api/createResourceApi";
import {
  Stethoscope, Users, DollarSign, Star, CalendarRange, ClipboardList,
  Plus, Trash2, TrendingUp, Activity,
} from "lucide-react";
import { toast } from "sonner";

// Mirrors public.doctors (supabase/migrations/0005_doctors.sql). Column names
// are the database's, so form values post straight through with no mapping.
// `hospital` is gone: which hospital a doctor belongs to is tenant_id, set
// from the session, not typed in.
type Doctor = {
  id: string;
  tenant_id?: string;
  slug?: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  status: string;
  education: string;
  languages: string;
  expertise: string;
  bio: string;
  availability: string;
  photo_url: string;
  experience_years: string;
  rating: string;
  consultation_fee: string;
  patients_treated: string;
  consultation_duration_minutes: string;
};

// The hardcoded seed is gone: this page reads public.doctors now. Demo rows
// belong in supabase seed files (Dip, week 1), not in the component.

const TABS = ["Directory", "Performance", "Scheduling"] as const;
type Tab = (typeof TABS)[number];

const Doctors = () => {
  const [tab, setTab] = useState<Tab>("Directory");
  return (
    <AdminLayout title="Doctor Management" subtitle="Directory, performance & scheduling">
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t ? "bg-primary text-primary-foreground shadow-soft" : "bg-card border border-border/60 text-foreground/70 hover:bg-muted/60"
            }`}>{t}</button>
        ))}
      </div>
      {tab === "Directory" && <DirectoryTab />}
      {tab === "Performance" && <PerformanceTab />}
      {tab === "Scheduling" && <SchedulingTab />}
    </AdminLayout>
  );
};

const DirectoryTab = () => (
  <ResourcePage<Doctor> config={{
    storeKey: "doctors",
    // Reads and writes public.doctors through /api/v1/doctors. `seed` is no
    // longer used by this tab — Performance and Scheduling below still run on
    // localStorage until their own tables land in week 3.
    resource: "doctors",
    searchFields: ["name", "specialty", "email"],
    statuses: ["active", "on_leave", "suspended"],
    columns: [
      { key: "name", label: "Name", accessor: r => r.name, sortable: true,
        render: r => <span className="font-semibold text-primary">{r.name}</span> },
      { key: "specialty", label: "Specialization", accessor: r => r.specialty, sortable: true },
      { key: "education", label: "Qualifications", accessor: r => r.education },
      { key: "availability", label: "Availability", accessor: r => r.availability },
      { key: "experience_years", label: "Exp (yrs)", accessor: r => r.experience_years, sortable: true },
      { key: "consultation_fee", label: "Fee", accessor: r => r.consultation_fee },
      { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
    ],
    fields: [
      { name: "photo_url", label: "Doctor photo", type: "image" },
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "specialty", label: "Specialization", type: "select", options: ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Oncology", "Dermatology", "Gynecology", "General"] },
      { name: "education", label: "Education / Qualifications", type: "text", required: true },
      { name: "experience_years", label: "Experience (years)", type: "number", required: true },
      { name: "rating", label: "Rating (0–5)", type: "number" },
      { name: "consultation_fee", label: "Consultation Fee (USD)", type: "number", required: true },
      { name: "patients_treated", label: "Patients treated", type: "number" },
      { name: "consultation_duration_minutes", label: "Consultation duration (minutes)", type: "number" },
      { name: "languages", label: "Languages (comma separated)", type: "text" },
      { name: "availability", label: "Availability (e.g. Mon–Fri 09:00–17:00)", type: "text" },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "status", label: "Status", type: "select", options: ["active", "on_leave", "suspended"] },
      { name: "expertise", label: "Areas of Expertise (comma separated)", type: "textarea" },
      { name: "bio", label: "About / Biography", type: "textarea" },
    ],
  }} />
);

// ---------- Performance ----------
type Perf = {
  doctorId: string;
  patientVolume: number;
  consultations: number;
  revenue: number;
  feedback: number; // 0-5
};

const seedPerf = (docs: Doctor[]): Perf[] => docs.map((d, i) => ({
  doctorId: d.id,
  patientVolume: 120 + i * 35,
  consultations: 80 + i * 22,
  revenue: (Number(d.consultation_fee) || 100) * (80 + i * 22),
  feedback: Math.min(5, Number(d.rating) || 4.5),
}));

/**
 * Doctor list for the read-only tabs. These two tabs still keep their own
 * metrics and shifts in localStorage — those tables arrive in week 3 — but
 * the doctors they hang off must come from the database, or they would list
 * nothing now that Directory no longer writes to localStorage.
 */
const useDoctorList = () => {
  const { data } = useListResourceQuery({ resource: "doctors", limit: 100 });
  return (data?.data ?? []) as Doctor[];
};

const PerformanceTab = () => {
  const docs = useDoctorList();
  const [perf, setPerf] = useState<Perf[]>(() => {
    const stored = load<Perf[]>("doctor-perf", []);
    const merged = docs.map(d => stored.find(p => p.doctorId === d.id) || seedPerf([d])[0]);
    return merged;
  });
  useEffect(() => { save("doctor-perf", perf); }, [perf]);

  const totals = useMemo(() => ({
    patients: perf.reduce((s, p) => s + p.patientVolume, 0),
    consults: perf.reduce((s, p) => s + p.consultations, 0),
    revenue: perf.reduce((s, p) => s + p.revenue, 0),
    avgFeedback: perf.length ? (perf.reduce((s, p) => s + p.feedback, 0) / perf.length).toFixed(2) : "0",
  }), [perf]);

  const maxRev = Math.max(1, ...perf.map(p => p.revenue));
  const update = (id: string, patch: Partial<Perf>) =>
    setPerf(prev => prev.map(p => p.doctorId === id ? { ...p, ...patch } : p));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Total Patients" value={totals.patients.toLocaleString()} tone="primary" />
        <Kpi icon={Activity} label="Consultations" value={totals.consults.toLocaleString()} tone="accent" />
        <Kpi icon={DollarSign} label="Revenue Generated" value={`$${totals.revenue.toLocaleString()}`} tone="chip" trend="+12%" />
        <Kpi icon={Star} label="Avg Feedback" value={`${totals.avgFeedback} / 5`} tone="primary" />
      </div>

      <Card className="p-5">
        <SectionTitle title="Doctor Performance" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-widest font-bold text-muted-foreground border-b border-border/60">
                <th className="py-2 pr-3">DOCTOR</th>
                <th className="py-2 pr-3">PATIENT VOLUME</th>
                <th className="py-2 pr-3">CONSULTATIONS</th>
                <th className="py-2 pr-3">REVENUE</th>
                <th className="py-2 pr-3">FEEDBACK</th>
                <th className="py-2 pr-3 w-[160px]">REVENUE SHARE</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => {
                const p = perf.find(x => x.doctorId === d.id) || seedPerf([d])[0];
                return (
                  <tr key={d.id} className="border-b border-border/40">
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-primary">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{d.specialty}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <input type="number" value={p.patientVolume}
                        onChange={e => update(d.id, { patientVolume: Number(e.target.value) })}
                        className="w-24 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                    </td>
                    <td className="py-3 pr-3">
                      <input type="number" value={p.consultations}
                        onChange={e => update(d.id, { consultations: Number(e.target.value) })}
                        className="w-24 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">$</span>
                        <input type="number" value={p.revenue}
                          onChange={e => update(d.id, { revenue: Number(e.target.value) })}
                          className="w-28 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <input type="number" step="0.1" min="0" max="5" value={p.feedback}
                          onChange={e => update(d.id, { feedback: Number(e.target.value) })}
                          className="w-20 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-primary-glow"
                          style={{ width: `${(p.revenue / maxRev) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {docs.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No doctors yet. Add one in Directory.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-4">
          <Btn onClick={() => { save("doctor-perf", perf); toast.success("Performance saved"); }}>
            <TrendingUp className="h-4 w-4" /> Save Metrics
          </Btn>
        </div>
      </Card>
    </div>
  );
};

// ---------- Scheduling ----------
type Shift = {
  id: string;
  doctorId: string;
  day: string; // Mon, Tue, ...
  start: string; // "09:00"
  end: string;   // "17:00"
  type: "Regular" | "On-Call" | "Emergency" | "Surgery" | "Off";
  ward: string;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHIFT_TONES: Record<Shift["type"], string> = {
  "Regular": "bg-primary/15 text-primary border-primary/30",
  "On-Call": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Emergency": "bg-destructive/15 text-destructive border-destructive/30",
  "Surgery": "bg-accent/40 text-accent-foreground border-accent/60",
  "Off": "bg-muted text-muted-foreground border-border",
};

const SchedulingTab = () => {
  const docs = useDoctorList();
  const [shifts, setShifts] = useState<Shift[]>(() => load<Shift[]>("doctor-shifts", [
    { id: uid(), doctorId: docs[0]?.id || "", day: "Mon", start: "09:00", end: "17:00", type: "Regular", ward: "Cardiology OPD" },
    { id: uid(), doctorId: docs[1]?.id || docs[0]?.id || "", day: "Wed", start: "14:00", end: "20:00", type: "On-Call", ward: "Emergency" },
  ]));
  const [form, setForm] = useState<Omit<Shift, "id">>({
    doctorId: docs[0]?.id || "", day: "Mon", start: "09:00", end: "17:00", type: "Regular", ward: "",
  });
  useEffect(() => { save("doctor-shifts", shifts); }, [shifts]);

  const add = () => {
    if (!form.doctorId) return toast.error("Pick a doctor");
    setShifts(s => [...s, { ...form, id: uid() }]);
    toast.success("Shift added");
  };
  const remove = (id: string) => setShifts(s => s.filter(x => x.id !== id));

  const cellShifts = (docId: string, day: string) =>
    shifts.filter(s => s.doctorId === docId && s.day === day);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={CalendarRange} label="Shifts Scheduled" value={String(shifts.length)} tone="primary" />
        <Kpi icon={Stethoscope} label="Doctors" value={String(docs.length)} tone="accent" />
        <Kpi icon={ClipboardList} label="On-Call" value={String(shifts.filter(s => s.type === "On-Call").length)} tone="chip" />
        <Kpi icon={Activity} label="Emergency" value={String(shifts.filter(s => s.type === "Emergency").length)} tone="destructive" />
      </div>

      <Card className="p-5">
        <SectionTitle title="Add Shift / Plan" />
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          <select value={form.doctorId} onChange={e => setForm({ ...form, doctorId: e.target.value })}
            className="md:col-span-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <option value="">Select doctor…</option>
            {docs.map(d => <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>)}
          </select>
          <select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            {DAYS.map(d => <option key={d}>{d}</option>)}
          </select>
          <input type="time" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm" />
          <input type="time" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm" />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Shift["type"] })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            {(Object.keys(SHIFT_TONES) as Shift["type"][]).map(t => <option key={t}>{t}</option>)}
          </select>
          <input placeholder="Ward / Room" value={form.ward} onChange={e => setForm({ ...form, ward: e.target.value })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end mt-4">
          <Btn onClick={add}><Plus className="h-4 w-4" /> Add Shift</Btn>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Duty Roster (Weekly)" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-[11px] tracking-widest font-bold text-muted-foreground">
                <th className="py-2 pr-3 sticky left-0 bg-card">DOCTOR</th>
                {DAYS.map(d => <th key={d} className="py-2 px-2 text-center">{d.toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id} className="border-t border-border/40 align-top">
                  <td className="py-3 pr-3 sticky left-0 bg-card">
                    <div className="font-semibold text-primary text-sm">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.specialty}</div>
                  </td>
                  {DAYS.map(day => (
                    <td key={day} className="py-2 px-1 min-w-[120px]">
                      <div className="flex flex-col gap-1">
                        {cellShifts(d.id, day).map(s => (
                          <div key={s.id}
                            className={`relative group rounded-lg border px-2 py-1.5 text-[11px] ${SHIFT_TONES[s.type]}`}>
                            <div className="font-bold">{s.start}–{s.end}</div>
                            <div className="opacity-80">{s.type}</div>
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
              {docs.length === 0 && (
                <tr><td colSpan={DAYS.length + 1} className="py-8 text-center text-muted-foreground">Add doctors first.</td></tr>
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

export default Doctors;

