"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Loader2, MapPin, Pencil, Phone, Plus, Store } from "lucide-react";
import { toast } from "sonner";
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
      if (!res.ok) { toast.error(body?.error?.message || "Couldn't load your chambers."); return; }
      setChambers(body.data ?? []);
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const open = (c: Chamber | "new") => {
    setDraft(c === "new" ? emptyChamberDraft() : draftFromChamber(c));
    setFormKey(k => k + 1);
    setEditing(c);
  };

  const save = async () => {
    if (!editing) return;
    if (!draft.name.trim()) { toast.error("Give the chamber a name"); return; }
    setSaving(true);
    try {
      const adding = editing === "new";
      const res = await fetch("/api/v1/chambers", {
        method: adding ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...chamberPayload(draft), ...(adding ? {} : { id: editing.id }) }),
      });
      if (!res.ok) { toast.error("Couldn't save the chamber", { description: await errorOf(res) }); return; }
      // A new chamber is a new place this login works. The session's token
      // lists those places, so it is refreshed now rather than whenever it
      // next expires — until then the queue wouldn't show the chamber's patients.
      if (adding) await supabase.auth.refreshSession().catch(() => null);
      toast.success(adding ? "Chamber added — patients can book you there now" : "Chamber saved");
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
      if (!res.ok) { toast.error(value ? "Couldn't reopen it" : "Couldn't close it", { description: await errorOf(res) }); return; }
      toast.success(value ? `${c.name} is taking bookings again` : `${c.name} is closed to new bookings`);
      void load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <PortalLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-primary">My Chambers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Where you practise for yourself. Patients book you here, and they come into your queue like a hospital&apos;s.
          </p>
        </div>
        <Btn onClick={() => open("new")}><Plus className="h-4 w-4" /> Add chamber</Btn>
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
          <p className="font-display text-2xl text-primary mt-4">No chamber yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Add your chamber&apos;s address, fee and hours, and patients can find you and book you there.
          </p>
          <Btn className="mt-5" onClick={() => open("new")}><Plus className="h-4 w-4" /> Add chamber</Btn>
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
                  <Pill tone={c.open ? "ok" : "default"}>{c.open ? "Taking bookings" : "Closed"}</Pill>
                </div>

                <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone</dt>
                  <dd className="text-right font-semibold text-primary">{c.phone || "—"}</dd>
                  <dt className="text-muted-foreground">Fee</dt>
                  <dd className="text-right font-semibold text-primary">
                    {c.consultation_fee == null ? "—" : formatCurrency(Number(c.consultation_fee))}
                  </dd>
                  <dt className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Hours</dt>
                  <dd className="text-right">
                    {week ? summariseWeek(week).map(row => (
                      <span key={row.days} className="block text-primary">
                        <span className="font-semibold">{row.days}</span> · {row.hours}
                      </span>
                    )) : <span className="text-muted-foreground">Not set</span>}
                  </dd>
                </dl>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Btn variant="outline" onClick={() => open(c)}><Pencil className="h-4 w-4" /> Edit</Btn>
                  {c.open ? (
                    <Btn variant="ghost" onClick={() => setClosing(c)} disabled={busy === c.id}>
                      {busy === c.id && <Loader2 className="h-4 w-4 animate-spin" />} Close to bookings
                    </Btn>
                  ) : (
                    <Btn variant="ghost" onClick={() => void setOpen(c, true)} disabled={busy === c.id}>
                      {busy === c.id && <Loader2 className="h-4 w-4 animate-spin" />} Reopen
                    </Btn>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={!!editing} onClose={() => !saving && setEditing(null)}
        title={editing === "new" ? "Add chamber" : `Edit ${editing?.name ?? "chamber"}`} size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Btn>
          <Btn onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing === "new" ? "Add chamber" : "Save"}
          </Btn>
        </>}>
        <ChamberForm draft={draft} onChange={patch => setDraft(d => ({ ...d, ...patch }))} resetKey={formKey} />
      </Modal>

      <ConfirmDialog
        open={!!closing}
        onClose={() => setClosing(null)}
        onConfirm={() => closing && void setOpen(closing, false)}
        title="Close this chamber to bookings?"
        description={closing
          ? `Patients won't be able to book you at ${closing.name}. Appointments already booked stay in your queue. You can reopen it any time.`
          : undefined}
      />
    </PortalLayout>
  );
};

export default Chambers;
