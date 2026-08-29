"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import type { EmployeeRow } from "@/redux/api/resources";

/**
 * The hospital's staff register (HF-68).
 *
 * Headed "Employees" rather than "Onboarding" because the row outlives
 * onboarding — payroll and attendance both read it. See 0039_employees.sql.
 *
 * Values are stored lowercase to match doctors, nurses, support staff, lab
 * tests, assets and pharmacy; the labels here are the only place they are
 * capitalised.
 */

const MARITAL_STATUSES = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

const RELIGIONS = [
  { value: "islam", label: "Islam" },
  { value: "hinduism", label: "Hinduism" },
  { value: "christianity", label: "Christianity" },
  { value: "buddhism", label: "Buddhism" },
  { value: "other", label: "Other" },
];

/** Not lowercased — a blood group is a printed medical value. */
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
  { value: "consultant", label: "Consultant" },
];

const JOB_STATUSES = [
  { value: "active", label: "Active" },
  { value: "probation", label: "Probation" },
  { value: "suspended", label: "Suspended" },
  { value: "terminated", label: "Terminated" },
  { value: "resigned", label: "Resigned" },
];

const DOCUMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

const ORIENTATION_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
];

const ONBOARDING_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

/** Common hospital departments. Free text in the database — see 0039. */
const DEPARTMENTS = ["Nursing", "Cardiology", "Neurology", "Maintenance", "Finance", "HR", "IT"];

const labelOf = (options: { value: string; label: string }[], value: string | null) =>
  options.find(o => o.value === value)?.label ?? value ?? "—";

const Page = () => (
  <AdminLayout title="Employees" subtitle="Onboard new employees: documents → orientation → activation">
    <ResourcePage<EmployeeRow>
      config={{
        storeKey: "hr-onboarding-v2",
        resource: "employees",
        addLabel: "Onboard New Employee",
        searchFields: ["emp_id", "name", "department", "designation", "phone", "email", "nid"],
        statuses: ONBOARDING_STATUSES,
        columns: [
          { key: "emp_id", label: "Emp ID", accessor: r => r.emp_id, render: r => <span className="font-mono text-xs">{r.emp_id}</span> },
          { key: "name", label: "Name", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          { key: "department", label: "Department", sortable: true, accessor: r => r.department ?? "" },
          { key: "designation", label: "Designation", render: r => r.designation ?? "—" },
          { key: "phone", label: "Phone", render: r => <span className="font-mono text-xs">{r.phone || "—"}</span> },
          { key: "email", label: "Email", render: r => <span className="text-xs">{r.email || "—"}</span> },
          { key: "employment_type", label: "Type", render: r => r.employment_type ? <Pill tone="info">{labelOf(EMPLOYMENT_TYPES, r.employment_type)}</Pill> : <span className="text-muted-foreground">—</span> },
          { key: "job_status", label: "Job", render: r => <Pill tone={statusTone(r.job_status)}>{labelOf(JOB_STATUSES, r.job_status)}</Pill> },
          { key: "gross_salary", label: "Salary", accessor: r => Number(r.gross_salary ?? 0), render: r => <span className="font-mono text-xs">{r.gross_salary ? `৳${Number(r.gross_salary).toLocaleString()}` : "—"}</span> },
          { key: "start_date", label: "Start", sortable: true, accessor: r => r.start_date ?? "" },
          { key: "documents_status", label: "Docs", render: r => <Pill tone={statusTone(r.documents_status)}>{labelOf(DOCUMENT_STATUSES, r.documents_status)}</Pill> },
          { key: "orientation_status", label: "Orientation", render: r => <Pill tone={statusTone(r.orientation_status)}>{labelOf(ORIENTATION_STATUSES, r.orientation_status)}</Pill> },
          { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{labelOf(ONBOARDING_STATUSES, r.status)}</Pill> },
        ],
        fields: [
          { name: "emp_id", label: "Employee ID", type: "text", required: true },
          { name: "name", label: "Full name", type: "text", required: true },
          { name: "father_name", label: "Father's name", type: "text" },
          { name: "mother_name", label: "Mother's name", type: "text" },
          { name: "marital_status", label: "Marital status", type: "select", options: MARITAL_STATUSES },
          { name: "religion", label: "Religion", type: "select", options: RELIGIONS },
          { name: "blood_group", label: "Blood group", type: "select", options: BLOOD_GROUPS },
          { name: "nid", label: "NID number", type: "text" },
          { name: "phone", label: "Phone number", type: "tel" },
          { name: "email", label: "Email", type: "email" },
          { name: "department", label: "Department", type: "select", options: DEPARTMENTS },
          { name: "designation", label: "Designation", type: "text" },
          { name: "employment_type", label: "Employment type", type: "select", options: EMPLOYMENT_TYPES },
          { name: "job_status", label: "Job status", type: "select", options: JOB_STATUSES },
          { name: "gross_salary", label: "Gross salary", type: "number", min: 0, numberStep: 0.01 },
          { name: "start_date", label: "Start date", type: "date" },
          { name: "end_date", label: "End date", type: "date" },
          { name: "present_address", label: "Present address", type: "textarea", fullWidth: true },
          { name: "permanent_address", label: "Permanent address", type: "textarea", fullWidth: true },
          { name: "documents_status", label: "Documents", type: "select", options: DOCUMENT_STATUSES },
          { name: "orientation_status", label: "Orientation", type: "select", options: ORIENTATION_STATUSES },
          { name: "status", label: "Status", type: "select", options: ONBOARDING_STATUSES },
        ],
      }}
    />
  </AdminLayout>
);

export default Page;
