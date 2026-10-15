"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X, CheckCircle2, ArrowRight, ChevronRight, ChevronLeft, Plus,
  FileText, Users, Activity, Video, Sparkles, Building2, HeartHandshake,
  BedDouble, Receipt, Stethoscope, Hospital, Microscope, QrCode, Cpu, FileCheck2,
  Smartphone, Package, TrendingUp, ShoppingBag, AlertTriangle,
  Pill, CircleDollarSign, Truck, Home, RotateCcw, Calculator,
  Calendar, Heart, Mail, Phone, Facebook, Linkedin
} from "lucide-react";
import Link from "next/link";
import { BRAND_INFO } from "@/constants/brand";

type PageIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface CategoryDetail {
  id: "doctors" | "hospital" | "diagnostics" | "pharmacy" | "patient";
  title: string;
  badge: string;
  tagline: string;
  gradient: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
}

const CATEGORY_DETAILS: Record<string, CategoryDetail> = {
  doctors: {
    id: "doctors",
    title: "HealthFlow For Doctors",
    badge: "Smart Chamber & EMR",
    tagline: "Modern Practice Management, Smart E-Prescription & Telehealth",
    gradient: "linear-gradient(145deg, #427c88 0%, #25555e 100%)",
    features: [
      "AI-Assisted E-Prescription Generator with Bangladesh drug database",
      "Live chamber patient queue & waiting room TV display",
      "Unified patient timeline (investigations, prescriptions, vitals)",
      "Encrypted HD video telemedicine with digital fee collection",
      "Multi-chamber schedule and assistant revenue management"
    ],
    ctaText: "Join Doctor Network",
    ctaLink: "/portal/login",
  },
  hospital: {
    id: "hospital",
    title: "HealthFlow For Hospitals & Diagnostic Centers",
    badge: "Hospital ERP & Operations",
    tagline: "Unified Multi-Specialty Clinical Infrastructure & Telemetry",
    gradient: "linear-gradient(145deg, #1b3861 0%, #0c1832 100%)",
    features: [
      "Complete IPD, OPD, ICU, and OT booking workflows",
      "Real-time bed occupancy, admission, and nurse handover charts",
      "Multi-counter billing with automated corporate insurance claims",
      "Role-gated clinical telemetry, staff duty roster, and payroll",
      "Enterprise multi-branch synchronization and audit logging"
    ],
    ctaText: "Request Hospital Demo",
    ctaLink: "/contact",
  },
  diagnostics: {
    id: "diagnostics",
    title: "HealthFlow For Pathology Labs",
    badge: "Laboratory Automation (LIMS)",
    tagline: "Specimen Tracking, Barcode Workflow & Automated Test Dispatch",
    gradient: "linear-gradient(145deg, #51cfbe 0%, #229f90 100%)",
    features: [
      "Automated specimen barcode generation and accessioning",
      "Interfacing with biochemistry, hematology & immunology analyzers",
      "Doctor digital signature & multi-level pathologist approval flow",
      "Instant patient SMS alert with secure PDF download link",
      "Diagnostic reagent inventory tracking and re-order triggers"
    ],
    ctaText: "Automate Laboratory Workflow",
    ctaLink: "/contact",
  },
  pharmacy: {
    id: "pharmacy",
    title: "HealthFlow For Pharmacy",
    badge: "Piece-Level POS & Inventory",
    tagline: "Batch Tracking, POS Billing & Automated Expiry Management",
    gradient: "linear-gradient(145deg, #4bdcb4 0%, #1b7e94 100%)",
    features: [
      "Piece-level retail & wholesale POS billing (tablet, strip, box)",
      "Strict batch & expiry date management with FIFO dispensing",
      "Supplier purchase orders, GRN receiving, and ledger management",
      "Daily cash drawer reconciliation and shift end summary reports",
      "Integrated prescription dispenser with chamber doctor link"
    ],
    ctaText: "Explore Pharmacy POS",
    ctaLink: "/contact",
  },
  patient: {
    id: "patient",
    title: "HealthFlow For Patients",
    badge: "Smart Healthcare Portal",
    tagline: "Your Personal & Family Digital Healthcare Companion",
    gradient: "linear-gradient(145deg, #0284c7 0%, #0369a1 100%)",
    features: [
      "Search and book top specialist doctors across Bangladesh",
      "Lifelong secure digital prescription archive & EMR timeline",
      "Instant SMS notifications & direct PDF download for lab reports",
      "HD video telemedicine appointments from home",
      "Transparent hospital medical billing and itemized invoices"
    ],
    ctaText: "Open Free Patient Account",
    ctaLink: "/patient/dashboard",
  },
};

/**
 * Engaging Scalloped Rosette Highlight Badge
 * Supports 5 panel themes: doctor, hospital, pathology, pharmacy, and patient
 */
interface ScallopBadgeProps {
  className?: string;
  size?: "default" | "sm";
  variant?: "doctor" | "hospital" | "pathology" | "pharmacy" | "patient";
}

