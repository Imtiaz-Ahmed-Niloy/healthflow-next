"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bot, Boxes, CalendarClock, FileText, RefreshCw, Repeat, Search, Settings, ShieldAlert, Sparkles, type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { StateBlock, usePharmacyCan } from "@/components/pharmacy/ui";
import { Btn, Card, Pill, SectionTitle } from "@/components/admin/ui";
import { Chips } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import { usePharmacyInsightsQuery, usePharmacySettingsQuery, useStockAlertsQuery } from "@/redux/api/pharmacy";

const TABS = ["predictions", "expiry"] as const;

/**
 * What the pharmacy's own numbers suggest doing next.
 *
 * The two lists on this screen are arithmetic, not a model: demand is what
 * sold in the last 30 days, and the expiry plan is the batches in date order.
 * They are here, with the features that do call a model, so that everything
 * "smart" is in one place and each says honestly what it is.
 */
const Page = () => {
  const t = useTranslations("pharmacy.ai");
  const { formatDate } = useFormatters();
  const can = usePharmacyCan();
  const [tab, setTab] = useState<(typeof TABS)[number]>("predictions");
  const { data: settingsData } = usePharmacySettingsQuery();
  const insights = usePharmacyInsightsQuery();
  const alerts = useStockAlertsQuery();

  const settings = settingsData?.data;
  const hasKey = Boolean(settingsData?.ai_configured);
  const forecast = insights.data?.data.forecast ?? [];
  const batches = [...(alerts.data?.data.batches ?? [])].sort((a, b) => a.days_left - b.days_left);

  const features: { key: "interactions" | "assistant" | "predictions" | "expiry" | "substitution" | "search" | "prescription"; icon: LucideIcon; state: "on" | "off" | "needsKey" | "soon"; href?: string }[] = [
    { key: "assistant", icon: Bot, state: !settings?.ai_assistant ? "off" : hasKey ? "on" : "needsKey", href: "/pharmacy/ai-assistant" },
    { key: "interactions", icon: ShieldAlert, state: !settings?.ai_interactions ? "off" : hasKey ? "on" : "needsKey", href: "/pharmacy/pos" },
    { key: "predictions", icon: Boxes, state: settings?.ai_predictions ? "on" : "off" },
    { key: "expiry", icon: CalendarClock, state: settings?.ai_expiry ? "on" : "off" },
    { key: "substitution", icon: Repeat, state: "on", href: "/pharmacy/pos" },
    { key: "search", icon: Search, state: "soon" },
    { key: "prescription", icon: FileText, state: "soon" },
  ];
  const STATE_TONE = { on: "ok", off: "default", needsKey: "warn", soon: "info" } as const;

  const refresh = () => { insights.refetch(); alerts.refetch(); };
  const busy = insights.isFetching || alerts.isFetching;

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")}
      actions={<>
        <Btn variant="outline" onClick={refresh} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> {t("run")}</Btn>
        {can("administer") && <Link href="/pharmacy/ai-settings"><Btn variant="outline"><Settings className="h-4 w-4" /> {t("goToSettings")}</Btn></Link>}
      </>}>
      <Card className="p-4 lg:p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Chips value={tab} onChange={setTab} options={TABS.map(value => ({ value, label: t(`tabs.${value}`) }))} />
          <p className="text-[11px] text-muted-foreground">{t(tab === "predictions" ? "predictionsHint" : "expiryHint")}</p>
        </div>

        {tab === "predictions" ? (
          settings && !settings.ai_predictions ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("featureOff")}</p>
          ) : insights.isLoading || insights.error || forecast.length === 0 ? (
            <StateBlock loading={insights.isLoading} error={insights.error} onRetry={insights.refetch} empty={t("noPredictions")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">{t("cols.product").toUpperCase()}</th>
                    <th className="py-2 px-3 text-right">{t("cols.stock").toUpperCase()}</th>
                    <th className="py-2 px-3 text-right">{t("cols.daily").toUpperCase()}</th>
                    <th className="py-2 px-3 text-right">{t("cols.daysLeft").toUpperCase()}</th>
                    <th className="py-2 pl-3">{t("cols.action").toUpperCase()}</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map(row => (
                    <tr key={row.item_id} className="border-t border-border/40">
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-primary">{row.name}</p>
                        <p className="text-[11px] text-muted-foreground">{[row.generic_name, row.sku].filter(Boolean).join(" · ")}</p>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{row.stock}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{Number(row.daily).toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{row.days_to_stockout ?? "—"}</td>
                      <td className="py-2.5 pl-3">
                        {row.suggested > 0
                          ? <Pill tone={row.days_to_stockout !== null && row.days_to_stockout < 7 ? "bad" : "warn"}>{t("reorder", { count: row.suggested })}</Pill>
                          : <Pill tone="ok">{row.days_to_stockout === null ? t("noDemand") : t("optimal", { days: row.days_to_stockout })}</Pill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : settings && !settings.ai_expiry ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("featureOff")}</p>
        ) : alerts.isLoading || alerts.error || batches.length === 0 ? (
          <StateBlock loading={alerts.isLoading} error={alerts.error} onRetry={alerts.refetch} empty={t("noExpiry")} />
        ) : (
          <ul className="space-y-2">
            {batches.map(batch => {
              const action = batch.days_left < 0 ? "remove" : batch.days_left <= 30 ? "markdown" : "front";
              return (
                <li key={batch.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">{batch.name} <span className="font-mono text-[11px] font-normal text-muted-foreground">{batch.batch_number}</span></p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("expiryLine", { count: batch.quantity, date: formatDate(batch.expiry_date), shelf: batch.location })}
                      {" · "}{batch.days_left < 0 ? t("expiredAgo", { days: -batch.days_left }) : t("daysLeft", { days: batch.days_left })}
                    </p>
                  </div>
                  <Pill tone={action === "remove" ? "bad" : action === "markdown" ? "warn" : "info"}>{t(`actions.${action}`)}</Pill>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <SectionTitle title={t("featuresTitle")} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {features.map(feature => {
            const body = (
              <div className="h-full rounded-xl border border-border/60 bg-muted/20 p-4 transition hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><feature.icon className="h-4 w-4" /></span>
                  <Pill tone={STATE_TONE[feature.state]}>{t(`states.${feature.state}`)}</Pill>
                </div>
                <p className="mt-3 text-sm font-semibold text-primary">{t(`features.${feature.key}.title`)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t(`features.${feature.key}.body`)}</p>
              </div>
            );
            return feature.href && feature.state === "on"
              ? <Link key={feature.key} href={feature.href}>{body}</Link>
              : <div key={feature.key}>{body}</div>;
          })}
        </div>
        <p className="mt-4 flex items-start gap-1.5 text-[11px] text-muted-foreground"><Sparkles className="h-3.5 w-3.5 shrink-0" /> {t("honesty")}</p>
      </Card>
    </PharmacyLayout>
  );
};

export default Page;
