"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Card, Kpi, Pill, Btn, SectionTitle } from "@/components/admin/ui";
import { statusTone, Modal, ConfirmDialog } from "@/components/admin/crud";
import { invalidateResource } from "@/redux/api/createResourceApi";
import { useAppDispatch } from "@/redux/hooks";
import {
  doctorsApi, doctorPerformanceApi, doctorShiftsApi,
  type DoctorRow, type DoctorPerformanceRow, type DoctorShiftRow,
} from "@/redux/api/resources";
import {
  Stethoscope, Users, DollarSign, Star, CalendarRange, ClipboardList,
  Plus, Trash2, TrendingUp, Activity, AlertCircle, Loader2, KeyRound, Copy,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Doctor Management: directory, performance and scheduling.
 *
 * All three tabs read and write the database. Directory has used
 * `public.doctors` since 0005; Performance and Scheduling kept their data in
 * localStorage until 0012 gave them `doctor_performance` and `doctor_shifts`,
 * which meant the figures a hospital typed in were visible only in the browser
 * that typed them.
 */

// Mirrors public.doctors (supabase/migrations/0005_doctors.sql). Column names
// are the database's, so form values post straight through with no mapping.
// `hospital` is gone: which hospital a doctor belongs to is tenant_id, set
// from the session, not typed in.
type Doctor = {
  id: string;
  tenant_id?: string;
  slug?: string;
  profile_id?: string | null;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  gender: string;
  status: string;
  education: string;
  languages: string;
  expertise: string;
  bio: string;
  availability: string;
  photo_url: string;
  experience_years: string;
  rating: string;
  consultation_fee: string;
  patients_treated: string;
  consultation_duration_minutes: string;
};

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const TABS = ["Directory", "Performance", "Scheduling"] as const;
type Tab = (typeof TABS)[number];

const Doctors = () => {
  const [tab, setTab] = useState<Tab>("Directory");
  return (
    <AdminLayout title="Doctor Management" subtitle="Directory, performance & scheduling">
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t ? "bg-primary text-primary-foreground shadow-soft" : "bg-card border border-border/60 text-foreground/70 hover:bg-muted/60"
            }`}>{t}</button>
        ))}
      </div>
      {tab === "Directory" && <DirectoryTab />}
      {tab === "Performance" && <PerformanceTab />}
      {tab === "Scheduling" && <SchedulingTab />}
    </AdminLayout>
  );
};

/**
 * Login credentials, per doctor (HF-32).
 *
 * Creating a doctor never creates a login on its own — most rows here are
 * directory-only, same reasoning hospitals/[id]/approve documents for
 * tenants. A login is a deliberate extra step, and unlike the hospital-admin
 * flow, the password can be pulled up again later instead of only once: it's
 * stored encrypted (not hashed) specifically so this button keeps working.
 */
const DirectoryTab = () => {
  const dispatch = useAppDispatch();
  const [creds, setCreds] = useState<{ doctor: string; email: string; password: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Creating a login is a real, consequential action — a doctor gets a real
  // account they can sign in with. Confirmed explicitly rather than firing
  // on the first click. Viewing an existing login is read-only, so it skips
  // this and fires straight away.
  const [pendingCreate, setPendingCreate] = useState<Doctor | null>(null);
  // Resetting replaces a password the doctor may already be using, so it gets
  // its own confirmation rather than happening on the click that discovered it.
  const [pendingReset, setPendingReset] = useState<Doctor | null>(null);

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const createLogin = async (doctor: Doctor) => {
    setBusyId(doctor.id);
    try {
      const res = await fetch(`/api/v1/doctors/${doctor.id}/login`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.error("Could not create login", { description: body?.error?.message ?? "Please try again." });
        return;
      }
      setCreds({ doctor: doctor.name, ...body.data });
      // Bypassed doctorsApi's own mutations (this isn't CRUD on the doctor
      // row itself), so the cache doesn't know profile_id changed — without
      // this the row action button would still read "Create Login" and a
      // second click would 409.
      dispatch(invalidateResource("doctors", doctor.id));
      toast.success("Login created");
    } catch {
      toast.error("Could not create login", { description: "The request failed. Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  const viewLogin = async (doctor: Doctor) => {
    setBusyId(doctor.id);
    try {
      const res = await fetch(`/api/v1/doctors/${doctor.id}/login`);
      const body = await res.json();
      if (!res.ok) {
        // The one recoverable failure: the doctor has a login but no password
        // we can show. Offer to replace it rather than leaving the button dead,
        // which is how three demo doctors ended up unusable.
        if (body?.error?.code === "no_saved_password") {
          setPendingReset(doctor);
          return;
        }
        toast.error("Could not load login", { description: body?.error?.message ?? "Please try again." });
        return;
      }
      setCreds({ doctor: doctor.name, ...body.data });
    } catch {
      toast.error("Could not load login", { description: "The request failed. Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  const resetLogin = async (doctor: Doctor) => {
    setBusyId(doctor.id);
    try {
      const res = await fetch(`/api/v1/doctors/${doctor.id}/login`, { method: "PUT" });
      const body = await res.json();
      if (!res.ok) {
        toast.error("Could not reset password", { description: body?.error?.message ?? "Please try again." });
        return;
      }
      setCreds({ doctor: doctor.name, ...body.data });
      toast.success("Password reset");
    } catch {
      toast.error("Could not reset password", { description: "The request failed. Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <ResourcePage<Doctor> config={{
    storeKey: "doctors",
    resource: "doctors",
    searchFields: ["name", "specialty", "email"],
    statuses: ["active", "on_leave", "suspended"],
    rowActions: r => (
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          if (r.profile_id) void viewLogin(r);
          else setPendingCreate(r);
        }}
        disabled={busyId === r.id}
        title={r.profile_id ? "View this doctor's login" : "Create a login for this doctor"}
        className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 disabled:opacity-50">
        {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
      </button>
    ),
    columns: [
      { key: "name", label: "Name", accessor: r => r.name, sortable: true,
        render: r => <span className="font-semibold text-primary">{r.name}</span> },
      { key: "specialty", label: "Specialization", accessor: r => r.specialty, sortable: true },
      { key: "gender", label: "Gender", accessor: r => r.gender, render: r => GENDERS.find(g => g.value === r.gender)?.label ?? "—" },
      { key: "education", label: "Qualifications", accessor: r => r.education },
      { key: "availability", label: "Availability", accessor: r => r.availability },
      { key: "experience_years", label: "Exp (yrs)", accessor: r => r.experience_years, sortable: true },
      { key: "consultation_fee", label: "Fee", accessor: r => r.consultation_fee },
      { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
    ],
    fields: [
      { name: "photo_url", label: "Doctor photo", type: "image" },
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "specialty", label: "Specialization", type: "select", options: ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Oncology", "Dermatology", "Gynecology", "General"] },
      { name: "gender", label: "Gender", type: "select", options: GENDERS },
      { name: "education", label: "Education / Qualifications", type: "text", required: true },
      // min/max/numberStep mirror the check constraints in 0005. Without
      // numberStep a number input is integers-only, so "4.7" in a
      // numeric(2,1) column silently blocked the whole form from submitting.
      { name: "experience_years", label: "Experience (years)", type: "number", required: true, min: 0 },
      { name: "rating", label: "Rating (0–5)", type: "number", min: 0, max: 5, numberStep: 0.1 },
      { name: "consultation_fee", label: "Consultation Fee (USD)", type: "number", required: true, min: 0, numberStep: 0.01 },
      { name: "patients_treated", label: "Patients treated", type: "number", min: 0 },
      { name: "consultation_duration_minutes", label: "Consultation duration (minutes)", type: "number", min: 1 },
      { name: "languages", label: "Languages (comma separated)", type: "text" },
      { name: "availability", label: "Availability (e.g. Mon–Fri 09:00–17:00)", type: "text" },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "status", label: "Status", type: "select", options: ["active", "on_leave", "suspended"] },
      { name: "expertise", label: "Areas of Expertise (comma separated)", type: "textarea" },
      { name: "bio", label: "About / Biography", type: "textarea" },
    ],
      }} />

      <ConfirmDialog
        open={!!pendingCreate}
        onClose={() => setPendingCreate(null)}
        onConfirm={() => pendingCreate && void createLogin(pendingCreate)}
        title="Create doctor login?"
        description={
          pendingCreate
            ? `This creates a real login for ${pendingCreate.name} at ${pendingCreate.email || "their email on file"} — they'll be able to sign in and use their own dashboard.`
            : undefined
        }
      />

      <ConfirmDialog
        open={!!pendingReset}
        onClose={() => setPendingReset(null)}
        onConfirm={() => pendingReset && void resetLogin(pendingReset)}
        title="Reset this doctor's password?"
        description={
          pendingReset
            ? `${pendingReset.name} has a login, but no password was saved for it — it predates this feature, or saving it failed. The old password can't be recovered, only replaced. Resetting sets a new one you can view here from now on, and stops the old one working if they are still using it.`
            : undefined
        }
      />

      <Modal
        open={!!creds}
        onClose={() => setCreds(null)}
        title="Doctor login"
        footer={
          <button onClick={() => setCreds(null)}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">
            Done
          </button>
        }>
        {creds && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
              <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Login for <span className="font-semibold text-primary">{creds.doctor}</span>. Share these
                securely — unlike a hospital admin&apos;s password, you can come back to this button and view
                it again any time.
              </p>
            </div>
            {[
              { label: "Email", value: creds.email },
              { label: "Password", value: creds.password },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5">{label.toUpperCase()}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted/40 rounded-lg px-3 py-2 text-sm font-mono break-all">{value}</code>
                  <button onClick={() => copy(value, label)}
                    className="p-2 rounded-lg border border-border hover:bg-muted" title={`Copy ${label}`}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
};

/** Doctor list for the two tabs that hang off it. */
const useDoctors = () => {
  const { data, isLoading, error } = doctorsApi.useList({ limit: 100 });
  return { doctors: (data?.data ?? []) as DoctorRow[], isLoading, error };
};

const EmptyOrError = ({ error, colSpan, empty }: { error: unknown; colSpan: number; empty: string }) => (
  <tr>
    <td colSpan={colSpan} className="py-8 text-center text-muted-foreground">
      {error ? (
        <span className="inline-flex items-center gap-2 text-destructive font-semibold">
          <AlertCircle className="h-4 w-4" /> Could not load. Refresh to try again.
        </span>
      ) : empty}
    </td>
  </tr>
);

/* ------------------------------------------------------- Performance --- */

type PerfValues = {
  patient_volume: number;
  consultations: number;
  revenue: number;
  feedback: number;
};

const PERF_FIELDS = ["patient_volume", "consultations", "revenue", "feedback"] as const;

const PerformanceTab = () => {
  const { doctors, isLoading: docsLoading, error: docsError } = useDoctors();
  const perfQuery = doctorPerformanceApi.useList({ limit: 100 });
  const [createPerf] = doctorPerformanceApi.useCreate();
  const [updatePerf] = doctorPerformanceApi.useUpdate();
  const [saving, setSaving] = useState(false);

  /**
   * Edits are held apart from server values rather than copied into a draft on
   * load. A draft seeded by an effect has to be resynced every time the query
   * refetches, and gets it wrong when a refetch lands mid-edit; this way the
   * rendered value is simply the edit if there is one, otherwise the server's.
   */
  const [edits, setEdits] = useState<Record<string, Partial<PerfValues>>>({});

  const rows = useMemo(
    () => (perfQuery.data?.data ?? []) as DoctorPerformanceRow[],
    [perfQuery.data],
  );

  const byDoctor = useMemo(() => {
    const map = new Map<string, DoctorPerformanceRow>();
    for (const row of rows) map.set(row.doctor_id, row);
    return map;
  }, [rows]);

  const valueOf = (doctorId: string, field: keyof PerfValues) => {
    const edited = edits[doctorId]?.[field];
    if (edited !== undefined) return edited;
    const row = byDoctor.get(doctorId);
    return row ? Number(row[field]) : 0;
  };

  const setValue = (doctorId: string, field: keyof PerfValues, value: number) =>
    setEdits(prev => ({ ...prev, [doctorId]: { ...prev[doctorId], [field]: value } }));

  const dirtyIds = Object.keys(edits).filter(id =>
    PERF_FIELDS.some(field => {
      const edited = edits[id]?.[field];
      if (edited === undefined) return false;
      const row = byDoctor.get(id);
      return edited !== (row ? Number(row[field]) : 0);
    }),
  );

  const totals = useMemo(() => {
    const sum = (field: keyof PerfValues) =>
      doctors.reduce((total, doctor) => total + valueOf(doctor.id, field), 0);
    const feedbackTotal = sum("feedback");
    return {
      patients: sum("patient_volume"),
      consults: sum("consultations"),
      revenue: sum("revenue"),
      avgFeedback: doctors.length ? (feedbackTotal / doctors.length).toFixed(2) : "0",
    };
    // valueOf closes over edits and byDoctor, both of which are dependencies.
  }, [doctors, edits, byDoctor]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxRevenue = Math.max(1, ...doctors.map(d => valueOf(d.id, "revenue")));

  const save = async () => {
    if (!dirtyIds.length) return;
    setSaving(true);

    const results = await Promise.allSettled(
      dirtyIds.map(doctorId => {
        const body = {
          patient_volume: valueOf(doctorId, "patient_volume"),
          consultations: valueOf(doctorId, "consultations"),
          revenue: valueOf(doctorId, "revenue"),
          feedback: valueOf(doctorId, "feedback"),
        };
        const existing = byDoctor.get(doctorId);
        // A doctor with no row yet gets one on first save, so the tab does not
        // need a separate "start tracking this doctor" step.
        return existing
          ? updatePerf(existing.id, body).unwrap()
          : createPerf({ doctor_id: doctorId, ...body }).unwrap();
      }),
    );

    const failed = results.filter(r => r.status === "rejected").length;
    setSaving(false);

    if (failed) {
      toast.error(`${failed} of ${dirtyIds.length} could not be saved`);
      return;
    }
    setEdits({});
    toast.success(dirtyIds.length === 1 ? "Performance saved" : `${dirtyIds.length} doctors saved`);
  };

  const loading = docsLoading || perfQuery.isLoading;
  const error = docsError || perfQuery.error;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Total Patients" value={totals.patients.toLocaleString()} tone="primary" />
        <Kpi icon={Activity} label="Consultations" value={totals.consults.toLocaleString()} tone="accent" />
        <Kpi icon={DollarSign} label="Revenue Generated" value={`$${totals.revenue.toLocaleString()}`} tone="chip" />
        <Kpi icon={Star} label="Avg Feedback" value={`${totals.avgFeedback} / 5`} tone="primary" />
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Doctor Performance"
          action={
            dirtyIds.length > 0
              ? <span className="text-xs font-semibold text-muted-foreground">
                  {dirtyIds.length} unsaved {dirtyIds.length === 1 ? "row" : "rows"}
                </span>
              : undefined
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-widest font-bold text-muted-foreground border-b border-border/60">
                <th className="py-2 pr-3">DOCTOR</th>
                <th className="py-2 pr-3">PATIENT VOLUME</th>
                <th className="py-2 pr-3">CONSULTATIONS</th>
                <th className="py-2 pr-3">REVENUE</th>
                <th className="py-2 pr-3">FEEDBACK</th>
                <th className="py-2 pr-3 w-[160px]">REVENUE SHARE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline" /> Loading…
                </td></tr>
              ) : doctors.length === 0 ? (
                <EmptyOrError error={error} colSpan={6} empty="No doctors yet. Add one in Directory." />
              ) : (
                doctors.map(doctor => {
                  const revenue = valueOf(doctor.id, "revenue");
                  const isDirty = dirtyIds.includes(doctor.id);
                  return (
                    <tr key={doctor.id} className={`border-b border-border/40 ${isDirty ? "bg-primary/5" : ""}`}>
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-primary">{doctor.name}</div>
                        <div className="text-xs text-muted-foreground">{doctor.specialty ?? "—"}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <input type="number" min={0} value={valueOf(doctor.id, "patient_volume")}
                          aria-label={`Patient volume for ${doctor.name}`}
                          onChange={e => setValue(doctor.id, "patient_volume", Number(e.target.value))}
                          className="w-24 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                      </td>
                      <td className="py-3 pr-3">
                        <input type="number" min={0} value={valueOf(doctor.id, "consultations")}
                          aria-label={`Consultations for ${doctor.name}`}
                          onChange={e => setValue(doctor.id, "consultations", Number(e.target.value))}
                          className="w-24 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">$</span>
                          <input type="number" min={0} step="0.01" value={revenue}
                            aria-label={`Revenue for ${doctor.name}`}
                            onChange={e => setValue(doctor.id, "revenue", Number(e.target.value))}
                            className="w-28 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <input type="number" step="0.1" min={0} max={5} value={valueOf(doctor.id, "feedback")}
                            aria-label={`Feedback for ${doctor.name}`}
                            onChange={e => setValue(doctor.id, "feedback", Number(e.target.value))}
                            className="w-20 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-primary-glow"
                            style={{ width: `${(revenue / maxRevenue) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-4">
          <Btn onClick={() => void save()} disabled={saving || dirtyIds.length === 0}
            title={dirtyIds.length === 0 ? "No changes to save" : undefined}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Metrics"}
          </Btn>
        </div>
      </Card>
    </div>
  );
};

/* -------------------------------------------------------- Scheduling --- */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const SHIFT_TYPES = ["Regular", "On-Call", "Emergency", "Surgery", "Off"] as const;

const SHIFT_TONES: Record<string, string> = {
  "Regular": "bg-primary/15 text-primary border-primary/30",
  "On-Call": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Emergency": "bg-destructive/15 text-destructive border-destructive/30",
  "Surgery": "bg-accent/40 text-accent-foreground border-accent/60",
  "Off": "bg-muted text-muted-foreground border-border",
};

/** Postgres `time` comes back as HH:MM:SS; the roster only shows HH:MM. */
const hhmm = (value: string) => value.slice(0, 5);

const SchedulingTab = () => {
  const { doctors, isLoading: docsLoading, error: docsError } = useDoctors();
  const shiftsQuery = doctorShiftsApi.useList({ limit: 100 });
  const [createShift] = doctorShiftsApi.useCreate();
  const [removeShift] = doctorShiftsApi.useRemove();

  const [form, setForm] = useState({
    doctor_id: "",
    day_of_week: "Mon" as (typeof DAYS)[number],
    start_time: "09:00",
    end_time: "17:00",
    shift_type: "Regular" as (typeof SHIFT_TYPES)[number],
    ward: "",
  });
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const shifts = useMemo(
    () => (shiftsQuery.data?.data ?? []) as DoctorShiftRow[],
    [shiftsQuery.data],
  );

  const add = async () => {
    if (!form.doctor_id) {
      toast.error("Pick a doctor");
      return;
    }
    // Mirrors doctor_shifts_duration_check. End before start is allowed on
    // purpose — that is a shift running past midnight.
    if (form.start_time === form.end_time) {
      toast.error("Start and end time cannot be the same");
      return;
    }

    setAdding(true);
    try {
      await createShift({ ...form, ward: form.ward.trim() || undefined }).unwrap();
      toast.success("Shift added");
      setForm(f => ({ ...f, ward: "" }));
    } catch (cause) {
      const message =
        (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? "Please try again.";
      toast.error("Could not add shift", { description: message });
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    setRemoving(id);
    try {
      await removeShift(id).unwrap();
      toast.success("Shift removed");
    } catch {
      toast.error("Could not remove shift", { description: "Please try again." });
    } finally {
      setRemoving(null);
    }
  };

  const cellShifts = (doctorId: string, day: string) =>
    shifts.filter(s => s.doctor_id === doctorId && s.day_of_week === day);

  const loading = docsLoading || shiftsQuery.isLoading;
  const error = docsError || shiftsQuery.error;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={CalendarRange} label="Shifts Scheduled" value={String(shifts.length)} tone="primary" />
        <Kpi icon={Stethoscope} label="Doctors" value={String(doctors.length)} tone="accent" />
        <Kpi icon={ClipboardList} label="On-Call" value={String(shifts.filter(s => s.shift_type === "On-Call").length)} tone="chip" />
        <Kpi icon={Activity} label="Emergency" value={String(shifts.filter(s => s.shift_type === "Emergency").length)} tone="destructive" />
      </div>

      <Card className="p-5">
        <SectionTitle title="Add Shift / Plan" />
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          <select value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })}
            aria-label="Doctor" className="md:col-span-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <option value="">Select doctor…</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ""}</option>
            ))}
          </select>
          <select value={form.day_of_week} aria-label="Day"
            onChange={e => setForm({ ...form, day_of_week: e.target.value as (typeof DAYS)[number] })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            {DAYS.map(d => <option key={d}>{d}</option>)}
          </select>
          <input type="time" value={form.start_time} aria-label="Start time"
            onChange={e => setForm({ ...form, start_time: e.target.value })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm" />
          <input type="time" value={form.end_time} aria-label="End time"
            onChange={e => setForm({ ...form, end_time: e.target.value })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm" />
          <select value={form.shift_type} aria-label="Shift type"
            onChange={e => setForm({ ...form, shift_type: e.target.value as (typeof SHIFT_TYPES)[number] })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            {SHIFT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <input placeholder="Ward / Room" value={form.ward} aria-label="Ward or room"
            onChange={e => setForm({ ...form, ward: e.target.value })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end mt-4">
          <Btn onClick={() => void add()} disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {adding ? "Adding…" : "Add Shift"}
          </Btn>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Duty Roster (Weekly)" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-[11px] tracking-widest font-bold text-muted-foreground">
                <th className="py-2 pr-3 sticky left-0 bg-card">DOCTOR</th>
                {DAYS.map(d => <th key={d} className="py-2 px-2 text-center">{d.toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={DAYS.length + 1} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline" /> Loading…
                </td></tr>
              ) : doctors.length === 0 ? (
                <EmptyOrError error={error} colSpan={DAYS.length + 1} empty="Add doctors first." />
              ) : (
                doctors.map(doctor => (
                  <tr key={doctor.id} className="border-t border-border/40 align-top">
                    <td className="py-3 pr-3 sticky left-0 bg-card">
                      <div className="font-semibold text-primary text-sm">{doctor.name}</div>
                      <div className="text-xs text-muted-foreground">{doctor.specialty ?? "—"}</div>
                    </td>
                    {DAYS.map(day => (
                      <td key={day} className="py-2 px-1 min-w-[120px]">
                        <div className="flex flex-col gap-1">
                          {cellShifts(doctor.id, day).map(shift => (
                            <div key={shift.id}
                              className={`relative group rounded-lg border px-2 py-1.5 text-[11px] ${SHIFT_TONES[shift.shift_type] ?? SHIFT_TONES.Regular}`}>
                              <div className="font-bold">
                                {hhmm(shift.start_time)}–{hhmm(shift.end_time)}
                              </div>
                              <div className="opacity-80">{shift.shift_type}</div>
                              {shift.ward && <div className="opacity-70 truncate">{shift.ward}</div>}
                              <button onClick={() => void remove(shift.id)}
                                disabled={removing === shift.id}
                                aria-label={`Remove ${shift.shift_type} shift for ${doctor.name} on ${day}`}
                                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 grid place-items-center disabled:opacity-50">
                                {removing === shift.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Trash2 className="h-3 w-3" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border/40">
          <span className="text-xs font-semibold text-muted-foreground">Legend:</span>
          {SHIFT_TYPES.map(t => (
            <span key={t} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${SHIFT_TONES[t]}`}>{t}</span>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Doctors;
