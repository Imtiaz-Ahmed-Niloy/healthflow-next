"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill } from "@/components/admin/ui";
import { Modal, Field, Input, Select, useCrud, statusTone } from "@/components/admin/crud";
import {
  Baby, HeartCrack, Stethoscope, BadgeCheck, FileSignature, ShieldCheck,
  Briefcase, FilePlus2, Printer, Eye, Pencil, Trash2, Search, Download, Award,
} from "lucide-react";

type CertType =
  | "Birth Certificate"
  | "Death Certificate"
  | "Medical Fitness Certificate"
  | "Discharge Certificate"
  | "Vaccination Certificate"
  | "Disability Certificate"
  | "Experience Certificate"
  | "No Objection Certificate (NOC)"
  | "Relieving Certificate"
  | "Salary Certificate";

type Cert = {
  id: string;
  certNo: string;
  type: CertType;
  category: "Patient" | "Employee";
  recipient: string;
  refId: string; // patient id / employee id
  issuedBy: string;
  issuedOn: string;
  details: string;
  status: "Issued" | "Pending" | "Revoked";
};

const TYPES: { type: CertType; category: "Patient" | "Employee"; icon: typeof Baby; tone: string }[] = [
  { type: "Birth Certificate", category: "Patient", icon: Baby, tone: "bg-pink-100 text-pink-700" },
  { type: "Death Certificate", category: "Patient", icon: HeartCrack, tone: "bg-slate-200 text-slate-700" },
  { type: "Medical Fitness Certificate", category: "Patient", icon: Stethoscope, tone: "bg-emerald-100 text-emerald-700" },
  { type: "Discharge Certificate", category: "Patient", icon: BadgeCheck, tone: "bg-teal-100 text-teal-700" },
  { type: "Vaccination Certificate", category: "Patient", icon: ShieldCheck, tone: "bg-blue-100 text-blue-700" },
  { type: "Disability Certificate", category: "Patient", icon: FileSignature, tone: "bg-amber-100 text-amber-700" },
  { type: "Experience Certificate", category: "Employee", icon: Award, tone: "bg-indigo-100 text-indigo-700" },
  { type: "No Objection Certificate (NOC)", category: "Employee", icon: FileSignature, tone: "bg-violet-100 text-violet-700" },
  { type: "Relieving Certificate", category: "Employee", icon: Briefcase, tone: "bg-rose-100 text-rose-700" },
  { type: "Salary Certificate", category: "Employee", icon: FilePlus2, tone: "bg-cyan-100 text-cyan-700" },
];

const seed: Cert[] = [
  { id: "c1", certNo: "BC-2026-0142", type: "Birth Certificate", category: "Patient", recipient: "Baby of Anita Sharma", refId: "P-10293", issuedBy: "Dr. R. Mehta", issuedOn: "2026-06-15", details: "Female · 3.2 kg · Born 06:42 AM · Maternity Ward", status: "Issued" },
  { id: "c2", certNo: "DC-2026-0031", type: "Death Certificate", category: "Patient", recipient: "Mr. Suresh Kapoor", refId: "P-09812", issuedBy: "Dr. K. Iyer", issuedOn: "2026-06-12", details: "Cause: Cardiac arrest · ICU-3", status: "Issued" },
  { id: "c3", certNo: "MF-2026-0210", type: "Medical Fitness Certificate", category: "Patient", recipient: "Rohit Verma", refId: "P-10440", issuedBy: "Dr. S. Pillai", issuedOn: "2026-06-18", details: "Pre-employment medical · Fit for duty", status: "Issued" },
  { id: "c4", certNo: "EXP-2026-0019", type: "Experience Certificate", category: "Employee", recipient: "Nurse Priya Nair", refId: "EMP-2041", issuedBy: "HR Office", issuedOn: "2026-06-10", details: "Service period: Jan 2020 – May 2026 · Staff Nurse, ICU", status: "Issued" },
  { id: "c5", certNo: "NOC-2026-0007", type: "No Objection Certificate (NOC)", category: "Employee", recipient: "Dr. Vivek Rao", refId: "EMP-1108", issuedBy: "HR Office", issuedOn: "2026-06-09", details: "NOC for higher studies (MD Cardiology)", status: "Issued" },
  { id: "c6", certNo: "REL-2026-0004", type: "Relieving Certificate", category: "Employee", recipient: "Tech. Aman Khan", refId: "EMP-3320", issuedBy: "HR Office", issuedOn: "—", details: "Last working day: 2026-06-30", status: "Pending" },
];

