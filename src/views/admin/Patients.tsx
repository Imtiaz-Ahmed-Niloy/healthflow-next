"use client";

import { useTranslations } from "next-intl";
import { KeyRound, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { usePatientLogin } from "@/components/admin/usePatientLogin";
import type { PatientRow } from "@/redux/api/resources";
import { differenceInYears } from "date-fns";

/**
 * Mirrors patientCreateSchema (src/server/resources/patients.ts) exactly —
 * these are Postgres enums (0016_patients.sql), not free text, so the form
 * can only offer values the database actually accepts.
 */
const GENDERS = ["male", "female", "other"] as const;

/** Blood groups read the same in both languages, so they are not translated. */
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

const bloodGroupLabel = (value: string | null) =>
  BLOOD_GROUPS.find(b => b.value === value)?.label ?? "—";

/** date_of_birth is nullable — a patient registered without one has no age to show. */
const ageOf = (dob: string | null) =>
  dob ? differenceInYears(new Date(), new Date(dob)) : null;

const Page = () => {
  const t = useTranslations("admin.patients");
  const tr = useTranslations("rxSheet");
  const genderLabel = (value: string | null) =>
    value === "male" || value === "female" || value === "other" ? tr(`gender.${value}`) : "—";
  const genders = GENDERS.map(value => ({ value, label: tr(`gender.${value}`) }));

  // Every patient saved here is given a login straight away, shown once the
  // form closes. The key on each row shows it again, or makes one for a
  // patient who was added before logins existed. See usePatientLogin.
  const login = usePatientLogin();

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<PatientRow> config={{
        storeKey: "patients",
        resource: "patients",
        exportName: "patients",
        addLabel: t("add"),
        onCreate: patient => void login.create(patient),
        rowActions: r => (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              if (r.profile_id) void login.view(r);
              else login.ask(r);
            }}
            disabled={login.busyId === r.id}
            title={r.profile_id ? t("login.view") : t("login.create")}
            className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 disabled:opacity-50">
            {login.busyId === r.id ?<Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          </button>
        ),

        // mrn is trigger-generated (patients_set_mrn in 0016_patients.sql), so
        // it's searchable, but never a form field and not a column.
        searchFields: ["full_name", "mrn", "phone", "email"],

        columns: [
          { key: "full_name", label: t("columns.name"), sortable: true, accessor: r => r.full_name, render: r => <span className="font-semibold text-primary">{r.full_name}</span> },
          { key: "gender", label: t("columns.gender"), sortable: true, accessor: r => r.gender ?? "", render: r => genderLabel(r.gender) },
          { key: "date_of_birth", label: t("columns.age"), sortable: true, accessor: r => ageOf(r.date_of_birth) ?? -1, render: r => { const age = ageOf(r.date_of_birth); return age === null ? <span className="text-muted-foreground">—</span> : t("years", { count: age }); } },
          { key: "blood_group", label: t("columns.bloodGroup"), render: r => bloodGroupLabel(r.blood_group) },
          { key: "phone", label: t("columns.phone"), render: r => <span className="font-mono text-xs">{r.phone || "—"}</span> },
          { key: "email", label: t("columns.email"), render: r => <span className="text-xs">{r.email || "—"}</span> },
        ],

        fields: [
          { name: "phone", label: t("fields.phone"), type: "phone", required: true, autoFocus: true },
          { name: "full_name", label: t("fields.fullName"), type: "text", required: true },
          { name: "gender", label: t("fields.gender"), type: "select", options: genders, placeholder: t("fields.select") },
          { name: "date_of_birth", label: t("fields.dob"), type: "date" },
          { name: "blood_group", label: t("fields.bloodGroup"), type: "select", options: BLOOD_GROUPS, placeholder: t("fields.select") },
          { name: "email", label: t("fields.email"), type: "email" },
          { name: "address", label: t("fields.address"), type: "textarea", fullWidth: true },
          { name: "emergency_contact_name", label: t("fields.emergencyName"), type: "text" },
          { name: "emergency_contact_phone", label: t("fields.emergencyPhone"), type: "tel" },
        ],
      }} />

      {login.dialogs}
    </AdminLayout>
  );
};

export default Page;
