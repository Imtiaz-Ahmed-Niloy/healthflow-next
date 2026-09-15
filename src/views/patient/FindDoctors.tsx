"use client";

import { ArrowRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DoctorCard, DoctorCardNotBookable, DOCTOR_CARD_BUTTON } from "@/components/site/DoctorCard";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { BookAppointmentDialog } from "@/components/booking/BookAppointmentDialog";
import { useDoctors, type UIDoctor } from "@/hooks/useDoctors";
import { useSpecialties } from "@/hooks/useSpecialties";

const ALL = "All Specialties";

const matchesQuery = (q: string, ...fields: string[]) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return fields.some(f => f.toLowerCase().includes(s));
};

const FindDoctors = () => {
  const { doctors, loading } = useDoctors();
  // The specialties list (0093) — the one a doctor's specialty is picked from.
  const { specialties } = useSpecialties();
  const cats = useMemo(() => [ALL, ...specialties], [specialties]);
  const [cat, setCat] = useState(0);
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get("q") ?? "");
  // The doctor whose booking form is open — the shared one (BookAppointmentDialog).
  const [booking, setBooking] = useState<UIDoctor | null>(null);
  const openBooking = (d: UIDoctor) => setBooking(d);

  const activeCat = cats[cat] ?? ALL;
  const visible = useMemo(() => {
    return doctors.filter(d =>
      (activeCat === ALL || d.category === activeCat) &&
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

      <div className="mt-6 max-w-2xl">
        {/* The icons centre on this box alone — not on the match count below,
            which appears with a search and used to pull them down. */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by doctor name, specialty or location..."
            className="w-full rounded-full bg-card border border-border pl-11 pr-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-glow [&::-webkit-search-cancel-button]:appearance-none"
            aria-label="Search doctors"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-chip flex items-center justify-center">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
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

      <BookAppointmentDialog doctor={booking} onClose={() => setBooking(null)} />
    </PatientPortalLayout>
  );
};
export default FindDoctors;
