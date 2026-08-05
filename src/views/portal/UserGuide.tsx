"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, FileText, Users, BookUser, Calendar, PlayCircle, ChevronDown, Lightbulb, ShieldCheck, Stethoscope, ClipboardList } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";

const sections = [
  {
    id: "prescription",
    icon: FileText,
    title: "Prescription",
    summary: "Create, sign and dispatch digital prescriptions for patients in seconds.",
    steps: [
      "Open the Prescription tab from the sidebar.",
      "Search the patient by name, ID or scan their portal QR.",
      "Add diagnoses, medications, dosage, frequency and duration.",
      "Attach lab advice or follow-up notes if required.",
      "Click Sign & Send — the patient receives it in their portal and via SMS.",
    ],
    tips: [
      "Use the medicine autocomplete to avoid spelling mistakes.",
      "Save frequently used combinations as templates for one-click reuse.",
    ],
  },
  {
    id: "queue",
    icon: Users,
    title: "Patient Queue",
    summary: "Manage today's waiting list, call the next patient and track consultation flow.",
    steps: [
      "The queue auto-refreshes as the assistant checks in patients.",
      "Drag a card to reorder priority, or mark urgent cases.",
      "Click Call Next to notify the patient on the display and via app.",
      "Mark consultation status: In Progress, Completed or No-Show.",
    ],
    tips: [
      "Use colour tags to flag follow-ups vs. new patients.",
      "Pause the queue during breaks so the assistant stops sending tokens.",
    ],
  },
  {
    id: "directory",
    icon: BookUser,
    title: "Patient Directory",
    summary: "Search the complete patient history, demographics and previous visits.",
    steps: [
      "Use the search bar to find patients by name, phone or MRN.",
      "Click a row to open the full medical record timeline.",
      "Review previous prescriptions, lab reports and vitals.",
      "Add private clinical notes that only you can see.",
    ],
    tips: [
      "Filter by last visit date to spot patients overdue for follow-up.",
      "Export a patient summary as PDF before referring out.",
    ],
  },
  {
    id: "schedule",
    icon: Calendar,
    title: "Schedule",
    summary: "Set your availability, block leave and review upcoming appointments.",
    steps: [
      "Open Schedule and choose Week or Month view.",
      "Drag on a slot to create availability windows.",
      "Click Block to mark personal leave or surgery time.",
      "Approve or reschedule appointment requests from patients.",
    ],
    tips: [
      "Set recurring weekly templates instead of editing each day.",
      "Enable buffer time between appointments to prevent overruns.",
    ],
  },
];

const quickTips = [
  { icon: Lightbulb, t: "Keyboard shortcuts", d: "Press ⌘K / Ctrl+K to jump to any patient or page." },
  { icon: ShieldCheck, t: "Data privacy", d: "Always sign out on shared workstations — sessions are tied to your device." },
  { icon: Stethoscope, t: "Telehealth", d: "Use Chrome or Edge for the smoothest video consultation experience." },
  { icon: ClipboardList, t: "Templates", d: "Build prescription templates once, reuse them across patients." },
];

const faqs = [
  { q: "How do I reset my password?", a: "Use the Forgot Password link on the sign-in page. A reset link is emailed to your registered address and expires in 30 minutes." },
  { q: "Why can't I see a patient in the directory?", a: "Patients only appear after they're registered by the hospital admin or completed self sign-up. Ask reception to verify the registration." },
  { q: "Can I edit a prescription after sending?", a: "Yes — open the prescription from the patient's history within 24 hours and click Amend. Changes are version-tracked and visible to the patient." },
  { q: "How do I request leave?", a: "Open Schedule → Block Time → choose dates and reason. HR is notified automatically and patients with affected appointments are rescheduled." },
];

