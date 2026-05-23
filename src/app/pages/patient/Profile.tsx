'use client';
import { useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, Leaf, Pencil, IdCard, UserSquare2, Mail, Phone, Bell, Activity, Heart, Droplet, AlertTriangle, ScanLine, Scissors, FileDown, Plus, Send, Shield, BookCheck, Calendar as CalIcon, UploadCloud, FileText, Image as ImageIcon, Search, Filter, ShieldCheck, Users, UserPlus, IdCard as IdCardIcon, BookOpen } from "lucide-react";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import avatar from "@/assets/avatar-elena.jpg";
import marcus from "@/assets/patient-marcus.jpg";
import david from "@/assets/patient-david.jpg";
import sarah from "@/assets/patient-sarah.jpg";
import doc1 from "@/assets/doctor-1.jpg";

type Tab = "General" | "Clinical" | "Insurance" | "Documents" | "Family Management";
const tabs: Tab[] = ["General", "Clinical", "Insurance", "Documents", "Family Management"];

const Field = ({ label, value, type = "text" }: { label: string; value: string; type?: string }) => (
  <div>
    <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">{label}</p>
    <input defaultValue={value} type={type} className="w-full bg-chip/50 rounded-xl px-4 py-3 text-sm text-primary font-medium outline-none focus:ring-2 focus:ring-primary border border-transparent focus:bg-card" />
  </div>
);

const Select = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">{label}</p>
    <div className="relative">
      <select defaultValue={value} className="w-full appearance-none bg-chip/50 rounded-xl px-4 py-3 text-sm text-primary font-medium outline-none focus:ring-2 focus:ring-primary">
        <option>{value}</option>
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary text-xs">▾</span>
    </div>
  </div>
);

