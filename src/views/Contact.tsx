"use client";

import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { MapPin, Leaf, ChevronDown, Linkedin, Facebook } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { useCmsHero } from "@/data/useCmsHero";
import { useContactContent } from "@/data/cmsContact";
import { BRAND_INFO } from "@/constants/brand";

const Ico = ({ name, className }: { name: string; className?: string }) => {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? Icons.Sparkles;
  return <C className={className} />;
};

const Contact = () => {
  const { content: heroContent } = useCmsHero();
  const hero = heroContent.contact;
  const { content } = useContactContent();
  const { form: f, support, sanctuary } = content;

  const [form, setForm] = useState({ name: "", email: "", subject: f.subjects[0] ?? "", message: "" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(f.successMessage);
    setForm({ name: "", email: "", subject: f.subjects[0] ?? "", message: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main className="container mx-auto py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
          {hero.eyebrow && <span className="text-xs font-bold tracking-[0.2em] text-primary-glow">{hero.eyebrow}</span>}
          <h1 className="font-display text-4xl md:text-6xl text-primary mt-4 leading-[1.05]">{hero.title}</h1>
          <p className="text-muted-foreground mt-5 max-w-xl">{hero.description}</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 mt-14">
          <motion.form onSubmit={onSubmit}
            initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="rounded-3xl bg-card border border-border/60 shadow-soft p-8 space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold tracking-wider text-foreground/70">{f.nameLabel}</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder={f.namePlaceholder} className="mt-2 w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-bold tracking-wider text-foreground/70">{f.emailLabel}</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder={f.emailPlaceholder} className="mt-2 w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold tracking-wider text-foreground/70">{f.subjectLabel}</label>
              <div className="relative mt-2">
                <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full appearance-none rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
                  {f.subjects.map(s => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown className="h-4 w-4 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold tracking-wider text-foreground/70">{f.messageLabel}</label>
              <textarea required rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder={f.messagePlaceholder} className="mt-2 w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <button type="submit" className="w-full rounded-full bg-primary text-primary-foreground py-4 font-semibold hover:bg-primary-glow transition-colors">
              {f.submitLabel}
            </button>
          </motion.form>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="space-y-10">
            <div>
              <h2 className="font-display text-2xl md:text-3xl text-primary">{support.title}</h2>
              <div className="mt-6 space-y-5">
                {support.channels.map((c, i) => (
                  <div key={`${c.title}-${i}`} className="flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-accent/40 grid place-items-center shrink-0"><Ico name={c.icon} className="h-4 w-4 text-primary" /></div>
                    <div>
                      <div className="font-semibold text-primary">{c.title}</div>
                      {c.meta && <div className="text-xs text-muted-foreground">{c.meta}</div>}
                      {c.value && <a href={c.href} className="text-sm text-primary-glow hover:underline">{c.value}</a>}
                    </div>
                  </div>
                ))}
                {support.helpline.label && (
                  <a href={support.helpline.href} className="inline-flex items-center justify-center gap-3 rounded-lg bg-primary text-primary-foreground px-10 py-6 text-lg font-bold hover:bg-primary-glow transition-colors shadow-soft mt-3">
                    <Ico name="Phone" className="h-6 w-6" />
                    {support.helpline.label}
                  </a>
                )}
              </div>
            </div>

            <div className="border-t border-border/60 pt-8">
              <h2 className="font-display text-2xl md:text-3xl text-primary">{sanctuary.title}</h2>
              <p className="text-sm text-muted-foreground mt-3">{sanctuary.description}</p>
              <div className="relative mt-5 rounded-2xl overflow-hidden h-56 bg-muted">
                <div className="absolute inset-0 opacity-70" style={{
                  backgroundImage: `linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(45deg, hsl(var(--muted)) 25%, hsl(var(--accent) / 0.3) 25%, hsl(var(--accent) / 0.3) 75%, hsl(var(--muted)) 75%)`,
                  backgroundSize: "40px 40px",
                  backgroundPosition: "0 0, 20px 20px",
                }} />
                <div className="absolute inset-0 grid place-items-center">
                  <MapPin className="h-10 w-10 text-primary drop-shadow-lg animate-float" />
                </div>
                <div className="absolute bottom-4 left-4 bg-card rounded-xl shadow-card px-4 py-2">
                  <div className="text-[10px] font-bold tracking-wider text-muted-foreground">{sanctuary.badgeLabel}</div>
                  <div className="text-sm font-semibold text-primary">{sanctuary.address}</div>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-muted/70 p-5 flex gap-4 items-center">
                <div className="h-10 w-10 rounded-xl bg-accent/60 grid place-items-center shrink-0"><Leaf className="h-4 w-4 text-primary" /></div>
                <div>
                  <div className="font-semibold text-primary">{sanctuary.noteTitle}</div>
                  <div className="text-xs text-muted-foreground">{sanctuary.noteDescription}</div>
                </div>
              </div>
            </div>
            <div className="border-t border-border/60 pt-8">
              <h2 className="font-display text-2xl md:text-3xl text-primary">Follow Us</h2>
              <p className="text-sm text-muted-foreground mt-3">Stay connected with {BRAND_INFO.name} for the latest updates and insights.</p>
              <div className="mt-5 flex gap-4">
                <a href={BRAND_INFO.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-card border border-border/60 px-5 py-3 hover:border-primary/40 hover:bg-accent/30 transition-colors">
                  <Linkedin className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-primary">LinkedIn</span>
                </a>
                <a href={BRAND_INFO.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-card border border-border/60 px-5 py-3 hover:border-primary/40 hover:bg-accent/30 transition-colors">
                  <Facebook className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-primary">Facebook</span>
                </a>
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

