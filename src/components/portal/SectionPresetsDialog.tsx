"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Check,
  Plus,
  Search,
  Trash2,
  Edit2,
  BookmarkPlus,
  ClipboardList,
  ClipboardCheck,
  FlaskConical,
  Lightbulb,
  Stethoscope,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "next-intl";

export type SectionType = "complaints" | "examination" | "investigation" | "advice" | "diagnosis";

export type SectionPreset = {
  id: string;
  name: string;
  nameBn?: string;
  items: string[];
  isCustom?: boolean;
};

const DEFAULT_PRESETS: Record<SectionType, SectionPreset[]> = {
  complaints: [
    {
      id: "comp-viral-flu",
      name: "Viral Fever & Flu",
      nameBn: "ভাইরাল জ্বর ও সর্দি-কাশি",
      items: [
        "Fever: 3 days",
        "Runny nose: 3 days",
        "Dry cough: 3 days",
        "Body ache & malaise: 2 days",
      ],
    },
    {
      id: "comp-ge",
      name: "Acute Gastroenteritis / Diarrhea",
      nameBn: "পাতলা পায়খানা ও পেটের ব্যথা",
      items: [
        "Loose watery stool: 2 days (4–5 times/day)",
        "Cramping abdominal pain: 2 days",
        "Nausea and vomiting: 3 episodes",
      ],
    },
    {
      id: "comp-dyspepsia",
      name: "Dyspepsia & Hyperacidity",
      nameBn: "গ্যাস্ট্রিক ও অম্বল",
      items: [
        "Burning epigastric pain: 1 week",
        "Bloating and indigestion: 2 weeks",
        "Acid regurgitation after meals",
      ],
    },
    {
      id: "comp-htn",
      name: "Hypertension Symptoms",
      nameBn: "উচ্চ রক্তচাপ ও মাথাব্যথা",
      items: [
        "Occipital headache: 5 days",
        "Neck stiffness & mild dizziness",
        "Sleep disturbance & restlessness",
      ],
    },
    {
      id: "comp-dm",
      name: "Diabetes Initial Symptoms",
      nameBn: "ডায়াবেটিসের প্রাথমিক লক্ষণ",
      items: [
        "Excessive thirst (Polydipsia): 3 weeks",
        "Frequent urination (Polyuria): 3 weeks",
        "Generalized weakness and fatigue: 1 month",
      ],
    },
    {
      id: "comp-asthma",
      name: "Asthma / Respiratory Distress",
      nameBn: "হাঁপানি ও শ্বাসকষ্ট",
      items: [
        "Shortness of breath on exertion: 3 days",
        "Wheezing sound from chest",
        "Nocturnal cough with scanty sputum",
      ],
    },
    {
      id: "comp-uti",
      name: "Urinary Tract Infection (UTI)",
      nameBn: "প্রস্রাবে জ্বালাপোড়া ও প্রস্রাবের বেগ",
      items: [
        "Burning sensation during urination: 3 days",
        "Increased urinary frequency",
        "Lower abdominal discomfort",
      ],
    },
  ],
  examination: [
    {
      id: "exam-normal",
      name: "Normal Routine Examination",
      nameBn: "সাধারণ সুস্থ শারীরিক পরীক্ষা",
      items: [
        "Anemia: Absent, Jaundice: Absent, Cyanosis: Absent",
        "Pulse: 78 bpm regular, BP: 120/80 mmHg",
        "Heart: Normal S1 S2 heard, no murmurs",
        "Lungs: Bilateral vesicular breath sounds, chest clear",
        "Abdomen: Soft, non-tender, no organomegaly",
      ],
    },
    {
      id: "exam-urti",
      name: "URTI / Pharyngitis Examination",
      nameBn: "সর্দি ও গলার শারীরিক পরীক্ষা",
      items: [
        "Pharynx: Congested, tonsillar enlargement absent",
        "Cervical lymph nodes: Non-tender, not palpable",
        "Chest: Normal vesicular breath sounds, no rhonchi",
      ],
    },
    {
      id: "exam-ge",
      name: "Gastroenteritis Abdominal Exam",
      nameBn: "পেট ও পেটের পীড়া পরীক্ষা",
      items: [
        "Dehydration: Mild, Tongue: Moist",
        "Abdomen: Soft, mild epigastric & umbilical tenderness",
        "Bowel sounds: Hyperactive / Increased",
      ],
    },
    {
      id: "exam-cardio",
      name: "Cardiovascular & BP Examination",
      nameBn: "হৃদযন্ত্র ও প্রেসার পরীক্ষা",
      items: [
        "Pulse: Regular, volume normal",
        "Heart: S1 S2 normal, no murmurs",
        "Bilateral pedal edema: Absent",
        "JVP: Not raised",
      ],
    },
    {
      id: "exam-pedia",
      name: "Pediatric General Examination",
      nameBn: "শিশুর সাধারণ শারীরিক পরীক্ষা",
      items: [
        "Alert, active, and playful",
        "Anterior fontanelle: Level and pulsating",
        "Throat: Clear, Ears: Normal bilateral tympanic membranes",
        "Chest: Equal bilateral air entry, clear",
      ],
    },
  ],
  investigation: [
    {
      id: "inv-fever",
      name: "Fever & Infection Panel",
      nameBn: "জ্বর ও সংক্রমণের পরীক্ষা প্যানেল",
      items: [
        "Complete Blood Count (CBC) with ESR",
        "Urine Routine & Microscopic Exam (R/M/E)",
        "Dengue NS1 Antigen (if fever < 5 days)",
        "Serum Electrolytes (Na+, K+, Cl-)",
      ],
    },
    {
      id: "inv-dm",
      name: "Diabetic Complete Panel",
      nameBn: "ডায়াবেটিস সম্পূর্ণ প্যানেল",
      items: [
        "Fasting Blood Sugar (FBS)",
        "2 Hours Post-Prandial Glucose (2HABF)",
        "HbA1c (Glycated Hemoglobin)",
        "Serum Creatinine",
        "Lipid Profile",
      ],
    },
    {
      id: "inv-cardiac",
      name: "Hypertension & Cardiac Panel",
      nameBn: "উচ্চ রক্তচাপ ও হার্ট প্রোফাইল",
      items: [
        "Electrocardiogram (ECG) 12-Lead",
        "Serum Creatinine",
        "Lipid Profile (Cholesterol, TG, HDL, LDL)",
        "Serum Electrolytes",
        "Chest X-Ray P/A View",
      ],
    },
    {
      id: "inv-liver-gi",
      name: "Liver & Gastro Profile",
      nameBn: "লিভার ও পেটের আল্ট্রাসনোগ্রাম প্রোফাইল",
      items: [
        "Serum Bilirubin (Total & Direct)",
        "SGPT (ALT)",
        "SGOT (AST)",
        "Serum Alkaline Phosphatase",
        "Ultrasonography of Whole Abdomen",
      ],
    },
    {
      id: "inv-renal",
      name: "Renal Function Profile",
      nameBn: "কিডনি কার্যক্ষমতা পরীক্ষা",
      items: [
        "Serum Creatinine",
        "Blood Urea Nitrogen (BUN)",
        "Urine R/M/E with Microalbumin",
        "Serum Electrolytes",
        "USG of KUB Region",
      ],
    },
    {
      id: "inv-anc",
      name: "Antenatal Screening Panel",
      nameBn: "গর্ভকালীন নিয়মিত পরীক্ষা প্যানেল",
      items: [
        "Complete Blood Count (CBC)",
        "Blood Grouping & Rh Factor",
        "Blood Glucose (RBS / Fasting)",
        "Urine R/M/E",
        "HBsAg (Screening)",
        "USG of Pregnancy Profile",
      ],
    },
  ],
  advice: [
    {
      id: "adv-fever",
      name: "Viral Fever & Flu Care",
      nameBn: "জ্বর ও সর্দি-কাশির যত্ন",
      items: [
        "পর্যাপ্ত পরিমাণে কুসুম গরম পানি, স্যুপ ও তরল খাবার গ্রহণ করুন।",
        "দিনে ২-৩ বার গরম পানির ভাপ (Steam Inhalation) নিন।",
        "কুসুম গরম লবণ-পানি দিয়ে দিনে ৩-৪ বার কুলকুচি (Gargle) করুন।",
        "ঠান্ডা পানি, আইসক্রিম ও ধুলোবালি এড়িয়ে চলুন।",
        "পর্যাপ্ত বিশ্রাম নিন এবং প্রয়োজন ছাড়া বাইরে যাওয়া পরিহার করুন।",
      ],
    },
    {
      id: "adv-diarrhea",
      name: "Diarrhea & ORS Instructions",
      nameBn: "ডায়রিয়া ও খাবার স্যালাইনের নিয়ম",
      items: [
        "প্রতিবার পাতলা পায়খানার পর কমপক্ষে ১ গ্লাস খাবার স্যালাইন (ORS) খান।",
        "সহজপাচ্য নরম খাবার যেমন জাউ ভাত, কাঁচকলা, নরম খিচুড়ি খান।",
        "অতিরিক্ত তেল, মশলা ও বাইরের খোলা খাবার পরিহার করুন।",
        "খাবার আগে এবং শৌচাগার ব্যবহারের পর ভালো করে সাবান দিয়ে হাত ধুয়ে নিন।",
        "প্রসাবের পরিমাণ কমে গেলে বা অতিরিক্ত দুর্বল লাগলে দ্রুত চিকিৎসকের কাছে আসুন।",
      ],
    },
    {
      id: "adv-dm",
      name: "Diabetes Diet & Exercise",
      nameBn: "ডায়াবেটিস খাদ্য ও জীবনযাপন",
      items: [
        "চিনি, মিষ্টি, কোমল পানীয় ও মিষ্টি ফল পুরোপুরি বর্জন করুন।",
        "প্রতিদিন অন্তত ৩০-৪০ মিনিট নিয়ম করে দ্রুত হাঁটুন।",
        "খাবারের প্লেটে ভাতের পরিমাণ কমিয়ে সবুজ শাকসবজি ও সালাদের পরিমাণ বাড়ান।",
        "সপ্তাহে অন্তত একবার খালি পেটে ও খাবার ২ ঘণ্টা পর গ্লুকোজ মেপে সংরক্ষণ করুন।",
        "কখনো খালি পেটে ডায়াবেটিসের ওষুধ বা ইনসুলিন গ্রহণ করবেন না।",
      ],
    },
    {
      id: "adv-htn",
      name: "Hypertension & Heart Care",
      nameBn: "উচ্চ রক্তচাপ ও হার্টের সতর্কতা",
      items: [
        "ভাতের সাথে অতিরিক্ত কাঁচা লবণ খাওয়া এবং আচার-লবণাক্ত খাবার সম্পূর্ণ নিষেধ।",
        "ধূমপান, জর্দা, গুল ও তামাকজাত দ্রব্য সম্পূর্ণ বর্জন করুন।",
        "খাসির মাংস, গরুর চর্বি, চিংড়ি ও ডুবোতেলে ভাজা খাবার এড়িয়ে চলুন।",
        "সপ্তাহে অন্তত একবার রক্তচাপ মাপুন এবং চার্ট বজায় রাখুন।",
        "প্রতিদিন অন্তত ৭-৮ ঘণ্টা পর্যাপ্ত ঘুমান এবং মানসিক চাপ কমান।",
      ],
    },
    {
      id: "adv-gastric",
      name: "Peptic Ulcer / Dyspepsia Advice",
      nameBn: "গ্যাস্ট্রিক ও এসিডিটি নিয়মাবলী",
      items: [
        "নির্দিষ্ট সময়ে খাবার গ্রহণ করুন, দীর্ঘক্ষণ পেট খালি রাখবেন না।",
        "ভাজাপোড়া, অতিরিক্ত তেল, ঝাল ও তৈলাক্ত খাবার খাওয়া বন্ধ করুন।",
        "রাতের খাবারের অন্তত ২ ঘণ্টা পর বিছানায় ঘুমাতে যাবেন।",
        "অতিরিক্ত চা, কফি এবং ধূমপান পরিহার করুন।",
      ],
    },
  ],
  diagnosis: [
    {
      id: "diag-viral-flu",
      name: "Acute Viral Illness & Flu",
      nameBn: "তীব্র ভাইরাল জ্বর ও সর্দি-কাশি",
      items: [
        "Acute Viral Fever",
        "Upper Respiratory Tract Infection (URTI)",
      ],
    },
    {
      id: "diag-ge",
      name: "Acute Gastroenteritis",
      nameBn: "তীব্র গ্যাস্ট্রোএন্টারাইটিস / ডায়রিয়া",
      items: [
        "Acute Gastroenteritis (AGE)",
        "Mild Dehydration",
      ],
    },
    {
      id: "diag-typhoid",
      name: "Enteric Fever / Typhoid",
      nameBn: "টাইফয়েড / এন্টারিক ফিভার",
      items: [
        "Enteric Fever (Typhoid)",
        "Acute Febrile Illness",
      ],
    },
    {
      id: "diag-dengue",
      name: "Dengue Fever",
      nameBn: "ডেঙ্গু জ্বর (সম্ভাব্য)",
      items: [
        "Dengue Fever (Probable)",
        "Febrile Syndrome without Warning Signs",
      ],
    },
    {
      id: "diag-htn",
      name: "Hypertension & Dyslipidemia",
      nameBn: "উচ্চ রক্তচাপ ও ডিসলিপিডেমিয়া",
      items: [
        "Essential Hypertension (Stage-1)",
        "Dyslipidemia",
      ],
    },
    {
      id: "diag-dm",
      name: "Type 2 Diabetes Mellitus",
      nameBn: "টাইপ ২ ডায়াবেটিস মেলাইটাস",
      items: [
        "Type 2 Diabetes Mellitus (T2DM)",
        "Diabetic Peripheral Neuropathy (Early)",
      ],
    },
    {
      id: "diag-gerd-pud",
      name: "GERD & Peptic Ulcer Disease",
      nameBn: "গ্যাস্ট্রাইটিস, জিইআরডি ও পেপটিক আলসার",
      items: [
        "Gastroesophageal Reflux Disease (GERD)",
        "Peptic Ulcer Disease (PUD)",
        "Non-Ulcer Dyspepsia",
      ],
    },
    {
      id: "diag-asthma",
      name: "Bronchial Asthma & Allergy",
      nameBn: "ব্রঙ্কিয়াল অ্যাজমা ও অ্যালার্জি",
      items: [
        "Bronchial Asthma (Acute / Persistent)",
        "Allergic Rhinitis",
      ],
    },
    {
      id: "diag-uti",
      name: "Urinary Tract Infection (UTI)",
      nameBn: "ইউরিনারি ট্র্যাক্ট ইনফেকশন (ইউটিআই)",
      items: [
        "Acute Urinary Tract Infection (UTI)",
        "Cystitis",
      ],
    },
    {
      id: "diag-copd",
      name: "COPD / Chronic Bronchitis",
      nameBn: "সিওপিডি ও ক্রনিক ব্রঙ্কাইটিস",
      items: [
        "Chronic Obstructive Pulmonary Disease (COPD)",
        "Acute Exacerbation of COPD (AECOPD)",
      ],
    },
    {
      id: "diag-oa",
      name: "Osteoarthritis & Musculoskeletal Pain",
      nameBn: "অস্টিওআর্থ্রাইটিস ও কোমর-হাঁটু ব্যথা",
      items: [
        "Osteoarthritis (Knee Joint)",
        "Mechanical Lower Back Pain / Lumbar Spondylosis",
      ],
    },
    {
      id: "diag-skin",
      name: "Allergic Dermatitis & Eczema",
      nameBn: "অ্যালার্জিক চর্মরোগ ও একজিমা",
      items: [
        "Allergic Contact Dermatitis",
        "Eczematous Dermatitis",
        "Tinea Corporis",
      ],
    },
    {
      id: "diag-anemia",
      name: "Iron Deficiency Anemia",
      nameBn: "রক্তস্বল্পতা (আয়রন ঘাটতি)",
      items: [
        "Iron Deficiency Anemia (IDA)",
        "General Debility / Weakness",
      ],
    },
  ],
};

