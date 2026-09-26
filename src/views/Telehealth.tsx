"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Video, Calendar, Clock, ShieldCheck, Stethoscope, Check } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormatters } from "@/lib/appSettings";

// Keys into telehealthPage.slots, .reasons and .included.
const slots = ["today230", "today400", "tomorrow900", "tomorrow1130", "fri1000", "fri330"] as const;
const reasons = ["general", "followUp", "refill", "mentalHealth", "pediatric", "dermatology"] as const;
const included = ["video", "physician", "prescription", "summary", "followUp"] as const;

// Illustrative — this page describes a telehealth product that isn't built
// yet (no ticket; see docs/module-status.md). Once it is, this becomes a
// real visit fee from the doctor/hospital record, same as everywhere else.
const ILLUSTRATIVE_VISIT_FEE = 49;

const Telehealth = () => {
  const t = useTranslations("telehealthPage");
  const { formatCurrency } = useFormatters();
  const [slot, setSlot] = useState<(typeof slots)[number]>(slots[0]);
  const [reason, setReason] = useState<(typeof reasons)[number]>(reasons[0]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main className="container mx-auto py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
            <Video className="h-3 w-3" /> {t("badge")}
          </span>
          <h1 className="font-display text-5xl text-primary mt-4">{t("title")}</h1>
          <p className="text-muted-foreground mt-3 text-lg">{t("intro")}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 mt-12">
          <form onSubmit={(e) => { e.preventDefault(); toast.success(t("requested"), { description: `${t(`reasons.${reason}`)} · ${t(`slots.${slot}`)}` }); }} className="rounded-3xl bg-card border border-border/60 p-8 shadow-soft space-y-6">
            <h2 className="font-display text-2xl text-primary">{t("formTitle")}</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground" required>{t("fullName")}</Label>
                <Input required defaultValue="" placeholder={t("fullNamePlaceholder")} className="mt-2 rounded-xl" />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground" required>{t("email")}</Label>
                <Input required type="email" placeholder={t("emailPlaceholder")} className="mt-2 rounded-xl" />
              </div>
            </div>

            <div>
              <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">{t("reason")}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {reasons.map((r) => (
                  <button key={r} type="button" onClick={() => setReason(r)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${reason === r ? "bg-primary text-primary-foreground" : "bg-accent/30 text-primary hover:bg-accent/50"}`}>
                    {t(`reasons.${r}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">{t("slot")}</Label>
              <div className="mt-2 grid sm:grid-cols-3 gap-2">
                {slots.map((s) => (
                  <button key={s} type="button" onClick={() => setSlot(s)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${slot === s ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground/70 hover:bg-accent/30"}`}>
                    {t(`slots.${s}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">{t("description")}</Label>
              <textarea rows={4} placeholder={t("descriptionPlaceholder")} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <button className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">
              {t("confirm")}
            </button>
          </form>

          <aside className="space-y-5">
            <div className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
              <h3 className="font-display text-lg text-primary inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> {t("includedTitle")}</h3>
              <ul className="mt-4 space-y-3 text-sm text-foreground/80">
                {included.map((x) => (
                  <li key={x} className="flex items-start gap-2"><Check className="h-4 w-4 text-primary-glow mt-0.5 shrink-0" />{t(`included.${x}`)}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-6">
              <Stethoscope className="h-6 w-6 text-accent" />
              <p className="font-display text-2xl mt-3">{t("priceLine", { price: formatCurrency(ILLUSTRATIVE_VISIT_FEE) })}</p>
              <p className="text-xs opacity-70 mt-1">{t("insurance")}</p>
              <div className="mt-4 flex items-center gap-3 text-xs opacity-90">
                <Calendar className="h-4 w-4" /> {t("days")}
                <span className="opacity-40">·</span>
                <Clock className="h-4 w-4" /> {t("hours")}
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Telehealth;
