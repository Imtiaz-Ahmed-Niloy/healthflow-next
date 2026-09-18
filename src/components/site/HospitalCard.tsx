"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Award, BedDouble, MapPin, Phone, Star, Stethoscope } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Hospital } from "@/data/hospitals";

/**
 * One hospital as a card, for the patient's Find Hospitals page — the public
 * /hospitals list's card, with a real Call link and the doctor count. Opens
 * the hospital's own page.
 */

const SHOWN_SPECIALTIES = 4;

export const HospitalCard = ({ h, i = 0 }: { h: Hospital; i?: number }) => {
  const t = useTranslations("hospitalCard");
  const extra = h.specialties.length - SHOWN_SPECIALTIES;

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(i, 8) * 0.06 }}
      className="group flex flex-col rounded-3xl overflow-hidden bg-card border border-border/60 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={h.image}
          alt={h.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent" />
        <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-accent/90 text-primary px-3 py-1 text-[11px] font-semibold">
          {h.tag}
        </span>
        {h.rating > 0 && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <Star className="h-3 w-3 fill-primary-glow text-primary-glow" /> {h.rating}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl text-primary leading-tight">{h.name}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
          {h.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{h.location}</span>}
          <span className="inline-flex items-center gap-1"><Award className="h-3 w-3" />{h.cert}</span>
        </div>
        {h.summary && <p className="text-sm text-foreground/75 mt-3 leading-relaxed line-clamp-3">{h.summary}</p>}
        {h.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {h.specialties.slice(0, SHOWN_SPECIALTIES).map((s) => (
              <span key={s} className="text-[10px] font-medium px-2 py-1 rounded-full bg-muted text-foreground/70">
                {s}
              </span>
            ))}
            {extra > 0 && <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-muted text-foreground/70">+{extra}</span>}
          </div>
        )}
        <div className="mt-auto">
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/60 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{t("beds", { count: h.beds })}</span>
            <span className="inline-flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" />{t("doctors", { count: h.doctors_list.length })}</span>
            {h.phone ? (
              <a href={`tel:${h.phone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3.5 w-3.5" />{t("call")}</a>
            ) : (
              <span className="inline-flex items-center gap-1 opacity-50"><Phone className="h-3.5 w-3.5" />{t("noPhone")}</span>
            )}
          </div>
          <Link href={`/hospitals/${h.slug}`} className="mt-4 block text-center w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">
            {t("view")}
          </Link>
        </div>
      </div>
    </motion.article>
  );
};

export default HospitalCard;
