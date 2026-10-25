"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Check, Plus, Search, Trash2, Pill, FlaskConical, Lightbulb, Stethoscope, ChevronRight, BookmarkPlus } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "next-intl";

export type PresetMedicine = {
  name: string;
  dosage_form: string;
  dose: string;
  frequency: string;
  days: string;
  meal: string;
};

export type ClinicalPreset = {
  id: string;
  name: string;
  nameBn?: string;
  category: "General" | "Gastro" | "Respiratory" | "Cardio / Endocrine" | "ENT / Allergy" | "Custom";
  complaints?: string[];
  examination?: string[];
  investigation?: string[];
  diagnosis?: string[];
  medicines?: PresetMedicine[];
  advice?: string[];
  followUpDays?: number;
  isCustom?: boolean;
};

export const DEFAULT_PRESETS: ClinicalPreset[] = [
  {
    id: "preset-ge",
    name: "Acute Gastroenteritis / Diarrhea",
    nameBn: "তীব্র পাতলা পায়খানা ও পেটের পীড়া",
    category: "Gastro",
    complaints: ["Loose stool: 2 days", "Abdominal cramping: Intermittent", "Vomiting: 3 episodes"],
    examination: ["Dehydration: Mild", "Abdomen: Soft, mild epigastric tenderness", "Bowel sounds: Increased"],
    investigation: ["Stool R/E", "Serum Electrolytes"],
    diagnosis: ["Acute Gastroenteritis"],
    medicines: [
      { name: "Ciprofloxacin", dosage_form: "Tablet", dose: "500 mg", frequency: "1+0+1", days: "5 Days", meal: "After Meal" },
      { name: "Metronidazole", dosage_form: "Tablet", dose: "400 mg", frequency: "1+1+1", days: "5 Days", meal: "After Meal" },
      { name: "Oral Rehydration Salt (ORS)", dosage_form: "Oral Solution", dose: "1 packet", frequency: "After every loose stool", days: "3 Days", meal: "" },
      { name: "Zinc", dosage_form: "Tablet", dose: "20 mg", frequency: "0+0+1", days: "10 Days", meal: "After Meal" },
    ],
    advice: [
      "Drink plenty of boiled water and ORS solution after each motion.",
      "Eat light, easily digestible food (soft rice, green banana, soup).",
      "Avoid raw milk, spicy, and oily food.",
      "Wash hands thoroughly before meals and after using the toilet.",
    ],
    followUpDays: 5,
  },
  {
    id: "preset-urti",
    name: "Upper Respiratory Tract Infection (URTI)",
    nameBn: "সর্দি, কাশি ও সাধারণ ভাইরাল জ্বর",
    category: "Respiratory",
    complaints: ["Fever: 3 days", "Runny nose: 3 days", "Dry cough: 3 days", "Sore throat: 2 days"],
    examination: ["Pharynx: Congested, no tonsillar exudate", "Lungs: Bilateral normal vesicular breath sounds"],
    investigation: ["Complete Blood Count (CBC) with ESR"],
    diagnosis: ["Upper Respiratory Tract Infection (URTI)"],
    medicines: [
      { name: "Paracetamol", dosage_form: "Tablet", dose: "500 mg", frequency: "1+1+1+1", days: "3 Days", meal: "After Meal" },
      { name: "Fexofenadine", dosage_form: "Tablet", dose: "120 mg", frequency: "0+0+1", days: "7 Days", meal: "After Meal" },
      { name: "Dextromethorphan + Pseudoephedrine", dosage_form: "Syrup", dose: "2 tsp", frequency: "1+1+1", days: "5 Days", meal: "After Meal" },
    ],
    advice: [
      "Steam inhalation twice daily with warm water.",
      "Gargle with warm salt water 3–4 times daily.",
      "Drink warm fluids (ginger tea, soup, warm water).",
      "Rest and avoid cold beverages and dust.",
    ],
    followUpDays: 5,
  },
  {
    id: "preset-dm2",
    name: "Type 2 Diabetes Mellitus - Initial Control",
    nameBn: "টাইপ ২ ডায়াবেটিস প্রাথমিক নিয়ন্ত্রণ",
    category: "Cardio / Endocrine",
    complaints: ["Increased thirst & urination: 1 month", "General fatigue & weakness: 3 weeks"],
    examination: ["BMI: Overweight", "Systemic examination: Within normal limits"],
    investigation: ["HbA1c", "Fasting Blood Sugar (FBS)", "2 Hours Post-Prandial Glucose (2HABF)", "Lipid Profile", "Serum Creatinine"],
    diagnosis: ["Type 2 Diabetes Mellitus"],
    medicines: [
      { name: "Metformin", dosage_form: "Tablet", dose: "500 mg", frequency: "1+0+1", days: "1 Month", meal: "With Meal" },
    ],
    advice: [
      "Follow a strict diabetic diet: avoid sugar, sweets, cold drinks, and refined carbohydrates.",
      "Engage in brisk walking 30–45 minutes daily for at least 5 days a week.",
      "Record fasting and post-meal blood sugar levels once weekly in a logbook.",
      "Never skip meals or take medication on an empty stomach.",
    ],
    followUpDays: 30,
  },
  {
    id: "preset-htn",
    name: "Primary Essential Hypertension",
    nameBn: "উচ্চ রক্তচাপ (হাইপারটেনশন)",
    category: "Cardio / Endocrine",
    complaints: ["Occipital headache: 1 week", "Neck stiffness and mild dizziness"],
    examination: ["Blood Pressure: High", "Heart: Normal S1 S2, no murmur"],
    investigation: ["Electrocardiogram (ECG)", "Serum Creatinine", "Lipid Profile", "Urine R/M/E"],
    diagnosis: ["Essential Hypertension - Stage 1"],
    medicines: [
      { name: "Amlodipine", dosage_form: "Tablet", dose: "5 mg", frequency: "0+0+1", days: "1 Month", meal: "After Meal" },
    ],
    advice: [
      "Strict low-sodium diet (strictly avoid added/raw table salt and pickles).",
      "Engage in regular aerobic exercise and stress management.",
      "Monitor and record blood pressure weekly.",
      "Avoid smoking and reduce caffeine intake.",
    ],
    followUpDays: 15,
  },
  {
    id: "preset-pud",
    name: "Peptic Ulcer Disease / Dyspepsia",
    nameBn: "গ্যাস্ট্রিক ও এসিডিটি (পেপটিক আলসার)",
    category: "Gastro",
    complaints: ["Burning epigastric pain: 2 weeks", "Bloating and frequent belching", "Nausea after meals"],
    examination: ["Abdomen: Soft, mild epigastric tenderness on deep palpation"],
    investigation: ["Upper GI Endoscopy (if symptoms persist)", "Serum H. Pylori antibody"],
    diagnosis: ["Peptic Ulcer Disease / Dyspepsia"],
    medicines: [
      { name: "Esomeprazole", dosage_form: "Capsule", dose: "20 mg", frequency: "1+0+1", days: "14 Days", meal: "Before Meal" },
      { name: "Domperidone", dosage_form: "Tablet", dose: "10 mg", frequency: "1+1+1", days: "10 Days", meal: "Before Meal" },
      { name: "Antacid", dosage_form: "Oral Solution", dose: "2 tsp", frequency: "1+1+1", days: "7 Days", meal: "After Meal" },
    ],
    advice: [
      "Eat small, frequent meals at fixed times. Never stay hungry for long periods.",
      "Avoid spicy, oily, deep-fried, and acidic foods.",
      "Do not lie down immediately after dinner; maintain at least a 2-hour gap before sleep.",
      "Avoid smoking, alcohol, and excessive tea/coffee.",
    ],
    followUpDays: 15,
  },
];

