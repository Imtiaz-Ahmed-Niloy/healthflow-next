"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Search as SearchIcon, SearchX, X } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SectionGlow, { GLOW } from "@/components/site/SectionGlow";
import { gradient } from "@/components/site/GradientWords";
import { DoctorCard } from "@/components/site/DoctorCard";
import { HospitalCard } from "@/components/site/HospitalCard";
import { FilterChip } from "@/components/common/FilterBar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDoctorSearch } from "@/hooks/useDoctors";
import { useHospitalSearch } from "@/hooks/useHospitals";

/**
 * One search over doctors and hospitals together — where the home page's
 * search box lands. "All" shows the first few of each with a way to the rest;
 * the other two tabs are each list in full, a page at a time.
 *
 * What is being searched lives in the address (?q=, and the filters the home
 * page's bar sent along), so a result page can be shared or come back to.
 */

type Tab = "all" | "doctors" | "hospitals";
type Filters = { specialty: string; division: string; zilla: string; upazila: string };

// In "All": two rows of doctors and two of hospitals on a desktop.
const FIRST_DOCTORS = 8;
const FIRST_HOSPITALS = 6;

const DOCTOR_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5";
const HOSPITAL_GRID = "grid sm:grid-cols-2 lg:grid-cols-3 gap-6";
const MORE_BUTTON = "rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-chip disabled:opacity-60";

