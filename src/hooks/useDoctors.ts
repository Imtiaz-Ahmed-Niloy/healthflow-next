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
};

export type UIDoctor = {
  id: string;
  name: string;
  specialty: string;
  category: string;
  location: string;
  rating: number;
  reviews: number;
  blurb: string;
  /** Their own About, as saved — null when none was written. `blurb` falls back; this doesn't. */
  bio: string | null;
  /** Their areas of expertise, from the comma-separated column. */
  expertise: string[];
  gender: "male" | "female" | "other" | null;
  img: string | null;
  slug: string;
  experience: number;
  fee: number;
  available: string;
  /**
   * doctors.availability as typed, with no fallback. `available` above says
   * "Mon-Fri" for a doctor with nothing entered — fine as a label, wrong as a
   * rule. Booking checks this one (see src/lib/availability.ts).
   */
  availability: string | null;
  photo: string | null;
  education: string;
  languages: string[];
  patients: number;
  /**
   * At no hospital yet (0081): listed, but not bookable — an appointment
   * belongs to a hospital, and the booking API refuses one without it.
   */
  independent: boolean;
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

export const mapDBDoctorToUI = (d: DBDoctor): UIDoctor => {
  const rating = Number(d.rating) || 4.5;
  const reviews = Math.floor(rating * 20);
  // The uploaded photo or nothing. A stock face would pass for the actual
  // doctor; with no photo the cards draw initials instead (see Avatar).
  const photo = mediaUrl(d.photo_url);

  const locationParts = [d.location, d.district, d.division].filter(Boolean);
  const locationStr = locationParts.join(", ") || "Bangladesh";

  return {
    id: d.id,
    name: d.name,
    specialty: d.specialty || "General Practitioner",
    category: getCategoryFromSpecialty(d.specialty || ""),
    location: locationStr,
    rating,
    reviews,
    blurb: d.bio || (d.tenant_id
      ? `Experienced specialist practicing at ${d.hospital_name || "our partner hospital"}.`
      : "Experienced specialist in independent practice."),
    bio: d.bio?.trim() || null,
    expertise: d.expertise ? d.expertise.split(",").map(s => s.trim()).filter(Boolean) : [],
    gender: d.gender,
    img: photo,
    slug: d.slug,
    experience: d.experience_years || 1,
    fee: Number(d.consultation_fee) || 500,
    // Described, not raw: a week from the editor is JSON (src/lib/availability.ts).
    available: availabilityLabel(d.availability) || "Mon-Fri",
    availability: d.availability,
    photo,
    education: d.education || "MBBS",
    languages: d.languages ? d.languages.split(",").map(s => s.trim()).filter(Boolean) : ["English", "Bengali"],
    patients: d.patients_treated || 100,
    independent: !d.tenant_id,
    hospital: {
      name: d.tenant_id ? d.hospital_name || "Partner Hospital" : INDEPENDENT_LABEL,
      slug: d.hospital_slug || "",
      location: locationStr,
    }
  };
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
          setDoctors((data as DBDoctor[]).map(mapDBDoctorToUI));
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
