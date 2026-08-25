"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, AlertTriangle, Mail, Phone, FileText, Activity, ClipboardList, Pill, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";

type Medicine = { name: string; dosage_form?: string; dose: string; frequency: string; days: string; meal?: string };

type DirectoryPatient = {
  id: string;
  mrn: string;
  full_name: string;
  gender: "male" | "female" | "other" | null;
  date_of_birth: string | null;
  age: { value: number; unit: "years" | "months" | "days" } | null;
  phone: string | null;
  email: string | null;
  blood_group: string | null;
  weight_kg: number | null;
  height_feet: number | null;
  height_inches: number | null;
  last_visit: string | null;
  next_appointment: { id: string; scheduled_date: string; scheduled_time: string } | null;
  high_priority: boolean;
  latest_bp: { systolic: number; diastolic: number } | null;
  chief_complaint: string[];
  medications: Medicine[];
  conditions: string[];
  recent_notes: { id: string; scheduled_date: string; department: string | null; notes: string | null; advice: string[] }[];
  open_appointment_id: string | null;
};

const tabs = ["All Patients", "Requires Action", "Upcoming"];
const PAGE_SIZE = 8;

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

const formatDate = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

const formatTime = (t: string) => {
  const [hh, mm] = t.split(":");
  const h = parseInt(hh, 10);
  return `${(h + 11) % 12 + 1}:${mm} ${h >= 12 ? "PM" : "AM"}`;
};

const formatAge = (age: DirectoryPatient["age"]) => (age ? `${age.value} ${age.unit}` : "Age unknown");
const formatGender = (g: DirectoryPatient["gender"]) => (g ? g[0].toUpperCase() + g.slice(1) : null);

