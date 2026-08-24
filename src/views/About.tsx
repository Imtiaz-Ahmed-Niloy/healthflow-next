"use client";

import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { Quote } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
const heroImg = "/assets/about-hero.jpg";
import type { CmsHeroFields } from "@/data/cmsPageHero";
import type { AboutContent } from "@/data/aboutContent";

const Ico = ({ name, className }: { name: string; className?: string }) => {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? Icons.Sparkles;
  return <C className={className} />;
};

const SectionHeader = ({ eyebrow, title, subtitle, centered = true, light = false }: { eyebrow?: string; title: string; subtitle?: string; centered?: boolean; light?: boolean }) => (
  <div className={`${centered ? "text-center" : ""} max-w-2xl ${centered ? "mx-auto" : ""}`}>
    {eyebrow && <span className={`text-xs font-bold tracking-[0.2em] ${light ? "text-accent" : "text-primary-glow"}`}>{eyebrow}</span>}
    <h2 className={`font-display text-3xl md:text-5xl ${light ? "text-white" : "text-primary"} mt-3 leading-tight`}>{title}</h2>
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
              {hero.eyebrow && <span className="text-xs font-bold tracking-[0.2em] text-primary-glow">{hero.eyebrow}</span>}
              <h1 className="font-display text-4xl md:text-6xl text-primary mt-4 leading-tight">{hero.title}</h1>
              <p className="mt-5 text-muted-foreground max-w-md">{hero.description}</p>
            </div>
          </motion.div>
        </section>

        {/* Vision & Mission - dual cards */}
        <section className="container mx-auto py-20">
          <SectionHeader eyebrow="OUR PURPOSE" title="Why We Exist" />
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-dark text-surface-dark-foreground p-8 md:p-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <span className="text-xs font-bold tracking-[0.2em] text-accent">{vision.eyebrow}</span>
              <h3 className="font-display text-2xl md:text-3xl mt-3">{vision.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-white/80">{vision.statement}</p>
              <div className="mt-6 flex items-center gap-2 text-accent/80">
                <Icons.Eye className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-wide">LOOKING AHEAD</span>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="relative overflow-hidden rounded-3xl bg-card border border-border/60 p-8 md:p-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <span className="text-xs font-bold tracking-[0.2em] text-primary-glow">{mission.eyebrow}</span>
              <h3 className="font-display text-2xl md:text-3xl text-primary mt-3">{mission.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{mission.statement}</p>
              <div className="mt-6 flex items-center gap-2 text-primary-glow/80">
                <Icons.Target className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-wide">DRIVEN BY PURPOSE</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* HealthFlow Journey - Timeline */}
        <section className="bg-muted/60 py-20">
          <div className="container mx-auto">
            <SectionHeader eyebrow={journey.eyebrow} title={journey.title} subtitle={journey.subtitle} />
            <div className="relative mt-16 max-w-4xl mx-auto">
              {/* Vertical line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />
              {journey.steps.map((step, i) => (
                <motion.div
                  key={`${step.year}-${i}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className={`relative flex gap-6 md:gap-0 mb-10 last:mb-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                >
                  {/* Dot */}
                  <div className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-primary border-4 border-background -translate-x-1/2 z-10 top-1.5" />
                  {/* Content */}
                  <div className={`pl-10 md:pl-0 md:w-1/2 ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                    <span className="inline-block rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold tracking-wide mb-2">
                      {step.year}
                    </span>
                    <h4 className="font-display text-lg text-primary">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="hidden md:block md:w-1/2" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CEO Message */}
        <section className="container mx-auto py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-xs font-bold tracking-[0.2em] text-primary-glow">{ceoMessage.eyebrow}</span>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative rounded-3xl bg-card border border-border/60 p-8 md:p-14 text-center shadow-soft"
            >
              <Quote className="h-10 w-10 text-primary/20 mx-auto mb-6" />
              <blockquote className="font-display text-xl md:text-2xl text-primary leading-relaxed max-w-2xl mx-auto">
                {ceoMessage.quote}
              </blockquote>
              <div className="mt-8 flex flex-col items-center gap-1">
                <div className="h-1 w-12 bg-primary-glow rounded-full mb-3" />
                <div className="font-semibold text-primary">{ceoMessage.name}</div>
                <div className="text-xs text-muted-foreground">{ceoMessage.role}</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Core Objectives - Bento Grid */}
        <section className="bg-muted/60 py-20">
          <div className="container mx-auto">
            <SectionHeader eyebrow={objectives.eyebrow} title={objectives.title} subtitle={objectives.subtitle} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
              {objectives.items.map((obj, i) => (
                <motion.div
                  key={`${obj.title}-${i}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.07 }}
                  className={`rounded-3xl p-7 border transition-all hover:-translate-y-1 ${i === 0 || i === 5 ? "bg-gradient-dark text-surface-dark-foreground border-transparent shadow-card" : "bg-card border-border/60 shadow-soft"}`}
                >
                  <div className={`h-11 w-11 rounded-xl grid place-items-center mb-5 ${i === 0 || i === 5 ? "bg-accent/20 text-accent" : "bg-accent/40 text-primary"}`}>
                    <Ico name={obj.icon} className="h-5 w-5" />
                  </div>
                  <h3 className={`font-display text-xl ${i === 0 || i === 5 ? "text-white" : "text-primary"}`}>{obj.title}</h3>
                  <p className={`text-sm mt-2 leading-relaxed ${i === 0 || i === 5 ? "text-white/70" : "text-muted-foreground"}`}>{obj.desc}</p>
                </motion.div>
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
              <motion.div key={`${p.title}-${i}`}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8">
                <div className="h-11 w-11 rounded-xl bg-accent/40 grid place-items-center"><Ico name={p.icon} className="h-5 w-5 text-primary" /></div>
                <h3 className="font-display text-xl text-primary mt-5">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};
export default About;

