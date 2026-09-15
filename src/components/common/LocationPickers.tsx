"use client";

import { useMemo, useState } from "react";
import { LocateFixed, Map as MapIcon, MapPin } from "lucide-react";
import { SearchSelect, type SearchSelectOption } from "@/components/common/SearchSelect";
import { useBdLocations, type BdDivision } from "@/hooks/useBdLocations";

/**
 * Division >> District >> Upazila pickers over the 0096 lists, for the
 * patient's Find Doctors and Find Hospitals pages.
 *
 * `useLocationFilter` holds what's picked; `LocationPickers` draws the three
 * pickers. Picking a district fills in its division, a new division clears a
 * district outside it, and the upazila list waits for a district. Names from
 * a link ("Comilla", "Bogra") resolve to the lists' own spelling.
 */

/** Anything with a place: a hospital, a doctor's chamber. */
export type Placed = { division?: string | null; district?: string | null; subdistrict?: string | null };

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

export const useLocationFilter = (initial: { division?: string | null; district?: string | null; upazila?: string | null } = {}) => {
  const { divisions, districts, upazilas } = useBdLocations();
  const [division, setDivision] = useState(initial.division ?? "");
  const [district, setDistrict] = useState(initial.district ?? "");
  const [upazila, setUpazila] = useState(initial.upazila ?? "");

  // What's picked, as rows of the lists. A district decides its division.
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
  const clear = () => {
    setDivision("");
    setDistrict("");
    setUpazila("");
  };

  // Places are saved in the lists' spelling (0096's trigger); a name from a
  // link that the lists don't know still compares loosely.
  const want = {
    division: divisionRow?.name ?? division,
    district: districtRow?.name ?? district,
    upazila: upazilaRow?.name ?? upazila,
  };

  return {
    want,
    active: !!(want.division || want.district || want.upazila),
    picked: { division: divisionRow?.name ?? "", district: districtRow?.name ?? "", upazila: upazilaRow?.name ?? "" },
    hasDistrict: !!districtRow,
    options: { division: divisionOptions, district: districtOptions, upazila: upazilaOptions },
    pickDivision,
    pickDistrict,
    pickUpazila: setUpazila,
    clear,
  };
};

export type LocationFilter = ReturnType<typeof useLocationFilter>;

/** Is this place inside what's picked? Nothing picked matches everywhere. */
export const placeMatches = (want: LocationFilter["want"], p: Placed) => {
  const same = (have: string | null | undefined, picked: string) => !picked || (!!have && norm(have) === norm(picked));
  return same(p.division, want.division) && same(p.district, want.district) && same(p.subdistrict, want.upazila);
};

const ICON = "h-4 w-4 shrink-0 text-muted-foreground";

export const LocationPickers = ({ filter, className }: { filter: LocationFilter; className: string }) => (
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
    <SearchSelect
      value={filter.picked.division}
      onChange={filter.pickDivision}
      options={filter.options.division}
      allLabel="All divisions"
      searchPlaceholder="Search divisions…"
      emptyText="No division found."
      icon={<MapIcon className={ICON} />}
      className={className}
      aria-label="Division"
    />
    <SearchSelect
      value={filter.picked.district}
      onChange={filter.pickDistrict}
      options={filter.options.district}
      allLabel="All districts"
      searchPlaceholder="Search districts…"
      emptyText="No district found."
      icon={<MapPin className={ICON} />}
      className={className}
      aria-label="District"
    />
    <SearchSelect
      value={filter.picked.upazila}
      onChange={filter.pickUpazila}
      options={filter.options.upazila}
      allLabel={filter.hasDistrict ? "All upazilas & thanas" : "Pick a district first"}
      searchPlaceholder="Search upazilas…"
      emptyText="No upazila found."
      icon={<LocateFixed className={ICON} />}
      className={className}
      disabled={!filter.hasDistrict}
      aria-label="Upazila or thana"
    />
  </div>
);
