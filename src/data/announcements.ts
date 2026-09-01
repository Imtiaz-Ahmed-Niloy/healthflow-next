/**
 * Shared announcement types plus the per-visitor "I dismissed this" memory.
 *
 * The announcements themselves now live in public.announcements (migration
 * 0053) and are fetched through the resource API on /super/announcements and
 * server-side for the public popup (src/app/page.tsx). This file no longer
 * stores any -- the seed list and its localStorage cache are gone.
 */

export type AnnouncementType = "text" | "image";
export type AnnouncementStatus = "published" | "draft" | "archived";

/**
 * Mirrors public.announcements (supabase/migrations/0053_announcements.sql).
 * Column names are the database's, so form values post straight through with
 * no mapping layer.
 */
export type Announcement = {
  id: string;
  type: AnnouncementType;
  title: string;
  body: string;
  image: string | null; // base64 data URL today, an R2 URL later -- text either way
  cta_label: string | null;
  cta_url: string | null;
  status: AnnouncementStatus;
  created_at: string;
  updated_at: string;
};

const DISMISS_KEY = "hf:announcement-dismissed";

const readDismissed = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "[]") as string[];
  } catch {
    return [];
  }
};

export const dismissAnnouncement = (id: string) => {
  try {
    const current = readDismissed();
    if (!current.includes(id)) current.push(id);
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify(current));
  } catch {
    /* storage disabled -- the visitor just sees the popup again next visit */
  }
};

/**
 * The first published announcement this visitor has not dismissed this
 * session. `items` comes from the public read policy (published only) already
 * sorted newest-first, so this only has to drop the dismissed ones; the status
 * check is kept as a cheap guard against a stale prop.
 */
export const pickActiveAnnouncement = (items: Announcement[]): Announcement | null => {
  const dismissed = readDismissed();
  return items.find((a) => a.status === "published" && !dismissed.includes(a.id)) ?? null;
};
