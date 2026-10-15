"use client";

import { useState, useEffect, useCallback } from "react";

export type BrochureSlideType =
  | "cover"
  | "overview"
  | "doctor"
  | "hospital"
  | "pathology"
  | "pharmacy"
  | "patient"
  | "custom";

export type BrochureSlideStatus = "published" | "draft" | "archived";

export interface BrochureHighlightBadge {
  top_text: string;
  main_text: string;
  unit_top: string;
  unit_bottom: string;
  sub_text: string;
  is_large_num?: boolean;
}

export interface BrochureSlide {
  id: string;
  position: number;
  type: BrochureSlideType;
  title: string;
  subtitle: string;
  badge: string;
  tagline: string;
  features: string[];
  image: string | null;
  cta_label: string | null;
  cta_url: string | null;
  highlight_badge?: BrochureHighlightBadge | null;
  status: BrochureSlideStatus;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = "hf:brochure_slides:v1";

export const DEFAULT_BROCHURE_SLIDES: BrochureSlide[] = [
  {
    id: "slide-1-cover",
    position: 0,
    type: "cover",
    title: "HealthFlow,",
    subtitle: "বাংলাদেশের প্রথম সমন্বিত স্বাস্থ্য পরিষেবা।",
    badge: "স্মার্ট ডিজিটাল হেলথকেয়ার",
    tagline:
      "রোগী, ডাক্তার, হাসপাতাল এবং স্বাস্থ্যসেবা সেবাদানকারীদের এক প্ল্যাটফর্মে একত্রিত করার মাধ্যমে, স্বাস্থ্যসেবা এখন আরও সহজ, দ্রুত ও নির্ভরযোগ্য।",
    features: [
      "সমন্বিত ডিজিটাল প্ল্যাটফর্ম",
      "পেপারলেস স্মার্ট হসপিটাল ইকোসিস্টেম",
      "উন্নত ডেটা এনক্রিপশন ও সিকিউরিটি",
    ],
    image: "/assets/brochure-stethoscope-cover.jpg",
    cta_label: "এক্সপ্লোর করুন",
    cta_url: "/brochure",
    highlight_badge: null,
    status: "published",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "slide-2-services",
    position: 1,
    type: "overview",
    title: "We Care For Your Health",
    subtitle: "একটি পূর্ণাঙ্গ স্বাস্থ্যসেবা ইকোসিস্টেম",
    badge: "আমাদের ৪টি মূল স্তম্ভ",
    tagline: "ডাক্তার, হাসপাতাল, ডায়াগনস্টিক এবং ফার্মেসি — সকল সেবা এক সূত্রে গাঁথা।",
    features: [
      "ডাক্তার চেম্বার ও ডিজিটাল প্রেসক্রিপশন",
      "স্মার্ট হাসপাতাল ERP ও বেড ট্র্যাকিং",
      "অটোমেটেড প্যাথলজি ল্যাব ও টেস্ট ডেলিভারি",
      "পিস-লেভেল ফার্মেসি ইনভেন্টরি ও POS",
    ],
    image: "/assets/brochure-doctor-care.jpg",
    cta_label: "সেবাসমূহ দেখুন",
    cta_url: "/brochure",
    highlight_badge: null,
    status: "published",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "slide-3-doctors",
    position: 2,
    type: "doctor",
    title: "HealthFlow For Doctors",
    subtitle: "স্মার্ট চেম্বার ও EMR প্র্যাকটিস সলিউশন",
    badge: "Smart Chamber & EMR",
    tagline: "Modern Practice Management, Smart E-Prescription & Telehealth",
    features: [
      "AI-Assisted E-Prescription Generator with Bangladesh drug database",
      "Live chamber patient queue & waiting room TV display",
      "Unified patient timeline (investigations, prescriptions, vitals)",
      "Encrypted HD video telemedicine with digital fee collection",
      "Multi-chamber schedule and assistant revenue management",
    ],
    image: null,
    cta_label: "Join Doctor Network",
    cta_url: "/portal/login",
    highlight_badge: {
      top_text: "প্যাকেজ শুরু",
      main_text: "১০",
      unit_top: "মাত্র",
      unit_bottom: "টাকা",
      sub_text: "/প্রেসক্রিপশন",
      is_large_num: true,
    },
    status: "published",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "slide-4-hospital",
    position: 3,
    type: "hospital",
    title: "HealthFlow For Hospitals & Diagnostic Centers",
    subtitle: "সমন্বিত হাসপাতাল পরিচালনা ও অ্যাডমিশন ERP",
    badge: "Hospital ERP & Operations",
    tagline: "Unified Multi-Specialty Clinical Infrastructure & Telemetry",
    features: [
      "Complete IPD, OPD, ICU, and OT booking workflows",
      "Real-time bed occupancy, admission, and nurse handover charts",
      "Multi-counter billing with automated corporate insurance claims",
      "Role-gated clinical telemetry, staff duty roster, and payroll",
      "Enterprise multi-branch synchronization and audit logging",
    ],
    image: null,
    cta_label: "Request Hospital Demo",
    cta_url: "/contact",
    highlight_badge: {
      top_text: "এন্টারপ্রাইজ ERP",
      main_text: "স্মার্ট",
      unit_top: "হাসপাতাল",
      unit_bottom: "সিস্টেম",
      sub_text: "/পেপারলেস ক্লিনিক",
      is_large_num: false,
    },
    status: "published",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "slide-5-pathology",
    position: 4,
    type: "pathology",
    title: "HealthFlow For Pathology Labs",
    subtitle: "নমুনা ট্র্যাকিং ও দ্রুত ডিজিটাল টেস্ট রিপোর্ট",
    badge: "Laboratory Automation (LIMS)",
    tagline: "Specimen Tracking, Barcode Workflow & Automated Test Dispatch",
    features: [
      "Automated specimen barcode generation and accessioning",
      "Interfacing with biochemistry, hematology & immunology analyzers",
      "Doctor digital signature & multi-level pathologist approval flow",
      "Instant patient SMS alert with secure PDF download link",
      "Diagnostic reagent inventory tracking and re-order triggers",
    ],
    image: null,
    cta_label: "Automate Laboratory Workflow",
    cta_url: "/contact",
    highlight_badge: {
      top_text: "ল্যাব অটোমেশন",
      main_text: "১০০%",
      unit_top: "নির্ভুল",
      unit_bottom: "রিপোর্ট",
      sub_text: "/স্মার্ট LIMS",
      is_large_num: true,
    },
    status: "published",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "slide-6-pharmacy",
    position: 5,
    type: "pharmacy",
    title: "HealthFlow For Pharmacy",
    subtitle: "পিস-লেভেল বিলিং ও এক্সপায়রি প্রিভেনশন",
    badge: "Piece-Level POS & Inventory",
    tagline: "Batch Tracking, POS Billing & Automated Expiry Management",
    features: [
      "Piece-level retail & wholesale POS billing (tablet, strip, box)",
      "Strict batch & expiry date management with FIFO dispensing",
      "Supplier purchase orders, GRN receiving, and ledger management",
      "Daily cash drawer reconciliation and shift end summary reports",
      "Integrated prescription dispenser with chamber doctor link",
    ],
    image: null,
    cta_label: "Explore Pharmacy POS",
    cta_url: "/contact",
    highlight_badge: {
      top_text: "ফার্মেসি POS",
      main_text: "জিরো",
      unit_top: "স্টক",
      unit_bottom: "লস",
      sub_text: "/লাইভ ইনভেন্টরি",
      is_large_num: false,
    },
    status: "published",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "slide-7-patient",
    position: 6,
    type: "patient",
    title: "HealthFlow For Patients",
    subtitle: "রোগী পোর্টাল ও পার্সোনাল হেলথ EMR",
    badge: "Personal Health Record",
    tagline: "Doctor Booking, Digital Prescriptions, Lab Reports & Family Health",
    features: [
      "Find & book verified specialist doctors across Bangladesh",
      "Lifetime secure digital prescription & lab investigation records",
      "Real-time chamber serial tracking & SMS report ready alerts",
      "Encrypted HD video telemedicine consultation from home",
      "Transparent hospital billing, invoices & discharge summaries",
    ],
    image: null,
    cta_label: "Open Patient Account",
    cta_url: "/patient/dashboard",
    highlight_badge: {
      top_text: "রোগী পোর্টাল",
      main_text: "ফ্রি",
      unit_top: "আজীবন",
      unit_bottom: "সেবা",
      sub_text: "/ডিজিটাল হেলথ কার্ড",
      is_large_num: false,
    },
    status: "published",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

const readLocalSlides = (): BrochureSlide[] => {
  if (typeof window === "undefined") return DEFAULT_BROCHURE_SLIDES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BROCHURE_SLIDES));
      return DEFAULT_BROCHURE_SLIDES;
    }
    const parsed = JSON.parse(raw) as BrochureSlide[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_BROCHURE_SLIDES;
  } catch {
    return DEFAULT_BROCHURE_SLIDES;
  }
};

