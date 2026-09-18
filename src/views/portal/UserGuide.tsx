"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, FileText, Users, BookUser, Calendar, ChevronDown, Lightbulb,
  ShieldCheck, Printer, MessagesSquare, Pill, CircleDashed, Store,
} from "lucide-react";
import { useLocale } from "next-intl";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { portalGuideText } from "@/i18n/portalGuide";

/**
 * The doctor panel's manual.
 *
 * The words live in src/i18n/portalGuide.ts, in both languages; this page
 * holds the structure. It is static text and stays that way — a guide is
 * content, not data — but every line of it describes something the panel
 * actually does. What was here before was a well-built shell around
 * instructions for a different product: scanning a patient's portal QR,
 * sending prescriptions by SMS, dragging queue cards to reorder them, saving
 * prescription templates, blocking leave so "HR is notified automatically",
 * pressing Ctrl+K to jump to any patient, amending a sent prescription within
 * 24 hours, and a five-minute video tutorial that was a link to Rick Astley.
 *
 * None of that exists. A manual that describes features the product does not
 * have is worse than no manual: it sends a doctor looking for a button that
 * was never built, and it teaches them not to trust the rest of the page.
 *
 * So the rule for the text: if it is written there, it works. Anything asked
 * for often enough to be worth mentioning but not built yet is named in "Not
 * here yet" at the bottom, where it cannot be mistaken for a feature.
 */

/** Which icon heads each section, by the id the guide text gives it. */
const SECTION_ICONS: Record<string, typeof Users> = {
  queue: Users,
  prescription: FileText,
  directory: BookUser,
  schedule: Calendar,
  chambers: Store,
  community: MessagesSquare,
  account: ShieldCheck,
};

const TIP_ICONS: Record<string, typeof Users> = {
  printing: Printer,
  medicines: Pill,
  walkins: Users,
  privacy: ShieldCheck,
};

const UserGuide = () => {
  const locale = useLocale();
  const guide = portalGuideText(locale);
  const [open, setOpen] = useState<string | null>("queue");
  const [faqOpen, setFaqOpen] = useState(0);

  return (
    <PortalLayout>
      <div className="max-w-6xl mx-auto space-y-10">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-10 shadow-soft"
        >
          <span className="inline-flex rounded-full bg-surface-dark-foreground/15 px-3 py-1 text-[10px] font-bold tracking-widest">
            {guide.kicker}
          </span>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">{guide.title}</h1>
          <p className="mt-3 text-sm opacity-80 max-w-2xl">{guide.intro}</p>
          <div className="mt-6">
            <a
              href="#sections"
              className="inline-flex items-center gap-2 rounded-full bg-accent text-primary px-5 py-2.5 text-xs font-semibold hover:bg-accent/80 transition-colors"
            >
              <BookOpen className="h-4 w-4" /> {guide.startReading}
            </a>
          </div>
        </motion.section>

        <section id="sections" className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <span className="inline-flex rounded-full bg-chip text-chip-foreground px-3 py-1 text-[10px] font-bold tracking-wider">
                {guide.walkthroughsKicker}
              </span>
              <h2 className="mt-3 font-display text-3xl text-primary">{guide.walkthroughsTitle}</h2>
            </div>
            <p className="text-xs text-muted-foreground hidden md:block">{guide.expandHint}</p>
          </div>

          <div className="grid gap-4">
            {guide.sections.map((s) => {
              const isOpen = open === s.id;
              const Icon = SECTION_ICONS[s.id] ?? BookOpen;
              return (
                <div key={s.id} className="rounded-3xl bg-card border border-border/60 shadow-soft overflow-hidden">
                  <button
                    onClick={() => setOpen(isOpen ? null : s.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-4 p-6 text-left"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-chip flex items-center justify-center text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-xl text-primary">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{s.summary}</p>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="grid md:grid-cols-2 gap-6 px-6 pb-6">
                          <div>
                            <h4 className="text-[10px] tracking-widest font-bold text-primary-glow">{guide.stepByStep}</h4>
                            <ol className="mt-3 space-y-2">
                              {s.steps.map((step, i) => (
                                <li key={i} className="flex gap-3 text-sm text-foreground/80">
                                  <span className="h-6 w-6 shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                                    {i + 1}
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                          <div className="rounded-2xl bg-muted/40 p-5 border border-border/50">
                            <h4 className="text-[10px] tracking-widest font-bold text-primary-glow">{guide.worthKnowing}</h4>
                            <ul className="mt-3 space-y-2">
                              {s.tips.map((tip, i) => (
                                <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                                  <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-accent shrink-0" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid md:grid-cols-4 gap-4">
          {guide.quickTips.map((tip) => {
            const Icon = TIP_ICONS[tip.id] ?? Lightbulb;
            return (
              <div key={tip.id} className="rounded-2xl bg-card border border-border/60 p-5 shadow-soft">
                <div className="h-10 w-10 rounded-xl bg-chip flex items-center justify-center text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="mt-3 font-semibold text-primary text-sm">{tip.t}</h4>
                <p className="text-xs text-muted-foreground mt-1">{tip.d}</p>
              </div>
            );
          })}
        </section>

        <section className="rounded-3xl bg-card border border-border/60 shadow-soft p-8">
          <span className="inline-flex rounded-full bg-chip text-chip-foreground px-3 py-1 text-[10px] font-bold tracking-wider">
            {guide.notYetKicker}
          </span>
          <h2 className="mt-3 font-display text-3xl text-primary">{guide.notYetTitle}</h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-2xl">{guide.notYetIntro}</p>
          <ul className="mt-5 grid md:grid-cols-2 gap-3">
            {guide.notYet.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-foreground/80">
                <CircleDashed className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid md:grid-cols-[1fr_2fr] gap-8 pb-6">
          <div>
            <span className="inline-flex rounded-full bg-chip text-chip-foreground px-3 py-1 text-[10px] font-bold tracking-wider">
              {guide.faqKicker}
            </span>
            <h2 className="mt-3 font-display text-3xl text-primary">{guide.faqTitle}</h2>
            <p className="text-xs text-muted-foreground mt-2">{guide.faqIntro}</p>
          </div>
          <div className="space-y-3">
            {guide.faqs.map((f, i) => (
              <div key={f.q} className="rounded-2xl bg-muted/40 border border-border/60 overflow-hidden">
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}
                  aria-expanded={faqOpen === i}
                  className="w-full flex items-center justify-between gap-3 p-5 text-left"
                >
                  <span className="font-semibold text-primary text-sm">{f.q}</span>
                  <ChevronDown className={`h-4 w-4 text-primary shrink-0 transition-transform ${faqOpen === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {faqOpen === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="px-5 pb-5 text-xs text-muted-foreground">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PortalLayout>
  );
};

export default UserGuide;
