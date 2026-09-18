"use client";

import { useTranslations } from "next-intl";
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
 *
 * A card's own title, body and badge are what the super admin typed, and
 * show as typed.
 */

/** Mirrors public.ad_placement (0065). */
const PLACEMENTS = ["signin"] as const;

const SIDES = ["left", "right"] as const;

/** Matches the pill colours the sign-in page can draw. */
const TONES = ["primary", "accent", "destructive", "muted"] as const;

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
  const t = useTranslations("super.ads");
  const { formatDate } = useFormatters();
  const placementLabel = (value: string) =>
    (PLACEMENTS as readonly string[]).includes(value) ? t(`placements.${value as (typeof PLACEMENTS)[number]}`) : value;
  const sideLabel = (value: string) =>
    (SIDES as readonly string[]).includes(value) ? t(`sides.${value as (typeof SIDES)[number]}`) : value;

  return (
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
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
                  : <span className="text-[10px] text-muted-foreground">{t("noImage")}</span>}
              </div>
            ),
          },
          {
            key: "title", label: t("columns.card"), sortable: true, accessor: r => r.title,
            render: r => (
              <div className="min-w-0">
                <p className="font-semibold text-primary truncate">{r.title}</p>
                {r.body && <p className="text-xs text-muted-foreground truncate">{r.body}</p>}
              </div>
            ),
          },
          {
            key: "badge", label: t("columns.badge"),
            render: r => (
              r.badge
                ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ${toneClass[r.badge_tone] ?? toneClass.primary}`}>{r.badge}</span>
                : <span className="text-muted-foreground">—</span>
            ),
          },
          { key: "placement", label: t("columns.placement"), sortable: true, accessor: r => r.placement, render: r => <span>{placementLabel(r.placement)}</span> },
          { key: "side", label: t("columns.column"), sortable: true, accessor: r => r.side, render: r => <span>{sideLabel(r.side)}</span> },
          { key: "position", label: t("columns.order"), sortable: true, accessor: r => r.position },
          {
            key: "window", label: t("columns.runs"),
            render: r => (
              <span className="text-xs text-muted-foreground">
                {r.starts_on || r.ends_on
                  ? `${r.starts_on ? formatDate(r.starts_on) : "—"} → ${r.ends_on ? formatDate(r.ends_on) : "—"}`
                  : t("always")}
              </span>
            ),
          },
          {
            key: "active", label: t("columns.status"),
            render: r => (
              isLive(r)
                ? <Pill tone="ok">{t("live")}</Pill>
                : <Pill tone={r.active ? "warn" : "bad"}>{r.active ? t("scheduled") : t("off")}</Pill>
            ),
          },
        ],
        fields: [
          { name: "title", label: t("fields.title"), type: "text", required: true },
          { name: "body", label: t("fields.body"), type: "textarea" },
          { name: "image_url", label: t("fields.image"), type: "image", folder: "ads" },
          { name: "placement", label: t("fields.placement"), type: "select", options: PLACEMENTS.map(value => ({ value, label: placementLabel(value) })) },
          { name: "side", label: t("columns.column"), type: "select", options: SIDES.map(value => ({ value, label: t(`sideOptions.${value}`) })) },
          { name: "position", label: t("fields.position"), type: "number", min: 0, max: 99 },
          { name: "badge", label: t("fields.badge"), type: "text" },
          { name: "badge_tone", label: t("fields.badgeTone"), type: "select", options: TONES.map(value => ({ value, label: t(`tones.${value}`) })) },
          { name: "link_url", label: t("fields.link"), type: "text" },
          { name: "starts_on", label: t("fields.startsOn"), type: "date" },
          { name: "ends_on", label: t("fields.endsOn"), type: "date" },
          {
            name: "active", label: t("fields.active"), type: "select",
            options: [{ value: "true", label: t("fields.yes") }, { value: "false", label: t("fields.no") }],
          },
        ],
      }} />
    </SuperLayout>
  );
};

export default Ads;
