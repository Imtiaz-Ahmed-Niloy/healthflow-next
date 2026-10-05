import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";
import { supabase } from "@/lib/supabase/client";
import { mediaUrl } from "@/lib/media";
import { availabilityLabel } from "@/lib/availability";
import { fetchDoctorRows } from "@/lib/publicDirectory";

export type DBDoctor = {
  id: string;
  /** Null for a doctor at no hospital yet (0081, listed since 0086). */
  tenant_id: string | null;
  name: string;
  slug: string;
  specialty: string | null;
  education: string | null;
  bio: string | null;
  languages: string | null;
  expertise: string | null;
  experience_years: number | null;
  rating: number | null;
  consultation_fee: number | null;
  patients_treated: number | null;
  consultation_duration_minutes: number | null;
  availability: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  location: string | null;
  division: string | null;
  district: string | null;
  subdistrict: string | null;
  hospital_name: string | null;
  hospital_slug: string | null;
  gender: "male" | "female" | "other" | null;
  /** Public registration, published since 0087. */
  bmdc_number: string | null;
  /** 'hospital', 'chamber' (0088), or null at neither. */
  practice_kind: string | null;
  /** The chamber's or hospital's address and phone (0089). */
  practice_address: string | null;
  practice_phone: string | null;
  /** The same on every row of one doctor (0090): what the site groups them by. */
  person_slug: string | null;
  /** False at a listing-only hospital (0116): shown, but not booked here. */
  bookable: boolean | null;
  /** At a listing-only hospital, the number to call for a serial. */
  serial_phone: string | null;
  /** Their post at this place: "Associate Professor (Neurology)" (0116). */
  designation: string | null;
};

/**
 * One place a doctor practises — a hospital, or their own chamber (0088) —
 * with what it charges and when they're there. A doctor has one of these per
 * doctors row; each is booked separately.
 */
export type DoctorPlace = {
  /** The doctors row at this place — what an appointment is booked against. */
  id: string;
  /** That row's own slug. An older link to it still opens the doctor's page. */
  slug: string;
  kind: "hospital" | "chamber";
  name: string;
  /** The hospital's page, for a hospital. */
  hospitalSlug: string;
  /** "Dhanmondi, Dhaka" */
  location: string;
  /** Written in the 0096 lists' spelling ("Cumilla", not "Comilla"); what the Find Doctors filters match. */
  division: string | null;
  district: string | null;
  /** The upazila, or a Dhaka city thana. */
  subdistrict: string | null;
  address: string | null;
  phone: string | null;
  fee: number;
  /** As stored, with no fallback — booking holds a patient to it (src/lib/availability.ts). */
  availability: string | null;
  /** The same, described: "Sun–Thu 9:00 AM–5:00 PM". Empty when not set. */
  available: string;
  /** False at a listing-only hospital (0116): call `serialPhone` instead of booking. */
  bookable: boolean;
  serialPhone: string | null;
  /** Their post here, e.g. "Associate Professor (Neurology)". */
  designation: string | null;
  /** The fee as stored; null when the place never said. `fee` above falls back. */
  feeKnown: number | null;
};

