import atrium from "@/assets/hub-atrium.jpg";
import coastal from "@/assets/hub-coastal.jpg";
import doc1 from "@/assets/doctors/doc-1.jpg";
import doc2 from "@/assets/doctors/doc-2.jpg";
import doc3 from "@/assets/doctors/doc-3.jpg";
import doc4 from "@/assets/doctors/doc-4.jpg";
import doc5 from "@/assets/doctors/doc-5.jpg";
import doc6 from "@/assets/doctors/doc-6.jpg";
import exec1 from "@/assets/management/exec-1.jpg";
import exec2 from "@/assets/management/exec-2.jpg";
import exec3 from "@/assets/management/exec-3.jpg";
import exec4 from "@/assets/management/exec-4.jpg";
import exec5 from "@/assets/management/exec-5.jpg";
import exec6 from "@/assets/management/exec-6.jpg";
import type { StaticImageData } from "next/image";

export type Doctor = {
  name: string;
  specialty: string;
  experience: number;
  rating: number;
  fee: number;
  available: string;
  photo: string | StaticImageData;
  education: string;
  languages: string[];
  patients: number;
};

export type ManagementMember = {
  name: string;
  role: string;
  bio: string;
  photo: string | StaticImageData;
  email: string;
  linkedin: string;
  tenure: string;
};

export type Room = {
  type: string;
  category: "Ward" | "Cabin" | "ICU" | "Bed";
  capacity: string;
  price: number;
  amenities: string;
  size: string;
  view: string;
  included: string[];
  available: number;
  total: number;
};

export type Hospital = {
  slug: string;
  name: string;
  tag: string;
  location: string;
  address: string;
  rating: number;
  reviews: number;
  beds: number;
  doctors: number;
  founded: number;
  specialties: string[];
  cert: string;
  phone: string;
  email: string;
  website: string;
  phones?: string[];
  emails?: string[];
  websites?: string[];
  social?: { platform: string; url: string }[];
  image: string | StaticImageData;
  summary: string;
  about: string;
  facilities: string[];
  awards: string[];
  hours: { day: string; time: string }[];
  doctors_list: Doctor[];
  lab_tests: { name: string; category: string; price: number; turnaround: string }[];
  rooms: Room[];
  management: ManagementMember[];
};

const docPhotos = [doc1, doc2, doc3, doc4, doc5, doc6];

export const baseDoctors: Doctor[] = [
  { name: "Dr. Elena Park", specialty: "Cardiology", experience: 14, rating: 4.9, fee: 220, available: "Mon-Fri", photo: doc1, education: "MD, Stanford • FACC", languages: ["English", "Korean"], patients: 3200 },
  { name: "Dr. Marcus Vale", specialty: "Neurology", experience: 18, rating: 4.8, fee: 260, available: "Tue-Sat", photo: doc2, education: "MD, Johns Hopkins • PhD Neuro", languages: ["English", "Mandarin"], patients: 4100 },
  { name: "Dr. Aisha Rahman", specialty: "Pediatrics", experience: 11, rating: 4.9, fee: 160, available: "Mon-Sat", photo: doc3, education: "MD, Yale • FAAP", languages: ["English", "Arabic", "Urdu"], patients: 5600 },
  { name: "Dr. Liam Chen", specialty: "Orthopedics", experience: 16, rating: 4.7, fee: 200, available: "Mon-Thu", photo: doc4, education: "MD, UCSF • Sports Med Fellow", languages: ["English"], patients: 2800 },
  { name: "Dr. Noor Hassan", specialty: "Oncology", experience: 20, rating: 4.9, fee: 320, available: "Wed-Sun", photo: doc5, education: "MD, MSKCC • PhD Oncology", languages: ["English", "Spanish"], patients: 1900 },
  { name: "Dr. Sofia Mendes", specialty: "Dermatology", experience: 9, rating: 4.6, fee: 140, available: "Mon-Fri", photo: doc6, education: "MD, NYU • AAD Member", languages: ["English", "Portuguese"], patients: 4400 },
  { name: "Dr. Hiro Tanaka", specialty: "Surgery", experience: 22, rating: 4.9, fee: 380, available: "Mon-Sat", photo: doc2, education: "MD, Kyoto • FACS", languages: ["English", "Japanese"], patients: 2100 },
  { name: "Dr. Priya Iyer", specialty: "Pulmonology", experience: 13, rating: 4.7, fee: 190, available: "Tue-Fri", photo: doc3, education: "MD, AIIMS • FCCP", languages: ["English", "Hindi", "Tamil"], patients: 3500 },
  { name: "Dr. Owen Brooks", specialty: "Rehabilitation", experience: 10, rating: 4.6, fee: 150, available: "Mon-Fri", photo: doc4, education: "MD, Mayo Clinic • DPT", languages: ["English"], patients: 2600 },
  { name: "Dr. Mira Solis", specialty: "Mental Health", experience: 12, rating: 4.8, fee: 180, available: "Wed-Sun", photo: doc5, education: "MD, Columbia • APA Fellow", languages: ["English", "Spanish"], patients: 3100 },
];

