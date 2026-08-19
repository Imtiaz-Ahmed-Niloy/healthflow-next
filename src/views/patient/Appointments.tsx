"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, Stethoscope, Building2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { toast } from "sonner";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { Button } from "@/components/ui/button";

type Bucket = "upcoming" | "past" | "cancelled";

type ApiAppointment = {
  id: string;
  scheduled_date: string; // "2026-08-19"
  scheduled_time: string; // "10:30:00"
  status: "scheduled" | "completed" | "cancelled";
  department: string | null;
  notes: string | null;
  doctor: { name: string; specialty: string | null } | null;
  hospital: { name: string | null } | null;
};

const tabs: { label: string; bucket: Bucket }[] = [
  { label: "Upcoming Appointments", bucket: "upcoming" },
  { label: "Past Appointments", bucket: "past" },
  { label: "Cancelled Appointments", bucket: "cancelled" },
];

const bucketOf = (a: ApiAppointment): Bucket => {
  if (a.status === "cancelled") return "cancelled";
  if (a.status === "completed") return "past";
  // status === "scheduled": a slot that's already passed still needs the
  // hospital to mark it completed — until then, it reads as upcoming rather
  // than silently vanishing into "past".
  return "upcoming";
};

const statusMeta: Record<ApiAppointment["status"], { label: string; className: string }> = {
  scheduled: { label: "SCHEDULED", className: "bg-chip text-primary" },
  completed: { label: "COMPLETED", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "CANCELLED", className: "bg-destructive/15 text-destructive" },
};

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

const formatTime = (t: string) => {
  const [hh, mm] = t.split(":");
  const h = parseInt(hh, 10);
  return `${((h + 11) % 12 + 1).toString().padStart(2, "0")}:${mm} ${h >= 12 ? "PM" : "AM"}`;
};

const days = ["M", "T", "W", "T", "F", "S", "S"];

