"use client";

import { ArrowRight, LocateFixed, Map as MapIcon, MapPin, Search, SearchX, Stethoscope, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DoctorCard, DoctorCardNotBookable, DOCTOR_CARD_BUTTON } from "@/components/site/DoctorCard";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { BookAppointmentDialog } from "@/components/booking/BookAppointmentDialog";
import { SpecialtySelect } from "@/components/common/SpecialtySelect";
import { SearchSelect, type SearchSelectOption } from "@/components/common/SearchSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDoctors, type DoctorPlace, type UIDoctor } from "@/hooks/useDoctors";
import { useBdLocations, type BdDivision } from "@/hooks/useBdLocations";

/** Every filter control shares this look, so the bar reads as one piece. */
const CONTROL = "h-11 w-full rounded-xl border-0 bg-muted/50 px-3.5 text-sm text-foreground hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 transition-colors";
const ICON = "h-4 w-4 shrink-0 text-muted-foreground";

const ANY = "any";

type Sort = "recommended" | "experience" | "fee-low" | "fee-high";

const SORTS: { value: Sort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "experience", label: "Most experienced" },
  { value: "fee-low", label: "Fee: low to high" },
  { value: "fee-high", label: "Fee: high to low" },
];

const GENDERS = [
  { value: ANY, label: "Any gender" },
  { value: "female", label: "Female doctors" },
  { value: "male", label: "Male doctors" },
];

const matchesQuery = (q: string, ...fields: string[]) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return fields.some(f => f.toLowerCase().includes(s));
};

/** "Cox's Bazar", "coxs bazar", "Coxsbazar" — one place, as 0096's bd_norm has it. */
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** The place a typed or linked name means, by its name, Bangla name or any other spelling. */
const resolve = <T extends BdDivision>(list: T[], v: string) => {
  const n = norm(v);
  if (!n) return undefined;
  return list.find(x => norm(x.name) === n || (x.bn_name && norm(x.bn_name) === n) || x.aliases.some(a => norm(a) === n));
};

const toOption = (x: BdDivision, group?: string): SearchSelectOption => ({
  value: x.name,
  label: x.name,
  keywords: [...x.aliases, ...(x.bn_name ? [x.bn_name] : [])],
  group,
});

const sortDoctors = (list: UIDoctor[], sort: Sort) => {
  if (sort === "experience") return [...list].sort((a, b) => (b.experience ?? -1) - (a.experience ?? -1));
  if (sort === "fee-low") return [...list].sort((a, b) => a.fee - b.fee);
  if (sort === "fee-high") return [...list].sort((a, b) => b.fee - a.fee);
  return list;
};

