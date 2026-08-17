"use client";

import { motion } from "framer-motion";
import { Plus, Calendar, Clock, MapPin, Video, Leaf, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { toast } from "sonner";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
const doctorAvatar = "/assets/doctor-avatar.jpg";
const doctor1 = "/assets/doctor-1.jpg";
const patientSarah = "/assets/patient-sarah.jpg";

type Bucket = "upcoming" | "past" | "cancelled";
const tabs: { label: string; bucket: Bucket }[] = [
  { label: "Upcoming Appointments", bucket: "upcoming" },
  { label: "Past Appointments", bucket: "past" },
  { label: "Cancelled Appointments", bucket: "cancelled" },
];

type Appt = { id: string; name: string; role: string; date: string; time: string; loc: string; icon: typeof Video; status: string; statusClass: string; img: string; bucket: Bucket };

const initialAppointments: Appt[] = [
  { id: "a1", name: "Dr. Alistair Vance", role: "Molecular Cardiologist", date: "Oct 24, 2024", time: "09:30 AM", loc: "Telehealth", icon: Video, status: "CONFIRMED", statusClass: "bg-chip text-primary", img: doctor1, bucket: "upcoming" },
  { id: "a2", name: "Dr. Sarah Chen", role: "Genomics Specialist", date: "Oct 28, 2024", time: "02:15 PM", loc: "Main Lab - Room 402", icon: MapPin, status: "PENDING", statusClass: "bg-accent/20 text-primary-glow", img: patientSarah, bucket: "upcoming" },
  { id: "a3", name: "Dr. James Miller", role: "Immunology Director", date: "Nov 05, 2024", time: "11:00 AM", loc: "Wing B - Suite 12", icon: MapPin, status: "CONFIRMED", statusClass: "bg-chip text-primary", img: doctorAvatar, bucket: "upcoming" },
  { id: "p1", name: "Dr. Priya Patel", role: "Interventional Cardiologist", date: "Sep 18, 2024", time: "10:00 AM", loc: "Wing B - Suite 12", icon: MapPin, status: "COMPLETED", statusClass: "bg-muted text-muted-foreground", img: doctor1, bucket: "past" },
  { id: "p2", name: "Dr. Mei Tanaka", role: "Pediatrician", date: "Aug 02, 2024", time: "03:45 PM", loc: "Telehealth", icon: Video, status: "COMPLETED", statusClass: "bg-muted text-muted-foreground", img: patientSarah, bucket: "past" },
  { id: "c1", name: "Dr. Lukas Berg", role: "Neurologist", date: "Jul 21, 2024", time: "01:00 PM", loc: "Main Lab - Room 402", icon: MapPin, status: "CANCELLED", statusClass: "bg-destructive/15 text-destructive", img: doctorAvatar, bucket: "cancelled" },
];

const doctorOptions = [
  { name: "Dr. Alistair Vance", role: "Molecular Cardiologist", specialty: "Cardiology", img: doctor1 },
  { name: "Dr. Sarah Chen", role: "Genomics Specialist", specialty: "Genomics", img: patientSarah },
  { name: "Dr. James Miller", role: "Immunology Director", specialty: "Immunology", img: doctorAvatar },
  { name: "Dr. Priya Patel", role: "Interventional Cardiologist", specialty: "Cardiology", img: doctor1 },
  { name: "Dr. Lukas Berg", role: "Neurologist", specialty: "Neurology", img: doctorAvatar },
  { name: "Dr. Mei Tanaka", role: "Pediatrician", specialty: "Pediatrics", img: patientSarah },
];

const specialtyOptions = Array.from(new Set(doctorOptions.map(d => d.specialty)));


const locationOptions = [
  { value: "Telehealth", icon: Video },
  { value: "Main Lab - Room 402", icon: MapPin },
  { value: "Wing B - Suite 12", icon: MapPin },
];

const days = ["M", "T", "W", "T", "F", "S", "S"];
const dates = [30, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];

const Appointments = () => {
  const [tab, setTab] = useState(0);
  const [appointments, setAppointments] = useState<Appt[]>(initialAppointments);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ specialty: "", doctor: "", date: "", time: "", loc: "Telehealth", reason: "" });
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [reschedule, setReschedule] = useState<{ id: string; name: string; date: string; time: string; loc: string } | null>(null);
  const filteredDoctors = form.specialty ? doctorOptions.filter(d => d.specialty === form.specialty) : [];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  const formatTime = (t: string) => {
    const [hh, mm] = t.split(":");
    const h = parseInt(hh, 10);
    return `${((h + 11) % 12 + 1).toString().padStart(2, "0")}:${mm} ${h >= 12 ? "PM" : "AM"}`;
  };

  const handleReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedule) return;
    if (!reschedule.date || !reschedule.time) {
      toast.error("Pick a new date and time.");
      return;
    }
    const dateLabel = formatDate(reschedule.date);
    const timeLabel = formatTime(reschedule.time);
    setAppointments(prev => prev.map(x =>
      x.id === reschedule.id
        ? { ...x, date: dateLabel, time: timeLabel, loc: reschedule.loc, status: "PENDING", statusClass: "bg-accent/20 text-primary-glow" }
        : x,
    ));
    toast.success(`Rescheduled to ${dateLabel} at ${timeLabel}`);
    setReschedule(null);
  };

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.doctor || !form.date || !form.time) {
      toast.error("Please complete doctor, date and time.");
      return;
    }
    const doc = doctorOptions.find(d => d.name === form.doctor)!;
    const locMeta = locationOptions.find(l => l.value === form.loc) ?? locationOptions[0];
    const dateLabel = new Date(form.date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const [hh, mm] = form.time.split(":");
    const h = parseInt(hh, 10);
    const timeLabel = `${((h + 11) % 12 + 1).toString().padStart(2, "0")}:${mm} ${h >= 12 ? "PM" : "AM"}`;
    const next: Appt = {
      id: `n-${Date.now()}`,
      name: doc.name, role: doc.role, img: doc.img,
      date: dateLabel, time: timeLabel, loc: form.loc, icon: locMeta.icon,
      status: "PENDING", statusClass: "bg-accent/20 text-primary-glow",
      bucket: "upcoming",
    };
    setAppointments(prev => [next, ...prev]);
    toast.success(`Appointment booked with ${doc.name}`);
    setForm({ specialty: "", doctor: "", date: "", time: "", loc: "Telehealth", reason: "" });
    setOpen(false);
    setTab(0);
  };

  return (
    <PatientPortalLayout>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        <div>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="max-w-xl">
              <h1 className="font-display text-5xl text-primary">Appointments</h1>
              <p className="text-sm text-muted-foreground mt-3">Manage your precision health consultations and screenings.</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-dark text-surface-dark-foreground px-10 py-5 font-semibold shadow-glow hover:opacity-90 w-full sm:w-auto sm:min-w-[320px]">
                  <Plus className="h-5 w-5" /> Book New Appointment
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl text-primary">Book New Appointment</DialogTitle>
                  <DialogDescription>Schedule a consultation with one of our specialists.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBook} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label>Specialist Category</Label>
                    <Select value={form.specialty} onValueChange={v => setForm(f => ({ ...f, specialty: v, doctor: "" }))}>
                      <SelectTrigger><SelectValue placeholder="Select a specialty" /></SelectTrigger>
                      <SelectContent>
                        {specialtyOptions.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Doctor</Label>
                    <Select value={form.doctor} onValueChange={v => setForm(f => ({ ...f, doctor: v }))} disabled={!form.specialty}>
                      <SelectTrigger><SelectValue placeholder={form.specialty ? "Select a doctor" : "Choose a specialty first"} /></SelectTrigger>
                      <SelectContent>
                        {filteredDoctors.map(d => (
                          <SelectItem key={d.name} value={d.name}>{d.name} — {d.role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Date</Label>
                      <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Time</Label>
                      <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Location</Label>
                    <Select value={form.loc} onValueChange={v => setForm(f => ({ ...f, loc: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {locationOptions.map(l => (
                          <SelectItem key={l.value} value={l.value}>{l.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reason for visit</Label>
                    <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Briefly describe your symptoms or reason..." rows={3} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit">Confirm Booking</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-8 flex gap-8 border-b border-border">
            {tabs.map((t, i) => {
              const count = appointments.filter(a => a.bucket === t.bucket).length;
              return (
                <button key={t.bucket} onClick={() => setTab(i)}
                  className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-2 ${tab === i ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {t.label}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tab === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{count}</span>
                  {tab === i && <motion.span layoutId="apptab" className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-glow rounded-full" />}
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-4">
            {(() => {
              const visible = appointments.filter(a => a.bucket === tabs[tab].bucket);
              if (!visible.length) {
                return (
                  <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
                    <p className="font-display text-lg text-primary">No {tabs[tab].label.toLowerCase()}</p>
                    <p className="text-sm text-muted-foreground mt-2">Nothing to show here yet.</p>
                  </div>
                );
              }
              return visible.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -2 }} className="rounded-2xl bg-card border border-border/60 p-5 flex items-center gap-5 shadow-soft">
                  <img src={a.img} alt={a.name} loading="lazy" width={80} height={80} className="h-20 w-20 rounded-2xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-primary text-lg">{a.name}</p>
                      <span className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider ${a.statusClass}`}>{a.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.role}</p>
                    <div className="flex flex-wrap items-center gap-5 mt-3 text-xs text-foreground/70">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {a.date}</span>
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {a.time}</span>
                      <span className="flex items-center gap-1.5"><a.icon className="h-3.5 w-3.5" /> {a.loc}</span>
                    </div>
                  </div>
                  <div className="flex flex-row flex-wrap items-center gap-2">
                    {a.bucket === "upcoming" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => {
                          setAppointments(prev => prev.map(x => x.id === a.id ? { ...x, bucket: "cancelled", status: "CANCELLED", statusClass: "bg-destructive/15 text-destructive" } : x));
                          toast.success(`Cancelled appointment with ${a.name}`);
                        }}>Cancel</Button>
                        <Button size="sm" onClick={() => setReschedule({ id: a.id, name: a.name, date: "", time: "", loc: a.loc })}>Reschedule</Button>
                      </>
                    )}
                    {a.bucket === "past" && (
                      <Button size="sm" variant="outline" onClick={() => {
                        const doc = doctorOptions.find(d => d.name === a.name);
                        setForm({
                          specialty: doc?.specialty ?? "",
                          doctor: doc?.name ?? "",
                          date: "",
                          time: "",
                          loc: a.loc,
                          reason: `Follow-up to visit on ${a.date}`,
                        });
                        setOpen(true);
                        toast.info(`Booking again with ${a.name}`);
                      }}>Book Again</Button>
                    )}
                    {a.bucket === "cancelled" && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setAppointments(prev => prev.map(x => x.id === a.id ? { ...x, bucket: "upcoming", status: "PENDING", statusClass: "bg-accent/20 text-primary-glow" } : x));
                        toast.success(`Restored appointment with ${a.name}`);
                      }}>Restore</Button>
                    )}
                  </div>
                </motion.div>
              ));
            })()}
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-3xl bg-chip/40 border border-border/40 p-7 relative overflow-hidden">
            <Leaf className="absolute -right-6 -bottom-6 h-48 w-48 text-primary/10" />
            <h3 className="font-display text-2xl text-primary">Sustainable Health Tip</h3>
            <p className="text-sm text-foreground/70 mt-3 max-w-xl">Regular screenings are the foundation of prevention. Our lab uses 100% renewable energy for all molecular diagnostics, ensuring your health journey doesn&apos;t impact the planet.</p>
            <button onClick={() => toast.info("Sustainability report coming soon")} className="mt-5 text-sm font-semibold text-primary hover:underline">Read Sustainability Report →</button>
          </motion.div>
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
                  .map(a => new Date(a.date))
                  .filter(d => !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month)
                  .map(d => d.getDate()),
              );
              const handlePick = (d: number) => {
                const picked = new Date(year, month, d);
                setSelectedDate(picked);
                const matches = appointments.filter(a => {
                  const ad = new Date(a.date);
                  return !isNaN(ad.getTime()) && isSameDay(ad, picked);
                });
                if (matches.length) {
                  toast.success(`${matches.length} appointment${matches.length > 1 ? "s" : ""} on ${picked.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
                } else {
                  const iso = picked.toISOString().slice(0, 10);
                  setForm(f => ({ ...f, date: iso }));
                  setOpen(true);
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

          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="rounded-3xl bg-card border border-border/60 p-5 shadow-soft">
            <h3 className="font-display text-lg text-primary">Available Slots</h3>
            <div className="mt-4 space-y-3">
              {[{ t: "Tomorrow, 10:00 AM" }, { t: "Oct 26, 03:30 PM" }].map(s => (
                <div key={s.t} className="flex items-center justify-between rounded-xl bg-chip/40 px-4 py-3">
                  <p className="text-sm font-semibold text-primary">{s.t}</p>
                  <button onClick={() => toast.success(`Booked ${s.t}`)} className="text-[10px] tracking-widest font-bold text-primary-glow hover:underline">BOOK NOW</button>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-6 shadow-glow">
            <p className="text-[10px] tracking-widest font-bold opacity-80">PATIENT HEALTH INDEX</p>
            <p className="font-display text-6xl mt-3">94%<Leaf className="inline h-6 w-6 ml-2 text-accent" /></p>
            <p className="text-xs opacity-80 mt-3">Your adherence to check-ups is exemplary. Maintaining this rhythm promotes optimal recovery.</p>
            <div className="h-2 rounded-full bg-surface-dark-foreground/15 mt-5 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: "94%" }} transition={{ duration: 1.2 }} className="h-full bg-accent" />
            </div>
          </motion.div>
        </div>
      </div>

      <Dialog open={!!reschedule} onOpenChange={(o) => !o && setReschedule(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary">Reschedule Appointment</DialogTitle>
            <DialogDescription>{reschedule ? `Pick a new slot for ${reschedule.name}.` : ""}</DialogDescription>
          </DialogHeader>
          {reschedule && (
            <form onSubmit={handleReschedule} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>New Date</Label>
                  <Input type="date" value={reschedule.date} onChange={e => setReschedule(r => r && { ...r, date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>New Time</Label>
                  <Input type="time" value={reschedule.time} onChange={e => setReschedule(r => r && { ...r, time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Select value={reschedule.loc} onValueChange={v => setReschedule(r => r && { ...r, loc: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {locationOptions.map(l => (
                      <SelectItem key={l.value} value={l.value}>{l.value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setReschedule(null)}>Cancel</Button>
                <Button type="submit">Confirm Reschedule</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PatientPortalLayout>
  );
};
export default Appointments;

