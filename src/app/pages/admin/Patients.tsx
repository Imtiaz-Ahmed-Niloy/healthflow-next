'use client';
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type P = { id: string; name: string; mrn: string; phone: string; ward: string; doctor: string; admittedAt: string; status: string };
const seed: P[] = [
  { id: "p1", name: "Aisha Begum", mrn: "MRN-10234", phone: "+1 555 7001", ward: "Ward 3B", doctor: "Dr. Imran", admittedAt: "2026-05-04", status: "Admitted" },
  { id: "p2", name: "John Doe", mrn: "MRN-10235", phone: "+1 555 7002", ward: "ICU", doctor: "Dr. Sara", admittedAt: "2026-05-05", status: "Admitted" },
  { id: "p3", name: "Maria Karim", mrn: "MRN-10236", phone: "+1 555 7003", ward: "—", doctor: "Dr. Ayesha", admittedAt: "2026-05-01", status: "Discharged" },
];
const Patients = () => (
  <AdminLayout title="Patient Management" subtitle="Hospital-wide patient registry">
    <ResourcePage<P> config={{
      storeKey: "patients-admin", seed, searchFields: ["name", "mrn", "phone"],
      statuses: ["Admitted", "Discharged", "Outpatient"],
      columns: [
        { key: "mrn", label: "MRN", accessor: r => r.mrn, render: r => <span className="font-mono text-xs text-primary font-semibold">{r.mrn}</span> },
        { key: "name", label: "Name", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "phone", label: "Phone" },
        { key: "ward", label: "Ward" },
        { key: "doctor", label: "Doctor" },
        { key: "admittedAt", label: "Admitted", accessor: r => r.admittedAt },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "name", label: "Patient name", type: "text", required: true },
        { name: "mrn", label: "MRN", type: "text", required: true },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "ward", label: "Ward", type: "select", options: ["ICU", "Ward 3B", "Maternity", "Pediatrics", "—"] },
        { name: "doctor", label: "Doctor", type: "text" },
        { name: "admittedAt", label: "Admit date", type: "date" },
        { name: "status", label: "Status", type: "select", options: ["Admitted", "Discharged", "Outpatient"] },
      ],
    }} />
  </AdminLayout>
);
export default Patients;
