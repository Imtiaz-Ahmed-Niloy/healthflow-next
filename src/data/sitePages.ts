import { useEffect, useState } from "react";

export type SitePage = {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft";
  updated: string;
  builtIn?: boolean;
};

const STORAGE_KEY = "hf:site-pages:v1";
const EVENT = "hf:site-pages:changed";

export const defaultSitePages: SitePage[] = [
  { id: "home", title: "Home", slug: "/", status: "published", updated: "—", builtIn: true },
  { id: "features", title: "Features", slug: "/features", status: "published", updated: "—", builtIn: true },
  { id: "pricing", title: "Pricing", slug: "/pricing", status: "published", updated: "—", builtIn: true },
  { id: "about", title: "About Us", slug: "/about", status: "published", updated: "—", builtIn: true },
  { id: "contact", title: "Contact", slug: "/contact", status: "published", updated: "—", builtIn: true },
  { id: "hospitals", title: "Hospitals", slug: "/hospitals", status: "published", updated: "—", builtIn: true },
  { id: "doctors", title: "Doctors", slug: "/doctors", status: "published", updated: "—", builtIn: true },
  { id: "lab-tests", title: "Lab Booking", slug: "/lab-tests", status: "published", updated: "—", builtIn: true },
  { id: "reserve-room", title: "Room Reservation", slug: "/reserve-room", status: "published", updated: "—", builtIn: true },
  { id: "telehealth", title: "Telehealth", slug: "/telehealth", status: "published", updated: "—", builtIn: true },
  { id: "blog", title: "Blog", slug: "/blog", status: "published", updated: "—", builtIn: true },
  { id: "career", title: "Career", slug: "/career", status: "published", updated: "—", builtIn: true },
  { id: "help-center", title: "Help Center", slug: "/help-center", status: "published", updated: "—", builtIn: true },
  { id: "privacy", title: "Privacy Policy", slug: "/privacy", status: "published", updated: "—", builtIn: true },
  { id: "terms", title: "Terms & Conditions", slug: "/terms", status: "published", updated: "—", builtIn: true },
  { id: "data-use", title: "Data Use", slug: "/data-use", status: "published", updated: "—", builtIn: true },
  { id: "cookies", title: "Cookies", slug: "/cookies", status: "published", updated: "—", builtIn: true },
  { id: "signin", title: "Sign In", slug: "/signin", status: "published", updated: "—", builtIn: true },
  { id: "signup", title: "Sign Up", slug: "/signup", status: "published", updated: "—", builtIn: true },
];

const read = (): SitePage[] => {
  if (typeof window === "undefined") return defaultSitePages;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSitePages;
    const parsed = JSON.parse(raw) as SitePage[];
    // Merge: ensure all built-ins still present (in case new ones added in code)
    const byId = new Map(parsed.map(p => [p.id, p]));
    for (const d of defaultSitePages) if (!byId.has(d.id)) byId.set(d.id, d);
    return Array.from(byId.values());
  } catch {
    return defaultSitePages;
  }
};

const write = (pages: SitePage[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  window.dispatchEvent(new Event(EVENT));
};

export const useSitePages = () => {
  const [pages, setPages] = useState<SitePage[]>(() => read());

  useEffect(() => {
    const sync = () => setPages(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = (next: SitePage[]) => write(next);
  const reset = () => write(defaultSitePages);
  return { pages, save, reset };
};
