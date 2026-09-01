"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { useGetResourceQuery, useListResourceQuery } from "@/redux/api/createResourceApi";
import { useGetRoleStatsQuery } from "@/redux/api/superApi";

/**
 * Roles and their page access, from `public.roles`.
 *
 * Two kinds of row (see 0009_roles_management.sql):
 *
 *   system   `role` is an app_role enum value. Seeded, undeletable, and the
 *            only kind a user can hold. Platform-wide, so no hospital. Its
 *            page grants are editable.
 *   custom   `role` is null. A saved template that nothing can be assigned to
 *            until the enum grows — labelled as such rather than left to look
 *            like a working role. Belongs to one hospital (0055), chosen when
 *            it is created and fixed thereafter.
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
        (role.role ?? "").toLowerCase().includes(needle) ||
        // The hospital is worth searching now that custom roles belong to one.
        // Client-side because the name is on the embedded `tenants` row, which
        // PostgREST's `or` cannot reach into.
        (role.tenants?.name ?? "").toLowerCase().includes(needle),
    );
  }, [roles, query]);

  /**
   * A blank row for the editor. It is not saved until the dialog is, so the id
   * is a placeholder the editor uses to tell "new" from "existing".
   */
  const blankRole = useCallback((): RoleRow => ({
    id: "",
    role: null,
    label: "",
    description: null,
    scope: "Tenant",
    pages: [],
    permissions: {},
    is_system: false,
    // Picked in the editor. A custom role without one is refused by the API
    // and by the check constraint behind it.
    tenant_id: null,
    tenants: null,
    created_at: "",
    updated_at: "",
  }), []);

  /**
   * ?hospital=<tenant_id> — /super/hospitals links here to give one hospital a
   * role, so the New Role dialog opens with that hospital already chosen
   * instead of asking for it again on arrival.
   *
   * Unlike the package link there is nothing to reopen: a hospital can hold as
   * many roles as it likes, so this always starts a new one.
   *
   * The param is consumed once — cleared from the URL as the dialog opens, so
   * closing it and refreshing does not reopen it, and the ref stops a second
   * pass while the replace is in flight.
   */
  const hospitalParam = searchParams.get("hospital");
  const paramHospital = useGetResourceQuery(
    { resource: "hospitals", id: hospitalParam ?? "" },
    { skip: !hospitalParam },
  );
  const handledParam = useRef<string | null>(null);

  useEffect(() => {
    if (!hospitalParam || handledParam.current === hospitalParam) return;
    if (paramHospital.isLoading) return;

    handledParam.current = hospitalParam;

    const hospital = paramHospital.data?.data as RoleRow["tenants"] | undefined;
    if (hospital) {
      setEditing({ ...blankRole(), tenant_id: hospitalParam, tenants: hospital });
    } else {
      // Deleted between the two screens, or the request failed. A dialog naming
      // an id nobody can read is worse than one that asks.
      setEditing(blankRole());
      toast.error("Could not load that hospital", { description: "Pick it from the list instead." });
    }

    router.replace(pathname, { scroll: false });
  }, [hospitalParam, paramHospital.data, paramHospital.isLoading, blankRole, router, pathname]);

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
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {/* System roles belong to no hospital by design, so they
                          say what they are rather than showing a blank. */}
                      {role.is_system ? "All hospitals" : role.tenants?.name ?? "Unknown hospital"}
                      {" · "}{userLabel} · {role.pages.length} pages
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
  const [hospitalQuery, setHospitalQuery] = useState("");

  /**
   * A new role normally picks its hospital here. Arriving from
   * /super/hospitals it is already decided and `role.tenants` carries it, so
   * the field states which hospital rather than reopening the question — with
   * a way back to the search for a mis-click.
   */
  const [changingHospital, setChangingHospital] = useState(false);
  const pickHospital = isNew && (changingHospital || !role.tenants);

  const [createRole] = rolesApi.useCreate();
  const [updateRole] = rolesApi.useUpdate();

  /**
   * Hospitals are searched server-side rather than listed in full: `tenants`
   * holds every hospital in Bangladesh and the endpoint caps at 100 rows, so a
   * plain dropdown would quietly stop showing most of them. Same picker as the
   * package assignment editor.
   *
   * Skipped once the role exists — the hospital is fixed at creation.
   */
  const hospitals = useListResourceQuery(
    { resource: "hospitals", limit: 20, q: hospitalQuery || undefined },
    { skip: !pickHospital },
  );
  const hospitalRows = (hospitals.data?.data ?? []) as { id: string; name: string }[];

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
    // A custom role belongs to a hospital (0055). The API and the check
    // constraint both refuse one without; catching it here keeps the dialog
    // open with the page grants still ticked.
    if (isNew && !draft.tenant_id) {
      toast.error("Select the hospital this role is for");
      return;
    }

    // The server rejects these too; catching them here keeps the dialog open
    // with the text still in it.
    // `description` is deliberately absent: the editor no longer collects one,
    // and PATCH drops undefined keys, so whatever a role already has is left
    // alone rather than being wiped by a form that cannot show it.
    const body: RoleWrite = {
      label,
      scope: draft.scope as RoleWrite["scope"],
      pages: draft.pages,
      // Only on create: the update schema does not accept it, because moving a
      // role between hospitals is a delete and a new role, not a field edit.
      ...(isNew ? { tenant_id: draft.tenant_id ?? undefined } : {}),
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

        {/*
          Which hospital the role is for. First, because it frames everything
          under it: the page grants are what that hospital's staff will get.
          Fixed once saved, so an existing role states it rather than offering
          it as a field.
        */}
        <div className="mt-2">
          <Label htmlFor={pickHospital ? "role-hospital-search" : undefined}>Hospital</Label>
          {role.is_system ? (
            <p className="h-9 flex items-center text-sm text-muted-foreground">
              All hospitals — a system role is part of the auth layer.
            </p>
          ) : !pickHospital ? (
            <div className="flex items-center gap-2">
              <p className="h-9 flex-1 flex items-center text-sm font-semibold text-primary">
                {role.tenants?.name ?? "Unknown hospital"}
              </p>
              {/* Only while creating: the hospital on a saved role is fixed —
                  the API does not accept it on update. */}
              {isNew && (
                <Btn
                  variant="ghost"
                  onClick={() => { setChangingHospital(true); setDraft({ ...draft, tenant_id: null }); }}
                >
                  Change
                </Btn>
              )}
            </div>
          ) : (
            <>
              <Input
                id="role-hospital-search"
                value={hospitalQuery}
                onChange={(e) => setHospitalQuery(e.target.value)}
                placeholder="Search hospitals…"
                className="mb-2"
              />
              <div className="max-h-36 overflow-y-auto rounded-lg border border-border divide-y divide-border/50">
                {hospitals.isFetching ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
                ) : hospitalRows.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No hospitals found.</p>
                ) : (
                  hospitalRows.map((hospital) => {
                    const chosen = draft.tenant_id === hospital.id;
                    return (
                      <button
                        key={hospital.id}
                        type="button"
                        onClick={() => setDraft({ ...draft, tenant_id: hospital.id })}
                        aria-pressed={chosen}
                        className={`w-full text-left px-3 py-2 text-sm transition ${
                          chosen ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/50"
                        }`}
                      >
                        <span className="truncate">{hospital.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-4">
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
                  <Label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <Checkbox checked={allOn} onCheckedChange={(v) => togglePanel(panel.key, !!v)} />
                    Select all
                  </Label>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                  {panel.pages.map((page) => {
                    const on = draft.pages.includes(page.path);
                    return (
                      <Label
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
                      </Label>
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
