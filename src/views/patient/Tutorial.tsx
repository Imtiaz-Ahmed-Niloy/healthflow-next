"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  Play,
  CheckCircle2,
  LayoutGrid,
  Calendar,
  Users,
  CreditCard,
  FileText,
  User,
  Search,
  Bell,
  Stethoscope,
  Pill,
  ClipboardList,
  ArrowLeft,
} from "lucide-react";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import Link from "next/link";

type TutorialStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  content: string[];
  tip?: string;
};

type TutorialModule = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  steps: TutorialStep[];
  duration: string;
};

const modules: TutorialModule[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn the basics of navigating your patient portal.",
    icon: LayoutGrid,
    accent: "bg-primary/10 text-primary",
    duration: "5 min",
    steps: [
      {
        id: "gs-1",
        title: "Dashboard Overview",
        description: "Your home for health insights",
        icon: LayoutGrid,
        content: [
          "The Dashboard gives you a quick snapshot of your health journey.",
          "View upcoming appointments, recent lab results, and health reminders.",
          "Use the sidebar on the left to jump between sections quickly.",
          "The top bar shows notifications, language options, and your profile.",
        ],
        tip: "Bookmark the dashboard for one-tap access every morning.",
      },
      {
        id: "gs-2",
        title: "Navigation Tips",
        description: "Moving around like a pro",
        icon: ChevronRight,
        content: [
          "Each sidebar item represents a major section of your portal.",
          "An active section is highlighted with a soft card background.",
          "Collapse the sidebar on smaller screens using the menu toggle.",
          "Use the search bar at the top to find doctors or services instantly.",
        ],
        tip: "Keyboard shortcut: press '/' to focus the global search instantly.",
      },
      {
        id: "gs-3",
        title: "Profile Settings",
        description: "Personalize your experience",
        icon: User,
        content: [
          "Visit 'My Profile' to update your photo, contact info, and emergency contacts.",
          "Switch between General, Clinical, Insurance, Documents, and Family tabs.",
          "Upload your NID or passport for verification in the Documents tab.",
          "Add family members under Family Management for easy appointment booking.",
        ],
        tip: "Keep your emergency contact updated — hospitals use it during emergencies.",
      },
    ],
  },
  {
    id: "appointments",
    title: "Appointments",
    description: "Book, reschedule, and manage visits with ease.",
    icon: Calendar,
    accent: "bg-emerald-500/10 text-emerald-500",
    duration: "7 min",
    steps: [
      {
        id: "ap-1",
        title: "Booking a Visit",
        description: "Find the right doctor and time",
        icon: Search,
        content: [
          "Go to 'Find Doctors' to browse specialists by department or symptom.",
          "Each doctor card shows rating, experience, and next available slot.",
          "Click 'Book Appointment' and pick a date and time that suits you.",
          "Confirm your booking — a reminder will be sent automatically.",
        ],
        tip: "Book morning slots for shorter wait times at the clinic.",
      },
      {
        id: "ap-2",
        title: "Managing Schedules",
        description: "Stay on top of your calendar",
        icon: Calendar,
        content: [
          "The 'Appointments' page lists all upcoming and past visits.",
          "Reschedule or cancel any appointment up to 2 hours before the slot.",
          "Filter by status: Upcoming, Completed, Cancelled, or No-show.",
          "Export your appointment list as a PDF for insurance claims.",
        ],
        tip: "Enable push notifications so you never miss a reminder.",
      },
      {
        id: "ap-3",
        title: "Telehealth Visits",
        description: "Consult from the comfort of home",
        icon: Stethoscope,
        content: [
          "Some doctors offer video consultations — look for the video icon.",
          "Join the call directly from your appointment card at the scheduled time.",
          "Have your ID ready for verification at the start of the session.",
          "Prescriptions from telehealth visits appear in your portal immediately.",
        ],
        tip: "Use a quiet, well-lit room for the best telehealth experience.",
      },
    ],
  },
  {
    id: "records-billing",
    title: "Records & Billing",
    description: "Access reports, prescriptions, and payments.",
    icon: FileText,
    accent: "bg-amber-500/10 text-amber-500",
    duration: "6 min",
    steps: [
      {
        id: "rb-1",
        title: "Medical Records",
        description: "Your complete health timeline",
        icon: ClipboardList,
        content: [
          "The 'Medical Records' page stores all your clinical history.",
          "View lab reports, prescriptions, vaccination history, and doctor notes.",
          "Download any document as a PDF for offline use or sharing.",
          "Use the timeline view to see your health journey chronologically.",
        ],
        tip: "Download and back up critical reports every 6 months.",
      },
      {
        id: "rb-2",
        title: "Prescriptions",
        description: "Medicines and refills at your fingertips",
        icon: Pill,
        content: [
          "Active prescriptions are shown with dosage, duration, and refill status.",
          "Request a refill with one click — the pharmacy gets notified instantly.",
          "Expired prescriptions are archived but still accessible for reference.",
          "Share a prescription with family caregivers via secure link.",
        ],
        tip: "Set medication reminders in the app to stay on schedule.",
      },
      {
        id: "rb-3",
        title: "Billing & Payments",
        description: "Transparent, hassle-free payments",
        icon: CreditCard,
        content: [
          "The 'Billing' page shows all invoices, payments, and pending dues.",
          "Pay online using card, mobile banking, or digital wallets.",
          "Download receipts instantly for insurance or reimbursement.",
          "View a breakdown of charges for each visit or service.",
        ],
        tip: "Enable auto-pay for recurring consultations to skip checkout every time.",
      },
    ],
  },
  {
    id: "health-tools",
    title: "Health Tools",
    description: "Track vitals, allergies, and wellness goals.",
    icon: Bell,
    accent: "bg-rose-500/10 text-rose-500",
    duration: "4 min",
    steps: [
      {
        id: "ht-1",
        title: "Vitals Tracker",
        description: "Monitor key health metrics",
        icon: ActivityIcon,
        content: [
          "Log your blood pressure, heart rate, weight, and temperature regularly.",
          "View trends over weeks and months with simple charts.",
          "Set target ranges and get alerts when readings go outside them.",
          "Share trends with your doctor before every appointment.",
        ],
      },
      {
        id: "ht-2",
        title: "Allergy & Medication Alerts",
        description: "Stay safe with smart alerts",
        icon: Bell,
        content: [
          "Record all known allergies and critical reactions in your profile.",
          "The system warns you if a prescribed medicine conflicts with an allergy.",
          "Set custom reminders for recurring medications and tests.",
          "Family members added to your account can receive shared alerts.",
        ],
        tip: "Update your allergy list immediately after any new reaction.",
      },
    ],
  },
];

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export default function Tutorial() {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const toggleStep = (stepId: string) => {
    setExpandedStep((prev) => (prev === stepId ? null : stepId));
  };

  const markComplete = (stepId: string) => {
    setCompletedSteps((prev) => new Set(prev).add(stepId));
  };

  const activeMod = modules.find((m) => m.id === activeModule);

  return (
    <PatientPortalLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/patient/profile"
            className="flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-primary transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Link>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="font-display text-3xl text-primary">Patient Portal Tutorial</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-xl">
            Learn how to use every feature of your patient dashboard. Follow the modules below at your own pace.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!activeMod ? (
            <motion.div
              key="modules"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid md:grid-cols-2 gap-5"
            >
              {modules.map((mod) => {
                const completedCount = mod.steps.filter((s) => completedSteps.has(s.id)).length;
                const progress = Math.round((completedCount / mod.steps.length) * 100);
                return (
                  <button
                    key={mod.id}
                    onClick={() => setActiveModule(mod.id)}
                    className="text-left rounded-2xl bg-card p-6 shadow-soft hover:shadow-md transition border border-transparent hover:border-primary/20 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`h-10 w-10 rounded-xl ${mod.accent} flex items-center justify-center`}>
                        <mod.icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] tracking-widest font-bold text-muted-foreground bg-chip/60 px-2 py-1 rounded-full">
                        {mod.duration}
                      </span>
                    </div>
                    <h3 className="font-display text-lg text-primary mb-1 group-hover:text-primary-glow transition">
                      {mod.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">{mod.description}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-chip rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] tracking-widest font-bold text-muted-foreground">
                        {completedCount}/{mod.steps.length}
                      </span>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button
                onClick={() => setActiveModule(null)}
                className="flex items-center gap-2 text-sm font-semibold text-foreground/70 hover:text-primary transition mb-6"
              >
                <ArrowLeft className="h-4 w-4" /> All Modules
              </button>

              <div className="rounded-2xl bg-card p-6 shadow-soft mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`h-10 w-10 rounded-xl ${activeMod.accent} flex items-center justify-center`}>
                    <activeMod.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl text-primary">{activeMod.title}</h2>
                    <p className="text-sm text-muted-foreground">{activeMod.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {activeMod.steps.map((step, idx) => {
                  const isOpen = expandedStep === step.id;
                  const isDone = completedSteps.has(step.id);
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`rounded-2xl bg-card shadow-soft border transition ${
                        isDone ? "border-primary/30" : "border-transparent"
                      }`}
                    >
                      <button
                        onClick={() => toggleStep(step.id)}
                        className="w-full flex items-center gap-4 p-5 text-left"
                      >
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isDone ? "bg-primary/10 text-primary" : "bg-chip/60 text-muted-foreground"
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-primary text-sm">{step.title}</h4>
                            {isDone && (
                              <span className="text-[10px] tracking-widest font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                DONE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                        />
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 pt-0">
                              <div className="ml-13 pl-[52px] border-l-2 border-chip/60 space-y-3">
                                {(step.content || []).map((line, i) => (
                                  <div key={i} className="flex items-start gap-3">
                                    <Play className="h-3 w-3 text-primary-glow mt-1 shrink-0" />
                                    <p className="text-sm text-foreground/80 leading-relaxed">{line}</p>
                                  </div>
                                ))}
                                {step.tip && (
                                  <div className="mt-3 rounded-xl bg-primary/5 border border-primary/10 p-4">
                                    <p className="text-xs font-semibold text-primary mb-1">PRO TIP</p>
                                    <p className="text-sm text-foreground/70">{step.tip}</p>
                                  </div>
                                )}
                                {!isDone && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markComplete(step.id);
                                    }}
                                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Complete
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PatientPortalLayout>
  );
}

