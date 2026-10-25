"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Printer,
  Clock,
  User,
  ShieldAlert,
  ArrowRight,
  Info,
  Syringe,
  X,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { INITIAL_ORDERS } from "@/lib/limsStore";
import { LabOrderFull, SPECIMEN_CONTAINERS } from "@/types/lims";
import { toast } from "sonner";

export default function PhlebotomyView() {
  const [orders, setOrders] = useState<LabOrderFull[]>(INITIAL_ORDERS);
  const [activeTab, setActiveTab] = useState<"queue" | "collected" | "rejected">("queue");

  // Rejection modal
  const [rejectingOrder, setRejectingOrder] = useState<LabOrderFull | null>(null);
  const [rejectionReason, setRejectionReason] = useState("Hemolyzed specimen (RBC lysis)");
  const [rejectionNotes, setRejectionNotes] = useState("");

  const pendingCollection = orders.filter((o) => o.status === "pending");
  const collectedSamples = orders.filter((o) => o.status !== "pending");

  // Perform specimen collection
  const handleCollect = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: "sample_collected",
          collected_at: new Date().toISOString(),
          phlebotomist: "Phlebotomy Staff",
        };
      })
    );
    toast.success("Specimen collected & accessioned successfully!");
  };

  // Perform sample rejection
  const handleConfirmRejection = () => {
    if (!rejectingOrder) return;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== rejectingOrder.id) return o;
        return {
          ...o,
          status: "pending", // resets to redraw
          rejection_reason: `${rejectionReason} - ${rejectionNotes}`,
        };
      })
    );
    toast.error(`Sample rejected for ${rejectingOrder.reference}: ${rejectionReason}`);
    setRejectingOrder(null);
  };

  return (
    <LabLayout
      title="Phlebotomy & Sample Accessioning"
      subtitle="Specimen collection station, vacuum tube protocols, accessioning verification & rejection logs"
    >
      {/* Phlebotomy Order of Draw Educational Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-card to-muted/50 border border-border/80 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Syringe className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">
            CLSI Clinical Order of Draw Standard (H3-A6)
          </h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px]">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
            <span className="font-bold text-amber-600 dark:text-amber-400">1. Blood Culture</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">SPS Bottle</p>
          </div>
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-center">
            <span className="font-bold text-sky-600 dark:text-sky-400">2. Citrate</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Light Blue (PT/INR)</p>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
            <span className="font-bold text-amber-600 dark:text-amber-400">3. Serum / SST</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Gold / Red (Clot Gel)</p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">4. Heparin</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Green (Plasma)</p>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-center">
            <span className="font-bold text-purple-600 dark:text-purple-400">5. EDTA K3</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Lavender (CBC)</p>
          </div>
          <div className="p-2 rounded-xl bg-slate-500/10 border border-slate-500/30 text-center">
            <span className="font-bold text-slate-600 dark:text-slate-400">6. Fluoride</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">Gray (Glucose)</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveTab("queue")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "queue"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Collection Waiting Queue ({pendingCollection.length})
        </button>

        <button
          onClick={() => setActiveTab("collected")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === "collected"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:bg-muted"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Accessioned Specimens ({collectedSamples.length})
        </button>
      </div>

      {/* Collection Queue */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {pendingCollection.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-card border border-border text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
              <p className="font-semibold text-sm">Phlebotomy Queue is Clear!</p>
              <p className="text-xs text-muted-foreground mt-1">All patient samples have been collected and dispatched.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingCollection.map((order) => {
                const container = SPECIMEN_CONTAINERS[order.container_code];
                return (
                  <div
                    key={order.id}
                    className="p-5 rounded-2xl bg-card border border-border/70 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden"
                  >
                    {/* Top status indicator strip */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: container?.capColor || "#999" }}
                    />

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-primary">{order.reference}</span>
                        {order.priority === "stat" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground animate-pulse">
                            STAT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                            Routine
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        <h4 className="font-bold text-sm text-foreground">{order.patient_name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {order.patient_gender}, {order.patient_age} yrs · ID: {order.patient_id}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-border/60">
                        <p className="text-xs font-semibold text-foreground">{order.test_name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              container?.bgTone || "bg-muted text-muted-foreground"
                            }`}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: container?.capColor || "#999" }}
                            />
                            {container?.name || order.sample_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setRejectingOrder(order)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition"
                      >
                        Reject Sample
                      </button>

                      <button
                        onClick={() => handleCollect(order.id)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verify & Collect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Accessioned list */}
      {activeTab === "collected" && (
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground">
                <th className="py-3 px-4 font-semibold">REF #</th>
                <th className="py-3 px-4 font-semibold">PATIENT</th>
                <th className="py-3 px-4 font-semibold">TEST ORDERED</th>
                <th className="py-3 px-4 font-semibold">CONTAINER / SPECIMEN</th>
                <th className="py-3 px-4 font-semibold">COLLECTED AT</th>
                <th className="py-3 px-4 font-semibold">PHLEBOTOMIST</th>
                <th className="py-3 px-4 text-right font-semibold">BENCH STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {collectedSamples.map((order) => {
                const container = SPECIMEN_CONTAINERS[order.container_code];
                return (
                  <tr key={order.id} className="hover:bg-muted/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-primary">{order.reference}</td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">{order.patient_name}</td>
                    <td className="py-3.5 px-4 text-foreground">{order.test_name}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          container?.bgTone || "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: container?.capColor || "#999" }}
                        />
                        {order.sample_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground" suppressHydrationWarning>
                      {order.collected_at ? new Date(order.collected_at).toLocaleTimeString() : "Recent"}
                    </td>
                    <td className="py-3.5 px-4 text-foreground/80">{order.phlebotomist || "Staff"}</td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/lab/results?orderId=${order.id}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition"
                      >
                        Proceed to Results →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Specimen Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card border border-destructive/30 shadow-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-destructive/10 text-destructive mt-0.5">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground">
                  Specimen Rejection Log ({rejectingOrder.reference})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Document laboratory criteria failure and request re-draw
                </p>
              </div>
              <button
                onClick={() => setRejectingOrder(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Primary Rejection Reason
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:outline-none"
              >
                <option value="Hemolyzed specimen (RBC lysis)">Hemolyzed specimen (RBC lysis)</option>
                <option value="Clotted blood in EDTA tube">Clotted blood in EDTA tube</option>
                <option value="Quantity Not Sufficient (QNS)">Quantity Not Sufficient (QNS)</option>
                <option value="Incorrect tube type / additive">Incorrect tube type / additive</option>
                <option value="Severely Lipemic / Icteric sample">Severely Lipemic / Icteric sample</option>
                <option value="Unlabeled or mislabeled vial">Unlabeled or mislabeled vial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Clinical Notes / Redraw Instructions
              </label>
              <textarea
                rows={3}
                placeholder="Details to notify nursing station or phlebotomy..."
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectingOrder(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirm Rejection & Request Redraw
              </button>
            </div>
          </div>
        </div>
      )}
    </LabLayout>
  );
}
