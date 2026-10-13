"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Banknote, Pill as PillIcon, TrendingUp, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StaffManager } from "@/components/pharmacy/StaffManager";
import { Btn, Card, Kpi } from "@/components/admin/ui";
import { useFormatters } from "@/lib/appSettings";
import { usePharmacyDashboardQuery } from "@/redux/api/pharmacy";

/**
 * The hospital admin's view of the pharmacy.
 *
 * The pharmacy runs from its own panel (/pharmacy), which this page links to.
 * What stays here is the part that has to start with the admin: deciding who
 * can sign in to that panel and what each of them may do. It is the same staff
 * list the pharmacy's own Staff screen shows — a pharmacy manager can keep it
 * from there once one exists, and the first one is made here.
 */
const Page = () => {
  const t = useTranslations("admin.pharmacy");
  const { formatCurrency } = useFormatters();
  const { data: board } = usePharmacyDashboardQuery();
  const d = board?.data;

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <Card className="p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary grid place-items-center shrink-0"><PillIcon className="h-6 w-6" /></div>
          <p className="text-sm text-muted-foreground max-w-xl">{t("panelHint")}</p>
        </div>
        <Link href="/pharmacy/dashboard"><Btn>{t("openPanel")} <ArrowRight className="h-4 w-4" /></Btn></Link>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Banknote} label={t("stats.todaySales")} value={d ? formatCurrency(Number(d.today.revenue)) : "—"} />
        <Kpi icon={TrendingUp} label={t("stats.monthSales")} value={d ? formatCurrency(Number(d.month.revenue)) : "—"} />
        <Kpi icon={AlertTriangle} label={t("stats.lowStock")} value={d ? String(d.alerts.low_stock + d.alerts.out_of_stock) : "—"}
          tone={d && d.alerts.low_stock + d.alerts.out_of_stock > 0 ? "destructive" : "primary"} />
        <Kpi icon={Wallet} label={t("stats.owed")} value={d ? formatCurrency(Number(d.customers.balance_due)) : "—"} />
      </div>

      <StaffManager title={t("staff.title")} note={t("staff.signInAt")} />
    </AdminLayout>
  );
};

export default Page;
