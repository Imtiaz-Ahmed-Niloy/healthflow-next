"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Printer,
  Plus,
  Check,
  Heart,
  Activity,
  Flame,
  Wind,
  Droplets,
  ShieldAlert,
  Pencil,
  Trash2,
  FileText,
  RotateCcw,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export interface PatientHandout {
  id: string;
  titleBn: string;
  titleEn: string;
  icon?: any;
  badge: string;
  tagColor?: string;
  adviceBullets: string[];
  fullLeafletBn: string[];
  fullLeafletEn: string[];
  isCustom?: boolean;
}

export const PATIENT_HANDOUTS: PatientHandout[] = [
  {
    id: "hypertension",
    titleBn: "উচ্চ রক্তচাপ ও DASH খাদ্যতালিকা",
    titleEn: "Hypertension & DASH Diet Guide",
    icon: Activity,
    badge: "কার্ডিওলজি",
    tagColor: "bg-rose-50 text-rose-700 border-rose-200",
    adviceBullets: [
      "রান্নায় অতিরিক্ত লবণ ও পাতে কাঁচা লবণ পুরোপুরি বর্জন করুন।",
      "প্যাকেটজাত খাবার, চিপস, আচার ও প্রসেসড খাবার এড়িয়ে চলুন।",
      "প্রতিদিন অন্তত ৩০ মিনিট নিয়মিত দ্রুত হাঁটার অভ্যাস গড়ে তুলুন।",
      "প্রতিদিন পর্যাপ্ত তাজা শাকসবজি ও কম মিষ্টি ফলমূল গ্রহণ করুন।",
      "ডাক্তারের পরামর্শ ছাড়া রক্তচাপের ওষুধ কখনো বন্ধ বা ডোজ পরিবর্তন করবেন না।"
    ],
    fullLeafletBn: [
      "লবণ নিয়ন্ত্রণ: দিনে এক চা-চামচ (৫ গ্রাম)-এর বেশি লবণ খাওয়া যাবে না। পাতে কাঁচা লবণ সম্পূর্ণ নিষিদ্ধ।",
      "DASH ডায়েট অনুসরণ: খাবারে পটাশিয়াম, ম্যাগনেসিয়াম ও আঁশযুক্ত খাবার বাড়ান। বেশি করে লাল চালের ভাত, ওটস, ডাল, বাদাম ও রঙিন শাকসবজি খান।",
      "ওজন নিয়ন্ত্রণ: পেটের মেদ কমান। অতিরিক্ত ওজন হৃৎপিণ্ডের ওপর মাত্রাতিরিক্ত চাপ সৃষ্টি করে।",
      "রক্তচাপ পরিমাপ ও লগ: সপ্তাহে অন্তত দুই দিন একই সময়ে রক্তচাপ মেপে খাতায় লিখে রাখুন।",
      "বিপদ সংকেত: প্রচণ্ড মাথাব্যথা, বুকে ব্যথা বা চাপ, চোখে ঝাপসা দেখা বা শ্বাসকষ্ট হলে অবিলম্বে নিকটস্থ জরুরি বিভাগে যোগাযোগ করুন।"
    ],
    fullLeafletEn: [
      "Strict Sodium Restriction: Restrict sodium to less than 2g/day (1 tsp salt total). Avoid adding raw salt to meals.",
      "DASH Dietary Pattern: Increase dietary potassium and fiber. Incorporate whole grains, green leafy vegetables, legumes, and nuts.",
      "Physical Activity: 30-45 minutes of brisk walking at least 5 days a week.",
      "BP Monitoring: Record blood pressure readings twice weekly at resting baseline.",
      "Red Flags: Severe headache, chest pressure, visual disturbances, or shortness of breath require emergency room evaluation."
    ]
  },
  {
    id: "diabetes",
    titleBn: "টাইপ-২ ডায়াবেটিস ও খাবার প্লেট পদ্ধতি",
    titleEn: "Type 2 Diabetes & Plate Method",
    icon: Droplets,
    badge: "এন্ডোক্রাইন",
    tagColor: "bg-blue-50 text-blue-700 border-blue-200",
    adviceBullets: [
      "খাবারের প্লেটের অর্ধেক শাকসবজি, এক-চতুর্থাংশ লাল চালের ভাত ও এক-চতুর্থাংশ প্রোটিন রাখুন।",
      "চিনি, মিষ্টি, কোল্ড ড্রিংকস ও বেকারি পণ্য সম্পূর্ণ এড়িয়ে চলুন।",
      "প্রতিদিন নির্দিষ্ট সময়ে খাবার গ্রহণ করুন, দীর্ঘক্ষণ না খেয়ে থাকবেন না।",
      "প্রতিদিন নিয়মিত হাঁটাচলা করুন এবং পায়ের পাতার যত্ন নিন (আঘাত বা ক্ষত এড়িয়ে চলুন)।",
      "প্রেসক্রিপশন অনুযায়ী নিয়মিত গ্লুকোজ পরীক্ষা করে ডায়েরিতে নোট রাখুন।"
    ],
    fullLeafletBn: [
      "স্বাস্থ্যকর প্লেট পদ্ধতি: একটি ৯ ইঞ্চির থালার অর্ধেক শাকসবজি/সালাদ, ১/৪ অংশ লাল চালের ভাত/রুটি এবং ১/৪ অংশ মাছ/চর্বিহীন মাংস/ডিম/ডাল দিয়ে সাজান।",
      "চিনি ও মিষ্টি সম্পূর্ণ পরিহার: চিনি, গুড়, সফট ড্রিংকস, জুস, পায়েস, মিষ্টি, বেকারি বিস্কুট কঠোরভাবে বর্জনীয়।",
      "হাইপোগ্লাইসেমিয়া (সুগার কমে যাওয়া) সতর্কতা: শরীর কাঁপা, বুক ধড়ফড়, অতিরিক্ত ঘাম হলে অবিলম্বে ২-৩ চামচ চিনি বা শরবত খেয়ে নিন এবং ডাক্তারের পরামর্শ নিন।",
      "পায়ের যত্ন (ডায়াবেটিক ফুট প্রতিরোধ): প্রতিদিন কুসুম গরম পানিতে পা ধুয়ে মুছে পরিষ্কার রাখুন। খালি পায়ে হাঁটবেন না। নরম জুতো পরিধান করুন।",
      "নিয়মিত পরীক্ষা: প্রতি ৩ মাস পরপর HbA1c এবং বছরে অন্তত একবার কিডনি ফাংশন ও চোখের রেটিনা পরীক্ষা করান।"
    ],
    fullLeafletEn: [
      "Diabetes Plate Method: Half plate non-starchy vegetables/salad, one quarter complex carbohydrates (brown rice/whole wheat), one quarter lean protein.",
      "Sugar Elimination: Avoid refined sugar, syrup, sugary beverages, pastries, and processed foods.",
      "Hypoglycemia Awareness: If experiencing tremors, palpitations, cold sweats, immediately consume 15g fast-acting carbohydrates (sugar water/candy).",
      "Diabetic Foot Care: Inspect feet daily for blisters, cuts, or redness. Never walk barefoot; wear well-cushioned footwear.",
      "Periodic Surveillance: Schedule HbA1c testing every 3 months; annual microalbuminuria and dilated retinal eye exam."
    ]
  },
  {
    id: "dengue",
    titleBn: "ডেঙ্গু জ্বর: ঘরোয়া পরিচর্যা ও বিপদ সংকেত",
    titleEn: "Dengue Fever Care & Red Flags",
    icon: ShieldAlert,
    badge: "ইনফেকশন",
    tagColor: "bg-amber-50 text-amber-800 border-amber-200",
    adviceBullets: [
      "প্রচুর পরিমাণে তরল খাবার গ্রহণ করুন (ডাবের পানি, ওআরএস স্যালাইন, স্যুপ, লেবুর শরবত)।",
      "জ্বরের জন্য শুধুমাত্র প্যারাসিটামল সেবন করুন। অ্যাসপিরিন বা ব্যথানাশক ওষুধ সম্পূর্ণ নিষিদ্ধ।",
      "সম্পূর্ণ বিশ্রামে থাকুন এবং মশারি ব্যবহার করুন।",
      "জ্বর কমে যাওয়ার পর পরবর্তী ৪৮ ঘণ্টা অত্যন্ত সতর্ক থাকুন (সংকটাপন্ন পর্যায়)।",
      "পেটে তীব্র ব্যথা বা রক্তক্ষরণ দেখা দিলে দ্রুত হাসপাতালে ভর্তি হোন।"
    ],
    fullLeafletBn: [
      "তরল গ্রহণের লক্ষ্যমাত্রা: রোগীর ওজন অনুযায়ী দিনে অন্তত ২.৫ থেকে ৩ লিটার তরল (ওআরএস খাবার স্যালাইন, ডাবের পানি, ভাতের মাড়, লেবুর শরবত) পান করান। প্রস্রাবের পরিমাণ স্বাভাবিক রাখা প্রধান লক্ষ্য।",
      "ব্যথানাশক ওষুধ সম্পূর্ণ নিষিদ্ধ: আইবুপ্রোফেন, ডাইক্লোফেনাক, ন্যাপ্রোক্সেন বা অ্যাসপিরিন জাতীয় ব্যথানাশক ওষুধ একেবারেই খাবেন না, এতে মারাত্মক রক্তক্ষরণ হতে পারে।",
      "জরুরি বিপদ সংকেত (লাল পতাকা লক্ষণ): ১) পেটে প্রচণ্ড বা স্থায়ী ব্যথা, ২) বারবার বমি হওয়া, ৩) নাক, মুখ বা দাঁতের মাড়ি দিয়ে রক্তপাত, ৪) কালো রঙের পায়খানা, ৫) অতিরিক্ত দুর্বলতা ও নিস্তেজ ভাব, ৬) হাত-পা ঠান্ডা হয়ে যাওয়া বা রক্তচাপ কমে যাওয়া। এমন লক্ষণ দেখা দিলে কালবিলম্ব না করে অবিলম্বে হাসপাতালে ভর্তি হোন।"
    ],
    fullLeafletEn: [
      "Hydration Target: 2.5 to 3 liters fluid intake daily (oral rehydration salts, coconut water, clear broth). Maintain clear urine output.",
      "Strict Analgesic Restriction: Strictly avoid NSAIDs (Ibuprofen, Diclofenac, Naproxen, Aspirin) due to severe hemorrhage risk. Use Paracetamol only.",
      "Critical Phase Monitoring: Days 3 to 7 as fever breaks pose the highest risk of plasma leakage, hemoconcentration, and platelet drops.",
      "Red Flags: Severe abdominal pain, persistent vomiting, mucosal bleeding, dark/tarry stools, dizziness, hypothermia, or extreme lethargy require immediate hospitalization."
    ]
  },
  {
    id: "gerd",
    titleBn: "গ্যাস্ট্রিক, বুকজ্বালা ও এসিডিটি নিরাময়",
    titleEn: "GERD, Acidity & Peptic Ulcer Care",
    icon: Flame,
    badge: "গ্যাস্ট্রো",
    tagColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    adviceBullets: [
      "অতিরিক্ত তৈলাক্ত, ভাজাপোড়া ও ঝাল মসলাযুক্ত খাবার খাওয়া বন্ধ করুন।",
      "একবারে বেশি না খেয়ে অল্প অল্প করে ঘন ঘন খাবার গ্রহণ করুন।",
      "খাবার খাওয়ার সাথে সাথেই শুয়ে পড়বেন না, অন্তত ২ ঘণ্টা পর ঘুমাতে যান।",
      "চা, কফি, কোমল পানীয় ও ধূমপান সম্পূর্ণরূপে বর্জন করুন।",
      "ঘুমানোর সময় মাথার দিক ৬ ইঞ্চি উঁচু রাখুন।"
    ],
    fullLeafletBn: [
      "খাদ্যাভ্যাস পরিবর্তন: পোড়া তেল, ডিপ ফ্রাইড স্ন্যাক্স, অতিরিক্ত মরিচ ও গরম মসলা পাকস্থলীতে এসিডের ক্ষরণ বাড়ায়। পরিমিত ও সহজপাচ্য খাবার গ্রহণ করুন।",
      "খাওয়ার সময়সূচি: দীর্ঘক্ষণ পেট খালি রাখবেন না। নির্দিষ্ট সময়ে খাবার খাওয়ার অভ্যাস বজায় রাখুন।",
      "রাতে খাওয়ার নিয়ম: ঘুমানোর অন্তত ২ থেকে ৩ ঘণ্টা আগে রাতের খাবার শেষ করুন। ভরপেট খেয়ে শুয়ে পড়লে এসিড খাদ্যনালীতে উঠে বুকজ্বালা তৈরি করে।",
      "শোয়ার ভঙ্গি: বিছানার মাথার দিক ৪-৬ ইঞ্চি উঁচু করে শোওয়ার ব্যবস্থা করুন। বাম কাতে ঘুমালে পাকস্থলীর এসিড খাদ্যনালীতে ওঠার আশঙ্কা কমে।",
      "উত্তেজক পানীয় বর্জন: খালি পেটে চা, কফি, কোমল পানীয়, অ্যালকোহল ও তামাক গ্যাস্ট্রিকের ক্ষত বাড়িয়ে দেয়।"
    ],
    fullLeafletEn: [
      "Dietary Modifications: Eliminate deep-fried items, high-fat meals, raw onions, and excessive spices that trigger reflux.",
      "Meal Timing: Eat smaller, frequent meals. Avoid prolonged fasting and do not skip breakfast.",
      "Nighttime Protocol: Finish dinner at least 2 to 3 hours before reclining. Lying flat after meals exacerbates reflux.",
      "Sleep Ergonomics: Elevate head of bed by 4-6 inches using an incline wedge. Left lateral sleeping reduces acid exposure.",
      "Avoid Triggers: Cease coffee, tea on empty stomach, carbonated sodas, and smoking, which relax the lower esophageal sphincter."
    ]
  },
  {
    id: "asthma",
    titleBn: "হাঁপানি (অ্যাজমা) ও অ্যালার্জি নিয়ন্ত্রণ",
    titleEn: "Asthma & Allergic Airway Control",
    icon: Wind,
    badge: "রেসপিরেটরি",
    tagColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
    adviceBullets: [
      "ধুলাবালি, ঠান্ডা বাতাস, ধোঁয়া ও মশার কয়েল থেকে দূরে থাকুন এবং বাইরে মাস্ক ব্যবহার করুন।",
      "ইনহেলার ব্যবহারের সঠিক নিয়ম মেনে চলুন এবং স্পেসার ব্যবহার করুন।",
      "ডাক্তারের পরামর্শ ছাড়া নিয়মিত ইনহেলার নেওয়া বন্ধ করবেন না।",
      "গোসলে অতিরিক্ত ঠান্ডা পানি বা ফ্রিজের ঠান্ডা খাবার পরিহার করুন।",
      "তীব্র শ্বাসকষ্টে দ্রুত উপশমকারী (Reliever) ইনহেলার গ্রহণ করে হাসপাতালে যান।"
    ],
    fullLeafletBn: [
      "ট্রিগার বা কারণ এড়িয়ে চলা: ধুলাবালি, ফুলের রেণু, পোষা প্রাণীর লোম, মশার কয়েলের ধোঁয়া, স্প্রে বা পারফিউম এবং রান্নার ধোঁয়া থেকে সুরক্ষিত থাকুন।",
      "সঠিক ইনহেলার টেকনিক: ইনহেলার সরাসরি মুখে নেওয়ার চেয়ে স্পেসার (Spacer) দিয়ে টানলে ফুসফুসের গভীরে সর্বোচ্চ ওষুধ পৌঁছায়। ইনহেলার নেওয়ার পর ভালো করে কুলি করে নিন।",
      "নিয়মিত কন্ট্রোলার ওষুধ: উপশম পেলেও প্রেসক্রাইব করা কন্ট্রোলার/প্রতিরোধক ইনহেলার নিয়মিত ব্যবহার করতে হবে। হঠাৎ ওষুধ বন্ধ করলে তীব্র অ্যাজমা অ্যাটাক হতে পারে।",
      "শীতকালীন সতর্কতা: ঠান্ডা বাতাস ফুসফুসের নালী সংকুচিত করে। বাইরে যাওয়ার সময় মাফলার ও মাস্ক দিয়ে নাক-মুখ ঢেকে রাখুন।",
      "জরুরি বিপদ সংকেত: কথা বলতে কষ্ট হওয়া, ঠোঁট বা নখ নীলচে হয়ে যাওয়া, বুকের খাঁচা ভেতরের দিকে দেবে যাওয়া তীব্র হাঁপানির লক্ষণ। দ্রুত জরুরি চিকিৎসা নিন।"
    ],
    fullLeafletEn: [
      "Trigger Avoidance: Eliminate contact with dust mites, domestic animal dander, aerosol sprays, tobacco/mosquito smoke, and cold air.",
      "Proper Inhaler Technique: Use an authorized spacer chamber to optimize lower respiratory lung deposition. Rinse mouth thoroughly after steroid inhalers.",
      "Maintenance Adherence: Continue regular preventer/controller inhalers even during symptom-free intervals to suppress chronic airway inflammation.",
      "Cold Weather Protection: Wear an N95/protective mask and scarf in cold/smoggy conditions to warm inspired air.",
      "Emergency Exacerbation: Inability to speak full sentences, cyanosis of lips, or intercostal retractions indicate severe airway compromise; seek immediate ER care."
    ]
  }
];

