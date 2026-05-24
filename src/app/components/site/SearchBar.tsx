'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Map } from "lucide-react";
import { toast } from "sonner";
import { BD_DIVISIONS, BD_LOCATIONS } from "@/data/bdLocations";

const DOCTOR_HINTS = ["dr", "dr.", "doctor", "specialist", "physician"];
const SPECIALTY_HINTS = [
  "cardio", "neuro", "derm", "pediatric", "psych", "onco", "ortho",
  "endo", "gastro", "uro", "gyne", "ophthal", "ent", "radiology",
  "surgeon", "surgery", "immunolog", "genom",
];

const SearchBar = () => {
  const [q, setQ] = useState("");
  const [division, setDivision] = useState("");
  const [zilla, setZilla] = useState("");
  const router = useRouter();

  const zillas = division ? BD_LOCATIONS[division] ?? [] : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    const location = [zilla, division].filter(Boolean).join(", ");
    if (!query && !location) {
      toast.error("Type a doctor, specialty or hospital — or pick a location.");
      return;
    }
    const lc = query.toLowerCase();
    const looksLikeDoctor =
      DOCTOR_HINTS.some(h => lc.startsWith(h + " ") || lc === h) ||
      SPECIALTY_HINTS.some(h => lc.includes(h));

    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (location) params.set("loc", location);
    if (division) params.set("division", division);
    if (zilla) params.set("zilla", zilla);

    const target = looksLikeDoctor ? "/patient/find-doctors" : "/hospitals";
    router.push(`${target}${params.toString() ? `?${params}` : ""}`);
    toast.success(
      looksLikeDoctor
        ? `Searching specialists${location ? ` in ${location}` : ""}`
        : `Searching hospitals${query ? ` for "${query}"` : ""}${location ? ` in ${location}` : ""}`,
    );
  };

  return (
    <form onSubmit={handleSubmit} className="container mx-auto -mt-4">
      <div className="mx-auto max-w-4xl rounded-3xl sm:rounded-full bg-card shadow-card border border-border/60 p-2 flex flex-col sm:flex-row items-stretch gap-2">
        <div className="flex items-center gap-2 px-4 flex-1 min-w-0">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-transparent w-full py-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search doctors, specialties, hospitals..."
          />
        </div>

        <div className="flex items-center gap-2 px-4 flex-1 min-w-0 sm:border-l sm:border-border">
          <Map className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={division}
            onChange={(e) => {
              setDivision(e.target.value);
              setZilla("");
            }}
            className="bg-transparent w-full py-3 text-sm outline-none text-foreground appearance-none cursor-pointer"
          >
            <option value="">Division</option>
            {BD_DIVISIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 px-4 flex-1 min-w-0 sm:border-l sm:border-border">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={zilla}
            onChange={(e) => setZilla(e.target.value)}
            disabled={!division}
            className="bg-transparent w-full py-3 text-sm outline-none text-foreground appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">{division ? "Zilla" : "Select division first"}</option>
            {zillas.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  );
};
export default SearchBar;
