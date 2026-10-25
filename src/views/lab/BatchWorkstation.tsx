"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Save,
  Download,
  Upload,
  RefreshCw,
  Cpu,
  Filter,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { toast } from "sonner";

interface BatchRow {
  id: string;
  pos: number;
  sample_id: string;
  patient_name: string;
  patient_info: string;
  test_name: string;
  val1: string; // Primary analyte value
  val2?: string; // Secondary analyte (e.g. for panels)
  status: "pending" | "entered" | "approved";
  flag?: "normal" | "high" | "low" | "critical";
  unit: string;
  ref_range: string;
}

const RUN_PRESETS = [
  {
    id: "fbg",
    name: "Fasting Blood Glucose (Morning OPD Run)",
    analyte1: "Fasting Blood Glucose (FBG)",
    unit1: "mmol/L",
    ref1: "3.9 – 6.1 mmol/L",
    critLow: 2.8,
    critHigh: 16.7,
    high: 6.1,
    low: 3.9,
    analyzer: "Roche Cobas c311 - Carousel A",
  },
  {
    id: "creat",
    name: "Serum Creatinine (Renal Run)",
    analyte1: "Serum Creatinine",
    unit1: "mg/dL",
    ref1: "0.6 – 1.2 mg/dL",
    critLow: 0.3,
    critHigh: 4.0,
    high: 1.3,
    low: 0.6,
    analyzer: "Mindray BS-480 Rack 2",
  },
  {
    id: "elec",
    name: "Serum Electrolytes (Na+ / K+ Panel)",
    analyte1: "Serum Sodium (Na+)",
    unit1: "mEq/L",
    ref1: "135 – 145 mEq/L",
    analyte2: "Serum Potassium (K+)",
    unit2: "mEq/L",
    ref2: "3.5 – 5.1 mEq/L",
    analyzer: "Starlyte ISE Electrolyte Analyzer",
  },
  {
    id: "urine",
    name: "Urine Protein / Albumin Dipstick",
    analyte1: "Urine Protein (Albumin)",
    unit1: "Semi-quant",
    ref1: "Negative",
    analyzer: "Manual / Urilyzer 100 Pro",
  },
];

const INITIAL_ROWS: BatchRow[] = [
  {
    id: "r-1",
    pos: 1,
    sample_id: "SMP-10491",
    patient_name: "Abdul Karim",
    patient_info: "58y • Male • OPD",
    test_name: "Fasting Blood Sugar",
    val1: "5.4",
    status: "approved",
    flag: "normal",
    unit: "mmol/L",
    ref_range: "3.9 – 6.1",
  },
  {
    id: "r-2",
    pos: 2,
    sample_id: "SMP-10492",
    patient_name: "Sultana Razia",
    patient_info: "44y • Female • OPD",
    test_name: "Fasting Blood Sugar",
    val1: "11.2",
    status: "entered",
    flag: "high",
    unit: "mmol/L",
    ref_range: "3.9 – 6.1",
  },
  {
    id: "r-3",
    pos: 3,
    sample_id: "SMP-10493",
    patient_name: "Jashim Uddin",
    patient_info: "62y • Male • IPD Ward 3",
    test_name: "Fasting Blood Sugar",
    val1: "18.4",
    status: "entered",
    flag: "critical",
    unit: "mmol/L",
    ref_range: "3.9 – 6.1",
  },
  {
    id: "r-4",
    pos: 4,
    sample_id: "SMP-10494",
    patient_name: "Nasima Begum",
    patient_info: "35y • Female • OPD",
    test_name: "Fasting Blood Sugar",
    val1: "4.8",
    status: "approved",
    flag: "normal",
    unit: "mmol/L",
    ref_range: "3.9 – 6.1",
  },
  {
    id: "r-5",
    pos: 5,
    sample_id: "SMP-10495",
    patient_name: "Zahirul Haque",
    patient_info: "50y • Male • OPD",
    test_name: "Fasting Blood Sugar",
    val1: "6.0",
    status: "entered",
    flag: "normal",
    unit: "mmol/L",
    ref_range: "3.9 – 6.1",
  },
  {
    id: "r-6",
    pos: 6,
    sample_id: "SMP-10496",
    patient_name: "Farida Parvin",
    patient_info: "67y • Female • Cabin 401",
    test_name: "Fasting Blood Sugar",
    val1: "2.4",
    status: "entered",
    flag: "critical",
    unit: "mmol/L",
    ref_range: "3.9 – 6.1",
  },
  {
    id: "r-7",
    pos: 7,
    sample_id: "SMP-10497",
    patient_name: "Mizanur Rahman",
    patient_info: "53y • Male • OPD",
    test_name: "Fasting Blood Sugar",
    val1: "",
    status: "pending",
    unit: "mmol/L",
    ref_range: "3.9 – 6.1",
  },
  {
    id: "r-8",
    pos: 8,
    sample_id: "SMP-10498",
    patient_name: "Salma Khatun",
    patient_info: "29y • Female • Antenatal",
    test_name: "Fasting Blood Sugar",
    val1: "",
    status: "pending",
    unit: "mmol/L",
    ref_range: "3.9 – 6.1",
  },
];

