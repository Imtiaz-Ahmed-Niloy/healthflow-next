/**
 * Evidence-based Clinical Medical Calculators
 * Used directly within consultations and patient profiles.
 */

// 1. CKD-EPI 2021 Creatinine eGFR formula (without race coefficient)
export const calculateEGFR = (
  serumCreatinineMgDl: number,
  ageYears: number,
  gender: "male" | "female" | "other"
): { egfr: number; stage: string; interpretation: string } => {
  const isFemale = gender === "female";
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const femaleFactor = isFemale ? 1.012 : 1.0;

  const scrOverKappa = serumCreatinineMgDl / kappa;
  const minScr = Math.min(scrOverKappa, 1);
  const maxScr = Math.max(scrOverKappa, 1);

  const egfr = Math.round(
    142 *
      Math.pow(minScr, alpha) *
      Math.pow(maxScr, -1.2) *
      Math.pow(0.9938, ageYears) *
      femaleFactor
  );

  let stage = "G1 (Normal)";
  let interpretation = "Normal or high kidney function";
  if (egfr >= 90) {
    stage = "G1";
    interpretation = "Normal or high GFR";
  } else if (egfr >= 60) {
    stage = "G2";
    interpretation = "Mildly decreased GFR";
  } else if (egfr >= 45) {
    stage = "G3a";
    interpretation = "Mildly to moderately decreased GFR";
  } else if (egfr >= 30) {
    stage = "G3b";
    interpretation = "Moderately to severely decreased GFR";
  } else if (egfr >= 15) {
    stage = "G4";
    interpretation = "Severely decreased GFR (Consider nephrology referral)";
  } else {
    stage = "G5";
    interpretation = "Kidney failure (End-Stage Renal Disease - Dialysis indicated)";
  }

  return { egfr, stage, interpretation };
};

// 2. BMI and Body Surface Area (Mosteller)
export const calculateBmiAndBsa = (
  weightKg: number,
  heightFeet: number,
  heightInches: number = 0
): {
  bmi: number;
  bmiCategory: string;
  categoryTone: "normal" | "warning" | "danger";
  bsa: number; // m^2
} => {
  const totalInches = heightFeet * 12 + heightInches;
  const heightMeters = (totalInches * 2.54) / 100;
  const heightCm = totalInches * 2.54;

  const bmi = Number((weightKg / (heightMeters * heightMeters)).toFixed(1));
  const bsa = Number(Math.sqrt((heightCm * weightKg) / 3600).toFixed(2));

  // WHO Asian Pacific BMI cutoff
  let bmiCategory = "Normal Weight";
  let categoryTone: "normal" | "warning" | "danger" = "normal";

  if (bmi < 18.5) {
    bmiCategory = "Underweight";
    categoryTone = "warning";
  } else if (bmi < 23.0) {
    bmiCategory = "Normal (Healthy)";
    categoryTone = "normal";
  } else if (bmi < 25.0) {
    bmiCategory = "Overweight";
    categoryTone = "warning";
  } else if (bmi < 30.0) {
    bmiCategory = "Class I Obesity";
    categoryTone = "danger";
  } else {
    bmiCategory = "Class II / Severe Obesity";
    categoryTone = "danger";
  }

  return { bmi, bmiCategory, categoryTone, bsa };
};

// 3. CHA2DS2-VASc Score for Atrial Fibrillation Stroke Risk
export type Cha2ds2Criteria = {
  congestiveHeartFailure: boolean; // 1
  hypertension: boolean; // 1
  age75OrOlder: boolean; // 2
  diabetes: boolean; // 1
  strokeOrTiaOrThromboembolism: boolean; // 2
  vascularDisease: boolean; // 1
  age65To74: boolean; // 1
  femaleGender: boolean; // 1
};

export const calculateCha2ds2Vasc = (
  c: Cha2ds2Criteria
): { score: number; annualStrokeRiskPercent: number; recommendation: string } => {
  let score = 0;
  if (c.congestiveHeartFailure) score += 1;
  if (c.hypertension) score += 1;
  if (c.age75OrOlder) score += 2;
  else if (c.age65To74) score += 1;
  if (c.diabetes) score += 1;
  if (c.strokeOrTiaOrThromboembolism) score += 2;
  if (c.vascularDisease) score += 1;
  if (c.femaleGender) score += 1;

  const risks: Record<number, number> = {
    0: 0.2,
    1: 0.6,
    2: 2.2,
    3: 3.2,
    4: 4.8,
    5: 7.2,
    6: 9.7,
    7: 11.2,
    8: 12.5,
    9: 15.2,
  };

  const annualStrokeRiskPercent = risks[Math.min(score, 9)] ?? 15.2;

  let recommendation = "Low stroke risk. Anticoagulation generally not recommended.";
  if (score === 1 && !c.femaleGender) {
    recommendation = "Intermediate risk. Oral anticoagulation should be considered based on clinical judgment.";
  } else if (score >= 2) {
    recommendation = "High risk. Oral anticoagulation (NOAC/DOAC e.g. Rivaroxaban, Apixaban or Warfarin) strongly recommended unless contraindicated.";
  }

  return { score, annualStrokeRiskPercent, recommendation };
};

