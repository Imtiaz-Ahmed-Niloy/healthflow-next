"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PricingPlan } from "@/data/pricingContent";
import TiltCard from "@/components/site/TiltCard";

/**
 * The plans, on the dark band.
 *
 * The recommended plan is the one the page is arguing for, so it is the only
 * one rendered as a solid card: the others are glass on the dark ground, a step
 * back rather than a competing block of white.
 */
const Pricing = ({ plans }: { plans: PricingPlan[] }) => {
  const { t } = useTranslation();
  return (
    <section id="pricing" className="relative overflow-hidden bg-gradient-dark text-surface-dark-foreground py-24 mt-12">
      {/* Colour under the cards, so the glass ones have something to hold. */}
      <div aria-hidden className="absolute -top-32 left-[6%] h-[26rem] w-[26rem] rounded-full bg-[hsl(152_70%_52%)]/25 blur-[120px]" />
      <div aria-hidden className="absolute -bottom-40 right-[4%] h-[30rem] w-[30rem] rounded-full bg-[hsl(199_80%_52%)]/20 blur-[130px]" />
      {/* The same grid as the numbers band, so the two dark sections of the page
          are recognisably the same surface. */}
      <div
        aria-hidden
        className="absolute inset-0 [background-image:linear-gradient(hsl(0_0%_100%/0.05)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%/0.05)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(120%_100%_at_50%_30%,black_10%,transparent_75%)] [-webkit-mask-image:radial-gradient(120%_100%_at_50%_30%,black_10%,transparent_75%)]"
      />

      <div className="relative container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          {/* Was text-7xl on phones and text-5xl above them — the wrong way
              round, and 72px on a 360px screen. */}
          <h2 className="font-display text-4xl md:text-5xl">{t("pricing.heading")}</h2>
          <p className="opacity-70 mt-3 text-sm">{t("pricing.subheading")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-5 max-w-5xl mx-auto md:items-center">
          {plans.map((p, i) => (
            // The recommended plan sits proud of the row. That scale is a prop
            // rather than a class because TiltCard writes its own transform.
            <TiltCard key={p.name}
              delay={i * 0.1}
              scale={p.featured ? 1.04 : 1}
              className={`relative rounded-3xl p-8 transition-colors duration-300 ${
                p.featured
                  ? "bg-card text-foreground shadow-glow ring-1 ring-accent/50 z-10"
                  : "bg-white/[0.07] backdrop-blur-xl border border-white/15 hover:bg-white/[0.11] hover:border-white/25"
              }`}>
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent text-primary px-4 py-1 text-[10px] font-bold tracking-widest shadow-soft">
                  {t("pricing.recommended")}
                </span>
              )}

              <h3 className={`font-display text-2xl ${p.featured ? "text-primary" : ""}`}>{p.name}</h3>
              <p className={`text-sm mt-1 ${p.featured ? "text-muted-foreground" : "opacity-70"}`}>{p.tag}</p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className={`font-display text-5xl ${p.featured ? "text-primary" : ""}`}>৳{p.price}</span>
                <span className={`text-sm ${p.featured ? "text-muted-foreground" : "opacity-60"}`}>Per Prescription</span>
              </div>

              {/* A rule between the price and what you get for it. */}
              <div className={`mt-6 h-px ${p.featured ? "bg-border" : "bg-white/15"}`} />

              <ul className="mt-6 space-y-3">
                {p.features.map(f => (
                  <li key={f.text} className={`flex items-start gap-2.5 text-sm ${f.on ? "" : "opacity-45"}`}>
                    {f.on
                      ? <Check className={`h-4 w-4 mt-0.5 shrink-0 ${p.featured ? "text-primary-glow" : "text-accent"}`} />
                      : <X className="h-4 w-4 mt-0.5 shrink-0 opacity-60" />}
                    {/* Struck through only on the word, not the icon beside it. */}
                    <span className={`${f.on ? "" : "line-through"} ${p.featured ? "text-foreground/80" : "opacity-85"}`}>{f.text}</span>
                  </li>
                ))}
              </ul>

              <Link href="/pricing" className={`mt-8 block text-center w-full rounded-full py-3 text-sm font-semibold transition-all ${
                p.featured
                  ? "bg-primary text-primary-foreground hover:bg-primary-glow"
                  : "border border-white/30 hover:bg-white/10 hover:border-white/50"
              }`}>
                {p.cta}
              </Link>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
};
export default Pricing;