const ScallopPricingBadge = ({
  className = "",
  size = "default",
  variant = "doctor",
}: ScallopBadgeProps) => {
  const isSm = size === "sm";

  const config = {
    doctor: {
      radialId: "rosetteDoctorRadial",
      stop0: "#2f998d",
      stop42: "#217a72",
      stop80: "#124845",
      stop100: "#0b2e2d",
      stroke: "#4bdcb4",
      topText: "প্যাকেজ শুরু",
      mainText: "১০",
      isLargeNum: true,
      unitTop: "মাত্র",
      unitBottom: "টাকা",
      subText: "/প্রেসক্রিপশন",
      sparkle1: "text-amber-300",
      sparkle2: "text-teal-200",
      glowBg: "bg-[#2cb8a7]/40 group-hover:bg-[#2cb8a7]/60",
    },
    hospital: {
      radialId: "rosetteHospitalRadial",
      stop0: "#255294",
      stop42: "#1a3e74",
      stop80: "#10264a",
      stop100: "#08172e",
      stroke: "#60a5fa",
      topText: "এন্টারপ্রাইজ ERP",
      mainText: "স্মার্ট",
      isLargeNum: false,
      unitTop: "হাসপাতাল",
      unitBottom: "সিস্টেম",
      subText: "/পেপারলেস ক্লিনিক",
      sparkle1: "text-cyan-300",
      sparkle2: "text-blue-200",
      glowBg: "bg-blue-600/35 group-hover:bg-blue-600/55",
    },
    pathology: {
      radialId: "rosettePathologyRadial",
      stop0: "#229f90",
      stop42: "#178275",
      stop80: "#0e534a",
      stop100: "#07332d",
      stroke: "#34d399",
      topText: "ল্যাব অটোমেশন",
      mainText: "১০০%",
      isLargeNum: true,
      unitTop: "নির্ভুল",
      unitBottom: "রিপোর্ট",
      subText: "/স্মার্ট LIMS",
      sparkle1: "text-emerald-300",
      sparkle2: "text-teal-200",
      glowBg: "bg-[#229f90]/40 group-hover:bg-[#229f90]/60",
    },
    pharmacy: {
      radialId: "rosettePharmacyRadial",
      stop0: "#1b7e94",
      stop42: "#136375",
      stop80: "#0c414d",
      stop100: "#072a32",
      stroke: "#38bdf8",
      topText: "ফার্মেসি POS",
      mainText: "জিরো",
      isLargeNum: false,
      unitTop: "স্টক",
      unitBottom: "লস",
      subText: "/লাইভ ইনভেন্টরি",
      sparkle1: "text-sky-300",
      sparkle2: "text-cyan-200",
      glowBg: "bg-[#1b7e94]/40 group-hover:bg-[#1b7e94]/60",
    },
    patient: {
      radialId: "rosettePatientRadial",
      stop0: "#0284c7",
      stop42: "#0369a1",
      stop80: "#075985",
      stop100: "#0c4a6e",
      stroke: "#38bdf8",
      topText: "রোগী পোর্টাল",
      mainText: "ফ্রি",
      isLargeNum: false,
      unitTop: "আজীবন",
      unitBottom: "সেবা",
      subText: "/ডিজিটাল হেলথ কার্ড",
      sparkle1: "text-amber-300",
      sparkle2: "text-sky-200",
      glowBg: "bg-sky-600/35 group-hover:bg-sky-600/55",
    },
  }[variant];

  return (
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      className={`relative flex items-center justify-center select-none group cursor-pointer ${className}`}
    >
      {/* Radiant ambient glow */}
      <div className={`absolute inset-2 ${config.glowBg} blur-2xl rounded-full pointer-events-none transition-all duration-500 animate-pulse`} />

      {/* Decorative Twinkle Sparkles */}
      <motion.div
        animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.6, 1, 0.6], rotate: [0, 45, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute ${isSm ? "-top-1 right-2 text-sm" : "-top-1.5 right-3 text-lg"} ${config.sparkle1} font-black pointer-events-none z-20 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]`}
      >
        ✦
      </motion.div>

      <motion.div
        animate={{ scale: [1.2, 0.7, 1.2], opacity: [0.5, 1, 0.5], rotate: [0, -30, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className={`absolute ${isSm ? "bottom-2 -left-1 text-xs" : "bottom-4 -left-1 text-sm"} ${config.sparkle2} font-black pointer-events-none z-20 drop-shadow-[0_0_8px_rgba(45,212,191,0.9)]`}
      >
        ✦
      </motion.div>

      {/* Rosette SVG Badge */}
      <div className={`relative ${isSm ? "w-[160px] h-[160px] sm:w-[176px] sm:h-[176px]" : "w-[235px] h-[235px] sm:w-[250px] sm:h-[250px]"} flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}>
        <svg
          viewBox="0 0 240 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_16px_36px_rgba(10,36,38,0.5)]"
        >
          <defs>
            <radialGradient id={config.radialId} cx="50%" cy="44%" r="62%">
              <stop offset="0%" stopColor={config.stop0} />
              <stop offset="42%" stopColor={config.stop42} />
              <stop offset="80%" stopColor={config.stop80} />
              <stop offset="100%" stopColor={config.stop100} />
            </radialGradient>

            <linearGradient id="rosetteGoldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fffbb5" />
              <stop offset="25%" stopColor="#ffd83d" />
              <stop offset="65%" stopColor="#ffa500" />
              <stop offset="100%" stopColor="#d97200" />
            </linearGradient>

            <linearGradient id="glossSheen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Speech bubble tail pointer extending to bottom-right towards action button */}
          <path
            d="M 166 186 Q 212 230 226 234 Q 200 205 190 169 Z"
            fill={`url(#${config.radialId})`}
            stroke={config.stroke}
            strokeWidth="5"
            strokeLinejoin="round"
          />

          {/* 16-Lobe Circular Scalloped Rosette with Crest at 12 o'clock */}
          <path
            d="M 103.22 35.65 A 16.99 16.99 0 0 1 136.78 35.65 A 16.99 16.99 0 0 1 167.78 48.49 A 16.99 16.99 0 0 1 191.51 72.22 A 16.99 16.99 0 0 1 204.35 103.22 A 16.99 16.99 0 0 1 204.35 136.78 A 16.99 16.99 0 0 1 191.51 167.78 A 16.99 16.99 0 0 1 167.78 191.51 A 16.99 16.99 0 0 1 136.78 204.35 A 16.99 16.99 0 0 1 103.22 204.35 A 16.99 16.99 0 0 1 72.22 191.51 A 16.99 16.99 0 0 1 48.49 167.78 A 16.99 16.99 0 0 1 35.65 136.78 A 16.99 16.99 0 0 1 35.65 103.22 A 16.99 16.99 0 0 1 48.49 72.22 A 16.99 16.99 0 0 1 72.22 48.49 A 16.99 16.99 0 0 1 103.22 35.65 Z"
            fill={`url(#${config.radialId})`}
            stroke={config.stroke}
            strokeWidth="5"
            strokeLinejoin="round"
          />

          {/* Top Half Glossy Specular Arch */}
          <path
            d="M 48.49 72.22 C 60 50 85 36 120 36 C 155 36 180 50 191.51 72.22 C 160 85 80 85 48.49 72.22 Z"
            fill="url(#glossSheen)"
          />

          {/* Subtle Inner Concentric Ring */}
          <circle
            cx="120"
            cy="120"
            r="80"
            fill="none"
            stroke={config.stroke}
            strokeOpacity="0.25"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
        </svg>

        {/* Content Lockup inside the Rosette Badge */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pt-1 pointer-events-none">
          {/* Top Line */}
          <span
            className={`text-white font-black ${isSm ? "text-[12.5px] sm:text-[14px]" : "text-[17px] sm:text-[18.5px]"} tracking-wide leading-tight`}
            style={{
              filter: "drop-shadow(1.5px 2px 0px #092c28) drop-shadow(0 3px 5px rgba(0,0,0,0.7))",
            }}
          >
            {config.topText}
          </span>

          {/* Center Lockup */}
          <div className="flex items-center justify-center gap-1.5 my-0.5">
            <div style={{ filter: "drop-shadow(2.5px 3.5px 0px #072421) drop-shadow(0 4px 6px rgba(0,0,0,0.6))" }}>
              <span
                className={`font-black ${
                  config.isLargeNum
                    ? (isSm ? "text-[36px] sm:text-[42px]" : "text-[52px] sm:text-[60px]")
                    : (isSm ? "text-[23px] sm:text-[26px]" : "text-[32px] sm:text-[36px]")
                } leading-none tracking-tight select-none inline-block`}
                style={{
                  background: "linear-gradient(180deg, #fffbb5 0%, #ffd83d 30%, #ffa500 70%, #d97200 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {config.mainText}
              </span>
            </div>

            {/* Stacked Units */}
            <div className="flex flex-col items-start justify-center leading-none -mt-0.5">
              <span
                className={`text-white font-extrabold ${isSm ? "text-[11px] sm:text-[12px]" : "text-[15px] sm:text-[16px]"} leading-tight`}
                style={{
                  filter: "drop-shadow(1.5px 2px 0px #092c28) drop-shadow(0 2px 4px rgba(0,0,0,0.7))",
                }}
              >
                {config.unitTop}
              </span>
              <div style={{ filter: "drop-shadow(2px 3px 0px #072421) drop-shadow(0 3px 5px rgba(0,0,0,0.6))" }}>
                <span
                  className={`font-black ${isSm ? "text-[15px] sm:text-[17px]" : "text-[22px] sm:text-[25px]"} leading-tight inline-block text-white`}
                >
                  {config.unitBottom}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Line */}
          <span
            className={`text-white font-extrabold ${isSm ? "text-[11px] sm:text-[12px]" : "text-[14px] sm:text-[15px]"} tracking-wide leading-tight opacity-95`}
            style={{
              filter: "drop-shadow(1.5px 2px 0px #092c28) drop-shadow(0 3px 5px rgba(0,0,0,0.7))",
            }}
          >
            {config.subText}
          </span>
        </div>
      </div>
    </motion.div>
  );
};


/* ========================================================================= */
/* SLIDE METADATA (Titles, Bengali Numerals, Accents & Atmospheric Auras)    */
/* ========================================================================= */
interface SlideMeta {
  idx: PageIndex;
  bengaliNum: string;
  shortTitle: string;
  title: string;
  accent: string;
  glow: string;
}

const SLIDES_META: SlideMeta[] = [
  {
    idx: 0,
    bengaliNum: "০১",
    shortTitle: "কভার",
    title: "ডিজিটাল হেলথকেয়ার সমন্বিত প্ল্যাটফর্ম",
    accent: "#2ea394",
    glow: "rgba(46, 163, 148, 0.35)",
  },
  {
    idx: 1,
    bengaliNum: "০২",
    shortTitle: "সার্ভিস",
    title: "স্বাস্থ্যসেবা ইকোসিস্টেমের ৫টি স্তম্ভ",
    accent: "#2cb8a7",
    glow: "rgba(44, 184, 167, 0.3)",
  },
  {
    idx: 2,
    bengaliNum: "০৩",
    shortTitle: "ডাক্তার",
    title: "স্মার্ট চেম্বার ও ই-প্রেসক্রিপশন",
    accent: "#2cb8a7",
    glow: "rgba(44, 184, 167, 0.35)",
  },
  {
    idx: 3,
    bengaliNum: "০৪",
    shortTitle: "হাসপাতাল",
    title: "হসপিটাল ও ক্লিনিক ERP সলিউশন",
    accent: "#1b3861",
    glow: "rgba(27, 56, 97, 0.35)",
  },
  {
    idx: 4,
    bengaliNum: "০৫",
    shortTitle: "ল্যাব",
    title: "স্মার্ট প্যাথলজি ও LIMS অটোমেশন",
    accent: "#229f90",
    glow: "rgba(34, 159, 144, 0.35)",
  },
  {
    idx: 5,
    bengaliNum: "০৬",
    shortTitle: "ফার্মেসি",
    title: "ফার্মেসি POS ও স্মার্ট ইনভেন্টরি",
    accent: "#1b7e94",
    glow: "rgba(27, 126, 148, 0.35)",
  },
  {
    idx: 6,
    bengaliNum: "০৭",
    shortTitle: "রোগী",
    title: "রোগী পোর্টাল ও পার্সোনাল হেলথ কেয়ার",
    accent: "#0284c7",
    glow: "rgba(2, 132, 199, 0.35)",
  },
  {
    idx: 7,
    bengaliNum: "০৮",
    shortTitle: "যোগাযোগ",
    title: "ওয়েবসাইট ভিজিট ও কন্ট্যাক্ট ডিরেক্টরি",
    accent: "#56a798",
    glow: "rgba(86, 167, 152, 0.35)",
  },
];

