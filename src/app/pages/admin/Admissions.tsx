'use client';
import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle, Kpi } from "@/components/admin/ui";
import {
  useCrud, Modal, Field, Input, Select, TextArea, Toolbar,
  DataTable, RowActions, ConfirmDialog, Chips, statusTone, exportCSV,
  type Column,
} from "@/components/admin/crud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { BedDouble, UserPlus, LogOut, Activity, Stethoscope, FileText, Printer } from "lucide-react";

type Ward =
  | "General Bed"
  | "Ward"
  | "Cabin"
  | "ICU"
  | "Emergency"
  | "Surgery"
  | "Maternity"
  | "Pediatric";

type Admission = {
  id: string;
  patient: string;
  age: string;
  gender: "Male" | "Female" | "Other";
  contact: string;
  ward: Ward;
  bedNo: string;
  doctor: string;
  diagnosis: string;
  admittedAt: string; // ISO date-time
  dischargedAt?: string;
  status: "Admitted" | "Under Observation" | "In Surgery" | "Discharged" | "Transferred";
  priority: "Routine" | "Urgent" | "Critical";
  notes?: string;
};

const WARDS: Ward[] = ["General Bed", "Ward", "Cabin", "ICU", "Emergency", "Surgery", "Maternity", "Pediatric"];

const now = () => new Date().toISOString().slice(0, 16);

const seed: Admission[] = [
  { id: "a1", patient: "Eleanor Vance", age: "71", gender: "Female", contact: "+1 555-0142", ward: "ICU", bedNo: "ICU-3", doctor: "Dr. Aniket Rao", diagnosis: "Acute MI", admittedAt: "2026-06-19T08:30", status: "Under Observation", priority: "Critical", notes: "Cardiac monitor on" },
  { id: "a2", patient: "Marcus Chen", age: "38", gender: "Male", contact: "+1 555-0188", ward: "Ward", bedNo: "3B-105", doctor: "Dr. Sara Lin", diagnosis: "Pneumonia", admittedAt: "2026-06-18T14:10", status: "Admitted", priority: "Urgent" },
  { id: "a3", patient: "Sarah Jenkins", age: "45", gender: "Female", contact: "+1 555-0123", ward: "Cabin", bedNo: "C-201", doctor: "Dr. Niraj Patel", diagnosis: "Post-op recovery", admittedAt: "2026-06-17T09:00", status: "Admitted", priority: "Routine" },
  { id: "a4", patient: "Robert Liu", age: "62", gender: "Male", contact: "+1 555-0117", ward: "Surgery", bedNo: "OR-2", doctor: "Dr. Mehta", diagnosis: "Appendectomy", admittedAt: "2026-06-20T07:15", status: "In Surgery", priority: "Urgent" },
  { id: "a5", patient: "Aisha Bhatti", age: "29", gender: "Female", contact: "+1 555-0166", ward: "Maternity", bedNo: "MAT-2", doctor: "Dr. Reema Shah", diagnosis: "Labour - active", admittedAt: "2026-06-20T03:45", status: "Admitted", priority: "Urgent" },
  { id: "a6", patient: "John Doe", age: "54", gender: "Male", contact: "+1 555-0102", ward: "Emergency", bedNo: "ER-1", doctor: "Dr. Khan", diagnosis: "RTA - head trauma", admittedAt: "2026-06-20T11:05", status: "Under Observation", priority: "Critical" },
];

const priorityTone: Record<Admission["priority"], "ok" | "warn" | "bad"> = {
  Routine: "ok",
  Urgent: "warn",
  Critical: "bad",
};

const empty: Omit<Admission, "id"> = {
  patient: "",
  age: "",
  gender: "Male",
  contact: "",
  ward: "Ward",
  bedNo: "",
  doctor: "",
  diagnosis: "",
  admittedAt: now(),
  status: "Admitted",
  priority: "Routine",
  notes: "",
};

