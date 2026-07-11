"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type T = { id: string; name: string; assignedDoctor: string; shift: string; phone: string; status: string };
const seed: T[] = [
  { id: "a1", name: "Mahin Rahman", assignedDoctor: "Dr. Imran Khan", shift: "Morning", phone: "+1 555 0201", status: "Active" },
  { id: "a2", name: "Lila Karim", assignedDoctor: "Dr. Sara Ahmed", shift: "Evening", phone: "+1 555 0202", status: "Active" },
  { id: "a3", name: "Rifat Ali", assignedDoctor: "Dr. Tanvir Hossain", shift: "Night", phone: "+1 555 0203", status: "On Leave" },
];

const Page = () => (
  <AdminLayout title="Doctor Assistant Management" subtitle="Assign, schedule and manage doctor assistants">
    <ResourcePage<T> config={{
      storeKey: "doctor-assistants", seed, searchFields: ["name", "assignedDoctor"],
      statuses: ["Active", "On Leave"],
      columns: [
        { key: "name", label: "Name", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "assignedDoctor", label: "Assigned Doctor", sortable: true, accessor: r => r.assignedDoctor },
        { key: "shift", label: "Shift" },
        { key: "phone", label: "Phone", accessor: r => r.phone },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "name", label: "Full name", type: "text", required: true },
        { name: "assignedDoctor", label: "Assigned doctor", type: "text" },
        { name: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "Night"] },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "status", label: "Status", type: "select", options: ["Active", "On Leave"] },
      ],
    }} />
  </AdminLayout>
);
export default Page;

