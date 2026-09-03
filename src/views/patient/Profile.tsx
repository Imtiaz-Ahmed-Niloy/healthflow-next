"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  User, UserSquare2, HeartPulse, ShieldCheck, FolderOpen, Users, Plus, Trash2, Pencil, Save, X, Lock,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { mediaUrl, MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/media";
import { IdentityDocumentField, type IdentityDoc } from "@/components/patient/IdentityDocumentField";
import type { Tables } from "@/lib/supabase/types";

/**
 * What the page edits: the name and contact from `profiles`, plus everything
 * else from `patient_profiles`. One flat object, assembled by the route —
 * see /api/v1/patient/profile.
 */
type Patient = Pick<Tables<"profiles">, "full_name" | "email" | "phone" | "avatar_url">
  & Partial<Omit<Tables<"patient_profiles">, "profile_id" | "created_at" | "updated_at">>;

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

type Tab = "General" | "Clinical" | "Insurance" | "Documents" | "Family";
const TABS: Tab[] = ["General", "Clinical", "Insurance", "Documents", "Family"];

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

const MARITAL = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

const BLOOD_GROUPS = [
  { value: "o_positive", label: "O+" }, { value: "o_negative", label: "O−" },
  { value: "a_positive", label: "A+" }, { value: "a_negative", label: "A−" },
  { value: "b_positive", label: "B+" }, { value: "b_negative", label: "B−" },
  { value: "ab_positive", label: "AB+" }, { value: "ab_negative", label: "AB−" },
];

const LISTS: { kind: HistoryKind; title: string; blurb: string; placeholder: string }[] = [
  { kind: "allergy", title: "Allergies", blurb: "Anything you react to — drugs, food, materials.", placeholder: "Penicillin" },
  { kind: "illness", title: "Ongoing Conditions", blurb: "Long-term conditions you are managing.", placeholder: "Type 2 Diabetes" },
  { kind: "medication", title: "Current Medication", blurb: "What you take regularly, including over the counter.", placeholder: "Metformin 500mg" },
  { kind: "procedure", title: "Past Procedures", blurb: "Operations and procedures you have had.", placeholder: "Appendectomy" },
];

const labelFor = (options: { value: string; label: string }[], value: string | null | undefined) =>
  options.find(o => o.value === value)?.label ?? "—";

const dateLabel = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
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
const NotYet = ({ icon: Icon, title, reason }: { icon: typeof User; title: string; reason: string }) => (
  <div className="rounded-3xl bg-card border border-border/60 p-10 shadow-soft text-center">
    <div className="h-12 w-12 rounded-2xl bg-chip grid place-items-center text-primary mx-auto">
      <Icon className="h-5 w-5" />
    </div>
    <h2 className="font-display text-2xl text-primary mt-4">{title}</h2>
    <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{reason}</p>
    <p className="text-[10px] tracking-widest font-bold text-muted-foreground mt-5 inline-flex items-center gap-1.5">
      <Lock className="h-3 w-3" /> NOT AVAILABLE YET
    </p>
  </div>
);

