'use client';
import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type T = { id: string; subject: string; tenant: string; priority: string; assignee: string; status: string };
const seed: T[] = [
  { id: "T-9001", subject: "Cannot generate payroll for May", tenant: "Greenfield", priority: "High", assignee: "Aisha (L2)", status: "Processing" },
  { id: "T-9002", subject: "Lab integration timeout", tenant: "Sunrise Clinic", priority: "Critical", assignee: "Jamal (L3)", status: "Pending" },
  { id: "T-9003", subject: "How to bulk-import doctors?", tenant: "Metro Diagnostics", priority: "Low", assignee: "Sara (L1)", status: "Resolved" },
];
const Page = () => (
  <SuperLayout title="Support Tickets" subtitle="Tenant requests across the platform">
    <ResourcePage<T> config={{
      storeKey: "tickets", seed, searchFields: ["subject", "tenant"],
      statuses: ["Pending", "Processing", "Resolved"],
      columns: [
        { key: "id", label: "Ticket", render: r => <span className="font-mono text-xs">{r.id}</span> },
        { key: "subject", label: "Subject", sortable: true, accessor: r => r.subject, render: r => <span className="font-semibold text-primary">{r.subject}</span> },
        { key: "tenant", label: "Tenant", sortable: true, accessor: r => r.tenant },
        { key: "priority", label: "Priority", render: r => <Pill tone={r.priority === "Critical" ? "bad" : r.priority === "High" ? "warn" : "default"}>{r.priority}</Pill> },
        { key: "assignee", label: "Assignee" },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "subject", label: "Subject", type: "text", required: true },
        { name: "tenant", label: "Tenant", type: "text" },
        { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "assignee", label: "Assignee", type: "text" },
        { name: "status", label: "Status", type: "select", options: ["Pending", "Processing", "Resolved"] },
      ],
    }} />
  </SuperLayout>
);
export default Page;
