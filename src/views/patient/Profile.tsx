"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User, HeartPulse, ShieldCheck, FolderOpen, Users, Plus, Trash2, Pencil, Save, X, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import type { Tables } from "@/lib/supabase/types";

type Patient = Tables<"patients">;
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

const labelFor = (options: { value: string; label: string }[], value: string | null) =>
  options.find(o => o.value === value)?.label ?? "—";

const dateLabel = (iso: string | null) => {
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

const ReadField = ({ label, value }: { label: string; value: string }) => (
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
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Patient>>({});
  const [saving, setSaving] = useState(false);

  const [adding, setAdding] = useState<HistoryKind | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newDetail, setNewDetail] = useState("");

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
      <div>
        <p className="text-[10px] tracking-widest font-bold text-muted-foreground">MY RECORD</p>
        <h1 className="font-display text-5xl text-primary mt-2">{profile?.full_name ?? "Profile"}</h1>
        {profile?.mrn && (
          <p className="text-sm text-muted-foreground mt-2">
            Patient ID <span className="font-mono text-primary">{profile.mrn}</span>
          </p>
        )}
      </div>

      <div className="mt-6 flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-chip text-primary hover:bg-chip/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground py-16 text-center">Loading your profile…</p>
        ) : failed ? (
          <p className="text-sm text-destructive py-16 text-center">
            Your profile couldn&apos;t be loaded. Reload the page to try again.
          </p>
        ) : !profile ? (
          <div className="rounded-3xl bg-card border border-border/60 p-10 shadow-soft text-center">
            <User className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="font-display text-2xl text-primary">No record yet</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Your record is created the first time you book an appointment. Once you have,
              your details will appear here for you to keep up to date.
            </p>
          </div>
        ) : tab === "General" ? (
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

                <div className="md:col-span-2 border-t border-border/50 pt-4 mt-2">
                  <p className="text-[10px] tracking-widest font-bold text-primary-glow">EMERGENCY CONTACT</p>
                </div>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">NAME</span>
                  <input className={inputClass} value={draft.emergency_contact_name ?? ""} onChange={e => upd({ emergency_contact_name: e.target.value })} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">RELATIONSHIP</span>
                  <input className={inputClass} placeholder="Brother, spouse…" value={draft.emergency_contact_relation ?? ""} onChange={e => upd({ emergency_contact_relation: e.target.value })} /></label>
                <label className="space-y-1.5"><span className="text-[10px] tracking-widest font-bold text-muted-foreground">PHONE</span>
                  <input className={inputClass} value={draft.emergency_contact_phone ?? ""} onChange={e => upd({ emergency_contact_phone: e.target.value })} /></label>
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
                <div className="md:col-span-3 border-t border-border/50 pt-5 grid md:grid-cols-3 gap-5">
                  <ReadField label="EMERGENCY CONTACT" value={profile.emergency_contact_name ?? ""} />
                  <ReadField label="RELATIONSHIP" value={profile.emergency_contact_relation ?? ""} />
                  <ReadField label="THEIR PHONE" value={profile.emergency_contact_phone ?? ""} />
                </div>
              </div>
            )}
          </motion.div>
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
