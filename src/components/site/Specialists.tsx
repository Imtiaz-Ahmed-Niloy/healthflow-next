"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { ArrowRight, FilterX } from "lucide-react";
import { useDoctorSearch } from "@/hooks/useDoctors";
import { useNearbyArea } from "@/hooks/useNearbyArea";
import { NearbyLine } from "@/components/site/NearbyControls";
import { DoctorCard } from "@/components/site/DoctorCard";
import { useTranslations } from "next-intl";
import { gradient } from "@/components/site/GradientWords";
import { motion } from "framer-motion";
import { titleReveal } from "@/components/site/titleReveal";

type SpecialistsProps = {
  division?: string;
  zilla?: string;
  upazila?: string;
  specialty?: string;
};

const Specialists = forwardRef<HTMLElement, SpecialistsProps>(
  ({ division, zilla, upazila, specialty }, ref) => {
    const t = useTranslations("specialists");
    // The first eight that match, searched in the database (0116): partners
    // first, then doctors with a photo.
    const activeFilterCount = [division, zilla, upazila, specialty].filter(Boolean).length;

    // With nothing chosen, nearest first: the visitor's own district — the one
    // they gave (useNearbyArea), when they have given one — then the
    // rest of their division, then everyone (0120). An ordering, so a district
    // with one doctor still fills the row. A chosen filter always wins.
    const { area, loading: locating } = useNearbyArea();
    const near = activeFilterCount === 0 ? area : null;

    const { doctors: visible, loading: searching } = useDoctorSearch(
      near
        ? { sort: "nearest", nearDivision: near.division, nearDistrict: near.district ?? undefined }
        : { specialty, division, district: zilla, upazila },
      8,
    );
    // Waiting on the guess too, or the whole directory would flash up first.
    const loading = searching || (locating && activeFilterCount === 0);

    return (
      <section id="features" ref={ref} className="container mx-auto py-20">
        <div className="mb-10">
          <motion.h2 {...titleReveal} className="font-display text-3xl md:text-4xl text-primary">{t.rich("heading", gradient)}</motion.h2>
        </div>

        {activeFilterCount > 0 && (
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <FilterX className="h-4 w-4" />
            <span>
              {t("showing", {
                count: visible.length,
                filters: [specialty, upazila, zilla, division].filter(Boolean).join(" "),
              })}
            </span>
          </div>
        )}

        {activeFilterCount === 0 && !loading && <NearbyLine className="mb-6" />}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            {t("none")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {visible.map((d, i) => (
              <DoctorCard key={d.id} d={d} i={i} />
            ))}
          </div>
        )}
        <div className="mt-8 flex justify-end">
          <Link href="/doctors" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all">{t("viewAll")} <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    );
  }
);

Specialists.displayName = "Specialists";
export default Specialists;
