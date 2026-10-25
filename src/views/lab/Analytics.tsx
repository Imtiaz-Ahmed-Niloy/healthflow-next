"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  Filter,
  Download,
  Printer,
  ShieldCheck,
  Building2,
  Users,
  FlaskConical,
  XCircle,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { toast } from "sonner";

interface TatMetric {
  department: string;
  target_mins: number;
  avg_tat_mins: number;
  stat_target_mins: number;
  avg_stat_mins: number;
  on_time_pct: number;
  total_tests: number;
}

const DEPARTMENT_TATS: TatMetric[] = [
  {
    department: "Hematology (CBC, Coagulation)",
    target_mins: 90,
    avg_tat_mins: 64,
    stat_target_mins: 40,
    avg_stat_mins: 28,
    on_time_pct: 96.4,
    total_tests: 1420,
  },
  {
    department: "Clinical Biochemistry (KFT, LFT, Lipid)",
    target_mins: 150,
    avg_tat_mins: 118,
    stat_target_mins: 50,
    avg_stat_mins: 42,
    on_time_pct: 93.8,
    total_tests: 2890,
  },
  {
    department: "Immunology & Hormones (Thyroid, Ferritin)",
    target_mins: 240,
    avg_tat_mins: 195,
    stat_target_mins: 75,
    avg_stat_mins: 60,
    on_time_pct: 91.2,
    total_tests: 810,
  },
  {
    department: "Clinical Pathology & Urinalysis",
    target_mins: 60,
    avg_tat_mins: 45,
    stat_target_mins: 30,
    avg_stat_mins: 22,
    on_time_pct: 98.1,
    total_tests: 950,
  },
  {
    department: "Microbiology (Direct Staining / Smear)",
    target_mins: 120,
    avg_tat_mins: 92,
    stat_target_mins: 45,
    avg_stat_mins: 35,
    on_time_pct: 94.7,
    total_tests: 340,
  },
];

const REJECTION_REASONS = [
  { reason: "Hemolyzed Sample (In-vitro lysis)", count: 24, pct: 45, color: "bg-red-500" },
  { reason: "Clotted Specimen (EDTA tube)", count: 14, pct: 26, color: "bg-amber-500" },
  { reason: "Insufficient Volume (QNS)", count: 9, pct: 17, color: "bg-blue-500" },
  { reason: "Barcode Unreadable / Mislabeled", count: 4, pct: 8, color: "bg-purple-500" },
  { reason: "Wrong Container / Tube Type", count: 2, pct: 4, color: "bg-slate-400" },
];

