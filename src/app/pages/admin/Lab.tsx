'use client';
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle } from "@/components/admin/ui";
import { useCrud, DataTable, Toolbar, Modal, Field, Input, Select, Chips, statusTone, RowActions, ConfirmDialog, exportCSV, type Column } from "@/components/admin/crud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { ResourcePage } from "@/components/admin/ResourcePage";

type LabItem = { id: string; name: string; category: string; price: string; turnaround: string; sample: string; prep: string; description: string; hospital: string; status: string };
const catalogSeed: LabItem[] = [
  { id: "lt1", name: "Complete Blood Count", category: "Hematology", price: "25", turnaround: "4 hours", sample: "Blood", prep: "No fasting required", description: "Comprehensive blood cell analysis.", hospital: "All Hospitals", status: "Active" },
  { id: "lt2", name: "Lipid Panel", category: "Biochemistry", price: "40", turnaround: "6 hours", sample: "Blood", prep: "12-hour fasting required", description: "Cholesterol and triglyceride profile.", hospital: "All Hospitals", status: "Active" },
  { id: "lt3", name: "Thyroid Profile (TSH, T3, T4)", category: "Endocrinology", price: "55", turnaround: "8 hours", sample: "Blood", prep: "Morning collection preferred", description: "Thyroid hormone evaluation.", hospital: "All Hospitals", status: "Active" },
  { id: "lt4", name: "MRI Brain", category: "Imaging", price: "320", turnaround: "24 hours", sample: "N/A", prep: "Remove all metal items", description: "High-resolution brain imaging.", hospital: "All Hospitals", status: "Active" },
];

type Test = { id: string; patient: string; test: string; doctor: string; requestedAt: string; status: string; result: string };
const seed: Test[] = [
  { id: "L-1001", patient: "Aisha B.", test: "Complete Blood Count", doctor: "Dr. Imran", requestedAt: "2026-05-06 09:12", status: "Pending", result: "" },
  { id: "L-1002", patient: "John D.", test: "Lipid Panel", doctor: "Dr. Sara", requestedAt: "2026-05-06 08:45", status: "Sample Collected", result: "" },
  { id: "L-1003", patient: "Robert L.", test: "MRI Brain", doctor: "Dr. Tanvir", requestedAt: "2026-05-05 15:22", status: "Processing", result: "" },
  { id: "L-1004", patient: "Maria K.", test: "Thyroid Profile", doctor: "Dr. Ayesha", requestedAt: "2026-05-05 11:10", status: "Reported", result: "Normal" },
];
const flow = ["Pending", "Sample Collected", "Processing", "Reported"];

