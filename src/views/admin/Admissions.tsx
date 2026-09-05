"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle, Kpi } from "@/components/admin/ui";
import {
  Modal, Field, Input, Select, TextArea, Toolbar,
  DataTable, RowActions, ConfirmDialog, Chips, statusTone, exportCSV,
  type Column,
} from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useAdmitPatient } from "@/components/admin/useAdmitPatient";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { useTransferBedMutation } from "@/redux/api/bedTransfers";
import { doctorsApi, patientsApi, bedsApi, cabinsApi, type AdmissionRow } from "@/redux/api/resources";
import { BedDouble, UserPlus, LogOut, Activity, Stethoscope, FileText, Printer, ArrowRightLeft } from "lucide-react";

/**
 * HF-37 frontend wiring. Real tables now: admissions, bed_stays (via embed),
 * patients, doctors, beds, cabins. See docs/ward-admission-api.md.
 *
 * Two things that don't exist in the mock this replaced:
 * - No "Transferred" status — a transfer is its own action (bed-transfers),
 *   not a status value. See EDITABLE_STATUSES below for the related point
 *   that "discharged" isn't reachable from the plain status dropdown either.
 * - No ward/bed fields on the admission itself — location lives in
 *   bed_stays, read via locationLabel() below, written only through
 *   useAdmitPatient() (create) or useTransferBedMutation() (move/release).
 */

const STATUSES = [
  { value: "admitted", label: "Admitted" },
  { value: "under_observation", label: "Under Observation" },
  { value: "in_surgery", label: "In Surgery" },
  { value: "discharged", label: "Discharged" },
] as const;

/**
 * Discharging isn't just a status flip anymore — it also has to release the
 * bed (a second API call, see confirmDischarge). Leaving "discharged"
 * selectable in the ordinary edit form would let someone set the status
 * without freeing the bed, silently reintroducing the bug this ticket exists
 * to close. Discharge is reachable only through the dedicated action.
 */
const EDITABLE_STATUSES = STATUSES.filter(s => s.value !== "discharged");

const PRIORITIES = [
  { value: "routine", label: "Routine" },
  { value: "urgent", label: "Urgent" },
  { value: "critical", label: "Critical" },
] as const;

const priorityTone: Record<string, "ok" | "warn" | "bad"> = {
  routine: "ok",
  urgent: "warn",
  critical: "bad",
};

const statusLabel = (v: string) => STATUSES.find(s => s.value === v)?.label ?? v;
const priorityLabel = (v: string) => PRIORITIES.find(p => p.value === v)?.label ?? v;

const now = () => new Date().toISOString().slice(0, 16);

const ageFromDob = (dob: string | null) => {
  if (!dob) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)));
};

/** The open placement, if any — bed_stays carries every placement the admission ever had. */
const currentStay = (a: AdmissionRow) => a.bed_stays.find(s => s.ended_at === null) ?? null;

const locationLabel = (a: AdmissionRow) => {
  const stay = currentStay(a);
  if (stay?.beds) return `Bed ${stay.beds.number}`;
  if (stay?.cabins) return `Cabin ${stay.cabins.number}`;
  return "Unassigned";
};

type Draft = {
  patient_id: string;
  doctor_id: string;
  diagnosis: string;
  priority: string;
  notes: string;
  status: string;
  admitted_at: string;
  /** Admit-only — a fresh admission is placed in the same step it's created. */
  bed_id: string;
  cabin_id: string;
};

const emptyDraft: Draft = {
  patient_id: "", doctor_id: "", diagnosis: "", priority: "routine",
  notes: "", status: "admitted", admitted_at: now(), bed_id: "", cabin_id: "",
};

