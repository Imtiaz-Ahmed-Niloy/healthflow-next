"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Card, Kpi, Pill, Btn, SectionTitle } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import {
  HeartPulse, Users, Building2, CalendarRange, Star, Activity,
  Plus, Trash2, TrendingUp, ClipboardList, Loader2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
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

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On Leave" },
  { value: "suspended", label: "Suspended" },
];

const statusLabel = (value: string) =>
  STATUSES.find(s => s.value === value)?.label ?? value;

const TABS = ["Directory", "Department Allocation", "Shift Management", "Performance"] as const;
type Tab = (typeof TABS)[number];

/** Message read off a failed mutation, falling back to something actionable. */
const reasonFor = (cause: unknown) =>
  (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? "Please try again.";

/** Nurse list for the three tabs that hang off the directory. */
const useNurses = () => {
  const { data, isLoading, error } = nursesApi.useList({ limit: 100 });
  return { nurses: (data?.data ?? []) as NurseRow[], isLoading, error };
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

const Page = () => {
  const [tab, setTab] = useState<Tab>("Directory");
  return (
    <AdminLayout title="Nurse Management" subtitle="Directory, allocation, shifts & performance">
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t ? "bg-primary text-primary-foreground shadow-soft" : "bg-card border border-border/60 text-foreground/70 hover:bg-muted/60"
            }`}>{t}</button>
        ))}
      </div>
      {tab === "Directory" && <DirectoryTab />}
      {tab === "Department Allocation" && <AllocationTab />}
      {tab === "Shift Management" && <ShiftTab />}
      {tab === "Performance" && <PerformanceTab />}
    </AdminLayout>
  );
};

/* --------------------------------------------------------- Directory --- */

const DirectoryTab = () => (
  <ResourcePage<NurseRow> config={{
    storeKey: "nurses",
    resource: "nurses",
    exportName: "nurses",
    addLabel: "Add Nurse",
    searchFields: ["name", "ward", "license", "qualification", "email"],
    statuses: STATUSES,
    columns: [
      { key: "name", label: "Name", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
      { key: "ward", label: "Ward", sortable: true, accessor: r => r.ward ?? "", render: r => r.ward || <span className="text-muted-foreground">Unassigned</span> },
      { key: "shift", label: "Shift", sortable: true, accessor: r => r.shift },
      { key: "qualification", label: "Qualification", render: r => r.qualification || "—" },
      { key: "license", label: "License", render: r => <span className="font-mono text-xs">{r.license || "—"}</span> },
      { key: "phone", label: "Phone", render: r => <span className="font-mono text-xs">{r.phone || "—"}</span> },
      { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
    ],
    fields: [
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "qualification", label: "Qualification", type: "text" },
      // min/numberStep, not just the label: a number input with no step
      // defaults to step=1 and silently blocks submit on anything else.
      { name: "experience_years", label: "Experience (years)", type: "number", min: 0, numberStep: 1 },
      { name: "ward", label: "Ward / Department", type: "select", options: ["", ...WARDS] },
      { name: "shift", label: "Shift", type: "select", options: SHIFTS },
      { name: "license", label: "License #", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "status", label: "Status", type: "select", options: STATUSES },
    ],
  }} />
);

/* ------------------------------------------------ Department Allocation --- */

const UNASSIGNED = "__unassigned__";

const AllocationTab = () => {
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
      toast.success("Ward updated");
    } catch (cause) {
      toast.error("Could not move nurse", { description: reasonFor(cause) });
    } finally {
      setMoving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Total Nurses" value={String(nurses.length)} tone="primary" />
        <Kpi icon={Building2} label="Departments" value={String(WARDS.length)} tone="accent" />
        <Kpi icon={HeartPulse} label="ICU Coverage" value={String(byWard["ICU"]?.length ?? 0)} tone="destructive" />
        <Kpi icon={Activity} label="ER Coverage" value={String(byWard["ER"]?.length ?? 0)} tone="chip" />
      </div>

      <Card className="p-5">
        <SectionTitle title="Department Allocation" />
        {error ? (
          <p className="py-8 text-center text-sm font-semibold text-destructive">
            Could not load nurses. Refresh to try again.
          </p>
        ) : isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : nurses.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Add nurses in the Directory first.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {columns.map(w => (
              <div key={w} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-display text-sm text-primary">{w === UNASSIGNED ? "Unassigned" : w}</p>
                  <Pill tone="info">{byWard[w]?.length ?? 0}</Pill>
                </div>
                <ul className="space-y-2">
                  {(byWard[w] ?? []).map(n => (
                    <li key={n.id} className="rounded-lg bg-card border border-border/40 p-2">
                      <div className="font-semibold text-sm text-primary truncate">{n.name}</div>
                      <div className="flex items-center justify-between mt-1 gap-1">
                        <span className="text-[11px] text-muted-foreground">{n.shift}</span>
                        {moving === n.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        ) : (
                          <select value={n.ward || UNASSIGNED} onChange={e => void move(n.id, e.target.value)}
                            aria-label={`Ward for ${n.name}`}
                            className="text-[11px] bg-muted/40 rounded px-1 py-0.5 max-w-[110px]">
                            <option value={UNASSIGNED}>Unassigned</option>
                            {[...new Set([...WARDS, ...(n.ward ? [n.ward] : [])])].map(x => (
                              <option key={x} value={x}>{x}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </li>
                  ))}
                  {(byWard[w] ?? []).length === 0 && (
                    <li className="text-[11px] text-muted-foreground text-center py-3">Empty</li>
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
      toast.error("Pick a nurse");
      return;
    }
    setAdding(true);
    try {
      await createShift({ ...form, ward: form.ward.trim() || null }).unwrap();
      toast.success("Shift added");
      setForm(f => ({ ...f, ward: "" }));
    } catch (cause) {
      // The unique constraint is the likely one here: the same block twice on
      // the same day. createResourceRoute maps 23505 to a 409 "Already exists".
      toast.error("Could not add shift", { description: reasonFor(cause) });
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    setRemoving(id);
    try {
      await removeShift(id).unwrap();
      toast.success("Shift removed");
    } catch (cause) {
      toast.error("Could not remove shift", { description: reasonFor(cause) });
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
        <Kpi icon={CalendarRange} label="Shifts Scheduled" value={String(shifts.length)} tone="primary" />
        <Kpi icon={HeartPulse} label="Morning" value={String(shifts.filter(s => s.shift_type === "Morning").length)} tone="accent" />
        <Kpi icon={Activity} label="Evening" value={String(shifts.filter(s => s.shift_type === "Evening").length)} tone="chip" />
        <Kpi icon={ClipboardList} label="Night" value={String(shifts.filter(s => s.shift_type === "Night").length)} tone="destructive" />
      </div>

      <Card className="p-5">
        <SectionTitle title="Add Shift" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select value={form.nurse_id} onChange={e => setForm({ ...form, nurse_id: e.target.value })}
            aria-label="Nurse" className="md:col-span-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <option value="">Select nurse…</option>
            {nurses.map(n => (
              <option key={n.id} value={n.id}>{n.ward ? `${n.name} — ${n.ward}` : n.name}</option>
            ))}
          </select>
          <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value as (typeof DAYS)[number] })}
            aria-label="Day" className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={form.shift_type} onChange={e => setForm({ ...form, shift_type: e.target.value as (typeof SHIFT_TYPES)[number] })}
            aria-label="Shift type" className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            {SHIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Ward (optional)" value={form.ward} onChange={e => setForm({ ...form, ward: e.target.value })}
            aria-label="Ward" className="rounded-lg bg-muted/40 px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end mt-4">
          <Btn onClick={() => void add()} disabled={adding || nurses.length === 0}
            title={nurses.length === 0 ? "Add nurses in the Directory first" : undefined}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {adding ? "Adding…" : "Add Shift"}
          </Btn>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Weekly Roster" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-widest font-bold text-muted-foreground">
                <th className="py-2 pr-3 sticky left-0 bg-card">NURSE</th>
                {DAYS.map(d => <th key={d} className="py-2 px-2 text-center">{d.toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={DAYS.length + 1} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : nurses.length === 0 ? (
                <EmptyOrError error={error} colSpan={DAYS.length + 1} empty="Add nurses in the Directory first." />
              ) : (
                nurses.map(n => (
                  <tr key={n.id} className="border-t border-border/40 align-top">
                    <td className="py-3 pr-3 sticky left-0 bg-card">
                      <div className="font-semibold text-primary text-sm">{n.name}</div>
                      <div className="text-xs text-muted-foreground">{n.ward || "Unassigned"}</div>
                    </td>
                    {DAYS.map(day => (
                      <td key={day} className="py-2 px-1 min-w-[110px]">
                        <div className="flex flex-col gap-1">
                          {cellShifts(n.id, day).map(s => (
                            <div key={s.id} className={`relative group rounded-lg border px-2 py-1.5 text-[11px] ${SHIFT_TONES[s.shift_type] ?? SHIFT_TONES.Off}`}>
                              <div className="font-bold">{s.shift_type}</div>
                              {s.ward && <div className="opacity-70 truncate">{s.ward}</div>}
                              <button onClick={() => void remove(s.id)} disabled={removing === s.id}
                                aria-label={`Remove ${s.shift_type} on ${day} for ${n.name}`}
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
          <span className="text-xs font-semibold text-muted-foreground">Legend:</span>
          {SHIFT_TYPES.map(t => (
            <span key={t} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${SHIFT_TONES[t]}`}>{t}</span>
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
      toast.error(`${failed} of ${dirtyIds.length} could not be saved`);
      return;
    }
    setEdits({});
    toast.success(dirtyIds.length === 1 ? "Performance saved" : `${dirtyIds.length} nurses saved`);
  };

  const loading = nursesLoading || perfQuery.isLoading;
  const error = nursesError || perfQuery.error;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Patients Handled" value={totals.patients.toLocaleString()} tone="primary" />
        <Kpi icon={Activity} label="Hours Worked" value={totals.hours.toLocaleString()} tone="accent" />
        <Kpi icon={HeartPulse} label="Avg Attendance" value={`${totals.attendance}%`} tone="chip" />
        <Kpi icon={Star} label="Avg Feedback" value={`${totals.feedback} / 5`} tone="primary" />
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Nurse Performance"
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
                <th className="py-2 pr-3">NURSE</th>
                <th className="py-2 pr-3">PATIENTS</th>
                <th className="py-2 pr-3">HOURS</th>
                <th className="py-2 pr-3">ATTENDANCE %</th>
                <th className="py-2 pr-3">INCIDENTS</th>
                <th className="py-2 pr-3">FEEDBACK</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : nurses.length === 0 ? (
                <EmptyOrError error={error} colSpan={6} empty="Add nurses in the Directory first." />
              ) : (
                nurses.map(n => {
                  const attendance = valueOf(n.id, "attendance_pct");
                  return (
                    <tr key={n.id} className="border-b border-border/40">
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-primary">{n.name}</div>
                        <div className="text-xs text-muted-foreground">{n.ward || "Unassigned"} · {n.shift}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <input type="number" min={0} step={1} value={valueOf(n.id, "patients_handled")}
                          aria-label={`Patients handled by ${n.name}`}
                          onChange={e => setValue(n.id, "patients_handled", Number(e.target.value))}
                          className="w-24 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                      </td>
                      <td className="py-3 pr-3">
                        <input type="number" min={0} step={1} value={valueOf(n.id, "hours_worked")}
                          aria-label={`Hours worked by ${n.name}`}
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
                            aria-label={`Attendance for ${n.name}`}
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
                          aria-label={`Incidents for ${n.name}`}
                          onChange={e => setValue(n.id, "incidents", Number(e.target.value))}
                          className="w-20 rounded-md bg-muted/40 px-2 py-1 text-sm" />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <input type="number" min={0} max={5} step="0.1" value={valueOf(n.id, "feedback")}
                            aria-label={`Feedback for ${n.name}`}
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
            title={dirtyIds.length === 0 ? "No changes to save" : undefined}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Metrics"}
          </Btn>
        </div>
      </Card>
    </div>
  );
};

export default Page;
