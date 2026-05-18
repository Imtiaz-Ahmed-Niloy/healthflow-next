'use client';
import { useState } from "react";
import { motion } from "framer-motion";
import { Video, Calendar, Clock, ShieldCheck, Stethoscope, Check } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";

const slots = ["Today, 2:30 PM", "Today, 4:00 PM", "Tomorrow, 9:00 AM", "Tomorrow, 11:30 AM", "Fri, 10:00 AM", "Fri, 3:30 PM"];
const reasons = ["General Consultation", "Follow-up Visit", "Prescription Refill", "Mental Health", "Pediatric", "Dermatology"];

const Telehealth = () => {
  const [slot, setSlot] = useState(slots[0]);
  const [reason, setReason] = useState(reasons[0]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main className="container mx-auto py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
            <Video className="h-3 w-3" /> Virtual Care
          </span>
          <h1 className="font-display text-5xl text-primary mt-4">Telehealth Visits</h1>
          <p className="text-muted-foreground mt-3 text-lg">See a board-certified clinician from anywhere. Most visits are under 15 minutes — and we send the prescription straight to your pharmacy.</p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8 mt-12">
          <form onSubmit={(e) => { e.preventDefault(); toast.success("Telehealth visit requested", { description: `${reason} · ${slot}` }); }} className="rounded-3xl bg-card border border-border/60 p-8 shadow-soft space-y-6">
            <h2 className="font-display text-2xl text-primary">Book a virtual visit</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Full name</label>
                <Input required defaultValue="" placeholder="Jane Doe" className="mt-2 rounded-xl" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Email</label>
                <Input required type="email" placeholder="you@email.com" className="mt-2 rounded-xl" />
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Reason for visit</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {reasons.map((r) => (
                  <button key={r} type="button" onClick={() => setReason(r)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${reason === r ? "bg-primary text-primary-foreground" : "bg-accent/30 text-primary hover:bg-accent/50"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Choose a time slot</label>
              <div className="mt-2 grid sm:grid-cols-3 gap-2">
                {slots.map((s) => (
                  <button key={s} type="button" onClick={() => setSlot(s)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${slot === s ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground/70 hover:bg-accent/30"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Brief description (optional)</label>
              <textarea rows={4} placeholder="Describe your symptoms..." className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <button className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">
              Confirm Telehealth Visit
            </button>
          </form>

          <aside className="space-y-5">
            <div className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
              <h3 className="font-display text-lg text-primary inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> What's included</h3>
              <ul className="mt-4 space-y-3 text-sm text-foreground/80">
                {["HIPAA-compliant video", "Board-certified physician", "E-prescription to your pharmacy", "Visit summary in your portal", "Follow-up message (48h)"].map((x) => (
                  <li key={x} className="flex items-start gap-2"><Check className="h-4 w-4 text-primary-glow mt-0.5 shrink-0" />{x}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-6">
              <Stethoscope className="h-6 w-6 text-accent" />
              <p className="font-display text-2xl mt-3">$49 / visit</p>
              <p className="text-xs opacity-70 mt-1">Most insurance accepted. Cash-pay flat rate.</p>
              <div className="mt-4 flex items-center gap-3 text-xs opacity-90">
                <Calendar className="h-4 w-4" /> 7 days a week
                <span className="opacity-40">·</span>
                <Clock className="h-4 w-4" /> 7am – 11pm
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Telehealth;
