import { useEffect, useState } from "react";
const healthCamp = "/assets/announcement-health-camp.jpg";

export type AnnouncementType = "text" | "image";
export type AnnouncementStatus = "Published" | "Draft" | "Archived";

export type Announcement = {
  id: string;
  type: AnnouncementType;
  title: string;
  body: string;
  image?: string; // dataURL or imported asset path
  ctaLabel?: string;
  ctaUrl?: string;
  status: AnnouncementStatus;
  updated: string; // ISO
};

const STORAGE_KEY = "hf:announcements:v1";
const EVENT = "hf:announcements:changed";
const DISMISS_KEY = "hf:announcement-dismissed";

export const defaultAnnouncements: Announcement[] = [
  {
    id: "ann-discount",
    type: "text",
    title: "🎉 30% Off Annual HealthFlow Plans",
    body: "Limited-time launch offer. Upgrade to any annual plan before June 30 and save 30% on Pro & Enterprise. Use code HEALTH30 at checkout.",
    ctaLabel: "View Pricing",
    ctaUrl: "/pricing",
    status: "Published",
    updated: new Date().toISOString(),
  },
  {
    id: "ann-camp",
    type: "image",
    title: "Free Community Health Camp",
    body: "Join our free general check-up & consultation camp this Saturday. Cardiology, diabetes screening and pediatric care — open to everyone.",
    image: healthCamp,
    ctaLabel: "Learn More",
    ctaUrl: "/hospitals",
    status: "Published",
    updated: new Date().toISOString(),
  },
];

const read = (): Announcement[] => {
  if (typeof window === "undefined") return defaultAnnouncements;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAnnouncements;
    return JSON.parse(raw) as Announcement[];
  } catch {
    return defaultAnnouncements;
  }
};

const write = (items: Announcement[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
};

export const useAnnouncements = () => {
  const [items, setItems] = useState<Announcement[]>(() => read());
  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return {
    items,
    save: (next: Announcement[]) => write(next),
    reset: () => write(defaultAnnouncements),
  };
};

export const getActiveAnnouncement = (): Announcement | null => {
  const all = read();
  const dismissed = (() => {
    try { return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "[]") as string[]; }
    catch { return []; }
  })();
  return all.find(a => a.status === "Published" && !dismissed.includes(a.id)) || null;
};

export const dismissAnnouncement = (id: string) => {
  try {
    const cur = JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "[]") as string[];
    if (!cur.includes(id)) cur.push(id);
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify(cur));
  } catch {/* ignore */}
};
