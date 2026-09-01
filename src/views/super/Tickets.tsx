"use client";

import { useMemo } from "react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { useListResourceQuery } from "@/redux/api/createResourceApi";
import type { SupportTicketRow } from "@/redux/api/resources";

/**
 * Mirrors support_ticket_status and support_ticket_priority
 * (0052_support_tickets.sql) exactly. Values are the lowercase ones stored in
 * the database; the capitals live here, which is the only place they belong.
 */
const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "resolved", label: "Resolved" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find(o => o.value === value)?.label ?? value;

const Page = () => {
  /**
   * Feeds the form's hospital picker. A support ticket belongs to the hospital
   * that raised it, and on this screen the super admin is filing on their
   * behalf, so the tenant is chosen rather than inherited — the factory
   * requires it from a super_admin.
   */
  const hospitals = useListResourceQuery({ resource: "hospitals", limit: 100 });
  const hospitalOptions = useMemo(
    () => ((hospitals.data?.data ?? []) as { id: string; name: string }[])
      .map(h => ({ value: h.id, label: h.name })),
    [hospitals.data],
  );

  return (
    <SuperLayout title="Support Tickets" subtitle="Tenant requests across the platform">
      <ResourcePage<SupportTicketRow>
        config={{
          storeKey: "tickets",
          resource: "support-tickets",
          searchFields: ["subject", "assignee"],
          statuses: STATUSES,
          columns: [
            {
              key: "id",
              label: "Ticket",
              render: r => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span>,
            },
            {
              key: "subject",
              label: "Subject",
              sortable: true,
              accessor: r => r.subject,
              render: r => <span className="font-semibold text-primary">{r.subject}</span>,
            },
            {
              key: "tenant_id",
              label: "Hospital",
              sortable: true,
              accessor: r => r.tenants?.name ?? "",
              render: r => r.tenants
                ? <span>{r.tenants.name}</span>
                : <span className="text-muted-foreground">Unknown hospital</span>,
            },
            {
              key: "priority",
              label: "Priority",
              render: r => (
                <Pill tone={r.priority === "critical" ? "bad" : r.priority === "high" ? "warn" : "default"}>
                  {labelOf(PRIORITIES, r.priority)}
                </Pill>
              ),
            },
            {
              key: "assignee",
              label: "Assignee",
              accessor: r => r.assignee ?? "",
              render: r => r.assignee || "—",
            },
            {
              key: "status",
              label: "Status",
              render: r => <Pill tone={statusTone(r.status)}>{labelOf(STATUSES, r.status)}</Pill>,
            },
          ],
          fields: [
            { name: "tenant_id", label: "Hospital", type: "select", options: hospitalOptions, required: true },
            { name: "subject", label: "Subject", type: "text", required: true },
            { name: "details", label: "Details", type: "textarea", fullWidth: true },
            { name: "priority", label: "Priority", type: "select", options: PRIORITIES },
            { name: "assignee", label: "Assignee", type: "text" },
            { name: "status", label: "Status", type: "select", options: STATUSES },
          ],
        }}
      />
    </SuperLayout>
  );
};

export default Page;
