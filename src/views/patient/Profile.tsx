"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  User, UserSquare2, HeartPulse, ShieldCheck, Users, Plus, Trash2, Pencil, Save, X, Lock,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { mediaUrl, MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/media";
import { IdentityDocumentField, type IdentityDoc } from "@/components/patient/IdentityDocumentField";
import type { Tables } from "@/lib/supabase/types";
import { phoneOfLoginEmail } from "@/lib/phone";
import { DateInput } from "@/components/ui/date-input";

type FamilyMember = {
  id: string;
  name: string;
  relation: string;
  dob?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  phone?: string | null;
  notes?: string | null;
};

/**
 * What the page edits: the name and contact from `profiles`, plus everything
 * else from `patient_profiles`. One flat object, assembled by the route —
 * see /api/v1/patient/profile.
 */
type Patient = Pick<Tables<"profiles">, "full_name" | "email" | "phone" | "avatar_url">
  & Partial<Omit<Tables<"patient_profiles">, "profile_id" | "created_at" | "updated_at">>
  & { family_members?: FamilyMember[] };

/** A hospital that holds a record of this person, and its own ID for them. */
type HospitalLink = {
  id: string;
  mrn: string;
  created_at: string;
  tenants: { id: string; name: string; slug: string } | null;
};
type HistoryKind = "allergy" | "illness" | "medication" | "procedure";
type HistoryEntry = {
  id: string;
  kind: HistoryKind;
  label: string;
  detail: string | null;
  started_on: string | null;
  ongoing: boolean;
};

// No Documents tab: a patient's medical paperwork lives with their records on
// /patient/medical-records (0076), beside the visits it belongs with.
type Tab = "general" | "clinical" | "insurance" | "family";
const TABS = ["general", "clinical", "insurance", "family"] as const satisfies readonly Tab[];

const GENDERS = ["female", "male", "other"] as const;
const MARITAL = ["single", "married", "divorced", "widowed"] as const;

/** Blood groups read the same in both languages, so they are not translated. */
const BLOOD_GROUPS = [
  { value: "o_positive", label: "O+" }, { value: "o_negative", label: "O−" },
  { value: "a_positive", label: "A+" }, { value: "a_negative", label: "A−" },
  { value: "b_positive", label: "B+" }, { value: "b_negative", label: "B−" },
  { value: "ab_positive", label: "AB+" }, { value: "ab_negative", label: "AB−" },
];

const LISTS = ["allergy", "illness", "medication", "procedure"] as const satisfies readonly HistoryKind[];

const bloodLabel = (value: string | null | undefined) =>
  BLOOD_GROUPS.find(o => o.value === value)?.label ?? "—";

/** Month names in the page's language; digits stay Western (see appSettings). */
const dateLabel = (iso: string | null | undefined, locale: string) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US", { day: "numeric", month: "short", year: "numeric" });
};

const SectionHead = ({ icon: Icon, title, action }: { icon: typeof User; title: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 flex-wrap">
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-chip grid place-items-center text-primary"><Icon className="h-4 w-4" /></div>
      <h2 className="font-display text-2xl text-primary">{title}</h2>
    </div>
    {action}
  </div>
);

const ReadField = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{label}</p>
    <p className="text-sm text-foreground/85 mt-1">{value || "—"}</p>
  </div>
);

const inputClass =
  "w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary";

/**
 * A tab that is deliberately not built yet.
 *
 * Each of these used to be a working-looking form over invented data — a
 * document list, a family tree, an insurance plan. Accepting input that goes
 * nowhere is worse than saying so.
 */
const NotYet = ({ icon: Icon, title, reason, note }: { icon: typeof User; title: string; reason: string; note: string }) => (
  <div className="rounded-3xl bg-card border border-border/60 p-10 shadow-soft text-center">
    <div className="h-12 w-12 rounded-2xl bg-chip grid place-items-center text-primary mx-auto">
      <Icon className="h-5 w-5" />
    </div>
    <h2 className="font-display text-2xl text-primary mt-4">{title}</h2>
    <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{reason}</p>
    <p className="text-[10px] tracking-widest font-bold text-muted-foreground mt-5 inline-flex items-center gap-1.5">
      <Lock className="h-3 w-3" /> {note}
    </p>
  </div>
);

