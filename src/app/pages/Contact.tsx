'use client';
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Leaf, ChevronDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "General Inquiry", message: "" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll respond within 2 hours.");
    setForm({ name: "", email: "", subject: "General Inquiry", message: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-hero"><main className="container mx-auto py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
          <span className="text-xs font-bold tracking-[0.2em] text-primary-glow">GET IN TOUCH</span>
          <h1 className="font-display text-4xl md:text-6xl text-primary mt-4 leading-[1.05]">
            Restorative support, whenever you need it.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-xl">
            Our team is here to ensure your journey with HealthFlow is seamless. Reach out for medical inquiries, technical support, or to learn more about our restorative care philosophy.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 mt-14">
          {/* Form */}
          <motion.form onSubmit={onSubmit}
            initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="rounded-3xl bg-card border border-border/60 shadow-soft p-8 space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold tracking-wider text-foreground/70">FULL NAME</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="E.g. Julian Reed" className="mt-2 w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-bold tracking-wider text-foreground/70">EMAIL ADDRESS</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="julian@example.com" className="mt-2 w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold tracking-wider text-foreground/70">SUBJECT</label>
              <div className="relative mt-2">
                <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full appearance-none rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
                  <option>General Inquiry</option>
                  <option>Technical Support</option>
                  <option>Medical Inquiry</option>
                  <option>Sales</option>
                </select>
                <ChevronDown className="h-4 w-4 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold tracking-wider text-foreground/70">HOW CAN WE HELP?</label>
              <textarea required rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Your message..." className="mt-2 w-full rounded-xl bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            <button type="submit" className="w-full rounded-full bg-primary text-primary-foreground py-4 font-semibold hover:bg-primary-glow transition-colors">
              Send Message
            </button>
          </motion.form>

          {/* Right column */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="space-y-10">
            <div>
              <h2 className="font-display text-2xl md:text-3xl text-primary">Direct Support</h2>
              <div className="mt-6 space-y-5">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-accent/40 grid place-items-center shrink-0"><Mail className="h-4 w-4 text-primary" /></div>
                  <div>
                    <div className="font-semibold text-primary">Email Support</div>
                    <div className="text-xs text-muted-foreground">Response time: Within 2 hours</div>
                    <a href="mailto:care@healthflow.co" className="text-sm text-primary-glow hover:underline">care@healthflow.co</a>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-accent/40 grid place-items-center shrink-0"><Phone className="h-4 w-4 text-primary" /></div>
                  <div>
                    <div className="font-semibold text-primary">Phone Inquiries</div>
                    <div className="text-xs text-muted-foreground">Mon - Fri, 8am - 6pm EST</div>
                    <a href="tel:+15550000000" className="text-sm text-primary-glow hover:underline">+1 (555) 000-HEALTH</a>
                  </div>
                </div>
                <a href="tel:16502" className="inline-flex items-center justify-center gap-3 rounded-lg bg-primary text-primary-foreground px-10 py-6 text-lg font-bold hover:bg-primary-glow transition-colors shadow-soft mt-3">
                  <Phone className="h-6 w-6" />
                  Call Help Center: 16502
                </a>
              </div>
            </div>

            <div className="border-t border-border/60 pt-8">
              <h2 className="font-display text-2xl md:text-3xl text-primary">Our Sanctuary</h2>
              <p className="text-sm text-muted-foreground mt-3">Located in the heart of the regenerative district, our primary clinic is designed for tranquility.</p>
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
                  <div className="text-[10px] font-bold tracking-wider text-muted-foreground">HEADQUARTERS</div>
                  <div className="text-sm font-semibold text-primary">1200 Serenity Way, SF</div>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-muted/70 p-5 flex gap-4 items-center">
                <div className="h-10 w-10 rounded-xl bg-accent/60 grid place-items-center shrink-0"><Leaf className="h-4 w-4 text-primary" /></div>
                <div>
                  <div className="font-semibold text-primary">Eco-Certified Clinic</div>
                  <div className="text-xs text-muted-foreground">Our facilities operate on 100% renewable energy and utilize restorative biophilic design.</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main></div>
  );
};
export default Contact;