export type UIDoctor = {
  /** Their first place's doctors row (or their only row): unique per doctor. */
  id: string;
  name: string;
  specialty: string;
  /** Their specialty as chosen from the list (0093); what the filters match. */
  category: string;
  /** Every place's area, so a filter or search on any of them finds the doctor. */
  location: string;
  rating: number;
  reviews: number;
  blurb: string;
  /** Their own About, as saved — null when none was written. `blurb` falls back; this doesn't. */
  bio: string | null;
  /** Their areas of expertise, from the comma-separated column. */
  expertise: string[];
  /** BMDC registration number — the public proof they are licensed. */
  bmdc: string | null;
  gender: "male" | "female" | "other" | null;
  img: string | null;
  /** The doctor's one page: /doctors/<slug> (0090). */
  slug: string;
  /** Years of experience as they entered it; null when not entered. */
  experience: number | null;
  fee: number;
  available: string;
  /**
   * The first place's availability as stored, with no fallback. `available`
   * above says "Mon-Fri" for a doctor with nothing entered — fine as a label,
   * wrong as a rule. Booking checks the place's own (see DoctorPlace).
   */
  availability: string | null;
  photo: string | null;
  /** Their degrees as they entered them, e.g. "MBBS, FCPS (Medicine)" — null when none. */
  education: string | null;
  languages: string[];
  patients: number;
  /**
   * At no hospital or chamber yet (0081): listed, but not bookable — an
   * appointment belongs to one, and the booking API refuses one without it.
   */
  independent: boolean;
  /**
   * Where they practise: hospitals first, then their chambers. One card and
   * one page per doctor however many there are (0090). Empty when independent.
   */
  places: DoctorPlace[];
  /**
   * Bookable online at one of their places, at least. A doctor only at
   * listing-only hospitals (0116) is called for a serial instead.
   */
  bookable: boolean;
  /** The first number to call for a serial, when some place is listing-only. */
  serialPhone: string | null;
  /** Their post at their first place that names one. */
  designation: string | null;
  /** Their first place, or "Independent practice". */
  hospital: {
    name: string;
    slug: string;
    location: string;
  };
};

/**
 * The words this hook fills gaps with — a chamber with no name, a doctor at
 * no hospital — in the page's language (messages: doctorData).
 */
type Words = {
  chamber: string;
  partnerHospital: string;
  general: string;
  independent: string;
  seesAt: (place: string) => string;
  practicingAt: (place: string) => string;
  independentBlurb: string;
  noHours: string;
  languages: string[];
};

const useWords = (): Words => {
  const t = useTranslations("doctorData");
  return {
    chamber: t("chamber"),
    partnerHospital: t("partnerHospital"),
    general: t("general"),
    independent: t("independent"),
    seesAt: place => t("seesAt", { place }),
    practicingAt: place => t("practicingAt", { place }),
    independentBlurb: t("independentBlurb"),
    noHours: t("noHours"),
    languages: [t("english"), t("bangla")],
  };
};


/**
 * "Dhanmondi, Dhaka" — each part once; Dhaka is often area, district and
 * division at once, and a location typed as "Bogura, Bangladesh" already
 * names its district.
 */
const placeLocation = (d: DBDoctor) => {
  const parts = [...(d.location ?? "").split(","), d.district ?? "", d.division ?? ""]
    .map(p => p.trim())
    .filter(p => p && p.toLowerCase() !== "bangladesh");
  return parts.filter((p, i) => parts.findIndex(q => q.toLowerCase() === p.toLowerCase()) === i).join(", ");
};

const toPlace = (d: DBDoctor, w: Words, locale: Locale): DoctorPlace => ({
  id: d.id,
  slug: d.slug,
  kind: d.practice_kind === "chamber" ? "chamber" : "hospital",
  name: d.hospital_name || (d.practice_kind === "chamber" ? w.chamber : w.partnerHospital),
  hospitalSlug: d.hospital_slug || "",
  location: placeLocation(d),
  division: d.division,
  district: d.district,
  subdistrict: d.subdistrict,
  address: d.practice_address,
  phone: d.practice_phone,
  fee: Number(d.consultation_fee) || 500,
  availability: d.availability,
  available: availabilityLabel(d.availability, locale) || "",
  bookable: d.bookable !== false,
  serialPhone: d.serial_phone,
  designation: d.designation,
  feeKnown: Number(d.consultation_fee) || null,
});

/**
 * One doctor from all of their listed rows (0090). The person's own details
 * are the same on every row (0077's sync), so any row gives them; each row
 * with a hospital or chamber adds a place.
 */