const Admissions = () => {
  const crud = useResourceCrud<AdmissionRow>("admissions");
  const { admit } = useAdmitPatient();
  const [transferBed] = useTransferBedMutation();
  const { push } = useNotifications();

  // Small enough lists to load whole — same pattern as Appointments.tsx.
  const { data: patientsData, isLoading: patientsLoading } = patientsApi.useList({ limit: 100 });
  const patients = useMemo(() => patientsData?.data ?? [], [patientsData]);
  const patientOptions = useMemo(() => [
    { value: "", label: patientsLoading ? "Loading patients…" : "— Select a patient —" },
    ...patients.map(p => ({ value: p.id, label: `${p.full_name} (${p.mrn})` })),
  ], [patients, patientsLoading]);

  const { data: doctorsData, isLoading: doctorsLoading } = doctorsApi.useList({ limit: 100 });
  const doctors = useMemo(() => doctorsData?.data ?? [], [doctorsData]);
  const doctorOptions = useMemo(() => [
    { value: "", label: doctorsLoading ? "Loading doctors…" : "— Not assigned —" },
    ...doctors.map(d => ({ value: d.id, label: d.specialty ? `${d.name} · ${d.specialty}` : d.name })),
  ], [doctors, doctorsLoading]);

  // Only vacant beds/cabins are offered — admitting or transferring into an
  // occupied one is exactly what the partial unique indexes behind
  // bed-transfers exist to refuse.
  const { data: bedsData } = bedsApi.useList({ limit: 100, filters: { status: "available" } });
  const availableBeds = useMemo(() => bedsData?.data ?? [], [bedsData]);
  const { data: cabinsData } = cabinsApi.useList({ limit: 100, filters: { status: "available" } });
  const availableCabins = useMemo(() => cabinsData?.data ?? [], [cabinsData]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [edit, setEdit] = useState<AdmissionRow | null>(null);
  const [add, setAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [del, setDel] = useState<string | null>(null);
  const [discharge, setDischarge] = useState<AdmissionRow | null>(null);
  const [transferring, setTransferring] = useState<AdmissionRow | null>(null);
  const [transferTarget, setTransferTarget] = useState({ bed_id: "", cabin_id: "" });
  const [invoice, setInvoice] = useState<AdmissionRow | null>(null);

  const rows = useMemo(() => crud.items.filter(a => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return [a.patients?.full_name ?? "", a.doctors?.name ?? "", a.diagnosis ?? "", locationLabel(a)]
        .some(v => v.toLowerCase().includes(q));
    }
    return true;
  }), [crud.items, search, statusFilter]);

  const active = crud.items.filter(a => a.status !== "discharged");
  const critical = active.filter(a => a.priority === "critical").length;
  const byStatus = (v: string) => active.filter(a => a.status === v).length;
  const todaysAdmits = crud.items.filter(a => a.admitted_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  const openAdd = () => { setDraft({ ...emptyDraft, admitted_at: now() }); setAdd(true); };
  const openEdit = (a: AdmissionRow) => {
    setEdit(a);
    setDraft({
      patient_id: a.patient_id, doctor_id: a.doctor_id ?? "",
      diagnosis: a.diagnosis ?? "", priority: a.priority, notes: a.notes ?? "",
      status: a.status, admitted_at: a.admitted_at.slice(0, 16),
      bed_id: "", cabin_id: "",
    });
  };

  const save = async () => {
    if (!draft.patient_id) return;
    if (edit) {
      const ok = await crud.update(edit.id, {
        patient_id: draft.patient_id,
        doctor_id: draft.doctor_id || null,
        diagnosis: draft.diagnosis || null,
        priority: draft.priority as AdmissionRow["priority"],
        notes: draft.notes || null,
        status: draft.status as AdmissionRow["status"],
        admitted_at: draft.admitted_at,
      });
      if (ok) setEdit(null);
    } else {
      const ok = await admit({
        patient_id: draft.patient_id,
        doctor_id: draft.doctor_id || undefined,
        diagnosis: draft.diagnosis || undefined,
        priority: draft.priority as AdmissionRow["priority"],
        notes: draft.notes || undefined,
        bed_id: draft.bed_id || undefined,
        cabin_id: draft.cabin_id || undefined,
      });
      if (ok) setAdd(false);
    }
  };

  /** Two calls, chained behind one confirmation: flip the status, then release the bed. */
  const confirmDischarge = async () => {
    if (!discharge) return;
    const ok = await crud.update(discharge.id, { status: "discharged", discharged_at: now() });
    if (ok) {
      try {
        await transferBed({ admission_id: discharge.id, bed_id: null, cabin_id: null }).unwrap();
      } catch {
        push({ title: "Discharged, but the bed/cabin release failed", body: "Release it manually from the Wards floor map", tone: "warn" });
      }
      push({ title: "Discharged", body: `${discharge.patients?.full_name ?? "Patient"} discharged`, tone: "ok" });
    }
    setDischarge(null);
  };

  const openTransfer = (a: AdmissionRow) => { setTransferring(a); setTransferTarget({ bed_id: "", cabin_id: "" }); };
  const confirmTransfer = async () => {
    if (!transferring || (!transferTarget.bed_id && !transferTarget.cabin_id)) return;
    try {
      await transferBed({
        admission_id: transferring.id,
        bed_id: transferTarget.bed_id || null,
        cabin_id: transferTarget.cabin_id || null,
      }).unwrap();
      push({ title: "Transferred", body: `${transferring.patients?.full_name ?? "Patient"} moved to a new bed`, tone: "ok" });
      setTransferring(null);
    } catch {
      push({ title: "Transfer failed", body: "The bed/cabin may already be occupied", tone: "bad" });
    }
  };

  const columns: Column<AdmissionRow>[] = [
    {
      key: "patient", label: "Patient", sortable: true, accessor: a => a.patients?.full_name ?? "",
      render: a => {
        const age = ageFromDob(a.patients?.date_of_birth ?? null);
        return (
          <div>
            <p className="font-semibold text-primary">{a.patients?.full_name ?? "Unknown patient"}</p>
            <p className="text-[11px] text-muted-foreground">
              {age !== null ? `${age}y · ` : ""}{a.patients?.gender ?? ""}{a.patients?.phone ? ` · ${a.patients.phone}` : ""}
            </p>
          </div>
        );
      },
    },
    {
      key: "location", label: "Location", sortable: true, accessor: a => locationLabel(a),
      render: a => <span className="font-semibold">{locationLabel(a)}</span>,
    },
    { key: "doctor", label: "Doctor", sortable: true, accessor: a => a.doctors?.name ?? "", render: a => <span className="text-sm">{a.doctors?.name ?? "—"}</span> },
    { key: "diagnosis", label: "Diagnosis", render: a => <span className="text-sm">{a.diagnosis || "—"}</span> },
    {
      key: "priority", label: "Priority", sortable: true, accessor: a => a.priority,
      render: a => <Pill tone={priorityTone[a.priority]}>{priorityLabel(a.priority)}</Pill>,
    },
    {
      key: "status", label: "Status", sortable: true, accessor: a => a.status,
      render: a => <Pill tone={statusTone(a.status)}>{statusLabel(a.status)}</Pill>,
    },
    {
      key: "admitted_at", label: "Admitted", sortable: true, accessor: a => a.admitted_at,
      render: a => <span className="text-xs text-muted-foreground">{a.admitted_at.slice(0, 16).replace("T", " ")}</span>,
    },
  ];

  return (
    <AdminLayout title="Patient Admissions" subtitle="Admit patients into beds and cabins, transfer or discharge them">
      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi icon={BedDouble} label="Active Admissions" value={String(active.length)} tone="primary" />
        <Kpi icon={Activity} label="Critical" value={String(critical)} tone="destructive" />
        <Kpi icon={Stethoscope} label="In Surgery" value={String(byStatus("in_surgery"))} tone="accent" />
        <Kpi icon={UserPlus} label="Today's Admits" value={String(todaysAdmits)} tone="chip" />
      </div>

      {/* Occupancy by clinical status — the old strip grouped by ward name,
          which no longer lives on the admission row itself (see
          docs/ward-admission-api.md on why location moved to bed_stays).
          Grouping by status keeps the same at-a-glance purpose without a
          second join the frontend doesn't need for anything else. */}
      <Card className="p-5 mb-6">
        <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-3">ACTIVE BY STATUS</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EDITABLE_STATUSES.map(s => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)}
              className={`rounded-xl border px-3 py-2 text-left transition ${statusFilter === s.value ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"}`}>
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{s.label.toUpperCase()}</p>
              <p className="font-display text-xl text-primary">{byStatus(s.value)}</p>
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
            <Chips
              value={statusFilter}
              onChange={v => setStatusFilter(v)}
              options={[{ value: "all", label: "All" }, ...STATUSES.map(s => ({ value: s.value, label: s.label }))]}
            />
          }
        />
        {crud.error ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-destructive">Could not load admissions.</p>
            <button type="button" onClick={() => crud.refetch()} className="mt-3 px-4 py-2 rounded-full text-xs font-semibold border border-border hover:bg-muted">Try again</button>
          </div>
        ) : crud.isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
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
                extra={row.status !== "discharged" ? (
                  <>
                    <button onClick={() => openTransfer(row)} className="p-1.5 rounded-lg hover:bg-muted text-primary" title="Transfer">
                      <ArrowRightLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDischarge(row)} className="p-1.5 rounded-lg hover:bg-muted text-primary" title="Discharge">
                      <LogOut className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button onClick={() => setInvoice(row)} className="p-1.5 rounded-lg hover:bg-muted text-primary" title="Invoice">
                    <FileText className="h-4 w-4" />
                  </button>
                )}
              />
            )}
          />
        )}
      </Card>

      {/* Add / Edit modal */}
      <Modal
        open={add || !!edit}
        onClose={() => { setAdd(false); setEdit(null); }}
        title={edit ? "Edit admission" : "Admit patient"}
        size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => { setAdd(false); setEdit(null); }}>Cancel</Btn>
          <Btn onClick={save}>{edit ? "Save changes" : "Admit patient"}</Btn>
        </>}
      >
        <div className="grid sm:grid-cols-2 gap-x-5">
          <Field label="Patient" required>
            <Select value={draft.patient_id} onChange={e => setDraft(d => ({ ...d, patient_id: e.target.value }))}>
              {patientOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Attending doctor">
            <Select value={draft.doctor_id} onChange={e => setDraft(d => ({ ...d, doctor_id: e.target.value }))}>
              {doctorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Diagnosis"><Input value={draft.diagnosis} onChange={e => setDraft(d => ({ ...d, diagnosis: e.target.value }))} placeholder="Reason for admission" /></Field>
          <Field label="Priority">
            <Select value={draft.priority} onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}>
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </Field>
          {!edit ? (
            <>
              <Field label="Assign bed" hint="Leave both bed and cabin empty to admit without a location yet.">
                <Select value={draft.bed_id} onChange={e => setDraft(d => ({ ...d, bed_id: e.target.value, cabin_id: e.target.value ? "" : d.cabin_id }))}>
                  <option value="">— No bed —</option>
                  {availableBeds.map(b => <option key={b.id} value={b.id}>{b.wards?.name ?? "Ward"} · Bed {b.number}</option>)}
                </Select>
              </Field>
              <Field label="Assign cabin">
                <Select value={draft.cabin_id} onChange={e => setDraft(d => ({ ...d, cabin_id: e.target.value, bed_id: e.target.value ? "" : d.bed_id }))}>
                  <option value="">— No cabin —</option>
                  {availableCabins.map(c => <option key={c.id} value={c.id}>Cabin {c.number} ({c.category})</option>)}
                </Select>
              </Field>
            </>
          ) : (
            <Field label="Status">
              <Select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>
                {EDITABLE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Admitted at"><Input type="datetime-local" value={draft.admitted_at} onChange={e => setDraft(d => ({ ...d, admitted_at: e.target.value }))} /></Field>
        </div>
        <Field label="Clinical notes"><TextArea rows={3} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Allergies, vitals, special instructions…" /></Field>
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
        title={`Discharge ${discharge?.patients?.full_name ?? "this patient"}?`}
        description={`${locationLabel(discharge ?? ({ bed_stays: [] } as unknown as AdmissionRow))} will be released and marked for cleaning.`}
      />

      {/* Transfer modal */}
      <Modal
        open={!!transferring}
        onClose={() => setTransferring(null)}
        title={`Transfer ${transferring?.patients?.full_name ?? ""}`}
        footer={<>
          <Btn variant="outline" onClick={() => setTransferring(null)}>Cancel</Btn>
          <Btn onClick={confirmTransfer} disabled={!transferTarget.bed_id && !transferTarget.cabin_id}>Move patient</Btn>
        </>}
      >
        <p className="text-sm text-muted-foreground mb-4">Currently in <b className="text-foreground">{transferring ? locationLabel(transferring) : ""}</b>. Choose the new bed or cabin.</p>
        <Field label="Move to bed">
          <Select value={transferTarget.bed_id} onChange={e => setTransferTarget({ bed_id: e.target.value, cabin_id: e.target.value ? "" : transferTarget.cabin_id })}>
            <option value="">— No bed —</option>
            {availableBeds.map(b => <option key={b.id} value={b.id}>{b.wards?.name ?? "Ward"} · Bed {b.number}</option>)}
          </Select>
        </Field>
        <Field label="Move to cabin">
          <Select value={transferTarget.cabin_id} onChange={e => setTransferTarget({ cabin_id: e.target.value, bed_id: e.target.value ? "" : transferTarget.bed_id })}>
            <option value="">— No cabin —</option>
            {availableCabins.map(c => <option key={c.id} value={c.id}>Cabin {c.number} ({c.category})</option>)}
          </Select>
        </Field>
      </Modal>

      {/* Invoice modal */}
      <Modal
        open={!!invoice}
        onClose={() => setInvoice(null)}
        title="Discharge Invoice"
        size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setInvoice(null)}>Close</Btn>
          <Btn onClick={() => window.print()}><Printer className="h-4 w-4 mr-1.5" /> Print</Btn>
        </>}
      >
        {invoice && (() => {
          const a = invoice;
          const admitDate = new Date(a.admitted_at);
          const dischargeDate = a.discharged_at ? new Date(a.discharged_at) : new Date();
          const days = Math.max(1, Math.ceil((dischargeDate.getTime() - admitDate.getTime()) / 86400000));
          const lastStay = a.bed_stays[a.bed_stays.length - 1];
          const locationName = lastStay?.beds ? `Bed ${lastStay.beds.number}` : lastStay?.cabins ? `Cabin ${lastStay.cabins.number}` : "Unassigned";
          const bedRate = a.priority === "critical" ? 8000 : lastStay?.cabin_id ? 5000 : 2500;
          const lines = [
            { d: `Bed charges — ${locationName} (${days} day${days > 1 ? "s" : ""})`, q: days, r: bedRate },
            { d: `Doctor consultation — ${a.doctors?.name ?? "—"}`, q: days, r: 1200 },
            { d: "Nursing & care services", q: days, r: 800 },
            { d: "Diagnostics & lab", q: 1, r: 3500 },
            { d: "Medicines & supplies", q: 1, r: 2200 },
          ];
          const subtotal = lines.reduce((s, l) => s + l.q * l.r, 0);
          const vat = Math.round(subtotal * 0.05);
          const total = subtotal + vat;
          const age = ageFromDob(a.patients?.date_of_birth ?? null);
          return (
            <div className="text-sm">
              <div className="flex items-start justify-between mb-5 pb-4 border-b border-border/60">
                <div>
                  <p className="font-display text-2xl text-primary">HealthFlow Hospital</p>
                  <p className="text-xs text-muted-foreground">Tax Invoice · INV-{a.id.slice(0, 8).toUpperCase()}-{dischargeDate.getFullYear()}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Issued: {dischargeDate.toLocaleDateString()}</p>
                  <p>Status: <span className="font-semibold text-primary">DISCHARGED</span></p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1">BILL TO</p>
                  <p className="font-semibold text-primary">{a.patients?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{age !== null ? `${age}y · ` : ""}{a.patients?.gender ?? ""}{a.patients?.phone ? ` · ${a.patients.phone}` : ""}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1">STAY</p>
                  <p className="text-xs">Admitted: {admitDate.toLocaleString()}</p>
                  <p className="text-xs">Discharged: {dischargeDate.toLocaleString()}</p>
                  <p className="text-xs">Location: {locationName}</p>
                  <p className="text-xs">Diagnosis: {a.diagnosis || "—"}</p>
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
