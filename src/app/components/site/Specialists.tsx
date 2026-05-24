import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Calendar, Video, ArrowRight, MapPin } from "lucide-react";
import { slugify } from "@/lib/slug";
import { doctors, specialtyTabs as tabs, type SpecialtyTab as Tab } from "@/data/doctors";

const Specialists = () => {
  const [active, setActive] = useState<Tab>("All");
  const visible = useMemo(
    () => (active === "All" ? doctors : doctors.filter(d => d.category === active)).slice(0, 4),
    [active],
  );

  return (
    <section id="features" className="container mx-auto py-20">
      <div className="mb-10">
        <h2 className="font-display text-3xl md:text-4xl text-primary">Find Your Specialist</h2>
        <p className="text-muted-foreground mt-2">Guided by expertise, driven by compassion.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mb-12 max-w-5xl mx-auto">
        {tabs.map((t) => {
          const isActive = active === t;
          return (
            <motion.button
              key={t}
              onClick={() => setActive(t)}
              whileHover={{ y: -3, scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className={`relative px-5 py-2.5 rounded-2xl text-sm font-semibold border transition-all ${
                isActive
                  ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground border-transparent shadow-glow"
                  : "bg-card/70 backdrop-blur-md text-foreground/75 border-border/60 hover:text-primary hover:border-primary/40 hover:shadow-soft"
              }`}
            >
              {t}
            </motion.button>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No specialists in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {visible.map((d, i) => (
            <motion.article key={d.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-3xl bg-card border border-border/60 p-5 shadow-soft hover:shadow-card transition-all hover:-translate-y-1">
              <div className="flex items-start gap-3">
                <Image src={d.img} alt={d.name} width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
                <div>
                  <h3 className="font-display text-lg leading-tight text-primary">{d.name}</h3>
                  <p className="text-xs font-semibold text-primary-glow mt-0.5">{d.specialty}</p>
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-foreground/70">
                    <Star className="h-3 w-3 fill-primary-glow text-primary-glow" />
                    <span className="font-semibold">{d.rating}</span>
                    <span className="text-muted-foreground">({d.reviews} reviews)</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">{d.blurb}</p>
              <div className="mt-4 flex gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] text-foreground/80"><Calendar className="h-3 w-3" />{d.date}, {d.time}</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/40 px-2 py-1 text-[11px] text-primary">
                  {d.mode === "Telehealth" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}{d.mode}
                </span>
              </div>
              <Link href={`/doctors/${slugify(d.name)}`} className="mt-5 block text-center w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">Book Appointment</Link>
            </motion.article>
          ))}
        </div>
      )}
      <div className="mt-8 flex justify-end">
        <Link href="/doctors" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all">View All Doctors <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>
  );
};
export default Specialists;