export default function BatchWorkstationPage() {
  const [selectedPreset, setSelectedPreset] = useState(RUN_PRESETS[0]);
  const [rows, setRows] = useState<BatchRow[]>(INITIAL_ROWS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleValueChange = (id: string, val: string) => {
    const num = parseFloat(val);
    let calculatedFlag: "normal" | "high" | "low" | "critical" | undefined = undefined;

    if (!isNaN(num)) {
      if (num >= (selectedPreset.critHigh || 999) || num <= (selectedPreset.critLow || -999)) {
        calculatedFlag = "critical";
      } else if (num > (selectedPreset.high || 999)) {
        calculatedFlag = "high";
      } else if (num < (selectedPreset.low || -999)) {
        calculatedFlag = "low";
      } else {
        calculatedFlag = "normal";
      }
    }

    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              val1: val,
              flag: calculatedFlag,
              status: val.trim() ? "entered" : "pending",
            }
          : r
      )
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(rows.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) {
      // Approve all entered rows
      const targetRows = rows.filter((r) => r.status === "entered");
      if (targetRows.length === 0) {
        toast.info("No entered results to approve.");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.status === "entered" ? { ...r, status: "approved" as const } : r))
      );
      toast.success(`Batch approved ${targetRows.length} entered results!`);
    } else {
      setRows((prev) =>
        prev.map((r) => (selectedIds.includes(r.id) ? { ...r, status: "approved" as const } : r))
      );
      toast.success(`Approved ${selectedIds.length} selected results.`);
      setSelectedIds([]);
    }
  };

  return (
    <LabLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Layers className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Batch Workstation & Run Sheet</h1>
                <p className="text-sm text-muted-foreground">
                  High-throughput keyboard data entry, automated flag checking, and bulk run authorization
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                toast.success("Analyzer rack buffer synced: 8 new sample IDs loaded into run sheet.");
              }}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all"
            >
              <Cpu className="h-4 w-4" />
              Poll Rack Barcodes
            </button>
            <button
              onClick={handleBulkApprove}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              Bulk Approve Entered ({rows.filter((r) => r.status === "entered").length})
            </button>
          </div>
        </div>

        {/* Workstation Preset Selector & QC Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Active Run Protocol</label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedPreset.id}
                  onChange={(e) => {
                    const preset = RUN_PRESETS.find((p) => p.id === e.target.value);
                    if (preset) setSelectedPreset(preset);
                  }}
                  className="px-3 py-1.5 text-sm font-bold rounded-lg border border-border bg-background focus:outline-none"
                >
                  {RUN_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Assigned Instrument: <span className="font-semibold text-foreground">{selectedPreset.analyzer}</span> •{" "}
                Reference Range: <span className="font-semibold text-primary">{selectedPreset.ref1}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-border/70 pt-2 sm:pt-0 sm:pl-4">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-foreground">QC Passed Today</p>
                <p className="text-[11px] text-muted-foreground">Controls L1 & L2 within ±1.5 SD</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Keyboard Quick Guide</p>
              <p className="text-xs font-medium mt-1">Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Tab</kbd> to jump to next sample</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Enter</kbd> to save row</p>
            </div>
            <Sparkles className="h-6 w-6 text-primary/60" />
          </div>
        </div>

        {/* Rapid Run Sheet Table */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-foreground">
                Run Sheet: {rows.length} Specimen Tubes in Batch
              </span>
              <span className="text-xs text-muted-foreground">
                ({rows.filter((r) => r.status === "approved").length} Approved • {rows.filter((r) => r.status === "entered").length} Entered • {rows.filter((r) => r.status === "pending").length} Pending)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  toast.info("Downloading Run Sheet PDF with rack position barcodes...");
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border border-border hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" />
                Print Run Sheet
              </button>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === rows.length && rows.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-12 text-center">Pos</th>
                  <th className="py-2.5 px-3">Barcode Sample ID</th>
                  <th className="py-2.5 px-3">Patient & Location</th>
                  <th className="py-2.5 px-3 w-48">
                    Result ({selectedPreset.analyte1} in {selectedPreset.unit1})
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center">Clinical Flag</th>
                  <th className="py-2.5 px-3 w-28 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => {
                  const isChecked = selectedIds.includes(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        row.flag === "critical"
                          ? "bg-red-500/5 dark:bg-red-500/10"
                          : row.status === "approved"
                          ? "bg-emerald-500/5"
                          : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(row.id)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">
                        {row.pos}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-primary">
                        {row.sample_id}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground">{row.patient_name}</div>
                        <div className="text-[10px] text-muted-foreground">{row.patient_info}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={row.val1}
                            disabled={row.status === "approved"}
                            onChange={(e) => handleValueChange(row.id, e.target.value)}
                            placeholder="Enter value..."
                            className={`w-28 px-2 py-1 text-xs font-mono font-bold rounded border bg-background focus:outline-none focus:ring-1 focus:ring-primary ${
                              row.flag === "critical"
                                ? "border-red-500 text-red-600 dark:text-red-400 bg-red-500/10"
                                : row.flag === "high" || row.flag === "low"
                                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                                : "border-border"
                            }`}
                          />
                          <span className="text-[11px] text-muted-foreground font-mono">{row.unit}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.flag === "critical" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 animate-pulse">
                            <Flame className="h-3 w-3" />
                            CRITICAL
                          </span>
                        )}
                        {row.flag === "high" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            HIGH ▲
                          </span>
                        )}
                        {row.flag === "low" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                            LOW ▼
                          </span>
                        )}
                        {row.flag === "normal" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            Normal
                          </span>
                        )}
                        {!row.flag && <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            row.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : row.status === "entered"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {row.status !== "approved" ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!row.val1.trim()) {
                                toast.error("Enter a result before approving.");
                                return;
                              }
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, status: "approved" as const } : r
                                )
                              );
                              toast.success(`Sample ${row.sample_id} approved.`);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                          >
                            Approve
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-semibold inline-flex items-center gap-1">
                            <Check className="h-3 w-3" /> Signed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </LabLayout>
  );
}
