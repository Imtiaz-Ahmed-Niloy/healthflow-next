"use client";

import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { mediaUrl } from "@/lib/media";
import { useFormatters } from "@/lib/appSettings";
import type { AdRow } from "@/redux/api/resources";

/**
 * Promotional cards across the platform (0064, generalised in 0065).
 *
 * They used to be four objects inside src/views/SignIn.tsx, so a promotion
 * change was a code change and a deploy. Each card names the PLACEMENT it
 * belongs to; the sign-in page is the only one rendering them today, and the
 * list grows by migration alongside the code that draws the next one.
 */

/** Mirrors public.ad_placement (0065). */
const PLACEMENTS = [
  { value: "signin", label: "Sign-in page" },
];

const placementLabel = (value: string) =>
  PLACEMENTS.find(p => p.value === value)?.label ?? value;

const SIDES = [
  { value: "left", label: "Left column" },
  { value: "right", label: "Right column" },
];

/** Matches the pill colours the sign-in page can draw. */
const TONES = [
  { value: "primary", label: "Primary (dark green)" },
  { value: "accent", label: "Accent (light)" },
  { value: "destructive", label: "Red — urgency" },
  { value: "muted", label: "Muted grey" },
];

const toneClass: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-primary",
  destructive: "bg-destructive text-destructive-foreground",
  muted: "bg-muted text-muted-foreground",
};

/**
 * Live means what the public policy in 0064 means by it: switched on, and
 * inside its run window. Derived here rather than stored, so it cannot go
 * stale the day a promotion ends.
 */
const isLive = (ad: AdRow) => {
  const today = new Date().toISOString().slice(0, 10);
  if (!ad.active) return false;
  if (ad.starts_on && ad.starts_on > today) return false;
  if (ad.ends_on && ad.ends_on < today) return false;
  return true;
};

const Ads = () => {
  const { formatDate } = useFormatters();

  return (
    <SuperLayout title="Advertisements" subtitle="Promotional cards, and where each one is shown">
      <ResourcePage<AdRow> config={{
        storeKey: "ads",
        resource: "ads",
        searchFields: ["title", "body", "badge"],
        columns: [
          {
            key: "image_url", label: "", render: r => (
              <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted/40 border border-border/60 grid place-items-center shrink-0">
                {mediaUrl(r.image_url)
                  ? <img src={mediaUrl(r.image_url) as string} alt="" className="h-full w-full object-cover" />
                  : <span className="text-[10px] text-muted-foreground">No image</span>}
              </div>
            ),
          },
          {
            key: "title", label: "Card", sortable: true, accessor: r => r.title,
            render: r => (
              <div className="min-w-0">
                <p className="font-semibold text-primary truncate">{r.title}</p>
                {r.body && <p className="text-xs text-muted-foreground truncate">{r.body}</p>}
              </div>
            ),
          },
          {
            key: "badge", label: "Badge",
            render: r => (
              r.badge
                ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ${toneClass[r.badge_tone] ?? toneClass.primary}`}>{r.badge}</span>
                : <span className="text-muted-foreground">—</span>
            ),
          },
          { key: "placement", label: "Placement", sortable: true, accessor: r => r.placement, render: r => <span>{placementLabel(r.placement)}</span> },
          { key: "side", label: "Column", sortable: true, accessor: r => r.side, render: r => <span className="capitalize">{r.side}</span> },
          { key: "position", label: "Order", sortable: true, accessor: r => r.position },
          {
            key: "window", label: "Runs",
            render: r => (
              <span className="text-xs text-muted-foreground">
                {r.starts_on || r.ends_on
                  ? `${r.starts_on ? formatDate(r.starts_on) : "—"} → ${r.ends_on ? formatDate(r.ends_on) : "—"}`
                  : "Always"}
              </span>
            ),
          },
          {
            key: "active", label: "Status",
            render: r => (
              isLive(r)
                ? <Pill tone="ok">Live</Pill>
                : <Pill tone={r.active ? "warn" : "bad"}>{r.active ? "Scheduled" : "Off"}</Pill>
            ),
          },
        ],
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
          { name: "body", label: "Description", type: "textarea" },
          { name: "image_url", label: "Image", type: "image", folder: "ads" },
          { name: "placement", label: "Where it appears", type: "select", options: PLACEMENTS },
          { name: "side", label: "Column", type: "select", options: SIDES },
          { name: "position", label: "Order within that column", type: "number", min: 0, max: 99 },
          { name: "badge", label: "Badge text", type: "text" },
          { name: "badge_tone", label: "Badge colour", type: "select", options: TONES },
          { name: "link_url", label: "Link (optional)", type: "text" },
          { name: "starts_on", label: "Starts on (optional)", type: "date" },
          { name: "ends_on", label: "Ends on (optional)", type: "date" },
          {
            name: "active", label: "Switched on", type: "select",
            options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
          },
        ],
      }} />
    </SuperLayout>
  );
};

export default Ads;
