'use client';
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Book, ChevronRight, Stethoscope } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";

interface Term {
  id: string;
  term: string;
  category: string;
  definition: string;
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
}

const defaultTerms: Term[] = [
  {
    id: "1",
    term: "Acute",
    category: "General",
    definition: "A condition that begins suddenly and is often severe, but usually lasts for a short period of time.",
  },
  {
    id: "2",
    term: "Antibody",
    category: "Immunology",
    definition: "A protein produced by the immune system in response to a specific antigen. Antibodies help neutralize pathogens.",
  },
  {
    id: "3",
    term: "Arrhythmia",
    category: "Cardiology",
    definition: "An irregular heartbeat — when the heart beats too fast, too slow, or with an irregular rhythm.",
    symptoms: "Palpitations, dizziness, shortness of breath, chest discomfort, fainting.",
    diagnosis: "Electrocardiogram (ECG), Holter monitor, event recorder.",
    treatment: "Medications, catheter ablation, pacemaker implantation.",
  },
  {
    id: "4",
    term: "Benign",
    category: "Oncology",
    definition: "Not cancerous; not malignant. A benign tumor does not spread to other parts of the body.",
  },
  {
    id: "5",
    term: "Biopsy",
    category: "General",
    definition: "The removal of a small amount of tissue for examination under a microscope to diagnose disease.",
    diagnosis: "Examination by a pathologist for abnormal cells or tissue structure.",
  },
  {
    id: "6",
    term: "Bradycardia",
    category: "Cardiology",
    definition: "A slower than normal heart rate, typically fewer than 60 beats per minute in adults.",
    symptoms: "Fatigue, dizziness, fainting, shortness of breath, chest pain.",
    diagnosis: "ECG, electrophysiology studies, blood tests.",
    treatment: "Atropine, pacemaker, treatment of underlying cause.",
  },
  {
    id: "7",
    term: "Chronic",
    category: "General",
    definition: "A condition or disease that persists for a long time, typically more than three months.",
  },
  {
    id: "8",
    term: "Diabetes Mellitus",
    category: "Endocrinology",
    definition: "A group of metabolic diseases characterized by high blood sugar levels over a prolonged period.",
    symptoms: "Increased thirst, frequent urination, extreme hunger, unexplained weight loss, fatigue.",
    diagnosis: "Fasting plasma glucose test, HbA1c test, oral glucose tolerance test.",
    treatment: "Insulin therapy, oral medications, lifestyle modifications, blood sugar monitoring.",
  },
  {
    id: "9",
    term: "Dyspnea",
    category: "Pulmonology",
    definition: "Difficult or labored breathing; shortness of breath.",
    symptoms: "Tightness in chest, rapid breathing, feeling of suffocation, wheezing.",
    diagnosis: "Physical examination, chest X-ray, pulmonary function tests, arterial blood gas analysis.",
    treatment: "Oxygen therapy, bronchodilators, corticosteroids, treatment of underlying cause.",
  },
  {
    id: "10",
    term: "Edema",
    category: "General",
    definition: "Swelling caused by excess fluid trapped in the body's tissues, most commonly in the legs, ankles, and feet.",
    symptoms: "Swelling, stretched or shiny skin, skin that retains a dimple after being pressed.",
    diagnosis: "Physical examination, blood tests, urine tests, imaging studies.",
    treatment: "Diuretics, compression stockings, elevation of affected limbs, dietary salt restriction.",
  },
  {
    id: "11",
    term: "Electrocardiogram (ECG/EKG)",
    category: "Cardiology",
    definition: "A test that records the electrical activity of the heart to detect abnormalities in rhythm, rate, and structure.",
    diagnosis: "Waveform analysis by a cardiologist for arrhythmias, ischemia, infarction, chamber enlargement.",
  },
  {
    id: "12",
    term: "Endoscopy",
    category: "Gastroenterology",
    definition: "A procedure that uses a flexible tube with a camera to examine the inside of the digestive tract.",
    diagnosis: "Visual inspection of mucosal surfaces, biopsy collection for histological analysis.",
  },
  {
    id: "13",
    term: "Hypertension",
    category: "Cardiology",
    definition: "A condition in which the force of the blood against the artery walls is consistently too high.",
    symptoms: "Often asymptomatic (the 'silent killer'); severe cases may cause headaches, shortness of breath, nosebleeds.",
    diagnosis: "Blood pressure measurement on multiple occasions; ambulatory blood pressure monitoring.",
    treatment: "Lifestyle changes, antihypertensive medications (ACE inhibitors, beta-blockers, diuretics).",
  },
  {
    id: "14",
    term: "Hypotension",
    category: "Cardiology",
    definition: "Abnormally low blood pressure, generally defined as below 90/60 mmHg.",
    symptoms: "Dizziness, fainting, blurred vision, nausea, fatigue, lack of concentration.",
    diagnosis: "Blood pressure measurement, tilt table test, blood tests, ECG.",
    treatment: "Fluid replacement, medications (midodrine, fludrocortisone), compression stockings.",
  },
  {
    id: "15",
    term: "Ischemia",
    category: "Cardiology",
    definition: "Inadequate blood supply to an organ or part of the body, especially the heart muscles.",
    symptoms: "Chest pain (angina), shortness of breath, fatigue, irregular heartbeat.",
    diagnosis: "ECG, stress test, coronary angiography, cardiac MRI.",
    treatment: "Medications (nitrates, beta-blockers), angioplasty, coronary artery bypass grafting (CABG).",
  },
  {
    id: "16",
    term: "Metastasis",
    category: "Oncology",
    definition: "The spread of cancer cells from the primary site to other parts of the body through the bloodstream or lymphatic system.",
    diagnosis: "Imaging studies (CT, MRI, PET scans), biopsy of suspected metastatic sites, tumor markers.",
    treatment: "Chemotherapy, radiation therapy, targeted therapy, immunotherapy, surgery.",
  },
  {
    id: "17",
    term: "Nephrology",
    category: "Specialty",
    definition: "The branch of medicine that deals with the study, diagnosis, and treatment of kidney diseases.",
  },
  {
    id: "18",
    term: "Osteoporosis",
    category: "Rheumatology",
    definition: "A bone disease that develops when bone mineral density and bone mass decrease, leading to weakened bones.",
    symptoms: "Back pain, loss of height over time, stooped posture, bone fractures that occur more easily.",
    diagnosis: "Bone mineral density (BMD) test using DEXA scan, blood tests for calcium and vitamin D levels.",
    treatment: "Calcium and vitamin D supplements, bisphosphonates, hormone-related therapy, weight-bearing exercise.",
  },
  {
    id: "19",
    term: "Palliative Care",
    category: "General",
    definition: "Specialized medical care focused on providing relief from the symptoms and stress of a serious illness.",
    treatment: "Pain management, symptom control, psychological support, coordination of care.",
  },
  {
    id: "20",
    term: "Pneumonia",
    category: "Pulmonology",
    definition: "An infection that inflames the air sacs in one or both lungs, which may fill with fluid or pus.",
    symptoms: "Chest pain, confusion, cough with phlegm, fatigue, fever, shortness of breath.",
    diagnosis: "Chest X-ray, blood tests, sputum culture, pulse oximetry.",
    treatment: "Antibiotics (bacterial), antivirals (viral), oxygen therapy, fluids, rest.",
  },
  {
    id: "21",
    term: "Remission",
    category: "Oncology",
    definition: "A decrease in or disappearance of signs and symptoms of cancer. Remission may be partial or complete.",
    diagnosis: "Imaging studies, blood tests, physical examination to confirm absence of detectable disease.",
  },
  {
    id: "22",
    term: "Sepsis",
    category: "Infectious Disease",
    definition: "A life-threatening condition caused by the body's overwhelming response to an infection, which can lead to tissue damage and organ failure.",
    symptoms: "Fever, chills, rapid breathing, rapid heart rate, confusion, extreme pain.",
    diagnosis: "Blood cultures, lactate levels, complete blood count, procalcitonin levels.",
    treatment: "Immediate broad-spectrum antibiotics, IV fluids, vasopressors, organ support.",
  },
  {
    id: "23",
    term: "Tachycardia",
    category: "Cardiology",
    definition: "A heart rate that exceeds the normal resting rate, typically over 100 beats per minute in adults.",
    symptoms: "Palpitations, dizziness, lightheadedness, shortness of breath, chest pain.",
    diagnosis: "ECG, Holter monitor, electrophysiology studies, blood tests.",
    treatment: "Vagal maneuvers, medications (beta-blockers, calcium channel blockers), catheter ablation.",
  },
  {
    id: "24",
    term: "Tumor Marker",
    category: "Oncology",
    definition: "Substances found in blood, urine, or body tissues that can be elevated in the presence of cancer.",
    diagnosis: "Blood tests (PSA, CA-125, CEA, AFP), imaging studies, tissue biopsy.",
    treatment: "Varies based on the type and stage of cancer detected through marker evaluation.",
  },
  {
    id: "25",
    term: "Ultrasound",
    category: "Radiology",
    definition: "A diagnostic imaging technique that uses high-frequency sound waves to create images of organs and structures inside the body.",
    diagnosis: "Visualization of internal organs, blood flow assessment, detection of abnormalities in soft tissues.",
  },
];

