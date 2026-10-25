"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Printer,
  Download,
  Share2,
  Search,
  CheckCircle2,
  ShieldCheck,
  Building2,
  QrCode,
  Calendar,
  User,
  Stethoscope,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { INITIAL_ORDERS } from "@/lib/limsStore";
import { LabOrderFull } from "@/types/lims";
import { BRAND_INFO } from "@/constants/brand";
import { toast } from "sonner";

export default function LabReportsView() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("orderId");

  const [orders] = useState<LabOrderFull[]>(INITIAL_ORDERS);
  const reportedOrders = useMemo(
    () => orders.filter((o) => o.status === "reported" || (o.parameters && o.parameters.length > 0)),
    [orders]
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    initialOrderId || reportedOrders[0]?.id || orders[0]?.id || ""
  );

  const activeOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || reportedOrders[0] || orders[0],
    [orders, selectedOrderId, reportedOrders]
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    toast.success(`Exporting ${activeOrder?.reference} as PDF...`);
  };

  return (
    <LabLayout
      title="Diagnostic Clinical Reports"
      subtitle="Authorized clinical laboratory reports, formal diagnostic letterhead & print dispatch"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Report
          </button>
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-card border border-border hover:bg-muted text-foreground transition"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Report List Selector (Hidden during printing) */}
        <div className="lg:col-span-1 space-y-3 print:hidden">
          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Ready Diagnostic Reports ({reportedOrders.length})
            </h3>
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {reportedOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrderId(o.id)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    o.id === activeOrder?.id
                      ? "bg-primary/10 border-primary shadow-sm"
                      : "bg-muted/30 border-border/60 hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">{o.reference}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Verified
                    </span>
                  </div>
                  <p className="font-semibold text-xs text-foreground mt-1 truncate">
                    {o.patient_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{o.test_name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 3 Cols: Printable Diagnostic Medical Report Sheet */}
        {activeOrder && (
          <div className="lg:col-span-3">
            <div className="p-8 sm:p-12 rounded-2xl bg-card border border-border/80 shadow-md print:border-none print:shadow-none print:p-0 max-w-4xl mx-auto space-y-6">
              {/* Header Letterhead */}
              <div className="border-b-2 border-primary/30 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={BRAND_INFO.logoMark}
                    alt={BRAND_INFO.name}
                    className="h-12 w-auto shrink-0"
                  />
                  <div>
                    <h2 className="font-display text-2xl font-bold text-primary tracking-tight">
                      {BRAND_INFO.name} Central Diagnostic Laboratory
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Division of Clinical Pathology, Biochemistry & Molecular Diagnostics
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                      ISO 15189:2022 Accredited Laboratory · Reg No. LIMS-DH-2026-904
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-muted-foreground shrink-0">
                  <div className="px-2.5 py-1 rounded bg-muted/60 border border-border inline-block">
                    BARCODE: {activeOrder.barcode}
                  </div>
                  <p className="mt-1 text-[11px]" suppressHydrationWarning>Printed: {new Date().toLocaleString()}</p>
                </div>
              </div>

              {/* Patient & Doctor Demographics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border border-border/60 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Patient Name</span>
                  <p className="font-bold text-foreground mt-0.5">{activeOrder.patient_name}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {activeOrder.patient_gender}, {activeOrder.patient_age} Years
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Order Ref & MRN</span>
                  <p className="font-mono font-bold text-primary mt-0.5">{activeOrder.reference}</p>
                  <p className="text-muted-foreground text-[11px]">PID: {activeOrder.patient_id}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Referring Physician</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {activeOrder.doctor_name || "OPD Consultant"}
                  </p>
                  <p className="text-muted-foreground text-[11px]">Department of Medicine</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Timing</span>
                  <p className="text-foreground mt-0.5" suppressHydrationWarning>
                    Coll: {activeOrder.collected_at ? new Date(activeOrder.collected_at).toLocaleTimeString() : "07:30 AM"}
                  </p>
                  <p className="text-foreground text-[11px]" suppressHydrationWarning>
                    Rep: {activeOrder.reported_at ? new Date(activeOrder.reported_at).toLocaleTimeString() : "10:15 AM"}
                  </p>
                </div>
              </div>

              {/* Diagnostic Test Title */}
              <div className="text-center pt-2">
                <h3 className="font-display font-bold text-lg text-primary uppercase tracking-wide border-b border-primary/20 pb-2 inline-block px-8">
                  {activeOrder.test_name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Specimen: {activeOrder.sample_type} · Category: {activeOrder.category}
                </p>
              </div>

              {/* Analyte Results Table */}
              <div className="border border-border/80 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border text-foreground font-semibold">
                      <th className="py-2.5 px-4">INVESTIGATION / PARAMETER</th>
                      <th className="py-2.5 px-4">OBSERVED VALUE</th>
                      <th className="py-2.5 px-4">UNITS</th>
                      <th className="py-2.5 px-4">BIOLOGICAL REFERENCE INTERVAL</th>
                      <th className="py-2.5 px-4 text-center">INTERPRETATION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {activeOrder.parameters && activeOrder.parameters.length > 0 ? (
                      activeOrder.parameters.map((p) => (
                        <tr
                          key={p.id}
                          className={
                            p.flag === "critical"
                              ? "bg-destructive/10 font-bold"
                              : p.flag === "high" || p.flag === "low"
                              ? "bg-amber-500/5 font-semibold"
                              : ""
                          }
                        >
                          <td className="py-2.5 px-4 text-foreground">{p.name}</td>
                          <td className="py-2.5 px-4 font-mono text-sm font-bold text-foreground">
                            {p.result}
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground">{p.unit || "—"}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">
                            {p.textRef
                              ? p.textRef
                              : p.min !== undefined && p.max !== undefined
                              ? `${p.min} – ${p.max}`
                              : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {p.flag === "critical" ? (
                              <span className="font-bold text-destructive">CRITICAL **</span>
                            ) : p.flag === "high" ? (
                              <span className="font-bold text-amber-600 dark:text-amber-400">HIGH (H)</span>
                            ) : p.flag === "low" ? (
                              <span className="font-bold text-sky-600 dark:text-sky-400">LOW (L)</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Normal</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          No quantitative parameters documented for this request.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Remarks Box */}
              {activeOrder.result_notes && (
                <div className="p-4 rounded-xl bg-muted/20 border border-border/80 text-xs">
                  <span className="font-bold text-foreground uppercase tracking-wide text-[10px]">
                    Consultant Pathologist Remarks:
                  </span>
                  <p className="text-foreground/90 mt-1 leading-relaxed">{activeOrder.result_notes}</p>
                </div>
              )}

              {/* Signatures Footer */}
              <div className="pt-10 flex items-end justify-between border-t border-border/60 text-xs">
                <div className="text-center">
                  <div className="h-10 flex items-center justify-center font-display italic text-muted-foreground/60">
                    Verified Electronically
                  </div>
                  <div className="w-48 border-t border-foreground/30 pt-1">
                    <p className="font-bold text-foreground">Medical Technologist</p>
                    <p className="text-[10px] text-muted-foreground">Department of Laboratory Medicine</p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="h-10 flex items-center justify-center font-display italic text-primary/80 font-bold">
                    Dr. Farhana Yasmin
                  </div>
                  <div className="w-56 border-t border-foreground/30 pt-1">
                    <p className="font-bold text-foreground">
                      {activeOrder.pathologist || "Dr. Farhana Yasmin, MBBS, FCPS"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Consultant Clinical Pathologist
                    </p>
                  </div>
                </div>
              </div>

              {/* End of Report Disclaimer */}
              <div className="text-center text-[10px] text-muted-foreground pt-4 border-t border-dashed border-border/60">
                *** END OF REPORT · Clinical correlation is advised · For inquiries contact Central Laboratory Desk ***
              </div>
            </div>
          </div>
        )}
      </div>
    </LabLayout>
  );
}
