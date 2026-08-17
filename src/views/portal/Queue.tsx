"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, ArrowRightLeft, Plus, SlidersHorizontal, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { queue as initialQueue, type QueuePatient } from "@/data/queue";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const patientEleanor = "/assets/patient-eleanor.jpg";

const stats = [
  { label: "PATIENTS SEEN", value: "12", suffix: "/ 28", icon: CheckCircle2 },
  { label: "AVG WAIT TIME", value: "14", suffix: "mins", icon: Clock },
  { label: "REMAINING", value: "16", suffix: "appointments", icon: ArrowRightLeft },
];

type FilterKey = "ALL" | "HIGH PRIORITY" | "STANDARD" | "ROUTINE";
const FILTERS: FilterKey[] = ["ALL", "HIGH PRIORITY", "STANDARD", "ROUTINE"];

const priorityMeta: Record<Exclude<FilterKey, "ALL">, { priorityClass: string; dot: string }> = {
  "HIGH PRIORITY": { priorityClass: "bg-destructive/15 text-destructive", dot: "bg-destructive" },
  "STANDARD": { priorityClass: "bg-chip text-primary", dot: "bg-primary-glow" },
  "ROUTINE": { priorityClass: "bg-muted text-foreground/60", dot: "bg-muted-foreground" },
};

const Queue = () => {
  const [patients, setPatients] = useState<QueuePatient[]>(initialQueue);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [form, setForm] = useState({ name: "", dob: "", phone: "", reason: "", priority: "STANDARD" as Exclude<FilterKey, "ALL"> });

  const visible = useMemo(
    () => (filter === "ALL" ? patients : patients.filter((p) => p.priority === filter)),
    [patients, filter]
  );

  const handleAddWalkIn = () => {
    if (!form.name.trim() || !form.reason.trim()) {
      toast.error("Please enter patient name and reason");
      return;
    }
    const meta = priorityMeta[form.priority];
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const newPatient: QueuePatient = {
      img: patientEleanor,
      name: form.name.trim(),
      dob: form.dob.trim() || "—",
      time,
      reason: form.reason.trim(),
      priority: form.priority,
      priorityClass: meta.priorityClass,
      dot: meta.dot,
      status: "WAITING - WALK-IN",
    };
    setPatients((prev) => [...prev, newPatient]);
    toast.success(`${newPatient.name} added to the queue`);
    setForm({ name: "", dob: "", phone: "", reason: "", priority: "STANDARD" });
    setWalkInOpen(false);
  };

  return (
    <PortalLayout>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl text-primary">Today&apos;s Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Thursday, October 26 • 9:45 AM</p>
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
                      toast.info(f === "ALL" ? "Showing all patients" : `Filtered: ${f}`);
                    }}
                    className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-primary hover:bg-chip transition-colors"
                  >
                    <span>{f === "ALL" ? "All Patients" : f.charAt(0) + f.slice(1).toLowerCase()}</span>
                    {filter === f && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
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
                  <Input id="dob" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} placeholder="MM/DD/YYYY" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reason">Reason for Visit</Label>
                  <Input id="reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Chest discomfort" />
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Exclude<FilterKey, "ALL"> })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH PRIORITY">High Priority</SelectItem>
                      <SelectItem value="STANDARD">Standard</SelectItem>
                      <SelectItem value="ROUTINE">Routine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <button onClick={() => setWalkInOpen(false)} className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-primary hover:bg-chip transition-colors">Cancel</button>
                <button onClick={handleAddWalkIn} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 shadow-glow">Add to Queue</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mt-8">
        {stats.map((s, i) => (
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
              Clear filter ({filter})
            </button>
          )}
        </div>
        <div className="space-y-3">
          {visible.length === 0 && (
            <div className="rounded-2xl bg-card border border-border/60 p-8 text-center text-sm text-muted-foreground">
              No patients match this filter.
            </div>
          )}
          {visible.map((p, i) => (
            <motion.div key={p.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -2 }} className="rounded-2xl bg-card border border-border/60 p-4 flex items-center gap-5 shadow-soft">
              <div className="relative shrink-0">
                <img src={p.img} alt={p.name} loading="lazy" width={56} height={56} className="h-14 w-14 rounded-full object-cover" />
                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${p.dot}`} />
              </div>
              <div className="min-w-[180px]">
                <p className="font-semibold text-primary">{p.name}</p>
                <p className="text-xs text-muted-foreground">DOB: {p.dob}</p>
              </div>
              <div className="hidden md:block min-w-[120px]">
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">TIME</p>
                <p className="text-sm font-semibold text-primary mt-0.5">
                  {p.time} {p.late && <span className="text-destructive ml-1">({p.late})</span>}
                </p>
              </div>
              <div className="flex-1 hidden lg:block">
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">REASON</p>
                <p className="text-sm font-semibold text-primary mt-0.5">{p.reason}</p>
              </div>
              <span className={`hidden sm:inline-flex rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${p.priorityClass}`}>{p.priority}</span>
              {p.inPreOp && <span className="hidden xl:inline text-xs text-muted-foreground">• In Pre-op</span>}
              <Link href="/portal/directory" className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-chip transition-colors hidden sm:block">View Records</Link>
              <Link href="/portal/prescription" className="flex items-center gap-1 rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 shadow-glow">
                Start Consult <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
};
export default Queue;

