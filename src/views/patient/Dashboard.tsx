"use client";

import { motion } from "framer-motion";
import { Briefcase, Search, Recycle, FileText, Heart, Sprout, AlertCircle, MessageSquare, Upload, Pill, HelpCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";

const Dashboard = () => (
  <PatientPortalLayout>
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-10 shadow-glow relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          <h1 className="font-display text-5xl relative">Hello, Imtiaz Ahmed Niloy</h1>
          <p className="mt-3 opacity-80 relative">Welcome to the Dashboard</p>
          <div className="mt-8 flex gap-4 relative">
            <Link href="/patient/appointments" className="flex items-center gap-2 rounded-full bg-surface-dark-foreground/15 backdrop-blur px-6 py-3 text-sm font-semibold border border-surface-dark-foreground/20 hover:bg-surface-dark-foreground/25 transition-colors">
              <Briefcase className="h-4 w-4" /> Book Appointment
            </Link>
            <Link href="/patient/find-doctors" className="rounded-full bg-card text-primary px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity">Find Doctors</Link>
          </div>
        </motion.div>

        {/* Sustainability */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft flex items-center gap-6 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <h2 className="font-display text-2xl text-primary">Hospital Sustainability Impact</h2>
            <p className="text-sm text-muted-foreground mt-2">Your visit today contributed to our Zero-Waste clinical goal.</p>
          </div>
          <div className="text-center">
            <p className="font-display text-4xl text-primary">100%</p>
            <p className="text-[10px] tracking-widest font-bold text-primary-glow">RENEWABLE</p>
          </div>
          <div className="h-14 w-14 rounded-full bg-chip flex items-center justify-center text-primary"><Recycle className="h-6 w-6" /></div>
        </motion.div>

        {/* Two cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-3xl bg-chip/40 p-6 border border-border/40">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-primary">Appointments</h3>
              <Link href="/patient/appointments" className="text-xs font-semibold text-primary-glow hover:underline">Full Calendar</Link>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { d: "24", m: "MAY", t: "3D Organ Mapping", s: "Dr. Aris Thorne • 14:00", done: true },
                { d: "28", m: "MAY", t: "Bio-Hormone Review", s: "Dr. Sarah Green • 10:30" },
              ].map(a => (
                <div key={a.t} className="flex items-center gap-4 rounded-2xl bg-card p-3 border border-border/40">
                  <div className="h-14 w-14 rounded-xl bg-chip text-primary flex flex-col items-center justify-center">
                    <p className="font-display text-lg leading-none">{a.d}</p>
                    <p className="text-[9px] tracking-widest font-bold mt-0.5">{a.m}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-primary text-sm">{a.t}</p>
                    <p className="text-xs text-muted-foreground">{a.s}</p>
                  </div>
                  {a.done && <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">✓</div>}
                </div>
              ))}
            </div>
            <Link href="/patient/appointments" className="mt-5 block text-center w-full rounded-xl bg-card border border-border py-3 text-sm font-semibold text-primary hover:bg-chip transition-colors">+ Schedule New Consultation</Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-3xl bg-chip/40 p-6 border border-border/40">
            <h3 className="font-display text-xl text-primary">Recent Records</h3>
            <div className="mt-5 space-y-4">
              {[
                { i: FileText, t: "DNA Methylation Report", s: "2 days ago • Laboratory Alpha", b: "↓ PDF (2.4MB)" },
                { i: Heart, t: "Cardio-Ecology Scan", s: "1 week ago • Main Hub", b: "👁 VIEW RESULTS" },
                { i: Sprout, t: "Phytonutrient Balance", s: "May 12 • Wellness Center", b: "Archived Record" },
              ].map(r => (
                <div key={r.t} className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-card flex items-center justify-center text-primary shrink-0"><r.i className="h-4 w-4" /></div>
                  <div>
                    <p className="font-semibold text-primary text-sm">{r.t}</p>
                    <p className="text-xs text-muted-foreground">{r.s}</p>
                    <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-1">{r.b}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { i: Upload, t: "Upload Docs", to: "/patient/medical-records" },
            { i: Pill, t: "Pharmacy", to: "/lab-tests" },
            { i: HelpCircle, t: "Telehealth", to: "/telehealth" },
          ].map((q, i) => (
            <motion.div key={q.t} whileHover={{ y: -3 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.05 }}>
              <Link href={q.to} className="rounded-2xl bg-chip/60 p-6 flex flex-col items-center gap-3 hover:bg-chip transition-colors">
                <q.i className="h-7 w-7 text-primary" />
                <p className="font-semibold text-primary text-sm">{q.t}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
          className="rounded-3xl bg-card border border-border/60 p-6 text-center shadow-soft">
          <h3 className="font-display text-xl text-primary">Profile Status</h3>
          <div className="relative mx-auto mt-5 h-40 w-40">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="44" stroke="hsl(var(--border))" strokeWidth="6" fill="none" />
              <motion.circle cx="50" cy="50" r="44" stroke="hsl(var(--primary))" strokeWidth="6" fill="none" strokeLinecap="round"
                initial={{ strokeDasharray: "0 276" }} animate={{ strokeDasharray: "234 276" }} transition={{ duration: 1.2, ease: "easeOut" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-display text-3xl text-primary">85%</p>
              <p className="text-[10px] tracking-widest font-bold text-primary-glow">COMPLETE</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4"><Link href="/patient/profile" className="text-primary-glow font-semibold hover:underline">Click Here</Link> To Complete Profile</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
          <h3 className="font-display text-xl text-primary">Alerts & Messages</h3>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-semibold text-destructive text-sm">Payment Overdue</p>
                <p className="text-xs text-foreground/70 mt-1">Invoice #BL-9932 is 2 days late.</p>
              </div>
            </div>
            <div className="rounded-2xl bg-chip/60 p-4 flex gap-3">
              <MessageSquare className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-primary text-sm">Dr. Markoff</p>
                <p className="text-xs text-foreground/70 mt-1">&quot;Please review the new dietary plan...&quot;</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-primary">Activity Feed</h3>
            <button onClick={() => toast.success("Activity cleared")} className="text-[10px] tracking-widest font-bold text-primary-glow hover:underline">CLEAR</button>
          </div>
          <div className="mt-5 space-y-5 border-l border-border ml-1.5 pl-5">
            {[
              { d: "TODAY, 09:12 AM", t: "Lab Results Uploaded", s: "General Health Panel (Ref: 9022)" },
              { d: "OCT 24, 2024", t: "Visit to Cardiology", s: "Routine checkup with Dr. Aris" },
              { d: "OCT 20, 2024", t: "Updated Profile Info", s: "Insurance provider changed." },
            ].map(a => (
              <div key={a.t} className="relative">
                <div className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-primary-glow bg-card" />
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{a.d}</p>
                <p className="font-semibold text-primary text-sm mt-0.5">{a.t}</p>
                <p className="text-xs text-muted-foreground">{a.s}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </PatientPortalLayout>
);
export default Dashboard;

