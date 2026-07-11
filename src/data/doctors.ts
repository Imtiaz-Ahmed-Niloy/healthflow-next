const male1 = "/assets/doctors/male-1.jpg";
const male2 = "/assets/doctors/male-2.jpg";
const male3 = "/assets/doctors/male-3.jpg";
const female1 = "/assets/doctors/female-1.jpg";
const female2 = "/assets/doctors/female-2.jpg";
const female3 = "/assets/doctors/female-3.jpg";

export const specialtyTabs = [
  "All",
  "Cardiology",
  "Dentistry",
  "ENT",
  "Endocrinology",
  "Gastroenterology",
  "General Medicine",
  "Gynecology",
  "Nephrology",
  "Neurology",
  "Oncology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Surgery",
  "Urology",
] as const;

export type SpecialtyTab = (typeof specialtyTabs)[number];

export type Doctor = {
  name: string;
  specialty: string;
  category: Exclude<SpecialtyTab, "All">;
  location: string;
  rating: number;
  reviews: number;
  blurb: string;
  date: string;
  time: string;
  mode: "Telehealth" | "In-Person";
  gender: "male" | "female";
  img: string;
};

const maleImages = { male1, male2, male3 } as const;
const femaleImages = { female1, female2, female3 } as const;

export const doctors: Doctor[] = ([
  { name: "Dr. Mohammad Shoyeb", specialty: "Dental Surgeon", category: "Dentistry", location: "Cumilla, Bangladesh", rating: 4.5, reviews: 60, blurb: "Experienced dental surgeon practicing in Cumilla, Bangladesh, with a patient-first approach.", date: "May 14th", time: "09:00 AM", mode: "Telehealth", gender: "male", img: "male1" },
  { name: "Dr. Md. Ashiqur Rahman", specialty: "Endocrinologist", category: "Endocrinology", location: "Dhaka, Bangladesh", rating: 4.6, reviews: 97, blurb: "Experienced endocrinologist practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 16th", time: "10:30 AM", mode: "In-Person", gender: "male", img: "male2" },
  { name: "Dr. Md. Hasanuzzaman", specialty: "Homeopathic Specialist", category: "General Medicine", location: "Dhaka, Bangladesh", rating: 4.7, reviews: 134, blurb: "Experienced homeopathic specialist practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 12th", time: "11:00 AM", mode: "In-Person", gender: "male", img: "male3" },
  { name: "Asso. Prof. Dr. Abdur Rabban Talukder", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.8, reviews: 171, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 18th", time: "14:00 PM", mode: "Telehealth", gender: "male", img: "male1" },
  { name: "Prof. Dr. Jannatul Islam Jinnah", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.9, reviews: 208, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 20th", time: "15:30 PM", mode: "In-Person", gender: "female", img: "female1" },
  { name: "Prof. Dr. Abm Ali Akbar Biswas", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.5, reviews: 245, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 22nd", time: "16:00 PM", mode: "In-Person", gender: "male", img: "male2" },
  { name: "Dr. Md. Khademul Bashar", specialty: "Cancer Surgeon", category: "Oncology", location: "Dhaka, Bangladesh", rating: 4.6, reviews: 282, blurb: "Experienced cancer surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 24th", time: "09:00 AM", mode: "Telehealth", gender: "male", img: "male3" },
  { name: "Dr. Golam Mahmud Rayhan", specialty: "Hepatobiliary Surgeon", category: "Gastroenterology", location: "Dhaka, Bangladesh", rating: 4.7, reviews: 319, blurb: "Experienced hepatobiliary surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 14th", time: "10:30 AM", mode: "In-Person", gender: "male", img: "male1" },
  { name: "Dr. Ishrat Jahan", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.8, reviews: 76, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 16th", time: "11:00 AM", mode: "In-Person", gender: "female", img: "female2" },
  { name: "Dr. Shakil Muhmmod", specialty: "Pediatrician", category: "Pediatrics", location: "Bangladesh, Bangladesh", rating: 4.9, reviews: 113, blurb: "Experienced pediatrician practicing in Bangladesh, Bangladesh, with a patient-first approach.", date: "May 12th", time: "14:00 PM", mode: "Telehealth", gender: "male", img: "male2" },
  { name: "Prof. Dr. Sami Ahmad", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.5, reviews: 150, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 18th", time: "15:30 PM", mode: "In-Person", gender: "male", img: "male3" },
  { name: "Prof. Dr. A. K. M. Shamsuddin", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.6, reviews: 187, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 20th", time: "16:00 PM", mode: "In-Person", gender: "male", img: "male1" },
  { name: "Dr. Kazi Saiful Islam Shakil", specialty: "Cardiac Surgeon", category: "Cardiology", location: "Dhaka, Bangladesh", rating: 4.7, reviews: 224, blurb: "Experienced cardiac surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 22nd", time: "09:00 AM", mode: "Telehealth", gender: "male", img: "male2" },
  { name: "Dr. Nazmul Hakim Shahin", specialty: "Hepatobiliary Surgeon", category: "Gastroenterology", location: "Dhaka, Bangladesh", rating: 4.8, reviews: 261, blurb: "Experienced hepatobiliary surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 24th", time: "10:30 AM", mode: "In-Person", gender: "male", img: "male3" },
  { name: "Prof. Dr. Md. Margub Hossain", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.9, reviews: 298, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 14th", time: "11:00 AM", mode: "In-Person", gender: "male", img: "male1" },
  { name: "Asso. Prof. Dr. Abdur Rabban Talukder", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.5, reviews: 335, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 16th", time: "14:00 PM", mode: "Telehealth", gender: "male", img: "male2" },
  { name: "Lt. Gen. Dr. Zafarullah Siddiq", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.6, reviews: 92, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 12th", time: "15:30 PM", mode: "In-Person", gender: "male", img: "male3" },
  { name: "Dr. Md. Nahid Sikder", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.7, reviews: 129, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 18th", time: "16:00 PM", mode: "In-Person", gender: "male", img: "male1" },
  { name: "Dr. Shafqat Wahid Shishir", specialty: "Psychiatrist", category: "Psychiatry", location: "Pabna, Bangladesh", rating: 4.8, reviews: 166, blurb: "Experienced psychiatrist practicing in Pabna, Bangladesh, with a patient-first approach.", date: "May 20th", time: "09:00 AM", mode: "Telehealth", gender: "male", img: "male2" },
  { name: "Dr. M. Mamun Miah", specialty: "Cancer Surgeon", category: "Oncology", location: "Dhaka, Bangladesh", rating: 4.9, reviews: 203, blurb: "Experienced cancer surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 22nd", time: "10:30 AM", mode: "In-Person", gender: "male", img: "male3" },
  { name: "Prof. Dr. Md. Jamal Abu Nasser", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.5, reviews: 240, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 24th", time: "11:00 AM", mode: "In-Person", gender: "male", img: "male1" },
  { name: "Prof. Dr. Akram Hossain", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.6, reviews: 277, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 14th", time: "14:00 PM", mode: "Telehealth", gender: "male", img: "male2" },
  { name: "Dr. Md. Mahfuzul Momen", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.7, reviews: 314, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 16th", time: "15:30 PM", mode: "In-Person", gender: "male", img: "male3" },
  { name: "Dr. Leea Amin", specialty: "Breast Surgeon", category: "Oncology", location: "Dhaka, Bangladesh", rating: 4.8, reviews: 71, blurb: "Experienced breast surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 12th", time: "16:00 PM", mode: "In-Person", gender: "female", img: "female3" },
  { name: "Dr. Sadia Sajmin Siddiqua", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.9, reviews: 108, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 18th", time: "09:00 AM", mode: "Telehealth", gender: "female", img: "female1" },
  { name: "Dr. Muhammad Nuruzzaman", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.5, reviews: 145, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 20th", time: "10:30 AM", mode: "In-Person", gender: "male", img: "male1" },
  { name: "Dr. Md. Ahad Ibne Ilias", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.6, reviews: 182, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 22nd", time: "11:00 AM", mode: "In-Person", gender: "male", img: "male2" },
  { name: "Dr. Muhammad Nuruzzaman", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.7, reviews: 219, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 24th", time: "14:00 PM", mode: "Telehealth", gender: "male", img: "male3" },
  { name: "Prof. Dr. M. I. M. Nasim Sobhani Khondker", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.8, reviews: 256, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 14th", time: "15:30 PM", mode: "In-Person", gender: "male", img: "male1" },
  { name: "Dr. Rahad Bin Kashem", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.9, reviews: 293, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 16th", time: "16:00 PM", mode: "In-Person", gender: "male", img: "male2" },
  { name: "Lt. Col. Dr. Md. Maksud Rahman", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.5, reviews: 330, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 12th", time: "09:00 AM", mode: "Telehealth", gender: "male", img: "male3" },
  { name: "Prof. Dr. Deb Prasad Pal", specialty: "Urologist", category: "Urology", location: "Dhaka, Bangladesh", rating: 4.6, reviews: 87, blurb: "Experienced urologist practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 18th", time: "10:30 AM", mode: "In-Person", gender: "male", img: "male1" },
  { name: "Dr. Bidyut Chandra Debnath", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.7, reviews: 124, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 20th", time: "11:00 AM", mode: "In-Person", gender: "male", img: "male2" },
  { name: "Dr. Md. Hafizur Rahman", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.8, reviews: 161, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 22nd", time: "14:00 PM", mode: "Telehealth", gender: "male", img: "male3" },
  { name: "Prof. Dr. Anwarul Azim", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.9, reviews: 198, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 24th", time: "15:30 PM", mode: "In-Person", gender: "male", img: "male1" },
  { name: "Prof. Dr. Mohammad Ali", specialty: "Hepatobiliary Surgeon", category: "Gastroenterology", location: "Dhaka, Bangladesh", rating: 4.5, reviews: 235, blurb: "Experienced hepatobiliary surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 14th", time: "16:00 PM", mode: "In-Person", gender: "male", img: "male2" },
  { name: "Prof. Dr. Feroze Quader", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.6, reviews: 272, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 16th", time: "09:00 AM", mode: "Telehealth", gender: "male", img: "male3" },
  { name: "Prof. Dr. A. K. Mostaque", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.7, reviews: 309, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 12th", time: "10:30 AM", mode: "In-Person", gender: "male", img: "male1" },
  { name: "Prof. Dr. Md. Nizamul Haque", specialty: "Oncologist", category: "Oncology", location: "Dhaka, Bangladesh", rating: 4.8, reviews: 66, blurb: "Experienced oncologist practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 18th", time: "11:00 AM", mode: "In-Person", gender: "male", img: "male2" },
  { name: "Dr. Md. Iftekharul Alam", specialty: "Orthopedic Specialist", category: "Orthopedics", location: "Dhaka, Bangladesh", rating: 4.9, reviews: 103, blurb: "Experienced orthopedic specialist practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 20th", time: "14:00 PM", mode: "Telehealth", gender: "male", img: "male3" },
  { name: "Dr. Md. Mahmudul Haque Morshed", specialty: "Neurosurgeon", category: "Neurology", location: "Dhaka, Bangladesh", rating: 4.5, reviews: 140, blurb: "Experienced neurosurgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 22nd", time: "15:30 PM", mode: "In-Person", gender: "male", img: "male1" },
  { name: "Dr. Kanu Lal Saha", specialty: "ENT Specialist", category: "ENT", location: "Dhaka, Bangladesh", rating: 4.6, reviews: 177, blurb: "Experienced ent specialist practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 24th", time: "16:00 PM", mode: "In-Person", gender: "male", img: "male2" },
  { name: "Prof. Dr. Sufia Begum Shampy", specialty: "Gynecologist", category: "Gynecology", location: "Dhaka, Bangladesh", rating: 4.7, reviews: 214, blurb: "Experienced gynecologist practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 14th", time: "09:00 AM", mode: "Telehealth", gender: "female", img: "female2" },
  { name: "Dr. Kanu Lal Saha", specialty: "ENT Specialist", category: "ENT", location: "Dhaka, Bangladesh", rating: 4.8, reviews: 251, blurb: "Experienced ent specialist practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 16th", time: "10:30 AM", mode: "In-Person", gender: "male", img: "male3" },
  { name: "Dr. Momena Begum", specialty: "Pediatrician", category: "Pediatrics", location: "Dhaka, Bangladesh", rating: 4.9, reviews: 288, blurb: "Experienced pediatrician practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 12th", time: "11:00 AM", mode: "In-Person", gender: "female", img: "female3" },
  { name: "Prof. Dr. Mohammed Yousuf", specialty: "ENT Specialist", category: "ENT", location: "Dhaka, Bangladesh", rating: 4.5, reviews: 325, blurb: "Experienced ent specialist practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 18th", time: "14:00 PM", mode: "Telehealth", gender: "male", img: "male1" },
  { name: "Dr. Beena Sarker", specialty: "Nephrologist", category: "Nephrology", location: "Dhaka, Bangladesh", rating: 4.6, reviews: 82, blurb: "Experienced nephrologist practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 20th", time: "15:30 PM", mode: "In-Person", gender: "female", img: "female1" },
  { name: "Prof. Dr. Md. Rafiqul Islam Delta", specialty: "Pediatrician", category: "Pediatrics", location: "Dhaka, Bangladesh", rating: 4.7, reviews: 119, blurb: "Experienced pediatrician practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 22nd", time: "16:00 PM", mode: "In-Person", gender: "male", img: "male2" },
  { name: "Dr. Nadia Farzana Islam", specialty: "General Surgeon", category: "Surgery", location: "Dhaka, Bangladesh", rating: 4.8, reviews: 156, blurb: "Experienced general surgeon practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 24th", time: "09:00 AM", mode: "Telehealth", gender: "female", img: "female2" },
  { name: "Dr. Md. Mobassar Hussain Mullick", specialty: "Pediatrician", category: "Pediatrics", location: "Dhaka, Bangladesh", rating: 4.9, reviews: 193, blurb: "Experienced pediatrician practicing in Dhaka, Bangladesh, with a patient-first approach.", date: "May 14th", time: "10:30 AM", mode: "In-Person", gender: "male", img: "male3" },
] as const).map((d) => ({
  ...d,
  img: d.gender === "male"
    ? maleImages[d.img as keyof typeof maleImages]
    : femaleImages[d.img as keyof typeof femaleImages],
}));
