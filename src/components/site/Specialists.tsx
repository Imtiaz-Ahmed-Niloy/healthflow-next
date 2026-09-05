"use client";

import { forwardRef, useMemo } from "react";
import Link from "next/link";
import TiltCard from "@/components/site/TiltCard";
import { Star, CalendarClock, Video, ArrowRight, MapPin, FilterX } from "lucide-react";
import { useDoctors, type UIDoctor } from "@/hooks/useDoctors";

type SpecialistsProps = {
  division?: string;
  zilla?: string;
  upazila?: string;
  specialty?: string;
};

/**
 * One doctor. The tilt, the lift and the entrance all come from TiltCard.
 */
const SpecialistCard = ({ d, i }: { d: UIDoctor; i: number }) => (
  <TiltCard
    delay={i * 0.08}
    className="relative rounded-3xl bg-card border border-border/60 p-5 shadow-soft transition-shadow duration-300 hover:shadow-card"
  >
    {/* A wash of the brand green that fades in behind the content. -z-10 and
        inset so it colours the card without touching the text on it. */}
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-accent/25 via-transparent to-chip/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <Link href={`/doctors/${d.slug}`} className="block">
        <div className="flex items-start gap-3">
          {/* The photo pushes in slightly and picks up a ring: enough to say the
              card is live, not enough to jump. */}
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-transparent transition-all duration-300 group-hover:ring-accent">
            <img src={d.img} alt={d.name} width={64} height={64} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 motion-reduce:group-hover:scale-100" />
          </div>
          <div>
            <h3 className="font-display text-lg leading-tight text-primary group-hover:text-primary-glow transition-colors">{d.name}</h3>
            <p className="text-xs font-semibold text-primary-glow mt-0.5">{d.specialty}</p>
            <div className="flex items-center gap-1 mt-1.5 text-xs text-foreground/70">
              <Star className="h-3 w-3 fill-primary-glow text-primary-glow" />
              <span className="font-semibold">{d.rating}</span>
              <span className="text-muted-foreground">({d.reviews} reviews)</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {d.location}
        </div>
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{d.blurb}</p>

        {/* Availability, on its own row. The hours come from the hospital as
            free text — "Saturday to Wednesday, 10:00 AM to 4:00 PM" — so they
            get the full width of the card and a single line; the title carries
            the whole string when it is too long to show. d.date is literally
            the word "Available" (see useDoctors), which is why it is not
            printed here: the label above already says it. */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-accent/50 bg-accent/25 px-3 py-2.5">
          <CalendarClock className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.75} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-widest text-primary/70 leading-none">AVAILABLE</p>
            <p className="mt-1 truncate text-xs font-semibold text-primary" title={d.available}>
              {d.available}
            </p>
          </div>
        </div>

        {d.mode === "Telehealth" && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] text-foreground/80">
            <Video className="h-3 w-3" /> Telehealth
          </div>
        )}
      </Link>

      <Link href={`/doctors/${d.slug}`} className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow group-hover:bg-primary-glow">
        Book Appointment
        {/* Slides out of nothing as the card is hovered. */}
        <ArrowRight className="h-4 w-0 opacity-0 transition-all duration-300 group-hover:w-4 group-hover:opacity-100" />
      </Link>
  </TiltCard>
);

const Specialists = forwardRef<HTMLElement, SpecialistsProps>(
  ({ division, zilla, upazila, specialty }, ref) => {
    const { doctors, loading } = useDoctors();

    const visible = useMemo(() => {
      let result = doctors;
      if (specialty) {
        result = result.filter((d) => d.category === specialty);
      }
      if (division) {
        result = result.filter((d) =>
          d.location.toLowerCase().includes(division.toLowerCase())
        );
      }
      if (zilla) {
        result = result.filter((d) =>
          d.location.toLowerCase().includes(zilla.toLowerCase())
        );
      }
      if (upazila) {
        result = result.filter((d) =>
          d.location.toLowerCase().includes(upazila.toLowerCase())
        );
      }
      return result.slice(0, 8);
    }, [doctors, division, zilla, upazila, specialty]);

    const activeFilterCount = [division, zilla, upazila, specialty].filter(Boolean).length;

    return (
      <section id="features" ref={ref} className="container mx-auto py-20">
        <div className="mb-10">
          <h2 className="font-display text-3xl md:text-4xl text-primary">Find Your Specialist</h2>
        </div>

        {activeFilterCount > 0 && (
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <FilterX className="h-4 w-4" />
            <span>
              Showing {visible.length} result{visible.length !== 1 ? "s" : ""} for{" "}
              {[specialty, upazila, zilla, division].filter(Boolean).join(" ")}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            No specialists match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {visible.map((d, i) => (
              <SpecialistCard key={d.name} d={d} i={i} />
            ))}
          </div>
        )}
        <div className="mt-8 flex justify-end">
          <Link href="/doctors" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all">View All Doctors <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    );
  }
);

Specialists.displayName = "Specialists";
export default Specialists;
