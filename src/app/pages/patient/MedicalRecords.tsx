'use client';
import { motion } from "framer-motion";
import { Activity, Share2, FileText, Filter, Calendar, Eye, Download, Pencil, Shield, Stethoscope, Pill, ClipboardList } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const cats = [
  { label: "Prescriptions", count: "08", active: true },
  { label: "Lab Reports", count: "12" },
  { label: "Diagnoses", count: "04" },
];

const records = [
  { id: "#BL-2024-0012", date: "Oct 15, 2024", status: "Follow Up", bill: "PAID" },
  { id: "#BL-2024-0008", date: "Sep 12, 2024", status: "Consultation", bill: "PAID", highlight: true },
  { id: "#BL-2024-0005", date: "Aug 05, 2024", status: "Follow Up", bill: "PAID" },
];

const fullReport = {
  title: "Acute Bronchitis (Resolved)",
  doctor: "Dr. Sarah Chen",
  specialty: "General Practitioner",
  visitDate: "March 22, 2024",
  resolved: "April 5, 2024",
  vitals: { bp: "118/76 mmHg", hr: "82 bpm", temp: "99.4°F", spo2: "97%" },
  symptoms: ["Persistent cough (10+ days)", "Chest congestion", "Mild wheezing", "Low-grade fever"],
  examination:
    "Auscultation revealed mild bilateral wheezing with coarse crackles in the lower lobes. Throat appeared mildly erythematous. No lymphadenopathy detected. Chest X-ray showed no consolidations.",
  diagnosis: "Acute viral bronchitis with secondary bacterial infection.",
  plan: [
    "Amoxicillin 500mg — 1 tablet, twice daily for 10 days",
    "Guaifenesin 600mg — every 12 hours as needed",
    "Increased fluid intake & rest",
    "Follow-up scheduled in 14 days",
  ],
  notes:
    "Patient responded well to antibiotic course. Follow-up on April 5th confirmed full resolution of symptoms with clear lung sounds. No further intervention required.",
};

const vaccinations = [
  { t: "Influenza 2023", date: "Oct 05, 2023", site: "North Campus Clinic", batch: "FLU-2023-0921", admin: "Nurse R. Patel", next: "Oct 2024", status: "ACTIVE" },
  { t: "COVID-19 Booster (Bivalent)", date: "Feb 20, 2023", site: "Community Health Hub", batch: "MOD-BV-1149", admin: "Dr. L. Chen", next: "—", status: "HISTORICAL" },
  { t: "Tetanus (Tdap)", date: "Jun 14, 2021", site: "General Practice", batch: "TDP-0621-A", admin: "Nurse M. Hayes", next: "Jun 2031", status: "HISTORICAL" },
  { t: "Hepatitis B (3rd dose)", date: "Mar 02, 2019", site: "City Medical Center", batch: "HEPB-3-0219", admin: "Dr. K. Morris", next: "—", status: "HISTORICAL" },
  { t: "MMR Booster", date: "Aug 11, 2015", site: "University Health Services", batch: "MMR-0815-B", admin: "Nurse J. Lopez", next: "—", status: "HISTORICAL" },
];

const medicineHistory = [
  { name: "Amoxicillin 500mg", dose: "1 tablet twice daily", reason: "Acute Bronchitis", doctor: "Dr. Elena Vance", start: "Oct 11, 2024", end: "Oct 21, 2024", status: "ACTIVE" },
  { name: "Lisinopril 10mg", dose: "1 tablet daily", reason: "Hypertension", doctor: "Dr. Sarah Chen", start: "Mar 04, 2023", end: "Sep 15, 2023", status: "COMPLETED" },
  { name: "Metformin 500mg", dose: "Twice daily / Oral", reason: "Type 2 Diabetes management", doctor: "Dr. Aris Thorne", start: "Jan 18, 2022", end: "Ongoing", status: "ACTIVE" },
  { name: "Albuterol Inhaler", dose: "2 puffs as needed", reason: "Mild asthma flare", doctor: "Dr. Sarah Chen", start: "Apr 22, 2024", end: "Jul 22, 2024", status: "COMPLETED" },
  { name: "Ibuprofen 400mg", dose: "PRN every 6 hours", reason: "Post-procedure pain", doctor: "Dr. Elena Vance", start: "Jun 12, 2012", end: "Jun 19, 2012", status: "COMPLETED" },
];