const Admissions = () => {
  const crud = useCrud<Admission>("hf:admissions", seed);
  const { push } = useNotifications();
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState<"all" | Ward>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Admission["status"]>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [edit, setEdit] = useState<Admission | null>(null);
  const [add, setAdd] = useState(false);
  const [draft, setDraft] = useState<Omit<Admission, "id">>(empty);
  const [del, setDel] = useState<string | null>(null);
  const [discharge, setDischarge] = useState<Admission | null>(null);
  const [invoice, setInvoice] = useState<Admission | null>(null);

  const rows = useMemo(() => crud.items.filter(a => {
    if (wardFilter !== "all" && a.ward !== wardFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return [a.patient, a.bedNo, a.doctor, a.diagnosis, a.contact].some(v => v.toLowerCase().includes(q));
    }
    return true;
  }), [crud.items, search, wardFilter, statusFilter]);

  const active = crud.items.filter(a => a.status !== "Discharged" && a.status !== "Transferred");
  const byWard = (w: Ward) => active.filter(a => a.ward === w).length;
  const critical = active.filter(a => a.priority === "Critical").length;

  const openAdd = () => { setDraft({ ...empty, admittedAt: now() }); setAdd(true); };
  const openEdit = (a: Admission) => { setEdit(a); setDraft({ ...a }); };

  const save = () => {
    if (!draft.patient.trim() || !draft.bedNo.trim()) return;
    if (edit) {
      crud.update(edit.id, draft);
      setEdit(null);
    } else {
      const created = crud.create(draft);
      push({ title: "Patient admitted", body: `${created.patient} → ${created.ward} (${created.bedNo})`, tone: "info" });
      setAdd(false);
    }
  };

  const confirmDischarge = () => {
    if (!discharge) return;
    crud.update(discharge.id, { status: "Discharged", dischargedAt: now() });
    push({ title: "Discharged", body: `${discharge.patient} discharged from ${discharge.ward}`, tone: "ok" });
    setDischarge(null);
  };

  const columns: Column<Admission>[] = [
    {
      key: "patient", label: "Patient", sortable: true, accessor: a => a.patient,
      render: a => (
        <div>
          <p className="font-semibold text-primary">{a.patient}</p>
          <p className="text-[11px] text-muted-foreground">{a.age}y · {a.gender} · {a.contact}</p>
        </div>
      ),
    },
    {
      key: "ward", label: "Ward / Bed", sortable: true, accessor: a => a.ward,
      render: a => (
        <div>
          <p className="font-semibold">{a.ward}</p>
          <p className="text-[11px] text-muted-foreground">Bed {a.bedNo}</p>
        </div>
      ),
    },
    { key: "doctor", label: "Doctor", sortable: true, accessor: a => a.doctor, render: a => <span className="text-sm">{a.doctor}</span> },
    { key: "diagnosis", label: "Diagnosis", render: a => <span className="text-sm">{a.diagnosis}</span> },
    {
      key: "priority", label: "Priority", sortable: true, accessor: a => a.priority,
      render: a => <Pill tone={priorityTone[a.priority]}>{a.priority}</Pill>,
    },
    {
      key: "status", label: "Status", sortable: true, accessor: a => a.status,
      render: a => <Pill tone={statusTone(a.status)}>{a.status}</Pill>,
    },
    {
      key: "admittedAt", label: "Admitted", sortable: true, accessor: a => a.admittedAt,
      render: a => <span className="text-xs text-muted-foreground">{a.admittedAt.replace("T", " ")}</span>,
    },
  ];

  return (
    <AdminLayout title="Patient Admissions" subtitle="Admit patients into beds, wards, cabins, ICU, emergency & surgery">
      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi icon={BedDouble} label="Active Admissions" value={String(active.length)} tone="primary" />
        <Kpi icon={Activity} label="Critical" value={String(critical)} tone="destructive" />
        <Kpi icon={Stethoscope} label="In Surgery" value={String(active.filter(a => a.status === "In Surgery").length)} tone="accent" />
        <Kpi icon={UserPlus} label="Today's Admits" value={String(crud.items.filter(a => a.admittedAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length)} tone="chip" />
      </div>

      {/* Per-ward strip */}
      <Card className="p-5 mb-6">
        <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-3">OCCUPANCY BY UNIT</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {WARDS.map(w => (
            <button key={w} onClick={() => setWardFilter(w)}
              className={`rounded-xl border px-3 py-2 text-left transition ${wardFilter === w ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"}`}>
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{w.toUpperCase()}</p>
              <p className="font-display text-xl text-primary">{byWard(w)}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card className="p-5">
        <SectionTitle title="Admission Register" />
        <Toolbar
          search={search} onSearch={setSearch}
          onAdd={openAdd} addLabel="Admit Patient"
          onExport={() => exportCSV(rows as unknown as Record<string, unknown>[], "admissions.csv")}
          bulkCount={selected.length}
          onBulkDelete={() => { crud.bulkRemove(selected); setSelected([]); }}
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <Select value={wardFilter} onChange={e => setWardFilter(e.target.value as never)} className="!w-auto">
                <option value="all">All wards</option>
                {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
              </Select>
              <Chips
                value={statusFilter}
                onChange={v => setStatusFilter(v)}
                options={[
                  { value: "all", label: "All" },
                  { value: "Admitted", label: "Admitted" },
                  { value: "Under Observation", label: "Observation" },
                  { value: "In Surgery", label: "Surgery" },
                  { value: "Discharged", label: "Discharged" },
                ]}
              />
            </div>
          }
        />
        <DataTable
          rows={rows}
          columns={columns}
          selected={selected}
          onSelect={setSelected}
          onRow={openEdit}
          empty="No admissions match your filters"
          actions={(row) => (
            <RowActions
              onEdit={() => openEdit(row)}
              onDelete={() => setDel(row.id)}
              extra={row.status !== "Discharged" ? (
                <button onClick={() => setDischarge(row)}
                  className="p-1.5 rounded-lg hover:bg-muted text-primary" title="Discharge">
                  <LogOut className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={() => setInvoice(row)}
                  className="p-1.5 rounded-lg hover:bg-muted text-primary" title="Invoice">
                  <FileText className="h-4 w-4" />
                </button>
              )}
            />
          )}
        />
      </Card>

      {/* Add / Edit modal */}
      <Modal
        open={add || !!edit}
        onClose={() => { setAdd(false); setEdit(null); }}
        title={edit ? "Edit admission" : "Admit patient"}
        size="lg"
        footer={
          <>
            <Btn variant="outline" onClick={() => { setAdd(false); setEdit(null); }}>Cancel</Btn>
            <Btn onClick={save}>{edit ? "Save changes" : "Admit patient"}</Btn>
          </>
        }
      >
        <div className="grid sm:grid-cols-2 gap-x-5">
          <Field label="Patient name"><Input value={draft.patient} onChange={e => setDraft(d => ({ ...d, patient: e.target.value }))} placeholder="Full name" /></Field>
          <Field label="Contact"><Input value={draft.contact} onChange={e => setDraft(d => ({ ...d, contact: e.target.value }))} placeholder="Phone" /></Field>
          <Field label="Age"><Input value={draft.age} onChange={e => setDraft(d => ({ ...d, age: e.target.value }))} placeholder="Years" /></Field>
          <Field label="Gender">
            <Select value={draft.gender} onChange={e => setDraft(d => ({ ...d, gender: e.target.value as Admission["gender"] }))}>
              <option>Male</option><option>Female</option><option>Other</option>
            </Select>
          </Field>
          <Field label="Ward / Unit">
            <Select value={draft.ward} onChange={e => setDraft(d => ({ ...d, ward: e.target.value as Ward }))}>
              {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
            </Select>
          </Field>
          <Field label="Bed / Room no."><Input value={draft.bedNo} onChange={e => setDraft(d => ({ ...d, bedNo: e.target.value }))} placeholder="e.g. ICU-3" /></Field>
          <Field label="Attending doctor"><Input value={draft.doctor} onChange={e => setDraft(d => ({ ...d, doctor: e.target.value }))} placeholder="Dr. ..." /></Field>
          <Field label="Diagnosis"><Input value={draft.diagnosis} onChange={e => setDraft(d => ({ ...d, diagnosis: e.target.value }))} placeholder="Reason for admission" /></Field>
          <Field label="Admitted at"><Input type="datetime-local" value={draft.admittedAt} onChange={e => setDraft(d => ({ ...d, admittedAt: e.target.value }))} /></Field>
          <Field label="Priority">
            <Select value={draft.priority} onChange={e => setDraft(d => ({ ...d, priority: e.target.value as Admission["priority"] }))}>
              <option>Routine</option><option>Urgent</option><option>Critical</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value as Admission["status"], dischargedAt: e.target.value === "Discharged" ? (d.dischargedAt || now()) : d.dischargedAt }))}>
              <option>Admitted</option>
              <option>Under Observation</option>
              <option>In Surgery</option>
              <option>Transferred</option>
              <option>Discharged</option>
            </Select>
          </Field>
          {draft.status === "Discharged" && (
            <Field label="Discharged at">
              <Input type="datetime-local" value={draft.dischargedAt ?? ""} onChange={e => setDraft(d => ({ ...d, dischargedAt: e.target.value }))} />
            </Field>
          )}
        </div>
        <Field label="Clinical notes"><TextArea rows={3} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Allergies, vitals, special instructions…" /></Field>
        {edit && draft.status === "Discharged" && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
            <div>
              <p className="font-semibold text-primary">Patient discharged</p>
              <p className="text-xs text-muted-foreground">Generate the final invoice & billing summary.</p>
            </div>
            <Btn variant="outline" onClick={() => { crud.update(edit.id, draft); setInvoice({ ...edit, ...draft }); }}>
              <FileText className="h-4 w-4 mr-1.5" /> Generate Invoice
            </Btn>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={() => del && crud.remove(del)}
        title="Remove admission?"
        description="This permanently removes the admission record."
      />

      <ConfirmDialog
        open={!!discharge}
        onClose={() => setDischarge(null)}
        onConfirm={confirmDischarge}
        title={`Discharge ${discharge?.patient ?? ""}?`}
        description={`Bed ${discharge?.bedNo ?? ""} will be marked available.`}
      />

      {/* Invoice modal */}
      <Modal
        open={!!invoice}
        onClose={() => setInvoice(null)}
        title="Discharge Invoice"
        size="lg"
        footer={
          <>
            <Btn variant="outline" onClick={() => setInvoice(null)}>Close</Btn>
            <Btn onClick={() => window.print()}><Printer className="h-4 w-4 mr-1.5" /> Print</Btn>
          </>
        }
      >
        {invoice && (() => {
          const a = invoice;
          const admit = new Date(a.admittedAt);
          const disc = a.dischargedAt ? new Date(a.dischargedAt) : new Date();
          const days = Math.max(1, Math.ceil((disc.getTime() - admit.getTime()) / 86400000));
          const bedRate = a.ward === "ICU" ? 8000 : a.ward === "Cabin" ? 5000 : a.ward === "Surgery" ? 7000 : 2500;
          const lines = [
            { d: `Bed charges — ${a.ward} (${days} day${days > 1 ? "s" : ""})`, q: days, r: bedRate },
            { d: `Doctor consultation — ${a.doctor}`, q: days, r: 1200 },
            { d: "Nursing & care services", q: days, r: 800 },
            { d: "Diagnostics & lab", q: 1, r: 3500 },
            { d: "Medicines & supplies", q: 1, r: 2200 },
          ];
          const subtotal = lines.reduce((s, l) => s + l.q * l.r, 0);
          const vat = Math.round(subtotal * 0.05);
          const total = subtotal + vat;
          return (
            <div className="text-sm">
              <div className="flex items-start justify-between mb-5 pb-4 border-b border-border/60">
                <div>
                  <p className="font-display text-2xl text-primary">HealthFlow Hospital</p>
                  <p className="text-xs text-muted-foreground">Tax Invoice · INV-{a.id.toUpperCase()}-{disc.getFullYear()}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Issued: {disc.toLocaleDateString()}</p>
                  <p>Status: <span className="font-semibold text-primary">DISCHARGED</span></p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1">BILL TO</p>
                  <p className="font-semibold text-primary">{a.patient}</p>
                  <p className="text-xs text-muted-foreground">{a.age}y · {a.gender} · {a.contact}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1">STAY</p>
                  <p className="text-xs">Admitted: {admit.toLocaleString()}</p>
                  <p className="text-xs">Discharged: {disc.toLocaleString()}</p>
                  <p className="text-xs">Ward / Bed: {a.ward} · {a.bedNo}</p>
                  <p className="text-xs">Diagnosis: {a.diagnosis}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[10px] tracking-widest font-bold text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2">DESCRIPTION</th>
                      <th className="text-right px-3 py-2 w-16">QTY</th>
                      <th className="text-right px-3 py-2 w-24">RATE</th>
                      <th className="text-right px-3 py-2 w-28">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="px-3 py-2">{l.d}</td>
                        <td className="px-3 py-2 text-right">{l.q}</td>
                        <td className="px-3 py-2 text-right">৳{l.r.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium">৳{(l.q * l.r).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">VAT (5%)</span><span>৳{vat.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t border-border/60 pt-2 font-display text-lg text-primary"><span>Total</span><span>৳{total.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </AdminLayout>
  );
};

export default Admissions;
