"use client";

import { motion } from "framer-motion";
import { Briefcase, FileText, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { useSession, displayName } from "@/lib/auth/useSession";

const Dashboard = () => {
  const { user } = useSession();

  return (
    <PatientPortalLayout>
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-10 shadow-glow relative overflow-hidden">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
            <h1 className="font-display text-5xl relative">Hello, {displayName(user)}</h1>
            <p className="mt-3 opacity-80 relative">Welcome to the Dashboard</p>
            <div className="mt-8 flex gap-4 relative">
              <Link href="/patient/appointments" className="flex items-center gap-2 rounded-full bg-surface-dark-foreground/15 backdrop-blur px-6 py-3 text-sm font-semibold border border-surface-dark-foreground/20 hover:bg-surface-dark-foreground/25 transition-colors">
                <Briefcase className="h-4 w-4" /> Book Appointment
              </Link>
              <Link href="/patient/find-doctors" className="rounded-full bg-card text-primary px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity">Find Doctors</Link>
            </div>
          </motion.div>

          {/* Two cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-3xl bg-chip/40 p-6 border border-border/40">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl text-primary">Appointments</h3>
                <Link href="/patient/appointments" className="text-xs font-semibold text-primary-glow hover:underline">Full Calendar</Link>
              </div>
              <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card border border-border/40 border-dashed py-10 text-center">
                <CalendarPlus className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-semibold text-primary">No appointments yet</p>
                <p className="text-xs text-muted-foreground max-w-[220px]">Find a doctor and book your first visit to see it here.</p>
              </div>
              <Link href="/patient/find-doctors" className="mt-5 block text-center w-full rounded-xl bg-card border border-border py-3 text-sm font-semibold text-primary hover:bg-chip transition-colors">+ Schedule New Consultation</Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-3xl bg-chip/40 p-6 border border-border/40">
              <h3 className="font-display text-xl text-primary">Recent Records</h3>
              <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card border border-border/40 border-dashed py-10 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-semibold text-primary">No records yet</p>
                <p className="text-xs text-muted-foreground max-w-[220px]">Reports and results from your visits will show up here.</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
            <h3 className="font-display text-xl text-primary">Your Details</h3>
            <div className="mt-5 space-y-3 text-sm">
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">NAME</p>
                <p className="font-semibold text-primary">{displayName(user)}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">EMAIL</p>
                <p className="font-semibold text-primary">{user?.email ?? "—"}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-5"><Link href="/patient/profile" className="text-primary-glow font-semibold hover:underline">Complete your profile</Link> to speed up booking.</p>
          </motion.div>
        </div>
      </div>
    </PatientPortalLayout>
  );
};
export default Dashboard;
