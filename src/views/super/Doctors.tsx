"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, Kpi, Pill, Btn } from "@/components/admin/ui";
import {
  DataTable, Toolbar, Modal, Drawer, ConfirmDialog, RowActions, Chips, Field, Input, Select, TextArea, exportCSV,
  type Column,
} from "@/components/admin/crud";
import { Avatar } from "@/components/common/Avatar";
import { ImageUploadField } from "@/components/admin/ResourcePage";
import { WeeklyHoursField } from "@/components/admin/WeeklyHoursField";
import { defaultWeek, serialiseWeek, type WeekHours } from "@/lib/hours";
import { availabilityLabel, weekFromAvailability } from "@/lib/availability";
import { useFormatters } from "@/lib/appSettings";
import { Stethoscope, KeyRound, Building2, UserX, UserCheck, Loader2, Copy, Plus, Trash2 } from "lucide-react";

/**
 * Every doctor on the platform, as people (0077).
 *
 * A doctor with a login is one person however many hospitals list them; a
 * row with no login is a directory entry one hospital typed in. The super
 * admin can add a doctor to any hospital or to none yet (0081), correct a
 * doctor's personal details (copied to every hospital's row), and suspend or
 * reactivate their login.
 */

type Hospital = {
  doctor_id: string; id: string; name: string; status: string;
  consultation_fee: number | null; availability: string | null;
};

/** One hospital the new doctor works at, with what that hospital charges and when. */
type Assignment = { key: number; tenant_id: string; consultation_fee: string; week: WeekHours };

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
  /** Their home row (0081) and its hours — their own, apart from any hospital's. */
  home_doctor_id: string | null;
  home_availability: string | null;
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

const EDIT_KEYS = ["name", "specialty", "bmdc_number", "phone", "education", "experience_years", "gender", "languages", "expertise", "bio", "photo_url"] as const;

/** The person. Where they work — and when — is `assignments`, or `homeWeek` with no hospital. */
const EMPTY_CREATE: Draft = {
  name: "", email: "", specialty: "", bmdc_number: "", phone: "",
  education: "", experience_years: "", gender: "", languages: "", photo_url: "", expertise: "", bio: "",
};

/**
 * One hospital a doctor works at: which one, what it charges, and when they're
 * there. A new card picks the hospital; an existing one names it.
 */