// 4. Pediatric Weight-based Syrup Calculator
export type PediatricDrugProfile = {
  id: string;
  genericName: string;
  recommendedDoseMgPerKg: number; // e.g. 15 for paracetamol
  frequencyPerDay: number; // 3 = 8 hourly, 4 = 6 hourly, 2 = 12 hourly
  defaultConcentrationMg: number; // e.g. 120
  defaultConcentrationMl: number; // e.g. 5
  indications: string;
};

export const COMMON_PEDIATRIC_DRUGS: PediatricDrugProfile[] = [
  {
    id: "paracetamol",
    genericName: "Paracetamol Syrup (Napa / Ace)",
    recommendedDoseMgPerKg: 15,
    frequencyPerDay: 4, // 6 hourly
    defaultConcentrationMg: 120,
    defaultConcentrationMl: 5,
    indications: "Fever and mild to moderate pain (15 mg/kg every 6 hours, max 60 mg/kg/day)",
  },
  {
    id: "amoxicillin",
    genericName: "Amoxicillin Suspension (Moxacil / Fimoxyl)",
    recommendedDoseMgPerKg: 40,
    frequencyPerDay: 3, // 8 hourly
    defaultConcentrationMg: 125,
    defaultConcentrationMl: 5,
    indications: "URTI, Otitis Media, Pneumonia (40-50 mg/kg/day divided 8-hourly)",
  },
  {
    id: "azithromycin",
    genericName: "Azithromycin Suspension (Zithrin / Azyth)",
    recommendedDoseMgPerKg: 10,
    frequencyPerDay: 1, // once daily
    defaultConcentrationMg: 200,
    defaultConcentrationMl: 5,
    indications: "Atypical pneumonia, tonsillitis (10 mg/kg once daily for 3-5 days)",
  },
  {
    id: "cefixime",
    genericName: "Cefixime Suspension (Ceftron / Triamox)",
    recommendedDoseMgPerKg: 8,
    frequencyPerDay: 2, // 12 hourly
    defaultConcentrationMg: 100,
    defaultConcentrationMl: 5,
    indications: "Enteric fever / Typhoid, UTI (8-10 mg/kg/day divided 12-hourly)",
  },
  {
    id: "domperidone",
    genericName: "Domperidone Drops/Suspension (Motigut / Deflux)",
    recommendedDoseMgPerKg: 0.25,
    frequencyPerDay: 3, // 8 hourly
    defaultConcentrationMg: 5,
    defaultConcentrationMl: 5,
    indications: "Nausea and vomiting (0.25 mg/kg 3 times daily before feed)",
  },
];

export const calculatePediatricDose = (
  weightKg: number,
  drug: PediatricDrugProfile,
  concentrationMg: number = drug.defaultConcentrationMg,
  concentrationMl: number = drug.defaultConcentrationMl
): {
  singleDoseMg: number;
  singleDoseMl: number;
  dailyDoseMg: number;
  instructions: string;
} => {
  // If frequency is > 1 and it's a daily dose basis (e.g. Amoxicillin 40mg/kg/day)
  let singleDoseMg: number;
  let dailyDoseMg: number;

  if (drug.id === "amoxicillin" || drug.id === "cefixime") {
    dailyDoseMg = Math.round(weightKg * drug.recommendedDoseMgPerKg);
    singleDoseMg = Math.round(dailyDoseMg / drug.frequencyPerDay);
  } else {
    // Single dose basis (e.g. Paracetamol 15mg/kg per dose)
    singleDoseMg = Math.round(weightKg * drug.recommendedDoseMgPerKg);
    dailyDoseMg = singleDoseMg * drug.frequencyPerDay;
  }

  // Calculate volume (ml) = (mg needed * ml concentration) / mg concentration
  const singleDoseMl = Number(
    ((singleDoseMg * concentrationMl) / concentrationMg).toFixed(1)
  );

  let freqStr = "3 times daily";
  if (drug.frequencyPerDay === 1) freqStr = "Once daily";
  if (drug.frequencyPerDay === 2) freqStr = "Twice daily (12-hourly)";
  if (drug.frequencyPerDay === 4) freqStr = "4 times daily (6-hourly)";

  const instructions = `${singleDoseMl} ml (${singleDoseMg} mg) ${freqStr}`;

  return {
    singleDoseMg,
    singleDoseMl,
    dailyDoseMg,
    instructions,
  };
};
