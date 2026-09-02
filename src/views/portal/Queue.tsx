"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, Clock, ArrowRightLeft, Plus, SlidersHorizontal, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Priority = "high" | "standard" | "routine";

type ApiQueueEntry = {
  id: string;
  scheduled_time: string; // "10:30:00"
  priority: Priority;
  reason: string | null;
  in_consultation: boolean;
  waited_minutes: number;
  patient: { id: string; full_name: string; date_of_birth: string | null; phone: string | null } | null;
};

type ApiCompletedEntry = {
  id: string;
  scheduled_time: string;
  reason: string | null;
  patient: { id: string; full_name: string; date_of_birth: string | null; phone: string | null } | null;
};

type ApiQueueResponse = {
  queue: ApiQueueEntry[];
  completed: ApiCompletedEntry[];
  stats: { seen: number; remaining: number; total: number; avg_wait_minutes: number };
};

type FilterKey = "ALL" | Priority;
const FILTERS: FilterKey[] = ["ALL", "high", "standard", "routine"];

const priorityMeta: Record<Priority, { label: string; priorityClass: string; dot: string }> = {
  high: { label: "HIGH PRIORITY", priorityClass: "bg-destructive/15 text-destructive", dot: "bg-destructive" },
  standard: { label: "STANDARD", priorityClass: "bg-chip text-primary", dot: "bg-primary-glow" },
  routine: { label: "ROUTINE", priorityClass: "bg-muted text-foreground/60", dot: "bg-muted-foreground" },
};

const formatTime = (t: string) => {
  const [hh, mm] = t.split(":");
  const h = parseInt(hh, 10);
  return `${((h + 11) % 12 + 1)}:${mm} ${h >= 12 ? "PM" : "AM"}`;
};

