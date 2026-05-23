'use client';
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, AlertTriangle, Mail, Phone, FileText, Activity, ClipboardList, Pill, Plus, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import patientEleanor from "@/assets/patient-eleanor.jpg";
import patientMarcus from "@/assets/patient-marcus.jpg";
import patientDavid from "@/assets/patient-david.jpg";

const tabs = ["All Patients", "Requires Action", "Recent"];

const patients = [
  { id: "PT-8472", name: "Eleanor Vance", age: "72 yrs", img: patientEleanor, status: "High Risk", statusClass: "bg-destructive/15 text-destructive", note: "Hypertension Management", visit: "2 days ago", next: "Tomorrow, 10:00 AM" },
  { id: "PT-9103", name: "Marcus Reynolds", age: "45 yrs", img: patientMarcus, status: "Stable", statusClass: "bg-chip text-primary", note: "Post-Op Recovery", visit: "1 week ago" },
  { id: "PT-7731", name: "David Chen", age: "58 yrs", img: patientDavid, status: "", note: "Medication Refill", visit: "3 months ago" },
];

const Directory = () => {
  const [tab, setTab] = useState(tabs[0]);
  const [selected, setSelected] = useState(patients[0]);
  const [query, setQuery] = useState("");
  const filtered = patients.filter(p =>
    (tab === "Requires Action" ? p.status === "High Risk" : tab === "Recent" ? !!p.next : true) &&
    (p.name.toLowerCase().includes(query.toLowerCase()) || p.note.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <PortalLayout>
      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        {/* Left list */}
        <div>
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl text-primary">Patients</h1>
            <span className="text-[10px] tracking-widest font-bold text-muted-foreground">1,248 TOTAL</span>
          </div>
          <div className="mt-4 flex gap-2 flex-wrap">
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${tab === t ? "bg-gradient-dark text-surface-dark-foreground" : "bg-card border border-border text-foreground/70 hover:bg-chip"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patients, conditions..." className="w-full bg-card border border-border/60 rounded-full pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="mt-5 space-y-3">
            {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No patients match your search.</p>}
            {filtered.map(p => (
              <motion.button key={p.id} onClick={() => setSelected(p)} whileHover={{ y: -2 }}
                className={`w-full text-left rounded-2xl bg-card p-4 border-2 transition-all ${selected.id === p.id ? "border-primary shadow-glow" : "border-transparent hover:border-border"}`}>
                <div className="flex items-center gap-3">
                  <img src={typeof (p.img) === "string" ? (p.img) : ((p.img)?.src ?? "")} alt={p.name} loading="lazy" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">ID: {p.id} • {p.age}</p>
                  </div>
                  {p.status && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.statusClass}`}>{p.status}</span>}
                </div>
                <p className="text-xs text-foreground/70 mt-3 flex items-center gap-1.5"><FileText className="h-3 w-3" /> {p.note}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Last visit: {p.visit}</span>
                  {p.next && <span className="flex items-center gap-1 text-primary-glow font-semibold"><CalendarDays className="h-3 w-3" /> {p.next}</span>}
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <button className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-chip"><ChevronLeft className="h-4 w-4" /></button>
            {[1, 2, 3].map((n, i) => (
              <button key={n} className={`h-8 w-8 rounded-full text-xs font-semibold ${i === 0 ? "bg-gradient-dark text-surface-dark-foreground" : "border border-border hover:bg-chip"}`}>{n}</button>
            ))}
            <span className="text-muted-foreground text-sm">...</span>
            <button className="h-8 w-8 rounded-full border border-border text-xs font-semibold hover:bg-chip">8</button>
            <button className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-chip"><ChevronRight className="h-4 w-4" /></button>
          </div>

          {/* Visit timeline */}
          <div className="mt-10">
            <h2 className="flex items-center gap-2 font-semibold text-primary"><ClipboardList className="h-4 w-4" /> Visit Timeline</h2>
            <div className="mt-4 space-y-5 border-l border-border ml-1 pl-5">
              {[
                { time: "09:00 AM", status: "COMPLETED", t: "Patient Intake", d: "Initial check-in and basic questionnaire completed by reception.", done: true },
                { time: "09:15 AM", status: "COMPLETED", t: "Vitals & ECG", d: "Resting ECG performed by Nurse Jenkins. Results uploaded to file.", done: true },
                { time: "09:30 AM", status: "IN PROGRESS", t: "Doctor Consultation", d: "Review of ECG and discussion of recent symptoms.", done: false },
              ].map(v => (
                <div key={v.t} className="relative">
                  <div className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 ${v.done ? "bg-primary border-primary" : "bg-card border-primary-glow"}`} />
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-muted-foreground">{v.time}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider ${v.done ? "bg-chip text-primary" : "bg-accent/40 text-primary"}`}>{v.status}</span>
                  </div>
                  <p className="font-semibold text-primary text-sm mt-1">{v.t}</p>
                  <p className="text-xs text-muted-foreground mt-1">{v.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right detail */}
        <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">
          <div className="rounded-2xl bg-card p-6 shadow-soft flex items-center gap-5">
            <img src={typeof (selected.img) === "string" ? (selected.img) : ((selected.img)?.src ?? "")} alt={selected.name} loading="lazy" width={80} height={80} className="h-20 w-20 rounded-full object-cover" />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-3xl text-primary">{selected.name}</h2>
                {selected.status === "High Risk" && <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive px-3 py-1 text-xs font-bold"><AlertTriangle className="h-3 w-3" /> High Risk</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">DOB: 04/12/1951 (72 yrs) • Female • ID: {selected.id}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toast.success(`Email sent to ${selected.name}`)} className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-primary hover:bg-chip"><Mail className="h-4 w-4" /></button>
              <button onClick={() => toast.success(`Calling ${selected.name}`)} className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-primary hover:bg-chip"><Phone className="h-4 w-4" /></button>
              <Link href="/portal/prescription" className="rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 shadow-glow flex items-center gap-2"><FileText className="h-4 w-4" /> Clinical Notes</Link>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => toast.info("Opening full record")} className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-chip">View Full Record</button>
            <Link href="/portal/prescription" className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 flex items-center gap-1"><FileText className="h-3 w-3" /> Start Notes</Link>
          </div>

          <div className="grid md:grid-cols-[2fr_1fr] gap-5">
            <div className="rounded-2xl bg-card p-6 shadow-soft">
              <h3 className="flex items-center gap-2 font-semibold text-primary"><Activity className="h-4 w-4" /> Recent Vitals</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {[
                  { l: "Blood Pressure", v: "145/90", s: "Elevated", warn: true },
                  { l: "Heart Rate", v: "78", u: "bpm", s: "Normal" },
                  { l: "Weight", v: "162", u: "lbs", s: "-2 lbs this month" },
                  { l: "SpO2", v: "98", u: "%", s: "Normal" },
                ].map(v => (
                  <div key={v.l} className="rounded-xl bg-muted/40 p-4">
                    <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{v.l.toUpperCase()}</p>
                    <p className="mt-2"><span className={`font-display text-2xl ${v.warn ? "text-destructive" : "text-primary"}`}>{v.v}</span> {v.u && <span className="text-xs text-muted-foreground">{v.u}</span>}</p>
                    <p className={`text-[10px] mt-1 font-semibold ${v.warn ? "text-destructive" : "text-primary-glow"}`}>↗ {v.s}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-chip/40 p-6">
              <h3 className="flex items-center gap-2 font-semibold text-primary"><ClipboardList className="h-4 w-4" /> Conditions</h3>
              <div className="mt-4 space-y-3">
                {[
                  { t: "Essential Hypertension", d: "Diagnosed: 2018" },
                  { t: "Osteoarthritis", d: "Diagnosed: 2020" },
                ].map(c => (
                  <div key={c.t} className="rounded-xl bg-card p-3">
                    <p className="font-semibold text-primary text-sm">{c.t}</p>
                    <p className="text-[11px] text-muted-foreground">{c.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl bg-gradient-dark text-surface-dark-foreground p-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-accent" /> Schedule</h3>
                <button className="text-xs font-semibold text-accent">View All</button>
              </div>
              <div className="mt-4 rounded-xl bg-surface-dark-foreground/10 p-4">
                <p className="text-[10px] tracking-widest font-bold text-accent">NEXT APPOINTMENT</p>
                <p className="font-display text-lg mt-1">Follow-up: BP Check</p>
                <p className="text-xs opacity-70 mt-1">Tomorrow, 10:00 AM - 10:30 AM</p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => toast.success("Visit started")} className="rounded-full bg-accent text-primary px-4 py-1.5 text-xs font-bold hover:bg-accent/80">Start Visit</button>
                  <button onClick={() => toast.info("Reschedule requested")} className="rounded-full border border-surface-dark-foreground/30 px-4 py-1.5 text-xs font-semibold hover:bg-surface-dark-foreground/10">Reschedule</button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-primary"><Pill className="h-4 w-4" /> Medications</h3>
                <button className="h-7 w-7 rounded-full bg-chip flex items-center justify-center text-primary"><Plus className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 space-y-3">
                {[{ t: "Lisinopril", d: "20mg • Oral • Once daily", r: 2 }, { t: "Amlodipine", d: "5mg • Oral • Once daily", r: 1 }].map(m => (
                  <div key={m.t} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                    <div className="h-9 w-9 rounded-full bg-chip flex items-center justify-center text-primary"><Pill className="h-4 w-4" /></div>
                    <div className="flex-1">
                      <p className="font-semibold text-primary text-sm">{m.t}</p>
                      <p className="text-[11px] text-muted-foreground">{m.d}</p>
                    </div>
                    <span className="rounded-full bg-card border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Refills: {m.r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-6 shadow-soft">
            <span className="inline-flex rounded-full bg-chip text-chip-foreground px-3 py-1 text-[10px] font-bold tracking-wider">Routine Follow-up</span>
            <h3 className="mt-3 flex items-center gap-2 font-semibold text-primary"><FileText className="h-4 w-4" /> Chief Complaint</h3>
            <p className="text-sm text-foreground/80 mt-2">Patient reports occasional shortness of breath during light exertion (climbing stairs) over the past two weeks. No chest pain reported. Adhering to current medication regimen (Lisinopril 10mg).</p>
          </div>

          <div className="rounded-2xl bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-primary">Recent Clinical Notes</h3>
              <button className="text-xs font-semibold text-primary-glow">View All →</button>
            </div>
            <div className="mt-4 flex gap-3">
              <div className="h-10 w-10 rounded-full bg-chip flex items-center justify-center font-bold text-primary text-xs">Dr</div>
              <div className="flex-1">
                <p className="font-semibold text-primary text-sm">Dr. Julian Thorne</p>
                <p className="text-[11px] text-muted-foreground">Oct 14, 2023 • Post-Op Review</p>
                <p className="text-sm text-foreground/80 mt-3">Patient is recovering well from recent arthroscopic knee surgery. Swelling has reduced significantly. Range of motion has improved to 90 degrees flexion. Advised to continue current physical therapy regimen focusing on quad strengthening.</p>
                <p className="text-sm text-foreground/80 mt-3">Pain is well-managed with current low-dose NSAID prescription. Follow up in 4 weeks to assess readiness for return to full activity.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PortalLayout>
  );
};
export default Directory;
