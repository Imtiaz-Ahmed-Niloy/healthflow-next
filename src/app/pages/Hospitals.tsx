'use client';
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Award, Star, Phone, ArrowLeft, Search, BedDouble, Stethoscope, SlidersHorizontal, X } from "lucide-react";
import { useHospitals } from "@/hooks/useHospitals";
import { BD_DIVISIONS, BD_LOCATIONS } from "@/data/bdLocations";
import { BD_UPAZILAS } from "@/data/bdUpazilas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const imageSrc = (src: { src: string } | string) => (typeof src === "string" ? src : src.src);

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
  disabled,
  icon,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) => (
  <Select
    value={value || "__all__"}
    onValueChange={(v) => onChange(v === "__all__" ? "" : v)}
    disabled={disabled || options.length === 0}
  >
    <SelectTrigger
      className={cn(
        "h-8 min-w-[9rem] rounded-full border-border/60 bg-background/80 px-3 text-xs font-medium shadow-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-background focus:ring-2 focus:ring-primary/20",
        value && "border-primary/50 bg-primary/5 text-primary",
        (disabled || options.length === 0) && "opacity-40 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-1.5 truncate">
        {icon || <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />}
        <SelectValue placeholder={label} />
      </div>
    </SelectTrigger>
    <SelectContent className="rounded-xl border-border/60 shadow-card backdrop-blur-md">
      <SelectItem value="__all__" className="text-xs rounded-lg">{label}</SelectItem>
      {options.map((o) => (
        <SelectItem key={o} value={o} className="text-xs rounded-lg">
          {o}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const Hospitals = () => {
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [division, setDivision] = useState("");
  const [zilla, setZilla] = useState("");
  const [upazila, setUpazila] = useState("");
  const hospitals = useHospitals();

  const zillas = division ? BD_LOCATIONS[division] ?? [] : [];
  const upazilas = zilla ? BD_UPAZILAS[zilla] ?? [] : [];
  const hasFilters = Boolean(division || zilla || upazila);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hospitals.filter((h) => {
      const matchQ =
        !q ||
        h.name.toLowerCase().includes(q) ||
        h.location.toLowerCase().includes(q) ||
        h.specialties.some((s) => s.toLowerCase().includes(q));
      const matchDiv = !division || h.location.toLowerCase().includes(division.toLowerCase());
      const matchZil = !zilla || h.location.toLowerCase().includes(zilla.toLowerCase());
      const matchUpa = !upazila || h.location.toLowerCase().includes(upazila.toLowerCase());
      return matchQ && matchDiv && matchZil && matchUpa;
    });
  }, [hospitals, query, division, zilla, upazila]);

  const clearFilters = () => {
    setDivision("");
    setZilla("");
    setUpazila("");
  };

  return (
    <div className="min-h-screen bg-gradient-hero">      <main className="container mx-auto py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2 transition-all mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          <div className="mb-10">
            <h1 className="font-display text-4xl md:text-5xl text-primary">All Eco-Certified Hospitals</h1>
            <p className="text-muted-foreground mt-3 max-w-xl">
              Browse our full network of carbon-neutral, biophilically engineered healing centers across the country.
            </p>
          </div>

          {/* Pill search bar */}
          <div className="mx-auto max-w-4xl mb-6">
            <div className="relative flex items-center rounded-full bg-muted/70 border border-border/60 shadow-card pl-6 pr-2 py-2">
              <Search className="h-5 w-5 text-foreground/80 shrink-0" strokeWidth={2.25} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground"
                placeholder="Search hospitals by name, city, specialty..."
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="mr-2 h-7 w-7 rounded-full hover:bg-chip flex items-center justify-center"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Filter row */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-sm font-medium transition-colors",
                  filterOpen || hasFilters
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/90 text-primary-foreground hover:bg-primary"
                )}
                aria-expanded={filterOpen}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filter
              </button>

              {(filterOpen || hasFilters) && (
                <>
                  <FilterSelect
                    label="Division"
                    value={division}
                    options={BD_DIVISIONS}
                    onChange={(v) => { setDivision(v); setZilla(""); setUpazila(""); }}
                  />
                  <FilterSelect
                    label="District"
                    value={zilla}
                    options={zillas}
                    disabled={!division}
                    onChange={(v) => { setZilla(v); setUpazila(""); }}
                  />
                  <FilterSelect
                    label="Sub-District"
                    value={upazila}
                    options={upazilas}
                    disabled={!zilla}
                    onChange={setUpazila}
                  />
                  {hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </>
              )}
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
                  src={imageSrc(h.image)}
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
      </main>    </div>
  );
};

export default Hospitals;