const Appointments = () => {
  const [tab, setTab] = useState(0);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/v1/patient/appointments");
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Couldn't load your appointments.");
        return;
      }
      setAppointments(body.data ?? []);
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCancel = async (id: string, doctorName: string) => {
    setCancellingId(id);
    try {
      const res = await fetch("/api/v1/patient/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Couldn't cancel that appointment.");
        return;
      }
      setAppointments(prev => prev.map(a => (a.id === id ? { ...a, status: "cancelled" } : a)));
      toast.success(`Cancelled appointment with ${doctorName}`);
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setCancellingId(null);
    }
  };

  const grouped = useMemo(() => {
    const out: Record<Bucket, ApiAppointment[]> = { upcoming: [], past: [], cancelled: [] };
    for (const a of appointments) out[bucketOf(a)].push(a);
    return out;
  }, [appointments]);

  return (
    <PatientPortalLayout>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        <div>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="max-w-xl">
              <h1 className="font-display text-5xl text-primary">Appointments</h1>
              <p className="text-sm text-muted-foreground mt-3">Manage your consultations and screenings.</p>
            </div>
            <Link href="/patient/find-doctors"
              className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-dark text-surface-dark-foreground px-10 py-5 font-semibold shadow-glow hover:opacity-90 w-full sm:w-auto sm:min-w-[280px]">
              <Plus className="h-5 w-5" /> Book New Appointment
            </Link>
          </div>

          <div className="mt-8 flex gap-8 border-b border-border">
            {tabs.map((t, i) => (
              <button key={t.bucket} onClick={() => setTab(i)}
                className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-2 ${tab === i ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t.label}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tab === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{grouped[t.bucket].length}</span>
                {tab === i && <motion.span layoutId="apptab" className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-glow rounded-full" />}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : grouped[tabs[tab].bucket].length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
                <p className="font-display text-lg text-primary">No {tabs[tab].label.toLowerCase()}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {tabs[tab].bucket === "upcoming"
                    ? "Book a doctor to see it here."
                    : "Nothing to show here yet."}
                </p>
              </div>
            ) : (
              grouped[tabs[tab].bucket].map((a, i) => {
                const meta = statusMeta[a.status];
                return (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    whileHover={{ y: -2 }} className="rounded-2xl bg-card border border-border/60 p-5 flex items-center gap-5 shadow-soft">
                    <div className="h-14 w-14 rounded-2xl bg-chip flex items-center justify-center shrink-0">
                      <Stethoscope className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-semibold text-primary text-lg">{a.doctor?.name ?? "Doctor"}</p>
                        <span className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider ${meta.className}`}>{meta.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{a.department || a.doctor?.specialty || "General"}</p>
                      <div className="flex flex-wrap items-center gap-5 mt-3 text-xs text-foreground/70">
                        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formatDate(a.scheduled_date)}</span>
                        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {formatTime(a.scheduled_time)}</span>
                        {a.hospital?.name && (
                          <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {a.hospital.name}</span>
                        )}
                      </div>
                    </div>
                    {bucketOf(a) === "upcoming" && (
                      <Button size="sm" variant="outline" disabled={cancellingId === a.id}
                        onClick={() => handleCancel(a.id, a.doctor?.name ?? "the doctor")}>
                        {cancellingId === a.id ? "Cancelling..." : "Cancel"}
                      </Button>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl bg-card border border-border/60 p-5 shadow-soft">
            {(() => {
              const monthLabel = calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
              const year = calMonth.getFullYear();
              const month = calMonth.getMonth();
              const firstDay = new Date(year, month, 1);
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const offset = (firstDay.getDay() + 6) % 7; // Monday-first
              const cells: (number | null)[] = [
                ...Array(offset).fill(null),
                ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
              ];
              const today = new Date();
              const isSameDay = (a: Date, b: Date) =>
                a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
              const apptDays = new Set(
                appointments
                  .filter(a => a.status !== "cancelled")
                  .map(a => new Date(`${a.scheduled_date}T00:00:00`))
                  .filter(d => d.getFullYear() === year && d.getMonth() === month)
                  .map(d => d.getDate()),
              );
              const handlePick = (d: number) => {
                const picked = new Date(year, month, d);
                setSelectedDate(picked);
                const matches = appointments.filter(a => isSameDay(new Date(`${a.scheduled_date}T00:00:00`), picked));
                if (matches.length) {
                  toast.success(`${matches.length} appointment${matches.length > 1 ? "s" : ""} on ${picked.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
                }
              };
              return (
                <>
                  <div className="flex items-center justify-between">
                    <p className="font-display text-lg text-primary">{monthLabel}</p>
                    <div className="flex gap-1">
                      <button onClick={() => setCalMonth(new Date(year, month - 1, 1))} aria-label="Previous month" className="h-7 w-7 rounded-full hover:bg-chip flex items-center justify-center"><ChevronLeft className="h-4 w-4" /></button>
                      <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} aria-label="Next month" className="h-7 w-7 rounded-full hover:bg-chip flex items-center justify-center"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mt-4 text-[10px] tracking-widest font-bold text-muted-foreground text-center">
                    {days.map((d, i) => <div key={i}>{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1 mt-2">
                    {cells.map((d, i) => {
                      if (d === null) return <div key={i} className="h-9" />;
                      const date = new Date(year, month, d);
                      const isToday = isSameDay(date, today);
                      const isSelected = selectedDate && isSameDay(date, selectedDate);
                      const hasAppt = apptDays.has(d);
                      return (
                        <button
                          key={i}
                          onClick={() => handlePick(d)}
                          className={`relative h-9 rounded-full text-xs font-semibold transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : isToday
                                ? "bg-gradient-dark text-surface-dark-foreground shadow-glow"
                                : hasAppt
                                  ? "bg-accent/30 text-primary ring-2 ring-primary-glow hover:bg-accent/50"
                                  : "text-primary hover:bg-chip"
                          }`}
                        >
                          {d}
                          {hasAppt && (
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary-glow" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedDate && (
                    <button onClick={() => setSelectedDate(null)} className="mt-3 w-full text-[10px] tracking-widest font-bold text-muted-foreground hover:text-primary">
                      CLEAR SELECTION
                    </button>
                  )}
                </>
              );
            })()}
          </motion.div>
        </div>
      </div>
    </PatientPortalLayout>
  );
};
export default Appointments;
