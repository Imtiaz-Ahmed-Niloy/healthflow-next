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
import { useFormatters } from "@/lib/appSettings";
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
 * The clinical statuses — the strip above the table counts these. Discharged
 * is not one of them: it is the end of the stay, not a state within it.
 *
 * The edit form offers all four. Discharging isn't a plain status flip — it
 * also has to release the bed — so choosing Discharged there runs the same
 * dischargeAdmission() as the row's discharge button, never a bare update.
 * (It used to be left out of the form entirely, which meant editing a
 * discharged admission showed "Admitted" and saving it un-discharged them.)
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

/**
 * A datetime-local input shows and returns wall-clock time with no zone.
 * Filling it from toISOString() showed UTC — six hours behind in Dhaka, so a
 * discharge at 12:22 AM read as 06:22 PM the day before — and sending its
 * value back unconverted had the database read local time as UTC.
 */
const toLocalInput = (d: Date | string) => {
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/** An input's local wall-clock value, as the instant the database stores. */
const fromLocalInput = (value: string) => new Date(value).toISOString();

const now = () => toLocalInput(new Date());

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

/** The invoice the discharge raised — absent before discharge, and for roles that can't read invoices. */
const invoiceOf = (a: AdmissionRow) => a.finance_invoices?.[0] ?? null;

/** What the stay costs: the invoice once there is one, the running bill until then. */
const billTotal = (a: AdmissionRow) => {
  const invoice = invoiceOf(a);
  return invoice ? Number(invoice.amount) : Number(a.admission_bill?.total ?? 0);
};

type Draft = {
  patient_id: string;
  doctor_id: string;
  diagnosis: string;
  priority: string;
  notes: string;
  status: string;
  admitted_at: string;
  /** When they left. Shown, and required, only while the status is Discharged. */
  discharged_at: string;
  /** Admit-only — a fresh admission is placed in the same step it's created. */
  bed_id: string;
  cabin_id: string;
};

const emptyDraft: Draft = {
  patient_id: "", doctor_id: "", diagnosis: "", priority: "routine",
  notes: "", status: "admitted", admitted_at: now(), discharged_at: "", bed_id: "", cabin_id: "",
};

const Admissions = () => {
  const crud = useResourceCrud<AdmissionRow>("admissions");
  const { admit } = useAdmitPatient();
  const [transferBed] = useTransferBedMutation();
  const { push, notify } = useNotifications();
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();

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
  const [dischargeAt, setDischargeAt] = useState(now());
  const [discharging, setDischarging] = useState(false);
  const [transferring, setTransferring] = useState<AdmissionRow | null>(null);
  const [transferTarget, setTransferTarget] = useState({ bed_id: "", cabin_id: "" });
  // An id, not the row: the bill should follow the list as it refetches.
  const [billId, setBillId] = useState<string | null>(null);
  const billFor = billId ? crud.items.find(a => a.id === billId) ?? null : null;

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
  const todaysAdmits = crud.items.filter(a => toLocalInput(a.admitted_at).slice(0, 10) === now().slice(0, 10)).length;

  const openAdd = () => { setDraft({ ...emptyDraft, admitted_at: now() }); setAdd(true); };
  const openEdit = (a: AdmissionRow) => {
    setEdit(a);
    setDraft({
      patient_id: a.patient_id, doctor_id: a.doctor_id ?? "",
      diagnosis: a.diagnosis ?? "", priority: a.priority, notes: a.notes ?? "",
      status: a.status, admitted_at: toLocalInput(a.admitted_at),
      discharged_at: a.discharged_at ? toLocalInput(a.discharged_at) : "",
      bed_id: "", cabin_id: "",
    });
  };

  /** A discharge must come after the admission — the database refuses otherwise. Both are local input values. */
  const dischargeTooEarly = (admittedAt: string, dischargedAt: string) =>
    !!dischargedAt && !!admittedAt && dischargedAt < admittedAt.slice(0, 16);

  const save = async () => {
    if (!draft.patient_id) return;
    if (edit) {
      const toDischarged = draft.status === "discharged";
      if (toDischarged && !draft.discharged_at) {
        push({ title: "Discharge date needed", body: "Enter when the patient was discharged", tone: "warn" });
        return;
      }
      if (toDischarged && dischargeTooEarly(draft.admitted_at, draft.discharged_at)) {
        push({ title: "Check the dates", body: "The discharge can't be before the admission", tone: "warn" });
        return;
      }

      const fields = {
        patient_id: draft.patient_id,
        doctor_id: draft.doctor_id || null,
        diagnosis: draft.diagnosis || null,
        priority: draft.priority as AdmissionRow["priority"],
        notes: draft.notes || null,
        admitted_at: fromLocalInput(draft.admitted_at),
      };

      // Discharging from the form: same path as the discharge button, so the
      // bed is released first. The rest of the edit rides along with it.
      if (toDischarged && edit.status !== "discharged") {
        const ok = await dischargeAdmission(edit, fromLocalInput(draft.discharged_at), fields);
        if (ok) setEdit(null);
        return;
      }

      const ok = await crud.update(edit.id, {
        ...fields,
        status: draft.status as AdmissionRow["status"],
        // Only a discharged admission carries a discharge date.
        discharged_at: toDischarged ? fromLocalInput(draft.discharged_at) : null,
      });
      if (ok) setEdit(null);
    } else {
      const ok = await admit({
        patient_id: draft.patient_id,
        doctor_id: draft.doctor_id || undefined,
        diagnosis: draft.diagnosis || undefined,
        priority: draft.priority as AdmissionRow["priority"],
        notes: draft.notes || undefined,
        // The form asks for this, so it has to be sent — dropping it here
        // silently overrode a backdated admission with the row's now()
        // default, and the desk had no way to tell.
        admitted_at: draft.admitted_at ? fromLocalInput(draft.admitted_at) : undefined,
        // Name only for the notice-board line — see AdmitInput.patientName.
        patientName: patients.find(p => p.id === draft.patient_id)?.full_name,
        bed_id: draft.bed_id || undefined,
        cabin_id: draft.cabin_id || undefined,
      });
      if (ok) setAdd(false);
    }
  };

  /**
   * Two calls behind one confirmation, and the order is not a matter of taste:
   * release the bed FIRST, then flip the status.
   *
   * transfer_admission() refuses an admission that already has a
   * discharged_at (HF003 → 422, see docs/ward-admission-api.md), so setting
   * the status first makes the release fail every single time — the patient
   * reads as discharged while the bed stays occupied with an open bed_stays
   * row, which is the exact bug this ticket exists to close.
   *
   * If the release fails, the status is deliberately left alone: an admitted
   * patient still holding a bed is consistent, and the desk can retry. The
   * half-state to avoid is the other one.
   */
  const dischargeAdmission = async (
    a: AdmissionRow,
    dischargedAt: string,
    extra: Partial<AdmissionRow> = {},
  ) => {
    // Only an admission still holding a bed or cabin has one to release; an
    // unassigned one would make transfer_admission refuse an empty move.
    if (currentStay(a)) {
      try {
        await transferBed({ admission_id: a.id, bed_id: null, cabin_id: null }).unwrap();
      } catch {
        push({ title: "Could not release the bed", body: "Nothing was changed — try again, or release it from the Wards floor map", tone: "bad" });
        return false;
      }
    }
    const ok = await crud.update(a.id, { ...extra, status: "discharged", discharged_at: dischargedAt });
    if (ok) {
      // The invoice is raised by the database as the status lands (0080).
      push({
        title: "Discharged",
        body: `${a.patients?.full_name ?? "Patient"} discharged${billTotal(a) > 0 ? " — invoice raised" : ""}`,
        tone: "ok",
      });
      // A freed bed is the thing the next shift needs to know about.
      void notify({
        kind: "patient.discharged",
        title: `${a.patients?.full_name ?? "A patient"} discharged`,
        body: locationLabel(a) === "Unassigned" ? undefined : `${locationLabel(a)} is now free`,
        tone: "ok",
        entity_type: "admissions",
        entity_id: a.id,
      });
    } else {
      push({ title: "Bed released, but the discharge did not save", body: "Set the status to Discharged from the row's edit form", tone: "warn" });
    }
    return ok;
  };

  const openDischarge = (a: AdmissionRow) => { setDischarge(a); setDischargeAt(now()); };

  const confirmDischarge = async () => {
    if (!discharge) return;
    if (!dischargeAt) {
      push({ title: "Discharge date needed", body: "Enter when the patient was discharged", tone: "warn" });
      return;
    }
    if (dischargeTooEarly(toLocalInput(discharge.admitted_at), dischargeAt)) {
      push({ title: "Check the date", body: "The discharge can't be before the admission", tone: "warn" });
      return;
    }
    setDischarging(true);
    await dischargeAdmission(discharge, fromLocalInput(dischargeAt));
    setDischarging(false);
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
      void notify({
        kind: "patient.transferred",
        title: `${transferring.patients?.full_name ?? "A patient"} moved to a new bed`,
        body: `From ${locationLabel(transferring)}`,
        tone: "info",
        entity_type: "admissions",
        entity_id: transferring.id,
      });
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
      render: a => <span className="text-xs text-muted-foreground">{formatDateTime(a.admitted_at)}</span>,
    },
    {
      key: "bill", label: "Bill", sortable: true, accessor: billTotal,
      render: a => {
        const invoice = invoiceOf(a);
        const note = invoice
          ? invoice.paid_at ? "Paid" : "Invoiced"
          : a.status === "discharged" ? "Final" : "So far";
        return (
          <button type="button" onClick={e => { e.stopPropagation(); setBillId(a.id); }} className="text-left">
            <p className="font-semibold text-primary">{formatCurrency(billTotal(a))}</p>
            <p className="text-[11px] text-muted-foreground">{note}</p>
          </button>
        );
      },
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
                extra={
                  <>
                    <button onClick={() => setBillId(row.id)} className="p-1.5 rounded-lg hover:bg-muted text-primary" title={invoiceOf(row) ? "Invoice" : "Bill"}>
                      <FileText className="h-4 w-4" />
                    </button>
                    {row.status !== "discharged" && (
                      <>
                        <button onClick={() => openTransfer(row)} className="p-1.5 rounded-lg hover:bg-muted text-primary" title="Transfer">
                          <ArrowRightLeft className="h-4 w-4" />
                        </button>
                        <button onClick={() => openDischarge(row)} className="p-1.5 rounded-lg hover:bg-muted text-primary" title="Discharge">
                          <LogOut className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </>
                }
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
            <Field
              label="Status"
              hint={edit.status !== "discharged" && draft.status === "discharged"
                ? `Saving releases ${locationLabel(edit) === "Unassigned" ? "the patient" : locationLabel(edit)} and marks it for cleaning.`
                : undefined}
            >
              <Select
                value={draft.status}
                onChange={e => setDraft(d => ({
                  ...d,
                  status: e.target.value,
                  // Choosing Discharged starts the date at now; leaving it clears it.
                  discharged_at: e.target.value === "discharged" ? (d.discharged_at || now()) : "",
                }))}
              >
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Admitted at"><Input type="datetime-local" value={draft.admitted_at} onChange={e => setDraft(d => ({ ...d, admitted_at: e.target.value }))} /></Field>
          {edit && draft.status === "discharged" && (
            <Field label="Discharged at" required>
              <Input
                type="datetime-local"
                value={draft.discharged_at}
                min={draft.admitted_at}
                onChange={e => setDraft(d => ({ ...d, discharged_at: e.target.value }))}
              />
            </Field>
          )}
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

      <Modal
        open={!!discharge}
        onClose={() => !discharging && setDischarge(null)}
        title={`Discharge ${discharge?.patients?.full_name ?? "this patient"}?`}
        size="sm"
        footer={<>
          <Btn variant="outline" onClick={() => setDischarge(null)} disabled={discharging}>Cancel</Btn>
          <Btn onClick={confirmDischarge} disabled={discharging || !dischargeAt}>
            {discharging ? "Discharging…" : "Confirm"}
          </Btn>
        </>}
      >
        {discharge && (
          <>
            <Field label="Discharge date & time" required>
              <Input
                type="datetime-local"
                value={dischargeAt}
                min={toLocalInput(discharge.admitted_at)}
                onChange={e => setDischargeAt(e.target.value)}
              />
            </Field>
            <p className="text-sm text-muted-foreground">
              {locationLabel(discharge) === "Unassigned"
                ? "The patient has no bed or cabin to release."
                : `${locationLabel(discharge)} will be released and marked for cleaning.`}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {billTotal(discharge) > 0
                ? <>An invoice for about <b className="text-foreground">{formatCurrency(billTotal(discharge))}</b> will be raised and shown on the patient&apos;s Billing page.</>
                : "There are no bed or cabin charges, so no invoice will be raised."}
            </p>
          </>
        )}
      </Modal>

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

      {/* Bill / invoice modal. Every figure comes from the database: the
          running bill from admission_bill(), or — once discharged — the
          invoice it raised, whose lines were frozen at that moment (0080).
          This used to be a mock with made-up rates and a 5% VAT line. */}
      <Modal
        open={!!billFor}
        onClose={() => setBillId(null)}
        title={!billFor ? "" : invoiceOf(billFor)
          ? `Invoice ${invoiceOf(billFor)!.reference}`
          : billFor.status === "discharged" ? "Bill" : "Bill so far"}
        size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setBillId(null)}>Close</Btn>
          <Btn onClick={() => window.print()}><Printer className="h-4 w-4 mr-1.5" /> Print</Btn>
        </>}
      >
        {billFor && (() => {
          const a = billFor;
          const inv = invoiceOf(a);
          const lines = inv?.line_items ?? a.admission_bill?.lines ?? [];
          const total = billTotal(a);
          const age = ageFromDob(a.patients?.date_of_birth ?? null);
          const lastStay = a.bed_stays[a.bed_stays.length - 1];
          const location = currentStay(a)
            ? locationLabel(a)
            : lastStay?.beds ? `Bed ${lastStay.beds.number}` : lastStay?.cabins ? `Cabin ${lastStay.cabins.number}` : "Unassigned";
          const overdue = !!inv && !inv.paid_at && new Date(`${inv.due_date}T23:59:59`) < new Date();
          return (
            <div className="text-sm">
              <div className="grid sm:grid-cols-2 gap-4 mb-5 pb-4 border-b border-border/60">
                <div>
                  <p className="font-semibold text-primary text-base">{a.patients?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.patients?.mrn ? `${a.patients.mrn} · ` : ""}{age !== null ? `${age}y · ` : ""}{a.patients?.gender ?? ""}{a.patients?.phone ? ` · ${a.patients.phone}` : ""}
                  </p>
                  {a.diagnosis && <p className="text-xs text-muted-foreground mt-1">Diagnosis: {a.diagnosis}</p>}
                </div>
                <div className="text-xs space-y-0.5 sm:text-right">
                  <p>Admitted {formatDateTime(a.admitted_at)}</p>
                  <p>{a.discharged_at ? `Discharged ${formatDateTime(a.discharged_at)}` : "Still admitted"}</p>
                  <p className="text-muted-foreground">{location}{a.doctors?.name ? ` · ${a.doctors.name}` : ""}</p>
                </div>
              </div>

              {lines.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Nothing charged yet. Bed and cabin days are billed once the patient has one.
                </p>
              ) : (
                <div className="rounded-xl border border-border/60 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2">Description</th>
                        <th className="text-right px-3 py-2 w-16">Days</th>
                        <th className="text-right px-3 py-2 w-28">Rate</th>
                        <th className="text-right px-3 py-2 w-28">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => (
                        <tr key={i} className="border-t border-border/60">
                          <td className="px-3 py-2">{l.description}</td>
                          <td className="px-3 py-2 text-right">{l.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(Number(l.rate))}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(l.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between items-end gap-4 mt-4">
                <p className="text-xs text-muted-foreground max-w-sm">
                  {inv
                    ? inv.paid_at
                      ? `Paid on ${formatDateTime(inv.paid_at)}.`
                      : `${overdue ? "Overdue" : "Unpaid"} · due ${formatDate(`${inv.due_date}T00:00:00`)}. It's on the patient's Billing page; mark it paid from Finance.`
                    : a.status === "discharged"
                      ? "No invoice on record for this stay."
                      : "Charges keep running until discharge. Discharging raises the invoice."}
                </p>
                <div className="flex items-baseline gap-3 font-display text-lg text-primary">
                  <span>{inv || a.status === "discharged" ? "Total" : "So far"}</span>
                  <span>{formatCurrency(total)}</span>
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
