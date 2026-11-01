"use client";

import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { ResourcePage } from "@/components/admin/ResourcePage";
import type { LabTestRow } from "@/redux/api/resources";

/** Stored lowercase to match database values. */
const CATALOG_STATUSES = ["active", "inactive"] as const;

const Lab = () => {
  const t = useTranslations("admin.lab");

  const catalogStatusLabel = (value: string) =>
    (CATALOG_STATUSES as readonly string[]).includes(value)
      ? t(`catalogStatuses.${value as (typeof CATALOG_STATUSES)[number]}`)
      : value;
  const catalogStatuses = CATALOG_STATUSES.map(value => ({ value, label: catalogStatusLabel(value) }));

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<LabTestRow> config={{
        storeKey: "lab-catalog",
        resource: "lab-tests",
        searchFields: ["name", "category", "sample"],
        statuses: catalogStatuses,
        exportName: "lab-catalog",
        columns: [
          { key: "name", label: t("columns.test"), sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          { key: "category", label: t("columns.category"), sortable: true, accessor: r => r.category ?? "", render: r => <span>{r.category || "—"}</span> },
          // numeric(10,2) arrives as a string from PostgREST, so sorting has
          // to coerce or "9" sorts after "320".
          { key: "price", label: t("columns.price"), sortable: true, accessor: r => Number(r.price) },
          { key: "turnaround", label: t("columns.turnaround"), render: r => <span>{r.turnaround || "—"}</span> },
          { key: "sample", label: t("columns.sample"), render: r => <span>{r.sample || "—"}</span> },
          { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{catalogStatusLabel(r.status)}</Pill> },
        ],
        fields: [
          { name: "name", label: t("fields.testName"), type: "text", required: true },
          { name: "price", label: t("fields.price"), type: "number", required: true, min: 0, numberStep: 0.01 },
          { name: "turnaround", label: t("fields.turnaround"), type: "text" },
          { name: "sample", label: t("fields.sample"), type: "text" },
          { name: "status", label: t("fields.status"), type: "select", options: catalogStatuses },
          { name: "description", label: t("fields.description"), type: "textarea" },
        ],
      }} />
    </AdminLayout>
  );
};

export default Lab;
