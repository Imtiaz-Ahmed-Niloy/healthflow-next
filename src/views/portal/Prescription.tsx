"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, ClipboardList, ClipboardCheck, FlaskConical, Stethoscope, Lightbulb, History, AlertTriangle, Users, Printer, X, Search, Check, Store, Building2 } from "lucide-react";
import { PrescriptionPreview } from "@/components/common/PrescriptionPreview";
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
import { rememberedPlace, rememberPlace } from "@/lib/rxPlace";
import { SuggestInput, type Suggestion } from "@/components/portal/SuggestInput";
import { useInvestigations } from "@/hooks/useInvestigations";
import { useAdvice } from "@/hooks/useAdvice";

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
 * navigate). The sidebar card once labeled "AI Suggestions" now shows real
 * data too -- this doctor's own most-prescribed medicines
 * (0029_doctor_medicine_usage.sql, same /api/v1/portal/medicines?recent=1
 * the Add Medicine picker's default view uses), not an AI-generated
 * suggestion. Tapping one opens Add Medicine pre-filled with its name and
 * form, same as picking it from search.
 */

type Gender = "male" | "female" | "other";
type Age = { value: number; unit: "years" | "months" | "days" };
// dosage_form ("Tablet", "Capsule", "Syrup", "Drops", ...) matters beyond
// cosmetics -- the same brand often comes in more than one form (a syrup or
// drops for a child, a tablet or capsule for an adult), so it's part of
// *which* medicine was actually prescribed, not just how it's printed.
// "" means not set (a doctor typed a name MedEx had no match for, so there
// was nothing to carry the form over from).
type Medicine = { name: string; dosage_form: string; dose: string; frequency: string; days: string; meal: "Before Meal" | "After Meal" };

type ConsultationCtx = {
  /** `name` is null for a chamber with no name of its own (0091). */
  hospital: { name: string | null; address: string | null; contact_phone: string | null };
  doctor: { name: string; specialty: string | null; education: string | null; bmdc_number?: string | null };
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
    /** Where the visit is (a hospital or chamber), and whether it may be moved (0091). */
    tenant_id?: string;
    walk_in?: boolean;
    bp_systolic: number | null;
    bp_diastolic: number | null;
    complaints: string[];
    examination: string[];
    investigation: string[];
    diagnosis: string[];
    medicines: Medicine[];
    advice: string[];
  };
  history: { id: string; scheduled_date: string; department: string | null; notes: string | null }[];
};

/** One of the doctor's hospitals or chambers, as /api/v1/portal/me lists it. */
type Place = {
  id: string;
  name: string;
  kind: "hospital" | "chamber";
  has_name: boolean;
  address: string | null;
  contact_phone: string | null;
};

type Me = { name: string; specialty: string | null; education: string | null; bmdc_number: string | null; hospitals: Place[] };

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
  onUpdate: (i: number, v: string) => void;
  onRemove: (i: number) => void;
  placeholder?: string;
  multiline?: boolean;
  /** Offered as the doctor types; free text still goes in (Investigation, 0094). */
  suggestions?: Suggestion[];
};

