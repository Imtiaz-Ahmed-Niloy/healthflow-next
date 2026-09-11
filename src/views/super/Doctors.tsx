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
import { Stethoscope, KeyRound, Building2, UserX, UserCheck, Loader2, Copy } from "lucide-react";

/**
 * Every doctor on the platform, as people (0077).
 *
 * A doctor with a login is one person however many hospitals list them; a
 * row with no login is a directory entry one hospital typed in. The super
 * admin can add a doctor to any hospital, correct a doctor's personal details
 * (copied to every hospital's row), and suspend or reactivate their login.
 */

type Hospital = { doctor_id: string; id: string; name: string; status: string; consultation_fee: number | null };

type Person = {
  id: string;
  key: string;
  profile_id: string | null;
  doctor_id: string;
  name: string;
  specialty: string | null;
  education: string | null;
  bio: string | null;
  languages: string | null;
  expertise: string | null;
  experience_years: number | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  gender: string | null;
  bmdc_number: string | null;
  has_login: boolean;
  is_active: boolean | null;
  joined_at: string;
  hospitals: Hospital[];
};

type Filter = "all" | "login" | "directory" | "suspended";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "login", label: "With a login" },
  { value: "directory", label: "Directory only" },
  { value: "suspended", label: "Suspended" },
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

type Draft = Record<string, string>;

const EDIT_KEYS = ["name", "specialty", "bmdc_number", "phone", "education", "experience_years", "gender", "languages", "expertise", "bio"] as const;

const EMPTY_CREATE: Draft = {
  tenant_id: "", name: "", email: "", specialty: "", bmdc_number: "", phone: "",
  education: "", experience_years: "", gender: "", consultation_fee: "",
};

const loginState = (p: Person) =>
  !p.has_login ? { label: "No login", tone: "default" as const }
    : p.is_active ? { label: "Active", tone: "ok" as const }
      : { label: "Suspended", tone: "bad" as const };

const errorOf = async (res: Response) => (await res.json().catch(() => null))?.error?.message as string | undefined;

