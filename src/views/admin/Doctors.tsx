"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { WeeklyHoursField } from "@/components/admin/WeeklyHoursField";
import { Card, Kpi, Pill, Btn, SectionTitle } from "@/components/admin/ui";
import { statusTone, Modal, ConfirmDialog, Field, Input } from "@/components/admin/crud";
import { Avatar } from "@/components/common/Avatar";
import { useSession } from "@/lib/auth/useSession";
import { defaultWeek, serialiseWeek, type WeekHours } from "@/lib/hours";
import { invalidateResource } from "@/redux/api/createResourceApi";
import { useAppDispatch } from "@/redux/hooks";
import {
  doctorsApi, doctorPerformanceApi, doctorShiftsApi,
  type DoctorRow, type DoctorPerformanceRow, type DoctorShiftRow,
} from "@/redux/api/resources";
import {
  Stethoscope, Users, DollarSign, Star, CalendarRange, ClipboardList,
  Plus, Trash2, TrendingUp, Activity, AlertCircle, Loader2, KeyRound, Copy, Search, UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { availabilityLabel } from "@/lib/availability";
import type { Locale } from "@/i18n/config";

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
  bmdc_number?: string;
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

const GENDERS = ["male", "female", "other"] as const;
const DOCTOR_STATUSES = ["active", "on_leave", "suspended"] as const;

const TABS = ["directory", "performance", "scheduling"] as const;
type Tab = (typeof TABS)[number];

/**
 * A doctor already on HealthFlow who is not at this hospital — see
 * search_doctors_to_add (0082, 0085). With a login they are named by it;
 * without one, by their home row, which moves here when added.
 */
type Candidate = {
  profile_id: string | null;
  doctor_id: string | null;
  has_login: boolean;
  name: string;
  specialty: string | null;
  photo_url: string | null;
  bmdc_number: string | null;
  /** Masked: enough to tell two doctors of the same name apart. */
  email_hint: string | null;
  phone_hint: string | null;
  hospitals: string[];
};

/**
 * Adds a doctor who is already on HealthFlow to this hospital (0082).
 *
 * The other way in — New, then the key, which links a row whose email or BMDC
 * matches — still works, but it means typing the doctor out again to find
 * them. Here the hospital searches by name, email or phone, picks the doctor,
 * and sets only what is its own: the fee and the hours. The doctor's name,
 * photo and the rest come from their profile.
 */
const AddExistingDoctor = () => {
  const t = useTranslations("admin.doctors.existing");
  const tc = useTranslations("common");
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [fee, setFee] = useState("");
  const [week, setWeek] = useState<WeekHours>(defaultWeek);
  const [saving, setSaving] = useState(false);

  const reset = () => { setQuery(""); setResults([]); setPicked(null); setFee(""); setWeek(defaultWeek()); };
  const close = () => { if (!saving) { setOpen(false); reset(); } };

  // Searches as they type, once they pause. A stale answer never replaces a newer one.
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) { setResults([]); setSearching(false); return; }
    let live = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/doctors/existing?q=${encodeURIComponent(q)}`);
        const body = await res.json().catch(() => null);
        if (!live) return;
        if (!res.ok) { toast.error(t("searchFailed"), { description: body?.error?.message }); setResults([]); return; }
        setResults(body.data ?? []);
      } finally {
        if (live) setSearching(false);
      }
    }, 300);
    return () => { live = false; clearTimeout(timer); };
  }, [query, open, t]);

  const add = async () => {
    if (!picked) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/doctors/existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(picked.profile_id ? { profile_id: picked.profile_id } : { doctor_id: picked.doctor_id }),
          consultation_fee: fee,
          availability: serialiseWeek(week),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(t("addFailed"), { description: body?.error?.message }); return; }
      dispatch(invalidateResource("doctors"));
      toast.success(t("added", { name: picked.name }), {
        description: picked.has_login ? t("addedWithLogin") : t("addedNoLogin"),
      });
      setOpen(false);
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Btn variant="outline" onClick={() => setOpen(true)} className="whitespace-nowrap">
        <UserPlus className="h-4 w-4" /> {t("button")}
      </Btn>

      <Modal open={open} onClose={close} title={picked ? t("addName", { name: picked.name }) : t("title")} size="lg"
        footer={<>
          {picked && <Btn variant="outline" onClick={() => setPicked(null)} disabled={saving} className="mr-auto">{t("backToSearch")}</Btn>}
          <Btn variant="outline" onClick={close} disabled={saving}>{tc("cancel")}</Btn>
          {picked && (
            <Btn onClick={() => void add()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {t("addToHospital")}
            </Btn>
          )}
        </>}>
        {!picked ? (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")} className="pl-9" />
            </div>
            <p className="text-xs text-muted-foreground mb-3">{t("searchHint")}</p>
            {query.trim().length < 2 ? null : searching ? (
              <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : results.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-semibold text-primary">{t("noMatch")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("noMatchHint")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map(c => (
                  <button key={c.profile_id ?? c.doctor_id} type="button" onClick={() => setPicked(c)}
                    className="w-full flex items-center gap-3 rounded-xl border border-border/60 p-3 text-left hover:border-primary hover:bg-muted/30 transition-colors">
                    <Avatar src={c.photo_url} name={c.name} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-primary truncate flex items-center gap-2">
                        <span className="truncate">{c.name}</span>
                        {!c.has_login && <Pill tone="default">{t("noLoginYet")}</Pill>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[c.specialty, c.bmdc_number && `BMDC ${c.bmdc_number}`, c.email_hint, c.phone_hint].filter(Boolean).join(" · ") || "—"}
                      </p>
                      {c.hospitals.length > 0 && (
                        <p className="text-[11px] text-muted-foreground truncate">{t("worksAt", { hospitals: c.hospitals.join(", ") })}</p>
                      )}
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3 mb-4">
              <Avatar src={picked.photo_url} name={picked.name} className="h-12 w-12" />
              <div className="min-w-0">
                <p className="font-semibold text-primary truncate">{picked.name}</p>
                <p className="text-xs text-muted-foreground">
                  {picked.specialty || t("noSpecialty")}
                  {picked.hospitals.length > 0 && ` · ${t("alsoAt", { hospitals: picked.hospitals.join(", ") })}`}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {picked.has_login ? t("pickedWithLogin") : t("pickedNoLogin")}
            </p>
            <Field label={t("fee")}>
              <Input type="number" min={0} step="0.01" value={fee} onChange={e => setFee(e.target.value)} />
            </Field>
            <Field label={t("availability")}>
              <WeeklyHoursField key={picked.profile_id ?? picked.doctor_id} onChange={setWeek} summaryLabel={t("patientsSee")} />
            </Field>
          </>
        )}
      </Modal>
    </>
  );
};

const Doctors = () => {
  const t = useTranslations("admin.doctors");
  const [tab, setTab] = useState<Tab>("directory");
  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {TABS.map(key => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === key ? "bg-primary text-primary-foreground shadow-soft" : "bg-card border border-border/60 text-foreground/70 hover:bg-muted/60"
            }`}>{t(`tabs.${key}`)}</button>
        ))}
      </div>
      {tab === "directory" && <DirectoryTab />}
      {tab === "performance" && <PerformanceTab />}
      {tab === "scheduling" && <SchedulingTab />}
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
  const t = useTranslations("admin.doctors");
  const locale = useLocale() as Locale;
  const genderLabel = (value: string) =>
    (GENDERS as readonly string[]).includes(value) ? t(`genders.${value as (typeof GENDERS)[number]}`) : value;
  const statusLabel = (value: string) =>
    (DOCTOR_STATUSES as readonly string[]).includes(value) ? t(`statuses.${value as (typeof DOCTOR_STATUSES)[number]}`) : value;
  const statuses = DOCTOR_STATUSES.map(value => ({ value, label: statusLabel(value) }));
  const dispatch = useAppDispatch();
  const { user } = useSession();
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
    toast.success(t("login.copied", { label }));
  };
  const tryAgain = t("login.tryAgain");
  const requestFailed = t("login.requestFailed");

  const createLogin = async (doctor: Doctor) => {
    setBusyId(doctor.id);
    try {
      const res = await fetch(`/api/v1/doctors/${doctor.id}/login`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(t("login.createFailed"), { description: body?.error?.message ?? tryAgain });
        return;
      }
      if (body.data?.linked) {
        // Already a HealthFlow doctor at another hospital: no new account and
        // no password to hand over — they sign in the way they always have.
        dispatch(invalidateResource("doctors", doctor.id));
        toast.success(t("login.linked", { name: body.data.name }), {
          description: t("login.linkedBody"),
        });
        return;
      }
      setCreds({ doctor: doctor.name, ...body.data });
      // Bypassed doctorsApi's own mutations (this isn't CRUD on the doctor
      // row itself), so the cache doesn't know profile_id changed — without
      // this the row action button would still read "Create Login" and a
      // second click would 409.
      dispatch(invalidateResource("doctors", doctor.id));
      toast.success(t("login.created"));
    } catch {
      toast.error(t("login.createFailed"), { description: requestFailed });
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
        if (body?.error?.code === "shared_login") {
          toast.info(t("login.ownAccount"), { description: body.error.message });
          return;
        }
        toast.error(t("login.loadFailed"), { description: body?.error?.message ?? tryAgain });
        return;
      }
      setCreds({ doctor: doctor.name, ...body.data });
    } catch {
      toast.error(t("login.loadFailed"), { description: requestFailed });
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
        toast.error(t("login.resetFailed"), { description: body?.error?.message ?? tryAgain });
        return;
      }
      setCreds({ doctor: doctor.name, ...body.data });
      toast.success(t("login.resetDone"));
    } catch {
      toast.error(t("login.resetFailed"), { description: requestFailed });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <ResourcePage<Doctor> config={{
    storeKey: "doctors",
    resource: "doctors",
    searchFields: ["name", "specialty", "email", "bmdc_number"],
    statuses,
    // A hospital adds to itself; a super admin adds from /super/doctors.
    beforeAdd: user?.role !== "super_admin" ? <AddExistingDoctor /> : undefined,
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
    columns: [
      { key: "name", label: t("columns.name"), accessor: r => r.name, sortable: true,
        render: r => <span className="font-semibold text-primary">{r.name}</span> },
      { key: "specialty", label: t("columns.specialty"), accessor: r => r.specialty, sortable: true },
      { key: "gender", label: t("columns.gender"), accessor: r => r.gender, render: r => r.gender ? genderLabel(r.gender) : "—" },
      { key: "education", label: t("columns.education"), accessor: r => r.education },
      { key: "availability", label: t("columns.availability"), accessor: r => availabilityLabel(r.availability, locale) ?? "" },
      { key: "experience_years", label: t("columns.experience"), accessor: r => r.experience_years, sortable: true },
      { key: "consultation_fee", label: t("columns.fee"), accessor: r => r.consultation_fee },
      { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
    ],
    fields: [
      { name: "photo_url", label: t("fields.photo"), type: "image" },
      { name: "name", label: t("fields.name"), type: "text", required: true },
      // The specialties list (0093), searchable — the same one the site filters by.
      { name: "specialty", label: t("columns.specialty"), type: "specialty" },
      { name: "gender", label: t("columns.gender"), type: "select", options: GENDERS.map(value => ({ value, label: genderLabel(value) })) },
      { name: "education", label: t("fields.education"), type: "text", required: true },
      // min/max/numberStep mirror the check constraints in 0005. Without
      // numberStep a number input is integers-only, so "4.7" in a
      // numeric(2,1) column silently blocked the whole form from submitting.
      { name: "experience_years", label: t("fields.experience"), type: "number", required: true, min: 0 },
      { name: "rating", label: t("fields.rating"), type: "number", min: 0, max: 5, numberStep: 0.1 },
      { name: "consultation_fee", label: t("fields.fee"), type: "number", required: true, min: 0, numberStep: 0.01 },
      { name: "patients_treated", label: t("fields.patientsTreated"), type: "number", min: 0 },
      { name: "consultation_duration_minutes", label: t("fields.duration"), type: "number", min: 1 },
      { name: "languages", label: t("fields.languages"), type: "text" },
      { name: "availability", label: t("columns.availability"), type: "availability" },
      { name: "email", label: t("fields.email"), type: "email", required: true },
      { name: "bmdc_number", label: t("fields.bmdc"), type: "text" },
      { name: "phone", label: t("fields.phone"), type: "tel" },
      { name: "status", label: t("columns.status"), type: "select", options: statuses },
      { name: "expertise", label: t("fields.expertise"), type: "textarea" },
      { name: "bio", label: t("fields.bio"), type: "textarea" },
    ],
      }} />

      <ConfirmDialog
        open={!!pendingCreate}
        onClose={() => setPendingCreate(null)}
        onConfirm={() => pendingCreate && void createLogin(pendingCreate)}
        title={t("login.createTitle")}
        description={
          pendingCreate
            ? t("login.createBody", { email: pendingCreate.email || t("login.thisEmail"), name: pendingCreate.name })
            : undefined
        }
      />

      <ConfirmDialog
        open={!!pendingReset}
        onClose={() => setPendingReset(null)}
        onConfirm={() => pendingReset && void resetLogin(pendingReset)}
        title={t("login.resetTitle")}
        description={pendingReset ? t("login.resetBody", { name: pendingReset.name }) : undefined}
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
                  name: creds.doctor,
                  b: chunks => <span className="font-semibold text-primary">{chunks}</span>,
                })}
              </p>
            </div>
            {[
              { label: t("login.email"), value: creds.email },
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
    </>
  );
};

