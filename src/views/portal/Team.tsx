"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Clock, Copy, KeyRound, Loader2, Mail, Pencil, Phone, Plus, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Btn, Pill } from "@/components/admin/ui";
import { ConfirmDialog, Field, Input, Modal, Select as NativeSelect, TextArea } from "@/components/admin/crud";
import { Avatar } from "@/components/common/Avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ROLE_SEES_PHONES, TEAM_ROLES, TEAM_STATUSES, type TeamMember, type TeamRole, type TeamStatus,
} from "@/lib/doctorTeam";

/**
 * /portal/team — the doctor's team (0147). Members the doctor adds are theirs
 * to edit, remove and give a login (the key, as on a hospital's doctor list);
 * the assistants their hospitals assign them show alongside, read-only.
 */

const STATUS_TONE: Record<string, "ok" | "warn" | "bad"> = {
  active: "ok",
  on_leave: "warn",
  suspended: "bad",
};

const ALL = "all";

type Place = { id: string; name: string };

type Draft = {
  role: TeamRole;
  name: string;
  phone: string;
  email: string;
  place_tenant_id: string;
  status: TeamStatus;
  notes: string;
};

const emptyDraft = (): Draft => ({
  role: "assistant", name: "", phone: "", email: "", place_tenant_id: "", status: "active", notes: "",
});

const draftOf = (m: TeamMember): Draft => ({
  role: m.role,
  name: m.name,
  phone: m.phone ?? "",
  email: m.email ?? "",
  place_tenant_id: m.place?.id ?? "",
  status: (TEAM_STATUSES as readonly string[]).includes(m.status) ? (m.status as TeamStatus) : "active",
  notes: m.notes ?? "",
});

const errorOf = async (res: Response) => (await res.json().catch(() => null))?.error as { message?: string; code?: string } | undefined;

