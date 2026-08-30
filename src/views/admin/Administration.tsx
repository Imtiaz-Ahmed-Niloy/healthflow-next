"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill } from "@/components/admin/ui";
import { Modal, Field, Input, Select, statusTone } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import {
  Baby, HeartCrack, Stethoscope, BadgeCheck, ShieldCheck, FileSignature,
  Award, Briefcase, FilePlus2, Search,
} from "lucide-react";
import type { Tables } from "@/lib/supabase/types";
import { BRAND_INFO } from "@/constants/brand";

type Certificate = Tables<"certificates">;
type CertType = Certificate["type"];
type CertStatus = Certificate["status"];

type PatientOption = { id: string; full_name: string; mrn: string };
type EmployeeOption = { id: string; name: string; emp_id: string };

/**
 * The catalogue of certificates a hospital issues.
 *
 * `category` lives here rather than in the database. It is a fixed property of
 * the type — a birth certificate is always about a patient — so storing it as
 * a column would only create something that could disagree with the type
 * beside it. Same reasoning as the payslip status dropped in HF-67.
 */
const TYPES: {
  type: CertType;
  label: string;
  category: "Patient" | "Employee";
  icon: typeof Baby;
  tone: string;
  prefix: string;
}[] = [
  { type: "birth", label: "Birth Certificate", category: "Patient", icon: Baby, tone: "bg-pink-100 text-pink-700", prefix: "BC" },
  { type: "death", label: "Death Certificate", category: "Patient", icon: HeartCrack, tone: "bg-slate-200 text-slate-700", prefix: "DC" },
  { type: "medical_fitness", label: "Medical Fitness Certificate", category: "Patient", icon: Stethoscope, tone: "bg-emerald-100 text-emerald-700", prefix: "MF" },
  { type: "discharge", label: "Discharge Certificate", category: "Patient", icon: BadgeCheck, tone: "bg-teal-100 text-teal-700", prefix: "DSC" },
  { type: "vaccination", label: "Vaccination Certificate", category: "Patient", icon: ShieldCheck, tone: "bg-blue-100 text-blue-700", prefix: "VAC" },
  { type: "disability", label: "Disability Certificate", category: "Patient", icon: FileSignature, tone: "bg-amber-100 text-amber-700", prefix: "DIS" },
  { type: "experience", label: "Experience Certificate", category: "Employee", icon: Award, tone: "bg-indigo-100 text-indigo-700", prefix: "EXP" },
  { type: "noc", label: "No Objection Certificate (NOC)", category: "Employee", icon: FileSignature, tone: "bg-violet-100 text-violet-700", prefix: "NOC" },
  { type: "relieving", label: "Relieving Certificate", category: "Employee", icon: Briefcase, tone: "bg-rose-100 text-rose-700", prefix: "REL" },
  { type: "salary", label: "Salary Certificate", category: "Employee", icon: FilePlus2, tone: "bg-cyan-100 text-cyan-700", prefix: "SAL" },
];

const metaFor = (type: CertType) => TYPES.find(t => t.type === type)!;

/** Statuses are stored lowercase across every module; capitalised only here. */
const STATUS_LABELS: Record<CertStatus, string> = {
  pending: "Pending",
  issued: "Issued",
  revoked: "Revoked",
};

const dateLabel = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * "BC-2026-0007", numbered within its type for the year.
 *
 * The old version padded a random four-digit number, so issuing two
 * certificates could produce the same one — on a document whose number is its
 * identity. The unique index catches a genuine clash now, and this makes one
 * unlikely in the first place.
 */
const suggestNumber = (rows: Certificate[], type: CertType) => {
  const { prefix } = metaFor(type);
  const year = new Date().getFullYear();
  const head = `${prefix}-${year}-`;
  const used = rows
    .map(c => c.certificate_no.trim().toUpperCase())
    .filter(no => no.startsWith(head))
    .map(no => Number(no.slice(head.length)))
    .filter(Number.isFinite);
  return `${head}${String(used.length ? Math.max(...used) + 1 : 1).padStart(4, "0")}`;
};

