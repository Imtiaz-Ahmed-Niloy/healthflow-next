"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, Stethoscope, Building2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { useBookingClock } from "@/lib/appSettings";
import { availabilityLabel, hoursOn, outsideAvailabilityReason, parseAvailability } from "@/lib/availability";
import { Button } from "@/components/ui/button";
import { useConfirmAction } from "@/components/common/ConfirmProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Bucket = "upcoming" | "past" | "cancelled";

type ApiAppointment = {
  id: string;
  scheduled_date: string; // "2026-08-19"
  scheduled_time: string; // "10:30:00"
  status: "scheduled" | "completed" | "cancelled";
  department: string | null;
  notes: string | null;
  doctor: { name: string; specialty: string | null; availability: string | null } | null;
  hospital: { name: string | null } | null;
};

const tabs: Bucket[] = ["upcoming", "past", "cancelled"];

const bucketOf = (a: ApiAppointment): Bucket => {
  if (a.status === "cancelled") return "cancelled";
  if (a.status === "completed") return "past";
  // status === "scheduled": a slot that's already passed still needs the
  // hospital to mark it completed — until then, it reads as upcoming rather
  // than silently vanishing into "past".
  return "upcoming";
};

// The badge's label is patient.appointments.status.<status>.
const statusClass: Record<ApiAppointment["status"], string> = {
  scheduled: "bg-chip text-primary",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

/** Month names in the page's language; digits stay Western (see appSettings). */
const dateLocale = (locale: string) => (locale === "bn" ? "bn-BD-u-nu-latn" : "en-US");

const formatDate = (iso: string, locale: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(dateLocale(locale), { month: "short", day: "2-digit", year: "numeric" });

const formatTime = (t: string) => {
  const [hh, mm] = t.split(":");
  const h = parseInt(hh, 10);
  return `${((h + 11) % 12 + 1).toString().padStart(2, "0")}:${mm} ${h >= 12 ? "PM" : "AM"}`;
};

const Appointments = () => {
  const t = useTranslations("patient.appointments");
  const tc = useTranslations("common");
  const confirmAction = useConfirmAction();
  const tb = useTranslations("booking");
  const locale = useLocale();
  // Monday first, one letter each, in the page's language.
  const days = t("weekLetters").split(",");
  // The hospital's calendar (global settings timezone), for the reschedule
  // form's earliest date and time.
  const clock = useBookingClock();
  const [tab, setTab] = useState(0);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rescheduling, setRescheduling] = useState<ApiAppointment | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "" });
  // The doctor's days and hours for the appointment being moved — null when
  // their availability can't be read, which then refuses nothing.
  const rescheduleSchedule = useMemo(
    () => parseAvailability(rescheduling?.doctor?.availability),
    [rescheduling],
  );
  const rescheduleProblem = (() => {
    if (!rescheduling || !rescheduleForm.date) return null;
    if (rescheduleForm.date < clock.today) return tb("datePassed");
    const dayOrHours = outsideAvailabilityReason(
      rescheduleSchedule, rescheduleForm.date, rescheduleForm.time, rescheduling.doctor?.name, locale,
    );
    if (dayOrHours) return dayOrHours;
    return rescheduleForm.time ? clock.pastSlotReason(rescheduleForm.date, rescheduleForm.time) : null;
  })();
  // The new date's own hours — a week can give each day different ones.
  const rescheduleHours = hoursOn(rescheduleSchedule, rescheduleForm.date);
  const [savingReschedule, setSavingReschedule] = useState(false);

  /**
   * What the server refused about the new slot — someone else's booking
   * (409), or outside hours or past by its clock (422) — tied to the
   * appointment, date and time it was said about, so changing either clears
   * it. As the booking form (BookAppointmentDialog) does.
   */
  const rescheduleKey = `${rescheduling?.id ?? ""}|${rescheduleForm.date}|${rescheduleForm.time}`;
  const [rescheduleRefused, setRescheduleRefused] = useState<{ key: string; message: string } | null>(null);
  const rescheduleFieldProblem = rescheduleProblem
    ?? (rescheduleRefused?.key === rescheduleKey ? rescheduleRefused.message : null);
  const rescheduleFieldClass = rescheduleFieldProblem ? "border-destructive focus-visible:ring-destructive" : "";

  const load = async () => {
    try {
      const res = await fetch("/api/v1/patient/appointments");
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || t("loadFailed"));
        return;
      }
      setAppointments(body.data ?? []);
    } catch {
      toast.error(tc("networkError"));
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
        body: JSON.stringify({ action: "cancel", id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || t("cancelFailed"));
        return;
      }
      setAppointments(prev => prev.map(a => (a.id === id ? { ...a, status: "cancelled" } : a)));
      toast.success(t("cancelled", { doctor: doctorName }));
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setCancellingId(null);
    }
  };

  const openReschedule = (a: ApiAppointment) => {
    setRescheduleForm({ date: a.scheduled_date, time: a.scheduled_time.slice(0, 5) });
    setRescheduling(a);
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduling) return;
    if (!rescheduleForm.date || !rescheduleForm.time) {
      toast.error(tb("pickDateTime"));
      return;
    }
    const problem = clock.pastSlotReason(rescheduleForm.date, rescheduleForm.time)
      ?? outsideAvailabilityReason(rescheduleSchedule, rescheduleForm.date, rescheduleForm.time, rescheduling.doctor?.name, locale);
    if (problem) {
      toast.error(problem);
      return;
    }

    setSavingReschedule(true);
    try {
      const res = await fetch("/api/v1/patient/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          id: rescheduling.id,
          scheduled_date: rescheduleForm.date,
          scheduled_time: rescheduleForm.time,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const message = body?.error?.message || t("rescheduleFailed");
        // A refusal about the slot itself belongs on the date and time fields.
        if (res.status === 409 || res.status === 422) setRescheduleRefused({ key: rescheduleKey, message });
        toast.error(message);
        return;
      }
      setAppointments(prev =>
        prev.map(a =>
          a.id === rescheduling.id
            ? { ...a, scheduled_date: rescheduleForm.date, scheduled_time: body.data.scheduled_time }
            : a,
        ),
      );
      toast.success(t("rescheduled", { doctor: rescheduling.doctor?.name ?? t("theDoctor") }));
      setRescheduling(null);
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setSavingReschedule(false);
    }
  };

  const grouped = useMemo(() => {
    const out: Record<Bucket, ApiAppointment[]> = { upcoming: [], past: [], cancelled: [] };
    for (const a of appointments) out[bucketOf(a)].push(a);
    return out;
  }, [appointments]);

  return (
    <PatientPortalLayout>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="max-w-xl">
              <h1 className="font-display text-5xl text-primary">{t("title")}</h1>
              <p className="text-sm text-muted-foreground mt-3">{t("subtitle")}</p>
            </div>
            <Link href="/patient/find-doctors"
              className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-dark text-surface-dark-foreground px-10 py-5 font-semibold shadow-glow hover:opacity-90 w-full sm:w-auto sm:min-w-[280px]">
              <Plus className="h-5 w-5" /> {t("bookNew")}
            </Link>
          </div>

          <div className="mt-8 flex gap-8 border-b border-border">
            {tabs.map((bucket, i) => (
              <button key={bucket} onClick={() => setTab(i)}
                className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-2 ${tab === i ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t(`tabs.${bucket}`)}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tab === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{grouped[bucket].length}</span>
                {tab === i && <motion.span layoutId="apptab" className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-glow rounded-full" />}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : grouped[tabs[tab]].length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
                <p className="font-display text-lg text-primary">{t(`empty.${tabs[tab]}`)}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {tabs[tab] === "upcoming" ? t("emptyUpcomingHint") : t("emptyHint")}
                </p>
              </div>
            ) : (
              grouped[tabs[tab]].map((a, i) => {
                return (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    whileHover={{ y: -2 }} className="rounded-2xl bg-card border border-border/60 p-5 flex items-center gap-5 shadow-soft">
                    <div className="h-14 w-14 rounded-2xl bg-chip flex items-center justify-center shrink-0">
                      <Stethoscope className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-semibold text-primary text-lg">{a.doctor?.name ?? t("doctor")}</p>
                        <span className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider ${statusClass[a.status]}`}>{t(`status.${a.status}`)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{a.department || a.doctor?.specialty || t("general")}</p>
                      <div className="flex flex-wrap items-center gap-5 mt-3 text-xs text-foreground/70">
                        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formatDate(a.scheduled_date, locale)}</span>
                        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {formatTime(a.scheduled_time)}</span>
                        {a.hospital?.name && (
                          <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {a.hospital.name}</span>
                        )}
                      </div>
                    </div>
                    {bucketOf(a) === "upcoming" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => openReschedule(a)}>
                          {t("reschedule")}
                        </Button>
                        <Button size="sm" variant="outline" disabled={cancellingId === a.id}
                          onClick={async () => {
                            const doctor = a.doctor?.name ?? t("theDoctor");
                            if (await confirmAction(t("cancel"), { name: doctor, danger: true })) void handleCancel(a.id, doctor);
                          }}>
                          {cancellingId === a.id ? t("cancelling") : t("cancel")}
                        </Button>
                      </div>
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
              const monthLabel = calMonth.toLocaleDateString(dateLocale(locale), { month: "long", year: "numeric" });
              const year = calMonth.getFullYear();
              const month = calMonth.getMonth();
              const firstDay = new Date(year, month, 1);
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const offset = (firstDay.getDay() + 6) % 7; // Monday-first
              const cells: (number | null)[] = [
                ...Array(offset).fill(null),
                ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
              ];
              // The hospital's today, built as a local date so isSameDay's
              // local getters compare the right calendar day.
              const today = new Date(`${clock.today}T00:00:00`);
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
                  toast.success(t("onDay", { count: matches.length, date: picked.toLocaleDateString(dateLocale(locale), { month: "short", day: "numeric" }) }));
                }
              };
              return (
                <>
                  <div className="flex items-center justify-between">
                    <p className="font-display text-lg text-primary">{monthLabel}</p>
                    <div className="flex gap-1">
                      <button onClick={() => setCalMonth(new Date(year, month - 1, 1))} aria-label={t("prevMonth")} className="h-7 w-7 rounded-full hover:bg-chip flex items-center justify-center"><ChevronLeft className="h-4 w-4" /></button>
                      <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} aria-label={t("nextMonth")} className="h-7 w-7 rounded-full hover:bg-chip flex items-center justify-center"><ChevronRight className="h-4 w-4" /></button>
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
                      {t("clearSelection")}
                    </button>
                  )}
                </>
              );
            })()}
          </motion.div>
        </div>
      </div>

      <Dialog open={!!rescheduling} onOpenChange={(o) => !o && !savingReschedule && setRescheduling(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary">{t("rescheduleTitle")}</DialogTitle>
            <DialogDescription>
              {rescheduling ? t("rescheduleBody", { doctor: rescheduling.doctor?.name ?? t("theDoctor") }) : ""}
            </DialogDescription>
          </DialogHeader>
          {rescheduling && (
            <form onSubmit={handleReschedule} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label required>{tb("date")}</Label>
                  <Input type="date" value={rescheduleForm.date}
                    onChange={e => setRescheduleForm(f => ({ ...f, date: e.target.value }))}
                    min={clock.today} required
                    aria-invalid={!!rescheduleFieldProblem} aria-describedby={rescheduleFieldProblem ? "reschedule-problem" : undefined}
                    className={rescheduleFieldClass} />
                </div>
                <div className="space-y-1.5">
                  <Label required>{tb("time")}</Label>
                  <Input type="time" value={rescheduleForm.time}
                    onChange={e => setRescheduleForm(f => ({ ...f, time: e.target.value }))}
                    min={[rescheduleHours?.start, rescheduleForm.date === clock.today ? clock.nowTime : undefined].filter(Boolean).sort().pop()}
                    max={rescheduleHours && rescheduleHours.end !== "24:00" ? rescheduleHours.end : undefined}
                    required
                    aria-invalid={!!rescheduleFieldProblem} aria-describedby={rescheduleFieldProblem ? "reschedule-problem" : undefined}
                    className={rescheduleFieldClass} />
                </div>
              </div>
              {rescheduling.doctor?.availability && !rescheduleFieldProblem && (
                <p className="text-xs text-muted-foreground -mt-2">
                  {t("isAvailable", { doctor: rescheduling.doctor.name, hours: availabilityLabel(rescheduling.doctor.availability, locale) ?? "" })}
                </p>
              )}
              {rescheduleFieldProblem && (
                <p id="reschedule-problem" role="alert" className="text-xs font-semibold text-destructive -mt-2">{rescheduleFieldProblem}</p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRescheduling(null)} disabled={savingReschedule}>{tc("cancel")}</Button>
                <Button type="submit" disabled={savingReschedule || !!rescheduleFieldProblem}>{savingReschedule ? tc("saving") : t("saveNewTime")}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PatientPortalLayout>
  );
};
export default Appointments;
