import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";
import { hospitals as staticHospitals, type Hospital, type Doctor, type Room, type ManagementMember } from "@/data/hospitals";
import { slugify } from "@/lib/slug";
import { mediaUrl } from "@/lib/media";
import { parseWeek, summariseWeek } from "@/lib/hours";
import { availabilityLabel } from "@/lib/availability";
import { supabase } from "@/lib/supabase/client";
const atriumFallback = "/assets/hub-atrium.jpg";

const splitList = (s?: string | null) =>
  (s || "").split(",").map((x) => x.trim()).filter(Boolean);

/** One row of `public.hospitals_public`, the safe public projection of tenants. */
type PublicHospital = {
  id: string | null;
  name: string | null;
  slug: string | null;
  tagline: string | null;
  location: string | null;
  division: string | null;
  district: string | null;
  subdistrict: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  additional_phones: string[] | null;
  additional_emails: string[] | null;
  websites: string[] | null;
  // jsonb, so the generated type is Json — narrowed by `socialLinks` below.
  social: unknown;
  logo_url: string | null;
  cover_image_url: string | null;
  specialties: string | null;
  facilities: string | null;
  opening_hours: unknown;
  summary: string | null;
  about: string | null;
  beds: number | null;
  doctor_count: number | null;
  founded_year: number | null;
  rating: number | null;
  reviews_count: number | null;
  /** Approved on HealthFlow (0097). The list also carries pending hospitals, without the badge. */
  is_partner: boolean | null;
  // jsonb array of { name, role, phone, email } — captured on the "Owner &
  // Management" step of the hospital form (src/data/hospitalFields.ts).
  management_body: unknown;
};

/** One row of `public.lab_tests_public` (0098). */
type PublicLabTest = {
  hospital_slug: string | null;
  name: string | null;
  category: string | null;
  price: number | null;
  turnaround: string | null;
};

/** One row of `public.hospital_rooms_public` (0098) — a ward, or a cabin category, grouped with its bed/cabin counts. */
type PublicRoom = {
  room_id: string | null;
  hospital_slug: string | null;
  type: string | null;
  category: string | null;
  price: number | null;
  included: string[] | null;
  total: number | null;
  available: number | null;
};

/**
 * "Gulshan, Dhaka" — each part once. A location typed as "Bogura, Bangladesh"
 * already names its district, and Dhaka is often area, district and division.
 */
const hospitalLocation = (r: PublicHospital) => {
  const parts = [...(r.location ?? "").split(","), r.district ?? "", r.division ?? ""]
    .map((p) => p.trim())
    .filter((p) => p && p.toLowerCase() !== "bangladesh");
  return parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i).join(", ");
};

/** Drops blanks and duplicates, keeping the canonical value first. */
const contactList = (primary: string | null, extra: string[] | null): string[] => {
  const seen = new Set<string>();
  return [primary ?? "", ...(extra ?? [])]
    .map((v) => (v ?? "").trim())
    .filter((v) => {
      if (!v || seen.has(v.toLowerCase())) return false;
      seen.add(v.toLowerCase());
      return true;
    });
};

/** Narrows the `social` jsonb to the [{ platform, url }] the card renders. */
const socialLinks = (value: unknown): { platform: string; url: string }[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { platform, url } = entry as { platform?: unknown; url?: unknown };
    if (typeof url !== "string" || !url.trim()) return [];
    return [{ platform: typeof platform === "string" && platform ? platform : "website", url: url.trim() }];
  });
};


/** One row of `public.doctors_public` (0022, gender added in 0023). */
type PublicDoctor = {
  gender: string | null;
  name: string | null;
  specialty: string | null;
  education: string | null;
  languages: string | null;
  experience_years: number | null;
  rating: number | null;
  consultation_fee: number | null;
  patients_treated: number | null;
  availability: string | null;
  photo_url: string | null;
  hospital_slug: string | null;
};

/**
 * Maps a doctor row onto the card shape.
 *
 * Every numeric falls back to 0 rather than being invented: the card divides
 * `patients` by 1000 and prints `fee` directly, so a null has to become a real
 * number somewhere, and 0 is the one value that reads as "not recorded"
 * instead of quietly asserting something untrue about a named doctor.
 *
 * `languages` is comma-separated text in the table (see 0005 — the admin form
 * submits every field as a string), so it is split back into the array the
 * card joins with bullets.
 */