/* ========================================================================= */
/* PAGE 1 CONTENT: COVER / FINEST MEDICAL SERVICES                           */
/* ========================================================================= */
const Page1Cover = ({ onExplore }: { onExplore?: () => void }) => {
  return (
    <div className="w-full h-full bg-[#f5f4ef] text-slate-900 flex flex-col justify-between overflow-hidden relative select-none">
      {/* Top-Right Curved Brand Waves with subtle ambient breathing */}
      <div className="absolute top-0 right-0 w-full h-[180px] pointer-events-none overflow-hidden z-10">
        <svg
          viewBox="0 0 400 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover object-right-top transition-transform duration-700 hover:scale-[1.02]"
          preserveAspectRatio="none"
        >
          {/* Outer Seafoam Accent Wave */}
          <path
            d="M 50 0 C 120 18, 220 65, 400 175 L 400 0 Z"
            fill="#58b2a5"
            fillOpacity="0.85"
          />
          {/* Inner Deep Navy Brand Wave */}
          <path
            d="M 80 0 C 145 12, 230 55, 400 135 L 400 0 Z"
            fill="#1a3862"
          />
        </svg>

        {/* HealthFlow Brand Logo Mark with interactive hover scale */}
        <div className="absolute top-4 sm:top-5 right-5 sm:right-6 pointer-events-auto">
          <img
            src={BRAND_INFO.logoMark}
            alt={`${BRAND_INFO.name} logo`}
            style={{ height: "42px", width: "auto" }}
            className="brightness-0 invert drop-shadow-sm shrink-0 object-contain hover:scale-105 active:scale-95 transition-transform duration-300 cursor-pointer"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-36 sm:pt-40 px-6 sm:px-7 relative z-10">
        {/* Headings */}
        <div className="space-y-1.5">
          <h2 className="text-[42px] sm:text-[48px] font-black tracking-tight text-[#2ea394] leading-[1.02] font-display">
            HealthFlow,
          </h2>
          <h1 className="text-[18.5px] sm:text-[21px] font-extrabold tracking-tight text-[#16365f] leading-snug font-display mt-1">
            বাংলাদেশের প্রথম সমন্বিত স্বাস্থ্য পরিষেবা।
          </h1>
        </div>

        {/* Complete Original Sentence in Exactly 2 Lines */}
        <p className="text-[10.5px] sm:text-[11.5px] text-[#24466b] font-medium leading-[1.65] mt-3.5 tracking-tight">
          <span className="block whitespace-nowrap">রোগী, ডাক্তার, হাসপাতাল এবং স্বাস্থ্যসেবা সেবাদানকারীদের এক প্ল্যাটফর্মে</span>
          <span className="block whitespace-nowrap">একত্রিত করার মাধ্যমে, স্বাস্থ্যসেবা এখন আরও সহজ, দ্রুত ও নির্ভরযোগ্য।</span>
        </p>
      </div>

      {/* Stethoscope Doctor Image Section with interactive micro-zoom and light sheen */}
      <div 
        className="group relative mt-auto w-full flex-1 flex flex-col justify-end overflow-hidden cursor-pointer" 
        onClick={onExplore}
        title="পরবর্তী পেজ দেখতে ক্লিক করুন"
      >
        <div className="relative w-full h-[370px] sm:h-[410px] overflow-hidden">
          <img
            src="/assets/brochure-stethoscope-cover.jpg"
            alt="Doctor holding stethoscope"
            className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-1000 ease-out"
            loading="eager"
          />
          {/* Soft top gradient blend into image */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#f5f4ef] via-[#f5f4ef]/65 to-transparent pointer-events-none" />

          {/* Interactive Light Sheen sweep on hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        </div>


        {/* Bottom Right Decorative Floating Teal Cross */}
        <motion.div
          animate={{ y: [0, -5, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-6 right-6 z-20 pointer-events-none"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#58b2a5" className="drop-shadow-sm">
            <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* PAGE 2 CONTENT: "WE CARE FOR YOUR HEALTH" (5 Service Pillars & Arch)      */
/* ========================================================================= */
const Page2Services = ({
  onSelectDoctors,
  onSelectHospital,
  onSelectPathology,
  onSelectPharmacy,
  onSelectPatient,
}: {
  onSelectDoctors: () => void;
  onSelectHospital: () => void;
  onSelectPathology: () => void;
  onSelectPharmacy: () => void;
  onSelectPatient: () => void;
}) => {
  return (
    <div className="w-full h-full bg-white text-slate-900 flex flex-col pt-5 sm:pt-6 pb-0 px-5 sm:px-6 overflow-hidden relative justify-between select-none">
      {/* Subtle Ambient Corner Light with gentle breathing */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-[#2cb8a7]/15 to-transparent pointer-events-none animate-pulse" />

      {/* 1. TOP HEADER: "We care for your health" & 11-Dot Pattern */}
      <div className="flex items-start justify-between relative z-10 mb-3 sm:mb-4">
        <div className="space-y-0.5">
          <h2 className="text-[25px] sm:text-[28px] font-extrabold tracking-tight text-[#2cb8a7] leading-[1.08]">
            We care for
          </h2>
          <h1 className="text-[30px] sm:text-[35px] font-black text-[#0d1b3e] tracking-tight leading-[1.04]">
            your health
          </h1>
        </div>

        {/* Decorative Teal Dots Cluster with gentle breathing shimmer */}
        <motion.div 
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="pt-1.5 pl-2 shrink-0"
        >
          <svg width="60" height="60" viewBox="0 0 70 70" fill="none" className="text-[#2cb8a7]">
            <circle cx="58" cy="12" r="3.2" fill="currentColor" />
            <circle cx="45" cy="18" r="3.2" fill="currentColor" />
            <circle cx="58" cy="24" r="3.2" fill="currentColor" />
            <circle cx="32" cy="24" r="3.2" fill="currentColor" />
            <circle cx="45" cy="30" r="3.2" fill="currentColor" />
            <circle cx="58" cy="36" r="3.2" fill="currentColor" />
            <circle cx="32" cy="36" r="3.2" fill="currentColor" />
            <circle cx="45" cy="42" r="3.2" fill="currentColor" />
            <circle cx="58" cy="48" r="3.2" fill="currentColor" />
            <circle cx="32" cy="48" r="3.2" fill="currentColor" />
            <circle cx="45" cy="54" r="3.2" fill="currentColor" />
          </svg>
        </motion.div>
      </div>

      {/* 2. THE 5 CENTRAL 3D GRADIENT CARDS (2x2 + 1 Full Width for Patients) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 relative z-10 mb-2">
        {/* Card 1: For Doctors (Direct link to Slide 3) */}
        <button
          type="button"
          onClick={onSelectDoctors}
          className="group relative overflow-hidden rounded-[20px] p-3 sm:p-3.5 flex flex-col items-center justify-center text-center aspect-[1/0.88] transition-all duration-300 text-white cursor-pointer hover:scale-[1.03] hover:shadow-[0_18px_32px_-6px_rgba(37,85,94,0.55)] focus:outline-hidden"
          style={{
            background: "linear-gradient(145deg, #427c88 0%, #25555e 100%)",
            boxShadow: "0 10px 22px -4px rgba(37,85,94,0.48)",
          }}
        >

          {/* Shimmer light sweep on hover */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 pointer-events-none" />

          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-[20px] pointer-events-none" />
          <div className="w-9 h-9 sm:w-10 sm:h-10 mb-1 flex items-center justify-center relative z-10">
            <Stethoscope className="w-8 h-8 sm:w-9 sm:h-9 text-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 drop-shadow-xs stroke-[1.9]" />
          </div>
          <span className="font-extrabold text-white text-[12px] sm:text-[13px] tracking-wide leading-tight relative z-10">
            For Doctors
          </span>
        </button>

        {/* Card 2: For Hospitals/Clinics/Diagnostic Centers */}
        <button
          type="button"
          onClick={onSelectHospital}
          className="group relative overflow-hidden rounded-[20px] p-3 sm:p-3.5 flex flex-col items-center justify-center text-center aspect-[1/0.88] transition-all duration-300 text-white cursor-pointer hover:scale-[1.03] hover:shadow-[0_18px_32px_-6px_rgba(12,24,50,0.65)] focus:outline-hidden"
          style={{
            background: "linear-gradient(145deg, #1b3861 0%, #0c1832 100%)",
            boxShadow: "0 10px 22px -4px rgba(12,24,50,0.52)",
          }}
        >
          {/* Shimmer light sweep on hover */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 pointer-events-none" />

          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-[20px] pointer-events-none" />
          <div className="w-9 h-9 sm:w-10 sm:h-10 mb-1 flex items-center justify-center relative z-10">
            <Hospital className="w-8 h-8 sm:w-9 sm:h-9 text-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 drop-shadow-xs stroke-[1.9]" />
          </div>
          <span className="font-extrabold text-white text-[10.5px] sm:text-[11.5px] tracking-tight leading-[1.18] relative z-10">
            For Hospitals/<br />Clinics/Centers
          </span>
        </button>

        {/* Card 3: For Pathology Labs */}
        <button
          type="button"
          onClick={onSelectPathology}
          className="group relative overflow-hidden rounded-[20px] p-3 sm:p-3.5 flex flex-col items-center justify-center text-center aspect-[1/0.88] transition-all duration-300 text-white cursor-pointer hover:scale-[1.03] hover:shadow-[0_18px_32px_-6px_rgba(34,159,144,0.55)] focus:outline-hidden"
          style={{
            background: "linear-gradient(145deg, #51cfbe 0%, #229f90 100%)",
            boxShadow: "0 10px 22px -4px rgba(34,159,144,0.48)",
          }}
        >
          {/* Shimmer light sweep on hover */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 pointer-events-none" />

          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-[20px] pointer-events-none" />
          <div className="w-9 h-9 sm:w-10 sm:h-10 mb-1 flex items-center justify-center relative z-10">
            <Microscope className="w-8 h-8 sm:w-9 sm:h-9 text-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 drop-shadow-xs stroke-[1.9]" />
          </div>
          <span className="font-extrabold text-white text-[11.5px] sm:text-xs tracking-wide leading-tight relative z-10">
            For Pathology<br />Labs
          </span>
        </button>

        {/* Card 4: For Pharmacy */}
        <button
          type="button"
          onClick={onSelectPharmacy}
          className="group relative overflow-hidden rounded-[20px] p-3 sm:p-3.5 flex flex-col items-center justify-center text-center aspect-[1/0.88] transition-all duration-300 text-white cursor-pointer hover:scale-[1.03] hover:shadow-[0_18px_32px_-6px_rgba(27,126,148,0.55)] focus:outline-hidden"
          style={{
            background: "linear-gradient(145deg, #4bdcb4 0%, #1b7e94 100%)",
            boxShadow: "0 10px 22px -4px rgba(27,126,148,0.48)",
          }}
        >
          {/* Shimmer light sweep on hover */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 pointer-events-none" />

          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-[20px] pointer-events-none" />
          <div className="w-9 h-9 sm:w-10 sm:h-10 mb-1 flex items-center justify-center relative z-10">
            <Pill className="w-8 h-8 sm:w-9 sm:h-9 text-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 drop-shadow-xs stroke-[1.9]" />
          </div>
          <span className="font-extrabold text-white text-[12px] sm:text-[13px] tracking-wide leading-tight relative z-10">
            For<br />Pharmacy
          </span>
        </button>

        {/* Card 5: For Patients (Wide Banner Card across 2 columns) */}
        <button
          type="button"
          onClick={onSelectPatient}
          className="col-span-2 group relative overflow-hidden rounded-[20px] px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between transition-all duration-300 text-white cursor-pointer hover:scale-[1.02] hover:shadow-[0_18px_32px_-6px_rgba(2,132,199,0.55)] focus:outline-hidden"
          style={{
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 60%, #075985 100%)",
            boxShadow: "0 10px 24px -4px rgba(2,132,199,0.45)",
          }}
        >
          {/* Shimmer light sweep on hover */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 pointer-events-none" />

          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-[20px] pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10 text-left">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 drop-shadow-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66" />
                <circle cx="18" cy="15" r="2" />
                <path d="m15 18-2 2-1-1" />
              </svg>
            </div>
            <span className="font-extrabold text-white text-[13px] sm:text-[14px] tracking-wide leading-tight">
              For Patients
            </span>
          </div>


        </button>
      </div>

      {/* 3. BOTTOM ARCH: DOCTOR WITH TABLET & CONCENTRIC TURQUOISE RINGS */}
      <div className="relative mt-auto w-full flex justify-center items-end pt-1 overflow-hidden -mx-5 sm:-mx-6 px-5 sm:px-6">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-16 w-80 h-80 sm:w-96 sm:h-96 rounded-full border-[3px] border-[#2cb8a7]/30 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.04, 1], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute -bottom-12 w-72 h-72 sm:w-84 sm:h-84 rounded-full border-[5px] border-[#2cb8a7]/50 pointer-events-none"
        />

        <div 
          className="group relative w-64 sm:w-72 h-36 sm:h-44 rounded-t-full rounded-b-none overflow-hidden z-10 flex items-center justify-center cursor-pointer"
          style={{
            padding: "8px 8px 0 8px",
            background: "linear-gradient(to bottom, #2cb8a7, #249587)",
            boxShadow: "0 -8px 24px rgba(44,184,167,0.35)",
          }}
        >
          <div className="w-full h-full rounded-t-full rounded-b-none overflow-hidden bg-white border-[3px] border-white relative">
            <img
              src="/assets/brochure-doctor-care.jpg"
              alt="Doctor holding digital health tablet and stethoscope"
              className="w-full h-full object-cover object-center transform group-hover:scale-108 transition-transform duration-700 ease-out"
              loading="eager"
            />
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/20 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* DOCTOR PANEL 6 KEY FEATURES (Including Chamber Management & Dr Community) */
/* ========================================================================= */
const DOCTOR_FEATURES = [
  {
    icon: FileText,
    iconBg: "bg-[#2cb8a7]/15 text-[#1b7e94]",
    title: "স্মার্ট ই-প্রেসক্রিপশন",
    desc: "ওষুধের নাম টাইপ করলেই অটো ড্রপডাউন। ডোজ ও সেবনবিধিসহ ৩০ সেকেন্ডে নির্ভুল প্রেসক্রিপশন।",
  },
  {
    icon: Users,
    iconBg: "bg-[#1b3861]/15 text-[#1b3861]",
    title: "লাইভ চেম্বার কিউ",
    desc: "সহকারী দ্বারা সিরিয়াল এন্ট্রি, টিভি ডিসপ্লে ও স্ক্রিন থেকে সরাসরি রোগী ডাকার ব্যবস্থা।",
  },
  {
    icon: Building2,
    iconBg: "bg-amber-500/15 text-amber-700",
    title: "চেম্বার ম্যানেজমেন্ট",
    desc: "একাধিক চেম্বারের সময়সূচী, ফি কালেকশন, সহকারী পারমিশন ও আয়-ব্যয়ের স্বচ্ছ হিসাব।",
  },
  {
    icon: Activity,
    iconBg: "bg-[#4bdcb4]/20 text-[#148375]",
    title: "রোগীর মেডিকেল EMR",
    desc: "অতীতের সব প্রেসক্রিপশন, ল্যাব টেস্ট রিপোর্ট ও ভাইটালস হিস্ট্রি এক স্ক্রিনে সংরক্ষিত।",
  },
  {
    icon: Video,
    iconBg: "bg-[#25555e]/15 text-[#25555e]",
    title: "টেলিমেডিসিন ও বুকিং",
    desc: "অনলাইনে রোগীর অ্যাপয়েন্টমেন্ট বুকিং এবং সুরক্ষিত এইচডি ভিডিও কলে পরামর্শ প্রদান।",
  },
  {
    icon: HeartHandshake,
    iconBg: "bg-indigo-500/15 text-indigo-700",
    title: "ডাক্তার কমিউনিটি",
    desc: "ভেরিফায়েড চিকিৎসকদের নেটওয়ার্ক, জটিল কেস রেফারেল ও পেশাগত আলোচনা ফোরাম।",
  },
];

/* ========================================================================= */
/* HOSPITAL & CLINIC ERP 6 KEY FEATURES                                      */
/* ========================================================================= */
const HOSPITAL_FEATURES = [
  {
    icon: BedDouble,
    iconBg: "bg-blue-600/15 text-blue-700",
    title: "আইপিডি ও বেড ট্র্যাকিং",
    desc: "রিয়েল-টাইম বেড অকুপেন্সি, রোগী ভর্তি, ওয়ার্ড ট্রান্সফার ও ডিসচার্জ সামারি।",
  },
  {
    icon: Receipt,
    iconBg: "bg-emerald-600/15 text-emerald-700",
    title: "মাল্টি-কাউন্টার বিলিং",
    desc: "ক্যাশিয়ার বিলিং, অগ্রিম ডিপোজিট, কর্পোরেট ডিসকাউন্ট ও বকেয়া আদায় হিসাব।",
  },
  {
    icon: Activity,
    iconBg: "bg-rose-600/15 text-rose-700",
    title: "আইসিইউ ও ওটি শিডিউলিং",
    desc: "অপারেশন থিয়েটার শিডিউল, সার্জন ও অ্যানেস্থেশিয়া টিম এবং ক্রিটিক্যাল কেয়ার লগ।",
  },
  {
    icon: Stethoscope,
    iconBg: "bg-[#2cb8a7]/20 text-[#148375]",
    title: "নার্সিং স্টেশন ও ভাইটালস",
    desc: "ডিজিটাল ট্রিটমেন্ট শিট, মেডিসিন চার্ট ও নিয়মিত ভাইটালস রেকর্ড সিস্টেম।",
  },
  {
    icon: Users,
    iconBg: "bg-indigo-600/15 text-indigo-700",
    title: "এইচআর ম্যানেজমেন্ট সিস্টেম",
    desc: "বায়োমেট্রিক হাজিরা, ছুটি অনুমোদন, ডিউটি রোস্টার ও স্বয়ংক্রিয় পেরোল ব্যবস্থাপনা।",
  },
  {
    icon: Calculator,
    iconBg: "bg-amber-600/15 text-amber-700",
    title: "অ্যাকাউন্টিং ম্যানেজমেন্ট",
    desc: "দৈনিক আয়-ব্যয় লেজার, ব্যাংক রিকনসিলিয়েশন, লাভ-ক্ষতি হিসাব ও ব্যালেন্স শিট রিপোর্ট।",
  },
];

/* ========================================================================= */
/* PATHOLOGY & DIAGNOSTIC LAB 6 KEY FEATURES                                 */
/* ========================================================================= */
const PATHOLOGY_FEATURES = [
  {
    icon: QrCode,
    iconBg: "bg-[#229f90]/15 text-[#148375]",
    title: "বারকোড স্যাম্পল ট্র্যাকিং",
    desc: "স্বয়ংক্রিয় বারকোড স্টিকার প্রিন্ট, স্যাম্পল টেস্ট টিউব ট্র্যাকিং ও অ্যাক্সেশন।",
  },
  {
    icon: Cpu,
    iconBg: "bg-cyan-600/15 text-cyan-700",
    title: "মেশিন ইন্টারফেসিং (LIMS)",
    desc: "বায়োকেমিস্ট্রি ও হেমাটোলজি অ্যানালাইজার মেশিন থেকে সরাসরি অটো ডাটা সিঙ্ক।",
  },
  {
    icon: FileCheck2,
    iconBg: "bg-emerald-600/15 text-emerald-700",
    title: "প্যাথলজিস্ট ডিজিটাল সাইন",
    desc: "চিকিৎসক ও প্যাথলজিস্টের ডিজিটাল সিগনেচারসহ নির্ভুল মাল্টি-লেভেল অ্যাপ্রুভাল।",
  },
  {
    icon: Smartphone,
    iconBg: "bg-blue-600/15 text-blue-700",
    title: "এসএমএস ও অনলাইন রিপোর্ট",
    desc: "রিপোর্ট প্রস্তুত হতেই রোগীর মোবাইলে এসএমএস ও সিকিউর ডাউনলোড লিংক প্রেরণ।",
  },
  {
    icon: Package,
    iconBg: "bg-amber-600/15 text-amber-700",
    title: "রিএজেন্ট ও ইনভেন্টরি স্টক",
    desc: "ল্যাব কেমিক্যাল ও কিট খরচ ট্র্যাকিং, এক্সপায়ারি এলার্ট ও রি-অর্ডার ওয়ার্নিং।",
  },
  {
    icon: TrendingUp,
    iconBg: "bg-purple-600/15 text-purple-700",
    title: "ডাক্তার রেফারেল লেজার",
    desc: "রেফারেল চিকিৎসকদের অটোমেটেড কমিশন হিসাব, ভাউচার ও স্বচ্ছ রিপোর্ট।",
  },
];

/* ========================================================================= */
/* PHARMACY POS & INVENTORY 6 KEY FEATURES                                   */
/* ========================================================================= */
const PHARMACY_FEATURES = [
  {
    icon: ShoppingBag,
    iconBg: "bg-[#1b7e94]/15 text-[#1b7e94]",
    title: "সুপারফাস্ট বারকোড POS",
    desc: "দ্রুত বারকোড স্ক্যানিং, পিস/পাতা/বক্স অটো হিসাব এবং নিমেষেই ক্যাশ মেমো।",
  },
  {
    icon: AlertTriangle,
    iconBg: "bg-rose-500/15 text-rose-600",
    title: "এক্সপায়ারি ও লো-স্টক এলার্ট",
    desc: "মেয়াদোত্তীর্ণ হওয়ার আগেই সতর্কতা এবং স্টক কমে গেলে অটো রি-অর্ডার নোটিফিকেশন।",
  },
  {
    icon: Pill,
    iconBg: "bg-emerald-600/15 text-emerald-700",
    title: "ডিজিটাল ড্রাগ ডাটাবেজ",
    desc: "বাংলাদেশের সব ব্র্যান্ডের ওষুধ ও জেনেরিক ডাটাবেজ, ডোজ ও বিকল্প সাজেশন।",
  },
  {
    icon: CircleDollarSign,
    iconBg: "bg-amber-600/15 text-amber-700",
    title: "ক্যাশ ড্রয়ার ও ডেইলি শিফট",
    desc: "প্রতি শিফটের ক্যাশ ড্রয়ার হিসাব, দৈনিক মোট বিক্রি ও নিখুঁত লাভ-ক্ষতি রিপোর্ট।",
  },
  {
    icon: Truck,
    iconBg: "bg-indigo-600/15 text-indigo-700",
    title: "পারচেজ ও সাপ্লায়ার লেজার",
    desc: "সাপ্লায়ার বিল, ইনভয়েস পেমেন্ট, বাকি হিসাব এবং ড্যামেজ মেডিসিন রিটার্ন রেকর্ড।",
  },
  {
    icon: Sparkles,
    iconBg: "bg-[#2cb8a7]/20 text-[#148375]",
    title: "ই-প্রেসক্রিপশন ডিরেক্ট ডিসপেন্স",
    desc: "চিকিৎসকের কিউআর প্রেসক্রিপশন স্ক্যান করে এক ক্লিকে সঠিক ওষুধ ডেলিভারি।",
  },
];

/* ========================================================================= */
/* PAGE 3 CONTENT: "DOCTOR PANEL FEATURES & 10 TK/PRESCRIPTION CTA"          */
/* ========================================================================= */
const Page3DoctorPanel = () => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#fbfcfa] to-[#f3f7f5] text-slate-900 flex flex-col pt-4 sm:pt-5 pb-3.5 sm:pb-4 px-4 sm:px-5 overflow-hidden relative justify-between select-none">
      {/* Subtle Ambient Corner Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#2cb8a7]/15 to-transparent pointer-events-none animate-pulse" />

      {/* Top Header Bar */}
      <div className="relative z-10 shrink-0 pt-1">
        <div className="space-y-0.5">
          <h2 className="text-[19px] sm:text-[21px] font-black text-[#0d1b3e] tracking-tight leading-tight">
            ডিজিটাল চেম্বার ও প্র্যাকটিস ম্যানেজমেন্ট
          </h2>
          <p className="text-[10.5px] sm:text-[11px] text-[#2c5077] font-medium leading-relaxed">
            রোগী দেখা, প্রেসক্রিপশন, চেম্বার ও নেটওয়ার্ক—সবকিছু এক প্ল্যাটফর্মে
          </p>
        </div>
      </div>

      {/* 6 Feature Cards (3x2 Grid) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 my-auto relative z-10">
        {DOCTOR_FEATURES.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="group/feat relative overflow-hidden rounded-2xl p-2.5 sm:p-3 bg-white/95 hover:bg-white border border-slate-200/80 shadow-xs hover:border-[#2cb8a7]/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="absolute inset-0 -translate-x-full group-hover/feat:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 pointer-events-none" />
              <div>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${feat.iconBg} flex items-center justify-center mb-1.5 transition-transform duration-300 group-hover/feat:scale-110 group-hover/feat:rotate-3 shadow-xs`}>
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.4]" />
                </div>
                <h4 className="text-[11.5px] sm:text-[12.5px] font-extrabold text-[#0d1b3e] leading-snug">
                  {feat.title}
                </h4>
                <p className="text-[9.2px] sm:text-[9.8px] text-slate-600 font-medium leading-[1.38] mt-0.5 line-clamp-2">
                  {feat.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* The Scallop Rosette Pricing Badge & Action Section */}
      <div className="relative z-10 mt-auto flex flex-col items-center pt-0.5 shrink-0">
        <ScallopPricingBadge size="sm" variant="doctor" className="mb-1" />

        {/* Primary CTA Button */}
        <Link
          href="/portal/login"
          className="group/btn relative overflow-hidden w-full py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2cb8a7] via-[#24a999] to-[#1c8477] hover:from-[#35cfbc] hover:to-[#229f90] text-white font-black text-[12.5px] sm:text-[13.5px] shadow-[0_8px_20px_rgba(44,184,167,0.38)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 pointer-events-none" />
          <span className="relative z-10">ডাক্তার হিসেবে যুক্ত হোন</span>
          <ArrowRight className="h-4 w-4 relative z-10 transition-transform duration-200 group-hover/btn:translate-x-1.5" />
        </Link>

        {/* Trust Guarantees */}
        <div className="flex items-center justify-between w-full px-0.5 text-[9.5px] sm:text-[10px] font-black text-[#082f29] mt-2 tracking-tight whitespace-nowrap">
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#059669] transition-colors shrink-0">
            <span className="text-[#059669] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">কোনো মাসিক ফি নেই</span>
          </span>
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#059669] transition-colors shrink-0">
            <span className="text-[#059669] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">যত প্রেসক্রিপশন তত খরচ</span>
          </span>
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#059669] transition-colors shrink-0">
            <span className="text-[#059669] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">ফ্রি ট্রায়াল</span>
          </span>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* PAGE 4 CONTENT: "HOSPITAL & CLINIC ERP SOLUTION"                          */
/* ========================================================================= */
const Page4HospitalPanel = () => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#f8fafc] to-[#eef4fb] text-slate-900 flex flex-col pt-4 sm:pt-5 pb-3.5 sm:pb-4 px-4 sm:px-5 overflow-hidden relative justify-between select-none">
      {/* Subtle Ambient Corner Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-600/15 to-transparent pointer-events-none animate-pulse" />

      {/* Top Header Bar */}
      <div className="relative z-10 shrink-0 pt-1">
        <div className="space-y-0.5">
          <h2 className="text-[19px] sm:text-[21px] font-black text-[#0d1b3e] tracking-tight leading-tight">
            হসপিটাল ও ক্লিনিক ERP সলিউশন
          </h2>
          <p className="text-[10.5px] sm:text-[11px] text-[#2c5077] font-medium leading-relaxed">
            আইপিডি, ওপিডি, আইসিইউ, বিলিং ও অপারেশন—সম্পূর্ণ অটোমেশন
          </p>
        </div>
      </div>

      {/* 6 Feature Cards (3x2 Grid) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 my-auto relative z-10">
        {HOSPITAL_FEATURES.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="group/feat relative overflow-hidden rounded-2xl p-2.5 sm:p-3 bg-white/95 hover:bg-white border border-slate-200/80 shadow-xs hover:border-blue-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="absolute inset-0 -translate-x-full group-hover/feat:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 pointer-events-none" />
              <div>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${feat.iconBg} flex items-center justify-center mb-1.5 transition-transform duration-300 group-hover/feat:scale-110 group-hover/feat:rotate-3 shadow-xs`}>
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.4]" />
                </div>
                <h4 className="text-[11.5px] sm:text-[12.5px] font-extrabold text-[#0d1b3e] leading-snug">
                  {feat.title}
                </h4>
                <p className="text-[9.2px] sm:text-[9.8px] text-slate-600 font-medium leading-[1.38] mt-0.5 line-clamp-2">
                  {feat.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* The Scallop Rosette Pricing Badge & Action Section */}
      <div className="relative z-10 mt-auto flex flex-col items-center pt-0.5 shrink-0">
        <ScallopPricingBadge size="sm" variant="hospital" className="mb-1" />

        {/* Primary CTA Button */}
        <Link
          href="/contact"
          className="group/btn relative overflow-hidden w-full py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#1b3861] via-[#1e457c] to-[#0c1832] hover:from-[#254b80] hover:to-[#122347] text-white font-black text-[12.5px] sm:text-[13.5px] shadow-[0_8px_20px_rgba(27,56,97,0.38)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 pointer-events-none" />
          <span className="relative z-10">হসপিটাল ডেমো রিকোয়েস্ট করুন</span>
          <ArrowRight className="h-4 w-4 relative z-10 transition-transform duration-200 group-hover/btn:translate-x-1.5" />
        </Link>

        {/* Trust Guarantees */}
        <div className="flex items-center justify-between w-full px-0.5 text-[9.5px] sm:text-[10px] font-black text-[#0f2442] mt-2 tracking-tight whitespace-nowrap">
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#2563eb] transition-colors shrink-0">
            <span className="text-[#2563eb] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">কোনো সেটআপ ফি নেই</span>
          </span>
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#2563eb] transition-colors shrink-0">
            <span className="text-[#2563eb] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">অন-সাইট ট্রেইনিং</span>
          </span>
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#2563eb] transition-colors shrink-0">
            <span className="text-[#2563eb] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">২৪/৭ সাপোর্ট</span>
          </span>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* PAGE 5 CONTENT: "PATHOLOGY & DIAGNOSTIC LAB AUTOMATION (LIMS)"            */
/* ========================================================================= */
const Page5PathologyPanel = () => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#f6fcfb] to-[#edf7f5] text-slate-900 flex flex-col pt-4 sm:pt-5 pb-3.5 sm:pb-4 px-4 sm:px-5 overflow-hidden relative justify-between select-none">
      {/* Subtle Ambient Corner Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#229f90]/15 to-transparent pointer-events-none animate-pulse" />

      {/* Top Header Bar */}
      <div className="relative z-10 shrink-0 pt-1">
        <div className="space-y-0.5">
          <h2 className="text-[19px] sm:text-[21px] font-black text-[#0d1b3e] tracking-tight leading-tight">
            স্মার্ট প্যাথলজি ও ল্যাব অটোমেশন
          </h2>
          <p className="text-[10.5px] sm:text-[11px] text-[#1b6b61] font-medium leading-relaxed">
            বারকোড স্যাম্পল কালেকশন, অ্যানালাইজার ইন্টারফেসিং ও দ্রুত রিপোর্ট
          </p>
        </div>
      </div>

      {/* 6 Feature Cards (3x2 Grid) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 my-auto relative z-10">
        {PATHOLOGY_FEATURES.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="group/feat relative overflow-hidden rounded-2xl p-2.5 sm:p-3 bg-white/95 hover:bg-white border border-slate-200/80 shadow-xs hover:border-[#229f90]/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="absolute inset-0 -translate-x-full group-hover/feat:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 pointer-events-none" />
              <div>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${feat.iconBg} flex items-center justify-center mb-1.5 transition-transform duration-300 group-hover/feat:scale-110 group-hover/feat:rotate-3 shadow-xs`}>
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.4]" />
                </div>
                <h4 className="text-[11.5px] sm:text-[12.5px] font-extrabold text-[#0d1b3e] leading-snug">
                  {feat.title}
                </h4>
                <p className="text-[9.2px] sm:text-[9.8px] text-slate-600 font-medium leading-[1.38] mt-0.5 line-clamp-2">
                  {feat.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* The Scallop Rosette Pricing Badge & Action Section */}
      <div className="relative z-10 mt-auto flex flex-col items-center pt-0.5 shrink-0">
        <ScallopPricingBadge size="sm" variant="pathology" className="mb-1" />

        {/* Primary CTA Button */}
        <Link
          href="/contact"
          className="group/btn relative overflow-hidden w-full py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#229f90] via-[#1ba091] to-[#127064] hover:from-[#2bbba9] hover:to-[#178577] text-white font-black text-[12.5px] sm:text-[13.5px] shadow-[0_8px_20px_rgba(34,159,144,0.38)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 pointer-events-none" />
          <span className="relative z-10">ল্যাব ডেমো বুক করুন</span>
          <ArrowRight className="h-4 w-4 relative z-10 transition-transform duration-200 group-hover/btn:translate-x-1.5" />
        </Link>

        {/* Trust Guarantees */}
        <div className="flex items-center justify-between w-full px-0.5 text-[9.5px] sm:text-[10px] font-black text-[#0c3933] mt-2 tracking-tight whitespace-nowrap">
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#10b981] transition-colors shrink-0">
            <span className="text-[#10b981] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">কোনো সার্ভার খরচ নেই</span>
          </span>
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#10b981] transition-colors shrink-0">
            <span className="text-[#10b981] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">অটো SMS লিংক</span>
          </span>
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#10b981] transition-colors shrink-0">
            <span className="text-[#10b981] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">আনলিমিটেড রিপোর্ট</span>
          </span>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* PAGE 6 CONTENT: "PHARMACY POS & SMART INVENTORY"                          */
/* ========================================================================= */
const Page6PharmacyPanel = () => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#f7fcfa] to-[#eef8f5] text-slate-900 flex flex-col pt-4 sm:pt-5 pb-3.5 sm:pb-4 px-4 sm:px-5 overflow-hidden relative justify-between select-none">
      {/* Subtle Ambient Corner Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#1b7e94]/15 to-transparent pointer-events-none animate-pulse" />

      {/* Top Header Bar */}
      <div className="relative z-10 shrink-0 pt-1">
        <div className="space-y-0.5">
          <h2 className="text-[19px] sm:text-[21px] font-black text-[#0d1b3e] tracking-tight leading-tight">
            আধুনিক ফার্মেসি POS ও ইনভেন্টরি
          </h2>
          <p className="text-[10.5px] sm:text-[11px] text-[#1b6475] font-medium leading-relaxed">
            বারকোড স্ক্যানিং, মেয়াদোত্তীর্ণ সতর্কতা ও লাভ-ক্ষতির রিয়েল-টাইম হিসাব
          </p>
        </div>
      </div>

      {/* 6 Feature Cards (3x2 Grid) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 my-auto relative z-10">
        {PHARMACY_FEATURES.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="group/feat relative overflow-hidden rounded-2xl p-2.5 sm:p-3 bg-white/95 hover:bg-white border border-slate-200/80 shadow-xs hover:border-[#1b7e94]/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="absolute inset-0 -translate-x-full group-hover/feat:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 pointer-events-none" />
              <div>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${feat.iconBg} flex items-center justify-center mb-1.5 transition-transform duration-300 group-hover/feat:scale-110 group-hover/feat:rotate-3 shadow-xs`}>
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.4]" />
                </div>
                <h4 className="text-[11.5px] sm:text-[12.5px] font-extrabold text-[#0d1b3e] leading-snug">
                  {feat.title}
                </h4>
                <p className="text-[9.2px] sm:text-[9.8px] text-slate-600 font-medium leading-[1.38] mt-0.5 line-clamp-2">
                  {feat.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* The Scallop Rosette Pricing Badge & Action Section */}
      <div className="relative z-10 mt-auto flex flex-col items-center pt-0.5 shrink-0">
        <ScallopPricingBadge size="sm" variant="pharmacy" className="mb-1" />

        {/* Primary CTA Button */}
        <Link
          href="/pharmacy/login"
          className="group/btn relative overflow-hidden w-full py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2cb8a7] via-[#21a494] to-[#17786c] hover:from-[#35d0bd] hover:to-[#1e998a] text-white font-black text-[12.5px] sm:text-[13.5px] shadow-[0_8px_20px_rgba(44,184,167,0.38)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 pointer-events-none" />
          <span className="relative z-10">ফার্মেসি হিসেবে যুক্ত হোন</span>
          <ArrowRight className="h-4 w-4 relative z-10 transition-transform duration-200 group-hover/btn:translate-x-1.5" />
        </Link>

        {/* Trust Guarantees */}
        <div className="flex items-center justify-between w-full px-0.5 text-[9.5px] sm:text-[10px] font-black text-[#0b352e] mt-2 tracking-tight whitespace-nowrap">
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#059669] transition-colors shrink-0">
            <span className="text-[#059669] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">অফলাইন ও অনলাইন</span>
          </span>
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#059669] transition-colors shrink-0">
            <span className="text-[#059669] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">অটো ক্লাউড ব্যাকআপ</span>
          </span>
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#059669] transition-colors shrink-0">
            <span className="text-[#059669] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">ফ্রি সাপোর্ট</span>
          </span>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* PATIENT PANEL 6 KEY FEATURES (Bengali)                                    */
/* ========================================================================= */
const PATIENT_FEATURES = [
  {
    icon: Calendar,
    iconBg: "bg-sky-500/15 text-sky-700",
    title: "অনলাইন ডাক্তার বুকিং",
    desc: "চেম্বার বা ভিডিও কলে বিশেষজ্ঞ চিকিৎসকের দ্রুত সিরিয়াল ও তাৎক্ষণিক কনফার্মেশন।",
  },
  {
    icon: FileText,
    iconBg: "bg-emerald-500/15 text-emerald-700",
    title: "ডিজিটাল প্রেসক্রিপশন",
    desc: "প্রেসক্রিপশন হারানোর ভয় নেই; প্রতিটি ই-প্রেসক্রিপশন আজীবন নিরাপদ অ্যাকাউন্টে সংরক্ষিত।",
  },
  {
    icon: Activity,
    iconBg: "bg-teal-500/15 text-teal-700",
    title: "অনলাইন ল্যাব রিপোর্ট",
    desc: "প্যাথলজি টেস্ট রিপোর্ট প্রস্তুত হতেই মোবাইলে এসএমএস এলার্ট ও পিডিএফ ডাউনলোড।",
  },
  {
    icon: Building2,
    iconBg: "bg-indigo-500/15 text-indigo-700",
    title: "ডাক্তার ও হাসপাতাল ডিরেক্টরি",
    desc: "সারা দেশের ভেরিফায়েড বিশেষজ্ঞ চিকিৎসক, ক্লিনিক, ডায়াগনস্টিক ও ফার্মেসির তথ্য।",
  },
  {
    icon: Receipt,
    iconBg: "bg-amber-500/15 text-amber-700",
    title: "স্বচ্ছ চিকিৎসা বিলিং",
    desc: "হাসপাতালের ভর্তি, ওষুধ ও টেস্ট ইনভয়েসের নির্ভুল হিসাব এবং ডিজিটাল পেমেন্ট স্লিপ।",
  },
  {
    icon: HeartHandshake,
    iconBg: "bg-rose-500/15 text-rose-700",
    title: "ফ্যামিলি হেলথ EMR",
    desc: "এক অ্যাকাউন্টে পরিবারের সব সদস্য যোগ করে সম্পূর্ণ মেডিকেল হিস্ট্রি ও ডাটা ট্র্যাকিং।",
  },
];

/* ========================================================================= */
/* PAGE 7 CONTENT: "PATIENT PORTAL & PERSONAL HEALTHCARE COMPANION"          */
/* ========================================================================= */
const Page7PatientPanel = () => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#f0f9ff] to-[#e0f2fe] text-slate-900 flex flex-col pt-4 sm:pt-5 pb-3.5 sm:pb-4 px-4 sm:px-5 overflow-hidden relative justify-between select-none">
      {/* Subtle Ambient Corner Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-sky-400/20 to-transparent pointer-events-none animate-pulse" />

      {/* Top Header Bar */}
      <div className="relative z-10 shrink-0 pt-1">
        <div className="space-y-0.5">
          <h2 className="text-[19px] sm:text-[21px] font-black text-[#0d1b3e] tracking-tight leading-tight">
            রোগী পোর্টাল ও পার্সোনাল হেলথ কেয়ার
          </h2>
          <p className="text-[10.5px] sm:text-[11px] text-[#0369a1] font-medium leading-relaxed">
            ডাক্তার সিরিয়াল, ডিজিটাল প্রেসক্রিপশন, টেস্ট রিপোর্ট ও পারিবারিক স্বাস্থ্য
          </p>
        </div>
      </div>

      {/* 6 Feature Cards (3x2 Grid) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 my-auto relative z-10">
        {PATIENT_FEATURES.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="group/feat relative overflow-hidden rounded-2xl p-2.5 sm:p-3 bg-white/95 hover:bg-white border border-slate-200/80 shadow-xs hover:border-sky-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="absolute inset-0 -translate-x-full group-hover/feat:translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 pointer-events-none" />
              <div>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${feat.iconBg} flex items-center justify-center mb-1.5 transition-transform duration-300 group-hover/feat:scale-110 group-hover/feat:rotate-3 shadow-xs`}>
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.4]" />
                </div>
                <h4 className="text-[11.5px] sm:text-[12.5px] font-extrabold text-[#0d1b3e] leading-snug">
                  {feat.title}
                </h4>
                <p className="text-[9.2px] sm:text-[9.8px] text-slate-600 font-medium leading-[1.38] mt-0.5 line-clamp-2">
                  {feat.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* The Scallop Rosette Pricing Badge & Action Section */}
      <div className="relative z-10 mt-auto flex flex-col items-center pt-0.5 shrink-0">
        <ScallopPricingBadge size="sm" variant="patient" className="mb-1" />

        {/* Primary CTA Button */}
        <Link
          href="/patient/dashboard"
          className="group/btn relative overflow-hidden w-full py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0284c7] via-[#0369a1] to-[#075985] hover:from-[#38bdf8] hover:to-[#0284c7] text-white font-black text-[12.5px] sm:text-[13.5px] shadow-[0_8px_20px_rgba(2,132,199,0.38)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 pointer-events-none" />
          <span className="relative z-10">রোগী হিসেবে ফ্রি পোর্টাল ব্যবহার করুন</span>
          <ArrowRight className="h-4 w-4 relative z-10 transition-transform duration-200 group-hover/btn:translate-x-1.5" />
        </Link>

        {/* Trust Guarantees */}
        <div className="flex items-center justify-between w-full px-0.5 text-[9.5px] sm:text-[10px] font-black text-[#082f49] mt-2 tracking-tight whitespace-nowrap">
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#0284c7] transition-colors shrink-0">
            <span className="text-[#0284c7] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">১০০% ফ্রি সেবা</span>
          </span>
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#0284c7] transition-colors shrink-0">
            <span className="text-[#0284c7] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">আজীবন রেকর্ড সংরক্ষণ</span>
          </span>
          <span className="flex items-center gap-0.5 sm:gap-1 group/item cursor-default hover:text-[#0284c7] transition-colors shrink-0">
            <span className="text-[#0284c7] font-black text-[11px] sm:text-xs leading-none group-hover/item:scale-125 transition-transform inline-block">✓</span>
            <span className="whitespace-nowrap">২৪/৭ অ্যাক্সেস</span>
          </span>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* PAGE 8 CONTENT: BACK COVER (QR CODE, WEBSITE & CONTACT)                  */
/* ========================================================================= */
const Page8BackCover = () => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#56a798] via-[#35657c] to-[#1c3752] text-white flex flex-col justify-between pt-6 sm:pt-7 pb-6 sm:pb-7 px-5 sm:px-6 relative overflow-hidden select-none">
      {/* Subtle Ambient Glows */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-48 bg-emerald-300/20 blur-3xl rounded-full pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-sky-400/15 blur-3xl rounded-full pointer-events-none" />

      {/* Top Header: Visit Website */}
      <div className="relative z-10 flex flex-col items-center text-center pt-14 sm:pt-16 shrink-0">
        <span className="text-[16px] sm:text-[18px] font-bold text-white/95 tracking-wide drop-shadow-xs">
          ভিজিট করুন:
        </span>
        <a
          href="https://www.healthflowbd.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[19px] sm:text-[22px] font-black text-white hover:text-emerald-200 tracking-tight transition-all hover:scale-105 drop-shadow-md mt-0.5 inline-block"
        >
          www.healthflowbd.com
        </a>
      </div>

      {/* Center Visual: Floating Laptop Mockup with Overlaid QR Code */}
      <div className="relative z-10 w-full my-auto flex flex-col items-center justify-center py-1">
        {/* Floating Laptop Container */}
        <motion.div 
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-full max-w-[270px] sm:max-w-[295px] flex flex-col items-center"
        >
          {/* Ambient backlight */}
          <div className="absolute -inset-4 bg-teal-400/20 blur-xl rounded-full pointer-events-none animate-pulse" />

          {/* Laptop Screen Bezel */}
          <div className="w-full bg-[#1e293b] rounded-t-xl p-1.5 sm:p-2 border border-slate-600/70 shadow-2xl relative">
            {/* Camera */}
            <div className="w-1.5 h-1.5 rounded-full bg-slate-500/80 mx-auto mb-1" />
            {/* Screen Display */}
            <div className="w-full aspect-[16/10] bg-[#f8fafc] rounded-md overflow-hidden relative border border-slate-700/50 flex flex-col select-none">
              {/* Web App Top Navbar */}
              <div className="h-4 bg-white border-b border-slate-200/90 px-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <div className="flex items-center gap-1 ml-1.5">
                    <span className="text-[7.5px] font-black text-[#0d1b3e] tracking-tight">HealthFlow</span>
                  </div>
                </div>
                {/* Live System Indicator */}
                <div className="flex items-center gap-1 px-1 py-0.2 rounded-full bg-emerald-50 border border-emerald-200/60">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[6.5px] font-black text-emerald-700">LIVE</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-7 bg-[#2cb8a7] rounded-xs" />
                </div>
              </div>

              {/* Web App Page Hero & UI */}
              <div className="p-2 flex-1 flex flex-col justify-between bg-gradient-to-br from-white via-teal-50/15 to-sky-50/25">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 w-1/2 pt-0.5">
                    <div className="h-2 w-20 bg-[#0d1b3e]/75 rounded-xs" />
                    <div className="h-1.5 w-24 bg-slate-400/60 rounded-xs" />
                    <div className="h-1.5 w-16 bg-slate-300 rounded-xs" />
                    <div className="h-2.5 w-12 bg-[#2cb8a7] rounded-xs mt-1.5" />
                  </div>
                  {/* Dashboard Preview Card */}
                  <div className="w-1/2 bg-white rounded-md p-1.5 border border-slate-200/80 shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="h-1.5 w-10 bg-slate-700 rounded-xs" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-0.5">
                      <div className="h-3.5 bg-teal-50 rounded-xs border border-teal-100/80" />
                      <div className="h-3.5 bg-sky-50 rounded-xs border border-sky-100/80" />
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-xs" />
                    <div className="h-1.5 w-4/5 bg-slate-100 rounded-xs" />
                  </div>
                </div>

                {/* Metric pills at bottom */}
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-200/60">
                  <div className="h-2.5 bg-white rounded-xs border border-slate-200/80" />
                  <div className="h-2.5 bg-white rounded-xs border border-slate-200/80" />
                  <div className="h-2.5 bg-white rounded-xs border border-slate-200/80" />
                </div>
              </div>

              {/* Subtle glass reflection overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
            </div>
          </div>
          {/* Laptop Base */}
          <div className="w-[108%] h-2.5 sm:h-3 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 rounded-b-lg shadow-xl relative -mt-0.5 flex items-center justify-center">
            <div className="w-10 h-0.5 bg-slate-500/60 rounded-full" />
          </div>

          {/* Overlaid Prominent QR Code Badge with futuristic scan laser line */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <a
              href="https://www.healthflowbd.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.55)] border-2 border-white/95 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              title="HealthFlow ওয়েবসাইট ভিজিট করতে স্ক্যান অথবা ক্লিক করুন"
            >
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src="/assets/healthflow-qr.png"
                  alt="HealthFlow QR Code - Scan to visit www.healthflowbd.com"
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain transition-transform duration-300 group-hover:scale-105"
                />
                {/* High-Tech Glowing Laser Scan Beam */}
                <motion.div
                  animate={{ top: ["-10%", "110%"] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#34d399] pointer-events-none"
                />
              </div>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Contact Section */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-2 shrink-0">
        <div className="space-y-0.5">
          <p className="text-[13.5px] sm:text-[14.5px] font-bold text-white/95">
            বিস্তারিত জানতে যোগাযোগ করুন:
          </p>
          <a
            href="tel:+8809612901901"
            className="inline-block text-[18px] sm:text-[20px] font-black text-white hover:text-emerald-300 tracking-wider transition-all hover:scale-105 drop-shadow-sm"
          >
            +880 9612-901901
          </a>
        </div>

        {/* Circular Action Icons (Mail & Phone/WhatsApp) with enhanced hover states */}
        <div className="flex items-center justify-center gap-3">
          <a
            href="mailto:care@healthflowbd.com"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white transition-all hover:scale-115 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] active:scale-95"
            title="ইমেইল: care@healthflowbd.com"
            aria-label="Email HealthFlow"
          >
            <Mail className="h-4 w-4 stroke-[2.4]" />
          </a>
          <a
            href="https://wa.me/8809612901901"
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white transition-all hover:scale-115 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] active:scale-95"
            title="হোয়াটসঅ্যাপ / কল করুন"
            aria-label="WhatsApp or Call"
          >
            <Phone className="h-4 w-4 stroke-[2.4]" />
          </a>
        </div>

        {/* Social Links (Facebook & LinkedIn) */}
        <div className="flex flex-col items-center gap-1.5 text-white/95 text-[11px] sm:text-[12px] font-bold pt-0.5">
          <a
            href="https://www.facebook.com/healthflowbd"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-emerald-200 transition-all hover:scale-[1.02]"
          >
            <span className="h-4 w-4 sm:h-4.5 sm:w-4.5 rounded-full bg-white text-[#1c3752] flex items-center justify-center shadow-xs">
              <Facebook className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" />
            </span>
            <span>facebook.com/healthflowbd</span>
          </a>
          <a
            href="https://www.linkedin.com/company/healthflowbd"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-emerald-200 transition-all hover:scale-[1.02]"
          >
            <span className="h-4 w-4 sm:h-4.5 sm:w-4.5 rounded-full bg-white text-[#1c3752] flex items-center justify-center shadow-xs">
              <Linkedin className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" />
            </span>
            <span>linkedin.com/company/healthflowbd</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export const Brochure = () => {
  const [currentPage, setCurrentPage] = useState<PageIndex>(0);
  const [activeModal, setActiveModal] = useState<CategoryDetail | null>(null);

  const goToPage = (target: PageIndex) => {
    if (target === currentPage) return;
    setCurrentPage(target);
  };

  const goToNextPage = () => {
    if (currentPage < 7) {
      goToPage((currentPage + 1) as PageIndex);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      goToPage((currentPage - 1) as PageIndex);
    }
  };

  // Keyboard navigation for turning the brochure pages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && currentPage < 7) {
        goToNextPage();
      } else if (e.key === "ArrowLeft" && currentPage > 0) {
        goToPrevPage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage]);

  const pageBgClasses = [
    "bg-[#f5f4ef]",
    "bg-white",
    "bg-gradient-to-b from-[#fbfcfa] to-[#f3f7f5]",
    "bg-gradient-to-b from-[#f8fafc] to-[#eef4fb]",
    "bg-gradient-to-b from-[#f6fcfb] to-[#edf7f5]",
    "bg-gradient-to-b from-[#f7fcfa] to-[#eef8f5]",
    "bg-gradient-to-b from-[#f0f9ff] to-[#e0f2fe]",
    "bg-gradient-to-b from-[#56a798] via-[#35657c] to-[#1c3752]",
  ];

  return (
    <div className="min-h-screen bg-[#ede8e1] flex flex-col items-center justify-center p-2 sm:p-4 select-none overflow-x-hidden relative">
      
      {/* Decorative Atmospheric Floating Plus Watermarks */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-16 left-12 text-[#2cb8a7]/15 pointer-events-none select-none hidden lg:block"
      >
        <Plus className="w-20 h-20 stroke-[1.2]" />
      </motion.div>
      <motion.div
        animate={{ y: [0, 18, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-20 right-12 text-[#1b3861]/12 pointer-events-none select-none hidden lg:block"
      >
        <Plus className="w-28 h-28 stroke-[1]" />
      </motion.div>

      {/* ========================================================================= */}
      {/* BROCHURE SLIDER CONTAINER                                                 */}
      {/* ========================================================================= */}
      <div className="relative w-full max-w-[480px] flex flex-col items-center justify-center">
        
        {/* Dynamic ambient color glow that matches the active slide */}
        <motion.div
          key={`aura-${currentPage}`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.35, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute -inset-10 rounded-[60px] blur-3xl pointer-events-none"
          style={{ background: SLIDES_META[currentPage].glow }}
        />

        {/* Soft shadow under the entire brochure presentation */}
        <div className="absolute inset-x-8 bottom-12 h-16 bg-slate-900/15 blur-2xl rounded-full pointer-events-none" />

        {/* ========================================================================= */}
        {/* ANIMATED SLIDE CARD WRAPPER (Stacked Realistic Brochure Deck)              */}
        {/* ========================================================================= */}
        <div 
          className="relative z-10 flex items-center justify-center shrink-0"
          style={{ 
            height: "min(750px, calc(100vh - 120px))", 
            aspectRatio: "1 / 2.05", 
            maxWidth: "calc(100vw - 32px)",
            minHeight: "560px" 
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
            const diff = idx - currentPage;

            // Only render cards currently in view, peeking in back, or just exited
            if (diff < -1 || diff > 2) return null;

            return (
              <motion.div
                key={`page-${idx}`}
                initial={false}
                animate={{
                  x: diff === 0 ? 0 : diff === 1 ? 22 : diff > 1 ? 38 : -460,
                  y: 0,
                  scale: diff === 0 ? 1 : diff === 1 ? 0.96 : diff > 1 ? 0.92 : 0.92,
                  rotate: diff === 0 ? 0 : diff === 1 ? 1.8 : diff > 1 ? 3 : -5,
                  opacity: diff === 0 ? 1 : diff === 1 ? 0.98 : 0,
                  zIndex: diff === 0 ? 20 : diff === 1 ? 10 : diff > 1 ? 5 : 25,
                }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 28,
                  mass: 0.8,
                }}
                drag={diff === 0 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.35}
                onDragEnd={diff === 0 ? (_, { offset, velocity }) => {
                  const swipe = Math.abs(offset.x) * velocity.x;
                  if (swipe < -100 || offset.x < -80) {
                    goToNextPage();
                  } else if (swipe > 100 || offset.x > 80) {
                    goToPrevPage();
                  }
                } : undefined}
                className={`absolute inset-0 w-full h-full rounded-[36px] overflow-hidden select-none transition-shadow ${pageBgClasses[idx]} ${
                  diff === 0
                    ? "cursor-grab active:cursor-grabbing shadow-[0_28px_70px_-15px_rgba(13,27,62,0.3)] border border-slate-200/70"
                    : diff === 1
                    ? "cursor-pointer shadow-[0_20px_50px_-12px_rgba(13,27,62,0.22)] border border-slate-300/80 hover:brightness-105"
                    : "pointer-events-none"
                } ${diff < 0 ? "pointer-events-none" : ""}`}
                style={{ transformOrigin: "bottom left" }}
                onClick={() => {
                  if (diff === 1) {
                    goToNextPage();
                  }
                }}
              >
                {/* Subtle Ambient Dimming Veil when Card is in the Back */}
                <motion.div
                  animate={{ opacity: diff === 0 ? 0 : 0.08 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 bg-slate-900 pointer-events-none rounded-[36px] z-30"
                />

                {/* Transparent Click-catcher when peeking in the back to easily advance */}
                {diff === 1 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      goToNextPage();
                    }}
                    className="absolute inset-0 z-40 cursor-pointer"
                    title="পরবর্তী পেজ দেখতে ক্লিক করুন"
                  />
                )}

                {/* Page Content */}
                {idx === 0 && <Page1Cover onExplore={goToNextPage} />}
                {idx === 1 && (
                  <Page2Services
                    onSelectDoctors={() => goToPage(2)}
                    onSelectHospital={() => goToPage(3)}
                    onSelectPathology={() => goToPage(4)}
                    onSelectPharmacy={() => goToPage(5)}
                    onSelectPatient={() => goToPage(6)}
                  />
                )}
                {idx === 2 && <Page3DoctorPanel />}
                {idx === 3 && <Page4HospitalPanel />}
                {idx === 4 && <Page5PathologyPanel />}
                {idx === 5 && <Page6PharmacyPanel />}
                {idx === 6 && <Page7PatientPanel />}
                {idx === 7 && <Page8BackCover />}
              </motion.div>
            );
          })}
        </div>

        {/* Navigation Controls Bar */}
        <div className="relative z-20 mt-4 flex flex-col items-center justify-center gap-2 w-full">
          {/* Navigation Buttons Bar */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {/* Previous Page Button */}
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={goToPrevPage}
              className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all hover:scale-105 active:scale-95 cursor-pointer hover:shadow-md"
              aria-label="Previous Page"
              title="পূর্ববর্তী স্লাইড (বাম তীর)"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* HealthFlow Home Button */}
            <Link
              href="/"
              className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:text-[#2cb8a7] transition-all hover:scale-105 active:scale-95 cursor-pointer hover:shadow-md"
              title="HealthFlow মূল ওয়েবসাইট (হোম)"
              aria-label="Home"
            >
              <Home className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-[#2cb8a7] stroke-[2.2]" />
            </Link>

            {/* Replay / First Slide Button */}
            <button
              type="button"
              onClick={() => goToPage(0)}
              disabled={currentPage === 0}
              className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 hover:text-[#1b3861] disabled:opacity-35 disabled:pointer-events-none transition-all hover:scale-105 active:scale-95 cursor-pointer hover:shadow-md"
              title="১ম স্লাইড"
              aria-label="First slide"
            >
              <RotateCcw className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-[#1b3861] stroke-[2.2]" />
            </button>

            {/* Next Page Button */}
            <button
              type="button"
              disabled={currentPage === 7}
              onClick={goToNextPage}
              className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all hover:scale-105 active:scale-95 cursor-pointer hover:shadow-md"
              aria-label="Next Page"
              title="পরবর্তী স্লাইড (ডান তীর)"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE DETAILS MODAL (Fallback Modal)                                 */}
      {/* ========================================================================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white text-slate-900 shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            
            <div 
              className="p-6 text-white relative overflow-hidden"
              style={{ background: activeModal.gradient }}
            >
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-1 pr-8">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur text-[10px] font-bold tracking-wider uppercase text-white">
                  {activeModal.badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {activeModal.title}
                </h3>
                <p className="text-xs text-white/90 font-light">
                  {activeModal.tagline}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Key Module Capabilities & Deliverables
              </h4>

              <div className="space-y-2.5">
                {activeModal.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-[#2cb8a7] shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Close
              </button>

              <Link
                href={activeModal.ctaLink}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0d1b3e] hover:bg-[#1a3064] shadow-md transition-all hover:scale-[1.02]"
              >
                <span>{activeModal.ctaText}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Brochure;
