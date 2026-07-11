"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, ClipboardList, Heart } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
const patientEleanor = "/assets/patient-eleanor.jpg";
const patientMarcus = "/assets/patient-marcus.jpg";
const patientSarah = "/assets/patient-sarah.jpg";

const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const month = [
  [25, 26, 27, 28, 29, 30, 1],
  [2, 3, 4, 5, 6, 7, 8],
  [9, 10, 11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20, 21, 22],
];
const slotMap: Record<number, { label: string; tone: "ok" | "bad" }[]> = {
  2: [{ label: "8 slots full", tone: "ok" }],
  3: [{ label: "12 slots full", tone: "ok" }],
  4: [{ label: "5 slots full", tone: "ok" }, { label: "Staff Out", tone: "bad" }],
};

const agenda = [
  { time: "09:00 AM", name: "Sarah Jenkins", reason: "Post-op follow up • Room 302", tag: "History Available", img: patientSarah, active: true },
  { time: "10:30 AM", name: "Michael Chen", reason: "Bi-annual Checkup • Virtual", tag: "Form Pending", img: patientMarcus },
  { time: "01:15 PM", name: "Emma Wilson", reason: "Allergy Consultation • Room 104", tag: "Referral attached", img: patientEleanor },
];

type ViewMode = "split" | "list";

const Schedule = () => {
  const [view, setView] = useState<ViewMode>("split");

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

    {view === "split" ? (
    <div className="grid lg:grid-cols-[400px_1fr] gap-6 mt-8">
      {/* Today's Agenda */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-primary">Today's Agenda</h2>
            <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-1">OCTOBER 14, 2023</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-chip flex items-center justify-center text-primary"><Calendar className="h-5 w-5" /></div>
        </div>

        <div className="mt-6 space-y-3">
          {agenda.map((a, i) => (
            <motion.div key={a.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className={`relative rounded-2xl p-4 border ${a.active ? "bg-chip/40 border-primary-glow" : "bg-muted/30 border-border/40"}`}>
              {a.active && <span className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-primary-glow" />}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-primary bg-card px-2 py-0.5 rounded-md border border-border/40">{a.time}</span>
                <button className="text-muted-foreground">•••</button>
              </div>
              <p className="font-semibold text-primary mt-3">{a.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{a.reason}</p>
              <div className="flex items-center gap-2 mt-3">
                <img src={a.img} alt={a.name} loading="lazy" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                <span className="text-[11px] text-foreground/70">{a.tag}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <Link href="/portal/queue" className="mt-5 block text-center w-full rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-primary hover:bg-chip/40 transition-colors">View All 12 Appointments</Link>
      </motion.div>

      {/* Calendar */}
      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl text-primary">October 2023</h2>
          <div className="flex items-center gap-2">
            <button className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-chip"><ChevronLeft className="h-4 w-4" /></button>
            <button className="rounded-full bg-chip border border-border px-5 py-2 text-sm font-semibold text-primary">Today</button>
            <button className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-chip"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-muted/30 p-4 border border-border/40">
          <div className="grid grid-cols-7 gap-2 text-[10px] tracking-widest font-bold text-muted-foreground pb-3 border-b border-border/50">
            {days.map(d => <div key={d} className="text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2 mt-3">
            {month.flat().map((d, i) => {
              const isOther = i < 5 || (i >= 28 && i < 35 && d < 16);
              const slots = slotMap[d];
              const isToday = d === 14 && i > 7;
              return (
                <motion.div key={i} whileHover={{ scale: 1.02 }}
                  className={`min-h-[80px] rounded-xl p-2 transition-colors ${isToday ? "bg-gradient-dark text-surface-dark-foreground" : isOther ? "text-muted-foreground/50" : "hover:bg-card cursor-pointer"}`}>
                  <p className={`text-sm font-semibold ${isToday ? "text-surface-dark-foreground" : "text-primary"}`}>{d}</p>
                  {isToday && <div className="mt-2 space-y-1">
                    <div className="text-[9px] bg-surface-dark-foreground/10 rounded px-1.5 py-0.5">Today's Agenda</div>
                    <div className="text-[9px] bg-surface-dark-foreground/10 rounded px-1.5 py-0.5">4 Urgent Cases</div>
                  </div>}
                  {slots && <div className="mt-1 space-y-1">
                    {slots.map(s => (
                      <div key={s.label} className={`text-[9px] rounded px-1.5 py-0.5 font-semibold ${s.tone === "ok" ? "bg-chip text-primary-glow" : "bg-destructive/15 text-destructive"}`}>{s.label}</div>
                    ))}
                  </div>}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between mt-5 flex-wrap gap-3">
          <div className="flex items-center gap-5 text-xs text-foreground/70">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Selected / Today</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary-glow" /> Available slots</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Clinic Holidays</span>
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
          <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-1">OCTOBER 14, 2023</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-chip flex items-center justify-center text-primary"><ClipboardList className="h-5 w-5" /></div>
      </div>
      <div className="divide-y divide-border/50">
        {agenda.map((a, i) => (
          <motion.div key={a.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
            className="flex items-center gap-5 py-4">
            <span className="font-semibold text-primary bg-chip px-3 py-1 rounded-md text-xs min-w-[88px] text-center">{a.time}</span>
            <img src={a.img} alt={a.name} loading="lazy" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-primary">{a.name}</p>
              <p className="text-xs text-muted-foreground">{a.reason}</p>
            </div>
            <span className="hidden md:inline text-[11px] text-foreground/70 bg-muted/50 px-2 py-1 rounded-md">{a.tag}</span>
            <Link href="/portal/prescription" className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 shadow-glow">Open</Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
    )}

    <div className="grid md:grid-cols-3 gap-5 mt-8">
      <div className="rounded-2xl bg-chip/60 p-6 flex items-center justify-between">
        <div><p className="text-[10px] tracking-widest font-bold text-primary-glow">AVG WAITING TIME</p><p className="font-display text-4xl text-primary mt-2">14 min</p></div>
        <div className="h-12 w-12 rounded-xl bg-card flex items-center justify-center text-primary"><Calendar className="h-5 w-5" /></div>
      </div>
      <div className="rounded-2xl bg-chip/60 p-6 flex items-center justify-between">
        <div><p className="text-[10px] tracking-widest font-bold text-primary-glow">PATIENTS SEEN</p><p className="font-display text-4xl text-primary mt-2">142</p></div>
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

