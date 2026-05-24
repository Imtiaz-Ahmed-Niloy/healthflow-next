'use client';
import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type A = { id: string; title: string; audience: string; channel: string; status: string };
const seed: A[] = [
  { id: "a1", title: "Platform maintenance May 12 02:00 UTC", audience: "All tenants", channel: "Email + Banner", status: "Published" },
  { id: "a2", title: "New AI bed-occupancy model rolled out", audience: "Enterprise", channel: "In-app", status: "Published" },
  { id: "a3", title: "Pricing update — draft", audience: "All tenants", channel: "Email", status: "Draft" },
];
const Page = () => (
  <SuperLayout title="Announcements" subtitle="Broadcast to tenants">
    <ResourcePage<A> config={{
      storeKey: "super-announcements", seed, searchFields: ["title", "audience"],
      statuses: ["Published", "Draft", "Archived"],
      columns: [
        { key: "title", label: "Title", sortable: true, accessor: r => r.title, render: r => <span className="font-semibold text-primary">{r.title}</span> },
        { key: "audience", label: "Audience" },
        { key: "channel", label: "Channel" },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "audience", label: "Audience", type: "select", options: ["All tenants", "Enterprise", "Pro", "Starter"] },
        { name: "channel", label: "Channel", type: "select", options: ["Email", "In-app", "Email + Banner", "SMS"] },
        { name: "status", label: "Status", type: "select", options: ["Published", "Draft", "Archived"] },
      ],
    }} />
  </SuperLayout>
);
export default Page;