const SectionHead = ({ icon: Icon, title, accent = "bg-chip" }: { icon: any; title: string; accent?: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className={`h-9 w-9 rounded-lg ${accent} flex items-center justify-center text-primary`}><Icon className="h-4 w-4" /></div>
    <h3 className="font-display text-xl text-primary">{title}</h3>
  </div>
);

type EmergencyContact = {
  relation: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  nid: string;
  contactAddress: string;
  photo: string;
};

const defaultEmergencyContact: EmergencyContact = {
  relation: "BROTHER",
  fullName: "Marcus Sterling",
  phone: "+1 (503) 555-0199",
  email: "m.sterling@domain.com",
  address: "2422 Pine Needle Rd, North Cascade, WA 98101",
  nid: "G-778431209",
  contactAddress: "1180 Cedar Hollow Ln, Portland, OR 97204",
  photo: marcus,
};

const EmergencyContactCard = () => {
  const [data, setData] = useState<EmergencyContact>(defaultEmergencyContact);
  const [draft, setDraft] = useState<EmergencyContact>(defaultEmergencyContact);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const startEdit = () => { setDraft(data); setEditing(true); };
  const cancel = () => { setDraft(data); setEditing(false); };
  const save = () => { setData(draft); setEditing(false); };
  const upd = <K extends keyof EmergencyContact>(k: K, v: EmergencyContact[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => upd("photo", String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const inputCls = "w-full bg-chip/50 rounded-lg px-3 py-2 text-sm text-primary font-semibold outline-none focus:ring-2 focus:ring-primary mt-1";

  return (
    <div className="rounded-2xl bg-card p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3 mb-5">
        <SectionHead icon={UserSquare2} title="Emergency Contact" accent="bg-accent/40" />
        {!editing ? (
          <button onClick={startEdit} className="rounded-full bg-chip/60 hover:bg-chip text-primary px-4 py-2 text-xs font-semibold flex items-center gap-2 transition">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={cancel} className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={save} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 shadow-glow">Save</button>
          </div>
        )}
      </div>
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="text-center">
            <div className="relative h-24 w-24 mx-auto group">
              <img src={typeof (editing ? draft.photo : data.photo) === "string" ? (editing ? draft.photo : data.photo) : ((editing ? draft.photo : data.photo)?.src ?? "")} loading="lazy" width={96} height={96} alt="emergency" className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/20" />
              {editing && (
                <>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1 text-[10px] font-bold tracking-widest"
                    aria-label="Upload photo"
                  >
                    <UploadCloud className="h-5 w-5" />
                    UPLOAD
                  </button>
                </>
              )}
            </div>
            {editing ? (
              <input value={draft.relation} onChange={e => upd("relation", e.target.value)} className="mt-3 w-28 text-center rounded-full bg-chip text-primary px-3 py-1 text-[10px] font-bold tracking-widest outline-none focus:ring-2 focus:ring-primary" />
            ) : (
              <span className="mt-3 inline-flex rounded-full bg-chip text-primary px-3 py-1 text-[10px] font-bold tracking-widest">{data.relation}</span>
            )}
          </div>
          <div className="grid md:grid-cols-3 gap-x-8 gap-y-5 flex-1">
            <div>
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground">FULL NAME</p>
              {editing ? <input value={draft.fullName} onChange={e => upd("fullName", e.target.value)} className={inputCls} /> : <p className="font-semibold text-primary mt-1">{data.fullName}</p>}
            </div>
            <div>
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground">PHONE NUMBER</p>
              {editing ? <input value={draft.phone} onChange={e => upd("phone", e.target.value)} className={inputCls} /> : <p className="font-semibold text-primary mt-1">{data.phone}</p>}
            </div>
            <div>
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground">EMAIL ADDRESS</p>
              {editing ? <input value={draft.email} onChange={e => upd("email", e.target.value)} className={inputCls} /> : <p className="font-semibold text-primary mt-1">{data.email}</p>}
            </div>
            <div>
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground">NID / PASSPORT</p>
              {editing ? <input value={draft.nid} onChange={e => upd("nid", e.target.value)} className={inputCls} /> : <p className="font-semibold text-primary mt-1">{data.nid}</p>}
            </div>
            <div className="md:col-span-3">
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground">PRIMARY ADDRESS</p>
              {editing ? <textarea value={draft.address} onChange={e => upd("address", e.target.value)} rows={2} className={inputCls + " resize-none"} /> : <p className="font-semibold text-primary mt-1">{data.address}</p>}
            </div>
            <div className="md:col-span-3">
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground">CONTACT ADDRESS</p>
              {editing ? <textarea value={draft.contactAddress} onChange={e => upd("contactAddress", e.target.value)} rows={2} className={inputCls + " resize-none"} /> : <p className="font-semibold text-primary mt-1">{data.contactAddress}</p>}
            </div>
          </div>
        </div>
        <NidCardUpload className="bg-muted/30 rounded-xl p-5 space-y-4" title="Emergency Contact NID / Passport" />
      </div>
    </div>
  );
};

type GeneralInfo = {
  fullName: string;
  dob: string;
  gender: string;
  maritalStatus: string;
  nid: string;
  email: string;
  address: string;
};

const defaultGeneralInfo: GeneralInfo = {
  fullName: "Elena S. Sterling",
  dob: "12 May 1988",
  gender: "Female",
  maritalStatus: "Single",
  nid: "G-445902188",
  email: "elena.sterling@precision.health",
  address: "77 Orchard View Terrace, Apt 4B, Silicon Forest, OR 97201",
};

const GenderOptions = ["Female", "Male", "Non-binary", "Prefer not to say"];
const MaritalOptions = ["Single", "Married", "Divorced", "Widowed"];

const GeneralInfoSection = () => {
  const [data, setData] = useState<GeneralInfo>(defaultGeneralInfo);
  const [draft, setDraft] = useState<GeneralInfo>(defaultGeneralInfo);
  const [editing, setEditing] = useState(false);

  const startEdit = () => { setDraft(data); setEditing(true); };
  const cancel = () => { setDraft(data); setEditing(false); };
  const save = () => { setData(draft); setEditing(false); };
  const upd = <K extends keyof GeneralInfo>(k: K, v: GeneralInfo[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  const inputCls = "w-full bg-chip/50 rounded-xl px-4 py-3 text-sm text-primary font-medium outline-none focus:ring-2 focus:ring-primary border border-transparent focus:bg-card";

  const ReadField = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">{label}</p>
      <p className="text-sm text-primary font-semibold mt-1">{value}</p>
    </div>
  );

  return (
    <div className="rounded-2xl bg-card p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3 mb-5">
        <SectionHead icon={IdCard} title="General Information" />
        {!editing ? (
          <button onClick={startEdit} className="rounded-full bg-chip/60 hover:bg-chip text-primary px-4 py-2 text-xs font-semibold flex items-center gap-2 transition">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={cancel} className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={save} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 shadow-glow">Save</button>
          </div>
        )}
      </div>
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div>
          <div className="grid md:grid-cols-2 gap-5">
            {editing ? (
              <>
                <div>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">FULL NAME</p>
                  <input value={draft.fullName} onChange={e => upd("fullName", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">DATE OF BIRTH</p>
                  <input value={draft.dob} onChange={e => upd("dob", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">GENDER</p>
                  <select value={draft.gender} onChange={e => upd("gender", e.target.value)} className={inputCls + " appearance-none"}>
                    {GenderOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">MARITAL STATUS</p>
                  <select value={draft.maritalStatus} onChange={e => upd("maritalStatus", e.target.value)} className={inputCls + " appearance-none"}>
                    {MaritalOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">NID / PASSPORT</p>
                  <input value={draft.nid} onChange={e => upd("nid", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">PRIMARY EMAIL</p>
                  <input value={draft.email} onChange={e => upd("email", e.target.value)} className={inputCls} />
                </div>
              </>
            ) : (
              <>
                <ReadField label="FULL NAME" value={data.fullName} />
                <ReadField label="DATE OF BIRTH" value={data.dob} />
                <ReadField label="GENDER" value={data.gender} />
                <ReadField label="MARITAL STATUS" value={data.maritalStatus} />
                <ReadField label="NID / PASSPORT" value={data.nid} />
                <ReadField label="PRIMARY EMAIL" value={data.email} />
              </>
            )}
          </div>
          <div className="mt-5">
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">RESIDENTIAL ADDRESS</p>
            {editing ? (
              <textarea value={draft.address} onChange={e => upd("address", e.target.value)} className="w-full bg-chip/50 rounded-xl px-4 py-3 text-sm text-primary font-medium outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none" />
            ) : (
              <p className="text-sm text-primary font-semibold mt-1">{data.address}</p>
            )}
          </div>
        </div>
        <NidCardUpload className="bg-muted/30 rounded-xl p-5 space-y-4" />
      </div>
    </div>
  );
};

const NidCardUpload = ({ title = "NID / Passport Card", className }: { title?: string; className?: string }) => {
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const pick = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div className={className || "rounded-2xl bg-card p-6 shadow-soft space-y-5"}>
      <SectionHead icon={IdCardIcon} title={title} accent="bg-chip" />

      <div>
        <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">FRONT SIDE</p>
        {front ? (
          <div className="relative group rounded-xl overflow-hidden ring-1 ring-border aspect-[1.6/1] bg-muted/30">
            <img src={typeof (front) === "string" ? (front) : ((front)?.src ?? "")} alt="NID front" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
              <button onClick={() => frontRef.current?.click()} className="rounded-full bg-card text-primary px-3 py-1.5 text-[10px] font-bold tracking-widest">REPLACE</button>
              <button onClick={() => setFront(null)} className="rounded-full bg-destructive text-destructive-foreground px-3 py-1.5 text-[10px] font-bold tracking-widest">REMOVE</button>
            </div>
          </div>
        ) : (
          <button onClick={() => frontRef.current?.click()} className="w-full aspect-[1.6/1] rounded-xl border-2 border-dashed border-primary/30 hover:bg-chip/20 transition flex flex-col items-center justify-center gap-2 text-primary">
            <UploadCloud className="h-6 w-6" />
            <span className="text-xs font-semibold">Upload front side</span>
            <span className="text-[10px] text-muted-foreground">PNG, JPG up to 5 MB</span>
          </button>
        )}
        <input ref={frontRef} type="file" accept="image/*" className="hidden" onChange={pick(setFront)} />
      </div>

      <div>
        <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">BACK SIDE</p>
        {back ? (
          <div className="relative group rounded-xl overflow-hidden ring-1 ring-border aspect-[1.6/1] bg-muted/30">
            <img src={typeof (back) === "string" ? (back) : ((back)?.src ?? "")} alt="NID back" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
              <button onClick={() => backRef.current?.click()} className="rounded-full bg-card text-primary px-3 py-1.5 text-[10px] font-bold tracking-widest">REPLACE</button>
              <button onClick={() => setBack(null)} className="rounded-full bg-destructive text-destructive-foreground px-3 py-1.5 text-[10px] font-bold tracking-widest">REMOVE</button>
            </div>
          </div>
        ) : (
          <button onClick={() => backRef.current?.click()} className="w-full aspect-[1.6/1] rounded-xl border-2 border-dashed border-primary/30 hover:bg-chip/20 transition flex flex-col items-center justify-center gap-2 text-primary">
            <UploadCloud className="h-6 w-6" />
            <span className="text-xs font-semibold">Upload back side</span>
            <span className="text-[10px] text-muted-foreground">PNG, JPG up to 5 MB</span>
          </button>
        )}
        <input ref={backRef} type="file" accept="image/*" className="hidden" onChange={pick(setBack)} />
      </div>

      <p className="text-[11px] text-muted-foreground">Stored locally in your browser. Used only for identity verification.</p>
    </div>
  );
};

const General = () => (
  <motion.div key="general" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
    <GeneralInfoSection />
    <EmergencyContactCard />

    <div className="rounded-2xl bg-card p-6 shadow-soft">
      <SectionHead icon={Bell} title="Communication & Privacy" accent="bg-chip" />
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { t: "Email Alerts", d: "Results & reminders", on: true },
          { t: "SMS Notifications", d: "Urgent appointments", on: true },
          { t: "Portal Messages", d: "Direct doctor chat", on: true },
        ].map(p => (
          <div key={p.t} className="rounded-xl bg-muted/40 p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-primary text-sm">{p.t}</p>
              <p className="text-xs text-muted-foreground">{p.d}</p>
            </div>
            <Toggle defaultOn={p.on} />
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

const Toggle = ({ defaultOn = false }: { defaultOn?: boolean }) => {
  const [on, setOn] = useState(defaultOn);
  return (
    <button onClick={() => setOn(!on)} className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}>
      <motion.span layout transition={{ type: "spring", stiffness: 400, damping: 30 }} className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow ${on ? "right-0.5" : "left-0.5"}`} />
    </button>
  );
};

type Vitals = { bloodGroup: string; height: string; weight: string };
type Illness = { id: string; t: string; d: string };
type Medication = { id: string; t: string; d: string };
type Procedure = { id: string; name: string; date: string; notes: string };

const uid = () => Math.random().toString(36).slice(2, 10);

const Clinical = () => {
  const [vitals, setVitals] = useState<Vitals>({ bloodGroup: "O Positive", height: "168", weight: "62.5" });
  const [vitalsDraft, setVitalsDraft] = useState<Vitals>(vitals);
  const [editingVitals, setEditingVitals] = useState(false);

  const [allergies, setAllergies] = useState<string[]>(["Penicillin", "Latex", "Peanuts"]);

  const [illnesses, setIllnesses] = useState<Illness[]>([
    { id: uid(), t: "Type 2 Diabetes", d: "Diagnosed 2019" },
    { id: uid(), t: "Hypertension", d: "Managed since 2021" },
  ]);
  const [meds, setMeds] = useState<Medication[]>([
    { id: uid(), t: "Metformin 500mg", d: "Twice daily / Oral" },
    { id: uid(), t: "Lisinopril 10mg", d: "Once daily / Oral" },
  ]);
  const [procedures, setProcedures] = useState<Procedure[]>([
    { id: uid(), name: "Appendectomy", date: "June 2012", notes: "Routine laparoscopic procedure. St. Mary's General Hospital. No post-operative complications." },
  ]);

  const [snapshot, setSnapshot] = useState({ vitals, allergies, illnesses, meds, procedures });
  const [dirty, setDirty] = useState(false);
  const markDirty = () => setDirty(true);

  // Fast-add
  const [faCategory, setFaCategory] = useState<"Medication" | "Illness" | "Procedure" | "Allergy">("Medication");
  const [faText, setFaText] = useState("");

  const startVitalsEdit = () => { setVitalsDraft(vitals); setEditingVitals(true); };
  const saveVitals = () => { setVitals(vitalsDraft); setEditingVitals(false); markDirty(); };
  const cancelVitals = () => setEditingVitals(false);

  const addAllergy = () => {
    const v = window.prompt("Add allergy");
    if (!v) return;
    const trimmed = v.trim();
    if (!trimmed || allergies.includes(trimmed)) return;
    setAllergies(a => [...a, trimmed]);
    markDirty();
  };
  const removeAllergy = (a: string) => { setAllergies(prev => prev.filter(x => x !== a)); markDirty(); };

  const addIllness = () => {
    const t = window.prompt("Illness name");
    if (!t) return;
    const d = window.prompt("Notes (e.g. Diagnosed 2020)") || "";
    setIllnesses(i => [...i, { id: uid(), t: t.trim(), d: d.trim() }]);
    markDirty();
  };
  const removeIllness = (id: string) => { setIllnesses(prev => prev.filter(x => x.id !== id)); markDirty(); };

  const addMed = () => {
    const t = window.prompt("Medication & dose (e.g. Aspirin 75mg)");
    if (!t) return;
    const d = window.prompt("Schedule / route (e.g. Once daily / Oral)") || "";
    setMeds(m => [...m, { id: uid(), t: t.trim(), d: d.trim() }]);
    markDirty();
  };
  const removeMed = (id: string) => { setMeds(prev => prev.filter(x => x.id !== id)); markDirty(); };

  const addProcedure = () => {
    const name = window.prompt("Procedure name");
    if (!name) return;
    const date = window.prompt("Date (e.g. May 2023)") || "";
    const notes = window.prompt("Notes") || "";
    setProcedures(p => [...p, { id: uid(), name: name.trim(), date: date.trim(), notes: notes.trim() }]);
    markDirty();
  };
  const removeProcedure = (id: string) => { setProcedures(prev => prev.filter(x => x.id !== id)); markDirty(); };

  const fastAdd = () => {
    const v = faText.trim();
    if (!v) return;
    if (faCategory === "Medication") setMeds(m => [...m, { id: uid(), t: v, d: "Added via quick entry" }]);
    else if (faCategory === "Illness") setIllnesses(i => [...i, { id: uid(), t: v, d: "Added via quick entry" }]);
    else if (faCategory === "Procedure") setProcedures(p => [...p, { id: uid(), name: v, date: new Date().toLocaleDateString(undefined, { month: "short", year: "numeric" }), notes: "Added via quick entry" }]);
    else if (faCategory === "Allergy" && !allergies.includes(v)) setAllergies(a => [...a, v]);
    setFaText("");
    markDirty();
  };

  const exportPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<title>Clinical Profile</title><pre style="font-family:ui-sans-serif,system-ui;padding:24px">
CLINICAL PROFILE

Vitals
  Blood Group: ${vitals.bloodGroup}
  Height: ${vitals.height} cm
  Weight: ${vitals.weight} kg

Allergies: ${allergies.join(", ")}

Past Illnesses:
${illnesses.map(i => `  - ${i.t} (${i.d})`).join("\n")}

Current Medications:
${meds.map(m => `  - ${m.t} | ${m.d}`).join("\n")}

Surgical Procedures:
${procedures.map(p => `  - ${p.name} (${p.date}) — ${p.notes}`).join("\n")}
</pre>`);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  const saveAll = () => {
    setSnapshot({ vitals, allergies, illnesses, meds, procedures });
    setDirty(false);
  };
  const discardAll = () => {
    setVitals(snapshot.vitals);
    setAllergies(snapshot.allergies);
    setIllnesses(snapshot.illnesses);
    setMeds(snapshot.meds);
    setProcedures(snapshot.procedures);
    setDirty(false);
    setEditingVitals(false);
  };

  const vitalInput = "w-full bg-card rounded-lg px-3 py-2 text-sm font-semibold text-primary outline-none focus:ring-2 focus:ring-primary";

  return (
    <motion.div key="clinical" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid lg:grid-cols-[320px_1fr] gap-6">
      {/* Left column */}
      <div className="space-y-5">
        <div className="rounded-2xl bg-card p-5 shadow-soft relative overflow-hidden">
          <div className="absolute top-3 right-3 opacity-10"><Activity className="h-16 w-16 text-primary" /></div>
          <h3 className="flex items-center gap-2 text-primary font-semibold"><ScanLine className="h-4 w-4" /> Vital Matrix</h3>
          <div className="mt-5 rounded-xl bg-chip/40 p-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground">BLOOD GROUP</p>
              {editingVitals ? (
                <select value={vitalsDraft.bloodGroup} onChange={e => setVitalsDraft(v => ({ ...v, bloodGroup: e.target.value }))} className={vitalInput + " mt-1"}>
                  {["O Positive","O Negative","A Positive","A Negative","B Positive","B Negative","AB Positive","AB Negative"].map(b => <option key={b}>{b}</option>)}
                </select>
              ) : (
                <p className="font-display text-2xl text-primary">{vitals.bloodGroup}</p>
              )}
            </div>
            <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Droplet className="h-4 w-4" /></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-accent/30 p-3">
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground">HEIGHT</p>
              {editingVitals ? (
                <input value={vitalsDraft.height} onChange={e => setVitalsDraft(v => ({ ...v, height: e.target.value }))} className={vitalInput + " mt-1"} />
              ) : (
                <p className="text-primary font-display text-xl mt-1">{vitals.height} <span className="text-xs text-muted-foreground">cm</span></p>
              )}
            </div>
            <div className="rounded-xl bg-accent/30 p-3">
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground">WEIGHT</p>
              {editingVitals ? (
                <input value={vitalsDraft.weight} onChange={e => setVitalsDraft(v => ({ ...v, weight: e.target.value }))} className={vitalInput + " mt-1"} />
              ) : (
                <p className="text-primary font-display text-xl mt-1">{vitals.weight} <span className="text-xs text-muted-foreground">kg</span></p>
              )}
            </div>
          </div>
          {editingVitals ? (
            <div className="mt-4 flex gap-2">
              <button onClick={cancelVitals} className="flex-1 rounded-full bg-chip/60 text-primary py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={saveVitals} className="flex-1 rounded-full bg-gradient-dark text-surface-dark-foreground py-2.5 text-sm font-semibold hover:opacity-90 shadow-glow">Save</button>
            </div>
          ) : (
            <button onClick={startVitalsEdit} className="mt-4 w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90"><Pencil className="h-3.5 w-3.5" /> Update Vitals</button>
          )}
        </div>

      </div>

      {/* Right column */}
      <div className="space-y-6">
        <div className="rounded-2xl bg-card p-6 shadow-soft space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <h2 className="font-display text-2xl text-primary leading-tight">Clinical History & Active Protocols</h2>
          </div>

          <div className="rounded-2xl bg-muted/30 p-5 border border-border/40">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Send className="h-4 w-4 -rotate-45" /> Fast-Add Entry (Draft)</p>
            <div className="grid md:grid-cols-[200px_1fr] gap-3 mt-4">
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">CATEGORY</p>
                <div className="relative">
                  <select value={faCategory} onChange={e => setFaCategory(e.target.value as typeof faCategory)} className="w-full appearance-none bg-card border border-border rounded-xl px-4 py-3 text-sm text-primary font-medium outline-none focus:ring-2 focus:ring-primary">
                    {["Medication", "Illness", "Procedure", "Allergy"].map(o => <option key={o}>{o}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary text-xs">▾</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">DESCRIPTION / DOSAGE</p>
                <div className="relative">
                  <input
                    value={faText}
                    onChange={e => setFaText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") fastAdd(); }}
                    placeholder="e.g. Daily Vitamin D3 - 2000IU"
                    className="w-full bg-card border border-border rounded-xl pl-4 pr-12 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button onClick={fastAdd} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-gradient-dark text-surface-dark-foreground flex items-center justify-center hover:opacity-90"><Send className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground">CURRENT MEDICATIONS</p>
            <button onClick={addMed} className="text-primary hover:opacity-80"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            {meds.map(m => (
              <div key={m.id} className="rounded-xl bg-card border border-border/60 p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-chip flex items-center justify-center text-primary">℞</div>
                <div className="flex-1"><p className="font-semibold text-primary text-sm">{m.t}</p><p className="text-[11px] text-muted-foreground">{m.d}</p></div>
                <button onClick={() => removeMed(m.id)} className="text-muted-foreground hover:text-destructive text-lg leading-none" aria-label="Remove">×</button>
              </div>
            ))}
            {meds.length === 0 && <p className="text-xs text-muted-foreground">No medications.</p>}
          </div>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground">PAST ILLNESSES</p>
            <button onClick={addIllness} className="text-muted-foreground hover:text-primary"><BookCheck className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            {illnesses.map(i => (
              <div key={i.id} className="rounded-xl bg-muted/40 p-4 border-l-4 border-primary-glow flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-primary text-sm">{i.t}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{i.d}</p>
                </div>
                <button onClick={() => removeIllness(i.id)} className="text-muted-foreground hover:text-destructive text-lg leading-none" aria-label="Remove">×</button>
              </div>
            ))}
            {illnesses.length === 0 && <p className="text-xs text-muted-foreground">No illnesses recorded.</p>}
          </div>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between"><p className="text-[10px] tracking-widest font-bold text-muted-foreground">SURGICAL PROCEDURES</p><Scissors className="h-4 w-4 text-muted-foreground" /></div>
          <div className="grid md:grid-cols-2 gap-4 mt-3">
            {procedures.map(p => (
              <div key={p.id} className="rounded-xl bg-chip/30 p-4">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-semibold text-primary">{p.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{p.date}</span>
                    <button onClick={() => removeProcedure(p.id)} className="text-muted-foreground hover:text-destructive text-lg leading-none" aria-label="Remove">×</button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{p.notes}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-soft">
          <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-destructive font-semibold"><AlertTriangle className="h-4 w-4" /> Critical Allergies</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {allergies.map(a => (
                <span key={a} className="group rounded-full bg-card border border-destructive/30 text-destructive px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
                  {a}
                  <button onClick={() => removeAllergy(a)} className="text-destructive/60 hover:text-destructive" aria-label={`Remove ${a}`}>×</button>
                </span>
              ))}
              {allergies.length === 0 && <span className="text-xs text-muted-foreground">No allergies recorded.</span>}
            </div>
          </div>

          <div className="border-t border-border/60 pt-5 mt-5 flex justify-end gap-3">
            <button onClick={saveAll} disabled={!dirty} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 shadow-glow disabled:opacity-50">Save Health Profile</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Insurance = () => (
  <motion.div key="ins" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto pt-8">
    <div>
      <h3 className="flex items-center gap-2 font-display text-2xl text-primary"><span className="h-9 w-9 rounded-lg bg-chip flex items-center justify-center"><Shield className="h-4 w-4" /></span> Active Coverage</h3>
      <div className="mt-6 rounded-2xl bg-card p-6 shadow-soft space-y-5">
        <div>
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">INSURANCE PROVIDER</p>
          <div className="flex items-center gap-3 bg-chip/40 rounded-xl px-4 py-3">
            <IdCardIcon className="h-4 w-4 text-primary" />
            <span className="font-semibold text-primary">Aetna Health Premium</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">POLICY NUMBER</p>
            <div className="flex items-center gap-2 bg-chip/40 rounded-xl px-4 py-3"><span className="text-[10px] font-bold text-muted-foreground">123</span><span className="font-semibold text-primary">XP-9023-881-A</span></div>
          </div>
          <div>
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">VALIDITY DATE</p>
            <div className="flex items-center gap-2 bg-chip/40 rounded-xl px-4 py-3"><CalIcon className="h-4 w-4 text-primary" /><span className="font-semibold text-primary">Dec 2025</span></div>
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-2xl bg-primary/5 border border-primary/20 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <p className="font-semibold text-primary">Verification status</p>
            <p className="text-xs text-primary-glow">Verified & active since Jan 12, 2024</p>
          </div>
        </div>
        <span className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-1.5 text-[10px] font-bold tracking-widest">VERIFIED</span>
      </div>
    </div>

    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl text-primary">Insurance Card</h3>
        <button className="h-8 w-8 rounded-full bg-chip flex items-center justify-center text-primary"><Pencil className="h-3.5 w-3.5" /></button>
      </div>
      <div className="mt-6 rounded-2xl bg-gradient-to-br from-[hsl(220,40%,20%)] to-[hsl(220,60%,10%)] aspect-[1.6/1] p-6 text-white shadow-card relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_50%,white,transparent_60%)]" />
        <div className="relative h-full flex flex-col justify-between">
          <p className="text-xs opacity-70">Aetna Health Premium</p>
          <div className="rounded-lg bg-white/10 backdrop-blur px-4 py-3 self-center text-center">
            <p className="font-display text-xl">INSURANCE CARD</p>
          </div>
          <p className="text-xs opacity-70">Tap to view full card</p>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border-2 border-dashed border-border p-6 text-center">
        <UploadCloud className="h-8 w-8 text-primary mx-auto" />
        <p className="font-semibold text-primary mt-2">Update your card</p>
        <p className="text-xs text-muted-foreground mt-1">Drag and drop or click to upload new document</p>
        <button className="mt-4 rounded-full bg-muted text-foreground px-5 py-2 text-[11px] font-bold tracking-widest">CHOOSE FILE</button>
      </div>
    </div>

    <div className="md:col-span-2 flex justify-end gap-3 pt-4">
      <button className="text-sm font-semibold text-muted-foreground px-4">Cancel Changes</button>
      <button className="rounded-full bg-gradient-dark text-surface-dark-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 shadow-glow">Save Profile</button>
    </div>
  </motion.div>
);

const Documents = () => {
  const docs = [
    { name: "Annual_Physical_Exam_2023.pdf", size: "2.4 MB", date: "Nov 12, 2023", status: "VERIFIED", type: "pdf" },
    { name: "Lab_Results_Metabolic.jpg", size: "4.1 MB", date: "Oct 28, 2023", status: "VERIFIED", type: "img" },
    { name: "Vaccination_Record_Digital.pdf", size: "1.2 MB", date: "Sep 15, 2023", status: "PENDING", type: "pdf" },
    { name: "Cardiac_Stress_Test.pdf", size: "8.9 MB", date: "Aug 02, 2023", status: "VERIFIED", type: "pdf" },
  ];
  return (
    <motion.div key="docs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid lg:grid-cols-[360px_1fr] gap-6">
      <div className="space-y-5">
        <div className="rounded-2xl bg-card p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-chip flex items-center justify-center text-primary"><UploadCloud className="h-5 w-5" /></div>
            <div><h3 className="font-display text-xl text-primary">Upload Vault</h3><p className="text-[11px] text-muted-foreground">Max file size: 25MB</p></div>
          </div>
          <div className="mt-5 rounded-2xl border-2 border-dashed border-border p-6 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-chip/60 flex items-center justify-center text-primary"><UploadCloud className="h-5 w-5" /></div>
            <p className="font-semibold text-primary mt-3">Drag & drop files here</p>
            <p className="text-xs text-muted-foreground mt-1">Supports PDF, JPG, PNG formats</p>
            <button className="mt-4 rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2 text-xs font-semibold">Browse Files</button>
          </div>
          <div className="mt-5 space-y-3">
            <div>
              <div className="flex justify-between text-xs"><span className="text-foreground/80">Radiology_Report_Q4.pdf</span><span className="text-primary font-semibold">85%</span></div>
              <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: "85%" }} transition={{ duration: 1 }} className="h-full bg-primary" /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs"><span className="text-foreground/80">Insurance_Card_Scan.png</span><span className="text-muted-foreground">Queued</span></div>
              <div className="mt-1 h-1.5 bg-muted rounded-full" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-dark text-surface-dark-foreground p-6 relative overflow-hidden">
          <ShieldCheck className="h-7 w-7 text-accent" />
          <h3 className="font-display text-xl mt-3">Secure Vault</h3>
          <p className="text-xs opacity-75 mt-2">All documents are encrypted. Your medical privacy is our top priority.</p>
          <ShieldCheck className="absolute -right-4 -bottom-4 h-32 w-32 text-surface-dark-foreground/5" />
        </div>
      </div>

      <div className="rounded-2xl bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-display text-2xl text-primary">Stored Documents</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder="Search documents..." className="bg-muted/40 rounded-full pl-10 pr-4 py-2 text-sm w-64 outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <button className="h-9 w-9 rounded-full bg-muted/40 flex items-center justify-center text-primary"><Filter className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mt-6">
          <div className="grid grid-cols-[1fr_140px_120px] gap-4 px-2 pb-3 border-b border-border/60 text-[10px] tracking-widest font-bold text-muted-foreground">
            <span>FILE NAME</span><span>UPLOAD DATE</span><span>STATUS</span>
          </div>
          {docs.map((d, i) => (
            <motion.div key={d.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="grid grid-cols-[1fr_140px_120px] gap-4 items-center px-2 py-4 border-b border-border/40 hover:bg-chip/20 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${d.type === "pdf" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  {d.type === "pdf" ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                </div>
                <div className="min-w-0"><p className="font-semibold text-primary text-sm truncate">{d.name}</p><p className="text-[11px] text-muted-foreground">{d.size}</p></div>
              </div>
              <span className="text-sm text-foreground/80">{d.date}</span>
              <span className={`inline-flex justify-center rounded-full px-3 py-1 text-[10px] font-bold tracking-widest w-fit ${d.status === "VERIFIED" ? "bg-chip text-primary" : "bg-muted text-muted-foreground"}`}>{d.status}</span>
            </motion.div>
          ))}
          <div className="flex items-center justify-between pt-4 text-sm">
            <p className="text-muted-foreground">Showing 4 of 12 documents</p>
            <div className="flex gap-2">
              <button className="h-8 w-8 rounded-full border border-border hover:bg-chip">‹</button>
              <button className="h-8 w-8 rounded-full border border-border hover:bg-chip">›</button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Family = () => {
  const [adding, setAdding] = useState(false);
  const members = [
    { name: "David Jenkins", rel: "Spouse • Age 42", img: doc1, k1: "Next Checkup", v1: "Oct 12, 2023", k2: "Blood Type", v2: "A+ Positive", v1cls: "text-primary-glow font-bold" },
    { name: "Maya Jenkins", rel: "Daughter • Age 14", img: sarah, k1: "Immunizations", v1: "Up to Date", k2: "Allergies", v2: "Peanuts", v1cls: "text-primary-glow font-bold", v2cls: "text-destructive font-bold" },
    { name: "Leo Jenkins", rel: "Son • Age 8", img: david, k1: "Pediatrician", v1: "Dr. Aris", k2: "Last Visit", v2: "2 Weeks Ago" },
  ];
  return (
    <motion.div key="fam" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full bg-chip text-primary px-3 py-1 text-xs font-bold">Care Circle</span>
          <h2 className="font-display text-5xl text-primary mt-3">Family Management</h2>
          <p className="text-foreground/70 mt-3 max-w-xl">Coordinate health records, upcoming appointments, and shared wellness plans for your entire household in one centralized space.</p>
        </div>
        {!adding && (
          <div className="flex gap-3">
            <button className="rounded-full bg-chip/60 text-primary px-5 py-3 text-sm font-semibold">Export Reports</button>
            <button onClick={() => setAdding(true)} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-3 text-sm font-semibold flex items-center gap-2 shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> Add New Member</button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {adding ? (
          <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-10 rounded-2xl bg-card p-8 shadow-card max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-chip flex items-center justify-center text-primary"><UserPlus className="h-5 w-5" /></div>
              <div><h3 className="font-display text-2xl text-primary">Registration Request</h3><p className="text-sm text-muted-foreground">Provide basic details to initiate a health profile synchronization.</p></div>
            </div>
            <div className="grid md:grid-cols-2 gap-5 mt-6">
              <div>
                <p className="text-sm font-semibold text-primary mb-2">Legal Full Name</p>
                <input placeholder="Enter name as it appears on ID" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary mb-2">Relationship</p>
                <select className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"><option>Select relationship...</option><option>Spouse</option><option>Child</option><option>Parent</option></select>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary mb-2">Date of Birth</p>
                <input type="date" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary mb-2">Health ID Number (Optional)</p>
                <input placeholder="XXXX-XXXX-XXXX" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-chip/30 p-5 flex gap-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-primary text-sm">Privacy & Consent</p>
                <p className="text-xs text-foreground/70 mt-1">By adding this family member, you confirm you have the legal right to manage their healthcare information. Records will be encrypted and shared only within your household circle.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setAdding(false)} className="text-sm font-semibold text-muted-foreground px-4">Cancel</button>
              <button onClick={() => setAdding(false)} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 shadow-glow">Send Invitation</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {members.map((m, i) => (
              <motion.div key={m.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }} className="rounded-2xl bg-card p-5 shadow-soft text-center">
                <div className="relative w-fit mx-auto">
                  <img src={typeof (m.img) === "string" ? (m.img) : ((m.img)?.src ?? "")} loading="lazy" width={88} height={88} alt={m.name} className="h-22 w-22 h-[88px] w-[88px] rounded-full object-cover ring-4 ring-primary/20" />
                  <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-primary-glow ring-2 ring-card" />
                </div>
                <h3 className="font-display text-xl text-primary mt-4">{m.name}</h3>
                <p className="text-xs text-muted-foreground">{m.rel}</p>
                <div className="mt-5 space-y-2 text-left text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">{m.k1}</span><span className={m.v1cls || "text-primary font-semibold"}>{m.v1}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{m.k2}</span><span className={m.v2cls || "text-primary font-semibold"}>{m.v2}</span></div>
                </div>
                <button className="mt-5 w-full rounded-full bg-chip/60 text-primary py-2 text-xs font-semibold hover:bg-chip">View Health Profile</button>
              </motion.div>
            ))}
            <motion.button onClick={() => setAdding(true)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} whileHover={{ y: -4 }} className="rounded-2xl border-2 border-dashed border-primary/30 p-5 flex flex-col items-center justify-center text-center min-h-[280px] hover:bg-chip/20 transition">
              <div className="h-14 w-14 rounded-full bg-chip flex items-center justify-center text-primary"><UserPlus className="h-6 w-6" /></div>
              <p className="font-display text-lg text-primary mt-4">Add Family Member</p>
              <p className="text-xs text-muted-foreground mt-1">Connect a new dependent or household partner</p>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Profile = () => {
  const [tab, setTab] = useState<Tab>("General");
  const [avatarSrc, setAvatarSrc] = useState<string>(avatar);
  const avatarRef = useRef<HTMLInputElement>(null);
  const onAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarSrc(String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <PatientPortalLayout>
      {/* Header */}
      <div className="flex flex-wrap items-start gap-8 max-w-6xl mx-auto">
        <div className="relative">
          <motion.img initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} src={typeof (avatarSrc) === "string" ? (avatarSrc) : ((avatarSrc)?.src ?? "")} loading="lazy" width={160} height={160} alt="Elena Vance" className="h-40 w-40 rounded-3xl object-cover shadow-card" />
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />
          <button onClick={() => avatarRef.current?.click()} aria-label="Change profile picture" className="absolute bottom-2 right-2 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow hover:opacity-90 transition"><Pencil className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 min-w-[260px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-chip text-primary px-3 py-1 text-[10px] font-bold tracking-widest"><BadgeCheck className="h-3 w-3" /> PROFILE VERIFIED</span>
          <h1 className="font-display text-5xl text-primary mt-3">Elena Vance</h1>
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2"><IdCard className="h-4 w-4" /> Patient ID: #BL-90442 • Joined March 2021</p>
        </div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl bg-gradient-dark text-surface-dark-foreground p-6 w-72 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-widest font-bold opacity-80">HEALTH VITALITY</p>
            <Leaf className="h-4 w-4 text-accent" />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <p className="font-display text-5xl">94%</p>
            <div className="flex-1 h-2 bg-surface-dark-foreground/20 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: "94%" }} transition={{ duration: 1.2 }} className="h-full bg-accent" />
            </div>
          </div>
          <p className="text-[11px] opacity-75 mt-3">Your biophilia-based health score is exceptional. Keep engaging with nature and your wellness plan.</p>
        </motion.div>
      </div>

      {/* Tutorial Link */}
      <div className="max-w-6xl mx-auto mt-6">
        <Link href="/patient/tutorial" className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft border border-transparent hover:border-primary/20 transition group">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-primary text-sm group-hover:text-primary-glow transition">Patient Portal Tutorial</p>
            <p className="text-xs text-muted-foreground">Learn how to use appointments, records, billing, and health tools.</p>
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">Start Learning</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mt-10">
        <div className="bg-muted/40 rounded-full p-1.5 flex gap-1 flex-wrap">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} className="relative px-5 py-2.5 text-sm font-semibold rounded-full">
              {tab === t && <motion.div layoutId="tab-bg" className="absolute inset-0 bg-card shadow-soft rounded-full" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className={`relative ${tab === t ? "text-primary" : "text-muted-foreground"}`}>{t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-10 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {tab === "General" && <General />}
          {tab === "Clinical" && <Clinical />}
          {tab === "Insurance" && <Insurance />}
          {tab === "Documents" && <Documents />}
          {tab === "Family Management" && <Family />}
        </AnimatePresence>
      </div>
    </PatientPortalLayout>
  );
};

export default Profile;