/**
 * The words the mapping fills gaps with, in the page's language (messages:
 * hospitalData). The mapping runs for the current language each render, so a
 * switch relabels the list without a refetch.
 */
type Words = {
  unnamedDoctor: string;
  general: string;
  byAppointment: string;
  untitled: string;
  partner: string;
  verified: string;
  defaultHours: { day: string; time: string }[];
};

const mapPublicToDoctor = (r: PublicDoctor, w: Words, locale: Locale): Doctor => ({
  name: r.name || w.unnamedDoctor,
  specialty: r.specialty || w.general,
  experience: Number(r.experience_years) || 0,
  rating: Number(r.rating) || 0,
  fee: Number(r.consultation_fee) || 0,
  available: availabilityLabel(r.availability, locale) || w.byAppointment,
  photo: mediaUrl(r.photo_url),
  education: r.education || "",
  languages: splitList(r.languages),
  patients: Number(r.patients_treated) || 0,
});

const mapPublicToLabTest = (r: PublicLabTest) => ({
  name: r.name || "",
  category: r.category || "General",
  price: Number(r.price) || 0,
  turnaround: r.turnaround || "—",
});

/**
 * A real ward or cabin-category row. `capacity`/`amenities`/`size`/`view` are
 * blank rather than invented — wards and cabins don't record a room "view",
 * and a cabin category groups rows whose capacity can differ, so there is no
 * single true value to print. The card these feed (HospitalDetail) only
 * reads type/category/price/included/available/total for that reason.
 */
const mapPublicToRoom = (r: PublicRoom): Room => ({
  type: r.type || "",
  category: r.category === "ICU" || r.category === "Cabin" ? r.category : "Ward",
  capacity: "",
  price: Number(r.price) || 0,
  amenities: "",
  size: "",
  view: "",
  included: r.included ?? [],
  available: Number(r.available) || 0,
  total: Number(r.total) || 0,
});

/**
 * `management_body` — [{ name, role, phone, email }], typed as posted by
 * PeopleField (src/components/admin/ResourcePage.tsx) and validated by
 * managementBodySchema (src/server/resources/hospitals.ts). bio/photo/
 * linkedin/tenure are left blank: nothing in the admin form collects them,
 * so inventing values here would be the same fabrication this replaces.
 */
const mapManagementBody = (value: unknown): ManagementMember[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { name, role, phone, email } = entry as { name?: unknown; role?: unknown; phone?: unknown; email?: unknown };
    if (typeof name !== "string" || !name.trim()) return [];
    return [{
      name: name.trim(),
      role: typeof role === "string" ? role.trim() : "",
      bio: "",
      photo: "",
      email: typeof email === "string" ? email.trim() : "",
      linkedin: "",
      tenure: "",
      phone: typeof phone === "string" ? phone.trim() : "",
    }];
  });
};

/**
 * Maps a public view row onto the shape the marketing pages already render.
 *
 * Contact details come from the view as of 0035 — before that the view carried
 * none and these resolved to "" no matter what a super admin had typed. Owner
 * and licence columns are still not exposed and must not be read here.
 *
 * `doctors_list` is whatever `doctors_public` holds for this hospital, and an
 * empty list stays empty. It used to be `baseDoctors` — the same six invented
 * doctors on every hospital in the country, complete with fees and ratings, on
 * a page the public reads as the hospital's own roster.
 */
