"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog, Modal } from "./crud";
import { invalidateResource } from "@/redux/api/createResourceApi";
import { useAppDispatch } from "@/redux/hooks";

type PatientRef = { id: string; full_name: string };

/**
 * A patient's login, wherever a patient is added at the desk — the registry
 * (/admin/patients) and the appointment form both give a new patient one
 * straight away: their mobile number and a short password
 * (api/v1/patients/[id]/login), shown so the desk can read it out.
 *
 * `create` makes it, `view` reads back one already made, `ask` confirms first
 * (for a patient who was added before logins existed). Render `dialogs` once
 * on the page.
 */
export const usePatientLogin = () => {
  const t = useTranslations("admin.patients.login");
  const dispatch = useAppDispatch();
  const [creds, setCreds] = useState<{ patient: string; login: string; password: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<PatientRef | null>(null);

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(t("copied", { label }));
  };

  const create = async (patient: PatientRef) => {
    setBusyId(patient.id);
    try {
      const res = await fetch(`/api/v1/patients/${patient.id}/login`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(t("createFailed"), { description: body?.error?.message ?? t("tryAgain") });
        return;
      }
      // Not a CRUD write on the row, so the cache has to be told profile_id
      // changed — otherwise the key would still offer to create a login.
      dispatch(invalidateResource("patients", patient.id));
      if (body.data?.linked) {
        toast.info(t("linked"), { description: t("linkedBody", { phone: body.data.login }) });
        return;
      }
      setCreds({ patient: patient.full_name, ...body.data });
    } catch {
      toast.error(t("createFailed"), { description: t("requestFailed") });
    } finally {
      setBusyId(null);
    }
  };

  const view = async (patient: PatientRef) => {
    setBusyId(patient.id);
    try {
      const res = await fetch(`/api/v1/patients/${patient.id}/login`);
      const body = await res.json();
      if (!res.ok) {
        if (body?.error?.code === "own_account") {
          toast.info(t("ownAccount"), { description: body.error.message });
          return;
        }
        toast.error(t("loadFailed"), { description: body?.error?.message ?? t("tryAgain") });
        return;
      }
      setCreds({ patient: patient.full_name, ...body.data });
    } catch {
      toast.error(t("loadFailed"), { description: t("requestFailed") });
    } finally {
      setBusyId(null);
    }
  };

  const dialogs = (
    <>
      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => pending && void create(pending)}
        title={t("createTitle")}
        description={pending ? t("createBody", { name: pending.full_name }) : undefined}
      />

      <Modal
        open={!!creds}
        onClose={() => setCreds(null)}
        title={t("modalTitle")}
        footer={
          <button type="button" onClick={() => setCreds(null)}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">
            {t("done")}
          </button>
        }>
        {creds && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
              <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                {t.rich("intro", {
                  name: creds.patient,
                  b: chunks => <span className="font-semibold text-primary">{chunks}</span>,
                })}
              </p>
            </div>
            {[
              { label: t("phone"), value: creds.login },
              { label: t("password"), value: creds.password },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5 uppercase">{label}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted/40 rounded-lg px-3 py-2 text-sm font-mono break-all">{value}</code>
                  <button type="button" onClick={() => copy(value, label)}
                    className="p-2 rounded-lg border border-border hover:bg-muted" title={t("copy", { label })}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );

  return { busyId, create, view, ask: setPending, dialogs };
};
