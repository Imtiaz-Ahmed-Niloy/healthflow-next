"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Volume2,
  Printer,
  QrCode,
  ArrowRight,
  Syringe,
  Sparkles,
  RefreshCw,
  Monitor,
  Check,
  X,
  Phone,
  User,
  ExternalLink,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import {
  getLabQueue,
  saveLabQueue,
  updateQueueItemStatus,
  type LabQueueItem,
} from "@/lib/labQueueStore";
import { QueuePatientDetailsModal } from "@/components/lab/QueuePatientDetailsModal";
import { toast } from "sonner";

export default function LabQueuePage() {
  const [queue, setQueue] = useState<LabQueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [counterFilter, setCounterFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "completed">("active");
  const [tvDisplayMode, setTvDisplayMode] = useState(false);
  const [callingToken, setCallingToken] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<LabQueueItem | null>(null);

  // Sync from localStorage and listen to queue update events
  const refreshQueue = () => {
    setQueue(getLabQueue());
  };

  useEffect(() => {
    refreshQueue();
    const handleUpdate = () => refreshQueue();
    window.addEventListener("lab_queue_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("lab_queue_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Filtered queue items
  const filteredQueue = queue.filter((item) => {
    const matchesSearch =
      item.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.token_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.patient_phone.includes(searchQuery);

    const matchesCounter = counterFilter === "all" || item.counter.includes(counterFilter);

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? item.status === "waiting" || item.status === "called" || item.status === "serving"
        : item.status === "completed";

    return matchesSearch && matchesCounter && matchesStatus;
  });

  // Action: Call Patient (simulates voice / chime call)
  const handleCallPatient = (item: LabQueueItem) => {
    setCallingToken(item.token_no);
    updateQueueItemStatus(item.id, "called");
    refreshQueue();

    // Browser audio speech synthesis if supported
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const speech = new SpeechSynthesisUtterance(
          `Token ${item.token_no}, please proceed to ${item.counter}`
        );
        speech.rate = 0.9;
        window.speechSynthesis.speak(speech);
      } catch {
        // speech synthesis fallback
      }
    }

    toast.info(`Calling Token ${item.token_no}: ${item.patient_name}`, {
      description: `Announced to proceed to ${item.counter}.`,
    });

    setTimeout(() => {
      setCallingToken(null);
    }, 4000);
  };

  // Action: Seat in Chair / Start Draw
  const handleStartServing = (item: LabQueueItem) => {
    updateQueueItemStatus(item.id, "serving", "Phlebotomy Technologist");
    refreshQueue();
    toast.success(`Patient ${item.patient_name} (${item.token_no}) is now seated in collection chair.`);
  };

  // Action: Complete Collection
  const handleCompleteDraw = (item: LabQueueItem) => {
    updateQueueItemStatus(item.id, "completed", "Phlebotomy Technologist");
    refreshQueue();
    toast.success(`Specimen collected for ${item.token_no}!`, {
      description: `${item.total_tubes} vacuum tubes accessioned & transferred to biochemistry/hematology racks.`,
    });
  };

  // Action: Skip / No-show
  const handleSkipPatient = (item: LabQueueItem) => {
    updateQueueItemStatus(item.id, "skipped");
    refreshQueue();
    toast.warning(`Token ${item.token_no} marked as Skipped / No-show.`);
  };

  // Counts
  const waitingCount = queue.filter((q) => q.status === "waiting" || q.status === "called").length;
  const servingCount = queue.filter((q) => q.status === "serving").length;
  const completedToday = queue.filter((q) => q.status === "completed").length;

  // TV / Lounge Display Board View
  if (tvDisplayMode) {
    const activeServing = queue.filter((q) => q.status === "serving" || q.status === "called");
    const upcomingWaiting = queue.filter((q) => q.status === "waiting").slice(0, 6);

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-6 sm:p-10 select-none overflow-hidden">
        {/* Top Lounge Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-primary text-primary-foreground">
              <Syringe className="h-8 w-8" />
            </span>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">HealthFlow Phlebotomy Waiting Hall</h1>
              <p className="text-sm font-semibold text-slate-400">Sample Collection & Token Calling Board</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold font-mono text-emerald-400">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-xs text-slate-400">Live Queue Broadcast</p>
            </div>
            <button
              onClick={() => setTvDisplayMode(false)}
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Big Calling Banner if Active */}
        {callingToken && (
          <div className="mt-6 p-6 rounded-2xl bg-amber-500 text-black flex items-center justify-between animate-bounce shadow-2xl">
            <div className="flex items-center gap-4">
              <Volume2 className="h-10 w-10 animate-pulse" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest">NOW CALLING TOKEN</p>
                <p className="text-5xl font-black font-mono">{callingToken}</p>
              </div>
            </div>
            <p className="text-xl font-bold">Please proceed to assigned Sample Collection Counter</p>
          </div>
        )}

        {/* Counter Calling Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8 flex-1">
          {["Counter 1 (Phlebotomy 1st Fl)", "Counter 2 (Fasting Priority)", "Counter 3 (Special Tests)"].map(
            (counterName, idx) => {
              const currentAtCounter = activeServing.find((q) => q.counter.includes(`Counter ${idx + 1}`));
              return (
                <div
                  key={counterName}
                  className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 flex flex-col justify-between shadow-xl"
                >
                  <div className="border-b border-slate-800 pb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">
                      STATION 0{idx + 1}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">{counterName}</h3>
                  </div>

                  <div className="py-8 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">NOW SERVING</p>
                    {currentAtCounter ? (
                      <div>
                        <p className="text-6xl font-black font-mono text-emerald-400 tracking-tight animate-pulse">
                          {currentAtCounter.token_no}
                        </p>
                        <p className="text-lg font-semibold text-white mt-2 truncate">
                          {currentAtCounter.patient_name}
                        </p>
                        {currentAtCounter.priority === "fasting" && (
                          <span className="mt-2 inline-block px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300">
                            Fasting Patient
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-3xl font-bold text-slate-600 font-mono">— READY —</p>
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-3 text-center text-xs text-slate-500">
                    Phlebotomist on Station
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* Upcoming Next in Line Footer */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">NEXT IN LINE:</span>
            <div className="flex items-center gap-2">
              {upcomingWaiting.length > 0 ? (
                upcomingWaiting.map((item) => (
                  <span
                    key={item.id}
                    className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 font-mono text-sm font-bold text-primary"
                  >
                    {item.token_no}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">No other patients waiting</span>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500">Please have your Billing Money Receipt token ready</p>
        </div>
      </div>
    );
  }

  return (
    <LabLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Phlebotomy Queue & Token Desk</h1>
                <p className="text-sm text-muted-foreground">
                  Real-time patient queue routing from billing to sample collection counters
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setTvDisplayMode(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all shadow-2xs"
            >
              <Monitor className="h-4 w-4 text-primary" />
              Lounge TV Display Board
            </button>
            <Link
              href="/lab/billing"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <ArrowRight className="h-4 w-4" />
              + Bill New Walk-In
            </Link>
          </div>
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Waiting in Lounge</p>
              <p className="text-2xl font-bold mt-1 text-primary">{waitingCount} Patients</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Assigned across 3 counters</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Currently in Chair</p>
              <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{servingCount} Drawing</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Blood / swab extraction</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
              <Syringe className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Completed Today</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{completedToday} Samples</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Accessioned to testing racks</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Average Wait Time</p>
              <p className="text-2xl font-bold mt-1 text-foreground">5.8 Mins</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Target &lt; 8 mins</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Counter Stations Quick Calling Bar */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/70">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="h-4 w-4 text-primary" />
              Active Phlebotomy Stations (Calling Desk)
            </h3>
            <span className="text-[11px] text-muted-foreground">Click "Call Next" to auto-announce next token</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: "Counter 1", name: "Counter 1 (General)", type: "Routine OPD Blood" },
              { id: "Counter 2", name: "Counter 2 (Fasting)", type: "Fasting 10-12h Priority" },
              { id: "Counter 3", name: "Counter 3 (Special)", type: "Pediatric & Cultures" },
            ].map((st) => {
              const active = queue.find((q) => q.counter.includes(st.id) && (q.status === "serving" || q.status === "called"));
              const nextWaiting = queue.find((q) => q.counter.includes(st.id) && q.status === "waiting");

              return (
                <div key={st.id} className="p-3 rounded-lg border border-border/80 bg-muted/20 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-xs text-foreground">{st.name}</span>
                      <p className="text-[10px] text-muted-foreground">{st.type}</p>
                    </div>
                    {active ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse">
                        Serving {active.token_no}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
                        Idle / Ready
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground">
                      Next: <strong className="font-mono text-primary">{nextWaiting ? nextWaiting.token_no : "None"}</strong>
                    </span>
                    <button
                      type="button"
                      disabled={!nextWaiting}
                      onClick={() => nextWaiting && handleCallPatient(nextWaiting)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center gap-1"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      Call Next
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Worklist Table */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            {/* Status tabs */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === "active"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "border border-border bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                Waiting & In-Chair ({waitingCount + servingCount})
              </button>
              <button
                onClick={() => setStatusFilter("completed")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === "completed"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "border border-border bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                Completed Today ({completedToday})
              </button>
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "border border-border bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                All Records ({queue.length})
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search token, name, phone..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={counterFilter}
                onChange={(e) => setCounterFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
              >
                <option value="all">All Stations</option>
                <option value="Counter 1">Counter 1</option>
                <option value="Counter 2">Counter 2 (Fasting)</option>
                <option value="Counter 3">Counter 3</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Token #</th>
                  <th className="py-2.5 px-3">Patient & Demographics</th>
                  <th className="py-2.5 px-3">Investigations & Required Tubes</th>
                  <th className="py-2.5 px-3">Station / Counter</th>
                  <th className="py-2.5 px-3">Time & Priority</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredQueue.map((item) => {
                  const isBeingCalled = callingToken === item.token_no;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isBeingCalled
                          ? "bg-amber-500/15"
                          : item.status === "serving"
                          ? "bg-primary/5"
                          : item.priority === "fasting"
                          ? "bg-amber-500/5"
                          : ""
                      }`}
                    >
                      {/* Token # */}
                      <td className="py-3 px-3 cursor-pointer" onClick={() => setSelectedPatient(item)}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-primary px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors">
                            {item.token_no}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono block mt-1">
                          {item.invoice_no}
                        </span>
                      </td>

                      {/* Patient Details */}
                      <td className="py-3 px-3 cursor-pointer group" onClick={() => setSelectedPatient(item)}>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors underline-offset-2 group-hover:underline">
                            {item.patient_name}
                          </p>
                          <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            Labels & Order →
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {item.patient_gender}, {item.patient_age}y • {item.patient_phone}
                        </p>
                        {item.mrn_number && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            MRN: {item.mrn_number}
                          </span>
                        )}
                      </td>

                      {/* Tests & Required Tubes */}
                      <td className="py-3 px-3 cursor-pointer" onClick={() => setSelectedPatient(item)}>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1">
                            {item.tests.map((t) => (
                              <span
                                key={t.code}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-foreground border border-border"
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Requires: <strong className="text-foreground">{item.total_tubes} vacuum tubes</strong> (
                            {Array.from(new Set(item.tests.map((t) => t.sample_tube))).join(", ")})
                          </p>
                        </div>
                      </td>

                      {/* Assigned Counter */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-foreground">{item.counter}</span>
                        {item.phlebotomist && (
                          <span className="block text-[10px] text-muted-foreground mt-0.5">
                            Staff: {item.phlebotomist}
                          </span>
                        )}
                      </td>

                      {/* Time & Priority */}
                      <td className="py-3 px-3">
                        <span className="text-muted-foreground">{item.created_at}</span>
                        <div className="mt-1">
                          {item.priority === "fasting" && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              <Clock className="h-3 w-3" />
                              Fasting Priority
                            </span>
                          )}
                          {item.priority === "stat" && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 animate-pulse">
                              <Flame className="h-3 w-3" />
                              STAT / Urgent
                            </span>
                          )}
                          {item.priority === "elderly" && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300">
                              Elderly / Senior
                            </span>
                          )}
                          {item.priority === "routine" && (
                            <span className="text-[10px] text-muted-foreground">Routine</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === "completed"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : item.status === "serving"
                              ? "bg-primary/15 text-primary"
                              : item.status === "called"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse"
                              : item.status === "skipped"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {item.status === "serving" ? "In Chair" : item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedPatient(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all shadow-2xs"
                            title="Open Details, Test Ordering & Barcodes"
                          >
                            <QrCode className="h-3.5 w-3.5 text-primary" />
                            <span className="hidden sm:inline">Labels</span>
                          </button>

                          {item.status === "waiting" && (
                            <button
                              type="button"
                              onClick={() => handleCallPatient(item)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1"
                            >
                              <Volume2 className="h-3 w-3" />
                              Call
                            </button>
                          )}

                          {item.status === "called" && (
                            <button
                              type="button"
                              onClick={() => handleStartServing(item)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-all flex items-center gap-1"
                            >
                              <Syringe className="h-3 w-3" />
                              Seat in Chair
                            </button>
                          )}

                          {item.status === "serving" && (
                            <button
                              type="button"
                              onClick={() => handleCompleteDraw(item)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Mark Collected
                            </button>
                          )}

                          {item.status !== "completed" && item.status !== "skipped" && (
                            <button
                              type="button"
                              onClick={() => handleSkipPatient(item)}
                              className="p-1 text-muted-foreground hover:text-red-500 rounded"
                              title="Skip / No-Show"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}

                          {item.status === "completed" && (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Collected
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredQueue.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                      No patients matching queue filter. New bills will automatically queue here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Patient Details, Test Ordering & Barcode Label Modal */}
        <QueuePatientDetailsModal
          patient={selectedPatient}
          open={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onUpdatePatient={(updated) => {
            setSelectedPatient(updated);
            refreshQueue();
          }}
          onCallPatient={handleCallPatient}
          onSeatInChair={handleStartServing}
          onCompleteCollection={handleCompleteDraw}
        />
      </div>
    </LabLayout>
  );
}
