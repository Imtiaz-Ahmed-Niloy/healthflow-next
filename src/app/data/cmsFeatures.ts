import { useEffect, useState } from "react";

export type ArchFeature = {
  icon: string;
  title: string;
  desc: string;
  bullets: string[];
  dark?: boolean;
  tab?: string;
};

export type LogicPoint = { icon: string; title: string; desc: string };

export type CoreFeature = {
  icon: string;
  title: string;
  desc: string;
  chips?: string[];
  featured?: boolean;
};

export type FeaturesContent = {
  architecture: {
    title: string;
    subtitle: string;
    tabs: string[];
    items: ArchFeature[];
  };
  logic: {
    title: string;
    accentTitle: string;
    description: string;
    ctaLabel: string;
    points: LogicPoint[];
  };
  core: {
    title: string;
    subtitle: string;
    items: CoreFeature[];
  };
};

const STORAGE_KEY = "hf:cms-features:v1";
const EVENT = "hf:cms-features:changed";

export const defaultFeaturesContent: FeaturesContent = {
  architecture: {
    title: "Intelligent Architecture",
    subtitle:
      "Our platform integrates the most advanced medical tools into a single, cohesive workflow that prioritizes human well-being.",
    tabs: ["AI Features", "Features for Patient", "Features for Doctors", "Features for Management"],
    items: [
      // AI Features
      { tab: "AI Features", icon: "Brain", title: "AI Prognosis Engine", desc: "Predictive modeling that identifies patient risks before they become critical.", bullets: ["ML Risk Stratification", "Early Warning Alerts", "Trend Recognition"], dark: true },
      { tab: "AI Features", icon: "Sparkles", title: "Smart Symptom Checker", desc: "Conversational AI triages patient concerns and suggests next-best clinical actions.", bullets: ["NLP Intake", "Differential Diagnosis", "Triage Routing"] },
      { tab: "AI Features", icon: "Microscope", title: "Imaging Intelligence", desc: "Computer-vision assisted reading of radiology and pathology scans.", bullets: ["Anomaly Detection", "Auto-Annotation", "DICOM Ready"] },
      { tab: "AI Features", icon: "FileText", title: "Ambient Clinical Notes", desc: "AI scribe converts consultations into structured SOAP notes in real time.", bullets: ["Voice-to-Note", "ICD-10 Tagging", "EHR Sync"] },
      { tab: "AI Features", icon: "Activity", title: "Predictive Vitals", desc: "Continuous monitoring with anomaly forecasting on streaming biosignals.", bullets: ["Sepsis Prediction", "Arrhythmia Alerts", "Wearable Sync"] },
      { tab: "AI Features", icon: "Shield", title: "Privacy-First ML", desc: "Federated learning keeps PHI on-prem while improving global models.", bullets: ["Differential Privacy", "On-Device Inference", "HIPAA Compliant"] },

      // Features for Patient
      { tab: "Features for Patient", icon: "HeartPulse", title: "Interactive Wellness Portal", desc: "Empowering patients with tools for proactive health management.", bullets: ["Personalized Care Plans", "Activity Tracking Sync", "Secure Direct Messaging"] },
      { tab: "Features for Patient", icon: "Video", title: "Telemedicine Visits", desc: "See your doctor from anywhere with HD video and instant prescriptions.", bullets: ["1-Tap Join", "E-Prescriptions", "Family Accounts"], dark: true },
      { tab: "Features for Patient", icon: "Pill", title: "Medication Reminders", desc: "Never miss a dose with smart reminders and refill automation.", bullets: ["Dosage Tracker", "Pharmacy Refills", "Interaction Warnings"] },
      { tab: "Features for Patient", icon: "Clock", title: "Easy Appointment Booking", desc: "Find specialists, compare slots, and book in under a minute.", bullets: ["Real-time Availability", "Reminders", "Reschedule Anytime"] },
      { tab: "Features for Patient", icon: "FolderKanban", title: "My Health Records", desc: "All reports, prescriptions, and history in one secure vault.", bullets: ["Lab Reports", "Vaccination History", "Shareable Links"] },
      { tab: "Features for Patient", icon: "UserRound", title: "Wellness Tracking", desc: "Track recovery, fitness, and mental wellbeing with daily insights.", bullets: ["Goal Setting", "Mood Journal", "Progress Charts"] },

      // Features for Doctors
      { tab: "Features for Doctors", icon: "Stethoscope", title: "Clinical Workbench", desc: "A unified cockpit for charts, orders, and decision support.", bullets: ["Smart Templates", "Order Sets", "Decision Support"], dark: true },
      { tab: "Features for Doctors", icon: "Video", title: "HD Telemedicine Hub", desc: "Crystal-clear video conferencing integrated with real-time patient vitals.", bullets: ["4K Low-Latency Streaming", "Instant EHR Overlay", "Multi-Provider Consultations"] },
      { tab: "Features for Doctors", icon: "FileText", title: "E-Prescriptions", desc: "Issue compliant prescriptions in seconds with built-in drug intelligence.", bullets: ["Drug Interaction Checks", "Digital Signature", "Pharmacy Direct"] },
      { tab: "Features for Doctors", icon: "Clock", title: "Smart Scheduling", desc: "Automated calendars that respect breaks, OT, and emergency slots.", bullets: ["Conflict-Free", "Tele + In-Person", "Auto Reminders"] },
      { tab: "Features for Doctors", icon: "FolderKanban", title: "Unified Patient Chart", desc: "Longitudinal records with timeline, labs, and imaging in one view.", bullets: ["FHIR Native", "Cross-Hospital", "Voice Search"] },
      { tab: "Features for Doctors", icon: "HeartHandshake", title: "Care Team Collaboration", desc: "Secure messaging, referrals, and case discussions across specialties.", bullets: ["HIPAA Chat", "Referral Loop", "Tumor Boards"] },

      // Features for Management
      { tab: "Features for Management", icon: "BarChart3", title: "Strategic Analytics", desc: "High-level insights into clinical performance and population health.", bullets: ["Executive Dashboards", "Outcome Tracking", "Cost Efficiency Metrics"], dark: true },
      { tab: "Features for Management", icon: "Receipt", title: "Precision Billing", desc: "Transparent, automated billing cycles for providers and patients.", bullets: ["Automated Claims", "ICD-10 Smart Coding", "Eligibility Checks"] },
      { tab: "Features for Management", icon: "Hospital", title: "Bed & Resource Planner", desc: "Live occupancy, OT scheduling, and equipment utilization at a glance.", bullets: ["Real-time Census", "OR Optimization", "Asset Tracking"] },
      { tab: "Features for Management", icon: "Shield", title: "Compliance & Audit", desc: "Continuous HIPAA, GDPR, and accreditation readiness with audit trails.", bullets: ["Role-based Access", "Audit Logs", "Policy Library"] },
      { tab: "Features for Management", icon: "UserRound", title: "Staff & HR Console", desc: "Credentialing, rostering, and performance reviews in one place.", bullets: ["License Tracking", "Shift Rosters", "KPI Reviews"] },
      { tab: "Features for Management", icon: "Activity", title: "Revenue Intelligence", desc: "Forecast revenue, denials, and AR with drill-down dashboards.", bullets: ["Denial Analytics", "AR Aging", "Payer Mix"] },
    ],
  },
  logic: {
    title: "Built for Better Care:",
    accentTitle: "The Clinical Operating System",
    description:
      "HealthFlow unifies EHR, scheduling, diagnostics, and billing into one secure platform — engineered with clinicians to reduce burnout, eliminate duplicate work, and put patient outcomes first.",
    ctaLabel: "EXPLORE THE PLATFORM",
    points: [
      { icon: "Stethoscope", title: "Unified Patient Records", desc: "A single longitudinal chart consolidates history, labs, imaging, and prescriptions — accessible across departments in real time." },
      { icon: "ShieldCheck", title: "HIPAA-Grade Security", desc: "End-to-end encryption, role-based access, and continuous audit trails keep protected health information safe and compliant." },
      { icon: "Activity", title: "AI Clinical Insights", desc: "Predictive analytics surface early-warning vitals, flag drug interactions, and suggest evidence-based care pathways at the point of decision." },
    ],
  },
  core: {
    title: "Platform Core Features",
    subtitle: "Discover how HealthFlow integrates restorative care with modern clinical precision.",
    items: [
      { icon: "FileText", title: "Smart Diagnostics", desc: "AI-driven patient insights that reduce cognitive load for clinicians during consultations.", chips: ["CLINICAL", "AI-POWERED"] },
      { icon: "Clock", title: "Dynamic Scheduling", desc: "Automated appointment balancing based on clinic throughput and patient priority." },
      { icon: "Leaf", title: "Sustainable Records", desc: "Paperless patient lifecycle management with encrypted cloud-native synchronization.", featured: true },
      { icon: "UserRound", title: "Patient Portal", desc: "Restorative UI for patients to track their recovery journey and wellness metrics." },
    ],
  },
};

export const ICON_OPTIONS = [
  "Video","Brain","FolderKanban","Receipt","HeartPulse","BarChart3",
  "Waves","HeartHandshake","Zap","FileText","Clock","Leaf","UserRound",
  "Stethoscope","Shield","Activity","Sparkles","Pill","Microscope","Hospital",
];

const read = (): FeaturesContent => {
  if (typeof window === "undefined") return defaultFeaturesContent;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFeaturesContent;
    const parsed = JSON.parse(raw) as Partial<FeaturesContent>;
    return {
      architecture: { ...defaultFeaturesContent.architecture, ...(parsed.architecture ?? {}) },
      logic: { ...defaultFeaturesContent.logic, ...(parsed.logic ?? {}) },
      core: { ...defaultFeaturesContent.core, ...(parsed.core ?? {}) },
    };
  } catch {
    return defaultFeaturesContent;
  }
};

const write = (c: FeaturesContent) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event(EVENT));
};

export const useFeaturesContent = () => {
  const [content, setContent] = useState<FeaturesContent>(() => read());
  useEffect(() => {
    const sync = () => setContent(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { content, save: write, reset: () => write(defaultFeaturesContent) };
};
