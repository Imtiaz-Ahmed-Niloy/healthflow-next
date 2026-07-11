import { useEffect, useState, useCallback } from "react";
import { hospitals as staticHospitals, baseDoctors, baseLabTests, baseRooms, baseManagement, type Hospital, type Doctor } from "@/data/hospitals";
import { slugify } from "@/lib/slug";
const atriumFallback = "/assets/hub-atrium.jpg";
const doctorFallback = "/assets/doctors/doc-1.jpg";

const STORAGE_KEY = "hf:super-hospitals";
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

type SuperHospital = {
  id: string;
  image?: string;
  name: string;
  tag?: string;
  location?: string;
  address?: string;
  region?: string;
  plan?: string;
  beds?: string;
  doctors?: string;
  founded?: string;
  rating?: string;
  reviews?: string;
  specialties?: string;
  cert?: string;
  phone?: string;
  email?: string;
  website?: string;
  social?: string;
  hours?: string;
  facilities?: string;
  awards?: string;
  summary?: string;
  about?: string;
  status?: string;
};

const splitList = (s?: string) =>
  (s || "").split(",").map((x) => x.trim()).filter(Boolean);

const parseListField = (v?: string): string[] => {
  if (!v) return [];
  const s = v.trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try { const p = JSON.parse(s); if (Array.isArray(p)) return p.map(String).filter(Boolean); } catch { /* fallthrough */ }
  }
  return [s];
};

const parseSocial = (v?: string): { platform: string; url: string }[] => {
  if (!v) return [];
  try { const p = JSON.parse(v); if (Array.isArray(p)) return p.filter((x) => x && x.url); } catch { /* ignore */ }
  return [];
};

export const mapSuperToHospital = (r: SuperHospital): Hospital => {
  const phones = parseListField(r.phone);
  const emails = parseListField(r.email);
  const websites = parseListField(r.website);
  return ({
  slug: slugify(r.name || r.id),
  name: r.name || "Untitled hospital",
  tag: r.tag || "Custom",
  location: r.location || "",
  address: r.address || r.location || "",
  rating: Number(r.rating) || 4.5,
  reviews: Number(r.reviews) || 0,
  beds: Number(r.beds) || 0,
  doctors: Number(r.doctors) || 0,
  founded: Number(r.founded) || new Date().getFullYear(),
  specialties: splitList(r.specialties),
  cert: r.cert || "Certified",
  phone: phones[0] || "",
  email: emails[0] || "",
  website: websites[0] || "",
  phones,
  emails,
  websites,
  social: parseSocial((r as SuperHospital & { social?: string }).social),
  image: r.image || atriumFallback,
  summary: r.summary || r.tag || "",
  about: r.about || r.summary || "",
  facilities: splitList(r.facilities),
  awards: splitList(r.awards),
  hours: r.hours
    ? [{ day: "All week", time: r.hours }]
    : [
        { day: "Mon – Fri", time: "9:00 AM – 6:00 PM" },
        { day: "Sat – Sun", time: "10:00 AM – 4:00 PM" },
        { day: "Emergency", time: "24 Hours" },
      ],
  doctors_list: baseDoctors,
  lab_tests: baseLabTests,
  rooms: baseRooms,
  management: baseManagement,
});
};

const readCustom = (): Hospital[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SuperHospital[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => r && r.name && (r.status ?? "Active") !== "Suspended")
      .map(mapSuperToHospital);
  } catch {
    return [];
  }
};

export const getAllHospitals = (): Hospital[] => {
  const custom = readCustom();
  const seen = new Set<string>();
  const merged = [...custom, ...staticHospitals].filter((h) => {
    if (seen.has(h.slug)) return false;
    seen.add(h.slug);
    return true;
  });
  // Inject admin-added doctors (from /admin/doctors) and lab tests (from /admin/lab) into matching hospital
  return merged.map((h) => {
    let next = h;
    const extras = doctorsForHospital(h.name, h.slug);
    if (extras.length) {
      const existing = new Set(h.doctors_list.map((d) => d.name.toLowerCase()));
      const fresh = extras.filter((d) => !existing.has(d.name.toLowerCase()));
      next = { ...next, doctors_list: [...fresh, ...next.doctors_list], doctors: next.doctors + fresh.length };
    }
    const labs = labTestsForHospital(h.name, h.slug);
    // Replace lab_tests entirely with admin-managed catalog so add/edit/delete from /admin/lab is reflected
    next = { ...next, lab_tests: labs };
    return next;
  });
};

export const findHospital = (slug: string): Hospital | undefined =>
  getAllHospitals().find((h) => h.slug === slug);

export const useHospitals = () => {
  const [list, setList] = useState<Hospital[]>(() => getAllHospitals());
  const refresh = useCallback(() => setList(getAllHospitals()), []);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEY || e.key === DOCTORS_KEY || e.key === LAB_CATALOG_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    const id = window.setInterval(refresh, 1500);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      window.clearInterval(id);
    };
  }, [refresh]);
  return list;
};
