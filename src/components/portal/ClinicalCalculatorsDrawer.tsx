"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateEGFR,
  calculateBmiAndBsa,
  calculateCha2ds2Vasc,
  calculatePediatricDose,
  COMMON_PEDIATRIC_DRUGS,
  type Cha2ds2Criteria,
} from "@/lib/clinicalCalculators";
import { Calculator, Copy, Check, Activity, Heart, Baby, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "next-intl";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientAge?: number | null;
  patientGender?: "male" | "female" | "other" | null;
  patientWeight?: number | null;
  patientHeightFeet?: number | null;
  patientHeightInches?: number | null;
  onInsertText: (text: string, targetSection: "examination" | "advice") => void;
};

export const ClinicalCalculatorsDrawer = ({
  open,
  onOpenChange,
  patientAge,
  patientGender,
  patientWeight,
  patientHeightFeet,
  patientHeightInches,
  onInsertText,
}: Props) => {
  const locale = useLocale();
  const isBn = locale === "bn";

  // Tab 1: eGFR
  const [egfrCreatinine, setEgfrCreatinine] = useState("1.1");
  const [egfrAge, setEgfrAge] = useState(patientAge ? String(patientAge) : "45");
  const [egfrGender, setEgfrGender] = useState<"male" | "female">((patientGender as "male" | "female") || "male");

  // Tab 2: BMI & BSA
  const [bmiWeight, setBmiWeight] = useState(patientWeight ? String(patientWeight) : "68");
  const [bmiFeet, setBmiFeet] = useState(patientHeightFeet ? String(patientHeightFeet) : "5");
  const [bmiInches, setBmiInches] = useState(patientHeightInches ? String(patientHeightInches) : "6");

  // Tab 3: CHA2DS2-VASc
  const [chaCriteria, setChaCriteria] = useState<Cha2ds2Criteria>({
    congestiveHeartFailure: false,
    hypertension: true,
    age75OrOlder: false,
    diabetes: true,
    strokeOrTiaOrThromboembolism: false,
    vascularDisease: false,
    age65To74: false,
    femaleGender: patientGender === "female",
  });

  // Tab 4: Pediatric Dosing
  const [pediaDrugId, setPediaDrugId] = useState(COMMON_PEDIATRIC_DRUGS[0].id);
  const [pediaWeight, setPediaWeight] = useState(patientWeight ? String(patientWeight) : "12");

  // Computed results
  const egfrResult = (() => {
    const scr = parseFloat(egfrCreatinine);
    const age = parseInt(egfrAge, 10);
    if (!scr || isNaN(scr) || !age || isNaN(age)) return null;
    return calculateEGFR(scr, age, egfrGender);
  })();

  const bmiResult = (() => {
    const wt = parseFloat(bmiWeight);
    const ft = parseInt(bmiFeet, 10);
    const inch = parseInt(bmiInches, 10) || 0;
    if (!wt || isNaN(wt) || !ft || isNaN(ft)) return null;
    return calculateBmiAndBsa(wt, ft, inch);
  })();

  const chaResult = calculateCha2ds2Vasc(chaCriteria);

  const selectedPediaDrug = COMMON_PEDIATRIC_DRUGS.find((d) => d.id === pediaDrugId) || COMMON_PEDIATRIC_DRUGS[0];
  const pediaResult = (() => {
    const wt = parseFloat(pediaWeight);
    if (!wt || isNaN(wt)) return null;
    return calculatePediatricDose(wt, selectedPediaDrug);
  })();

  const handleCopyEgfr = () => {
    if (!egfrResult) return;
    const text = `eGFR: ${egfrResult.egfr} mL/min/1.73m² (${egfrResult.stage} - ${egfrResult.interpretation}), Serum Creatinine: ${egfrCreatinine} mg/dL`;
    onInsertText(text, "examination");
    toast.success(isBn ? "ক্লিনিক্যাল পরীক্ষায় যুক্ত করা হয়েছে" : "Inserted eGFR into Examination");
  };

  const handleCopyBmi = () => {
    if (!bmiResult) return;
    const text = `BMI: ${bmiResult.bmi} kg/m² (${bmiResult.bmiCategory}), BSA: ${bmiResult.bsa} m² (Weight: ${bmiWeight}kg, Height: ${bmiFeet}'${bmiInches}")`;
    onInsertText(text, "examination");
    toast.success(isBn ? "ক্লিনিক্যাল পরীক্ষায় যুক্ত করা হয়েছে" : "Inserted BMI into Examination");
  };

  const handleCopyCha = () => {
    const text = `CHA₂DS₂-VASc Score: ${chaResult.score} (Annual Stroke Risk: ${chaResult.annualStrokeRiskPercent}%). Recommendation: ${chaResult.recommendation}`;
    onInsertText(text, "advice");
    toast.success(isBn ? "পরামর্শে যুক্ত করা হয়েছে" : "Inserted CHA₂DS₂-VASc assessment into Advice");
  };

  const handleCopyPedia = () => {
    if (!pediaResult) return;
    const text = `${selectedPediaDrug.genericName}: ${pediaResult.instructions} (Calculated for ${pediaWeight} kg)`;
    onInsertText(text, "advice");
    toast.success(isBn ? "প্রেসক্রিপশন পরামর্শে যুক্ত করা হয়েছে" : "Inserted Pediatric Dosing into Advice");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                {isBn ? "ক্লিনিক্যাল মেডিকেল ক্যালকুলেটর" : "Clinical Decision Calculators"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {isBn
                  ? "চিকিৎসা সংক্রান্ত তাৎক্ষণিক স্কোর, রেনাল ফাংশন এবং ডোজ গণনা"
                  : "Point-of-care clinical scoring, renal staging & pediatric dosing"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="egfr" className="mt-2">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="egfr" className="text-xs font-semibold">eGFR (CKD-EPI)</TabsTrigger>
            <TabsTrigger value="bmi" className="text-xs font-semibold">BMI & BSA</TabsTrigger>
            <TabsTrigger value="cha2ds2" className="text-xs font-semibold">CHA₂DS₂-VASc</TabsTrigger>
            <TabsTrigger value="pedia" className="text-xs font-semibold">Pediatric Dose</TabsTrigger>
          </TabsList>

          {/* Tab 1: eGFR */}
          <TabsContent value="egfr" className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">{isBn ? "সিরাম ক্রিয়েটিনিন (mg/dL)" : "Serum Creatinine (mg/dL)"}</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={egfrCreatinine}
                  onChange={(e) => setEgfrCreatinine(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">{isBn ? "বয়স (বছর)" : "Age (Years)"}</Label>
                <Input
                  type="number"
                  value={egfrAge}
                  onChange={(e) => setEgfrAge(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">{isBn ? "লিঙ্গ" : "Gender"}</Label>
                <select
                  value={egfrGender}
                  onChange={(e) => setEgfrGender(e.target.value as "male" | "female")}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            {egfrResult && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {isBn ? "গণনাকৃত eGFR" : "CALCULATED eGFR"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground">
                    Stage {egfrResult.stage}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black font-mono text-primary">{egfrResult.egfr}</span>
                  <span className="text-xs font-semibold text-muted-foreground">mL/min/1.73 m²</span>
                </div>
                <p className="text-xs text-foreground/80 font-medium">{egfrResult.interpretation}</p>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleCopyEgfr}
                    className="px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 shadow-sm transition"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {isBn ? "পরীক্ষায় যুক্ত করুন" : "Insert into Examination"}
                  </button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: BMI & BSA */}
          <TabsContent value="bmi" className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">{isBn ? "ওজন (কেজি)" : "Weight (kg)"}</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={bmiWeight}
                  onChange={(e) => setBmiWeight(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">{isBn ? "উচ্চতা (ফুট)" : "Height (Feet)"}</Label>
                <Input
                  type="number"
                  value={bmiFeet}
                  onChange={(e) => setBmiFeet(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">{isBn ? "ইঞ্চি" : "Inches"}</Label>
                <Input
                  type="number"
                  min="0"
                  max="11"
                  value={bmiInches}
                  onChange={(e) => setBmiInches(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </div>

            {bmiResult && (
              <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-2xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Body Mass Index (BMI)
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl font-black font-mono text-primary">{bmiResult.bmi}</span>
                      <span className="text-xs text-muted-foreground">kg/m²</span>
                    </div>
                    <span
                      className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        bmiResult.categoryTone === "normal"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : bmiResult.categoryTone === "warning"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-rose-500/10 text-rose-600"
                      }`}
                    >
                      {bmiResult.bmiCategory} (Asian Criteria)
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Body Surface Area (BSA)
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl font-black font-mono text-foreground">{bmiResult.bsa}</span>
                      <span className="text-xs text-muted-foreground">m² (Mosteller)</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">Useful for chemo & renal dosing</p>
                  </div>
                </div>

                <div className="pt-2 border-t flex justify-end">
                  <button
                    onClick={handleCopyBmi}
                    className="px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 shadow-sm transition"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {isBn ? "পরীক্ষায় যুক্ত করুন" : "Insert into Examination"}
                  </button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab 3: CHA2DS2-VASc */}
          <TabsContent value="cha2ds2" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {isBn
                ? "অ্যাট্রিয়াল ফিব্রিলেশন (AF) রোগীদের স্ট্রোক ঝুঁকি নিরূপণ"
                : "Atrial Fibrillation Stroke Risk Stratification"}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { key: "congestiveHeartFailure", label: "C: Congestive Heart Failure (+1)" },
                { key: "hypertension", label: "H: Hypertension (+1)" },
                { key: "age75OrOlder", label: "A₂: Age ≥ 75 years (+2)" },
                { key: "diabetes", label: "D: Diabetes Mellitus (+1)" },
                { key: "strokeOrTiaOrThromboembolism", label: "S₂: Stroke / TIA / Thromboembolism (+2)" },
                { key: "vascularDisease", label: "V: Vascular Disease (MI, PAD) (+1)" },
                { key: "age65To74", label: "A: Age 65–74 years (+1)" },
                { key: "femaleGender", label: "Sc: Sex Category (Female) (+1)" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 p-2 rounded-xl border border-border/70 hover:bg-chip/50 cursor-pointer transition select-none"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(chaCriteria[item.key as keyof Cha2ds2Criteria])}
                    onChange={(e) =>
                      setChaCriteria((curr) => ({
                        ...curr,
                        [item.key]: e.target.checked,
                      }))
                    }
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="font-medium text-foreground/90">{item.label}</span>
                </label>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Total CHA₂DS₂-VASc Score
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black font-mono text-amber-700">{chaResult.score}</span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      ({chaResult.annualStrokeRiskPercent}% annual stroke rate)
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs font-medium text-foreground/90">{chaResult.recommendation}</p>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleCopyCha}
                  className="px-3.5 py-1.5 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-amber-700 shadow-sm transition"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {isBn ? "পরামর্শে যুক্ত করুন" : "Insert into Advice"}
                </button>
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Pediatric Dosing */}
          <TabsContent value="pedia" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isBn ? "শিশুর ওজন (কেজি)" : "Child Weight (kg)"}</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={pediaWeight}
                  onChange={(e) => setPediaWeight(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">{isBn ? "ঔষধ নির্বাচন" : "Select Pediatric Drug"}</Label>
                <select
                  value={pediaDrugId}
                  onChange={(e) => setPediaDrugId(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  {COMMON_PEDIATRIC_DRUGS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.genericName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">
              Indication rule: {selectedPediaDrug.indications}
            </p>

            {pediaResult && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {isBn ? "সুপারিশকৃত সিরাপ ডোজ" : "RECOMMENDED SYRUP DOSE"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-chip text-primary">
                    {selectedPediaDrug.defaultConcentrationMg}mg / {selectedPediaDrug.defaultConcentrationMl}ml
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black font-mono text-primary">{pediaResult.singleDoseMl}</span>
                  <span className="text-sm font-bold text-foreground">ml per dose</span>
                  <span className="text-xs text-muted-foreground font-mono">({pediaResult.singleDoseMg} mg)</span>
                </div>

                <p className="text-xs font-semibold text-primary-glow">{pediaResult.instructions}</p>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleCopyPedia}
                    className="px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 shadow-sm transition"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {isBn ? "পরামর্শে যুক্ত করুন" : "Insert into Prescription"}
                  </button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
