"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Lock, MessageSquare, CreditCard, Building2, Wallet } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { usePageContent } from "@/data/pageContent";

// Keys into termsPage.toc — the sections, in order.
const toc = ["acceptance", "definitions", "use", "privacy", "responsibilities", "payments", "liability", "termination"] as const;

const Terms = () => {
  const t = useTranslations("termsPage");
  // The badge, title and description are the CMS's (/super/cms); the terms themselves are here.
  const { content } = usePageContent();
  const p = content.terms;
  return (
  <div className="min-h-screen bg-gradient-hero">
    <Navbar />
    <main className="container mx-auto py-12">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
        className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-12 md:p-16 text-center">
        <span className="inline-flex rounded-full bg-accent/30 text-surface-dark-foreground px-4 py-1.5 text-xs font-semibold border border-accent/40">{p.badge}</span>
        <h1 className="mt-5 font-display text-4xl md:text-6xl">{p.title}</h1>
        <p className="mt-4 text-sm opacity-80 max-w-xl mx-auto">{p.description}</p>
        {p.meta && <p className="mt-3 text-xs opacity-70 max-w-xl mx-auto">{p.meta}</p>}
      </motion.div>

      <div className="mt-12 grid lg:grid-cols-[240px_1fr] gap-12">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav className="flex flex-col gap-1 text-sm">
            {toc.map((key, i) => (
              <a key={key} href={`#sec-${i + 1}`} className="px-3 py-1.5 text-foreground/70 hover:text-primary font-medium">
                {i + 1}. {t(`toc.${key}`)}
              </a>
            ))}
          </nav>
          <div className="mt-6 rounded-2xl bg-muted/60 p-5">
            <h4 className="font-semibold text-primary text-sm">{t("helpTitle")}</h4>
            <p className="text-xs text-muted-foreground mt-1">{t("helpBody")}</p>
            <a href="/contact" className="mt-3 inline-block text-xs font-semibold text-primary border-b border-primary">{t("contactSupport")}</a>
          </div>
        </aside>

        <div className="space-y-12">
          <section id="sec-1">
            <h2 className="font-display text-2xl text-primary">1. {t("toc.acceptance")}</h2>
            <div className="mt-4 space-y-3 text-sm text-foreground/80 leading-relaxed">
              <p>{t("acceptance1")}</p>
              <p>{t("acceptance2")}</p>
            </div>
          </section>

          <section id="sec-2">
            <h2 className="font-display text-2xl text-primary">2. {t("toc.definitions")}</h2>
            <div className="grid sm:grid-cols-2 gap-4 mt-5">
              {(["platform", "providers", "users", "content"] as const).map(key => (
                <motion.div key={key} whileHover={{ y: -3 }} className="rounded-2xl border border-border/60 bg-card p-5">
                  <h4 className="font-semibold text-primary text-sm">“{t(`definitions.${key}.term`)}”</h4>
                  <p className="text-xs text-muted-foreground mt-2">{t(`definitions.${key}.body`)}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section id="sec-3">
            <h2 className="font-display text-2xl text-primary">3. {t("toc.use")}</h2>
            <p className="mt-4 text-sm text-foreground/80">{t("useBody")}</p>
            <div className="mt-6 rounded-2xl bg-muted/60 p-5 border-l-4 border-primary">
              <div className="flex items-center gap-2 font-semibold text-primary text-sm"><AlertTriangle className="h-4 w-4" /> {t("emergencyTitle")}</div>
              <p className="text-xs text-foreground/80 italic mt-2">{t("emergencyBody")}</p>
            </div>
          </section>

          <section id="sec-4">
            <h2 className="font-display text-2xl text-primary">4. {t("toc.privacy")}</h2>
            <p className="mt-4 text-sm text-foreground/80">{t("privacyBody")}</p>
            <ul className="mt-4 space-y-2 text-sm text-foreground/80">
              {(["encryption", "access", "noSale"] as const).map(key => (
                <li key={key} className="flex gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-primary-glow shrink-0" /> {t(`privacyPoints.${key}`)}</li>
              ))}
            </ul>
          </section>

          <section id="sec-5">
            <h2 className="font-display text-2xl text-primary">5. {t("toc.responsibilities")}</h2>
            <p className="mt-4 text-sm text-foreground/80">{t("responsibilitiesBody")}</p>
            <div className="mt-4 space-y-3">
              {([
                { icon: CheckCircle2, key: "accurate" },
                { icon: Lock, key: "security" },
                { icon: MessageSquare, key: "respect" },
              ] as const).map(i => (
                <div key={i.key} className="rounded-2xl bg-muted/60 p-5">
                  <div className="flex items-center gap-2 font-semibold text-primary text-sm"><i.icon className="h-4 w-4" /> {t(`responsibilities.${i.key}.title`)}</div>
                  <p className="text-xs text-muted-foreground mt-2 ml-6">{t(`responsibilities.${i.key}.body`)}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="sec-6">
            <h2 className="font-display text-2xl text-primary">6. {t("toc.payments")}</h2>
            <div className="grid sm:grid-cols-[2fr_1fr] gap-4 mt-5">
              <div className="rounded-2xl bg-muted/60 p-6">
                <h4 className="font-semibold text-primary">{t("billingTitle")}</h4>
                <p className="text-xs text-muted-foreground mt-2">{t("billingBody")}</p>
                <div className="flex gap-3 mt-4 text-primary"><CreditCard className="h-4 w-4" /><Building2 className="h-4 w-4" /><Wallet className="h-4 w-4" /></div>
              </div>
              <div className="rounded-2xl bg-accent/40 p-6">
                <h4 className="font-semibold text-primary">{t("refundsTitle")}</h4>
                <p className="text-xs text-foreground/80 mt-2">{t("refundsBody")}</p>
              </div>
            </div>
          </section>

          <section id="sec-7">
            <h2 className="font-display text-2xl text-primary">7. {t("toc.liability")}</h2>
            <p className="mt-4 text-sm text-foreground/80">{t("liabilityBody")}</p>
          </section>

          <section id="sec-8">
            <h2 className="font-display text-2xl text-primary">8. {t("toc.termination")}</h2>
            <p className="mt-4 text-sm text-foreground/80">{t("terminationBody")}</p>
          </section>

          <div className="text-center pt-8">
            <p className="text-xs text-muted-foreground mb-4">{t("acknowledge")}</p>
            <button className="rounded-full bg-primary text-primary-foreground px-8 py-3 text-sm font-semibold hover:bg-primary-glow transition-colors">{t("agree")}</button>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </div>
  );
};
export default Terms;
