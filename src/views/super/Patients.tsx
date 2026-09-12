"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, Kpi, Pill, Btn } from "@/components/admin/ui";
import {
  DataTable, Toolbar, Modal, Drawer, ConfirmDialog, RowActions, Chips, Field, Input, Select, TextArea, exportCSV,
  type Column,
} from "@/components/admin/crud";
import { Avatar } from "@/components/common/Avatar";
import { useFormatters } from "@/lib/appSettings";
import { Users, KeyRound, BadgeCheck, UserX, UserCheck, Loader2, Copy } from "lucide-react";

/**
 * Every patient on the platform, as people.
 *
 * A patient with a login is one person with a record at each hospital that
 * has treated them. A walk-in record with no login belongs to its hospital
 * and is read-only here. The super admin can create a patient's login,
 * correct their personal details, and suspend or reactivate them.
 */

type Hospital = { record_id: string; id: string; name: string; mrn: string; since: string };

type Person = {
  id: string;
  key: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  has_login: boolean;
  is_active: boolean | null;
  verified: boolean;
  joined_at: string;
  has_details: boolean;
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  blood_group: string | null;
  national_id: string | null;
  address: string | null;
  emergency_contact: { name: string; phone: string | null; relation: string | null } | null;
  hospitals: Hospital[];
};

type Filter = "all" | "login" | "walkin" | "suspended";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "login", label: "With a login" },
  { value: "walkin", label: "Walk-in records" },
  { value: "suspended", label: "Suspended" },
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const MARITAL = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

const BLOOD_GROUPS = [
  { value: "a_positive", label: "A+" }, { value: "a_negative", label: "A−" },
  { value: "b_positive", label: "B+" }, { value: "b_negative", label: "B−" },
  { value: "ab_positive", label: "AB+" }, { value: "ab_negative", label: "AB−" },
  { value: "o_positive", label: "O+" }, { value: "o_negative", label: "O−" },
];

const labelOf = (list: { value: string; label: string }[], v: string | null) => list.find(o => o.value === v)?.label ?? null;

type Draft = Record<string, string>;

const EDIT_KEYS = ["full_name", "phone", "date_of_birth", "gender", "marital_status", "blood_group", "national_id", "address"] as const;
const EMPTY_CREATE: Draft = { full_name: "", email: "", phone: "", date_of_birth: "", gender: "", blood_group: "" };

const loginState = (p: Person) =>
  !p.has_login ? { label: "Walk-in", tone: "default" as const }
    : p.is_active ? { label: "Active", tone: "ok" as const }
      : { label: "Suspended", tone: "bad" as const };

const errorOf = async (res: Response) => (await res.json().catch(() => null))?.error?.message as string | undefined;

