/**
 * Clinical Drug-Drug Interaction and Contraindication Safety Engine.
 * Provides instant clinical decision support for doctor consultations.
 */

export type ClinicalAlert = {
  severity: "high" | "moderate" | "info";
  title: string;
  description: string;
  recommendation: string;
};

export type ClinicalSafetyWarning = ClinicalAlert;

type DrugInteractionRule = {
  drugs: [string, string]; // generic or brand keyword substrings
  severity: "high" | "moderate";
  title: string;
  description: string;
  recommendation: string;
};

// Common critical drug-drug interactions encountered in OPD
const DRUG_INTERACTION_RULES: DrugInteractionRule[] = [
  {
    drugs: ["warfarin", "aspirin"],
    severity: "high",
    title: "High Bleeding Risk: Warfarin + Aspirin",
    description: "Concurrent use significantly increases major gastrointestinal and systemic bleeding risks.",
    recommendation: "Ensure explicit clinical indication (e.g. mechanical heart valve + ACS); monitor INR closely.",
  },
  {
    drugs: ["warfarin", "clopidogrel"],
    severity: "high",
    title: "High Bleeding Risk: Dual Anticoagulant + Antiplatelet",
    description: "Combination markedly elevates fatal hemorrhage risk.",
    recommendation: "Use shortest duration necessary; consider PPI co-prescription.",
  },
  {
    drugs: ["ciprofloxacin", "theophylline"],
    severity: "high",
    title: "Theophylline Toxicity Risk: Ciprofloxacin",
    description: "Ciprofloxacin inhibits CYP1A2, reducing theophylline clearance by up to 50% and causing seizures or cardiac arrhythmias.",
    recommendation: "Choose an alternative antibiotic (e.g. Azithromycin, Ceftriaxone) or reduce theophylline dose by 50% with serum monitoring.",
  },
  {
    drugs: ["ace inhibitor", "spironolactone"],
    severity: "moderate",
    title: "Hyperkalemia Risk: ACEi/ARB + Potassium-Sparing Diuretic",
    description: "Dual aldosterone suppression can cause severe, life-threatening hyperkalemia, especially in CKD or diabetics.",
    recommendation: "Check baseline serum potassium and creatinine within 1-2 weeks of initiation.",
  },
  {
    drugs: ["lisinopril", "losartan"],
    severity: "high",
    title: "Dual RAAS Blockade: ACEi + ARB",
    description: "Combining ACE inhibitors and ARBs increases renal failure, hypotension, and hyperkalemia without added CV benefit.",
    recommendation: "Discontinue one agent; dual RAAS blockade is generally contraindicated.",
  },
  {
    drugs: ["enalapril", "losartan"],
    severity: "high",
    title: "Dual RAAS Blockade: ACEi + ARB",
    description: "Combining ACE inhibitors and ARBs increases renal failure, hypotension, and hyperkalemia.",
    recommendation: "Use either an ACE inhibitor or an ARB alone.",
  },
  {
    drugs: ["ramipril", "losartan"],
    severity: "high",
    title: "Dual RAAS Blockade: Ramipril + Losartan",
    description: "Combining ACE inhibitors with ARBs increases risk of acute kidney injury and hyperkalemia.",
    recommendation: "Avoid concurrent use.",
  },
  {
    drugs: ["ibuprofen", "aspirin"],
    severity: "moderate",
    title: "Cardioprotection Interference & GI Bleed: Dual NSAIDs",
    description: "Ibuprofen can competitively block the irreversible antiplatelet effect of low-dose Aspirin, and additive gastric mucosal injury occurs.",
    recommendation: "Take Aspirin at least 2 hours before Ibuprofen, or substitute Paracetamol.",
  },
  {
    drugs: ["naproxen", "aspirin"],
    severity: "moderate",
    title: "Dual NSAID GI Bleeding Risk",
    description: "Concurrent use doubles the risk of gastric ulcers and upper GI bleeding.",
    recommendation: "Avoid multiple simultaneous NSAIDs; add gastroprotection if indispensable.",
  },
  {
    drugs: ["ketorolac", "naproxen"],
    severity: "high",
    title: "Severe Nephrotoxicity & Ulceration: Dual NSAIDs",
    description: "Ketorolac combined with other NSAIDs is strictly contraindicated due to acute renal failure and massive ulcer risk.",
    recommendation: "Never combine Ketorolac with any oral NSAID.",
  },
  {
    drugs: ["metronidazole", "alcohol"],
    severity: "moderate",
    title: "Disulfiram-like Reaction: Metronidazole",
    description: "Produces flushing, tachycardia, nausea, vomiting, and headache.",
    recommendation: "Instruct patient to abstain from alcohol during therapy and for 48 hours after completion.",
  },
  {
    drugs: ["methotrexate", "naproxen"],
    severity: "high",
    title: "Methotrexate Toxicity: NSAIDs",
    description: "NSAIDs diminish renal clearance of Methotrexate, leading to severe bone marrow suppression and hepatotoxicity.",
    recommendation: "Avoid concurrent NSAIDs or monitor CBC and liver enzymes diligently.",
  },
  {
    drugs: ["clarithromycin", "simvastatin"],
    severity: "high",
    title: "Severe Rhabdomyolysis Risk: Clarithromycin + Simvastatin",
    description: "Clarithromycin strongly inhibits CYP3A4, increasing Simvastatin plasma concentrations up to 10-fold.",
    recommendation: "Temporarily withhold Simvastatin during macrolide therapy or switch to Rosuvastatin / Azithromycin.",
  },
  {
    drugs: ["sildenafil", "nitroglycerin"],
    severity: "high",
    title: "Fatal Hypotension: PDE5 Inhibitor + Nitrate",
    description: "Concurrent use causes profound, life-threatening systemic vasodilation and cardiovascular collapse.",
    recommendation: "Strictly contraindicated. Do not administer nitrates within 24-48 hours of PDE5 inhibitors.",
  },
  {
    drugs: ["tramadol", "sertraline"],
    severity: "high",
    title: "Serotonin Syndrome Risk: Tramadol + SSRI",
    description: "Both agents enhance serotonergic neurotransmission and reduce seizure threshold.",
    recommendation: "Monitor for tremor, hyperreflexia, agitation, and hyperthermia. Consider non-serotonergic analgesic.",
  },
  {
    drugs: ["ciprofloxacin", "calcium"],
    severity: "moderate",
    title: "Chelation & Reduced Absorption: Quinolone + Multivalent Cation",
    description: "Calcium/antacids bind ciprofloxacin in GI tract reducing bioavailability by up to 80%.",
    recommendation: "Space administration by at least 2 hours before or 4-6 hours after antacid/calcium.",
  },
  {
    drugs: ["digoxin", "amiodarone"],
    severity: "high",
    title: "Digoxin Toxicity: Amiodarone Interaction",
    description: "Amiodarone reduces renal and non-renal clearance of digoxin, potentially doubling serum digoxin levels.",
    recommendation: "Reduce digoxin dosage by 30-50% and closely monitor ECG and serum digoxin levels.",
  },
];