const UserGuide = () => {
  const [open, setOpen] = useState<string | null>("prescription");
  const [faqOpen, setFaqOpen] = useState(0);

  return (
    <PortalLayout>
      <div className="max-w-6xl mx-auto space-y-10">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-10 shadow-soft"
        >
          <span className="inline-flex rounded-full bg-surface-dark-foreground/15 px-3 py-1 text-[10px] font-bold tracking-widest">DOCTOR PANEL · USER GUIDE</span>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">Everything you need to master your panel</h1>
          <p className="mt-3 text-sm opacity-80 max-w-2xl">
            A complete manual and walk-through of every feature in your doctor workspace — prescriptions, queue management, patient directory and scheduling.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#sections" className="inline-flex items-center gap-2 rounded-full bg-accent text-primary px-5 py-2.5 text-xs font-semibold hover:bg-accent/80 transition-colors">
              <BookOpen className="h-4 w-4" /> Read the manual
            </a>
            <a href="#tutorial" className="inline-flex items-center gap-2 rounded-full bg-surface-dark-foreground/10 border border-surface-dark-foreground/20 px-5 py-2.5 text-xs font-semibold hover:bg-surface-dark-foreground/20 transition-colors">
              <PlayCircle className="h-4 w-4" /> Watch tutorial
            </a>
          </div>
        </motion.section>

        <section id="sections" className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <span className="inline-flex rounded-full bg-chip text-chip-foreground px-3 py-1 text-[10px] font-bold tracking-wider">FEATURE WALK-THROUGHS</span>
              <h2 className="mt-3 font-display text-3xl text-primary">Panel features</h2>
            </div>
            <p className="text-xs text-muted-foreground hidden md:block">Click a card to expand the step-by-step guide.</p>
          </div>

          <div className="grid gap-4">
            {sections.map((s) => {
              const isOpen = open === s.id;
              return (
                <div key={s.id} className="rounded-3xl bg-card border border-border/60 shadow-soft overflow-hidden">
                  <button
                    onClick={() => setOpen(isOpen ? null : s.id)}
                    className="w-full flex items-center gap-4 p-6 text-left"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-chip flex items-center justify-center text-primary">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-xl text-primary">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{s.summary}</p>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="grid md:grid-cols-2 gap-6 px-6 pb-6">
                          <div>
                            <h4 className="text-[10px] tracking-widest font-bold text-primary-glow">STEP-BY-STEP</h4>
                            <ol className="mt-3 space-y-2">
                              {s.steps.map((step, i) => (
                                <li key={i} className="flex gap-3 text-sm text-foreground/80">
                                  <span className="h-6 w-6 shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                          <div className="rounded-2xl bg-muted/40 p-5 border border-border/50">
                            <h4 className="text-[10px] tracking-widest font-bold text-primary-glow">PRO TIPS</h4>
                            <ul className="mt-3 space-y-2">
                              {s.tips.map((tip, i) => (
                                <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                                  <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-accent shrink-0" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        <section id="tutorial" className="rounded-3xl bg-card border border-border/60 shadow-soft p-8">
          <span className="inline-flex rounded-full bg-chip text-chip-foreground px-3 py-1 text-[10px] font-bold tracking-wider">VIDEO TUTORIAL</span>
          <h2 className="mt-3 font-display text-3xl text-primary">Watch a 5-minute walk-through</h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-xl">A guided tour of the doctor panel covering daily workflows from check-in to discharge.</p>
          <div className="mt-6 aspect-video rounded-2xl overflow-hidden border border-border/60 bg-black">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="Doctor Panel Tutorial"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>

        <section className="grid md:grid-cols-4 gap-4">
          {quickTips.map((t) => (
            <div key={t.t} className="rounded-2xl bg-card border border-border/60 p-5 shadow-soft">
              <div className="h-10 w-10 rounded-xl bg-chip flex items-center justify-center text-primary">
                <t.icon className="h-4 w-4" />
              </div>
              <h4 className="mt-3 font-semibold text-primary text-sm">{t.t}</h4>
              <p className="text-xs text-muted-foreground mt-1">{t.d}</p>
            </div>
          ))}
        </section>

        <section className="grid md:grid-cols-[1fr_2fr] gap-8 pb-6">
          <div>
            <span className="inline-flex rounded-full bg-chip text-chip-foreground px-3 py-1 text-[10px] font-bold tracking-wider">FAQ</span>
            <h2 className="mt-3 font-display text-3xl text-primary">Common questions</h2>
            <p className="text-xs text-muted-foreground mt-2">Quick answers to what doctors ask most often.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={f.q} className="rounded-2xl bg-muted/40 border border-border/60 overflow-hidden">
                <button onClick={() => setFaqOpen(faqOpen === i ? -1 : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="font-semibold text-primary text-sm">{f.q}</span>
                  <ChevronDown className={`h-4 w-4 text-primary transition-transform ${faqOpen === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {faqOpen === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                      <p className="px-5 pb-5 text-xs text-muted-foreground">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PortalLayout>
  );
};

export default UserGuide;

