"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, ClipboardList, Heart } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";

type Appointment = {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  priority: "high" | "standard" | "routine";
  reason: string | null;
  status: "scheduled" | "completed" | "cancelled";
  in_consultation: boolean;
  patient: {
    id: string;
    full_name: string;
    date_of_birth: string | null;
    phone: string | null;
  } | null;
};

const daysOfWeek = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const monthsList = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type ViewMode = "split" | "list";

const formatDateKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime = (t: string) => {
  const [hh, mm] = t.split(":");
  const h = parseInt(hh, 10);
  return `${((h + 11) % 12 + 1)}:${mm} ${h >= 12 ? "PM" : "AM"}`;
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

const Schedule = () => {
  const [view, setView] = useState<ViewMode>("split");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
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
          
          const appts = body.data;
          if (appts.length > 0) {
            const todayStr = formatDateKey(new Date());
            const futureOrToday = appts.find((a: Appointment) => a.scheduled_date >= todayStr);
            const targetAppt = futureOrToday || appts[appts.length - 1];
            
            if (targetAppt) {
              const targetDate = new Date(targetAppt.scheduled_date + "T00:00:00");
              setCurrentDate(targetDate);
              setSelectedDate(targetDate);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load appointments", err);
      } finally {
        setLoading(false);
      }
    };
    loadAppointments();
  }, []);

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
  const statsAvgWait = 14; // Default fallback representation

  return (
    <PortalLayout>
      <div className="flex items-start justify-between flex-wrap gap-6">
        <div className="max-w-2xl">
          <h1 className="font-display text-5xl text-primary">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-3">Manage your daily appointments and monthly availability at a glance. Review patient history before every consultation.</p>
        </div>
        <div className="flex items-center rounded-full bg-chip p-1 border border-border/60">
          <button
            onClick={() => { setView("split"); toast.info("Split view"); }}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${view === "split" ? "bg-card text-primary shadow-soft" : "text-foreground/60 hover:text-primary"}`}
          >Split View</button>
          <button
            onClick={() => { setView("list"); toast.info("List view"); }}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${view === "list" ? "bg-card text-primary shadow-soft" : "text-foreground/60 hover:text-primary"}`}
          >List View</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : view === "split" ? (
        <div className="grid lg:grid-cols-[400px_1fr] gap-6 mt-8">
          {/* Agenda */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-primary">
                  {selectedDateKey === todayKey ? "Today's Agenda" : "Agenda"}
                </h2>
                <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-1">
                  {selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-chip flex items-center justify-center text-primary"><Calendar className="h-5 w-5" /></div>
            </div>

            <div className="mt-6 space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {agendaAppointments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  No appointments scheduled for this day.
                </div>
              ) : (
                agendaAppointments.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className={`relative rounded-2xl p-4 border ${a.in_consultation ? "bg-chip/40 border-primary-glow" : "bg-muted/30 border-border/40"}`}>
                    {a.in_consultation && <span className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-primary-glow" />}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-primary bg-card px-2 py-0.5 rounded-md border border-border/40">{formatTime(a.scheduled_time)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${a.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : a.status === "cancelled" ? "bg-destructive/15 text-destructive" : "bg-chip text-primary"}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="font-semibold text-primary mt-3">{a.patient?.full_name || "Unknown Patient"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.reason || "No reason specified"}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="h-5 w-5 rounded-full bg-chip flex items-center justify-center font-display text-[9px] text-primary">
                        {initials(a.patient?.full_name ?? "?")}
                      </div>
                      <span className="text-[11px] text-foreground/70 capitalize">{a.priority} Priority</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <Link href="/portal/queue" className="mt-5 block text-center w-full rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-primary hover:bg-chip/40 transition-colors">
              {todayAppointmentsCount > 0 ? `View All ${todayAppointmentsCount} Appointments` : "View Today's Queue"}
            </Link>
          </motion.div>

          {/* Calendar */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-3xl text-primary">
                {monthsList[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={handlePrevMonth} className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-chip"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={handleToday} className="rounded-full bg-chip border border-border px-5 py-2 text-sm font-semibold text-primary">Today</button>
                <button onClick={handleNextMonth} className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-chip"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-muted/30 p-4 border border-border/40">
              <div className="grid grid-cols-7 gap-2 text-[10px] tracking-widest font-bold text-muted-foreground pb-3 border-b border-border/50">
                {daysOfWeek.map(d => <div key={d} className="text-center">{d}</div>)}
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
                            ? "bg-gradient-dark text-surface-dark-foreground" 
                            : isOther 
                              ? "text-muted-foreground/30 hover:bg-card/40" 
                              : "hover:bg-card text-primary"
                      }`}>
                      <p className={`text-sm font-semibold ${isSelected ? "text-primary-foreground" : isToday ? "text-surface-dark-foreground" : "text-primary"}`}>
                        {date.getDate()}
                      </p>
                      
                      {isToday && !isSelected && (
                        <div className="mt-1 text-[9px] bg-surface-dark-foreground/10 rounded px-1.5 py-0.5">Today</div>
                      )}

                      {activeAppts.length > 0 && (
                        <div className="mt-1 space-y-1">
                          <div className={`text-[9px] rounded px-1.5 py-0.5 font-semibold ${isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-chip text-primary-glow"}`}>
                            {activeAppts.length} {activeAppts.length === 1 ? "slot" : "slots"}
                          </div>
                          {activeAppts.some(a => a.priority === "high") && (
                            <div className={`text-[9px] rounded px-1.5 py-0.5 font-semibold ${isSelected ? "bg-destructive text-white" : "bg-destructive/15 text-destructive"}`}>
                              High
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
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Selected</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary-glow" /> Available slots</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> High Priority</span>
              </div>
              <button onClick={() => toast.success("Calendar exported")} className="text-sm font-semibold text-primary hover:underline">↓ Export Calendar</button>
            </div>
          </motion.div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-2xl text-primary">All Appointments</h2>
              <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-1">MONTHLY SCHEDULE</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-chip flex items-center justify-center text-primary"><ClipboardList className="h-5 w-5" /></div>
          </div>
          <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto pr-2">
            {appointments.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No appointments found.
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
                    <p className="font-semibold text-primary">{a.patient?.full_name || "Unknown Patient"}</p>
                    <p className="text-xs text-muted-foreground">{a.reason || "No reason specified"}</p>
                  </div>
                  <span className="hidden md:inline text-[11px] text-foreground/70 bg-muted/50 px-2 py-1 rounded-md capitalize">{a.priority} Priority</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${a.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : a.status === "cancelled" ? "bg-destructive/15 text-destructive" : "bg-chip text-primary"}`}>
                    {a.status}
                  </span>
                  <Link href={`/portal/prescription?appointment=${a.id}`} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 shadow-glow">Open</Link>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}

      <div className="grid md:grid-cols-3 gap-5 mt-8">
        <div className="rounded-2xl bg-chip/60 p-6 flex items-center justify-between">
          <div><p className="text-[10px] tracking-widest font-bold text-primary-glow">AVG WAITING TIME</p><p className="font-display text-4xl text-primary mt-2">{statsAvgWait} min</p></div>
          <div className="h-12 w-12 rounded-xl bg-card flex items-center justify-center text-primary"><Calendar className="h-5 w-5" /></div>
        </div>
        <div className="rounded-2xl bg-chip/60 p-6 flex items-center justify-between">
          <div><p className="text-[10px] tracking-widest font-bold text-primary-glow">PATIENTS SEEN</p><p className="font-display text-4xl text-primary mt-2">{totalSeen}</p></div>
          <div className="h-12 w-12 rounded-xl bg-card flex items-center justify-center text-primary"><ClipboardList className="h-5 w-5" /></div>
        </div>
        <div className="rounded-2xl bg-gradient-dark text-surface-dark-foreground p-6 flex items-center justify-between shadow-glow">
          <div><p className="text-[10px] tracking-widest font-bold opacity-80">SATISFACTION</p><p className="font-display text-4xl mt-2">98%</p></div>
          <div className="h-12 w-12 rounded-xl bg-surface-dark-foreground/10 flex items-center justify-center"><Heart className="h-5 w-5" /></div>
        </div>
      </div>
    </PortalLayout>
  );
};

export default Schedule;
