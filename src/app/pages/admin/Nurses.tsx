'use client';
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type T = { id: string; name: string; ward: string; shift: string; license: string; phone: string; status: string };
const seed: T[] = [
  { id: "n1", name: "Nadia Sultana", ward: "ICU", shift: "Morning", license: "RN-9912", phone: "+1 555 0301", status: "Active" },
  { id: "n2", name: "Farhana Akter", ward: "Pediatrics", shift: "Night", license: "RN-9913", phone: "+1 555 0302", status: "Active" },
  { id: "n3", name: "Roman Hassan", ward: "ER", shift: "Evening", license: "RN-9914", phone: "+1 555 0303", status: "On Leave" },
];
const Page = () => (
  <AdminLayout title="Nurse Management" subtitle="Manage nurses, ward assignments & shifts">
    <ResourcePage<T> config={{
      storeKey: "nurses", seed, searchFields: ["name", "ward", "license"],
      statuses: ["Active", "On Leave"],
      columns: [
        { key: "name", label: "Name", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "ward", label: "Ward", sortable: true, accessor: r => r.ward },
        { key: "shift", label: "Shift" },
        { key: "license", label: "License" },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "name", label: "Full name", type: "text", required: true },
        { name: "ward", label: "Ward", type: "select", options: ["ICU", "Pediatrics", "ER", "Maternity", "General", "Oncology"] },
        { name: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "Night"] },
        { name: "license", label: "License #", type: "text" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "status", label: "Status", type: "select", options: ["Active", "On Leave"] },
      ],
    }} />
  </AdminLayout>
);
export default Page;
