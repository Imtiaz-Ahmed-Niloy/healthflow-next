import { useEffect, useState } from "react";
import type { StaticImageData } from "next/image";
import t1 from "@/assets/testimonial-1.jpg";
import t2 from "@/assets/testimonial-2.jpg";
import t3 from "@/assets/testimonial-3.jpg";

export type TestimonialAudience = "Patients" | "Doctors";

export type Testimonial = {
  id: string;
  audience: TestimonialAudience;
  name: string;
  role: string;
  img: string | StaticImageData;
  text: string;
};

const STORAGE_KEY = "hf:testimonials:v1";
const EVENT = "hf:testimonials:changed";

const defaults: Testimonial[] = [
  { id: "p1", audience: "Patients", name: "Sarah L.", role: "Member since 2023", img: t1, text: "I had a great experience with the Healthflow app. It helped me find the necessary doctors and book appointments easily. I got the doctor on time, and the whole process was very smooth and convenient. Highly recommended!" },
  { id: "p2", audience: "Patients", name: "Suraiya Zahan", role: "Patient", img: t2, text: "The integration of digital monitoring with physical hub visits is seamless. I finally feel like I have a care team that actually communicates with each other and understands my goals." },
  { id: "p3", audience: "Patients", name: "Maria R.", role: "Member since 2022", img: t3, text: "Dr. Jenkins and the pediatric team at HealthFlow are exceptional. They treated my daughter with such warmth and patience. The facility itself kept her calm and curious rather than afraid." },
  { id: "d1", audience: "Doctors", name: "Dr. Patel", role: "Holistic Medicine", img: t1, text: "HealthFlow's platform finally lets me practice the way I always wanted to — collaborative, patient-centered, and free from administrative noise." },
  { id: "d2", audience: "Doctors", name: "Dr. Chen", role: "Cardiology", img: t2, text: "The infrastructure is unmatched. I can focus on care knowing the operational side just works." },
  { id: "d3", audience: "Doctors", name: "Dr. Okafor", role: "Surgical", img: t3, text: "Working in our atrium hub feels less like clinical work and more like restorative practice. My patients notice the difference immediately." },
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
