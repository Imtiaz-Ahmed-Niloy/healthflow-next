"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Search,
  Filter,
  Plus,
  Clock,
  FlaskConical,
  Activity,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  FileText,
  Printer,
  ChevronRight,
  User,
  Stethoscope,
  X,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { INITIAL_ORDERS } from "@/lib/limsStore";
import { LabOrderFull, SPECIMEN_CONTAINERS, OrderStatus, OrderPriority, CLINICAL_TEST_PANELS } from "@/types/lims";
import { toast } from "sonner";

export default function LabOrdersView() {
  const [orders, setOrders] = useState<LabOrderFull[]>(INITIAL_ORDERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  // Modals
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [barcodeModalOrder, setBarcodeModalOrder] = useState<LabOrderFull | null>(null);

  // New order form state
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientAge, setNewPatientAge] = useState("35");
  const [newPatientGender, setNewPatientGender] = useState<"Male" | "Female" | "Other">("Male");
  const [newDoctorName, setNewDoctorName] = useState("Prof. Dr. M. A. Rahman");
  const [newTestName, setNewTestName] = useState("Complete Blood Count (CBC)");
  const [newPriority, setNewPriority] = useState<OrderPriority>("routine");

  // Advance Order Lifecycle Step
  const handleAdvanceOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        if (o.status === "pending") {
          toast.success(`Specimen accessioned for ${o.reference}`);
          return {
            ...o,
            status: "sample_collected",
            collected_at: new Date().toISOString(),
            phlebotomist: "Lab Phlebotomist",
          };
        }
        if (o.status === "sample_collected") {
          toast.info(`Sent ${o.reference} to Analyzer batch`);
          return { ...o, status: "processing" };
        }
        return o;
      })
    );
  };

  // Submit New Order
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) {
      toast.error("Please enter patient name");
      return;
    }

    const testConfig = CLINICAL_TEST_PANELS[newTestName];
    const refNumber = `L-${1050 + orders.length}`;

    const newOrder: LabOrderFull = {
      id: `ord-${Date.now()}`,
      reference: refNumber,
      patient_id: `pat-${Date.now()}`,
      patient_name: newPatientName.trim(),
      patient_age: parseInt(newPatientAge) || 30,
      patient_gender: newPatientGender,
      doctor_id: "doc-custom",
      doctor_name: newDoctorName.trim() || "Walk-in OPD Patient",
      lab_test_id: `lt-${Date.now()}`,
      test_name: newTestName,
      category: testConfig?.category || "General Pathology",
      sample_type: testConfig?.sample === "blood_edta" ? "Whole Blood (EDTA)" : "Serum",
      container_code: (testConfig?.sample as keyof typeof SPECIMEN_CONTAINERS) || "blood_serum",
      barcode: `BAR-${refNumber}`,
      status: "pending",
      priority: newPriority,
      requested_at: new Date().toISOString(),
    };

    setOrders([newOrder, ...orders]);
    toast.success(`Lab order ${refNumber} created successfully!`);
    setIsNewOrderModalOpen(false);
    setNewPatientName("");
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (priorityFilter !== "all" && o.priority !== priorityFilter) return false;
      if (departmentFilter !== "all" && o.category !== departmentFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          o.reference.toLowerCase().includes(q) ||
          o.patient_name.toLowerCase().includes(q) ||
          o.test_name.toLowerCase().includes(q) ||
          (o.doctor_name || "").toLowerCase().includes(q) ||
          o.barcode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, priorityFilter, departmentFilter, searchTerm]);

  return (
    <LabLayout
      title="Test Orders & Worklist"
      subtitle="Manage incoming laboratory requisitions, triage STAT cases, and track processing steps"
      actions={
        <button
          onClick={() => setIsNewOrderModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          New Test Requisition
        </button>
      }
    >
      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by order REF (e.g. L-1048), patient, doctor, or test name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
          </div>

          {/* Department filter */}
          <div className="flex items-center gap-2">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none"
            >
              <option value="all">All Departments</option>
              <option value="Hematology">Hematology</option>
              <option value="Biochemistry">Clinical Biochemistry</option>
              <option value="Clinical Pathology">Clinical Pathology</option>
              <option value="Immunology">Immunology</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="stat">STAT Only (Urgent)</option>
              <option value="urgent">Urgent</option>
              <option value="routine">Routine</option>
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { key: "all", label: "All Orders", count: orders.length },
            {
              key: "pending",
              label: "Pending Phlebotomy",
              count: orders.filter((o) => o.status === "pending").length,
            },
            {
              key: "sample_collected",
              label: "Sample Collected",
              count: orders.filter((o) => o.status === "sample_collected").length,
            },
            {
              key: "processing",
              label: "In Processing / Analyzer",
              count: orders.filter((o) => o.status === "processing").length,
            },
            {
              key: "reported",
              label: "Reported & Validated",
              count: orders.filter((o) => o.status === "reported").length,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap flex items-center gap-2 ${
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === tab.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-card text-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground">
                <th className="py-3 px-4 font-semibold">REFERENCE & BARCODE</th>
                <th className="py-3 px-4 font-semibold">PATIENT DEMOGRAPHICS</th>
                <th className="py-3 px-4 font-semibold">TEST & SPECIMEN</th>
                <th className="py-3 px-4 font-semibold">REFERRING DOCTOR</th>
                <th className="py-3 px-4 font-semibold">PRIORITY</th>
                <th className="py-3 px-4 font-semibold">STATUS</th>
                <th className="py-3 px-4 text-right font-semibold">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No laboratory orders match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const container = SPECIMEN_CONTAINERS[order.container_code];
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition">
                      {/* Ref & Barcode */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-primary">{order.reference}</div>
                        <button
                          onClick={() => setBarcodeModalOrder(order)}
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground mt-0.5"
                        >
                          <QrCode className="h-3 w-3" /> {order.barcode}
                        </button>
                      </td>

                      {/* Patient */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{order.patient_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {order.patient_gender}, {order.patient_age} yrs
                        </div>
                      </td>

                      {/* Test & Specimen */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground">{order.test_name}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              container?.bgTone || "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: container?.capColor || "#999" }}
                            />
                            {order.sample_type}
                          </span>
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="py-3.5 px-4 text-foreground/90">
                        {order.doctor_name || <span className="text-muted-foreground">Direct OPD</span>}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        {order.priority === "stat" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground animate-pulse">
                            STAT
                          </span>
                        ) : order.priority === "urgent" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            Urgent
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                            Routine
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            order.status === "reported"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : order.status === "processing"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : order.status === "sample_collected"
                              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {order.status === "reported" && <CheckCircle2 className="h-3 w-3" />}
                          {order.status === "processing" && <Activity className="h-3 w-3 animate-spin" />}
                          {order.status === "sample_collected" && <FlaskConical className="h-3 w-3" />}
                          {order.status === "pending" && <Clock className="h-3 w-3" />}
                          {order.status.replace("_", " ").toUpperCase()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.status === "pending" && (
                            <button
                              onClick={() => handleAdvanceOrder(order.id)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                            >
                              Collect Sample →
                            </button>
                          )}

                          {order.status === "sample_collected" && (
                            <button
                              onClick={() => handleAdvanceOrder(order.id)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 transition"
                            >
                              Send to Analyzer →
                            </button>
                          )}

                          {(order.status === "processing" || order.status === "sample_collected") && (
                            <Link
                              href={`/lab/results?orderId=${order.id}`}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition"
                            >
                              Enter Results
                            </Link>
                          )}

                          {order.status === "reported" && (
                            <Link
                              href={`/lab/reports?orderId=${order.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-card border border-border hover:bg-muted text-foreground transition"
                            >
                              <FileText className="h-3.5 w-3.5 text-primary" />
                              Report
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Lab Order Modal */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-foreground">New Laboratory Requisition</h3>
                <p className="text-xs text-muted-foreground">Order diagnostic test for patient</p>
              </div>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mohammad Harun"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Age (Years)</label>
                  <input
                    type="number"
                    value={newPatientAge}
                    onChange={(e) => setNewPatientAge(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Gender</label>
                  <select
                    value={newPatientGender}
                    onChange={(e) => setNewPatientGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Select Diagnostic Test Panel *
                </label>
                <select
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none font-medium"
                >
                  {Object.keys(CLINICAL_TEST_PANELS).map((test) => (
                    <option key={test} value={test}>
                      {test} ({CLINICAL_TEST_PANELS[test].category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Requesting Physician / Doctor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prof. Dr. M. A. Rahman"
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Priority Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["routine", "urgent", "stat"] as const).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setNewPriority(p)}
                      className={`py-2 rounded-xl text-xs font-semibold capitalize border transition ${
                        newPriority === p
                          ? p === "stat"
                            ? "bg-destructive text-destructive-foreground border-destructive"
                            : p === "urgent"
                            ? "bg-amber-500/20 text-amber-600 border-amber-500"
                            : "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {p === "stat" ? "STAT (Critical)" : p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Generate Order & Barcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Tag Modal */}
      {barcodeModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl text-center">
            <h3 className="font-semibold text-base text-foreground mb-1">Specimen Tube Barcode</h3>
            <p className="text-xs text-muted-foreground mb-4">Print label for specimen container</p>

            <div className="p-4 bg-white text-slate-900 rounded-xl border border-dashed border-slate-300 font-mono space-y-2">
              <p className="text-xs font-bold uppercase">{barcodeModalOrder.test_name}</p>
              <div className="h-12 bg-slate-900 rounded flex items-center justify-center text-white text-xs font-bold tracking-widest">
                |||| | ||||| ||| ||||||| | ||
              </div>
              <p className="text-xs font-bold">{barcodeModalOrder.barcode}</p>
              <div className="text-[10px] text-slate-600 flex justify-between pt-1 border-t border-slate-200">
                <span>{barcodeModalOrder.patient_name}</span>
                <span>{barcodeModalOrder.patient_age}Y/{barcodeModalOrder.patient_gender}</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setBarcodeModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Close
              </button>
              <button
                onClick={() => {
                  toast.success("Sending to thermal barcode printer...");
                  setBarcodeModalOrder(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}
    </LabLayout>
  );
}
