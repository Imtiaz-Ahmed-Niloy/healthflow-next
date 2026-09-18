"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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

const FILTERS = ["all", "login", "walkin", "suspended"] as const;
type Filter = (typeof FILTERS)[number];

const GENDERS = ["male", "female", "other"] as const;
const MARITAL = ["single", "married", "divorced", "widowed"] as const;

/** Blood groups read the same in either language. */
const BLOOD_GROUPS = [
  { value: "a_positive", label: "A+" }, { value: "a_negative", label: "A−" },
  { value: "b_positive", label: "B+" }, { value: "b_negative", label: "B−" },
  { value: "ab_positive", label: "AB+" }, { value: "ab_negative", label: "AB−" },
  { value: "o_positive", label: "O+" }, { value: "o_negative", label: "O−" },
];

type Draft = Record<string, string>;

const EDIT_KEYS = ["full_name", "phone", "date_of_birth", "gender", "marital_status", "blood_group", "national_id", "address"] as const;
const EMPTY_CREATE: Draft = { full_name: "", email: "", phone: "", date_of_birth: "", gender: "", blood_group: "" };

const errorOf = async (res: Response) => (await res.json().catch(() => null))?.error?.message as string | undefined;

const Patients = () => {
  const t = useTranslations("super.patients");
  const tc = useTranslations("common");
  const genderLabel = (v: string | null) =>
    v && (GENDERS as readonly string[]).includes(v) ? t(`genders.${v as (typeof GENDERS)[number]}`) : null;
  const maritalLabel = (v: string | null) =>
    v && (MARITAL as readonly string[]).includes(v) ? t(`marital.${v as (typeof MARITAL)[number]}`) : null;
  const bloodLabel = (v: string | null) => BLOOD_GROUPS.find(b => b.value === v)?.label ?? null;
  const loginState = (p: Person) =>
    !p.has_login ? { label: t("login.walkin"), tone: "default" as const }
      : p.is_active ? { label: t("login.active"), tone: "ok" as const }
        : { label: t("login.suspended"), tone: "bad" as const };

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
    if (!editDraft.full_name?.trim()) { toast.error(t("nameRequired")); return; }
    const keys = editing.has_details ? EDIT_KEYS : (["full_name", "phone"] as const);
    setSaving(true);
    try {
      const res = await fetch("/api/v1/super/patients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: editing.profile_id, ...Object.fromEntries(keys.map(k => [k, editDraft[k] ?? ""])) }),
      });
      if (!res.ok) { toast.error(t("saveFailed"), { description: await errorOf(res) }); return; }
      toast.success(t("updated"));
      setEditing(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const saveCreate = async () => {
    if (!createDraft.full_name.trim()) { toast.error(t("nameRequired")); return; }
    if (!createDraft.email.trim()) { toast.error(t("emailRequired")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/super/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDraft),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(t("createFailed"), { description: body?.error?.message }); return; }
      if (body.warning) toast.warning(body.warning);
      setCreds({ name: createDraft.full_name.trim(), ...body.data });
      setCreating(false);
      setCreateDraft(EMPTY_CREATE);
      toast.success(t("created"));
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
      toast.error(active ? t("reactivateFailed") : t("suspendFailed"), { description: await errorOf(res) });
      return;
    }
    toast.success(active ? t("reactivated", { name: person.full_name }) : t("suspended", { name: person.full_name }));
    void load();
  };

  const columns: Column<Person>[] = [
    {
      key: "name", label: t("columns.patient"), sortable: true, accessor: p => p.full_name,
      render: p => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={p.avatar_url} name={p.full_name} className="h-9 w-9" />
          <div className="min-w-0">
            <p className="font-semibold text-primary truncate flex items-center gap-1.5">
              {p.full_name}
              {p.verified && <BadgeCheck className="h-4 w-4 text-primary-glow shrink-0" aria-label={t("verified")} />}
            </p>
            <p className="text-xs text-muted-foreground truncate">{p.email || t("noEmail")}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", label: t("columns.phone"), accessor: p => p.phone ?? "", render: p => p.phone || "—" },
    {
      key: "dob", label: t("columns.dob"), sortable: true, accessor: p => p.date_of_birth ?? "",
      render: p => (p.date_of_birth ? formatDate(p.date_of_birth) : "—"),
    },
    {
      key: "hospitals", label: t("columns.hospitals"), sortable: true, accessor: p => p.hospitals.length,
      render: p => p.hospitals.length === 0
        ? <span className="text-xs text-muted-foreground">{t("noneYet")}</span>
        : (
          <div className="flex flex-wrap gap-1">
            {p.hospitals.map(h => (
              <span key={h.record_id} className="rounded-full bg-chip text-primary px-2 py-0.5 text-[11px] font-semibold">{h.name}</span>
            ))}
          </div>
        ),
    },
    {
      key: "login", label: t("columns.login"), sortable: true, accessor: p => loginState(p).label,
      render: p => <Pill tone={loginState(p).tone}>{loginState(p).label}</Pill>,
    },
  ];

  const set = (setter: typeof setEditDraft) => (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setter(d => ({ ...d, [key]: e.target.value }));
  const setEdit = set(setEditDraft);
  const setCreate = set(setCreateDraft);

  const genderOptions = (
    <>
      <option value="">—</option>
      {GENDERS.map(g => <option key={g} value={g}>{genderLabel(g)}</option>)}
    </>
  );
  const bloodOptions = (
    <>
      <option value="">—</option>
      {BLOOD_GROUPS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
    </>
  );

  return (
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Users} label={t("kpis.patients")} value={loading ? "—" : String(counts.all)} tone="primary" />
        <Kpi icon={KeyRound} label={t("filters.login")} value={loading ? "—" : String(counts.login)} tone="accent" />
        <Kpi icon={BadgeCheck} label={t("verified")} value={loading ? "—" : String(counts.verified)} tone="chip" />
        <Kpi icon={UserX} label={t("filters.suspended")} value={loading ? "—" : String(counts.suspended)} tone={counts.suspended ? "destructive" : "primary"} />
      </div>

      <Card className="p-5">
        <Toolbar
          search={query} onSearch={setQuery}
          onAdd={() => { setCreateDraft(EMPTY_CREATE); setCreating(true); }} addLabel={t("add")}
          onExport={() => exportCSV(rows.map(p => ({
            [t("csv.name")]: p.full_name, [t("csv.email")]: p.email, [t("csv.phone")]: p.phone,
            [t("csv.dob")]: p.date_of_birth,
            [t("csv.hospitals")]: p.hospitals.map(h => `${h.name} (${h.mrn})`).join("; "),
            [t("csv.login")]: loginState(p).label,
            [t("csv.verified")]: p.verified ? tc("yes") : tc("no"),
          })), "patients.csv")}
          filters={<Chips value={filter} onChange={setFilter} options={FILTERS.map(value => ({ value, label: t(`filters.${value}`) }))} />}
        />
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : failed ? (
          <div className="py-12 text-center">
            <p className="text-sm text-foreground/80">{t("loadFailed")}</p>
            <Btn variant="outline" className="mt-4" onClick={() => void load()}>{t("tryAgain")}</Btn>
          </div>
        ) : (
          <DataTable<Person>
            rows={rows}
            columns={columns}
            onRow={p => setViewKey(p.key)}
            empty={t("noMatch")}
            actions={p => (
              <RowActions
                onView={() => setViewKey(p.key)}
                onEdit={p.has_login ? () => openEdit(p) : undefined}
                extra={p.has_login && (
                  <button type="button" onClick={() => setPendingActive({ person: p, active: !p.is_active })}
                    title={p.is_active ? t("suspendLogin") : t("reactivateLogin")}
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
      <Drawer open={!!viewing} onClose={() => setViewKey(null)} title={t("drawerTitle")}>
        {viewing && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar src={viewing.avatar_url} name={viewing.full_name} className="h-16 w-16" />
              <div className="min-w-0">
                <p className="font-display text-2xl text-primary truncate flex items-center gap-2">
                  {viewing.full_name}
                  {viewing.verified && <BadgeCheck className="h-5 w-5 text-primary-glow shrink-0" aria-label={t("verified")} />}
                </p>
                <p className="text-sm text-muted-foreground">{viewing.email || t("noEmail")}</p>
                <div className="mt-1"><Pill tone={loginState(viewing).tone}>{loginState(viewing).label}</Pill></div>
              </div>
            </div>
            <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-sm">
              {([
                [t("fields.phone"), viewing.phone],
                [t("fields.dob"), viewing.date_of_birth ? formatDate(viewing.date_of_birth) : null],
                [t("fields.gender"), genderLabel(viewing.gender)],
                [t("fields.bloodGroup"), bloodLabel(viewing.blood_group)],
                [t("fields.marital"), maritalLabel(viewing.marital_status)],
                [t("fields.nationalId"), viewing.national_id],
                [t("fields.address"), viewing.address],
                [t("fields.emergency"), viewing.emergency_contact
                  ? [viewing.emergency_contact.name, viewing.emergency_contact.relation, viewing.emergency_contact.phone].filter(Boolean).join(" · ")
                  : null],
                [viewing.has_login ? t("fields.joined") : t("fields.firstSeen"), formatDate(viewing.joined_at)],
              ] as const).map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-primary font-medium break-words">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="font-display text-lg text-primary mb-2">
                {t("records", { count: viewing.hospitals.length })}
              </p>
              {viewing.hospitals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noHospital")}</p>
              ) : (
                <div className="space-y-2">
                  {viewing.hospitals.map(h => (
                    <div key={h.record_id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 border border-border/40 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-primary truncate">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{t("mrn", { mrn: h.mrn })}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{t("since", { date: formatDate(h.since) })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {viewing.has_login ? (
              <div className="flex gap-2">
                <Btn variant="outline" onClick={() => { setViewKey(null); openEdit(viewing); }}>{tc("edit")}</Btn>
                <Btn variant={viewing.is_active ? "danger" : "primary"}
                  onClick={() => setPendingActive({ person: viewing, active: !viewing.is_active })}>
                  {viewing.is_active ? t("suspendLogin") : t("reactivateLogin")}
                </Btn>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {viewing.hospitals[0]?.name
                  ? t("walkinNote", { hospital: viewing.hospitals[0].name })
                  : t("walkinNoteAnon")}
              </p>
            )}
          </div>
        )}
      </Drawer>

      {/* Edit */}
      <Modal open={!!editing} onClose={() => !saving && setEditing(null)}
        title={editing?.full_name ? t("editTitle", { name: editing.full_name }) : t("editTitleAnon")} size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setEditing(null)} disabled={saving}>{tc("cancel")}</Btn>
          <Btn onClick={() => void saveEdit()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} {tc("save")}</Btn>
        </>}>
        {editing && (
          <>
            <div className="grid sm:grid-cols-2 gap-x-4">
              <Field label={t("fields.name")} required><Input value={editDraft.full_name} onChange={setEdit("full_name")} /></Field>
              <Field label={t("fields.phone")}><Input type="tel" value={editDraft.phone} onChange={setEdit("phone")} /></Field>
            </div>
            {editing.has_details ? (
              <>
                <div className="grid sm:grid-cols-2 gap-x-4">
                  <Field label={t("fields.dob")}>
                    <Input type="date" value={editDraft.date_of_birth} onChange={setEdit("date_of_birth")} max={new Date().toISOString().slice(0, 10)} />
                  </Field>
                  <Field label={t("fields.gender")}>
                    <Select value={editDraft.gender} onChange={setEdit("gender")}>{genderOptions}</Select>
                  </Field>
                  <Field label={t("fields.bloodGroup")}>
                    <Select value={editDraft.blood_group} onChange={setEdit("blood_group")}>{bloodOptions}</Select>
                  </Field>
                  <Field label={t("fields.marital")}>
                    <Select value={editDraft.marital_status} onChange={setEdit("marital_status")}>
                      <option value="">—</option>
                      {MARITAL.map(m => <option key={m} value={m}>{maritalLabel(m)}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label={t("fields.nationalId")}><Input value={editDraft.national_id} onChange={setEdit("national_id")} /></Field>
                <Field label={t("fields.address")}><TextArea rows={2} value={editDraft.address} onChange={setEdit("address")} /></Field>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{t("noProfileYet")}</p>
            )}
          </>
        )}
      </Modal>

      {/* Create */}
      <Modal open={creating} onClose={() => !saving && setCreating(false)} title={t("add")} size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setCreating(false)} disabled={saving}>{tc("cancel")}</Btn>
          <Btn onClick={() => void saveCreate()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} {t("create")}</Btn>
        </>}>
        <p className="text-xs text-muted-foreground mb-4">{t("createNote")}</p>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label={t("fields.name")} required><Input value={createDraft.full_name} onChange={setCreate("full_name")} /></Field>
          <Field label={t("fields.email")} required hint={t("fields.emailHint")}><Input type="email" value={createDraft.email} onChange={setCreate("email")} /></Field>
          <Field label={t("fields.phone")}><Input type="tel" value={createDraft.phone} onChange={setCreate("phone")} /></Field>
          <Field label={t("fields.dob")}>
            <Input type="date" value={createDraft.date_of_birth} onChange={setCreate("date_of_birth")} max={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label={t("fields.gender")}>
            <Select value={createDraft.gender} onChange={setCreate("gender")}>{genderOptions}</Select>
          </Field>
          <Field label={t("fields.bloodGroup")}>
            <Select value={createDraft.blood_group} onChange={setCreate("blood_group")}>{bloodOptions}</Select>
          </Field>
        </div>
      </Modal>

      {/* New login's credentials — shown once */}
      <Modal open={!!creds} onClose={() => setCreds(null)} title={t("credsTitle")}
        footer={<Btn onClick={() => setCreds(null)}>{t("done")}</Btn>}>
        {creds && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t.rich("credsIntro", {
                name: creds.name,
                b: chunks => <span className="font-semibold text-primary">{chunks}</span>,
              })}
            </p>
            {[{ label: t("fields.email"), value: creds.email }, { label: t("password"), value: creds.password }].map(({ label, value }) => (
              <Field key={label} label={label}>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted/40 rounded-lg px-3 py-2 text-sm font-mono break-all">{value}</code>
                  <button type="button" onClick={() => { void navigator.clipboard.writeText(value); toast.success(t("copied", { label })); }}
                    className="p-2 rounded-lg border border-border hover:bg-muted" title={t("copy", { label })}>
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
        title={pendingActive?.active ? t("reactivateTitle") : t("suspendTitle")}
        description={
          pendingActive
            ? pendingActive.active
              ? t("reactivateBody", { name: pendingActive.person.full_name })
              : t("suspendBody", { name: pendingActive.person.full_name })
            : undefined
        }
      />
    </SuperLayout>
  );
};

export default Patients;
