"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle } from "@/components/admin/ui";
import { DataTable, Toolbar, Modal, Field, Input, Select, Chips, statusTone, RowActions, ConfirmDialog, exportCSV, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { ResourcePage } from "@/components/admin/ResourcePage";
import type { LabTestRow } from "@/redux/api/resources";
import type { Tables } from "@/lib/supabase/types";

/**
 * Catalogue categories offered by the form. Free text in the database (see
 * 0032_lab_tests.sql) — a lab that names a section differently can still store
 * it; this list is only the common set, so nobody types "Hematology" twice.
 */
const LAB_CATEGORIES = [
  "Hematology", "Biochemistry", "Endocrinology", "Imaging",
  "Microbiology", "Pathology", "Cardiology", "Nutrition", "Immunology", "Other",
];

/** Stored lowercase to match doctors, nurses and support staff. */
const CATALOG_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const catalogStatusLabel = (value: string) =>
  CATALOG_STATUSES.find(s => s.value === value)?.label ?? value;

/**
 * An order, with the patient and doctor names the resource embeds (0047).
 * Column names are the database's, so form values post straight through.
 */
type LabOrder = Tables<"lab_orders"> & {
  patients?: { full_name: string } | null;
  doctors?: { name: string } | null;
};

type PatientOption = { id: string; full_name: string };
type DoctorOption = { id: string; name: string };

/**
 * Statuses are stored lowercase across every module, so this map is the only
 * place they get capitalised — the pill, the chips and the toast.
 */
const ORDER_FLOW = ["pending", "sample_collected", "processing", "reported"] as const;
type OrderStatus = (typeof ORDER_FLOW)[number];

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  sample_collected: "Sample Collected",
  processing: "Processing",
  reported: "Reported",
};
const orderStatusLabel = (value: string) => ORDER_STATUS_LABELS[value] ?? value;

const stamp = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

/** "L-1042", numbered within the hospital. The unique index catches a genuine clash. */
const suggestReference = (orders: LabOrder[]) => {
  const used = orders
    .map(o => Number(o.reference.trim().toUpperCase().replace(/^L-/, "")))
    .filter(Number.isFinite);
  return `L-${used.length ? Math.max(...used) + 1 : 1001}`;
};

