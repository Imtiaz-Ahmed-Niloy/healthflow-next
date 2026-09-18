"use client";

import { useMemo, useState } from "react";
import { Stethoscope } from "lucide-react";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { doctorsApi, type DoctorAssistantRow } from "@/redux/api/resources";

/**
 * Assistants are stored with the same lowercase status vocabulary as doctors,
 * so the value in the database is not what a human should read. ResourcePage
 * takes { value, label } for exactly this.
 */
const STATUSES = ["active", "on_leave", "suspended"] as const;

/** Stored as typed on the row; the picker's labels are translated. */
const SHIFTS = ["Morning", "Evening", "Night"] as const;
const SHIFT_KEYS: Record<(typeof SHIFTS)[number], "morning" | "evening" | "night"> = {
  Morning: "morning", Evening: "evening", Night: "night",
};

/** Sentinel for the "not attached to any doctor" filter. Not a doctor id. */
const UNASSIGNED = "unassigned";

const Page = () => {
  const t = useTranslations("admin.doctorAssistants");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");

  const statusLabel = (value: string) =>
    (STATUSES as readonly string[]).includes(value)
      ? t(`statuses.${value as (typeof STATUSES)[number]}`)
      : value;
  const statuses = STATUSES.map(value => ({ value, label: statusLabel(value) }));
  const shifts = SHIFTS.map(value => ({ value, label: t(`shifts.${SHIFT_KEYS[value]}`) }));

  // The roster is small enough to load whole; the same call feeds both the
  // form's doctor picker and the filter above the table.
  const { data, isLoading } = doctorsApi.useList({ limit: 100 });
  const doctors = useMemo(() => data?.data ?? [], [data]);

  /**
   * The blank option comes first and carries the empty string, so a new
   * assistant defaults to unassigned and an existing one whose doctor_id is
   * null lands on it rather than silently adopting the first doctor in the
   * list.
   */
  const doctorOptions = useMemo(() => [
    { value: "", label: isLoading ? t("loadingDoctors") : t("notAssignedOption") },
    ...doctors.map(d => ({
      value: d.id,
      label: d.specialty ? `${d.name} · ${d.specialty}` : d.name,
    })),
  ], [doctors, isLoading, t]);

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<DoctorAssistantRow> config={{
        storeKey: "doctor-assistants",
        resource: "doctor-assistants",
        exportName: "doctor-assistants",
        addLabel: t("add"),

        // The assigned doctor's name is not here: it lives on the embedded
        // `doctors` relation, and this search only reads top-level keys. The
        // dropdown below filters by doctor instead, which is the more useful
        // control anyway.
        searchFields: ["name", "phone", "email"],
        statuses,

        extraFilters: (
          <div className="inline-flex items-center gap-1.5 bg-muted/40 rounded-full pl-3 pr-1 py-0.5">
            <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
            <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}
              className="h-7 bg-transparent text-xs outline-none pr-1" aria-label={t("filterByDoctor")}>
              <option value="all">{t("allDoctors")}</option>
              <option value={UNASSIGNED}>{t("notAssigned")}</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        ),
        filterFn: r =>
          doctorFilter === "all" ? true
            : doctorFilter === UNASSIGNED ? !r.doctor_id
              : r.doctor_id === doctorFilter,

        columns: [
          { key: "name", label: t("columns.name"), sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          {
            key: "doctor_id", label: t("columns.doctor"), sortable: true,
            accessor: r => r.doctors?.name ?? "",
            render: r => r.doctors
              ? <span>{r.doctors.name}</span>
              : <span className="text-muted-foreground">{t("notAssigned")}</span>,
          },
          { key: "shift", label: t("columns.shift"), sortable: true, accessor: r => r.shift, render: r => <span>{shifts.find(s => s.value === r.shift)?.label ?? r.shift}</span> },
          { key: "phone", label: t("columns.phone"), render: r => <span className="font-mono text-xs">{r.phone || "—"}</span> },
          { key: "email", label: t("columns.email"), render: r => <span className="text-xs">{r.email || "—"}</span> },
          { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
        ],

        fields: [
          { name: "name", label: t("fields.name"), type: "text", required: true },
          { name: "doctor_id", label: t("fields.doctor"), type: "select", options: doctorOptions },
          { name: "shift", label: t("fields.shift"), type: "select", options: shifts },
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
