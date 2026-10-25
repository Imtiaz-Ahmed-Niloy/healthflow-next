"use client";

import React, { useState } from "react";
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Wrench,
  RefreshCw,
  FileCheck2,
  Calendar,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { INITIAL_ANALYZERS, LabAnalyzer } from "@/lib/limsStore";
import { toast } from "sonner";

export default function LabAnalyzersView() {
  const [analyzers, setAnalyzers] = useState<LabAnalyzer[]>(INITIAL_ANALYZERS);
  const [selectedAnalyzer, setSelectedAnalyzer] = useState<LabAnalyzer>(analyzers[0]);

  const handleRunQc = (id: string) => {
    setAnalyzers((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          qcStatus: "passed",
          lastCalibration: "Just now",
        };
      })
    );
    toast.success(`Levey-Jennings 3-Level QC passed for ${selectedAnalyzer.name}!`);
  };

  return (
    <LabLayout
      title="Instruments & Quality Control (QC)"
      subtitle="Automated clinical analyzer interfaces, daily Levey-Jennings QC runs & preventative maintenance"
    >
      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Online Instruments</span>
            <Cpu className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            {analyzers.filter((a) => a.status === "online").length} / {analyzers.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Bi-directional LIS connected</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>QC Compliance</span>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-primary">100%</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">All instruments passed QC</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Tests Run Today</span>
            <Activity className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-foreground">
            {analyzers.reduce((acc, a) => acc + a.dailyTestsRun, 0)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Automated samples processed</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Fleet Uptime</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-foreground">99.5%</div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Zero unplanned downtime</p>
        </div>
      </div>

      {/* Main Analyzer Grid & Selected Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Analyzer List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
            Connected Equipment ({analyzers.length})
          </h3>
          <div className="space-y-3">
            {analyzers.map((ana) => {
              const isSelected = ana.id === selectedAnalyzer.id;
              return (
                <div
                  key={ana.id}
                  onClick={() => setSelectedAnalyzer(ana)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    isSelected
                      ? "bg-primary/10 border-primary shadow-sm"
                      : "bg-card border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className="font-bold text-sm text-foreground">{ana.name}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      QC: {ana.qcStatus.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">{ana.model}</p>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-[11px]">
                    <span className="text-muted-foreground">{ana.department}</span>
                    <span className="font-semibold text-foreground">{ana.dailyTestsRun} tests today</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Cols: Selected Analyzer QC & Diagnostics Monitor */}
        <div className="lg:col-span-2 space-y-5">
          <div className="p-6 rounded-2xl bg-card border border-border/70 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-display font-bold text-lg text-foreground">
                    {selectedAnalyzer.name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    ONLINE · READY
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedAnalyzer.model} · {selectedAnalyzer.manufacturer}
                </p>
              </div>

              <button
                onClick={() => handleRunQc(selectedAnalyzer.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Run Levey-Jennings QC
              </button>
            </div>

            {/* Simulated Levey-Jennings Chart Display */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Daily Levey-Jennings QC Graph (±3 SD)
                </h4>
                <span className="text-[11px] text-muted-foreground">Westgard Rules: 1₃ₛ, 2₂ₛ (Passed)</span>
              </div>

              <div className="p-5 rounded-xl bg-muted/30 border border-border/80 space-y-3 font-mono text-xs">
                {/* Visual SD lines */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-dashed border-border/80 pb-1">
                  <span>+3 SD (Reject Limit)</span>
                  <span className="text-destructive font-bold">14.8</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-amber-500/80 border-b border-dashed border-border/80 pb-1">
                  <span>+2 SD (Warning)</span>
                  <span>14.2</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold border-b-2 border-emerald-500/50 pb-1">
                  <span>Target Mean (x̄)</span>
                  <span>13.5 (Normal Control Level 2)</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-amber-500/80 border-b border-dashed border-border/80 pb-1">
                  <span>-2 SD (Warning)</span>
                  <span>12.8</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-dashed border-border/80 pb-1">
                  <span>-3 SD (Reject Limit)</span>
                  <span className="text-destructive font-bold">12.2</span>
                </div>

                {/* Simulated Data Points */}
                <div className="flex items-center justify-between pt-2 text-[11px] text-foreground font-sans">
                  <span>Today&apos;s Run: <strong>13.6</strong> (Diff: +0.07 SD)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Within Control Target
                  </span>
                </div>
              </div>
            </div>

            {/* Maintenance & Calibration Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-card border border-border/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
                  <Calendar className="h-4 w-4 text-primary" /> Calibration Schedule
                </div>
                <p className="text-xs text-muted-foreground">
                  Last Performed: <strong className="text-foreground">{selectedAnalyzer.lastCalibration}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Next Due: <strong className="text-foreground">Tomorrow, 06:00 AM</strong>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
                  <Wrench className="h-4 w-4 text-emerald-500" /> Preventative Maintenance
                </div>
                <p className="text-xs text-muted-foreground">
                  Daily Cycle Wash: <strong className="text-emerald-600 dark:text-emerald-400">Completed</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Optics Check: <strong className="text-foreground">In 14 Days</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LabLayout>
  );
}
