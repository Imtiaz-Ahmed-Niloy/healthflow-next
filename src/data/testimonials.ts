import { useEffect, useState } from "react";
const t1 = "/assets/testimonial-1.jpg";
const t2 = "/assets/testimonial-2.jpg";
const t3 = "/assets/testimonial-3.jpg";

export type TestimonialAudience = "Patients" | "Doctors" | "Hospitals";

export type Testimonial = {
  id: string;
  audience: TestimonialAudience;
  name: string;
  role: string;
  img: string;
  text: string;
};

const STORAGE_KEY = "hf:testimonials:v2";
const EVENT = "hf:testimonials:changed";

const defaults: Testimonial[] = [
  { id: "p1", audience: "Patients", name: "Sarah L.", role: "Member since 2023", img: t1, text: "I had a great experience with the Healthflow app. It helped me find the necessary doctors and book appointments easily. I got the doctor on time, and the whole process was very smooth and convenient. Highly recommended!" },
  { id: "p2", audience: "Patients", name: "Suraiya Zahan", role: "Patient", img: t2, text: "The integration of digital monitoring with physical hub visits is seamless. I finally feel like I have a care team that actually communicates with each other and understands my goals." },
  { id: "p3", audience: "Patients", name: "Maria R.", role: "Member since 2022", img: t3, text: "Dr. Jenkins and the pediatric team at HealthFlow are exceptional. They treated my daughter with such warmth and patience. The facility itself kept her calm and curious rather than afraid." },
  { id: "p4", audience: "Patients", name: "Rafiqul Islam", role: "Patient, Dhaka", img: t1, text: "My father is seventy-two and does not use apps. I booked for him, and the hospital had his papers ready before we arrived. We were seen in twenty minutes instead of half a day." },
  { id: "p5", audience: "Patients", name: "Nusrat Jahan", role: "Member since 2024", img: t2, text: "Every prescription and test result I have is in one place. The last time I changed hospitals I did not have to explain my history from the beginning, which has never happened before." },
  { id: "p6", audience: "Patients", name: "Tanvir Ahmed", role: "Patient, Chattogram", img: t3, text: "I compared four hospitals on price and distance in about a minute. That comparison used to mean phone calls all afternoon." },
  { id: "d1", audience: "Doctors", name: "Dr. Patel", role: "Holistic Medicine", img: t1, text: "HealthFlow's platform finally lets me practice the way I always wanted to — collaborative, patient-centered, and free from administrative noise." },
  { id: "d2", audience: "Doctors", name: "Dr. Chen", role: "Cardiology", img: t2, text: "The infrastructure is unmatched. I can focus on care knowing the operational side just works." },
  { id: "d3", audience: "Doctors", name: "Dr. Okafor", role: "Surgical", img: t3, text: "Working in our atrium hub feels less like clinical work and more like restorative practice. My patients notice the difference immediately." },
  { id: "d4", audience: "Doctors", name: "Dr. Farhana Kabir", role: "Gynaecology", img: t2, text: "My chamber hours fill themselves now. I open the queue in the morning and it is already ordered, with the notes from each patient's last visit attached." },
  { id: "d5", audience: "Doctors", name: "Prof. Dr. Anwar Hossain", role: "General Surgery", img: t1, text: "Writing a prescription takes a minute and the patient has it before they leave the room. No handwriting to argue about at the pharmacy." },
  { id: "d6", audience: "Doctors", name: "Dr. Shirin Akter", role: "Paediatrics", img: t3, text: "Parents message follow-up questions through the portal rather than calling at ten at night. Everyone sleeps better." },
  { id: "h1", audience: "Hospitals", name: "Ibrahim Cardiac Centre", role: "Dhaka · 320 beds", img: t2, text: "Admissions, billing and the pharmacy stopped being three separate arguments. One ledger, one queue, and the month closes in an afternoon." },
  { id: "h2", audience: "Hospitals", name: "Popular Diagnostic", role: "Chattogram · Diagnostics", img: t1, text: "Reports reach the patient the moment they are signed. Our front desk stopped fielding calls asking whether results were ready." },
  { id: "h3", audience: "Hospitals", name: "Green Life Hospital", role: "Dhaka · Multi-speciality", img: t3, text: "We onboarded sixty doctors in a week. The part we dreaded — moving old records across — turned out to be the part that took an afternoon." },
  { id: "h4", audience: "Hospitals", name: "Labaid Specialised", role: "Sylhet · 180 beds", img: t2, text: "Every role sees exactly what it should and nothing more. Our audit last quarter took two hours instead of two days." },
  { id: "h5", audience: "Hospitals", name: "Square Hospitals", role: "Dhaka · Multi-speciality", img: t1, text: "Bed occupancy, revenue and outstanding invoices on one screen. Decisions that used to wait for a monthly report happen the same morning." },
  { id: "h6", audience: "Hospitals", name: "Evercare Rajshahi", role: "Rajshahi · 240 beds", img: t3, text: "Patients arrive already registered, with their history attached. Our average wait time has fallen by a third since we joined." },
];

const read = (): Testimonial[] => {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Testimonial[];
    return Array.isArray(parsed) && parsed.length ? parsed : defaults;
  } catch {
    return defaults;
  }
};

const write = (list: Testimonial[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
};

export const sampleAvatars = [t1, t2, t3];

export const useTestimonials = () => {
  const [items, setItems] = useState<Testimonial[]>(() => read());

  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const add = (t: Omit<Testimonial, "id">) =>
    write([...read(), { ...t, id: crypto.randomUUID() }]);
  const update = (id: string, patch: Partial<Omit<Testimonial, "id">>) =>
    write(read().map(t => (t.id === id ? { ...t, ...patch } : t)));
  const remove = (id: string) => write(read().filter(t => t.id !== id));
  const reset = () => write(defaults);

  return { items, add, update, remove, reset };
};