/** Doctor list for the two tabs that hang off it. */
const useDoctors = () => {
  const { data, isLoading, error } = doctorsApi.useList({ limit: 100 });
  return { doctors: (data?.data ?? []) as DoctorRow[], isLoading, error };
};

const EmptyOrError = ({ error, colSpan, empty }: { error: unknown; colSpan: number; empty: string }) => {
  const t = useTranslations("admin.doctors");
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center text-muted-foreground">
        {error ? (
          <span className="inline-flex items-center gap-2 text-destructive font-semibold">
            <AlertCircle className="h-4 w-4" /> {t("loadFailed")}
          </span>
        ) : empty}
      </td>
    </tr>
  );
};

/* ------------------------------------------------------- Performance --- */

type PerfValues = {
  patient_volume: number;
  consultations: number;
  revenue: number;
  feedback: number;
};

const PERF_FIELDS = ["patient_volume", "consultations", "revenue", "feedback"] as const;

const PerformanceTab = () => {
  const t = useTranslations("admin.doctors.performance");
  const tc = useTranslations("common");
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
      toast.error(t("saveFailed", { failed, total: dirtyIds.length }));
      return;
    }
    setEdits({});
    toast.success(t("saved", { count: dirtyIds.length }));
  };

  const loading = docsLoading || perfQuery.isLoading;
  const error = docsError || perfQuery.error;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Users} label={t("kpis.patients")} value={totals.patients.toLocaleString()} tone="primary" />
        <Kpi icon={Activity} label={t("kpis.consultations")} value={totals.consults.toLocaleString()} tone="accent" />
        <Kpi icon={DollarSign} label={t("kpis.revenue")} value={`$${totals.revenue.toLocaleString()}`} tone="chip" />
        <Kpi icon={Star} label={t("kpis.feedback")} value={`${totals.avgFeedback} / 5`} tone="primary" />
      </div>

      <Card className="p-5">
        <SectionTitle
          title={t("title")}
          action={
            dirtyIds.length > 0
              ? <span className="text-xs font-semibold text-muted-foreground">
                  {t("unsaved", { count: dirtyIds.length })}
                </span>
              : undefined
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-widest font-bold text-muted-foreground border-b border-border/60 uppercase">
                <th className="py-2 pr-3">{t("columns.doctor")}</th>
                <th className="py-2 pr-3">{t("columns.volume")}</th>
                <th className="py-2 pr-3">{t("columns.consultations")}</th>
                <th className="py-2 pr-3">{t("columns.revenue")}</th>
                <th className="py-2 pr-3">{t("columns.feedback")}</th>
                <th className="py-2 pr-3 w-[160px]">{t("columns.share")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline" /> {tc("loading")}
                </td></tr>
              ) : doctors.length === 0 ? (
                <EmptyOrError error={error} colSpan={6} empty={t("empty")} />
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
                          aria-label={t("aria.volume", { name: doctor.name })}
                          onChange={e => setValue(doctor.id, "patient_volume", Number(e.target.value))}
                          className="w-24 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                      </td>
                      <td className="py-3 pr-3">
                        <input type="number" min={0} value={valueOf(doctor.id, "consultations")}
                          aria-label={t("aria.consultations", { name: doctor.name })}
                          onChange={e => setValue(doctor.id, "consultations", Number(e.target.value))}
                          className="w-24 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">$</span>
                          <input type="number" min={0} step="0.01" value={revenue}
                            aria-label={t("aria.revenue", { name: doctor.name })}
                            onChange={e => setValue(doctor.id, "revenue", Number(e.target.value))}
                            className="w-28 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <input type="number" step="0.1" min={0} max={5} value={valueOf(doctor.id, "feedback")}
                            aria-label={t("aria.feedback", { name: doctor.name })}
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
            title={dirtyIds.length === 0 ? t("noChanges") : undefined}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            {saving ? tc("saving") : t("save")}
          </Btn>
        </div>
      </Card>
    </div>
  );
};

