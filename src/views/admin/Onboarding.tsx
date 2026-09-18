"use client";

import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import type { EmployeeRow } from "@/redux/api/resources";

/**
 * The hospital's staff register (HF-68).
 *
 * Headed "Employees" rather than "Onboarding" because the row outlives
 * onboarding — payroll and attendance both read it. See 0039_employees.sql.
 *
 * Values are stored lowercase to match doctors, nurses, support staff, lab
 * tests, assets and pharmacy; the labels here are the only place they are
 * written out for a person, in that person's language.
 */

const MARITAL_STATUSES = ["single", "married", "divorced", "widowed"] as const;
const RELIGIONS = ["islam", "hinduism", "christianity", "buddhism", "other"] as const;

/** Not lowercased — a blood group is a printed medical value. */
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern", "consultant"] as const;
const JOB_STATUSES = ["active", "probation", "suspended", "terminated", "resigned"] as const;
const DOCUMENT_STATUSES = ["pending", "verified", "rejected"] as const;
const ORIENTATION_STATUSES = ["pending", "scheduled", "completed"] as const;
const ONBOARDING_STATUSES = ["pending", "in_progress", "completed"] as const;

/** Common hospital departments. Free text in the database — see 0039. */
const DEPARTMENTS = ["Nursing", "Cardiology", "Neurology", "Maintenance", "Finance", "HR", "IT"];

