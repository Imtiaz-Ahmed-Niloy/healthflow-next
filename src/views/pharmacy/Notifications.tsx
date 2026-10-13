"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, BellOff, CalendarClock, CalendarX, CheckCheck, PackageX, RefreshCw, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { StateBlock } from "@/components/pharmacy/ui";
import { usePharmacyAlerts, type AlertKind, type PharmacyAlert } from "@/components/pharmacy/useAlerts";
import { Btn, Card } from "@/components/admin/ui";
import { Chips } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";

const KIND_ICON: Record<AlertKind, LucideIcon> = {
  out_of_stock: PackageX, low_stock: AlertTriangle, expired: CalendarX, expiring_soon: CalendarClock,
};
const KIND_STYLE: Record<AlertKind, string> = {
  out_of_stock: "bg-destructive/10 text-destructive", expired: "bg-destructive/10 text-destructive",
  low_stock: "bg-yellow-100 text-yellow-800", expiring_soon: "bg-yellow-100 text-yellow-800",
};
const FILTERS = ["all", "unread", "out_of_stock", "low_stock", "expiring_soon", "expired"] as const;

const Page = () => {
  const t = useTranslations("pharmacy.notifications");
  const ta = useTranslations("pharmacy.alerts.kinds");
  const { formatDate } = useFormatters();
  const { alerts, unreadCount, isRead, markRead, markAllRead, isLoading, isFetching, error, refetch } = usePharmacyAlerts();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const shown = alerts.filter(alert => filter === "all" || (filter === "unread" ? !isRead(alert.id) : alert.kind === filter));

  const describe = (alert: PharmacyAlert) =>
    alert.kind === "out_of_stock" ? t("body.out_of_stock")
    : alert.kind === "low_stock" ? t("body.low_stock", { count: alert.quantity, reorder: alert.reorder ?? 0 })
    : alert.kind === "expired" ? t("body.expired", { batch: alert.batch_number ?? "", count: alert.quantity, date: alert.expiry_date ? formatDate(alert.expiry_date) : "" })
    : t("body.expiring_soon", { batch: alert.batch_number ?? "", days: alert.days_left ?? 0, count: alert.quantity });

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")}
      actions={<>
        <Btn variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> {t("scanNow")}
        </Btn>
        <Btn variant="outline" onClick={markAllRead} disabled={unreadCount === 0}><CheckCheck className="h-4 w-4" /> {t("markAllRead")}</Btn>
      </>}>
      <Card className="p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <Chips value={filter} onChange={setFilter}
            options={FILTERS.map(value => ({ value, label: value === "all" ? t("all") : value === "unread" ? t("unread", { count: unreadCount }) : ta(value) }))} />
          <p className="text-xs text-muted-foreground">{t("count", { count: alerts.length })}</p>
        </div>

        {isLoading || error ? (
          <StateBlock loading={isLoading} error={error} onRetry={refetch} />
        ) : shown.length === 0 ? (
          <div className="py-12 text-center">
            <BellOff className="h-9 w-9 mx-auto text-muted-foreground/60" />
            <p className="mt-3 font-display text-xl text-primary">{alerts.length === 0 ? t("noneTitle") : t("noneFiltered")}</p>
            {alerts.length === 0 && <p className="mt-1 text-sm text-muted-foreground">{t("noneHint")}</p>}
          </div>
        ) : (
          <ul className="space-y-2">
            {shown.map(alert => {
              const Icon = KIND_ICON[alert.kind];
              const seen = isRead(alert.id);
              return (
                <li key={alert.id}>
                  <Link href={alert.href} onClick={() => markRead(alert.id)}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition hover:border-primary/50 ${seen ? "border-border/50 bg-card" : "border-primary/20 bg-accent/20"}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${KIND_STYLE[alert.kind]}`}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm text-primary ${seen ? "font-medium" : "font-bold"}`}>{ta(alert.kind)} · {alert.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{alert.sku}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{describe(alert)}</span>
                    </span>
                    {!seen && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={t("unreadDot")} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-[11px] text-muted-foreground">{t("hint")}</p>
      </Card>
    </PharmacyLayout>
  );
};

export default Page;
