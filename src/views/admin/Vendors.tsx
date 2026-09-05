"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import type { VendorRow } from "@/redux/api/resources";

/**
 * The supplier list behind /admin/vendors (HF-61).
 *
 * The backend has been on main since 27ea22b; this page was still showing the
 * same four invented suppliers to every hospital. Field names are the
 * database's, because form values post straight through with no mapping layer
 * — `contact_person`, not `contact`.
 */

/** Free text in the database, like assets.category — the list is a convenience. */
const VENDOR_CATEGORIES = [
  "Medical Supplies", "Pharmaceuticals", "Imaging Reagents", "Laboratory",
  "Equipment", "Furniture", "Stationery", "IT", "Services", "Other",
];

/** Lowercase in the database (0030); the UI supplies the labels. */
const VENDOR_STATUSES = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "suspended", label: "Suspended" },
];

const statusLabel = (value: string) =>
  VENDOR_STATUSES.find(s => s.value === value)?.label ?? value;

const Vendors = () => (
  <AdminLayout title="Vendor Management" subtitle="Suppliers powering procurement">
    <ResourcePage<VendorRow> config={{
      storeKey: "vendors",
      resource: "vendors",
      searchFields: ["name", "category", "contact_person"],
      statuses: VENDOR_STATUSES,
      columns: [
        { key: "name", label: "Vendor", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "category", label: "Category", sortable: true, accessor: r => r.category ?? "", render: r => <span>{r.category || "—"}</span> },
        { key: "contact_person", label: "Contact", render: r => <span>{r.contact_person || "—"}</span> },
        { key: "phone", label: "Phone", render: r => <span>{r.phone || "—"}</span> },
        { key: "email", label: "Email", render: r => (
          r.email
            ? <a href={`mailto:${r.email}`} className="text-primary hover:underline">{r.email}</a>
            : <span>—</span>
        ) },
        { key: "rating", label: "Rating", sortable: true, accessor: r => Number(r.rating ?? 0), render: r => <span>{r.rating ? `${r.rating} / 5` : "—"}</span> },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
      ],
      fields: [
        { name: "name", label: "Vendor name", type: "text", required: true },
        { name: "category", label: "Category", type: "select", options: VENDOR_CATEGORIES },
        { name: "contact_person", label: "Contact person", type: "text" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "email", label: "Email", type: "email" },
        { name: "rating", label: "Rating (1-5)", type: "number", min: 1, max: 5, numberStep: 0.1 },
        { name: "status", label: "Status", type: "select", options: VENDOR_STATUSES },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
    }} />
  </AdminLayout>
);

export default Vendors;