type DiseaseContraindicationRule = {
  conditionKeywords: string[];
  drugKeywords: string[];
  severity: "high" | "moderate";
  title: string;
  description: string;
};

const DISEASE_CONTRAINDICATION_RULES: DiseaseContraindicationRule[] = [
  {
    conditionKeywords: ["asthma", "copd", "bronchospasm"],
    drugKeywords: ["propranolol", "atenolol", "carvedilol", "timolol"],
    severity: "high",
    title: "Bronchospasm Risk: Beta-Blocker in Asthma/COPD",
    description: "Non-selective beta-blockers may provoke life-threatening bronchospasm. Cardioselective agents (e.g. Bisoprolol) carry lower risk but still require caution.",
  },
  {
    conditionKeywords: ["peptic ulcer", "pud", "gastric ulcer", "duodenal ulcer", "gerd", "gastritis"],
    drugKeywords: ["ketorolac", "naproxen", "ibuprofen", "diclofenac", "indomethacin", "aspirin"],
    severity: "moderate",
    title: "GI Bleeding Risk: NSAIDs in PUD / Gastric Ulcer",
    description: "Systemic NSAIDs inhibit COX-1 and gastric mucosal prostaglandins, potentially exacerbating ulcers or inducing perforation.",
  },
  {
    conditionKeywords: ["chronic kidney disease", "ckd", "renal failure", "nephropathy"],
    drugKeywords: ["ketorolac", "diclofenac", "naproxen", "ibuprofen", "gentamicin", "amikacin"],
    severity: "high",
    title: "Acute Kidney Injury Risk: Nephrotoxic Agent in CKD",
    description: "NSAIDs and aminoglycosides cause renal vasoconstriction and acute tubular necrosis in pre-existing renal compromise.",
  },
  {
    conditionKeywords: ["heart failure", "chf"],
    drugKeywords: ["diltiazem", "verapamil"],
    severity: "moderate",
    title: "Negative Inotrope Warning: Non-Dihydropyridine CCB in Heart Failure",
    description: "Verapamil and Diltiazem depress myocardial contractility and can precipitate acute decompensated heart failure.",
  },
  {
    conditionKeywords: ["pregnancy", "pregnant"],
    drugKeywords: ["losartan", "enalapril", "ramipril", "valsartan", "methotrexate", "doxycycline", "ciprofloxacin"],
    severity: "high",
    title: "Teratogenicity Warning: Contraindicated in Pregnancy",
    description: "RAAS inhibitors cause fetal renal dysgenesis; tetracyclines cause fetal teeth discoloration/bone deformity; methotrexate is an abortifacient.",
  },
];