const dobLabel = (iso: string | null) => {
  if (!iso) return "—";
  const dob = new Date(`${iso}T00:00:00`);
  let age = new Date().getFullYear() - dob.getFullYear();
  const notYetHadBirthdayThisYear =
    new Date().getMonth() < dob.getMonth() ||
    (new Date().getMonth() === dob.getMonth() && new Date().getDate() < dob.getDate());
  if (notYetHadBirthdayThisYear) age -= 1;
  return `${dob.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })} (${age}y)`;
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

const Queue = () => {
  const router = useRouter();
  const [queue, setQueue] = useState<ApiQueueEntry[]>([]);
  const [completed, setCompleted] = useState<ApiCompletedEntry[]>([]);
  const [stats, setStats] = useState<ApiQueueResponse["stats"]>({ seen: 0, remaining: 0, total: 0, avg_wait_minutes: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", dob: "", phone: "", reason: "", priority: "standard" as Priority });

  const load = async () => {
    try {
      const res = await fetch("/api/v1/portal/queue");
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Couldn't load today's queue.");
        return;
      }
      setQueue(body.data.queue ?? []);
      setCompleted(body.data.completed ?? []);
      setStats(body.data.stats ?? { seen: 0, remaining: 0, total: 0, avg_wait_minutes: 0 });
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(
    () => (filter === "ALL" ? queue : queue.filter((p) => p.priority === filter)),
    [queue, filter],
  );

  const handleAddWalkIn = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter the patient's name");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/portal/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.name.trim(),
          date_of_birth: form.dob || undefined,
          phone: form.phone.trim() || undefined,
          reason: form.reason.trim() || undefined,
          priority: form.priority,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Couldn't add that walk-in.");
        return;
      }
      toast.success(`${form.name.trim()} added to the queue`);
      setForm({ name: "", dob: "", phone: "", reason: "", priority: "standard" });
      setWalkInOpen(false);
      void load();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartConsult = async (entry: ApiQueueEntry) => {
    // Already started -- just go back in. Re-PATCHing would stamp a fresh
    // consultation_started_at over the real one, which is wrong: a doctor
    // stepping out mid-consult (interrupted, grabbing a chart) and clicking
    // back in should not reset how long they've actually been with this
    // patient.
    if (entry.in_consultation) {
      router.push(`/portal/prescription?appointment=${entry.id}`);
      return;
    }

    setStartingId(entry.id);
    try {
      const res = await fetch("/api/v1/portal/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Couldn't start that consultation.");
        return;
      }
      router.push(`/portal/prescription?appointment=${entry.id}`);
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setStartingId(null);
    }
  };

  const statCards = [
    { label: "PATIENTS SEEN", value: String(stats.seen), suffix: `/ ${stats.total}`, icon: CheckCircle2 },
    { label: "AVG WAIT TIME", value: String(stats.avg_wait_minutes), suffix: "mins", icon: Clock },
    { label: "REMAINING", value: String(stats.remaining), suffix: "appointments", icon: ArrowRightLeft },
  ];

  return (
    <PortalLayout>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl text-primary">Today&apos;s Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-primary hover:bg-chip transition-colors">
                <SlidersHorizontal className="h-4 w-4" /> Filter View
                {filter !== "ALL" && <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] px-2 py-0.5">1</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground px-2 py-1.5">FILTER BY PRIORITY</p>
              <div className="flex flex-col">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      toast.info(f === "ALL" ? "Showing all patients" : `Filtered: ${priorityMeta[f].label}`);
                    }}
                    className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-primary hover:bg-chip transition-colors"
                  >
                    <span>{f === "ALL" ? "All Patients" : priorityMeta[f].label.charAt(0) + priorityMeta[f].label.slice(1).toLowerCase()}</span>
                    {filter === f && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Dialog open={walkInOpen} onOpenChange={(o) => !submitting && setWalkInOpen(o)}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 shadow-glow">
                <Plus className="h-4 w-4" /> Walk-in Patient
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-primary">Add Walk-in Patient</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Patient Name</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    max={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reason">Reason for Visit <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Chest discomfort" />
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="routine">Routine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <button onClick={() => setWalkInOpen(false)} disabled={submitting} className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-primary hover:bg-chip transition-colors">Cancel</button>
                <button onClick={handleAddWalkIn} disabled={submitting} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 shadow-glow disabled:opacity-60">
                  {submitting ? "Adding..." : "Add to Queue"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mt-8">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-2xl bg-card border border-border/60 p-6 flex items-center justify-between shadow-soft">
            <div>
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{s.label}</p>
              <p className="mt-2"><span className="font-display text-4xl text-primary">{s.value}</span> <span className="text-sm text-muted-foreground ml-1">{s.suffix}</span></p>
            </div>
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-primary"><s.icon className="h-5 w-5" /></div>
          </motion.div>
        ))}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-5 w-1 rounded-full bg-primary-glow" />
            <h2 className="font-display text-xl text-primary">Currently Waiting</h2>
          </div>
          {filter !== "ALL" && (
            <button onClick={() => setFilter("ALL")} className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
              Clear filter ({priorityMeta[filter].label})
            </button>
          )}
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border/60 p-8 text-center text-sm text-muted-foreground">
              {queue.length === 0 ? "No patients scheduled today." : "No patients match this filter."}
            </div>
          ) : (
            visible.map((p, i) => {
              const meta = priorityMeta[p.priority];
              return (
                <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}
                  whileHover={{ y: -2 }} className="rounded-2xl bg-card border border-border/60 p-4 flex items-center gap-5 shadow-soft">
                  <div className="relative shrink-0">
                    <div className="h-14 w-14 rounded-full bg-chip flex items-center justify-center font-display text-lg text-primary">
                      {initials(p.patient?.full_name ?? "?")}
                    </div>
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${p.in_consultation ? "bg-primary-glow" : meta.dot}`} />
                  </div>
                  <div className="min-w-[180px]">
                    <p className="font-semibold text-primary">{p.patient?.full_name ?? "Patient"}</p>
                    <p className="text-xs text-muted-foreground">DOB: {dobLabel(p.patient?.date_of_birth ?? null)}</p>
                  </div>
                  <div className="hidden md:block min-w-[120px]">
                    <p className="text-[10px] tracking-widest font-bold text-muted-foreground">TIME</p>
                    <p className="text-sm font-semibold text-primary mt-0.5">{formatTime(p.scheduled_time)}</p>
                  </div>
                  <div className="flex-1 hidden lg:block">
                    <p className="text-[10px] tracking-widest font-bold text-muted-foreground">REASON</p>
                    <p className="text-sm font-semibold text-primary mt-0.5">{p.reason || "—"}</p>
                  </div>
                  <span className={`hidden sm:inline-flex rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${meta.priorityClass}`}>{meta.label}</span>
                  {p.in_consultation ? (
                    <span className="text-xs font-semibold text-primary-glow">IN CONSULTATION</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">WAITING{p.waited_minutes > 0 ? ` - ${p.waited_minutes}M` : ""}</span>
                  )}
                  <button
                    onClick={() => handleStartConsult(p)}
                    disabled={startingId === p.id}
                    className="flex items-center gap-1 rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 shadow-glow disabled:opacity-60"
                  >
                    {startingId === p.id ? "Starting..." : p.in_consultation ? "In Consult" : "Start Consult"} <ArrowRight className="h-3 w-3" />
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {!loading && completed.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-5 w-1 rounded-full bg-muted-foreground/40" />
            <h2 className="font-display text-xl text-primary">Seen Today</h2>
            <span className="rounded-full bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5">{completed.length}</span>
          </div>
          <div className="space-y-2">
            {completed.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: i * 0.05 }}
                className="rounded-2xl bg-card/60 border border-border/40 p-4 flex items-center gap-5">
                <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center font-display text-sm text-muted-foreground shrink-0">
                  {initials(p.patient?.full_name ?? "?")}
                </div>
                <div className="min-w-[180px]">
                  <p className="font-semibold text-primary">{p.patient?.full_name ?? "Patient"}</p>
                  <p className="text-xs text-muted-foreground">DOB: {dobLabel(p.patient?.date_of_birth ?? null)}</p>
                </div>
                <div className="hidden md:block min-w-[120px]">
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground">TIME</p>
                  <p className="text-sm font-semibold text-primary mt-0.5">{formatTime(p.scheduled_time)}</p>
                </div>
                <div className="flex-1 hidden lg:block">
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground">REASON</p>
                  <p className="text-sm font-semibold text-primary mt-0.5">{p.reason || "—"}</p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">COMPLETED</span>
                <Link href={`/portal/prescription?appointment=${p.id}`}
                  className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-chip transition-colors">
                  View <ArrowRight className="h-3 w-3" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </PortalLayout>
  );
};
export default Queue;
