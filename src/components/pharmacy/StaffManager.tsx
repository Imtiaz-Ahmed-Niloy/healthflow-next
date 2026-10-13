"use client";

import { ReactNode, useState } from "react";
import { Copy, KeyRound, Plus, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { StateBlock, usePharmacyError } from "@/components/pharmacy/ui";
import { Btn, Card, Pill, SectionTitle } from "@/components/admin/ui";
import { ConfirmDialog, DataTable, Field, Input, Modal, Select, type Column } from "@/components/admin/crud";
import { useSession } from "@/lib/auth/useSession";
import { PERMISSIONS, ROLE_DEFAULTS, STAFF_ROLES, type Permission, type StaffLogin, type StaffRole } from "@/lib/pharmacy";
import {
  pharmacyBranchesApi, useCreatePharmacyStaffMutation, usePharmacyStaffActionMutation, usePharmacyStaffQuery,
  useSavePharmacyStaffMutation, type StaffAccessRequest, type StaffSecret,
} from "@/redux/api/pharmacy";

/**
 * The pharmacy's logins: who they are, what kind of staff, what each may do.
 *
 * Shown in two places — the pharmacy's own Staff screen, and the hospital
 * admin's Pharmacy page — because the first pharmacy manager has to be made by
 * somebody who is not one.
 *
 * Every login carries the same role (pharmacy_admin). What sets a cashier
 * apart from a manager is the six permissions here, and the database checks
 * each of them again whenever the thing is actually attempted (0133).
 */

type Access = { role: StaffRole; branch: string; perms: Record<Permission, boolean>; pin: string; clearPin: boolean };

const permsFor = (role: StaffRole) =>
  Object.fromEntries(PERMISSIONS.map(perm => [perm, ROLE_DEFAULTS[role].includes(perm)])) as Record<Permission, boolean>;

const accessOf = (row: StaffLogin | null): Access => ({
  role: row?.staff_role ?? "cashier",
  branch: row?.branch_id ?? "",
  perms: row
    ? (Object.fromEntries(PERMISSIONS.map(perm => [perm, row[`can_${perm}`]])) as Record<Permission, boolean>)
    : permsFor("cashier"),
  pin: "",
  clearPin: false,
});

const toRequest = (access: Access): StaffAccessRequest => ({
  staff_role: access.role,
  branch_id: access.branch || null,
  can_discount: access.perms.discount,
  can_approve_returns: access.perms.approve_returns,
  can_manage_cash: access.perms.manage_cash,
  can_manage_stock: access.perms.manage_stock,
  can_see_reports: access.perms.see_reports,
  can_administer: access.perms.administer,
  pin: access.pin || null,
  clear_pin: access.clearPin,
});

/** Role, branch, the six permissions and the PIN. The same on a new login and an existing one. */
const AccessFields = ({ access, onChange, hasPin }: { access: Access; onChange: (next: Access) => void; hasPin: boolean }) => {
  const t = useTranslations("pharmacy.staff");
  const tr = useTranslations("pharmacyNav.staffRoles");
  const { data: branches } = pharmacyBranchesApi.useList({ limit: 100 });

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-x-4">
        <Field label={t("role")} required hint={t("roleHint")}>
          {/* Picking a role fills in what that role usually may do; the boxes below stay editable. */}
          <Select value={access.role} onChange={e => onChange({ ...access, role: e.target.value as StaffRole, perms: permsFor(e.target.value as StaffRole) })}>
            {STAFF_ROLES.map(role => <option key={role} value={role}>{tr(role)}</option>)}
          </Select>
        </Field>
        <Field label={t("branch")}>
          <Select value={access.branch} onChange={e => onChange({ ...access, branch: e.target.value })}>
            <option value="">{t("noBranch")}</option>
            {(branches?.data ?? []).map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </Select>
        </Field>
      </div>

      <p className="text-sm font-semibold text-primary mb-2">{t("permissions")}</p>
      <ul className="space-y-2 mb-4">
        {PERMISSIONS.map(perm => (
          <li key={perm}>
            <label className="flex items-start gap-2.5 text-sm cursor-pointer">
              <input type="checkbox" checked={access.perms[perm]} className="mt-1"
                onChange={e => onChange({ ...access, perms: { ...access.perms, [perm]: e.target.checked } })} />
              <span>
                <span className="font-semibold">{t(`perms.${perm}`)}</span>
                <span className="block text-[11px] text-muted-foreground">{t(`permHints.${perm}`)}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <Field label={t("pin")} hint={access.perms.approve_returns ? t("pinHint") : t("pinNeedsApprove")}>
        <Input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={access.pin} disabled={access.clearPin}
          onChange={e => onChange({ ...access, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          placeholder={hasPin ? "••••" : ""} className="!w-28 tracking-[0.4em] text-center" />
      </Field>
      {hasPin && (
        <label className="flex items-center gap-2 text-sm -mt-2 mb-4">
          <input type="checkbox" checked={access.clearPin} onChange={e => onChange({ ...access, clearPin: e.target.checked, pin: "" })} />
          {t("clearPin")}
        </label>
      )}
    </>
  );
};

export const StaffManager = ({ title, note }: {
  /** A heading inside the card, for the page where this is not the whole screen. */
  title?: string;
  note?: ReactNode;
}) => {
  const t = useTranslations("pharmacy.staff");
  const tc = useTranslations("pharmacy.common");
  const tr = useTranslations("pharmacyNav.staffRoles");
  const describe = usePharmacyError();
  const { user } = useSession();

  const { data, isLoading, error, refetch } = usePharmacyStaffQuery();
  const [create, creating] = useCreatePharmacyStaffMutation();
  const [save, saving] = useSavePharmacyStaffMutation();
  const [act] = usePharmacyStaffActionMutation();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffLogin | null>(null);
  const [access, setAccess] = useState<Access>(accessOf(null));
  const [secret, setSecret] = useState<(StaffSecret & { title: string }) | null>(null);
  const [stopping, setStopping] = useState<StaffLogin | null>(null);

  const rows = data?.data ?? [];
  const pinInvalid = access.pin.length > 0 && access.pin.length !== 4;

  const startAdding = () => { setAccess(accessOf(null)); setAdding(true); };
  const startEditing = (row: StaffLogin) => { setAccess(accessOf(row)); setEditing(row); };

  const submitNew = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const made = await create({
        full_name: String(form.get("full_name") ?? ""), email: String(form.get("email") ?? ""), phone: String(form.get("phone") ?? ""),
        ...toRequest(access),
      }).unwrap();
      setAdding(false);
      setSecret({ ...made.data, title: t("createdTitle") });
      if (made.warning) toast.error(t("accessWarning"));
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  const submitAccess = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await save({ id: editing.id, body: toRequest(access) }).unwrap();
      toast.success(t("saved"));
      setEditing(null);
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  const reset = async (row: StaffLogin) => {
    try {
      const answer = await act({ id: row.id, action: "reset_password" }).unwrap();
      if (answer.data.email && answer.data.password) {
        setSecret({ id: row.id, email: answer.data.email, password: answer.data.password, title: t("resetTitle") });
      }
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  const toggle = async (row: StaffLogin, action: "deactivate" | "activate") => {
    try {
      await act({ id: row.id, action }).unwrap();
      toast.success(action === "deactivate" ? t("deactivated") : t("activated"));
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(t("copied"));
  };

  const columns: Column<StaffLogin>[] = [
    { key: "name", label: t("columns.name"), render: r => (
      <div>
        <p className="font-semibold text-primary">{r.full_name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{r.email ?? "—"}{r.phone ? ` · ${r.phone}` : ""}</p>
      </div>
    ) },
    { key: "role", label: t("columns.role"), render: r => tr(r.staff_role) },
    { key: "branch", label: t("columns.branch"), render: r => r.branch_name ?? <span className="text-muted-foreground">{t("noBranch")}</span> },
    { key: "access", label: t("columns.access"), render: r => {
      const held = PERMISSIONS.filter(perm => r[`can_${perm}`]);
      return (
        <span className="text-xs text-muted-foreground">
          {held.length === PERMISSIONS.length ? t("everything") : held.length === 0 ? t("sellOnly") : held.map(perm => t(`perms.${perm}`)).join(", ")}
        </span>
      );
    } },
    { key: "pin", label: t("columns.pin"), render: r => <Pill tone={r.has_pin ? "ok" : undefined}>{r.has_pin ? t("pinSet") : t("pinNone")}</Pill> },
    { key: "status", label: t("columns.status"), render: r => <Pill tone={r.is_active ? "ok" : "bad"}>{r.is_active ? t("active") : t("inactive")}</Pill> },
  ];

  const iconBtn = "p-1.5 rounded-lg hover:bg-muted text-foreground/70";

  return (
    <>
      <Card className="p-5">
        {title && <SectionTitle title={title} action={<Btn onClick={startAdding}><Plus className="h-4 w-4" /> {t("add")}</Btn>} />}
        <div className={`flex flex-wrap items-start justify-between gap-3 mb-4 ${title ? "-mt-2" : ""}`}>
          <p className="text-sm text-muted-foreground max-w-xl">{t("hint")}</p>
          {!title && <Btn onClick={startAdding}><Plus className="h-4 w-4" /> {t("add")}</Btn>}
        </div>
        {isLoading || error ? (
          <StateBlock loading={isLoading} error={error} onRetry={refetch} rows={3} />
        ) : (
          <DataTable<StaffLogin> rows={rows} columns={columns} empty={t("none")} onRow={startEditing}
            actions={row => (
              <div className="inline-flex items-center gap-1">
                <button onClick={() => startEditing(row)} className={iconBtn} title={t("editAccess")} aria-label={t("editAccess")}><ShieldCheck className="h-4 w-4" /></button>
                <button onClick={() => reset(row)} className={iconBtn} title={t("reset")} aria-label={t("reset")}><KeyRound className="h-4 w-4" /></button>
                {/* Nobody deactivates the login they are signed in with. */}
                {row.id !== user?.id && (row.is_active
                  ? <button onClick={() => setStopping(row)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title={t("deactivate")} aria-label={t("deactivate")}><UserX className="h-4 w-4" /></button>
                  : <button onClick={() => toggle(row, "activate")} className={iconBtn} title={t("activate")} aria-label={t("activate")}><UserCheck className="h-4 w-4" /></button>)}
              </div>
            )} />
        )}
        {note && <p className="text-[11px] text-muted-foreground mt-4">{note}</p>}
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title={t("newTitle")} size="lg">
        <form onSubmit={submitNew}>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <Field label={t("fullName")} required><Input name="full_name" required autoFocus /></Field>
            <Field label={t("email")} required><Input name="email" type="email" required /></Field>
            <Field label={t("phone")}><Input name="phone" type="tel" /></Field>
          </div>
          <AccessFields access={access} onChange={setAccess} hasPin={false} />
          <div className="flex justify-end gap-2">
            <Btn variant="outline" onClick={() => setAdding(false)}>{tc("cancel")}</Btn>
            <Btn type="submit" disabled={creating.isLoading || pinInvalid}>{creating.isLoading ? t("creating") : t("create")}</Btn>
          </div>
        </form>
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} size="lg"
        title={editing ? t("editTitle", { name: editing.full_name ?? editing.email ?? "" }) : ""}>
        {editing && (
          <form onSubmit={submitAccess}>
            <AccessFields access={access} onChange={setAccess} hasPin={editing.has_pin} />
            <div className="flex justify-end gap-2">
              <Btn variant="outline" onClick={() => setEditing(null)}>{tc("cancel")}</Btn>
              <Btn type="submit" disabled={saving.isLoading || pinInvalid}>{saving.isLoading ? tc("saving") : tc("save")}</Btn>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={secret !== null} onClose={() => setSecret(null)} title={secret?.title ?? ""} size="sm"
        footer={<Btn onClick={() => setSecret(null)}>{t("done")}</Btn>}>
        {secret && (
          <>
            <p className="text-sm text-muted-foreground mb-4">{t("credentialsHint")}</p>
            {([[t("email"), secret.email], [t("password"), secret.password]] as const).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 mb-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                  <p className="font-mono text-sm truncate">{value}</p>
                </div>
                <button onClick={() => copy(value)} className={iconBtn} title={t("copy")} aria-label={t("copy")}><Copy className="h-4 w-4" /></button>
              </div>
            ))}
          </>
        )}
      </Modal>

      <ConfirmDialog open={stopping !== null} onClose={() => setStopping(null)}
        onConfirm={() => { if (stopping) toggle(stopping, "deactivate"); }}
        title={stopping ? t("deactivateConfirm", { name: stopping.full_name ?? stopping.email ?? "" }) : ""}
        description={t("deactivateHint")} />
    </>
  );
};