export default function LabAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");

  return (
    <LabLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <BarChart3 className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">TAT & Quality Analytics (ISO 15189)</h1>
                <p className="text-sm text-muted-foreground">
                  Turnaround time benchmarks, sample rejection indexes, and laboratory operational throughput
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background focus:outline-none"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">This Quarter</option>
              <option value="1y">Year to Date</option>
            </select>
            <button
              onClick={() => {
                toast.success("Exporting ISO 15189 Quality & TAT Compliance Report PDF...");
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <Download className="h-4 w-4" />
              Export Quality Report
            </button>
          </div>
        </div>

        {/* Top Key Performance Indicators (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Routine Avg TAT</p>
              <span className="flex items-center text-[11px] font-bold text-emerald-600">
                <TrendingDown className="h-3 w-3 mr-0.5" /> -12m vs target
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">1h 38m</p>
            <p className="text-[11px] text-muted-foreground">Phlebotomy collection to validated signoff</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-semibold uppercase">STAT / Emergency TAT</p>
              <span className="flex items-center text-[11px] font-bold text-emerald-600">
                <CheckCircle2 className="h-3 w-3 mr-0.5" /> 97.2% On-Time
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">34 Mins</p>
            <p className="text-[11px] text-muted-foreground">Standard threshold &lt; 45 mins</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Specimen Rejection Rate</p>
              <span className="flex items-center text-[11px] font-bold text-emerald-600">
                <TrendingDown className="h-3 w-3 mr-0.5" /> 0.8%
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">53 Rejected</p>
            <p className="text-[11px] text-muted-foreground">Out of 6,410 total collected tubes</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Monthly Diagnostic Tests</p>
              <span className="flex items-center text-[11px] font-bold text-primary">
                <TrendingUp className="h-3 w-3 mr-0.5" /> +14.2% YoY
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">6,410 Tests</p>
            <p className="text-[11px] text-muted-foreground">Across all 5 clinical sections</p>
          </div>
        </div>

        {/* Department Turnaround Breakdown Table */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="font-bold text-base text-foreground">Department Turnaround Time (TAT) Performance</h3>
              <p className="text-xs text-muted-foreground">
                Actual vs Target turnaround time metrics across individual laboratory disciplines
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Overall Lab On-Time: 94.8%
            </span>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Laboratory Section</th>
                  <th className="py-2.5 px-3">Monthly Volume</th>
                  <th className="py-2.5 px-3">Routine Target</th>
                  <th className="py-2.5 px-3">Actual Routine TAT</th>
                  <th className="py-2.5 px-3">STAT Target</th>
                  <th className="py-2.5 px-3">Actual STAT TAT</th>
                  <th className="py-2.5 px-3 text-right">On-Time %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {DEPARTMENT_TATS.map((d) => (
                  <tr key={d.department} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-3 font-semibold text-foreground">{d.department}</td>
                    <td className="py-3 px-3 font-mono font-medium">{d.total_tests.toLocaleString()} tests</td>
                    <td className="py-3 px-3 text-muted-foreground">{d.target_mins} mins</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-foreground">{d.avg_tat_mins} mins</span>{" "}
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        (-{d.target_mins - d.avg_tat_mins}m)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">{d.stat_target_mins} mins</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-foreground">{d.avg_stat_mins} mins</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${
                              d.on_time_pct >= 95 ? "bg-emerald-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${d.on_time_pct}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-foreground">{d.on_time_pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Specimen Quality & Rejection Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <div className="pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Pre-Analytical Specimen Rejection Root Causes</h3>
              <p className="text-xs text-muted-foreground">
                Distribution of rejected blood and urine tubes required for redraw this month
              </p>
            </div>

            <div className="space-y-3">
              {REJECTION_REASONS.map((item) => (
                <div key={item.reason} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{item.reason}</span>
                    <span className="font-mono text-muted-foreground">
                      {item.count} samples ({item.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3.5 rounded-lg border border-border/70 bg-muted/20 text-xs space-y-1">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Corrective Action & Quality Improvement:
              </p>
              <p className="text-muted-foreground text-[11px]">
                Hemolysis accounts for 45% of rejections. Phlebotomy team training scheduled on needle gauge selection
                and avoiding excessive plunger vacuum during difficult vein draws in ICU & Emergency.
              </p>
            </div>
          </div>

          {/* Phlebotomy Peak Hours Hourly Distribution */}
          <div className="lg:col-span-5 p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <div className="pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Phlebotomy Traffic Hourly Rush</h3>
              <p className="text-xs text-muted-foreground">
                Patient sample arrival distribution across 24-hour cycle
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                { time: "07:00 AM – 09:00 AM", count: 180, pct: 75, label: "Fasting OPD Rush" },
                { time: "09:00 AM – 12:00 PM", count: 240, pct: 100, label: "Peak OPD Influx" },
                { time: "12:00 PM – 03:00 PM", count: 110, pct: 45, label: "Post-Prandial Runs" },
                { time: "03:00 PM – 07:00 PM", count: 95, pct: 40, label: "Evening Consultant Orders" },
                { time: "07:00 PM – 07:00 AM", count: 42, pct: 18, label: "Emergency / Night Shift" },
              ].map((slot) => (
                <div key={slot.time} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{slot.time}</span>
                    <span className="text-[10px] text-muted-foreground">{slot.label} ({slot.count} pts)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${slot.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-muted-foreground">
                Recommended Staffing: 4 Phlebotomists on duty between 08:00 AM – 12:00 PM to maintain wait time &lt; 8 mins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </LabLayout>
  );
}
