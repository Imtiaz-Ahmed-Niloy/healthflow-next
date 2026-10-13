"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { PagedResource } from "@/components/pharmacy/PagedResource";
import { Pill } from "@/components/admin/ui";
import { Chips, type Column } from "@/components/admin/crud";
import type { FieldDef } from "@/components/admin/ResourcePage";
import type { PharmacySupplier } from "@/lib/pharmacy";

const FILTERS = ["all", "active", "inactive"] as const;

const Page = () => {
  const t = useTranslations("pharmacy.suppliers");
  const tc = useTranslations("pharmacy.common");
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("all");

  const statuses = (["active", "inactive"] as const).map(value => ({ value, label: t(`statuses.${value}`) }));

  const columns: Column<PharmacySupplier>[] = [
    { key: "name", label: t("columns.name"), render: r => (
      <div>
        <p className="font-semibold text-primary">{r.name}</p>
        {r.address && <p className="text-xs text-muted-foreground truncate max-w-xs">{r.address}</p>}
      </div>
    ) },
    { key: "contact", label: t("columns.contact"), render: r => r.contact_person ?? "—" },
    { key: "phone", label: t("columns.phone"), render: r => r.phone ?? "—" },
    { key: "email", label: t("columns.email"), render: r => r.email ?? "—" },
    { key: "status", label: t("columns.status"), render: r => <Pill tone={r.status === "active" ? "ok" : "default"}>{t(`statuses.${r.status}`)}</Pill> },
  ];

  const fields: FieldDef[] = [
    { name: "name", label: t("fields.name"), type: "text", required: true, fullWidth: true },
    { name: "contact_person", label: t("fields.contact_person"), type: "text" },
    { name: "phone", label: t("fields.phone"), type: "tel" },
    { name: "email", label: t("fields.email"), type: "email" },
    { name: "status", label: t("fields.status"), type: "select", options: statuses },
    { name: "address", label: t("fields.address"), type: "textarea" },
    { name: "notes", label: t("fields.notes"), type: "textarea" },
  ];

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")} needs="manage_stock">
      <PagedResource<PharmacySupplier>
        resource="pharmacy-suppliers"
        columns={columns}
        fields={fields}
        searchPlaceholder={t("searchPlaceholder")}
        addLabel={t("add")}
        newTitle={t("newTitle")}
        editTitle={t("editTitle")}
        empty={t("noSuppliers")}
        deleteHint={t("deleteHint")}
        exportName="pharmacy-suppliers"
        filters={{ status: status === "all" ? undefined : status }}
        defaults={{ status: "active" }}
        toolbar={<Chips value={status} onChange={setStatus}
          options={FILTERS.map(value => ({ value, label: value === "all" ? tc("all") : t(`statuses.${value}`) }))} />}
      />
    </PharmacyLayout>
  );
};

export default Page;
