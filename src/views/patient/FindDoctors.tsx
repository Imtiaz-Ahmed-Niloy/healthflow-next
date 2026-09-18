"use client";

import { ArrowRight, Search, SearchX, Stethoscope, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { DoctorCard, DoctorCardNotBookable, DOCTOR_CARD_BUTTON } from "@/components/site/DoctorCard";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { BookAppointmentDialog } from "@/components/booking/BookAppointmentDialog";
import { SpecialtySelect } from "@/components/common/SpecialtySelect";
import { FilterChip, FILTER_CONTROL, FILTER_ICON } from "@/components/common/FilterBar";
import { LocationPickers, placeMatches, useLocationFilter } from "@/components/common/LocationPickers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDoctors, type UIDoctor } from "@/hooks/useDoctors";

const ANY = "any";

type Sort = "recommended" | "experience" | "feeLow" | "feeHigh";
const SORTS: Sort[] = ["recommended", "experience", "feeLow", "feeHigh"];

const GENDERS = [ANY, "female", "male"] as const;
type Gender = (typeof GENDERS)[number];

const matchesQuery = (q: string, ...fields: string[]) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return fields.some(f => f.toLowerCase().includes(s));
};

const sortDoctors = (list: UIDoctor[], sort: Sort) => {
  if (sort === "experience") return [...list].sort((a, b) => (b.experience ?? -1) - (a.experience ?? -1));
  if (sort === "feeLow") return [...list].sort((a, b) => a.fee - b.fee);
  if (sort === "feeHigh") return [...list].sort((a, b) => b.fee - a.fee);
  return list;
};

const FindDoctors = () => {
  const t = useTranslations("patient.findDoctors");
  const tl = useTranslations("locationPickers");
  const tc = useTranslations("common");
  const tb = useTranslations("doctorCard");
  const { doctors, loading } = useDoctors();
  const searchParams = useSearchParams();
  // The home page's search bar sends its query, specialty and place along.
  const [query, setQuery] = useState(searchParams?.get("q") ?? "");
  const [specialty, setSpecialty] = useState(searchParams?.get("specialty") ?? "");
  const place = useLocationFilter({
    division: searchParams?.get("division"),
    district: searchParams?.get("zilla"),
    upazila: searchParams?.get("upazila"),
  });
  const [gender, setGender] = useState<Gender>(ANY);
  const [sort, setSort] = useState<Sort>("recommended");
  // The doctor whose booking form is open — the shared one (BookAppointmentDialog).
  const [booking, setBooking] = useState<UIDoctor | null>(null);

  const { division: wantDivision, district: wantDistrict, upazila: wantUpazila } = place.want;
  const visible = useMemo(() => {
    const want = { division: wantDivision, district: wantDistrict, upazila: wantUpazila };
    const byPlace = !!(wantDivision || wantDistrict || wantUpazila);
    const matched = doctors.filter(d =>
      (!specialty || d.category === specialty) &&
      (gender === ANY || d.gender === gender) &&
      (!byPlace || d.places.some(p => placeMatches(want, p))) &&
      matchesQuery(query, d.name, d.specialty, d.location, ...d.places.map(p => p.name)),
    );
    return sortDoctors(matched, sort);
  }, [doctors, specialty, gender, query, sort, wantDivision, wantDistrict, wantUpazila]);

  const filtered = !!query.trim() || !!specialty || place.active || gender !== ANY;
  const clearAll = () => {
    setQuery("");
    setSpecialty("");
    place.clear();
    setGender(ANY);
  };

  return (
    <PatientPortalLayout>
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl text-primary">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-3">{t("subtitle")}</p>
      </div>

      <div className="mt-7 space-y-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className={`${FILTER_CONTROL} pl-10 pr-10 placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none`}
              aria-label={t("searchLabel")}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label={tc("clearSearch")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full hover:bg-chip">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
            <div className="lg:w-56">
              <SpecialtySelect
                value={specialty}
                onChange={setSpecialty}
                placeholder={t("allSpecialties")}
                noneLabel={t("allSpecialties")}
                icon={<Stethoscope className={FILTER_ICON} />}
                className={`${FILTER_CONTROL} flex items-center justify-between gap-2 text-left`}
              />
            </div>

            <Select value={gender} onValueChange={v => setGender(v as Gender)}>
              <SelectTrigger className={`${FILTER_CONTROL} lg:w-44`} aria-label={t("genderLabel")}>
                <div className="flex min-w-0 items-center gap-2">
                  <UserRound className={FILTER_ICON} />
                  <span className="truncate"><SelectValue /></span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map(g => <SelectItem key={g} value={g}>{t(`genders.${g}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <LocationPickers filter={place} className={FILTER_CONTROL} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 text-sm text-muted-foreground">
            {loading ? t("loading") : t.rich("found", { count: visible.length, b: chunks => <span className="font-semibold text-foreground">{chunks}</span> })}
          </p>
          {specialty && <FilterChip label={specialty} onClear={() => setSpecialty("")} />}
          {wantDivision && <FilterChip label={tl("divisionChip", { name: place.labels.division })} onClear={() => place.pickDivision("")} />}
          {wantDistrict && <FilterChip label={place.labels.district} onClear={() => place.pickDistrict("")} />}
          {wantUpazila && <FilterChip label={place.labels.upazila} onClear={() => place.pickUpazila("")} />}
          {gender !== ANY && <FilterChip label={t(`genders.${gender}`)} onClear={() => setGender(ANY)} />}
          {filtered && (
            <button type="button" onClick={clearAll} className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
              {tc("clearAll")}
            </button>
          )}
        </div>

        <Select value={sort} onValueChange={v => setSort(v as Sort)}>
          <SelectTrigger className="h-9 w-auto gap-2 rounded-full border-border bg-card px-4 text-sm focus:ring-primary/30 focus:ring-offset-0" aria-label={t("sortLabel")}>
            <span className="text-muted-foreground">{tc("sortBy")}</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {SORTS.map(s => <SelectItem key={s} value={s}>{t(`sorts.${s}`)}</SelectItem>)}
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
            <p className="mt-4 font-semibold text-foreground">{t("noneTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("noneBody")}</p>
            {filtered && (
              <button type="button" onClick={clearAll} className="mt-5 rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-chip">
                {tc("clearFilters")}
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
                    {tb("bookAppointment")}
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
