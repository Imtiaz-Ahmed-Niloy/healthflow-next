'use client';
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Calendar, Video, ArrowLeft, Search, MapPin, SlidersHorizontal, X, Stethoscope } from "lucide-react";
import { slugify } from "@/lib/slug";
import { doctors, specialtyTabs as tabs } from "@/data/doctors";
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

const SPECIALTY_OPTIONS = tabs.filter((s) => s !== "All");

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

const Doctors = () => {
  const [specialty, setSpecialty] = useState("");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [division, setDivision] = useState("");
  const [zilla, setZilla] = useState("");
  const [upazila, setUpazila] = useState("");

  const zillas = division ? BD_LOCATIONS[division] ?? [] : [];
  const upazilas = zilla ? BD_UPAZILAS[zilla] ?? [] : [];
  const hasFilters = Boolean(division || zilla || upazila || specialty);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((d) => {
      const matchSpec = !specialty || d.category === specialty;
      const matchQ =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q);
      const matchDiv = !division || d.location.toLowerCase().includes(division.toLowerCase());
      const matchZil = !zilla || d.location.toLowerCase().includes(zilla.toLowerCase());
      const matchUpa = !upazila || d.location.toLowerCase().includes(upazila.toLowerCase());
      return matchSpec && matchQ && matchDiv && matchZil && matchUpa;
    });
  }, [query, specialty, division, zilla, upazila]);

  const clearFilters = () => {
    setDivision("");
    setZilla("");
    setUpazila("");
    setSpecialty("");
  };

  return (
    <div className="min-h-screen bg-gradient-hero">      <main className="container mx-auto py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2 transition-all mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          <div className="mb-10">
            <h1 className="font-display text-4xl md:text-5xl text-primary">All Doctors</h1>
            <p className="text-muted-foreground mt-3 max-w-xl">
              Browse our full directory of trusted specialists across {tabs.length - 1} disciplines.
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
                placeholder="Search doctors, specialties, hospitals..."
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
                  <FilterSelect
                    label="Specialist"
                    value={specialty}
                    options={SPECIALTY_OPTIONS}
                    onChange={setSpecialty}
                    icon={<Stethoscope className="h-3 w-3 shrink-0 text-muted-foreground" />}
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
                    <img src={imageSrc(d.img)} alt={d.name} width={64} height={64} loading="lazy" className="h-16 w-16 rounded-full object-cover" />
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
                  <div className="flex items-center gap-3 mt-3 text-xs text-foreground/70 flex-wrap">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {d.location}</span>
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
      </main>    </div>
  );
};

export default Doctors;