const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const Search = () => {
  const t = useTranslations("search");
  const tb = useTranslations("searchBar");
  const tc = useTranslations("common");
  const td = useTranslations("directory");
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filters, setFilters] = useState<Filters>({
    specialty: params.get("specialty") ?? "",
    division: params.get("division") ?? "",
    zilla: params.get("zilla") ?? "",
    upazila: params.get("upazila") ?? "",
  });
  const [tab, setTab] = useState<Tab>("all");

  // Both lists are searched in the database; the typed search waits for a
  // pause in the typing.
  const [typed, setTyped] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setTyped(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // The address follows the search, without a navigation.
  useEffect(() => {
    const next = new URLSearchParams();
    if (typed) next.set("q", typed);
    (Object.keys(filters) as (keyof Filters)[]).forEach(k => { if (filters[k]) next.set(k, filters[k]); });
    const search = next.toString();
    window.history.replaceState(null, "", `/search${search ? `?${search}` : ""}`);
  }, [typed, filters]);

  const where = { specialty: filters.specialty, division: filters.division, district: filters.zilla, upazila: filters.upazila };
  const doctors = useDoctorSearch({ query: typed, ...where });
  const hospitals = useHospitalSearch({ query: typed, ...where });

  const doctorsLoading = doctors.loading && doctors.doctors.length === 0;
  const hospitalsLoading = hospitals.loading && hospitals.hospitals.length === 0;
  const nothing = !doctors.loading && !hospitals.loading && doctors.total === 0 && hospitals.total === 0;
  const clear = (k: keyof Filters) => setFilters(f => ({ ...f, [k]: "" }));

  const doctorGrid = (limit?: number) => (
    <div className={DOCTOR_GRID}>
      {(limit ? doctors.doctors.slice(0, limit) : doctors.doctors).map((d, i) => <DoctorCard key={d.id} d={d} i={i % 24} />)}
    </div>
  );
  const hospitalGrid = (limit?: number) => (
    <div className={HOSPITAL_GRID}>
      {(limit ? hospitals.hospitals.slice(0, limit) : hospitals.hospitals).map((h, i) => <HospitalCard key={h.slug} h={h} i={i % 24} />)}
    </div>
  );

  const heading = (title: string, count: number, seeAll: string, to: Tab, limit: number) => (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h2 className="font-display text-2xl text-primary">
        {title} <span className="text-base font-sans font-normal text-muted-foreground">({t("count", { count })})</span>
      </h2>
      {count > limit && (
        <button type="button" onClick={() => { setTab(to); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all hover:gap-2">
          {seeAll} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    // The homepage's surface, as on /doctors.
    <div className="min-h-screen lp-page-bg overflow-x-clip">
      <Navbar transparentAtTop />
      <main className="relative isolate container mx-auto min-h-screen -mt-20 pt-36 pb-16">
        <SectionGlow {...GLOW.hero} bleed />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2 transition-all mb-6">
            <ArrowLeft className="h-4 w-4" /> {td("backHome")}
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-4xl md:text-5xl text-primary">{t.rich("title", gradient)}</h1>
            <p className="text-muted-foreground mt-3 max-w-xl">{t("subtitle")}</p>
          </div>

          {/* The home page's pill. Typing searches; there is no button to press. */}
          <div className="relative flex max-w-4xl items-center rounded-full bg-card border border-white/80 shadow-card pl-4 sm:pl-6 pr-2 py-1.5 sm:py-2">
            <SearchIcon className="h-5 w-5 text-foreground/80 shrink-0" strokeWidth={2.25} />
            <input
              type="search"
              autoFocus={!query}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={tb("placeholder")}
              aria-label={tb("search")}
              className="min-w-0 flex-1 bg-transparent px-2 sm:px-3 py-2 text-base outline-none placeholder:text-muted-foreground placeholder:truncate [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label={tc("clearSearch")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-chip">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {(filters.specialty || filters.division || filters.zilla || filters.upazila) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {filters.specialty && <FilterChip label={filters.specialty} onClear={() => clear("specialty")} />}
              {filters.division && <FilterChip label={t("divisionChip", { name: filters.division })} onClear={() => clear("division")} />}
              {filters.zilla && <FilterChip label={filters.zilla} onClear={() => clear("zilla")} />}
              {filters.upazila && <FilterChip label={filters.upazila} onClear={() => clear("upazila")} />}
            </div>
          )}

          <Tabs value={tab} onValueChange={v => setTab(v as Tab)} className="mt-6">
            <TabsList className="h-auto rounded-full bg-card border border-border/60 p-1 shadow-soft">
              <TabsTrigger value="all" className="rounded-full px-5 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {t("all")}
              </TabsTrigger>
              <TabsTrigger value="doctors" className="rounded-full px-5 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {t("doctors")} ({t("count", { count: doctors.total })})
              </TabsTrigger>
              <TabsTrigger value="hospitals" className="rounded-full px-5 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {t("hospitals")} ({t("count", { count: hospitals.total })})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        <div className="mt-8">
          {tab === "all" && (
            doctorsLoading || hospitalsLoading ? <Spinner />
            : nothing ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <SearchX className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-4 font-semibold text-foreground">{t("noneTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("noneBody")}</p>
              </div>
            ) : (
              <div className="space-y-14">
                {doctors.total > 0 && (
                  <section>
                    {heading(t("doctors"), doctors.total, t("seeAllDoctors", { count: doctors.total }), "doctors", FIRST_DOCTORS)}
                    {doctorGrid(FIRST_DOCTORS)}
                  </section>
                )}
                {hospitals.total > 0 && (
                  <section>
                    {heading(t("hospitals"), hospitals.total, t("seeAllHospitals", { count: hospitals.total }), "hospitals", FIRST_HOSPITALS)}
                    {hospitalGrid(FIRST_HOSPITALS)}
                  </section>
                )}
              </div>
            )
          )}

          {tab === "doctors" && (
            doctorsLoading ? <Spinner />
            : doctors.total === 0 ? <p className="py-16 text-center text-muted-foreground">{t("noDoctors")}</p>
            : (
              <>
                {doctorGrid()}
                {doctors.hasMore && (
                  <div className="mt-8 flex justify-center">
                    <button type="button" onClick={doctors.loadMore} disabled={doctors.loading} className={MORE_BUTTON}>
                      {doctors.loading ? tc("loading") : tc("showMore", { shown: doctors.doctors.length, total: doctors.total })}
                    </button>
                  </div>
                )}
              </>
            )
          )}

          {tab === "hospitals" && (
            hospitalsLoading ? <Spinner />
            : hospitals.total === 0 ? <p className="py-16 text-center text-muted-foreground">{t("noHospitals")}</p>
            : (
              <>
                {hospitalGrid()}
                {hospitals.hasMore && (
                  <div className="mt-8 flex justify-center">
                    <button type="button" onClick={hospitals.loadMore} disabled={hospitals.loading} className={MORE_BUTTON}>
                      {hospitals.loading ? tc("loading") : tc("showMore", { shown: hospitals.hospitals.length, total: hospitals.total })}
                    </button>
                  </div>
                )}
              </>
            )
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Search;