const Team = () => {
  const t = useTranslations("portal.team");
  const tc = useTranslations("common");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<TeamRole | typeof ALL>(ALL);
  const [place, setPlace] = useState(ALL);

  // The member being edited, or "new".
  const [editing, setEditing] = useState<TeamMember | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<TeamMember | null>(null);

  // Logins.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingLogin, setPendingLogin] = useState<TeamMember | null>(null);
  const [pendingReset, setPendingReset] = useState<TeamMember | null>(null);
  const [creds, setCreds] = useState<{ name: string; email: string; password: string } | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/v1/portal/team");
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(body?.error?.message || t("loadFailed")); return; }
      setMembers(body.data ?? []);
      setPlaces(body.places ?? []);
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // The roles actually on the team, in a fixed order — a tab per role.
  const roles = useMemo(() => TEAM_ROLES.filter(r => members.some(m => m.role === r)), [members]);

  // A member with no place works with the doctor everywhere, so shows under every place.
  const inPlace = place === ALL ? members : members.filter(m => !m.place || m.place.id === place);
  const shown = role === ALL ? inPlace : inPlace.filter(m => m.role === role);

  const open = (m: TeamMember | "new") => {
    setDraft(m === "new" ? emptyDraft() : draftOf(m));
    setEditing(m);
  };

  const save = async () => {
    if (!editing) return;
    if (!draft.name.trim()) { toast.error(t("needsName")); return; }
    setSaving(true);
    try {
      const adding = editing === "new";
      const res = await fetch("/api/v1/portal/team", {
        method: adding ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, ...(adding ? {} : { id: editing.id }) }),
      });
      if (!res.ok) { toast.error(t("saveFailed"), { description: (await errorOf(res))?.message }); return; }
      toast.success(adding ? t("added", { name: draft.name.trim() }) : t("saved"));
      setEditing(null);
      void load();
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: TeamMember) => {
    setBusyId(m.id);
    try {
      const res = await fetch(`/api/v1/portal/team?id=${m.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(t("removeFailed"), { description: body?.error?.message }); return; }
      toast.success(t("removed", { name: m.name }), body?.warning ? { description: body.warning.message } : undefined);
      void load();
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setBusyId(null);
    }
  };

  /** One call to the login route; `method` picks create, view or reset. */
  const login = async (m: TeamMember, method: "POST" | "GET" | "PUT") => {
    setBusyId(m.id);
    try {
      const res = await fetch(`/api/v1/portal/team/${m.id}/login`, { method });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        // A login with no password we can show: offer to replace it.
        if (method === "GET" && body?.error?.code === "no_saved_password") { setPendingReset(m); return; }
        const title = method === "POST" ? t("login.createFailed") : method === "PUT" ? t("login.resetFailed") : t("login.loadFailed");
        toast.error(title, { description: body?.error?.message });
        return;
      }
      setCreds({ name: m.name, ...body.data });
      if (method === "POST") { toast.success(t("login.created")); void load(); }
      if (method === "PUT") toast.success(t("login.resetDone"));
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setBusyId(null);
    }
  };

  const onKey = (m: TeamMember) => {
    if (m.has_login) { void login(m, "GET"); return; }
    if (!m.email) { toast.error(t("login.needsEmail", { name: m.name })); open(m); return; }
    setPendingLogin(m);
  };

  const copy = (value: string, label: string) => {
    void navigator.clipboard.writeText(value);
    toast.success(t("login.copied", { label }));
  };

  const tab = (value: TeamRole | typeof ALL, label: string, count: number) => (
    <button
      key={value}
      type="button"
      onClick={() => setRole(value)}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${role === value ? "bg-primary text-primary-foreground shadow-soft" : "bg-card border border-border text-foreground/70 hover:bg-chip"}`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-[11px] ${role === value ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span>
    </button>
  );

  const editingMember = editing && editing !== "new" ? editing : null;

  return (
    <PortalLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-primary">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Btn onClick={() => open("new")}><Plus className="h-4 w-4" /> {t("add")}</Btn>
      </div>

      {!loading && members.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tab(ALL, t("everyone"), inPlace.length)}
            {roles.map(r => tab(r, t(`roles.${r}.many`), inPlace.filter(m => m.role === r).length))}
          </div>
          {places.length > 1 && (
            <Select value={place} onValueChange={setPlace}>
              <SelectTrigger className="h-10 w-auto min-w-56 gap-2 rounded-full bg-card" aria-label={t("placeLabel")}>
                <div className="flex min-w-0 items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate"><SelectValue /></span>
                </div>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL}>{t("allPlaces")}</SelectItem>
                {places.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
          {members.length > 0 && shown.length === 0 && (
            <p className="mb-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{t("noneHere")}.</span> {t("noneHereBody")}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((m, i) => {
              const tone = STATUS_TONE[m.status] ?? "default";
              const own = m.source === "team";
              return (
                <motion.div
                  key={`${m.source}-${m.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04 }}
                  className="flex flex-col rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <Avatar src={null} name={m.name} className="h-12 w-12" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{m.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Pill tone="info">{t(`roles.${m.role}.one`)}</Pill>
                        <Pill tone={tone}>{STATUS_TONE[m.status] ? t(`statuses.${m.status as TeamStatus}`) : m.status}</Pill>
                        {m.has_login && <Pill><KeyRound className="h-3 w-3 mr-1" />{t("login.hasLogin")}</Pill>}
                      </div>
                    </div>
                    {own && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button type="button" onClick={() => onKey(m)} disabled={busyId === m.id}
                          title={m.has_login ? t("login.view") : t("login.create")} aria-label={m.has_login ? t("login.view") : t("login.create")}
                          className="rounded-lg p-1.5 text-foreground/70 hover:bg-muted disabled:opacity-50">
                          {busyId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        </button>
                        <button type="button" onClick={() => open(m)} title={t("edit")} aria-label={t("edit")}
                          className="rounded-lg p-1.5 text-foreground/70 hover:bg-muted">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setRemoving(m)} disabled={busyId === m.id} title={t("remove")} aria-label={t("remove")}
                          className="rounded-lg p-1.5 text-destructive/80 hover:bg-destructive/10 disabled:opacity-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {own ? (m.place?.name ?? t("fields.allMyPlaces")) : t("fromHospital", { place: m.place?.name ?? "" })}
                      </span>
                    </p>
                    {m.shift && <p className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0" />{t("shift", { shift: m.shift })}</p>}
                    {own && m.has_login && (
                      <p className="text-xs">{ROLE_SEES_PHONES[m.role] ? t("access.withPhones") : t("access.withoutPhones")}</p>
                    )}
                  </div>

                  <div className="mt-auto flex gap-2 pt-4">
                    {m.phone ? (
                      <a href={`tel:${m.phone}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border py-2 text-sm font-semibold text-foreground hover:bg-chip">
                        <Phone className="h-4 w-4" /> {m.phone}
                      </a>
                    ) : (
                      <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-dashed border-border py-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" /> {t("noPhone")}
                      </span>
                    )}
                    {m.email && (
                      <a href={`mailto:${m.email}`} title={m.email} aria-label={t("emailMember", { name: m.name })} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground hover:bg-chip">
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Adding sits in the grid as a card of its own, like My Chambers' add card. */}
            <motion.button type="button" onClick={() => open("new")}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(shown.length, 8) * 0.04 }}
              className="rounded-2xl bg-card border border-dashed border-border p-4 shadow-soft text-center flex flex-col items-center justify-center transition-colors hover:border-primary/40 hover:bg-accent/10">
              <span className="h-10 w-10 rounded-full bg-chip flex items-center justify-center text-primary">
                <UsersRound className="h-4 w-4" />
              </span>
              <span className="font-display text-lg text-primary mt-3">{t("addCardTitle")}</span>
              <span className="text-xs text-muted-foreground mt-1 max-w-xs">{t("addCardBody")}</span>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                <Plus className="h-4 w-4" /> {t("add")}
              </span>
            </motion.button>
          </div>
          </>
        )}
      </div>

      <Modal open={!!editing} onClose={() => !saving && setEditing(null)}
        title={editingMember ? t("editTitle", { name: editingMember.name }) : t("add")}
        footer={<>
          <Btn variant="outline" onClick={() => setEditing(null)} disabled={saving}>{tc("cancel")}</Btn>
          <Btn onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing === "new" ? t("add") : tc("save")}
          </Btn>
        </>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.role")} required>
            <NativeSelect value={draft.role} onChange={e => setDraft(d => ({ ...d, role: e.target.value as TeamRole }))}>
              {TEAM_ROLES.map(r => <option key={r} value={r}>{t(`roles.${r}.one`)}</option>)}
            </NativeSelect>
          </Field>
          <Field label={t("fields.name")} required>
            <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          </Field>
          <Field label={t("fields.phone")}>
            <Input type="tel" value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} />
          </Field>
          <Field label={t("fields.email")} hint={editingMember?.has_login ? t("fields.emailLocked") : t("fields.emailHint")}>
            <Input type="email" value={draft.email} disabled={!!editingMember?.has_login}
              onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} />
          </Field>
          <Field label={t("fields.place")}>
            <NativeSelect value={draft.place_tenant_id} onChange={e => setDraft(d => ({ ...d, place_tenant_id: e.target.value }))}>
              <option value="">{t("fields.allMyPlaces")}</option>
              {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label={t("fields.status")}>
            <NativeSelect value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value as TeamStatus }))}>
              {TEAM_STATUSES.map(s => <option key={s} value={s}>{t(`statuses.${s}`)}</option>)}
            </NativeSelect>
          </Field>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground -mt-1 mb-3">
              {ROLE_SEES_PHONES[draft.role] ? t("access.withPhones") : t("access.withoutPhones")}
            </p>
            <Field label={t("fields.notes")}>
              <TextArea value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && void remove(removing)}
        title={removing ? t("removeTitle", { name: removing.name }) : ""}
        description={t("removeBody")}
      />

      <ConfirmDialog
        open={!!pendingLogin}
        onClose={() => setPendingLogin(null)}
        onConfirm={() => pendingLogin && void login(pendingLogin, "POST")}
        title={pendingLogin ? t("login.createTitle", { name: pendingLogin.name }) : ""}
        description={pendingLogin ? t("login.createBody", { email: pendingLogin.email ?? "" }) : undefined}
      />

      <ConfirmDialog
        open={!!pendingReset}
        onClose={() => setPendingReset(null)}
        onConfirm={() => pendingReset && void login(pendingReset, "PUT")}
        title={pendingReset ? t("login.resetTitle", { name: pendingReset.name }) : ""}
        description={t("login.resetBody")}
      />

      <Modal open={!!creds} onClose={() => setCreds(null)} title={t("login.modalTitle")}
        footer={<Btn onClick={() => setCreds(null)}>{t("login.done")}</Btn>}>
        {creds && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
              <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                {t.rich("login.intro", {
                  name: creds.name,
                  b: chunks => <span className="font-semibold text-primary">{chunks}</span>,
                })}
              </p>
            </div>
            {[
              { label: t("login.email"), value: creds.email },
              { label: t("login.password"), value: creds.password },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">{label}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted/40 rounded-lg px-3 py-2 text-sm font-mono break-all">{value}</code>
                  <button type="button" onClick={() => copy(value, label)}
                    className="p-2 rounded-lg border border-border hover:bg-muted" title={t("login.copy", { label })}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
};

export default Team;