const STORAGE_KEY = "hf.rx.custom_presets";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyPreset: (preset: ClinicalPreset, mode: "append" | "replace") => void;
  currentDraft?: {
    complaints: string[];
    examination: string[];
    investigation: string[];
    diagnosis: string[];
    medicines: PresetMedicine[];
    advice: string[];
  };
};

export const ClinicalPresetsDialog = ({ open, onOpenChange, onApplyPreset, currentDraft }: Props) => {
  const locale = useLocale();
  const isBn = locale === "bn";

  const [customPresets, setCustomPresets] = useState<ClinicalPreset[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>(DEFAULT_PRESETS[0].id);
  const [saveAsPresetOpen, setSaveAsPresetOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  // Load custom presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCustomPresets(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, [open]);

  const allPresets = useMemo(() => {
    return [...customPresets, ...DEFAULT_PRESETS];
  }, [customPresets]);

  const filteredPresets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPresets;
    return allPresets.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.nameBn && p.nameBn.includes(q)) ||
        p.category.toLowerCase().includes(q) ||
        p.diagnosis?.some(d => d.toLowerCase().includes(q))
    );
  }, [allPresets, search]);

  const selectedPreset = useMemo(() => {
    return allPresets.find(p => p.id === selectedPresetId) || filteredPresets[0] || null;
  }, [allPresets, selectedPresetId, filteredPresets]);

  const handleSaveCurrentAsPreset = () => {
    if (!newPresetName.trim()) {
      toast.error(isBn ? "টেমপ্লেটের একটি নাম দিন" : "Please give your preset a name");
      return;
    }
    if (!currentDraft || (currentDraft.medicines.length === 0 && currentDraft.complaints.length === 0)) {
      toast.error(isBn ? "সংরক্ষণ করার মতো কোনো তথ্য নেই" : "Current prescription is empty");
      return;
    }

    const created: ClinicalPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      category: "Custom",
      complaints: currentDraft.complaints,
      examination: currentDraft.examination,
      investigation: currentDraft.investigation,
      diagnosis: currentDraft.diagnosis,
      medicines: currentDraft.medicines,
      advice: currentDraft.advice,
      isCustom: true,
    };

    const next = [created, ...customPresets];
    setCustomPresets(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      toast.success(isBn ? "কাস্টম টেমপ্লেট সংরক্ষিত হয়েছে" : "Preset saved to your library");
      setSelectedPresetId(created.id);
      setNewPresetName("");
      setSaveAsPresetOpen(false);
    } catch {
      toast.error(isBn ? "সংরক্ষণ করা যায়নি" : "Failed to save preset");
    }
  };

  const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = customPresets.filter(p => p.id !== id);
    setCustomPresets(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      toast.success(isBn ? "টেমপ্লেট মুছে ফেলা হয়েছে" : "Custom preset removed");
      if (selectedPresetId === id) {
        setSelectedPresetId(DEFAULT_PRESETS[0].id);
      }
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-2xl text-primary">
                  {isBn ? "ক্লিনিক্যাল প্রেসক্রিপশন টেমপ্লেট" : "Clinical Rx Presets"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isBn
                    ? "সাধারণ রোগের দ্রুত প্রেসক্রিপশন প্রিসেট বেছে নিন বা নিজের তৈরি করুন।"
                    : "Apply standard 1-click clinical sets or save your own favorites."}
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveAsPresetOpen(v => !v)}
              className="rounded-full text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              {isBn ? "বর্তমান প্রেসক্রিপশন সংরক্ষণ" : "Save Current as Preset"}
            </Button>
          </div>

          {/* Quick save dialog dropdown */}
          {saveAsPresetOpen && (
            <div className="mt-4 p-3.5 rounded-xl bg-chip/50 border border-border/60 flex items-center gap-3">
              <Input
                placeholder={isBn ? "টেমপ্লেটের নাম লিখুন (যেমন: ডেঙ্গু প্রটোকল)..." : "Preset name (e.g., Pediatric Asthma)..."}
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                className="h-9 text-xs"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveCurrentAsPreset} className="h-9 text-xs shrink-0">
                {isBn ? "সংরক্ষণ করুন" : "Save Preset"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSaveAsPresetOpen(false)} className="h-9 text-xs shrink-0">
                {isBn ? "বাতিল" : "Cancel"}
              </Button>
            </div>
          )}
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] flex-1 overflow-hidden min-h-[420px]">
          {/* Preset List Sidebar */}
          <div className="border-r border-border/50 bg-chip/20 flex flex-col p-4 overflow-y-auto">
            <div className="relative mb-3">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={isBn ? "টেমপ্লেট খুঁজুন..." : "Search presets..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {filteredPresets.map(p => {
                const active = p.id === (selectedPreset?.id || selectedPresetId);
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPresetId(p.id)}
                    className={`group p-3 rounded-xl cursor-pointer transition-all border flex items-center justify-between text-left ${
                      active
                        ? "bg-card border-primary text-primary shadow-xs font-semibold"
                        : "border-transparent hover:bg-card/60 text-foreground/80 hover:text-foreground"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                          {p.category}
                        </span>
                        {p.isCustom && (
                          <span className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.2 rounded font-bold">
                            My Preset
                          </span>
                        )}
                      </div>
                      <p className="text-xs truncate font-medium mt-0.5">{isBn && p.nameBn ? p.nameBn : p.name}</p>
                    </div>

                    {p.isCustom ? (
                      <button
                        onClick={e => handleDeleteCustomPreset(p.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    ) : (
                      active && <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preset Detail Preview Pane */}
          <div className="p-6 overflow-y-auto flex flex-col">
            {selectedPreset ? (
              <div className="space-y-5 flex-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                      {selectedPreset.category}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {selectedPreset.medicines?.length ?? 0} medicines · {selectedPreset.advice?.length ?? 0} advice notes
                    </span>
                  </div>
                  <h3 className="font-display text-xl text-primary mt-1">
                    {isBn && selectedPreset.nameBn ? selectedPreset.nameBn : selectedPreset.name}
                  </h3>
                  {isBn && selectedPreset.nameBn && (
                    <p className="text-xs text-muted-foreground">{selectedPreset.name}</p>
                  )}
                </div>

                {/* Complaints & Diagnosis */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {selectedPreset.complaints && selectedPreset.complaints.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-chip/40 border border-border/40">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <Stethoscope className="h-3 w-3 text-primary" />
                        {isBn ? "প্রধান লক্ষণসমূহ (Complaints)" : "Chief Complaints"}
                      </p>
                      <ul className="text-xs space-y-1 text-foreground/80 list-disc list-inside">
                        {selectedPreset.complaints.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedPreset.diagnosis && selectedPreset.diagnosis.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-chip/40 border border-border/40">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <Check className="h-3 w-3 text-primary" />
                        {isBn ? "রোগ নির্ণয় (Diagnosis)" : "Diagnosis"}
                      </p>
                      <ul className="text-xs space-y-1 text-foreground/80 list-disc list-inside">
                        {selectedPreset.diagnosis.map((d, i) => (
                          <li key={i} className="font-semibold text-primary">{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Investigations */}
                {selectedPreset.investigation && selectedPreset.investigation.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-chip/40 border border-border/40">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <FlaskConical className="h-3 w-3 text-primary" />
                      {isBn ? "প্রয়োজনীয় পরীক্ষা (Investigations)" : "Investigations"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPreset.investigation.map((inv, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-card border border-border text-xs text-foreground/80">
                          {inv}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medicines */}
                {selectedPreset.medicines && selectedPreset.medicines.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Pill className="h-3 w-3 text-primary" />
                      {isBn ? "ঔষধপত্র (Medicines)" : "Prescribed Medicines"}
                    </p>
                    <div className="space-y-2">
                      {selectedPreset.medicines.map((m, i) => (
                        <div key={i} className="p-3 rounded-xl bg-card border border-border/50 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-primary">
                              <span className="text-muted-foreground font-normal">{m.dosage_form} </span>
                              {m.name}
                              {m.dose && <span className="ml-1 text-muted-foreground font-normal">({m.dose})</span>}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {m.frequency} • <span className="text-primary-glow font-medium">{m.days}</span>
                              {m.meal ? ` • ${m.meal}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advice */}
                {selectedPreset.advice && selectedPreset.advice.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-chip/40 border border-border/40">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Lightbulb className="h-3 w-3 text-primary" />
                      {isBn ? "পরামর্শ (Advice)" : "General Advice"}
                    </p>
                    <ul className="text-xs space-y-1 text-foreground/80 list-disc list-inside">
                      {selectedPreset.advice.map((adv, i) => (
                        <li key={i}>{adv}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                {isBn ? "একটি টেমপ্লেট নির্বাচন করুন" : "Select a preset to view details"}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-chip/30 border-t border-border/50 flex sm:justify-between items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {isBn ? "বন্ধ করুন" : "Cancel"}
          </Button>

          {selectedPreset && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onApplyPreset(selectedPreset, "append");
                  onOpenChange(false);
                }}
                className="text-xs rounded-full"
              >
                {isBn ? "+ যোগ করুন (Append)" : "+ Append to Rx"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onApplyPreset(selectedPreset, "replace");
                  onOpenChange(false);
                }}
                className="text-xs rounded-full bg-gradient-dark text-surface-dark-foreground shadow-glow"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {isBn ? "প্রেসক্রিপশনে প্রয়োগ করুন" : "Apply Preset"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