const Profile = () => {
  const [tab, setTab] = useState<Tab>("General");
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
        toast.error(body?.error?.message || "Couldn't load your profile.");
        return;
      }
      setProfile(body.data.profile);
      setHospitals(body.data.hospitals ?? []);
      void loadIdDocs();
      setHistory(body.data.history ?? []);
    } catch {
      setFailed(true);
      toast.error("Couldn't reach the server.");
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
        toast.error(body?.error?.message || "Couldn't save your emergency contact.");
        return;
      }
      setProfile(body.data);
      setEditingEc(false);
      toast.success("Emergency contact saved");
    } catch {
      toast.error("Couldn't reach the server.");
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
      toast.error("That is not an image we take — PNG, JPG, WebP, AVIF or SVG.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`That image is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is 5MB.`);
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
      if (!permission.ok) throw new Error(body?.error?.message || "Could not start the upload.");

      const { key, uploadUrl } = body.data;
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("Cloudflare refused the upload.");

      const saved = await fetch("/api/v1/patient/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: key }),
      });
      const savedBody = await saved.json().catch(() => null);
      if (!saved.ok) throw new Error(savedBody?.error?.message || "Could not save that picture.");

      setProfile(savedBody.data);
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload that picture.");
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
        toast.error(body?.error?.message || "Couldn't save your details.");
        return;
      }
      setProfile(body.data);
      setEditing(false);
      toast.success("Profile updated");
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const addEntry = async (kind: HistoryKind) => {
    if (!newLabel.trim()) { toast.error("Give it a name first"); return; }
    try {
      const res = await fetch("/api/v1/patient/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, label: newLabel.trim(), detail: newDetail.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Couldn't add that.");
        return;
      }
      setHistory(h => [body.data, ...h]);
      setNewLabel(""); setNewDetail(""); setAdding(null);
      toast.success("Added");
    } catch {
      toast.error("Couldn't reach the server.");
    }
  };

  const removeEntry = async (entry: HistoryEntry) => {
    try {
      const res = await fetch(`/api/v1/patient/profile?id=${entry.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message || "Couldn't remove that.");
        return;
      }
      setHistory(h => h.filter(e => e.id !== entry.id));
      toast.success("Removed");
    } catch {
      toast.error("Couldn't reach the server.");
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
              alt={profile?.full_name ?? "Profile picture"}
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
            aria-label="Change profile picture"
            className="absolute bottom-2 right-2 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow hover:opacity-90 transition disabled:opacity-60"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-w-[260px]">
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">MY RECORD</p>
          <h1 className="font-display text-5xl text-primary mt-2 flex items-center gap-2">
            {profile?.full_name ?? "Profile"}
            {/* Icon only, no label — it means the same thing everywhere and a
                word beside it would only take up room. */}
            {idDocs.some(d => d.holder === "self" && d.status === "verified") && (
              <BadgeCheck className="h-7 w-7 text-primary-glow shrink-0" aria-label="Identity verified" />
            )}
          </h1>
          {hospitals.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Registered at{" "}
              {hospitals.map((h, i) => (
                <span key={h.id}>
                  {i > 0 && ", "}
                  {h.tenants?.name ?? "a hospital"}
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
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className="relative px-5 py-2.5 text-sm font-semibold rounded-full">
              {tab === t && (
                <motion.div
                  layoutId="patient-profile-tab"
                  className="absolute inset-0 bg-card shadow-soft rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className={`relative ${tab === t ? "text-primary" : "text-muted-foreground"}`}>{t}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 max-w-6xl mx-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground py-16 text-center">Loading your profile…</p>
        ) : failed ? (
          <p className="text-sm text-destructive py-16 text-center">
            Your profile couldn&apos;t be loaded. Reload the page to try again.
          </p>
        ) : !profile ? (
          <p className="text-sm text-muted-foreground py-16 text-center">Loading your profile…</p>
        ) : tab === "General" ? (
          <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
            <SectionHead
              icon={User}
              title="Personal Details"
              action={editing ? (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} disabled={saving}
                    className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary inline-flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                  <button onClick={save} disabled={saving}
                    className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold shadow-glow inline-flex items-center gap-1.5 disabled:opacity-60">
                    <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              ) : (
                <button onClick={startEdit}
                  className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:bg-chip">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            />

            {editing ? (
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">FULL NAME</span>
                  <input className={inputClass} value={draft.full_name ?? ""} onChange={e => upd({ full_name: e.target.value })} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">DATE OF BIRTH</span>
                  <input type="date" className={inputClass} value={draft.date_of_birth ?? ""} onChange={e => upd({ date_of_birth: e.target.value })} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">GENDER</span>
                  <select className={inputClass} value={draft.gender ?? ""} onChange={e => upd({ gender: (e.target.value || null) as Patient["gender"] })}>
                    <option value="">—</option>
                    {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">MARITAL STATUS</span>
                  <select className={inputClass} value={draft.marital_status ?? ""} onChange={e => upd({ marital_status: (e.target.value || null) as Patient["marital_status"] })}>
                    <option value="">—</option>
                    {MARITAL.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">NID / PASSPORT</span>
                  <input className={inputClass} value={draft.national_id ?? ""} onChange={e => upd({ national_id: e.target.value })} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">EMAIL</span>
                  <input type="email" className={inputClass} value={draft.email ?? ""} onChange={e => upd({ email: e.target.value })} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">PHONE</span>
                  <input className={inputClass} value={draft.phone ?? ""} onChange={e => upd({ phone: e.target.value })} /></label>
                <label className="space-y-1.5 md:col-span-2"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">ADDRESS</span>
                  <input className={inputClass} value={draft.address ?? ""} onChange={e => upd({ address: e.target.value })} /></label>
              </div>
            ) : (
              <div className="mt-6 grid md:grid-cols-3 gap-5">
                <ReadField label="FULL NAME" value={profile.full_name} />
                <ReadField label="DATE OF BIRTH" value={dateLabel(profile.date_of_birth)} />
                <ReadField label="GENDER" value={labelFor(GENDERS, profile.gender)} />
                <ReadField label="MARITAL STATUS" value={labelFor(MARITAL, profile.marital_status)} />
                <ReadField label="NID / PASSPORT" value={profile.national_id ?? ""} />
                <ReadField label="EMAIL" value={profile.email ?? ""} />
                <ReadField label="PHONE" value={profile.phone ?? ""} />
                <div className="md:col-span-2"><ReadField label="ADDRESS" value={profile.address ?? ""} /></div>
              </div>
            )}

            <IdentityDocumentField
              holder="self"
              docs={idDocs}
              onChanged={loadIdDocs}
              title="IDENTITY DOCUMENT"
              note="Upload one legal document and we will check it. Once verified, a badge appears beside your name — and if you are ever brought in unable to speak for yourself, the hospital can be told who you are."
            />
          </motion.div>

          {/* Its own card, as it was before: the person to call is not another
              line of your address, and it gets edited on its own. */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
            <SectionHead
              icon={UserSquare2}
              title="Emergency Contact"
              action={editingEc ? (
                <div className="flex gap-2">
                  <button onClick={() => setEditingEc(false)} disabled={savingEc}
                    className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary inline-flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                  <button onClick={saveEc} disabled={savingEc}
                    className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold shadow-glow inline-flex items-center gap-1.5 disabled:opacity-60">
                    <Save className="h-3.5 w-3.5" /> {savingEc ? "Saving…" : "Save"}
                  </button>
                </div>
              ) : (
                <button onClick={startEditEc}
                  className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:bg-chip">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            />

            {editingEc ? (
              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">NAME</span>
                  <input className={inputClass} value={ecDraft.emergency_contact_name ?? ""}
                    onChange={e => setEcDraft(d => ({ ...d, emergency_contact_name: e.target.value }))} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">RELATIONSHIP</span>
                  <input className={inputClass} placeholder="Brother, spouse…" value={ecDraft.emergency_contact_relation ?? ""}
                    onChange={e => setEcDraft(d => ({ ...d, emergency_contact_relation: e.target.value }))} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">PHONE</span>
                  <input className={inputClass} value={ecDraft.emergency_contact_phone ?? ""}
                    onChange={e => setEcDraft(d => ({ ...d, emergency_contact_phone: e.target.value }))} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">EMAIL</span>
                  <input className={inputClass} type="email" placeholder="Where to write if a call does not connect"
                    value={ecDraft.emergency_contact_email ?? ""}
                    onChange={e => setEcDraft(d => ({ ...d, emergency_contact_email: e.target.value }))} /></label>
                <label className="space-y-1.5 md:col-span-2"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">ADDRESS</span>
                  <input className={inputClass} placeholder="Where that person can be found"
                    value={ecDraft.emergency_contact_address ?? ""}
                    onChange={e => setEcDraft(d => ({ ...d, emergency_contact_address: e.target.value }))} /></label>
              </div>
            ) : profile.emergency_contact_name || profile.emergency_contact_phone ? (
              <div className="mt-6 grid md:grid-cols-3 gap-5">
                <ReadField label="NAME" value={profile.emergency_contact_name ?? ""} />
                <ReadField label="RELATIONSHIP" value={profile.emergency_contact_relation ?? ""} />
                <ReadField label="PHONE" value={profile.emergency_contact_phone ?? ""} />
                <ReadField label="EMAIL" value={profile.emergency_contact_email ?? ""} />
                <ReadField label="ADDRESS" value={profile.emergency_contact_address ?? ""} />
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                Nobody listed yet. Add the person a hospital should call if you cannot answer for yourself.
              </p>
            )}

            <IdentityDocumentField
              holder="emergency_contact"
              docs={idDocs}
              onChanged={loadIdDocs}
            />
          </motion.div>
          </div>
        ) : tab === "Clinical" ? (
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
              <SectionHead
                icon={HeartPulse}
                title="Vitals"
                action={!editing && (
                  <button onClick={startEdit}
                    className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:bg-chip">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
              />
              {editing ? (
                <div className="mt-6 grid md:grid-cols-4 gap-4 items-end">
                  <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">BLOOD GROUP</span>
                    <select className={inputClass} value={draft.blood_group ?? ""} onChange={e => upd({ blood_group: (e.target.value || null) as Patient["blood_group"] })}>
                      <option value="">—</option>
                      {BLOOD_GROUPS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select></label>
                  <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">HEIGHT (FT)</span>
                    <input type="number" min={0} max={9} className={inputClass} value={draft.height_feet ?? ""} onChange={e => upd({ height_feet: e.target.value === "" ? null : Number(e.target.value) })} /></label>
                  <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">HEIGHT (IN)</span>
                    <input type="number" min={0} max={11} className={inputClass} value={draft.height_inches ?? ""} onChange={e => upd({ height_inches: e.target.value === "" ? null : Number(e.target.value) })} /></label>
                  <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">WEIGHT (KG)</span>
                    <input type="number" min={0} step="0.1" className={inputClass} value={draft.weight_kg ?? ""} onChange={e => upd({ weight_kg: e.target.value === "" ? null : Number(e.target.value) })} /></label>
                  <div className="md:col-span-4 flex gap-2">
                    <button onClick={() => setEditing(false)} disabled={saving}
                      className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary">Cancel</button>
                    <button onClick={save} disabled={saving}
                      className="rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold shadow-glow disabled:opacity-60">
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 grid md:grid-cols-3 gap-5">
                  <ReadField label="BLOOD GROUP" value={labelFor(BLOOD_GROUPS, profile.blood_group)} />
                  <ReadField label="HEIGHT" value={height} />
                  <ReadField label="WEIGHT" value={profile.weight_kg != null ? `${profile.weight_kg} kg` : ""} />
                </div>
              )}
            </motion.div>

            {LISTS.map(list => {
              const entries = history.filter(h => h.kind === list.kind);
              return (
                <motion.div key={list.kind} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
                  <SectionHead
                    icon={HeartPulse}
                    title={list.title}
                    action={
                      <button onClick={() => { setAdding(adding === list.kind ? null : list.kind); setNewLabel(""); setNewDetail(""); }}
                        className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:bg-chip">
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-2">{list.blurb}</p>

                  {adding === list.kind && (
                    <div className="mt-4 grid md:grid-cols-[1fr_1fr_auto] gap-2">
                      <input className={inputClass} placeholder={list.placeholder} value={newLabel} onChange={e => setNewLabel(e.target.value)} />
                      <input className={inputClass} placeholder="Detail (optional)" value={newDetail} onChange={e => setNewDetail(e.target.value)} />
                      <button onClick={() => addEntry(list.kind)}
                        className="rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2.5 text-xs font-semibold shadow-glow">
                        Add
                      </button>
                    </div>
                  )}

                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Nothing recorded.</p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {entries.map(e => (
                        <div key={e.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-chip/30">
                          <div className="min-w-0">
                            <p className="font-semibold text-primary">{e.label}</p>
                            {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                          </div>
                          <button onClick={() => removeEntry(e)} aria-label={`Remove ${e.label}`}
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
        ) : tab === "Insurance" ? (
          <NotYet
            icon={ShieldCheck}
            title="Insurance"
            reason="This tab showed a plan that did not exist. Recording a real one needs a decision first: whether a patient has one insurer or a history of them, since people change provider. Until that is settled, nothing here would be true."
          />
        ) : tab === "Documents" ? (
          <NotYet
            icon={FolderOpen}
            title="Documents"
            reason="Uploading and storing files is not built yet — the same blocker as staff documents. This tab used to list files that were never there."
          />
        ) : (
          <NotYet
            icon={Users}
            title="Family Management"
            reason="Linking family members needs more than a list: a rule about who may see whose medical record, and a way to consent to it. That is being designed separately rather than guessed at here."
          />
        )}
      </div>
    </PatientPortalLayout>
  );
};

export default Profile;