const SECTION_CONFIG: Record<
  SectionType,
  {
    titleEn: string;
    titleBn: string;
    icon: typeof ClipboardList;
    itemLabel: string;
  }
> = {
  complaints: {
    titleEn: "Chief Complaints Presets",
    titleBn: "প্রধান উপসর্গের প্রিসেটসমূহ",
    icon: ClipboardList,
    itemLabel: "Complaint",
  },
  examination: {
    titleEn: "Examination Presets",
    titleBn: "শারীরিক পরীক্ষার প্রিসেটসমূহ",
    icon: ClipboardCheck,
    itemLabel: "Finding",
  },
  investigation: {
    titleEn: "Investigation Panels & Presets",
    titleBn: "ল্যাব পরীক্ষার প্রিসেট ও প্যানেল",
    icon: FlaskConical,
    itemLabel: "Test",
  },
  advice: {
    titleEn: "General Advice Presets",
    titleBn: "পরামর্শ ও নির্দেশিকার প্রিসেটসমূহ",
    icon: Lightbulb,
    itemLabel: "Instruction",
  },
  diagnosis: {
    titleEn: "Diagnosis Presets",
    titleBn: "রোগ নির্ণয় / ডায়াগনোসিস প্রিসেটসমূহ",
    icon: Stethoscope,
    itemLabel: "Diagnosis",
  },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionType: SectionType;
  currentItems?: string[];
  onApplyItems: (items: string[], mode: "append" | "replace") => void;
};

