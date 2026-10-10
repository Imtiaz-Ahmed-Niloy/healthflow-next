"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BLOCK_KINDS, type BlockKind, type ScheduleBlock } from "@/lib/scheduleBlocks";

/**
 * "Add to schedule" on /portal/schedule: time the doctor is not seeing
 * patients (0125) — leave, an operation, a hospital round, a class or
 * meeting, busy. One form for all five: what it is, where, which days, which
 * hours, whether it repeats, and whether it closes booking.
 *
 * The form starts from the kind: leave is whole days over a range, a round
 * repeats every week and — alone — leaves booking open, since a doctor on a
 * round will still fit a patient in. Each of those can be changed.
 */

export type BlockClash = { id: string; scheduled_date: string; scheduled_time: string; patient: string | null };
export type BlockPlace = { id: string; name: string };

const ALL_PLACES = "all";
// Shown from Saturday, the first working day of the week here; the values
// are the database's, 0 = Sunday.
const DAYS: { key: "sat" | "sun" | "mon" | "tue" | "wed" | "thu" | "fri"; dow: number }[] = [
  { key: "sat", dow: 6 }, { key: "sun", dow: 0 }, { key: "mon", dow: 1 }, { key: "tue", dow: 2 },
  { key: "wed", dow: 3 }, { key: "thu", dow: 4 }, { key: "fri", dow: 5 },
];

type Form = {
  kind: BlockKind;
  place: string;
  start_date: string;
  end_date: string;
  allDay: boolean;
  start_time: string;
  end_time: string;
  repeats: boolean;
  days: number[];
  blocks_booking: boolean;
  note: string;
};

/** What each kind usually is — only a starting point. */
const startFor = (kind: BlockKind, date: string): Form => ({
  kind,
  place: ALL_PLACES,
  start_date: date,
  end_date: kind === "round" || kind === "teaching" ? "" : date,
  allDay: kind === "leave",
  start_time: kind === "leave" ? "" : "09:00",
  end_time: kind === "leave" ? "" : "10:00",
  repeats: kind === "round" || kind === "teaching",
  days: kind === "round" ? [6, 0, 1, 2, 3, 4] : [],
  blocks_booking: kind !== "round",
  note: "",
});

export const AddScheduleBlockDialog = ({ open, onOpenChange, date, places, onAdded }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The day selected on the calendar, "YYYY-MM-DD": where a new entry starts. */
  date: string;
  places: BlockPlace[];
  onAdded: (block: ScheduleBlock, clashes: BlockClash[]) => void;
}) => {
  const t = useTranslations("portal.schedule.block");
  const ts = useTranslations("portal.schedule");
  const tc = useTranslations("common");
  const [form, setForm] = useState<Form>(() => startFor("leave", date));
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }));

  // Each opening is a new entry, on the day the calendar has selected.
  useEffect(() => { if (open) setForm(startFor("leave", date)); }, [open, date]);

  const toggleDay = (dow: number) =>
    set({ days: form.days.includes(dow) ? form.days.filter(d => d !== dow) : [...form.days, dow] });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.start_date) { toast.error(t("needDate")); return; }
    if (!form.allDay && (!form.start_time || !form.end_time)) { toast.error(t("needTimes")); return; }
    if (form.repeats && form.days.length === 0) { toast.error(t("needDays")); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/v1/portal/schedule-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: form.kind,
          doctor_id: form.place === ALL_PLACES ? null : form.place,
          start_date: form.start_date,
          end_date: form.end_date || null,
          start_time: form.allDay ? null : form.start_time,
          end_time: form.allDay ? null : form.end_time,
          repeat_days: form.repeats ? form.days : null,
          blocks_booking: form.blocks_booking,
          note: form.note,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(body?.error?.message ?? t("failed")); return; }
      onAdded(body.data as ScheduleBlock, (body.clashes ?? []) as BlockClash[]);
      onOpenChange(false);
    } catch {
      toast.error(t("failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("kind")}</Label>
              {/* Changing the kind starts the form again from what that kind usually is. */}
              <Select value={form.kind} onValueChange={v => setForm(f => ({ ...startFor(v as BlockKind, f.start_date), place: f.place, note: f.note }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLOCK_KINDS.map(k => <SelectItem key={k} value={k}>{ts(`kinds.${k}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* A doctor at one place has nothing to choose between. */}
            {places.length > 1 && (
              <div className="space-y-1.5">
                <Label>{t("place")}</Label>
                <Select value={form.place} onValueChange={v => set({ place: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_PLACES}>{t("allPlaces")}</SelectItem>
                    {places.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{form.repeats ? t("startsOn") : t("from")}</Label>
              <DateInput value={form.start_date} onChange={v => set({ start_date: v, end_date: form.end_date && form.end_date < v ? v : form.end_date })} required />
            </div>
            <div className="space-y-1.5">
              <Label>{form.repeats ? t("until") : t("to")}</Label>
              <DateInput value={form.end_date} onChange={v => set({ end_date: v })} min={form.start_date} placeholder={form.repeats ? t("noEnd") : undefined} showClear={form.repeats} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="block-all-day">{t("allDay")}</Label>
            <Switch id="block-all-day" checked={form.allDay} onCheckedChange={v => set({ allDay: v, start_time: v ? "" : form.start_time || "09:00", end_time: v ? "" : form.end_time || "10:00" })} />
          </div>
          {!form.allDay && (
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="block-start">{t("startTime")}</Label>
                <Input id="block-start" type="time" value={form.start_time} onChange={e => set({ start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="block-end">{t("endTime")}</Label>
                <Input id="block-end" type="time" value={form.end_time} onChange={e => set({ end_time: e.target.value })} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="block-repeats">{t("repeats")}</Label>
            <Switch id="block-repeats" checked={form.repeats} onCheckedChange={v => set({ repeats: v, end_date: v ? form.end_date : form.end_date || form.start_date })} />
          </div>
          {form.repeats && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("repeats")}>
              {DAYS.map(d => {
                const on = form.days.includes(d.dow);
                return (
                  <button key={d.key} type="button" onClick={() => toggleDay(d.dow)} aria-pressed={on}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/70 hover:text-primary"}`}>
                    {ts(`weekDays.${d.key}`)}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 p-3">
            <div>
              <Label htmlFor="block-booking">{t("blocksBooking")}</Label>
              <p className="mt-1 text-xs text-muted-foreground">{form.blocks_booking ? t("blocksBookingOn") : t("blocksBookingOff")}</p>
            </div>
            <Switch id="block-booking" checked={form.blocks_booking} onCheckedChange={v => set({ blocks_booking: v })} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="block-note">{t("note")}</Label>
            <Textarea id="block-note" rows={2} maxLength={500} value={form.note} onChange={e => set({ note: e.target.value })} placeholder={t("notePlaceholder")} />
          </div>

          <DialogFooter>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-chip">
              {tc("cancel")}
            </button>
            <button type="submit" disabled={saving} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-glow disabled:opacity-60">
              {saving ? t("saving") : t("add")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddScheduleBlockDialog;
