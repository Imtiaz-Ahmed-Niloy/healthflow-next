"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/crud";
import { Btn, Pill } from "@/components/admin/ui";
import { useFormatters } from "@/lib/appSettings";
import { BRAND_INFO } from "@/constants/brand";
import { Printer, Receipt, Plus, Trash2, Calculator } from "lucide-react";
import type { BillLine } from "@/redux/api/resources";

type PatientOption = { id: string; full_name: string };

type ConsolidatedBillModalProps = {
  open: boolean;
  onClose: () => void;
  patients: PatientOption[];
  suggestedReference: string;
  onSaveInvoice: (invoiceData: {
    reference: string;
    party: string;
    patient_id: string;
    kind: "receivable";
    amount: number;
    due_date: string;
    paid_at?: string | null;
    line_items: BillLine[];
  }) => Promise<void>;
};

export function ConsolidatedBillModal({
  open,
  onClose,
  patients,
  suggestedReference,
  onSaveInvoice,
}: ConsolidatedBillModalProps) {
  const { formatCurrency } = useFormatters();

  const [patientId, setPatientId] = useState("");
  const [reference, setReference] = useState(suggestedReference);
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPaid, setIsPaid] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const [advanceDeposit, setAdvanceDeposit] = useState<number>(0);

  const [lines, setLines] = useState<BillLine[]>([
    { description: "General Ward / Bed Charges (3 Days @ 1,200/day)", quantity: 3, rate: 1200, amount: 3600 },
    { description: "Consultant Physician Daily Rounds (3 Visits)", quantity: 3, rate: 800, amount: 2400 },
    { description: "Diagnostic Pathology & Lab Tests (CBC, LFT, Electrolytes)", quantity: 1, rate: 1850, amount: 1850 },
    { description: "Pharmacy Inpatient Medications & Infusions", quantity: 1, rate: 2200, amount: 2200 },
    { description: "Nursing & Medical Service Charges", quantity: 3, rate: 300, amount: 900 },
  ]);

  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const selectedPatient = patients.find((p) => p.id === patientId);

  const subtotal = lines.reduce((acc, l) => acc + Number(l.amount || 0), 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const netPayable = Math.max(0, afterDiscount - advanceDeposit);

  const handleAddLine = () => {
    setLines([
      ...lines,
      { description: "", quantity: 1, rate: 0, amount: 0 },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleUpdateLine = (idx: number, field: keyof BillLine, val: any) => {
    const updated = [...lines];
    const item = { ...updated[idx], [field]: val };
    if (field === "quantity" || field === "rate") {
      const q = field === "quantity" ? Number(val || 0) : Number(item.quantity || 0);
      const r = field === "rate" ? Number(val || 0) : Number(item.rate || 0);
      item.amount = Number((q * r).toFixed(2));
    }
    updated[idx] = item;
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !selectedPatient) return;
    setSaving(true);
    try {
      await onSaveInvoice({
        reference: reference.trim(),
        party: selectedPatient.full_name,
        patient_id: patientId,
        kind: "receivable",
        amount: netPayable,
        due_date: dueDate,
        paid_at: isPaid ? new Date().toISOString() : null,
        line_items: lines,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=850,height=950");
    if (!w) return;

    const patientName = selectedPatient?.full_name || "Patient";
    const bodyRows = lines.map((l) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${l.description}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${l.quantity}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">${formatCurrency(Number(l.rate))}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-weight: 600;">${formatCurrency(Number(l.amount))}</td>
      </tr>
    `).join("");

    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Consolidated Hospital Invoice - ${reference}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; color: #111827; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; }
            .brand { font-size: 24px; font-weight: 800; color: #065f46; }
            .title { font-size: 18px; font-weight: bold; color: #1f2937; text-align: right; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f9fafb; padding: 14px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px; font-size: 13px; }
            .label { color: #6b7280; }
            .val { font-weight: 600; color: #111827; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
            th { text-align: left; padding: 8px 12px; background: #f3f4f6; color: #374151; border-bottom: 2px solid #d1d5db; font-size: 12px; }
            .totals { width: 320px; margin-left: auto; font-size: 13px; line-height: 1.8; }
            .totals-row { display: flex; justify-content: space-between; }
            .grand-total { font-size: 16px; font-weight: bold; color: #065f46; border-top: 2px solid #059669; padding-top: 4px; margin-top: 4px; }
            .footer { margin-top: 70px; display: flex; justify-content: space-between; font-size: 12px; }
            .sign-box { text-align: center; width: 180px; border-top: 1px solid #9ca3af; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">${BRAND_INFO.name}</div>
              <div style="font-size: 11px; color: #6b7280;">Hospital & Inpatient Healthcare Facilities</div>
            </div>
            <div>
              <div class="title">COMPREHENSIVE HOSPITAL BILL</div>
              <div style="font-family: monospace; font-size: 13px; color: #047857; text-align: right;">${reference}</div>
            </div>
          </div>

          <div class="meta">
            <div><span class="label">Patient Name:</span> <span class="val">${patientName}</span></div>
            <div><span class="label">Billing Date:</span> <span class="val">${new Date().toISOString().slice(0, 10)}</span></div>
            <div><span class="label">Payment Due:</span> <span class="val">${dueDate}</span></div>
            <div><span class="label">Settlement Status:</span> <span class="val" style="color: ${isPaid ? '#059669' : '#d97706'}">${isPaid ? 'PAID / SETTLED' : 'PENDING'}</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Service / Charge Description</th>
                <th style="text-align: center; width: 80px;">Days/Qty</th>
                <th style="text-align: right; width: 120px;">Unit Rate</th>
                <th style="text-align: right; width: 120px;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${bodyRows}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row"><span class="label">Gross Subtotal:</span> <span class="val font-mono">${formatCurrency(subtotal)}</span></div>
            ${discount > 0 ? `<div class="totals-row"><span class="label">Discount:</span> <span class="val font-mono" style="color: #dc2626;">-${formatCurrency(discount)}</span></div>` : ''}
            ${advanceDeposit > 0 ? `<div class="totals-row"><span class="label">Advance Deposit Deducted:</span> <span class="val font-mono" style="color: #2563eb;">-${formatCurrency(advanceDeposit)}</span></div>` : ''}
            <div class="totals-row grand-total"><span>Net Payable:</span> <span class="font-mono">${formatCurrency(netPayable)}</span></div>
          </div>

          <div class="footer">
            <div class="sign-box">Billing Executive / Cashier</div>
            <div class="sign-box">Hospital Superintendent</div>
          </div>

          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <Modal open={open} title="Generate Consolidated Patient Bill" onClose={onClose} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Patient Selection & Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/40 p-3 rounded-xl">
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
              Select Patient *
            </label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full bg-card border border-border/70 rounded-lg p-2 font-medium"
              required
            >
              <option value="">-- Choose Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
              Invoice Reference # *
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-card border border-border/70 rounded-lg p-2 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-card border border-border/70 rounded-lg p-2"
              required
            />
          </div>
        </div>

        {/* Billable Lines Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
              Itemized Hospital Charges
            </h4>
            <Btn type="button" onClick={handleAddLine} variant="outline" className="text-[11px] py-1 px-2.5 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Charge Item
            </Btn>
          </div>

          <div className="border border-border/70 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 font-semibold text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Description</th>
                  <th className="p-2 text-center w-20">Qty/Days</th>
                  <th className="p-2 text-right w-24">Rate</th>
                  <th className="p-2 text-right w-28">Amount</th>
                  <th className="p-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {lines.map((l, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="p-2">
                      <input
                        type="text"
                        value={l.description}
                        onChange={(e) => handleUpdateLine(idx, "description", e.target.value)}
                        placeholder="Service / Room / Lab / Medicine"
                        className="w-full bg-white border border-border/70 rounded px-2 py-1 text-xs"
                        required
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={l.quantity}
                        onChange={(e) => handleUpdateLine(idx, "quantity", e.target.value)}
                        className="w-full bg-white border border-border/70 rounded px-2 py-1 text-center font-mono text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.rate}
                        onChange={(e) => handleUpdateLine(idx, "rate", e.target.value)}
                        className="w-full bg-white border border-border/70 rounded px-2 py-1 text-right font-mono text-xs"
                      />
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-foreground">
                      {formatCurrency(Number(l.amount))}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-muted-foreground hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Discounts, Advance & Grand Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-xl border border-border/60">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-muted-foreground w-36">Discount Amount:</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value || 0))}
                className="bg-card border border-border/70 rounded px-2 py-1 font-mono text-xs w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-muted-foreground w-36">Advance Deposit:</label>
              <input
                type="number"
                min="0"
                value={advanceDeposit}
                onChange={(e) => setAdvanceDeposit(Number(e.target.value || 0))}
                className="bg-card border border-border/70 rounded px-2 py-1 font-mono text-xs w-32"
              />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="rounded border-border"
              />
              <span className="font-semibold text-emerald-800">Mark as settled & paid immediately</span>
            </label>
          </div>

          <div className="text-right space-y-1 font-mono text-xs self-end">
            <p className="text-muted-foreground">Subtotal: <span className="font-bold text-foreground">{formatCurrency(subtotal)}</span></p>
            {discount > 0 && <p className="text-rose-600">Discount: -{formatCurrency(discount)}</p>}
            {advanceDeposit > 0 && <p className="text-blue-600">Advance Deposit: -{formatCurrency(advanceDeposit)}</p>}
            <p className="text-base font-bold text-primary border-t border-border pt-1">
              Net Payable: {formatCurrency(netPayable)}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 flex items-center justify-between">
          <Btn type="button" onClick={handlePrint} variant="outline" className="text-xs flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print Preview
          </Btn>
          <div className="flex gap-2">
            <Btn type="button" variant="outline" onClick={onClose} className="text-xs">
              Cancel
            </Btn>
            <Btn type="submit" disabled={saving || !patientId} variant="primary" className="text-xs">
              {saving ? "Generating Bill..." : "Create & Save Invoice"}
            </Btn>
          </div>
        </div>
      </form>
    </Modal>
  );
}