const newCertNo = (type: CertType) => {
  const prefix = type.startsWith("Birth") ? "BC" : type.startsWith("Death") ? "DC" : type.startsWith("Medical") ? "MF" :
    type.startsWith("Discharge") ? "DSC" : type.startsWith("Vaccination") ? "VAC" : type.startsWith("Disability") ? "DIS" :
    type.startsWith("Experience") ? "EXP" : type.startsWith("No Objection") ? "NOC" : type.startsWith("Relieving") ? "REL" : "SAL";
  return `${prefix}-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
};

export default function Administration() {
  const crud = useCrud<Cert>("admin-certificates", seed);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"All" | "Patient" | "Employee">("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [issuing, setIssuing] = useState<CertType | null>(null);
  const [preview, setPreview] = useState<Cert | null>(null);
  const [editing, setEditing] = useState<Cert | null>(null);

  const filtered = useMemo(() => {
    return crud.items.filter(c => {
      if (tab !== "All" && c.category !== tab) return false;
      if (typeFilter !== "All" && c.type !== typeFilter) return false;
      const q = search.toLowerCase();
      if (q && !`${c.certNo} ${c.recipient} ${c.refId} ${c.type}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [crud.items, tab, typeFilter, search]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    crud.items.forEach(c => map.set(c.type, (map.get(c.type) || 0) + 1));
    return map;
  }, [crud.items]);

  const onIssueSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const type = (issuing || editing?.type) as CertType;
    const meta = TYPES.find(t => t.type === type)!;
    const data: Omit<Cert, "id"> = {
      certNo: editing?.certNo || newCertNo(type),
      type,
      category: meta.category,
      recipient: String(fd.get("recipient") || ""),
      refId: String(fd.get("refId") || ""),
      issuedBy: String(fd.get("issuedBy") || ""),
      issuedOn: String(fd.get("issuedOn") || ""),
      details: String(fd.get("details") || ""),
      status: String(fd.get("status") || "Issued") as Cert["status"],
    };
    if (editing) crud.update(editing.id, data); else crud.create(data);
    setIssuing(null); setEditing(null);
  };

  const exportCSV = () => {
    const rows = [["Cert No", "Type", "Category", "Recipient", "Ref ID", "Issued By", "Issued On", "Status"]];
    filtered.forEach(c => rows.push([c.certNo, c.type, c.category, c.recipient, c.refId, c.issuedBy, c.issuedOn, c.status]));
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "certificates.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Certificates" subtitle="Issue and manage medical & HR certificates">
      <div className="space-y-6">
        {/* Issue templates */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg text-primary">Issue a new certificate</h3>
              <p className="text-xs text-muted-foreground">Pick a template to issue. Patient & Employee certificates supported.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {TYPES.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.type} onClick={() => setIssuing(t.type)}
                  className="group text-left rounded-xl border border-border/60 bg-background hover:border-primary hover:shadow-md transition p-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${t.tone} mb-3`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold text-primary leading-tight">{t.type}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.category}</span>
                    <span className="text-[11px] text-muted-foreground">{counts.get(t.type) || 0} issued</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Toolbar */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by cert no, recipient, ref ID…"
                className="w-full pl-9 pr-3 py-2.5 rounded-full border border-border bg-background text-sm" />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-full bg-muted">
              {(["All", "Patient", "Employee"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${tab === t ? "bg-background text-primary shadow" : "text-muted-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 rounded-full border border-border bg-background text-xs">
              <option value="All">All types</option>
              {TYPES.map(t => <option key={t.type} value={t.type}>{t.type}</option>)}
            </select>
            <Btn variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export</Btn>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  {["Cert No", "Type", "Recipient", "Ref ID", "Issued By", "Issued On", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{c.certNo}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-primary">{c.type}</div>
                      <div className="text-[11px] text-muted-foreground">{c.category}</div>
                    </td>
                    <td className="px-4 py-3">{c.recipient}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.refId}</td>
                    <td className="px-4 py-3">{c.issuedBy}</td>
                    <td className="px-4 py-3">{c.issuedOn}</td>
                    <td className="px-4 py-3"><Pill tone={statusTone(c.status)}>{c.status}</Pill></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setPreview(c)} title="Preview & Print" className="p-1.5 rounded-lg hover:bg-muted"><Eye className="h-4 w-4 text-primary" /></button>
                        <button onClick={() => setPreview(c)} title="Print" className="p-1.5 rounded-lg hover:bg-muted"><Printer className="h-4 w-4 text-primary" /></button>
                        <button onClick={() => setEditing(c)} title="Edit" className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="h-4 w-4 text-primary" /></button>
                        <button onClick={() => crud.remove(c.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="h-4 w-4 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No certificates match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Issue / Edit modal */}
      <Modal open={!!issuing || !!editing} onClose={() => { setIssuing(null); setEditing(null); }}
        title={editing ? `Edit · ${editing.type}` : `Issue · ${issuing}`}
        size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => { setIssuing(null); setEditing(null); }}>Cancel</Btn>
          <button type="submit" form="cert-form" className="px-5 py-2.5 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90">{editing ? "Save changes" : "Issue certificate"}</button>
        </>}>
        <form id="cert-form" onSubmit={onIssueSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <Field label="Recipient name"><Input name="recipient" required defaultValue={editing?.recipient} placeholder="Full name" /></Field>
            <Field label="Reference ID (Patient / Employee)"><Input name="refId" required defaultValue={editing?.refId} placeholder="P-XXXXX or EMP-XXXX" /></Field>
            <Field label="Issued by"><Input name="issuedBy" required defaultValue={editing?.issuedBy} placeholder="Doctor / HR Officer" /></Field>
            <Field label="Issue date"><Input name="issuedOn" type="date" defaultValue={editing?.issuedOn !== "—" ? editing?.issuedOn : ""} /></Field>
            <Field label="Status">
              <Select name="status" defaultValue={editing?.status || "Issued"}>
                <option>Issued</option><option>Pending</option><option>Revoked</option>
              </Select>
            </Field>
          </div>
          <Field label="Details / Remarks">
            <textarea name="details" defaultValue={editing?.details} rows={4}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              placeholder="Cause / period / purpose / clinical notes…" />
          </Field>
        </form>
      </Modal>

      {/* Preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Certificate preview" size="xl"
        footer={<>
          <Btn variant="outline" onClick={() => setPreview(null)}>Close</Btn>
          <Btn onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Btn>
        </>}>
        {preview && <CertPrintable c={preview} />}
      </Modal>
    </AdminLayout>
  );
}

function CertPrintable({ c }: { c: Cert }) {
  return (
    <div id="cert-printable" className="bg-white text-slate-900 p-10 rounded-lg border-[3px] border-double border-primary/60">
      <div className="flex items-center justify-between border-b border-slate-300 pb-4">
        <div>
          <div className="text-[10px] tracking-widest text-slate-500">DEMO GENERAL HOSPITAL</div>
          <div className="font-display text-2xl text-primary">{c.type}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-widest text-slate-500">CERTIFICATE NO.</div>
          <div className="font-mono text-sm font-bold">{c.certNo}</div>
        </div>
      </div>

      <div className="text-center my-8">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">This is to certify that</div>
        <div className="font-display text-3xl text-primary mt-3">{c.recipient}</div>
        <div className="text-xs text-slate-500 mt-1">Reference ID · {c.refId}</div>
      </div>

      <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap min-h-[80px]">
        {c.details || "—"}
      </div>

      <div className="grid grid-cols-3 gap-6 mt-10 pt-6 border-t border-slate-300 text-sm">
        <div>
          <div className="text-[10px] tracking-widest text-slate-500">CATEGORY</div>
          <div className="font-semibold">{c.category}</div>
        </div>
        <div>
          <div className="text-[10px] tracking-widest text-slate-500">ISSUED ON</div>
          <div className="font-semibold">{c.issuedOn}</div>
        </div>
        <div>
          <div className="text-[10px] tracking-widest text-slate-500">STATUS</div>
          <div className="font-semibold">{c.status}</div>
        </div>
      </div>

      <div className="flex items-end justify-between mt-12">
        <div className="text-xs text-slate-500">
          <div>Computer-generated certificate.</div>
          <div>Verify at hospital records desk.</div>
        </div>
        <div className="text-center">
          <div className="h-12 border-b border-slate-400 w-56" />
          <div className="text-[10px] tracking-widest text-slate-500 mt-1">{c.issuedBy.toUpperCase()}</div>
          <div className="text-[10px] text-slate-500">Authorized Signatory</div>
        </div>
      </div>
    </div>
  );
}

