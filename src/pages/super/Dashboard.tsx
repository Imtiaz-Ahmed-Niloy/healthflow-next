"use client";

import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, Kpi, SectionTitle, Pill } from "@/components/admin/ui";
import { Building2, Users2, Receipt, Activity, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, CartesianGrid } from "recharts";

const revenue = [
  { m: "Jan", v: 124 }, { m: "Feb", v: 142 }, { m: "Mar", v: 168 },
  { m: "Apr", v: 191 }, { m: "May", v: 215 }, { m: "Jun", v: 248 },
];
const tenants = [
  { t: "Greenfield Hospital", plan: "Enterprise", users: 412, status: "Active" },
  { t: "Sunrise Clinic Group", plan: "Pro", users: 187, status: "Active" },
  { t: "Metro Diagnostics", plan: "Pro", users: 96, status: "Trial" },
  { t: "Wellbeing Centre", plan: "Starter", users: 24, status: "Suspended" },
];

const Dashboard = () => (
  <SuperLayout title="Super Admin Dashboard" subtitle="Platform-wide tenant & revenue overview">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Kpi icon={Building2} label="Active Hospitals" value="48" trend="+6 this qtr" />
      <Kpi icon={Users2} label="Platform Users" value="12,847" trend="+8.2%" tone="accent" />
      <Kpi icon={Receipt} label="MRR" value="$248K" trend="+15%" tone="chip" />
      <Kpi icon={Activity} label="Uptime" value="99.98%" tone="accent" />
    </div>

    <div className="grid lg:grid-cols-3 gap-4 mt-6">
      <Card className="p-5 lg:col-span-2">
        <SectionTitle title="Recurring Revenue (K USD)" action={<Pill tone="ok"><TrendingUp className="h-3 w-3 mr-1" />Trending up</Pill>} />
        <div className="h-64">
          <ResponsiveContainer><AreaChart data={revenue}>
            <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="m" /><YAxis /><Tooltip />
            <Area dataKey="v" stroke="hsl(var(--primary))" fill="url(#rg)" />
          </AreaChart></ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Plan Distribution" />
        <div className="h-64">
          <ResponsiveContainer><BarChart data={[
            { p: "Starter", v: 12 }, { p: "Pro", v: 22 }, { p: "Enterprise", v: 14 },
          ]}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="p" /><YAxis /><Tooltip />
            <Bar dataKey="v" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart></ResponsiveContainer>
        </div>
      </Card>
    </div>

    <Card className="p-5 mt-6">
      <SectionTitle title="Recent Tenants" />
      <table className="w-full text-sm">
        <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
          <tr><th className="py-2">Hospital</th><th>Plan</th><th>Users</th><th>Status</th></tr>
        </thead>
        <tbody>
          {tenants.map(t => (
            <tr key={t.t} className="border-t border-border/40">
              <td className="py-3 font-semibold text-primary">{t.t}</td>
              <td>{t.plan}</td>
              <td>{t.users}</td>
              <td><Pill tone={t.status === "Active" ? "ok" : t.status === "Trial" ? "info" : "bad"}>{t.status}</Pill></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </SuperLayout>
);
export default Dashboard;

