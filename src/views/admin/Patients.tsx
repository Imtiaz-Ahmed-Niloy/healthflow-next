"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import type { PatientRow } from "@/redux/api/resources";
import { differenceInYears } from "date-fns";

/**
 * Mirrors patientCreateSchema (src/server/resources/patients.ts) exactly —
 * these are Postgres enums (0016_patients.sql), not free text, so the form
 * can only offer values the database actually accepts.
 */
const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const BLOOD_GROUPS = [
  { value: "o_positive", label: "O+" },
  { value: "o_negative", label: "O−" },
  { value: "a_positive", label: "A+" },
  { value: "a_negative", label: "A−" },
  { value: "b_positive", label: "B+" },
  { value: "b_negative", label: "B−" },
  { value: "ab_positive", label: "AB+" },
  { value: "ab_negative", label: "AB−" },
];

const genderLabel = (value: string | null) =>
  GENDERS.find(g => g.value === value)?.label ?? "—";

const bloodGroupLabel = (value: string | null) =>
  BLOOD_GROUPS.find(b => b.value === value)?.label ?? "—";

/** date_of_birth is nullable — a patient registered without one has no age to show. */
const ageOf = (dob: string | null) =>
  dob ? differenceInYears(new Date(), new Date(dob)) : null;

const Page = () => (
  <AdminLayout title="Patient Registry" subtitle="Hospital-wide patient records">
    <ResourcePage<PatientRow> config={{
      storeKey: "patients",
      resource: "patients",
      exportName: "patients",
      addLabel: "Add Patient",

      // mrn is trigger-generated (patients_set_mrn in 0016_patients.sql), so
      // it's searchable and shown, but never a form field.
      searchFields: ["full_name", "mrn", "phone", "email"],

      columns: [
        { key: "full_name", label: "Name", sortable: true, accessor: r => r.full_name, render: r => <span className="font-semibold text-primary">{r.full_name}</span> },
        { key: "mrn", label: "MRN", sortable: true, accessor: r => r.mrn, render: r => <span className="font-mono text-xs">{r.mrn}</span> },
        { key: "gender", label: "Gender", sortable: true, accessor: r => r.gender ?? "", render: r => genderLabel(r.gender) },
        { key: "date_of_birth", label: "Age", sortable: true, accessor: r => ageOf(r.date_of_birth) ?? -1, render: r => { const age = ageOf(r.date_of_birth); return age === null ? <span className="text-muted-foreground">—</span> : `${age}y`; } },
        { key: "blood_group", label: "Blood Group", render: r => bloodGroupLabel(r.blood_group) },
        { key: "phone", label: "Phone", render: r => <span className="font-mono text-xs">{r.phone || "—"}</span> },
        { key: "email", label: "Email", render: r => <span className="text-xs">{r.email || "—"}</span> },
      ],

      fields: [
        { name: "full_name", label: "Full name", type: "text", required: true },
        { name: "gender", label: "Gender", type: "select", options: GENDERS },
        { name: "date_of_birth", label: "Date of birth", type: "date" },
        { name: "blood_group", label: "Blood group", type: "select", options: BLOOD_GROUPS },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "email", label: "Email", type: "email" },
        { name: "address", label: "Address", type: "textarea", fullWidth: true },
        { name: "emergency_contact_name", label: "Emergency contact name", type: "text" },
        { name: "emergency_contact_phone", label: "Emergency contact phone", type: "tel" },
      ],
    }} />
  </AdminLayout>
);

export default Page;
