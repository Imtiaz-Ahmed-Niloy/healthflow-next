import { useEffect, useState } from "react";
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
  experience: number;
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

/** What a doctor at no hospital shows where a hospital's name would go. */
export const INDEPENDENT_LABEL = "Independent practice";

const getCategoryFromSpecialty = (spec: string): string => {
  const s = spec.toLowerCase();
  if (s.includes("cardi")) return "Cardiology";
  if (s.includes("dent") || s.includes("odont")) return "Dentistry";
  if (s.includes("ent") || s.includes("otolaryng")) return "ENT";
  if (s.includes("endo") || s.includes("diabet")) return "Endocrinology";
  if (s.includes("gastro") || s.includes("hepat") || s.includes("liver")) return "Gastroenterology";
  if (s.includes("gyne") || s.includes("obs") || s.includes("pregn")) return "Gynecology";
  if (s.includes("nephr") || s.includes("kidney")) return "Nephrology";
  if (s.includes("neuro") || s.includes("brain")) return "Neurology";
  if (s.includes("onco") || s.includes("cancer") || s.includes("breast")) return "Oncology";
  if (s.includes("ortho") || s.includes("bone")) return "Orthopedics";
  if (s.includes("pediat") || s.includes("child")) return "Pediatrics";
  if (s.includes("psych") || s.includes("mental")) return "Psychiatry";
  if (s.includes("surg")) return "Surgery";
  if (s.includes("urol")) return "Urology";
  return "General Medicine";
};

/** "Dhanmondi, Dhaka" — each part once; Dhaka is often area, district and division at once. */
const placeLocation = (d: DBDoctor) =>
  [d.location, d.district, d.division]
    .filter((part, i, all): part is string => !!part && all.indexOf(part) === i)
    .join(", ");

const toPlace = (d: DBDoctor): DoctorPlace => ({
  id: d.id,
  slug: d.slug,
  kind: d.practice_kind === "chamber" ? "chamber" : "hospital",
  name: d.hospital_name || (d.practice_kind === "chamber" ? "Chamber" : "Partner Hospital"),
  hospitalSlug: d.hospital_slug || "",
  location: placeLocation(d),
  address: d.practice_address,
  phone: d.practice_phone,
  fee: Number(d.consultation_fee) || 500,
  availability: d.availability,
  available: availabilityLabel(d.availability) || "",
});

/**
 * One doctor from all of their listed rows (0090). The person's own details
 * are the same on every row (0077's sync), so any row gives them; each row
 * with a hospital or chamber adds a place.
 */
const toDoctor = (rows: DBDoctor[]): UIDoctor => {
  const places = rows
    .filter(r => r.tenant_id)
    .map(r => ({ row: r, place: toPlace(r) }))
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
    specialty: d.specialty || "General Practitioner",
    category: getCategoryFromSpecialty(d.specialty || ""),
    location: areas.join(" · ") || placeLocation(d) || "Bangladesh",
    rating,
    reviews: Math.floor(rating * 20),
    blurb: d.bio || (first
      ? first.kind === "chamber" && places.length === 1
        ? `Sees patients at ${first.name}.`
        : `Experienced specialist practicing at ${first.name}.`
      : "Experienced specialist in independent practice."),
    bio: d.bio?.trim() || null,
    expertise: d.expertise ? d.expertise.split(",").map(s => s.trim()).filter(Boolean) : [],
    bmdc: d.bmdc_number?.trim() || null,
    gender: d.gender,
    img: photo,
    slug: d.person_slug || d.slug,
    experience: d.experience_years || 1,
    fee: first?.fee ?? (Number(d.consultation_fee) || 500),
    // Described, not raw: a week from the editor is JSON (src/lib/availability.ts).
    available: first?.available || availabilityLabel(d.availability) || "Mon-Fri",
    availability: first ? first.availability : d.availability,
    photo,
    // As they entered it, or nothing. A default degree would be a
    // qualification nobody claimed, printed on their card.
    education: d.education?.trim() || null,
    languages: d.languages ? d.languages.split(",").map(s => s.trim()).filter(Boolean) : ["English", "Bengali"],
    patients: d.patients_treated || 100,
    independent: places.length === 0,
    places: places.map(p => p.place),
    hospital: {
      name: first?.name ?? INDEPENDENT_LABEL,
      slug: first?.hospitalSlug ?? "",
      location: first?.location || placeLocation(d) || "Bangladesh",
    },
  };
};

/** Rows grouped into doctors, in the order each doctor first appears. */
export const doctorsFromRows = (rows: DBDoctor[]): UIDoctor[] => {
  const people = new Map<string, DBDoctor[]>();
  for (const row of rows) {
    const key = row.person_slug || row.slug;
    const list = people.get(key);
    if (list) list.push(row);
    else people.set(key, [row]);
  }
  return [...people.values()].map(toDoctor);
};

export const useDoctors = () => {
  const [doctors, setDoctors] = useState<UIDoctor[]>([]);
  const [loading, setLoading] = useState(true);

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
          setDoctors(doctorsFromRows(data as DBDoctor[]));
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
