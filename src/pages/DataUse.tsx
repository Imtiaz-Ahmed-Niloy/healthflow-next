"use client";

import { motion } from "framer-motion";
import { Shield, ShieldPlus, Lock, Eye, Accessibility, ArrowRight, LogIn, MessageSquareQuote, Archive } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { usePageContent } from "@/data/pageContent";

const DataUse = () => {
  const { content } = usePageContent();
  const p = content.dataUse;
  return (
  <div className="min-h-screen bg-gradient-hero">
    <Navbar />
    <main className="container mx-auto py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
        <span className="inline-flex rounded-full bg-chip text-chip-foreground px-4 py-1.5 text-xs font-semibold">{p.badge}</span>
        <h1 className="mt-5 font-display text-5xl md:text-7xl text-primary">{p.title}</h1>
        <p className="text-muted-foreground mt-5 text-base">{p.description}</p>
        {p.meta && <p className="text-muted-foreground mt-3 text-sm">{p.meta}</p>}
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5 mt-14">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="md:col-span-2 rounded-3xl border border-border/60 bg-card p-7">
          <div className="h-10 w-10 rounded-xl bg-chip flex items-center justify-center text-primary"><Shield className="h-5 w-5" /></div>
          <h3 className="mt-4 font-display text-2xl text-primary">Data Sovereignty</h3>
          <p className="text-sm text-muted-foreground mt-3 max-w-lg">You own your health records. HealthFlow acts as a secure custodian, ensuring your Protected Health Information (PHI) is never sold, leased, or shared with third-party advertisers. Your data remains yours, fully portable and accessible at any time.</p>
          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            <div className="rounded-2xl bg-muted/60 p-4">
              <h4 className="text-sm font-semibold text-primary">Portability</h4>
              <p className="text-xs text-muted-foreground mt-1">Export your records in industry-standard formats.</p>
            </div>
            <div className="rounded-2xl bg-muted/60 p-4">
              <h4 className="text-sm font-semibold text-primary">Permanence</h4>
              <p className="text-xs text-muted-foreground mt-1">Your history is preserved with high-availability backups.</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-7">
          <div className="h-10 w-10 rounded-xl bg-surface-dark-foreground/15 flex items-center justify-center"><ShieldPlus className="h-5 w-5" /></div>
          <h3 className="mt-4 font-display text-2xl">HIPAA Compliant</h3>
          <p className="text-sm opacity-80 mt-3">We adhere to the highest regulatory standards for administrative, physical, and technical safeguards.</p>
          <p className="mt-8 text-[10px] tracking-widest font-semibold opacity-70 border-t border-surface-dark-foreground/20 pt-4">CERTIFIED SECURE ECOSYSTEM</p>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mt-5">
        {[
          { icon: Lock, t: "End-to-End Encryption", d: "All data is encrypted in transit using TLS 1.3 and at rest using AES-256 standards. Even in the unlikely event of a breach, your data remains unreadable." },
          { icon: Eye, t: "Audit Transparency", d: "Every interaction with your health record is logged. You can request an accounting of disclosures at any time to see exactly who accessed your data." },
          { icon: Accessibility, t: "Granular Consent", d: "Control exactly which providers can see specific parts of your medical history. Toggle permissions on a per-visit or per-provider basis." },
        ].map((c, i) => (
          <motion.div key={c.t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }}
            className="rounded-3xl bg-muted/40 border border-border/60 p-7">
            <c.icon className="h-5 w-5 text-primary" />
            <h3 className="mt-4 font-display text-xl text-primary">{c.t}</h3>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{c.d}</p>
          </motion.div>
        ))}
      </div>

      {/* Flow */}
      <section className="mt-20">
        <h2 className="text-center font-display text-3xl md:text-4xl text-primary">How Your Information Moves</h2>
        <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 mt-10">
          {[
            { icon: LogIn, t: "COLLECTION", d: "We collect clinical data during visits, including symptoms, diagnoses, medications, and insurance details to facilitate care." },
            { icon: MessageSquareQuote, t: "UTILIZATION", d: "Data is shared only with authorized specialists and pharmacists to provide integrated treatment and billing services." },
            { icon: Archive, t: "RETENTION", d: "We retain records for the duration required by state and federal laws, typically 7-10 years, before secure deletion." },
          ].map((s, i) => (
            <div key={s.t} className="contents">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.15 }}
                className="rounded-2xl bg-muted/40 border-l-4 border-primary p-5 h-full">
                <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary"><s.icon className="h-4 w-4" /> {s.t}</div>
                <p className="text-xs text-muted-foreground mt-3">{s.d}</p>
              </motion.div>
              {i < 2 && <ArrowRight className="hidden md:block text-muted-foreground mx-auto" />}
            </div>
          ))}
        </div>
      </section>

      <motion.section initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
        className="mt-16 rounded-3xl bg-accent/40 p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <div>
          <h3 className="font-display text-2xl text-primary">Questions about your data?</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">Our dedicated Privacy Officer is available to discuss your rights and help you manage your health record preferences.</p>
        </div>
        <div className="flex gap-3">
          <a href="/contact" className="rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:bg-primary-glow transition-colors">Contact Privacy Officer</a>
          <a href="/help-center" className="rounded-full bg-card text-primary px-5 py-3 text-sm font-semibold border border-border hover:bg-muted/60 transition-colors">Read FAQ</a>
        </div>
      </motion.section>
    </main>
    <Footer />
  </div>
  );
};
export default DataUse;

