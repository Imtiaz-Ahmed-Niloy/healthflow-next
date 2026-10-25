"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  FlaskConical,
  Microscope,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Plus,
  ArrowRight,
  Flame,
  Search,
  Activity,
  Users,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { INITIAL_ORDERS, INITIAL_ANALYZERS, INITIAL_REAGENTS } from "@/lib/limsStore";
import { SPECIMEN_CONTAINERS } from "@/types/lims";

export default function LabDashboard() {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [analyzers, setAnalyzers] = useState(INITIAL_ANALYZERS);

  // Statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "pending").length;
    const sampleCollected = orders.filter((o) => o.status === "sample_collected").length;
    const processing = orders.filter((o) => o.status === "processing").length;
    const reported = orders.filter((o) => o.status === "reported").length;
    const statOrders = orders.filter((o) => o.priority === "stat").length;
    const criticalValues = orders.filter((o) =>
      o.parameters?.some((p) => p.flag === "critical")
    ).length;

    return { total, pending, sampleCollected, processing, reported, statOrders, criticalValues };
  }, [orders]);

  // Urgent STAT & Critical queue
  const urgentQueue = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.priority === "stat" || o.priority === "urgent" || o.parameters?.some((p) => p.flag === "critical")) &&
          o.status !== "reported"
      ),
    [orders]
  );

  return (
    <LabLayout
      title="Laboratory Information Management System"
      subtitle="Central Diagnostic Pathology & Clinical Biochemistry Operations"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/lab/orders"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New Test Request
          </Link>
          <Link
            href="/lab/samples"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-card border border-border/80 hover:bg-muted text-foreground transition"
          >
            <FlaskConical className="h-3.5 w-3.5 text-emerald-500" />
            Phlebotomy Station
          </Link>
        </div>
      }
    >
      {/* Critical STAT Alert Banner if any critical or stat tests pending */}
      {urgentQueue.length > 0 && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-destructive text-destructive-foreground animate-pulse mt-0.5">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm text-destructive">
                  High-Priority STAT Queue & Critical Alerts ({urgentQueue.length})
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {urgentQueue[0].patient_name} ({urgentQueue[0].test_name}) requires immediate clinical verification.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/lab/results"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition"
            >
              Review Results
            </Link>
            <Link
              href="/lab/orders"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-card border border-border hover:bg-muted text-foreground transition"
            >
              View Worklist
            </Link>
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Today */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Requisitions</span>
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-foreground">{stats.total}</div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +18% vs yesterday
          </div>
        </div>

        {/* Pending Collection */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Awaiting Sample</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-amber-600 dark:text-amber-400">
            {stats.pending}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Phlebotomy desk</div>
        </div>

        {/* Sample Collected */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Accessioned</span>
            <FlaskConical className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-sky-600 dark:text-sky-400">
            {stats.sampleCollected}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Ready for bench</div>
        </div>

        {/* In Processing */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">On Analyzers</span>
            <Activity className="h-4 w-4 text-purple-500 animate-spin" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-purple-600 dark:text-purple-400">
            {stats.processing}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Running batch</div>
        </div>

        {/* Critical Flags */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Critical Values</span>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-destructive">
            {stats.criticalValues}
          </div>
          <div className="mt-1 text-[11px] text-destructive/80 font-medium">Panic range alerts</div>
        </div>

        {/* Completed Today */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Reported</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            {stats.reported}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">Signed & dispatched</div>
        </div>
      </div>

      {/* Main Grid: Worklist Feed & Quick Stations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Order Stream */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-base text-foreground">Live Laboratory Worklist</h3>
                <p className="text-xs text-muted-foreground">Active diagnostic requisitions in flight</p>
              </div>
              <Link
                href="/lab/orders"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View all worklist <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="pb-3 font-semibold">REF #</th>
                    <th className="pb-3 font-semibold">PATIENT</th>
                    <th className="pb-3 font-semibold">TEST NAME</th>
                    <th className="pb-3 font-semibold">SPECIMEN</th>
                    <th className="pb-3 font-semibold">PRIORITY</th>
                    <th className="pb-3 font-semibold">STATUS</th>
                    <th className="pb-3 text-right font-semibold">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {orders.map((o) => {
                    const container = SPECIMEN_CONTAINERS[o.container_code];
                    return (
                      <tr key={o.id} className="hover:bg-muted/40 transition">
                        <td className="py-3.5 font-mono font-bold text-primary">{o.reference}</td>
                        <td className="py-3.5">
                          <div className="font-medium text-foreground">{o.patient_name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {o.patient_gender}, {o.patient_age} yrs
                          </div>
                        </td>
                        <td className="py-3.5">
                          <div className="font-medium text-foreground">{o.test_name}</div>
                          <div className="text-[11px] text-muted-foreground">{o.category}</div>
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              container?.bgTone || "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: container?.capColor || "#999" }}
                            />
                            {o.sample_type}
                          </span>
                        </td>
                        <td className="py-3.5">
                          {o.priority === "stat" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground animate-pulse">
                              STAT
                            </span>
                          ) : o.priority === "urgent" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Urgent
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                              Routine
                            </span>
                          )}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              o.status === "reported"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : o.status === "processing"
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                : o.status === "sample_collected"
                                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {o.status.replace("_", " ").toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          {o.status === "pending" ? (
                            <Link
                              href="/lab/samples"
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                            >
                              Collect Sample
                            </Link>
                          ) : o.status === "sample_collected" || o.status === "processing" ? (
                            <Link
                              href={`/lab/results?orderId=${o.id}`}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20"
                            >
                              Enter Result
                            </Link>
                          ) : (
                            <Link
                              href={`/lab/reports?orderId=${o.id}`}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-muted hover:bg-muted/80 text-foreground"
                            >
                              View Report
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Phlebotomy Specimen Color Code Guide */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm">
            <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" /> Phlebotomy Tube & Specimen Standards (CLSI)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(SPECIMEN_CONTAINERS).map(([key, c]) => (
                <div
                  key={key}
                  className="p-3 rounded-xl border border-border/60 bg-muted/20 flex items-start gap-2.5"
                >
                  <span
                    className="h-4 w-4 rounded-full mt-0.5 shrink-0 shadow-sm border border-white/20"
                    style={{ backgroundColor: c.capColor }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{c.additive}</p>
                    <p className="text-[10px] text-primary/80 mt-1 font-medium truncate">
                      {c.commonTests.slice(0, 2).join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Instruments Status & Inventory Alerts */}
        <div className="space-y-5">
          {/* Instruments & Analyzers */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-emerald-500" /> Lab Instruments & QC
                </h3>
                <p className="text-[11px] text-muted-foreground">Automated analyzers real-time status</p>
              </div>
              <Link href="/lab/analyzers" className="text-xs font-medium text-primary hover:underline">
                QC logs
              </Link>
            </div>

            <div className="space-y-3">
              {analyzers.map((ana) => (
                <div
                  key={ana.id}
                  className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <p className="font-semibold text-xs text-foreground truncate">{ana.name}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {ana.department} · {ana.dailyTestsRun} tests run today
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      QC: {ana.qcStatus.toUpperCase()}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">{ana.uptimePercent}% uptime</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reagents & Low Stock Notice */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm text-foreground">Reagent Level Alerts</h3>
                <p className="text-[11px] text-muted-foreground">Test kits & consumables monitoring</p>
              </div>
              <Link href="/lab/inventory" className="text-xs font-medium text-primary hover:underline">
                Manage stock
              </Link>
            </div>

            <div className="space-y-2.5">
              {INITIAL_REAGENTS.filter((r) => r.status === "low" || r.status === "critical").map(
                (item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Lot: {item.lotNumber} · Exp: {item.expiryDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {item.stock} {item.unit}
                      </span>
                      <p className="text-[10px] text-destructive font-medium">Reorder needed</p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Quick Navigation Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/lab/tests"
              className="p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition flex flex-col justify-between"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit">
                <FlaskConical className="h-4 w-4" />
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-foreground">Test Directory</p>
                <p className="text-[10px] text-muted-foreground">Tariffs & SOP</p>
              </div>
            </Link>

            <Link
              href="/lab/reports"
              className="p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition flex flex-col justify-between"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 w-fit">
                <FileText className="h-4 w-4" />
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-foreground">Print Reports</p>
                <p className="text-[10px] text-muted-foreground">With letterhead</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </LabLayout>
  );
}
