import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";
import { supabase } from "@/lib/supabase/client";
import { mediaUrl } from "@/lib/media";
import { availabilityLabel } from "@/lib/availability";

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

export const useDoctors = () => {
  // The rows as fetched; the doctors are built from them for the page's
  // language, so a switch relabels them without a refetch.
  const [rows, setRows] = useState<DBDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = useLocale();
  const w = useWords();
  // `w` is rebuilt each render; the words only change with the language.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const doctors = useMemo(() => doctorsFromRows(rows, w, locale), [rows, locale]);

  useEffect(() => {
    let active = true;
    const fetchDoctors = async () => {
      try {
        const { data, error } = await supabase
          .from("doctors_public")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching doctors:", error);
          return;
        }

        if (active && data) {
          setRows(data as DBDoctor[]);
        }
      } catch (err) {
        console.error("Failed to load doctors:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchDoctors();
    return () => { active = false; };
  }, []);

  return { doctors, loading };
};
