"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, ClipboardList, ClipboardCheck, FlaskConical, Stethoscope, Lightbulb, Sparkles, History, AlertTriangle, Users, Printer, X, ArrowRight, Search, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * /portal/prescription (HF-57). Used to render one hardcoded patient no
 * matter who was signed in or which patient was picked from the queue --
 * "Green Valley Clinic", "Dr. Julian Vane", "Eleanor Vance", always, for
 * every doctor. Real now: hospital, doctor and patient identity all come
 * from /api/v1/portal/consultation/:id, keyed off the appointment id Queue.tsx
 * passes as ?appointment=<id> when a doctor clicks Start Consult / In Consult.
 *
 * What's deliberately still NOT real: the clinical content itself (chief
 * complaints, examination, investigation, diagnosis, medicines, advice).
 * There is nowhere to save it *server-side* yet -- that needs its own table
 * and is real follow-up work (tracked in HF-57), not something to half-wire
 * in here. The editors below are fully interactive and start empty for a
 * real patient instead of showing canned demo entries.
 *
 * They do survive a reload/crash, though: every keystroke is mirrored into
 * localStorage under a key scoped to this appointment id (see "draft
 * autosave" below) so a power cut mid-consult doesn't lose what the doctor
 * already typed. That's a local safety net only, not a real save -- the
 * draft is deleted the moment "Print & Submit" actually completes the visit,
 * same as it would be if this were a server-side save.
 *
 * Two real writes this page makes, both PATCH .../consultation/:id:
 * "Print & Submit" marks the visit completed (moves the queue's "Patients
 * Seen" stat, HF-56); clicking Weight or Height opens a real edit dialog
 * that saves onto the patient record (0026_patients_vitals.sql) -- a dash
 * when nothing's on file yet, same as gender.
 *
 * The "Today's Queue" mini list in the right sidebar is real too -- same
 * /api/v1/portal/queue Queue.tsx itself reads, so Start Consult here does
 * exactly what it does there (PATCH to mark consultation_started_at, then
 * navigate). "AI Suggestions" is left exactly as it was -- explicitly out
 * of scope, no real data behind it to wire up.
 */

type Gender = "male" | "female" | "other";
type Age = { value: number; unit: "years" | "months" | "days" };

type ConsultationCtx = {
  hospital: { name: string; address: string | null; contact_phone: string | null };
  doctor: { name: string; specialty: string | null; education: string | null };
  patient: {
    id: string;
    full_name: string;
    gender: Gender | null;
    age: Age | null;
    mrn: string;
    weight_kg: number | null;
    height_feet: number | null;
    height_inches: number | null;
  };
  appointment: {
    id: string;
    scheduled_date: string;
    department: string | null;
    notes: string | null;
    status: string;
    bp_systolic: number | null;
    bp_diastolic: number | null;
  };
  history: { id: string; scheduled_date: string; department: string | null; notes: string | null }[];
};

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

const genderLabel = (g: Gender | null) => (g ? g[0].toUpperCase() + g.slice(1) : "—");

/** Short form for the meta bar / print header -- "3mo", "15d", "36y". */
const ageShort = (a: Age | null) => (a ? `${a.value}${a.unit === "years" ? "y" : a.unit === "months" ? "mo" : "d"}` : "—");
/** Long form -- for the age-input dialog's own unit label and the print preview's "Age / Sex" line. */
const ageLong = (a: Age | null) => (a ? `${a.value} ${a.unit[0].toUpperCase() + a.unit.slice(1)}` : "—");

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

/** Feet + inches, not cm -- that's not how height is read out in a Bangladeshi hospital. */
const heightLabel = (feet: number | null, inches: number | null) =>
  feet != null ? `${feet} ft ${inches ?? 0} in` : "—";

const bpLabel = (systolic: number | null, diastolic: number | null) =>
  systolic != null && diastolic != null ? `${systolic}/${diastolic} mmHg` : "—";

type EditableSectionProps = {
  icon: LucideIcon;
  title: string;
  action: string;
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  placeholder?: string;
  multiline?: boolean;
};

const EditableSection = ({ icon: Icon, title, action, items, onAdd, onRemove, placeholder, multiline }: EditableSectionProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    setValue("");
    setOpen(false);
    toast.success(`${title} added`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-primary text-sm"><Icon className="h-4 w-4" /> {title}</h3>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-xs font-semibold text-primary border border-border rounded-full px-3 py-1 hover:bg-chip transition-colors"
        >
          <Plus className={`h-3 w-3 transition-transform ${open ? "rotate-45" : ""}`} /> {action}
        </button>
      </div>

      {open && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
          {multiline ? (
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          ) : (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
          <button onClick={submit} className="rounded-lg bg-primary text-primary-foreground px-3 text-xs font-semibold hover:opacity-90">Save</button>
        </motion.div>
      )}

      <div className="rounded-xl bg-muted/40 border border-border/40 p-4 min-h-[110px] text-sm text-foreground/80 space-y-1.5">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-xs italic">No entries yet. Click &quot;{action}&quot; to add.</p>
        ) : (
          items.map((it, i) => (
            <div key={i} className="group flex items-start justify-between gap-2">
              <p className="flex-1 whitespace-pre-line">– {it}</p>
              <button
                onClick={() => { onRemove(i); toast.message("Removed"); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const Prescription = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams?.get("appointment") ?? null;

  const [ctx, setCtx] = useState<ConsultationCtx | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(!!appointmentId);
  const [ctxError, setCtxError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) {
      setCtx(null);
      setCtxError(null);
      setLoadingCtx(false);
      return;
    }
    let active = true;
    setLoadingCtx(true);
    setCtxError(null);
    (async () => {
      try {
        const res = await fetch(`/api/v1/portal/consultation/${appointmentId}`);
        const body = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok) {
          setCtxError(body?.error?.message || "Couldn't load this consultation.");
          setCtx(null);
          return;
        }
        setCtx(body.data as ConsultationCtx);
      } catch {
        if (active) setCtxError("Couldn't reach the server.");
      } finally {
        if (active) setLoadingCtx(false);
      }
    })();
    return () => { active = false; };
  }, [appointmentId]);

  // "Today's Queue" sidebar -- same endpoint Queue.tsx itself reads, so the
  // doctor can jump to a different patient without leaving the chart.
  type SidebarQueueEntry = {
    id: string;
    in_consultation: boolean;
    waited_minutes: number;
    patient: { id: string; full_name: string } | null;
  };
  const [sideQueue, setSideQueue] = useState<SidebarQueueEntry[]>([]);
  const [sideRemaining, setSideRemaining] = useState(0);
  const [sideLoading, setSideLoading] = useState(true);
  const [sideStartingId, setSideStartingId] = useState<string | null>(null);

  const loadSideQueue = async () => {
    try {
      const res = await fetch("/api/v1/portal/queue");
      const body = await res.json().catch(() => null);
      if (!res.ok) return;
      setSideQueue(body.data.queue ?? []);
      setSideRemaining(body.data.stats?.remaining ?? 0);
    } catch {
      // sidebar convenience list -- fail quietly, the main chart doesn't depend on it
    } finally {
      setSideLoading(false);
    }
  };

  useEffect(() => {
    void loadSideQueue();
  }, [appointmentId]); // refetch when navigating between patients, so "remaining" stays current

  const sideStartConsult = async (entry: SidebarQueueEntry) => {
    if (entry.id === appointmentId) return; // already open
    if (entry.in_consultation) {
      router.push(`/portal/prescription?appointment=${entry.id}`);
      return;
    }
    setSideStartingId(entry.id);
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
      setSideStartingId(null);
    }
  };

  const [complaints, setComplaints] = useState<string[]>([]);
  const [examination, setExamination] = useState<string[]>([]);
  const [investigation, setInvestigation] = useState<string[]>([]);
  const [diagnosis, setDiagnosis] = useState<string[]>([]);

  type Medicine = { name: string; dose: string; frequency: string; days: string; meal: "Before Meal" | "After Meal" };
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medOpen, setMedOpen] = useState(false);
  // null = adding a new medicine; an index = editing that entry in `medicines` in place.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const emptyMed: Medicine = { name: "", dose: "", frequency: "0+0+0", days: "", meal: "After Meal" };
  const [newMed, setNewMed] = useState<Medicine>(emptyMed);

  // Frequency (M+A+N): one dose count per time of day, not a handful of
  // preset whole-number combos. Real prescriptions routinely need a half or
  // quarter tablet at one time and a different whole number at another --
  // "1+0+½" or "2+0+2" -- which a fixed list of combos like the old
  // "1+1+0" / "0+1+1" buttons can't express. Three independent selects can.
  const DOSE_OPTIONS = ["0", "¼", "½", "¾", "1", "1½", "2", "3"];
  const [freqM, setFreqM] = useState("0");
  const [freqA, setFreqA] = useState("0");
  const [freqN, setFreqN] = useState("0");
  const setFreq = (slot: "M" | "A" | "N", value: string) => {
    const m = slot === "M" ? value : freqM;
    const a = slot === "A" ? value : freqA;
    const n = slot === "N" ? value : freqN;
    if (slot === "M") setFreqM(value); else if (slot === "A") setFreqA(value); else setFreqN(value);
    setNewMed((f) => ({ ...f, frequency: `${m}+${a}+${n}` }));
  };

  // Days: a doctor picks a common course length instead of typing "7 Days"
  // by hand every time -- but courses vary (a 3-week taper, a 45-day
  // supply), so the field stays free text; these are quick-fills, not the
  // only allowed values.
  const DAY_PRESETS = ["3 Days", "7 Days", "15 Days", "1 Month", "3 Months"];

  // Medicine search combobox -- a doctor picks from real matches instead of
  // typing a free-text name (HF-58). Proxies MedEx's live search, no local
  // table -- see api/v1/portal/medicines/route.ts for why. Server-driven:
  // cmdk's own filtering is off (shouldFilter={false}), the list is
  // whatever the API just returned.
  type MedicineHit = { brand_name: string; strength: string | null; dosage_form: string | null; icon_url: string | null };
  const [medPickerOpen, setMedPickerOpen] = useState(false);
  const [medQuery, setMedQuery] = useState("");
  const [medResults, setMedResults] = useState<MedicineHit[]>([]);
  const [medSearching, setMedSearching] = useState(false);
  const [selectedMed, setSelectedMed] = useState<MedicineHit | null>(null);
  const medSearchSeq = useRef(0);

  // A doctor prescribes the same handful of medicines constantly -- every
  // one added to a real Rx is remembered here (localStorage, this device),
  // so the next search for it never has to leave the browser. The MedEx
  // proxy is a live scrape of someone else's site (see its route file); the
  // fewer times we round-trip to it, the better a citizen this stays.
  const RECENT_MEDS_KEY = "hf.medicines.recent";
  const [recentMeds, setRecentMeds] = useState<MedicineHit[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_MEDS_KEY);
      if (raw) setRecentMeds(JSON.parse(raw));
    } catch {
      // corrupt or inaccessible storage -- just start empty, not worth surfacing
    }
  }, []);

  const rememberMedicine = (m: MedicineHit) => {
    setRecentMeds((prev) => {
      const deduped = prev.filter((p) => !(p.brand_name === m.brand_name && p.strength === m.strength));
      const next = [m, ...deduped].slice(0, 50); // most-recently-used first, capped
      try {
        localStorage.setItem(RECENT_MEDS_KEY, JSON.stringify(next));
      } catch {
        // storage full/unavailable -- the doctor still has it for this session, just not saved
      }
      return next;
    });
  };

  useEffect(() => {
    if (!medPickerOpen) return;
    const q = medQuery.trim();
    if (!q) {
      // Nothing typed yet -- show what's already been used, right away, no
      // search needed at all. This is the only place recentMeds replaces a
      // live call; once a doctor actually types something, that's a real
      // search and always goes live below.
      setMedResults(recentMeds.slice(0, 10));
      setMedSearching(false);
      return;
    }

    const seq = ++medSearchSeq.current;
    setMedSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/portal/medicines?q=${encodeURIComponent(q)}`);
        const body = await res.json().catch(() => null);
        if (seq !== medSearchSeq.current) return; // a newer keystroke already fired
        setMedResults(res.ok ? (body?.data ?? []) : []);
      } catch {
        if (seq === medSearchSeq.current) setMedResults([]);
      } finally {
        if (seq === medSearchSeq.current) setMedSearching(false);
      }
    }, 350); // a little slower than a local-only filter -- this hits MedEx's live site
    return () => clearTimeout(t);
  }, [medQuery, medPickerOpen, recentMeds]);

  const pickMedicine = (m: MedicineHit) => {
    setSelectedMed(m);
    setNewMed((f) => ({ ...f, name: m.brand_name, dose: f.dose || m.strength || "" }));
    setMedPickerOpen(false);
    setMedQuery("");
  };

  const renderMedRow = (m: MedicineHit, i: number) => (
    <CommandItem key={`${m.brand_name}-${m.strength}-${i}`} value={`${m.brand_name}-${i}`} onSelect={() => pickMedicine(m)} className="flex items-center gap-3 py-2">
      <div className="h-8 w-8 rounded-lg bg-chip flex items-center justify-center shrink-0 overflow-hidden">
        {m.icon_url ? (
          <img src={m.icon_url} alt={m.dosage_form ?? m.brand_name} className="h-5 w-5 object-contain" />
        ) : (
          <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
      <p className="min-w-0 flex-1 truncate">
        <span className="text-base font-semibold text-foreground">{m.brand_name}</span>
        {m.strength && <span className="text-sm font-normal text-muted-foreground"> {m.strength}</span>}
      </p>
      {m.brand_name === newMed.name && <Check className="h-4 w-4 text-primary shrink-0" />}
    </CommandItem>
  );

  const [advice, setAdvice] = useState<string[]>([]);
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [newAdvice, setNewAdvice] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Draft autosave -- a doctor's whole visit-in-progress (complaints,
  // examination, investigation, diagnosis, medicines, advice) used to live
  // only in React state, so a power cut or accidental reload silently threw
  // away everything typed so far. Mirrored into localStorage, keyed to this
  // appointment specifically, so reopening the same patient's chart -- even
  // after the PC comes back up -- restores exactly where the doctor left
  // off. Deleted the moment the visit is actually submitted (handleSubmit
  // below); this is a crash safety net, not a substitute for the real save.
  const draftKey = (id: string) => `hf.rx.draft.${id}`;
  const [draftReady, setDraftReady] = useState(false);

  // Load (or reset, when jumping to a different patient from the sidebar)
  // whenever the appointment changes -- runs once per appointment id.
  useEffect(() => {
    setDraftReady(false);
    if (!appointmentId) {
      setDraftReady(true);
      return;
    }
    let draft: Partial<{
      complaints: string[];
      examination: string[];
      investigation: string[];
      diagnosis: string[];
      medicines: Medicine[];
      advice: string[];
    }> | null = null;
    try {
      const raw = localStorage.getItem(draftKey(appointmentId));
      if (raw) draft = JSON.parse(raw);
    } catch {
      // corrupt draft -- ignore, start clean rather than fail the page
    }
    setComplaints(draft?.complaints ?? []);
    setExamination(draft?.examination ?? []);
    setInvestigation(draft?.investigation ?? []);
    setDiagnosis(draft?.diagnosis ?? []);
    setMedicines(draft?.medicines ?? []);
    setAdvice(draft?.advice ?? []);
    setDraftReady(true);
  }, [appointmentId]);

  // Persist on every change -- but only once the load above has actually
  // run for this appointment, so an empty first render doesn't stomp a draft
  // we haven't read yet.
  useEffect(() => {
    if (!appointmentId || !draftReady) return;
    try {
      localStorage.setItem(
        draftKey(appointmentId),
        JSON.stringify({ complaints, examination, investigation, diagnosis, medicines, advice })
      );
    } catch {
      // storage full/unavailable -- best-effort safety net, not the primary save
    }
  }, [appointmentId, draftReady, complaints, examination, investigation, diagnosis, medicines, advice]);

  const handlePrint = () => {
    const node = document.getElementById("rx-print-area");
    if (!node) return;
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Prescription</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>body{font-family:ui-sans-serif,system-ui;padding:32px;color:#0f172a}@media print{@page{margin:16mm}}</style>
      </head><body>${node.innerHTML}<script>window.onload=()=>{setTimeout(()=>{window.print();},400)}</script></body></html>`);
    win.document.close();
  };

  const closeMedDialog = () => {
    setMedOpen(false);
    setNewMed(emptyMed);
    setMedQuery("");
    setMedPickerOpen(false);
    setSelectedMed(null);
    setEditingIndex(null);
    setFreqM("0");
    setFreqA("0");
    setFreqN("0");
  };

  /** Reopens an already-added Rx line for editing, in place. */
  const openEditMedicine = (i: number) => {
    const m = medicines[i];
    setEditingIndex(i);
    setNewMed(m);
    setSelectedMed(null); // the picked medicine's own details (icon, dosage form) weren't kept on the Rx line -- only re-set if they search again
    const [fm, fa, fn] = m.frequency.split("+");
    setFreqM(fm ?? "0");
    setFreqA(fa ?? "0");
    setFreqN(fn ?? "0");
    setMedOpen(true);
  };

  const saveMedicine = () => {
    if (!newMed.name.trim() || !newMed.dose.trim() || !newMed.days.trim()) {
      toast.error("Fill name, dose and days");
      return;
    }
    if (editingIndex !== null) {
      setMedicines((arr) => arr.map((m, idx) => (idx === editingIndex ? newMed : m)));
    } else {
      setMedicines((m) => [...m, newMed]);
    }
    if (selectedMed) rememberMedicine(selectedMed);
    const wasEditing = editingIndex !== null;
    closeMedDialog();
    toast.success(wasEditing ? "Medicine updated" : "Medicine added");
  };
  const saveAdvice = () => {
    const v = newAdvice.trim();
    if (!v) return;
    setAdvice((a) => [...a, v]);
    setNewAdvice("");
    setAdviceOpen(false);
    toast.success("Advice added");
  };

  const addTo = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter((arr) => [...arr, v]);
  const removeFrom = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (i: number) =>
    setter((arr) => arr.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!appointmentId) {
      setPreviewOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/portal/consultation/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Couldn't mark this visit completed, but here's the preview.");
      } else {
        toast.success("Visit marked completed");
        setCtx((c) => (c ? { ...c, appointment: { ...c.appointment, status: "completed" } } : c));
        // The visit is actually saved now -- the crash-recovery draft would
        // just be stale leftovers if a doctor reopened this appointment later.
        try {
          localStorage.removeItem(draftKey(appointmentId));
        } catch {
          // nothing to clean up if storage isn't available
        }
      }
    } catch {
      toast.error("Couldn't reach the server, but here's the preview.");
    } finally {
      setSubmitting(false);
      setPreviewOpen(true);
    }
  };

  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({ weight: "", heightFeet: "", heightInches: "" });
  const [savingVitals, setSavingVitals] = useState(false);

  const openVitals = () => {
    setVitalsForm({
      weight: ctx?.patient.weight_kg != null ? String(ctx.patient.weight_kg) : "",
      heightFeet: ctx?.patient.height_feet != null ? String(ctx.patient.height_feet) : "",
      heightInches: ctx?.patient.height_inches != null ? String(ctx.patient.height_inches) : "",
    });
    setVitalsOpen(true);
  };

  const saveVitals = async () => {
    if (!appointmentId) return;
    const weight_kg = vitalsForm.weight.trim() === "" ? null : Number(vitalsForm.weight);
    const height_feet = vitalsForm.heightFeet.trim() === "" ? null : Number(vitalsForm.heightFeet);
    const height_inches = vitalsForm.heightInches.trim() === "" ? null : Number(vitalsForm.heightInches);
    if (
      (weight_kg !== null && (Number.isNaN(weight_kg) || weight_kg <= 0)) ||
      (height_feet !== null && (Number.isNaN(height_feet) || height_feet <= 0)) ||
      (height_inches !== null && (Number.isNaN(height_inches) || height_inches < 0 || height_inches > 11))
    ) {
      toast.error("Enter valid numbers (inches 0-11), or leave a field blank.");
      return;
    }
    setSavingVitals(true);
    try {
      const res = await fetch(`/api/v1/portal/consultation/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_vitals", weight_kg, height_feet, height_inches }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Couldn't save that.");
        return;
      }
      setCtx((c) => (c ? { ...c, patient: { ...c.patient, weight_kg: body.data.weight_kg, height_feet: body.data.height_feet, height_inches: body.data.height_inches } } : c));
      toast.success("Vitals updated");
      setVitalsOpen(false);
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSavingVitals(false);
    }
  };

  // Blood pressure -- same click-to-edit pattern as Weight/Height, but it
  // writes onto the *appointment*, not the patient (see the route's header
  // comment): an assistant takes it fresh at triage for this visit, it
  // isn't a standing fact about the patient the way weight/height are.
  const [bpOpen, setBpOpen] = useState(false);
  const [bpForm, setBpForm] = useState({ systolic: "", diastolic: "" });
  const [savingBp, setSavingBp] = useState(false);

  const openBp = () => {
    setBpForm({
      systolic: ctx?.appointment.bp_systolic != null ? String(ctx.appointment.bp_systolic) : "",
      diastolic: ctx?.appointment.bp_diastolic != null ? String(ctx.appointment.bp_diastolic) : "",
    });
    setBpOpen(true);
  };

  const saveBp = async () => {
    if (!appointmentId) return;
    const bp_systolic = bpForm.systolic.trim() === "" ? null : Number(bpForm.systolic);
    const bp_diastolic = bpForm.diastolic.trim() === "" ? null : Number(bpForm.diastolic);
    if ((bp_systolic !== null && (Number.isNaN(bp_systolic) || bp_systolic <= 0)) || (bp_diastolic !== null && (Number.isNaN(bp_diastolic) || bp_diastolic <= 0))) {
      toast.error("Enter positive numbers, or leave blank.");
      return;
    }
    setSavingBp(true);
    try {
      const res = await fetch(`/api/v1/portal/consultation/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_bp", bp_systolic, bp_diastolic }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Couldn't save that.");
        return;
      }
      setCtx((c) => (c ? { ...c, appointment: { ...c.appointment, bp_systolic: body.data.bp_systolic, bp_diastolic: body.data.bp_diastolic } } : c));
      toast.success("Blood pressure updated");
      setBpOpen(false);
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSavingBp(false);
    }
  };

  // Age/Gender -- same click-to-edit pattern as Weight/Height. Age is a
  // value + unit (Years by default, but Months or Days for a newborn) since
  // a baby's chart reading "0 years" is useless; the server turns whatever
  // gets entered into an approximate date_of_birth (see the route).
  const [patientOpen, setPatientOpen] = useState(false);
  const [patientForm, setPatientForm] = useState<{ ageValue: string; ageUnit: Age["unit"]; gender: Gender | "" }>({
    ageValue: "",
    ageUnit: "years",
    gender: "",
  });
  const [savingPatient, setSavingPatient] = useState(false);

  const openPatientDialog = () => {
    setPatientForm({
      ageValue: ctx?.patient.age ? String(ctx.patient.age.value) : "",
      ageUnit: ctx?.patient.age?.unit ?? "years",
      gender: ctx?.patient.gender ?? "",
    });
    setPatientOpen(true);
  };

  const savePatientDetails = async () => {
    if (!appointmentId) return;
    const trimmed = patientForm.ageValue.trim();
    const ageValue = trimmed === "" ? null : Number(trimmed);
    if (ageValue !== null && (Number.isNaN(ageValue) || ageValue <= 0)) {
      toast.error("Enter a positive age, or leave it blank.");
      return;
    }
    setSavingPatient(true);
    try {
      const res = await fetch(`/api/v1/portal/consultation/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_patient",
          age: ageValue !== null ? { value: ageValue, unit: patientForm.ageUnit } : null,
          gender: patientForm.gender || null,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Couldn't save that.");
        return;
      }
      setCtx((c) => (c ? { ...c, patient: { ...c.patient, age: body.data.age, gender: body.data.gender } } : c));
      toast.success("Patient details updated");
      setPatientOpen(false);
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSavingPatient(false);
    }
  };

  // No patient picked yet -- an honest empty state instead of a fantasy chart.
  if (!appointmentId) {
    return (
      <PortalLayout>
        <div className="rounded-3xl bg-card border border-dashed border-border/60 shadow-soft p-16 text-center">
          <Stethoscope className="h-10 w-10 text-muted-foreground mx-auto" />
          <h1 className="font-display text-2xl text-primary mt-4">No patient selected</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Pick a patient from Today&apos;s Queue and hit Start Consult to open their chart here.
          </p>
          <Link href="/portal/queue" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-6 py-3 text-sm font-semibold shadow-glow hover:opacity-90">
            Go to Today&apos;s Queue <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PortalLayout>
    );
  }

  if (loadingCtx) {
    return (
      <PortalLayout>
        <div className="rounded-3xl bg-card shadow-soft p-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </PortalLayout>
    );
  }

  if (ctxError || !ctx) {
    return (
      <PortalLayout>
        <div className="rounded-3xl bg-card border border-destructive/30 shadow-soft p-16 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="font-display text-2xl text-primary mt-4">Couldn&apos;t open this consultation</h1>
          <p className="text-sm text-muted-foreground mt-2">{ctxError || "Something went wrong."}</p>
          <Link href="/portal/queue" className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-primary hover:bg-chip">
            Back to Today&apos;s Queue
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const { hospital, doctor, patient, appointment, history } = ctx;
  const ageGender = `${ageShort(patient.age)} / ${patient.gender ? genderLabel(patient.gender)[0] : "—"}`;

  return (
  <PortalLayout>
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-3xl bg-card shadow-soft p-8">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border/60 pb-6">
        <div className="flex gap-4">
          <div className="h-14 w-14 rounded-xl bg-chip flex items-center justify-center text-primary"><Stethoscope className="h-6 w-6" /></div>
          <div>
            <h1 className="font-display text-2xl text-primary">{hospital.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {hospital.address || "Address not on file"}
              {hospital.contact_phone ? <><br />{hospital.contact_phone}</> : null}
            </p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="font-display text-2xl text-primary">{doctor.name}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {doctor.education || doctor.specialty || "—"}
            {doctor.specialty && doctor.education ? <> • {doctor.specialty}</> : null}
          </p>
        </div>
      </div>

      {/* Patient meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-b border-border/60">
        <div>
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">PATIENT NAME</p>
          <p className="font-semibold text-primary mt-1">{patient.full_name}</p>
        </div>
        <button onClick={openPatientDialog} className="text-left group">
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">AGE / GENDER</p>
          <p className="font-semibold text-primary mt-1 group-hover:text-primary-glow transition-colors">{ageGender}</p>
        </button>
        {[
          { l: "Date", v: formatDate(appointment.scheduled_date) },
          { l: "Patient ID", v: patient.mrn },
        ].map(m => (
          <div key={m.l}>
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{m.l.toUpperCase()}</p>
            <p className="font-semibold text-primary mt-1">{m.v}</p>
          </div>
        ))}
        <button onClick={openVitals} className="text-left group">
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">WEIGHT</p>
          <p className="font-semibold text-primary mt-1 group-hover:text-primary-glow transition-colors">
            {patient.weight_kg != null ? `${patient.weight_kg} kg` : "—"}
          </p>
        </button>
        <button onClick={openVitals} className="text-left group">
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">HEIGHT</p>
          <p className="font-semibold text-primary mt-1 group-hover:text-primary-glow transition-colors">
            {heightLabel(patient.height_feet, patient.height_inches)}
          </p>
        </button>
        <button onClick={openBp} className="text-left group">
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">BP</p>
          <p className="font-semibold text-primary mt-1 group-hover:text-primary-glow transition-colors">
            {bpLabel(appointment.bp_systolic, appointment.bp_diastolic)}
          </p>
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_2fr_1fr] gap-8 mt-6">
        {/* Left clinical inputs */}
        <div className="space-y-6">
          <EditableSection
            icon={ClipboardList}
            title="Chief Complaints"
            action="Add Complaints"
            placeholder="e.g. Headache"
            items={complaints}
            onAdd={addTo(setComplaints)}
            onRemove={removeFrom(setComplaints)}
          />
          <EditableSection
            icon={ClipboardCheck}
            title="Examination"
            action="Add Examination"
            placeholder="e.g. BP 120/80"
            items={examination}
            onAdd={addTo(setExamination)}
            onRemove={removeFrom(setExamination)}
          />
          <EditableSection
            icon={FlaskConical}
            title="Investigation"
            action="Add Investigation"
            placeholder="e.g. Lipid Profile"
            items={investigation}
            onAdd={addTo(setInvestigation)}
            onRemove={removeFrom(setInvestigation)}
          />
          <EditableSection
            icon={ClipboardList}
            title="Diagnosis"
            action="Add Diagnosis"
            placeholder="Describe diagnosis…"
            multiline
            items={diagnosis}
            onAdd={addTo(setDiagnosis)}
            onRemove={removeFrom(setDiagnosis)}
          />
        </div>

        {/* Center Rx */}
        <div className="border-x border-border/40 px-6">
          <div className="flex items-center justify-between">
            <p className="font-display text-7xl text-primary italic">Rx</p>
            <button
              onClick={() => setMedOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-primary border border-border rounded-full px-3 py-1.5 hover:bg-chip transition-colors"
            >
              <Plus className="h-3 w-3" /> Add Medicine
            </button>
          </div>

          <Dialog open={medOpen} onOpenChange={(o) => (o ? setMedOpen(true) : closeMedDialog())}>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-primary">{editingIndex !== null ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
                <DialogDescription>Search the medicine list — no free typing, so nothing gets misspelled onto the prescription.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <div className="space-y-1.5">
                  <Label>Medicine</Label>
                  <Popover open={medPickerOpen} onOpenChange={setMedPickerOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-left hover:bg-chip transition-colors">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className={newMed.name ? "text-foreground" : "text-muted-foreground"}>
                          {newMed.name || "Search by brand name…"}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(520px,90vw)] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput value={medQuery} onValueChange={setMedQuery} placeholder="e.g. Napa, Seclo…" />
                        <CommandList className="max-h-[420px]">
                          {medSearching ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">Searching…</div>
                          ) : medQuery.trim() === "" ? (
                            medResults.length === 0 ? (
                              <div className="py-8 text-center text-sm text-muted-foreground">Type a medicine name to search.</div>
                            ) : (
                              <CommandGroup heading="Recently used — no search needed">
                                {medResults.map(renderMedRow)}
                              </CommandGroup>
                            )
                          ) : medQuery.trim().length < 2 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">Type at least 2 letters to search.</div>
                          ) : (
                            <>
                              <CommandEmpty>No matches.</CommandEmpty>
                              <CommandGroup>{medResults.map(renderMedRow)}</CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label>Dose</Label>
                  <Input value={newMed.dose} onChange={(e) => setNewMed({ ...newMed, dose: e.target.value })} placeholder="e.g. 500 mg" />
                </div>
                <div>
                  <Label>Days</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
                    {DAY_PRESETS.map((d) => (
                      <button key={d} type="button" onClick={() => setNewMed({ ...newMed, days: d })} className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${newMed.days === d ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-chip"}`}>{d}</button>
                    ))}
                  </div>
                  <Input value={newMed.days} onChange={(e) => setNewMed({ ...newMed, days: e.target.value })} placeholder="or type a custom duration…" />
                </div>
                <div>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5">FREQUENCY (DOSE PER TIME OF DAY)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([["M", "Morning", freqM], ["A", "Afternoon", freqA], ["N", "Night", freqN]] as const).map(([slot, label, value]) => (
                      <div key={slot} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground text-center">{label}</p>
                        <Select value={value} onValueChange={(v) => setFreq(slot, v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DOSE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Sig: {newMed.frequency.replace(/\+/g, " + ")}</p>
                </div>
                <div className="flex gap-1.5">
                  {(["Before Meal", "After Meal"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setNewMed({ ...newMed, meal: m })} className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold border transition-colors ${newMed.meal === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-chip"}`}>{m}</button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeMedDialog}>Cancel</Button>
                <Button type="button" onClick={saveMedicine}>{editingIndex !== null ? "Save Changes" : "Save Medicine"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="mt-6 space-y-5">
            {medicines.length === 0 && <p className="text-xs italic text-muted-foreground">No medicines yet.</p>}
            {medicines.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ x: 2 }}
                onClick={() => openEditMedicine(i)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") openEditMedicine(i); }}
                className="group flex items-start gap-4 cursor-pointer rounded-lg -mx-2 px-2 py-1 hover:bg-muted/30 transition-colors">
                <div className="h-3 w-3 rounded-full bg-accent mt-2 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-primary">{m.name}</p>
                    <span className="rounded-md bg-muted/60 px-2 py-0.5 text-xs font-semibold text-foreground/70">{m.dose}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{m.frequency}</span><span>•</span>
                    <span className="text-primary-glow font-semibold">{m.days}</span>
                    <span className="ml-auto text-foreground/60">{m.meal}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setMedicines((arr) => arr.filter((_, idx) => idx !== i)); toast.message("Removed"); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive mt-1.5" aria-label="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>

          <div className="mt-12">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Lightbulb className="h-4 w-4" /> General Advice</p>
              <button onClick={() => setAdviceOpen((o) => !o)} className="flex items-center gap-1 text-xs font-semibold text-primary border border-border rounded-full px-3 py-1 hover:bg-chip transition-colors">
                <Plus className={`h-3 w-3 transition-transform ${adviceOpen ? "rotate-45" : ""}`} /> Add Advice
              </button>
            </div>
            {adviceOpen && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 mt-3">
                <input autoFocus value={newAdvice} onChange={(e) => setNewAdvice(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveAdvice()} placeholder="Type advice…" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button onClick={saveAdvice} className="rounded-lg bg-primary text-primary-foreground px-3 text-xs font-semibold hover:opacity-90">Save</button>
              </motion.div>
            )}
            <div className="rounded-xl bg-muted/40 border border-border/40 p-5 mt-3 space-y-2 text-sm text-foreground/80">
              {advice.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">No advice yet.</p>
              ) : advice.map((a, i) => (
                <div key={i} className="group flex items-start justify-between gap-2">
                  <p className="flex-1">{a}</p>
                  <button onClick={() => { setAdvice((arr) => arr.filter((_, idx) => idx !== i)); toast.message("Removed"); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" aria-label="Remove">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 flex flex-col items-end">
            <div className="font-display text-2xl italic text-primary">HealthFlow</div>
            <div className="border-t border-border w-48 mt-1 pt-2 text-right text-xs text-muted-foreground">
              Digitally Signed By<br /><span className="font-semibold text-primary">{doctor.name}</span>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-muted/40 p-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary"><History className="h-4 w-4" /> Patient History</p>
              <span className="text-[10px] font-bold tracking-widest text-primary-glow">{history.length} VISIT{history.length === 1 ? "" : "S"}</span>
            </div>
            <div className="mt-4 space-y-4 border-l border-border ml-1 pl-4">
              {history.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">No past visits on file yet.</p>
              ) : history.map(h => (
                <div key={h.id} className="relative">
                  <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary-glow" />
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{formatDate(h.scheduled_date).toUpperCase()}</p>
                  <p className="text-sm font-semibold text-primary mt-0.5">{h.department || "Consultation"}</p>
                  {h.notes && <p className="text-xs text-muted-foreground mt-1">{h.notes}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-muted/40 border border-border/40 p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> ALLERGIES</p>
            <p className="text-sm text-muted-foreground mt-2 italic">Not recorded yet.</p>
          </div>

          <div className="rounded-2xl bg-gradient-dark text-surface-dark-foreground p-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Suggestions</p>
              <span className="text-[9px] font-bold tracking-widest opacity-70">BASED ON DIAGNOSIS</span>
            </div>
            <div className="mt-4 space-y-2">
              {[
                { t: "RevitaCell-G", d: "Cellular regeneration support" },
                { t: "NeoHydra Forte", d: "Advanced rehydration salts" },
              ].map(a => (
                <button key={a.t} onClick={() => toast.success(`Added ${a.t}`)} className="w-full flex items-center justify-between rounded-xl bg-surface-dark-foreground/10 p-3 hover:bg-surface-dark-foreground/15 transition-colors text-left">
                  <div>
                    <p className="font-semibold text-sm">{a.t}</p>
                    <p className="text-[10px] opacity-70">{a.d}</p>
                  </div>
                  <Plus className="h-4 w-4" />
                </button>
              ))}
            </div>
            <p className="text-[10px] opacity-60 mt-4 border-t border-surface-dark-foreground/15 pt-3">AI analysis based on Genomic session data and latest clinical guidelines.</p>
          </div>

          <div className="rounded-2xl bg-muted/40 p-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Users className="h-4 w-4" /> Today&apos;s Queue</p>
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground">REMAINING: {sideRemaining}</span>
            </div>
            <div className="mt-4 space-y-2">
              {sideLoading ? (
                <div className="flex justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : sideQueue.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No one else waiting.</p>
              ) : (
                sideQueue.map(p => {
                  const isCurrent = p.id === appointmentId;
                  return (
                    <div key={p.id} className={`flex items-center gap-3 rounded-xl p-2 ${isCurrent ? "bg-chip" : ""}`}>
                      <div className="h-9 w-9 rounded-full bg-chip flex items-center justify-center font-display text-xs text-primary shrink-0">
                        {initials(p.patient?.full_name ?? "?")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary truncate">{p.patient?.full_name ?? "Patient"}</p>
                        <p className="text-[10px] tracking-widest font-bold text-primary-glow">
                          {isCurrent ? "VIEWING" : p.in_consultation ? "IN CONSULTATION" : p.waited_minutes > 0 ? `WAITING - ${p.waited_minutes}M` : "WAITING"}
                        </p>
                      </div>
                      <button
                        onClick={() => sideStartConsult(p)}
                        disabled={isCurrent || sideStartingId === p.id}
                        className="shrink-0 rounded-full bg-gradient-dark text-surface-dark-foreground px-3 py-1.5 text-[10px] font-semibold tracking-wider hover:opacity-90 shadow-glow disabled:opacity-60"
                      >
                        {isCurrent ? "Current" : sideStartingId === p.id ? "Starting..." : p.in_consultation ? "In Consult" : "Start Consult"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-6">
        <button onClick={() => toast.success("Saved as draft")} className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-primary hover:bg-chip transition-colors">Save as Draft</button>
        <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-7 py-3 text-sm font-semibold hover:opacity-90 shadow-glow disabled:opacity-60">
          <Printer className="h-4 w-4" /> {submitting ? "Submitting..." : "Print & Submit"}
        </button>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8" onClick={() => setPreviewOpen(false)}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl my-4"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3 rounded-t-2xl">
              <p className="text-sm font-semibold text-slate-700">Prescription Preview</p>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 rounded-full bg-slate-900 text-white px-4 py-2 text-xs font-semibold hover:opacity-90">
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button onClick={() => setPreviewOpen(false)} className="rounded-full border border-slate-300 p-2 hover:bg-slate-100" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div id="rx-print-area" className="px-10 py-8 font-serif text-slate-900 bg-[linear-gradient(to_bottom,#ffffff,#fbfbf6)]">
              {/* Letterhead */}
              <div className="flex items-start justify-between pb-4 border-b-2 border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full border-2 border-emerald-700 text-emerald-700 flex items-center justify-center font-bold text-xl">{hospital.name[0] ?? "H"}</div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-emerald-800">{hospital.name}</h1>
                    <p className="text-[11px] text-slate-500 italic">
                      {[hospital.address, hospital.contact_phone].filter(Boolean).join(" • ") || "Address not on file"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-bold text-slate-900">{doctor.name}</h2>
                  <p className="text-[11px] text-slate-600 italic">{doctor.education || doctor.specialty || "—"}</p>
                </div>
              </div>

              {/* Patient bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 py-3 border-b border-dashed border-slate-300 text-[12px]">
                {[
                  ["Name", patient.full_name],
                  ["Age / Sex", `${ageLong(patient.age)} / ${genderLabel(patient.gender)}`],
                  ["Patient ID", patient.mrn],
                  ["Date", formatDate(appointment.scheduled_date)],
                  ["Weight", patient.weight_kg != null ? `${patient.weight_kg} kg` : "—"],
                  ["Height", heightLabel(patient.height_feet, patient.height_inches)],
                  ["BP", bpLabel(appointment.bp_systolic, appointment.bp_diastolic)],
                ].map(([l, v]) => (
                  <div key={l} className="flex gap-1.5">
                    <span className="text-slate-500">{l}:</span>
                    <span className="font-semibold text-slate-900 truncate">{v}</span>
                  </div>
                ))}
              </div>

              {/* Body: left clinical / right Rx */}
              <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-0 min-h-[460px]">
                {/* LEFT */}
                <div className="md:pr-6 md:border-r border-slate-300 py-5 space-y-5">
                  {[
                    ["C/O", "Chief Complaints", complaints],
                    ["O/E", "On Examination", examination],
                    ["Inv", "Investigation", investigation],
                    ["Dx", "Diagnosis", diagnosis],
                  ].map(([abbr, title, items]) => (
                    <div key={title as string}>
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{abbr as string}</span>
                        <p className="text-[11px] tracking-widest font-semibold text-slate-500 uppercase">{title as string}</p>
                      </div>
                      {(items as string[]).length === 0 ? (
                        <p className="text-xs italic text-slate-400 pl-1">—</p>
                      ) : (
                        <ul className="text-[13px] text-slate-800 leading-relaxed pl-1 space-y-0.5">
                          {(items as string[]).map((it, i) => (
                            <li key={i} className="flex gap-2"><span className="text-slate-400">›</span><span>{it}</span></li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                {/* RIGHT */}
                <div className="md:pl-6 py-5 flex flex-col">
                  <div className="flex items-end gap-2 -mb-1">
                    <span className="text-6xl italic font-bold text-emerald-800 leading-none">℞</span>
                    <span className="text-[10px] tracking-widest font-semibold text-slate-500 uppercase pb-2">Prescription</span>
                  </div>

                  <div className="mt-4 flex-1">
                    {medicines.length === 0 ? (
                      <p className="text-xs italic text-slate-400">No medicines prescribed.</p>
                    ) : (
                      <ol className="space-y-3">
                        {medicines.map((m, i) => (
                          <li key={i} className="grid grid-cols-[auto_1fr] gap-3">
                            <span className="font-bold text-slate-900 text-sm pt-0.5">{i + 1}.</span>
                            <div>
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-[15px]">{m.name}</span>
                                <span className="text-[11px] text-slate-600 italic">({m.dose})</span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[12px] text-slate-700 pl-1">
                                <span><span className="text-slate-400">Sig:</span> <span className="font-semibold tracking-wider">{m.frequency}</span></span>
                                <span><span className="text-slate-400">Duration:</span> <span className="font-semibold">{m.days}</span></span>
                                <span className="italic text-slate-600">— {m.meal}</span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  {/* Advice */}
                  <div className="mt-6 pt-4 border-t border-dashed border-slate-300">
                    <p className="text-[11px] tracking-widest font-semibold text-slate-500 uppercase mb-2">Advice & Follow-up</p>
                    {advice.length === 0 ? (
                      <p className="text-xs italic text-slate-400">—</p>
                    ) : (
                      <ul className="text-[12.5px] text-slate-700 space-y-1 leading-relaxed">
                        {advice.map((a, i) => (
                          <li key={i} className="flex gap-2"><span className="text-emerald-700">•</span><span>{a}</span></li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer / signature */}
              <div className="mt-6 pt-4 border-t-2 border-slate-800 flex items-end justify-between">
                <div className="text-[10px] text-slate-500 italic max-w-xs">
                  This prescription is digitally signed and valid without a physical signature. Please consult before any dose changes.
                </div>
                <div className="text-right">
                  <div className="text-2xl italic font-bold text-emerald-800 leading-none">HealthFlow</div>
                  <div className="border-t border-slate-400 w-52 mt-1 pt-1 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-900">{doctor.name}</span>
                    <div className="text-[10px] text-slate-500">Digitally Signed</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <Dialog open={vitalsOpen} onOpenChange={(o) => !savingVitals && setVitalsOpen(o)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary">Update Vitals</DialogTitle>
            <DialogDescription>Weight and height for {patient.full_name}. Leave blank to clear.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Weight (kg)</Label>
              <Input type="number" min="0" step="0.1" value={vitalsForm.weight}
                onChange={(e) => setVitalsForm(f => ({ ...f, weight: e.target.value }))} placeholder="e.g. 64" />
            </div>
            <div className="space-y-1.5">
              <Label>Height</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" min="0" step="1" value={vitalsForm.heightFeet}
                  onChange={(e) => setVitalsForm(f => ({ ...f, heightFeet: e.target.value }))} placeholder="Feet, e.g. 5" />
                <Input type="number" min="0" max="11" step="1" value={vitalsForm.heightInches}
                  onChange={(e) => setVitalsForm(f => ({ ...f, heightInches: e.target.value }))} placeholder="Inches, e.g. 4" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVitalsOpen(false)} disabled={savingVitals}>Cancel</Button>
            <Button type="button" onClick={saveVitals} disabled={savingVitals}>{savingVitals ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bpOpen} onOpenChange={(o) => !savingBp && setBpOpen(o)}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary">Blood Pressure</DialogTitle>
            <DialogDescription>For {patient.full_name}&apos;s visit today. Leave blank to clear.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Systolic</Label>
              <Input type="number" min="0" step="1" value={bpForm.systolic}
                onChange={(e) => setBpForm(f => ({ ...f, systolic: e.target.value }))} placeholder="e.g. 120" />
            </div>
            <div className="space-y-1.5">
              <Label>Diastolic</Label>
              <Input type="number" min="0" step="1" value={bpForm.diastolic}
                onChange={(e) => setBpForm(f => ({ ...f, diastolic: e.target.value }))} placeholder="e.g. 80" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBpOpen(false)} disabled={savingBp}>Cancel</Button>
            <Button type="button" onClick={saveBp} disabled={savingBp}>{savingBp ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={patientOpen} onOpenChange={(o) => !savingPatient && setPatientOpen(o)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary">Age &amp; Gender</DialogTitle>
            <DialogDescription>For {patient.full_name}. Days or Months for a newborn — leave the age blank to clear it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Age</Label>
              <div className="flex gap-2">
                <Input type="number" min="0" step="1" value={patientForm.ageValue}
                  onChange={(e) => setPatientForm(f => ({ ...f, ageValue: e.target.value }))} placeholder="e.g. 3" className="flex-1" />
                <Select value={patientForm.ageUnit} onValueChange={(v) => setPatientForm(f => ({ ...f, ageUnit: v as Age["unit"] }))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="years">Years</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={patientForm.gender || "unspecified"} onValueChange={(v) => setPatientForm(f => ({ ...f, gender: v === "unspecified" ? "" : (v as Gender) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">Not specified</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPatientOpen(false)} disabled={savingPatient}>Cancel</Button>
            <Button type="button" onClick={savePatientDetails} disabled={savingPatient}>{savingPatient ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  </PortalLayout>
  );
};
export default Prescription;
