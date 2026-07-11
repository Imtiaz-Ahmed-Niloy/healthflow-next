"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { User, FileText, Stethoscope, Globe, HelpCircle, Lock, Shield, CloudOff, Eye, Pencil, Trash2, ShieldCheck } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
const hipaaImg = "/assets/hipaa-shield.jpg";
import { usePageContent } from "@/data/pageContent";

const sections = [
  { id: "introduction", label: "Introduction" },
  { id: "information-collection", label: "Information Collection" },
  { id: "how-we-use-data", label: "How We Use Data" },
  { id: "hipaa-compliance", label: "HIPAA Compliance" },
  { id: "information-sharing", label: "Information Sharing" },
  { id: "data-security", label: "Data Security" },
  { id: "your-rights", label: "Your Rights" },
];

const Privacy = () => {
  const [active, setActive] = useState("introduction");
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
            <p className="text-xs uppercase tracking-widest text-muted-foreground px-3">On this page</p>
            <nav className="flex flex-col gap-1 text-sm">
              {sections.map(s => (
                <a key={s.id} href={`#${s.id}`}
                  className={`px-3 py-2 rounded-md transition-colors ${active === s.id ? "bg-chip text-primary font-semibold" : "text-foreground/70 hover:bg-muted/50"}`}>
                  {s.label}
                </a>
              ))}
            </nav>
            <div className="mt-6 rounded-2xl bg-muted/60 p-5">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h4 className="mt-3 font-semibold text-primary text-sm">Need clarification?</h4>
              <p className="text-xs text-muted-foreground mt-1">Our legal team is available to explain any part of this policy in plain language.</p>
              <a href="/contact" className="mt-3 inline-block text-xs font-semibold text-primary border-b border-primary">Contact Privacy Team</a>
            </div>
          </aside>

          {/* Content */}
          <div className="space-y-14">
            <section id="introduction">
              <h2 className="font-display text-2xl text-primary">1. Introduction</h2>
              <div className="mt-4 space-y-4 text-sm text-foreground/80 leading-relaxed">
                <p>Welcome to HealthFlow. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us.</p>
                <p>When you use our services, you trust us with your personal health information. We take this responsibility seriously. This policy applies to all information collected through our website, mobile application, and any related services, sales, marketing, or events.</p>
              </div>
            </section>

            <hr className="border-border/60" />

            <section id="information-collection">
              <h2 className="font-display text-2xl text-primary">2. Information Collection</h2>
              <p className="mt-4 text-sm text-foreground/80">We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services.</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-border/60 bg-card p-5">
                  <div className="flex items-center gap-2 font-semibold text-primary"><User className="h-4 w-4" /> Personal Data</div>
                  <ul className="mt-3 text-xs text-muted-foreground space-y-1.5 text-center">
                    <li>Legal name and contact information</li>
                    <li>Biometric data (weight, age, gender)</li>
                    <li>Insurance provider details</li>
                    <li>Billing and payment information</li>
                  </ul>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-border/60 bg-card p-5">
                  <div className="flex items-center gap-2 font-semibold text-primary"><FileText className="h-4 w-4" /> Health Information</div>
                  <ul className="mt-3 text-xs text-muted-foreground space-y-1.5 text-center">
                    <li>Medical history and diagnosis</li>
                    <li>Prescription records</li>
                    <li>Lab test results and imaging</li>
                    <li>Provider consultation notes</li>
                  </ul>
                </motion.div>
              </div>
            </section>

            <hr className="border-border/60" />

            <section id="how-we-use-data">
              <h2 className="font-display text-2xl text-primary">3. How We Use Data</h2>
              <p className="mt-4 text-sm text-foreground/80">We use personal information collected via our Services for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.</p>
              <div className="mt-6 rounded-2xl bg-muted/60 p-6 space-y-4">
                {[
                  { icon: Stethoscope, t: "Service Delivery", d: "To provide the restorative care services you requested and facilitate medical consultations." },
                  { icon: FileText, t: "Service Improvement", d: "Anonymized data is used to improve our clinical algorithms and patient outcomes." },
                  { icon: Globe, t: "Security & Protection", d: "To protect our services and your data from fraudulent or malicious activities." },
                ].map(i => (
                  <div key={i.t} className="flex gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-chip flex items-center justify-center text-primary"><i.icon className="h-4 w-4" /></div>
                    <div>
                      <h4 className="font-semibold text-primary text-sm">{i.t}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{i.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="hipaa-compliance">
              <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
                className="mt-4 rounded-3xl border border-accent/60 bg-accent/20 p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
                <div>
                  <h2 className="font-display text-2xl text-primary">4. HIPAA Compliance</h2>
                  <p className="mt-3 text-sm text-foreground/80 max-w-md">HealthFlow is a "covered entity" under the Health Insurance Portability and Accountability Act (HIPAA). This means we are legally required to maintain the privacy of your protected health information (PHI) and to provide you with notice of our legal duties and privacy practices.</p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="h-4 w-4" /> Fully HIPAA Certified & Audited</div>
                </div>
                <img src={hipaaImg} alt="HIPAA compliance badge" loading="lazy" width={180} height={180} className="rounded-2xl shadow-glow" />
              </motion.div>
            </section>

            <section id="information-sharing">
              <h2 className="font-display text-2xl text-primary">5. Information Sharing</h2>
              <p className="mt-4 text-sm text-foreground/80">We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. We never sell your personal data to advertisers.</p>
            </section>

            <section id="data-security">
              <h2 className="font-display text-2xl text-primary">5. Data Security</h2>
              <p className="mt-4 text-sm text-foreground/80">We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.</p>
              <div className="grid sm:grid-cols-3 gap-4 mt-6">
                {[
                  { icon: Lock, t: "AES-256 Encryption" },
                  { icon: Shield, t: "2FA Mandatory" },
                  { icon: CloudOff, t: "Cold Storage Backups" },
                ].map(i => (
                  <motion.div key={i.t} whileHover={{ y: -3 }} className="rounded-2xl border border-border/60 bg-card p-5 text-center">
                    <i.icon className="h-5 w-5 text-primary mx-auto" />
                    <p className="mt-3 text-xs font-semibold text-primary">{i.t}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            <section id="your-rights">
              <h2 className="font-display text-2xl text-primary">6. Your Rights</h2>
              <p className="mt-4 text-sm text-foreground/80">Under certain jurisdictions (such as GDPR or CCPA), you have specific rights regarding your personal information. These may include the right to:</p>
              <div className="mt-6 space-y-5">
                {[
                  { icon: Eye, t: "Access & Review", d: "Request a copy of the data we hold about you at any time." },
                  { icon: Pencil, t: "Rectification", d: "Correct any inaccuracies in your personal or health records." },
                  { icon: Trash2, t: "Erasure", d: "Request that we delete your personal data from our active systems." },
                ].map(i => (
                  <div key={i.t} className="flex gap-3">
                    <i.icon className="h-4 w-4 mt-1 text-primary" />
                    <div>
                      <h4 className="font-semibold text-sm text-primary">{i.t}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{i.d}</p>
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

