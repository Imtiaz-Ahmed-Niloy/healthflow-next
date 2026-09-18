"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, Kpi, Pill, Btn } from "@/components/admin/ui";
import {
  DataTable, Toolbar, Modal, Drawer, ConfirmDialog, RowActions, Chips, Field, Input, Select, TextArea, exportCSV,
  type Column,
} from "@/components/admin/crud";
import { Avatar } from "@/components/common/Avatar";
import { ImageUploadField } from "@/components/admin/ResourcePage";
import { SpecialtySelect } from "@/components/common/SpecialtySelect";
import { WeeklyHoursField } from "@/components/admin/WeeklyHoursField";
import {
  ChamberForm, chamberPayload, draftFromChamber, emptyChamberDraft, type ChamberDraft,
} from "@/components/admin/ChamberForm";
import { defaultWeek, serialiseWeek, type WeekHours } from "@/lib/hours";
import { availabilityLabel, weekFromAvailability } from "@/lib/availability";
import { chamberPlace, type Chamber } from "@/lib/chambers";
import { useFormatters } from "@/lib/appSettings";
import type { Locale } from "@/i18n/config";
import { Stethoscope, KeyRound, Building2, UserX, UserCheck, Loader2, Copy, Plus, Trash2, Store } from "lucide-react";

/**
 * Every doctor on the platform, as people (0077).
 *
 * A doctor with a login is one person however many hospitals list them; a
 * row with no login is a directory entry one hospital typed in. The super
 * admin can add a doctor to any hospital or to none yet (0081), correct a
 * doctor's personal details (copied to every hospital's row), open and change
 * their own chambers (0088), and suspend or reactivate their login.
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
  /** Their own practices (0088) — each with its own fee and hours. */
  chambers: Chamber[];
  /** Their home row (0081): the person, apart from any hospital. */
  home_doctor_id: string | null;
};

/** A chamber being added in Edit, before Save opens it. */
type ChamberAdd = { key: number; draft: ChamberDraft };

const FILTERS = ["all", "login", "directory", "suspended"] as const;
type Filter = (typeof FILTERS)[number];

const GENDERS = ["male", "female", "other"] as const;
const DOCTOR_STATUSES = ["active", "on_leave", "suspended"] as const;

type Draft = Record<string, string>;

const EDIT_KEYS = ["name", "specialty", "bmdc_number", "phone", "education", "experience_years", "gender", "languages", "expertise", "bio", "photo_url"] as const;

/** The person. Where they work — and when — is `assignments`. */
const EMPTY_CREATE: Draft = {
  name: "", email: "", specialty: "", bmdc_number: "", phone: "",
  education: "", experience_years: "", gender: "", languages: "", photo_url: "", expertise: "", bio: "",
};

