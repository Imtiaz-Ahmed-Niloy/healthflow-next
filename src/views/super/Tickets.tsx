"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { useListResourceQuery } from "@/redux/api/createResourceApi";
import type { SupportTicketRow } from "@/redux/api/resources";

/**
 * Mirrors support_ticket_status and support_ticket_priority
 * (0052_support_tickets.sql) exactly. Values are the lowercase ones stored in
 * the database; the words people read come from the message files.
 */
const STATUSES = ["pending", "processing", "resolved"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;

const Page = () => {
  const t = useTranslations("super.tickets");
  const statusLabel = (value: string) =>
    (STATUSES as readonly string[]).includes(value) ? t(`statuses.${value as (typeof STATUSES)[number]}`) : value;
  const priorityLabel = (value: string) =>
    (PRIORITIES as readonly string[]).includes(value) ? t(`priorities.${value as (typeof PRIORITIES)[number]}`) : value;
  const statuses = STATUSES.map(value => ({ value, label: statusLabel(value) }));
  const priorities = PRIORITIES.map(value => ({ value, label: priorityLabel(value) }));

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
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<SupportTicketRow>
        config={{
          storeKey: "tickets",
          resource: "support-tickets",
          searchFields: ["subject", "assignee"],
          statuses,
          columns: [
            {
              key: "id",
              label: t("columns.ticket"),
              render: r => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span>,
            },
            {
              key: "subject",
              label: t("columns.subject"),
              sortable: true,
              accessor: r => r.subject,
              render: r => <span className="font-semibold text-primary">{r.subject}</span>,
            },
            {
              key: "tenant_id",
              label: t("columns.hospital"),
              sortable: true,
              accessor: r => r.tenants?.name ?? "",
              render: r => r.tenants
                ? <span>{r.tenants.name}</span>
                : <span className="text-muted-foreground">{t("unknownHospital")}</span>,
            },
            {
              key: "priority",
              label: t("columns.priority"),
              render: r => (
                <Pill tone={r.priority === "critical" ? "bad" : r.priority === "high" ? "warn" : "default"}>
                  {priorityLabel(r.priority)}
                </Pill>
              ),
            },
            {
              key: "assignee",
              label: t("columns.assignee"),
              accessor: r => r.assignee ?? "",
              render: r => r.assignee || "—",
            },
            {
              key: "status",
              label: t("columns.status"),
              render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill>,
            },
          ],
          fields: [
            { name: "tenant_id", label: t("columns.hospital"), type: "select", options: hospitalOptions, required: true },
            { name: "subject", label: t("columns.subject"), type: "text", required: true },
            { name: "details", label: t("details"), type: "textarea", fullWidth: true },
            { name: "priority", label: t("columns.priority"), type: "select", options: priorities },
            { name: "assignee", label: t("columns.assignee"), type: "text" },
            { name: "status", label: t("columns.status"), type: "select", options: statuses },
          ],
        }}
      />
    </SuperLayout>
  );
};

export default Page;
