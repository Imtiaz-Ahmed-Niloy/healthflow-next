"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Cookie, Shield, Settings, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { usePageContent } from "@/data/pageContent";

const Toggle = ({ on, onChange, disabled }: { on: boolean; onChange?: () => void; disabled?: boolean }) => (
  <button disabled={disabled} onClick={onChange}
    className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted-foreground/30"} ${disabled ? "opacity-100" : ""}`}>
    <span className={`absolute top-0.5 ${on ? "right-0.5" : "left-0.5"} h-5 w-5 rounded-full bg-card flex items-center justify-center text-[10px] text-primary transition-all`}>
      {on && "✓"}
    </span>
  </button>
);

const Cookies = () => {
  const t = useTranslations("cookiesPage");
  const [functional, setFunctional] = useState(true);
  const [analytical, setAnalytical] = useState(false);
  // The title, description and notes are the CMS's (/super/cms).
  const { content } = usePageContent();
  const p = content.cookies;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main className="container mx-auto py-16 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-chip flex items-center justify-center text-primary"><Cookie className="h-6 w-6" /></div>
          <h1 className="mt-5 font-display text-3xl md:text-5xl text-primary">{p.title}</h1>
          <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto">{p.description}</p>
          {p.badge && <span className="inline-flex mt-6 rounded-full bg-chip text-chip-foreground px-4 py-1.5 text-xs font-semibold">{p.badge}</span>}
        </motion.div>

        <div className="mt-12 space-y-4">
          {[
            { icon: Shield, key: "essential" as const, on: true, lock: true },
            { icon: Settings, key: "functional" as const, on: functional, set: () => setFunctional(!functional) },
            { icon: BarChart2, key: "analytical" as const, on: analytical, set: () => setAnalytical(!analytical) },
          ].map((c, i) => (
            <motion.div key={c.key} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-2xl border border-border/60 bg-card p-5 flex gap-4 items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold text-primary"><c.icon className="h-4 w-4" /> {t(`kinds.${c.key}.title`)}</div>
                <p className="text-xs text-muted-foreground mt-2 max-w-md">{t(`kinds.${c.key}.body`)}</p>
              </div>
              {c.lock
                ? <span className="text-[10px] font-bold tracking-wider rounded-full bg-primary text-primary-foreground px-3 py-1.5">{t("alwaysActive")}</span>
                : <Toggle on={c.on} onChange={c.set} />}
            </motion.div>
          ))}
        </div>

        {p.meta && (
          <p className="mt-10 text-sm text-muted-foreground text-center max-w-2xl mx-auto">{p.meta}</p>
        )}

        <button onClick={() => toast.success(t("saved"), { description: t("savedDetail") })}
          className="mt-10 w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-4 text-sm font-semibold hover:opacity-90 transition-opacity shadow-glow">
          {t("save")}
        </button>

        <motion.section initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="mt-16 rounded-3xl bg-accent/40 p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <h3 className="font-display text-2xl text-primary">{t("questionsTitle")}</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">{t("questionsBody")}</p>
          </div>
          <div className="flex gap-3">
            <a href="/contact" className="rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:bg-primary-glow transition-colors">{t("contactOfficer")}</a>
            <a href="/help-center" className="rounded-full bg-card text-primary px-5 py-3 text-sm font-semibold border border-border hover:bg-muted/60 transition-colors">{t("readFaq")}</a>
          </div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
};
export default Cookies;
