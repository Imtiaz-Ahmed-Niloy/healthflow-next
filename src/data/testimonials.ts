import { useEffect, useState } from "react";
const t1 = "/assets/testimonial-1.jpg";
const t2 = "/assets/testimonial-2.jpg";
const t3 = "/assets/testimonial-3.jpg";

export type TestimonialAudience = "Patients" | "Doctors" | "Hospitals";

/** The words of one testimonial, in one language. */
export type TestimonialText = { name: string; role: string; text: string };

export type Testimonial = {
  id: string;
  audience: TestimonialAudience;
  name: string;
  role: string;
  img: string;
  text: string;
  /** The same in Bangla. A part left empty shows the English. */
  bn?: TestimonialText;
};

const STORAGE_KEY = "hf:testimonials:v2";
const EVENT = "hf:testimonials:changed";

const english: Testimonial[] = [
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

/** The Bangla of each one above, by id. */
const bangla: Record<string, TestimonialText> = {
  p1: { name: "সারাহ এল.", role: "২০২৩ সাল থেকে সদস্য", text: "হেলথফ্লো অ্যাপ ব্যবহার করে আমার অভিজ্ঞতা খুব ভালো। দরকারি ডাক্তার খুঁজে পাওয়া আর অ্যাপয়েন্টমেন্ট বুক করা খুব সহজ হয়েছে। ঠিক সময়ে ডাক্তার পেয়েছি, পুরো ব্যাপারটাই ছিল ঝামেলাহীন। সবাইকে ব্যবহার করতে বলব!" },
  p2: { name: "সুরাইয়া জাহান", role: "রোগী", text: "অনলাইনে নজর রাখা আর সরাসরি হাবে গিয়ে দেখানো — দুটো একসাথে দারুণভাবে চলে। অবশেষে মনে হচ্ছে আমার এমন একটা কেয়ার টিম আছে যারা নিজেদের মধ্যে কথা বলে এবং আমার লক্ষ্যটা বোঝে।" },
  p3: { name: "মারিয়া আর.", role: "২০২২ সাল থেকে সদস্য", text: "হেলথফ্লোর ডা. জেনকিন্স ও শিশু বিভাগের টিম অসাধারণ। আমার মেয়েকে তাঁরা খুব আদর আর ধৈর্য নিয়ে দেখেছেন। জায়গাটাই এমন যে সে ভয় না পেয়ে শান্ত আর কৌতূহলী ছিল।" },
  p4: { name: "রফিকুল ইসলাম", role: "রোগী, ঢাকা", text: "আমার বাবার বয়স বাহাত্তর, তিনি অ্যাপ ব্যবহার করেন না। আমি তাঁর হয়ে বুক করেছি, আর আমরা পৌঁছানোর আগেই হাসপাতাল তাঁর কাগজপত্র তৈরি রেখেছিল। আধা দিনের বদলে বিশ মিনিটেই ডাক্তার দেখানো হয়ে গেছে।" },
  p5: { name: "নুসরাত জাহান", role: "২০২৪ সাল থেকে সদস্য", text: "আমার সব প্রেসক্রিপশন আর টেস্ট রিপোর্ট এক জায়গায় আছে। শেষবার হাসপাতাল বদলানোর সময় আমাকে শুরু থেকে সব ইতিহাস বলতে হয়নি — এমনটা আগে কখনো হয়নি।" },
  p6: { name: "তানভীর আহমেদ", role: "রোগী, চট্টগ্রাম", text: "এক মিনিটের মতো সময়ে চারটা হাসপাতালের খরচ আর দূরত্ব মিলিয়ে দেখেছি। আগে এই কাজে সারা বিকেল ফোন করতে হতো।" },
  d1: { name: "ডা. প্যাটেল", role: "হোলিস্টিক মেডিসিন", text: "হেলথফ্লোর প্ল্যাটফর্মে অবশেষে আমি সেভাবেই প্র্যাকটিস করতে পারছি যেভাবে সবসময় চেয়েছি — সবাই মিলে, রোগীকে কেন্দ্রে রেখে, অফিসের কাজের ঝামেলা ছাড়া।" },
  d2: { name: "ডা. চেন", role: "কার্ডিওলজি", text: "এখানকার ব্যবস্থা অতুলনীয়। পরিচালনার দিকটা নিজে থেকেই ঠিকঠাক চলে, তাই আমি শুধু চিকিৎসায় মন দিতে পারি।" },
  d3: { name: "ডা. ওকাফোর", role: "সার্জারি", text: "আমাদের অ্যাট্রিয়াম হাবে কাজ করাটা হাসপাতালের কাজের চেয়ে বেশি মনে হয় মানুষকে সুস্থ করে তোলার চর্চা। আমার রোগীরা পার্থক্যটা সাথে সাথেই টের পান।" },
  d4: { name: "ডা. ফারহানা কবির", role: "গাইনি", text: "আমার চেম্বারের সময় এখন নিজে থেকেই ভরে যায়। সকালে কিউ খুললেই দেখি সব সাজানো, সাথে প্রতিটি রোগীর আগের ভিজিটের নোটও আছে।" },
  d5: { name: "অধ্যাপক ডা. আনোয়ার হোসেন", role: "জেনারেল সার্জারি", text: "প্রেসক্রিপশন লিখতে এক মিনিট লাগে, আর রোগী রুম ছাড়ার আগেই সেটা হাতে পেয়ে যান। ফার্মেসিতে হাতের লেখা নিয়ে আর তর্ক হয় না।" },
  d6: { name: "ডা. শিরিন আক্তার", role: "শিশু বিভাগ", text: "বাবা-মায়েরা রাত দশটায় ফোন না করে পোর্টালেই ফলো-আপের প্রশ্ন পাঠান। সবাই শান্তিতে ঘুমাতে পারে।" },
  h1: { name: "ইব্রাহিম কার্ডিয়াক সেন্টার", role: "ঢাকা · ৩২০ বেড", text: "ভর্তি, বিলিং আর ফার্মেসি নিয়ে আর তিনটা আলাদা ঝামেলা নেই। একটাই হিসাব, একটাই কিউ, আর মাসের হিসাব এক বিকেলেই শেষ হয়।" },
  h2: { name: "পপুলার ডায়াগনস্টিক", role: "চট্টগ্রাম · ডায়াগনস্টিক", text: "রিপোর্টে সই হওয়ার সাথে সাথেই রোগীর কাছে পৌঁছে যায়। রিপোর্ট তৈরি হয়েছে কি না জানতে আমাদের ফ্রন্ট ডেস্কে আর ফোন আসে না।" },
  h3: { name: "গ্রিন লাইফ হাসপাতাল", role: "ঢাকা · মাল্টি-স্পেশালিটি", text: "এক সপ্তাহে আমরা ষাটজন ডাক্তারকে যুক্ত করেছি। যেটা নিয়ে সবচেয়ে ভয় ছিল — পুরোনো রেকর্ড সরিয়ে আনা — সেটাই এক বিকেলে হয়ে গেছে।" },
  h4: { name: "ল্যাবএইড স্পেশালাইজড", role: "সিলেট · ১৮০ বেড", text: "প্রত্যেকে ঠিক যতটুকু দেখার কথা ততটুকুই দেখে, তার বেশি নয়। গত কোয়ার্টারে আমাদের অডিট দুই দিনের বদলে দুই ঘণ্টায় শেষ হয়েছে।" },
  h5: { name: "স্কয়ার হাসপাতাল", role: "ঢাকা · মাল্টি-স্পেশালিটি", text: "বেড কতগুলো ভরা, আয় কত আর কোন ইনভয়েস বাকি — সব এক স্ক্রিনে। যে সিদ্ধান্ত আগে মাসিক রিপোর্টের অপেক্ষায় থাকত, এখন সেদিন সকালেই হয়ে যায়।" },
  h6: { name: "এভারকেয়ার রাজশাহী", role: "রাজশাহী · ২৪০ বেড", text: "রোগীরা আগে থেকেই রেজিস্ট্রেশন করে আসেন, সাথে তাঁদের ইতিহাসও থাকে। আমরা যুক্ত হওয়ার পর থেকে গড় অপেক্ষার সময় তিন ভাগের এক ভাগ কমেছে।" },
};

const defaults: Testimonial[] = english.map(t => ({ ...t, bn: bangla[t.id] }));

/**
 * A list saved before there was any Bangla has none. One of the originals
 * whose English was never changed gets its Bangla back; an edited one keeps
 * showing what was typed.
 */
const withBangla = (list: Testimonial[]) =>
  list.map(t => {
    if (t.bn) return t;
    const original = defaults.find(d => d.id === t.id);
    return original && original.text === t.text ? { ...t, bn: original.bn } : t;
  });

/** One testimonial's words in the visitor's language. */
export const testimonialText = (t: Testimonial, inBangla: boolean): TestimonialText => ({
  name: (inBangla && t.bn?.name) || t.name,
  role: (inBangla && t.bn?.role) || t.role,
  text: (inBangla && t.bn?.text) || t.text,
});

const read = (): Testimonial[] => {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Testimonial[];
    return Array.isArray(parsed) && parsed.length ? withBangla(parsed) : defaults;
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
