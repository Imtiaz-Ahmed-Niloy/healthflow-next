'use client';
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type N = { id: string; title: string; audience: string; channel: string; publishedAt: string; status: string };
const seed: N[] = [
  { id: "n1", title: "Mandatory infection-control training May 20", audience: "All staff", channel: "Email + In-app", publishedAt: "2026-05-04", status: "Published" },
  { id: "n2", title: "OT scheduling change effective May 15", audience: "Surgeons", channel: "Email", publishedAt: "2026-05-02", status: "Published" },
  { id: "n3", title: "New PPE supplier draft notice", audience: "Procurement", channel: "In-app", publishedAt: "—", status: "Draft" },
];
const Page = () => (
  <AdminLayout title="Administration" subtitle="Announcements, meetings and policies">
    <ResourcePage<N> config={{
      storeKey: "announcements", seed, searchFields: ["title", "audience"],
      statuses: ["Published", "Draft", "Archived"],
      columns: [
        { key: "title", label: "Title", sortable: true, accessor: r => r.title, render: r => <span className="font-semibold text-primary">{r.title}</span> },
        { key: "audience", label: "Audience" },
        { key: "channel", label: "Channel" },
        { key: "publishedAt", label: "Published", accessor: r => r.publishedAt, sortable: true },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "audience", label: "Audience", type: "select", options: ["All staff", "Doctors", "Nurses", "Surgeons", "Procurement", "Patients"] },
        { name: "channel", label: "Channel", type: "select", options: ["Email", "In-app", "Email + In-app", "SMS"] },
        { name: "publishedAt", label: "Publish date", type: "date" },
        { name: "status", label: "Status", type: "select", options: ["Published", "Draft", "Archived"] },
      ],
    }} />
  </AdminLayout>
);
export default Page;
