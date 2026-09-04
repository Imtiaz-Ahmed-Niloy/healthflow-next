"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { HomeContent } from "@/data/homeContent";

/**
 * The pictures the hero cycles through, in order.
 *
 * Photographs, licensed for commercial use (Pexels License). Each one is
 * served at two widths from public/assets/hero/ — 1600 for ordinary screens,
 * 2400 for dense ones — cropped 4:3 to match the frame below and encoded as
 * WebP, which is what keeps them around 60KB apiece.
 *
 * Replacing one: crop 4:3, export both widths as `<name>-1600.webp` and
 * `<name>-2400.webp`, and keep nothing important near the top or bottom edge,
 * which is where the frame cuts on narrow screens.
 */
const HERO_IMAGES = [
  { name: "doctor", alt: "A doctor in a white coat with a stethoscope" },
  { name: "diagnostic", alt: "A CT scanner in a hospital imaging room" },
  { name: "microscope", alt: "A microscope and workstation on a clinical laboratory bench" },
  { name: "infusion", alt: "A nurse setting the rate on an infusion pump beside a patient monitor" },
  { name: "corridor", alt: "A bright hospital corridor lined with clinical departments" },
];

/** Both widths of one picture, as the `src`/`srcSet` pair an `img` wants. */
const sources = (name: string) => ({
  src: `/assets/hero/${name}-1600.webp`,
  srcSet: `/assets/hero/${name}-1600.webp 1600w, /assets/hero/${name}-2400.webp 2400w`,
});

/** The image column is half the page on large screens and all of it below. */
const SIZES = "(min-width: 1024px) 50vw, 100vw";

/**
 * The crossfade, shared by the picture and its reflection.
 *
 * One constant on purpose: the reflection has to move with the thing it is
 * reflecting, and when the two carried their own copies of this the reflection
 * swapped instantly while the picture was still fading.
 */
const CROSSFADE = { duration: 0.9, ease: "easeInOut" } as const;

/** How long each picture holds before the next one fades in. */
const SLIDE_MS = 5000;

const Hero = ({ content }: { content: HomeContent }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  // It advances on its own, stops while the pointer is on it, and never moves
  // at all for someone whose system asks for less motion — a picture that
  // changes under you while you read is the thing they turned off.
  useEffect(() => {
    if (reduceMotion || paused || HERO_IMAGES.length < 2) return;
    const timer = setTimeout(() => setIndex(i => (i + 1) % HERO_IMAGES.length), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [index, paused, reduceMotion]);

  const active = HERO_IMAGES[index];

  return (
    // Fills the screen below the sticky navbar, which is ~5rem of it. svh, not
    // vh: on phones vh counts the browser chrome that is not actually there,
    // and the hero would run off the bottom.
    <section className="container mx-auto flex min-h-[calc(100svh-5rem)] items-center py-10 lg:py-14">
      <div className="grid w-full lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* whitespace-pre-line so the break the editor typed is the break that
              renders — the headline is written as lines, not left to the browser.
              The sizes step down at lg because the column halves there: the type
              is as large as the longest line can be without wrapping again. */}
          <h1 className="mt-6 font-display text-4xl md:text-6xl lg:text-[2.7rem] xl:text-[3.4rem] 2xl:text-[3.8rem] leading-[1.05] text-primary whitespace-pre-line">
            {content.heroTitle1}
            {content.heroTitle2 && (
              <>
                {" "}
                <span className="italic text-primary-glow text-4xl">
                  {content.heroTitle2}
                </span>
              </>
            )}
          </h1>
          <p className="mt-6 text-base text-muted-foreground max-w-xl leading-relaxed md:text-base text-justify">
            {content.heroDesc}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/patient/find-doctors"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-all hover:shadow-card"
            >
              {content.heroBookCta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/hospitals"
              className="inline-flex items-center rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-primary hover:bg-muted transition-colors"
            >
              {content.heroExploreCta}
            </Link>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="relative"
        >
          {/* The slider itself. Fixed aspect box so the page never reflows as
              slides change, and the images crossfade rather than slide sideways
              — a sideways move under a headline reads as a glitch. */}
          <div
            className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden shadow-card"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <AnimatePresence initial={false}>
              <motion.img
                key={active.name}
                {...sources(active.name)}
                sizes={SIZES}
                alt={active.alt}
                width={1600}
                height={1200}
                // The first slide is the largest thing above the fold, so it is
                // the LCP: fetch it ahead of the rest rather than lazily.
                fetchPriority={index === 0 ? "high" : "auto"}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={CROSSFADE}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </AnimatePresence>
          </div>

          {/* The reflection: the same picture flipped under itself, faded out
              with a mask so it reads as a surface rather than a second image.
              aria-hidden and empty alt — there is nothing here to announce. */}
          <div
            aria-hidden
            className="pointer-events-none select-none relative mt-2 h-24 md:h-32 overflow-hidden rounded-[2rem] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]"
          >
            {/* Flipped about its centre, then clipped to this strip: what shows
                is the bottom of the picture, mirrored — the way a reflection
                falls. Flipping about an edge would push it out of the box.

                The flip lives in scaleY rather than a -scale-y-100 class
                because motion writes the whole transform: a class here would
                be overwritten the moment the crossfade set a scale, and the
                reflection would land the right way up. Both axes carry the
                same 1.04 so the zoom stays square while y stays negative. */}
            <AnimatePresence initial={false}>
              <motion.img
                key={active.name}
                {...sources(active.name)}
                sizes={SIZES}
                alt=""
                width={1600}
                height={1200}
                initial={{ opacity: 0, scaleX: 1.04, scaleY: -1.04 }}
                animate={{ opacity: 1, scaleX: 1, scaleY: -1 }}
                exit={{ opacity: 0 }}
                transition={CROSSFADE}
                className="absolute inset-x-0 top-0 w-full aspect-[4/3] object-cover blur-[1px]"
              />
            </AnimatePresence>
          </div>

          <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-accent/40 blur-3xl" />
        </motion.div>
      </div>
    </section>
  );
};
export default Hero;