const Page = () => {
  const t = useTranslations("admin.employees");
  const { formatCurrency } = useFormatters();

  // A stored value's label, or the value itself when the row holds something
  // older than the list. One small function per group: the message key has to
  // be a literal for the key check to see it.
  const maritalLabel = (v: string | null) => (v && (MARITAL_STATUSES as readonly string[]).includes(v) ? t(`marital.${v as (typeof MARITAL_STATUSES)[number]}`) : v ?? "—");
  const religionLabel = (v: string | null) => (v && (RELIGIONS as readonly string[]).includes(v) ? t(`religions.${v as (typeof RELIGIONS)[number]}`) : v ?? "—");
  const typeLabel = (v: string | null) => (v && (EMPLOYMENT_TYPES as readonly string[]).includes(v) ? t(`employmentTypes.${v as (typeof EMPLOYMENT_TYPES)[number]}`) : v ?? "—");
  const jobLabel = (v: string | null) => (v && (JOB_STATUSES as readonly string[]).includes(v) ? t(`jobStatuses.${v as (typeof JOB_STATUSES)[number]}`) : v ?? "—");
  const docLabel = (v: string | null) => (v && (DOCUMENT_STATUSES as readonly string[]).includes(v) ? t(`documentStatuses.${v as (typeof DOCUMENT_STATUSES)[number]}`) : v ?? "—");
  const orientationLabel = (v: string | null) => (v && (ORIENTATION_STATUSES as readonly string[]).includes(v) ? t(`orientationStatuses.${v as (typeof ORIENTATION_STATUSES)[number]}`) : v ?? "—");
  const onboardingLabel = (v: string | null) => (v && (ONBOARDING_STATUSES as readonly string[]).includes(v) ? t(`onboardingStatuses.${v as (typeof ONBOARDING_STATUSES)[number]}`) : v ?? "—");

  const maritalOptions = MARITAL_STATUSES.map(value => ({ value, label: maritalLabel(value) }));
  const religionOptions = RELIGIONS.map(value => ({ value, label: religionLabel(value) }));
  const typeOptions = EMPLOYMENT_TYPES.map(value => ({ value, label: typeLabel(value) }));
  const jobOptions = JOB_STATUSES.map(value => ({ value, label: jobLabel(value) }));
  const docOptions = DOCUMENT_STATUSES.map(value => ({ value, label: docLabel(value) }));
  const orientationOptions = ORIENTATION_STATUSES.map(value => ({ value, label: orientationLabel(value) }));
  const onboardingOptions = ONBOARDING_STATUSES.map(value => ({ value, label: onboardingLabel(value) }));

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<EmployeeRow>
        config={{
          storeKey: "hr-onboarding-v2",
          resource: "employees",
          addLabel: t("add"),
          searchFields: ["emp_id", "name", "department", "designation", "phone", "email", "nid"],
          statuses: onboardingOptions,
          columns: [
            { key: "emp_id", label: t("columns.empId"), accessor: r => r.emp_id, render: r => <span className="font-mono text-xs">{r.emp_id}</span> },
            { key: "name", label: t("columns.name"), sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
            { key: "department", label: t("columns.department"), sortable: true, accessor: r => r.department ?? "" },
            { key: "designation", label: t("columns.designation"), render: r => r.designation ?? "—" },
            { key: "phone", label: t("columns.phone"), render: r => <span className="font-mono text-xs">{r.phone || "—"}</span> },
            { key: "email", label: t("columns.email"), render: r => <span className="text-xs">{r.email || "—"}</span> },
            { key: "employment_type", label: t("columns.type"), render: r => r.employment_type ? <Pill tone="info">{typeLabel(r.employment_type)}</Pill> : <span className="text-muted-foreground">—</span> },
            { key: "job_status", label: t("columns.job"), render: r => <Pill tone={statusTone(r.job_status)}>{jobLabel(r.job_status)}</Pill> },
            { key: "gross_salary", label: t("columns.salary"), accessor: r => Number(r.gross_salary ?? 0), render: r => <span className="font-mono text-xs">{r.gross_salary ? formatCurrency(Number(r.gross_salary)) : "—"}</span> },
            { key: "start_date", label: t("columns.start"), sortable: true, accessor: r => r.start_date ?? "" },
            { key: "documents_status", label: t("columns.docs"), render: r => <Pill tone={statusTone(r.documents_status)}>{docLabel(r.documents_status)}</Pill> },
            { key: "orientation_status", label: t("columns.orientation"), render: r => <Pill tone={statusTone(r.orientation_status)}>{orientationLabel(r.orientation_status)}</Pill> },
            { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{onboardingLabel(r.status)}</Pill> },
          ],
          fields: [
            { name: "emp_id", label: t("fields.empId"), type: "text", required: true },
            { name: "name", label: t("fields.name"), type: "text", required: true },
            { name: "father_name", label: t("fields.fatherName"), type: "text" },
            { name: "mother_name", label: t("fields.motherName"), type: "text" },
            { name: "marital_status", label: t("fields.marital"), type: "select", options: maritalOptions },
            { name: "religion", label: t("fields.religion"), type: "select", options: religionOptions },
            { name: "blood_group", label: t("fields.bloodGroup"), type: "select", options: BLOOD_GROUPS },
            { name: "nid", label: t("fields.nid"), type: "text" },
            { name: "phone", label: t("fields.phone"), type: "tel" },
            { name: "email", label: t("fields.email"), type: "email" },
            { name: "department", label: t("fields.department"), type: "select", options: DEPARTMENTS },
            { name: "designation", label: t("fields.designation"), type: "text" },
            { name: "employment_type", label: t("fields.employmentType"), type: "select", options: typeOptions },
            { name: "job_status", label: t("fields.jobStatus"), type: "select", options: jobOptions },
            { name: "gross_salary", label: t("fields.grossSalary"), type: "number", min: 0, numberStep: 0.01 },
            { name: "start_date", label: t("fields.startDate"), type: "date" },
            { name: "end_date", label: t("fields.endDate"), type: "date" },
            { name: "present_address", label: t("fields.presentAddress"), type: "textarea", fullWidth: true },
            { name: "permanent_address", label: t("fields.permanentAddress"), type: "textarea", fullWidth: true },
            { name: "documents_status", label: t("fields.documents"), type: "select", options: docOptions },
            { name: "orientation_status", label: t("fields.orientation"), type: "select", options: orientationOptions },
            { name: "status", label: t("fields.status"), type: "select", options: onboardingOptions },
          ],
        }}
      />
    </AdminLayout>
  );
};

export default Page;
