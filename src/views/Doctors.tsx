"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Search, MapPin, SlidersHorizontal, X, Stethoscope } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { DoctorCard } from "@/components/site/DoctorCard";
import { useDoctors } from "@/hooks/useDoctors";
import { useSpecialties } from "@/hooks/useSpecialties";
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
  const { doctors, loading } = useDoctors();
  // The specialties list (0093) — the one a doctor's specialty is picked from.
  const { specialties } = useSpecialties();
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
  }, [doctors, query, specialty, division, zilla, upazila]);

  const clearFilters = () => {
    setDivision("");
    setZilla("");
    setUpazila("");
    setSpecialty("");
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main className="container mx-auto py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2 transition-all mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          <div className="mb-10">
            <h1 className="font-display text-4xl md:text-5xl text-primary">All Doctors</h1>
            <p className="text-muted-foreground mt-3 max-w-xl">
              Browse our full directory of trusted specialists across {specialties.length || "every"} disciplines.
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
                    options={specialties}
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

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
              No doctors match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {visible.map((d, i) => (
                // By id: two doctors can share a name, and did.
                <DoctorCard key={d.id} d={d} i={i} />
              ))}
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Doctors;

