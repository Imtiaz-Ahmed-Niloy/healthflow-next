"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X, MapPin, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { BD_DIVISIONS, BD_LOCATIONS } from "@/data/bdLocations";
import { BD_UPAZILAS } from "@/data/bdUpazilas";
import { specialtyTabs } from "@/data/doctors";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DOCTOR_HINTS = ["dr", "dr.", "doctor", "specialist", "physician"];
const SPECIALTY_HINTS = [
  "cardio", "neuro", "derm", "pediatric", "psych", "onco", "ortho",
  "endo", "gastro", "uro", "gyne", "ophthal", "ent", "radiology",
  "surgeon", "surgery", "immunolog", "genom",
];

type FilterSelectProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
};

const FilterSelect = ({ label, value, options, onChange, disabled, icon }: FilterSelectProps) => (
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

const SPECIALTY_OPTIONS = specialtyTabs.filter((s) => s !== "All");

type SearchBarProps = {
  division: string;
  zilla: string;
  upazila: string;
  specialty: string;
  onDivisionChange: (v: string) => void;
  onZillaChange: (v: string) => void;
  onUpazilaChange: (v: string) => void;
  onSpecialtyChange: (v: string) => void;
  onClear: () => void;
};

const SearchBar = ({
  division,
  zilla,
  upazila,
  specialty,
  onDivisionChange,
  onZillaChange,
  onUpazilaChange,
  onSpecialtyChange,
  onClear,
}: SearchBarProps) => {
  const [q, setQ] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const router = useRouter();

  const zillas = division ? BD_LOCATIONS[division] ?? [] : [];
  const upazilas = zilla ? BD_UPAZILAS[zilla] ?? [] : [];
  const hasFilters = Boolean(division || zilla || upazila || specialty);

  const clearFilters = () => {
    onClear();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    const location = [upazila, zilla, division].filter(Boolean).join(", ");
    if (!query && !location && !specialty) {
      toast.error("Type a doctor, specialty or hospital — or pick a location.");
      return;
    }
    const lc = query.toLowerCase();
    const looksLikeDoctor =
      DOCTOR_HINTS.some((h) => lc.startsWith(h + " ") || lc === h) ||
      SPECIALTY_HINTS.some((h) => lc.includes(h));

    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (location) params.set("loc", location);
    if (division) params.set("division", division);
    if (zilla) params.set("zilla", zilla);
    if (upazila) params.set("upazila", upazila);
    if (specialty) params.set("specialty", specialty);

    const target = looksLikeDoctor || specialty ? "/patient/find-doctors" : "/hospitals";
    router.push(`${target}${params.toString() ? `?${params}` : ""}`);
    toast.success(
      looksLikeDoctor || specialty
        ? `Searching specialists${location ? ` in ${location}` : ""}`
        : `Searching hospitals${query ? ` for "${query}"` : ""}${location ? ` in ${location}` : ""}`,
    );
  };

  return (
    <form onSubmit={handleSubmit} className="container mx-auto -mt-4">
      <div className="mx-auto max-w-4xl">
        {/* Pill search bar */}
        <div className="relative flex items-center rounded-full bg-muted/70 border border-border/60 shadow-card pl-6 pr-2 py-2">
          <Search className="h-5 w-5 text-foreground/80 shrink-0" strokeWidth={2.25} />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (e.target.value.trim()) setFilterOpen(true);
            }}
            className="flex-1 bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground"
            placeholder="Search doctors, specialties, hospitals..."
          />
          <button
            type="submit"
            className="rounded-full bg-primary px-7 sm:px-10 py-3 text-base font-medium text-primary-foreground hover:bg-primary-glow transition-colors"
          >
            Search
          </button>
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
                : "bg-primary/90 text-primary-foreground hover:bg-primary",
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
                onChange={onDivisionChange}
              />
              <FilterSelect
                label="District"
                value={zilla}
                options={zillas}
                disabled={!division}
                onChange={onZillaChange}
              />
              <FilterSelect
                label="Sub-District"
                value={upazila}
                options={upazilas}
                disabled={!zilla}
                onChange={onUpazilaChange}
              />
              <FilterSelect
                label="Specialist"
                value={specialty}
                options={SPECIALTY_OPTIONS}
                onChange={onSpecialtyChange}
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
    </form>
  );
};

export default SearchBar;

