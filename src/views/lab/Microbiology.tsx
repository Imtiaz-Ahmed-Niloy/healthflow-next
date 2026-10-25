"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bug,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Printer,
  ShieldAlert,
  Beaker,
  Thermometer,
  Layers,
  ChevronDown,
  X,
  Sparkles,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { toast } from "sonner";

interface AntibioticSensitivity {
  name: string;
  category: string;
  mic?: string;
  zone_mm?: number;
  result: "S" | "I" | "R"; // Sensitive, Intermediate, Resistant
}

interface CultureRecord {
  id: string;
  accession: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  specimen_type: string; // Urine, Blood, Sputum, Pus/Wound Swab, CSF
  collection_time: string;
  incubation_hours: number;
  stage: "incubating" | "preliminary" | "finalized";
  growth_status: "growth" | "no_growth" | "pending";
  colony_count?: string;
  isolated_organism?: string;
  gram_stain?: string;
  mdr_flag?: boolean;
  esbl_flag?: boolean;
  mrsa_flag?: boolean;
  doctor_name: string;
  sensitivities: AntibioticSensitivity[];
  preliminary_notes?: string;
}

const SAMPLE_CULTURES: CultureRecord[] = [
  {
    id: "cult-1",
    accession: "MC-2026-041",
    patient_name: "Tanzir Hossain",
    patient_age: 48,
    patient_gender: "Male",
    specimen_type: "Mid-Stream Urine (MSU)",
    collection_time: "Yesterday, 10:30 AM",
    incubation_hours: 42,
    stage: "finalized",
    growth_status: "growth",
    colony_count: "> 100,000 CFU/mL (Significant)",
    isolated_organism: "Escherichia coli",
    gram_stain: "Gram-negative bacilli",
    esbl_flag: true,
    mdr_flag: true,
    doctor_name: "Dr. Farhan Tanvir (Urology)",
    sensitivities: [
      { name: "Amikacin", category: "Aminoglycosides", mic: "≤ 4", zone_mm: 20, result: "S" },
      { name: "Gentamicin", category: "Aminoglycosides", mic: "≤ 1", zone_mm: 19, result: "S" },
      { name: "Meropenem", category: "Carbapenems", mic: "≤ 0.25", zone_mm: 28, result: "S" },
      { name: "Imipenem", category: "Carbapenems", mic: "≤ 0.5", zone_mm: 26, result: "S" },
      { name: "Ceftriaxone", category: "Cephalosporins (3rd Gen)", mic: "> 32", zone_mm: 10, result: "R" },
      { name: "Cefepime", category: "Cephalosporins (4th Gen)", mic: "> 16", zone_mm: 12, result: "R" },
      { name: "Ciprofloxacin", category: "Fluoroquinolones", mic: "> 4", zone_mm: 11, result: "R" },
      { name: "Levofloxacin", category: "Fluoroquinolones", mic: "> 8", zone_mm: 10, result: "R" },
      { name: "Nitrofurantoin", category: "Nitrofurans", mic: "16", zone_mm: 22, result: "S" },
      { name: "Piperacillin-Tazobactam", category: "Penicillin/Inhibitor", mic: "8/4", zone_mm: 21, result: "S" },
      { name: "Trimethoprim-Sulfamethoxazole", category: "Folate Pathway", mic: "> 16/304", zone_mm: 8, result: "R" },
      { name: "Colistin", category: "Polymyxins", mic: "≤ 1", zone_mm: 18, result: "S" },
    ],
    preliminary_notes: "ESBL positive phenotype detected. Advised infectious disease consult for targeted carbapenem or aminoglycoside therapy.",
  },
  {
    id: "cult-2",
    accession: "MC-2026-042",
    patient_name: "Sharmin Sultana",
    patient_age: 32,
    patient_gender: "Female",
    specimen_type: "Blood (Aerobic + Anaerobic)",
    collection_time: "Today, 02:15 AM",
    incubation_hours: 18,
    stage: "preliminary",
    growth_status: "growth",
    colony_count: "Growth detected in automated BacT/ALERT bottle",
    isolated_organism: "Staphylococcus aureus (Under Subculture)",
    gram_stain: "Gram-positive cocci in clusters",
    mrsa_flag: true,
    doctor_name: "Prof. Dr. Mahbubur Rahman (ICU)",
    sensitivities: [
      { name: "Vancomycin", category: "Glycopeptides", mic: "1.0", result: "S" },
      { name: "Linezolid", category: "Oxazolidinones", mic: "1.5", result: "S" },
      { name: "Oxacillin / Cefoxitin Screen", category: "Penicillins", result: "R" },
      { name: "Daptomycin", category: "Lipopeptides", mic: "0.5", result: "S" },
      { name: "Ciprofloxacin", category: "Fluoroquinolones", result: "R" },
    ],
    preliminary_notes: "Cefoxitin disc diffusion confirms MRSA. Notify ICU immediately. Vancomycin MIC 1.0 mcg/mL.",
  },
  {
    id: "cult-3",
    accession: "MC-2026-043",
    patient_name: "Golam Mustafa",
    patient_age: 59,
    patient_gender: "Male",
    specimen_type: "Tracheal Aspirate",
    collection_time: "Yesterday, 06:00 PM",
    incubation_hours: 28,
    stage: "preliminary",
    growth_status: "growth",
    colony_count: "> 10^6 CFU/mL",
    isolated_organism: "Klebsiella pneumoniae",
    gram_stain: "Gram-negative mucoid rods",
    mdr_flag: true,
    doctor_name: "Dr. A. K. Azad (Pulmonology)",
    sensitivities: [
      { name: "Meropenem", category: "Carbapenems", result: "I" },
      { name: "Amikacin", category: "Aminoglycosides", result: "S" },
      { name: "Colistin", category: "Polymyxins", result: "S" },
      { name: "Ceftriaxone", category: "Cephalosporins", result: "R" },
      { name: "Levofloxacin", category: "Fluoroquinolones", result: "R" },
    ],
  },
  {
    id: "cult-4",
    accession: "MC-2026-044",
    patient_name: "Nasreen Akter",
    patient_age: 27,
    patient_gender: "Female",
    specimen_type: "Mid-Stream Urine",
    collection_time: "Yesterday, 09:00 AM",
    incubation_hours: 48,
    stage: "finalized",
    growth_status: "no_growth",
    colony_count: "No significant bacteriuria (< 1,000 CFU/mL)",
    doctor_name: "Dr. Laila Parveen (Gynecology)",
    sensitivities: [],
    preliminary_notes: "Aerobic incubation at 37°C for 48 hours shows no significant bacterial growth.",
  },
];

