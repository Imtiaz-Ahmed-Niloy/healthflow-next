"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import type { PricingContent } from "@/data/pricingContent";

const Pricing = ({ hero, plans, compareRows, faqs }: PricingContent) => {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main>
        <section className="container mx-auto pt-16 pb-12 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex rounded-full bg-chip text-chip-foreground px-4 py-1.5 text-xs font-semibold">{hero.eyebrow}</span>
            <h1 className="mt-5 font-display text-4xl md:text-6xl text-primary">{hero.title}</h1>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{hero.subtitle}</p>
          </motion.div>
        </section>

        <section className="container mx-auto pb-20">
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start">
            {plans.map((p, i) => (
              <motion.div key={p.name}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative rounded-3xl p-8 ${p.featured ? "bg-accent/40 border-2 border-accent shadow-glow md:-mt-6 md:mb-0" : "bg-card border border-border/60 shadow-soft"}`}>
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground px-4 py-1 text-[10px] font-bold tracking-wider">MOST POPULAR</span>
                )}
                <h3 className="font-display text-2xl text-primary">{p.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{p.tag}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-5xl text-primary">৳{p.price}</span>
                  <span className="text-sm text-muted-foreground">Per Prescription</span>
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
                <button className={`mt-7 w-full rounded-full py-3 text-sm font-semibold transition-all ${p.featured ? "bg-primary text-primary-foreground hover:bg-primary-glow" : "bg-accent/40 text-primary hover:bg-accent/60"}`}>
                  {p.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="container mx-auto py-12">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-display text-3xl md:text-4xl text-primary">Compare every feature</h2>
            <p className="text-muted-foreground mt-2 text-sm">Get a side-by-side look at the technical capabilities of each plan.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-4 font-display text-lg text-primary">Technical Specs</th>
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

        <section className="container mx-auto py-16">
          <div className="rounded-3xl bg-muted/60 p-10 md:p-14">
            <h2 className="font-display text-3xl md:text-4xl text-primary">Frequently Asked Questions</h2>
            <p className="text-muted-foreground mt-2 text-sm">Everything you need to know about our restorative care subscriptions.</p>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 mt-10">
              {faqs.map((f, i) => (
                <motion.div key={f.q}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}>
                  <h3 className="font-semibold text-primary">{f.q}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.a}</p>
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

