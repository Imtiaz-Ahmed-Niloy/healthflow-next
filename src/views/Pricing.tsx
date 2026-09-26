"use client";

import { motion } from "framer-motion";
import TiltCard from "@/components/site/TiltCard";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SectionGlow, { GLOW } from "@/components/site/SectionGlow";
import { GradientText, gradient } from "@/components/site/GradientWords";
import { titleReveal } from "@/components/site/titleReveal";
import type { PricingContent } from "@/data/pricingContent";

const Pricing = ({ hero, plans, compareRows, faqs }: PricingContent) => {
  const t = useTranslations("pricingPage");
  // Plans, the comparison and the FAQ are the CMS's (/super/cms/pricing).
  return (
    // The homepage's surface: its page colour, a glow behind each light
    // section, and the brand gradient on part of each title.
    <div className="min-h-screen lp-page-bg overflow-x-clip">
      <Navbar transparentAtTop />
      <main>
        {/* Pulled up under the see-through navbar (5rem) and padded back
            down, as on the homepage. */}
        <section className="relative isolate container mx-auto -mt-20 pt-36 pb-12 text-center">
          <SectionGlow {...GLOW.hero} bleed />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/* One line from tablets up: the size steps with the container so
                the headline (about 35 characters) fits its width at each
                breakpoint instead of breaking onto a second line. */}
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-primary"><GradientText text={hero.title} /></h1>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto whitespace-pre-line">{hero.subtitle}</p>
          </motion.div>
        </section>

        <section className="relative isolate container mx-auto pb-20">
          <SectionGlow {...GLOW.emerald} bleed />
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start">
            {plans.map((p, i) => (
              <TiltCard key={p.name}
                delay={i * 0.1}
                className={`relative rounded-3xl p-8 transition-shadow duration-300 hover:shadow-card ${p.featured ? "bg-accent/40 border-2 border-accent shadow-glow md:-mt-6 md:mb-0" : "bg-card border border-border/60 shadow-soft"}`}>
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground px-4 py-1 text-[10px] font-bold tracking-wider">{t("mostPopular")}</span>
                )}
                <h3 className="font-display text-2xl text-primary">{p.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{p.tag}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-5xl text-primary">{t("price", { amount: p.price })}</span>
                  <span className="text-sm text-muted-foreground">{t("perPrescription")}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {p.features.map(f => (
                    <li key={f.text} className={`flex items-start gap-2 text-sm ${f.on ? "text-foreground/85" : "text-muted-foreground line-through opacity-60"}`}>
                      {f.on
                        ? <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary-glow" />
                        : <X className="h-4 w-4 mt-0.5 shrink-0" />}
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
                {/* To the contact page: a hospital is onboarded by us, not by a
                    public sign-up form, which only ever creates a patient. */}
                <Link href="/contact" className={`mt-7 block w-full text-center rounded-full py-3 text-sm font-semibold transition-all ${p.featured ? "bg-primary text-primary-foreground hover:bg-primary-glow" : "bg-accent/40 text-primary hover:bg-accent/60"}`}>
                  {p.cta}
                </Link>
              </TiltCard>
            ))}
          </div>
        </section>

        <section className="relative isolate container mx-auto py-12">
          <SectionGlow {...GLOW.teal} bleed />
          <div className="text-center max-w-2xl mx-auto mb-10">
            <motion.h2 {...titleReveal} className="font-display text-3xl md:text-4xl text-primary">{t.rich("compareTitle", gradient)}</motion.h2>
            <p className="text-muted-foreground mt-2 text-sm">{t("compareSub")}</p>
          </div>
          {/* A phone gets one card per plan: the 700px table showed only a
              sliver of the first plan's column beside the row names. */}
          <div className="md:hidden space-y-5">
            {plans.map((p, i) => (
              <div key={i} className="rounded-3xl bg-card border border-border/60 shadow-soft p-5">
                <h3 className="font-display text-xl text-primary">{p.name}</h3>
                <dl className="mt-3 divide-y divide-border/60 text-sm">
                  {compareRows.map((row, r) => (
                    <div key={r} className="flex items-start justify-between gap-4 py-2.5">
                      <dt className="font-semibold text-primary">{row.label}</dt>
                      <dd className={`text-right text-foreground/80 ${(row.bold || []).includes(i + 1) ? "font-bold text-primary" : ""}`}>{row.values[i]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-4 font-display text-lg text-primary">{t("included")}</th>
                  {plans.map((p, i) => (
                    <th key={i} className="py-4 font-display text-lg text-primary">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => {
                  const cells = [row.label, ...row.values];
                  const bold = row.bold || [];
                  return (
                    <tr key={i} className="border-b border-border/60">
                      {cells.map((c, j) => (
                        <td key={j} className={`py-4 pr-4 ${j === 0 ? "font-semibold text-primary" : "text-foreground/80"} ${bold.includes(j) ? "font-bold text-primary" : ""}`}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="relative isolate container mx-auto py-16">
          <SectionGlow {...GLOW.cyan} bleed />
          {/* A white panel, not a tint of the page: bg-muted sat a couple of
             percent off the cream gradient behind it, so the section had no
             edge at all. Card white plus a border and an accent wash gives it
             one, and each question sits on its own tinted tile inside.
             Tablet up only: on a phone the panel's padding squeezed every
             answer into a narrow column, so there the tiles sit straight on
             the page at full width. */}
          <div className="relative md:overflow-hidden md:rounded-3xl md:border md:border-border/60 md:bg-card md:shadow-card md:p-14">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 hidden h-72 w-72 rounded-full bg-accent/30 blur-3xl md:block" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-24 hidden h-72 w-72 rounded-full bg-secondary/60 blur-3xl md:block" />

            <div className="relative text-center max-w-2xl mx-auto">
              <motion.h2 {...titleReveal} className="font-display text-3xl md:text-4xl text-primary">{t.rich("faqTitle", gradient)}</motion.h2>
              <p className="text-muted-foreground mt-3 text-sm">{t("faqSub")}</p>
            </div>

            <div className="relative grid md:grid-cols-2 gap-5 mt-10">
              {faqs.map((f, i) => (
                <motion.div key={f.q}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="rounded-2xl border border-border/70 bg-card md:bg-background/70 p-5 md:p-6 shadow-soft md:shadow-none transition-all duration-300 hover:border-accent hover:shadow-soft">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/40 text-primary text-xs font-bold">{i + 1}</span>
                    <div>
                      <h3 className="font-semibold text-primary leading-snug">{f.q}</h3>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">{f.a}</p>
                    </div>
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
export default Pricing;

