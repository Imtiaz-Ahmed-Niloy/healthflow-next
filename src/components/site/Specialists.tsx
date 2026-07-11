"use client";

import { forwardRef, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Calendar, Video, ArrowRight, MapPin, FilterX } from "lucide-react";
import { slugify } from "@/lib/slug";
import { doctors } from "@/data/doctors";

type SpecialistsProps = {
  division?: string;
  zilla?: string;
  upazila?: string;
  specialty?: string;
};

const Specialists = forwardRef<HTMLElement, SpecialistsProps>(
  ({ division, zilla, upazila, specialty }, ref) => {
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
    }, [division, zilla, upazila, specialty]);

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

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            No specialists match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {visible.map((d, i) => (
              <motion.article key={d.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-3xl bg-card border border-border/60 p-5 shadow-soft hover:shadow-card transition-all hover:-translate-y-1">
                <div className="flex items-start gap-3">
                  <img src={d.img} alt={d.name} width={64} height={64} loading="lazy" className="h-16 w-16 rounded-full object-cover" />
                  <div>
                    <h3 className="font-display text-lg leading-tight text-primary">{d.name}</h3>
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
                <div className="mt-4 flex gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] text-foreground/80"><Calendar className="h-3 w-3" />{d.date}, {d.time}</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent/40 px-2 py-1 text-[11px] text-primary">
                    {d.mode === "Telehealth" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}{d.mode}
                  </span>
                </div>
                <Link href={`/doctors/${slugify(d.name)}`} className="mt-5 block text-center w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">Book Appointment</Link>
              </motion.article>
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

