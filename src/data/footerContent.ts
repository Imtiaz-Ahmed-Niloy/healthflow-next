import { useEffect, useState } from "react";
import { BRAND_INFO } from "@/constants/brand";

export type FooterLink = { label: string; to: string };
export type FooterColumn = { title: string; links: FooterLink[] };
export type FooterSocial = { twitter: string; facebook: string; instagram: string };

export type FooterContent = {
  brand: string;
  tagline: string;
  newsletterTitle: string;
  newsletterPlaceholder: string;
  rights: string;
  columns: FooterColumn[];
  social: FooterSocial;
};

const STORAGE_KEY = "hf:footer-content:v1";
const EVENT = "hf:footer-content:changed";

export const defaultFooterContent: FooterContent = {
  brand: BRAND_INFO.name,
  tagline: BRAND_INFO.tagline,
  newsletterTitle: "Newsletter",
  newsletterPlaceholder: "Your email",
  rights: `© ${BRAND_INFO.name}. All rights reserved.`,
  columns: [
    {
      title: "Resources",
      links: [
        { label: "Help Center", to: "/help-center" },
        { label: "Blog", to: "/blog" },
        { label: "Career", to: "/career" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy", to: "/privacy" },
        { label: "Terms", to: "/terms" },
        { label: "Data Use", to: "/data-use" },
        { label: "Cookies", to: "/cookies" },
      ],
    },
  ],
  social: {
    twitter: "#",
    facebook: "#",
    instagram: "#",
  },
};

const read = (): FooterContent => {
  if (typeof window === "undefined") return defaultFooterContent;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFooterContent;
    const parsed = JSON.parse(raw) as Partial<FooterContent>;
    return {
      ...defaultFooterContent,
      ...parsed,
      social: { ...defaultFooterContent.social, ...(parsed.social ?? {}) },
      columns: parsed.columns ?? defaultFooterContent.columns,
    };
  } catch {
    return defaultFooterContent;
  }
};

const write = (c: FooterContent) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event(EVENT));
};

export const useFooterContent = () => {
  const [content, setContent] = useState<FooterContent>(() => read());

  useEffect(() => {
    const sync = () => setContent(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = (next: FooterContent) => write(next);
  const reset = () => write(defaultFooterContent);
  return { content, save, reset };
};
