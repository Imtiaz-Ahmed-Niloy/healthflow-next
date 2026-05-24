'use client';
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type V = { id: string; name: string; category: string; contact: string; phone: string; rating: string; status: string };
const seed: V[] = [
  { id: "v1", name: "Vendor A", category: "Medical Supplies", contact: "Anwar Hossain", phone: "+1 555 1001", rating: "4.8", status: "Active" },
  { id: "v2", name: "Vendor B", category: "Stationery", contact: "Beatrice Lee", phone: "+1 555 1002", rating: "4.2", status: "Active" },
  { id: "v3", name: "Vendor C", category: "Imaging Reagents", contact: "Carlos Diaz", phone: "+1 555 1003", rating: "4.6", status: "Active" },
  { id: "v4", name: "Vendor D", category: "Furniture", contact: "Daniela Roy", phone: "+1 555 1004", rating: "3.9", status: "On Hold" },
];
const Vendors = () => (
  <AdminLayout title="Vendor Management" subtitle="Suppliers powering procurement">
    <ResourcePage<V> config={{
      storeKey: "vendors", seed, searchFields: ["name", "category", "contact"],
      statuses: ["Active", "On Hold", "Suspended"],
      columns: [
        { key: "name", label: "Vendor", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "category", label: "Category", sortable: true, accessor: r => r.category },
        { key: "contact", label: "Contact" },
        { key: "phone", label: "Phone" },
        { key: "rating", label: "Rating", sortable: true, accessor: r => Number(r.rating) },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "name", label: "Vendor name", type: "text", required: true },
        { name: "category", label: "Category", type: "text" },
        { name: "contact", label: "Contact person", type: "text" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "rating", label: "Rating (1-5)", type: "number" },
        { name: "status", label: "Status", type: "select", options: ["Active", "On Hold", "Suspended"] },
      ],
    }} />
  </AdminLayout>
);
export default Vendors;
