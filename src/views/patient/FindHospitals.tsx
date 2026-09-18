"use client";

import { Search, SearchX, Stethoscope, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { HospitalCard } from "@/components/site/HospitalCard";
import { SpecialtySelect } from "@/components/common/SpecialtySelect";
import { FilterChip, FILTER_CONTROL, FILTER_ICON } from "@/components/common/FilterBar";
import { LocationPickers, placeMatches, useLocationFilter } from "@/components/common/LocationPickers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHospitalList } from "@/hooks/useHospitals";
import type { Hospital } from "@/data/hospitals";

/**
 * /patient/find-hospitals — the hospitals a patient can visit, filtered like
 * Find Doctors: a name, a specialty, and division >> district >> upazila
 * (0096). Reads the same approved list as the public /hospitals page.
 */

type Sort = "recommended" | "rating" | "doctors" | "name";
const SORTS: Sort[] = ["recommended", "rating", "doctors", "name"];

const lower = (s: string) => s.trim().toLowerCase();

/** A specialty the hospital lists itself, or one of its doctors practises. */
const offers = (h: Hospital, specialty: string) => {
  const want = lower(specialty);
  return h.specialties.some(s => lower(s) === want) || h.doctors_list.some(d => lower(d.specialty) === want);
};

const matchesQuery = (h: Hospital, q: string) => {
  const s = lower(q);
  if (!s) return true;
  return [h.name, h.location, h.address, ...h.specialties].some(f => f.toLowerCase().includes(s));
};

const sortHospitals = (list: Hospital[], sort: Sort) => {
  if (sort === "rating") return [...list].sort((a, b) => b.rating - a.rating);
  if (sort === "doctors") return [...list].sort((a, b) => b.doctors_list.length - a.doctors_list.length);
  if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name));
  return list;
};

const FindHospitals = () => {
  const t = useTranslations("patient.findHospitals");
  const tl = useTranslations("locationPickers");
  const tc = useTranslations("common");
  const { hospitals, loading } = useHospitalList();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get("q") ?? "");
  const [specialty, setSpecialty] = useState(searchParams?.get("specialty") ?? "");
  const place = useLocationFilter({
    division: searchParams?.get("division"),
    district: searchParams?.get("zilla"),
    upazila: searchParams?.get("upazila"),
  });
  const [sort, setSort] = useState<Sort>("recommended");

  const { division: wantDivision, district: wantDistrict, upazila: wantUpazila } = place.want;
  const visible = useMemo(() => {
    const want = { division: wantDivision, district: wantDistrict, upazila: wantUpazila };
    const matched = hospitals.filter(h =>
      (!specialty || offers(h, specialty)) &&
      placeMatches(want, h) &&
      matchesQuery(h, query),
    );
    return sortHospitals(matched, sort);
  }, [hospitals, specialty, query, sort, wantDivision, wantDistrict, wantUpazila]);

  const filtered = !!query.trim() || !!specialty || place.active;
  const clearAll = () => {
    setQuery("");
    setSpecialty("");
    place.clear();
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

          <div className="lg:w-64">
            <SpecialtySelect
              value={specialty}
              onChange={setSpecialty}
              placeholder={t("allSpecialties")}
              noneLabel={t("allSpecialties")}
              icon={<Stethoscope className={FILTER_ICON} />}
              className={`${FILTER_CONTROL} flex items-center justify-between gap-2 text-left`}
            />
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
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((h, i) => <HospitalCard key={h.slug} h={h} i={i} />)}
          </div>
        )}
      </div>
    </PatientPortalLayout>
  );
};

export default FindHospitals;