export const baseLabTests = [
  { name: "Complete Blood Count (CBC)", category: "Hematology", price: 35, turnaround: "4 hours" },
  { name: "Lipid Profile", category: "Biochemistry", price: 60, turnaround: "6 hours" },
  { name: "Liver Function Test", category: "Biochemistry", price: 75, turnaround: "8 hours" },
  { name: "Thyroid Panel (T3, T4, TSH)", category: "Endocrinology", price: 90, turnaround: "12 hours" },
  { name: "HbA1c — Diabetes", category: "Biochemistry", price: 55, turnaround: "6 hours" },
  { name: "Vitamin D, B12 Panel", category: "Nutrition", price: 110, turnaround: "24 hours" },
  { name: "MRI Brain", category: "Imaging", price: 850, turnaround: "Same day" },
  { name: "CT Scan — Chest", category: "Imaging", price: 620, turnaround: "Same day" },
  { name: "Echocardiogram", category: "Cardiology", price: 320, turnaround: "1 hour" },
  { name: "Allergy Panel — 40 markers", category: "Immunology", price: 240, turnaround: "48 hours" },
];

export const baseRooms: Room[] = [
  { type: "General Ward", category: "Ward", capacity: "6 beds", price: 80, amenities: "Shared bath, nurse call, daylight", size: "320 sq ft", view: "Courtyard", included: ["3 meals", "Nursing care", "Wi-Fi", "Daily linen"], available: 4, total: 18 },
  { type: "Semi-Private Ward", category: "Ward", capacity: "2 beds", price: 160, amenities: "TV, recliner, attendant chair", size: "240 sq ft", view: "Garden", included: ["3 meals", "Smart TV", "Attendant bed", "Wi-Fi"], available: 6, total: 12 },
  { type: "Standard Cabin", category: "Cabin", capacity: "1 bed", price: 280, amenities: "Private bath, smart TV, sofa", size: "280 sq ft", view: "City", included: ["Private bath", "Smart TV", "Sofa", "Mini-bar"], available: 5, total: 10 },
  { type: "Deluxe Cabin", category: "Cabin", capacity: "1 bed + companion", price: 420, amenities: "Garden view, mini-fridge, workspace", size: "380 sq ft", view: "Healing forest", included: ["Companion bed", "Workspace", "Mini-fridge", "Daily housekeeping"], available: 3, total: 8 },
  { type: "Executive Suite", category: "Cabin", capacity: "1 bed + lounge", price: 680, amenities: "Living area, kitchenette, concierge", size: "560 sq ft", view: "Skyline", included: ["Lounge", "Kitchenette", "Concierge", "Premium meals"], available: 2, total: 4 },
  { type: "ICU Bed", category: "ICU", capacity: "1 bed", price: 950, amenities: "24/7 monitor, ventilator-ready", size: "180 sq ft", view: "Internal", included: ["1:1 nursing", "Ventilator", "Cardiac monitor", "Isolation-ready"], available: 3, total: 14 },
  { type: "NICU Cot", category: "ICU", capacity: "1 cot", price: 880, amenities: "Incubator, neonatal nurse", size: "120 sq ft", view: "Internal", included: ["Incubator", "Neonatal nurse", "Phototherapy", "Parent recliner"], available: 2, total: 8 },
  { type: "Day-Care Bed", category: "Bed", capacity: "1 bed", price: 70, amenities: "Recliner, snack service", size: "100 sq ft", view: "Atrium", included: ["Recliner", "Light meal", "Wi-Fi", "Nurse on call"], available: 8, total: 20 },
];

