export type SpecimenContainer = {
  type: string;
  name: string;
  capColor: string; // Tailwind color class or hex
  bgTone: string;
  additive: string;
  commonTests: string[];
};

export const SPECIMEN_CONTAINERS: Record<string, SpecimenContainer> = {
  blood_edta: {
    type: "blood_edta",
    name: "EDTA Tube (Purple / Lavender)",
    capColor: "#9333ea",
    bgTone: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    additive: "K2/K3 EDTA (Anticoagulant)",
    commonTests: ["Complete Blood Count (CBC)", "HbA1c", "Blood Grouping", "ESR", "Peripheral Smear"],
  },
  blood_serum: {
    type: "blood_serum",
    name: "Serum Gel / SST (Gold / Red)",
    capColor: "#eab308",
    bgTone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    additive: "Clot Activator & Polymer Gel",
    commonTests: ["Lipid Profile", "Liver Function (LFT)", "Kidney Function (KFT)", "Electrolytes", "Thyroid (TSH, FT4)"],
  },
  blood_citrate: {
    type: "blood_citrate",
    name: "Sodium Citrate (Light Blue)",
    capColor: "#0284c7",
    bgTone: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
    additive: "3.2% Buffered Sodium Citrate",
    commonTests: ["Prothrombin Time (PT/INR)", "APTT", "D-Dimer", "Fibrinogen"],
  },
  blood_fluoride: {
    type: "blood_fluoride",
    name: "Sodium Fluoride (Gray)",
    capColor: "#64748b",
    bgTone: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
    additive: "Sodium Fluoride & Potassium Oxalate",
    commonTests: ["Fasting Blood Glucose", "Post-prandial Glucose (PPBS)", "OGTT"],
  },
  urine_sterile: {
    type: "urine_sterile",
    name: "Sterile Urine Cup (Yellow)",
    capColor: "#ca8a04",
    bgTone: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
    additive: "None / Preservative-free",
    commonTests: ["Urine Routine & Microscopic (R/E)", "Urine Culture & Sensitivity", "Pregnancy Test (hCG)"],
  },
  swab_sterile: {
    type: "swab_sterile",
    name: "Sterile Viral/Bacterial Swab",
    capColor: "#059669",
    bgTone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    additive: "Viral Transport Medium (VTM) / Amies",
    commonTests: ["Throat Swab Culture", "Nasal PCR", "Wound Swab"],
  },
};

export type OrderStatus = "pending" | "sample_collected" | "processing" | "reported";
export type OrderPriority = "routine" | "urgent" | "stat";

export type TestParameter = {
  id: string;
  name: string;
  result: string | number;
  unit: string;
  min?: number;
  max?: number;
  textRef?: string;
  criticalLow?: number;
  criticalHigh?: number;
  flag?: "normal" | "low" | "high" | "critical";
  notes?: string;
};

export type LabOrderFull = {
  id: string;
  reference: string;
  patient_id: string;
  patient_name: string;
  patient_age?: number;
  patient_gender?: "Male" | "Female" | "Other";
  doctor_id?: string | null;
  doctor_name?: string | null;
  lab_test_id?: string | null;
  test_name: string;
  category: string;
  sample_type: string;
  container_code: keyof typeof SPECIMEN_CONTAINERS;
  barcode: string;
  status: OrderStatus;
  priority: OrderPriority;
  requested_at: string;
  collected_at?: string | null;
  reported_at?: string | null;
  parameters?: TestParameter[];
  result_notes?: string | null;
  phlebotomist?: string | null;
  pathologist?: string | null;
  rejection_reason?: string | null;
};