const categories = Array.from(new Set(defaultTerms.map((t) => t.category)));

export default function MedicalDictionary() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredTerms = useMemo(() => {
    let result = defaultTerms;
    if (selectedCategory !== "All") {
      result = result.filter((t) => t.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          t.definition.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, selectedCategory]);

  const totalCount = defaultTerms.length;

  return (
    <PortalLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Book className="h-6 w-6 text-primary" />
            <h1 className="font-display text-3xl text-primary font-bold">
              Medical Dictionary
            </h1>
          </div>
          <p className="text-muted-foreground">
            Search and reference essential medical terms, conditions, and procedures.
          </p>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search medical terms, definitions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === "All"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-card border border-border/60 text-foreground/70 hover:bg-card/80"
              }`}
            >
              All ({totalCount})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-card border border-border/60 text-foreground/70 hover:bg-card/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Terms List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTerms.map((term, index) => {
              const isExpanded = expandedId === term.id;
              return (
                <motion.div
                  key={term.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className={`rounded-xl border transition-all cursor-pointer ${
                    isExpanded
                      ? "border-primary/40 bg-card shadow-soft"
                      : "border-border/40 bg-card/40 hover:bg-card/80 hover:border-border/60"
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : term.id)}
                >
                  <div className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-semibold text-primary truncate">
                          {term.term}
                        </h3>
                        <span className="text-[11px] font-medium text-primary-glow uppercase tracking-wider">
                          {term.category}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground mb-1">Definition</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {term.definition}
                            </p>
                          </div>

                          {term.symptoms && (
                            <div>
                              <p className="text-sm font-semibold text-foreground mb-1">Symptoms</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {term.symptoms}
                              </p>
                            </div>
                          )}

                          {term.diagnosis && (
                            <div>
                              <p className="text-sm font-semibold text-foreground mb-1">Diagnosis</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {term.diagnosis}
                              </p>
                            </div>
                          )}

                          {term.treatment && (
                            <div>
                              <p className="text-sm font-semibold text-foreground mb-1">Treatment</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {term.treatment}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredTerms.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              No medical terms found matching your search.
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Try a different keyword or category.
            </p>
          </motion.div>
        )}
      </div>
    </PortalLayout>
  );
}
