"use client";

import React, { useState } from "react";
import {
  X,
  User,
  Phone,
  Calendar,
  Clock,
  Printer,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Plus,
  Trash2,
  Search,
  Syringe,
  Sparkles,
  Volume2,
  ShieldCheck,
  Check,
  Copy,
  Scan,
  Tag,
  Layers,
} from "lucide-react";
import { type LabQueueItem, saveLabQueue, getLabQueue } from "@/lib/labQueueStore";
import { toast } from "sonner";
import { BRAND_INFO } from "@/constants/brand";

interface CatalogTest {
  id: string;
  code: string;
  name: string;
  department: string;
  price: number;
  sample_tube: string;
  fasting_required?: boolean;
}

const TEST_DIRECTORY: CatalogTest[] = [
  { id: "t1", code: "CBC-01", name: "Complete Blood Count (CBC) with ESR", department: "Hematology", price: 450, sample_tube: "EDTA (Purple)" },
  { id: "t2", code: "LIP-02", name: "Lipid Profile (Cholesterol, TG, HDL, LDL)", department: "Biochemistry", price: 1100, fasting_required: true, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t3", code: "HBA-03", name: "HbA1c (Glycated Hemoglobin)", department: "Biochemistry", price: 900, sample_tube: "EDTA (Purple)" },
  { id: "t4", code: "KFT-04", name: "Renal Panel (Creatinine, Urea, Uric Acid)", department: "Biochemistry", price: 850, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t5", code: "LFT-05", name: "Liver Function Test (SGPT, SGOT, Bilirubin)", department: "Biochemistry", price: 1200, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t6", code: "THY-06", name: "Thyroid Panel (FT3, FT4, TSH Ultra)", department: "Immunology", price: 1600, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t7", code: "URI-07", name: "Urine Routine & Microscopic Exam (R/M/E)", department: "Clinical Pathology", price: 250, sample_tube: "Sterile Urine Cup" },
  { id: "t8", code: "ELE-08", name: "Serum Electrolytes (Na+, K+, Cl-)", department: "Biochemistry", price: 800, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t9", code: "DEN-09", name: "Dengue Duo (NS1 Antigen + IgG/IgM)", department: "Serology", price: 850, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t10", code: "VIT-10", name: "Vitamin D3 (25-Hydroxy)", department: "Special Chemistry", price: 2400, sample_tube: "Serum Clot (Gold/Red)" },
  { id: "t11", code: "CUL-11", name: "Urine Culture & Sensitivity (C/S)", department: "Microbiology", price: 950, sample_tube: "Sterile Container" },
  { id: "t12", code: "COA-12", name: "Prothrombin Time (PT / INR)", department: "Hematology", price: 750, sample_tube: "Sodium Citrate (Blue)" },
  { id: "t13", code: "GLU-13", name: "Fasting Blood Sugar (Fluoride)", department: "Biochemistry", price: 200, fasting_required: true, sample_tube: "Sodium Fluoride (Gray)" },
  { id: "t14", code: "BCU-14", name: "Blood Culture & Sensitivity (Aerobic)", department: "Microbiology", price: 1400, sample_tube: "Blood Culture SPS Bottle" },
];

export interface GeneratedTubeLabel {
  tubeId: string;
  barcode: string;
  sample_tube: string;
  capColor: string;
  capBgClass: string;
  tests: string[];
  volume: string;
  department: string;
  verified?: boolean;
}

export const QueuePatientDetailsModal = ({
  patient,
  open,
  onClose,
  onUpdatePatient,
  onCallPatient,
  onSeatInChair,
  onCompleteCollection,
}: {
  patient: LabQueueItem | null;
  open: boolean;
  onClose: () => void;
  onUpdatePatient: (updated: LabQueueItem) => void;
  onCallPatient: (patient: LabQueueItem) => void;
  onSeatInChair: (patient: LabQueueItem) => void;
  onCompleteCollection: (patient: LabQueueItem) => void;
}) => {
  const [activeTab, setActiveTab] = useState<"labels" | "tests" | "patient">("labels");
  const [searchTest, setSearchTest] = useState("");
  const [showAddTestSelector, setShowAddTestSelector] = useState(false);
  const [verifiedTubes, setVerifiedTubes] = useState<Record<string, boolean>>({});

  if (!open || !patient) return null;

  // Group ordered tests into vacuum tube specimen labels
  const groupedTestsByTube = patient.tests.reduce<Record<string, typeof patient.tests>>((acc, test) => {
    (acc[test.sample_tube] ||= []).push(test);
    return acc;
  }, {});

  const tubeLabels: GeneratedTubeLabel[] = Object.entries(groupedTestsByTube).map(([tubeType, tests], idx) => {
    let capColor = "#0284c7";
    let capBgClass = "bg-sky-500 text-white";
    let volume = "4.0 mL";
    let department = tests[0]?.department || "Clinical Pathology";

    if (tubeType.includes("EDTA") || tubeType.includes("Purple")) {
      capColor = "#9333ea";
      capBgClass = "bg-purple-600 text-white";
      volume = "3.0 mL (K2-EDTA)";
      department = "Hematology";
    } else if (tubeType.includes("Serum") || tubeType.includes("Gold") || tubeType.includes("Red")) {
      capColor = "#eab308";
      capBgClass = "bg-amber-500 text-black";
      volume = "5.0 mL (Clot SST Gel)";
      department = "Biochemistry / Immunology";
    } else if (tubeType.includes("Citrate") || tubeType.includes("Blue")) {
      capColor = "#0284c7";
      capBgClass = "bg-sky-600 text-white";
      volume = "2.7 mL (Sodium Citrate)";
      department = "Coagulation";
    } else if (tubeType.includes("Fluoride") || tubeType.includes("Gray")) {
      capColor = "#64748b";
      capBgClass = "bg-slate-500 text-white";
      volume = "2.0 mL (Na-Fluoride)";
      department = "Clinical Biochemistry";
    } else if (tubeType.includes("Urine") || tubeType.includes("Cup") || tubeType.includes("Container")) {
      capColor = "#ca8a04";
      capBgClass = "bg-yellow-500 text-black";
      volume = "20-30 mL (Sterile)";
      department = "Clinical Pathology / Micro";
    } else if (tubeType.includes("Culture") || tubeType.includes("SPS")) {
      capColor = "#16a34a";
      capBgClass = "bg-emerald-600 text-white";
      volume = "8-10 mL (Aerobic SPS)";
      department = "Microbiology";
    }

    const tubeBarcode = `${patient.token_no.replace("-", "")}-${patient.invoice_no.slice(-4)}-T0${idx + 1}`;

    return {
      tubeId: `tube-${idx + 1}`,
      barcode: tubeBarcode,
      sample_tube: tubeType,
      capColor,
      capBgClass,
      tests: tests.map((t) => t.code || t.name),
      volume,
      department,
      verified: !!verifiedTubes[tubeBarcode],
    };
  });

  // Action: Add an additional test to this patient
  const handleAddTest = (catalogItem: CatalogTest) => {
    if (patient.tests.some((t) => t.code === catalogItem.code)) {
      toast.info(`${catalogItem.name} is already ordered for this patient.`);
      return;
    }

    const updatedTests = [
      ...patient.tests,
      {
        code: catalogItem.code,
        name: catalogItem.name,
        department: catalogItem.department,
        sample_tube: catalogItem.sample_tube,
        fasting_required: catalogItem.fasting_required,
      },
    ];

    const uniqueTubesCount = new Set(updatedTests.map((t) => t.sample_tube)).size;
    const isFasting = updatedTests.some((t) => t.fasting_required);

    const updatedPatient: LabQueueItem = {
      ...patient,
      tests: updatedTests,
      total_tubes: uniqueTubesCount,
      priority: isFasting ? "fasting" : patient.priority,
    };

    onUpdatePatient(updatedPatient);

    // Save to shared localStorage queue
    const all = getLabQueue().map((item) => (item.id === patient.id ? updatedPatient : item));
    saveLabQueue(all);

    toast.success(`Added ${catalogItem.name}!`, {
      description: `Requires ${catalogItem.sample_tube}. Specimen labels updated.`,
    });
    setShowAddTestSelector(false);
  };

  // Action: Remove a test from patient
  const handleRemoveTest = (code: string) => {
    if (patient.tests.length <= 1) {
      toast.error("A specimen order must contain at least one test.");
      return;
    }

    const updatedTests = patient.tests.filter((t) => t.code !== code);
    const uniqueTubesCount = new Set(updatedTests.map((t) => t.sample_tube)).size;

    const updatedPatient: LabQueueItem = {
      ...patient,
      tests: updatedTests,
      total_tubes: uniqueTubesCount,
    };

    onUpdatePatient(updatedPatient);
    const all = getLabQueue().map((item) => (item.id === patient.id ? updatedPatient : item));
    saveLabQueue(all);
    toast.info("Test removed from accessioning queue.");
  };

  // Action: Scan / Verify Barcode on Tube
  const handleVerifyBarcode = (barcode: string) => {
    setVerifiedTubes((prev) => ({ ...prev, [barcode]: true }));
    toast.success(`Barcode ${barcode} Verified!`, {
      description: `Patient Identity & Specimen Container match confirmed.`,
    });
  };

  // Action: Print Barcode Labels (50mm x 30mm thermal label layout)
  const handlePrintAllLabels = () => {
    const title = `Barcodes-${patient.token_no}-${patient.patient_name}`;
    const css = `
      @page { size: 50mm 30mm; margin: 1.5mm; }
      * { box-sizing: border-box; }
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        margin: 0;
        padding: 0;
        background: #fff;
        color: #000;
        width: 47mm;
        font-size: 8px;
        line-height: 1.15;
      }
      .label-page {
        width: 47mm;
        height: 27mm;
        page-break-after: always;
        border: 1px dashed #cbd5e1;
        padding: 1.5mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .tube-bar {
        font-size: 7px;
        font-weight: 800;
        text-transform: uppercase;
        padding: 1px 3px;
        background: #0f172a;
        color: #fff;
        display: flex;
        justify-content: space-between;
      }
      .pt-name {
        font-size: 9px;
        font-weight: 900;
        margin: 1px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .barcode-visual {
        font-family: monospace;
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 2.5px;
        text-align: center;
        margin: 1px 0;
      }
      .b-code {
        font-family: monospace;
        font-size: 8px;
        font-weight: 700;
        text-align: center;
      }
      .tests-line {
        font-size: 7.5px;
        font-weight: 700;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .foot-row {
        display: flex;
        justify-content: space-between;
        font-size: 6.5px;
        color: #475569;
        border-top: 0.5px solid #000;
        padding-top: 1px;
      }
    `;

    const body = tubeLabels
      .map(
        (tube) => `
      <div class="label-page">
        <div class="tube-bar" style="background:${tube.capColor};color:${tube.capColor === "#eab308" || tube.capColor === "#ca8a04" ? "#000" : "#fff"};">
          <span>${tube.sample_tube.split("(")[0]}</span>
          <span>${tube.volume}</span>
        </div>
        <div class="pt-name">${patient.patient_name} (${patient.patient_gender[0]}, ${patient.patient_age}y)</div>
        <div style="font-size:7px;display:flex;justify-content:space-between;">
          <span>MRN: <b>${patient.mrn_number || "OPD"}</b></span>
          <span>Token: <b>${patient.token_no}</b></span>
        </div>
        <div class="barcode-visual">|||| ||||| |||| || |||</div>
        <div class="b-code">${tube.barcode}</div>
        <div class="tests-line">${tube.tests.join(" • ")}</div>
        <div class="foot-row">
          <span>${patient.counter.split("(")[0]}</span>
          <span>${new Date().toLocaleDateString([], { month: "short", day: "numeric" })} ${patient.created_at}</span>
        </div>
      </div>
    `
      )
      .join("");

    const w = window.open("", "_blank", "width=450,height=600");
    if (!w) {
      toast.error("Pop-up blocked. Please allow pop-ups to print barcode labels.");
      return;
    }
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head>` +
        `<body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`
    );
    w.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-2xl shadow-2xl border border-border/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-black px-2.5 py-1 rounded-lg bg-primary text-primary-foreground">
              {patient.token_no}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground">{patient.patient_name}</h3>
                <span className="text-xs text-muted-foreground">
                  ({patient.patient_gender}, {patient.patient_age} years)
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    patient.status === "completed"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : patient.status === "serving"
                      ? "bg-primary/15 text-primary"
                      : patient.status === "called"
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {patient.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Invoice: <span className="font-mono font-semibold text-foreground">{patient.invoice_no}</span> • Phone:{" "}
                <span className="font-medium text-foreground">{patient.patient_phone}</span> • Assigned:{" "}
                <span className="font-semibold text-primary">{patient.counter}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCallPatient(patient)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Call
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border px-6 bg-card">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("labels")}
              className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === "labels"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <QrCode className="h-4 w-4" />
              Specimen Tube Barcodes ({tubeLabels.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tests")}
              className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === "tests"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Syringe className="h-4 w-4" />
              Test Ordering & Panels ({patient.tests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("patient")}
              className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === "patient"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-4 w-4" />
              Patient & Clinical Info
            </button>
          </div>

          {activeTab === "labels" && (
            <button
              type="button"
              onClick={handlePrintAllLabels}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print All {tubeLabels.length} Labels (50x30mm)
            </button>
          )}

          {activeTab === "tests" && (
            <button
              type="button"
              onClick={() => setShowAddTestSelector(!showAddTestSelector)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              + Order Additional Test
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 bg-muted/10">
          {/* TAB 1: SPECIMEN TUBE BARCODES */}
          {activeTab === "labels" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    Generated Vacuum Tube Specimen Labels
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Color-coded according to CLSI Order of Draw standard. Print stickers and attach to sample tubes.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
                  {tubeLabels.length} Tubes Required
                </span>
              </div>

              {/* Labels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tubeLabels.map((tube, idx) => (
                  <div
                    key={tube.tubeId}
                    className="rounded-xl border border-border bg-card p-3.5 shadow-sm space-y-2 flex flex-col justify-between hover:border-primary/50 transition-all"
                  >
                    <div>
                      {/* Tube Cap Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${tube.capBgClass}`}
                        >
                          {tube.sample_tube.split("(")[0]}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                          Tube #{idx + 1}
                        </span>
                      </div>

                      {/* Barcode & Patient Sticker Representation */}
                      <div className="my-2 p-2.5 rounded-lg border border-dashed border-border/80 bg-muted/30 font-mono text-center space-y-1">
                        <p className="font-bold text-xs text-foreground tracking-tight line-clamp-1">
                          {patient.patient_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          MRN: {patient.mrn_number || "OPD"} • {patient.token_no}
                        </p>
                        <div className="text-sm font-black tracking-widest text-foreground my-1">
                          |||| ||||| |||| || |||
                        </div>
                        <p className="text-[11px] font-bold text-primary">{tube.barcode}</p>
                      </div>

                      {/* Tests in this tube */}
                      <div className="space-y-1 text-xs">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">
                          Investigations for this tube:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {tube.tests.map((tName) => (
                            <span
                              key={tName}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-foreground"
                            >
                              {tName}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground pt-1">
                          Specs: <span className="text-foreground font-medium">{tube.volume}</span> • {tube.department}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action for Individual Tube */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleVerifyBarcode(tube.barcode)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all flex items-center gap-1 ${
                          tube.verified
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold"
                            : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tube.verified ? (
                          <>
                            <Check className="h-3 w-3" /> Verified
                          </>
                        ) : (
                          <>
                            <Scan className="h-3 w-3" /> Scan Tube
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handlePrintAllLabels}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Print this label"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: TEST ORDERING & PANELS */}
          {activeTab === "tests" && (
            <div className="space-y-5">
              {/* Add New Test Section (If expanded) */}
              {showAddTestSelector && (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="h-4 w-4 text-primary" />
                      Add Test from Laboratory Directory
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddTestSelector(false)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchTest}
                      onChange={(e) => setSearchTest(e.target.value)}
                      placeholder="Search test name, code, or department..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {TEST_DIRECTORY.filter(
                      (t) =>
                        t.name.toLowerCase().includes(searchTest.toLowerCase()) ||
                        t.code.toLowerCase().includes(searchTest.toLowerCase()) ||
                        t.department.toLowerCase().includes(searchTest.toLowerCase())
                    ).map((item) => {
                      const isAlreadyOrdered = patient.tests.some((t) => t.code === item.code);
                      return (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[10px] text-primary">{item.code}</span>
                              <p className="font-semibold text-foreground truncate">{item.name}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {item.sample_tube} • ৳{item.price}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={isAlreadyOrdered}
                            onClick={() => handleAddTest(item)}
                            className="px-2 py-1 text-[11px] font-semibold rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all shrink-0"
                          >
                            {isAlreadyOrdered ? "Ordered" : "+ Add"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ordered Tests List */}
              <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/70">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
                    Currently Ordered Tests ({patient.tests.length})
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    Total Required Tubes: <strong className="text-foreground">{patient.total_tubes}</strong>
                  </span>
                </div>

                <div className="divide-y divide-border/60">
                  {patient.tests.map((test, i) => (
                    <div key={test.code} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-muted-foreground font-bold">{i + 1}.</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-primary text-[11px]">{test.code}</span>
                            <span className="font-semibold text-foreground">{test.name}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {test.department} • Container:{" "}
                            <strong className="text-foreground">{test.sample_tube}</strong>
                            {test.fasting_required && (
                              <span className="text-amber-600 dark:text-amber-400 font-bold ml-1">
                                [Fasting 10-12h]
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTest(test.code)}
                        className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
                        title="Remove Test"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PATIENT & CLINICAL INFO */}
          {activeTab === "patient" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border bg-card shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Patient Full Name</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{patient.patient_name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Contact Phone</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{patient.patient_phone}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Age & Gender</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {patient.patient_age} Years • {patient.patient_gender}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">MRN / Hospital UHID</p>
                  <p className="font-mono font-semibold text-foreground mt-0.5">{patient.mrn_number || "WALK-IN OPD"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Referring Doctor</p>
                  <p className="font-semibold text-foreground mt-0.5">{patient.referring_doctor}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Assigned Phlebotomy Desk</p>
                  <p className="font-bold text-primary mt-0.5">{patient.counter}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Billing Reference</p>
                  <p className="font-mono text-foreground mt-0.5">{patient.invoice_no}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Billed & Queued Time</p>
                  <p className="text-foreground mt-0.5">{patient.created_at}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-border bg-card">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-foreground transition-all"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrintAllLabels}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-foreground transition-all"
            >
              <Printer className="h-4 w-4" />
              Print Tube Stickers
            </button>
          </div>

          <div className="flex items-center gap-2">
            {patient.status === "waiting" || patient.status === "called" ? (
              <button
                type="button"
                onClick={() => {
                  onSeatInChair(patient);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-all shadow-xs"
              >
                <Syringe className="h-4 w-4" />
                Seat in Chair & Draw
              </button>
            ) : null}

            {patient.status !== "completed" ? (
              <button
                type="button"
                onClick={() => {
                  onCompleteCollection(patient);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Collected & Accession ({tubeLabels.length} Tubes)
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="h-4 w-4" /> Specimen Fully Collected & Dispatched
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
