import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type DBDoctor = {
  id: string;
  tenant_id: string;
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
};

export type UIDoctor = {
  name: string;
  specialty: string;
  category: string;
  location: string;
  rating: number;
  reviews: number;
  blurb: string;
  date: string;
  time: string;
  mode: "Telehealth" | "In-Person";
  img: string;
  slug: string;
  experience: number;
  fee: number;
  available: string;
  photo: string;
  education: string;
  languages: string[];
  patients: number;
  hospital: {
    name: string;
    slug: string;
    location: string;
  };
};

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

const doctorFallback = "/assets/doctors/doc-1.jpg";

export const mapDBDoctorToUI = (d: DBDoctor): UIDoctor => {
  const rating = Number(d.rating) || 4.5;
  const reviews = Math.floor(rating * 20);
  
  const locationParts = [d.location, d.district, d.division].filter(Boolean);
  const locationStr = locationParts.join(", ") || "Bangladesh";

  return {
    name: d.name,
    specialty: d.specialty || "General Practitioner",
    category: getCategoryFromSpecialty(d.specialty || ""),
    location: locationStr,
    rating,
    reviews,
    blurb: d.bio || `Experienced specialist practicing at ${d.hospital_name || "our partner hospital"}.`,
    date: "Available",
    time: d.availability || "Mon-Fri",
    mode: "In-Person",
    img: d.photo_url || doctorFallback,
    slug: d.slug,
    experience: d.experience_years || 1,
    fee: Number(d.consultation_fee) || 500,
    available: d.availability || "Mon-Fri",
    photo: d.photo_url || doctorFallback,
    education: d.education || "MBBS",
    languages: d.languages ? d.languages.split(",").map(s => s.trim()).filter(Boolean) : ["English", "Bengali"],
    patients: d.patients_treated || 100,
    hospital: {
      name: d.hospital_name || "Partner Hospital",
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
