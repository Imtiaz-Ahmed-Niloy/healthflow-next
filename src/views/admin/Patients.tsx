"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { ConfirmDialog, Modal } from "@/components/admin/crud";
import { invalidateResource } from "@/redux/api/createResourceApi";
import { useAppDispatch } from "@/redux/hooks";
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

  /**
   * Every patient saved here is given a login straight away: their mobile
   * number and a short password (api/v1/patients/[id]/login), shown once the
   * form closes so the desk can read it out. The key on each row shows it
   * again, or makes one for a patient who was added before this existed.
   */
  const dispatch = useAppDispatch();
  const [creds, setCreds] = useState<{ patient: string; login: string; password: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState<PatientRow | null>(null);

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(t("login.copied", { label }));
  };

  const createLogin = async (patient: PatientRow) => {
    setBusyId(patient.id);
    try {
      const res = await fetch(`/api/v1/patients/${patient.id}/login`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(t("login.createFailed"), { description: body?.error?.message ?? t("login.tryAgain") });
        return;
      }
      // Not a CRUD write on the row, so the cache has to be told profile_id
      // changed — otherwise the key would still offer to create a login.
      dispatch(invalidateResource("patients", patient.id));
      if (body.data?.linked) {
        toast.info(t("login.linked"), { description: t("login.linkedBody", { phone: body.data.login }) });
        return;
      }
      setCreds({ patient: patient.full_name, ...body.data });
    } catch {
      toast.error(t("login.createFailed"), { description: t("login.requestFailed") });
    } finally {
      setBusyId(null);
    }
  };

  const viewLogin = async (patient: PatientRow) => {
    setBusyId(patient.id);
    try {
      const res = await fetch(`/api/v1/patients/${patient.id}/login`);
      const body = await res.json();
      if (!res.ok) {
        if (body?.error?.code === "own_account") {
          toast.info(t("login.ownAccount"), { description: body.error.message });
          return;
        }
        toast.error(t("login.loadFailed"), { description: body?.error?.message ?? t("login.tryAgain") });
        return;
      }
      setCreds({ patient: patient.full_name, ...body.data });
    } catch {
      toast.error(t("login.loadFailed"), { description: t("login.requestFailed") });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<PatientRow> config={{
        storeKey: "patients",
        resource: "patients",
        exportName: "patients",
        addLabel: t("add"),
        onCreate: patient => void createLogin(patient),
        rowActions: r => (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              if (r.profile_id) void viewLogin(r);
              else setPendingCreate(r);
            }}
            disabled={busyId === r.id}
            title={r.profile_id ? t("login.view") : t("login.create")}
            className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 disabled:opacity-50">
            {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
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

      <ConfirmDialog
        open={!!pendingCreate}
        onClose={() => setPendingCreate(null)}
        onConfirm={() => pendingCreate && void createLogin(pendingCreate)}
        title={t("login.createTitle")}
        description={pendingCreate ? t("login.createBody", { name: pendingCreate.full_name }) : undefined}
      />

      <Modal
        open={!!creds}
        onClose={() => setCreds(null)}
        title={t("login.modalTitle")}
        footer={
          <button onClick={() => setCreds(null)}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">
            {t("login.done")}
          </button>
        }>
        {creds && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
              <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                {t.rich("login.intro", {
                  name: creds.patient,
                  b: chunks => <span className="font-semibold text-primary">{chunks}</span>,
                })}
              </p>
            </div>
            {[
              { label: t("login.phone"), value: creds.login },
              { label: t("login.password"), value: creds.password },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5 uppercase">{label}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted/40 rounded-lg px-3 py-2 text-sm font-mono break-all">{value}</code>
                  <button onClick={() => copy(value, label)}
                    className="p-2 rounded-lg border border-border hover:bg-muted" title={t("login.copy", { label })}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
};

export default Page;