const Profile = () => {
  const t = useTranslations("patient.profile");
  const tc = useTranslations("common");
  const tr = useTranslations("rxSheet");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("general");
  const [profile, setProfile] = useState<Patient | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hospitals, setHospitals] = useState<HospitalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Patient>>({});
  const [saving, setSaving] = useState(false);

  const [idDocs, setIdDocs] = useState<IdentityDoc[]>([]);

  const [editingEc, setEditingEc] = useState(false);
  const [ecDraft, setEcDraft] = useState<Partial<Patient>>({});
  const [savingEc, setSavingEc] = useState(false);

  const avatarRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const [adding, setAdding] = useState<HistoryKind | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newDetail, setNewDetail] = useState("");

  // Family members state
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<Omit<FamilyMember, "id">>({
    name: "",
    relation: "child",
    dob: "",
    gender: "male",
    blood_group: "",
    phone: "",
    notes: "",
  });
  const [savingMember, setSavingMember] = useState(false);

  const loadIdDocs = async () => {
    try {
      const res = await fetch("/api/v1/identity-documents?limit=10");
      const body = await res.json().catch(() => null);
      if (res.ok) setIdDocs((body.data ?? []) as IdentityDoc[]);
    } catch {
      // The rest of the profile still works without this list.
    }
  };

  const load = async () => {
    try {
      const res = await fetch("/api/v1/patient/profile");
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setFailed(true);
        toast.error(body?.error?.message || t("loadFailed"));
        return;
      }
      setProfile(body.data.profile);
      setHospitals(body.data.hospitals ?? []);
      void loadIdDocs();
      setHistory(body.data.history ?? []);
      if (Array.isArray(body.data.profile?.family_members)) {
        setFamilyMembers(body.data.profile.family_members);
      }
    } catch {
      setFailed(true);
      toast.error(tc("networkError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const startEdit = () => { setDraft(profile ?? {}); setEditing(true); };

  const startEditEc = () => {
    setEcDraft({
      emergency_contact_name: profile?.emergency_contact_name ?? "",
      emergency_contact_relation: profile?.emergency_contact_relation ?? "",
      emergency_contact_phone: profile?.emergency_contact_phone ?? "",
      emergency_contact_email: profile?.emergency_contact_email ?? "",
      emergency_contact_address: profile?.emergency_contact_address ?? "",
    });
    setEditingEc(true);
  };

  /** Sends only the fields this card owns, never the rest of the profile. */
  const saveEc = async () => {
    setSavingEc(true);
    try {
      const res = await fetch("/api/v1/patient/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ecDraft),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || t("ecSaveFailed"));
        return;
      }
      setProfile(body.data);
      setEditingEc(false);
      toast.success(t("ecSaved"));
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setSavingEc(false);
    }
  };

  /**
   * Straight to Cloudflare and back with a key, the same path every other
   * image in the app takes — see src/lib/media.ts. The column holds the key,
   * never a data URL.
   */
  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      toast.error(t("badImage"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t("imageTooBig", { size: (file.size / 1024 / 1024).toFixed(1) }));
      return;
    }

    setAvatarBusy(true);
    try {
      const permission = await fetch("/api/v1/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "avatars", contentType: file.type, size: file.size }),
      });
      const body = await permission.json().catch(() => null);
      if (!permission.ok) throw new Error(body?.error?.message || t("startFailed"));

      const { key, uploadUrl } = body.data;
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error(t("uploadRefused"));

      const saved = await fetch("/api/v1/patient/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: key }),
      });
      const savedBody = await saved.json().catch(() => null);
      if (!saved.ok) throw new Error(savedBody?.error?.message || t("pictureSaveFailed"));

      setProfile(savedBody.data);
      toast.success(t("pictureUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("pictureUploadFailed"));
    } finally {
      setAvatarBusy(false);
      if (avatarRef.current) avatarRef.current.value = "";
    }
  };
  const upd = (patch: Partial<Patient>) => setDraft(d => ({ ...d, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/patient/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || t("saveFailed"));
        return;
      }
      setProfile(body.data);
      setEditing(false);
      toast.success(t("saved"));
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setSaving(false);
    }
  };

  const addEntry = async (kind: HistoryKind) => {
    if (!newLabel.trim()) { toast.error(t("nameFirst")); return; }
    try {
      const res = await fetch("/api/v1/patient/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, label: newLabel.trim(), detail: newDetail.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || t("addFailed"));
        return;
      }
      setHistory(h => [body.data, ...h]);
      setNewLabel(""); setNewDetail(""); setAdding(null);
      toast.success(t("added"));
    } catch {
      toast.error(tc("networkError"));
    }
  };

  const removeEntry = async (entry: HistoryEntry) => {
    try {
      const res = await fetch(`/api/v1/patient/profile?id=${entry.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message || t("removeFailed"));
        return;
      }
      setHistory(h => h.filter(e => e.id !== entry.id));
      toast.success(t("removedToast"));
    } catch {
      toast.error(tc("networkError"));
    }
  };

  const height = profile?.height_feet != null || profile?.height_inches != null
    ? `${profile?.height_feet ?? 0}′ ${profile?.height_inches ?? 0}″`
    : "—";

  return (
    <PatientPortalLayout>
      {/* Header: the picture and the name, the way this page has always led. */}
      <div className="flex flex-wrap items-center gap-8 max-w-6xl mx-auto">
        <div className="relative shrink-0">
          {mediaUrl(profile?.avatar_url) ? (
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              src={mediaUrl(profile?.avatar_url) as string}
              alt={profile?.full_name ?? t("picture")}
              loading="lazy"
              width={160}
              height={160}
              className="h-40 w-40 rounded-3xl object-cover shadow-card"
            />
          ) : (
            <div className="h-40 w-40 rounded-3xl bg-chip grid place-items-center shadow-card">
              <User className="h-14 w-14 text-primary/40" />
            </div>
          )}
          <input ref={avatarRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden" onChange={onAvatarPick} />
          <button
            onClick={() => avatarRef.current?.click()}
            disabled={avatarBusy}
            aria-label={t("changePicture")}
            className="absolute bottom-2 right-2 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow hover:opacity-90 transition disabled:opacity-60"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-w-[260px]">
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("kicker")}</p>
          <h1 className="font-display text-5xl text-primary mt-2 flex items-center gap-2">
            {profile?.full_name ?? t("title")}
            {/* Icon only, no label — it means the same thing everywhere and a
                word beside it would only take up room. */}
            {idDocs.some(d => d.holder === "self" && d.status === "verified") && (
              <BadgeCheck className="h-7 w-7 text-primary-glow shrink-0" aria-label={t("verified")} />
            )}
          </h1>
          {hospitals.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {t("registeredAt")}{" "}
              {hospitals.map((h, i) => (
                <span key={h.id}>
                  {i > 0 && ", "}
                  {h.tenants?.name ?? t("aHospital")}
                  {h.mrn && <> · <span className="font-mono text-primary">{h.mrn}</span></>}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      {/* Tabs, centred under the header with the highlight sliding between. */}
      <div className="flex justify-center mt-10">
        <div className="bg-muted/40 rounded-full p-1.5 flex gap-1 flex-wrap">
          {TABS.map(key => (
            <button key={key} onClick={() => setTab(key)} className="relative px-5 py-2.5 text-sm font-semibold rounded-full">
              {tab === key && (
                <motion.div
                  layoutId="patient-profile-tab"
                  className="absolute inset-0 bg-card shadow-soft rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className={`relative ${tab === key ? "text-primary" : "text-muted-foreground"}`}>{t(`tabs.${key}`)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 max-w-6xl mx-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground py-16 text-center">{t("loading")}</p>
        ) : failed ? (
          <p className="text-sm text-destructive py-16 text-center">{t("failed")}</p>
        ) : !profile ? (
          <p className="text-sm text-muted-foreground py-16 text-center">{t("loading")}</p>
        ) : tab === "general" ? (
          <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
            <SectionHead
              icon={User}
              title={t("personal")}
              action={editing ? (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} disabled={saving}
                    className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary inline-flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5" /> {tc("cancel")}
                  </button>
                  <button onClick={save} disabled={saving}
                    className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold shadow-glow inline-flex items-center gap-1.5 disabled:opacity-60">
                    <Save className="h-3.5 w-3.5" /> {saving ? tc("saving") : tc("save")}
                  </button>
                </div>
              ) : (
                <button onClick={startEdit}
                  className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:bg-chip">
                  <Pencil className="h-3.5 w-3.5" /> {tc("edit")}
                </button>
              )}
            />

            {editing ? (
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.fullName")}</span>
                  <input className={inputClass} value={draft.full_name ?? ""} onChange={e => upd({ full_name: e.target.value })} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.dob")}</span>
                  <DateInput className={inputClass} value={draft.date_of_birth ?? ""} onChange={date_of_birth => upd({ date_of_birth })}
                    max={new Date().toISOString().slice(0, 10)} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.gender")}</span>
                  <select className={inputClass} value={draft.gender ?? ""} onChange={e => upd({ gender: (e.target.value || null) as Patient["gender"] })}>
                    <option value="">—</option>
                    {GENDERS.map(g => <option key={g} value={g}>{t(`genders.${g}`)}</option>)}
                  </select></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.marital")}</span>
                  <select className={inputClass} value={draft.marital_status ?? ""} onChange={e => upd({ marital_status: (e.target.value || null) as Patient["marital_status"] })}>
                    <option value="">—</option>
                    {MARITAL.map(m => <option key={m} value={m}>{t(`maritalStatuses.${m}`)}</option>)}
                  </select></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.nid")}</span>
                  <input className={inputClass} value={draft.national_id ?? ""} onChange={e => upd({ national_id: e.target.value })} /></label>
                {/* Read-only: it is the address this account signs in with, and
                    the API ignores it. Shown here so the form is complete. */}
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.email")}</span>
                  <input type="email" className={`${inputClass} opacity-60 cursor-not-allowed`} value={phoneOfLoginEmail(profile.email) ? "" : profile.email ?? ""} readOnly disabled
                    title={t("emailLocked")} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.phone")}</span>
                  <input className={inputClass} value={draft.phone ?? ""} onChange={e => upd({ phone: e.target.value })} /></label>
                <label className="space-y-1.5 md:col-span-2"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.address")}</span>
                  <input className={inputClass} value={draft.address ?? ""} onChange={e => upd({ address: e.target.value })} /></label>
              </div>
            ) : (
              <div className="mt-6 grid md:grid-cols-3 gap-5">
                <ReadField label={t("fields.fullName")} value={profile.full_name} />
                <ReadField label={t("fields.dob")} value={dateLabel(profile.date_of_birth, locale)} />
                <ReadField label={t("fields.gender")} value={profile.gender ? t(`genders.${profile.gender}`) : "—"} />
                <ReadField label={t("fields.marital")} value={profile.marital_status ? t(`maritalStatuses.${profile.marital_status}`) : "—"} />
                <ReadField label={t("fields.nid")} value={profile.national_id ?? ""} />
                <ReadField label={t("fields.email")} value={phoneOfLoginEmail(profile.email) ? "" : profile.email ?? ""} />
                <ReadField label={t("fields.phone")} value={profile.phone ?? ""} />
                <div className="md:col-span-2"><ReadField label={t("fields.address")} value={profile.address ?? ""} /></div>
              </div>
            )}

            <IdentityDocumentField
              holder="self"
              docs={idDocs}
              onChanged={loadIdDocs}
              title={t("idTitle")}
              note={t("idNote")}
            />
          </motion.div>

          {/* Its own card, as it was before: the person to call is not another
              line of your address, and it gets edited on its own. */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
            <SectionHead
              icon={UserSquare2}
              title={t("emergency")}
              action={editingEc ? (
                <div className="flex gap-2">
                  <button onClick={() => setEditingEc(false)} disabled={savingEc}
                    className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary inline-flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5" /> {tc("cancel")}
                  </button>
                  <button onClick={saveEc} disabled={savingEc}
                    className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold shadow-glow inline-flex items-center gap-1.5 disabled:opacity-60">
                    <Save className="h-3.5 w-3.5" /> {savingEc ? tc("saving") : tc("save")}
                  </button>
                </div>
              ) : (
                <button onClick={startEditEc}
                  className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:bg-chip">
                  <Pencil className="h-3.5 w-3.5" /> {tc("edit")}
                </button>
              )}
            />

            {editingEc ? (
              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.name")}</span>
                  <input className={inputClass} value={ecDraft.emergency_contact_name ?? ""}
                    onChange={e => setEcDraft(d => ({ ...d, emergency_contact_name: e.target.value }))} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.relationship")}</span>
                  <input className={inputClass} placeholder={t("relationPlaceholder")} value={ecDraft.emergency_contact_relation ?? ""}
                    onChange={e => setEcDraft(d => ({ ...d, emergency_contact_relation: e.target.value }))} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.phone")}</span>
                  <input className={inputClass} value={ecDraft.emergency_contact_phone ?? ""}
                    onChange={e => setEcDraft(d => ({ ...d, emergency_contact_phone: e.target.value }))} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.email")}</span>
                  <input className={inputClass} type="email" placeholder={t("ecEmailPlaceholder")}
                    value={ecDraft.emergency_contact_email ?? ""}
                    onChange={e => setEcDraft(d => ({ ...d, emergency_contact_email: e.target.value }))} /></label>
                <label className="space-y-1.5 md:col-span-2"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.address")}</span>
                  <input className={inputClass} placeholder={t("ecAddressPlaceholder")}
                    value={ecDraft.emergency_contact_address ?? ""}
                    onChange={e => setEcDraft(d => ({ ...d, emergency_contact_address: e.target.value }))} /></label>
              </div>
            ) : profile.emergency_contact_name || profile.emergency_contact_phone ? (
              <div className="mt-6 grid md:grid-cols-3 gap-5">
                <ReadField label={t("fields.name")} value={profile.emergency_contact_name ?? ""} />
                <ReadField label={t("fields.relationship")} value={profile.emergency_contact_relation ?? ""} />
                <ReadField label={t("fields.phone")} value={profile.emergency_contact_phone ?? ""} />
                <ReadField label={t("fields.email")} value={profile.emergency_contact_email ?? ""} />
                <ReadField label={t("fields.address")} value={profile.emergency_contact_address ?? ""} />
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">{t("noEmergency")}</p>
            )}

            <IdentityDocumentField
              holder="emergency_contact"
              docs={idDocs}
              onChanged={loadIdDocs}
            />
          </motion.div>
          </div>
        ) : tab === "clinical" ? (
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
              <SectionHead
                icon={HeartPulse}
                title={t("vitals")}
                action={!editing && (
                  <button onClick={startEdit}
                    className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:bg-chip">
                    <Pencil className="h-3.5 w-3.5" /> {tc("edit")}
                  </button>
                )}
              />
              {editing ? (
                <div className="mt-6 grid md:grid-cols-4 gap-4 items-end">
                  <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.bloodGroup")}</span>
                    <select className={inputClass} value={draft.blood_group ?? ""} onChange={e => upd({ blood_group: (e.target.value || null) as Patient["blood_group"] })}>
                      <option value="">—</option>
                      {BLOOD_GROUPS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select></label>
                  <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.heightFt")}</span>
                    <input type="number" min={0} max={9} className={inputClass} value={draft.height_feet ?? ""} onChange={e => upd({ height_feet: e.target.value === "" ? null : Number(e.target.value) })} /></label>
                  <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.heightIn")}</span>
                    <input type="number" min={0} max={11} className={inputClass} value={draft.height_inches ?? ""} onChange={e => upd({ height_inches: e.target.value === "" ? null : Number(e.target.value) })} /></label>
                  <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("fields.weightKg")}</span>
                    <input type="number" min={0} step="0.1" className={inputClass} value={draft.weight_kg ?? ""} onChange={e => upd({ weight_kg: e.target.value === "" ? null : Number(e.target.value) })} /></label>
                  <div className="md:col-span-4 flex gap-2">
                    <button onClick={() => setEditing(false)} disabled={saving}
                      className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary">{tc("cancel")}</button>
                    <button onClick={save} disabled={saving}
                      className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold shadow-glow disabled:opacity-60">
                      {saving ? tc("saving") : tc("save")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 grid md:grid-cols-3 gap-5">
                  <ReadField label={t("fields.bloodGroup")} value={bloodLabel(profile.blood_group)} />
                  <ReadField label={t("fields.height")} value={height} />
                  <ReadField label={t("fields.weight")} value={profile.weight_kg != null ? tr("kg", { value: profile.weight_kg }) : ""} />
                </div>
              )}
            </motion.div>

            {LISTS.map(kind => {
              const entries = history.filter(h => h.kind === kind);
              return (
                <motion.div key={kind} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
                  <SectionHead
                    icon={HeartPulse}
                    title={t(`lists.${kind}.title`)}
                    action={
                      <button onClick={() => { setAdding(adding === kind ? null : kind); setNewLabel(""); setNewDetail(""); }}
                        className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:bg-chip">
                        <Plus className="h-3.5 w-3.5" /> {tc("add")}
                      </button>
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-2">{t(`lists.${kind}.blurb`)}</p>

                  {adding === kind && (
                    <div className="mt-4 grid md:grid-cols-[1fr_1fr_auto] gap-2">
                      <input className={inputClass} placeholder={t(`lists.${kind}.placeholder`)} value={newLabel} onChange={e => setNewLabel(e.target.value)} />
                      <input className={inputClass} placeholder={t("detailOptional")} value={newDetail} onChange={e => setNewDetail(e.target.value)} />
                      <button onClick={() => addEntry(kind)}
                        className="rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2.5 text-xs font-semibold shadow-glow">
                        {tc("add")}
                      </button>
                    </div>
                  )}

                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">{t("nothingRecorded")}</p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {entries.map(e => (
                        <div key={e.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-chip/30">
                          <div className="min-w-0">
                            <p className="font-semibold text-primary">{e.label}</p>
                            {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                          </div>
                          <button onClick={() => removeEntry(e)} aria-label={t("removeEntry", { label: e.label })}
                            className="ml-auto text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : tab === "insurance" ? (
          <NotYet
            icon={ShieldCheck}
            title={t("insurance.title")}
            reason={t("insurance.reason")}
            note={t("notAvailable")}
          />
        ) : (
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <SectionHead icon={Users} title={t("family.title")} />
                  <p className="text-xs text-muted-foreground mt-2 max-w-xl">{t("family.subtitle")}</p>
                </div>
                {!isAddingMember && !editingMemberId && (
                  <button
                    onClick={() => {
                      setMemberForm({
                        name: "",
                        relation: "child",
                        dob: "",
                        gender: "male",
                        blood_group: "",
                        phone: "",
                        notes: "",
                      });
                      setIsAddingMember(true);
                    }}
                    className="rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2.5 text-xs font-semibold shadow-glow flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> {t("family.addMember")}
                  </button>
                )}
              </div>

              {/* Add / Edit Family Member Form */}
              {(isAddingMember || editingMemberId) && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!memberForm.name.trim()) {
                      toast.error("Name is required");
                      return;
                    }
                    setSavingMember(true);
                    const memberId = editingMemberId ?? crypto.randomUUID();
                    const newEntry: FamilyMember = { id: memberId, ...memberForm };
                    const updated = editingMemberId
                      ? familyMembers.map(m => (m.id === editingMemberId ? newEntry : m))
                      : [...familyMembers, newEntry];

                    try {
                      const res = await fetch("/api/v1/patient/profile", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ family_members: updated }),
                      });
                      if (!res.ok) {
                        toast.error(t("saveFailed"));
                        return;
                      }
                      setFamilyMembers(updated);
                      toast.success(editingMemberId ? t("family.memberUpdated") : t("family.memberAdded"));
                      setIsAddingMember(false);
                      setEditingMemberId(null);
                    } catch {
                      toast.error(tc("networkError"));
                    } finally {
                      setSavingMember(false);
                    }
                  }}
                  className="mt-6 p-6 rounded-2xl bg-chip/40 border border-border/60 space-y-4"
                >
                  <p className="font-semibold text-primary text-sm">
                    {editingMemberId ? "Edit Family Member" : t("family.addMember")}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] tracking-widest font-bold text-muted-foreground block mb-1">
                        {t("family.fields.name")}
                      </label>
                      <input
                        required
                        value={memberForm.name}
                        onChange={e => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Ayesha Niloy"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] tracking-widest font-bold text-muted-foreground block mb-1">
                        {t("family.fields.relation")}
                      </label>
                      <select
                        value={memberForm.relation}
                        onChange={e => setMemberForm(prev => ({ ...prev, relation: e.target.value }))}
                        className={inputClass}
                      >
                        <option value="spouse">{t("family.relations.spouse")}</option>
                        <option value="child">{t("family.relations.child")}</option>
                        <option value="parent">{t("family.relations.parent")}</option>
                        <option value="sibling">{t("family.relations.sibling")}</option>
                        <option value="other">{t("family.relations.other")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] tracking-widest font-bold text-muted-foreground block mb-1">
                        {t("family.fields.dob")}
                      </label>
                      <DateInput
                        value={memberForm.dob ?? ""}
                        onChange={d => setMemberForm(prev => ({ ...prev, dob: d }))}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] tracking-widest font-bold text-muted-foreground block mb-1">
                        {t("family.fields.gender")}
                      </label>
                      <select
                        value={memberForm.gender ?? "male"}
                        onChange={e => setMemberForm(prev => ({ ...prev, gender: e.target.value }))}
                        className={inputClass}
                      >
                        <option value="female">{t("genders.female")}</option>
                        <option value="male">{t("genders.male")}</option>
                        <option value="other">{t("genders.other")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] tracking-widest font-bold text-muted-foreground block mb-1">
                        {t("family.fields.bloodGroup")}
                      </label>
                      <select
                        value={memberForm.blood_group ?? ""}
                        onChange={e => setMemberForm(prev => ({ ...prev, blood_group: e.target.value || null }))}
                        className={inputClass}
                      >
                        <option value="">— Select —</option>
                        {BLOOD_GROUPS.map(bg => (
                          <option key={bg.value} value={bg.value}>{bg.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] tracking-widest font-bold text-muted-foreground block mb-1">
                        {t("family.fields.phone")}
                      </label>
                      <input
                        value={memberForm.phone ?? ""}
                        onChange={e => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="017XXXXXXXX"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] tracking-widest font-bold text-muted-foreground block mb-1">
                      {t("family.fields.notes")}
                    </label>
                    <input
                      value={memberForm.notes ?? ""}
                      onChange={e => setMemberForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="e.g. Penicillin allergy, Asthma"
                      className={inputClass}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={savingMember}
                      onClick={() => { setIsAddingMember(false); setEditingMemberId(null); }}
                      className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-chip"
                    >
                      {tc("cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={savingMember}
                      className="rounded-full bg-gradient-dark text-surface-dark-foreground px-6 py-2 text-xs font-semibold shadow-glow"
                    >
                      {savingMember ? tc("saving") : tc("save")}
                    </button>
                  </div>
                </form>
              )}

              {/* Members List */}
              {familyMembers.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-primary">{t("family.noMembers")}</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{t("family.noMembersSub")}</p>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {familyMembers.map((m) => (
                    <div key={m.id} className="rounded-2xl border border-border/60 bg-chip/20 p-5 flex flex-col justify-between hover:border-primary/40 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-full bg-primary/10 text-primary font-bold text-sm grid place-items-center">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-primary text-base">{m.name}</p>
                            <span className="inline-block rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                              {m.relation === "spouse" || m.relation === "child" || m.relation === "parent" || m.relation === "sibling" || m.relation === "other"
                                ? t(`family.relations.${m.relation}`)
                                : m.relation}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setMemberForm({
                                name: m.name,
                                relation: m.relation,
                                dob: m.dob ?? "",
                                gender: m.gender ?? "male",
                                blood_group: m.blood_group ?? "",
                                phone: m.phone ?? "",
                                notes: m.notes ?? "",
                              });
                              setEditingMemberId(m.id);
                              setIsAddingMember(false);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-chip transition-colors"
                            aria-label="Edit member"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(t("family.confirmDelete", { name: m.name }))) return;
                              const updated = familyMembers.filter(f => f.id !== m.id);
                              try {
                                const res = await fetch("/api/v1/patient/profile", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ family_members: updated }),
                                });
                                if (!res.ok) {
                                  toast.error(t("removeFailed"));
                                  return;
                                }
                                setFamilyMembers(updated);
                                toast.success(t("family.memberRemoved"));
                              } catch {
                                toast.error(tc("networkError"));
                              }
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            aria-label="Delete member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/40 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground font-bold tracking-widest block">DOB</span>
                          <span className="font-medium text-foreground/80">{dateLabel(m.dob, locale)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground font-bold tracking-widest block">BLOOD GROUP</span>
                          <span className="font-semibold text-primary">{bloodLabel(m.blood_group)}</span>
                        </div>
                        {m.phone && (
                          <div className="col-span-2 mt-1">
                            <span className="text-[10px] text-muted-foreground font-bold tracking-widest block">PHONE</span>
                            <span className="font-mono text-foreground/80">{m.phone}</span>
                          </div>
                        )}
                        {m.notes && (
                          <div className="col-span-2 mt-1 p-2 rounded-xl bg-chip/40 text-[11px] text-foreground/75">
                            <span className="font-semibold text-primary">Notes: </span>{m.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </PatientPortalLayout>
  );
};

export default Profile;