const MedicalRecords = () => {
  const [cat, setCat] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [vaccOpen, setVaccOpen] = useState(false);
  const [medOpen, setMedOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState<typeof records[number] | null>(null);

  const downloadText = (filename: string, text: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  return (
    <PatientPortalLayout>
      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">CLINICAL / HISTORICAL RECORDS</p>
          <h1 className="font-display text-5xl text-primary mt-2">Medical Records</h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-xl">Comprehensive history of your clinical data, including lab results, prescriptions, and formal diagnoses.</p>
        </div>
        <div className="flex items-center gap-8">
          <div><p className="font-display text-4xl text-primary">24</p><p className="text-[10px] tracking-widest font-bold text-primary-glow mt-1">TOTAL RECORDS</p></div>
          <div><p className="font-display text-4xl text-primary">03</p><p className="text-[10px] tracking-widest font-bold text-primary-glow mt-1">ACTIVE RX</p></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
          <h2 className="font-display text-2xl text-primary">Recent Clinical Notes</h2>
          <div className="mt-5 grid md:grid-cols-2 gap-6">
            <div>
              <span className="rounded-full bg-destructive/15 text-destructive text-[10px] tracking-widest font-bold px-3 py-1">CRITICAL DIAGNOSIS</span>
              <h3 className="font-display text-2xl text-primary mt-3">Acute Bronchitis (Resolved)</h3>
              <p className="text-sm text-foreground/70 mt-3">Patient presented with persistent cough and chest congestion. Lung sounds indicated mild wheezing. Recommended 10-day course of antibiotics and rest. Follow-up confirms full recovery as of April 5th.</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {["#Respiratory", "#ClinicalArchived", "#FollowUpRequired"].map(t => (
                  <span key={t} className="rounded-full bg-chip text-primary text-xs font-semibold px-3 py-1">{t}</span>
                ))}
              </div>
            </div>
            <div className="bg-chip/40 rounded-2xl p-5 flex flex-col">
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground text-center">ATTENDING DOCTOR</p>
              <p className="font-display text-xl text-primary text-center mt-2">Dr. Sarah Chen</p>
              <p className="text-xs text-muted-foreground text-center">General Practitioner</p>
              <div className="mt-auto pt-6 flex gap-2">
                <button onClick={() => setReportOpen(true)} className="flex-1 flex items-center justify-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2.5 text-xs font-semibold shadow-glow">
                  <FileText className="h-3.5 w-3.5" /> Full Report
                </button>
                <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Link copied"); }} className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-primary hover:bg-chip"><Share2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="rounded-3xl bg-chip/40 p-6 border border-border/40">
          <p className="flex items-center gap-2 text-[10px] tracking-widest font-bold text-primary-glow"><Activity className="h-3.5 w-3.5" /> ACTIVITY TIMELINE</p>
          <div className="mt-5 space-y-5 border-l border-border ml-1.5 pl-5">
            {[
              { d: "MAY 14, 2024", t: "Blood Analysis Updated", s: "Metabolic panel results released by Dr. Aris Thorne." },
              { d: "APR 22, 2024", t: "New RX: Albuterol", s: "Refill requested by Patient. Approved by Dr. Sarah Chen." },
              { d: "MAR 05, 2024", t: "General Consultation", s: "Initial diagnostic notes archived." },
            ].map(a => (
              <div key={a.t} className="relative">
                <div className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-primary-glow bg-card" />
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{a.d}</p>
                <p className="font-semibold text-primary text-sm mt-0.5">{a.t}</p>
                <p className="text-xs text-muted-foreground">{a.s}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-chip/40 p-6 border border-border/40">
          <h3 className="font-display text-2xl text-primary">Vaccination Records</h3>
          <div className="mt-5 space-y-3">
            {vaccinations.slice(0, 3).map(v => (
              <div key={v.t} className="flex items-center gap-4 rounded-2xl bg-card p-4 border border-border/40">
                <div className="h-10 w-10 rounded-full bg-chip flex items-center justify-center text-primary"><Shield className="h-5 w-5" /></div>
                <div className="flex-1">
                  <p className="font-semibold text-primary text-sm">{v.t}</p>
                  <p className="text-xs text-muted-foreground">{v.date} • {v.site}</p>
                </div>
                <span className={`text-[9px] tracking-widest font-bold px-3 py-1 rounded-full ${v.status === "ACTIVE" ? "bg-chip text-primary" : "bg-muted text-muted-foreground"}`}>{v.status}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setVaccOpen(true)} className="mt-4 text-[10px] tracking-widest font-bold text-primary-glow hover:underline">VIEW DETAILS</button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-3xl bg-chip/40 p-6 border border-border/40">
          <h3 className="font-display text-2xl text-primary">Medicine History</h3>
          <div className="mt-5 rounded-2xl bg-card p-5 border border-border/40">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-primary">Amoxicillin 500mg</p>
                <p className="text-xs text-muted-foreground mt-1">Take 1 tablet twice daily • Ends Oct 21</p>
                <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-3">⏱ 4 DAYS LEFT &nbsp; DR. ELENA VANCE</p>
              </div>
              <button onClick={() => toast.success("Refill requested")} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-1.5 text-xs font-semibold shadow-glow">REFILL</button>
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-card p-5 border border-border/40 flex items-center justify-between">
            <div>
              <p className="font-semibold text-primary">Lisinopril 10mg</p>
              <p className="text-xs text-muted-foreground mt-1">Completed Sep 15, 2023</p>
            </div>
            <div className="h-7 w-7 rounded-full border border-border flex items-center justify-center text-primary">✓</div>
          </div>
          <button onClick={() => setMedOpen(true)} className="mt-4 text-[10px] tracking-widest font-bold text-primary-glow hover:underline">VIEW DETAILS</button>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <div>
            <p className="flex items-center gap-2 text-[10px] tracking-widest font-bold text-primary-glow"><span className="h-1 w-4 bg-primary-glow rounded-full" /> CATEGORIES</p>
            <div className="mt-4 space-y-2">
              {cats.map((c, i) => (
                <button key={c.label} onClick={() => setCat(i)}
                  className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${cat === i ? "bg-gradient-dark text-surface-dark-foreground shadow-glow" : "bg-chip/40 text-primary hover:bg-chip"}`}>
                  <span className="flex items-center gap-2"><Pencil className="h-4 w-4" /> {c.label}</span>
                  <span className="text-xs opacity-80">{c.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-display text-2xl text-primary">Prescriptions History</h2>
              <div className="flex gap-2">
                <button onClick={() => toast.info("Filter applied")} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-chip"><Filter className="h-3.5 w-3.5" /> Filter</button>
                <button onClick={() => toast.info("Date range")} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-chip"><Calendar className="h-3.5 w-3.5" /> All Time</button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-[1.2fr_1fr_1fr_0.8fr_120px] gap-4 text-[10px] tracking-widest font-bold text-muted-foreground pb-3 border-b border-border/50 px-3">
              <div>ID</div><div>DATE ISSUED</div><div>STATUS</div><div>BILL</div><div>ACTIONS</div>
            </div>
            <div className="mt-2 space-y-2">
              {records.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className={`grid grid-cols-[1.2fr_1fr_1fr_0.8fr_120px] gap-4 items-center px-3 py-3 rounded-xl ${r.highlight ? "bg-chip/40" : "hover:bg-muted/30"}`}>
                  <p className="font-semibold text-primary text-sm">{r.id}</p>
                  <p className="text-sm text-foreground/70">{r.date}</p>
                  <p className="text-sm font-semibold text-primary">{r.status}</p>
                  <span className="justify-self-start rounded-full px-3 py-1 text-[10px] font-bold tracking-wider bg-chip text-primary">{r.bill}</span>
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setRecordOpen(r)} className="text-foreground/60 hover:text-primary"><Eye className="h-4 w-4" /></button>
                    <button onClick={() => downloadText(`${r.id}.txt`, `Prescription ${r.id}\nDate: ${r.date}\nStatus: ${r.status}\nBill: ${r.bill}`)} className="text-foreground/60 hover:text-primary"><Download className="h-4 w-4" /></button>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-5">
              <button onClick={() => toast.info("Loading all records")} className="text-sm font-semibold text-primary hover:underline">View all →</button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-10 flex justify-center">
        <button onClick={() => toast.success("Upload dialog")} className="flex items-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-8 py-4 text-sm font-semibold shadow-glow hover:opacity-90">
          <Pencil className="h-4 w-4" /> Upload Documents
        </button>
      </div>

      {/* Full Clinical Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl text-primary"><Stethoscope className="h-5 w-5" /> {fullReport.title}</DialogTitle>
            <DialogDescription>Attended by {fullReport.doctor} • {fullReport.specialty}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(fullReport.vitals).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-chip/40 p-3">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{k}</p>
                  <p className="font-semibold text-primary text-sm mt-1">{v}</p>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border/50 p-3"><p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Visit Date</p><p className="font-semibold text-primary mt-1">{fullReport.visitDate}</p></div>
              <div className="rounded-xl border border-border/50 p-3"><p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Resolved</p><p className="font-semibold text-primary mt-1">{fullReport.resolved}</p></div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Symptoms</p>
              <ul className="list-disc pl-5 mt-2 text-sm text-foreground/80 space-y-1">{fullReport.symptoms.map(s => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Examination</p>
              <p className="text-sm text-foreground/80 mt-2">{fullReport.examination}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Diagnosis</p>
              <p className="text-sm font-semibold text-primary mt-2">{fullReport.diagnosis}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Treatment Plan</p>
              <ul className="list-disc pl-5 mt-2 text-sm text-foreground/80 space-y-1">{fullReport.plan.map(p => <li key={p}>{p}</li>)}</ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Notes</p>
              <p className="text-sm text-foreground/80 mt-2">{fullReport.notes}</p>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => downloadText("clinical-report.txt", `${fullReport.title}\n${fullReport.doctor}\n\nDiagnosis: ${fullReport.diagnosis}\n\nNotes: ${fullReport.notes}`)} className="flex items-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2 text-xs font-semibold"><Download className="h-3.5 w-3.5" /> Download</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vaccination Details Dialog */}
      <Dialog open={vaccOpen} onOpenChange={setVaccOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl text-primary"><Shield className="h-5 w-5" /> Vaccination History</DialogTitle>
            <DialogDescription>Complete immunization record</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {vaccinations.map(v => (
              <div key={v.t} className="rounded-2xl border border-border/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-primary">{v.t}</p>
                    <p className="text-xs text-muted-foreground">{v.date} • {v.site}</p>
                  </div>
                  <span className={`text-[9px] tracking-widest font-bold px-3 py-1 rounded-full ${v.status === "ACTIVE" ? "bg-chip text-primary" : "bg-muted text-muted-foreground"}`}>{v.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                  <div><p className="text-muted-foreground">Batch</p><p className="font-semibold text-primary">{v.batch}</p></div>
                  <div><p className="text-muted-foreground">Administered by</p><p className="font-semibold text-primary">{v.admin}</p></div>
                  <div><p className="text-muted-foreground">Next due</p><p className="font-semibold text-primary">{v.next}</p></div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <button onClick={() => downloadText("vaccinations.txt", vaccinations.map(v => `${v.t} - ${v.date} (${v.site}) batch ${v.batch}`).join("\n"))} className="flex items-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2 text-xs font-semibold"><Download className="h-3.5 w-3.5" /> Export</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Medicine History Dialog */}
      <Dialog open={medOpen} onOpenChange={setMedOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl text-primary"><Pill className="h-5 w-5" /> Medicine History</DialogTitle>
            <DialogDescription>All prescriptions, active and completed</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {medicineHistory.map(m => (
              <div key={m.name + m.start} className="rounded-2xl border border-border/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-primary">{m.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.dose} • {m.reason}</p>
                  </div>
                  <span className={`text-[9px] tracking-widest font-bold px-3 py-1 rounded-full ${m.status === "ACTIVE" ? "bg-chip text-primary" : "bg-muted text-muted-foreground"}`}>{m.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                  <div><p className="text-muted-foreground">Prescribed by</p><p className="font-semibold text-primary">{m.doctor}</p></div>
                  <div><p className="text-muted-foreground">Start</p><p className="font-semibold text-primary">{m.start}</p></div>
                  <div><p className="text-muted-foreground">End</p><p className="font-semibold text-primary">{m.end}</p></div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <button onClick={() => downloadText("medicine-history.txt", medicineHistory.map(m => `${m.name} (${m.status}) - ${m.dose} for ${m.reason} by ${m.doctor} [${m.start} → ${m.end}]`).join("\n"))} className="flex items-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2 text-xs font-semibold"><Download className="h-3.5 w-3.5" /> Export</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record View Dialog */}
      <Dialog open={!!recordOpen} onOpenChange={(o) => !o && setRecordOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-xl text-primary"><ClipboardList className="h-5 w-5" /> Prescription {recordOpen?.id}</DialogTitle>
            <DialogDescription>Issued on {recordOpen?.date}</DialogDescription>
          </DialogHeader>
          {recordOpen && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-chip/40 p-3"><p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Status</p><p className="font-semibold text-primary mt-1">{recordOpen.status}</p></div>
                <div className="rounded-xl bg-chip/40 p-3"><p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Bill</p><p className="font-semibold text-primary mt-1">{recordOpen.bill}</p></div>
              </div>
              <p className="text-foreground/80">Dispense as written. Patient instructed to complete the full course and report any adverse reactions to the prescribing physician.</p>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => recordOpen && downloadText(`${recordOpen.id}.txt`, `Prescription ${recordOpen.id}\nDate: ${recordOpen.date}\nStatus: ${recordOpen.status}\nBill: ${recordOpen.bill}`)} className="flex items-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2 text-xs font-semibold"><Download className="h-3.5 w-3.5" /> Download</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PatientPortalLayout>
  );
};
export default MedicalRecords;
