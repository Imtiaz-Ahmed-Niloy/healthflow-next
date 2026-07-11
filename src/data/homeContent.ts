import { useEffect, useState } from "react";

export type StatItem = { value: string; label: string };

export type HomeContent = {
  heroTitle1: string;
  heroTitle2: string;
  heroDesc: string;
  heroBookCta: string;
  heroExploreCta: string;
  stats: StatItem[];
};

const STORAGE_KEY = "hf:home-content:v1";
const EVENT = "hf:home-content:changed";

export const defaultHomeContent: HomeContent = {
  heroTitle1: "Your Health, Connected in One Place.",
  heroTitle2: "",
  heroDesc:
    "Find trusted hospitals, clinics, doctors, diagnostics, and pharmacies — all in one powerful platform designed for your complete healthcare journey. Book appointments. Compare services. Access reports. Order medicines. Get better care — faster, smarter.",
  heroBookCta: "Book a Consultation",
  heroExploreCta: "Explore Hubs",
  stats: [
    { value: "500+", label: "Health Specialists" },
    { value: "300+", label: "Patients Served" },
    { value: "99.9%", label: "Satisfaction Rate\u00a0" },
    { value: "15+", label: "Verified Health Hubs" },
  ],
};

const read = (): HomeContent => {
  if (typeof window === "undefined") return defaultHomeContent;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultHomeContent;
    return { ...defaultHomeContent, ...(JSON.parse(raw) as Partial<HomeContent>) };
  } catch {
    return defaultHomeContent;
  }
};

const write = (c: HomeContent) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event(EVENT));
};

export const useHomeContent = () => {
  const [content, setContent] = useState<HomeContent>(() => read());

  useEffect(() => {
    const sync = () => setContent(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = (patch: Partial<HomeContent>) => write({ ...read(), ...patch });
  const reset = () => write(defaultHomeContent);
  return { content, save, reset };
};
