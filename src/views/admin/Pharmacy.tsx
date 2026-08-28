"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import type { PharmacyItemRow } from "@/redux/api/resources";

/** Stored lowercase to match doctors, nurses, support staff, lab tests and assets. */
const PHARMACY_CATEGORIES = [
  { value: "analgesic", label: "Analgesic" },
  { value: "antibiotic", label: "Antibiotic" },
  { value: "endocrine", label: "Endocrine" },
  { value: "cardio", label: "Cardio" },
  { value: "vitamins", label: "Vitamins" },
];

const PHARMACY_STATUSES = [
  { value: "active", label: "Active" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find(o => o.value === value)?.label ?? value;

const Page = () => (
  <AdminLayout title="Pharmacy Management" subtitle="Inventory, restock & dispensing">
    <ResourcePage<PharmacyItemRow> config={{
      storeKey: "pharmacy",
      resource: "pharmacy-items",
      searchFields: ["sku", "name", "category"],
      statuses: PHARMACY_STATUSES,
      columns: [
        { key: "sku", label: "SKU", accessor: r => r.sku, sortable: true, render: r => <span className="font-mono text-xs">{r.sku}</span> },
        { key: "name", label: "Item", accessor: r => r.name, sortable: true, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "category", label: "Category", accessor: r => r.category ?? "", sortable: true, render: r => <span>{r.category ? labelOf(PHARMACY_CATEGORIES, r.category) : "—"}</span> },
        { key: "stock", label: "Stock", accessor: r => r.stock, sortable: true },
        { key: "reorder", label: "Reorder At", accessor: r => r.reorder },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{labelOf(PHARMACY_STATUSES, r.status)}</Pill> },
      ],
      fields: [
        { name: "sku", label: "SKU", type: "text", required: true },
        { name: "name", label: "Item name", type: "text", required: true },
        { name: "category", label: "Category", type: "select", options: PHARMACY_CATEGORIES },
        { name: "stock", label: "Stock quantity", type: "number", min: 0 },
        { name: "reorder", label: "Reorder threshold", type: "number", min: 0 },
        { name: "status", label: "Status", type: "select", options: PHARMACY_STATUSES },
      ],
    }} />
  </AdminLayout>
);
export default Page;