const Lab = () => {
  const crud = useResourceCrud<LabOrder>("lab-orders");
  // Ordering needs three real lists: who it is for, what was ordered, and who
  // asked for it.
  const patients = useResourceCrud<PatientOption>("patients");
  const catalogue = useResourceCrud<LabTestRow>("lab-tests");
  const doctors = useResourceCrud<DoctorOption>("doctors");

  const { push } = useNotifications();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [add, setAdd] = useState(false);
  const [result, setResult] = useState<LabOrder | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [bulk, setBulk] = useState(false);

  const orders = crud.items;

  const rows = orders.filter(o => {
    if (status !== "all" && o.status !== status) return false;
    if (!q) return true;
    const term = q.toLowerCase();
    return [o.reference, o.test_name, o.patients?.full_name, o.doctors?.name]
      .some(v => (v ?? "").toLowerCase().includes(term));
  });

  const activeTests = useMemo(
    () => catalogue.items.filter(t => t.status === "active"),
    [catalogue.items],
  );

  /**
   * Walk the order along. The last step is not an advance but a result, so it
   * opens the result form instead — an order becomes "reported" by having a
   * result, not by a button press.
   */
  const advance = async (order: LabOrder) => {
    const i = ORDER_FLOW.indexOf(order.status as OrderStatus);
    if (i < 0 || i >= ORDER_FLOW.length - 2) { setResult(order); return; }
    const next = ORDER_FLOW[i + 1];
    await crud.update(order.id, { status: next } as never);
    push({ title: `${order.reference} → ${orderStatusLabel(next)}`, tone: "info" });
  };

  const cols: Column<LabOrder>[] = [
    { key: "reference", label: "Request", sortable: true, accessor: r => r.reference,
      render: r => <span className="font-mono text-xs font-semibold text-primary">{r.reference}</span> },
    { key: "patient", label: "Patient", sortable: true, accessor: r => r.patients?.full_name ?? "",
      render: r => <span>{r.patients?.full_name ?? "—"}</span> },
    { key: "test_name", label: "Test", accessor: r => r.test_name },
    { key: "doctor", label: "Doctor", accessor: r => r.doctors?.name ?? "",
      render: r => <span>{r.doctors?.name ?? <span className="text-muted-foreground">Walk-in</span>}</span> },
    { key: "requested_at", label: "Requested", sortable: true, accessor: r => r.requested_at,
      render: r => stamp(r.requested_at) },
    { key: "status", label: "Status",
      render: r => <Pill tone={statusTone(r.status)}>{orderStatusLabel(r.status)}</Pill> },
  ];

  return (
    <AdminLayout title="Laboratory Management" subtitle="Test request lifecycle Pending → Reported">
      <Card className="p-5">
        <Toolbar
          search={q} onSearch={setQ}
          onAdd={() => setAdd(true)} addLabel="Test Request"
          onExport={() => exportCSV(rows as never, "lab-orders.csv")}
          bulkCount={sel.length} onBulkDelete={() => setBulk(true)}
          filters={<Chips value={status as never} onChange={setStatus as never}
            options={[{ value: "all", label: "All" }, ...ORDER_FLOW.map(s => ({ value: s, label: orderStatusLabel(s) }))]} />}
        />

        {crud.error ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-destructive">Could not load lab requests.</p>
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
        ) : (
          <DataTable<LabOrder>
            rows={rows}
            columns={cols}
            selected={sel}
            onSelect={setSel}
            empty="No lab requests yet. Create one to get started."
            actions={r => <RowActions
              onDelete={() => setDel(r.id)}
              extra={<Btn variant="ghost" onClick={() => void advance(r)}>
                {r.status === "reported" ? "Update Result" : r.status === "processing" ? "Enter Result" : "Advance →"}
              </Btn>}
            />}
          />
        )}
      </Card>

      <Modal open={add} onClose={() => setAdd(false)} title="New test request"
        footer={<><Btn variant="outline" onClick={() => setAdd(false)}>Cancel</Btn>
          <button form="lab-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Submit</button></>}>
        <form id="lab-form" onSubmit={async e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const testId = String(fd.get("lab_test_id") || "");
          const test = activeTests.find(t => t.id === testId);
          if (!test) { push({ title: "Pick a test first", tone: "warn" }); return; }

          const created = await crud.create({
            reference: String(fd.get("reference") || "").trim(),
            patient_id: String(fd.get("patient_id")),
            lab_test_id: test.id,
            // Snapshot the name as displayed, so the order still reads correctly
            // if the catalogue entry is renamed or retired later.
            test_name: test.name,
            doctor_id: String(fd.get("doctor_id") || "") || null,
          } as never);
          if (!created) return; // useResourceCrud has surfaced the error
          push({ title: `New lab request: ${test.name}`, tone: "info" });
          setAdd(false);
        }}>
          <Field label="Reference" required>
            <Input name="reference" required defaultValue={suggestReference(orders)} />
          </Field>
          <Field label="Patient" required>
            <Select name="patient_id" required>
              <option value="">Select a patient…</option>
              {patients.items.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </Select>
          </Field>
          <Field label="Test" required>
            <Select name="lab_test_id" required>
              <option value="">Select a test…</option>
              {activeTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Requesting doctor">
            <Select name="doctor_id">
              <option value="">Walk-in — no requesting doctor</option>
              {doctors.items.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          {activeTests.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              The catalogue below is empty. Add a test to it before requesting one.
            </p>
          )}
        </form>
      </Modal>

      <Modal open={!!result} onClose={() => setResult(null)} title={`Result for ${result?.reference ?? ""}`}
        footer={<><Btn variant="outline" onClick={() => setResult(null)}>Cancel</Btn>
          <button form="result-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Save</button></>}>
        <form id="result-form" onSubmit={async e => {
          e.preventDefault();
          if (!result) return;
          const fd = new FormData(e.currentTarget);
          const text = String(fd.get("result") || "").trim();
          if (!text) { push({ title: "Enter the result first", tone: "warn" }); return; }
          // Result, timestamp and status move together — the table has a check
          // constraint tying the first two, and a reported order without a
          // result would be a lie.
          await crud.update(result.id, {
            result: text,
            reported_at: new Date().toISOString(),
            status: "reported",
          } as never);
          push({ title: `Result published for ${result.reference}`, tone: "ok" });
          setResult(null);
        }}>
          <Field label="Result">
            <textarea name="result" rows={4} defaultValue={result?.result ?? ""}
              className="w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)}
        onConfirm={() => { if (del) void crud.remove(del); }}
        title="Delete lab request"
        description="This permanently removes the request and its result." />
      <ConfirmDialog open={bulk} onClose={() => setBulk(false)}
        onConfirm={() => { void crud.bulkRemove(sel); setSel([]); }}
        title={`Delete ${sel.length} requests?`} />

      <div className="mt-8">
        <SectionTitle title="Lab Tests & Pricing Catalog" />
        <ResourcePage<LabTestRow> config={{
          storeKey: "lab-catalog",
          resource: "lab-tests",
          searchFields: ["name", "category", "sample"],
          statuses: CATALOG_STATUSES,
          exportName: "lab-catalog",
          columns: [
            { key: "name", label: "Test", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
            { key: "category", label: "Category", sortable: true, accessor: r => r.category ?? "", render: r => <span>{r.category || "—"}</span> },
            // numeric(10,2) arrives as a string from PostgREST, so sorting has
            // to coerce or "9" sorts after "320".
            { key: "price", label: "Price (৳)", sortable: true, accessor: r => Number(r.price) },
            { key: "turnaround", label: "Turnaround", render: r => <span>{r.turnaround || "—"}</span> },
            { key: "sample", label: "Sample", render: r => <span>{r.sample || "—"}</span> },
            { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{catalogStatusLabel(r.status)}</Pill> },
          ],
          fields: [
            { name: "name", label: "Test name", type: "text", required: true },
            { name: "category", label: "Category", type: "select", options: LAB_CATEGORIES },
            { name: "price", label: "Price (৳)", type: "number", required: true, min: 0, numberStep: 0.01 },
            { name: "turnaround", label: "Turnaround time", type: "text" },
            { name: "sample", label: "Sample type", type: "text" },
            { name: "prep", label: "Patient preparation", type: "text" },
            { name: "status", label: "Status", type: "select", options: CATALOG_STATUSES },
            { name: "description", label: "Description", type: "textarea" },
          ],
        }} />
      </div>
    </AdminLayout>
  );
};
export default Lab;
