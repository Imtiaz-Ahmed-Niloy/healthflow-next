import { useEffect, useState } from "react";

export type CmsHeroKey = "features" | "about" | "contact";

export type CmsHeroFields = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
};

export type CmsHeroContent = Record<CmsHeroKey, CmsHeroFields>;

const STORAGE_KEY = "hf:cms-page-hero:v1";
const EVENT = "hf:cms-page-hero:changed";

export const defaultCmsHero: CmsHeroContent = {
  features: {
    eyebrow: "PLATFORM",
    title: "Crafting the Precision Medicine Operating System",
    description:
      "A unified ecosystem designed to bridge the gap between clinical data and patient outcomes through biophilic interface design and AI-driven insights.",
    primaryCta: "REQUEST DEMO",
    secondaryCta: "▶ WATCH WALKTHROUGH",
  },
  about: {
    eyebrow: "OUR STORY",
    title: "Restoring Clarity to Healthcare",
    description:
      "We believe that medical technology should feel as natural as the care it facilitates. HealthFlow was born from a vision to simplify complex systems through organic design.",
    primaryCta: "",
    secondaryCta: "",
  },
  contact: {
    eyebrow: "GET IN TOUCH",
    title: "Restorative support, whenever you need it.",
    description:
      "Our team is here to ensure your journey with HealthFlow is seamless. Reach out for medical inquiries, technical support, or to learn more about our restorative care philosophy.",
    primaryCta: "",
    secondaryCta: "",
  },
};

const read = (): CmsHeroContent => {
  if (typeof window === "undefined") return defaultCmsHero;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultCmsHero;
    const parsed = JSON.parse(raw) as Partial<CmsHeroContent>;
    return {
      features: { ...defaultCmsHero.features, ...(parsed.features ?? {}) },
      about: { ...defaultCmsHero.about, ...(parsed.about ?? {}) },
      contact: { ...defaultCmsHero.contact, ...(parsed.contact ?? {}) },
    };
  } catch {
    return defaultCmsHero;
  }
};

const write = (c: CmsHeroContent) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event(EVENT));
};

export const useCmsHero = () => {
  const [content, setContent] = useState<CmsHeroContent>(() => read());
  useEffect(() => {
    const sync = () => setContent(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const save = (next: CmsHeroContent) => write(next);
  const reset = () => write(defaultCmsHero);
  return { content, save, reset };
};