/** Gender labels, used by the details form and the drawer. */
const useGenderLabel = () => {
  const t = useTranslations("super.doctors");
  return (v: string | null) =>
    v && (GENDERS as readonly string[]).includes(v) ? t(`genders.${v as (typeof GENDERS)[number]}`) : null;
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
}) => {
  const t = useTranslations("super.doctors.cards");
  return (
    <div className="rounded-2xl border border-border/60 p-4">
      <div className="grid sm:grid-cols-[1fr_180px_auto] gap-x-4 items-start">
        {select ? (
          <Field label={title} required>
            <Select value={select.value} onChange={e => select.onChange(e.target.value)}>
              <option value="">{t("selectHospital")}</option>
              {select.options.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </Field>
        ) : (
          <Field label={title}>
            <p className="py-2.5 text-sm font-semibold text-primary">{hospital}</p>
          </Field>
        )}
        <Field label={t("fee")}>
          <Input type="number" min={0} step="0.01" value={fee} onChange={e => onFee(e.target.value)} />
        </Field>
        {onRemove ? (
          <button type="button" onClick={onRemove} title={t("removeHospital")}
            className="mt-6 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </button>
        ) : <span />}
      </div>
      <Field label={hospital ? t("availabilityAt", { hospital }) : t("availability")}>
        <WeeklyHoursField seed={() => initialWeek} onChange={onWeek} summaryLabel={t("patientsSee")} />
      </Field>
    </div>
  );
};

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
}) => {
  const t = useTranslations("super.doctors.fields");
  const genderLabel = useGenderLabel();
  return (
    <>
      {note && <p className="text-xs text-muted-foreground mb-4">{note}</p>}
      <Field label={t("photo")}>
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
        <Field label={t("name")} required><Input value={draft.name ?? ""} onChange={set("name")} placeholder={t("namePlaceholder")} /></Field>
        {email.editable ? (
          <Field label={t("email")} required hint={t("emailHint")}><Input type="email" value={email.value} onChange={set("email")} /></Field>
        ) : (
          <Field label={t("email")} hint={t("emailLocked")}>
            <Input type="email" value={email.value} readOnly disabled className="opacity-60 cursor-not-allowed" />
          </Field>
        )}
        <Field label={t("specialty")}>
          {/* From the specialties list (0093). `set` reads e.target.value, so the
              pick goes through it the same way a typed field does. */}
          <SpecialtySelect
            value={draft.specialty ?? ""}
            onChange={v => set("specialty")({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)}
          />
        </Field>
        <Field label={t("bmdc")}><Input value={draft.bmdc_number ?? ""} onChange={set("bmdc_number")} /></Field>
        <Field label={t("phone")}><Input type="tel" value={draft.phone ?? ""} onChange={set("phone")} /></Field>
        <Field label={t("education")}><Input value={draft.education ?? ""} onChange={set("education")} placeholder="MBBS, FCPS" /></Field>
        <Field label={t("experience")}><Input type="number" min={0} value={draft.experience_years ?? ""} onChange={set("experience_years")} /></Field>
        <Field label={t("gender")}>
          <Select value={draft.gender ?? ""} onChange={set("gender")}>
            <option value="">—</option>
            {GENDERS.map(g => <option key={g} value={g}>{genderLabel(g)}</option>)}
          </Select>
        </Field>
      </div>
      <Field label={t("languages")} hint={t("commaSeparated")}>
        <Input value={draft.languages ?? ""} onChange={set("languages")} placeholder={t("languagesPlaceholder")} />
      </Field>
      <Field label={t("expertise")} hint={t("commaSeparated")}>
        <TextArea rows={2} value={draft.expertise ?? ""} onChange={set("expertise")} placeholder={t("expertisePlaceholder")} />
      </Field>
      <Field label={t("about")}>
        <TextArea rows={4} value={draft.bio ?? ""} onChange={set("bio")} placeholder={t("aboutPlaceholder")} />
      </Field>
    </>
  );
};

/** Where the doctor works, and when — the heading and Add button both forms share. */
const HospitalsSection = ({ note, onAdd, canAdd, children }: {
  note: string; onAdd: () => void; canAdd: boolean; children: React.ReactNode;
}) => {
  const t = useTranslations("super.doctors.cards");
  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-primary">{t("hospitalsTitle")}</h3>
          <p className="text-xs text-muted-foreground">{note}</p>
        </div>
        <Btn variant="outline" className="shrink-0 whitespace-nowrap" onClick={onAdd} disabled={!canAdd}>
          <Plus className="h-4 w-4" /> {t("addHospital")}
        </Btn>
      </div>
      {children}
    </div>
  );
};

/** Their own chambers — the same heading and Add button as Hospitals, beneath it. */
const ChambersSection = ({ note, onAdd, canAdd, children }: {
  note: string; onAdd?: () => void; canAdd: boolean; children?: React.ReactNode;
}) => {
  const t = useTranslations("super.doctors.cards");
  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-primary">{t("chambersTitle")}</h3>
          <p className="text-xs text-muted-foreground">{note}</p>
        </div>
        {onAdd && (
          <Btn variant="outline" className="shrink-0 whitespace-nowrap" onClick={onAdd} disabled={!canAdd}>
            <Plus className="h-4 w-4" /> {t("addChamber")}
          </Btn>
        )}
      </div>
      {children}
    </div>
  );
};