const toDoctor = (rows: DBDoctor[], w: Words, locale: Locale): UIDoctor => {
  const places = rows
    .filter(r => r.tenant_id)
    .map(r => ({ row: r, place: toPlace(r, w, locale) }))
    // Hospitals first, then chambers; each in the order they were added.
    .sort((a, b) =>
      (a.place.kind === b.place.kind ? 0 : a.place.kind === "hospital" ? -1 : 1)
      || a.row.created_at.localeCompare(b.row.created_at));
  const d = places[0]?.row ?? rows[0];
  const first = places[0]?.place ?? null;

  const rating = Number(d.rating) || 4.5;
  // The uploaded photo or nothing. A stock face would pass for the actual
  // doctor; with no photo the cards draw initials instead (see Avatar).
  const photo = mediaUrl(d.photo_url);
  const areas = places.map(p => p.place.location).filter((l, i, all) => l && all.indexOf(l) === i);

  return {
    id: d.id,
    name: d.name,
    specialty: d.specialty || w.general,
    // Their specialty exactly as chosen from the specialties list (0093) —
    // what the filters match. It used to be guessed from keywords in free
    // text ("dent" in anything made a dentist).
    category: d.specialty?.trim() || "",
    location: areas.join(" · ") || placeLocation(d) || "Bangladesh",
    rating,
    reviews: Math.floor(rating * 20),
    blurb: d.bio || (first
      ? first.kind === "chamber" && places.length === 1
        ? w.seesAt(first.name)
        : w.practicingAt(first.name)
      : w.independentBlurb),
    bio: d.bio?.trim() || null,
    expertise: d.expertise ? d.expertise.split(",").map(s => s.trim()).filter(Boolean) : [],
    bmdc: d.bmdc_number?.trim() || null,
    gender: d.gender,
    img: photo,
    slug: d.person_slug || d.slug,
    // As entered, or null — not a default year they never claimed.
    experience: d.experience_years ?? null,
    fee: first?.fee ?? (Number(d.consultation_fee) || 500),
    // Described, not raw: a week from the editor is JSON (src/lib/availability.ts).
    available: first?.available || availabilityLabel(d.availability, locale) || w.noHours,
    availability: first ? first.availability : d.availability,
    photo,
    // As they entered it, or nothing. A default degree would be a
    // qualification nobody claimed, printed on their card.
    education: d.education?.trim() || null,
    languages: d.languages ? d.languages.split(",").map(s => s.trim()).filter(Boolean) : w.languages,
    patients: d.patients_treated || 100,
    independent: places.length === 0,
    places: places.map(p => p.place),
    bookable: places.some(p => p.place.bookable),
    serialPhone: places.find(p => !p.place.bookable && p.place.serialPhone)?.place.serialPhone ?? null,
    designation: places.find(p => p.place.designation)?.place.designation ?? null,
    hospital: {
      name: first?.name ?? w.independent,
      slug: first?.hospitalSlug ?? "",
      location: first?.location || placeLocation(d) || "Bangladesh",
    },
  };
};

/** Rows grouped into doctors, in the order each doctor first appears. */
const doctorsFromRows = (rows: DBDoctor[], w: Words, locale: Locale): UIDoctor[] => {
  const people = new Map<string, DBDoctor[]>();
  for (const row of rows) {
    const key = row.person_slug || row.slug;
    const list = people.get(key);
    if (list) list.push(row);
    else people.set(key, [row]);
  }
  return [...people.values()].map(group => toDoctor(group, w, locale));
};

/**
 * Rows fetched by `load` and grouped into doctors for the page's language —
 * a language switch relabels them without a refetch. `key` refetches: pass
 * whatever `load` depends on. A null key loads nothing.
 *
 * `initial` is the same rows as the server already read them (the doctor's
 * and the hospital's own pages): the first render has them, and the first
 * fetch is skipped.
 */
