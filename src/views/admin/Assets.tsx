"use client";

import { Boxes, CheckCircle2, Wrench, Archive } from "lucide-react";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Kpi, Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { useListResourceQuery } from "@/redux/api/createResourceApi";
import type { AssetRow } from "@/redux/api/resources";

/**
 * Categories offered by the form. Free text in the database (see
 * 0033_assets.sql) — a hospital that classes equipment differently can still
 * store it; this list is only the common set, so nobody types "Imaging" twice.
 */
const ASSET_CATEGORIES = [
  "Imaging", "Critical Care", "Monitoring", "Surgical", "Laboratory",
  "Furniture", "IT", "Other",
];

/** Stored lowercase to match doctors, nurses, support staff and lab tests. */
const ASSET_STATUSES = ["active", "maintenance", "retired"] as const;

/**
 * Every count comes from the server's `meta.total`, which is an exact count
 * over the whole table, not a tally of the rows in hand. Counting the rows
 * would count one PAGE of them — the route caps `limit` at 100 — so a
 * hospital with more equipment than that would quietly see the wrong numbers.
 * `limit: 1` because the rows themselves are not wanted, only the count.
 */
const useAssetCount = (status?: string) =>
  useListResourceQuery({
    resource: "assets",
    limit: 1,
    filters: status ? { status } : undefined,
  }).data?.meta?.total;

const n = (value?: number) => (value === undefined ? "—" : String(value));

/**
 * The register at a glance, above the table. Shares the `assets:LIST` cache
 * tag, so adding, editing or deleting a row in the table below moves these
 * tiles with it.
 */
const AssetSummary = () => {
  const t = useTranslations("admin.assets");
  const total = useAssetCount();
  const active = useAssetCount("active");
  const maintenance = useAssetCount("maintenance");
  const retired = useAssetCount("retired");

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Kpi icon={Boxes} label={t("kpi.total")} value={n(total)} tone="primary" />
      <Kpi icon={CheckCircle2} label={t("kpi.active")} value={n(active)} tone="accent" />
      <Kpi icon={Wrench} label={t("kpi.maintenance")} value={n(maintenance)} tone="destructive" />
      <Kpi icon={Archive} label={t("kpi.retired")} value={n(retired)} tone="chip" />
    </div>
  );
};

const Page = () => {
  const t = useTranslations("admin.assets");
  const statusLabel = (value: string) =>
    (ASSET_STATUSES as readonly string[]).includes(value)
      ? t(`statuses.${value as (typeof ASSET_STATUSES)[number]}`)
      : value;
  const statuses = ASSET_STATUSES.map(value => ({ value, label: statusLabel(value) }));

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <AssetSummary />
      <ResourcePage<AssetRow> config={{
        storeKey: "assets",
        resource: "assets",
        searchFields: ["tag", "name", "location"],
        statuses,
        columns: [
          { key: "tag", label: t("columns.tag"), sortable: true, accessor: r => r.tag, render: r => <span className="font-mono text-xs">{r.tag}</span> },
          { key: "name", label: t("columns.asset"), sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          { key: "category", label: t("columns.category"), sortable: true, accessor: r => r.category ?? "", render: r => <span>{r.category || "—"}</span> },
          { key: "location", label: t("columns.location"), render: r => <span>{r.location || "—"}</span> },
          { key: "assignee", label: t("columns.assignee"), render: r => <span>{r.assignee || "—"}</span> },
          { key: "purchased_at", label: t("columns.purchased"), sortable: true, accessor: r => r.purchased_at ?? "", render: r => <span>{r.purchased_at || "—"}</span> },
          { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
        ],
        fields: [
          { name: "tag", label: t("fields.tag"), type: "text", required: true },
          { name: "name", label: t("fields.name"), type: "text", required: true },
          { name: "category", label: t("fields.category"), type: "select", options: ASSET_CATEGORIES },
          { name: "location", label: t("fields.location"), type: "text" },
          { name: "assignee", label: t("fields.assignee"), type: "text" },
          { name: "purchased_at", label: t("fields.purchased"), type: "date" },
          { name: "status", label: t("fields.status"), type: "select", options: statuses },
          { name: "notes", label: t("fields.notes"), type: "textarea" },
        ],
      }} />
    </AdminLayout>
  );
};
export default Page;
