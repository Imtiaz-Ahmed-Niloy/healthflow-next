"use client";

import { useEffect, useState } from "react";
import { defaultCmsHero, type CmsHeroContent } from "@/data/cmsPageHero";

const STORAGE_KEY = "hf:cms-page-hero:v1";
const EVENT = "hf:cms-page-hero:changed";

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

/**
 * Legacy localStorage store, still backing About and Contact's hero tabs
 * until their own cms_pages migration PRs. Features has moved off this —
 * see usePageHero.
 */
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
