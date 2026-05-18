'use client';
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Calendar, UserCircle, Wallet, Briefcase, Phone, Mail, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { usePageContent } from "@/data/pageContent";

const cats = [
  { icon: Calendar, t: "Appointments", d: "Manage, reschedule, or book new physical and virtual visits.", n: 12 },
  { icon: UserCircle, t: "My Profile", d: "Updating your health records, personal data, and security.", n: 8 },
  { icon: Wallet, t: "Billing & Plans", d: "Understanding wellness plans, payments, and insurance claims.", n: 15 },
  { icon: Briefcase, t: "Services", d: "Details on diagnostic tests, organic treatments, and rehab.", n: 24 },
];

const faqs = [
  { q: "How do I access my telehealth appointment?", a: "Simply log into the Patient Portal 10 minutes before your scheduled time. You will see a 'Join Meeting' button on your dashboard. Ensure your camera and microphone permissions are enabled on your browser or EcoHealth mobile app." },
  { q: "Are your wellness plans covered by standard insurance?", a: "Most major insurance providers cover our core wellness plans. Check with your provider or our billing team for specific coverage details." },
  { q: "How can I request a prescription refill?", a: "Navigate to the Prescriptions tab in your dashboard, select the medication, and click Request Refill. Your provider will respond within 24 hours." },
  { q: "What is the cancellation policy for specialized organic therapy?", a: "Cancellations made 24 hours in advance are fully refundable. Late cancellations may incur a fee of 50% of the session cost." },
];

const HelpCenter = () => {
  const [open, setOpen] = useState(0);
  const { content } = usePageContent();
  const p = content.helpCenter;
  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); toast.success("Message sent", { description: "We'll respond within 24 hours." }); };

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
            <div className="flex items-center bg-card rounded-full shadow-soft border border-border/60 px-5 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" placeholder={p.meta || "Search..."} />
              <button className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-xs font-semibold tracking-wider hover:bg-primary-glow transition-colors">SEARCH</button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Popular: <a href="#" className="underline">Booking Appointments</a>, <a href="#" className="underline">Telehealth Setup</a>, <a href="#" className="underline">Insurance Providers</a></p>
          </motion.div>
        </section>

        <section className="container mx-auto pb-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cats.map((c, i) => (
              <motion.a href="#" key={c.t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -4 }} className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft block">
                <div className="h-10 w-10 rounded-xl bg-chip flex items-center justify-center text-primary"><c.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-display text-xl text-primary">{c.t}</h3>
                <p className="text-xs text-muted-foreground mt-2">{c.d}</p>
                <p className="mt-5 text-xs font-semibold text-primary-glow">{c.n} Articles →</p>
              </motion.a>
            ))}
          </div>
        </section>

        <section className="container mx-auto pb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-10 grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="font-display text-3xl">Still need help?</h2>
              <p className="text-sm opacity-80 mt-3 max-w-sm">Our support team is available 24/7 for urgent care inquiries and platform assistance. Reach out via your preferred channel.</p>
              <div className="mt-8 space-y-5">
                <div className="flex gap-3"><Phone className="h-5 w-5 mt-1 text-accent" /><div><h4 className="font-semibold text-sm">24/7 Helpline</h4><p className="text-xs opacity-70 mt-1">+1 (800) ECO-HEALTH</p></div></div>
                <div className="flex gap-3"><Mail className="h-5 w-5 mt-1 text-accent" /><div><h4 className="font-semibold text-sm">Email Support</h4><p className="text-xs opacity-70 mt-1">care@ecohealth.wellness</p></div></div>
              </div>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <h3 className="font-display text-2xl">Send us a message</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] tracking-widest font-semibold opacity-70">FULL NAME</label><input required className="w-full mt-1 bg-surface-dark-foreground/10 rounded-md px-3 py-2 text-sm outline-none border border-surface-dark-foreground/15" /></div>
                <div><label className="text-[10px] tracking-widest font-semibold opacity-70">EMAIL ADDRESS</label><input required type="email" className="w-full mt-1 bg-surface-dark-foreground/10 rounded-md px-3 py-2 text-sm outline-none border border-surface-dark-foreground/15" /></div>
              </div>
              <div><label className="text-[10px] tracking-widest font-semibold opacity-70">SUBJECT</label>
                <select className="w-full mt-1 bg-surface-dark-foreground/10 rounded-md px-3 py-2 text-sm outline-none border border-surface-dark-foreground/15">
                  <option>Technical Issue</option><option>Billing Question</option><option>Appointment Help</option>
                </select></div>
              <div><label className="text-[10px] tracking-widest font-semibold opacity-70">MESSAGE</label><textarea required rows={4} className="w-full mt-1 bg-surface-dark-foreground/10 rounded-md px-3 py-2 text-sm outline-none border border-surface-dark-foreground/15" /></div>
              <button className="w-full rounded-full bg-accent text-primary py-3 text-sm font-semibold hover:bg-accent/80 transition-colors">Send Message</button>
            </form>
          </motion.div>
        </section>

        <section className="container mx-auto pb-20 grid md:grid-cols-[1fr_2fr] gap-10">
          <div>
            <span className="inline-flex rounded-full bg-chip text-chip-foreground px-3 py-1 text-[10px] font-bold tracking-wider">FREQUENTLY ASKED</span>
            <h2 className="mt-4 font-display text-4xl text-primary">Common Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={f.q} className="rounded-2xl bg-muted/40 border border-border/60 overflow-hidden">
                <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="font-semibold text-primary text-sm">{f.q}</span>
                  <ChevronDown className={`h-4 w-4 text-primary transition-transform ${open === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                      <p className="px-5 pb-5 text-xs text-muted-foreground">{f.a}</p>
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
