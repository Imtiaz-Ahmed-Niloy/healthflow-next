"use client";

import { useState } from "react";
import { Building2, MapPin, Monitor, Pencil, Phone, Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { StateBlock, usePharmacyError } from "@/components/pharmacy/ui";
import { Btn, Card, Pill } from "@/components/admin/ui";
import { ConfirmDialog, Field, Input, Modal, Select, TextArea } from "@/components/admin/crud";
import type { PharmacyBranch, PharmacyRegister } from "@/lib/pharmacy";
import { pharmacyBranchesApi, pharmacyRegistersApi } from "@/redux/api/pharmacy";

const STATUS_TONE: Record<PharmacyBranch["status"], "ok" | "warn" | "bad"> = { active: "ok", maintenance: "warn", inactive: "bad" };

type Failure = { status?: number };

const BranchDialog = ({ branch, open, onClose }: { branch: PharmacyBranch | null; open: boolean; onClose: () => void }) => {
  const t = useTranslations("pharmacy.branches");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const [create, creating] = pharmacyBranchesApi.useCreate();
  const [update, updating] = pharmacyBranchesApi.useUpdate();
  const busy = creating.isLoading || updating.isLoading;

  if (!open) return null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { ...Object.fromEntries(form.entries()), is_main: form.get("is_main") === "on" } as Partial<PharmacyBranch>;
    try {
      if (branch) await update(branch.id, body).unwrap();
      else await create(body).unwrap();
      toast.success(t("saved"));
      onClose();
    } catch (cause) {
      // The two things that can clash: a second main branch, and a code already in use.
      toast.error((cause as Failure).status === 409 ? (body.is_main && !branch?.is_main ? t("mainTaken") : t("codeTaken")) : describe(cause));
    }
  };

  const text = (name: keyof PharmacyBranch) => ({ name, defaultValue: (branch?.[name] as string | null | undefined) ?? "" });

  return (
    <Modal open onClose={onClose} title={branch ? t("editTitle") : t("newTitle")} size="lg">
      <form onSubmit={submit}>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label={t("fields.name")} required><Input {...text("name")} required autoFocus maxLength={200} /></Field>
          <Field label={t("fields.code")} required><Input {...text("code")} required maxLength={20} placeholder="BR-01" /></Field>
          <Field label={t("fields.status")}>
            <Select name="status" defaultValue={branch?.status ?? "active"}>
              {(["active", "maintenance", "inactive"] as const).map(value => <option key={value} value={value}>{t(`statuses.${value}`)}</option>)}
            </Select>
          </Field>
          <Field label={t("fields.pharmacist_in_charge")}><Input {...text("pharmacist_in_charge")} maxLength={200} /></Field>
          <Field label={t("fields.phone")}><Input {...text("phone")} type="tel" /></Field>
          <Field label={t("fields.email")}><Input {...text("email")} type="email" /></Field>
          <Field label={t("fields.license_no")}><Input {...text("license_no")} maxLength={100} /></Field>
          <Field label={t("fields.vat_no")}><Input {...text("vat_no")} maxLength={100} /></Field>
        </div>
        <Field label={t("fields.opening_hours")}><Input {...text("opening_hours")} maxLength={200} placeholder="8:00 AM – 10:00 PM" /></Field>
        <Field label={t("fields.address")}><TextArea {...text("address")} rows={2} maxLength={500} /></Field>
        <label className="flex items-center gap-2 text-sm mb-4">
          <input type="checkbox" name="is_main" defaultChecked={branch?.is_main ?? false} /> {t("fields.is_main")}
        </label>
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose}>{tc("cancel")}</Btn>
          <Btn type="submit" disabled={busy}>{busy ? tc("saving") : tc("save")}</Btn>
        </div>
      </form>
    </Modal>
  );
};

const RegisterDialog = ({ branchId, register, open, onClose }: {
  branchId: string | null; register: PharmacyRegister | null; open: boolean; onClose: () => void;
}) => {
  const t = useTranslations("pharmacy.branches");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const [create, creating] = pharmacyRegistersApi.useCreate();
  const [update, updating] = pharmacyRegistersApi.useUpdate();
  const busy = creating.isLoading || updating.isLoading;

  if (!open || !branchId) return null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      branch_id: branchId, name: String(form.get("name") ?? ""), code: String(form.get("code") ?? ""), is_active: form.get("is_active") === "true",
    };
    try {
      if (register) await update(register.id, body).unwrap();
      else await create(body).unwrap();
      toast.success(t("saved"));
      onClose();
    } catch (cause) {
      toast.error((cause as Failure).status === 409 ? t("codeTaken") : describe(cause));
    }
  };

  return (
    <Modal open onClose={onClose} title={register ? t("editRegister") : t("addRegister")} size="sm">
      <form onSubmit={submit}>
        <Field label={t("registerName")} required><Input name="name" defaultValue={register?.name ?? ""} required autoFocus maxLength={200} /></Field>
        <Field label={t("registerCode")} required><Input name="code" defaultValue={register?.code ?? ""} required maxLength={20} placeholder="REG-01" /></Field>
        <Field label={tc("status")}>
          <Select name="is_active" defaultValue={String(register?.is_active ?? true)}>
            <option value="true">{t("registerActive")}</option>
            <option value="false">{t("registerOff")}</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose}>{tc("cancel")}</Btn>
          <Btn type="submit" disabled={busy}>{busy ? tc("saving") : tc("save")}</Btn>
        </div>
      </form>
    </Modal>
  );
};

