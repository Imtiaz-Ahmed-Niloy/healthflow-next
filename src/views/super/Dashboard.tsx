"use client";

import { useTranslations } from "next-intl";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, Kpi, SectionTitle, Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { Building2, Users2, Receipt, AlertCircle } from "lucide-react";
import { ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, CartesianGrid } from "recharts";
import { useGetSuperDashboardQuery } from "@/redux/api/superApi";
import { useFormatters } from "@/lib/appSettings";

const STATUSES = ["pending", "approved", "suspended"] as const;

const Dashboard = () => {
  const t = useTranslations("super.dashboard");
  const { formatCurrency } = useFormatters();
  const statusLabel = (value: string) =>
    (STATUSES as readonly string[]).includes(value) ? t(`statuses.${value as (typeof STATUSES)[number]}`) : value;
  const { data, isLoading, error, refetch } = useGetSuperDashboardQuery();
  const stats = data?.data;

  return (
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">{t("loadFailed")}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full border border-destructive/20 bg-background px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            {t("retry")}
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi
          icon={Building2}
          label={t("kpis.hospitals")}
          value={isLoading ? "—" : (stats?.hospitals.approved ?? 0).toLocaleString()}
        />
        <Kpi
          icon={Users2}
          label={t("kpis.users")}
          value={isLoading ? "—" : (stats?.users ?? 0).toLocaleString()}
          tone="accent"
        />
        <Kpi
          icon={Receipt}
          label={t("kpis.mrr")}
          value={isLoading ? "—" : formatCurrency(stats?.mrr ?? 0)}
          tone="chip"
        />
      </div>

      <Card className="p-5 mt-6">
        <SectionTitle title={t("plans")} />
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            {t("loadingChart")}
          </div>
        ) : !stats?.plans?.length ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            {t("noPlans")}
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.plans}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="hospitals" name={t("hospitals")} fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5 mt-6">
        <SectionTitle title={t("recent")} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
              <tr>
                <th className="py-2">{t("columns.hospital")}</th>
                <th>{t("columns.plan")}</th>
                <th>{t("columns.users")}</th>
                <th>{t("columns.status")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    {t("loadingRecent")}
                  </td>
                </tr>
              ) : !stats?.recent?.length ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    {t("noRecent")}
                  </td>
                </tr>
              ) : (
                stats.recent.map((tenant) => (
                  <tr key={tenant.id} className="border-t border-border/40">
                    <td className="py-3 font-semibold text-primary">{tenant.name}</td>
                    <td>{tenant.plan || "—"}</td>
                    <td>{tenant.users.toLocaleString()}</td>
                    <td>
                      <Pill tone={statusTone(tenant.status)}>
                        {statusLabel(tenant.status)}
                      </Pill>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </SuperLayout>
  );
};

export default Dashboard;
