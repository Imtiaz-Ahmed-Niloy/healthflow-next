import { useEffect, useState } from "react";

export type Pillar = { icon: string; title: string; desc: string };
export type TeamMember = { name: string; role: string; img?: string };
export type Stat = { value: string; label: string };
export type JourneyStep = { year: string; title: string; desc: string };
export type CoreObjective = { icon: string; title: string; desc: string };

export type AboutContent = {
  pillars: { title: string; items: Pillar[] };
  team: { eyebrow: string; title: string; subtitle: string; members: TeamMember[] };
  stats: Stat[];
  journey: { eyebrow: string; title: string; subtitle: string; steps: JourneyStep[] };
  ceoMessage: { eyebrow: string; quote: string; name: string; role: string };
  vision: { eyebrow: string; title: string; statement: string };
  mission: { eyebrow: string; title: string; statement: string };
  objectives: { eyebrow: string; title: string; subtitle: string; items: CoreObjective[] };
};

const STORAGE_KEY = "hf:cms-about:v2";
const EVENT = "hf:cms-about:changed";

export const defaultAboutContent: AboutContent = {
  pillars: {
    title: "Foundational Pillars",
    items: [
      { icon: "Leaf", title: "Organic Growth", desc: "Systems that evolve naturally with your practice, ensuring longevity and adaptability in a shifting medical landscape." },
      { icon: "HeartPulse", title: "Patient-First Precision", desc: "Every line of code is written with the patient experience in mind, prioritizing restorative outcomes over processing speed." },
      { icon: "ShieldCheck", title: "Unwavering Integrity", desc: "Security and compliance aren't just features; they are the bedrock of the trust we build with providers and patients alike." },
    ],
  },
  team: {
    eyebrow: "OUR LEADERSHIP",
    title: "The Visionaries",
    subtitle: "Meet the multidisciplinary team bridging the gap between clinical excellence and digital innovation.",
    members: [
      { name: "Dr. Elena Thorne", role: "Chief Medical Officer" },
      { name: "Marcus Vane", role: "Head of Product Design" },
      { name: "Julian Chen", role: "CTO & Founder" },
      { name: "Sarah Jenkins", role: "VP of Operations" },
    ],
  },
  stats: [
    { value: "500+", label: "Clinics Empowered" },
    { value: "1M+", label: "Patients Served" },
    { value: "99.9%", label: "Uptime Reliability" },
    { value: "15+", label: "Global Awards" },
  ],
  journey: {
    eyebrow: "OUR STORY",
    title: "The HealthFlow Journey",
    subtitle: "From a bold idea to a transformative platform — every step has been driven by our commitment to reimagining healthcare.",
    steps: [
      { year: "April 2025", title: "The Spark", desc: "HealthFlow was born from a simple question: why is healthcare so fragmented? Our founders set out to build a unified digital ecosystem." },
      { year: "August 2026", title: "First Clinics Onboarded", desc: "Piloted with 5 clinics across Bangladesh, validating our core platform and refining patient management workflows." },
      { year: "Ongoing", title: "The Future", desc: "Expanding into predictive health analytics, genomics integration, and cross-border healthcare connectivity." },
    ],
  },
  ceoMessage: {
    eyebrow: "MESSAGE FROM THE CEO",
    quote: "At HealthFlow, we believe that technology should serve humanity — not the other way around. Every feature we build, every partnership we forge, is guided by a singular purpose: to make quality healthcare accessible to every person, everywhere. This is not just our mission; it is our promise.",
    name: "IAN",
    role: "Founder & CEO, HealthFlow",
  },
  vision: {
    eyebrow: "OUR VISION",
    title: "A Connected Future for Healthcare",
    statement: "To become the leading digital healthcare ecosystem, seamlessly connecting providers, patients, and healthcare services through innovation, intelligence, and trust.",
  },
  mission: {
    eyebrow: "OUR MISSION",
    title: "Empowering Care, One Platform at a Time",
    statement: "To empower healthcare organizations with integrated digital solutions that enhance operational efficiency, improve patient outcomes, and make quality healthcare more accessible.",
  },
  objectives: {
    eyebrow: "CORE OBJECTIVES",
    title: "What Drives Us Every Day",
    subtitle: "Our objectives are the compass that guides every decision we make — from product design to patient care.",
    items: [
      { icon: "Users", title: "Patient-Centered Design", desc: "Putting patients at the heart of every interaction with intuitive, accessible, and compassionate digital experiences." },
      { icon: "Cpu", title: "AI-Driven Innovation", desc: "Leveraging artificial intelligence to enhance diagnostics, streamline operations, and predict health outcomes." },
      { icon: "Globe", title: "Universal Accessibility", desc: "Breaking down barriers to healthcare by making quality services available to all, regardless of location or means." },
      { icon: "ShieldCheck", title: "Trust & Security", desc: "Maintaining the highest standards of data privacy, regulatory compliance, and ethical technology use." },
      { icon: "TrendingUp", title: "Continuous Improvement", desc: "Evolving our platform through relentless iteration, feedback loops, and cutting-edge research." },
      { icon: "Handshake", title: "Provider Partnership", desc: "Building strong, lasting relationships with healthcare providers to co-create solutions that truly work." },
    ],
  },
};

const read = (): AboutContent => {
  if (typeof window === "undefined") return defaultAboutContent;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAboutContent;
    const p = JSON.parse(raw) as Partial<AboutContent>;
    return {
      pillars: { ...defaultAboutContent.pillars, ...(p.pillars ?? {}) },
      team: { ...defaultAboutContent.team, ...(p.team ?? {}) },
      stats: p.stats ?? defaultAboutContent.stats,
      journey: { ...defaultAboutContent.journey, ...(p.journey ?? {}) },
      ceoMessage: { ...defaultAboutContent.ceoMessage, ...(p.ceoMessage ?? {}) },
      vision: { ...defaultAboutContent.vision, ...(p.vision ?? {}) },
      mission: { ...defaultAboutContent.mission, ...(p.mission ?? {}) },
      objectives: { ...defaultAboutContent.objectives, ...(p.objectives ?? {}) },
    };
  } catch { return defaultAboutContent; }
};
const write = (c: AboutContent) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); window.dispatchEvent(new Event(EVENT)); };

export const useAboutContent = () => {
  const [content, setContent] = useState<AboutContent>(() => read());
  useEffect(() => {
    const sync = () => setContent(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return { content, save: write, reset: () => write(defaultAboutContent) };
};
