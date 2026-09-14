"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarClock, GraduationCap, MapPin, Star } from "lucide-react";
import TiltCard from "@/components/site/TiltCard";
import { Avatar } from "@/components/common/Avatar";
import type { UIDoctor } from "@/hooks/useDoctors";

/** The card's button, for an `action` that should look like the default one. */
export const DOCTOR_CARD_BUTTON =
  "mt-5 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow group-hover:bg-primary-glow";

/**
 * One doctor, the same card everywhere a doctor is listed: the home page's
 * Find Your Specialist, /doctors, and a patient's Find Doctors. The tilt, the
 * lift and the entrance come from TiltCard; the photo's ring, the brand wash
 * and the arrow on the button come alive on the card's hover.
 *
 * `action` replaces the button at the foot — a patient's opens the booking
 * form in place, and says Book Appointment because it does. Left out, the
 * button is View Profile: it goes to the doctor's profile, which is where a
 * visitor books from.
 */
export const DoctorCard = ({ d, i = 0, action }: { d: UIDoctor; i?: number; action?: ReactNode }) => (
  <TiltCard
    delay={Math.min(i * 0.06, 0.4)}
    className="relative flex h-full flex-col rounded-3xl bg-card border border-border/60 p-5 shadow-soft transition-shadow duration-300 hover:shadow-card"
  >
    {/* A wash of the brand green that fades in behind the content. -z-10 and
        inset so it colours the card without touching the text on it. */}
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-accent/25 via-transparent to-chip/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

    <Link href={`/doctors/${d.slug}`} className="block flex-1">
      <div className="flex items-start gap-3">
        {/* The photo pushes in slightly and picks up a ring: enough to say the
            card is live, not enough to jump. */}
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-transparent transition-all duration-300 group-hover:ring-accent">
          <Avatar src={d.img} name={d.name} className="h-full w-full text-lg transition-transform duration-500 group-hover:scale-110 motion-reduce:group-hover:scale-100" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-tight text-primary group-hover:text-primary-glow transition-colors">{d.name}</h3>
          <p className="text-xs font-semibold text-primary-glow mt-0.5">{d.specialty}</p>
          <div className="flex items-center gap-1 mt-1.5 text-xs text-foreground/70">
            <Star className="h-3 w-3 fill-primary-glow text-primary-glow" />
            <span className="font-semibold">{d.rating}</span>
            <span className="text-muted-foreground">({d.reviews} reviews)</span>
          </div>
        </div>
      </div>
      {/* Every place they practise — one card however many (0090). */}
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {(d.places.length ? d.places : [{ id: d.id, name: d.hospital.name, location: d.location }]).map(p => (
          <p key={p.id} className="flex items-start gap-1">
            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{p.name}{p.location ? ` · ${p.location}` : ""}</span>
          </p>
        ))}
      </div>

      {/* Their degrees, where a description used to be — nobody reads a
          paragraph on a card, but "MBBS, FCPS" is what a patient looks for. */}
      {d.education && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-foreground/75">
          <GraduationCap className="h-3.5 w-3.5 mt-px shrink-0 text-primary-glow" />
          <span className="line-clamp-2">{d.education}</span>
        </p>
      )}

      {/* Their areas of expertise — the first few, and how many more. */}
      {d.expertise.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {d.expertise.slice(0, 3).map(t => (
            <span key={t} className="rounded-full bg-accent/40 px-2 py-0.5 text-[11px] font-medium text-primary">{t}</span>
          ))}
          {d.expertise.length > 3 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">+{d.expertise.length - 3}</span>
          )}
        </div>
      )}

      {/* Availability: a block per place, each named when there's more than
          one. A week reads as "Sun–Thu 9:00 AM–5:00 PM · Sat …", so it gets
          the full width and a single line, with all of it in the title when
          it is too long to show. */}
      <div className="mt-4 space-y-2">
        {(d.places.length > 1 ? d.places : [null]).map(p => (
          <div key={p?.id ?? "one"} className="flex items-center gap-3 rounded-xl border border-accent/50 bg-accent/25 px-3 py-2.5">
            <CalendarClock className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.75} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-widest text-primary/70 leading-none">AVAILABLE</p>
              {/* The hours lead, as on a card with one place; where is underneath, quieter. */}
              <p className="mt-1 truncate text-xs font-semibold text-primary"
                title={p ? p.available || "Hours not set" : d.available}>
                {p ? p.available || "Hours not set" : d.available}
              </p>
              {p && <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={p.name}>{p.name}</p>}
            </div>
          </div>
        ))}
      </div>
    </Link>

    {/* It goes to their profile — so it says so. Booking is on the profile,
        where every place they practise, and its hours, is listed. */}
    {action ?? (
      <Link href={`/doctors/${d.slug}`} className={DOCTOR_CARD_BUTTON}>
        View Profile
        {/* Slides out of nothing as the card is hovered. */}
        <ArrowRight className="h-4 w-0 opacity-0 transition-all duration-300 group-hover:w-4 group-hover:opacity-100" />
      </Link>
    )}
  </TiltCard>
);

/** The note in place of the button for a doctor at no hospital or chamber yet — nothing to book. */
export const DoctorCardNotBookable = () => (
  <p className="mt-5 w-full rounded-full border border-border py-2.5 text-center text-xs font-semibold text-muted-foreground">
    Not taking bookings on HealthFlow yet
  </p>
);

export default DoctorCard;
