'use client';
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Lock, MessageSquare, CreditCard, Building2, Wallet, HelpCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { usePageContent } from "@/data/pageContent";

const toc = [
  "Acceptance of Terms", "Definitions", "Use of Services", "Privacy & Data Protection",
  "User Responsibilities", "Payments & Billing", "Limitation of Liability", "Termination",
];

const Terms = () => {
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
            {toc.map((t, i) => (
              <a key={t} href={`#sec-${i + 1}`} className="px-3 py-1.5 text-foreground/70 hover:text-primary font-medium">
                {i + 1}. {t}
              </a>
            ))}
          </nav>
          <div className="mt-6 rounded-2xl bg-muted/60 p-5">
            <h4 className="font-semibold text-primary text-sm">Need help?</h4>
            <p className="text-xs text-muted-foreground mt-1">Our legal team is available for clarification regarding these Terms.</p>
            <a href="/contact" className="mt-3 inline-block text-xs font-semibold text-primary border-b border-primary">Contact Support</a>
          </div>
        </aside>

        <div className="space-y-12">
          <section id="sec-1">
            <h2 className="font-display text-2xl text-primary">1. Acceptance of Terms</h2>
            <div className="mt-4 space-y-3 text-sm text-foreground/80 leading-relaxed">
              <p>By accessing or using the HealthFlow platform, including our website, mobile applications, and telehealth services (collectively, the "Service"), you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to all of these terms, you must not access or use the Service.</p>
              <p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to the website. Your continued use of the Service after changes are posted constitutes your acceptance of the modified terms.</p>
            </div>
          </section>

          <section id="sec-2">
            <h2 className="font-display text-2xl text-primary">2. Definitions</h2>
            <div className="grid sm:grid-cols-2 gap-4 mt-5">
              {[
                { t: "The Platform", d: "Refers to the HealthFlow software infrastructure, interfaces, and proprietary algorithms used to connect patients and providers." },
                { t: "Providers", d: "Refers to licensed medical professionals, clinics, and health practitioners utilizing our service to manage care." },
                { t: "Users", d: "Refers to individuals seeking medical consultation or care coordination through the HealthFlow ecosystem." },
                { t: "Content", d: "Includes all text, images, medical records, and interaction data generated within the secure platform environment." },
              ].map(d => (
                <motion.div key={d.t} whileHover={{ y: -3 }} className="rounded-2xl border border-border/60 bg-card p-5">
                  <h4 className="font-semibold text-primary text-sm">"{d.t}"</h4>
                  <p className="text-xs text-muted-foreground mt-2">{d.d}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section id="sec-3">
            <h2 className="font-display text-2xl text-primary">3. Use of Services</h2>
            <p className="mt-4 text-sm text-foreground/80">HealthFlow provides a technology platform to facilitate healthcare services. HealthFlow itself does not provide medical advice, diagnosis, or treatment. All medical decisions are made by the Providers who are independent contractors and not employees of HealthFlow.</p>
            <div className="mt-6 rounded-2xl bg-muted/60 p-5 border-l-4 border-primary">
              <div className="flex items-center gap-2 font-semibold text-primary text-sm"><AlertTriangle className="h-4 w-4" /> Emergency Notice</div>
              <p className="text-xs text-foreground/80 italic mt-2">IF YOU ARE EXPERIENCING A MEDICAL EMERGENCY, CALL 911 OR YOUR LOCAL EMERGENCY SERVICES IMMEDIATELY. HEALTHFLOW IS NOT FOR EMERGENCY CARE.</p>
            </div>
          </section>

          <section id="sec-4">
            <h2 className="font-display text-2xl text-primary">4. Privacy & Data Protection</h2>
            <p className="mt-4 text-sm text-foreground/80">Your privacy is our highest priority. We comply with the Health Insurance Portability and Accountability Act (HIPAA) and utilize industry standard encryption to protect your Sensitive Health Information (SHI).</p>
            <ul className="mt-4 space-y-2 text-sm text-foreground/80">
              {["Data is encrypted both in transit and at rest using AES-256 standards.", "Access to medical records is restricted to your authorized providers.", "We do not sell user health data to third-party advertisers."].map(t => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-primary-glow shrink-0" /> {t}</li>
              ))}
            </ul>
          </section>

          <section id="sec-5">
            <h2 className="font-display text-2xl text-primary">5. User Responsibilities</h2>
            <p className="mt-4 text-sm text-foreground/80">To maintain a restorative and safe environment, users agree to:</p>
            <div className="mt-4 space-y-3">
              {[
                { icon: CheckCircle2, t: "Accurate Information", d: "Provide complete and truthful health history and personal identity details." },
                { icon: Lock, t: "Account Security", d: "Maintain the confidentiality of login credentials and notify us of any unauthorized access." },
                { icon: MessageSquare, t: "Respectful Interaction", d: "Communicate with providers in a professional and respectful manner." },
              ].map(i => (
                <div key={i.t} className="rounded-2xl bg-muted/60 p-5">
                  <div className="flex items-center gap-2 font-semibold text-primary text-sm"><i.icon className="h-4 w-4" /> {i.t}</div>
                  <p className="text-xs text-muted-foreground mt-2 ml-6">{i.d}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="sec-6">
            <h2 className="font-display text-2xl text-primary">6. Payments & Billing</h2>
            <div className="grid sm:grid-cols-[2fr_1fr] gap-4 mt-5">
              <div className="rounded-2xl bg-muted/60 p-6">
                <h4 className="font-semibold text-primary">Billing Cycles</h4>
                <p className="text-xs text-muted-foreground mt-2">Subscription fees are billed at the start of your cycle. One-time consultation fees are processed upon booking confirmation.</p>
                <div className="flex gap-3 mt-4 text-primary"><CreditCard className="h-4 w-4" /><Building2 className="h-4 w-4" /><Wallet className="h-4 w-4" /></div>
              </div>
              <div className="rounded-2xl bg-accent/40 p-6">
                <h4 className="font-semibold text-primary">Refunds</h4>
                <p className="text-xs text-foreground/80 mt-2">Cancellations made 24 hours before appointments are eligible for full refund. Subscription pro-rating applies for early termination.</p>
              </div>
            </div>
          </section>

          <section id="sec-7">
            <h2 className="font-display text-2xl text-primary">7. Limitation of Liability</h2>
            <p className="mt-4 text-sm text-foreground/80">To the maximum extent permitted by law, HealthFlow and its affiliates, officers, and employees shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.</p>
          </section>

          <section id="sec-8">
            <h2 className="font-display text-2xl text-primary">8. Termination</h2>
            <p className="mt-4 text-sm text-foreground/80">We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
          </section>

          <div className="text-center pt-8">
            <p className="text-xs text-muted-foreground mb-4">By clicking below, you acknowledge that you have read and understood these Terms.</p>
            <button className="rounded-full bg-primary text-primary-foreground px-8 py-3 text-sm font-semibold hover:bg-primary-glow transition-colors">I Agree to the Terms</button>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </div>
  );
};
export default Terms;