/** One chamber: its details, fee and hours, with close/reopen for one that exists or remove for a new one. */
const ChamberCard = ({ title, draft, onChange, resetKey, doctorName, open, onToggleOpen, onRemove }: {
  title: string;
  draft: ChamberDraft;
  onChange: (patch: Partial<ChamberDraft>) => void;
  resetKey: string | number;
  doctorName: string;
  open?: boolean;
  onToggleOpen?: () => void;
  onRemove?: () => void;
}) => {
  const t = useTranslations("super.doctors.cards");
  return (
    <div className={`rounded-2xl border p-4 ${open === false ? "border-dashed border-border bg-muted/20" : "border-border/60"}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary min-w-0">
          <Store className="h-4 w-4 shrink-0" />
          <span className="truncate">{title}</span>
          {open === false && <Pill>{t("closed")}</Pill>}
        </p>
        {onToggleOpen && (
          <Btn variant="ghost" className="shrink-0" onClick={onToggleOpen}>{open ? t("close") : t("reopen")}</Btn>
        )}
        {onRemove && (
          <button type="button" onClick={onRemove} title={t("removeChamber")}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <ChamberForm draft={draft} onChange={onChange} resetKey={resetKey} doctorName={doctorName} />
    </div>
  );
};

/** An existing hospital's fee as typed, and its week once touched — untouched hours are left as stored. */
type HospitalEdit = { fee: string; week: WeekHours | null };

const errorOf = async (res: Response) => (await res.json().catch(() => null))?.error?.message as string | undefined;

const Doctors = () => {
  const t = useTranslations("super.doctors");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const genderLabel = useGenderLabel();
  const statusLabel = (s: string) =>
    (DOCTOR_STATUSES as readonly string[]).includes(s) ? t(`statuses.${s as (typeof DOCTOR_STATUSES)[number]}`) : s;
  const loginState = (p: Person) =>
    !p.has_login ? { label: t("login.none"), tone: "default" as const }
      : p.is_active ? { label: t("login.active"), tone: "ok" as const }
        : { label: t("login.suspended"), tone: "bad" as const };
  const tryAgain = t("requestFailed");

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
  const nextKey = useRef(1);
  // Edit: each existing hospital's fee and hours, and hospitals being added.
  const [editExisting, setEditExisting] = useState<Record<string, HospitalEdit>>({});
  const [editAdds, setEditAdds] = useState<Assignment[]>([]);
  // Hospital rows to remove on Save — marked, with an undo, rather than gone on the click.
  const [editRemovals, setEditRemovals] = useState<string[]>([]);
  // Their chambers as edited, whether each is open, and new ones — all applied on Save.
  const [editChambers, setEditChambers] = useState<Record<string, ChamberDraft>>({});
  const [editChamberOpen, setEditChamberOpen] = useState<Record<string, boolean>>({});
  const [editChamberAdds, setEditChamberAdds] = useState<ChamberAdd[]>([]);
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
      return [p.name, p.specialty, p.email, p.phone, p.bmdc_number, ...p.hospitals.map(h => h.name), ...p.chambers.map(c => c.name)]
        .some(v => v?.toLowerCase().includes(q));
    });
  }, [people, filter, query]);

  const feeText = (fee: number | null) => (fee == null ? "" : String(fee));

  const openEdit = (p: Person) => {
    setEditDraft(Object.fromEntries(EDIT_KEYS.map(k => [k, p[k] == null ? "" : String(p[k])])));
    setEditExisting(Object.fromEntries(p.hospitals.map(h => [h.doctor_id, { fee: feeText(h.consultation_fee), week: null }])));
    setEditAdds([]);
    setEditRemovals([]);
    setEditChambers(Object.fromEntries(p.chambers.map(c => [c.id, draftFromChamber(c)])));
    setEditChamberOpen(Object.fromEntries(p.chambers.map(c => [c.id, c.open])));
    setEditChamberAdds([]);
    setEditing(p);
  };

  /** New-chamber cards in Edit. */
  const chamberCards = {
    add: () => {
      const key = nextKey.current;
      nextKey.current += 1;
      setEditChamberAdds(list => [...list, { key, draft: emptyChamberDraft() }]);
    },
    update: (key: number, patch: Partial<ChamberDraft>) =>
      setEditChamberAdds(list => list.map(a => (a.key === key ? { ...a, draft: { ...a.draft, ...patch } } : a))),
    remove: (key: number) => setEditChamberAdds(list => list.filter(a => a.key !== key)),
  };

  /**
   * Chamber changes, after the person is saved: each through /api/v1/chambers,
   * which opens and changes them as the doctor's own would. Returns what
   * failed, by name, so one bad chamber doesn't hide the others.
   */
  const saveChambers = async (p: Person) => {
    const failed: string[] = [];
    const send = async (method: "POST" | "PATCH", body: object, name: string) => {
      const res = await fetch("/api/v1/chambers", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) failed.push(`${name}: ${await errorOf(res) ?? t("toasts.failed")}`);
    };

    for (const c of p.chambers) {
      const draft = editChambers[c.id];
      if (draft && JSON.stringify(chamberPayload(draft)) !== JSON.stringify(chamberPayload(draftFromChamber(c)))) {
        await send("PATCH", { id: c.id, ...chamberPayload(draft) }, draft.name || c.name);
      }
      if (editChamberOpen[c.id] !== undefined && editChamberOpen[c.id] !== c.open) {
        await send("PATCH", { id: c.id, open: editChamberOpen[c.id] }, c.name);
      }
    }
    for (const a of editChamberAdds) {
      await send("POST", { ...chamberPayload(a.draft), profile_id: p.profile_id }, a.draft.name || t("cards.newChamber"));
    }
    return failed;
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editDraft.name?.trim()) { toast.error(t("toasts.nameRequired")); return; }
    if (editAdds.some(a => !a.tenant_id)) { toast.error(t("toasts.pickEachNew")); return; }
    if ([...Object.values(editChambers), ...editChamberAdds.map(a => a.draft)].some(d => d.has_name && !d.name.trim())) {
      toast.error(t("toasts.chamberName"));
      return;
    }
    if (!editing.has_login && editing.hospitals.length - editRemovals.length + editAdds.length > 1) {
      toast.error(t("toasts.needsLogin"), { description: t("toasts.needsLoginEdit") });
      return;
    }

    // Only what changed: an untouched fee or week stays exactly as stored.
    const hospitalChanges = editing.hospitals.flatMap(h => {
      if (editRemovals.includes(h.doctor_id)) return [];
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
          ...(editRemovals.length ? { remove_hospitals: editRemovals } : {}),
        }),
      });
      if (!res.ok) { toast.error(t("toasts.saveFailed"), { description: await errorOf(res) }); return; }

      const chamberFailures = await saveChambers(editing);
      if (chamberFailures.length) {
        toast.error(t("toasts.chamberFailed"), { description: chamberFailures.join(" · ") });
        void load();
        return;
      }
      const count = editing.hospitals.length - editRemovals.length + editAdds.length;
      toast.success(
        editChamberAdds.length
          ? t("toasts.savedChambers", { count: editChamberAdds.length })
          : editAdds.length || editRemovals.length
            ? count === 0 ? t("toasts.savedNoHospital") : t("toasts.savedAt", { count })
            : editing.hospitals.length > 1 ? t("toasts.savedAll", { count: editing.hospitals.length }) : t("toasts.updated"),
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
    setWithLogin(true);
    setCreateKey(k => k + 1);
    setCreating(true);
  };

  const hospitalName = (tenantId: string) => hospitalOptions.find(h => h.id === tenantId)?.name ?? t("theHospital");

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
    if (!createDraft.name.trim()) { toast.error(t("toasts.nameRequired")); return; }
    if (!createDraft.email.trim()) { toast.error(t("toasts.emailRequired")); return; }
    if (assignments.some(a => !a.tenant_id)) { toast.error(t("toasts.pickEach")); return; }
    // Hospital rows are one person only through their login (0077). Without
    // one, each would stand alone as a separate doctor.
    if (assignments.length > 1 && !withLogin) {
      toast.error(t("toasts.needsLogin"), { description: t("toasts.needsLoginCreate") });
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
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(t("toasts.addFailed"), { description: body?.error?.message }); return; }

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
          toast.warning(t("toasts.addedNoLogin"), { description: loginBody?.error?.message });
          void load();
          return;
        }

        const unlinked: string[] = [];
        for (const [i, id] of ids.slice(1).entries()) {
          const link = await fetch(`/api/v1/doctors/${id}/login`, { method: "POST" });
          if (!link.ok) unlinked.push(hospitalName(assignments[i + 1].tenant_id));
        }
        if (unlinked.length) {
          toast.warning(t("toasts.unlinked", { hospitals: unlinked.join(", ") }), {
            description: t("toasts.unlinkedHint"),
          });
        }

        if (loginBody.data?.linked) {
          toast.success(t("toasts.linked", { name: loginBody.data.name }), {
            description: assignments.length ? t("toasts.linkedHospitals") : t("toasts.linkedPlain"),
          });
        } else {
          setCreds({
            name, ...loginBody.data,
            note: firstHospital ? t("notes.newAt", { hospital: firstHospital }) : t("notes.new"),
          });
          toast.success(assignments.length > 1 ? t("toasts.addedAt", { count: assignments.length }) : t("toasts.addedWithLogin"));
        }
      } else {
        toast.success(t("toasts.added"));
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
        toast.error(t("toasts.loginLoadFailed"), { description: body?.error?.message });
        return;
      }
      setCreds({ name: person.name, ...body.data, person, note: t("notes.view") });
    } catch {
      toast.error(t("toasts.loginLoadFailed"), { description: tryAgain });
    } finally {
      setLoginBusy(null);
    }
  };

  const createLogin = async (person: Person) => {
    setLoginBusy(person.key);
    try {
      const res = await fetch(`/api/v1/doctors/${person.doctor_id}/login`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(t("toasts.loginCreateFailed"), { description: body?.error?.message }); return; }
      if (body.data?.linked) {
        toast.success(t("toasts.linked", { name: body.data.name }), { description: t("toasts.linkedOwn") });
      } else {
        setCreds({ name: person.name, ...body.data, note: t("notes.view") });
        toast.success(t("toasts.loginCreated"));
      }
      void load();
    } catch {
      toast.error(t("toasts.loginCreateFailed"), { description: tryAgain });
    } finally {
      setLoginBusy(null);
    }
  };

  const resetLogin = async (person: Person) => {
    setLoginBusy(person.key);
    try {
      const res = await fetch(`/api/v1/doctors/${loginRowOf(person)}/login`, { method: "PUT" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(t("toasts.resetFailed"), { description: body?.error?.message }); return; }
      setCreds({ name: person.name, ...body.data, person, note: t("notes.reset") });
      toast.success(t("toasts.newPassword"));
    } catch {
      toast.error(t("toasts.resetFailed"), { description: tryAgain });
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
      toast.error(active ? t("toasts.reactivateFailed") : t("toasts.suspendFailed"), { description: await errorOf(res) });
      return;
    }
    toast.success(active ? t("toasts.reactivated", { name: person.name }) : t("toasts.suspended", { name: person.name }));
    void load();
  };

  const columns: Column<Person>[] = [
    {
      key: "name", label: t("columns.doctor"), sortable: true, accessor: p => p.name,
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
    { key: "bmdc", label: t("columns.bmdc"), sortable: true, accessor: p => p.bmdc_number ?? "", render: p => p.bmdc_number || "—" },
    {
      key: "contact", label: t("columns.contact"), accessor: p => p.email ?? "",
      render: p => (
        <div className="text-xs">
          <p className="text-primary">{p.email || "—"}</p>
          <p className="text-muted-foreground">{p.phone || ""}</p>
        </div>
      ),
    },
    {
      key: "hospitals", label: t("columns.practises"), sortable: true, accessor: p => p.hospitals.length + p.chambers.length,
      render: p => p.hospitals.length + p.chambers.length === 0 ? (
        <span className="text-xs text-muted-foreground">{t("noHospitalYet")}</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {p.hospitals.map(h => (
            <span key={h.doctor_id} className="rounded-full bg-chip text-primary px-2 py-0.5 text-[11px] font-semibold">{h.name}</span>
          ))}
          {p.chambers.map(c => (
            <span key={c.id} title={t("ownChamber")}
              className={`inline-flex items-center gap-1 rounded-full border border-primary/25 px-2 py-0.5 text-[11px] font-semibold ${c.open ? "text-primary" : "text-muted-foreground line-through"}`}>
              <Store className="h-3 w-3" />{c.name}
            </span>
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

  const noHours = t("noHours");

  return (
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Stethoscope} label={t("kpis.doctors")} value={loading ? "—" : String(counts.all)} tone="primary" />
        <Kpi icon={KeyRound} label={t("filters.login")} value={loading ? "—" : String(counts.login)} tone="accent" />
        <Kpi icon={Building2} label={t("kpis.multi")} value={loading ? "—" : String(counts.multi)} tone="chip" />
        <Kpi icon={UserX} label={t("filters.suspended")} value={loading ? "—" : String(counts.suspended)} tone={counts.suspended ? "destructive" : "primary"} />
      </div>

      <Card className="p-5">
        <Toolbar
          search={query} onSearch={setQuery}
          onAdd={openCreate} addLabel={t("add")}
          onExport={() => exportCSV(rows.map(p => ({
            [t("csv.name")]: p.name, [t("csv.specialty")]: p.specialty, [t("csv.bmdc")]: p.bmdc_number,
            [t("csv.email")]: p.email, [t("csv.phone")]: p.phone,
            [t("csv.hospitals")]: p.hospitals.map(h => h.name).join("; "), [t("csv.login")]: loginState(p).label,
          })), "doctors.csv")}
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
                onEdit={() => openEdit(p)}
                // The key leads, as on a hospital's Doctors page.
                before={
                  <button type="button" onClick={() => onKey(p)} disabled={loginBusy === p.key}
                    title={p.has_login ? t("viewLoginTitle") : t("createLoginTitle")}
                    className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 disabled:opacity-50">
                    {loginBusy === p.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  </button>
                }
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
              <Avatar src={viewing.photo_url} name={viewing.name} className="h-16 w-16" />
              <div className="min-w-0">
                <p className="font-display text-2xl text-primary truncate">{viewing.name}</p>
                <p className="text-sm text-muted-foreground">{viewing.specialty || t("noSpecialty")}</p>
                <div className="mt-1"><Pill tone={loginState(viewing).tone}>{loginState(viewing).label}</Pill></div>
              </div>
            </div>
            <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
              {([
                [t("view.email"), viewing.email],
                [t("view.phone"), viewing.phone],
                [t("view.bmdc"), viewing.bmdc_number],
                [t("view.education"), viewing.education],
                [t("view.experience"), viewing.experience_years != null ? t("view.years", { count: viewing.experience_years }) : null],
                [t("view.gender"), genderLabel(viewing.gender)],
                [t("view.languages"), viewing.languages],
                [t("view.expertise"), viewing.expertise],
                [t("view.since"), formatDate(viewing.joined_at)],
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
                {t("view.hospitals", { count: viewing.hospitals.length })}
              </p>
              {viewing.hospitals.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("view.noHospitals")}</p>
              )}
              <div className="space-y-2">
                {viewing.hospitals.map(h => (
                  <div key={h.doctor_id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 border border-border/40 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{h.name}</p>
                      <p className="text-xs text-muted-foreground">{statusLabel(h.status)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{availabilityLabel(h.availability, locale) ?? noHours}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary shrink-0">
                      {h.consultation_fee == null ? "—" : formatCurrency(Number(h.consultation_fee))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {viewing.chambers.length > 0 && (
              <div>
                <p className="font-display text-lg text-primary mb-2">
                  {t("view.chambers", { count: viewing.chambers.length })}
                </p>
                <div className="space-y-2">
                  {viewing.chambers.map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 border border-border/40 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-primary truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.open ? t("view.taking") : t("cards.closed")}</p>
                        {chamberPlace(c) && <p className="text-xs text-muted-foreground mt-0.5">{chamberPlace(c)}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">{availabilityLabel(c.availability, locale) ?? noHours}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary shrink-0">
                        {c.consultation_fee == null ? "—" : formatCurrency(Number(c.consultation_fee))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Btn variant="outline" onClick={() => { setViewKey(null); openEdit(viewing); }}>{tc("edit")}</Btn>
              <Btn variant="outline" onClick={() => onKey(viewing)} disabled={loginBusy === viewing.key}>
                {loginBusy === viewing.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {viewing.has_login ? t("viewLogin") : t("createLogin")}
              </Btn>
              {viewing.has_login && (
                <Btn variant={viewing.is_active ? "danger" : "primary"}
                  onClick={() => setPendingActive({ person: viewing, active: !viewing.is_active })}>
                  {viewing.is_active ? t("suspendLogin") : t("reactivateLogin")}
                </Btn>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Edit */}
      <Modal open={!!editing} onClose={() => !saving && setEditing(null)}
        title={editing?.name ? t("editTitle", { name: editing.name }) : t("editTitleAnon")} size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setEditing(null)} disabled={saving}>{tc("cancel")}</Btn>
          <Btn onClick={() => void saveEdit()} disabled={saving || photoUploading}>
            {(saving || photoUploading) && <Loader2 className="h-4 w-4 animate-spin" />} {photoUploading ? t("uploadingPhoto") : tc("save")}
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
              note={editing.hospitals.length > 1 ? t("notes.sharedDetails", { count: editing.hospitals.length }) : undefined}
            />

            {/* Where they work, and when — each hospital's own fee and hours,
                and hospitals to add. Their own hours are their chambers', below. */}
            <HospitalsSection
              note={editing.hospitals.length === 0 && editAdds.length === 0
                ? t("notes.noHospital")
                : !editing.has_login && editing.hospitals.length - editRemovals.length > 0
                  ? t("notes.loginForMore")
                  : t("notes.eachHospital")}
              onAdd={editCards.add}
              canAdd={
                // Without a login, one hospital at a time — one being removed frees the place.
                !(!editing.has_login && editing.hospitals.length - editRemovals.length + editAdds.length >= 1)
                && editing.hospitals.length + editAdds.length < hospitalOptions.length
              }
            >
              {editing.hospitals.map(h => editRemovals.includes(h.doctor_id) ? (
                // Marked, not gone: nothing happens until Save, and Undo puts it back.
                <div key={`${editing.key}:${h.doctor_id}`}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">{t("removal.title", { name: h.name })}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("removal.body")}
                      {editing.hospitals.length - editRemovals.length + editAdds.length === 0
                        && ` ${t("removal.none")}`}
                    </p>
                  </div>
                  <Btn variant="outline" className="shrink-0" onClick={() => setEditRemovals(list => list.filter(id => id !== h.doctor_id))}>
                    {t("removal.undo")}
                  </Btn>
                </div>
              ) : (
                <HospitalCard
                  key={`${editing.key}:${h.doctor_id}`}
                  title={t("cards.hospital")}
                  hospital={h.name}
                  fee={editExisting[h.doctor_id]?.fee ?? ""}
                  onFee={v => setEditExisting(m => ({ ...m, [h.doctor_id]: { ...m[h.doctor_id], fee: v } }))}
                  initialWeek={weekFromAvailability(h.availability)}
                  onWeek={week => setEditExisting(m => ({ ...m, [h.doctor_id]: { ...m[h.doctor_id], week } }))}
                  onRemove={() => setEditRemovals(list => [...list, h.doctor_id])}
                />
              ))}

              {editAdds.map((a, i) => (
                <HospitalCard
                  key={a.key}
                  title={editAdds.length > 1 ? t("cards.newHospitalN", { n: i + 1 }) : t("cards.newHospital")}
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
            </HospitalsSection>

            {/* Their own practices: each its own address, fee and hours. A
                chamber is run from the doctor's panel, so it needs a login. */}
            <ChambersSection
              note={!editing.has_login
                ? t("notes.chamberNeedsLogin")
                : editing.chambers.length + editChamberAdds.length === 0
                  ? t("notes.chamberIntro")
                  : t("notes.eachChamber")}
              onAdd={chamberCards.add}
              canAdd={editing.has_login}
            >
              {editing.chambers.map(c => editChambers[c.id] && (
                <ChamberCard
                  key={`${editing.key}:${c.id}`}
                  title={editChambers[c.id].name || c.name}
                  draft={editChambers[c.id]}
                  onChange={patch => setEditChambers(m => ({ ...m, [c.id]: { ...m[c.id], ...patch } }))}
                  resetKey={`${editing.key}:${c.id}`}
                  doctorName={editDraft.name || editing.name}
                  open={editChamberOpen[c.id] ?? c.open}
                  onToggleOpen={() => setEditChamberOpen(m => ({ ...m, [c.id]: !(m[c.id] ?? c.open) }))}
                />
              ))}
              {editChamberAdds.map((a, i) => (
                <ChamberCard
                  key={a.key}
                  title={a.draft.name || (editChamberAdds.length > 1 ? t("cards.newChamberN", { n: i + 1 }) : t("cards.newChamber"))}
                  draft={a.draft}
                  onChange={patch => chamberCards.update(a.key, patch)}
                  resetKey={a.key}
                  doctorName={editDraft.name || editing.name}
                  onRemove={() => chamberCards.remove(a.key)}
                />
              ))}
            </ChambersSection>

            {/* Where Add Doctor offers a login, Edit shows the one they have. */}
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3 text-sm">
              <span>
                <span className="font-semibold text-primary">
                  {!editing.has_login ? t("loginBox.none") : editing.is_active ? t("loginBox.has") : t("loginBox.suspended")}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {editing.has_login ? t("loginBox.hasHint") : t("loginBox.linkHint")}
                </span>
              </span>
              <Btn variant="outline" className="shrink-0 whitespace-nowrap" onClick={() => onKey(editing)} disabled={loginBusy === editing.key}>
                {loginBusy === editing.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {editing.has_login ? t("viewLogin") : t("createLogin")}
              </Btn>
            </div>
          </>
        )}
      </Modal>

      {/* Create */}
      <Modal open={creating} onClose={() => !saving && setCreating(false)} title={t("add")} size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setCreating(false)} disabled={saving}>{tc("cancel")}</Btn>
          <Btn onClick={() => void saveCreate()} disabled={saving || photoUploading}>
            {(saving || photoUploading) && <Loader2 className="h-4 w-4 animate-spin" />} {photoUploading ? t("uploadingPhoto") : t("add")}
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
            hours (0077); the doctor's own are their chambers'. */}
        <HospitalsSection
          note={assignments.length === 0 ? t("notes.noHospital") : t("notes.eachHospital")}
          onAdd={createCards.add}
          canAdd={assignments.length < hospitalOptions.length}
        >
          {assignments.map((a, i) => (
            <HospitalCard
              key={a.key}
              title={assignments.length > 1 ? t("cards.hospitalN", { n: i + 1 }) : t("cards.hospital")}
              hospital={a.tenant_id ? hospitalName(a.tenant_id) : undefined}
              select={{ value: a.tenant_id, options: freeHospitals(assignments, a.key), onChange: id => createCards.update(a.key, { tenant_id: id }) }}
              fee={a.consultation_fee}
              onFee={v => createCards.update(a.key, { consultation_fee: v })}
              initialWeek={a.week}
              onWeek={week => createCards.update(a.key, { week })}
              onRemove={() => createCards.remove(a.key)}
            />
          ))}
        </HospitalsSection>

        {/* Same place as on Edit. A chamber belongs to a login, which this
            form makes only once the doctor is saved. */}
        <ChambersSection note={t("notes.chamberAfterCreate")} canAdd={false} />
        <label className="flex items-start gap-3 rounded-xl bg-muted/40 p-3 text-sm cursor-pointer">
          <input type="checkbox" checked={withLogin} onChange={e => setWithLogin(e.target.checked)} className="mt-0.5" />
          <span>
            <span className="font-semibold text-primary">{t("loginBox.give")}</span>
            <span className="block text-xs text-muted-foreground">{t("loginBox.linkHint")}</span>
          </span>
        </label>
      </Modal>

      {/* A login's credentials — new, viewed, or reset */}
      <Modal open={!!creds} onClose={() => setCreds(null)} title={t("credsTitle")}
        footer={<>
          {creds?.person && (
            <Btn variant="outline" onClick={() => { const person = creds.person!; setCreds(null); setPendingReset({ person, missing: false }); }}>
              <KeyRound className="h-4 w-4" /> {t("generatePassword")}
            </Btn>
          )}
          <Btn onClick={() => setCreds(null)}>{t("done")}</Btn>
        </>}>
        {creds && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
              <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                {t.rich("credsFor", {
                  name: creds.name,
                  b: chunks => <span className="font-semibold text-primary">{chunks}</span>,
                })} {creds.note}
              </p>
            </div>
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
        open={!!pendingCreate}
        onClose={() => setPendingCreate(null)}
        onConfirm={() => pendingCreate && void createLogin(pendingCreate)}
        title={t("confirm.createTitle")}
        description={
          pendingCreate
            ? t("confirm.createBody", { email: pendingCreate.email || t("confirm.theirEmail"), name: pendingCreate.name })
            : undefined
        }
      />

      <ConfirmDialog
        open={!!pendingReset}
        onClose={() => setPendingReset(null)}
        onConfirm={() => pendingReset && void resetLogin(pendingReset.person)}
        title={pendingReset?.missing ? t("confirm.resetTitle") : t("confirm.newTitle")}
        description={
          pendingReset
            ? pendingReset.missing
              ? t("confirm.resetBody", { name: pendingReset.person.name })
              : t("confirm.newBody", { name: pendingReset.person.name })
            : undefined
        }
      />

      <ConfirmDialog
        open={!!pendingActive}
        onClose={() => setPendingActive(null)}
        onConfirm={() => pendingActive && void setActive(pendingActive.person, pendingActive.active)}
        title={pendingActive?.active ? t("confirm.reactivateTitle") : t("confirm.suspendTitle")}
        description={
          pendingActive
            ? pendingActive.active
              ? t("confirm.reactivateBody", { name: pendingActive.person.name })
              : t("confirm.suspendBody", { name: pendingActive.person.name })
            : undefined
        }
      />
    </SuperLayout>
  );
};

export default Doctors;
