"use client";

import { useMemo, useState } from "react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Btn, Pill } from "@/components/admin/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, ShieldCheck, Plus, Pencil, Trash2, Lock, AlertCircle, Loader2 } from "lucide-react";
import { PANELS } from "@/data/rolePages";
import { rolesApi, type RoleRow, type RoleWrite } from "@/redux/api/resources";
import { useGetRoleStatsQuery } from "@/redux/api/superApi";

/**
 * Roles and their page access, from `public.roles`.
 *
 * Two kinds of row (see 0009_roles_management.sql):
 *
 *   system   `role` is an app_role enum value. Seeded, undeletable, and the
 *            only kind a user can hold. Its page grants are editable.
 *   custom   `role` is null. A saved template that nothing can be assigned to
 *            until the enum grows — labelled as such rather than left to look
 *            like a working role.
 *
 * User counts come from /api/v1/super/role-stats and are read-only. The screen
 * used to let you type one in, which could only ever disagree with the number
 * of profiles actually pointing at the role.
 */

type Scope = "Platform" | "Tenant" | "Clinical" | "Self";
const SCOPES: Scope[] = ["Platform", "Tenant", "Clinical", "Self"];

const ALL_PATHS = new Set(PANELS.flatMap((panel) => panel.pages.map((page) => page.path)));

const scopeTone = (scope: string) =>
  scope === "Platform" ? "bad" : scope === "Clinical" ? "ok" : scope === "Self" ? "default" : "info";

