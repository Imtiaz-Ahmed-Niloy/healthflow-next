"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { useRef } from "react";
import * as Icons from "lucide-react";
import { Quote } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
const heroImg = "/assets/about-hero.jpg";
import type { CmsHeroFields } from "@/data/cmsPageHero";
import type { AboutContent, JourneyStep } from "@/data/aboutContent";
import TiltCard from "@/components/site/TiltCard";

const Ico = ({ name, className }: { name: string; className?: string }) => {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? Icons.Sparkles;
  return <C className={className} />;
};

/**
 * The journey, as a timeline that builds as you scroll.
 *
 * The line is not decoration: it draws downward in step with the section's own
 * scroll progress, so the story is being written as it is read. Each entry
 * arrives from the side it lives on, and its marker lands a beat later.
 *
 * All of it collapses to a plain fade for anyone who asked their system for
 * less motion — a page that slides four blocks past you is exactly what that
 * setting exists to stop.
 */
const JourneyTimeline = ({ steps }: { steps: JourneyStep[] }) => {
  const railRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Starts filling as the rail enters the lower part of the window and is done
  // before its end leaves the top, so the line never lags behind the last card.
  const { scrollYProgress } = useScroll({
    target: railRef,
    offset: ["start 75%", "end 55%"],
  });
  const drawn = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.001 });

  return (
    <div ref={railRef} className="relative mt-16 max-w-4xl mx-auto">
      {/* The track, and the line that fills it. */}
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />
      <motion.div
        aria-hidden
        style={{ scaleY: reduceMotion ? 1 : drawn }}
        className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px origin-top bg-gradient-to-b from-primary via-primary-glow to-accent md:-translate-x-px"
      />

      {steps.map((step, i) => {
        const leftSide = i % 2 === 0;
        return (
          <motion.div
            key={`${step.year}-${i}`}
            initial={{ opacity: 0, x: reduceMotion ? 0 : leftSide ? -40 : 40, y: reduceMotion ? 16 : 0 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={`group relative flex gap-6 md:gap-0 mb-10 last:mb-0 ${leftSide ? "md:flex-row" : "md:flex-row-reverse"}`}
          >
            {/* The marker: one solid dot in the brand gradient, inside a white
                ring that separates it from the line running behind it. Three
                nested circles were doing the same job and looked like a target.

                Three elements, each with one responsibility: the outer span
                positions (framer overwrites the transform of anything it
                animates, which is how this ended up beside the line rather than
                on it), the middle one springs in, the inner one is the dot and
                owns the hover. */}
            <span aria-hidden className="absolute left-4 md:left-1/2 top-2 z-10 -translate-x-1/2">
              <motion.span
                className="block"
                initial={reduceMotion ? undefined : { scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.18 }}
              >
                <span className="block h-3.5 w-3.5 rounded-full bg-gradient-to-br from-primary to-primary-glow ring-4 ring-card shadow-[0_2px_10px_hsl(158_55%_18%/0.35)] transition-transform duration-300 group-hover:scale-125" />
              </motion.span>
            </span>

            <div className={`pl-12 md:pl-0 md:w-1/2 ${leftSide ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
              {/* A card, so each step is an object on the line rather than loose
                  text beside it — and something for the hover to answer to. */}
              <TiltCard animateIn={false} maxTilt={6} lift={4} className="rounded-2xl bg-card border border-border/60 p-5 shadow-soft transition-shadow duration-300 hover:shadow-card">
                <span className="inline-block rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold tracking-wide mb-2">
                  {step.year}
                </span>
                <h4 className="font-display text-lg text-primary">{step.title}</h4>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
              </TiltCard>
            </div>
            <div className="hidden md:block md:w-1/2" />
          </motion.div>
        );
      })}
    </div>
  );
};

const SectionHeader = ({ title, subtitle, centered = true, light = false }: { title: string; subtitle?: string; centered?: boolean; light?: boolean }) => (
  <div className={`${centered ? "text-center" : ""} max-w-2xl ${centered ? "mx-auto" : ""}`}>
    <h2 className={`font-display text-3xl md:text-5xl ${light ? "text-white" : "text-primary"} leading-tight`}>{title}</h2>
    {subtitle && <p className={`mt-4 ${light ? "text-white/70" : "text-muted-foreground"} max-w-lg ${centered ? "mx-auto" : ""}`}>{subtitle}</p>}
  </div>
);

const About = ({ hero, content }: { hero: CmsHeroFields; content: AboutContent }) => {
  const { pillars, journey, ceoMessage, vision, mission, objectives } = content;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="container mx-auto pt-8">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}
            className="relative rounded-3xl overflow-hidden">
            <img src={heroImg} alt="HealthFlow clinical environment" width={1600} height={900} className="w-full h-[460px] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/10" />
            <div className="absolute inset-0 p-8 md:p-14 flex flex-col justify-center max-w-2xl">
              <h1 className="font-display text-4xl md:text-6xl text-primary mt-4 leading-tight">{hero.title}</h1>
              <p className="mt-5 text-muted-foreground max-w-md">{hero.description}</p>
            </div>
          </motion.div>
        </section>

        {/* Vision & Mission - dual cards */}
        <section className="container mx-auto py-20">
          <SectionHeader title="Why We Exist" />
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <TiltCard maxTilt={6} lift={5}
              className="relative flex flex-col overflow-hidden rounded-3xl bg-gradient-dark text-surface-dark-foreground p-8 md:p-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <span className="relative text-xs font-bold tracking-[0.2em] text-accent">{vision.eyebrow}</span>
              <h3 className="font-display text-2xl md:text-3xl mt-3">{vision.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-white/80">{vision.statement}</p>
              <div className="mt-auto pt-6 flex items-center gap-2 text-accent/80">
                <Icons.Eye className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-wide">LOOKING AHEAD</span>
              </div>
            </TiltCard>
            <TiltCard maxTilt={6} lift={5} delay={0.1}
              className="relative flex flex-col overflow-hidden rounded-3xl bg-card border border-border/60 p-8 md:p-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <span className="relative text-xs font-bold tracking-[0.2em] text-primary-glow">{mission.eyebrow}</span>
              <h3 className="font-display text-2xl md:text-3xl text-primary mt-3">{mission.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{mission.statement}</p>
              <div className="mt-auto pt-6 flex items-center gap-2 text-primary-glow/80">
                <Icons.Target className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-wide">DRIVEN BY PURPOSE</span>
              </div>
            </TiltCard>
          </div>
        </section>

        {/* HealthFlow Journey - Timeline */}
        <section className="bg-muted/60 py-20">
          <div className="container mx-auto">
            <SectionHeader title={journey.title} subtitle={journey.subtitle} />
            <JourneyTimeline steps={journey.steps} />
          </div>
        </section>

        {/* CEO Message */}
        <section className="container mx-auto py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
            </div>
            <TiltCard maxTilt={5} lift={5}
              className="relative rounded-3xl bg-card border border-border/60 p-8 md:p-14 text-center shadow-soft transition-shadow duration-300 hover:shadow-card"
            >
              <Quote className="h-10 w-10 text-primary/20 mx-auto mb-6" />
              <blockquote className="font-display text-xl md:text-2xl text-primary leading-relaxed max-w-2xl mx-auto">
                {ceoMessage.quote}
              </blockquote>
              <div className="mt-8 flex flex-col items-center">
                <div className="h-1 w-12 bg-primary-glow rounded-full mb-4" />
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{ceoMessage.attributionLead}</div>
                <div className="font-display text-2xl md:text-3xl text-primary mt-1.5">{ceoMessage.attributionName}</div>
              </div>
            </TiltCard>
          </div>
        </section>

        {/* Core Objectives - Bento Grid */}
        <section className="bg-muted/60 py-20">
          <div className="container mx-auto">
            <SectionHeader title={objectives.title} subtitle={objectives.subtitle} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
              {objectives.items.map((obj, i) => (
                <TiltCard
                  key={`${obj.title}-${i}`}
                  delay={i * 0.07}
                  className={`rounded-3xl p-7 border transition-shadow duration-300 hover:shadow-card ${i === 0 || i === 5 ? "bg-gradient-dark text-surface-dark-foreground border-transparent shadow-card" : "bg-card border-border/60 shadow-soft"}`}
                >
                  <div className={`h-11 w-11 rounded-xl grid place-items-center mb-5 transition-transform duration-300 group-hover:scale-110 ${i === 0 || i === 5 ? "bg-accent/20 text-accent" : "bg-accent/40 text-primary"}`}>
                    <Ico name={obj.icon} className="h-5 w-5" />
                  </div>
                  <h3 className={`font-display text-xl ${i === 0 || i === 5 ? "text-white" : "text-primary"}`}>{obj.title}</h3>
                  <p className={`text-sm mt-2 leading-relaxed ${i === 0 || i === 5 ? "text-white/70" : "text-muted-foreground"}`}>{obj.desc}</p>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* Foundational Pillars */}
        <section className="container mx-auto py-20">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl text-primary inline-block">{pillars.title}</h2>
            <div className="mx-auto mt-3 h-0.5 w-16 bg-primary-glow rounded-full" />
          </div>
          <div className="grid md:grid-cols-3 gap-0 mt-12 rounded-3xl border border-border/60 bg-card overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border/60">
            {pillars.items.map((p, i) => (
              // No lift here: these three share one bordered box, so a card
              // rising out of the row would tear the divider it sits against.
              <TiltCard key={`${p.title}-${i}`} delay={i * 0.1} maxTilt={5} lift={0} className="p-8">
                <div className="h-11 w-11 rounded-xl bg-accent/40 grid place-items-center transition-all duration-300 group-hover:bg-accent group-hover:scale-110"><Ico name={p.icon} className="h-5 w-5 text-primary" /></div>
                <h3 className="font-display text-xl text-primary mt-5">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{p.desc}</p>
              </TiltCard>
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};
export default About;

