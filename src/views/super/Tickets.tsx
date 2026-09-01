"use client";

import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import type { SupportTicketRow } from "@/redux/api/resources";

const Page = () => (
  <SuperLayout title="Support Tickets" subtitle="Tenant requests across the platform">
    <ResourcePage<SupportTicketRow>
      config={{
        storeKey: "tickets",
        resource: "support-tickets",
        searchFields: ["subject", "tenant", "assignee"],
        statuses: ["Pending", "Processing", "Resolved"],
        columns: [
          {
            key: "id",
            label: "Ticket",
            render: r => <span className="font-mono text-xs">{r.id ? r.id.slice(0, 8) : "—"}</span>,
          },
          {
            key: "subject",
            label: "Subject",
            sortable: true,
            accessor: r => r.subject,
            render: r => <span className="font-semibold text-primary">{r.subject}</span>,
          },
          {
            key: "tenant",
            label: "Tenant",
            sortable: true,
            accessor: r => r.tenant ?? "—",
          },
          {
            key: "priority",
            label: "Priority",
            render: r => (
              <Pill tone={r.priority === "Critical" ? "bad" : r.priority === "High" ? "warn" : "default"}>
                {r.priority}
              </Pill>
            ),
          },
          {
            key: "assignee",
            label: "Assignee",
            accessor: r => r.assignee ?? "—",
          },
          {
            key: "status",
            label: "Status",
            render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill>,
          },
        ],
        fields: [
          { name: "subject", label: "Subject", type: "text", required: true },
          { name: "tenant", label: "Tenant", type: "text" },
          { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
          { name: "assignee", label: "Assignee", type: "text" },
          { name: "status", label: "Status", type: "select", options: ["Pending", "Processing", "Resolved"] },
        ],
      }}
    />
  </SuperLayout>
);

export default Page;
