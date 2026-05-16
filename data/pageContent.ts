import { useEffect, useState } from "react";

export type PageKey = "privacy" | "terms" | "dataUse" | "cookies" | "helpCenter";

export type PageFields = {
  badge: string;
  title: string;
  description: string;
  meta?: string; // e.g. "Last Updated: ..." or effective date
};

export type PageContent = Record<PageKey, PageFields>;

const STORAGE_KEY = "hf:page-content:v1";
const EVENT = "hf:page-content:changed";

export const defaultPageContent: PageContent = {
  privacy: {
    badge: "Legal Document",
    title: "Privacy Policy",
    description:
      "Your health data is a sacred trust. This policy outlines how HealthFlow protects, processes, and respects your privacy in the modern era of restorative care.",
    meta: "Last Updated: June 14, 2024 • Effective Date: January 1, 2024",
  },
  terms: {
    badge: "Last Updated: October 24, 2024",
    title: "Terms & Conditions",
    description:
      "Please read these terms carefully. By using HealthFlow, you agree to our policies designed to ensure a safe, restorative experience for patients and providers.",
    meta: "",
  },
  dataUse: {
    badge: "Security & Privacy First",
    title: "Data Use Policy",
    description:
      "At HealthFlow, we treat your health data with the restorative care it deserves. This policy outlines how we protect, handle, and utilize your information under strict HIPAA compliance standards.",
    meta: "",
  },
  cookies: {
    badge: "Security & Privacy First",
    title: "Your Privacy Matters",
    description:
      "We use cookies to enhance your restorative care journey. These small files help us ensure security, remember your preferences, and improve our services to better support your health flow.",
    meta: "At HealthFlow, we treat your health data with the restorative care it deserves. This policy outlines how we protect, handle, and utilize your information under strict HIPAA compliance standards.",
  },
  helpCenter: {
    badge: "",
    title: "How can we help you?",
    description:
      "Search our help articles, guides, and FAQs — or reach our 24/7 support team for personalized assistance.",
    meta: "Search for articles, guides, or symptoms...",
  },
};

const read = (): PageContent => {
  if (typeof window === "undefined") return defaultPageContent;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPageContent;
    const parsed = JSON.parse(raw) as Partial<PageContent>;
    return {
      privacy: { ...defaultPageContent.privacy, ...(parsed.privacy ?? {}) },
      terms: { ...defaultPageContent.terms, ...(parsed.terms ?? {}) },
      dataUse: { ...defaultPageContent.dataUse, ...(parsed.dataUse ?? {}) },
      cookies: { ...defaultPageContent.cookies, ...(parsed.cookies ?? {}) },
      helpCenter: { ...defaultPageContent.helpCenter, ...(parsed.helpCenter ?? {}) },
    };
  } catch {
    return defaultPageContent;
  }
};

const write = (c: PageContent) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event(EVENT));
};

export const usePageContent = () => {
  const [content, setContent] = useState<PageContent>(() => read());

  useEffect(() => {
    const sync = () => setContent(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = (next: PageContent) => write(next);
  const reset = () => write(defaultPageContent);
  return { content, save, reset };
};