export const baseManagement: ManagementMember[] = [
  { name: "Dr. Helena Frost", role: "Chief Executive Officer", bio: "20+ years leading green hospital networks across North America. Architect of patient-first care models.", photo: exec1, email: "h.frost@hospital.health", linkedin: "linkedin.com/in/helenafrost", tenure: "Since 2018" },
  { name: "Dr. Ravi Anand", role: "Chief Medical Officer", bio: "Board-certified surgeon overseeing clinical excellence, outcomes, and physician development.", photo: exec2, email: "r.anand@hospital.health", linkedin: "linkedin.com/in/ravianand", tenure: "Since 2019" },
  { name: "Mei Lin", role: "Chief Operating Officer", bio: "Operations strategist focused on patient flow, biophilic design, and lean clinical workflows.", photo: exec3, email: "m.lin@hospital.health", linkedin: "linkedin.com/in/meilin", tenure: "Since 2020" },
  { name: "James O'Connor", role: "Chief Nursing Officer", bio: "Leads a 600-strong nursing team with a compassion-first culture and Magnet recognition.", photo: exec4, email: "j.oconnor@hospital.health", linkedin: "linkedin.com/in/joconnor", tenure: "Since 2017" },
  { name: "Dr. Sara Vélez", role: "Director of Research", bio: "Heads translational research, clinical trials, and academic partnerships across 4 universities.", photo: exec5, email: "s.velez@hospital.health", linkedin: "linkedin.com/in/saravelez", tenure: "Since 2021" },
  { name: "Tomás Reyes", role: "Director of Sustainability", bio: "Architect of the LEED-certified energy, water, and zero-waste programs across all campuses.", photo: exec6, email: "t.reyes@hospital.health", linkedin: "linkedin.com/in/tomasreyes", tenure: "Since 2022" },
];

