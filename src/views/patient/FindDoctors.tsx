"use client";

import { motion } from "framer-motion";
import { Star, Calendar, MapPin, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useDoctors, type UIDoctor } from "@/hooks/useDoctors";

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

      const dateLabel = new Date(form.date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
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
              <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.06, 0.4) }}
                whileHover={{ y: -3 }} className="rounded-2xl bg-card border border-border/60 p-5 shadow-soft">
                <Link href={`/doctors/${d.slug}`} className="flex gap-4">
                  <img src={d.img} alt={d.name} loading="lazy" width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-primary">{d.name}</p>
                    <p className="text-xs text-primary-glow font-semibold">{d.specialty}</p>
                    <p className="text-xs text-foreground/70 mt-1 flex items-center gap-1"><Star className="h-3 w-3 fill-accent text-accent" /> {d.rating} <span className="text-muted-foreground">({d.reviews} reviews)</span></p>
                  </div>
                </Link>
                <p className="text-xs text-foreground/70 mt-4 line-clamp-2">{d.blurb}</p>
                <div className="flex gap-2 mt-4 flex-wrap">
                  <span className="flex items-center gap-1 text-xs bg-chip rounded-full px-3 py-1.5 text-primary"><Calendar className="h-3 w-3" /> {d.available}</span>
                  <span className="flex items-center gap-1 text-xs bg-chip rounded-full px-3 py-1.5 text-primary"><MapPin className="h-3 w-3" /> {d.hospital.name}</span>
                </div>
                <button onClick={() => openBooking(d)} className="mt-5 block text-center w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-2.5 text-sm font-semibold shadow-glow hover:opacity-90">Book Appointment</button>
              </motion.div>
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
                <img src={booking.img} alt={booking.name} className="h-12 w-12 rounded-full object-cover" />
                <div>
                  <p className="font-semibold text-primary text-sm">{booking.name}</p>
                  <p className="text-xs text-primary-glow">{booking.specialty} · {booking.hospital.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} min={new Date().toISOString().split("T")[0]} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Time</Label>
                  <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Reason for visit (optional)</Label>
                <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Briefly describe your symptoms or reason..." rows={3} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBooking(null)} disabled={submitting}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? "Booking..." : "Confirm Booking"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PatientPortalLayout>
  );
};
export default FindDoctors;
