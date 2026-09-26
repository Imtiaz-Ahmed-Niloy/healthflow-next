"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { useHospitals } from "@/hooks/useHospitals";
import { HospitalCard } from "@/components/site/HospitalCard";
import { useTranslations } from "next-intl";
import { gradient } from "@/components/site/GradientWords";
import { motion } from "framer-motion";
import { titleReveal } from "@/components/site/titleReveal";

const Hubs = () => {
  const t = useTranslations("hubs");
  const tc = useTranslations("common");
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

  // Swipe on touch screens, where the arrows are hidden. As in Testimonials:
  // a mostly sideways drag of 40px or more moves one card, anything more
  // vertical is left to scroll the page, and autoplay holds while a finger is down.
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  if (!total) return null;
  const go = (n: number) => setIndex(Math.max(0, Math.min(maxIndex, n)));

  const onTouchStart = (e: React.TouchEvent) => {
    const p = e.touches[0];
    touchStart.current = { x: p.clientX, y: p.clientY };
    setPaused(true);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    setPaused(false);
    if (!start) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - start.x;
    const dy = p.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    go(dx < 0 ? index + 1 : index - 1);
  };

  // The card in the middle of the three on screen. Only meaningful three-up:
  // with one or two showing there is no middle to single out, and shrinking
  // half of a two-card row would just look lopsided.
  const focused = perView >= 3 ? index + 1 : -1;

  return (
    <section id="hubs" className="container mx-auto py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <motion.h2 {...titleReveal} className="font-display text-3xl md:text-5xl text-primary">{t.rich("heading", gradient)}</motion.h2>
        <p className="text-muted-foreground mt-3 text-sm">{t("description")}</p>
      </div>

      <div
        className="relative group"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => { touchStart.current = null; setPaused(false); }}
      >
        <div className="overflow-hidden rounded-3xl">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${index * (100 / perView)}%)` }}
          >
            {hospitals.map((h, i) => (
              <div
                key={h.slug}
                className="shrink-0 px-2 md:px-3"
                style={{ width: `${100 / perView}%` }}
              >
                {/* The middle card stands at full size; the two beside it sit
                    back a little, so the eye is told where to look. Scaling
                    rather than resizing keeps the track arithmetic — and the
                    translate that drives it — exactly as it was. */}
                <HospitalCard
                  h={h}
                  animateIn={false}
                  lift={0}
                  scale={focused === -1 || i === focused ? 1 : 0.88}
                  className={`transition-opacity duration-700 ease-out ${focused === -1 || i === focused ? "opacity-100" : "opacity-80"}`}
                />
              </div>
            ))}
          </div>
        </div>

        {total > perView && (
          <>
            {/* Arrows only where there is a mouse to hover with: on a phone a
                tap left them stuck on screen over the cards. Touch swipes. */}
            <button
              aria-label={tc("previous")}
              onClick={() => go(index - 1)}
              className="absolute -left-2 md:-left-5 top-1/2 -translate-y-1/2 h-11 w-11 hidden [@media(hover:hover)]:grid place-items-center rounded-full bg-card text-primary shadow-card hover:bg-primary hover:text-primary-foreground transition opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label={tc("next")}
              onClick={() => go(index + 1)}
              className="absolute -right-2 md:-right-5 top-1/2 -translate-y-1/2 h-11 w-11 hidden [@media(hover:hover)]:grid place-items-center rounded-full bg-card text-primary shadow-card hover:bg-primary hover:text-primary-foreground transition opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="flex justify-center gap-1.5 mt-6">
              {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  aria-label={tc("goToSlide", { n: i + 1 })}
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
          {t("viewAll")}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
};
export default Hubs;

