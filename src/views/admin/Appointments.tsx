"use client";

import { useMemo, useState } from "react";
import { Calendar, Stethoscope, Globe, UserCheck, Building2, Layers } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatTime as displayTime } from "@/lib/hours";
import { availabilityLabel, describeSchedule, outsideAvailabilityReason, parseAvailability } from "@/lib/availability";
import { mediaUrl } from "@/lib/media";
import type { Locale } from "@/i18n/config";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Avatar } from "@/components/common/Avatar";
import { FormHeading, ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { toast } from "sonner";
import { Field, statusTone } from "@/components/admin/crud";
import { NEW_PATIENT_NAME, NEW_PATIENT_PHONE, NEW_PATIENT_GENDER, NEW_PATIENT_DOB, NEW_PATIENT_BLOOD_GROUP, PatientByPhoneField } from "@/components/admin/PatientByPhoneField";
import { usePatientLogin } from "@/components/admin/usePatientLogin";
import { SearchSelect } from "@/components/common/SearchSelect";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { DateRangeFilterPopover, type DateFilterPreset } from "@/components/portal/DateRangeFilterPopover";
import { useCreateResourceMutation } from "@/redux/api/createResourceApi";
import { doctorsApi, type AppointmentRow, type DoctorRow, type PatientRow } from "@/redux/api/resources";
import { useBookingClock, useFormatters } from "@/lib/appSettings";

/**
 * Mirrors appointment_status (0020_appointments.sql) exactly — the mock this
 * replaced had the same three statuses, nothing added.
 */
const STATUSES = ["scheduled", "completed", "cancelled"] as const;

/** Sentinel for the "not attached to any doctor" filter. Not a doctor id. */
const UNASSIGNED = "unassigned";

export type BookingSource = "patient_portal" | "doctor_walk_in" | "hospital_admin";

export const getBookingSource = (row: AppointmentRow): BookingSource => {
  if (row.booking_source === "patient_portal" || row.booking_source === "doctor_walk_in" || row.booking_source === "hospital_admin") {
    return row.booking_source;
  }
  if (row.walk_in) {
    return "doctor_walk_in";
  }
  if (row.patients?.profile_id) {
    return "patient_portal";
  }
  return "hospital_admin";
};

/** The admin forms' input look (components/admin/crud), on a SearchSelect. */
const TRIGGER = "w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm";

/** What the form posts beside its fields; the page reads them on save (beforeSave). */
const SLOT_PROBLEM = "slot_problem";

/**
 * Who the patient sees, and when — one piece, because the second depends on
 * the first. The same rules as booking from a doctor's own page
 * (BookAppointmentDialog): the doctor's card shows their days and hours, the
 * picker greys out everything outside them, and a slot that is outside, or
 * already past on the hospital's clock, is said under the field and cannot be
 * saved.
 *
 * The doctor list can be typed into, and narrowed by department — a doctor's
 * specialty. Nothing picked posts "", which the API reads as "not assigned
 * yet", and then only the clock limits the time.
 *
 * An appointment opened to edit is not judged again until its doctor or time
 * is changed: last week's visit still has to be markable as completed.
 */
const DoctorAndSchedule = ({ doctors, loading, row, use24h }: {
  doctors: DoctorRow[]; loading: boolean; row: AppointmentRow | null; use24h: boolean;
}) => {
  const t = useTranslations("admin.appointments");
  const tb = useTranslations("booking");
  const locale = useLocale() as Locale;
  const clock = useBookingClock();

  const initialDoctor = row?.doctor_id ?? "";
  const initialWhen = row ? `${row.scheduled_date} ${row.scheduled_time.slice(0, 5)}` : "";
  const [doctorId, setDoctorId] = useState(initialDoctor);
  const [department, setDepartment] = useState("");
  const [when, setWhen] = useState(initialWhen);
  const [date = "", time = ""] = when.split(" ");

  const departments = useMemo(
    () => [...new Set(doctors.map(d => d.specialty?.trim()).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b)),
    [doctors],
  );

  const pickDepartment = (next: string) => {
    setDepartment(next);
    // A doctor from another department is no longer on the list.
    if (next && doctors.find(d => d.id === doctorId)?.specialty?.trim() !== next) setDoctorId("");
  };

  const doctor = doctors.find(d => d.id === doctorId) ?? null;
  // Their days and hours (null when they can't be read, and then nothing is
  // refused on their account).
  const schedule = useMemo(() => parseAvailability(doctor?.availability), [doctor]);
  const hours = availabilityLabel(doctor?.availability, locale);

  const untouched = !!row && doctorId === initialDoctor && when === initialWhen;
  const problem = untouched || !date
    ? null
    : outsideAvailabilityReason(schedule, date, time, doctor?.name, locale) ?? (time ? clock.pastSlotReason(date, time) : null);

  // The earliest the picker offers: now for a new visit, and for an existing
  // one the day it was already on, if that is behind us.
  const notBefore = row
    ? `${row.scheduled_date < clock.today ? row.scheduled_date : clock.today} 00:00`
    : `${clock.today} ${clock.nowTime}`;

  return (
    <>
      <input type="hidden" name="doctor_id" value={doctorId} />
      <input type="hidden" name="scheduled_date" value={date} />
      <input type="hidden" name="scheduled_time" value={time} />
      <input type="hidden" name={SLOT_PROBLEM} value={problem ?? ""} />

      <div className="grid grid-cols-2 gap-x-4">
        <Field label={t("departmentLabel")}>
          <SearchSelect value={department} onChange={pickDepartment} className={TRIGGER}
            options={departments.map(d => ({ value: d, label: d }))}
            allLabel={t("allDepartments")} aria-label={t("departmentLabel")} />
        </Field>
        <Field label={t("fields.doctor")}>
          <SearchSelect value={doctorId} onChange={setDoctorId} className={TRIGGER}
            options={doctors
              .filter(d => !department || d.specialty?.trim() === department)
              // The department is already said beside it once one is picked.
              .map(d => ({ value: d.id, label: d.specialty && !department ? `${d.name} · ${d.specialty}` : d.name, keywords: d.specialty ? [d.specialty] : undefined }))}
            allLabel={loading ? t("loadingDoctors") : t("notAssignedOption")}
            searchPlaceholder={t("searchDoctor")} aria-label={t("fields.doctor")} />
        </Field>
      </div>

      {doctor && (
        <div className="flex items-center gap-3 rounded-xl bg-chip/40 p-3 mb-4">
          <Avatar src={mediaUrl(doctor.photo_url)} name={doctor.name} className="h-12 w-12 text-base" />
          <div className="min-w-0">
            <p className="font-semibold text-primary text-sm">{doctor.name}</p>
            {doctor.specialty && <p className="text-xs text-primary-glow">{doctor.specialty}</p>}
            <p className="text-xs text-foreground/70 mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" /> {hours ? tb("available", { hours }) : tb("hoursNotSet")}
            </p>
          </div>
        </div>
      )}

      <FormHeading label={t("sections.schedule")} />
      <Field label={t("fields.dateTime")} required error={problem ?? undefined}
        hint={doctor && schedule ? tb("seesPatients", { doctor: doctor.name, schedule: describeSchedule(schedule, locale) }) : undefined}>
        <DateTimePicker value={when} onChange={setWhen} error={!!problem} disableBefore={notBefore}
          isSlotDisabled={(d, tm) => !!outsideAvailabilityReason(schedule, d, tm ?? "")}
          displayFormat={use24h ? "MMMM dd, yyyy '@' HH:mm" : undefined} />
      </Field>
    </>
  );
};

const Page = () => {
  const t = useTranslations("admin.appointments");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const { formatDate, settings } = useFormatters();
  const locale = useLocale() as Locale;
  // The clock the platform's settings ask for (/super/global-settings).
  const use24h = settings.timeFormat === "24h";

  const statusLabel = (value: string) =>
    (STATUSES as readonly string[]).includes(value)
      ? t(`statuses.${value as (typeof STATUSES)[number]}`)
      : value;
  const statuses = STATUSES.map(value => ({ value, label: statusLabel(value) }));

  // Small enough to load whole: feeds the form's doctor picker and the filter
  // above the table. The patient is found by their number instead — see
  // PatientByPhoneField — and one added there gets a login like any other.
  const { data: doctorsData, isLoading: doctorsLoading } = doctorsApi.useList({ limit: 100 });
  const doctors = useMemo(() => doctorsData?.data ?? [], [doctorsData]);
  const login = usePatientLogin();
  const tp = useTranslations("admin.patients.lookup");
  const [createPatient] = useCreateResourceMutation();

  /**
   * A number nobody has yet: the name typed beside it becomes a patient
   * first, and the appointment is saved against them. If the appointment is
   * then refused the patient stays — the number finds them on the next try.
   */
  const beforeSave = async (values: Record<string, unknown>, form: FormData) => {
    // Checked first, so a patient is never added for a visit that can't be.
    values.scheduled_date = String(form.get("scheduled_date") ?? "");
    values.scheduled_time = String(form.get("scheduled_time") ?? "");
    if (!values.scheduled_date || !values.scheduled_time) {
      toast.error(t("dateTimeRequired"));
      return false;
    }
    // Outside the doctor's hours, or already past — DoctorAndSchedule says which.
    const slotProblem = String(form.get(SLOT_PROBLEM) ?? "");
    if (slotProblem) {
      toast.error(slotProblem);
      return false;
    }
    if (values.patient_id) return true;
    const full_name = String(form.get(NEW_PATIENT_NAME) ?? "").trim();
    const phone = String(form.get(NEW_PATIENT_PHONE) ?? "");
    if (!full_name || !phone) {
      toast.error(tp("required"));
      return false;
    }
    const gender = String(form.get(NEW_PATIENT_GENDER) ?? "").trim() || undefined;
    const date_of_birth = String(form.get(NEW_PATIENT_DOB) ?? "").trim() || undefined;
    const blood_group = String(form.get(NEW_PATIENT_BLOOD_GROUP) ?? "").trim() || undefined;

    try {
      const body: Record<string, unknown> = { full_name, phone };
      if (gender) body.gender = gender;
      if (date_of_birth) body.date_of_birth = date_of_birth;
      if (blood_group) body.blood_group = blood_group;

      const result = await createPatient({ resource: "patients", body }).unwrap();
      const patient = result.data as PatientRow;
      values.patient_id = patient.id;
      void login.create(patient);
      return true;
    } catch (cause) {
      const message = (cause as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(tp("saveFailed"), { description: message });
      return false;
    }
  };

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<AppointmentRow> config={{
        storeKey: "appointments",
        resource: "appointments",
        exportName: "appointments",
        addLabel: t("add"),
        beforeSubmit: beforeSave,

        // Patient/doctor names live on embedded relations — PostgREST's `or`
        // filter can't reach into those, so this only searches the two real
        // top-level text columns. The doctor filter below covers the rest.
        searchFields: ["department", "notes"],
        statuses,

        extraFilters: (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-muted/40 rounded-full pl-3 pr-1 py-0.5">
              <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
              <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}
                className="h-7 bg-transparent text-xs outline-none pr-1 cursor-pointer font-medium" aria-label={t("filterByDoctor")}>
                <option value="all">{t("allDoctors")}</option>
                <option value={UNASSIGNED}>{t("notAssigned")}</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-muted/40 rounded-full pl-3 pr-1 py-0.5">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="h-7 bg-transparent text-xs outline-none pr-1 cursor-pointer font-medium"
                aria-label={t("filters.filterBySource")}>
                <option value="all">{t("filters.allSources")}</option>
                <option value="patient_portal">{t("filters.patientPortal")}</option>
                <option value="doctor_walk_in">{t("filters.doctorWalkIn")}</option>
                <option value="hospital_admin">{t("filters.hospitalAdmin")}</option>
              </select>
            </div>
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
                { key: "all", label: "All Dates", hint: "Full schedule" },
                { key: "today", label: "Today", hint: "Today's visits" },
                { key: "tomorrow", label: "Tomorrow", hint: "Next day's visits" },
                { key: "upcoming", label: "Upcoming", hint: "From today onward" },
                { key: "yesterday", label: "Yesterday", hint: "Past visits" },
                { key: "last7days", label: "Last 7 Days", hint: "Past 7 days" },
                { key: "thisMonth", label: "This Month", hint: "Entire month" },
                { key: "custom", label: "Custom Range", hint: "Pick date range" },
              ]}
            />
          </div>
        ),
        filterFn: (r) => {
          const doctorMatch =
            doctorFilter === "all"
              ? true
              : doctorFilter === UNASSIGNED
              ? !r.doctor_id
              : r.doctor_id === doctorFilter;
          if (!doctorMatch) return false;

          if (sourceFilter !== "all") {
            const src = getBookingSource(r);
            if (src !== sourceFilter) return false;
          }

          if (dateFilter === "all" && !startDate && !endDate) return true;

          const apptDate = r.scheduled_date ? r.scheduled_date.slice(0, 10) : "";
          if (!apptDate) return true;

          const now = new Date();
          const todayStr = toLocalDateStr(now);
          const tomorrowStr = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
          const yesterdayStr = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
          const sevenDaysAgoStr = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
          const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
          const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const monthEndStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

          if (dateFilter === "today") {
            return apptDate === todayStr;
          } else if (dateFilter === "tomorrow") {
            return apptDate === tomorrowStr;
          } else if (dateFilter === "upcoming") {
            return apptDate >= todayStr;
          } else if (dateFilter === "yesterday") {
            return apptDate === yesterdayStr;
          } else if (dateFilter === "last7days") {
            return apptDate >= sevenDaysAgoStr && apptDate <= todayStr;
          } else if (dateFilter === "thisMonth") {
            return apptDate >= monthStartStr && apptDate <= monthEndStr;
          } else if (dateFilter === "custom") {
            if (startDate && apptDate < startDate) return false;
            if (endDate && apptDate > endDate) return false;
            return true;
          }
          return true;
        },

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
          // The form no longer asks for one: the doctor's specialty stands in.
          { key: "department", label: t("columns.department"), render: r => r.department || r.doctors?.specialty || "—" },
          {
            key: "scheduled_date", label: t("columns.date"), sortable: true, accessor: r => r.scheduled_date,
            render: r => formatDate(r.scheduled_date),
          },
          // HH:mm:ss from Postgres' time column, shown on the settings' clock.
          { key: "scheduled_time", label: t("columns.time"), render: r => use24h ? r.scheduled_time.slice(0, 5) : displayTime(r.scheduled_time, locale) },
          { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
          {
            key: "source",
            label: t("columns.source"),
            sortable: true,
            accessor: r => getBookingSource(r),
            render: r => {
              const src = getBookingSource(r);
              if (src === "patient_portal") {
                return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40" title={t("sources.patient_portal_desc")}>
                    <Globe className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>{t("sources.patient_portal")}</span>
                  </span>
                );
              }
              if (src === "doctor_walk_in") {
                return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40" title={t("sources.doctor_walk_in_desc")}>
                    <UserCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{t("sources.doctor_walk_in")}</span>
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40" title={t("sources.hospital_admin_desc")}>
                  <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{t("sources.hospital_admin")}</span>
                </span>
              );
            },
          },
        ],

        fields: [
          { name: "section_patient", label: t("sections.patient"), type: "heading" },
          {
            name: "patient_id", label: t("fields.patient"), type: "custom", bare: true,
            render: editing => (
              <PatientByPhoneField key={String(editing?.id ?? "new")} name="patient_id" autoFocus
                defaultPatient={(editing as AppointmentRow | null)?.patients ?? null} />
            ),
          },
          { name: "section_doctor", label: t("sections.doctor"), type: "heading" },
          // The doctor, and the Schedule section under it: the date and time
          // are held to the doctor's hours, so they are drawn together.
          {
            name: "doctor_id", label: t("fields.doctor"), type: "custom", bare: true,
            render: editing => (
              <DoctorAndSchedule key={String(editing?.id ?? "new")} doctors={doctors} loading={doctorsLoading}
                row={editing as AppointmentRow | null} use24h={use24h} />
            ),
          },
          // A new appointment is always "scheduled" (the column's default);
          // the status is only something to change afterwards.
          { name: "status", label: t("fields.status"), type: "select", options: statuses, editOnly: true },
          { name: "notes", label: t("fields.notes"), type: "textarea", fullWidth: true },
          {
            name: "booking_channel",
            label: t("columns.source"),
            type: "custom",
            render: editing => {
              if (!editing) return null;
              const row = editing as AppointmentRow;
              const src = getBookingSource(row);
              return (
                <div className="py-1">
                  {src === "patient_portal" && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs text-sky-800 dark:text-sky-200">
                      <Globe className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">{t("sources.patient_portal")}</div>
                        <div className="text-[11px] text-sky-600/80 dark:text-sky-300/80 mt-0.5">{t("sources.patient_portal_desc")}</div>
                      </div>
                    </div>
                  )}
                  {src === "doctor_walk_in" && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200">
                      <UserCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">{t("sources.doctor_walk_in")}</div>
                        <div className="text-[11px] text-amber-600/80 dark:text-amber-300/80 mt-0.5">{t("sources.doctor_walk_in_desc")}</div>
                      </div>
                    </div>
                  )}
                  {src === "hospital_admin" && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200">
                      <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">{t("sources.hospital_admin")}</div>
                        <div className="text-[11px] text-emerald-600/80 dark:text-emerald-300/80 mt-0.5">{t("sources.hospital_admin_desc")}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            },
          },
        ],
      }} />
      {login.dialogs}
    </AdminLayout>
  );
};

export default Page;