const mapPublicToHospital = (
  r: PublicHospital,
  w: Words,
  locale: Locale,
  doctors: Doctor[] = [],
  labTests: ReturnType<typeof mapPublicToLabTest>[] = [],
  rooms: Room[] = [],
): Hospital => {
  const phones = contactList(r.contact_phone, r.additional_phones);
  const emails = contactList(r.contact_email, r.additional_emails);
  const websites = contactList(null, r.websites);

  return {
    slug: r.slug || slugify(r.name || r.id || ""),
    name: r.name || w.untitled,
    // One badge, and only on a partner — an approved hospital. The directory
    // also lists pending ones (0097), which get none; an empty tag is how the
    // cards know to leave it off. The tagline ("Medical College",
    // "Diagnostic") used to fill it, which read as a set of categories; it
    // still shows as the summary when there is no summary.
    tag: r.is_partner ? w.partner : "",
    location: hospitalLocation(r),
    division: r.division,
    district: r.district,
    subdistrict: r.subdistrict,
    address: r.address || r.location || "",
    rating: Number(r.rating) || 0,
    reviews: Number(r.reviews_count) || 0,
    beds: Number(r.beds) || 0,
    doctors: Number(r.doctor_count) || 0,
    founded: Number(r.founded_year) || new Date().getFullYear(),
    specialties: splitList(r.specialties),
    // "Verified partner" is the badge's claim too: partners only, empty for a
    // pending hospital so the pages leave the line off.
    cert: r.is_partner ? w.verified : "",
    phone: phones[0] ?? "",
    email: emails[0] ?? "",
    website: websites[0] ?? "",
    phones,
    emails,
    websites,
    social: socialLinks(r.social),
    // Both go through mediaUrl: an uploaded logo is stored as an R2 key
    // ("hospitals/2026/09/x.jpg"), while the seeded covers are absolute
    // Unsplash URLs. mediaUrl tells them apart — see src/lib/media.ts.
    image: mediaUrl(r.cover_image_url) || mediaUrl(r.logo_url) || atriumFallback,
    logo: mediaUrl(r.logo_url) ?? undefined,
    summary: r.summary || r.tagline || "",
    about: r.about || r.summary || "",
    facilities: splitList(r.facilities),
    awards: [],
    // 0054 made this column jsonb with a check constraint, so it is either a
    // well-formed week or null — the free text that used to live here was
    // converted or cleared by that migration.
    //
    // The empty case still falls back to a generic schedule, which is invented
    // and always has been. It is left alone here because replacing it with an
    // honest "hours not listed" changes what every hospital page says, and
    // that is a product decision rather than part of this change.
    hours: (() => {
      const week = parseWeek(r.opening_hours);
      if (week) return summariseWeek(week, locale).map(row => ({ day: row.days, time: row.hours }));
      return w.defaultHours;
    })(),
    doctors_list: doctors,
    lab_tests: labTests,
    rooms,
    management: mapManagementBody(r.management_body),
  };
};

/**
 * Approved hospitals, from the database.
 *
 * Reads `hospitals_public` (0008), never `tenants`. That view exposes only
 * columns safe to publish and filters to `status = 'approved'`, so "which
 * hospitals appear on the public site" is decided in SQL — and owner NIDs,
 * TIN/BIN and licence numbers are not reachable at all.
 *
 * Before 0008 this job was done by reading the super admin's localStorage, so
 * the public site only ever showed hospitals typed in the same browser.
 */
type ApprovedRows = {
  hospitals: PublicHospital[];
  doctors: PublicDoctor[];
  labTests: PublicLabTest[];
  rooms: PublicRoom[];
};

const fetchApproved = async (): Promise<ApprovedRows> => {
  // All four views in parallel. `doctors_public` (0022), `lab_tests_public`
  // and `hospital_rooms_public` (both 0098) each carry hospital_slug, so
  // every one is joined to its hospital in memory rather than with a request
  // per hospital.
  const [hospitalRes, doctorRes, labTestRes, roomRes] = await Promise.all([
    supabase.from("hospitals_public").select("*").order("created_at", { ascending: false }),
    supabase.from("doctors_public").select("*").order("rating", { ascending: false, nullsFirst: false }),
    supabase.from("lab_tests_public").select("*"),
    supabase.from("hospital_rooms_public").select("*"),
  ]);

  if (hospitalRes.error || !hospitalRes.data) return { hospitals: [], doctors: [], labTests: [], rooms: [] };

  // A failed doctor/lab/room read must not blank the hospital list — the page
  // is still worth rendering without that section.
  return {
    hospitals: hospitalRes.data.filter((r) => r.name),
    doctors: (doctorRes.data ?? []) as PublicDoctor[],
    labTests: (labTestRes.data ?? []) as PublicLabTest[],
    rooms: (roomRes.data ?? []) as PublicRoom[],
  };
};

/** Groups rows carrying `hospital_slug` into a Map, applying `map` to each. */
const groupBySlug = <T extends { hospital_slug: string | null }, U>(rows: T[], map: (row: T) => U | null): Map<string, U[]> => {
  const bySlug = new Map<string, U[]>();
  for (const row of rows) {
    if (!row.hospital_slug) continue;
    const mapped = map(row);
    if (mapped === null) continue;
    const list = bySlug.get(row.hospital_slug);
    if (list) list.push(mapped);
    else bySlug.set(row.hospital_slug, [mapped]);
  }
  return bySlug;
};

