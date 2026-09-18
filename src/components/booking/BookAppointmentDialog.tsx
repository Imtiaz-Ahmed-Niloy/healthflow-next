"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Avatar } from "@/components/common/Avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { UIDoctor } from "@/hooks/useDoctors";
import { useSession } from "@/lib/auth/useSession";
import { useBookingClock } from "@/lib/appSettings";
import { availabilityLabel, describeSchedule, hoursOn, outsideAvailabilityReason, parseAvailability } from "@/lib/availability";

/**
 * Booking a doctor — the one form for it, wherever a Book Appointment button
 * is: a patient's Find Doctors, a doctor's public profile, and anywhere else
 * later. The rules live here once: where (a doctor at several hospitals or
 * chambers picks one, 0090), within that place's days and hours, not in the
 * past on the platform's clock. The server checks all of it again.
 *
 * Only a patient books. Someone signed out is asked to sign in and comes back
 * to this page with the form open (`?book=1`, see DoctorDetail); someone
 * signed in as staff is told the form is for patients.
 */

export const BookAppointmentDialog = ({ doctor, onClose }: {
  /** The doctor being booked; null keeps the dialog closed. */
  doctor: UIDoctor | null;
  onClose: () => void;
}) => {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: sessionLoading } = useSession();
  // Today and now on the platform's clock (global settings), so a slot that
  // has already passed there can't be picked however late it is in UTC.
  const clock = useBookingClock();

  // Which of the doctor's places the visit is at, when they have several.
  const [placeId, setPlaceId] = useState("");
  const [form, setForm] = useState({ date: "", time: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  // The doctor the form was last filled for — a new one starts clean.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (doctor && doctor.id !== openedFor) {
    setOpenedFor(doctor.id);
    setPlaceId(doctor.places[0]?.id ?? "");
    setForm({ date: "", time: "", reason: "" });
  }

  const place = doctor?.places.find(p => p.id === placeId) ?? doctor?.places[0] ?? null;

  // Their days and hours at that place (null when they can't be read, in
  // which case nothing is refused on their account).
  const schedule = useMemo(() => parseAvailability(place?.availability), [place]);

  /** What is wrong with the picked slot, if anything — shown under the fields as they are filled. */
  const slotProblem = (() => {
    if (!doctor || !form.date) return null;
    if (form.date < clock.today) return t("datePassed");
    const dayOrHours = outsideAvailabilityReason(schedule, form.date, form.time, doctor.name, locale);
    if (dayOrHours) return dayOrHours;
    return form.time ? clock.pastSlotReason(form.date, form.time) : null;
  })();

  // The picked date's own hours — a week can give each day different ones.
  const dayHours = hoursOn(schedule, form.date);

  /**
   * What the server refused about a slot — already booked by someone else
   * (409), or outside hours or past by its clock (422). Tied to the place,
   * date and time it was said about, so changing any of them clears it
   * without anyone having to remember to.
   */
  const slotKey = `${place?.id ?? ""}|${form.date}|${form.time}`;
  const [refused, setRefused] = useState<{ key: string; message: string } | null>(null);
  const serverProblem = refused?.key === slotKey ? refused.message : null;

  /** The problem with the date and time as picked: marks both fields and shows under them. */
  const fieldProblem = slotProblem ?? serverProblem;
  const fieldClass = fieldProblem ? "border-destructive focus-visible:ring-destructive" : "";

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor || !place) return;
    if (!form.date || !form.time) {
      toast.error(t("pickDateTime"));
      return;
    }
    const problem = clock.pastSlotReason(form.date, form.time)
      ?? outsideAvailabilityReason(schedule, form.date, form.time, doctor.name, locale);
    if (problem) {
      toast.error(problem);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/patient/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: place.id,
          scheduled_date: form.date,
          scheduled_time: form.time,
          notes: form.reason,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const message = body?.error?.message || t("failed");
        // A refusal about the slot itself belongs on the date and time fields.
        if (res.status === 409 || res.status === 422) setRefused({ key: slotKey, message });
        toast.error(message);
        return;
      }

      // Read as a calendar date at noon UTC, then printed in UTC: `new Date("2026-09-12")`
      // is midnight UTC, which a browser west of UTC would print as the 11th.
      const dateLabel = new Date(`${form.date}T12:00:00Z`).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" });
      toast.success(t("requested", { doctor: doctor.name, place: place.name, date: dateLabel, time: form.time }));
      onClose();
      router.push("/patient/appointments");
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setSubmitting(false);
    }
  };

  const isPatient = user?.role === "patient";

  return (
    <Dialog open={!!doctor} onOpenChange={o => !o && !submitting && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">{t("title")}</DialogTitle>
          <DialogDescription>
            {doctor ? t("description", { doctor: doctor.name, specialty: doctor.specialty }) : ""}
          </DialogDescription>
        </DialogHeader>

        {doctor && !sessionLoading && !user && (
          // Signed out: sign in, and land back here with this form open.
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">{t("signInToBook", { doctor: doctor.name })}</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{tc("cancel")}</Button>
              <Button asChild>
                <Link href={`/signin?next=${encodeURIComponent(`${pathname}?book=1`)}`}>{t("signInButton")}</Link>
              </Button>
            </DialogFooter>
          </div>
        )}

        {doctor && user && !isPatient && (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">{t("staffNotice")}</p>
            <DialogFooter>
              <Button type="button" onClick={onClose}>{t("ok")}</Button>
            </DialogFooter>
          </div>
        )}

        {doctor && isPatient && (
          <form onSubmit={confirm} className="space-y-4 mt-2">
            <div className="flex items-center gap-3 rounded-xl bg-chip/40 p-3">
              <Avatar src={doctor.img} name={doctor.name} className="h-12 w-12 text-base" />
              <div>
                <p className="font-semibold text-primary text-sm">{doctor.name}</p>
                <p className="text-xs text-primary-glow">{doctor.specialty} · {place?.name ?? doctor.hospital.name}</p>
                {place?.availability && (
                  <p className="text-xs text-foreground/70 mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {t("available", { hours: availabilityLabel(place.availability, locale) ?? "" })}
                  </p>
                )}
              </div>
            </div>
            {doctor.places.length > 1 && (
              <div className="space-y-1.5">
                <Label required>{t("where")}</Label>
                <div className="grid gap-2">
                  {doctor.places.map(p => (
                    <label key={p.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${p.id === place?.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}>
                      <input type="radio" name="place" className="mt-1" checked={p.id === place?.id}
                        onChange={() => { setPlaceId(p.id); setForm(f => ({ ...f, time: "" })); }} />
                      <span className="min-w-0">
                        <span className="block font-semibold text-primary">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.kind === "chamber" ? t("ownChamber") : t("hospital")}{p.location ? ` · ${p.location}` : ""}
                        </span>
                        <span className="block text-xs text-muted-foreground">{p.available || t("hoursNotSet")}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label required>{t("date")}</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} min={clock.today} required
                  aria-invalid={!!fieldProblem} aria-describedby={fieldProblem ? "slot-problem" : undefined} className={fieldClass} />
              </div>
              <div className="space-y-1.5">
                <Label required>{t("time")}</Label>
                {/* Bounded by the doctor's hours, and by now when the date is today. */}
                <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  min={[dayHours?.start, form.date === clock.today ? clock.nowTime : undefined].filter(Boolean).sort().pop()}
                  max={dayHours && dayHours.end !== "24:00" ? dayHours.end : undefined}
                  required
                  aria-invalid={!!fieldProblem} aria-describedby={fieldProblem ? "slot-problem" : undefined} className={fieldClass} />
              </div>
            </div>
            {schedule && !fieldProblem && (
              <p className="text-xs text-muted-foreground -mt-2">
                {t("seesPatients", { doctor: doctor.name, schedule: describeSchedule(schedule, locale) })}
              </p>
            )}
            {fieldProblem && <p id="slot-problem" role="alert" className="text-xs font-semibold text-destructive -mt-2">{fieldProblem}</p>}
            <div className="space-y-1.5">
              <Label>{t("reason")}</Label>
              <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder={t("reasonPlaceholder")} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>{tc("cancel")}</Button>
              <Button type="submit" disabled={submitting || !!fieldProblem}>{submitting ? t("booking") : t("confirm")}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookAppointmentDialog;
