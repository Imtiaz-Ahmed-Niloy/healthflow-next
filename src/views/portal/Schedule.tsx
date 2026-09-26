"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, ClipboardList, Heart } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { displayTime } from "@/lib/availability";

type Appointment = {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  priority: "high" | "standard" | "routine";
  reason: string | null;
  status: "scheduled" | "completed" | "cancelled";
  in_consultation: boolean;
  hospital: { id: string; name: string };
  patient: {
    id: string;
    full_name: string;
    date_of_birth: string | null;
    phone: string | null;
  } | null;
};

const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type ScheduleStats = {
  avgWaitMinutes: number | null;
  satisfaction: number | null;
};

type ViewMode = "split" | "list";

const formatDateKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

const Schedule = () => {
  const t = useTranslations("portal.schedule");
  const locale = useLocale();
  const dateLocale = locale === "bn" ? "bn-BD-u-nu-latn" : "en-US";
  const formatTime = (time: string) => displayTime(time, locale);
  const [view, setView] = useState<ViewMode>("split");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<ScheduleStats>({ avgWaitMinutes: null, satisfaction: null });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const res = await fetch("/api/v1/portal/schedule");
        const body = await res.json();
        if (res.ok && body.data) {
          setAppointments(body.data);
          if (body.stats) setStats(body.stats);
          // currentDate/selectedDate already default to today — a fresh load
          // should open on today, not jump to whichever appointment happens
          // to be nearest (which could land in the past if nothing's booked
          // today or later).
        }
      } catch (err) {
        console.error("Failed to load appointments", err);
      } finally {
        setLoading(false);
      }
    };
    loadAppointments();
  }, []);

  // Only a doctor whose appointments span hospitals needs to be told which
  // one each is at.
  const multiHospital = useMemo(() => new Set(appointments.map(a => a.hospital?.id)).size > 1, [appointments]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((appt) => {
      const key = appt.scheduled_date;
      if (!map[key]) map[key] = [];
      map[key].push(appt);
    });
    return map;
  }, [appointments]);

  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const dayOfWeek = firstDayOfMonth.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startDate = new Date(year, month, 1 - daysToSubtract);
    
    const grid: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      grid.push(d);
    }
    return grid;
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const selectedDateKey = formatDateKey(selectedDate);
  const agendaAppointments = appointmentsByDate[selectedDateKey] || [];

  const todayKey = formatDateKey(new Date());
  const todayAppointmentsCount = (appointmentsByDate[todayKey] || []).length;

  const totalSeen = useMemo(() => appointments.filter(a => a.status === "completed").length, [appointments]);

  return (
    <PortalLayout>
      <div className="flex items-start justify-between flex-wrap gap-6">
        <div className="max-w-2xl">
          <h1 className="font-display text-5xl text-primary">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-3">{t("subtitle")}</p>
        </div>
        <div className="flex items-center rounded-full bg-chip p-1 border border-border/60">
          <button
            onClick={() => { setView("split"); toast.info(t("splitView")); }}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${view === "split" ? "bg-card text-primary shadow-soft" : "text-foreground/60 hover:text-primary"}`}
          >{t("splitView")}</button>
          <button
            onClick={() => { setView("list"); toast.info(t("listView")); }}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${view === "list" ? "bg-card text-primary shadow-soft" : "text-foreground/60 hover:text-primary"}`}
          >{t("listView")}</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : view === "split" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 mt-8">
          {/* Agenda */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-primary">
                  {selectedDateKey === todayKey ? t("todaysAgenda") : t("agenda")}
                </h2>
                <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-1">
                  {selectedDate.toLocaleDateString(dateLocale, { month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-chip flex items-center justify-center text-primary"><Calendar className="h-5 w-5" /></div>
            </div>

            <div className="mt-6 space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {agendaAppointments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  {t("noneThisDay")}
                </div>
              ) : (
                agendaAppointments.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className={`relative rounded-2xl p-4 border ${a.in_consultation ? "bg-chip/40 border-primary-glow" : "bg-muted/30 border-border/40"}`}>
                    {a.in_consultation && <span className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-primary-glow" />}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-primary bg-card px-2 py-0.5 rounded-md border border-border/40">{formatTime(a.scheduled_time)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${a.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : a.status === "cancelled" ? "bg-destructive/15 text-destructive" : "bg-chip text-primary"}`}>
                        {t(`statuses.${a.status}`)}
                      </span>
                    </div>
                    <p className="font-semibold text-primary mt-3">{a.patient?.full_name || t("unknownPatient")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.reason || t("noReason")}</p>
                    {multiHospital && <p className="text-xs font-semibold text-primary-glow mt-1">{a.hospital.name}</p>}
                    <div className="flex items-center gap-2 mt-3">
                      <div className="h-5 w-5 rounded-full bg-chip flex items-center justify-center font-display text-[9px] text-primary">
                        {initials(a.patient?.full_name ?? "?")}
                      </div>
                      <span className="text-[11px] text-foreground/70">{t(`priority.${a.priority}`)}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <Link href="/portal/queue" className="mt-5 block text-center w-full rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-primary hover:bg-chip/40 transition-colors">
              {todayAppointmentsCount > 0 ? t("viewAll", { count: todayAppointmentsCount }) : t("viewQueue")}
            </Link>
          </motion.div>

          {/* Calendar */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-3xl text-primary">
                {currentDate.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={handlePrevMonth} aria-label={t("prevMonth")} className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-chip"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={handleToday} className="rounded-full bg-chip border border-border px-5 py-2 text-sm font-semibold text-primary">{t("today")}</button>
                <button onClick={handleNextMonth} aria-label={t("nextMonth")} className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-chip"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-muted/30 p-4 border border-border/40">
              <div className="grid grid-cols-7 gap-2 text-[10px] tracking-widest font-bold text-muted-foreground pb-3 border-b border-border/50">
                {WEEK_DAYS.map(d => <div key={d} className="text-center">{t(`weekDays.${d}`)}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2 mt-3">
                {calendarGrid.map((date, i) => {
                  const isOther = date.getMonth() !== currentDate.getMonth();
                  const dateStr = formatDateKey(date);
                  const dayAppointments = appointmentsByDate[dateStr] || [];
                  const activeAppts = dayAppointments.filter(a => a.status !== "cancelled");
                  const isToday = dateStr === todayKey;
                  const isSelected = dateStr === selectedDateKey;

                  return (
                    <motion.div key={i} whileHover={{ scale: 1.02 }} onClick={() => setSelectedDate(date)}
                      className={`min-h-[80px] rounded-xl p-2 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : isToday
                            ? "bg-chip/70 ring-2 ring-inset ring-primary-glow text-primary"
                            : isOther
                              ? "text-muted-foreground/30 hover:bg-card/40"
                              : "hover:bg-card text-primary"
                      }`}>
                      <p className={`text-sm font-semibold ${isSelected ? "text-primary-foreground" : "text-primary"}`}>
                        {date.getDate()}
                      </p>

                      {isToday && !isSelected && (
                        <div className="mt-1 text-[9px] bg-primary-glow/15 text-primary-glow font-semibold rounded px-1.5 py-0.5">{t("today")}</div>
                      )}

                      {activeAppts.length > 0 && (
                        <div className="mt-1 space-y-1">
                          <div className={`text-[9px] rounded px-1.5 py-0.5 font-semibold ${isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-chip text-primary-glow"}`}>
                            {t("slots", { count: activeAppts.length })}
                          </div>
                          {activeAppts.some(a => a.priority === "high") && (
                            <div className={`text-[9px] rounded px-1.5 py-0.5 font-semibold ${isSelected ? "bg-destructive text-white" : "bg-destructive/15 text-destructive"}`}>
                              {t("high")}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between mt-5 flex-wrap gap-3">
              <div className="flex items-center gap-5 text-xs text-foreground/70">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> {t("legend.selected")}</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary-glow" /> {t("legend.slots")}</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> {t("legend.high")}</span>
              </div>
              <button onClick={() => toast.success(t("exported"))} className="text-sm font-semibold text-primary hover:underline">{t("export")}</button>
            </div>
          </motion.div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-2xl text-primary">{t("allAppointments")}</h2>
              <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-1">{t("monthlySchedule")}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-chip flex items-center justify-center text-primary"><ClipboardList className="h-5 w-5" /></div>
          </div>
          <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto pr-2">
            {appointments.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t("noneFound")}
              </div>
            ) : (
              appointments.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-5 py-4">
                  <div className="text-center min-w-[100px]">
                    <span className="block font-semibold text-primary text-xs">{a.scheduled_date}</span>
                    <span className="font-medium text-muted-foreground bg-chip px-2 py-0.5 rounded text-[10px] mt-1 inline-block">{formatTime(a.scheduled_time)}</span>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-chip flex items-center justify-center font-display text-sm text-primary shrink-0">
                    {initials(a.patient?.full_name ?? "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary">{a.patient?.full_name || t("unknownPatient")}</p>
                    <p className="text-xs text-muted-foreground">{a.reason || t("noReason")}{multiHospital && ` · ${a.hospital.name}`}</p>
                  </div>
                  <span className="hidden md:inline text-[11px] text-foreground/70 bg-muted/50 px-2 py-1 rounded-md">{t(`priority.${a.priority}`)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${a.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : a.status === "cancelled" ? "bg-destructive/15 text-destructive" : "bg-chip text-primary"}`}>
                    {t(`statuses.${a.status}`)}
                  </span>
                  <Link href={`/portal/prescription?appointment=${a.id}`} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 shadow-glow">{t("open")}</Link>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}

      <div className="grid md:grid-cols-3 gap-5 mt-8">
        <div className="rounded-2xl bg-chip/60 p-6 flex items-center justify-between">
          <div><p className="text-[10px] tracking-widest font-bold text-primary-glow">{t("avgWait")}</p><p className="font-display text-4xl text-primary mt-2">{stats.avgWaitMinutes !== null ? t("minutes", { count: stats.avgWaitMinutes }) : "—"}</p></div>
          <div className="h-12 w-12 rounded-xl bg-card flex items-center justify-center text-primary"><Calendar className="h-5 w-5" /></div>
        </div>
        <div className="rounded-2xl bg-chip/60 p-6 flex items-center justify-between">
          <div><p className="text-[10px] tracking-widest font-bold text-primary-glow">{t("patientsSeen")}</p><p className="font-display text-4xl text-primary mt-2">{totalSeen}</p></div>
          <div className="h-12 w-12 rounded-xl bg-card flex items-center justify-center text-primary"><ClipboardList className="h-5 w-5" /></div>
        </div>
        <div className="rounded-2xl bg-gradient-dark text-surface-dark-foreground p-6 flex items-center justify-between shadow-glow">
          <div><p className="text-[10px] tracking-widest font-bold opacity-80">{t("satisfaction")}</p><p className="font-display text-4xl mt-2">{stats.satisfaction !== null ? `${stats.satisfaction.toFixed(1)}/5` : "—"}</p></div>
          <div className="h-12 w-12 rounded-xl bg-surface-dark-foreground/10 flex items-center justify-center"><Heart className="h-5 w-5" /></div>
        </div>
      </div>
    </PortalLayout>
  );
};

export default Schedule;
