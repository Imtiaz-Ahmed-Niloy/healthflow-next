"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BedDouble, MapPin, Phone, Star, Stethoscope } from "lucide-react";
import { useTranslations } from "next-intl";
import TiltCard from "@/components/site/TiltCard";
import type { Hospital } from "@/data/hospitals";

/** The card's button, for an `action` that should look like the default one. */
export const HOSPITAL_CARD_BUTTON =
  "flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow group-hover/hospital:bg-primary-glow";

/**
 * One hospital, the same card everywhere a hospital is listed: the home page's
 * Verified Health Hub carousel, /hospitals, a patient's Find Hospitals, and
 * "Other hospitals" on a hospital's own page. The hospital-side twin of
 * DoctorCard — tilt, lift and entrance come from TiltCard.
 *
 * The photo fills the top half and the details sit on the card below it,
 * rather than printed over the photo: a cover we don't control can be light
 * or busy, and text laid on it is only as readable as the picture allows.
 *
 * `action` replaces the button row at the foot. `lift`, `scale` and
 * `animateIn` pass through to TiltCard for a parent that drives those itself,
 * like the carousel.
 */
export const HospitalCard = ({
  h, i = 0, action, lift, scale, animateIn = true, className = "",
}: {
  h: Hospital;
  i?: number;
  action?: ReactNode;
  lift?: number;
  scale?: number;
  animateIn?: boolean;
  className?: string;
}) => {
  const t = useTranslations("hospitalCard");
  const href = `/hospitals/${h.slug}`;
  const blurb = h.summary || h.about;
  const doctorCount = h.doctors_list.length;

  return (
    <TiltCard
      delay={Math.min(i * 0.06, 0.4)}
      lift={lift}
      scale={scale}
      animateIn={animateIn}
      // A named group, not TiltCard's plain `group`: group-hover fires for ANY
      // hovered `.group` ancestor, so inside the home carousel (itself a
      // group, for its arrows) every card's photo zoomed at once.
      className={`group/hospital relative flex h-full flex-col overflow-hidden rounded-3xl bg-card border border-border/60 shadow-soft transition-shadow duration-300 hover:shadow-card ${className}`}
    >
      <Link href={href} className="flex flex-1 flex-col">
        <div className="relative h-52 shrink-0 overflow-hidden">
          <img
            src={h.image}
            alt={h.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover/hospital:scale-110 motion-reduce:group-hover/hospital:scale-100"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent" />
          {/* Partner hospitals only; a pending one has no tag. */}
          {h.tag && (
            <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-accent/90 text-primary px-3 py-1 text-[11px] font-semibold">
              {h.tag}
            </span>
          )}
          {h.rating > 0 && (
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Star className="h-3 w-3 fill-primary-glow text-primary-glow" /> {h.rating.toFixed(1)}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-xl leading-tight text-primary line-clamp-2 transition-colors group-hover/hospital:text-primary-glow">{h.name}</h3>
          {h.location && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{h.location}</span>
            </p>
          )}
          {blurb && <p className="mt-3 text-sm leading-relaxed text-foreground/75 line-clamp-2">{blurb}</p>}

          {(h.beds > 0 || doctorCount > 0) && (
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-muted-foreground">
              {h.beds > 0 && <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{t("beds", { count: h.beds })}</span>}
              {doctorCount > 0 && <span className="inline-flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" />{t("doctors", { count: doctorCount })}</span>}
            </div>
          )}
        </div>
      </Link>

      <div className="flex items-center gap-2 px-5 pb-5">
        {action ?? (
          <>
            <Link href={href} className={HOSPITAL_CARD_BUTTON}>
              {t("view")}
              {/* Slides out of nothing as the card is hovered. */}
              <ArrowRight className="h-4 w-0 opacity-0 transition-all duration-300 group-hover/hospital:w-4 group-hover/hospital:opacity-100" />
            </Link>
            {h.phone && (
              <a href={`tel:${h.phone}`} aria-label={t("call")} title={t("call")}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/30 text-primary transition-colors hover:bg-primary/5">
                <Phone className="h-4 w-4" />
              </a>
            )}
          </>
        )}
      </div>
    </TiltCard>
  );
};

export default HospitalCard;
