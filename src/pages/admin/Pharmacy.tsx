"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type Item = { id: string; sku: string; name: string; category: string; stock: string; reorder: string; status: string };
const seed: Item[] = [
  { id: "p1", sku: "MED-0001", name: "Paracetamol 500mg", category: "Analgesic", stock: "1250", reorder: "200", status: "Active" },
  { id: "p2", sku: "MED-0002", name: "Amoxicillin 500mg", category: "Antibiotic", stock: "120", reorder: "150", status: "Low Stock" },
  { id: "p3", sku: "MED-0003", name: "Ibuprofen 200mg", category: "Analgesic", stock: "0", reorder: "100", status: "Out of Stock" },
  { id: "p4", sku: "MED-0004", name: "Insulin Glargine", category: "Endocrine", stock: "60", reorder: "30", status: "Active" },
];
const Page = () => (
  <AdminLayout title="Pharmacy Management" subtitle="Inventory, restock & dispensing">
    <ResourcePage<Item> config={{
      storeKey: "pharmacy", seed, searchFields: ["sku", "name", "category"],
      statuses: ["Active", "Low Stock", "Out of Stock"],
      columns: [
        { key: "sku", label: "SKU", accessor: r => r.sku, sortable: true, render: r => <span className="font-mono text-xs">{r.sku}</span> },
        { key: "name", label: "Item", accessor: r => r.name, sortable: true, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "category", label: "Category", accessor: r => r.category, sortable: true },
        { key: "stock", label: "Stock", accessor: r => Number(r.stock), sortable: true },
        { key: "reorder", label: "Reorder At", accessor: r => Number(r.reorder) },
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

