'use client';
import { motion } from "framer-motion";
import { Leaf, HeartPulse, ShieldCheck, Link2, Mail } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import hero from "@/assets/about-hero.jpg";
import t1 from "@/assets/team-1.jpg";
import t2 from "@/assets/team-2.jpg";
import t3 from "@/assets/team-3.jpg";
import t4 from "@/assets/team-4.jpg";

const pillars = [
  { icon: Leaf, title: "Organic Growth", desc: "Systems that evolve naturally with your practice, ensuring longevity and adaptability in a shifting medical landscape." },
  { icon: HeartPulse, title: "Patient-First Precision", desc: "Every line of code is written with the patient experience in mind, prioritizing restorative outcomes over processing speed." },
  { icon: ShieldCheck, title: "Unwavering Integrity", desc: "Security and compliance aren't just features; they are the bedrock of the trust we build with providers and patients alike." },
];

const team = [
  { img: t1, name: "Dr. Elena Thorne", role: "Chief Medical Officer" },
  { img: t2, name: "Marcus Vane", role: "Head of Product Design" },
  { img: t3, name: "Julian Chen", role: "CTO & Founder" },
  { img: t4, name: "Sarah Jenkins", role: "VP of Operations" },
];

const stats = [
  { v: "500+", l: "Clinics Empowered" },
  { v: "1M+", l: "Patients Served" },
  { v: "99.9%", l: "Uptime Reliability" },
  { v: "15+", l: "Global Awards" },
];

const About = () => (
  <div className="min-h-screen bg-gradient-hero">
    <Navbar />
    <main>
      {/* Hero with overlay */}
      <section className="container mx-auto pt-8">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}
          className="relative rounded-3xl overflow-hidden">
          <img src={hero} alt="HealthFlow clinical environment" width={1600} height={900} className="w-full h-[460px] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/10" />
          <div className="absolute inset-0 p-8 md:p-14 flex flex-col justify-center max-w-2xl">
            <span className="text-xs font-bold tracking-[0.2em] text-primary-glow">OUR STORY</span>
            <h1 className="font-display text-4xl md:text-6xl text-primary mt-4 leading-tight">Restoring Clarity to Healthcare</h1>
            <p className="mt-5 text-muted-foreground max-w-md">
              We believe that medical technology should feel as natural as the care it facilitates. HealthFlow was born from a vision to simplify complex systems through organic design.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Foundational Pillars */}
      <section className="container mx-auto py-20">
        <div className="text-center">
          <h2 className="font-display text-3xl md:text-4xl text-primary inline-block">Foundational Pillars</h2>
          <div className="mx-auto mt-3 h-0.5 w-16 bg-primary-glow rounded-full" />
        </div>
        <div className="grid md:grid-cols-3 gap-0 mt-12 rounded-3xl border border-border/60 bg-card overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border/60">
          {pillars.map((p, i) => (
            <motion.div key={p.title}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-8">
              <div className="h-11 w-11 rounded-xl bg-accent/40 grid place-items-center"><p.icon className="h-5 w-5 text-primary" /></div>
              <h3 className="font-display text-xl text-primary mt-5">{p.title}</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Visionaries */}
      <section className="bg-muted/60 py-20">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <span className="text-xs font-bold tracking-[0.2em] text-primary-glow">OUR LEADERSHIP</span>
              <h2 className="font-display text-3xl md:text-5xl text-primary mt-3">The Visionaries</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">Meet the multidisciplinary team bridging the gap between clinical excellence and digital innovation.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
            {team.map((m, i) => (
              <motion.div key={m.name}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-3xl bg-card border border-border/60 overflow-hidden shadow-soft hover:shadow-card transition-all hover:-translate-y-1 group">
                <div className="overflow-hidden">
                  <img src={m.img} alt={m.name} width={600} height={800} loading="lazy" className="w-full h-72 object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <div className="font-semibold text-primary">{m.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.role}</div>
                  <div className="flex gap-2 mt-3 text-muted-foreground">
                    <a href="#" aria-label="Website" className="hover:text-primary"><Link2 className="h-4 w-4" /></a>
                    <a href="#" aria-label="Email" className="hover:text-primary"><Mail className="h-4 w-4" /></a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <motion.div key={s.l}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}>
              <div className="font-display text-4xl md:text-5xl text-primary-glow">{s.v}</div>
              <div className="text-sm text-muted-foreground mt-2">{s.l}</div>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
    <Footer />
  </div>
);
export default About;