/* -------------------------------------------------------- Scheduling --- */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const SHIFT_TYPES = ["Regular", "On-Call", "Emergency", "Surgery", "Off"] as const;

/** Shift types are stored as these English words; only the label changes with the language. */
const SHIFT_KEYS = {
  "Regular": "regular", "On-Call": "onCall", "Emergency": "emergency", "Surgery": "surgery", "Off": "off",
} as const;

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
  const t = useTranslations("admin.doctors.scheduling");
  const tc = useTranslations("common");
  const shiftLabel = (value: string) =>
    value in SHIFT_KEYS ? t(`shiftTypes.${SHIFT_KEYS[value as keyof typeof SHIFT_KEYS]}`) : value;
  const dayLabel = (day: (typeof DAYS)[number]) => t(`days.${day}`);
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
      toast.error(t("pickDoctor"));
      return;
    }
    // Mirrors doctor_shifts_duration_check. End before start is allowed on
    // purpose — that is a shift running past midnight.
    if (form.start_time === form.end_time) {
      toast.error(t("sameTimes"));
      return;
    }

    setAdding(true);
    try {
      await createShift({ ...form, ward: form.ward.trim() || undefined }).unwrap();
      toast.success(t("added"));
      setForm(f => ({ ...f, ward: "" }));
    } catch (cause) {
      const message =
        (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? t("tryAgain");
      toast.error(t("addFailed"), { description: message });
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    setRemoving(id);
    try {
      await removeShift(id).unwrap();
      toast.success(t("removed"));
    } catch {
      toast.error(t("removeFailed"), { description: t("tryAgain") });
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
        <Kpi icon={CalendarRange} label={t("kpis.scheduled")} value={String(shifts.length)} tone="primary" />
        <Kpi icon={Stethoscope} label={t("kpis.doctors")} value={String(doctors.length)} tone="accent" />
        <Kpi icon={ClipboardList} label={shiftLabel("On-Call")} value={String(shifts.filter(s => s.shift_type === "On-Call").length)} tone="chip" />
        <Kpi icon={Activity} label={shiftLabel("Emergency")} value={String(shifts.filter(s => s.shift_type === "Emergency").length)} tone="destructive" />
      </div>

      <Card className="p-5">
        <SectionTitle title={t("addTitle")} />
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          <select value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })}
            aria-label={t("aria.doctor")} className="md:col-span-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <option value="">{t("selectDoctor")}</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ""}</option>
            ))}
          </select>
          <select value={form.day_of_week} aria-label={t("aria.day")}
            onChange={e => setForm({ ...form, day_of_week: e.target.value as (typeof DAYS)[number] })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            {DAYS.map(d => <option key={d} value={d}>{dayLabel(d)}</option>)}
          </select>
          <input type="time" value={form.start_time} aria-label={t("aria.start")}
            onChange={e => setForm({ ...form, start_time: e.target.value })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm" />
          <input type="time" value={form.end_time} aria-label={t("aria.end")}
            onChange={e => setForm({ ...form, end_time: e.target.value })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm" />
          <select value={form.shift_type} aria-label={t("aria.shiftType")}
            onChange={e => setForm({ ...form, shift_type: e.target.value as (typeof SHIFT_TYPES)[number] })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            {SHIFT_TYPES.map(type => <option key={type} value={type}>{shiftLabel(type)}</option>)}
          </select>
          <input placeholder={t("wardPlaceholder")} value={form.ward} aria-label={t("aria.ward")}
            onChange={e => setForm({ ...form, ward: e.target.value })}
            className="rounded-lg bg-muted/40 px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end mt-4">
          <Btn onClick={() => void add()} disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {adding ? t("adding") : t("add")}
          </Btn>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title={t("roster")} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-[11px] tracking-widest font-bold text-muted-foreground uppercase">
                <th className="py-2 pr-3 sticky left-0 bg-card">{t("doctor")}</th>
                {DAYS.map(d => <th key={d} className="py-2 px-2 text-center">{dayLabel(d)}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={DAYS.length + 1} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline" /> {tc("loading")}
                </td></tr>
              ) : doctors.length === 0 ? (
                <EmptyOrError error={error} colSpan={DAYS.length + 1} empty={t("empty")} />
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
                              <div className="opacity-80">{shiftLabel(shift.shift_type)}</div>
                              {shift.ward && <div className="opacity-70 truncate">{shift.ward}</div>}
                              <button onClick={() => void remove(shift.id)}
                                disabled={removing === shift.id}
                                aria-label={t("aria.remove", { shift: shiftLabel(shift.shift_type), name: doctor.name, day: dayLabel(day) })}
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
          <span className="text-xs font-semibold text-muted-foreground">{t("legend")}</span>
          {SHIFT_TYPES.map(type => (
            <span key={type} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${SHIFT_TONES[type]}`}>{shiftLabel(type)}</span>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Doctors;