const FilterChip = ({ label, onClear }: { label: string; onClear: () => void }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1 text-xs font-medium text-primary">
    {label}
    <button type="button" onClick={onClear} aria-label={`Remove ${label}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-primary/15">
      <X className="h-3 w-3" />
    </button>
  </span>
);

const FindDoctors = () => {
  const { doctors, loading } = useDoctors();
  const { divisions, districts, upazilas } = useBdLocations();
  const searchParams = useSearchParams();
  // The home page's search bar sends its query, specialty and place along.
  const [query, setQuery] = useState(searchParams?.get("q") ?? "");
  const [specialty, setSpecialty] = useState(searchParams?.get("specialty") ?? "");
  const [division, setDivision] = useState(searchParams?.get("division") ?? "");
  const [district, setDistrict] = useState(searchParams?.get("zilla") ?? "");
  const [upazila, setUpazila] = useState(searchParams?.get("upazila") ?? "");
  const [gender, setGender] = useState(ANY);
  const [sort, setSort] = useState<Sort>("recommended");
  // The doctor whose booking form is open — the shared one (BookAppointmentDialog).
  const [booking, setBooking] = useState<UIDoctor | null>(null);

  // What's picked, as rows of the 0096 lists. A district decides its division.
  const districtRow = resolve(districts, district);
  const divisionRow = districtRow ? divisions.find(d => d.id === districtRow.division_id) : resolve(divisions, division);
  const districtUpazilas = useMemo(
    () => (districtRow ? upazilas.filter(u => u.district_id === districtRow.id) : []),
    [upazilas, districtRow],
  );
  const upazilaRow = resolve(districtUpazilas, upazila);

  const divisionOptions = useMemo(() => divisions.map(d => toOption(d)), [divisions]);
  const districtOptions = useMemo(
    () => districts.filter(d => !divisionRow || d.division_id === divisionRow.id).map(d => toOption(d)),
    [districts, divisionRow],
  );
  // Dhaka lists its city thanas apart from its upazilas.
  const upazilaOptions = useMemo(() => {
    const withThanas = districtUpazilas.some(u => u.kind === "thana");
    return districtUpazilas.map(u => toOption(u, withThanas ? (u.kind === "thana" ? "City thanas" : "Upazilas") : undefined));
  }, [districtUpazilas]);

  const pickDivision = (v: string) => {
    setDivision(v);
    const next = resolve(divisions, v);
    if (!next || districtRow?.division_id !== next.id) {
      setDistrict("");
      setUpazila("");
    }
  };
  const pickDistrict = (v: string) => {
    setDistrict(v);
    setUpazila("");
    const row = resolve(districts, v);
    if (row) setDivision(divisions.find(d => d.id === row.division_id)?.name ?? "");
  };

  // Places are saved in the lists' spelling (0096's trigger); a name from a
  // link that the lists don't know still compares loosely.
  const wantDivision = divisionRow?.name ?? division;
  const wantDistrict = districtRow?.name ?? district;
  const wantUpazila = upazilaRow?.name ?? upazila;

  const visible = useMemo(() => {
    const same = (have: string | null, picked: string) => !picked || (!!have && norm(have) === norm(picked));
    const placeMatches = (p: DoctorPlace) =>
      same(p.division, wantDivision) && same(p.district, wantDistrict) && same(p.subdistrict, wantUpazila);
    const byPlace = !!(wantDivision || wantDistrict || wantUpazila);
    const matched = doctors.filter(d =>
      (!specialty || d.category === specialty) &&
      (gender === ANY || d.gender === gender) &&
      (!byPlace || d.places.some(placeMatches)) &&
      matchesQuery(query, d.name, d.specialty, d.location, ...d.places.map(p => p.name)),
    );
    return sortDoctors(matched, sort);
  }, [doctors, specialty, gender, query, sort, wantDivision, wantDistrict, wantUpazila]);

  const filtered = !!query.trim() || !!specialty || !!division || !!district || !!upazila || gender !== ANY;
  const clearAll = () => {
    setQuery("");
    setSpecialty("");
    setDivision("");
    setDistrict("");
    setUpazila("");
    setGender(ANY);
  };

  return (
    <PatientPortalLayout>
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl text-primary">Find Your Specialist</h1>
        <p className="text-sm text-muted-foreground mt-3">
          Search by name, specialty or area, then book a visit at the hospital or chamber that suits you.
        </p>
      </div>

      <div className="mt-7 space-y-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Doctor, hospital or chamber name"
              className={`${CONTROL} pl-10 pr-10 placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none`}
              aria-label="Search doctors"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full hover:bg-chip">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
            <div className="lg:w-56">
              <SpecialtySelect
                value={specialty}
                onChange={setSpecialty}
                placeholder="All specialties"
                noneLabel="All specialties"
                icon={<Stethoscope className={ICON} />}
                className={`${CONTROL} flex items-center justify-between gap-2 text-left`}
              />
            </div>

            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className={`${CONTROL} lg:w-44`} aria-label="Doctor's gender">
                <div className="flex min-w-0 items-center gap-2">
                  <UserRound className={ICON} />
                  <span className="truncate"><SelectValue /></span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SearchSelect
            value={divisionRow?.name ?? ""}
            onChange={pickDivision}
            options={divisionOptions}
            allLabel="All divisions"
            searchPlaceholder="Search divisions…"
            emptyText="No division found."
            icon={<MapIcon className={ICON} />}
            className={CONTROL}
            aria-label="Division"
          />
          <SearchSelect
            value={districtRow?.name ?? ""}
            onChange={pickDistrict}
            options={districtOptions}
            allLabel="All districts"
            searchPlaceholder="Search districts…"
            emptyText="No district found."
            icon={<MapPin className={ICON} />}
            className={CONTROL}
            aria-label="District"
          />
          <SearchSelect
            value={upazilaRow?.name ?? ""}
            onChange={setUpazila}
            options={upazilaOptions}
            allLabel={districtRow ? "All upazilas & thanas" : "Pick a district first"}
            searchPlaceholder="Search upazilas…"
            emptyText="No upazila found."
            icon={<LocateFixed className={ICON} />}
            className={CONTROL}
            disabled={!districtRow}
            aria-label="Upazila or thana"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 text-sm text-muted-foreground">
            {loading ? "Loading doctors…" : (
              <><span className="font-semibold text-foreground">{visible.length}</span> {visible.length === 1 ? "doctor" : "doctors"} found</>
            )}
          </p>
          {specialty && <FilterChip label={specialty} onClear={() => setSpecialty("")} />}
          {wantDivision && <FilterChip label={`${wantDivision} Division`} onClear={() => pickDivision("")} />}
          {wantDistrict && <FilterChip label={wantDistrict} onClear={() => pickDistrict("")} />}
          {wantUpazila && <FilterChip label={wantUpazila} onClear={() => setUpazila("")} />}
          {gender !== ANY && <FilterChip label={GENDERS.find(g => g.value === gender)?.label ?? gender} onClear={() => setGender(ANY)} />}
          {filtered && (
            <button type="button" onClick={clearAll} className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
              Clear all
            </button>
          )}
        </div>

        <Select value={sort} onValueChange={v => setSort(v as Sort)}>
          <SelectTrigger className="h-9 w-auto gap-2 rounded-full border-border bg-card px-4 text-sm focus:ring-primary/30 focus:ring-offset-0" aria-label="Sort doctors">
            <span className="text-muted-foreground">Sort:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {SORTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <SearchX className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-4 font-semibold text-foreground">No doctors match these filters</p>
            <p className="mt-1 text-sm text-muted-foreground">Try another name, or widen the specialty or area.</p>
            {filtered && (
              <button type="button" onClick={clearAll} className="mt-5 rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-chip">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {visible.map((d, i) => (
              <DoctorCard
                key={d.id}
                d={d}
                i={i}
                action={d.independent ? (
                  // An appointment belongs to a hospital; this doctor has none yet.
                  <DoctorCardNotBookable />
                ) : (
                  <button type="button" onClick={() => setBooking(d)} className={DOCTOR_CARD_BUTTON}>
                    Book Appointment
                    <ArrowRight className="h-4 w-0 opacity-0 transition-all duration-300 group-hover:w-4 group-hover:opacity-100" />
                  </button>
                )}
              />
            ))}
          </div>
        )}
      </div>

      <BookAppointmentDialog doctor={booking} onClose={() => setBooking(null)} />
    </PatientPortalLayout>
  );
};
export default FindDoctors;