/** The rows as hospitals, labelled in the page's language. */
const buildHospitals = (rows: ApprovedRows, w: Words, locale: Locale): Hospital[] => {
  const doctorsBySlug = groupBySlug(rows.doctors, (row) => (row.name ? mapPublicToDoctor(row, w, locale) : null));
  const labTestsBySlug = groupBySlug(rows.labTests, (row) => (row.name ? mapPublicToLabTest(row) : null));
  const roomsBySlug = groupBySlug(rows.rooms, (row) => (row.type ? mapPublicToRoom(row) : null));
  // Partners first, newest first within each group (the fetch's own order —
  // Array.prototype.sort is stable).
  const partnersFirst = [...rows.hospitals].sort((a, b) => Number(!!b.is_partner) - Number(!!a.is_partner));
  return partnersFirst.map((r) => mapPublicToHospital(
    r, w, locale,
    r.slug ? doctorsBySlug.get(r.slug) ?? [] : [],
    r.slug ? labTestsBySlug.get(r.slug) ?? [] : [],
    r.slug ? roomsBySlug.get(r.slug) ?? [] : [],
  ));
};

const useWords = (): Words => {
  const t = useTranslations("hospitalData");
  return {
    unnamedDoctor: t("unnamedDoctor"),
    general: t("general"),
    byAppointment: t("byAppointment"),
    untitled: t("untitled"),
    partner: t("partner"),
    verified: t("verified"),
    // Invented and always was: a hospital that never set its hours still
    // shows these (see mapPublicToHospital).
    defaultHours: [
      { day: t("weekdays"), time: "9:00 AM – 6:00 PM" },
      { day: t("weekend"), time: "10:00 AM – 4:00 PM" },
      { day: t("emergency"), time: t("allDay") },
    ],
  };
};

const dedupeBySlug = (list: Hospital[]): Hospital[] => {
  const seen = new Set<string>();
  return list.filter((h) => {
    if (seen.has(h.slug)) return false;
    seen.add(h.slug);
    return true;
  });
};

/**
 * Static marketing hospitals only, synchronously. Does NOT include database
 * partners — anything needing those must use the hooks below.
 */
export const getAllHospitals = (): Hospital[] => dedupeBySlug([...staticHospitals]);

const useApprovedHospitals = () => {
  const [rows, setRows] = useState<ApprovedRows>({ hospitals: [], doctors: [], labTests: [], rooms: [] });
  const [loading, setLoading] = useState(true);
  const locale = useLocale();
  const w = useWords();
  // `w` is rebuilt each render; the words only change with the language.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const approved = useMemo(() => buildHospitals(rows, w, locale), [rows, locale]);

  useEffect(() => {
    let active = true;
    void fetchApproved().then((fetched) => {
      if (!active) return;
      setRows(fetched);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // Approved rows only. `staticHospitals` used to be merged in behind them,
  // which meant the public site advertised 70 hospitals that existed nowhere
  // but this repo — a "Verified Health Hub" of hardcoded strings. Those rows
  // now live in `tenants` with status 'approved', so the same hospitals still
  // render; the difference is that a super admin can now suspend one and have
  // it actually disappear, which the fallback silently prevented.
  const hospitals = useMemo(() => dedupeBySlug(approved), [approved]);

  return { hospitals, loading };
};

/** Approved partners merged over the static marketing content. */
export const useHospitals = () => useApprovedHospitals().hospitals;

/** The same list, with whether it's still loading — for a page that shows a spinner. */
export const useHospitalList = useApprovedHospitals;

/**
 * Single hospital by slug.
 *
 * Replaces the old synchronous `findHospital`, which only worked while the data
 * was in localStorage. `loading` matters: without it a detail page cannot tell
 * "still fetching" from "no such hospital", and would flash not-found for every
 * real hospital on first paint.
 */
export const useHospital = (slug: string) => {
  const { hospitals, loading } = useApprovedHospitals();
  // `hospitals` comes back too so a detail page can render "related" without a
  // second hook instance, which would mean a second fetch.
  return { hospital: hospitals.find((h) => h.slug === slug), hospitals, loading };
};