const writeLocalSlides = (slides: BrochureSlide[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slides));
    window.dispatchEvent(new Event("storage"));
  } catch {
    // storage disabled
  }
};

export const useBrochureSlides = () => {
  const [slides, setSlides] = useState<BrochureSlide[]>(readLocalSlides);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleStorage = () => {
      setSlides(readLocalSlides());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const createSlide = useCallback(
    (newSlide: Omit<BrochureSlide, "id" | "created_at" | "updated_at">) => {
      const now = new Date().toISOString();
      const slide: BrochureSlide = {
        ...newSlide,
        id: `slide-${Date.now()}`,
        position: newSlide.position ?? slides.length,
        created_at: now,
        updated_at: now,
      };
      const updated = [...slides, slide].sort((a, b) => a.position - b.position);
      setSlides(updated);
      writeLocalSlides(updated);
      return slide;
    },
    [slides]
  );

  const updateSlide = useCallback(
    (id: string, patch: Partial<BrochureSlide>) => {
      const now = new Date().toISOString();
      const updated = slides
        .map((s) => (s.id === id ? { ...s, ...patch, updated_at: now } : s))
        .sort((a, b) => a.position - b.position);
      setSlides(updated);
      writeLocalSlides(updated);
      return true;
    },
    [slides]
  );

  const removeSlide = useCallback(
    (id: string) => {
      const updated = slides.filter((s) => s.id !== id);
      setSlides(updated);
      writeLocalSlides(updated);
      return true;
    },
    [slides]
  );

  const togglePublish = useCallback(
    (id: string) => {
      const slide = slides.find((s) => s.id === id);
      if (!slide) return;
      const next: BrochureSlideStatus = slide.status === "published" ? "draft" : "published";
      updateSlide(id, { status: next });
    },
    [slides, updateSlide]
  );

  const resetToDefault = useCallback(() => {
    setSlides(DEFAULT_BROCHURE_SLIDES);
    writeLocalSlides(DEFAULT_BROCHURE_SLIDES);
  }, []);

  const reorderSlides = useCallback((ordered: BrochureSlide[]) => {
    const updated = ordered.map((s, idx) => ({ ...s, position: idx }));
    setSlides(updated);
    writeLocalSlides(updated);
  }, []);

  return {
    slides,
    isLoading,
    createSlide,
    updateSlide,
    removeSlide,
    togglePublish,
    resetToDefault,
    reorderSlides,
  };
};