const useDoctorRows = (key: string | null, load: () => Promise<DBDoctor[]>, initial?: DBDoctor[]) => {
  const [rows, setRows] = useState<DBDoctor[]>(initial ?? []);
  const [loading, setLoading] = useState(key !== null && !initial);
  const seeded = useRef(initial !== undefined);
  const locale = useLocale();
  const w = useWords();
  // `w` is rebuilt each render; the words only change with the language.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const doctors = useMemo(() => doctorsFromRows(rows, w, locale), [rows, locale]);

  useEffect(() => {
    if (seeded.current) { seeded.current = false; return; }
    if (key === null) { setRows([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    load()
      .then(data => { if (active) setRows(data); })
      .catch(err => console.error("Failed to load doctors:", err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { doctors, loading };
};

const selectRows = async (query: PromiseLike<{ data: unknown; error: { message: string } | null }>) => {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DBDoctor[];
};

/** Every row of one doctor, found by their page's slug or any listing's slug (0090). */
export const useDoctor = (slug: string | undefined, initial?: DBDoctor[]) => {
  const { doctors, loading } = useDoctorRows(slug ?? null, () => fetchDoctorRows(supabase, slug!), initial);
  return { doctor: doctors[0] ?? null, loading };
};

/** The doctors at one hospital, by its slug. */
export const useHospitalDoctors = (hospitalSlug: string | undefined, initial?: DBDoctor[]) =>
  useDoctorRows(hospitalSlug ?? null, () =>
    selectRows(supabase.from("doctors_public").select("*").eq("hospital_slug", hospitalSlug!).limit(1000)), initial);

/** The doctors behind these doctors rows (a patient's saved list). */
export const useDoctorsByIds = (ids: string[]) => {
  const key = ids.length ? [...ids].sort().join(",") : null;
  return useDoctorRows(key, async () => {
    const rows = await selectRows(supabase.from("doctors_public").select("*").in("id", ids));
    const people = [...new Set(rows.map(r => r.person_slug).filter((s): s is string => !!s))];
    if (!people.length) return rows;
    return selectRows(supabase.from("doctors_public").select("*").in("person_slug", people));
  });
};

export type DoctorSearch = {
  query?: string;
  specialty?: string;
  gender?: string;
  division?: string;
  district?: string;
  upazila?: string;
  sort?: string;
  /** For the 'nearest' sort (0120): where the visitor is, as useNearbyArea guessed. */
  nearDivision?: string;
  nearDistrict?: string;
};

/**
 * One page at a time of the public directory, searched in the database
 * (search_doctors_public, 0116) — it is far too big to fetch whole. Partners
 * come first. `loadMore` appends the next page.
 */
export const useDoctorSearch = (search: DoctorSearch, pageSize = 24) => {
  const [rows, setRows] = useState<DBDoctor[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const locale = useLocale();
  const w = useWords();
  const key = JSON.stringify(search);

  // A new search starts again from the first page.
  useEffect(() => { setPage(0); }, [key]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const s = search;
    Promise.resolve(supabase.rpc("search_doctors_public", {
      p_q: s.query?.trim() || null,
      p_specialty: s.specialty || null,
      p_gender: s.gender || null,
      p_division: s.division || null,
      p_district: s.district || null,
      p_upazila: s.upazila || null,
      p_sort: s.sort || "recommended",
      p_limit: pageSize,
      p_offset: page * pageSize,
      // Only for the sort that reads them, so every other search is the call
      // it always was.
      ...(s.sort === "nearest"
        ? { p_near_division: s.nearDivision || null, p_near_district: s.nearDistrict || null }
        : {}),
    }))
      .then(({ data, error }) => {
        if (!active) return;
        if (error) { console.error("Doctor search failed:", error); return; }
        const result = (data ?? {}) as { total?: number; order?: string[]; rows?: DBDoctor[] };
        setTotal(result.total ?? 0);
        setRows(prev => (page === 0 ? result.rows ?? [] : [...prev, ...(result.rows ?? [])]));
        setOrder(prev => (page === 0 ? result.order ?? [] : [...prev, ...(result.order ?? [])]));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, pageSize]);

  // Grouped, then put back in the order the database ranked them. `w` is
  // rebuilt each render; the words only change with the language.
  const doctors = useMemo(() => {
    const grouped = doctorsFromRows(rows, w, locale);
    const rank = new Map(order.map((slug, i) => [slug, i]));
    return grouped.sort((a, b) => (rank.get(a.slug) ?? 1e9) - (rank.get(b.slug) ?? 1e9));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, order, locale]);

  return {
    doctors,
    total,
    loading,
    hasMore: doctors.length < total,
    loadMore: () => setPage(p => p + 1),
  };
};
