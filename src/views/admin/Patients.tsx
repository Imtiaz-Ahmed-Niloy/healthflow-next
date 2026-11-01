"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, Loader2, Activity, CalendarPlus, BedDouble } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { usePatientLogin } from "@/components/admin/usePatientLogin";
import { Patient360Modal } from "@/components/admin/Patient360Modal";
import { QuickBookAppointmentModal } from "@/components/admin/QuickBookAppointmentModal";
import { QuickAdmitPatientModal } from "@/components/admin/QuickAdmitPatientModal";
import { DateRangeFilterPopover, type DateFilterPreset } from "@/components/portal/DateRangeFilterPopover";
import { useFormatters } from "@/lib/appSettings";
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
  const { formatDate } = useFormatters();
  const [selected360Patient, setSelected360Patient] = useState<PatientRow | null>(null);
  const [apptPatient, setApptPatient] = useState<PatientRow | null>(null);
  const [admitPatient, setAdmitPatient] = useState<PatientRow | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

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
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setApptPatient(r);
              }}
              title="Book Appointment"
              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer">
              <CalendarPlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setAdmitPatient(r);
              }}
              title="Admit to Ward / Cabin"
              className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer">
              <BedDouble className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setSelected360Patient(r);
              }}
              title="Patient 360° EMR & Medical Record"
              className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors cursor-pointer">
              <Activity className="h-4 w-4" />
            </button>
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
              {login.busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            </button>
          </div>
        ),

        // mrn is trigger-generated (patients_set_mrn in 0016_patients.sql), so
        // it's searchable, but never a form field and not a column.
        searchFields: ["full_name", "mrn", "phone", "email"],

        extraFilters: (
          <DateRangeFilterPopover
            value={dateFilter}
            onChange={setDateFilter}
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            onReset={() => {
              setDateFilter("all");
              setStartDate("");
              setEndDate("");
            }}
            presets={[
              { key: "all", label: "All Dates", hint: "All registrations" },
              { key: "today", label: "Today", hint: "Registered today" },
              { key: "yesterday", label: "Yesterday", hint: "Registered yesterday" },
              { key: "last7days", label: "Last 7 Days", hint: "Past 7 days" },
              { key: "thisMonth", label: "This Month", hint: "Current month" },
              { key: "custom", label: "Custom Range", hint: "Pick date range" },
            ]}
          />
        ),

        filterFn: (r) => {
          if (dateFilter === "all" && !startDate && !endDate) return true;
          const regDate = r.created_at ? r.created_at.slice(0, 10) : "";
          if (!regDate) return true;

          const now = new Date();
          const todayStr = toLocalDateStr(now);
          const yesterdayStr = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
          const sevenDaysAgoStr = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
          const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
          const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const monthEndStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

          if (dateFilter === "today") {
            return regDate === todayStr;
          } else if (dateFilter === "yesterday") {
            return regDate === yesterdayStr;
          } else if (dateFilter === "last7days") {
            return regDate >= sevenDaysAgoStr && regDate <= todayStr;
          } else if (dateFilter === "thisMonth") {
            return regDate >= monthStartStr && regDate <= monthEndStr;
          } else if (dateFilter === "custom") {
            if (startDate && regDate < startDate) return false;
            if (endDate && regDate > endDate) return false;
            return true;
          }
          return true;
        },

        columns: [
          {
            key: "created_at",
            label: "Registered",
            sortable: true,
            accessor: r => r.created_at ?? "",
            render: r => r.created_at ? (
              <span className="text-xs text-muted-foreground font-mono">
                {formatDate(r.created_at)}
              </span>
            ) : <span className="text-muted-foreground">—</span>,
          },
          {
            key: "full_name",
            label: t("columns.name"),
            sortable: true,
            accessor: r => r.full_name,
            render: r => (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setSelected360Patient(r);
                }}
                className="font-semibold text-primary hover:underline text-left cursor-pointer"
                title="Click to view Patient 360° EMR"
              >
                {r.full_name}
              </button>
            ),
          },
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

      {selected360Patient && (
        <Patient360Modal
          patient={selected360Patient}
          onClose={() => setSelected360Patient(null)}
        />
      )}

      {apptPatient && (
        <QuickBookAppointmentModal
          patient={apptPatient}
          onClose={() => setApptPatient(null)}
        />
      )}

      {admitPatient && (
        <QuickAdmitPatientModal
          patient={admitPatient}
          onClose={() => setAdmitPatient(null)}
        />
      )}
    </AdminLayout>
  );
};

export default Page;
