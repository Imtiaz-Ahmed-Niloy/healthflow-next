"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Check,
  X,
  Printer,
  Building2,
  Store,
  CreditCard,
  Banknote,
  Coins,
  Calendar,
  User,
  Phone,
  FileText,
  Loader2,
  ChevronDown,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useBookingClock } from "@/lib/appSettings";

export interface WorkplaceFacility {
  id: string;
  doctor_id?: string;
  name: string;
  kind?: string;
  phone?: string | null;
  address?: string | null;
  consultation_fee?: number;
  follow_up_fee?: number;
}

export interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InitialPatientInfo {
  patient_name?: string;
  patient_id?: string;
  patient_phone?: string;
  patient_mrn?: string;
  appointment_id?: string;
  tenant_id?: string;
  consultation_fee?: number;
  follow_up_fee?: number;
}

interface OpdInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  workplaces: WorkplaceFacility[];
  initialData?: InitialPatientInfo | null;
  onInvoiceCreated?: (invoice: any, shouldPrint?: boolean, printMode?: "invoice" | "thermal") => void;
  formatTk: (amount: number) => string;
}


export function OpdInvoiceModal({
  open,
  onClose,
  workplaces,
  initialData,
  onInvoiceCreated,
  formatTk,
}: OpdInvoiceModalProps) {
  // The platform's date, not toISOString's UTC one — a day behind before 06:00 in Dhaka.
  const { today } = useBookingClock();
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientMrn, setPatientMrn] = useState("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [dueDate, setDueDate] = useState<string>(today);

  // Fee Type Options: Consultation Fee vs Follow up Fee
  const [feeType, setFeeType] = useState<"consultation" | "follow_up">("consultation");
  const [consultationRate, setConsultationRate] = useState<number>(500);
  const [followUpRate, setFollowUpRate] = useState<number>(300);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const defaultTenant =
        initialData?.tenant_id || workplaces[0]?.id || "";
      setSelectedTenantId(defaultTenant);

      setPatientName(initialData?.patient_name || "");
      setPatientPhone(initialData?.patient_phone || "");
      setPatientMrn(initialData?.patient_mrn || "");
      setPatientId(initialData?.patient_id || null);
      setAppointmentId(initialData?.appointment_id || null);

      const targetWorkplace = workplaces.find((w) => w.id === defaultTenant);
      const cFee =
        initialData?.consultation_fee ?? targetWorkplace?.consultation_fee ?? 500;
      const fFee =
        initialData?.follow_up_fee ??
        targetWorkplace?.follow_up_fee ??
        Math.max(100, Math.round((cFee * 0.6) / 50) * 50);

      setConsultationRate(cFee);
      setFollowUpRate(fFee);
      setFeeType("consultation");

      // Initialize with Doctor Consultation line
      setLineItems([
        {
          description: "Doctor Consultation",
          quantity: 1,
          rate: cFee,
          amount: cFee,
        },
      ]);
      setDiscountAmount(0);
      setIsPaid(true);
      setPaymentMethod("cash");
      setDueDate(today);
    }
  }, [open, initialData, workplaces, today]);

  if (!open) return null;

  const currentWorkplace = workplaces.find((w) => w.id === selectedTenantId) || workplaces[0];

  const handleSelectFeeType = (type: "consultation" | "follow_up") => {
    setFeeType(type);
    const targetDesc = type === "consultation" ? "Doctor Consultation" : "Follow-up Consultation";
    const targetRate = type === "consultation" ? consultationRate : followUpRate;

    setLineItems((prev) => {
      // Find if an existing consultation or follow-up item is in lineItems
      const consultIdx = prev.findIndex(
        (li) =>
          li.description.toLowerCase().includes("consultation") ||
          li.description.toLowerCase().includes("follow")
      );

      if (consultIdx >= 0) {
        return prev.map((li, idx) =>
          idx === consultIdx
            ? { ...li, description: targetDesc, rate: targetRate, amount: targetRate * li.quantity }
            : li
        );
      } else if (prev.length > 0) {
        return prev.map((li, idx) =>
          idx === 0
            ? { ...li, description: targetDesc, rate: targetRate, amount: targetRate * li.quantity }
            : li
        );
      } else {
        return [{ description: targetDesc, quantity: 1, rate: targetRate, amount: targetRate }];
      }
    });
  };

  const handleUpdateItem = (index: number, patch: Partial<LineItem>) => {
    setLineItems((prev) =>
      prev.map((li, idx) => {
        if (idx !== index) return li;
        const updated = { ...li, ...patch };
        updated.amount = Math.max(0, updated.quantity * updated.rate);
        return updated;
      })
    );

    if (index === 0 && patch.rate !== undefined && patch.rate >= 0) {
      if (feeType === "consultation") {
        setConsultationRate(patch.rate);
      } else {
        setFollowUpRate(patch.rate);
      }
    }
  };

  const handleRemoveItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddCustomItem = () => {
    setLineItems((prev) => [
      ...prev,
      { description: "OPD Service / Procedure", quantity: 1, rate: 200, amount: 200 },
    ]);
  };

  const subtotal = lineItems.reduce((acc, li) => acc + (li.amount || 0), 0);
  const totalAmount = Math.max(0, subtotal - (discountAmount || 0));

  const handleSaveInvoice = async (
    andPrint = false,
    printMode: "invoice" | "thermal" = "invoice"
  ) => {
    if (!selectedTenantId) {
      toast.error("Please select a workplace facility");
      return;
    }
    if (!patientName.trim()) {
      toast.error("Patient name is required");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/v1/portal/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: selectedTenantId,
          patient_id: patientId,
          party: patientName.trim(),
          amount: totalAmount,
          description: lineItems.map((li) => `${li.description} (x${li.quantity})`).join(", "),
          line_items: lineItems,
          paid: isPaid,
          payment_method: paymentMethod,
          appointment_id: appointmentId,
          due_date: isPaid ? null : dueDate,
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error("Failed to create OPD invoice", {
          description: body?.error?.message || "Please check the details",
        });
        return;
      }

      toast.success("OPD Invoice created successfully", {
        description: `Invoice #${body.data?.reference || "OPD"} raised`,
      });

      const invoiceWithDetails = {
        ...body.data,
        facility_name: currentWorkplace?.name,
        facility_kind: currentWorkplace?.kind,
        party: patientName.trim(),
        line_items: lineItems,
        amount: totalAmount,
        patient: {
          full_name: patientName.trim(),
          mrn: patientMrn,
          phone: patientPhone,
        },
      };

      onInvoiceCreated?.(invoiceWithDetails, andPrint, printMode);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Network error while creating invoice");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative bg-card rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-border/70 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground">
              Create OPD Patient Invoice
            </h3>
            <p className="text-xs text-muted-foreground">
              Issue consultation & medical procedure bills for outpatient visits
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">
          {/* Facility & Patient Information */}
          <div className="rounded-2xl border border-border/70 bg-slate-50/60 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Workplace selection */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  Facility / Chamber:
                </Label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setSelectedTenantId(tid);
                    const wp = workplaces.find((w) => w.id === tid);
                    const cFee = wp?.consultation_fee || 500;
                    const fFee = wp?.follow_up_fee || Math.max(100, Math.round((cFee * 0.6) / 50) * 50);
                    setConsultationRate(cFee);
                    setFollowUpRate(fFee);

                    const activeRate = feeType === "consultation" ? cFee : fFee;
                    const activeDesc = feeType === "consultation" ? "Doctor Consultation" : "Follow-up Consultation";

                    setLineItems((prev) => {
                      if (prev.length === 0) {
                        return [{ description: activeDesc, quantity: 1, rate: activeRate, amount: activeRate }];
                      }
                      return prev.map((item, idx) =>
                        idx === 0
                          ? { ...item, description: activeDesc, rate: activeRate, amount: activeRate * item.quantity }
                          : item
                      );
                    });
                  }}
                  className="w-full h-9 rounded-xl border border-border bg-white px-3 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {workplaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.kind === "chamber" ? "Chamber" : "Hospital"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient Name */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <User className="h-3.5 w-3.5 text-slate-600" />
                  Patient Full Name <span className="text-rose-600">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Mohammad Rahman"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="h-9 text-xs bg-white font-semibold"
                />
              </div>
            </div>

            {/* Phone & MRN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                  <Phone className="h-3 w-3 text-slate-500" />
                  Contact Phone (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="017xxxxxxxx"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                  <FileText className="h-3 w-3 text-slate-500" />
                  Patient ID / MRN (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="MRN-12345"
                  value={patientMrn}
                  onChange={(e) => setPatientMrn(e.target.value)}
                  className="h-8 text-xs bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Consultation Fee / Follow up Fee Option */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
              Fee Option:
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectFeeType("consultation")}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  feeType === "consultation"
                    ? "border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500/20"
                    : "border-border/80 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      feeType === "consultation"
                        ? "border-emerald-600 bg-emerald-600"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {feeType === "consultation" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-foreground">
                      Consultation Fee
                    </div>
                    <div className="text-[11px] text-muted-foreground">New / Regular visit</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFeeType("follow_up")}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  feeType === "follow_up"
                    ? "border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500/20"
                    : "border-border/80 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      feeType === "follow_up"
                        ? "border-emerald-600 bg-emerald-600"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {feeType === "follow_up" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-foreground">
                      Follow up Fee
                    </div>
                    <div className="text-[11px] text-muted-foreground">Report / Review visit</div>
                  </div>
                </div>
              </button>
            </div>
          </div>


          {/* Line Items Table */}
          <div className="rounded-2xl border border-border/80 overflow-hidden bg-white shadow-2xs">
            <div className="bg-muted/40 px-4 py-2 border-b border-border/60 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Billed Items</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddCustomItem}
                className="h-7 text-xs text-emerald-700 hover:text-emerald-800 gap-1 font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </Button>
            </div>

            <div className="p-3 space-y-2">
              {lineItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 border border-border/50 text-xs"
                >
                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleUpdateItem(idx, { description: e.target.value })}
                      placeholder="Service description"
                      className="h-7 text-xs bg-white font-medium"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="w-14 shrink-0">
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(idx, { quantity: Number(e.target.value) || 1 })}
                      className="h-7 text-xs text-center bg-white font-bold"
                    />
                  </div>

                  {/* Unit Rate */}
                  <div className="w-24 shrink-0">
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[10px] text-muted-foreground font-bold">৳</span>
                      <Input
                        type="number"
                        min={0}
                        step={10}
                        value={item.rate}
                        onChange={(e) => handleUpdateItem(idx, { rate: Number(e.target.value) || 0 })}
                        className="h-7 text-xs pl-5 bg-white font-bold"
                      />
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="w-20 text-right font-extrabold text-foreground text-xs shrink-0 font-mono">
                    {formatTk(item.amount)}
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal, Discount & Total Card */}
          <div className="rounded-2xl border border-border/80 bg-slate-50/80 p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Gross Subtotal:</span>
              <span className="font-bold text-foreground font-mono">{formatTk(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Discount / Concession (৳):</span>
              <div className="w-28 relative">
                <span className="absolute left-2 top-1.5 text-[11px] text-muted-foreground">৳</span>
                <Input
                  type="number"
                  min={0}
                  max={subtotal}
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="h-7 text-xs pl-5 bg-white font-bold text-rose-700"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex justify-between items-center">
              <span className="font-bold text-sm text-foreground">Total Payable Amount:</span>
              <span className="font-display text-xl font-black text-emerald-800">
                {formatTk(totalAmount)}
              </span>
            </div>
          </div>

          {/* Payment Status & Mode */}
          <div className="rounded-2xl border border-border/80 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-emerald-600" />
                  Payment Collection Status
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Mark whether fee was collected right now
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold ${
                    isPaid ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {isPaid ? "Collected (Paid)" : "Unpaid (Due)"}
                </span>
                <Switch checked={isPaid} onCheckedChange={setIsPaid} />
              </div>
            </div>

            {isPaid ? (
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Payment Method:</span>
                {["cash", "bkash", "nagad", "card", "bank"].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize border transition-colors ${
                      paymentMethod === method
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-muted-foreground border-border hover:bg-slate-100"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            ) : (
              <div className="pt-2 flex items-center gap-3">
                <Label className="text-xs font-semibold text-muted-foreground shrink-0">Due Date:</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 text-xs bg-white font-mono max-w-[160px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border/50 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving} className="text-xs">
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSaveInvoice(true)}
              disabled={saving}
              className="text-xs gap-1.5 border-border hover:bg-slate-50"
              title="Create invoice and open combined receipt preview (A4 & Thermal)"
            >
              <Printer className="h-3.5 w-3.5 text-slate-700" />
              <span>Create & Print</span>
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => handleSaveInvoice(false)}
              disabled={saving}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm font-semibold"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>Create Invoice</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
