"use client";

import { useMemo, useState } from "react";
import { Stethoscope } from "lucide-react";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { doctorsApi, patientsApi, type AppointmentRow } from "@/redux/api/resources";
import { useBookingClock, useFormatters } from "@/lib/appSettings";

/**
 * Mirrors appointment_status (0020_appointments.sql) exactly — the mock this
 * replaced had the same three statuses, nothing added.
 */
const STATUSES = ["scheduled", "completed", "cancelled"] as const;

/** Sentinel for the "not attached to any doctor" filter. Not a doctor id. */
const UNASSIGNED = "unassigned";

const Page = () => {
  const t = useTranslations("admin.appointments");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const clock = useBookingClock();
  const { formatDate } = useFormatters();

  const statusLabel = (value: string) =>
    (STATUSES as readonly string[]).includes(value)
      ? t(`statuses.${value as (typeof STATUSES)[number]}`)
      : value;
  const statuses = STATUSES.map(value => ({ value, label: statusLabel(value) }));

  // Both lists are small enough to load whole; patients feeds the form's
  // picker, doctors feeds both the form's picker and the filter above the
  // table — same pattern as DoctorAssistants.tsx.
  const { data: patientsData, isLoading: patientsLoading } = patientsApi.useList({ limit: 100 });
  const patients = useMemo(() => patientsData?.data ?? [], [patientsData]);

  const { data: doctorsData, isLoading: doctorsLoading } = doctorsApi.useList({ limit: 100 });
  const doctors = useMemo(() => doctorsData?.data ?? [], [doctorsData]);

  const patientOptions = useMemo(() => [
    { value: "", label: patientsLoading ? t("loadingPatients") : t("selectPatient") },
    ...patients.map(p => ({ value: p.id, label: `${p.full_name} (${p.mrn})` })),
  ], [patients, patientsLoading, t]);

  /**
   * The blank option comes first and carries the empty string, so a new
   * appointment defaults to unassigned and an existing one whose doctor_id is
   * null lands on it rather than silently adopting the first doctor in the
   * list.
   */
  const doctorOptions = useMemo(() => [
    { value: "", label: doctorsLoading ? t("loadingDoctors") : t("notAssignedOption") },
    ...doctors.map(d => ({
      value: d.id,
      label: d.specialty ? `${d.name} · ${d.specialty}` : d.name,
    })),
  ], [doctors, doctorsLoading, t]);

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<AppointmentRow> config={{
        storeKey: "appointments",
        resource: "appointments",
        exportName: "appointments",
        addLabel: t("add"),

        // Patient/doctor names live on embedded relations — PostgREST's `or`
        // filter can't reach into those, so this only searches the two real
        // top-level text columns. The doctor filter below covers the rest.
        searchFields: ["department", "notes"],
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
          {
            key: "patient_id", label: t("columns.patient"), sortable: true,
            accessor: r => r.patients?.full_name ?? "",
            render: r => r.patients
              ? <span className="font-semibold text-primary">{r.patients.full_name}</span>
              : <span className="text-muted-foreground">{t("unknownPatient")}</span>,
          },
          {
            key: "doctor_id", label: t("columns.doctor"), sortable: true,
            accessor: r => r.doctors?.name ?? "",
            render: r => r.doctors
              ? <span>{r.doctors.name}</span>
              : <span className="text-muted-foreground">{t("notAssigned")}</span>,
          },
          { key: "department", label: t("columns.department"), render: r => r.department || "—" },
          {
            key: "scheduled_date", label: t("columns.date"), sortable: true, accessor: r => r.scheduled_date,
            render: r => formatDate(r.scheduled_date),
          },
          // HH:mm:ss from Postgres' time column — trimmed to HH:mm for display.
          { key: "scheduled_time", label: t("columns.time"), render: r => r.scheduled_time.slice(0, 5) },
          { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
        ],

        fields: [
          { name: "patient_id", label: t("fields.patient"), type: "select", options: patientOptions, required: true },
          { name: "doctor_id", label: t("fields.doctor"), type: "select", options: doctorOptions },
          { name: "department", label: t("fields.department"), type: "text" },
          // Not before today on the hospital's calendar (global settings). An
          // existing appointment keeps its own date as the floor — see minFor.
          { name: "scheduled_date", label: t("fields.date"), type: "date", required: true, min: clock.today },
          { name: "scheduled_time", label: t("fields.time"), type: "time", required: true },
          { name: "status", label: t("fields.status"), type: "select", options: statuses },
          { name: "notes", label: t("fields.notes"), type: "textarea", fullWidth: true },
        ],
      }} />
    </AdminLayout>
  );
};

export default Page;
