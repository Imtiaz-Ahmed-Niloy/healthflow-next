"use client";

import { useMemo, useState } from "react";
import { Stethoscope } from "lucide-react";
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
const STATUSES = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On Leave" },
  { value: "suspended", label: "Suspended" },
];

const statusLabel = (value: string) =>
  STATUSES.find(s => s.value === value)?.label ?? value;

/** Sentinel for the "not attached to any doctor" filter. Not a doctor id. */
const UNASSIGNED = "unassigned";

const Page = () => {
  const [doctorFilter, setDoctorFilter] = useState<string>("all");

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
    { value: "", label: isLoading ? "Loading doctors…" : "— Not assigned —" },
    ...doctors.map(d => ({
      value: d.id,
      label: d.specialty ? `${d.name} · ${d.specialty}` : d.name,
    })),
  ], [doctors, isLoading]);

  return (
    <AdminLayout title="Doctor Assistant Management" subtitle="Assign, schedule and manage doctor assistants">
      <ResourcePage<DoctorAssistantRow> config={{
        storeKey: "doctor-assistants",
        resource: "doctor-assistants",
        exportName: "doctor-assistants",
        addLabel: "Add Assistant",

        // The assigned doctor's name is not here: it lives on the embedded
        // `doctors` relation, and this search only reads top-level keys. The
        // dropdown below filters by doctor instead, which is the more useful
        // control anyway.
        searchFields: ["name", "phone", "email"],
        statuses: STATUSES,

        extraFilters: (
          <div className="inline-flex items-center gap-1.5 bg-muted/40 rounded-full pl-3 pr-1 py-0.5">
            <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
            <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}
              className="h-7 bg-transparent text-xs outline-none pr-1" aria-label="Filter by assigned doctor">
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
          { key: "name", label: "Name", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          {
            key: "doctor_id", label: "Assigned Doctor", sortable: true,
            accessor: r => r.doctors?.name ?? "",
            render: r => r.doctors
              ? <span>{r.doctors.name}</span>
              : <span className="text-muted-foreground">Not assigned</span>,
          },
          { key: "shift", label: "Shift", sortable: true, accessor: r => r.shift },
          { key: "phone", label: "Phone", render: r => <span className="font-mono text-xs">{r.phone || "—"}</span> },
          { key: "email", label: "Email", render: r => <span className="text-xs">{r.email || "—"}</span> },
          { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
        ],

        fields: [
          { name: "name", label: "Full name", type: "text", required: true },
          { name: "doctor_id", label: "Assigned doctor", type: "select", options: doctorOptions },
          { name: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "Night"] },
          { name: "phone", label: "Phone", type: "tel" },
          { name: "email", label: "Email", type: "email" },
          { name: "status", label: "Status", type: "select", options: STATUSES },
          { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
        ],
      }} />
    </AdminLayout>
  );
};

export default Page;