const Doctors = () => {
  const { formatCurrency, formatDate } = useFormatters();
  const [people, setPeople] = useState<Person[]>([]);
  const [hospitalOptions, setHospitalOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const [viewKey, setViewKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<Person | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>({});
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<Draft>(EMPTY_CREATE);
  const [withLogin, setWithLogin] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creds, setCreds] = useState<{ name: string; email: string; password: string } | null>(null);
  const [pendingActive, setPendingActive] = useState<{ person: Person; active: boolean } | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/v1/super/doctors");
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message);
      setPeople((body.data ?? []).map((p: Omit<Person, "id">) => ({ ...p, id: p.key })));
      setHospitalOptions(body.hospitals ?? []);
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
    multi: people.filter(p => p.hospitals.length > 1).length,
    suspended: people.filter(p => p.has_login && !p.is_active).length,
  }), [people]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter(p => {
      if (filter === "login" && !p.has_login) return false;
      if (filter === "directory" && p.has_login) return false;
      if (filter === "suspended" && !(p.has_login && !p.is_active)) return false;
      if (!q) return true;
      return [p.name, p.specialty, p.email, p.phone, p.bmdc_number, ...p.hospitals.map(h => h.name)]
        .some(v => v?.toLowerCase().includes(q));
    });
  }, [people, filter, query]);

  const openEdit = (p: Person) => {
    setEditDraft(Object.fromEntries(EDIT_KEYS.map(k => [k, p[k] == null ? "" : String(p[k])])));
    setEditing(p);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editDraft.name?.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/super/doctors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: editing.doctor_id, ...editDraft }),
      });
      if (!res.ok) { toast.error("Couldn't save", { description: await errorOf(res) }); return; }
      toast.success(editing.hospitals.length > 1 ? `Saved at all ${editing.hospitals.length} hospitals` : "Doctor updated");
      setEditing(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const saveCreate = async () => {
    if (!createDraft.tenant_id) { toast.error("Pick a hospital"); return; }
    if (!createDraft.name.trim()) { toast.error("Name is required"); return; }
    if (!createDraft.email.trim()) { toast.error("Email is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/super/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDraft),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error("Couldn't add the doctor", { description: body?.error?.message }); return; }

      setCreating(false);
      setCreateDraft(EMPTY_CREATE);

      if (withLogin) {
        // Links a doctor who already has a HealthFlow login (same email or
        // BMDC number) instead of creating a second account for them.
        const login = await fetch(`/api/v1/doctors/${body.data.id}/login`, { method: "POST" });
        const loginBody = await login.json().catch(() => null);
        if (!login.ok) {
          toast.warning("Doctor added, but the login wasn't created", { description: loginBody?.error?.message });
        } else if (loginBody.data?.linked) {
          toast.success(`Linked to ${loginBody.data.name}'s existing account`, {
            description: "They already use HealthFlow and now work at this hospital too.",
          });
        } else {
          setCreds({ name: createDraft.name.trim(), ...loginBody.data });
          toast.success("Doctor added with a new login");
        }
      } else {
        toast.success("Doctor added");
      }
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
    toast.success(active ? `${person.name} can sign in again` : `${person.name} is suspended and signed out`);
    void load();
  };

  const columns: Column<Person>[] = [
    {
      key: "name", label: "DOCTOR", sortable: true, accessor: p => p.name,
      render: p => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={p.photo_url} name={p.name} className="h-9 w-9" />
          <div className="min-w-0">
            <p className="font-semibold text-primary truncate">{p.name}</p>
            <p className="text-xs text-muted-foreground truncate">{p.specialty || "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "bmdc", label: "BMDC NO.", sortable: true, accessor: p => p.bmdc_number ?? "", render: p => p.bmdc_number || "—" },
    {
      key: "contact", label: "CONTACT", accessor: p => p.email ?? "",
      render: p => (
        <div className="text-xs">
          <p className="text-primary">{p.email || "—"}</p>
          <p className="text-muted-foreground">{p.phone || ""}</p>
        </div>
      ),
    },
    {
      key: "hospitals", label: "HOSPITALS", sortable: true, accessor: p => p.hospitals.length,
      render: p => (
        <div className="flex flex-wrap gap-1">
          {p.hospitals.map(h => (
            <span key={h.doctor_id} className="rounded-full bg-chip text-primary px-2 py-0.5 text-[11px] font-semibold">{h.name}</span>
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
    <SuperLayout title="Doctors" subtitle="Every doctor on HealthFlow, across all hospitals">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Stethoscope} label="Doctors" value={loading ? "—" : String(counts.all)} tone="primary" />
        <Kpi icon={KeyRound} label="With a login" value={loading ? "—" : String(counts.login)} tone="accent" />
        <Kpi icon={Building2} label="At 2+ hospitals" value={loading ? "—" : String(counts.multi)} tone="chip" />
        <Kpi icon={UserX} label="Suspended" value={loading ? "—" : String(counts.suspended)} tone={counts.suspended ? "destructive" : "primary"} />
      </div>

      <Card className="p-5">
        <Toolbar
          search={query} onSearch={setQuery}
          onAdd={() => { setCreateDraft(EMPTY_CREATE); setWithLogin(true); setCreating(true); }} addLabel="Add Doctor"
          onExport={() => exportCSV(rows.map(p => ({
            name: p.name, specialty: p.specialty, bmdc_number: p.bmdc_number, email: p.email, phone: p.phone,
            hospitals: p.hospitals.map(h => h.name).join("; "), login: loginState(p).label,
          })), "doctors.csv")}
          filters={<Chips value={filter} onChange={setFilter} options={FILTERS} />}
        />
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : failed ? (
          <div className="py-12 text-center">
            <p className="text-sm text-foreground/80">Couldn&apos;t load the doctors.</p>
            <Btn variant="outline" className="mt-4" onClick={() => void load()}>Try again</Btn>
          </div>
        ) : (
          <DataTable<Person>
            rows={rows}
            columns={columns}
            onRow={p => setViewKey(p.key)}
            empty="No doctors match."
            actions={p => (
              <RowActions
                onView={() => setViewKey(p.key)}
                onEdit={() => openEdit(p)}
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
      <Drawer open={!!viewing} onClose={() => setViewKey(null)} title="Doctor">
        {viewing && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar src={viewing.photo_url} name={viewing.name} className="h-16 w-16" />
              <div className="min-w-0">
                <p className="font-display text-2xl text-primary truncate">{viewing.name}</p>
                <p className="text-sm text-muted-foreground">{viewing.specialty || "No specialty"}</p>
                <div className="mt-1"><Pill tone={loginState(viewing).tone}>{loginState(viewing).label}</Pill></div>
              </div>
            </div>
            <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
              {([
                ["Email", viewing.email],
                ["Phone", viewing.phone],
                ["BMDC no.", viewing.bmdc_number],
                ["Education", viewing.education],
                ["Experience", viewing.experience_years != null ? `${viewing.experience_years} years` : null],
                ["Gender", GENDERS.find(g => g.value === viewing.gender)?.label ?? null],
                ["Languages", viewing.languages],
                ["Expertise", viewing.expertise],
                ["Listed since", formatDate(viewing.joined_at)],
              ] as const).map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-primary font-medium break-words">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            {viewing.bio && <p className="text-sm text-foreground/80 whitespace-pre-line">{viewing.bio}</p>}
            <div>
              <p className="font-display text-lg text-primary mb-2">
                {viewing.hospitals.length === 1 ? "Hospital" : `${viewing.hospitals.length} hospitals`}
              </p>
              <div className="space-y-2">
                {viewing.hospitals.map(h => (
                  <div key={h.doctor_id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 border border-border/40 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{h.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{h.status.replace("_", " ")}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary shrink-0">
                      {h.consultation_fee == null ? "—" : formatCurrency(Number(h.consultation_fee))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Btn variant="outline" onClick={() => { setViewKey(null); openEdit(viewing); }}>Edit</Btn>
              {viewing.has_login && (
                <Btn variant={viewing.is_active ? "danger" : "primary"}
                  onClick={() => setPendingActive({ person: viewing, active: !viewing.is_active })}>
                  {viewing.is_active ? "Suspend login" : "Reactivate login"}
                </Btn>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Edit */}
      <Modal open={!!editing} onClose={() => !saving && setEditing(null)} title={`Edit ${editing?.name ?? "doctor"}`} size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Btn>
          <Btn onClick={() => void saveEdit()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Btn>
        </>}>
        {editing && (
          <>
            {editing.hospitals.length > 1 && (
              <p className="text-xs text-muted-foreground mb-4">
                Personal details are the doctor&apos;s own — saving updates all {editing.hospitals.length} hospitals that list them.
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-x-4">
              <Field label="Full name" required><Input value={editDraft.name} onChange={setEdit("name")} /></Field>
              <Field label="Specialization"><Input value={editDraft.specialty} onChange={setEdit("specialty")} /></Field>
              <Field label="BMDC registration no."><Input value={editDraft.bmdc_number} onChange={setEdit("bmdc_number")} /></Field>
              <Field label="Phone"><Input type="tel" value={editDraft.phone} onChange={setEdit("phone")} /></Field>
              <Field label="Education"><Input value={editDraft.education} onChange={setEdit("education")} /></Field>
              <Field label="Experience (years)"><Input type="number" min={0} value={editDraft.experience_years} onChange={setEdit("experience_years")} /></Field>
              <Field label="Gender">
                <Select value={editDraft.gender} onChange={setEdit("gender")}>
                  <option value="">—</option>
                  {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </Select>
              </Field>
              <Field label="Languages"><Input value={editDraft.languages} onChange={setEdit("languages")} /></Field>
            </div>
            <Field label="Areas of expertise"><TextArea rows={2} value={editDraft.expertise} onChange={setEdit("expertise")} /></Field>
            <Field label="Biography"><TextArea rows={4} value={editDraft.bio} onChange={setEdit("bio")} /></Field>
          </>
        )}
      </Modal>

      {/* Create */}
      <Modal open={creating} onClose={() => !saving && setCreating(false)} title="Add Doctor" size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setCreating(false)} disabled={saving}>Cancel</Btn>
          <Btn onClick={() => void saveCreate()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Add Doctor</Btn>
        </>}>
        <Field label="Hospital" required>
          <Select value={createDraft.tenant_id} onChange={setCreate("tenant_id")}>
            <option value="">Select a hospital…</option>
            {hospitalOptions.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </Select>
        </Field>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Full name" required><Input value={createDraft.name} onChange={setCreate("name")} placeholder="Dr. …" /></Field>
          <Field label="Email" required hint="Their sign-in address"><Input type="email" value={createDraft.email} onChange={setCreate("email")} /></Field>
          <Field label="Specialization"><Input value={createDraft.specialty} onChange={setCreate("specialty")} placeholder="Cardiology" /></Field>
          <Field label="BMDC registration no."><Input value={createDraft.bmdc_number} onChange={setCreate("bmdc_number")} /></Field>
          <Field label="Phone"><Input type="tel" value={createDraft.phone} onChange={setCreate("phone")} /></Field>
          <Field label="Education"><Input value={createDraft.education} onChange={setCreate("education")} placeholder="MBBS, FCPS" /></Field>
          <Field label="Experience (years)"><Input type="number" min={0} value={createDraft.experience_years} onChange={setCreate("experience_years")} /></Field>
          <Field label="Gender">
            <Select value={createDraft.gender} onChange={setCreate("gender")}>
              <option value="">—</option>
              {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </Select>
          </Field>
          <Field label="Consultation fee" hint="This hospital's fee"><Input type="number" min={0} step="0.01" value={createDraft.consultation_fee} onChange={setCreate("consultation_fee")} /></Field>
        </div>
        <label className="flex items-start gap-3 rounded-xl bg-muted/40 p-3 text-sm cursor-pointer">
          <input type="checkbox" checked={withLogin} onChange={e => setWithLogin(e.target.checked)} className="mt-0.5" />
          <span>
            <span className="font-semibold text-primary">Give them a login</span>
            <span className="block text-xs text-muted-foreground">
              If this email or BMDC number already belongs to a doctor on HealthFlow, they&apos;re linked to that account instead of getting a second one.
            </span>
          </span>
        </label>
      </Modal>

      {/* New login's credentials */}
      <Modal open={!!creds} onClose={() => setCreds(null)} title="Doctor login"
        footer={<Btn onClick={() => setCreds(null)}>Done</Btn>}>
        {creds && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Login for <span className="font-semibold text-primary">{creds.name}</span>. The hospital can view this password again from its Doctors page.
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
              ? `${pendingActive.person.name} will be able to sign in again at every hospital that lists them.`
              : `${pendingActive.person.name} is signed out now and can't use HealthFlow at any hospital until reactivated. Their records stay.`
            : undefined
        }
      />
    </SuperLayout>
  );
};

export default Doctors;