const Patients = () => {
  const { formatDate } = useFormatters();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const [viewKey, setViewKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<Person | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>({});
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<Draft>(EMPTY_CREATE);
  const [saving, setSaving] = useState(false);
  const [creds, setCreds] = useState<{ name: string; email: string; password: string } | null>(null);
  const [pendingActive, setPendingActive] = useState<{ person: Person; active: boolean } | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/v1/super/patients");
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message);
      setPeople((body.data ?? []).map((p: Omit<Person, "id">) => ({ ...p, id: p.key })));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const viewing = people.find(p => p.key === viewKey) ?? null;

  const counts = useMemo(() => ({
    all: people.length,
    login: people.filter(p => p.has_login).length,
    verified: people.filter(p => p.verified).length,
    suspended: people.filter(p => p.has_login && !p.is_active).length,
  }), [people]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter(p => {
      if (filter === "login" && !p.has_login) return false;
      if (filter === "walkin" && p.has_login) return false;
      if (filter === "suspended" && !(p.has_login && !p.is_active)) return false;
      if (!q) return true;
      return [p.full_name, p.email, p.phone, p.national_id, ...p.hospitals.flatMap(h => [h.name, h.mrn])]
        .some(v => v?.toLowerCase().includes(q));
    });
  }, [people, filter, query]);

  const openEdit = (p: Person) => {
    setEditDraft(Object.fromEntries(EDIT_KEYS.map(k => [k, p[k] == null ? "" : String(p[k])])));
    setEditing(p);
  };

  const saveEdit = async () => {
    if (!editing?.profile_id) return;
    if (!editDraft.full_name?.trim()) { toast.error("Name is required"); return; }
    const keys = editing.has_details ? EDIT_KEYS : (["full_name", "phone"] as const);
    setSaving(true);
    try {
      const res = await fetch("/api/v1/super/patients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: editing.profile_id, ...Object.fromEntries(keys.map(k => [k, editDraft[k] ?? ""])) }),
      });
      if (!res.ok) { toast.error("Couldn't save", { description: await errorOf(res) }); return; }
      toast.success("Patient updated");
      setEditing(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const saveCreate = async () => {
    if (!createDraft.full_name.trim()) { toast.error("Name is required"); return; }
    if (!createDraft.email.trim()) { toast.error("Email is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/super/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDraft),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error("Couldn't create the patient", { description: body?.error?.message }); return; }
      if (body.warning) toast.warning(body.warning);
      setCreds({ name: createDraft.full_name.trim(), ...body.data });
      setCreating(false);
      setCreateDraft(EMPTY_CREATE);
      toast.success("Patient created");
      void load();
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (person: Person, active: boolean) => {
    if (!person.profile_id) return;
    const res = await fetch("/api/v1/super/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: person.profile_id, active }),
    });
    if (!res.ok) {
      toast.error(active ? "Couldn't reactivate" : "Couldn't suspend", { description: await errorOf(res) });
      return;
    }
    toast.success(active ? `${person.full_name} can sign in again` : `${person.full_name} is suspended and signed out`);
    void load();
  };

  const columns: Column<Person>[] = [
    {
      key: "name", label: "PATIENT", sortable: true, accessor: p => p.full_name,
      render: p => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={p.avatar_url} name={p.full_name} className="h-9 w-9" />
          <div className="min-w-0">
            <p className="font-semibold text-primary truncate flex items-center gap-1.5">
              {p.full_name}
              {p.verified && <BadgeCheck className="h-4 w-4 text-primary-glow shrink-0" aria-label="Verified" />}
            </p>
            <p className="text-xs text-muted-foreground truncate">{p.email || "No email"}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", label: "PHONE", accessor: p => p.phone ?? "", render: p => p.phone || "—" },
    {
      key: "dob", label: "DATE OF BIRTH", sortable: true, accessor: p => p.date_of_birth ?? "",
      render: p => (p.date_of_birth ? formatDate(p.date_of_birth) : "—"),
    },
    {
      key: "hospitals", label: "HOSPITALS", sortable: true, accessor: p => p.hospitals.length,
      render: p => p.hospitals.length === 0
        ? <span className="text-xs text-muted-foreground">None yet</span>
        : (
          <div className="flex flex-wrap gap-1">
            {p.hospitals.map(h => (
              <span key={h.record_id} className="rounded-full bg-chip text-primary px-2 py-0.5 text-[11px] font-semibold">{h.name}</span>
            ))}
          </div>
        ),
    },
    {
      key: "login", label: "LOGIN", sortable: true, accessor: p => loginState(p).label,
      render: p => <Pill tone={loginState(p).tone}>{loginState(p).label}</Pill>,
    },
  ];

  const set = (setter: typeof setEditDraft) => (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setter(d => ({ ...d, [key]: e.target.value }));
  const setEdit = set(setEditDraft);
  const setCreate = set(setCreateDraft);

  return (
    <SuperLayout title="Patient Management" subtitle="Every patient on HealthFlow, across all hospitals">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Users} label="Patients" value={loading ? "—" : String(counts.all)} tone="primary" />
        <Kpi icon={KeyRound} label="With a login" value={loading ? "—" : String(counts.login)} tone="accent" />
        <Kpi icon={BadgeCheck} label="Verified" value={loading ? "—" : String(counts.verified)} tone="chip" />
        <Kpi icon={UserX} label="Suspended" value={loading ? "—" : String(counts.suspended)} tone={counts.suspended ? "destructive" : "primary"} />
      </div>

      <Card className="p-5">
        <Toolbar
          search={query} onSearch={setQuery}
          onAdd={() => { setCreateDraft(EMPTY_CREATE); setCreating(true); }} addLabel="Add Patient"
          onExport={() => exportCSV(rows.map(p => ({
            name: p.full_name, email: p.email, phone: p.phone, date_of_birth: p.date_of_birth,
            hospitals: p.hospitals.map(h => `${h.name} (${h.mrn})`).join("; "), login: loginState(p).label,
            verified: p.verified ? "yes" : "no",
          })), "patients.csv")}
          filters={<Chips value={filter} onChange={setFilter} options={FILTERS} />}
        />
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : failed ? (
          <div className="py-12 text-center">
            <p className="text-sm text-foreground/80">Couldn&apos;t load the patients.</p>
            <Btn variant="outline" className="mt-4" onClick={() => void load()}>Try again</Btn>
          </div>
        ) : (
          <DataTable<Person>
            rows={rows}
            columns={columns}
            onRow={p => setViewKey(p.key)}
            empty="No patients match."
            actions={p => (
              <RowActions
                onView={() => setViewKey(p.key)}
                onEdit={p.has_login ? () => openEdit(p) : undefined}
                extra={p.has_login && (
                  <button type="button" onClick={() => setPendingActive({ person: p, active: !p.is_active })}
                    title={p.is_active ? "Suspend login" : "Reactivate login"}
                    className={`p-1.5 rounded-lg ${p.is_active ? "hover:bg-destructive/10 text-destructive" : "hover:bg-muted text-foreground/70"}`}>
                    {p.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </button>
                )}
              />
            )}
          />
        )}
      </Card>

      {/* View */}
      <Drawer open={!!viewing} onClose={() => setViewKey(null)} title="Patient">
        {viewing && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar src={viewing.avatar_url} name={viewing.full_name} className="h-16 w-16" />
              <div className="min-w-0">
                <p className="font-display text-2xl text-primary truncate flex items-center gap-2">
                  {viewing.full_name}
                  {viewing.verified && <BadgeCheck className="h-5 w-5 text-primary-glow shrink-0" aria-label="Verified" />}
                </p>
                <p className="text-sm text-muted-foreground">{viewing.email || "No email"}</p>
                <div className="mt-1"><Pill tone={loginState(viewing).tone}>{loginState(viewing).label}</Pill></div>
              </div>
            </div>
            <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-sm">
              {([
                ["Phone", viewing.phone],
                ["Date of birth", viewing.date_of_birth ? formatDate(viewing.date_of_birth) : null],
                ["Gender", labelOf(GENDERS, viewing.gender)],
                ["Blood group", labelOf(BLOOD_GROUPS, viewing.blood_group)],
                ["Marital status", labelOf(MARITAL, viewing.marital_status)],
                ["National ID", viewing.national_id],
                ["Address", viewing.address],
                ["Emergency contact", viewing.emergency_contact
                  ? [viewing.emergency_contact.name, viewing.emergency_contact.relation, viewing.emergency_contact.phone].filter(Boolean).join(" · ")
                  : null],
                [viewing.has_login ? "Joined" : "First seen", formatDate(viewing.joined_at)],
              ] as const).map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-primary font-medium break-words">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="font-display text-lg text-primary mb-2">
                {viewing.hospitals.length === 1 ? "Hospital record" : `${viewing.hospitals.length} hospital records`}
              </p>
              {viewing.hospitals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hospital has seen them yet.</p>
              ) : (
                <div className="space-y-2">
                  {viewing.hospitals.map(h => (
                    <div key={h.record_id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 border border-border/40 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-primary truncate">{h.name}</p>
                        <p className="text-xs text-muted-foreground">MRN {h.mrn}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">since {formatDate(h.since)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {viewing.has_login ? (
              <div className="flex gap-2">
                <Btn variant="outline" onClick={() => { setViewKey(null); openEdit(viewing); }}>Edit</Btn>
                <Btn variant={viewing.is_active ? "danger" : "primary"}
                  onClick={() => setPendingActive({ person: viewing, active: !viewing.is_active })}>
                  {viewing.is_active ? "Suspend login" : "Reactivate login"}
                </Btn>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                A walk-in record with no HealthFlow login. It belongs to {viewing.hospitals[0]?.name ?? "its hospital"}, which edits it.
              </p>
            )}
          </div>
        )}
      </Drawer>

      {/* Edit */}
      <Modal open={!!editing} onClose={() => !saving && setEditing(null)} title={`Edit ${editing?.full_name ?? "patient"}`} size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Btn>
          <Btn onClick={() => void saveEdit()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Btn>
        </>}>
        {editing && (
          <>
            <div className="grid sm:grid-cols-2 gap-x-4">
              <Field label="Full name" required><Input value={editDraft.full_name} onChange={setEdit("full_name")} /></Field>
              <Field label="Phone"><Input type="tel" value={editDraft.phone} onChange={setEdit("phone")} /></Field>
            </div>
            {editing.has_details ? (
              <>
                <div className="grid sm:grid-cols-2 gap-x-4">
                  <Field label="Date of birth">
                    <Input type="date" value={editDraft.date_of_birth} onChange={setEdit("date_of_birth")} max={new Date().toISOString().slice(0, 10)} />
                  </Field>
                  <Field label="Gender">
                    <Select value={editDraft.gender} onChange={setEdit("gender")}>
                      <option value="">—</option>
                      {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Blood group">
                    <Select value={editDraft.blood_group} onChange={setEdit("blood_group")}>
                      <option value="">—</option>
                      {BLOOD_GROUPS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Marital status">
                    <Select value={editDraft.marital_status} onChange={setEdit("marital_status")}>
                      <option value="">—</option>
                      {MARITAL.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="National ID"><Input value={editDraft.national_id} onChange={setEdit("national_id")} /></Field>
                <Field label="Address"><TextArea rows={2} value={editDraft.address} onChange={setEdit("address")} /></Field>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                They haven&apos;t filled in their profile yet, so only the name and phone can be set here.
              </p>
            )}
          </>
        )}
      </Modal>

      {/* Create */}
      <Modal open={creating} onClose={() => !saving && setCreating(false)} title="Add Patient" size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setCreating(false)} disabled={saving}>Cancel</Btn>
          <Btn onClick={() => void saveCreate()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Create Patient</Btn>
        </>}>
        <p className="text-xs text-muted-foreground mb-4">
          Creates the patient&apos;s own HealthFlow login. They aren&apos;t tied to a hospital until one treats them.
        </p>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Full name" required><Input value={createDraft.full_name} onChange={setCreate("full_name")} /></Field>
          <Field label="Email" required hint="Their sign-in address"><Input type="email" value={createDraft.email} onChange={setCreate("email")} /></Field>
          <Field label="Phone"><Input type="tel" value={createDraft.phone} onChange={setCreate("phone")} /></Field>
          <Field label="Date of birth">
            <Input type="date" value={createDraft.date_of_birth} onChange={setCreate("date_of_birth")} max={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Gender">
            <Select value={createDraft.gender} onChange={setCreate("gender")}>
              <option value="">—</option>
              {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </Select>
          </Field>
          <Field label="Blood group">
            <Select value={createDraft.blood_group} onChange={setCreate("blood_group")}>
              <option value="">—</option>
              {BLOOD_GROUPS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>

      {/* New login's credentials — shown once */}
      <Modal open={!!creds} onClose={() => setCreds(null)} title="Patient login"
        footer={<Btn onClick={() => setCreds(null)}>Done</Btn>}>
        {creds && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Login for <span className="font-semibold text-primary">{creds.name}</span>. Copy the password now — it isn&apos;t shown again. They can change it after signing in.
            </p>
            {[{ label: "Email", value: creds.email }, { label: "Password", value: creds.password }].map(({ label, value }) => (
              <Field key={label} label={label}>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted/40 rounded-lg px-3 py-2 text-sm font-mono break-all">{value}</code>
                  <button type="button" onClick={() => { void navigator.clipboard.writeText(value); toast.success(`${label} copied`); }}
                    className="p-2 rounded-lg border border-border hover:bg-muted" title={`Copy ${label}`}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </Field>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pendingActive}
        onClose={() => setPendingActive(null)}
        onConfirm={() => pendingActive && void setActive(pendingActive.person, pendingActive.active)}
        title={pendingActive?.active ? "Reactivate this login?" : "Suspend this login?"}
        description={
          pendingActive
            ? pendingActive.active
              ? `${pendingActive.person.full_name} will be able to sign in again.`
              : `${pendingActive.person.full_name} is signed out now and can't sign in until reactivated. Their medical records stay with each hospital.`
            : undefined
        }
      />
    </SuperLayout>
  );
};

export default Patients;
