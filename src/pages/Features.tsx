"use client";

import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
const dashboard = "/assets/feature-dashboard.jpg";
const n1 = "/assets/medical-1.jpg";
const n2 = "/assets/medical-2.jpg";
const n3 = "/assets/medical-3.jpg";
const n4 = "/assets/medical-4.jpg";
import { useCmsHero } from "@/data/cmsPageHero";
import { useFeaturesContent } from "@/data/cmsFeatures";

const Ico = ({ name, className }: { name: string; className?: string }) => {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? Icons.Sparkles;
  return <C className={className} />;
};

const Features = () => {
  const { content: heroContent } = useCmsHero();
  const hero = heroContent.features;
  const { content } = useFeaturesContent();
  const { architecture, logic, core } = content;
  const [active, setActive] = useState(architecture.tabs[0] ?? "");

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="container mx-auto pt-12 pb-16">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              {hero.eyebrow && <span className="text-xs font-bold tracking-[0.2em] text-primary-glow">{hero.eyebrow}</span>}
              <h1 className="mt-6 font-display text-4xl md:text-6xl text-primary leading-[1.05]">{hero.title}</h1>
              <p className="mt-5 text-muted-foreground max-w-lg">{hero.description}</p>
              <div className="mt-7 flex gap-3">
                {hero.primaryCta && <button className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">{hero.primaryCta}</button>}
                {hero.secondaryCta && <button className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-primary hover:bg-muted transition-colors">{hero.secondaryCta}</button>}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
              <img src={dashboard} alt="HealthFlow precision dashboard" width={1280} height={1024} className="rounded-2xl shadow-card w-full object-cover aspect-[4/3]" />
            </motion.div>
          </div>
        </section>

        {/* Intelligent Architecture */}
        <section className="container mx-auto py-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl text-primary">{architecture.title}</h2>
            <p className="text-muted-foreground mt-3">{architecture.subtitle}</p>
          </div>
          {architecture.tabs.length > 0 && (
            <div className="flex justify-center mt-8 overflow-x-auto">
              <div className="inline-flex rounded-full bg-muted p-1.5 gap-1">
                {architecture.tabs.map(t => (
                  <button key={t} onClick={() => setActive(t)} className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all ${active === t ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-primary"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
            {architecture.items.filter(f => !active || !f.tab || f.tab === active).map((f, i) => (
              <motion.div key={`${f.title}-${i}`}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.05 }}
                className={`rounded-3xl p-7 border transition-all hover:-translate-y-1 ${f.dark ? "bg-card border-border/60 shadow-soft" : "bg-card/70 border-border/50 shadow-soft"}`}>
                <div className={`h-11 w-11 rounded-xl grid place-items-center mb-5 ${f.dark ? "bg-primary text-primary-foreground" : "bg-accent/40 text-primary"}`}>
                  <Ico name={f.icon} className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl text-primary">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
                <ul className="mt-4 space-y-1.5 text-xs text-foreground/70">
                  {f.bullets.map(b => <li key={b} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary-glow" />{b}</li>)}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* HealthFlow Logic - dark */}
        <section className="bg-gradient-dark text-surface-dark-foreground py-20">
          <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="grid grid-cols-2 gap-4">
              {[n1, n2, n3, n4].map((src, i) => (
                <motion.img key={i} src={src} alt="" width={800} height={800} loading="lazy"
                  initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="rounded-2xl object-cover w-full aspect-square" />
              ))}
            </div>
            <div>
              <h2 className="font-display text-3xl md:text-4xl">{logic.title}</h2>
              <p className="font-display text-2xl md:text-3xl text-accent mt-1">{logic.accentTitle}</p>
              <p className="opacity-70 mt-4 text-sm leading-relaxed max-w-md">{logic.description}</p>
              <div className="mt-8 space-y-5">
                {logic.points.map(p => (
                  <div key={p.title} className="flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-surface-dark-foreground/10 grid place-items-center shrink-0">
                      <Ico name={p.icon} className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <div className="font-semibold">{p.title}</div>
                      <p className="text-xs opacity-70 mt-1 max-w-md">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              {logic.ctaLabel && (
                <button className="mt-8 rounded-full bg-accent text-primary px-6 py-3 text-sm font-bold tracking-wide hover:bg-accent/80 transition-colors">{logic.ctaLabel}</button>
              )}
            </div>
          </div>
        </section>

        {/* Platform Core Features */}
        <section className="container mx-auto py-20">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="font-display text-3xl md:text-4xl text-primary">{core.title}</h2>
              <p className="text-muted-foreground mt-3 max-w-sm">{core.subtitle}</p>
            </div>
            <div className="space-y-3">
              {core.items.map((f, i) => (
                <motion.div key={`${f.title}-${i}`}
                  initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}
                  className={`rounded-2xl p-5 border flex gap-4 transition-all hover:shadow-card ${f.featured ? "bg-accent/30 border-accent/60" : "bg-card border-border/60"}`}>
                  <div className="h-10 w-10 rounded-lg bg-card grid place-items-center shrink-0 border border-border/60">
                    <Ico name={f.icon} className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">{f.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                    {f.chips && f.chips.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {f.chips.map(c => <span key={c} className="rounded-full bg-chip text-chip-foreground px-2.5 py-0.5 text-[10px] font-bold">{c}</span>)}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};
export default Features;

