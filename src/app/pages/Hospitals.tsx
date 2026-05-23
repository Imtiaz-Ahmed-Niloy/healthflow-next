'use client';
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Award, Star, Phone, ArrowLeft, Search, BedDouble, Stethoscope } from "lucide-react";
import { useHospitals } from "@/hooks/useHospitals";

const Hospitals = () => {
  const [query, setQuery] = useState("");
  const hospitals = useHospitals();
  const filtered = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(query.toLowerCase()) ||
      h.location.toLowerCase().includes(query.toLowerCase()) ||
      h.specialties.some((s) => s.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="min-h-screen bg-gradient-hero"><main className="container mx-auto py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2 transition-all mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <h1 className="font-display text-4xl md:text-5xl text-primary">All Eco-Certified Hospitals</h1>
              <p className="text-muted-foreground mt-3 max-w-xl">
                Browse our full network of carbon-neutral, biophilically engineered healing centers across the country.
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, city, specialty..."
                className="w-full pl-10 pr-4 py-3 rounded-full bg-card border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((h, i) => (
            <motion.article
              key={h.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group rounded-3xl overflow-hidden bg-card border border-border/60 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={h.image}
                  alt={h.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent" />
                <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-accent/90 text-primary px-3 py-1 text-[11px] font-semibold">
                  {h.tag}
                </span>
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <Star className="h-3 w-3 fill-primary-glow text-primary-glow" /> {h.rating}
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-display text-xl text-primary leading-tight">{h.name}</h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{h.location}</span>
                  <span className="inline-flex items-center gap-1"><Award className="h-3 w-3" />{h.cert}</span>
                </div>
                <p className="text-sm text-foreground/75 mt-3 leading-relaxed line-clamp-3">{h.summary}</p>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {h.specialties.map((s) => (
                    <span key={s} className="text-[10px] font-medium px-2 py-1 rounded-full bg-muted text-foreground/70">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{h.beds} beds</span>
                  <span className="inline-flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" />{h.reviews} reviews</span>
                  <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />Call</span>
                </div>
                <Link href={`/hospitals/${h.slug}`} className="mt-4 block text-center w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">
                  View Hospital
                </Link>
              </div>
            </motion.article>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-16">No hospitals match your search.</p>
        )}
      </main></div>
  );
};

export default Hospitals;
