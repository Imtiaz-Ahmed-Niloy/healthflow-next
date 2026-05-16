import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin } from "lucide-react";
import { toast } from "sonner";

const DOCTOR_HINTS = ["dr", "dr.", "doctor", "specialist", "physician"];
const SPECIALTY_HINTS = [
  "cardio", "neuro", "derm", "pediatric", "psych", "onco", "ortho",
  "endo", "gastro", "uro", "gyne", "ophthal", "ent", "radiology",
  "surgeon", "surgery", "immunolog", "genom",
];

const SearchBar = () => {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const nav = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    const location = loc.trim();
    if (!query && !location) {
      toast.error("Type a doctor, specialty or hospital to search.");
      return;
    }
    const lc = query.toLowerCase();
    const looksLikeDoctor =
      DOCTOR_HINTS.some(h => lc.startsWith(h + " ") || lc === h) ||
      SPECIALTY_HINTS.some(h => lc.includes(h));

    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (location) params.set("loc", location);

    const target = looksLikeDoctor ? "/patient/find-doctors" : "/hospitals";
    nav(`${target}${params.toString() ? `?${params}` : ""}`);
    toast.success(
      looksLikeDoctor
        ? `Searching specialists for "${query}"`
        : `Searching hospitals${query ? ` for "${query}"` : ""}${location ? ` in ${location}` : ""}`,
    );
  };

  return (
    <form onSubmit={handleSubmit} className="container mx-auto -mt-4">
      <div className="mx-auto max-w-3xl rounded-full bg-card shadow-card border border-border/60 p-2 flex flex-col sm:flex-row items-stretch gap-2">
        <div className="flex items-center gap-2 px-4 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="bg-transparent w-full py-3 text-sm outline-none placeholder:text-muted-foreground" placeholder="Search doctors, specialties, hospitals..." />
        </div>
        <div className="flex items-center gap-2 px-4 flex-1 sm:border-l sm:border-border">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <input value={loc} onChange={(e) => setLoc(e.target.value)} className="bg-transparent w-full py-3 text-sm outline-none placeholder:text-muted-foreground" placeholder="Your location" />
        </div>
        <button type="submit" className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">
          Search
        </button>
      </div>
    </form>
  );
};
export default SearchBar;
