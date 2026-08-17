"use client";

import { motion } from "framer-motion";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Kpi, SectionTitle, Pill, Btn } from "@/components/admin/ui";
import {
  Users, Stethoscope, BedDouble, HeartPulse, DollarSign, Pill as PillIcon, FlaskConical, Siren,
  AlertTriangle, BellDot, Calendar, Activity, Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const admissions = [
  { d: "Mon", in: 42, out: 31 }, { d: "Tue", in: 55, out: 39 }, { d: "Wed", in: 48, out: 44 },
  { d: "Thu", in: 61, out: 50 }, { d: "Fri", in: 72, out: 58 }, { d: "Sat", in: 65, out: 60 }, { d: "Sun", in: 58, out: 49 },
];
const dept = [
  { name: "Cardio", v: 92 }, { name: "Neuro", v: 78 }, { name: "Ortho", v: 84 },
  { name: "Pedia", v: 70 }, { name: "Onco", v: 65 }, { name: "Gen", v: 88 },
];
const revenue = [
  { name: "OPD", value: 38 }, { name: "IPD", value: 42 }, { name: "Lab", value: 12 }, { name: "Pharmacy", value: 8 },
];
const COLORS = ["hsl(var(--primary))", "hsl(var(--primary-glow))", "hsl(var(--accent))", "hsl(var(--chip))"];

const heatmap = Array.from({ length: 6 }, (_, f) =>
  Array.from({ length: 12 }, (_, b) => ({
    f,
    b,
    v: (f * 17 + b * 11 + 23) % 101,
  }))
).flat();

const Dashboard = () => (
  <AdminLayout title="Executive Dashboard" subtitle="Real-time hospital operations overview">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Kpi icon={Users} label="Total Patients" value="3,482" trend="+8.4%" />
      <Kpi icon={Stethoscope} label="Active Doctors" value="142" trend="+3" tone="accent" />
      <Kpi icon={BedDouble} label="Available Beds" value="86 / 420" tone="chip" />
      <Kpi icon={HeartPulse} label="ICU Occupancy" value="84%" trend="+2%" tone="destructive" />
      <Kpi icon={DollarSign} label="Daily Revenue" value="$142,580" trend="+12%" />
      <Kpi icon={PillIcon} label="Pharmacy Sales" value="$28,940" tone="accent" />
      <Kpi icon={FlaskConical} label="Pending Lab Reports" value="47" tone="chip" />
      <Kpi icon={Siren} label="Emergency Cases" value="12" trend="Live" tone="destructive" />
    </div>

    <div className="grid lg:grid-cols-3 gap-4 mt-6">
      <Card className="p-5 lg:col-span-2">
        <SectionTitle title="Patient Admission Trends" action={<Pill tone="info">Last 7 days</Pill>} />
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={admissions}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Area type="monotone" dataKey="in" stroke="hsl(var(--primary))" fill="url(#g1)" />
              <Area type="monotone" dataKey="out" stroke="hsl(var(--accent-foreground))" fill="url(#g2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Revenue Mix" />
        <div className="h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={revenue} dataKey="value" innerRadius={50} outerRadius={85} paddingAngle={3}>
                {revenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <SectionTitle title="Department Performance" />
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={dept}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Bar dataKey="v" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Bed Occupancy Heatmap" />
        <div className="grid grid-cols-12 gap-1">
          {heatmap.map((c, i) => (
            <div key={i} title={`F${c.f + 1} B${c.b + 1}: ${c.v}%`}
              className="aspect-square rounded"
              style={{ background: `hsl(158 55% ${Math.max(20, 90 - c.v * 0.65)}%)` }} />
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] tracking-widest mt-3 text-muted-foreground">
          <span>LOW</span><span>OCCUPANCY</span><span>HIGH</span>
        </div>
      </Card>
    </div>

    <div className="grid lg:grid-cols-3 gap-4 mt-6">
      <Card className="p-5">
        <SectionTitle title="Emergency Alerts" action={<Pill tone="bad">Live</Pill>} />
        <ul className="space-y-3">
          {([
            { t: "Code Blue — ICU 3", s: "1m ago", tone: "bad" },
            { t: "Trauma incoming — ER", s: "4m ago", tone: "warn" },
            { t: "Oxygen low — Ward B", s: "12m ago", tone: "warn" },
          ] as const).map(a => (
            <li key={a.t} className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary">{a.t}</p>
                <p className="text-xs text-muted-foreground">{a.s}</p>
              </div>
              <Pill tone={a.tone}>{a.tone === "bad" ? "Critical" : "High"}</Pill>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Doctor Availability" />
        <ul className="space-y-3">
          {[
            { n: "Dr. Aiden Park", d: "Cardiology", s: "Available" },
            { n: "Dr. Nadia Reyes", d: "Neurology", s: "In Surgery" },
            { n: "Dr. Marcus Lee", d: "Orthopedics", s: "Available" },
            { n: "Dr. Priya Patel", d: "Pediatrics", s: "On Leave" },
          ].map(x => (
            <li key={x.n} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">{x.n}</p>
                <p className="text-xs text-muted-foreground">{x.d}</p>
              </div>
              <Pill tone={x.s === "Available" ? "ok" : x.s === "On Leave" ? "bad" : "warn"}>{x.s}</Pill>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Upcoming Appointments" action={<Calendar className="h-4 w-4 text-muted-foreground" />} />
        <ul className="space-y-3">
          {[
            { t: "10:30", n: "E. Verdant", d: "Consultation" },
            { t: "11:15", n: "M. Okafor", d: "Follow-up" },
            { t: "12:00", n: "S. Tanaka", d: "Lab Review" },
            { t: "14:00", n: "R. Hassan", d: "Surgery prep" },
          ].map(a => (
            <li key={a.t} className="flex items-center gap-3">
              <span className="text-xs font-bold text-primary-glow w-12">{a.t}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary">{a.n}</p>
                <p className="text-xs text-muted-foreground">{a.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>

    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="mt-6 rounded-2xl p-6 bg-gradient-dark text-surface-dark-foreground flex flex-col md:flex-row items-start md:items-center gap-4">
      <div className="h-12 w-12 rounded-2xl bg-white/15 grid place-items-center"><Sparkles className="h-6 w-6" /></div>
      <div className="flex-1">
        <p className="text-[10px] tracking-widest font-bold text-accent">AI INSIGHTS</p>
        <p className="font-display text-xl mt-1">Bed occupancy predicted to peak at 94% on Friday — consider opening overflow ward 3B.</p>
      </div>
      <Btn variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">View forecast</Btn>
    </motion.div>
  </AdminLayout>
);
export default Dashboard;

