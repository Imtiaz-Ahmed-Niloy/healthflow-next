'use client';
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Calendar, Video, ArrowLeft, Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/slug";
import { doctors, specialtyTabs as tabs, type SpecialtyTab as Tab } from "@/data/doctors";

const Doctors = () => {
  const [active, setActive] = useState<Tab>("All");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((d) => {
      const matchCat = active === "All" || d.category === active;
      const matchQ =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [active, query]);

  return (
    <div className="min-h-screen bg-gradient-hero"><main className="container mx-auto py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2 transition-all mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <h1 className="font-display text-4xl md:text-5xl text-primary">All Doctors</h1>
              <p className="text-muted-foreground mt-3 max-w-xl">
                Browse our full directory of trusted specialists across {tabs.length - 1} disciplines.
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search doctors or specialty..."
                className="pl-9 h-11 rounded-2xl bg-card/70 backdrop-blur-md"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-10">
            {tabs.map((t) => {
              const isActive = active === t;
              return (
                <motion.button
                  key={t}
                  onClick={() => setActive(t)}
                  whileHover={{ y: -3, scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className={`px-5 py-2.5 rounded-2xl text-sm font-semibold border transition-all ${
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
              No doctors match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {visible.map((d, i) => (
                <motion.article
                  key={d.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4) }}
                  className="rounded-3xl bg-card border border-border/60 p-5 shadow-soft hover:shadow-card transition-all hover:-translate-y-1"
                >
                  <div className="flex items-start gap-3">
                    <Image src={d.img} alt={d.name} width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
                    <div>
                      <h3 className="font-display text-lg leading-tight text-primary">{d.name}</h3>
                      <p className="text-xs font-semibold text-primary-glow mt-0.5">{d.specialty}</p>
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-foreground/70">
                        <Star className="h-3 w-3 fill-primary-glow text-primary-glow" />
                        <span className="font-semibold">{d.rating}</span>
                        <span className="text-muted-foreground">({d.reviews})</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/70 mt-3 line-clamp-2">{d.blurb}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-foreground/70">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {d.date}</span>
                    <span className="inline-flex items-center gap-1">
                      {d.mode === "Telehealth" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                      {d.time}
                    </span>
                  </div>
                  <Link
                    href={`/doctors/${slugify(d.name)}`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground text-sm font-semibold py-2 hover:shadow-glow transition-all"
                  >
                    Book Appointment
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </motion.div>
      </main></div>
  );
};

export default Doctors;
