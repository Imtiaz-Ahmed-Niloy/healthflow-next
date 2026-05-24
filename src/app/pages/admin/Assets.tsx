'use client';
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type A = { id: string; tag: string; name: string; category: string; location: string; assignee: string; purchasedAt: string; status: string };
const seed: A[] = [
  { id: "as1", tag: "AST-0001", name: "GE MRI Scanner", category: "Imaging", location: "Radiology", assignee: "—", purchasedAt: "2023-04-12", status: "Active" },
  { id: "as2", tag: "AST-0002", name: "Defibrillator", category: "Critical Care", location: "ICU", assignee: "ICU Team", purchasedAt: "2024-09-01", status: "Active" },
  { id: "as3", tag: "AST-0003", name: "Patient Monitor", category: "Monitoring", location: "Ward 3B", assignee: "—", purchasedAt: "2025-01-22", status: "Maintenance" },
];
const Page = () => (
  <AdminLayout title="Asset Management" subtitle="Equipment, devices and maintenance">
    <ResourcePage<A> config={{
      storeKey: "assets", seed, searchFields: ["tag", "name", "location"],
      statuses: ["Active", "Maintenance", "Retired"],
      columns: [
        { key: "tag", label: "Tag", accessor: r => r.tag, render: r => <span className="font-mono text-xs">{r.tag}</span> },
        { key: "name", label: "Asset", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "category", label: "Category" },
        { key: "location", label: "Location" },
        { key: "assignee", label: "Assignee" },
        { key: "purchasedAt", label: "Purchased", sortable: true, accessor: r => r.purchasedAt },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "tag", label: "Asset tag", type: "text", required: true },
        { name: "name", label: "Asset name", type: "text", required: true },
        { name: "category", label: "Category", type: "select", options: ["Imaging", "Critical Care", "Monitoring", "Surgical", "IT"] },
        { name: "location", label: "Location", type: "text" },
        { name: "assignee", label: "Assignee", type: "text" },
        { name: "purchasedAt", label: "Purchase date", type: "date" },
        { name: "status", label: "Status", type: "select", options: ["Active", "Maintenance", "Retired"] },
      ],
    }} />
  </AdminLayout>
);
export default Page;
