"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Microscope,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Save,
  Send,
  FileText,
  Printer,
  Search,
  Sparkles,
  Info,
  ChevronRight,
  User,
  Activity,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { INITIAL_ORDERS } from "@/lib/limsStore";
import {
  LabOrderFull,
  TestParameter,
  CLINICAL_TEST_PANELS,
  evaluateParameterFlag,
} from "@/types/lims";
import { toast } from "sonner";

export default function LabResultsView() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("orderId");

  const [orders, setOrders] = useState<LabOrderFull[]>(INITIAL_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    initialOrderId || orders[0]?.id || ""
  );

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || orders[0],
    [orders, selectedOrderId]
  );

  // Form parameters state
  const [parameters, setParameters] = useState<TestParameter[]>([]);
  const [resultNotes, setResultNotes] = useState("");
  const [pathologistName, setPathologistName] = useState(
    "Dr. Farhana Yasmin, MBBS, FCPS (Pathology)"
  );

  // Sync parameters whenever selected order changes
  useEffect(() => {
    if (!selectedOrder) return;

    if (selectedOrder.parameters && selectedOrder.parameters.length > 0) {
      setParameters(selectedOrder.parameters);
    } else {
      // Load default clinical template
      const template = CLINICAL_TEST_PANELS[selectedOrder.test_name];
      if (template) {
        setParameters(
          template.parameters.map((p) => ({
            ...p,
            result: "",
            flag: "normal",
          }))
        );
      } else {
        // Fallback generic single parameter
        setParameters([
          {
            id: "val",
            name: selectedOrder.test_name,
            result: "",
            unit: "",
            textRef: "Negative / Normal",
            flag: "normal",
          },
        ]);
      }
    }

    setResultNotes(selectedOrder.result_notes || "");
    if (selectedOrder.pathologist) {
      setPathologistName(selectedOrder.pathologist);
    }
  }, [selectedOrder]);

  // Handle value change for a parameter
  const handleValueChange = (paramId: string, val: string) => {
    setParameters((prev) =>
      prev.map((p) => {
        if (p.id !== paramId) return p;
        const updated: TestParameter = { ...p, result: val };
        updated.flag = evaluateParameterFlag(updated);
        return updated;
      })
    );
  };

  // Save Draft (keeps processing status)
  const handleSaveDraft = () => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== selectedOrder.id) return o;
        return {
          ...o,
          status: "processing",
          parameters,
          result_notes: resultNotes,
          pathologist: pathologistName,
        };
      })
    );
    toast.success(`Draft saved for ${selectedOrder.reference}`);
  };

  // Finalize & Report
  const handleFinalizeReport = () => {
    const hasUnfilled = parameters.some(
      (p) => p.result === "" || p.result === null || p.result === undefined
    );
    if (hasUnfilled) {
      toast.warning("Some parameters have not been filled. Submitting anyway...");
    }

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== selectedOrder.id) return o;
        return {
          ...o,
          status: "reported",
          reported_at: new Date().toISOString(),
          parameters,
          result_notes: resultNotes,
          pathologist: pathologistName,
        };
      })
    );
    toast.success(`Clinical report published & authorized for ${selectedOrder.reference}!`);
  };

  return (
    <LabLayout
      title="Results Entry & Parameter Review"
      subtitle="Input quantitative laboratory results, automatic reference interval interpretation & pathologist sign-off"
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Col: Order Queue Selector */}
        <div className="lg:col-span-1 space-y-3">
          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Worklist Queue ({orders.length})
            </h3>
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {orders.map((o) => {
                const isSelected = o.id === selectedOrder?.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-muted/30 border-border/60 hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary">{o.reference}</span>
                      {o.priority === "stat" && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-destructive text-destructive-foreground animate-pulse">
                          STAT
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-xs text-foreground mt-1 truncate">
                      {o.patient_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{o.test_name}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-[10px]">
                      <span className="capitalize text-muted-foreground">{o.category}</span>
                      <span
                        className={`font-semibold ${
                          o.status === "reported"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {o.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 3 Cols: Clinical Result Entry Station */}
        {selectedOrder && (
          <div className="lg:col-span-3 space-y-5">
            {/* Patient Header Card */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                    {selectedOrder.reference}
                  </span>
                  <h3 className="font-bold text-base text-foreground">{selectedOrder.patient_name}</h3>
                  <span className="text-xs text-muted-foreground">
                    ({selectedOrder.patient_gender}, {selectedOrder.patient_age} yrs)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                  <span>
                    Test: <strong className="text-foreground">{selectedOrder.test_name}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Doctor: <strong className="text-foreground">{selectedOrder.doctor_name || "OPD"}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Sample: <strong className="text-foreground">{selectedOrder.sample_type}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedOrder.status === "reported" && (
                  <Link
                    href={`/lab/reports?orderId=${selectedOrder.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Print Verified Report
                  </Link>
                )}
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                    selectedOrder.status === "reported"
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  }`}
                >
                  Status: {selectedOrder.status.replace("_", " ").toUpperCase()}
                </span>
              </div>
            </div>

            {/* Parameter Entry Table */}
            <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-foreground">
                    Analyte Parameters & Reference Intervals
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Automatic clinical flag assessment (Normal, Low, High, Critical)
                  </p>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {parameters.length} Analytes
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border text-muted-foreground">
                      <th className="py-3 px-4 font-semibold w-1/3">ANALYTE / PARAMETER</th>
                      <th className="py-3 px-4 font-semibold w-1/4">OBSERVED VALUE</th>
                      <th className="py-3 px-4 font-semibold">UNIT</th>
                      <th className="py-3 px-4 font-semibold">BIOLOGICAL REFERENCE INTERVAL</th>
                      <th className="py-3 px-4 text-center font-semibold">FLAG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {parameters.map((param) => {
                      return (
                        <tr
                          key={param.id}
                          className={`hover:bg-muted/30 transition ${
                            param.flag === "critical"
                              ? "bg-destructive/5"
                              : param.flag === "high" || param.flag === "low"
                              ? "bg-amber-500/5"
                              : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-medium text-foreground">{param.name}</td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={param.result}
                              onChange={(e) => handleValueChange(param.id, e.target.value)}
                              placeholder="Enter result..."
                              className="w-36 px-3 py-1.5 bg-muted/60 border border-border rounded-lg text-xs font-mono font-semibold text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono text-muted-foreground">
                            {param.unit || "—"}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {param.textRef
                              ? param.textRef
                              : param.min !== undefined && param.max !== undefined
                              ? `${param.min} – ${param.max}`
                              : "—"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {param.flag === "critical" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground animate-pulse">
                                CRITICAL
                              </span>
                            ) : param.flag === "high" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                HIGH ▲
                              </span>
                            ) : param.flag === "low" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                                LOW ▼
                              </span>
                            ) : param.result !== "" && param.result !== undefined ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                NORMAL
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pathologist Notes & Sign-off */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Pathologist Clinical Remarks & Microscopic Observations
                </label>
                <textarea
                  rows={3}
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                  placeholder="Clinical remarks, morphological comments, or clinical correlation recommendations..."
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-border">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Signing Pathologist / Consultant
                  </label>
                  <input
                    type="text"
                    value={pathologistName}
                    onChange={(e) => setPathologistName(e.target.value)}
                    className="w-full max-w-md px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 self-end">
                  <button
                    onClick={handleSaveDraft}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Draft
                  </button>

                  <button
                    onClick={handleFinalizeReport}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Authorize & Finalize Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LabLayout>
  );
}