const HospitalCard = ({ title, hospital, select, fee, onFee, initialWeek, onWeek, onRemove }: {
  title: string;
  /** The hospital's name: shown when there is no picker, and naming the hours either way. */
  hospital?: string;
  select?: { value: string; options: { id: string; name: string }[]; onChange: (id: string) => void };
  fee: string;
  onFee: (value: string) => void;
  initialWeek: WeekHours;
  onWeek: (week: WeekHours) => void;
  onRemove?: () => void;
}) => (
  <div className="rounded-2xl border border-border/60 p-4">
    <div className="grid sm:grid-cols-[1fr_180px_auto] gap-x-4 items-start">
      {select ? (
        <Field label={title} required>
          <Select value={select.value} onChange={e => select.onChange(e.target.value)}>
            <option value="">Select a hospital…</option>
            {select.options.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </Select>
        </Field>
      ) : (
        <Field label={title}>
          <p className="py-2.5 text-sm font-semibold text-primary">{hospital}</p>
        </Field>
      )}
      <Field label="Consultation fee">
        <Input type="number" min={0} step="0.01" value={fee} onChange={e => onFee(e.target.value)} />
      </Field>
      {onRemove ? (
        <button type="button" onClick={onRemove} title="Remove this hospital"
          className="mt-6 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </button>
      ) : <span />}
    </div>
    <Field label={hospital ? `Availability at ${hospital}` : "Availability"}>
      <WeeklyHoursField seed={() => initialWeek} onChange={onWeek} summaryLabel="Patients see" />
    </Field>
  </div>
);

type FieldSetter = (key: string) =>
  (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;

/**
 * Who the doctor is — the same fields, in the same order, on Add Doctor and
 * Edit, so the two forms read as one. The email is typed on Add; on Edit it is
 * their sign-in address, shown but not changed here.
 */
const DoctorDetails = ({ draft, set, email, photo, note }: {
  draft: Draft;
  set: FieldSetter;
  email: { value: string; editable: boolean };
  photo: { resetKey: string | number; current?: string; onChange: (value: string) => void; onUploading: (uploading: boolean) => void };
  note?: string;
}) => (
  <>
    {note && <p className="text-xs text-muted-foreground mb-4">{note}</p>}
    <Field label="Photo">
      <ImageUploadField
        key={photo.resetKey}
        name="photo_url"
        folder="doctors"
        defaultValue={photo.current ?? ""}
        onChange={photo.onChange}
        onUploadingChange={photo.onUploading}
      />
    </Field>
    <div className="grid sm:grid-cols-2 gap-x-4">
      <Field label="Full name" required><Input value={draft.name ?? ""} onChange={set("name")} placeholder="Dr. …" /></Field>
      {email.editable ? (
        <Field label="Email" required hint="Their sign-in address"><Input type="email" value={email.value} onChange={set("email")} /></Field>
      ) : (
        <Field label="Email" hint="Their sign-in address — it can't be changed here">
          <Input type="email" value={email.value} readOnly disabled className="opacity-60 cursor-not-allowed" />
        </Field>
      )}
      <Field label="Specialization"><Input value={draft.specialty ?? ""} onChange={set("specialty")} placeholder="Cardiology" /></Field>
      <Field label="BMDC registration no."><Input value={draft.bmdc_number ?? ""} onChange={set("bmdc_number")} /></Field>
      <Field label="Phone"><Input type="tel" value={draft.phone ?? ""} onChange={set("phone")} /></Field>
      <Field label="Education"><Input value={draft.education ?? ""} onChange={set("education")} placeholder="MBBS, FCPS" /></Field>
      <Field label="Experience (years)"><Input type="number" min={0} value={draft.experience_years ?? ""} onChange={set("experience_years")} /></Field>
      <Field label="Gender">
        <Select value={draft.gender ?? ""} onChange={set("gender")}>
          <option value="">—</option>
          {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </Select>
      </Field>
    </div>
    <Field label="Languages" hint="Comma separated">
      <Input value={draft.languages ?? ""} onChange={set("languages")} placeholder="Bangla, English" />
    </Field>
    <Field label="Areas of expertise" hint="Comma separated">
      <TextArea rows={2} value={draft.expertise ?? ""} onChange={set("expertise")} placeholder="Interventional cardiology, Heart failure" />
    </Field>
    <Field label="About">
      <TextArea rows={4} value={draft.bio ?? ""} onChange={set("bio")} placeholder="Their background, training and approach, as patients will read it" />
    </Field>
  </>
);

/** Where the doctor works, and when — the heading and Add button both forms share. */
const HospitalsSection = ({ note, onAdd, canAdd, children }: {
  note: string; onAdd: () => void; canAdd: boolean; children: React.ReactNode;
}) => (
  <div className="mb-4 space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="font-display text-lg text-primary">Hospitals and availability</h3>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
      <Btn variant="outline" className="shrink-0 whitespace-nowrap" onClick={onAdd} disabled={!canAdd}>
        <Plus className="h-4 w-4" /> Add hospital
      </Btn>
    </div>
    {children}
  </div>
);

/** An existing hospital's fee as typed, and its week once touched — untouched hours are left as stored. */
type HospitalEdit = { fee: string; week: WeekHours | null };

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
  // Remounts the photo field on each open, so it never shows the last doctor's picture.
  const [createKey, setCreateKey] = useState(0);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  // Their own hours, kept on their home row, while no hospital is picked.
  const [homeWeek, setHomeWeek] = useState<WeekHours>(defaultWeek);
  const nextKey = useRef(1);
  // Edit: each existing hospital's fee and hours, hospitals being added, and
  // their own hours (null until touched, so an untouched week is not rewritten).
  const [editExisting, setEditExisting] = useState<Record<string, HospitalEdit>>({});
  const [editAdds, setEditAdds] = useState<Assignment[]>([]);
  const [editHomeWeek, setEditHomeWeek] = useState<WeekHours | null>(null);
  // A login's email and password on screen — just created, viewed, or reset.
  // `person` offers a fresh password from the same window.
  const [creds, setCreds] = useState<{ name: string; email: string; password: string; note: string; person?: Person } | null>(null);
  const [loginBusy, setLoginBusy] = useState<string | null>(null);
  // Both confirmed first, as on a hospital's Doctors page: creating gives
  // someone a real account, and resetting stops the password they use.
  const [pendingCreate, setPendingCreate] = useState<Person | null>(null);
  const [pendingReset, setPendingReset] = useState<{ person: Person; missing: boolean } | null>(null);
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

  const feeText = (fee: number | null) => (fee == null ? "" : String(fee));

  const openEdit = (p: Person) => {
    setEditDraft(Object.fromEntries(EDIT_KEYS.map(k => [k, p[k] == null ? "" : String(p[k])])));
    setEditExisting(Object.fromEntries(p.hospitals.map(h => [h.doctor_id, { fee: feeText(h.consultation_fee), week: null }])));
    setEditAdds([]);
    setEditHomeWeek(null);
    setEditing(p);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editDraft.name?.trim()) { toast.error("Name is required"); return; }
    if (editAdds.some(a => !a.tenant_id)) { toast.error("Pick a hospital on each new card, or remove the card"); return; }
    if (!editing.has_login && editing.hospitals.length + editAdds.length > 1) {
      toast.error("A doctor at more than one hospital needs a login", {
        description: "Give them a login from a hospital's Doctors page first — it makes them one person at every hospital.",
      });
      return;
    }

    // Only what changed: an untouched fee or week stays exactly as stored.
    const hospitalChanges = editing.hospitals.flatMap(h => {
      const e = editExisting[h.doctor_id];
      if (!e || (e.fee === feeText(h.consultation_fee) && !e.week)) return [];
      return [{
        doctor_id: h.doctor_id,
        consultation_fee: e.fee,
        ...(e.week ? { availability: serialiseWeek(e.week) } : {}),
      }];
    });

    setSaving(true);
    try {
      // The photo goes only when it changed: an untouched one may be an older
      // link the route would refuse, since it takes only a fresh upload's key.
      const { photo_url, ...rest } = editDraft;
      const res = await fetch("/api/v1/super/doctors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: editing.doctor_id,
          ...rest,
          ...(photo_url !== (editing.photo_url ?? "") ? { photo_url } : {}),
          ...(hospitalChanges.length ? { hospitals: hospitalChanges } : {}),
          ...(editAdds.length ? {
            add_hospitals: editAdds.map(a => ({
              tenant_id: a.tenant_id, consultation_fee: a.consultation_fee, availability: serialiseWeek(a.week),
            })),
          } : {}),
          ...(editHomeWeek && editing.hospitals.length === 0 && !editAdds.length
            ? { home_availability: serialiseWeek(editHomeWeek) } : {}),
        }),
      });
      if (!res.ok) { toast.error("Couldn't save", { description: await errorOf(res) }); return; }
      toast.success(
        editAdds.length ? `Saved — now at ${editing.hospitals.length + editAdds.length} hospital${editing.hospitals.length + editAdds.length === 1 ? "" : "s"}`
          : editing.hospitals.length > 1 ? `Saved at all ${editing.hospitals.length} hospitals` : "Doctor updated",
      );
      setEditing(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setCreateDraft(EMPTY_CREATE);
    setAssignments([]);
    setHomeWeek(defaultWeek());
    setWithLogin(true);
    setCreateKey(k => k + 1);
    setCreating(true);
  };

  const hospitalName = (tenantId: string) => hospitalOptions.find(h => h.id === tenantId)?.name ?? "the hospital";

  /** Add, change and remove new-hospital cards — the same for Add Doctor and Edit. */
  const cardsOf = (set: Dispatch<SetStateAction<Assignment[]>>) => ({
    add: () => {
      const key = nextKey.current;
      nextKey.current += 1;
      set(list => [...list, { key, tenant_id: "", consultation_fee: "", week: defaultWeek() }]);
    },
    update: (key: number, patch: Partial<Assignment>) =>
      set(list => list.map(a => (a.key === key ? { ...a, ...patch } : a))),
    remove: (key: number) => set(list => list.filter(a => a.key !== key)),
  });
  const createCards = cardsOf(setAssignments);
  const editCards = cardsOf(setEditAdds);

  /** Hospitals still free to pick on this card: not an existing one, nor on another card. */
  const freeHospitals = (cards: Assignment[], key: number, existing: string[] = []) => {
    const taken = new Set([...existing, ...cards.filter(c => c.key !== key).map(c => c.tenant_id)]);
    return hospitalOptions.filter(h => !taken.has(h.id));
  };

  const saveCreate = async () => {
    if (!createDraft.name.trim()) { toast.error("Name is required"); return; }
    if (!createDraft.email.trim()) { toast.error("Email is required"); return; }
    if (assignments.some(a => !a.tenant_id)) { toast.error("Pick a hospital on each card, or remove the card"); return; }
    // Hospital rows are one person only through their login (0077). Without
    // one, each would stand alone as a separate doctor.
    if (assignments.length > 1 && !withLogin) {
      toast.error("A doctor at more than one hospital needs a login", {
        description: "The login is what makes them one person at every hospital.",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/v1/super/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createDraft,
          hospitals: assignments.map(a => ({
            tenant_id: a.tenant_id,
            consultation_fee: a.consultation_fee,
            availability: serialiseWeek(a.week),
          })),
          ...(assignments.length === 0 ? { availability: serialiseWeek(homeWeek) } : {}),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error("Couldn't add the doctor", { description: body?.error?.message }); return; }

      const ids: string[] = body.data.ids;
      const name = createDraft.name.trim();
      const firstHospital = assignments[0] ? hospitalName(assignments[0].tenant_id) : null;
      setCreating(false);

      if (withLogin) {
        // The first row gets the login — a new one, or the account they
        // already have (same email or BMDC number). Every other hospital's
        // row is then linked to that same account by its email.
        const login = await fetch(`/api/v1/doctors/${ids[0]}/login`, { method: "POST" });
        const loginBody = await login.json().catch(() => null);
        if (!login.ok) {
          toast.warning("Doctor added, but the login wasn't created", { description: loginBody?.error?.message });
          void load();
          return;
        }

        const unlinked: string[] = [];
        for (const [i, id] of ids.slice(1).entries()) {
          const link = await fetch(`/api/v1/doctors/${id}/login`, { method: "POST" });
          if (!link.ok) unlinked.push(hospitalName(assignments[i + 1].tenant_id));
        }
        if (unlinked.length) {
          toast.warning(`Couldn't link the login at ${unlinked.join(", ")}`, {
            description: "Open that hospital's Doctors page and press the key on this doctor to link it.",
          });
        }

        if (loginBody.data?.linked) {
          toast.success(`Linked to ${loginBody.data.name}'s existing account`, {
            description: assignments.length
              ? "They already use HealthFlow and now work at these hospitals too."
              : "They already use HealthFlow.",
          });
        } else {
          setCreds({
            name, ...loginBody.data,
            note: firstHospital
              ? `Share these securely. You can view them again here any time, and ${firstHospital} can from its Doctors page.`
              : "Share these securely. You can view them again here any time.",
          });
          toast.success(assignments.length > 1 ? `Doctor added at ${assignments.length} hospitals` : "Doctor added with a new login");
        }
      } else {
        toast.success("Doctor added");
      }
      void load();
    } finally {
      setSaving(false);
    }
  };

  /**
   * The row a super admin's password lives on: the home row when there is one
   * (0081) — no single hospital's — or else the row the person is edited by.
   * Viewing still finds a password filed against any of their rows.
   */
  const loginRowOf = (p: Person) => p.home_doctor_id ?? p.doctor_id;

  const viewLogin = async (person: Person) => {
    setLoginBusy(person.key);
    try {
      const res = await fetch(`/api/v1/doctors/${loginRowOf(person)}/login`);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        // A login with no saved password can't be shown, only replaced.
        if (body?.error?.code === "no_saved_password") { setPendingReset({ person, missing: true }); return; }
        toast.error("Couldn't load the login", { description: body?.error?.message });
        return;
      }
      setCreds({ name: person.name, ...body.data, person, note: "Share these securely. You can come back and view them here any time." });
    } catch {
      toast.error("Couldn't load the login", { description: "The request failed. Please try again." });
    } finally {
      setLoginBusy(null);
    }
  };

  const createLogin = async (person: Person) => {
    setLoginBusy(person.key);
    try {
      const res = await fetch(`/api/v1/doctors/${person.doctor_id}/login`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error("Couldn't create the login", { description: body?.error?.message }); return; }
      if (body.data?.linked) {
        toast.success(`Linked to ${body.data.name}'s existing account`, {
          description: "They sign in with the account they already have.",
        });
      } else {
        setCreds({ name: person.name, ...body.data, note: "Share these securely. You can come back and view them here any time." });
        toast.success("Login created");
      }
      void load();
    } catch {
      toast.error("Couldn't create the login", { description: "The request failed. Please try again." });
    } finally {
      setLoginBusy(null);
    }
  };

  const resetLogin = async (person: Person) => {
    setLoginBusy(person.key);
    try {
      const res = await fetch(`/api/v1/doctors/${loginRowOf(person)}/login`, { method: "PUT" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error("Couldn't reset the password", { description: body?.error?.message }); return; }
      setCreds({
        name: person.name, ...body.data, person,
        note: "This is their new password everywhere they sign in — the old one no longer works. Share it securely.",
      });
      toast.success("New password generated");
    } catch {
      toast.error("Couldn't reset the password", { description: "The request failed. Please try again." });
    } finally {
      setLoginBusy(null);
    }
  };

  const onKey = (person: Person) => (person.has_login ? void viewLogin(person) : setPendingCreate(person));

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
      render: p => p.hospitals.length === 0 ? (
        <span className="text-xs text-muted-foreground">No hospital yet</span>
      ) : (
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
    <SuperLayout title="Doctor Management" subtitle="Every doctor on HealthFlow, across all hospitals">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Stethoscope} label="Doctors" value={loading ? "—" : String(counts.all)} tone="primary" />
        <Kpi icon={KeyRound} label="With a login" value={loading ? "—" : String(counts.login)} tone="accent" />
        <Kpi icon={Building2} label="At 2+ hospitals" value={loading ? "—" : String(counts.multi)} tone="chip" />
        <Kpi icon={UserX} label="Suspended" value={loading ? "—" : String(counts.suspended)} tone={counts.suspended ? "destructive" : "primary"} />
      </div>

      <Card className="p-5">
        <Toolbar
          search={query} onSearch={setQuery}
          onAdd={openCreate} addLabel="Add Doctor"
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
                extra={
                  <>
                    <button type="button" onClick={() => onKey(p)} disabled={loginBusy === p.key}
                      title={p.has_login ? "View this doctor's login" : "Create a login for this doctor"}
                      className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 disabled:opacity-50">
                      {loginBusy === p.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    </button>
                    {p.has_login && (
                      <button type="button" onClick={() => setPendingActive({ person: p, active: !p.is_active })}
                        title={p.is_active ? "Suspend login" : "Reactivate login"}
                        className={`p-1.5 rounded-lg ${p.is_active ? "hover:bg-destructive/10 text-destructive" : "hover:bg-muted text-foreground/70"}`}>
                        {p.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                    )}
                  </>
                }
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
                {viewing.hospitals.length === 1 ? "Hospital" : viewing.hospitals.length === 0 ? "Hospitals" : `${viewing.hospitals.length} hospitals`}
              </p>
              {viewing.hospitals.length === 0 && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Not at any hospital yet. A hospital that adds them by this email or BMDC number is linked to this doctor.
                  </p>
                  {viewing.home_availability && (
                    <p className="text-sm mt-2"><span className="text-muted-foreground">Their hours:</span>{" "}
                      <span className="text-primary font-medium">{availabilityLabel(viewing.home_availability)}</span></p>
                  )}
                </>
              )}
              <div className="space-y-2">
                {viewing.hospitals.map(h => (
                  <div key={h.doctor_id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 border border-border/40 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{h.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{h.status.replace("_", " ")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{availabilityLabel(h.availability) ?? "No hours set"}</p>
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
              <Btn variant="outline" onClick={() => onKey(viewing)} disabled={loginBusy === viewing.key}>
                {loginBusy === viewing.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {viewing.has_login ? "View login" : "Create login"}
              </Btn>
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
          <Btn onClick={() => void saveEdit()} disabled={saving || photoUploading}>
            {(saving || photoUploading) && <Loader2 className="h-4 w-4 animate-spin" />} {photoUploading ? "Uploading photo…" : "Save"}
          </Btn>
        </>}>
        {editing && (
          <>
            <DoctorDetails
              draft={editDraft}
              set={setEdit}
              email={{ value: editing.email ?? "", editable: false }}
              photo={{
                resetKey: editing.key,
                current: editing.photo_url ?? "",
                onChange: v => setEditDraft(d => ({ ...d, photo_url: v })),
                onUploading: setPhotoUploading,
              }}
              note={editing.hospitals.length > 1
                ? `Personal details are the doctor's own — saving updates all ${editing.hospitals.length} hospitals that list them.`
                : undefined}
            />

            {/* Where they work, and when — each hospital's own fee and hours,
                hospitals to add, or their own hours while at none. */}
            <HospitalsSection
              note={editing.hospitals.length + editAdds.length === 0
                ? "Not at any hospital yet. Add one, or set their own hours below — a hospital can add them later by email or BMDC number."
                : !editing.has_login && editing.hospitals.length > 0
                  ? "Each hospital has its own fee and hours. To add another hospital, give them a login first — it makes them one doctor at every hospital."
                  : "Each hospital has its own fee and hours. Patients booking there are held to them."}
              onAdd={editCards.add}
              canAdd={
                !(!editing.has_login && editing.hospitals.length + editAdds.length >= 1)
                && editing.hospitals.length + editAdds.length < hospitalOptions.length
              }
            >
              {editing.hospitals.map(h => (
                <HospitalCard
                  key={`${editing.key}:${h.doctor_id}`}
                  title="Hospital"
                  hospital={h.name}
                  fee={editExisting[h.doctor_id]?.fee ?? ""}
                  onFee={v => setEditExisting(m => ({ ...m, [h.doctor_id]: { ...m[h.doctor_id], fee: v } }))}
                  initialWeek={weekFromAvailability(h.availability)}
                  onWeek={week => setEditExisting(m => ({ ...m, [h.doctor_id]: { ...m[h.doctor_id], week } }))}
                />
              ))}

              {editAdds.map((a, i) => (
                <HospitalCard
                  key={a.key}
                  title={editAdds.length > 1 ? `New hospital ${i + 1}` : "New hospital"}
                  hospital={a.tenant_id ? hospitalName(a.tenant_id) : undefined}
                  select={{
                    value: a.tenant_id,
                    options: freeHospitals(editAdds, a.key, editing.hospitals.map(h => h.id)),
                    onChange: id => editCards.update(a.key, { tenant_id: id }),
                  }}
                  fee={a.consultation_fee}
                  onFee={v => editCards.update(a.key, { consultation_fee: v })}
                  initialWeek={a.week}
                  onWeek={week => editCards.update(a.key, { week })}
                  onRemove={() => editCards.remove(a.key)}
                />
              ))}

              {editing.hospitals.length === 0 && editAdds.length === 0 && (
                <Field label="Their own availability">
                  <WeeklyHoursField
                    key={editing.key}
                    seed={() => weekFromAvailability(editing.home_availability)}
                    onChange={setEditHomeWeek}
                    summaryLabel="Their hours"
                  />
                </Field>
              )}
            </HospitalsSection>

            {/* Where Add Doctor offers a login, Edit shows the one they have. */}
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3 text-sm">
              <span>
                <span className="font-semibold text-primary">
                  {!editing.has_login ? "No login yet" : editing.is_active ? "Has a login" : "Login suspended"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {editing.has_login
                    ? "View their email and password, or generate a new one."
                    : "If their email or BMDC number already belongs to a doctor on HealthFlow, they're linked to that account instead of getting a second one."}
                </span>
              </span>
              <Btn variant="outline" className="shrink-0 whitespace-nowrap" onClick={() => onKey(editing)} disabled={loginBusy === editing.key}>
                {loginBusy === editing.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {editing.has_login ? "View login" : "Create login"}
              </Btn>
            </div>
          </>
        )}
      </Modal>

      {/* Create */}
      <Modal open={creating} onClose={() => !saving && setCreating(false)} title="Add Doctor" size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setCreating(false)} disabled={saving}>Cancel</Btn>
          <Btn onClick={() => void saveCreate()} disabled={saving || photoUploading}>
            {(saving || photoUploading) && <Loader2 className="h-4 w-4 animate-spin" />} {photoUploading ? "Uploading photo…" : "Add Doctor"}
          </Btn>
        </>}>
        <DoctorDetails
          draft={createDraft}
          set={setCreate}
          email={{ value: createDraft.email, editable: true }}
          photo={{
            resetKey: createKey,
            onChange: v => setCreateDraft(d => ({ ...d, photo_url: v })),
            onUploading: setPhotoUploading,
          }}
        />

        {/* Where they work, and when. Each hospital sets its own fee and
            hours (0077); with none, the hours are the doctor's own. */}
        <HospitalsSection
          note={assignments.length === 0
            ? "Not at any hospital yet. Add one, or set their own hours below — a hospital can add them later by email or BMDC number."
            : "Each hospital has its own fee and hours. Patients booking there are held to them."}
          onAdd={createCards.add}
          canAdd={assignments.length < hospitalOptions.length}
        >
          {assignments.map((a, i) => (
            <HospitalCard
              key={a.key}
              title={assignments.length > 1 ? `Hospital ${i + 1}` : "Hospital"}
              hospital={a.tenant_id ? hospitalName(a.tenant_id) : undefined}
              select={{ value: a.tenant_id, options: freeHospitals(assignments, a.key), onChange: id => createCards.update(a.key, { tenant_id: id }) }}
              fee={a.consultation_fee}
              onFee={v => createCards.update(a.key, { consultation_fee: v })}
              initialWeek={a.week}
              onWeek={week => createCards.update(a.key, { week })}
              onRemove={() => createCards.remove(a.key)}
            />
          ))}

          {assignments.length === 0 && (
            <Field label="Their own availability">
              <WeeklyHoursField key={createKey} onChange={setHomeWeek} summaryLabel="Their hours" />
            </Field>
          )}
        </HospitalsSection>
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

      {/* A login's credentials — new, viewed, or reset */}
      <Modal open={!!creds} onClose={() => setCreds(null)} title="Doctor login"
        footer={<>
          {creds?.person && (
            <Btn variant="outline" onClick={() => { const person = creds.person!; setCreds(null); setPendingReset({ person, missing: false }); }}>
              <KeyRound className="h-4 w-4" /> Generate new password
            </Btn>
          )}
          <Btn onClick={() => setCreds(null)}>Done</Btn>
        </>}>
        {creds && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
              <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Login for <span className="font-semibold text-primary">{creds.name}</span>. {creds.note}
              </p>
            </div>
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
        open={!!pendingCreate}
        onClose={() => setPendingCreate(null)}
        onConfirm={() => pendingCreate && void createLogin(pendingCreate)}
        title="Create doctor login?"
        description={
          pendingCreate
            ? `If ${pendingCreate.email || "their email"} or their BMDC number already belongs to a doctor on HealthFlow, they're linked to that account and keep their own details. Otherwise a new login is created for ${pendingCreate.name}.`
            : undefined
        }
      />

      <ConfirmDialog
        open={!!pendingReset}
        onClose={() => setPendingReset(null)}
        onConfirm={() => pendingReset && void resetLogin(pendingReset.person)}
        title={pendingReset?.missing ? "Reset this doctor's password?" : "Generate a new password?"}
        description={
          pendingReset
            ? pendingReset.missing
              ? `${pendingReset.person.name} has a login, but no password was saved for it — it predates this feature, or saving it failed. It can't be recovered, only replaced. Resetting sets a new one you can view here from now on, and stops the old one working.`
              : `This replaces ${pendingReset.person.name}'s password at every hospital they sign in to. The old one stops working at once, so share the new one with them.`
            : undefined
        }
      />

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
