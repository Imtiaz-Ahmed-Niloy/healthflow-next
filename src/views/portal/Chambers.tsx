"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Loader2, MapPin, Pencil, Phone, Plus, Store } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Modal, ConfirmDialog } from "@/components/admin/crud";
import { Btn, Pill } from "@/components/admin/ui";
import {
  ChamberForm, chamberPayload, draftFromChamber, emptyChamberDraft, type ChamberDraft,
} from "@/components/admin/ChamberForm";
import { supabase } from "@/lib/supabase/client";
import { useFormatters } from "@/lib/appSettings";
import { parseWeek, summariseWeek } from "@/lib/hours";
import { chamberPlace, type Chamber } from "@/lib/chambers";

/**
 * The doctor's own chambers (0088).
 *
 * A chamber is where they practise for themselves: its address, phone, fee
 * and hours are theirs to set here. Patients find and book them there, and
 * those patients come into the same queue and prescription pad as a
 * hospital's.
 */

const errorOf = async (res: Response) => (await res.json().catch(() => null))?.error?.message as string | undefined;

const Chambers = () => {
  const t = useTranslations("portal.chambers");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { formatCurrency } = useFormatters();
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [loading, setLoading] = useState(true);
  // The chamber being edited, or "new" for one being added.
  const [editing, setEditing] = useState<Chamber | "new" | null>(null);
  const [draft, setDraft] = useState<ChamberDraft>(emptyChamberDraft);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState<Chamber | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/v1/chambers");
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(body?.error?.message || t("loadFailed")); return; }
      setChambers(body.data ?? []);
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setLoading(false);
    }
  };

  // Their name, for what a chamber with no name will be called.
  const [doctorName, setDoctorName] = useState<string | undefined>();

  useEffect(() => {
    void load();
    fetch("/api/v1/portal/me")
      .then(res => res.json())
      .then(body => setDoctorName(body?.data?.name ?? undefined))
      .catch(() => undefined);
  }, []);

  const open = (c: Chamber | "new") => {
    setDraft(c === "new" ? emptyChamberDraft() : draftFromChamber(c));
    setFormKey(k => k + 1);
    setEditing(c);
  };

  const save = async () => {
    if (!editing) return;
    if (draft.has_name && !draft.name.trim()) { toast.error(t("needsName")); return; }
    setSaving(true);
    try {
      const adding = editing === "new";
      const res = await fetch("/api/v1/chambers", {
        method: adding ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...chamberPayload(draft), ...(adding ? {} : { id: editing.id }) }),
      });
      if (!res.ok) { toast.error(t("saveFailed"), { description: await errorOf(res) }); return; }
      // A new chamber is a new place this login works. The session's token
      // lists those places, so it is refreshed now rather than whenever it
      // next expires — until then the queue wouldn't show the chamber's patients.
      if (adding) await supabase.auth.refreshSession().catch(() => null);
      toast.success(adding ? t("addedToast") : t("savedToast"));
      setEditing(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const setOpen = async (c: Chamber, value: boolean) => {
    setBusy(c.id);
    try {
      const res = await fetch("/api/v1/chambers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, open: value }),
      });
      if (!res.ok) { toast.error(value ? t("reopenFailed") : t("closeFailed"), { description: await errorOf(res) }); return; }
      toast.success(value ? t("reopened", { name: c.name }) : t("closed", { name: c.name }));
      void load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <PortalLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-primary">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Btn onClick={() => open("new")}><Plus className="h-4 w-4" /> {t("add")}</Btn>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : chambers.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-card border border-border/60 p-10 text-center shadow-soft">
          <div className="mx-auto h-12 w-12 rounded-full bg-chip flex items-center justify-center text-primary">
            <Store className="h-5 w-5" />
          </div>
          <p className="font-display text-2xl text-primary mt-4">{t("emptyTitle")}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{t("emptyBody")}</p>
          <Btn className="mt-5" onClick={() => open("new")}><Plus className="h-4 w-4" /> {t("add")}</Btn>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5 mt-8">
          {chambers.map((c, i) => {
            const week = parseWeek(c.availability);
            const place = chamberPlace(c);
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`rounded-3xl bg-card border border-border/60 p-6 shadow-soft ${c.open ? "" : "opacity-75"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl text-primary truncate">{c.name}</h2>
                    {place && (
                      <p className="text-sm text-muted-foreground flex items-start gap-1.5 mt-1">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />{place}
                      </p>
                    )}
                  </div>
                  <Pill tone={c.open ? "ok" : "default"}>{c.open ? t("takingBookings") : t("closedPill")}</Pill>
                </div>

                <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {t("phone")}</dt>
                  <dd className="text-right font-semibold text-primary">{c.phone || "—"}</dd>
                  <dt className="text-muted-foreground">{t("fee")}</dt>
                  <dd className="text-right font-semibold text-primary">
                    {c.consultation_fee == null ? "—" : formatCurrency(Number(c.consultation_fee))}
                  </dd>
                  <dt className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {t("hours")}</dt>
                  <dd className="text-right">
                    {week ? summariseWeek(week, locale).map(row => (
                      <span key={row.days} className="block text-primary">
                        <span className="font-semibold">{row.days}</span> · {row.hours}
                      </span>
                    )) : <span className="text-muted-foreground">{t("notSet")}</span>}
                  </dd>
                </dl>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Btn variant="outline" onClick={() => open(c)}><Pencil className="h-4 w-4" /> {tc("edit")}</Btn>
                  {c.open ? (
                    <Btn variant="ghost" onClick={() => setClosing(c)} disabled={busy === c.id}>
                      {busy === c.id && <Loader2 className="h-4 w-4 animate-spin" />} {t("closeToBookings")}
                    </Btn>
                  ) : (
                    <Btn variant="ghost" onClick={() => void setOpen(c, true)} disabled={busy === c.id}>
                      {busy === c.id && <Loader2 className="h-4 w-4 animate-spin" />} {t("reopen")}
                    </Btn>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={!!editing} onClose={() => !saving && setEditing(null)}
        title={editing === "new" ? t("add") : t("editNamed", { name: editing?.name ?? t("chamber") })} size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setEditing(null)} disabled={saving}>{tc("cancel")}</Btn>
          <Btn onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing === "new" ? t("add") : tc("save")}
          </Btn>
        </>}>
        <ChamberForm draft={draft} onChange={patch => setDraft(d => ({ ...d, ...patch }))} resetKey={formKey} doctorName={doctorName} />
      </Modal>

      <ConfirmDialog
        open={!!closing}
        onClose={() => setClosing(null)}
        onConfirm={() => closing && void setOpen(closing, false)}
        title={t("confirmCloseTitle")}
        description={closing ? t("confirmCloseBody", { name: closing.name }) : undefined}
      />
    </PortalLayout>
  );
};

export default Chambers;
