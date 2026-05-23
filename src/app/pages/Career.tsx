'use client';
import { useState } from "react";
import { motion } from "framer-motion";
import { Leaf, FlaskConical, Palette, ClipboardList, MapPin, Clock, Search, ArrowRight } from "lucide-react";
import careerHero from "@/assets/career-hero.jpg";

const tabs = ["All", "Medical Research", "Wellness Tips", "Nutrition", "Mental Health"];

const jobs = [
  { icon: FlaskConical, t: "Senior Neurobiologist", loc: "Portland, OR", time: "Full-Time", tag: "RESEARCH" },
  { icon: Palette, t: "Product Designer", loc: "Remote", time: "Full-Time", tag: "DESIGN" },
  { icon: ClipboardList, t: "Clinic Operations Lead", loc: "Austin, TX", time: "Full-Time", tag: "OPERATIONS" },
];

const Career = () => {
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const filtered = jobs.filter(j => j.t.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-gradient-hero"><main>
        <section className="container mx-auto py-16 grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex rounded-full bg-chip text-chip-foreground px-4 py-1.5 text-xs font-semibold">WORK WITH PURPOSE</span>
            <h1 className="mt-5 font-display text-4xl md:text-6xl text-primary">Join the Future of Restorative Care</h1>
            <p className="text-muted-foreground mt-5 text-sm max-w-md">At HealthFlow, we bridge the gap between clinical excellence and environmental harmony. Help us redefine the DNA of modern wellness.</p>
            <div className="mt-7 flex gap-3">
              <a href="#openings" className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary-glow transition-colors">View Openings</a>
              <a href="/about" className="rounded-full bg-card text-primary px-6 py-3 text-sm font-semibold border border-border hover:bg-muted/60 transition-colors">Our Culture</a>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative">
            <img src={typeof (careerHero) === "string" ? (careerHero) : ((careerHero)?.src ?? "")} alt="HealthFlow team at work" width={1024} height={1024} className="rounded-3xl shadow-glow w-full" />
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }}
              className="absolute -bottom-4 left-6 bg-card rounded-2xl shadow-soft border border-border/60 px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-chip flex items-center justify-center text-primary"><Leaf className="h-4 w-4" /></div>
              <div>
                <p className="font-semibold text-primary text-sm">Sustainability First</p>
                <p className="text-[10px] text-muted-foreground">Carbon neutral workflows</p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section className="container mx-auto py-10">
          <div className="grid md:grid-cols-[1fr_auto] gap-6 items-end">
            <div>
              <h2 className="font-display text-3xl text-primary">Latest Insights</h2>
              <p className="text-sm text-muted-foreground mt-1">Explore the intersection of clinical excellence and wellness.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tabs.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground/70 hover:border-primary/50"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <hr className="mt-6 border-border/60" />
        </section>

        <section id="openings" className="container mx-auto pb-12">
          <div className="grid md:grid-cols-[1fr_auto] gap-4 items-center mb-8">
            <div>
              <h2 className="font-display text-3xl text-primary">Open Job Circulars</h2>
              <p className="text-sm text-muted-foreground mt-1">Find your place in our growing ecosystem.</p>
            </div>
            <div className="flex items-center bg-card rounded-full border border-border/60 px-4 py-2 w-full md:w-80">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search roles (e.g. Designer)" className="flex-1 bg-transparent px-3 py-1 text-sm outline-none" />
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((j, i) => (
              <motion.div key={j.t} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -2 }} className="rounded-2xl bg-card border border-border/60 p-5 flex items-center gap-5 shadow-soft">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-primary"><j.icon className="h-5 w-5" /></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary">{j.t}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.loc}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {j.time}</span>
                    <span className="rounded-full bg-chip text-chip-foreground px-2 py-0.5 font-bold tracking-wider text-[9px]">{j.tag}</span>
                  </div>
                </div>
                <a href="#" className="text-sm text-foreground/70 hover:text-primary hidden sm:inline">Details</a>
                <button className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-xs font-semibold hover:bg-primary-glow transition-colors">Apply Now</button>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <p className="text-xs text-muted-foreground">Don't see a role that fits? We're always looking for pioneers.</p>
            <a href="/contact" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary border-b border-primary">Send a General Application <ArrowRight className="h-3 w-3" /></a>
          </div>
        </section>

        <section className="container mx-auto pb-20">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-12 text-center relative overflow-hidden">
            <h2 className="font-display text-3xl md:text-4xl">Ready to grow with us?</h2>
            <p className="text-sm opacity-80 mt-3 max-w-lg mx-auto">We're building a world where healthcare and nature work in perfect synchrony. Be part of the team making it happen.</p>
            <a href="#openings" className="mt-7 inline-block rounded-full bg-accent text-primary px-8 py-3 text-sm font-semibold hover:bg-accent/80 transition-colors">Explore All Roles</a>
          </motion.div>
        </section>
      </main></div>
  );
};
export default Career;
