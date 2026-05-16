import doc1 from "@/assets/doctor-1.jpg";
import doc2 from "@/assets/doctor-avatar.jpg";
import doc3 from "@/assets/patient-sarah.jpg";
import doc4 from "@/assets/patient-eleanor.jpg";

export const specialtyTabs = [
  "All",
  "Cardiology",
  "Neurology",
  "Dermatology",
  "Pediatrics",
  "Orthopedics",
  "Oncology",
  "Psychiatry",
  "Gynecology",
  "Ophthalmology",
  "ENT",
  "Dentistry",
  "Endocrinology",
  "Gastroenterology",
] as const;

export type SpecialtyTab = (typeof specialtyTabs)[number];

export type Doctor = {
  name: string;
  specialty: string;
  category: Exclude<SpecialtyTab, "All">;
  rating: number;
  reviews: number;
  blurb: string;
  date: string;
  time: string;
  mode: "Telehealth" | "In-Person";
  img: string;
};

export const doctors: Doctor[] = [
  { name: "Dr. Aris Thorne", specialty: "Interventional Cardiologist", category: "Cardiology", rating: 4.9, reviews: 240, blurb: "Pioneer in minimally-invasive cardiac procedures with sub-millimeter precision.", date: "May 14th", time: "08:00 AM", mode: "In-Person", img: doc1 },
  { name: "Dr. Priya Patel", specialty: "Heart Failure Specialist", category: "Cardiology", rating: 4.8, reviews: 178, blurb: "Long-term cardiac rehabilitation and lifestyle-first treatment plans.", date: "May 16th", time: "10:00 AM", mode: "Telehealth", img: doc4 },

  { name: "Dr. Elena Vance", specialty: "Neurobiology Expert", category: "Neurology", rating: 4.8, reviews: 132, blurb: "Leading research in cognitive longevity and neuro-restoration with a holistic approach.", date: "May 12th", time: "10:30 AM", mode: "Telehealth", img: doc3 },
  { name: "Dr. Lukas Berg", specialty: "Stroke Neurologist", category: "Neurology", rating: 4.7, reviews: 88, blurb: "Acute stroke response and post-event neuroplastic recovery programs.", date: "May 13th", time: "15:00 PM", mode: "In-Person", img: doc2 },

  { name: "Dr. Sophia Patel", specialty: "Cosmetic Dermatology", category: "Dermatology", rating: 4.9, reviews: 318, blurb: "Restorative skincare blending laser therapy with botanical-based regimens.", date: "May 13th", time: "13:00 PM", mode: "In-Person", img: doc4 },
  { name: "Dr. Idris Okafor", specialty: "Pediatric Dermatology", category: "Dermatology", rating: 4.8, reviews: 154, blurb: "Gentle, evidence-based treatments for pediatric skin conditions and allergies.", date: "May 12th", time: "11:00 AM", mode: "Telehealth", img: doc2 },

  { name: "Dr. Mei Tanaka", specialty: "Pediatrician", category: "Pediatrics", rating: 5.0, reviews: 412, blurb: "Whole-family pediatric care from newborn screening to adolescent wellness.", date: "May 11th", time: "09:00 AM", mode: "In-Person", img: doc3 },
  { name: "Dr. Julian Marsh", specialty: "Neonatologist", category: "Pediatrics", rating: 4.9, reviews: 196, blurb: "NICU lead with expertise in early-life respiratory and cardiac care.", date: "May 11th", time: "16:00 PM", mode: "Telehealth", img: doc2 },

  { name: "Dr. Maya Brennan", specialty: "Orthopedic Surgeon", category: "Orthopedics", rating: 4.7, reviews: 96, blurb: "Joint reconstruction specialist with a focus on athlete recovery pathways.", date: "May 15th", time: "09:30 AM", mode: "In-Person", img: doc4 },
  { name: "Dr. Rafael Costa", specialty: "Sports Medicine", category: "Orthopedics", rating: 4.8, reviews: 142, blurb: "Non-surgical management of musculoskeletal injuries and return-to-play plans.", date: "May 17th", time: "11:30 AM", mode: "In-Person", img: doc1 },

  { name: "Dr. Nadia Rahman", specialty: "Medical Oncologist", category: "Oncology", rating: 4.9, reviews: 221, blurb: "Precision chemotherapy and targeted-therapy planning for solid tumors.", date: "May 18th", time: "10:00 AM", mode: "In-Person", img: doc3 },
  { name: "Dr. Henry Liang", specialty: "Radiation Oncologist", category: "Oncology", rating: 4.8, reviews: 167, blurb: "Image-guided radiotherapy with adaptive treatment planning.", date: "May 19th", time: "14:00 PM", mode: "In-Person", img: doc2 },

  { name: "Dr. Clara Fields", specialty: "Clinical Psychiatrist", category: "Psychiatry", rating: 4.9, reviews: 305, blurb: "Mood and anxiety disorders with evidence-based talk and pharmacotherapy.", date: "May 12th", time: "17:00 PM", mode: "Telehealth", img: doc4 },
  { name: "Dr. Omar Haddad", specialty: "Child & Adolescent Psychiatrist", category: "Psychiatry", rating: 4.8, reviews: 119, blurb: "Family-centered care for ADHD, anxiety and adolescent mental health.", date: "May 14th", time: "12:00 PM", mode: "Telehealth", img: doc1 },

  { name: "Dr. Aisha Bello", specialty: "Obstetrician–Gynecologist", category: "Gynecology", rating: 4.9, reviews: 264, blurb: "Comprehensive women's health, prenatal care and minimally-invasive surgery.", date: "May 15th", time: "08:30 AM", mode: "In-Person", img: doc3 },
  { name: "Dr. Hannah Reyes", specialty: "Reproductive Endocrinologist", category: "Gynecology", rating: 4.8, reviews: 138, blurb: "Fertility evaluation and IVF planning with personalized hormonal protocols.", date: "May 16th", time: "13:30 PM", mode: "Telehealth", img: doc4 },

  { name: "Dr. Victor Sato", specialty: "Cataract & Refractive Surgeon", category: "Ophthalmology", rating: 4.9, reviews: 211, blurb: "Vision correction with premium IOLs and same-day cataract procedures.", date: "May 13th", time: "09:00 AM", mode: "In-Person", img: doc1 },
  { name: "Dr. Ingrid Solberg", specialty: "Retina Specialist", category: "Ophthalmology", rating: 4.8, reviews: 97, blurb: "Diabetic retinopathy and macular degeneration management.", date: "May 17th", time: "10:30 AM", mode: "In-Person", img: doc2 },

  { name: "Dr. Marco Silva", specialty: "ENT Surgeon", category: "ENT", rating: 4.7, reviews: 102, blurb: "Sinus, voice and sleep-disordered breathing care for adults and children.", date: "May 14th", time: "14:30 PM", mode: "In-Person", img: doc1 },
  { name: "Dr. Yuki Mori", specialty: "Audiologist", category: "ENT", rating: 4.9, reviews: 80, blurb: "Hearing diagnostics and modern hearing-aid fitting for all ages.", date: "May 15th", time: "11:00 AM", mode: "In-Person", img: doc3 },

  { name: "Dr. Amelia Ross", specialty: "Cosmetic Dentist", category: "Dentistry", rating: 4.9, reviews: 198, blurb: "Smile design, veneers and whitening with conservative tooth preservation.", date: "May 12th", time: "10:00 AM", mode: "In-Person", img: doc4 },
  { name: "Dr. Samir Khanna", specialty: "Orthodontist", category: "Dentistry", rating: 4.8, reviews: 121, blurb: "Modern aligner therapy and complex bite correction for teens and adults.", date: "May 18th", time: "16:00 PM", mode: "In-Person", img: doc2 },

  { name: "Dr. Sarah Kim", specialty: "Endocrinologist", category: "Endocrinology", rating: 4.8, reviews: 156, blurb: "Diabetes, thyroid and hormone disorders with continuous-monitoring tech.", date: "May 13th", time: "15:30 PM", mode: "Telehealth", img: doc4 },
  { name: "Dr. Daniel Park", specialty: "Diabetes Specialist", category: "Endocrinology", rating: 4.7, reviews: 89, blurb: "Type 1 and 2 diabetes management with personalized nutrition planning.", date: "May 16th", time: "09:30 AM", mode: "Telehealth", img: doc1 },

  { name: "Dr. Olivia Hart", specialty: "Gastroenterologist", category: "Gastroenterology", rating: 4.9, reviews: 174, blurb: "Endoscopic diagnostics and IBD care with a focus on gut microbiome health.", date: "May 14th", time: "11:00 AM", mode: "In-Person", img: doc3 },
  { name: "Dr. Karim Aziz", specialty: "Hepatologist", category: "Gastroenterology", rating: 4.8, reviews: 112, blurb: "Liver disease management including fatty liver and post-transplant care.", date: "May 19th", time: "13:00 PM", mode: "Telehealth", img: doc2 },
];
