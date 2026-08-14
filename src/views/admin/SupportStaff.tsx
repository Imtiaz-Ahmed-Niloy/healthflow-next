"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import type { SupportStaffRow } from "@/redux/api/resources";

/**
 * The five departments are a check constraint on the table, not a lookup — see
 * 0015_support_staff.sql. Adding a sixth means a migration, so this list and
 * the constraint have to be changed together.
 */
const DEPARTMENTS = ["Janitorial", "Security", "Maintenance", "Kitchen", "Transport"];

/**
 * Stored lowercase to match doctors, doctor assistants and nurses, so the value
 * in the database is not what a human should read. ResourcePage takes
 * { value, label } for exactly this.
 */
const STATUSES = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On Leave" },
  { value: "suspended", label: "Suspended" },
];

const statusLabel = (value: string) =>
  STATUSES.find(s => s.value === value)?.label ?? value;

const Page = () => {
  const [department, setDepartment] = useState("all");

  return (
    <AdminLayout title="Support Staff Management" subtitle="Manage non-clinical support personnel">
      <ResourcePage<SupportStaffRow> config={{
        storeKey: "support-staff",
        resource: "support-staff",
        exportName: "support-staff",
        addLabel: "Add Staff",

        searchFields: ["name", "department", "role", "phone", "email"],
        statuses: STATUSES,

        // Status is already a chip row, and a second one would crowd it. The
        // department pill matches the doctor filter on /admin/doctor-assistants.
        extraFilters: (
          <div className="inline-flex items-center gap-1.5 bg-muted/40 rounded-full pl-3 pr-1 py-0.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <select value={department} onChange={e => setDepartment(e.target.value)}
              className="h-7 bg-transparent text-xs outline-none pr-1" aria-label="Filter by department">
              <option value="all">All departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        ),
        filterFn: r => department === "all" || r.department === department,

        columns: [
          { key: "name", label: "Name", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          { key: "department", label: "Department", sortable: true, accessor: r => r.department },
          { key: "role", label: "Role", render: r => <span>{r.role || "—"}</span> },
          { key: "phone", label: "Phone", render: r => <span className="font-mono text-xs">{r.phone || "—"}</span> },
          { key: "email", label: "Email", render: r => <span className="text-xs">{r.email || "—"}</span> },
          { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
        ],

        fields: [
          { name: "name", label: "Full name", type: "text", required: true },
          // Required because the column is NOT NULL with no default. The select
          // always sends one, so this only ever fires for a non-form caller.
          { name: "department", label: "Department", type: "select", options: DEPARTMENTS, required: true },
          { name: "role", label: "Role", type: "text" },
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