interface PatientHandoutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitalName?: string | null;
  doctorName?: string | null;
  doctorSpecialty?: string | null;
  bmdcNumber?: string | null;
  patientName?: string | null;
  onInsertAdvice?: (adviceText: string) => void;
}

const HANDOUTS_STORAGE_KEY = "healthflow_portal_patient_handouts";

export function PatientHandoutsDialog({
  open,
  onOpenChange,
  hospitalName,
  doctorName,
  doctorSpecialty,
  bmdcNumber,
  patientName,
  onInsertAdvice
}: PatientHandoutsDialogProps) {
  const [handouts, setHandouts] = useState<PatientHandout[]>(PATIENT_HANDOUTS);
  const [selectedHandoutId, setSelectedHandoutId] = useState<string>(PATIENT_HANDOUTS[0].id);
  const [language, setLanguage] = useState<"bn" | "en">("bn");

  // Edit / Create Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingHandoutId, setEditingHandoutId] = useState<string | null>(null);
  const [formTitleBn, setFormTitleBn] = useState("");
  const [formTitleEn, setFormTitleEn] = useState("");
  const [formBadge, setFormBadge] = useState("সাধারণ");
  const [formLeafletBn, setFormLeafletBn] = useState("");
  const [formLeafletEn, setFormLeafletEn] = useState("");
  const [formAdviceBullets, setFormAdviceBullets] = useState("");

  // Load from localStorage on mount or when dialog opens
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HANDOUTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hydrated = parsed.map((item: any) => {
            const defaultMatch = PATIENT_HANDOUTS.find((dh) => dh.id === item.id);
            return {
              ...item,
              icon: defaultMatch?.icon || FileText,
            };
          });
          setHandouts(hydrated);
          if (!hydrated.some((h: any) => h.id === selectedHandoutId)) {
            setSelectedHandoutId(hydrated[0].id);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load handouts from localStorage", e);
    }
  }, [open]);

  const saveHandouts = (updated: PatientHandout[]) => {
    setHandouts(updated);
    try {
      const storable = updated.map(({ icon, ...rest }) => rest);
      localStorage.setItem(HANDOUTS_STORAGE_KEY, JSON.stringify(storable));
    } catch (e) {
      console.error("Failed to persist handouts", e);
    }
  };

  const selectedHandout =
    handouts.find((h) => h.id === selectedHandoutId) || handouts[0] || PATIENT_HANDOUTS[0];

  const handleStartCreate = () => {
    setEditingHandoutId(null);
    setFormTitleBn("");
    setFormTitleEn("");
    setFormBadge("সাধারণ");
    setFormLeafletBn("");
    setFormLeafletEn("");
    setFormAdviceBullets("");
    setIsEditing(true);
  };

  const handleStartEdit = () => {
    if (!selectedHandout) return;
    setEditingHandoutId(selectedHandout.id);
    setFormTitleBn(selectedHandout.titleBn || "");
    setFormTitleEn(selectedHandout.titleEn || "");
    setFormBadge(selectedHandout.badge || "সাধারণ");
    setFormLeafletBn((selectedHandout.fullLeafletBn || []).join("\n\n"));
    setFormLeafletEn((selectedHandout.fullLeafletEn || []).join("\n\n"));
    setFormAdviceBullets((selectedHandout.adviceBullets || []).join("\n"));
    setIsEditing(true);
  };

  const handleDeleteHandout = (id: string) => {
    if (handouts.length <= 1) {
      toast.error("অন্তত একটি নির্দেশিকা তালিকায় থাকতে হবে");
      return;
    }
    const target = handouts.find((h) => h.id === id);
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${target?.titleBn || "এই নির্দেশিকা"}" মুছে ফেলতে চান?`)) {
      return;
    }
    const filtered = handouts.filter((h) => h.id !== id);
    saveHandouts(filtered);
    if (selectedHandoutId === id) {
      setSelectedHandoutId(filtered[0]?.id || "");
    }
    toast.success("নির্দেশিকা মুছে ফেলা হয়েছে");
  };

  const handleResetToDefaults = () => {
    if (
      !window.confirm(
        "আপনি কি সমস্ত নির্দেশিকা পূর্বনির্ধারিত মূল তালিকায় ফিরিয়ে নিতে চান? আপনার কাস্টম পরিবর্তনগুলো মুছে যাবে।"
      )
    ) {
      return;
    }
    saveHandouts(PATIENT_HANDOUTS);
    setSelectedHandoutId(PATIENT_HANDOUTS[0].id);
    setIsEditing(false);
    toast.success("পূর্বনির্ধারিত নির্দেশিকা তালিকা পুনরুদ্ধার করা হয়েছে");
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitleBn.trim()) {
      toast.error("নির্দেশিকার শিরোনাম (বাংলা) লিখুন");
      return;
    }

    const leafBnList = formLeafletBn
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const leafEnList = formLeafletEn
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const adviceList = formAdviceBullets
      .split("\n")
      .map((s) => s.replace(/^[•\-\*]\s*/, "").trim())
      .filter(Boolean);

    if (leafBnList.length === 0) {
      toast.error("অন্তত একটি স্বাস্থ্য নির্দেশনার পয়েন্ট লিখুন");
      return;
    }

    if (editingHandoutId) {
      const updated = handouts.map((h) => {
        if (h.id !== editingHandoutId) return h;
        return {
          ...h,
          titleBn: formTitleBn.trim(),
          titleEn: formTitleEn.trim() || formTitleBn.trim(),
          badge: formBadge.trim() || "সাধারণ",
          fullLeafletBn: leafBnList,
          fullLeafletEn: leafEnList.length > 0 ? leafEnList : leafBnList,
          adviceBullets: adviceList.length > 0 ? adviceList : leafBnList.slice(0, 4),
        };
      });
      saveHandouts(updated);
      setSelectedHandoutId(editingHandoutId);
      toast.success("নির্দেশিকা সফলভাবে আপডেট করা হয়েছে");
    } else {
      const newId = `custom_${Date.now()}`;
      const newHandout: PatientHandout = {
        id: newId,
        titleBn: formTitleBn.trim(),
        titleEn: formTitleEn.trim() || formTitleBn.trim(),
        icon: FileText,
        badge: formBadge.trim() || "কাস্টম",
        tagColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
        adviceBullets: adviceList.length > 0 ? adviceList : leafBnList.slice(0, 4),
        fullLeafletBn: leafBnList,
        fullLeafletEn: leafEnList.length > 0 ? leafEnList : leafBnList,
        isCustom: true,
      };
      saveHandouts([newHandout, ...handouts]);
      setSelectedHandoutId(newId);
      toast.success("নতুন নির্দেশিকা সফলভাবে যুক্ত করা হয়েছে");
    }

    setIsEditing(false);
  };

  const handleInsert = (handout: PatientHandout) => {
    if (!onInsertAdvice) return;
    const bullets = handout.adviceBullets.map((b) => `• ${b}`).join("\n");
    onInsertAdvice(bullets);
    toast.success(`"${handout.titleBn}" পরামর্শ যুক্ত করা হয়েছে`);
  };

  const handlePrint = () => {
    window.print();
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {language === "bn" ? "রোগীর নির্দেশিকা ও স্বাস্থ্য শিক্ষা" : "Patient Guidelines & Health Education"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {language === "bn"
                ? "রোগীর জন্য জীবনযাপন ও খাদ্যাভ্যাস নির্দেশিকা তৈরি করুন, সম্পাদন করুন, অথবা প্রেসক্রিপশনে যুক্ত করুন"
                : "Create, edit, or attach lifestyle and dietary guidelines for patients directly to prescriptions"}
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setLanguage("bn")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      language === "bn" ? "bg-emerald-600 text-white font-semibold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    বাংলা
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      language === "en" ? "bg-emerald-600 text-white font-semibold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    English
                  </button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                  className="gap-1.5 text-xs text-slate-700 border-slate-200 hover:text-emerald-700 hover:border-emerald-300"
                  title={language === "bn" ? "এই নির্দেশিকা সম্পাদনা করুন" : "Edit this guideline"}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {language === "bn" ? "সম্পাদনা" : "Edit"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteHandout(selectedHandout.id)}
                  className="gap-1 text-xs text-slate-500 border-slate-200 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                  title={language === "bn" ? "এই নির্দেশিকা মুছে ফেলুন" : "Delete this guideline"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {language === "bn" ? "মুছুন" : "Delete"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-1.5 text-xs text-slate-700 border-slate-200"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {language === "bn" ? "প্রিন্ট লিফলেট" : "Print Leaflet"}
                </Button>
              </>
            )}

            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="gap-1 text-xs text-slate-600 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
                {language === "bn" ? "বাতিল করুন" : "Cancel"}
              </Button>
            )}
          </div>
        </div>

        {/* Content Body: Sidebar list + Detail / Editor */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Handout List Sidebar */}
          <div className="md:col-span-4 p-3 overflow-y-auto space-y-3 bg-slate-50/40 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 pt-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {language === "bn" ? "রোগ নির্দেশিকা তালিকা" : "Guidelines List"}
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleStartCreate}
                  className="h-7 px-2.5 text-[11px] font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 gap-1 shadow-2xs"
                  title={language === "bn" ? "নতুন নির্দেশিকা লিখুন" : "Create new guideline"}
                >
                  <Plus className="h-3.5 w-3.5 text-slate-600" />
                  {language === "bn" ? "নতুন লিখুন" : "New"}
                </Button>
              </div>

              <div className="space-y-1.5">
                {handouts.map((h) => {
                  const isSelected = selectedHandout?.id === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        setSelectedHandoutId(h.id);
                        setIsEditing(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                        isSelected && !isEditing
                          ? "bg-white border-slate-900 shadow-sm ring-1 ring-slate-900/10"
                          : isSelected && isEditing
                          ? "bg-slate-50 border-slate-700"
                          : "bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {language === "bn" ? h.titleBn : h.titleEn}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
                          {h.badge}
                        </span>
                        {h.isCustom && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            Custom
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Reset to defaults */}
            <div className="pt-3 border-t border-slate-200/60 px-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>মোট {handouts.length}টি নির্দেশিকা</span>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-medium transition-colors"
                title="পূর্বনির্ধারিত নির্দেশিকাগুলো ফিরিয়ে আনুন"
              >
                <RotateCcw className="h-3 w-3" />
                মূল তালিকায় রিসেট
              </button>
            </div>
          </div>

          {/* Right Panel: Editor Form OR Leaflet Printable Preview */}
          {isEditing ? (
            <div className="md:col-span-8 p-6 overflow-y-auto bg-white flex flex-col justify-between">
              <form onSubmit={handleSaveForm} className="space-y-4">
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-emerald-600" />
                      {editingHandoutId ? "নির্দেশিকা সম্পাদনা করুন (Edit Handout)" : "নতুন নির্দেশিকা লিখুন (Write Printable Handout)"}
                    </h4>
                    <p className="text-xs text-slate-500">
                      রোগীর জন্য জীবনযাপন, ডায়েট ও প্রতিরোধমূলক পরামর্শ লিফলেট তৈরি করুন
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="h-8 text-xs text-slate-500 hover:text-slate-800"
                  >
                    <X className="h-4 w-4 mr-1" />
                    বাতিল
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Bengali Title */}
                  <div>
                    <Label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      নির্দেশিকার শিরোনাম (বাংলা) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      required
                      placeholder="যেমন: ফ্যাটি লিভার ও খাদ্যাভ্যাস"
                      value={formTitleBn}
                      onChange={(e) => setFormTitleBn(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* English Title */}
                  <div>
                    <Label className="text-xs font-semibold text-slate-700 mb-1">
                      Title (English - Optional)
                    </Label>
                    <Input
                      type="text"
                      placeholder="e.g. Fatty Liver & Dietary Protocol"
                      value={formTitleEn}
                      onChange={(e) => setFormTitleEn(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Department / Category Badge */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>বিভাগ / ক্যাটাগরি (Badge)</span>
                    <span className="text-[10px] text-slate-400 font-normal">যেমন: গ্যাস্ট্রো, মেডিসিন, কার্ডিওলজি</span>
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="text"
                      placeholder="ক্যাটাগরি নাম (e.g. মেডিসিন)"
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      className="h-8 text-xs max-w-[200px]"
                    />
                    <div className="flex flex-wrap gap-1">
                      {["মেডিসিন", "কার্ডিওলজি", "ডায়াবেটিস", "গ্যাস্ট্রো", "শিশু", "ডায়েট", "সাধারণ"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormBadge(cat)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors border ${
                            formBadge === cat
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Detailed Leaflet Guidelines (Bengali) */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>বিস্তারিত স্বাস্থ্য শিক্ষা ও রোগীর জীবনযাপনের নির্দেশনা (বাংলা) <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-slate-400 font-normal">প্রতিটি নির্দেশনা নতুন লাইনে (Enter দিয়ে) লিখুন</span>
                  </Label>
                  <Textarea
                    required
                    rows={5}
                    placeholder={"খাবার নিয়ন্ত্রণ: মিষ্টি, চিনি ও অতিরিক্ত তৈলাক্ত খাবার সম্পূর্ণরূপে বর্জন করুন।\nশারীরিক ব্যায়াম: প্রতিদিন অন্তত ৩০ মিনিট ঘাম ঝরিয়ে দ্রুত হাঁটুন।\nওষুধের নিয়ম: ডাক্তারের পরামর্শ ব্যতিরেকে ওষুধ সেবন বন্ধ করবেন না।\nসতর্কতা: কোনো সমস্যা বা পার্শ্বপ্রতিক্রিয়া দেখা দিলে অনতিবিলম্বে যোগাযোগ করুন।"}
                    value={formLeafletBn}
                    onChange={(e) => setFormLeafletBn(e.target.value)}
                    className="text-xs font-mono leading-relaxed resize-y min-h-[120px]"
                  />
                </div>

                {/* Summary Advice Bullets for Prescription */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>প্রেসক্রিপশন পরামর্শ বুলেটস (প্রেসক্রিপশনে যুক্ত করার জন্য সংক্ষেপ)</span>
                    <span className="text-[10px] text-amber-700 font-medium">ঐচ্ছিক, ফাঁকা রাখলে ওপরের নির্দেশনা থেকে স্বয়ংক্রিয়ভাবে তৈরি হবে</span>
                  </Label>
                  <Textarea
                    rows={3}
                    placeholder={"• তেল ও চর্বিজাতীয় খাবার কম খান\n• প্রতিদিন ৩০ মিনিট হাঁটুন\n• ডাক্তারের পরামর্শ ছাড়া ওষুধ বন্ধ করবেন না"}
                    value={formAdviceBullets}
                    onChange={(e) => setFormAdviceBullets(e.target.value)}
                    className="text-xs font-mono leading-relaxed resize-y min-h-[70px]"
                  />
                </div>

                {/* Form Bottom Actions */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="text-xs border-slate-300"
                  >
                    বাতিল (Cancel)
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm font-semibold"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {editingHandoutId ? "আপডেট সংরক্ষণ করুন (Save Changes)" : "নতুন নির্দেশিকা সংরক্ষণ করুন (Save Handout)"}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="md:col-span-8 p-6 overflow-y-auto bg-white flex flex-col justify-between">
              <div id="patient-handout-print-area" className="space-y-6">
                {/* Doctor / Hospital Header for printable version */}
                <div className="border-b border-slate-200 pb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {hospitalName || "HealthFlow Specialist Consultation"}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-700">
                      {doctorName || "Consultant Physician"} {doctorSpecialty && `• ${doctorSpecialty}`}
                    </p>
                    {bmdcNumber && (
                      <p className="text-[11px] text-slate-500">BMDC Reg. No: {bmdcNumber}</p>
                    )}
                  </div>
                  {patientName && (
                    <div className="text-right text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                      <p className="text-slate-400 text-[10px]">রোগীর নাম</p>
                      <p className="font-semibold text-slate-800">{patientName}</p>
                    </div>
                  )}
                </div>

                {/* Title Banner */}
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
                  <h4 className="text-base font-bold text-emerald-950">
                    {language === "bn" ? selectedHandout.titleBn : selectedHandout.titleEn}
                  </h4>
                  <p className="text-xs text-emerald-700">
                    {language === "bn" ? "স্বাস্থ্যকর জীবনযাপন ও ঘরে রোগ মোকাবিলার পরামর্শ" : "Clinical lifestyle and disease mitigation recommendations"}
                  </p>
                </div>

                {/* Main Guidelines */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {language === "bn" ? "বিস্তারিত নির্দেশনাবলী ও সচেতনতা" : "Clinical Education & Guidelines"}
                  </h5>
                  <ul className="space-y-2.5">
                    {(language === "bn" ? selectedHandout.fullLeafletBn : selectedHandout.fullLeafletEn).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                        <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="flex-1">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Summary Advice Bullets */}
                <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 space-y-2">
                  <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-amber-600" />
                    {language === "bn" ? "প্রেসক্রিপশন পরামর্শ বুলেটস (দ্রুত যুক্ত করার জন্য)" : "Prescription Advice Bullets (Quick Insert)"}
                  </p>
                  <div className="text-[11px] text-amber-950 space-y-1">
                    {selectedHandout.adviceBullets.map((bullet, i) => (
                      <p key={i}>• {bullet}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 mt-4">
                <span className="text-xs text-slate-400">
                  {language === "bn"
                    ? "প্রেসক্রিপশন বা আলাদা লিফলেট হিসেবে রোগীকে প্রদান করুন"
                    : "Provide to patient as prescription advice or a separate leaflet"}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStartEdit}
                    className="gap-1.5 text-xs border-slate-300 text-slate-700 hover:text-emerald-700 hover:border-emerald-300"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {language === "bn" ? "সম্পাদনা" : "Edit"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="gap-1.5 text-xs border-slate-300"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    {language === "bn" ? "প্রিন্ট করুন" : "Print"}
                  </Button>
                  {onInsertAdvice && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleInsert(selectedHandout)}
                      className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {language === "bn"
                        ? "পরামর্শ হিসেবে যুক্ত করুন (Insert Advice)"
                        : "Insert Advice to Prescription"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

