"use client";

import { useTranslations } from "next-intl";
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
 *
 * Categories are free text in the database, so the list stays as stored:
 * translating one would file a Bangla word into an English column.
 */
const VENDOR_CATEGORIES = [
  "Medical Supplies", "Pharmaceuticals", "Imaging Reagents", "Laboratory",
  "Equipment", "Furniture", "Stationery", "IT", "Services", "Other",
];

/** Lowercase in the database (0030); the UI supplies the labels. */
const VENDOR_STATUSES = ["active", "on_hold", "suspended"] as const;

const Vendors = () => {
  const t = useTranslations("admin.vendors");
  const statusLabel = (value: string) =>
    (VENDOR_STATUSES as readonly string[]).includes(value)
      ? t(`statuses.${value as (typeof VENDOR_STATUSES)[number]}`)
      : value;
  const statuses = VENDOR_STATUSES.map(value => ({ value, label: statusLabel(value) }));

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<VendorRow> config={{
        storeKey: "vendors",
        resource: "vendors",
        searchFields: ["name", "category", "contact_person"],
        statuses,
        columns: [
          { key: "name", label: t("columns.name"), sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          { key: "category", label: t("columns.category"), sortable: true, accessor: r => r.category ?? "", render: r => <span>{r.category || "—"}</span> },
          { key: "contact_person", label: t("columns.contact"), render: r => <span>{r.contact_person || "—"}</span> },
          { key: "phone", label: t("columns.phone"), render: r => <span>{r.phone || "—"}</span> },
          { key: "email", label: t("columns.email"), render: r => (
            r.email
              ? <a href={`mailto:${r.email}`} className="text-primary hover:underline">{r.email}</a>
              : <span>—</span>
          ) },
          { key: "rating", label: t("columns.rating"), sortable: true, accessor: r => Number(r.rating ?? 0), render: r => <span>{r.rating ? t("outOfFive", { rating: r.rating }) : "—"}</span> },
          { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
        ],
        fields: [
          { name: "name", label: t("fields.name"), type: "text", required: true },
          { name: "category", label: t("fields.category"), type: "select", options: VENDOR_CATEGORIES },
          { name: "contact_person", label: t("fields.contactPerson"), type: "text" },
          { name: "phone", label: t("fields.phone"), type: "tel" },
          { name: "email", label: t("fields.email"), type: "email" },
          { name: "rating", label: t("fields.rating"), type: "number", min: 1, max: 5, numberStep: 0.1 },
          { name: "status", label: t("fields.status"), type: "select", options: statuses },
          { name: "notes", label: t("fields.notes"), type: "textarea" },
        ],
      }} />
    </AdminLayout>
  );
};

export default Vendors;
