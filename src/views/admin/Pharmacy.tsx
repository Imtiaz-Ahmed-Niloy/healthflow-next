"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type Item = { id: string; sku: string; name: string; category: string; stock: number; reorder: number; status: string };

const Page = () => (
  <AdminLayout title="Pharmacy Management" subtitle="Inventory, restock & dispensing">
    <ResourcePage<Item> config={{
      storeKey: "pharmacy",
      resource: "pharmacy_items",
      searchFields: ["sku", "name", "category"],
      statuses: ["Active", "Low Stock", "Out of Stock"],
      columns: [
        { key: "sku", label: "SKU", accessor: r => r.sku, sortable: true, render: r => <span className="font-mono text-xs">{r.sku}</span> },
        { key: "name", label: "Item", accessor: r => r.name, sortable: true, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "category", label: "Category", accessor: r => r.category, sortable: true },
        { key: "stock", label: "Stock", accessor: r => r.stock, sortable: true },
        { key: "reorder", label: "Reorder At", accessor: r => r.reorder },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "sku", label: "SKU", type: "text", required: true },
        { name: "name", label: "Item name", type: "text", required: true },
        { name: "category", label: "Category", type: "select", options: ["Analgesic", "Antibiotic", "Endocrine", "Cardio", "Vitamins"] },
        { name: "stock", label: "Stock quantity", type: "number" },
        { name: "reorder", label: "Reorder threshold", type: "number" },
        { name: "status", label: "Status", type: "select", options: ["Active", "Low Stock", "Out of Stock"] },
      ],
    }} />
  </AdminLayout>
);
export default Page;

