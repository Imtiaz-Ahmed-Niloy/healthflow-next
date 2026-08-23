"use client";

import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, Kpi, SectionTitle, Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { Building2, Users2, Receipt, AlertCircle } from "lucide-react";
import { ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, CartesianGrid } from "recharts";
import { useGetSuperDashboardQuery } from "@/redux/api/superApi";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  suspended: "Suspended",
};

const Dashboard = () => {
  const { data, isLoading, error, refetch } = useGetSuperDashboardQuery();
  const stats = data?.data;

  return (
    <SuperLayout title="Super Admin Dashboard" subtitle="Platform-wide tenant & revenue overview">
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">Could not load dashboard data.</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full border border-destructive/20 bg-background px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi
          icon={Building2}
          label="Active Hospitals"
          value={isLoading ? "—" : (stats?.hospitals.approved ?? 0).toLocaleString()}
        />
        <Kpi
          icon={Users2}
          label="Platform Users"
          value={isLoading ? "—" : (stats?.users ?? 0).toLocaleString()}
          tone="accent"
        />
        <Kpi
          icon={Receipt}
          label="MRR"
          value={isLoading ? "—" : `$${(stats?.mrr ?? 0).toLocaleString()}`}
          tone="chip"
        />
      </div>

      <Card className="p-5 mt-6">
        <SectionTitle title="Plan Distribution" />
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            Loading chart…
          </div>
        ) : !stats?.plans?.length ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            No plan data available
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.plans}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="hospitals" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5 mt-6">
        <SectionTitle title="Recent Tenants" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
              <tr>
                <th className="py-2">Hospital</th>
                <th>Plan</th>
                <th>Users</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Loading recent tenants…
                  </td>
                </tr>
              ) : !stats?.recent?.length ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No recent tenants
                  </td>
                </tr>
              ) : (
                stats.recent.map((t) => (
                  <tr key={t.id} className="border-t border-border/40">
                    <td className="py-3 font-semibold text-primary">{t.name}</td>
                    <td>{t.plan || "—"}</td>
                    <td>{t.users.toLocaleString()}</td>
                    <td>
                      <Pill tone={statusTone(t.status)}>
                        {STATUS_LABELS[t.status] ?? t.status}
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
