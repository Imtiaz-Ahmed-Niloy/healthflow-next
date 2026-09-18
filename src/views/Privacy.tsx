"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { User, FileText, Stethoscope, Globe, HelpCircle, Lock, Shield, CloudOff, Eye, Pencil, Trash2, ShieldCheck } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
const hipaaImg = "/assets/hipaa-shield.jpg";
import { usePageContent } from "@/data/pageContent";

// Each section's label is privacyPage.sections.<key>.
const sections = [
  { id: "introduction", key: "introduction" },
  { id: "information-collection", key: "collection" },
  { id: "how-we-use-data", key: "use" },
  { id: "hipaa-compliance", key: "hipaa" },
  { id: "information-sharing", key: "sharing" },
  { id: "data-security", key: "security" },
  { id: "your-rights", key: "rights" },
] as const;

const Privacy = () => {
  const t = useTranslations("privacyPage");
  const [active, setActive] = useState("introduction");
  // The badge, title and description are the CMS's (/super/cms); the policy itself is here.
  const { content } = usePageContent();
  const p = content.privacy;

  useEffect(() => {
    const onScroll = () => {
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top < 200) setActive(s.id);
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main className="container mx-auto py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
          <span className="inline-flex rounded-full bg-chip text-chip-foreground px-4 py-1.5 text-xs font-semibold">{p.badge}</span>
          <h1 className="mt-5 font-display text-4xl md:text-6xl text-primary">{p.title}</h1>
          <p className="text-muted-foreground mt-4 max-w-xl">{p.description}</p>
          {p.meta && (
            <div className="mt-6 flex items-center gap-4 text-xs border-l-2 border-accent pl-3">
              <span className="text-muted-foreground">{p.meta}</span>
            </div>
          )}
        </motion.div>

        <div className="mt-12 grid lg:grid-cols-[240px_1fr] gap-12">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground px-3">{t("onThisPage")}</p>
            <nav className="flex flex-col gap-1 text-sm">
              {sections.map(s => (
                <a key={s.id} href={`#${s.id}`}
                  className={`px-3 py-2 rounded-md transition-colors ${active === s.id ? "bg-chip text-primary font-semibold" : "text-foreground/70 hover:bg-muted/50"}`}>
                  {t(`sections.${s.key}`)}
                </a>
              ))}
            </nav>
            <div className="mt-6 rounded-2xl bg-muted/60 p-5">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h4 className="mt-3 font-semibold text-primary text-sm">{t("clarifyTitle")}</h4>
              <p className="text-xs text-muted-foreground mt-1">{t("clarifyBody")}</p>
              <a href="/contact" className="mt-3 inline-block text-xs font-semibold text-primary border-b border-primary">{t("contactTeam")}</a>
            </div>
          </aside>

          {/* Content */}
          <div className="space-y-14">
            <section id="introduction">
              <h2 className="font-display text-2xl text-primary">{t("introTitle")}</h2>
              <div className="mt-4 space-y-4 text-sm text-foreground/80 leading-relaxed">
                <p>{t("intro1")}</p>
                <p>{t("intro2")}</p>
              </div>
            </section>

            <hr className="border-border/60" />

            <section id="information-collection">
              <h2 className="font-display text-2xl text-primary">{t("collectionTitle")}</h2>
              <p className="mt-4 text-sm text-foreground/80">{t("collectionBody")}</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-border/60 bg-card p-5">
                  <div className="flex items-center gap-2 font-semibold text-primary"><User className="h-4 w-4" /> {t("personalData")}</div>
                  <ul className="mt-3 text-xs text-muted-foreground space-y-1.5 text-center">
                    <li>{t("personal1")}</li>
                    <li>{t("personal2")}</li>
                    <li>{t("personal3")}</li>
                    <li>{t("personal4")}</li>
                  </ul>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-border/60 bg-card p-5">
                  <div className="flex items-center gap-2 font-semibold text-primary"><FileText className="h-4 w-4" /> {t("healthInfo")}</div>
                  <ul className="mt-3 text-xs text-muted-foreground space-y-1.5 text-center">
                    <li>{t("health1")}</li>
                    <li>{t("health2")}</li>
                    <li>{t("health3")}</li>
                    <li>{t("health4")}</li>
                  </ul>
                </motion.div>
              </div>
            </section>

            <hr className="border-border/60" />

            <section id="how-we-use-data">
              <h2 className="font-display text-2xl text-primary">{t("useTitle")}</h2>
              <p className="mt-4 text-sm text-foreground/80">{t("useBody")}</p>
              <div className="mt-6 rounded-2xl bg-muted/60 p-6 space-y-4">
                {([
                  { icon: Stethoscope, key: "delivery" },
                  { icon: FileText, key: "improvement" },
                  { icon: Globe, key: "protection" },
                ] as const).map(i => (
                  <div key={i.key} className="flex gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-chip flex items-center justify-center text-primary"><i.icon className="h-4 w-4" /></div>
                    <div>
                      <h4 className="font-semibold text-primary text-sm">{t(`uses.${i.key}.title`)}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(`uses.${i.key}.body`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="hipaa-compliance">
              <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
                className="mt-4 rounded-3xl border border-accent/60 bg-accent/20 p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
                <div>
                  <h2 className="font-display text-2xl text-primary">{t("hipaaTitle")}</h2>
                  <p className="mt-3 text-sm text-foreground/80 max-w-md">{t("hipaaBody")}</p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="h-4 w-4" /> {t("hipaaCertified")}</div>
                </div>
                <img src={hipaaImg} alt={t("hipaaAlt")} loading="lazy" width={180} height={180} className="rounded-2xl shadow-glow" />
              </motion.div>
            </section>

            <section id="information-sharing">
              <h2 className="font-display text-2xl text-primary">{t("sharingTitle")}</h2>
              <p className="mt-4 text-sm text-foreground/80">{t("sharingBody")}</p>
            </section>

            <section id="data-security">
              <h2 className="font-display text-2xl text-primary">{t("securityTitle")}</h2>
              <p className="mt-4 text-sm text-foreground/80">{t("securityBody")}</p>
              <div className="grid sm:grid-cols-3 gap-4 mt-6">
                {([
                  { icon: Lock, key: "encryption" },
                  { icon: Shield, key: "twoFactor" },
                  { icon: CloudOff, key: "backups" },
                ] as const).map(i => (
                  <motion.div key={i.key} whileHover={{ y: -3 }} className="rounded-2xl border border-border/60 bg-card p-5 text-center">
                    <i.icon className="h-5 w-5 text-primary mx-auto" />
                    <p className="mt-3 text-xs font-semibold text-primary">{t(`securityItems.${i.key}`)}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            <section id="your-rights">
              <h2 className="font-display text-2xl text-primary">{t("rightsTitle")}</h2>
              <p className="mt-4 text-sm text-foreground/80">{t("rightsBody")}</p>
              <div className="mt-6 space-y-5">
                {([
                  { icon: Eye, key: "access" },
                  { icon: Pencil, key: "rectification" },
                  { icon: Trash2, key: "erasure" },
                ] as const).map(i => (
                  <div key={i.key} className="flex gap-3">
                    <i.icon className="h-4 w-4 mt-1 text-primary" />
                    <div>
                      <h4 className="font-semibold text-sm text-primary">{t(`rights.${i.key}.title`)}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(`rights.${i.key}.body`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
export default Privacy;