export default function Administration() {
  const crud = useResourceCrud<Certificate>("certificates");
  const patients = useResourceCrud<PatientOption>("patients");
  const employees = useResourceCrud<EmployeeOption>("employees");
  const { push } = useNotifications();

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"All" | "Patient" | "Employee">("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [issuing, setIssuing] = useState<CertType | null>(null);
  const [preview, setPreview] = useState<Certificate | null>(null);
  const [editing, setEditing] = useState<Certificate | null>(null);

  const rows = crud.items;

  const filtered = useMemo(() => rows.filter(c => {
    if (tab !== "All" && metaFor(c.type).category !== tab) return false;
    if (typeFilter !== "All" && c.type !== typeFilter) return false;
    const q = search.toLowerCase();
    if (q && !`${c.certificate_no} ${c.recipient_name} ${metaFor(c.type).label}`.toLowerCase().includes(q)) return false;
    return true;
  }), [rows, tab, typeFilter, search]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach(c => map.set(c.type, (map.get(c.type) || 0) + 1));
    return map;
  }, [rows]);

  const activeType = (issuing ?? editing?.type) as CertType | undefined;
  const activeMeta = activeType ? metaFor(activeType) : null;

  const onIssueSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeType) return;
    const fd = new FormData(e.currentTarget);
    const status = String(fd.get("status") || "pending") as CertStatus;
    const issuedOn = String(fd.get("issued_on") || "");

    // The table refuses an issued certificate with no date; catch it here so
    // the person gets a sentence rather than a constraint violation.
    if (status === "issued" && !issuedOn) {
      push({ title: "An issued certificate needs an issue date", tone: "warn" });
      return;
    }

    const subject = String(fd.get("subject_id") || "");
    const body = {
      certificate_no: String(fd.get("certificate_no") || "").trim(),
      type: activeType,
      recipient_name: String(fd.get("recipient_name") || "").trim(),
      // Linked when the person is on file; free-text name only when they are
      // not — a relative collecting a death certificate, a former employee.
      patient_id: activeMeta?.category === "Patient" ? (subject || null) : null,
      employee_id: activeMeta?.category === "Employee" ? (subject || null) : null,
      issued_by: String(fd.get("issued_by") || "") || null,
      issued_on: issuedOn || null,
      details: String(fd.get("details") || "") || null,
      status,
    };

    const saved = editing
      ? await crud.update(editing.id, body as never)
      : await crud.create(body as never);
    if (!saved) return; // useResourceCrud has surfaced the error

    push({ title: editing ? "Certificate updated" : `${activeMeta?.label} issued`, tone: "ok" });
    setIssuing(null);
    setEditing(null);
  };

  const exportCSV = () => {
    const head = ["Cert No", "Type", "Category", "Recipient", "Issued By", "Issued On", "Status"];
    const body = filtered.map(c => [
      c.certificate_no, metaFor(c.type).label, metaFor(c.type).category,
      c.recipient_name, c.issued_by ?? "", c.issued_on ?? "", STATUS_LABELS[c.status],
    ]);
    const csv = [head, ...body]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "certificates.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Certificates" subtitle="Issue and manage medical & HR certificates">
      <div className="space-y-6">
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-display text-lg text-primary">Issue a new certificate</h3>
            <p className="text-xs text-muted-foreground">
              Pick a template to issue. Patient and employee certificates supported.
            </p>
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
                  <div className="text-sm font-semibold text-primary leading-tight">{t.label}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] tracking-widest text-muted-foreground">{t.category.toUpperCase()}</span>
                    <span className="text-[10px] text-muted-foreground">{counts.get(t.type) || 0} issued</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search number, name or type…"
                className="w-full bg-muted/40 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
            </div>
            <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
              {(["All", "Patient", "Employee"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    tab === t ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-primary"
                  }`}>{t}</button>
              ))}
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none">
              <option value="All">All types</option>
              {TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
            </select>
            <Btn variant="outline" className="ml-auto" onClick={exportCSV}>Export CSV</Btn>
          </div>

          {crud.error ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-destructive">Could not load certificates.</p>
              <p className="text-xs text-muted-foreground mt-1">
                You may not have access to this module, or the request failed.
              </p>
              <button type="button" onClick={() => crud.refetch()}
                className="mt-3 px-4 py-2 rounded-full text-xs font-semibold border border-border hover:bg-muted">
                Try again
              </button>
            </div>
          ) : crud.isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-primary">No certificates found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {rows.length === 0 ? "Pick a template above to issue the first one." : "Try a different search or filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {["Cert No", "Type", "Recipient", "Issued By", "Issued On", "Status", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-[10px] uppercase tracking-widest text-muted-foreground font-bold text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-t border-border/40 hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{c.certificate_no}</td>
                      <td className="px-4 py-3">{metaFor(c.type).label}</td>
                      <td className="px-4 py-3 font-semibold text-primary">{c.recipient_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.issued_by || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{dateLabel(c.issued_on)}</td>
                      <td className="px-4 py-3"><Pill tone={statusTone(c.status)}>{STATUS_LABELS[c.status]}</Pill></td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Btn variant="ghost" onClick={() => setPreview(c)}>Preview</Btn>
                        <Btn variant="ghost" onClick={() => setEditing(c)}>Edit</Btn>
                        <Btn variant="danger" onClick={() => void crud.remove(c.id)}>Delete</Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal open={!!issuing || !!editing} onClose={() => { setIssuing(null); setEditing(null); }}
        title={editing ? `Edit · ${metaFor(editing.type).label}` : activeMeta ? `Issue · ${activeMeta.label}` : ""}
        footer={<>
          <Btn variant="outline" onClick={() => { setIssuing(null); setEditing(null); }}>Cancel</Btn>
          <button type="submit" form="cert-form"
            className="px-5 py-2.5 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90">
            {editing ? "Save changes" : "Issue certificate"}
          </button>
        </>}>
        {activeMeta && (
          <form id="cert-form" onSubmit={onIssueSubmit}>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Certificate number" required>
                <Input name="certificate_no" required
                  defaultValue={editing?.certificate_no ?? suggestNumber(rows, activeMeta.type)} />
              </Field>
              <Field label="Recipient name" required>
                <Input name="recipient_name" required defaultValue={editing?.recipient_name} placeholder="Full name" />
              </Field>
              <Field label={activeMeta.category === "Patient" ? "Patient on file" : "Employee on file"}>
                <Select name="subject_id"
                  defaultValue={(activeMeta.category === "Patient" ? editing?.patient_id : editing?.employee_id) ?? ""}>
                  <option value="">Not on file — name only</option>
                  {activeMeta.category === "Patient"
                    ? patients.items.map(p => <option key={p.id} value={p.id}>{p.full_name} · {p.mrn}</option>)
                    : employees.items.map(e => <option key={e.id} value={e.id}>{e.name} · {e.emp_id}</option>)}
                </Select>
              </Field>
              <Field label="Issued by"><Input name="issued_by" defaultValue={editing?.issued_by ?? ""} placeholder="Doctor / HR Officer" /></Field>
              <Field label="Issue date"><Input name="issued_on" type="date" defaultValue={editing?.issued_on ?? ""} /></Field>
              <Field label="Status">
                <Select name="status" defaultValue={editing?.status ?? "issued"}>
                  {(Object.keys(STATUS_LABELS) as CertStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Details / Remarks">
              <textarea name="details" defaultValue={editing?.details ?? ""} rows={4}
                className="w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
            </Field>
          </form>
        )}
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Certificate preview" size="xl"
        footer={<Btn variant="outline" onClick={() => setPreview(null)}>Close</Btn>}>
        {preview && <CertPrintable c={preview} />}
      </Modal>
    </AdminLayout>
  );
}

function CertPrintable({ c }: { c: Certificate }) {
  const meta = metaFor(c.type);
  return (
    <div id="cert-printable" className="bg-white text-slate-900 p-10 rounded-lg border-[3px] border-double border-primary/60">
      <div className="flex items-center justify-between border-b border-slate-300 pb-4">
        <div>
          {/* Was the hardcoded string "DEMO GENERAL HOSPITAL" on a document
              meant to be handed to a patient. */}
          <div className="text-[10px] tracking-widest text-slate-500">{BRAND_INFO.name.toUpperCase()}</div>
          <div className="font-display text-2xl text-primary">{meta.label}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-widest text-slate-500">CERTIFICATE NO.</div>
          <div className="font-mono text-sm font-bold">{c.certificate_no}</div>
        </div>
      </div>

      <div className="text-center my-8">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">This is to certify that</div>
        <div className="font-display text-3xl text-primary mt-3">{c.recipient_name}</div>
      </div>

      <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap min-h-[80px]">
        {c.details || "—"}
      </div>

      <div className="grid grid-cols-3 gap-6 mt-10 pt-6 border-t border-slate-300 text-sm">
        <div>
          <div className="text-[10px] tracking-widest text-slate-500">CATEGORY</div>
          <div className="font-semibold">{meta.category}</div>
        </div>
        <div>
          <div className="text-[10px] tracking-widest text-slate-500">ISSUED ON</div>
          <div className="font-semibold">{dateLabel(c.issued_on)}</div>
        </div>
        <div>
          <div className="text-[10px] tracking-widest text-slate-500">STATUS</div>
          <div className="font-semibold">{STATUS_LABELS[c.status]}</div>
        </div>
      </div>

      <div className="flex items-end justify-between mt-12">
        <div className="text-xs text-slate-500">
          <div>Computer-generated certificate.</div>
          <div>Verify at hospital records desk.</div>
        </div>
        <div className="text-center">
          <div className="h-12 border-b border-slate-400 w-56" />
          <div className="text-[10px] tracking-widest text-slate-500 mt-1">{(c.issued_by || "").toUpperCase()}</div>
          <div className="text-[10px] text-slate-500">Authorized Signatory</div>
        </div>
      </div>
    </div>
  );
}
