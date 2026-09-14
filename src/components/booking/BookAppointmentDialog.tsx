"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
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
    if (form.date < clock.today) return "That date has already passed. Pick today or a later date.";
    const dayOrHours = outsideAvailabilityReason(schedule, form.date, form.time, doctor.name);
    if (dayOrHours) return dayOrHours;
    return form.time ? clock.pastSlotReason(form.date, form.time) : null;
  })();

  // The picked date's own hours — a week can give each day different ones.
  const dayHours = hoursOn(schedule, form.date);

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor || !place) return;
    if (!form.date || !form.time) {
      toast.error("Please pick a date and time.");
      return;
    }
    const problem = clock.pastSlotReason(form.date, form.time)
      ?? outsideAvailabilityReason(schedule, form.date, form.time, doctor.name);
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
        toast.error(body?.error?.message || "Couldn't book that appointment. Please try again.");
        return;
      }

      // Read as a calendar date at noon UTC, then printed in UTC: `new Date("2026-09-12")`
      // is midnight UTC, which a browser west of UTC would print as the 11th.
      const dateLabel = new Date(`${form.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" });
      toast.success(`Appointment requested with ${doctor.name} at ${place.name} on ${dateLabel} at ${form.time}`);
      onClose();
      router.push("/patient/appointments");
    } catch {
      toast.error("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isPatient = user?.role === "patient";

  return (
    <Dialog open={!!doctor} onOpenChange={o => !o && !submitting && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">Book Appointment</DialogTitle>
          <DialogDescription>
            {doctor ? `Schedule a consultation with ${doctor.name} (${doctor.specialty}).` : ""}
          </DialogDescription>
        </DialogHeader>

        {doctor && !sessionLoading && !user && (
          // Signed out: sign in, and land back here with this form open.
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">Sign in to your patient account to book {doctor.name}.</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button asChild>
                <Link href={`/signin?next=${encodeURIComponent(`${pathname}?book=1`)}`}>Sign in to book</Link>
              </Button>
            </DialogFooter>
          </div>
        )}

        {doctor && user && !isPatient && (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Appointments are booked from a patient account. You&apos;re signed in as staff.
            </p>
            <DialogFooter>
              <Button type="button" onClick={onClose}>OK</Button>
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
                    <Calendar className="h-3 w-3" /> Available {availabilityLabel(place.availability)}
                  </p>
                )}
              </div>
            </div>
            {doctor.places.length > 1 && (
              <div className="space-y-1.5">
                <Label required>Where</Label>
                <div className="grid gap-2">
                  {doctor.places.map(p => (
                    <label key={p.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${p.id === place?.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}>
                      <input type="radio" name="place" className="mt-1" checked={p.id === place?.id}
                        onChange={() => { setPlaceId(p.id); setForm(f => ({ ...f, time: "" })); }} />
                      <span className="min-w-0">
                        <span className="block font-semibold text-primary">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.kind === "chamber" ? "Their own chamber" : "Hospital"}{p.location ? ` · ${p.location}` : ""}
                        </span>
                        <span className="block text-xs text-muted-foreground">{p.available || "Hours not set"}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label required>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} min={clock.today} required />
              </div>
              <div className="space-y-1.5">
                <Label required>Time</Label>
                {/* Bounded by the doctor's hours, and by now when the date is today. */}
                <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  min={[dayHours?.start, form.date === clock.today ? clock.nowTime : undefined].filter(Boolean).sort().pop()}
                  max={dayHours && dayHours.end !== "24:00" ? dayHours.end : undefined}
                  required />
              </div>
            </div>
            {schedule && !slotProblem && (
              <p className="text-xs text-muted-foreground -mt-2">
                {doctor.name} sees patients {describeSchedule(schedule)}.
              </p>
            )}
            {slotProblem && <p className="text-xs font-semibold text-destructive -mt-2">{slotProblem}</p>}
            <div className="space-y-1.5">
              <Label>Reason for visit (optional)</Label>
              <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Briefly describe your symptoms or reason..." rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting || !!slotProblem}>{submitting ? "Booking..." : "Confirm Booking"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookAppointmentDialog;
