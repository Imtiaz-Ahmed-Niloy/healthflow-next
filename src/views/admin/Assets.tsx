"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
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
const ASSET_STATUSES = [
  { value: "active", label: "Active" },
  { value: "maintenance", label: "Maintenance" },
  { value: "retired", label: "Retired" },
];

const assetStatusLabel = (value: string) =>
  ASSET_STATUSES.find(s => s.value === value)?.label ?? value;

const Page = () => (
  <AdminLayout title="Asset Management" subtitle="Equipment, devices and maintenance">
    <ResourcePage<AssetRow> config={{
      storeKey: "assets",
      resource: "assets",
      searchFields: ["tag", "name", "location"],
      statuses: ASSET_STATUSES,
      columns: [
        { key: "tag", label: "Tag", sortable: true, accessor: r => r.tag, render: r => <span className="font-mono text-xs">{r.tag}</span> },
        { key: "name", label: "Asset", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "category", label: "Category", sortable: true, accessor: r => r.category ?? "", render: r => <span>{r.category || "—"}</span> },
        { key: "location", label: "Location", render: r => <span>{r.location || "—"}</span> },
        { key: "assignee", label: "Assignee", render: r => <span>{r.assignee || "—"}</span> },
        { key: "purchased_at", label: "Purchased", sortable: true, accessor: r => r.purchased_at ?? "", render: r => <span>{r.purchased_at || "—"}</span> },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{assetStatusLabel(r.status)}</Pill> },
      ],
      fields: [
        { name: "tag", label: "Asset tag", type: "text", required: true },
        { name: "name", label: "Asset name", type: "text", required: true },
        { name: "category", label: "Category", type: "select", options: ASSET_CATEGORIES },
        { name: "location", label: "Location", type: "text" },
        { name: "assignee", label: "Assignee", type: "text" },
        { name: "purchased_at", label: "Purchase date", type: "date" },
        { name: "status", label: "Status", type: "select", options: ASSET_STATUSES },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
    }} />
  </AdminLayout>
);
export default Page;
