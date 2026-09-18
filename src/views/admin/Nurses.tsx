"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Card, Kpi, Pill, Btn, SectionTitle } from "@/components/admin/ui";
import { useConfirmAction } from "@/components/common/ConfirmProvider";
import { statusTone } from "@/components/admin/crud";
import {
  HeartPulse, Users, Building2, CalendarRange, Star, Activity,
  Plus, Trash2, TrendingUp, ClipboardList, Loader2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  nursesApi, nurseShiftsApi, nursePerformanceApi,
  type NurseRow, type NurseShiftRow, type NursePerformanceRow,
} from "@/redux/api/resources";

/**
 * `ward` is free text in the database (see 0014_nurses.sql) — this list is the
 * convenience the form and the allocation board offer, not a constraint. A
 * nurse whose ward is not on it still appears, under its own column.
 */
const WARDS = ["ICU", "Pediatrics", "ER", "Maternity", "General", "Oncology", "Surgery", "Cardiology"];
const SHIFTS = ["Morning", "Evening", "Night"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const STATUSES = ["active", "on_leave", "suspended"] as const;

const TABS = ["directory", "allocation", "shifts", "performance"] as const;
type Tab = (typeof TABS)[number];

/** Message read off a failed mutation, or nothing when the server said nothing. */
const reasonFor = (cause: unknown) =>
  (cause as { data?: { error?: { message?: string } } })?.data?.error?.message;

/** Nurse list for the three tabs that hang off the directory. */
const useNurses = () => {
  const { data, isLoading, error } = nursesApi.useList({ limit: 100 });
  return { nurses: (data?.data ?? []) as NurseRow[], isLoading, error };
};

const EmptyOrError = ({ error, colSpan, empty }: { error: unknown; colSpan: number; empty: string }) => {
  const t = useTranslations("admin.nurses");
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

const Page = () => {
  const t = useTranslations("admin.nurses");
  const [tab, setTab] = useState<Tab>("directory");
  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(key => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === key ? "bg-primary text-primary-foreground shadow-soft" : "bg-card border border-border/60 text-foreground/70 hover:bg-muted/60"
            }`}>{t(`tabs.${key}`)}</button>
        ))}
      </div>
      {tab === "directory" && <DirectoryTab />}
      {tab === "allocation" && <AllocationTab />}
      {tab === "shifts" && <ShiftTab />}
      {tab === "performance" && <PerformanceTab />}
    </AdminLayout>
  );
};

/** The shift a nurse works, translated for display; the stored value stays as typed. */
const useShiftLabel = () => {
  const t = useTranslations("admin.nurses");
  return (value: string) =>
    value === "Morning" ? t("shiftTypes.morning")
      : value === "Evening" ? t("shiftTypes.evening")
        : value === "Night" ? t("shiftTypes.night")
          : value === "Off" ? t("shiftTypes.off")
            : value;
};

/* --------------------------------------------------------- Directory --- */

const DirectoryTab = () => {
  const t = useTranslations("admin.nurses");
  const shiftLabel = useShiftLabel();
  const statusLabel = (value: string) =>
    (STATUSES as readonly string[]).includes(value) ? t(`statuses.${value as (typeof STATUSES)[number]}`) : value;
  const statuses = STATUSES.map(value => ({ value, label: statusLabel(value) }));

  return (
    <ResourcePage<NurseRow> config={{
      storeKey: "nurses",
      resource: "nurses",
      exportName: "nurses",
      addLabel: t("add"),
      searchFields: ["name", "ward", "license", "qualification", "email"],
      statuses,
      columns: [
        { key: "name", label: t("columns.name"), sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "ward", label: t("columns.ward"), sortable: true, accessor: r => r.ward ?? "", render: r => r.ward || <span className="text-muted-foreground">{t("unassigned")}</span> },
        { key: "shift", label: t("columns.shift"), sortable: true, accessor: r => r.shift, render: r => shiftLabel(r.shift) },
        { key: "qualification", label: t("columns.qualification"), render: r => r.qualification || "—" },
        { key: "license", label: t("columns.license"), render: r => <span className="font-mono text-xs">{r.license || "—"}</span> },
        { key: "phone", label: t("columns.phone"), render: r => <span className="font-mono text-xs">{r.phone || "—"}</span> },
        { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
      ],
      fields: [
        { name: "name", label: t("fields.name"), type: "text", required: true },
        { name: "qualification", label: t("fields.qualification"), type: "text" },
        // min/numberStep, not just the label: a number input with no step
        // defaults to step=1 and silently blocks submit on anything else.
        { name: "experience_years", label: t("fields.experience"), type: "number", min: 0, numberStep: 1 },
        { name: "ward", label: t("fields.ward"), type: "select", options: ["", ...WARDS] },
        { name: "shift", label: t("fields.shift"), type: "select", options: SHIFTS.map(value => ({ value, label: shiftLabel(value) })) },
        { name: "license", label: t("fields.license"), type: "text" },
        { name: "email", label: t("fields.email"), type: "email" },
        { name: "phone", label: t("fields.phone"), type: "tel" },
        { name: "status", label: t("fields.status"), type: "select", options: statuses },
      ],
    }} />
  );
};

/* ------------------------------------------------ Department Allocation --- */

const UNASSIGNED = "__unassigned__";

const AllocationTab = () => {
  const t = useTranslations("admin.nurses");
  const tc = useTranslations("common");
  const shiftLabel = useShiftLabel();
  const { nurses, isLoading, error } = useNurses();
  const [updateNurse] = nursesApi.useUpdate();
  const [moving, setMoving] = useState<string | null>(null);

  /**
   * Columns are the known wards plus any ward actually in use plus a bucket for
   * the unassigned. The previous version rendered the fixed list only, so a
   * nurse in a ward that was not on it vanished from the board entirely.
   */
  const columns = useMemo(() => {
    const extra = [...new Set(nurses.map(n => n.ward).filter((w): w is string => !!w))]
      .filter(w => !WARDS.includes(w));
    return [...WARDS, ...extra, UNASSIGNED];
  }, [nurses]);

  const byWard = useMemo(() => {
    const map: Record<string, NurseRow[]> = {};
    columns.forEach(w => (map[w] = []));
    nurses.forEach(n => {
      const key = n.ward || UNASSIGNED;
      (map[key] ||= []).push(n);
    });
    return map;
  }, [nurses, columns]);

  const move = async (id: string, ward: string) => {
    setMoving(id);
    try {
      await updateNurse(id, { ward: ward === UNASSIGNED ? null : ward }).unwrap();
      toast.success(t("wardUpdated"));
    } catch (cause) {
      toast.error(t("moveFailed"), { description: reasonFor(cause) ?? t("tryAgain") });
    } finally {
      setMoving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Users} label={t("kpi.total")} value={String(nurses.length)} tone="primary" />
        <Kpi icon={Building2} label={t("kpi.departments")} value={String(WARDS.length)} tone="accent" />
        <Kpi icon={HeartPulse} label={t("kpi.icu")} value={String(byWard["ICU"]?.length ?? 0)} tone="destructive" />
        <Kpi icon={Activity} label={t("kpi.er")} value={String(byWard["ER"]?.length ?? 0)} tone="chip" />
      </div>

      <Card className="p-5">
        <SectionTitle title={t("tabs.allocation")} />
        {error ? (
          <p className="py-8 text-center text-sm font-semibold text-destructive">{t("loadNursesFailed")}</p>
        ) : isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{tc("loading")}</p>
        ) : nurses.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("addNursesFirst")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {columns.map(w => (
              <div key={w} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-display text-sm text-primary">{w === UNASSIGNED ? t("unassigned") : w}</p>
                  <Pill tone="info">{byWard[w]?.length ?? 0}</Pill>
                </div>
                <ul className="space-y-2">
                  {(byWard[w] ?? []).map(n => (
                    <li key={n.id} className="rounded-lg bg-card border border-border/40 p-2">
                      <div className="font-semibold text-sm text-primary truncate">{n.name}</div>
                      <div className="flex items-center justify-between mt-1 gap-1">
                        <span className="text-[11px] text-muted-foreground">{shiftLabel(n.shift)}</span>
                        {moving === n.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        ) : (
                          <select value={n.ward || UNASSIGNED} onChange={e => void move(n.id, e.target.value)}
                            aria-label={t("wardFor", { name: n.name })}
                            className="text-[11px] bg-muted/40 rounded px-1 py-0.5 max-w-[110px]">
                            <option value={UNASSIGNED}>{t("unassigned")}</option>
                            {[...new Set([...WARDS, ...(n.ward ? [n.ward] : [])])].map(x => (
                              <option key={x} value={x}>{x}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </li>
                  ))}
                  {(byWard[w] ?? []).length === 0 && (
                    <li className="text-[11px] text-muted-foreground text-center py-3">{t("empty")}</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

/* --------------------------------------------------- Shift Management --- */

const SHIFT_TYPES = ["Morning", "Evening", "Night", "Off"] as const;

const SHIFT_TONES: Record<string, string> = {
  "Morning": "bg-primary/15 text-primary border-primary/30",
  "Evening": "bg-accent/40 text-accent-foreground border-accent/60",
  "Night": "bg-chip text-chip-foreground border-border",
  "Off": "bg-muted text-muted-foreground border-border",
};

const ShiftTab = () => {
  const t = useTranslations("admin.nurses");
  const tc = useTranslations("common");
  const confirmAction = useConfirmAction();
  const shiftLabel = useShiftLabel();
  const { nurses, isLoading: nursesLoading, error: nursesError } = useNurses();
  const shiftsQuery = nurseShiftsApi.useList({ limit: 100 });
  const [createShift] = nurseShiftsApi.useCreate();
  const [removeShift] = nurseShiftsApi.useRemove();

  const [form, setForm] = useState({
    nurse_id: "",
    day_of_week: "Mon" as (typeof DAYS)[number],
    shift_type: "Morning" as (typeof SHIFT_TYPES)[number],
    ward: "",
  });
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const shifts = useMemo(
    () => (shiftsQuery.data?.data ?? []) as NurseShiftRow[],
    [shiftsQuery.data],
  );

  const add = async () => {
    if (!form.nurse_id) {
      toast.error(t("pickNurse"));
      return;
    }
    setAdding(true);
    try {
      await createShift({ ...form, ward: form.ward.trim() || null }).unwrap();
      toast.success(t("shiftAdded"));
      setForm(f => ({ ...f, ward: "" }));
    } catch (cause) {
      // The unique constraint is the likely one here: the same block twice on
      // the same day. createResourceRoute maps 23505 to a 409 "Already exists".
      toast.error(t("addShiftFailed"), { description: reasonFor(cause) ?? t("tryAgain") });
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    setRemoving(id);
    try {
      await removeShift(id).unwrap();
      toast.success(t("shiftRemoved"));
    } catch (cause) {
      toast.error(t("removeShiftFailed"), { description: reasonFor(cause) ?? t("tryAgain") });
    } finally {
      setRemoving(null);
    }
  };

  const cellShifts = (nurseId: string, day: string) =>
    shifts.filter(s => s.nurse_id === nurseId && s.day_of_week === day);

  const loading = nursesLoading || shiftsQuery.isLoading;
  const error = nursesError || shiftsQuery.error;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={CalendarRange} label={t("kpi.shifts")} value={String(shifts.length)} tone="primary" />
        <Kpi icon={HeartPulse} label={t("shiftTypes.morning")} value={String(shifts.filter(s => s.shift_type === "Morning").length)} tone="accent" />
        <Kpi icon={Activity} label={t("shiftTypes.evening")} value={String(shifts.filter(s => s.shift_type === "Evening").length)} tone="chip" />
        <Kpi icon={ClipboardList} label={t("shiftTypes.night")} value={String(shifts.filter(s => s.shift_type === "Night").length)} tone="destructive" />
      </div>

      <Card className="p-5">
        <SectionTitle title={t("addShift")} />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select value={form.nurse_id} onChange={e => setForm({ ...form, nurse_id: e.target.value })}
            aria-label={t("nurse")} className="md:col-span-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <option value="">{t("selectNurse")}</option>
            {nurses.map(n => (
              <option key={n.id} value={n.id}>{n.ward ? `${n.name} — ${n.ward}` : n.name}</option>
            ))}
          </select>
          <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value as (typeof DAYS)[number] })}
            aria-label={t("day")} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            {DAYS.map(d => <option key={d} value={d}>{t(`days.${d as "Mon"}`)}</option>)}
          </select>
          <select value={form.shift_type} onChange={e => setForm({ ...form, shift_type: e.target.value as (typeof SHIFT_TYPES)[number] })}
            aria-label={t("shiftType")} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            {SHIFT_TYPES.map(value => <option key={value} value={value}>{shiftLabel(value)}</option>)}
          </select>
          <input placeholder={t("wardOptional")} value={form.ward} onChange={e => setForm({ ...form, ward: e.target.value })}
            aria-label={t("columns.ward")} className="rounded-lg bg-muted/40 px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end mt-4">
          <Btn onClick={() => void add()} disabled={adding || nurses.length === 0}
            title={nurses.length === 0 ? t("addNursesFirst") : undefined}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {adding ? t("adding") : t("addShift")}
          </Btn>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title={t("weeklyRoster")} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-widest font-bold text-muted-foreground">
                <th className="py-2 pr-3 sticky left-0 bg-card">{t("nurse").toUpperCase()}</th>
                {DAYS.map(d => <th key={d} className="py-2 px-2 text-center">{t(`days.${d as "Mon"}`).toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={DAYS.length + 1} className="py-8 text-center text-muted-foreground">{tc("loading")}</td></tr>
              ) : nurses.length === 0 ? (
                <EmptyOrError error={error} colSpan={DAYS.length + 1} empty={t("addNursesFirst")} />
              ) : (
                nurses.map(n => (
                  <tr key={n.id} className="border-t border-border/40 align-top">
                    <td className="py-3 pr-3 sticky left-0 bg-card">
                      <div className="font-semibold text-primary text-sm">{n.name}</div>
                      <div className="text-xs text-muted-foreground">{n.ward || t("unassigned")}</div>
                    </td>
                    {DAYS.map(day => (
                      <td key={day} className="py-2 px-1 min-w-[110px]">
                        <div className="flex flex-col gap-1">
                          {cellShifts(n.id, day).map(s => (
                            <div key={s.id} className={`relative group rounded-lg border px-2 py-1.5 text-[11px] ${SHIFT_TONES[s.shift_type] ?? SHIFT_TONES.Off}`}>
                              <div className="font-bold">{shiftLabel(s.shift_type)}</div>
                              {s.ward && <div className="opacity-70 truncate">{s.ward}</div>}
                              <button onClick={async () => { if (await confirmAction(tc("remove"), { name: `${n.name} · ${t(`days.${day as "Mon"}`)} · ${shiftLabel(s.shift_type)}`, danger: true })) void remove(s.id); }} disabled={removing === s.id}
                                aria-label={t("removeShiftFor", { shift: shiftLabel(s.shift_type), day: t(`days.${day as "Mon"}`), name: n.name })}
                                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 grid place-items-center disabled:opacity-50">
                                {removing === s.id
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
          {SHIFT_TYPES.map(value => (
            <span key={value} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${SHIFT_TONES[value]}`}>{shiftLabel(value)}</span>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ------------------------------------------------------- Performance --- */

type PerfValues = {
  patients_handled: number;
  hours_worked: number;
  attendance_pct: number;
  incidents: number;
  feedback: number;
};

const PERF_FIELDS = ["patients_handled", "hours_worked", "attendance_pct", "incidents", "feedback"] as const;

const PerformanceTab = () => {
  const t = useTranslations("admin.nurses");
  const tc = useTranslations("common");
  const shiftLabel = useShiftLabel();
  const { nurses, isLoading: nursesLoading, error: nursesError } = useNurses();
  const perfQuery = nursePerformanceApi.useList({ limit: 100 });
  const [createPerf] = nursePerformanceApi.useCreate();
  const [updatePerf] = nursePerformanceApi.useUpdate();
  const [saving, setSaving] = useState(false);

  /**
   * Edits are held apart from server values rather than copied into a draft on
   * load. A draft seeded by an effect has to be resynced every time the query
   * refetches, and gets it wrong when a refetch lands mid-edit; this way the
   * rendered value is simply the edit if there is one, otherwise the server's.
   */
  const [edits, setEdits] = useState<Record<string, Partial<PerfValues>>>({});

  const rows = useMemo(
    () => (perfQuery.data?.data ?? []) as NursePerformanceRow[],
    [perfQuery.data],
  );

  const byNurse = useMemo(() => {
    const map = new Map<string, NursePerformanceRow>();
    for (const row of rows) map.set(row.nurse_id, row);
    return map;
  }, [rows]);

  const valueOf = (nurseId: string, field: keyof PerfValues) => {
    const edited = edits[nurseId]?.[field];
    if (edited !== undefined) return edited;
    const row = byNurse.get(nurseId);
    return row ? Number(row[field]) : 0;
  };

  const setValue = (nurseId: string, field: keyof PerfValues, value: number) =>
    setEdits(prev => ({ ...prev, [nurseId]: { ...prev[nurseId], [field]: value } }));

  const dirtyIds = Object.keys(edits).filter(id =>
    PERF_FIELDS.some(field => {
      const edited = edits[id]?.[field];
      if (edited === undefined) return false;
      const row = byNurse.get(id);
      return edited !== (row ? Number(row[field]) : 0);
    }),
  );

  const totals = useMemo(() => {
    const sum = (field: keyof PerfValues) =>
      nurses.reduce((total, nurse) => total + valueOf(nurse.id, field), 0);
    return {
      patients: sum("patients_handled"),
      hours: sum("hours_worked"),
      attendance: nurses.length ? (sum("attendance_pct") / nurses.length).toFixed(1) : "0",
      feedback: nurses.length ? (sum("feedback") / nurses.length).toFixed(2) : "0",
    };
    // valueOf closes over edits and byNurse, both of which are dependencies.
  }, [nurses, edits, byNurse]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!dirtyIds.length) return;
    setSaving(true);

    const results = await Promise.allSettled(
      dirtyIds.map(nurseId => {
        const body = {
          patients_handled: valueOf(nurseId, "patients_handled"),
          hours_worked: valueOf(nurseId, "hours_worked"),
          attendance_pct: valueOf(nurseId, "attendance_pct"),
          incidents: valueOf(nurseId, "incidents"),
          feedback: valueOf(nurseId, "feedback"),
        };
        const existing = byNurse.get(nurseId);
        // A nurse with no row yet gets one on first save, so the tab needs no
        // separate "start tracking this nurse" step.
        return existing
          ? updatePerf(existing.id, body).unwrap()
          : createPerf({ nurse_id: nurseId, ...body }).unwrap();
      }),
    );

    const failed = results.filter(r => r.status === "rejected").length;
    setSaving(false);

    if (failed) {
      toast.error(t("saveFailedSome", { failed, total: dirtyIds.length }));
      return;
    }
    setEdits({});
    toast.success(dirtyIds.length === 1 ? t("performanceSaved") : t("nursesSaved", { count: dirtyIds.length }));
  };

  const loading = nursesLoading || perfQuery.isLoading;
  const error = nursesError || perfQuery.error;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Users} label={t("kpi.patients")} value={totals.patients.toLocaleString()} tone="primary" />
        <Kpi icon={Activity} label={t("kpi.hours")} value={totals.hours.toLocaleString()} tone="accent" />
        <Kpi icon={HeartPulse} label={t("kpi.attendance")} value={`${totals.attendance}%`} tone="chip" />
        <Kpi icon={Star} label={t("kpi.feedback")} value={`${totals.feedback} / 5`} tone="primary" />
      </div>

      <Card className="p-5">
        <SectionTitle
          title={t("performanceTitle")}
          action={
            dirtyIds.length > 0
              ? <span className="text-xs font-semibold text-muted-foreground">
                  {t("unsavedRows", { count: dirtyIds.length })}
                </span>
              : undefined
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-widest font-bold text-muted-foreground border-b border-border/60">
                <th className="py-2 pr-3">{t("nurse").toUpperCase()}</th>
                <th className="py-2 pr-3">{t("perf.patients")}</th>
                <th className="py-2 pr-3">{t("perf.hours")}</th>
                <th className="py-2 pr-3">{t("perf.attendance")}</th>
                <th className="py-2 pr-3">{t("perf.incidents")}</th>
                <th className="py-2 pr-3">{t("perf.feedback")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">{tc("loading")}</td></tr>
              ) : nurses.length === 0 ? (
                <EmptyOrError error={error} colSpan={6} empty={t("addNursesFirst")} />
              ) : (
                nurses.map(n => {
                  const attendance = valueOf(n.id, "attendance_pct");
                  return (
                    <tr key={n.id} className="border-b border-border/40">
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-primary">{n.name}</div>
                        <div className="text-xs text-muted-foreground">{n.ward || t("unassigned")} · {shiftLabel(n.shift)}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <input type="number" min={0} step={1} value={valueOf(n.id, "patients_handled")}
                          aria-label={t("perfLabels.patients", { name: n.name })}
                          onChange={e => setValue(n.id, "patients_handled", Number(e.target.value))}
                          className="w-24 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                      </td>
                      <td className="py-3 pr-3">
                        <input type="number" min={0} step={1} value={valueOf(n.id, "hours_worked")}
                          aria-label={t("perfLabels.hours", { name: n.name })}
                          onChange={e => setValue(n.id, "hours_worked", Number(e.target.value))}
                          className="w-24 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          {/* step must match the column's scale, not merely allow
                              "some" decimals. attendance_pct is numeric(5,2), so
                              88.25 is a value the database accepts — step="0.1"
                              would have the browser silently refuse it. */}
                          <input type="number" min={0} max={100} step="0.01" value={attendance}
                            aria-label={t("perfLabels.attendance", { name: n.name })}
                            onChange={e => setValue(n.id, "attendance_pct", Number(e.target.value))}
                            className="w-20 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                          <div className="w-24 h-2 bg-muted/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-primary-glow"
                              style={{ width: `${Math.min(100, Math.max(0, attendance))}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <input type="number" min={0} step={1} value={valueOf(n.id, "incidents")}
                          aria-label={t("perfLabels.incidents", { name: n.name })}
                          onChange={e => setValue(n.id, "incidents", Number(e.target.value))}
                          className="w-20 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <input type="number" min={0} max={5} step="0.1" value={valueOf(n.id, "feedback")}
                            aria-label={t("perfLabels.feedback", { name: n.name })}
                            onChange={e => setValue(n.id, "feedback", Number(e.target.value))}
                            className="w-20 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
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
            {saving ? tc("saving") : t("saveMetrics")}
          </Btn>
        </div>
      </Card>
    </div>
  );
};

export default Page;
