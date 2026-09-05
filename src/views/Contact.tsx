"use client";

import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { Leaf, ChevronDown, Linkedin, Facebook } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import type { CmsHeroFields } from "@/data/cmsPageHero";
import type { ContactContent } from "@/data/contactContent";
import { BRAND_INFO } from "@/constants/brand";
import { Label } from "@/components/ui/label";
import TiltCard from "@/components/site/TiltCard";

const Ico = ({ name, className }: { name: string; className?: string }) => {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? Icons.Sparkles;
  return <C className={className} />;
};

/** One definition for every field on the form, rather than six copies. */
const inputClass =
  "mt-2 w-full rounded-xl bg-muted/60 border border-border/60 px-4 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-2 focus:ring-primary/25";

const Contact = ({ hero, content }: { hero: CmsHeroFields; content: ContactContent }) => {
  const { form: f, support, sanctuary } = content;

  const [form, setForm] = useState({ name: "", email: "", subject: f.subjects[0] ?? "", message: "" });
  const [sending, setSending] = useState(false);

  /**
   * The success toast fires only after the write actually succeeded. It used to
   * fire unconditionally, with nothing behind it — the visitor was told
   * "Message sent" and the message was discarded.
   */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);

    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error(String(res.status));

      toast.success(f.successMessage);
      setForm({ name: "", email: "", subject: f.subjects[0] ?? "", message: "" });
    } catch {
      // The fields are kept on purpose so a retry does not mean retyping.
      toast.error("We couldn't send your message. Please try again, or email us directly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />

      <main>
        {/* The masthead sits on its own tinted band, so the page opens with
            something rather than dropping straight into a form. */}
        <section className="relative overflow-hidden border-b border-border/50">
          <div aria-hidden className="absolute -top-40 -left-24 h-[26rem] w-[26rem] rounded-full bg-accent/40 blur-[120px]" />
          <div aria-hidden className="absolute -bottom-48 right-[8%] h-[24rem] w-[24rem] rounded-full bg-chip/50 blur-[110px]" />

          <div className="relative container mx-auto py-16 md:py-20">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="font-display text-4xl md:text-6xl text-primary leading-[1.05]">{hero.title}</h1>
              <p className="text-muted-foreground mt-5 text-lg whitespace-pre-line">{hero.description}</p>
            </motion.div>
          </div>
        </section>

        {/* Five columns rather than two halves: a form wants room to breathe,
            and the column beside it is short lines that do not. */}
        <div className="container mx-auto grid lg:grid-cols-5 gap-8 lg:gap-10 py-16">
          <motion.form onSubmit={onSubmit}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="lg:col-span-3 rounded-3xl bg-card border border-border/60 shadow-card p-7 md:p-9">
            <h2 className="font-display text-2xl text-primary">Send us a message</h2>
            <p className="text-sm text-muted-foreground mt-2">We read every message and reply to most within a working day.</p>

            <div className="mt-7 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Label className="text-xs font-bold tracking-wider text-foreground/70" required>{f.nameLabel}</Label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder={f.namePlaceholder} className={inputClass} />
                </div>
                <div>
                  <Label className="text-xs font-bold tracking-wider text-foreground/70" required>{f.emailLabel}</Label>
                  <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder={f.emailPlaceholder} className={inputClass} />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold tracking-wider text-foreground/70">{f.subjectLabel}</Label>
                <div className="relative">
                  <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                    className={`${inputClass} appearance-none pr-10`}>
                    {f.subjects.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-4 bottom-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold tracking-wider text-foreground/70" required>{f.messageLabel}</Label>
                {/* Tall, and draggable taller: people write more than three
                    lines here and should not have to type into a slot. */}
                <textarea required rows={7} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder={f.messagePlaceholder} className={`${inputClass} min-h-[11rem] resize-y`} />
              </div>

              <button type="submit" disabled={sending}
                className="w-full rounded-full bg-primary text-primary-foreground py-4 font-semibold shadow-soft transition-all hover:bg-primary-glow hover:shadow-card disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-soft">
                {sending ? "Sending…" : f.submitLabel}
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Please don&apos;t send medical details or documents here — this is a general enquiry form.
              </p>
            </div>
          </motion.form>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="font-display text-2xl text-primary">{support.title}</h2>
              <div className="mt-5 space-y-3">
                {support.channels.map((c, i) => (
                  // A card each, and the whole card is the link when there is
                  // somewhere to go: a phone number is a small target otherwise.
                  <TiltCard key={`${c.title}-${i}`} delay={i * 0.06} maxTilt={6} lift={4}
                    className="rounded-2xl bg-card border border-border/60 shadow-soft transition-shadow duration-300 hover:shadow-card">
                  <a href={c.href || undefined} className="flex gap-4 p-4">
                    <div className="h-12 w-12 rounded-xl bg-accent/25 grid place-items-center shrink-0 ring-2 ring-transparent transition-all duration-300 group-hover:bg-accent/35 group-hover:ring-accent">
                      <Ico name={c.icon} className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-primary">{c.title}</div>
                      {c.value && <div className="text-sm text-primary-glow mt-1 truncate">{c.value}</div>}
                      {c.meta && <div className="text-xs text-muted-foreground mt-1">{c.meta}</div>}
                    </div>
                  </a>
                  </TiltCard>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl text-primary">{sanctuary.title}</h2>
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{sanctuary.description}</p>

              <TiltCard maxTilt={6} lift={4}
                className="mt-5 flex gap-4 items-center rounded-2xl bg-card border border-border/60 p-5 shadow-soft transition-shadow duration-300 hover:shadow-card">
                <div className="h-12 w-12 rounded-xl bg-accent/25 grid place-items-center shrink-0 ring-2 ring-transparent transition-all duration-300 group-hover:bg-accent/35 group-hover:ring-accent">
                  <Leaf className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-primary">{sanctuary.noteTitle}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{sanctuary.noteDescription}</div>
                </div>
              </TiltCard>
            </div>

            <div>
              <h2 className="font-display text-2xl text-primary">Follow Us</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Stay connected with {BRAND_INFO.name} for the latest updates and insights.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <TiltCard maxTilt={10} lift={4} className="rounded-2xl bg-card border border-border/60 shadow-soft transition-shadow duration-300 hover:shadow-card">
                  <a href={BRAND_INFO.linkedin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 px-4 py-3.5">
                    <Linkedin className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                    <span className="text-sm font-semibold text-primary">LinkedIn</span>
                  </a>
                </TiltCard>
                <TiltCard maxTilt={10} lift={4} delay={0.06} className="rounded-2xl bg-card border border-border/60 shadow-soft transition-shadow duration-300 hover:shadow-card">
                  <a href={BRAND_INFO.facebook} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 px-4 py-3.5">
                    <Facebook className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                    <span className="text-sm font-semibold text-primary">Facebook</span>
                  </a>
                </TiltCard>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
export default Contact;