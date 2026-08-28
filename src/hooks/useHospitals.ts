import { useEffect, useMemo, useState } from "react";
import { hospitals as staticHospitals, baseLabTests, baseRooms, baseManagement, type Hospital, type Doctor } from "@/data/hospitals";
import { slugify } from "@/lib/slug";
import { supabase } from "@/lib/supabase/client";
const atriumFallback = "/assets/hub-atrium.jpg";
const doctorFallback = "/assets/doctors/doc-1.jpg";

const DOCTORS_KEY = "hf:doctors";
const LAB_CATALOG_KEY = "hf:lab-catalog";

type AdminLabItem = {
  id: string;
  name: string;
  category?: string;
  price?: string;
  turnaround?: string;
  hospital?: string;
  status?: string;
};

const readAdminLabTests = (): AdminLabItem[] => {
  try {
    const raw = localStorage.getItem(LAB_CATALOG_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as AdminLabItem[];
    return Array.isArray(arr) ? arr.filter(t => t && t.name && (t.status ?? "Active") !== "Inactive") : [];
  } catch { return []; }
};

const labTestsForHospital = (hospitalName: string, hospitalSlug: string) => {
  const target = hospitalName.toLowerCase().trim();
  return readAdminLabTests()
    .filter(t => {
      const h = (t.hospital || "").toLowerCase().trim();
      return !h || h === "all hospitals" || h === "all" || h === target || slugify(t.hospital || "") === hospitalSlug;
    })
    .map(t => ({
      name: t.name,
      category: t.category || "General",
      price: Number(t.price) || 0,
      turnaround: t.turnaround || "—",
    }));
};

type AdminDoctor = {
  id: string;
  name: string;
  specialty: string;
  experience?: string;
  rating?: string;
  fee?: string;
  patients?: string;
  available?: string;
  photo?: string;
  education?: string;
  languages?: string;
  hospital?: string;
  status?: string;
};

export const mapAdminDoctor = (d: AdminDoctor): Doctor => ({
  name: d.name,
  specialty: d.specialty || "General",
  experience: Number(d.experience) || 1,
  rating: Number(d.rating) || 4.7,
  fee: Number(d.fee) || 100,
  available: d.available || "Mon-Fri",
  photo: d.photo || doctorFallback,
  education: d.education || "MBBS",
  languages: (d.languages || "English").split(",").map(s => s.trim()).filter(Boolean),
  patients: Number(d.patients) || 100,
});

export const readAdminDoctors = (): AdminDoctor[] => {
  try {
    const raw = localStorage.getItem(DOCTORS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as AdminDoctor[];
    return Array.isArray(arr) ? arr.filter(d => d && d.name && (d.status ?? "Active") !== "Suspended") : [];
  } catch { return []; }
};

export type { AdminDoctor };

const doctorsForHospital = (hospitalName: string, hospitalSlug: string): Doctor[] => {
  const target = hospitalName.toLowerCase().trim();
  const targetSlug = hospitalSlug;
  return readAdminDoctors()
    .filter(d => {
      const h = (d.hospital || "").toLowerCase().trim();
      return h === target || slugify(d.hospital || "") === targetSlug;
    })
    .map(mapAdminDoctor);
};

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
  opening_hours: string | null;
  summary: string | null;
  about: string | null;
  beds: number | null;
  doctor_count: number | null;
  founded_year: number | null;
  rating: number | null;
  reviews_count: number | null;
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

/** One row of `public.doctors_public` (0022) — active doctors at approved hospitals. */
type PublicDoctor = {
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
const mapPublicToDoctor = (r: PublicDoctor): Doctor => ({
  name: r.name || "Unnamed doctor",
  specialty: r.specialty || "General",
  experience: Number(r.experience_years) || 0,
  rating: Number(r.rating) || 0,
  fee: Number(r.consultation_fee) || 0,
  available: r.availability || "By appointment",
  photo: r.photo_url || doctorFallback,
  education: r.education || "",
  languages: splitList(r.languages),
  patients: Number(r.patients_treated) || 0,
});

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
const mapPublicToHospital = (r: PublicHospital, doctors: Doctor[] = []): Hospital => {
  const phones = contactList(r.contact_phone, r.additional_phones);
  const emails = contactList(r.contact_email, r.additional_emails);
  const websites = contactList(null, r.websites);

  return {
    slug: r.slug || slugify(r.name || r.id || ""),
    name: r.name || "Untitled hospital",
    tag: r.tagline || "Partner hospital",
    location: [r.location, r.district, r.division].filter(Boolean).join(", ") || "",
    address: r.address || r.location || "",
    rating: Number(r.rating) || 0,
    reviews: Number(r.reviews_count) || 0,
    beds: Number(r.beds) || 0,
    doctors: Number(r.doctor_count) || 0,
    founded: Number(r.founded_year) || new Date().getFullYear(),
    specialties: splitList(r.specialties),
    cert: "Verified partner",
    phone: phones[0] ?? "",
    email: emails[0] ?? "",
    website: websites[0] ?? "",
    phones,
    emails,
    websites,
    social: socialLinks(r.social),
    image: r.cover_image_url || r.logo_url || atriumFallback,
    summary: r.summary || r.tagline || "",
    about: r.about || r.summary || "",
    facilities: splitList(r.facilities),
    awards: [],
    hours: r.opening_hours
      ? [{ day: "All week", time: r.opening_hours }]
      : [
          { day: "Mon – Fri", time: "9:00 AM – 6:00 PM" },
          { day: "Sat – Sun", time: "10:00 AM – 4:00 PM" },
          { day: "Emergency", time: "24 Hours" },
        ],
    doctors_list: doctors,
    lab_tests: baseLabTests,
    rooms: baseRooms,
    management: baseManagement,
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
const fetchApproved = async (): Promise<Hospital[]> => {
  // Both views in parallel. `doctors_public` (0022) is already filtered to
  // active doctors at approved hospitals, so no extra guard is needed here —
  // and it carries hospital_slug, so the two are joined in memory rather than
  // with a request per hospital.
  const [hospitalRes, doctorRes] = await Promise.all([
    supabase.from("hospitals_public").select("*").order("created_at", { ascending: false }),
    supabase.from("doctors_public").select("*").order("rating", { ascending: false, nullsFirst: false }),
  ]);

  if (hospitalRes.error || !hospitalRes.data) return [];

  // A failed doctor read must not blank the hospital list — the page is still
  // worth rendering without its roster.
  const bySlug = new Map<string, Doctor[]>();
  for (const row of (doctorRes.data ?? []) as PublicDoctor[]) {
    if (!row.hospital_slug || !row.name) continue;
    const list = bySlug.get(row.hospital_slug);
    if (list) list.push(mapPublicToDoctor(row));
    else bySlug.set(row.hospital_slug, [mapPublicToDoctor(row)]);
  }

  return hospitalRes.data
    .filter((r) => r.name)
    .map((r) => mapPublicToHospital(r, r.slug ? bySlug.get(r.slug) ?? [] : []));
};

/** Injects admin-managed doctors and lab tests into whichever hospitals match. */
const withLocalExtras = (list: Hospital[]): Hospital[] =>
  list.map((h) => {
    let next = h;
    const extras = doctorsForHospital(h.name, h.slug);
    if (extras.length) {
      const existing = new Set(h.doctors_list.map((d) => d.name.toLowerCase()));
      const fresh = extras.filter((d) => !existing.has(d.name.toLowerCase()));
      next = { ...next, doctors_list: [...fresh, ...next.doctors_list], doctors: next.doctors + fresh.length };
    }
    // Replaced entirely so add/edit/delete in /admin/lab is reflected.
    next = { ...next, lab_tests: labTestsForHospital(h.name, h.slug) };
    return next;
  });

const dedupeBySlug = (list: Hospital[]): Hospital[] => {
  const seen = new Set<string>();
  return list.filter((h) => {
    if (seen.has(h.slug)) return false;
    seen.add(h.slug);
    return true;
  });
};

/**
 * Static marketing hospitals only, synchronously.
 *
 * Kept for DoctorDetail, which needs a hospital list during render and is itself
 * still driven by localStorage doctors. It does NOT include database partners —
 * anything needing those must use the hooks below.
 */
export const getAllHospitals = (): Hospital[] =>
  withLocalExtras(dedupeBySlug([...staticHospitals]));

const useApprovedHospitals = () => {
  const [approved, setApproved] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [localTick, setLocalTick] = useState(0);

  useEffect(() => {
    let active = true;
    void fetchApproved().then((rows) => {
      if (!active) return;
      setApproved(rows);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const bump = () => setLocalTick((n) => n + 1);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === DOCTORS_KEY || e.key === LAB_CATALOG_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", bump);
    };
  }, []);

  // Approved rows only. `staticHospitals` used to be merged in behind them,
  // which meant the public site advertised 70 hospitals that existed nowhere
  // but this repo — a "Verified Health Hub" of hardcoded strings. Those rows
  // now live in `tenants` with status 'approved', so the same hospitals still
  // render; the difference is that a super admin can now suspend one and have
  // it actually disappear, which the fallback silently prevented.
  //
  // localTick is a deliberate dependency: it is how an edit in another tab to
  // the not-yet-migrated doctor and lab catalogues forces a re-merge.
  const hospitals = useMemo(
    () => withLocalExtras(dedupeBySlug(approved)),
    [approved, localTick],
  );

  return { hospitals, loading };
};

/** Approved partners merged over the static marketing content. */
export const useHospitals = () => useApprovedHospitals().hospitals;

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