const Page = () => {
  const t = useTranslations("pharmacy.branches");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const { data, isLoading, error, refetch } = pharmacyBranchesApi.useList({ limit: 100 });
  // Registers are read as a list of their own: adding one refreshes that list, not the branches'.
  const registersList = pharmacyRegistersApi.useList({ limit: 100 });
  const [removeBranch] = pharmacyBranchesApi.useRemove();
  const [removeRegister] = pharmacyRegistersApi.useRemove();

  const [branchForm, setBranchForm] = useState<{ branch: PharmacyBranch | null } | null>(null);
  const [registerForm, setRegisterForm] = useState<{ branchId: string; register: PharmacyRegister | null } | null>(null);
  const [droppingBranch, setDroppingBranch] = useState<PharmacyBranch | null>(null);
  const [droppingRegister, setDroppingRegister] = useState<PharmacyRegister | null>(null);

  const registers = registersList.data?.data ?? [];
  const branches = data?.data ?? [];

  const drop = async (action: () => Promise<unknown>) => {
    try {
      await action();
      toast.success(t("deleted"));
      refetch();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  const iconBtn = "p-1.5 rounded-lg hover:bg-muted text-foreground/70";

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")} needs="administer"
      actions={<Btn onClick={() => setBranchForm({ branch: null })}><Plus className="h-4 w-4" /> {t("add")}</Btn>}>
      <p className="text-sm text-muted-foreground mb-4 max-w-3xl">{t("hint")}</p>

      {isLoading || error || branches.length === 0 ? (
        <Card className="p-6"><StateBlock loading={isLoading} error={error} onRetry={refetch} empty={t("none")} rows={3} /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {branches.map(branch => {
            const tills = registers.filter(register => register.branch_id === branch.id);
            return (
              <Card key={branch.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg text-primary flex flex-wrap items-center gap-2">
                      <Building2 className="h-5 w-5 shrink-0" /> <span className="truncate">{branch.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{branch.code}</span>
                    </h2>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Pill tone={STATUS_TONE[branch.status]}>{t(`statuses.${branch.status}`)}</Pill>
                      {branch.is_main && <Pill tone="info">{t("main")}</Pill>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setBranchForm({ branch })} className={iconBtn} title={tc("edit")} aria-label={tc("edit")}><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDroppingBranch(branch)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title={tc("delete")} aria-label={tc("delete")}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                <dl className="mt-4 space-y-1.5 text-sm text-foreground/80">
                  {branch.address && <div className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" /><dd>{branch.address}</dd></div>}
                  {(branch.phone || branch.email) && <div className="flex gap-2"><Phone className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" /><dd>{[branch.phone, branch.email].filter(Boolean).join(" · ")}</dd></div>}
                  {branch.pharmacist_in_charge && <div className="flex gap-2"><UserRound className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" /><dd>{branch.pharmacist_in_charge}</dd></div>}
                </dl>
                {(branch.license_no || branch.vat_no || branch.opening_hours) && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {[
                      branch.license_no && `${t("fields.license_no")} ${branch.license_no}`,
                      branch.vat_no && `${t("fields.vat_no")} ${branch.vat_no}`,
                      branch.opening_hours,
                    ].filter(Boolean).join(" · ")}
                  </p>
                )}

                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-primary">{t("registers")}</h3>
                    <button onClick={() => setRegisterForm({ branchId: branch.id, register: null })}
                      className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> {t("addRegister")}</button>
                  </div>
                  {tills.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("noRegisters")}</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {tills.map(till => (
                        <li key={till.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate font-semibold">{till.name}</span>
                            <span className="font-mono text-xs text-muted-foreground">{till.code}</span>
                            {!till.is_active && <Pill>{t("registerOff")}</Pill>}
                          </span>
                          <span className="inline-flex items-center gap-1 shrink-0">
                            <button onClick={() => setRegisterForm({ branchId: branch.id, register: till })} className={iconBtn} title={tc("edit")} aria-label={tc("edit")}><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => setDroppingRegister(till)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title={tc("delete")} aria-label={tc("delete")}><Trash2 className="h-3.5 w-3.5" /></button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BranchDialog key={branchForm?.branch?.id ?? "new"} open={branchForm !== null} branch={branchForm?.branch ?? null} onClose={() => setBranchForm(null)} />
      <RegisterDialog key={registerForm?.register?.id ?? `new-${registerForm?.branchId}`} open={registerForm !== null}
        branchId={registerForm?.branchId ?? null} register={registerForm?.register ?? null} onClose={() => setRegisterForm(null)} />

      <ConfirmDialog open={droppingBranch !== null} onClose={() => setDroppingBranch(null)}
        onConfirm={() => { if (droppingBranch) drop(() => removeBranch(droppingBranch.id).unwrap()); }}
        title={t("deleteBranch")} description={t("deleteBranchHint")} />
      <ConfirmDialog open={droppingRegister !== null} onClose={() => setDroppingRegister(null)}
        onConfirm={() => { if (droppingRegister) drop(() => removeRegister(droppingRegister.id).unwrap()); }}
        title={t("deleteRegister")} description={tc("cannotUndo")} />
    </PharmacyLayout>
  );
};

export default Page;
