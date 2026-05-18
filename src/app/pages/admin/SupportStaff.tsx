'use client';
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type T = { id: string; name: string; department: string; role: string; phone: string; status: string };
const seed: T[] = [
  { id: "s1", name: "Karim Uddin", department: "Janitorial", role: "Cleaner", phone: "+1 555 0401", status: "Active" },
  { id: "s2", name: "Bilal Hossain", department: "Security", role: "Guard", phone: "+1 555 0402", status: "Active" },
  { id: "s3", name: "Omar Faruq", department: "Maintenance", role: "Technician", phone: "+1 555 0403", status: "Active" },
];
const Page = () => (
  <AdminLayout title="Support Staff Management" subtitle="Manage non-clinical support personnel">
    <ResourcePage<T> config={{
      storeKey: "support-staff", seed, searchFields: ["name", "department", "role"],
      statuses: ["Active", "On Leave", "Suspended"],
      columns: [
        { key: "name", label: "Name", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "department", label: "Department", sortable: true, accessor: r => r.department },
        { key: "role", label: "Role" },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "name", label: "Full name", type: "text", required: true },
        { name: "department", label: "Department", type: "select", options: ["Janitorial", "Security", "Maintenance", "Kitchen", "Transport"] },
        { name: "role", label: "Role", type: "text" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "status", label: "Status", type: "select", options: ["Active", "On Leave", "Suspended"] },
      ],
    }} />
  </AdminLayout>
);
export default Page;
