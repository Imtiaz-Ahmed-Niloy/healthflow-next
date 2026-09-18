"use client";

import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import type { PharmacyItemRow } from "@/redux/api/resources";

/** Stored lowercase to match doctors, nurses, support staff, lab tests and assets. */
const PHARMACY_CATEGORIES = ["analgesic", "antibiotic", "endocrine", "cardio", "vitamins"] as const;

const PHARMACY_STATUSES = ["active", "low_stock", "out_of_stock"] as const;

const Page = () => {
  const t = useTranslations("admin.pharmacy");
  const categoryLabel = (value: string) =>
    (PHARMACY_CATEGORIES as readonly string[]).includes(value)
      ? t(`categories.${value as (typeof PHARMACY_CATEGORIES)[number]}`)
      : value;
  const statusLabel = (value: string) =>
    (PHARMACY_STATUSES as readonly string[]).includes(value)
      ? t(`statuses.${value as (typeof PHARMACY_STATUSES)[number]}`)
      : value;

  const categories = PHARMACY_CATEGORIES.map(value => ({ value, label: categoryLabel(value) }));
  const statuses = PHARMACY_STATUSES.map(value => ({ value, label: statusLabel(value) }));

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<PharmacyItemRow> config={{
        storeKey: "pharmacy",
        resource: "pharmacy-items",
        searchFields: ["sku", "name", "category"],
        statuses,
        columns: [
          { key: "sku", label: t("columns.sku"), accessor: r => r.sku, sortable: true, render: r => <span className="font-mono text-xs">{r.sku}</span> },
          { key: "name", label: t("columns.item"), accessor: r => r.name, sortable: true, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          { key: "category", label: t("columns.category"), accessor: r => r.category ?? "", sortable: true, render: r => <span>{r.category ? categoryLabel(r.category) : "—"}</span> },
          { key: "stock", label: t("columns.stock"), accessor: r => r.stock, sortable: true },
          { key: "reorder", label: t("columns.reorder"), accessor: r => r.reorder },
          { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
        ],
        fields: [
          { name: "sku", label: t("fields.sku"), type: "text", required: true },
          { name: "name", label: t("fields.name"), type: "text", required: true },
          { name: "category", label: t("fields.category"), type: "select", options: categories },
          { name: "stock", label: t("fields.stock"), type: "number", min: 0 },
          { name: "reorder", label: t("fields.reorder"), type: "number", min: 0 },
          { name: "status", label: t("fields.status"), type: "select", options: statuses },
        ],
      }} />
    </AdminLayout>
  );
};
export default Page;