export const SectionPresetsDialog = ({
  open,
  onOpenChange,
  sectionType,
  currentItems = [],
  onApplyItems,
}: Props) => {
  const locale = useLocale();
  const isBn = locale === "bn";
  const config = SECTION_CONFIG[sectionType];
  const Icon = config.icon;

  const storageKey = `hf.presets.${sectionType}`;

  const [customPresets, setCustomPresets] = useState<SectionPreset[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Create / Edit mode
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetFormName, setPresetFormName] = useState("");
  const [presetFormItemsText, setPresetFormItemsText] = useState("");

  // Load custom presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setCustomPresets(JSON.parse(stored));
      }
    } catch {}
  }, [open, storageKey]);

  const allPresets = useMemo(() => {
    const defaults = DEFAULT_PRESETS[sectionType] || [];
    return [...customPresets, ...defaults];
  }, [customPresets, sectionType]);

  // Set default selected preset on open or presets change
  useEffect(() => {
    if (open && allPresets.length > 0) {
      const firstId = allPresets[0].id;
      setSelectedPresetId(firstId);
      setSelectedItems(allPresets[0].items);
      setIsCreatingNew(false);
      setEditingPresetId(null);
    }
  }, [open, allPresets]);

  const filteredPresets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPresets;
    return allPresets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameBn && p.nameBn.includes(q)) ||
        p.items.some((item) => item.toLowerCase().includes(q))
    );
  }, [allPresets, search]);

  const selectedPreset = useMemo(() => {
    return (
      allPresets.find((p) => p.id === selectedPresetId) ||
      filteredPresets[0] ||
      null
    );
  }, [allPresets, selectedPresetId, filteredPresets]);

  // When selected preset changes, select all its items by default
  const handleSelectPreset = (p: SectionPreset) => {
    setSelectedPresetId(p.id);
    setSelectedItems(p.items);
    setIsCreatingNew(false);
    setEditingPresetId(null);
  };

  const handleToggleItem = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSelectAll = () => {
    if (selectedPreset) {
      setSelectedItems(selectedPreset.items);
    }
  };

  const handleDeselectAll = () => {
    setSelectedItems([]);
  };

  // Save Current Items from Prescription as a Preset
  const handleSaveCurrentAsPreset = () => {
    if (!currentItems || currentItems.length === 0) {
      toast.error(
        isBn
          ? "বর্তমান সেকশনে সেভ করার মতো কোনো তথ্য নেই"
          : `Current ${config.itemLabel.toLowerCase()}s list is empty`
      );
      return;
    }
    setPresetFormName(isBn ? "আমার নতুন টেমপ্লেট" : "My Custom Preset");
    setPresetFormItemsText(currentItems.join("\n"));
    setIsCreatingNew(true);
    setEditingPresetId(null);
  };

  // Start editing a custom preset
  const handleStartEdit = (p: SectionPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPresetId(p.id);
    setPresetFormName(p.name);
    setPresetFormItemsText(p.items.join("\n"));
    setIsCreatingNew(true);
  };

  // Save or update custom preset
  const handleSavePresetForm = () => {
    if (!presetFormName.trim()) {
      toast.error(isBn ? "টেমপ্লেটের নাম দিন" : "Please give your preset a name");
      return;
    }
    const items = presetFormItemsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (items.length === 0) {
      toast.error(isBn ? "কমপক্ষে একটি লাইন যোগ করুন" : "Please add at least one item");
      return;
    }

    if (editingPresetId) {
      // Update existing
      const next = customPresets.map((p) =>
        p.id === editingPresetId
          ? { ...p, name: presetFormName.trim(), items }
          : p
      );
      setCustomPresets(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        toast.success(isBn ? "টেমপ্লেট আপডেট করা হয়েছে" : "Preset updated");
      } catch {}
      setSelectedPresetId(editingPresetId);
      setSelectedItems(items);
    } else {
      // Create new
      const created: SectionPreset = {
        id: `custom-${Date.now()}`,
        name: presetFormName.trim(),
        items,
        isCustom: true,
      };
      const next = [created, ...customPresets];
      setCustomPresets(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        toast.success(
          isBn ? "নতুন টেমপ্লেট সংরক্ষিত হয়েছে" : "New preset saved to your library"
        );
      } catch {}
      setSelectedPresetId(created.id);
      setSelectedItems(items);
    }

    setIsCreatingNew(false);
    setEditingPresetId(null);
  };

  // Delete custom preset
  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = customPresets.filter((p) => p.id !== id);
    setCustomPresets(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      toast.success(isBn ? "টেমপ্লেট মুছে ফেলা হয়েছে" : "Preset removed");
      if (selectedPresetId === id) {
        setSelectedPresetId(DEFAULT_PRESETS[sectionType][0]?.id || "");
      }
    } catch {}
  };

  const applySelected = (mode: "append" | "replace") => {
    if (selectedItems.length === 0) {
      toast.error(isBn ? "কমপক্ষে একটি আইটেম নির্বাচন করুন" : "Please select at least one item");
      return;
    }
    onApplyItems(selectedItems, mode);
    toast.success(
      isBn
        ? `${selectedItems.length}টি তথ্য যুক্ত হয়েছে`
        : `Added ${selectedItems.length} items to ${config.titleEn}`,
      { icon: "✨" }
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[88vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg text-primary flex items-center gap-2">
                  {isBn ? config.titleBn : config.titleEn}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {isBn
                    ? "প্রস্তুতকৃত ক্লিনিক্যাল টেমপ্লেট থেকে দ্রুত প্রেসক্রিপশনে যুক্ত করুন অথবা নিজের টেমপ্লেট তৈরি ও সম্পাদনা করুন"
                    : `Quickly insert clinical ${config.itemLabel.toLowerCase()}s or create & edit your own templates`}
                </DialogDescription>
              </div>
            </div>

            {/* Save current entries as preset */}
            {currentItems && currentItems.length > 0 && !isCreatingNew && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveCurrentAsPreset}
                className="gap-1.5 text-xs border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              >
                <BookmarkPlus className="h-3.5 w-3.5 text-emerald-600" />
                {isBn ? "বর্তমান লেখাটি সেভ করুন" : "Save Current as Preset"}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Presets Sidebar */}
          <div className="w-64 border-r border-border/60 flex flex-col bg-slate-50/40 shrink-0">
            <div className="p-3 border-b border-border/40">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isBn ? "টেমপ্লেট খুঁজুন..." : "Search presets..."}
                  className="pl-8 text-xs h-8 bg-white"
                />
              </div>
            </div>

            {/* Presets List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredPresets.map((p) => {
                const isSelected = p.id === selectedPresetId;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "hover:bg-slate-100 text-slate-800"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-1">
                      <div className="truncate font-medium">
                        {isBn && p.nameBn ? p.nameBn : p.name}
                      </div>
                      <div
                        className={`text-[10px] truncate mt-0.5 ${
                          isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {p.items.length} {isBn ? "টি আইটেম" : "items"}
                        {p.isCustom && (
                          <span className="ml-1 font-bold text-emerald-600">
                            • {isBn ? "কাস্টম" : "Custom"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Custom Preset Actions */}
                    {p.isCustom && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(p, e)}
                          title={isBn ? "সম্পাদনা করুন" : "Edit preset"}
                          className={`p-1 rounded hover:bg-black/10 ${
                            isSelected ? "text-white" : "text-slate-600"
                          }`}
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePreset(p.id, e)}
                          title={isBn ? "মুছে ফেলুন" : "Delete preset"}
                          className={`p-1 rounded hover:bg-rose-500 hover:text-white ${
                            isSelected ? "text-white" : "text-rose-600"
                          }`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredPresets.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-6">
                  {isBn ? "কোনো টেমপ্লেট পাওয়া যায়নি" : "No presets found"}
                </p>
              )}
            </div>

            {/* New Preset Button */}
            <div className="p-2 border-t border-border/40 bg-white">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPresetFormName("");
                  setPresetFormItemsText("");
                  setEditingPresetId(null);
                  setIsCreatingNew(true);
                }}
                className="w-full text-xs gap-1.5 border-dashed"
              >
                <Plus className="h-3.5 w-3.5" />
                {isBn ? "নতুন টেমপ্লেট তৈরি করুন" : "Create New Preset"}
              </Button>
            </div>
          </div>

          {/* Right Preview or Edit Form */}
          <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
            {isCreatingNew ? (
              // Create / Edit Form
              <div className="p-5 flex-1 flex flex-col overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    {editingPresetId
                      ? isBn
                        ? "টেমপ্লেট সম্পাদনা করুন"
                        : "Edit Custom Preset"
                      : isBn
                      ? "নতুন কাস্টম টেমপ্লেট তৈরি করুন"
                      : "Create New Custom Preset"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setEditingPresetId(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" /> {isBn ? "বাতিল" : "Cancel"}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {isBn ? "টেমপ্লেটের নাম" : "Preset Name"}
                  </label>
                  <Input
                    value={presetFormName}
                    onChange={(e) => setPresetFormName(e.target.value)}
                    placeholder={
                      isBn ? "যেমন: সাধারণ পেটের ব্যথা" : "e.g. Routine Fever Panel"
                    }
                    className="text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      {isBn ? "আইটেমসমূহ (প্রতি লাইনে একটি)" : "Items (One per line)"}
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {presetFormItemsText.split("\n").filter(Boolean).length}{" "}
                      {isBn ? "টি লাইন" : "lines"}
                    </span>
                  </div>
                  <textarea
                    value={presetFormItemsText}
                    onChange={(e) => setPresetFormItemsText(e.target.value)}
                    placeholder={
                      isBn
                        ? "প্রতি লাইনে একটি করে পরামর্শ বা পরীক্ষার নাম লিখুন..."
                        : "Enter each item on a separate line..."
                    }
                    rows={8}
                    className="flex-1 w-full p-3 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setEditingPresetId(null);
                    }}
                    className="text-xs"
                  >
                    {isBn ? "বাতিল" : "Cancel"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSavePresetForm}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {isBn ? "টেমপ্লেট সেভ করুন" : "Save Preset"}
                  </Button>
                </div>
              </div>
            ) : selectedPreset ? (
              // Items Preview & Selection
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border/40 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h4 className="font-semibold text-sm text-primary">
                      {isBn && selectedPreset.nameBn
                        ? selectedPreset.nameBn
                        : selectedPreset.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedItems.length} of {selectedPreset.items.length}{" "}
                      {isBn ? "টি নির্বাচিত" : "selected"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      {isBn ? "সব নির্বাচন করুন" : "Select All"}
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-xs text-muted-foreground hover:underline font-medium"
                    >
                      {isBn ? "মুছে দিন" : "Deselect"}
                    </button>
                  </div>
                </div>

                {/* Items Checkbox List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {selectedPreset.items.map((item, idx) => {
                    const isChecked = selectedItems.includes(item);
                    return (
                      <label
                        key={idx}
                        onClick={() => handleToggleItem(item)}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? "border-emerald-300 bg-emerald-50/50 text-slate-900 font-medium shadow-2xs"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by label onClick
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0"
                        />
                        <span className="flex-1 leading-relaxed">{item}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Footer Buttons */}
                <DialogFooter className="p-4 border-t border-border/60 bg-slate-50/80 flex items-center justify-between sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="text-xs text-slate-600"
                  >
                    {isBn ? "বাতিল" : "Cancel"}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applySelected("replace")}
                      disabled={selectedItems.length === 0}
                      className="text-xs border-slate-300 hover:bg-slate-100 text-slate-700 font-medium"
                      title={isBn ? "বর্তমান লেখা মুছে নতুনগুলো বসাবে" : "Replace current section entries"}
                    >
                      {isBn ? "রিপ্লেস করুন" : "Replace Existing"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => applySelected("append")}
                      disabled={selectedItems.length === 0}
                      className="bg-primary hover:bg-primary-glow text-primary-foreground text-xs font-semibold gap-1.5 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {isBn
                        ? `যুক্ত করুন (${selectedItems.length})`
                        : `Insert Selected (${selectedItems.length})`}
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-xs text-muted-foreground italic">
                {isBn ? "একটি টেমপ্লেট নির্বাচন করুন" : "Select a preset from the left"}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