export const hospitals: Hospital[] = [
  {
    slug: "evergreen-atrium",
    name: "The Evergreen Atrium",
    tag: "Flagship",
    location: "Portland, OR",
    address: "1200 Cascade Way, Portland, OR 97201",
    rating: 4.9,
    reviews: 412,
    beds: 240,
    doctors: 180,
    founded: 2014,
    specialties: ["Neurology", "Oncology", "Cardiology", "Surgery"],
    cert: "LEED Platinum",
    phone: "+1 (503) 555-0142",
    email: "care@evergreenatrium.health",
    website: "evergreenatrium.health",
    image: atrium,
    summary: "A 10,000 sq ft biophilic healing forest paired with restorative diagnostics and a Tier-1 trauma unit.",
    about:
      "Our flagship facility blends a living indoor forest, daylight-tracking suites, and the most advanced restorative diagnostics on the West Coast. Designed by award-winning biophilic architects, every wing is engineered to accelerate healing through air, light, and nature.",
    facilities: ["10,000 sq ft Healing Forest", "Tier-1 Trauma Center", "Robotic Surgery Suites", "On-site Pharmacy", "Family Recovery Lounges", "EV Charging"],
    awards: ["Best Hospital 2024 — US Health Report", "Top 10 Green Hospitals — Architectural Digest", "Patient Choice Award 2023"],
    hours: [
      { day: "Mon – Fri", time: "24 Hours" },
      { day: "Sat – Sun", time: "24 Hours" },
      { day: "Emergency", time: "Always Open" },
    ],
    doctors_list: baseDoctors,
    lab_tests: baseLabTests,
    rooms: baseRooms,
    management: baseManagement,
  },
  {
    slug: "coastal-renewal",
    name: "Coastal Renewal Clinic",
    tag: "Coastal",
    location: "Santa Cruz, CA",
    address: "88 Pacific Bluff Rd, Santa Cruz, CA 95060",
    rating: 4.7,
    reviews: 218,
    beds: 120,
    doctors: 92,
    founded: 2018,
    specialties: ["Rehabilitation", "Stress Recovery", "Holistic"],
    cert: "LEED Gold",
    phone: "+1 (831) 555-0188",
    email: "hello@coastalrenewal.health",
    website: "coastalrenewal.health",
    image: coastal,
    summary: "Marine-inspired therapy spaces overlooking the Pacific, focused on holistic rehabilitation and burnout recovery.",
    about:
      "Set on the Santa Cruz bluffs, our clinic uses ocean acoustics, salt-air therapy and panoramic ocean-view recovery suites to deliver a holistic approach to rehabilitation and mental wellness.",
    facilities: ["Ocean-view Recovery Suites", "Hydrotherapy Pools", "Mindfulness Pavilion", "Nutrition Lab", "Yoga Decks"],
    awards: ["Top Wellness Retreat 2024", "Eco Hospital of the Year — Pacific"],
    hours: [
      { day: "Mon – Fri", time: "7:00 AM – 9:00 PM" },
      { day: "Sat – Sun", time: "8:00 AM – 6:00 PM" },
      { day: "Emergency", time: "24 Hours" },
    ],
    doctors_list: baseDoctors,
    lab_tests: baseLabTests,
    rooms: baseRooms,
    management: baseManagement,
  },
  {
    slug: "aurora-highlands",
    name: "Aurora Highlands Hospital",
    tag: "Mountain",
    location: "Boulder, CO",
    address: "450 Flatiron Pkwy, Boulder, CO 80301",
    rating: 4.8,
    reviews: 305,
    beds: 180,
    doctors: 140,
    founded: 2016,
    specialties: ["Pulmonology", "Sports Medicine", "Orthopedics"],
    cert: "LEED Platinum",
    phone: "+1 (303) 555-0167",
    email: "info@aurorahighlands.health",
    website: "aurorahighlands.health",
    image: atrium,
    summary: "Altitude-optimized respiratory and sports recovery hub built into the Rocky Mountain foothills.",
    about:
      "Built into the Rocky Mountain foothills, Aurora Highlands specializes in altitude-optimized respiratory therapy and elite sports medicine for athletes and outdoor enthusiasts.",
    facilities: ["Altitude Chambers", "Sports Performance Lab", "MRI Suites", "Outdoor Recovery Trails"],
    awards: ["Top Sports Medicine Center — Rocky Mountain", "Green Building Excellence 2023"],
    hours: [
      { day: "Mon – Fri", time: "6:00 AM – 10:00 PM" },
      { day: "Sat – Sun", time: "7:00 AM – 8:00 PM" },
      { day: "Emergency", time: "24 Hours" },
    ],
    doctors_list: baseDoctors,
    lab_tests: baseLabTests,
    rooms: baseRooms,
    management: baseManagement,
  },
  {
    slug: "verdant-bay",
    name: "Verdant Bay Medical",
    tag: "Urban",
    location: "Seattle, WA",
    address: "2100 Elliott Ave, Seattle, WA 98121",
    rating: 4.6,
    reviews: 521,
    beds: 320,
    doctors: 220,
    founded: 2012,
    specialties: ["Cardiology", "Pediatrics", "Maternity"],
    cert: "LEED Gold",
    phone: "+1 (206) 555-0123",
    email: "hello@verdantbay.health",
    website: "verdantbay.health",
    image: coastal,
    summary: "A vertical garden hospital integrating family-centered maternity wards and advanced cardiac care.",
    about:
      "A vertical garden hospital in the heart of Seattle, integrating family-centered maternity wards and advanced cardiac care across 14 sky-gardens.",
    facilities: ["Sky Gardens", "NICU", "Cardiac Catheterization Labs", "Family Suites", "Rooftop Helipad"],
    awards: ["Best Maternity Care — Pacific Northwest", "Top Pediatric Hospital 2024"],
    hours: [
      { day: "Mon – Fri", time: "24 Hours" },
      { day: "Sat – Sun", time: "24 Hours" },
      { day: "Emergency", time: "Always Open" },
    ],
    doctors_list: baseDoctors,
    lab_tests: baseLabTests,
    rooms: baseRooms,
    management: baseManagement,
  },
  {
    slug: "sunhaven-wellness",
    name: "Sunhaven Wellness Institute",
    tag: "Desert",
    location: "Sedona, AZ",
    address: "55 Red Rock Loop, Sedona, AZ 86336",
    rating: 4.9,
    reviews: 187,
    beds: 90,
    doctors: 64,
    founded: 2019,
    specialties: ["Holistic", "Dermatology", "Mental Health"],
    cert: "LEED Platinum",
    phone: "+1 (928) 555-0199",
    email: "care@sunhaven.health",
    website: "sunhaven.health",
    image: atrium,
    summary: "Solar-powered desert sanctuary specializing in dermatology, mindfulness, and integrative wellness.",
    about:
      "A 100% solar-powered desert sanctuary built among Sedona's red rocks, specializing in dermatology, mindfulness, and integrative mental wellness.",
    facilities: ["Solar Microgrid", "Meditation Caves", "Dermatology Lab", "Sound Healing Studio"],
    awards: ["Top Wellness Destination 2024", "Solar Hospital of the Year"],
    hours: [
      { day: "Mon – Fri", time: "8:00 AM – 8:00 PM" },
      { day: "Sat – Sun", time: "9:00 AM – 5:00 PM" },
      { day: "Emergency", time: "24 Hours" },
    ],
    doctors_list: baseDoctors,
    lab_tests: baseLabTests,
    rooms: baseRooms,
    management: baseManagement,
  },
  {
    slug: "northern-lights",
    name: "Northern Lights Care Center",
    tag: "Arctic",
    location: "Anchorage, AK",
    address: "300 Glacier Ave, Anchorage, AK 99501",
    rating: 4.5,
    reviews: 142,
    beds: 110,
    doctors: 78,
    founded: 2017,
    specialties: ["Emergency", "General Surgery", "Trauma"],
    cert: "LEED Silver",
    phone: "+1 (907) 555-0156",
    email: "hello@northernlights.health",
    website: "northernlights.health",
    image: coastal,
    summary: "Geothermal-powered remote facility with emergency airlift services and 24/7 trauma response.",
    about:
      "A geothermal-powered remote facility serving Alaska's vast interior with emergency airlift services and one of the fastest 24/7 trauma response teams in North America.",
    facilities: ["Geothermal Plant", "Airlift Helipad", "Trauma Bays", "Cold-weather Recovery Suites"],
    awards: ["Fastest Emergency Response — Alaska 2023", "Geothermal Innovation Prize"],
    hours: [
      { day: "Mon – Fri", time: "24 Hours" },
      { day: "Sat – Sun", time: "24 Hours" },
      { day: "Emergency", time: "Always Open" },
    ],
    doctors_list: baseDoctors,
    lab_tests: baseLabTests,
    rooms: baseRooms,
    management: baseManagement,
  },
];

export const getHospital = (slug: string) => hospitals.find((h) => h.slug === slug);