const Lab = () => {
  const crud = useCrud<Test>("lab-tests", seed);
  const { push } = useNotifications();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [add, setAdd] = useState(false);
  const [result, setResult] = useState<Test | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [bulk, setBulk] = useState(false);

  const rows = crud.items.filter(i =>
    (status === "all" || i.status === status) &&
    (!q || (i.patient + i.test + i.id).toLowerCase().includes(q.toLowerCase()))
  );
  const advance = (t: Test) => {
    const idx = flow.indexOf(t.status);
    if (idx < flow.length - 1) {
      const next = flow[idx + 1];
      crud.update(t.id, { status: next });
      push({ title: `${t.id} → ${next}`, tone: "info" });
    } else setResult(t);
  };

  const cols: Column<Test>[] = [
    { key: "id", label: "Request", sortable: true, accessor: r => r.id, render: r => <span className="font-mono text-xs font-semibold text-primary">{r.id}</span> },
    { key: "patient", label: "Patient", sortable: true, accessor: r => r.patient },
    { key: "test", label: "Test", accessor: r => r.test },
    { key: "doctor", label: "Doctor" },
    { key: "requestedAt", label: "Requested", accessor: r => r.requestedAt },
    { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
  ];

  return (
    <AdminLayout title="Laboratory Management" subtitle="Test request lifecycle Pending → Reported">
      <Card className="p-5">
        <Toolbar
          search={q} onSearch={setQ}
          onAdd={() => setAdd(true)} addLabel="Test Request"
          onExport={() => exportCSV(rows as never, "lab-tests.csv")}
          bulkCount={sel.length} onBulkDelete={() => setBulk(true)}
          filters={<Chips value={status as never} onChange={setStatus as never}
            options={[{ value: "all", label: "All" }, ...flow.map(s => ({ value: s, label: s }))]} />}
        />
        <DataTable<Test> rows={rows} columns={cols} selected={sel} onSelect={setSel}
          actions={r => <RowActions
            onEdit={() => advance(r)}
            onDelete={() => setDel(r.id)}
            extra={<Btn variant="ghost" onClick={() => advance(r)}>{r.status === "Reported" ? "Update Result" : "Advance →"}</Btn>}
          />}
        />
      </Card>

      <Modal open={add} onClose={() => setAdd(false)} title="New test request"
        footer={<><Btn variant="outline" onClick={() => setAdd(false)}>Cancel</Btn>
          <button form="lab-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Submit</button></>}>
        <form id="lab-form" onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          crud.create({
            id: `L-${1000 + crud.items.length + 1}`,
            patient: String(fd.get("patient")), test: String(fd.get("test")), doctor: String(fd.get("doctor")),
            requestedAt: new Date().toISOString().slice(0, 16).replace("T", " "), status: "Pending", result: "",
          } as never);
          push({ title: `New lab request: ${fd.get("test")}`, tone: "info" });
          setAdd(false);
        }}>
          <Field label="Patient"><Input name="patient" required /></Field>
          <Field label="Test"><Select name="test"><option>Complete Blood Count</option><option>Lipid Panel</option><option>Thyroid Profile</option><option>MRI Brain</option><option>X-Ray Chest</option></Select></Field>
          <Field label="Requesting Doctor"><Input name="doctor" required /></Field>
        </form>
      </Modal>

      <Modal open={!!result} onClose={() => setResult(null)} title={`Result for ${result?.id}`}
        footer={<><Btn variant="outline" onClick={() => setResult(null)}>Cancel</Btn>
          <button form="result-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Save</button></>}>
        <form id="result-form" onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          if (result) crud.update(result.id, { result: String(fd.get("result")) });
          push({ title: `Result published for ${result?.id}`, tone: "ok" });
          setResult(null);
        }}>
          <Field label="Result text"><textarea name="result" rows={4} defaultValue={result?.result} className="w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" /></Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={() => del && crud.remove(del)} />
      <ConfirmDialog open={bulk} onClose={() => setBulk(false)} onConfirm={() => { crud.bulkRemove(sel); setSel([]); }} title={`Delete ${sel.length} requests?`} />

      <div className="mt-8">
        <SectionTitle title="Lab Tests & Pricing Catalog" />
        <ResourcePage<LabItem> config={{
          storeKey: "lab-catalog", seed: catalogSeed, searchFields: ["name", "category", "sample", "hospital"],
          statuses: ["Active", "Inactive"],
          exportName: "lab-catalog",
          columns: [
            { key: "name", label: "Test", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
            { key: "category", label: "Category", sortable: true, accessor: r => r.category },
            { key: "price", label: "Price ($)", sortable: true, accessor: r => Number(r.price) },
            { key: "turnaround", label: "Turnaround" },
            { key: "sample", label: "Sample" },
            { key: "hospital", label: "Hospital", accessor: r => r.hospital || "All Hospitals" },
            { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
          ],
          fields: [
            { name: "name", label: "Test name", type: "text", required: true },
            { name: "category", label: "Category", type: "select", options: ["Hematology", "Biochemistry", "Endocrinology", "Imaging", "Microbiology", "Pathology", "Cardiology", "Nutrition", "Immunology", "Other"] },
            { name: "price", label: "Price (USD)", type: "number", required: true },
            { name: "turnaround", label: "Turnaround time", type: "text" },
            { name: "sample", label: "Sample type", type: "text" },
            { name: "prep", label: "Patient preparation", type: "text" },
            { name: "hospital", label: "Hospital (use \"All Hospitals\" to show on every hospital page)", type: "text" },
            { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
            { name: "description", label: "Description", type: "textarea" },
          ],
        }} />
      </div>
    </AdminLayout>
  );
};
export default Lab;
