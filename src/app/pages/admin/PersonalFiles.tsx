'use client';
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type F = { id: string; folder: string; title: string; owner: string; size: string; updatedAt: string; status: string };
const seed: F[] = [
  { id: "f1", folder: "Contracts", title: "Vendor A Service Agreement.pdf", owner: "Lila Ahmed", size: "1.2 MB", updatedAt: "2026-04-30", status: "Active" },
  { id: "f2", folder: "Licenses", title: "Hospital Operating License 2026.pdf", owner: "Hospital Admin", size: "740 KB", updatedAt: "2026-01-12", status: "Active" },
  { id: "f3", folder: "Policies", title: "Infection Control Policy v3.docx", owner: "Quality Team", size: "210 KB", updatedAt: "2026-03-22", status: "Draft" },
];
const Page = () => (
  <AdminLayout title="Personal & Confidential Files" subtitle="Documents, contracts and policies">
    <ResourcePage<F> config={{
      storeKey: "files", seed, searchFields: ["folder", "title", "owner"],
      statuses: ["Active", "Draft", "Archived"],
      columns: [
        { key: "folder", label: "Folder", sortable: true, accessor: r => r.folder },
        { key: "title", label: "File", sortable: true, accessor: r => r.title, render: r => <span className="font-semibold text-primary">{r.title}</span> },
        { key: "owner", label: "Owner" },
        { key: "size", label: "Size" },
        { key: "updatedAt", label: "Updated", sortable: true, accessor: r => r.updatedAt },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "folder", label: "Folder", type: "select", options: ["Contracts", "Licenses", "Policies", "Confidential", "Other"] },
        { name: "title", label: "File name", type: "text", required: true },
        { name: "owner", label: "Owner", type: "text" },
        { name: "size", label: "Size", type: "text" },
        { name: "updatedAt", label: "Updated", type: "date" },
        { name: "status", label: "Status", type: "select", options: ["Active", "Draft", "Archived"] },
      ],
    }} />
  </AdminLayout>
);
export default Page;