/** Pre-defined standard multi-parameter clinical diagnostic panels */
export const CLINICAL_TEST_PANELS: Record<string, { category: string; sample: keyof typeof SPECIMEN_CONTAINERS; parameters: Omit<TestParameter, "result" | "flag">[] }> = {
  "Complete Blood Count (CBC)": {
    category: "Hematology",
    sample: "blood_edta",
    parameters: [
      { id: "hb", name: "Hemoglobin (Hb)", unit: "g/dL", min: 12.0, max: 16.5, criticalLow: 7.0, criticalHigh: 20.0 },
      { id: "rbc", name: "RBC Count", unit: "mil/µL", min: 4.2, max: 5.8 },
      { id: "hct", name: "Hematocrit (PCV)", unit: "%", min: 36.0, max: 50.0 },
      { id: "mcv", name: "MCV", unit: "fL", min: 80.0, max: 100.0 },
      { id: "mch", name: "MCH", unit: "pg", min: 27.0, max: 33.0 },
      { id: "mchc", name: "MCHC", unit: "g/dL", min: 32.0, max: 36.0 },
      { id: "plt", name: "Platelet Count", unit: "x10³/µL", min: 150, max: 450, criticalLow: 50, criticalHigh: 900 },
      { id: "wbc", name: "Total WBC Count", unit: "cells/µL", min: 4000, max: 11000, criticalLow: 2000, criticalHigh: 30000 },
      { id: "neut", name: "Neutrophils", unit: "%", min: 40, max: 75 },
      { id: "lymph", name: "Lymphocytes", unit: "%", min: 20, max: 45 },
      { id: "esr", name: "ESR (Westergren)", unit: "mm/hr", min: 0, max: 20 },
    ],
  },
  "Lipid Profile": {
    category: "Biochemistry",
    sample: "blood_serum",
    parameters: [
      { id: "tc", name: "Total Cholesterol", unit: "mg/dL", min: 125, max: 200 },
      { id: "trig", name: "Triglycerides", unit: "mg/dL", min: 50, max: 150, criticalHigh: 500 },
      { id: "hdl", name: "HDL Cholesterol", unit: "mg/dL", min: 40, max: 60 },
      { id: "ldl", name: "LDL Cholesterol", unit: "mg/dL", min: 50, max: 100, criticalHigh: 190 },
      { id: "vldl", name: "VLDL Cholesterol", unit: "mg/dL", min: 5, max: 30 },
      { id: "ratio", name: "Chol / HDL Ratio", unit: "ratio", min: 3.0, max: 5.0 },
    ],
  },
  "Liver Function Test (LFT)": {
    category: "Biochemistry",
    sample: "blood_serum",
    parameters: [
      { id: "bili_tot", name: "Bilirubin (Total)", unit: "mg/dL", min: 0.2, max: 1.2, criticalHigh: 15.0 },
      { id: "bili_dir", name: "Bilirubin (Direct)", unit: "mg/dL", min: 0.0, max: 0.3 },
      { id: "sgpt", name: "SGPT / ALT", unit: "U/L", min: 7, max: 56, criticalHigh: 500 },
      { id: "sgot", name: "SGOT / AST", unit: "U/L", min: 10, max: 40, criticalHigh: 500 },
      { id: "alp", name: "Alkaline Phosphatase (ALP)", unit: "U/L", min: 44, max: 147 },
      { id: "protein", name: "Total Protein", unit: "g/dL", min: 6.0, max: 8.3 },
      { id: "albumin", name: "Serum Albumin", unit: "g/dL", min: 3.5, max: 5.0 },
    ],
  },
  "Renal Function Panel (KFT)": {
    category: "Biochemistry",
    sample: "blood_serum",
    parameters: [
      { id: "creat", name: "Serum Creatinine", unit: "mg/dL", min: 0.6, max: 1.3, criticalHigh: 5.0 },
      { id: "bun", name: "Blood Urea Nitrogen (BUN)", unit: "mg/dL", min: 7, max: 20, criticalHigh: 80 },
      { id: "egfr", name: "eGFR", unit: "mL/min/1.73m²", min: 90, max: 140 },
      { id: "uric", name: "Serum Uric Acid", unit: "mg/dL", min: 3.5, max: 7.2 },
      { id: "na", name: "Sodium (Na+)", unit: "mEq/L", min: 135, max: 145, criticalLow: 120, criticalHigh: 160 },
      { id: "k", name: "Potassium (K+)", unit: "mEq/L", min: 3.5, max: 5.1, criticalLow: 2.8, criticalHigh: 6.5 },
    ],
  },
  "Glycemic Profile (FBS & HbA1c)": {
    category: "Biochemistry",
    sample: "blood_fluoride",
    parameters: [
      { id: "fbs", name: "Fasting Blood Glucose (FBS)", unit: "mg/dL", min: 70, max: 99, criticalLow: 50, criticalHigh: 400 },
      { id: "hba1c", name: "HbA1c (Glycated Hb)", unit: "%", min: 4.0, max: 5.6, criticalHigh: 12.0 },
    ],
  },
  "Routine Urine Examination (R/E)": {
    category: "Clinical Pathology",
    sample: "urine_sterile",
    parameters: [
      { id: "color", name: "Color", unit: "", textRef: "Straw / Pale Yellow" },
      { id: "transp", name: "Appearance / Clarity", unit: "", textRef: "Clear" },
      { id: "sp_grav", name: "Specific Gravity", unit: "", min: 1.005, max: 1.030 },
      { id: "ph", name: "pH Reaction", unit: "", min: 4.5, max: 8.0 },
      { id: "sugar", name: "Urine Glucose", unit: "", textRef: "Nil / Negative" },
      { id: "albumin_u", name: "Urine Protein (Albumin)", unit: "", textRef: "Nil / Trace" },
      { id: "pus", name: "Pus Cells (WBC)", unit: "/HPF", min: 0, max: 5 },
      { id: "rbc_u", name: "RBCs", unit: "/HPF", min: 0, max: 2 },
      { id: "casts", name: "Casts", unit: "", textRef: "None seen" },
    ],
  },
};

/** Evaluates numeric value against normal and critical thresholds */
export const evaluateParameterFlag = (
  param: Omit<TestParameter, "flag">
): "normal" | "low" | "high" | "critical" => {
  const val = typeof param.result === "string" ? parseFloat(param.result) : param.result;
  if (isNaN(val) || val === null || val === undefined) return "normal";

  if (param.criticalLow !== undefined && val <= param.criticalLow) return "critical";
  if (param.criticalHigh !== undefined && val >= param.criticalHigh) return "critical";
  if (param.min !== undefined && val < param.min) return "low";
  if (param.max !== undefined && val > param.max) return "high";

  return "normal";
};
