"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Search, Calendar, UserCircle, Wallet, Briefcase, Phone, Mail, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { usePageContent } from "@/data/pageContent";
import { Label } from "@/components/ui/label";

// Keys into helpPage.categories and helpPage.faqs.
const cats = [
  { icon: Calendar, key: "appointments", n: 12 },
  { icon: UserCircle, key: "profile", n: 8 },
  { icon: Wallet, key: "billing", n: 15 },
  { icon: Briefcase, key: "services", n: 24 },
] as const;

const faqs = ["telehealth", "insurance", "refill", "cancellation"] as const;

const HelpCenter = () => {
  const t = useTranslations("helpPage");
  const [open, setOpen] = useState(0);
  // The title, description and search hint are the CMS's (/super/cms).
  const { content } = usePageContent();
  const p = content.helpCenter;
  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); toast.success(t("sent"), { description: t("sentDetail") }); };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main>
        <section className="container mx-auto pt-16 pb-12 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="font-display text-4xl md:text-6xl text-primary">{p.title}</motion.h1>
          {p.description && <p className="mt-4 text-sm text-muted-foreground max-w-xl mx-auto">{p.description}</p>}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-8 max-w-2xl mx-auto">
            {/* min-w-0 on the input: its default width pushed the button out
                past the pill on a phone. */}
            <div className="flex items-center bg-card rounded-full shadow-soft border border-border/60 pl-4 pr-1.5 sm:px-5 py-1.5 sm:py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm outline-none" placeholder={p.meta || t("searchPlaceholder")} />
              <button className="shrink-0 rounded-full bg-primary text-primary-foreground px-4 sm:px-6 py-2.5 text-xs font-semibold tracking-wider hover:bg-primary-glow transition-colors">{t("search")}</button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">{t("popular")} <a href="#" className="underline">{t("popularBooking")}</a>, <a href="#" className="underline">{t("popularTelehealth")}</a>, <a href="#" className="underline">{t("popularInsurance")}</a></p>
          </motion.div>
        </section>

        <section className="container mx-auto pb-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cats.map((c, i) => (
              <motion.a href="#" key={c.key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -4 }} className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft block">
                <div className="h-10 w-10 rounded-xl bg-chip flex items-center justify-center text-primary"><c.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-display text-xl text-primary">{t(`categories.${c.key}.title`)}</h3>
                <p className="text-xs text-muted-foreground mt-2">{t(`categories.${c.key}.body`)}</p>
                <p className="mt-5 text-xs font-semibold text-primary-glow">{t("articles", { count: c.n })}</p>
              </motion.a>
            ))}
          </div>
        </section>

        <section className="container mx-auto pb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-10 grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="font-display text-3xl">{t("stillTitle")}</h2>
              <p className="text-sm opacity-80 mt-3 max-w-sm">{t("stillBody")}</p>
              <div className="mt-8 space-y-5">
                <div className="flex gap-3"><Phone className="h-5 w-5 mt-1 text-accent" /><div><h4 className="font-semibold text-sm">{t("helpline")}</h4><p className="text-xs opacity-70 mt-1">+1 (800) ECO-HEALTH</p></div></div>
                <div className="flex gap-3"><Mail className="h-5 w-5 mt-1 text-accent" /><div><h4 className="font-semibold text-sm">{t("emailSupport")}</h4><p className="text-xs opacity-70 mt-1">care@ecohealth.wellness</p></div></div>
              </div>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <h3 className="font-display text-2xl">{t("formTitle")}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px] tracking-widest font-semibold opacity-70" required>{t("fullName")}</Label><input required className="w-full mt-1 bg-surface-dark-foreground/10 rounded-md px-3 py-2 text-sm outline-none border border-surface-dark-foreground/15" /></div>
                <div><Label className="text-[10px] tracking-widest font-semibold opacity-70" required>{t("email")}</Label><input required type="email" className="w-full mt-1 bg-surface-dark-foreground/10 rounded-md px-3 py-2 text-sm outline-none border border-surface-dark-foreground/15" /></div>
              </div>
              <div><Label className="text-[10px] tracking-widest font-semibold opacity-70">{t("subject")}</Label>
                <select className="w-full mt-1 bg-surface-dark-foreground/10 rounded-md px-3 py-2 text-sm outline-none border border-surface-dark-foreground/15">
                  <option>{t("subjects.technical")}</option><option>{t("subjects.billing")}</option><option>{t("subjects.appointment")}</option>
                </select></div>
              <div><Label className="text-[10px] tracking-widest font-semibold opacity-70" required>{t("message")}</Label><textarea required rows={4} className="w-full mt-1 bg-surface-dark-foreground/10 rounded-md px-3 py-2 text-sm outline-none border border-surface-dark-foreground/15" /></div>
              <button className="w-full rounded-full bg-accent text-primary py-3 text-sm font-semibold hover:bg-accent/80 transition-colors">{t("send")}</button>
            </form>
          </motion.div>
        </section>

        <section className="container mx-auto pb-20 grid md:grid-cols-[1fr_2fr] gap-10">
          <div>
            <span className="inline-flex rounded-full bg-chip text-chip-foreground px-3 py-1 text-[10px] font-bold tracking-wider">{t("faqBadge")}</span>
            <h2 className="mt-4 font-display text-4xl text-primary">{t("faqTitle")}</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((key, i) => (
              <div key={key} className="rounded-2xl bg-muted/40 border border-border/60 overflow-hidden">
                <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="font-semibold text-primary text-sm">{t(`faqs.${key}.q`)}</span>
                  <ChevronDown className={`h-4 w-4 text-primary transition-transform ${open === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                      <p className="px-5 pb-5 text-xs text-muted-foreground">{t(`faqs.${key}.a`)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};
export default HelpCenter;