const Directory = () => {
  const [patients, setPatients] = useState<DirectoryPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(tabs[0]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/v1/portal/directory");
        const body = await res.json();
        if (res.ok && body.data) {
          setPatients(body.data);
          if (body.data.length > 0) setSelectedId(body.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load patient directory", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      if (tab === "Requires Action" && !p.high_priority) return false;
      if (tab === "Upcoming" && !p.next_appointment) return false;
      if (!q) return true;
      return (
        p.full_name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.conditions.some((c) => c.toLowerCase().includes(q)) ||
        p.chief_complaint.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [patients, tab, query]);

  useEffect(() => {
    setPage(1);
  }, [tab, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = patients.find((p) => p.id === selectedId) ?? null;

  return (
    <PortalLayout>
      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        {/* Left list */}
        <div>
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl text-primary">Patients</h1>
            <span className="text-[10px] tracking-widest font-bold text-muted-foreground">{patients.length} TOTAL</span>
          </div>
          <div className="mt-4 flex gap-2 flex-wrap">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${tab === t ? "bg-gradient-dark text-surface-dark-foreground" : "bg-card border border-border text-foreground/70 hover:bg-chip"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patients, conditions..." className="w-full bg-card border border-border/60 rounded-full pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : pageItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {patients.length === 0 ? "No patients yet — they'll show up here once you have an appointment with them." : "No patients match your search."}
              </p>
            ) : (
              pageItems.map((p) => (
                <motion.button key={p.id} onClick={() => setSelectedId(p.id)} whileHover={{ y: -2 }}
                  className={`w-full text-left rounded-2xl bg-card p-4 border-2 transition-all ${selectedId === p.id ? "border-primary shadow-glow" : "border-transparent hover:border-border"}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-chip flex items-center justify-center font-display text-sm text-primary shrink-0">
                      {initials(p.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-primary truncate">{p.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">ID: {p.mrn} • {formatAge(p.age)}</p>
                    </div>
                    {p.high_priority && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-destructive/15 text-destructive">High Priority</span>}
                  </div>
                  <p className="text-xs text-foreground/70 mt-3 flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> {p.chief_complaint[0] || "No visit notes yet"}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Last visit: {formatDate(p.last_visit) ?? "—"}</span>
                    {p.next_appointment && (
                      <span className="flex items-center gap-1 text-primary-glow font-semibold">
                        <CalendarDays className="h-3 w-3" /> {formatDate(p.next_appointment.scheduled_date)}, {formatTime(p.next_appointment.scheduled_time)}
                      </span>
                    )}
                  </div>
                </motion.button>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-chip disabled:opacity-30 disabled:hover:bg-transparent"><ChevronLeft className="h-4 w-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`h-8 w-8 rounded-full text-xs font-semibold ${page === n ? "bg-gradient-dark text-surface-dark-foreground" : "border border-border hover:bg-chip"}`}>{n}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-chip disabled:opacity-30 disabled:hover:bg-transparent"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </div>

        {/* Right detail */}
        {!selected ? (
          <div className="rounded-2xl bg-card p-12 shadow-soft flex items-center justify-center text-sm text-muted-foreground">
            {loading ? "Loading patients…" : "Select a patient to see their record."}
          </div>
        ) : (
          <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">
            <div className="rounded-2xl bg-card p-6 shadow-soft flex items-center gap-5 flex-wrap">
              <div className="h-20 w-20 rounded-full bg-chip flex items-center justify-center font-display text-2xl text-primary shrink-0">
                {initials(selected.full_name)}
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-display text-3xl text-primary">{selected.full_name}</h2>
                  {selected.high_priority && <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive px-3 py-1 text-xs font-bold"><AlertTriangle className="h-3 w-3" /> High Priority</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(selected.date_of_birth) ? `DOB: ${formatDate(selected.date_of_birth)} (${formatAge(selected.age)})` : formatAge(selected.age)}
                  {formatGender(selected.gender) && ` • ${formatGender(selected.gender)}`}
                  {selected.blood_group && ` • Blood group: ${selected.blood_group}`}
                  {` • ID: ${selected.mrn}`}
                </p>
              </div>
              <div className="flex gap-2">
                <a href={selected.email ? `mailto:${selected.email}` : undefined}
                  className={`h-10 w-10 rounded-full border border-border flex items-center justify-center text-primary ${selected.email ? "hover:bg-chip" : "opacity-30 pointer-events-none"}`}><Mail className="h-4 w-4" /></a>
                <a href={selected.phone ? `tel:${selected.phone}` : undefined}
                  className={`h-10 w-10 rounded-full border border-border flex items-center justify-center text-primary ${selected.phone ? "hover:bg-chip" : "opacity-30 pointer-events-none"}`}><Phone className="h-4 w-4" /></a>
                {selected.open_appointment_id && (
                  <Link href={`/portal/prescription?appointment=${selected.open_appointment_id}`} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 shadow-glow flex items-center gap-2"><FileText className="h-4 w-4" /> Clinical Notes</Link>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-[2fr_1fr] gap-5">
              <div className="rounded-2xl bg-card p-6 shadow-soft">
                <h3 className="flex items-center gap-2 font-semibold text-primary"><Activity className="h-4 w-4" /> Recent Vitals</h3>
                {!selected.latest_bp && selected.weight_kg == null && selected.height_feet == null ? (
                  <p className="text-sm text-muted-foreground mt-4">No vitals recorded yet.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {selected.latest_bp && (
                      <div className="rounded-xl bg-muted/40 p-4">
                        <p className="text-[10px] tracking-widest font-bold text-muted-foreground">BLOOD PRESSURE</p>
                        <p className="mt-2"><span className="font-display text-2xl text-primary">{selected.latest_bp.systolic}/{selected.latest_bp.diastolic}</span></p>
                      </div>
                    )}
                    {selected.weight_kg != null && (
                      <div className="rounded-xl bg-muted/40 p-4">
                        <p className="text-[10px] tracking-widest font-bold text-muted-foreground">WEIGHT</p>
                        <p className="mt-2"><span className="font-display text-2xl text-primary">{selected.weight_kg}</span> <span className="text-xs text-muted-foreground">kg</span></p>
                      </div>
                    )}
                    {selected.height_feet != null && (
                      <div className="rounded-xl bg-muted/40 p-4">
                        <p className="text-[10px] tracking-widest font-bold text-muted-foreground">HEIGHT</p>
                        <p className="mt-2"><span className="font-display text-2xl text-primary">{selected.height_feet}&apos;{selected.height_inches ?? 0}&quot;</span></p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-chip/40 p-6">
                <h3 className="flex items-center gap-2 font-semibold text-primary"><ClipboardList className="h-4 w-4" /> Conditions</h3>
                <div className="mt-4 space-y-3">
                  {selected.conditions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No diagnosed conditions on record yet.</p>
                  ) : (
                    selected.conditions.map((c) => (
                      <div key={c} className="rounded-xl bg-card p-3">
                        <p className="font-semibold text-primary text-sm">{c}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-2xl bg-gradient-dark text-surface-dark-foreground p-6">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-accent" /> Schedule</h3>
                  <Link href="/portal/schedule" className="text-xs font-semibold text-accent">View All</Link>
                </div>
                {selected.next_appointment ? (
                  <div className="mt-4 rounded-xl bg-surface-dark-foreground/10 p-4">
                    <p className="text-[10px] tracking-widest font-bold text-accent">NEXT APPOINTMENT</p>
                    <p className="font-display text-lg mt-1">{formatDate(selected.next_appointment.scheduled_date)}</p>
                    <p className="text-xs opacity-70 mt-1">{formatTime(selected.next_appointment.scheduled_time)}</p>
                    <div className="flex gap-2 mt-4">
                      <Link href={`/portal/prescription?appointment=${selected.next_appointment.id}`} className="rounded-full bg-accent text-primary px-4 py-1.5 text-xs font-bold hover:bg-accent/80">Start Visit</Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm opacity-70 mt-4">No upcoming appointment scheduled.</p>
                )}
              </div>

              <div className="rounded-2xl bg-card p-6 shadow-soft">
                <h3 className="flex items-center gap-2 font-semibold text-primary"><Pill className="h-4 w-4" /> Medications</h3>
                <div className="mt-4 space-y-3">
                  {selected.medications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No medications on record yet.</p>
                  ) : (
                    selected.medications.map((m, i) => (
                      <div key={`${m.name}-${i}`} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                        <div className="h-9 w-9 rounded-full bg-chip flex items-center justify-center text-primary shrink-0"><Pill className="h-4 w-4" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-primary text-sm truncate">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground">{[m.dose, m.dosage_form, m.frequency].filter(Boolean).join(" • ")}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-card p-6 shadow-soft">
              <h3 className="flex items-center gap-2 font-semibold text-primary"><FileText className="h-4 w-4" /> Chief Complaint</h3>
              <p className="text-sm text-foreground/80 mt-2">
                {selected.chief_complaint.length ? selected.chief_complaint.join(", ") : "No complaint recorded yet."}
              </p>
            </div>

            <div className="rounded-2xl bg-card p-6 shadow-soft">
              <h3 className="font-semibold text-primary">Recent Clinical Notes</h3>
              {selected.recent_notes.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-4">No completed visits with notes yet.</p>
              ) : (
                <div className="mt-4 space-y-5">
                  {selected.recent_notes.map((n) => (
                    <div key={n.id} className="flex gap-3">
                      <div className="h-10 w-10 rounded-full bg-chip flex items-center justify-center font-bold text-primary text-xs shrink-0">Dr</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-muted-foreground">{formatDate(n.scheduled_date)}{n.department ? ` • ${n.department}` : ""}</p>
                        {n.notes && <p className="text-sm text-foreground/80 mt-2">{n.notes}</p>}
                        {n.advice.length > 0 && <p className="text-sm text-foreground/80 mt-2">Advice: {n.advice.join(", ")}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </PortalLayout>
  );
};
export default Directory;
