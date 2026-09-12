"use client";

import { ArrowRight, Calendar, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DoctorCard, DoctorCardNotBookable, DOCTOR_CARD_BUTTON } from "@/components/site/DoctorCard";
import { toast } from "sonner";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { Avatar } from "@/components/common/Avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useDoctors, type UIDoctor } from "@/hooks/useDoctors";
import { useBookingClock } from "@/lib/appSettings";
import { availabilityLabel, describeSchedule, hoursOn, outsideAvailabilityReason, parseAvailability } from "@/lib/availability";

const cats = ["All Specialties", "Cardiology", "Neurology", "Dermatology", "Pediatrics", "Psychiatry", "Oncology", "General Medicine"];

const matchesQuery = (q: string, ...fields: string[]) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return fields.some(f => f.toLowerCase().includes(s));
};

const FindDoctors = () => {
  const { doctors, loading } = useDoctors();
  const [cat, setCat] = useState(0);
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get("q") ?? "");
  const router = useRouter();
  const [booking, setBooking] = useState<UIDoctor | null>(null);
  const [form, setForm] = useState({ date: "", time: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  // Today on the hospital's clock (global settings), so a date that has
  // already passed there can't be picked however late it is in UTC.
  const clock = useBookingClock();

  // The doctor's days and hours, read from their availability (null when it
  // can't be read, in which case nothing is refused on its account).
  const schedule = useMemo(() => parseAvailability(booking?.availability), [booking]);

  /** What is wrong with the picked slot, if anything — shown under the fields as they are filled. */
  const slotProblem = (() => {
    if (!booking || !form.date) return null;
    if (form.date < clock.today) return "That date has already passed. Pick today or a later date.";
    const dayOrHours = outsideAvailabilityReason(schedule, form.date, form.time, booking.name);
    if (dayOrHours) return dayOrHours;
    return form.time ? clock.pastSlotReason(form.date, form.time) : null;
  })();

  // The picked date's own hours — a week can give each day different ones.
  const dayHours = hoursOn(schedule, form.date);

  const openBooking = (d: UIDoctor) => {
    setForm({ date: "", time: "", reason: "" });
    setBooking(d);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    if (!form.date || !form.time) {
      toast.error("Please pick a date and time.");
      return;
    }
    const problem = clock.pastSlotReason(form.date, form.time)
      ?? outsideAvailabilityReason(schedule, form.date, form.time, booking.name);
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
          doctor_id: booking.id,
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
      toast.success(`Appointment requested with ${booking.name} on ${dateLabel} at ${form.time}`);
      setBooking(null);
      router.push("/patient/appointments");
    } catch {
      toast.error("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeCat = cats[cat];
  const visible = useMemo(() => {
    return doctors.filter(d =>
      (activeCat === "All Specialties" || d.category === activeCat) &&
      matchesQuery(query, d.name, d.specialty, d.location),
    );
  }, [doctors, activeCat, query]);

  return (
    <PatientPortalLayout>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="max-w-xl">
          <h1 className="font-display text-5xl text-primary">Find Your Specialist</h1>
          <p className="text-sm text-muted-foreground mt-3">Connect with world-class medical professionals in our ecosystem of sustainable, patient-centric care.</p>
        </div>
      </div>

      <div className="mt-6 relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by doctor name, specialty or location..."
          className="w-full rounded-full bg-card border border-border pl-11 pr-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-glow"
          aria-label="Search doctors"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-chip flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        {query && (
          <p className="text-xs text-muted-foreground mt-2 ml-2">{visible.length} match{visible.length === 1 ? "" : "es"} for &quot;{query}&quot;</p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {cats.map((c, i) => (
          <button key={c} onClick={() => setCat(i)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${cat === i ? "bg-gradient-dark text-surface-dark-foreground shadow-glow" : "bg-card border border-border text-foreground/70 hover:bg-chip"}`}>{c}</button>
        ))}
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            No specialists match your search.
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {visible.map((d, i) => (
              <DoctorCard
                key={d.id}
                d={d}
                i={i}
                action={d.independent ? (
                  // An appointment belongs to a hospital; this doctor has none yet.
                  <DoctorCardNotBookable />
                ) : (
                  <button type="button" onClick={() => openBooking(d)} className={DOCTOR_CARD_BUTTON}>
                    Book Appointment
                    <ArrowRight className="h-4 w-0 opacity-0 transition-all duration-300 group-hover:w-4 group-hover:opacity-100" />
                  </button>
                )}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!booking} onOpenChange={(o) => !o && !submitting && setBooking(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary">Book Appointment</DialogTitle>
            <DialogDescription>
              {booking ? `Schedule a consultation with ${booking.name} (${booking.specialty}).` : ""}
            </DialogDescription>
          </DialogHeader>
          {booking && (
            <form onSubmit={handleConfirm} className="space-y-4 mt-2">
              <div className="flex items-center gap-3 rounded-xl bg-chip/40 p-3">
                <Avatar src={booking.img} name={booking.name} className="h-12 w-12 text-base" />
                <div>
                  <p className="font-semibold text-primary text-sm">{booking.name}</p>
                  <p className="text-xs text-primary-glow">{booking.specialty} · {booking.hospital.name}</p>
                  {booking.availability && (
                    <p className="text-xs text-foreground/70 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Available {availabilityLabel(booking.availability)}
                    </p>
                  )}
                </div>
              </div>
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
                  {booking.name} sees patients {describeSchedule(schedule)}.
                </p>
              )}
              {slotProblem && <p className="text-xs font-semibold text-destructive -mt-2">{slotProblem}</p>}
              <div className="space-y-1.5">
                <Label>Reason for visit (optional)</Label>
                <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Briefly describe your symptoms or reason..." rows={3} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBooking(null)} disabled={submitting}>Cancel</Button>
                <Button type="submit" disabled={submitting || !!slotProblem}>{submitting ? "Booking..." : "Confirm Booking"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PatientPortalLayout>
  );
};
export default FindDoctors;
