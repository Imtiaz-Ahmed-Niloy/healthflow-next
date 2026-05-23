'use client';
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, ClipboardList, ClipboardCheck, FlaskConical, Stethoscope, Lightbulb, Sparkles, History, AlertTriangle, Users, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { queue } from "@/data/queue";


type EditableSectionProps = {
  icon: any;
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
          <p className="text-muted-foreground text-xs italic">No entries yet. Click "{action}" to add.</p>
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
  const [complaints, setComplaints] = useState<string[]>(["Fever", "Cough", "Runny Nose"]);
  const [examination, setExamination] = useState<string[]>(["BP", "Pulse", "Temperature", "SPO2"]);
  const [investigation, setInvestigation] = useState<string[]>(["CBC", "RBS", "Electrolyte"]);
  const [diagnosis, setDiagnosis] = useState<string[]>([
    "Early stage presentation suggestive of Rheumatoid Arthritis. Awaiting comprehensive serology panel results.",
  ]);

  type Medicine = { name: string; dose: string; frequency: string; days: string; meal: "Before Meal" | "After Meal" };
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: "Folic Acid", dose: "5mg", frequency: "1+0+0", days: "90 Days", meal: "Before Meal" },
    { name: "Folic Acid", dose: "5mg", frequency: "1+0+0", days: "90 Days", meal: "After Meal" },
  ]);
  const [medOpen, setMedOpen] = useState(false);
  const emptyMed: Medicine = { name: "", dose: "", frequency: "1+0+0", days: "", meal: "Before Meal" };
  const [newMed, setNewMed] = useState<Medicine>(emptyMed);
  const FREQS = ["1+0+0", "0+1+0", "0+0+1", "1+1+0", "1+0+1", "0+1+1", "1+1+1"];

  const [advice, setAdvice] = useState<string[]>([
    "Follow up required in 4 weeks with CBC and LFT lab reports.",
    "Engage in gentle stretching or swimming; avoid high-impact activities.",
    "Report any signs of respiratory infection immediately.",
  ]);
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [newAdvice, setNewAdvice] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const saveMedicine = () => {
    if (!newMed.name.trim() || !newMed.dose.trim() || !newMed.days.trim()) {
      toast.error("Fill name, dose and days");
      return;
    }
    setMedicines((m) => [...m, newMed]);
    setNewMed(emptyMed);
    setMedOpen(false);
    toast.success("Medicine added");
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

  return (
  <PortalLayout>
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-3xl bg-card shadow-soft p-8">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border/60 pb-6">
        <div className="flex gap-4">
          <div className="h-14 w-14 rounded-xl bg-chip flex items-center justify-center text-primary"><Stethoscope className="h-6 w-6" /></div>
          <div>
            <h1 className="font-display text-2xl text-primary">Green Valley Clinic</h1>
            <p className="text-xs text-muted-foreground mt-1">1280 Wellness Parkway, Suite 300<br />Portland, OR 97205</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="font-display text-2xl text-primary">Dr. Julian Vane</h2>
          <p className="text-xs text-muted-foreground mt-1">MD, PhD • Genomics Lead<br />License #MED-884920</p>
        </div>
      </div>

      {/* Patient meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-b border-border/60">
        {[
          { l: "Patient Name", v: "Eleanor Vance" },
          { l: "Age / Gender", v: "42 / F" },
          { l: "Date", v: "Oct 24, 2024" },
          { l: "Patient ID", v: "#PT-0992" },
        ].map(m => (
          <div key={m.l}>
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{m.l.toUpperCase()}</p>
            <p className="font-semibold text-primary mt-1">{m.v}</p>
          </div>
        ))}
        <div><p className="text-[10px] tracking-widest font-bold text-muted-foreground">WEIGHT</p><p className="font-semibold text-primary mt-1">64 kg</p></div>
        <div><p className="text-[10px] tracking-widest font-bold text-muted-foreground">HEIGHT</p><p className="font-semibold text-primary mt-1">6ft</p></div>
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
              onClick={() => setMedOpen((o) => !o)}
              className="flex items-center gap-1 text-xs font-semibold text-primary border border-border rounded-full px-3 py-1.5 hover:bg-chip transition-colors"
            >
              <Plus className={`h-3 w-3 transition-transform ${medOpen ? "rotate-45" : ""}`} /> Add Medicine
            </button>
          </div>

          {medOpen && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input value={newMed.name} onChange={(e) => setNewMed({ ...newMed, name: e.target.value })} placeholder="Medicine name" className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={newMed.dose} onChange={(e) => setNewMed({ ...newMed, dose: e.target.value })} placeholder="Dose (e.g. 5mg)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5">FREQUENCY (M+A+N)</p>
                <div className="flex flex-wrap gap-1.5">
                  {FREQS.map((f) => (
                    <button key={f} type="button" onClick={() => setNewMed({ ...newMed, frequency: f })} className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${newMed.frequency === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-chip"}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={newMed.days} onChange={(e) => setNewMed({ ...newMed, days: e.target.value })} placeholder="Days (e.g. 30 Days)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="flex gap-1.5">
                  {(["Before Meal", "After Meal"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setNewMed({ ...newMed, meal: m })} className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold border transition-colors ${newMed.meal === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-chip"}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => { setMedOpen(false); setNewMed(emptyMed); }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-chip">Cancel</button>
                <button onClick={saveMedicine} className="rounded-lg bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold hover:opacity-90">Save Medicine</button>
              </div>
            </motion.div>
          )}

          <div className="mt-6 space-y-5">
            {medicines.length === 0 && <p className="text-xs italic text-muted-foreground">No medicines yet.</p>}
            {medicines.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ x: 2 }} className="group flex items-start gap-4">
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
                <button onClick={() => { setMedicines((arr) => arr.filter((_, idx) => idx !== i)); toast.message("Removed"); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive mt-1.5" aria-label="Remove">
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
            <div className="font-display text-2xl italic text-primary">Jvital</div>
            <div className="border-t border-border w-48 mt-1 pt-2 text-right text-xs text-muted-foreground">
              Digitally Signed By<br /><span className="font-semibold text-primary">Dr. Julian Vane</span>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-muted/40 p-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary"><History className="h-4 w-4" /> Patient History</p>
              <span className="text-[10px] font-bold tracking-widest text-primary-glow">4 VISITS</span>
            </div>
            <div className="mt-4 space-y-4 border-l border-border ml-1 pl-4">
              {[
                { d: "SEP 12, 2023", t: "Biopsy Analysis", c: "Samples taken from lumbar region show benign cellular activity with minor inflammation." },
                { d: "AUG 05, 2023", t: "Initial Consultation", c: "First referral from Dr. Aris. Reported localized pain and discomfort." },
              ].map(h => (
                <div key={h.d} className="relative">
                  <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary-glow" />
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{h.d}</p>
                  <p className="text-sm font-semibold text-primary mt-0.5">{h.t}</p>
                  <p className="text-xs text-muted-foreground mt-1">{h.c}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> ALLERGIES</p>
            <p className="text-sm font-semibold text-destructive mt-2">Penicillin, Latex, Specific Sulfa Drugs.</p>
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
              <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Users className="h-4 w-4" /> Today's Queue</p>
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground">REMAINING: 8</span>
            </div>
            <div className="mt-4 space-y-2">
              {queue.map(p => (
                <div key={p.name} className={`flex items-center gap-3 rounded-xl p-2 ${p.active ? "bg-chip" : ""}`}>
                  <img src={typeof (p.img) === "string" ? (p.img) : ((p.img)?.src ?? "")} alt={p.name} loading="lazy" width={36} height={36} className="h-9 w-9 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{p.name}</p>
                    <p className="text-[10px] tracking-widest font-bold text-primary-glow">{p.status}</p>
                  </div>
                  <button
                    onClick={() => toast.success(`Started consult with ${p.name}`)}
                    className="shrink-0 rounded-full bg-gradient-dark text-surface-dark-foreground px-3 py-1.5 text-[10px] font-semibold tracking-wider hover:opacity-90 shadow-glow"
                  >
                    Start Consult
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-6">
        <button onClick={() => toast.success("Saved as draft")} className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-primary hover:bg-chip transition-colors">Save as Draft</button>
        <button onClick={() => setPreviewOpen(true)} className="flex items-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-7 py-3 text-sm font-semibold hover:opacity-90 shadow-glow">
          <Printer className="h-4 w-4" /> Print & Submit
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
                  <div className="h-12 w-12 rounded-full border-2 border-emerald-700 text-emerald-700 flex items-center justify-center font-bold text-xl">G</div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-emerald-800">Green Valley Clinic</h1>
                    <p className="text-[11px] text-slate-500 italic">1280 Wellness Parkway, Suite 300, Portland, OR 97205 • +1 (503) 555-0142</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-bold text-slate-900">Dr. Julian Vane</h2>
                  <p className="text-[11px] text-slate-600 italic">MD, PhD — Genomics Lead</p>
                  <p className="text-[10px] text-slate-500">Reg. No: MED-884920</p>
                </div>
              </div>

              {/* Patient bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 py-3 border-b border-dashed border-slate-300 text-[12px]">
                {[
                  ["Name", "Eleanor Vance"],
                  ["Age / Sex", "42 Y / Female"],
                  ["Patient ID", "#PT-0992"],
                  ["Date", "Oct 24, 2024"],
                  ["Weight", "64 kg"],
                  ["Height", "6 ft"],
                  ["BP", "120 / 80 mmHg"],
                  ["Pulse", "76 / min"],
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
                  <div className="text-2xl italic font-bold text-emerald-800 leading-none">Jvital</div>
                  <div className="border-t border-slate-400 w-52 mt-1 pt-1 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-900">Dr. Julian Vane</span> · MD, PhD
                    <div className="text-[10px] text-slate-500">Digitally Signed</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  </PortalLayout>
  );
};
export default Prescription;
