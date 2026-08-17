"use client";

import { useMemo, useState } from "react";
import { Stethoscope } from "lucide-react";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { doctorsApi, patientsApi, type AppointmentRow } from "@/redux/api/resources";

/**
 * Mirrors appointment_status (0020_appointments.sql) exactly — the mock this
 * replaced had the same three statuses, nothing added.
 */
const STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusLabel = (value: string) =>
  STATUSES.find(s => s.value === value)?.label ?? value;

/** Sentinel for the "not attached to any doctor" filter. Not a doctor id. */
const UNASSIGNED = "unassigned";

const Page = () => {
  const [doctorFilter, setDoctorFilter] = useState<string>("all");

  // Both lists are small enough to load whole; patients feeds the form's
  // picker, doctors feeds both the form's picker and the filter above the
  // table — same pattern as DoctorAssistants.tsx.
  const { data: patientsData, isLoading: patientsLoading } = patientsApi.useList({ limit: 100 });
  const patients = useMemo(() => patientsData?.data ?? [], [patientsData]);

  const { data: doctorsData, isLoading: doctorsLoading } = doctorsApi.useList({ limit: 100 });
  const doctors = useMemo(() => doctorsData?.data ?? [], [doctorsData]);

  const patientOptions = useMemo(() => [
    { value: "", label: patientsLoading ? "Loading patients…" : "— Select a patient —" },
    ...patients.map(p => ({ value: p.id, label: `${p.full_name} (${p.mrn})` })),
  ], [patients, patientsLoading]);

  /**
   * The blank option comes first and carries the empty string, so a new
   * appointment defaults to unassigned and an existing one whose doctor_id is
   * null lands on it rather than silently adopting the first doctor in the
   * list.
   */
  const doctorOptions = useMemo(() => [
    { value: "", label: doctorsLoading ? "Loading doctors…" : "— Not assigned —" },
    ...doctors.map(d => ({
      value: d.id,
      label: d.specialty ? `${d.name} · ${d.specialty}` : d.name,
    })),
  ], [doctors, doctorsLoading]);

  return (
    <AdminLayout title="Appointment Management" subtitle="Hospital-wide booking queue">
      <ResourcePage<AppointmentRow> config={{
        storeKey: "appointments",
        resource: "appointments",
        exportName: "appointments",
        addLabel: "Add Appointment",

        // Patient/doctor names live on embedded relations — PostgREST's `or`
        // filter can't reach into those, so this only searches the two real
        // top-level text columns. The doctor filter below covers the rest.
        searchFields: ["department", "notes"],
        statuses: STATUSES,

        extraFilters: (
          <div className="inline-flex items-center gap-1.5 bg-muted/40 rounded-full pl-3 pr-1 py-0.5">
            <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
            <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}
              className="h-7 bg-transparent text-xs outline-none pr-1" aria-label="Filter by doctor">
              <option value="all">All doctors</option>
              <option value={UNASSIGNED}>Not assigned</option>
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
            key: "patient_id", label: "Patient", sortable: true,
            accessor: r => r.patients?.full_name ?? "",
            render: r => r.patients
              ? <span className="font-semibold text-primary">{r.patients.full_name}</span>
              : <span className="text-muted-foreground">Unknown patient</span>,
          },
          {
            key: "doctor_id", label: "Doctor", sortable: true,
            accessor: r => r.doctors?.name ?? "",
            render: r => r.doctors
              ? <span>{r.doctors.name}</span>
              : <span className="text-muted-foreground">Not assigned</span>,
          },
          { key: "department", label: "Department", render: r => r.department || "—" },
          {
            key: "scheduled_date", label: "Date", sortable: true, accessor: r => r.scheduled_date,
            render: r => format(new Date(`${r.scheduled_date}T00:00:00`), "MMM d, yyyy"),
          },
          // HH:mm:ss from Postgres' time column — trimmed to HH:mm for display.
          { key: "scheduled_time", label: "Time", render: r => r.scheduled_time.slice(0, 5) },
          { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
        ],

        fields: [
          { name: "patient_id", label: "Patient", type: "select", options: patientOptions, required: true },
          { name: "doctor_id", label: "Doctor", type: "select", options: doctorOptions },
          { name: "department", label: "Department", type: "text" },
          { name: "scheduled_date", label: "Date", type: "date", required: true },
          { name: "scheduled_time", label: "Time", type: "time", required: true },
          { name: "status", label: "Status", type: "select", options: STATUSES },
          { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
        ],
      }} />
    </AdminLayout>
  );
};

export default Page;