const Roles = () => {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data, isLoading, error } = rolesApi.useList({ limit: 100 });
  const { data: stats, isLoading: statsLoading } = useGetRoleStatsQuery();
  const [removeRole] = rolesApi.useRemove();

  const roles = useMemo(() => data?.data ?? [], [data]);
  const counts = stats?.data;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return roles;
    return roles.filter(
      (role) =>
        role.label.toLowerCase().includes(needle) ||
        (role.description ?? "").toLowerCase().includes(needle) ||
        (role.role ?? "").toLowerCase().includes(needle),
    );
  }, [roles, query]);

  /**
   * A blank row for the editor. It is not saved until the dialog is, so the id
   * is a placeholder the editor uses to tell "new" from "existing".
   */
  const blankRole = (): RoleRow => ({
    id: "",
    role: null,
    label: "",
    description: null,
    scope: "Tenant",
    pages: [],
    permissions: {},
    is_system: false,
    created_at: "",
    updated_at: "",
  });

  const remove = async (role: RoleRow) => {
    setPendingDelete(role.id);
    try {
      await removeRole(role.id).unwrap();
      toast.success(`${role.label} removed`);
    } catch {
      toast.error("Could not remove role", { description: "Please try again." });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <SuperLayout title="User Role Management" subtitle="Assign panel pages to each role">
      <Card className="p-5">
        <SectionTitle
          title="Roles & Permissions"
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search roles"
                  aria-label="Search roles"
                  className="pl-9 w-56"
                />
              </div>
              <Btn onClick={() => setEditing(blankRole())}>
                <Plus className="h-4 w-4" /> New Role
              </Btn>
            </div>
          }
        />

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-muted/40 p-4 h-[74px] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-xl bg-destructive/10 text-destructive p-4">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">Could not load roles. Refresh to try again.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            {query ? `No roles match “${query}”.` : "No roles yet."}
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {filtered.map((role) => {
              /**
               * Three distinct states, and collapsing any two of them lies:
               * a custom role can hold nobody, a count that has not arrived
               * is unknown, and a real 0 means the role exists but is unused.
               */
              const userLabel = !role.role
                ? "Not assignable yet"
                : counts
                  ? `${counts[role.role].toLocaleString()} users`
                  : statsLoading
                    ? "Counting…"
                    : "User count unavailable";

              return (
                <div key={role.id} className="rounded-xl bg-muted/40 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-primary truncate flex items-center gap-1.5">
                      {role.label}
                      {role.is_system && (
                        <Lock className="h-3 w-3 text-muted-foreground shrink-0" aria-label="System role" />
                      )}
                    </p>
                    {role.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{role.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {userLabel} · {role.pages.length} pages
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Pill tone={scopeTone(role.scope)}>{role.scope}</Pill>
                    <Btn variant="ghost" onClick={() => setEditing(role)}>
                      <Pencil className="h-4 w-4" /> Configure
                    </Btn>
                    <button
                      onClick={() => void remove(role)}
                      disabled={role.is_system || pendingDelete === role.id}
                      title={
                        role.is_system
                          ? "System roles are part of the auth layer and cannot be deleted"
                          : "Delete role"
                      }
                      aria-label={`Delete ${role.label}`}
                      className="p-2 rounded-full text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      {pendingDelete === role.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {editing && (
        <RoleEditor
          role={editing}
          users={
            !editing.role
              ? null
              : counts
                ? counts[editing.role].toLocaleString()
                : null
          }
          onClose={() => setEditing(null)}
        />
      )}
    </SuperLayout>
  );
};

const RoleEditor = ({
  role,
  users,
  onClose,
}: {
  role: RoleRow;
  /** Formatted count, or null when the role cannot be held by anyone. */
  users: string | null;
  onClose: () => void;
}) => {
  const isNew = role.id === "";
  const [draft, setDraft] = useState(role);
  const [saving, setSaving] = useState(false);

  const [createRole] = rolesApi.useCreate();
  const [updateRole] = rolesApi.useUpdate();

  const togglePage = (path: string) =>
    setDraft((d) => ({
      ...d,
      pages: d.pages.includes(path) ? d.pages.filter((p) => p !== path) : [...d.pages, path],
    }));

  const togglePanel = (panelKey: string, on: boolean) => {
    const panel = PANELS.find((p) => p.key === panelKey);
    if (!panel) return;
    const panelPaths = panel.pages.map((p) => p.path);
    setDraft((d) => ({
      ...d,
      pages: on
        ? Array.from(new Set([...d.pages, ...panelPaths]))
        : d.pages.filter((p) => !panelPaths.includes(p)),
    }));
  };

  /**
   * Grants for pages that no longer exist in the catalogue. Kept rather than
   * silently dropped — a path usually disappears because a release renamed it,
   * and quietly discarding the grant would revoke access nobody asked to
   * revoke. Surfaced so it can be cleared on purpose.
   */
  const orphanedPages = draft.pages.filter((path) => !ALL_PATHS.has(path));

  const save = async () => {
    const label = draft.label.trim();
    if (!label) {
      toast.error("Role name is required");
      return;
    }

    // The server rejects these too; catching them here keeps the dialog open
    // with the text still in it.
    const body: RoleWrite = {
      label,
      // null, not undefined — PATCH drops undefined keys, so an emptied
      // description would otherwise never clear.
      description: draft.description?.trim() || null,
      scope: draft.scope as RoleWrite["scope"],
      pages: draft.pages,
    };

    setSaving(true);
    try {
      if (isNew) await createRole(body).unwrap();
      else await updateRole(draft.id, body).unwrap();
      toast.success(`${label} saved`);
      onClose();
    } catch (cause) {
      const message =
        (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ??
        "Please try again.";
      toast.error("Could not save role", { description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {isNew ? "New Role" : "Configure Role"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-3 gap-4 mt-2">
          <div>
            <Label htmlFor="role-name">Role name</Label>
            <Input
              id="role-name"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="e.g. Ward Manager"
            />
          </div>
          <div>
            <Label htmlFor="role-scope">Scope</Label>
            <Select
              value={draft.scope}
              onValueChange={(v) => setDraft({ ...draft, scope: v })}
            >
              <SelectTrigger id="role-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Users</Label>
            {/* Read-only: this is however many profiles point at the role. */}
            <p className="h-9 flex items-center text-sm font-semibold text-primary">
              {users ?? (
                <span className="text-muted-foreground font-normal">
                  {role.role ? "Unavailable" : "Not assignable yet"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="role-description">Description</Label>
          <Input
            id="role-description"
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="What this role is for"
          />
        </div>

        {draft.is_system && (
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3 w-3 shrink-0" />
            System role. Its page access is editable; the role itself cannot be renamed away
            from <code className="font-mono">{draft.role}</code> or deleted.
          </p>
        )}

        {isNew && (
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 shrink-0" />
            A custom role stores page access but cannot be assigned to a user until it is added
            to the auth layer.
          </p>
        )}

        <div className="mt-4 space-y-4">
          <p className="text-[11px] tracking-widest font-bold text-muted-foreground">
            PAGE ACCESS BY PANEL
          </p>

          {orphanedPages.length > 0 && (
            <div className="rounded-xl bg-yellow-100/60 text-yellow-900 p-3 text-xs">
              <p className="font-semibold mb-1">
                {orphanedPages.length} granted {orphanedPages.length === 1 ? "page is" : "pages are"}{" "}
                no longer in the catalogue
              </p>
              <p className="font-mono break-all opacity-80">{orphanedPages.join(", ")}</p>
              <button
                onClick={() => setDraft((d) => ({ ...d, pages: d.pages.filter((p) => ALL_PATHS.has(p)) }))}
                className="mt-2 underline font-semibold"
              >
                Remove them
              </button>
            </div>
          )}

          {PANELS.map((panel) => {
            const selectedCount = panel.pages.filter((p) => draft.pages.includes(p.path)).length;
            const allOn = selectedCount === panel.pages.length;
            return (
              <div key={panel.key} className="rounded-xl border border-border/60 bg-muted/20">
                <div className="flex items-center justify-between p-3 border-b border-border/60">
                  <div>
                    <p className="font-semibold text-primary">{panel.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedCount} / {panel.pages.length} pages enabled
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <Checkbox checked={allOn} onCheckedChange={(v) => togglePanel(panel.key, !!v)} />
                    Select all
                  </label>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                  {panel.pages.map((page) => {
                    const on = draft.pages.includes(page.path);
                    return (
                      <label
                        key={page.path}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition ${
                          on ? "bg-primary/10 text-primary" : "bg-card hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox checked={on} onCheckedChange={() => togglePage(page.path)} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{page.label}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {page.path}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-4">
          <Btn variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Btn>
          <Btn onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save Role"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Roles;