const EditableSection = ({ icon: Icon, title, action, items, onAdd, onUpdate, onRemove, placeholder, multiline, suggestions }: EditableSectionProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  // null = the open input is adding a new entry; an index = editing that
  // entry in `items` in place (clicking an existing line, same pattern as
  // the Rx list's click-to-edit).
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const toggleAdd = () => {
    if (open && editingIndex === null) {
      setOpen(false);
      return;
    }
    setEditingIndex(null);
    setValue("");
    setOpen(true);
  };

  const startEdit = (i: number) => {
    setEditingIndex(i);
    setValue(items[i]);
    setOpen(true);
  };

  const submit = (picked?: string) => {
    const v = (picked ?? value).trim();
    if (!v) return;
    if (editingIndex !== null) {
      onUpdate(editingIndex, v);
      toast.success(`${title} updated`);
    } else {
      onAdd(v);
      toast.success(`${title} added`);
    }
    setValue("");
    setEditingIndex(null);
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-primary text-sm"><Icon className="h-4 w-4" /> {title}</h3>
        <button
          onClick={toggleAdd}
          className="flex items-center gap-1 text-xs font-semibold text-primary border border-border rounded-full px-3 py-1 hover:bg-chip transition-colors"
        >
          <Plus className={`h-3 w-3 transition-transform ${open && editingIndex === null ? "rotate-45" : ""}`} /> {action}
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
          ) : suggestions ? (
            <SuggestInput value={value} onChange={setValue} onPick={submit} suggestions={suggestions} placeholder={placeholder} />
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
          <button onClick={() => submit()} className="rounded-lg bg-primary text-primary-foreground px-3 text-xs font-semibold hover:opacity-90">
            {editingIndex !== null ? "Update" : "Save"}
          </button>
        </motion.div>
      )}

      <div className="rounded-xl bg-muted/40 border border-border/40 p-4 min-h-[110px] text-sm text-foreground/80 space-y-1.5">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-xs italic">No entries yet. Click &quot;{action}&quot; to add.</p>
        ) : (
          items.map((it, i) => (
            <div key={i} className="group flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => startEdit(i)}
                className="flex-1 text-left whitespace-pre-line hover:text-primary transition-colors"
              >
                – {it}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(i); toast.message("Removed"); }}
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
  const { investigations: investigationList } = useInvestigations();
  const { advice: adviceList } = useAdvice();

  const [ctx, setCtx] = useState<ConsultationCtx | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(!!appointmentId);
  const [ctxError, setCtxError] = useState<string | null>(null);
  // Bumped to read the visit again — after it moves to another place.
  const [ctxVersion, setCtxVersion] = useState(0);

  // The doctor and every place they see patients, for the header's place
  // picker (0091) and for a pad with no patient on it yet.
  const [me, setMe] = useState<Me | null>(null);
  // The place this machine last chose — a blank pad starts there.
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    setPlaceId(rememberedPlace());
    let active = true;
    fetch("/api/v1/portal/me")
      .then(res => res.json())
      .then(body => { if (active && body?.data) setMe(body.data as Me); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

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
  }, [appointmentId, ctxVersion]);

  /**
   * The header's place picker. A pad with no patient just changes where it is
   * headed; a walk-in still waiting is refiled there (move_walk_in, 0091).
   * Either way this machine remembers it. A booked visit never gets here —
   * it stays where the patient booked it.
   */
  const choosePlace = async (place: Place) => {
    setPlaceOpen(false);
    rememberPlace(place.id);
    setPlaceId(place.id);
    if (!appointmentId || !ctx || ctx.appointment.tenant_id === place.id) return;

    setMoving(true);
    try {
      const res = await fetch(`/api/v1/portal/consultation/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move", tenant_id: place.id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error("Couldn't move this patient", { description: body?.error?.message }); return; }
      toast.success(`${ctx.patient.full_name} is now seen at ${place.name}`);
      setCtxVersion(v => v + 1);
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setMoving(false);
    }
  };

  // "Today's Queue" sidebar -- same endpoint Queue.tsx itself reads, so the
  // doctor can jump to a different patient without leaving the chart.
  /** Everything the pad holds between renders and across a reload. */
type DraftShape = {
  complaints: string[];
  examination: string[];
  investigation: string[];
  diagnosis: string[];
  medicines: Medicine[];
  advice: string[];
};

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

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medOpen, setMedOpen] = useState(false);
  // null = adding a new medicine; an index = editing that entry in `medicines` in place.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const emptyMed: Medicine = { name: "", dosage_form: "", dose: "", frequency: "0+0+0", days: "", meal: "After Meal" };
  const FORM_PRESETS = ["Tablet", "Capsule", "Syrup", "Drops", "Injection", "Cream", "Inhaler"];
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
  const medSearchSeq = useRef(0);

  // This doctor's own most-prescribed medicines -- real prescribing history
  // from `doctor_medicine_usage` (0029_doctor_medicine_usage.sql), fetched
  // once up front on page load, well before the Add Medicine dialog is even
  // opened. That's the point: the picker's default view (before a doctor
  // types anything) has to be there *the instant* the dialog opens, same as
  // the old localStorage cache was -- fetching it lazily when the dialog
  // opens re-introduces exactly the loading flash that cache never had.
  // Same data also feeds the sidebar's "Quick Add" card.
  const [quickMeds, setQuickMeds] = useState<MedicineHit[]>([]);
  const [quickMedsLoading, setQuickMedsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/portal/medicines?recent=1");
        const body = await res.json().catch(() => null);
        if (res.ok) setQuickMeds(body?.data ?? []);
      } catch {
        // preload convenience -- fail quietly, a search still works either way
      } finally {
        setQuickMedsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!medPickerOpen) return;
    const q = medQuery.trim();
    if (!q) {
      // Nothing typed -- show the preloaded list immediately, no fetch, no
      // "Searching…" flash. This is the one case that's never a live call.
      setMedResults(quickMeds);
      setMedSearching(false);
      return;
    }
    if (q.length === 1) {
      // Not enough to search yet -- the CommandList below shows its own
      // "type at least 2 letters" message for this case, nothing to fetch.
      setMedResults([]);
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
  }, [medQuery, medPickerOpen, quickMeds]);

  const pickMedicine = (m: MedicineHit) => {
    // dosage_form comes from *this specific* search result, not merged with
    // whatever was there before -- Napa the tablet and Napa the syrup are
    // different listings with their own dosage_form, so picking one should
    // always overwrite, not just fill a blank.
    setNewMed((f) => ({ ...f, name: m.brand_name, dosage_form: m.dosage_form || "", dose: f.dose || m.strength || "" }));
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
        {m.dosage_form && <span className="text-sm font-normal text-muted-foreground">{m.dosage_form} </span>}
        <span className="text-base font-semibold text-foreground">{m.brand_name}</span>
        {m.strength && <span className="text-sm font-normal text-muted-foreground"> {m.strength}</span>}
      </p>
      {m.brand_name === newMed.name && <Check className="h-4 w-4 text-primary shrink-0" />}
    </CommandItem>
  );

  /** Opens Add Medicine pre-filled with a Quick Add pick -- dose/days/frequency still need the doctor's input, so this doesn't just append an incomplete Rx line. */
  const quickAddMedicine = (m: MedicineHit) => {
    setEditingIndex(null);
    // m.strength carries this doctor's last-used dose for this medicine
    // here (see /api/v1/portal/medicines's ?recent=1 handler) -- same field
    // pickMedicine reads for a live search result, so it prefills Dose the
    // same way, just still fully editable.
    setNewMed({ ...emptyMed, name: m.brand_name, dosage_form: m.dosage_form ?? "", dose: m.strength ?? "" });
    setFreqM("0");
    setFreqA("0");
    setFreqN("0");
    setMedOpen(true);
  };

  const [advice, setAdvice] = useState<string[]>([]);
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [newAdvice, setNewAdvice] = useState("");
  // null = adding a new advice line; an index = editing that entry in place --
  // same click-to-edit pattern as the Rx list and the four EditableSections.
  const [editingAdviceIndex, setEditingAdviceIndex] = useState<number | null>(null);
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

  /**
   * Draft slot for a pad opened with no patient on it.
   *
   * The page used to refuse to render at all without ?appointment=. It now
   * opens a working pad, so a doctor can start writing while the patient is
   * still walking in and attach it from Today's Queue afterwards. That only
   * holds together if what they typed survives picking the patient — and
   * picking one is a route change, so it has to go through storage.
   */
  const UNASSIGNED_DRAFT = "unassigned";
  const [draftReady, setDraftReady] = useState(false);

  // Load (or reset, when jumping to a different patient from the sidebar)
  // once we know which appointment we're on AND ctx has finished loading --
  // waiting on ctx matters because a *submitted* visit's real chart lives on
  // the server now (0028_appointments_prescription_content.sql), and that
  // has to win over a stale local draft, not the other way around. Only an
  // appointment ctx says has nothing saved yet falls back to the draft.
  useEffect(() => {
    setDraftReady(false);

    // No patient yet: restore whatever was being written on the loose pad.
    if (!appointmentId) {
      let loose: Partial<DraftShape> | null = null;
      try {
        const raw = localStorage.getItem(draftKey(UNASSIGNED_DRAFT));
        if (raw) loose = JSON.parse(raw);
      } catch {
        // corrupt draft -- start clean rather than fail the page
      }
      setComplaints(loose?.complaints ?? []);
      setExamination(loose?.examination ?? []);
      setInvestigation(loose?.investigation ?? []);
      setDiagnosis(loose?.diagnosis ?? []);
      setMedicines((loose?.medicines ?? []).map((m) => ({ ...m, dosage_form: m.dosage_form ?? "" })));
      setAdvice(loose?.advice ?? []);
      setDraftReady(true);
      return;
    }
    if (loadingCtx) return; // wait -- don't decide before we know what the server has

    const saved = ctx?.appointment;
    const hasServerContent =
      !!saved &&
      (saved.complaints.length > 0 ||
        saved.examination.length > 0 ||
        saved.investigation.length > 0 ||
        saved.diagnosis.length > 0 ||
        saved.medicines.length > 0 ||
        saved.advice.length > 0);

    if (hasServerContent && saved) {
      setComplaints(saved.complaints);
      setExamination(saved.examination);
      setInvestigation(saved.investigation);
      setDiagnosis(saved.diagnosis);
      setMedicines(saved.medicines);
      setAdvice(saved.advice);
      // The server is the source of truth now -- a leftover local draft
      // (e.g. from before this visit was submitted) would just be stale.
      try {
        localStorage.removeItem(draftKey(appointmentId));
      } catch {
        // nothing to clean up if storage isn't available
      }
      setDraftReady(true);
      return;
    }

    let draft: Partial<DraftShape> | null = null;
    try {
      const raw = localStorage.getItem(draftKey(appointmentId));
      if (raw) draft = JSON.parse(raw);

      // Adopt the loose pad: the doctor wrote this before choosing a patient,
      // then chose one. Only when this appointment has nothing of its own —
      // an existing draft for THIS patient must never be overwritten by notes
      // meant for someone else.
      if (!raw) {
        const loose = localStorage.getItem(draftKey(UNASSIGNED_DRAFT));
        if (loose) {
          draft = JSON.parse(loose);
          localStorage.removeItem(draftKey(UNASSIGNED_DRAFT));
        }
      }
    } catch {
      // corrupt draft -- ignore, start clean rather than fail the page
    }
    setComplaints(draft?.complaints ?? []);
    setExamination(draft?.examination ?? []);
    setInvestigation(draft?.investigation ?? []);
    setDiagnosis(draft?.diagnosis ?? []);
    // A draft saved before dosage_form existed won't have it -- default so
    // the dialog's controlled Input never sees undefined.
    setMedicines((draft?.medicines ?? []).map((m) => ({ ...m, dosage_form: m.dosage_form ?? "" })));
    setAdvice(draft?.advice ?? []);
    setDraftReady(true);
  }, [appointmentId, ctx, loadingCtx]);

  // Persist on every change -- but only once the load above has actually
  // run for this appointment, so an empty first render doesn't stomp a draft
  // we haven't read yet. A pad with no patient persists too, under
  // UNASSIGNED_DRAFT, so choosing one from the queue does not throw it away.
  useEffect(() => {
    if (!draftReady) return;
    try {
      localStorage.setItem(
        draftKey(appointmentId ?? UNASSIGNED_DRAFT),
        JSON.stringify({ complaints, examination, investigation, diagnosis, medicines, advice })
      );
    } catch {
      // storage full/unavailable -- best-effort safety net, not the primary save
    }
  }, [appointmentId, draftReady, complaints, examination, investigation, diagnosis, medicines, advice]);

  // Printing lives in PrescriptionPreview now, the sheet shared with the
  // patient's medical records — see that component for why it prints the
  // page directly rather than a popup.

  const closeMedDialog = () => {
    setMedOpen(false);
    setNewMed(emptyMed);
    setMedQuery("");
    setMedPickerOpen(false);
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
      // Counts the moment it's added, not on final submit -- a doctor
      // shouldn't have to finish and print the whole visit before "used it"
      // registers. Only a fresh add counts; re-saving edits to an
      // already-added line doesn't fire this again. Fire-and-forget: this
      // is a convenience list, not the record of the visit itself.
      fetch("/api/v1/portal/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newMed.name, dosage_form: newMed.dosage_form, dose: newMed.dose }),
      })
        .then(() => fetch("/api/v1/portal/medicines?recent=1"))
        .then((r) => r.json())
        .then((b) => setQuickMeds(b?.data ?? []))
        .catch(() => {});
    }
    const wasEditing = editingIndex !== null;
    closeMedDialog();
    toast.success(wasEditing ? "Medicine updated" : "Medicine added");
  };
  const toggleAddAdvice = () => {
    if (adviceOpen && editingAdviceIndex === null) {
      setAdviceOpen(false);
      return;
    }
    setEditingAdviceIndex(null);
    setNewAdvice("");
    setAdviceOpen(true);
  };

  const startEditAdvice = (i: number) => {
    setEditingAdviceIndex(i);
    setNewAdvice(advice[i]);
    setAdviceOpen(true);
  };

  const saveAdvice = (picked?: string) => {
    const v = (picked ?? newAdvice).trim();
    if (!v) return;
    if (editingAdviceIndex !== null) {
      setAdvice((a) => a.map((x, idx) => (idx === editingAdviceIndex ? v : x)));
      toast.success("Advice updated");
    } else {
      setAdvice((a) => [...a, v]);
      toast.success("Advice added");
    }
    setNewAdvice("");
    setEditingAdviceIndex(null);
    setAdviceOpen(false);
  };

  const addTo = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter((arr) => [...arr, v]);
  const updateIn = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (i: number, v: string) =>
    setter((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  const removeFrom = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (i: number) =>
    setter((arr) => arr.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!appointmentId) {
      // Still show the preview — seeing the finished sheet is useful even
      // before it belongs to anyone — but be explicit that nothing has been
      // filed, since this used to be unreachable and now is not.
      toast.error("Pick a patient first", {
        description: "This is a preview. Choose a patient from Today’s Queue to submit it.",
      });
      setPreviewOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/portal/consultation/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", complaints, examination, investigation, diagnosis, medicines, advice }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Couldn't mark this visit completed, but here's the preview.");
      } else {
        toast.success("Visit marked completed");
        setCtx((c) =>
          c ? { ...c, appointment: { ...c.appointment, status: "completed", complaints, examination, investigation, diagnosis, medicines, advice } } : c
        );
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
    if (!appointmentId) {
      // The pad opens without a patient now, so this is reachable. Say what
      // to do instead of failing silently.
      toast.error("Pick a patient first", {
        description: "Choose one from Today’s Queue, then save.",
      });
      return;
    }
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
    if (!appointmentId) {
      // The pad opens without a patient now, so this is reachable. Say what
      // to do instead of failing silently.
      toast.error("Pick a patient first", {
        description: "Choose one from Today’s Queue, then save.",
      });
      return;
    }
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
    if (!appointmentId) {
      // The pad opens without a patient now, so this is reachable. Say what
      // to do instead of failing silently.
      toast.error("Pick a patient first", {
        description: "Choose one from Today’s Queue, then save.",
      });
      return;
    }
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
  // No early return for a missing appointment any more. The pad opens blank
  // and fully usable so a doctor can start writing before the patient is in
  // front of them; what they type is kept under UNASSIGNED_DRAFT and adopted
  // by whichever patient they pick from Today's Queue. Saving is the one
  // thing that needs a patient, and each save path says so.

  if (loadingCtx) {
    return (
      <PortalLayout>
        <div className="rounded-3xl bg-card shadow-soft p-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </PortalLayout>
    );
  }

  // `!ctx` is the normal state for a pad with no patient on it, so it only
  // counts as a failure when an appointment was actually asked for. Without
  // this guard, removing the "No patient selected" gate turned the blank pad
  // into an error screen.
  if (appointmentId && (ctxError || !ctx)) {
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

  /**
   * What the header renders on a pad that has no patient yet.
   *
   * Every field is empty rather than sample text: this sheet can be printed,
   * and a placeholder name on something that looks like a prescription is the
   * kind of thing that gets mistaken for a real one. Dashes make it obvious
   * nothing has been chosen. The header is the doctor's own, though, and the
   * place this machine last chose (0091) — neither is a guess about a patient.
   */
  const places = me?.hospitals ?? [];
  const padPlace = places.find(p => p.id === placeId) ?? places[0] ?? null;
  const blankCtx: ConsultationCtx = {
    hospital: padPlace
      ? padPlace.has_name
        ? { name: padPlace.name, address: padPlace.address, contact_phone: padPlace.contact_phone }
        : { name: null, address: null, contact_phone: null }
      : { name: "—", address: null, contact_phone: null },
    doctor: me
      ? { name: me.name, specialty: me.specialty, education: me.education, bmdc_number: me.bmdc_number }
      : { name: "—", specialty: null, education: null },
    patient: {
      id: "", full_name: "—", gender: null, age: null, mrn: "—",
      weight_kg: null, height_feet: null, height_inches: null,
    },
    appointment: {
      // Local date, not toISOString() — that is UTC, and in Dhaka (UTC+6)
      // everything after 6pm would print yesterday's date on the sheet.
      id: "", scheduled_date: (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      })(),
      department: null, notes: null, status: "draft",
      bp_systolic: null, bp_diastolic: null,
      complaints: [], examination: [], investigation: [], diagnosis: [],
      medicines: [], advice: [],
    },
    history: [],
  };

  const { hospital, doctor, patient, appointment, history } = ctx ?? blankCtx;
  const ageGender = `${ageShort(patient.age)} / ${patient.gender ? genderLabel(patient.gender)[0] : "—"}`;

  // Which place the header is, and whether it can be swapped: on a pad with
  // no patient, or for a walk-in still waiting. A booked visit is where the
  // patient booked it.
  const headerPlaceId = ctx ? ctx.appointment.tenant_id : padPlace?.id;
  const canSwapPlace = places.length > 1
    && (!appointmentId || (!!ctx?.appointment.walk_in && ctx.appointment.status === "scheduled"));

  // A chamber with no name (0091) is the icon alone — no name, address or phone.
  const headerBlock = (
    <>
      <div className="h-14 w-14 shrink-0 rounded-xl bg-chip flex items-center justify-center text-primary"><Stethoscope className="h-6 w-6" /></div>
      {hospital.name && (
        <div className="text-left">
          <h1 className="font-display text-2xl text-primary">{hospital.name}</h1>
          <p className="text-xs text-muted-foreground">
            {hospital.address || "Address not on file"}
            {hospital.contact_phone ? <><br />{hospital.contact_phone}</> : null}
          </p>
        </div>
      )}
    </>
  );

  return (
  <PortalLayout>
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-3xl bg-card shadow-soft p-8">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border/60 pb-6">
        {canSwapPlace ? (
          // The whole block is the switch: click it to pick another of your
          // hospitals or chambers. This machine remembers the choice.
          <Popover open={placeOpen} onOpenChange={setPlaceOpen}>
            <PopoverTrigger asChild>
              <button type="button" disabled={moving} title="Change where you're seeing patients"
                className="group flex items-start gap-4 rounded-2xl -m-2 p-2 hover:bg-muted/50 transition-colors disabled:opacity-60">
                {headerBlock}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-2">
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                {appointmentId ? "Move this walk-in to" : "Where are you seeing patients?"}
              </p>
              {places.map(p => (
                <button key={p.id} type="button" onClick={() => void choosePlace(p)}
                  className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted">
                  {p.kind === "chamber" ? <Store className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> : <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-primary truncate">{p.name}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {p.kind === "chamber" ? "Your chamber" : "Hospital"}{p.address ? ` · ${p.address}` : ""}
                    </span>
                  </span>
                  {p.id === headerPlaceId && <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        ) : (
          <div className="flex gap-4">{headerBlock}</div>
        )}
        {/* Name, then degrees, specialty and BMDC number — a line each. */}
        <div className="text-right">
          <h2 className="font-display text-2xl text-primary">{doctor.name}</h2>
          {doctor.education && <p className="text-xs text-muted-foreground mt-1">{doctor.education}</p>}
          {doctor.specialty && <p className="text-xs text-muted-foreground">{doctor.specialty}</p>}
          {doctor.bmdc_number && <p className="text-xs text-muted-foreground">BMDC Reg. No. {doctor.bmdc_number}</p>}
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
            onUpdate={updateIn(setComplaints)}
            onRemove={removeFrom(setComplaints)}
          />
          <EditableSection
            icon={ClipboardCheck}
            title="Examination"
            action="Add Examination"
            placeholder="e.g. BP 120/80"
            items={examination}
            onAdd={addTo(setExamination)}
            onUpdate={updateIn(setExamination)}
            onRemove={removeFrom(setExamination)}
          />
          <EditableSection
            icon={FlaskConical}
            title="Investigation"
            action="Add Investigation"
            placeholder="Search tests, e.g. CBC, Lipid Profile"
            suggestions={investigationList}
            items={investigation}
            onAdd={addTo(setInvestigation)}
            onUpdate={updateIn(setInvestigation)}
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
            onUpdate={updateIn(setDiagnosis)}
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
                    {/* Radix caps a popover's *position* to avoid the
                        viewport, not its height -- with no bound of our own,
                        a tall result list could render partly past the
                        viewport edge with nothing able to scroll it into
                        view (the list's own overflow-y-auto only helps for
                        overflow *within* whatever box it's given). Capping
                        to --radix-popover-content-available-height (the
                        space Radix already calculated is actually free)
                        keeps the whole popover on-screen, so the list's own
                        scroll can do its job. */}
                    <PopoverContent
                      className="w-[min(520px,90vw)] p-0 flex flex-col overflow-hidden"
                      style={{ maxHeight: "var(--radix-popover-content-available-height, 420px)" }}
                      align="start"
                    >
                      <Command shouldFilter={false} className="flex-1 min-h-0">
                        <CommandInput value={medQuery} onValueChange={setMedQuery} placeholder="e.g. Napa, Seclo…" />
                        <CommandList className="max-h-[calc(420px-2.75rem)] overflow-y-auto">
                          {medSearching ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">Searching…</div>
                          ) : medQuery.trim() === "" ? (
                            medResults.length === 0 ? (
                              <div className="py-8 text-center text-sm text-muted-foreground">Type a medicine name to search.</div>
                            ) : (
                              <CommandGroup heading="Your most-prescribed — no search needed">
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
                <div>
                  {/* Auto-filled from the picked search result, but editable --
                      the same brand often comes as a tablet for an adult and a
                      syrup or drops for a child, so the form isn't always the
                      one MedEx's listing happened to match. */}
                  <Label>Form</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
                    {FORM_PRESETS.map((f) => (
                      <button key={f} type="button" onClick={() => setNewMed({ ...newMed, dosage_form: f })} className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${newMed.dosage_form === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-chip"}`}>{f}</button>
                    ))}
                  </div>
                  {/* ?? "" guards a medicine that reached this state from
                      somewhere still missing dosage_form -- an Rx line added
                      before this field existed, still sitting in memory
                      (Fast Refresh keeps component state across the edit
                      that added it) or a pre-existing localStorage draft --
                      so this Input is never uncontrolled-then-controlled. */}
                  <Input value={newMed.dosage_form ?? ""} onChange={(e) => setNewMed({ ...newMed, dosage_form: e.target.value })} placeholder="or type a form…" />
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
                    <p className="font-semibold text-primary">
                      {m.dosage_form && <span className="font-normal text-muted-foreground">{m.dosage_form} </span>}
                      {m.name}
                    </p>
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
              <button onClick={toggleAddAdvice} className="flex items-center gap-1 text-xs font-semibold text-primary border border-border rounded-full px-3 py-1 hover:bg-chip transition-colors">
                <Plus className={`h-3 w-3 transition-transform ${adviceOpen && editingAdviceIndex === null ? "rotate-45" : ""}`} /> Add Advice
              </button>
            </div>
            {adviceOpen && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 mt-3">
                <SuggestInput value={newAdvice} onChange={setNewAdvice} onPick={saveAdvice} suggestions={adviceList} placeholder="Search advice, e.g. rest, water, follow-up" />
                <button onClick={() => saveAdvice()} className="rounded-lg bg-primary text-primary-foreground px-3 text-xs font-semibold hover:opacity-90">
                  {editingAdviceIndex !== null ? "Update" : "Save"}
                </button>
              </motion.div>
            )}
            <div className="rounded-xl bg-muted/40 border border-border/40 p-5 mt-3 space-y-2 text-sm text-foreground/80">
              {advice.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">No advice yet.</p>
              ) : advice.map((a, i) => (
                <div key={i} className="group flex items-start justify-between gap-2">
                  <button type="button" onClick={() => startEditAdvice(i)} className="flex-1 text-left hover:text-primary transition-colors">{a}</button>
                  <button onClick={(e) => { e.stopPropagation(); setAdvice((arr) => arr.filter((_, idx) => idx !== i)); toast.message("Removed"); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" aria-label="Remove">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 flex flex-col items-end">
            {/* Room above the line for the doctor's own signature. */}
            <div aria-hidden className="h-8" />
            <div className="border-t border-border w-48 mt-1 pt-2 text-right text-xs text-muted-foreground">
              Signed By<br /><span className="font-semibold text-primary">{doctor.name}</span>
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
              <p className="flex items-center gap-2 text-sm font-semibold"><FlaskConical className="h-4 w-4 text-accent" /> Quick Add</p>
              <span className="text-[9px] font-bold tracking-widest opacity-70">YOUR MOST-PRESCRIBED</span>
            </div>
            <div className="mt-4 space-y-2">
              {quickMedsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-surface-dark-foreground/40 border-t-transparent" />
                </div>
              ) : quickMeds.length === 0 ? (
                <p className="text-xs opacity-70 py-2">Nothing prescribed yet — add a medicine and it&apos;ll show up here next time.</p>
              ) : (
                quickMeds.map((m) => (
                  // Napa 20mg and Napa 40mg are separate entries on purpose
                  // (0029_doctor_medicine_usage.sql) -- both the key and the
                  // visible dose need to tell them apart, or they'd look
                  // like the same duplicated row.
                  <button
                    key={`${m.brand_name}-${m.dosage_form}-${m.strength}`}
                    onClick={() => quickAddMedicine(m)}
                    className="w-full flex items-center justify-between rounded-xl bg-surface-dark-foreground/10 p-3 hover:bg-surface-dark-foreground/15 transition-colors text-left"
                  >
                    <div>
                      <p className="font-semibold text-sm">{m.brand_name}</p>
                      {(m.dosage_form || m.strength) && (
                        <p className="text-[10px] opacity-70">{[m.dosage_form, m.strength].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                    <Plus className="h-4 w-4" />
                  </button>
                ))
              )}
            </div>
            <p className="text-[10px] opacity-60 mt-4 border-t border-surface-dark-foreground/15 pt-3">From your own prescribing history — tap one to add it to this Rx.</p>
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
        <PrescriptionPreview
          onClose={() => setPreviewOpen(false)}
          sheet={{
            hospital,
            doctor,
            patientBar: [
              ["Name", patient.full_name],
              ["Age / Sex", `${ageLong(patient.age)} / ${genderLabel(patient.gender)}`],
              ["Patient ID", patient.mrn],
              ["Date", formatDate(appointment.scheduled_date)],
              ["Weight", patient.weight_kg != null ? `${patient.weight_kg} kg` : "—"],
              ["Height", heightLabel(patient.height_feet, patient.height_inches)],
              ["BP", bpLabel(appointment.bp_systolic, appointment.bp_diastolic)],
            ],
            complaints, examination, investigation, diagnosis, medicines, advice,
          }}
        />
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
