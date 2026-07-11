"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, ArrowRight, Building2, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useHospitals } from "@/hooks/useHospitals";

const Hubs = () => {
  const hospitals = useHospitals();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [perView, setPerView] = useState(3);
  const total = hospitals.length;

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setPerView(w < 640 ? 1 : w < 1024 ? 2 : 3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const maxIndex = Math.max(0, total - perView);

  useEffect(() => {
    if (paused || total <= perView) return;
    const id = window.setInterval(() => {
      setIndex(i => (i >= maxIndex ? 0 : i + 1));
    }, 4000);
    return () => window.clearInterval(id);
  }, [paused, total, perView, maxIndex]);

  useEffect(() => { if (index > maxIndex) setIndex(0); }, [index, maxIndex]);

  if (!total) return null;
  const go = (n: number) => setIndex(Math.max(0, Math.min(maxIndex, n)));

  return (
    <section id="hubs" className="container mx-auto py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="font-display text-3xl md:text-5xl text-primary">Verified Health Hub</h2>
        <p className="text-muted-foreground mt-3 text-sm">Access verified hospitals, clinics, and diagnostic centers you can trust — all in one secure platform designed to connect you with quality healthcare, faster decisions, and better patient outcomes.</p>
      </div>

      <div
        className="relative group"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="overflow-hidden rounded-3xl">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${index * (100 / perView)}%)` }}
          >
            {hospitals.map(h => (
              <div
                key={h.slug}
                className="shrink-0 px-2 md:px-3"
                style={{ width: `${100 / perView}%` }}
              >
                <Link href={`/hospitals/${h.slug}`}
                  className="block relative overflow-hidden rounded-2xl shadow-card h-[420px] group/card"
                >
                  <img
                    src={h.image}
                    alt={h.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/40 to-transparent" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end text-primary-foreground">
                    {h.tag && (
                      <span className="inline-flex w-fit items-center rounded-full bg-accent/90 text-primary px-2.5 py-1 text-[10px] font-semibold">
                        {h.tag.toUpperCase()}
                      </span>
                    )}
                    <h3 className="font-display text-2xl mt-3 line-clamp-2">{h.name}</h3>
                    <p className="text-xs opacity-90 mt-1.5 line-clamp-2">{h.summary || h.about}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[11px]">
                      {h.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{h.location}</span>}
                      {h.rating ? <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-current" />{h.rating.toFixed(1)}</span> : null}
                      {h.beds ? <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{h.beds} beds</span> : null}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {total > perView && (
          <>
            <button
              aria-label="Previous"
              onClick={() => go(index - 1)}
              className="absolute -left-2 md:-left-5 top-1/2 -translate-y-1/2 h-11 w-11 grid place-items-center rounded-full bg-card text-primary shadow-card hover:bg-primary hover:text-primary-foreground transition opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Next"
              onClick={() => go(index + 1)}
              className="absolute -right-2 md:-right-5 top-1/2 -translate-y-1/2 h-11 w-11 grid place-items-center rounded-full bg-card text-primary shadow-card hover:bg-primary hover:text-primary-foreground transition opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="flex justify-center gap-1.5 mt-6">
              {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-1.5 bg-primary/30 hover:bg-primary/60"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="text-center mt-10">
        <Link href="/hospitals"
          className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary-glow hover:shadow-card hover:-translate-y-0.5 transition-all"
        >
          <Building2 className="h-4 w-4" />
          View All Hospitals
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
};
export default Hubs;