const STANDARD_ANTIBIOTICS = [
  { name: "Amikacin", category: "Aminoglycosides" },
  { name: "Gentamicin", category: "Aminoglycosides" },
  { name: "Meropenem", category: "Carbapenems" },
  { name: "Imipenem", category: "Carbapenems" },
  { name: "Ceftriaxone", category: "Cephalosporins (3rd Gen)" },
  { name: "Cefepime", category: "Cephalosporins (4th Gen)" },
  { name: "Ceftazidime", category: "Cephalosporins (3rd Gen)" },
  { name: "Ciprofloxacin", category: "Fluoroquinolones" },
  { name: "Levofloxacin", category: "Fluoroquinolones" },
  { name: "Piperacillin-Tazobactam", category: "Penicillin/Beta-lactamase" },
  { name: "Colistin", category: "Polymyxins" },
  { name: "Vancomycin", category: "Glycopeptides" },
  { name: "Linezolid", category: "Oxazolidinones" },
  { name: "Nitrofurantoin", category: "Nitrofurans" },
  { name: "Cotrimoxazole", category: "Folate Pathway" },
];

export default function MicrobiologyPage() {
  const [cultures, setCultures] = useState<CultureRecord[]>(SAMPLE_CULTURES);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedCulture, setSelectedCulture] = useState<CultureRecord | null>(SAMPLE_CULTURES[0]);
  const [editingSensitivity, setEditingSensitivity] = useState(false);
  const [showNewCultureModal, setShowNewCultureModal] = useState(false);

  // Filtered cultures
  const filteredCultures = cultures.filter((c) => {
    const matchesSearch =
      c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.accession.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.isolated_organism && c.isolated_organism.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStage = stageFilter === "all" || c.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleSensitivityToggle = (index: number, newResult: "S" | "I" | "R") => {
    if (!selectedCulture) return;
    const updatedSensitivities = [...selectedCulture.sensitivities];
    updatedSensitivities[index] = {
      ...updatedSensitivities[index],
      result: newResult,
    };
    const updatedCulture = { ...selectedCulture, sensitivities: updatedSensitivities };
    setSelectedCulture(updatedCulture);
    setCultures((prev) => prev.map((c) => (c.id === updatedCulture.id ? updatedCulture : c)));
  };

  const handleFinalizeCulture = (cultureId: string) => {
    setCultures((prev) =>
      prev.map((c) => (c.id === cultureId ? { ...c, stage: "finalized" as const } : c))
    );
    if (selectedCulture && selectedCulture.id === cultureId) {
      setSelectedCulture({ ...selectedCulture, stage: "finalized" });
    }
    toast.success("Culture & Susceptibility report finalized and signed!");
  };

  return (
    <LabLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Bug className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Microbiology & AST Antibiogram</h1>
                <p className="text-sm text-muted-foreground">
                  Specimen culture incubation, pathogen identification, CLSI Kirby-Bauer / MIC susceptibility panels
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                toast.info("Printing Hospital Antibiogram Summary (Past 30 days)...");
              }}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all"
            >
              <Printer className="h-4 w-4" />
              Print Cumulative Antibiogram
            </button>
            <button
              onClick={() => {
                toast.success("Incubator automated batch sync verified. 48 bottles online.");
              }}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <Thermometer className="h-4 w-4" />
              BacT/ALERT Sync
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active In Incubation</p>
              <p className="text-2xl font-bold mt-1">36 Bottles</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">37°C Aerobic / Anaerobic</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
              <Thermometer className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Significant Growth</p>
              <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">14 Samples</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Requires Subculture & AST</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
              <Bug className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">MDR / ESBL / MRSA</p>
              <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">5 Detected</p>
              <p className="text-[11px] text-red-500 font-medium mt-0.5">IPC Hospital Alerts Sent</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 text-red-500">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Reports Ready</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">9 Finalized</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Signed by Microbiologist</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Main Work Area: Left list & Right culture detail/sensitivity sheet */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Specimen Culture Worklist (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search accession, patient, organism..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
                >
                  <option value="all">All Stages</option>
                  <option value="incubating">Incubating</option>
                  <option value="preliminary">Preliminary</option>
                  <option value="finalized">Finalized</option>
                </select>
              </div>

              {/* Culture Cards List */}
              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {filteredCultures.map((cult) => {
                  const isSelected = selectedCulture?.id === cult.id;
                  return (
                    <div
                      key={cult.id}
                      onClick={() => setSelectedCulture(cult)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/40"
                          : "border-border/70 bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">{cult.accession}</span>
                            <span className="text-[11px] text-muted-foreground">• {cult.collection_time}</span>
                          </div>
                          <h4 className="text-sm font-semibold mt-1 text-foreground">{cult.patient_name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {cult.patient_gender}, {cult.patient_age}y •{" "}
                            <span className="font-medium text-foreground">{cult.specimen_type}</span>
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                            cult.stage === "finalized"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : cult.stage === "preliminary"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {cult.stage}
                        </span>
                      </div>

                      {/* Organism & Flag Chips */}
                      <div className="mt-2.5 pt-2 border-t border-border/50 flex flex-wrap items-center gap-1.5">
                        {cult.isolated_organism ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold italic rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300">
                            <Bug className="h-3 w-3" />
                            {cult.isolated_organism}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">No organism isolated</span>
                        )}

                        {cult.esbl_flag && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-500/10 text-red-600 dark:text-red-400">
                            ESBL+
                          </span>
                        )}
                        {cult.mrsa_flag && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-500/10 text-red-600 dark:text-red-400">
                            MRSA
                          </span>
                        )}
                        {cult.mdr_flag && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            MDR
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredCultures.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No microbiology records matching criteria.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Antimicrobial Susceptibility Testing (AST) Panel (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedCulture ? (
              <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-5">
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary/10 text-primary">
                        {selectedCulture.accession}
                      </span>
                      <h2 className="text-lg font-bold text-foreground">{selectedCulture.patient_name}</h2>
                      <span className="text-xs text-muted-foreground">
                        ({selectedCulture.patient_gender}, {selectedCulture.patient_age}y)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Doctor: <span className="font-medium text-foreground">{selectedCulture.doctor_name}</span> •
                      Incubation: <span className="font-semibold">{selectedCulture.incubation_hours} hours</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedCulture.stage !== "finalized" && (
                      <button
                        onClick={() => handleFinalizeCulture(selectedCulture.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Finalize & Sign
                      </button>
                    )}
                    <button
                      onClick={() => toast.info(`Printing C/S Report for ${selectedCulture.accession}...`)}
                      className="p-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Print Report"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Culture & Smear Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-muted/20 p-3.5 rounded-xl border border-border/60">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">Specimen & Source</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{selectedCulture.specimen_type}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">Gram Stain Examination</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {selectedCulture.gram_stain || "Pending direct microscopic exam"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">Colony Count / Growth</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {selectedCulture.colony_count || "Inoculated on CLED & MacConkey agar"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">Isolated Pathogen</p>
                    <p className="text-sm font-bold text-purple-700 dark:text-purple-300 mt-0.5 italic">
                      {selectedCulture.isolated_organism || "No bacterial growth isolated"}
                    </p>
                  </div>
                </div>

                {/* AST Grid Title & Legend */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        CLSI Antibiotic Susceptibility Testing (AST)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Kirby-Bauer Disk Diffusion / Minimum Inhibitory Concentration (MIC)
                      </p>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> S: Sensitive
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                        <span className="h-2 w-2 rounded-full bg-amber-500" /> I: Intermediate
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                        <span className="h-2 w-2 rounded-full bg-red-500" /> R: Resistant
                      </span>
                    </div>
                  </div>

                  {/* Sensitivity Table */}
                  {selectedCulture.sensitivities.length > 0 ? (
                    <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                          <tr>
                            <th className="py-2.5 px-3">Antimicrobial Agent</th>
                            <th className="py-2.5 px-3">Drug Class</th>
                            <th className="py-2.5 px-3">MIC (µg/mL)</th>
                            <th className="py-2.5 px-3 text-center">CLSI Interpretation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-medium">
                          {selectedCulture.sensitivities.map((s, idx) => (
                            <tr key={s.name} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2 px-3 font-semibold text-foreground">{s.name}</td>
                              <td className="py-2 px-3 text-muted-foreground">{s.category}</td>
                              <td className="py-2 px-3 font-mono text-muted-foreground">{s.mic || "—"}</td>
                              <td className="py-2 px-3 text-center">
                                <div className="inline-flex rounded-lg border border-border p-0.5 bg-background shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => handleSensitivityToggle(idx, "S")}
                                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded transition-all ${
                                      s.result === "S"
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    S
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSensitivityToggle(idx, "I")}
                                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded transition-all ${
                                      s.result === "I"
                                        ? "bg-amber-500 text-white shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    I
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSensitivityToggle(idx, "R")}
                                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded transition-all ${
                                      s.result === "R"
                                        ? "bg-red-600 text-white shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    R
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                      No antimicrobial sensitivity testing required (specimen shows no bacterial growth or contaminated).
                    </div>
                  )}
                </div>

                {/* Remarks & Clinical Microbiologist Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Microbiologist Comments & Antibiogram Recommendation:
                  </label>
                  <textarea
                    rows={2}
                    value={selectedCulture.preliminary_notes || ""}
                    onChange={(e) => {
                      const updated = { ...selectedCulture, preliminary_notes: e.target.value };
                      setSelectedCulture(updated);
                      setCultures((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                    }}
                    placeholder="Enter clinical notes, infection prevention remarks, or suggested antibiotic alternatives..."
                    className="w-full text-xs p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            ) : (
              <div className="p-12 text-center border border-border rounded-xl bg-card text-muted-foreground">
                <Bug className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-semibold">Select a culture sample from the worklist to review AST</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </LabLayout>
  );
}