/**
 * Checks a prescription medicine list against each other and against stated conditions.
 */
export const checkPrescriptionSafety = (
  medicines: { name: string }[],
  conditions: string[] = []
): ClinicalAlert[] => {
  const alerts: ClinicalAlert[] = [];
  const medNames = medicines.map((m) => m.name.toLowerCase());
  const condText = conditions.join(" ").toLowerCase();

  // 1. Drug-Drug Interactions
  for (const rule of DRUG_INTERACTION_RULES) {
    const [drugA, drugB] = rule.drugs;
    const matchA = medNames.some((m) => m.includes(drugA));
    const matchB = medNames.some((m) => m.includes(drugB));

    if (matchA && matchB) {
      alerts.push({
        severity: rule.severity,
        title: rule.title,
        description: rule.description,
        recommendation: rule.recommendation,
      });
    }
  }

  // 2. Duplicate Drug / Duplicate Class Check
  const nsaidKeywords = ["napa", "paracetamol", "ibuprofen", "naproxen", "diclofenac", "aceclofenac", "ketorolac"];
  const presentNsaids = medNames.filter((m) => nsaidKeywords.some((k) => m.includes(k)));
  if (presentNsaids.length > 2) {
    alerts.push({
      severity: "moderate",
      title: "Multiple Analgesics Prescribed",
      description: `Detected ${presentNsaids.length} analgesic/NSAID agents: ${presentNsaids.join(", ")}. Verify intended multitherapy.`,
      recommendation: "Ensure gastroprotection (PPI) and consider single optimal analgesic agent.",
    });
  }

  // 3. Disease-Drug Contraindications
  if (condText) {
    for (const rule of DISEASE_CONTRAINDICATION_RULES) {
      const matchCond = rule.conditionKeywords.some((ck) => condText.includes(ck));
      if (!matchCond) continue;

      const matchDrug = medNames.some((m) => rule.drugKeywords.some((dk) => m.includes(dk)));
      if (matchDrug) {
        alerts.push({
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          recommendation: "Consider safer clinical alternatives for this patient profile.",
        });
      }
    }
  }

  return alerts;
};
