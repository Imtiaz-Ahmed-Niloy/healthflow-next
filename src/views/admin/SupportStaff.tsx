"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import type { SupportStaffRow } from "@/redux/api/resources";

/**
 * The five departments are a check constraint on the table, not a lookup — see
 * 0015_support_staff.sql. Adding a sixth means a migration, so this list and
 * the constraint have to be changed together. The stored value is what the
 * constraint accepts, so it stays English; only the label is translated.
 */
const DEPARTMENTS = ["Janitorial", "Security", "Maintenance", "Kitchen", "Transport"] as const;
const DEPARTMENT_KEYS: Record<(typeof DEPARTMENTS)[number], string> = {
  Janitorial: "janitorial",
  Security: "security",
  Maintenance: "maintenance",
  Kitchen: "kitchen",
  Transport: "transport",
};

/**
 * Stored lowercase to match doctors, doctor assistants and nurses, so the value
 * in the database is not what a human should read. ResourcePage takes
 * { value, label } for exactly this.
 */
const STATUSES = ["active", "on_leave", "suspended"] as const;

const Page = () => {
  const t = useTranslations("admin.supportStaff");
  const [department, setDepartment] = useState("all");

  const statusLabel = (value: string) =>
    (STATUSES as readonly string[]).includes(value)
      ? t(`statuses.${value as (typeof STATUSES)[number]}`)
      : value;
  const statuses = STATUSES.map(value => ({ value, label: statusLabel(value) }));
  const departments = DEPARTMENTS.map(value => ({ value, label: t(`departments.${DEPARTMENT_KEYS[value] as "janitorial"}`) }));

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<SupportStaffRow> config={{
        storeKey: "support-staff",
        resource: "support-staff",
        exportName: "support-staff",
        addLabel: t("add"),

        searchFields: ["name", "department", "role", "phone", "email"],
        statuses,

        // Status is already a chip row, and a second one would crowd it. The
        // department pill matches the doctor filter on /admin/doctor-assistants.
        extraFilters: (
          <div className="inline-flex items-center gap-1.5 bg-muted/40 rounded-full pl-3 pr-1 py-0.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <select value={department} onChange={e => setDepartment(e.target.value)}
              className="h-7 bg-transparent text-xs outline-none pr-1" aria-label={t("filterByDepartment")}>
              <option value="all">{t("allDepartments")}</option>
              {departments.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        ),
        filterFn: r => department === "all" || r.department === department,

        columns: [
          { key: "name", label: t("columns.name"), sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          { key: "department", label: t("columns.department"), sortable: true, accessor: r => r.department, render: r => <span>{departments.find(d => d.value === r.department)?.label ?? r.department}</span> },
          { key: "role", label: t("columns.role"), render: r => <span>{r.role || "—"}</span> },
          { key: "phone", label: t("columns.phone"), render: r => <span className="font-mono text-xs">{r.phone || "—"}</span> },
          { key: "email", label: t("columns.email"), render: r => <span className="text-xs">{r.email || "—"}</span> },
          { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
        ],

        fields: [
          { name: "name", label: t("fields.name"), type: "text", required: true },
          // Required because the column is NOT NULL with no default. The select
          // always sends one, so this only ever fires for a non-form caller.
          { name: "department", label: t("fields.department"), type: "select", options: departments, required: true },
          { name: "role", label: t("fields.role"), type: "text" },
          { name: "phone", label: t("fields.phone"), type: "tel" },
          { name: "email", label: t("fields.email"), type: "email" },
          { name: "status", label: t("fields.status"), type: "select", options: statuses },
          { name: "notes", label: t("fields.notes"), type: "textarea", fullWidth: true },
        ],
      }} />
    </AdminLayout>
  );
};

export default Page;
