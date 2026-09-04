"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTestimonials, type TestimonialAudience } from "@/data/testimonials";
import TiltCard from "@/components/site/TiltCard";

const TABS: TestimonialAudience[] = ["Patients", "Doctors", "Hospitals"];

/**
 * What people say, as a slider.
 *
 * Same shape as the hubs carousel: a track that translates by whole cards, with
 * the middle of the three on screen at full size and the two beside it set
 * back. The scale is applied to the card, never to the slot, so the translate
 * arithmetic stays whole numbers of slots.
 */
const Testimonials = () => {
  const { t: tr } = useTranslation();
  const [tab, setTab] = useState<TestimonialAudience>("Patients");
  const { items } = useTestimonials();

  const labels: Record<TestimonialAudience, string> = {
    Patients: tr("testimonials.patients"),
    Doctors: tr("testimonials.doctors"),
    Hospitals: tr("testimonials.hospitals"),
  };

  const visible = useMemo(() => items.filter(i => i.audience === tab), [items, tab]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [perView, setPerView] = useState(3);
  const total = visible.length;

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
    const id = window.setInterval(() => setIndex(i => (i >= maxIndex ? 0 : i + 1)), 5000);
    return () => window.clearInterval(id);
  }, [paused, total, perView, maxIndex]);

  // Changing tab starts the new set from the beginning, and a shorter set must
  // not leave the track parked past its own end.
  useEffect(() => { setIndex(0); }, [tab]);
  useEffect(() => { if (index > maxIndex) setIndex(0); }, [index, maxIndex]);

  const go = (n: number) => setIndex(Math.max(0, Math.min(maxIndex, n)));

  // Only meaningful three-up: with one or two on screen there is no middle, and
  // shrinking half of a pair just looks lopsided.
  const focused = perView >= 3 ? index + 1 : -1;

  return (
    <section className="container mx-auto py-24">
      <h2 className="text-center font-display text-3xl md:text-4xl text-primary">{tr("testimonials.heading")}</h2>

      <div className="flex justify-center mt-6">
        {/* White, not muted: the section sits on the page's own off-white, and
            the old muted track was near enough to it that the switch read as
            three loose buttons rather than one control. */}
        <div className="inline-flex rounded-full bg-card border border-border/60 p-1.5 gap-1 shadow-soft">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${tab === t ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"}`}>
              {labels[t]}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <p className="text-center text-sm text-muted-foreground mt-12">No testimonials yet.</p>
      ) : (
        <div
          className="relative group mt-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Vertical padding on the rail so the full-size middle card has room
              to stand taller than its neighbours without being clipped. */}
          <div className="overflow-hidden py-6">
            <div
              className="flex items-center transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${index * (100 / perView)}%)` }}
            >
              {visible.map((r, i) => (
                <div key={r.id} className="shrink-0 px-2 md:px-3" style={{ width: `${100 / perView}%` }}>
                  {/* The focus scale rides on TiltCard rather than a CSS class:
                      the transform it writes would overwrite one. */}
                  <TiltCard
                    animateIn={false}
                    lift={4}
                    scale={focused === -1 || i === focused ? 1 : 0.9}
                    className={`rounded-3xl bg-card border border-border/60 p-6 transition-[opacity,box-shadow] duration-700 ease-out ${
                      focused === -1 || i === focused ? "shadow-card opacity-100" : "shadow-soft opacity-80"
                    }`}
                  >
                    <Quote className="h-6 w-6 text-accent" strokeWidth={2.5} />
                    <p className="mt-3 text-foreground/80 leading-relaxed italic text-xs text-justify">
                      &quot;{r.text}&quot;
                    </p>
                    <div className="mt-5 flex items-center gap-3 border-t border-border/50 pt-4">
                      <img src={r.img} alt={r.name} width={48} height={48} loading="lazy" className="h-12 w-12 rounded-full object-cover" />
                      <div>
                        <div className="font-semibold text-primary">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.role}</div>
                      </div>
                    </div>
                  </TiltCard>
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

              <div className="flex justify-center gap-1.5 mt-4">
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
      )}
    </section>
  );
};
export default Testimonials;
