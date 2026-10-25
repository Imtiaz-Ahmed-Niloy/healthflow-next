"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  X,
  CheckCircle2,
  Clock,
  Building2,
  Phone,
  Calendar,
  FileText,
  Receipt,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface OpdInvoiceData {
  id: string;
  reference: string;
  party: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  is_paid?: boolean;
  created_at: string;
  description?: string | null;
  line_items?: LineItem[];
  facility_name?: string;
  facility_kind?: string;
  payment_method?: string;
  patient?: {
    id?: string;
    full_name?: string;
    mrn?: string;
    phone?: string;
    gender?: string | null;
    date_of_birth?: string | null;
  } | null;
}

interface OpdInvoiceReceiptModalProps {
  open: boolean;
  onClose: () => void;
  invoice: OpdInvoiceData | null;
  doctorName?: string;
  initialMode?: "invoice" | "thermal";
  formatTk: (amount: number) => string;
}

export function OpdInvoiceReceiptModal({
  open,
  onClose,
  invoice,
  doctorName = "Consultant Physician",
  initialMode = "invoice",
  formatTk,
}: OpdInvoiceReceiptModalProps) {
  const [viewMode, setViewMode] = useState<"thermal" | "invoice">(initialMode);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setViewMode(initialMode);
    }
  }, [open, initialMode]);

  if (!open || !invoice) return null;

  const isPaid = Boolean(invoice.paid_at || invoice.is_paid);
  const lines: LineItem[] =
    Array.isArray(invoice.line_items) && invoice.line_items.length > 0
      ? invoice.line_items
      : [
          {
            description: invoice.description || "OPD Clinical Consultation",
            quantity: 1,
            rate: invoice.amount,
            amount: invoice.amount,
          },
        ];

  const subtotal = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const discount = Math.max(0, subtotal - invoice.amount);
  const facilityName = invoice.facility_name || "HealthFlow Medical Centre";

  const dateObj = new Date(invoice.created_at || Date.now());
  const dateFormatted = dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeFormatted = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleCopyInvoice = () => {
    if (typeof window === "undefined" || !invoice.reference) return;
    navigator.clipboard.writeText(invoice.reference).then(() => {
      setCopied(true);
      toast.success("Invoice reference copied");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div
      className="sale-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 print:static print:inset-auto print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none print:overflow-visible print:bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {invoice.reference}
                </h2>
                <button
                  type="button"
                  onClick={handleCopyInvoice}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded"
                  title="Copy Invoice Number"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    isPaid
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {isPaid ? "Paid" : "Due"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {dateFormatted} at {timeFormatted}
              </p>
            </div>
          </div>

          {/* View Mode Toggle, Quick Print & Close Button (Pharma POS style) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode("invoice")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === "invoice"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Sales Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("thermal")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === "thermal"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Thermal Slip</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Print Now"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60 print:bg-white print:p-0 print:overflow-visible">
          {viewMode === "thermal" ? (
            /* =================== THERMAL RECEIPT (80mm) =================== */
            <div
              id="printable-slip"
              className="max-w-sm mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm font-mono text-[11px] text-slate-800 leading-relaxed print:border-none print:shadow-none print:p-0"
            >
              {/* Receipt Header */}
              <div className="text-center space-y-1 mb-4">
                <div className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                  {facilityName}
                </div>
                <div className="text-[10px] text-slate-500">
                  Outpatient Department (OPD) & Consultation
                </div>
                <div className="text-[10px] text-slate-500">
                  HealthFlow Hospital OS · OPD Division
                </div>
              </div>

              {/* Dashed Separator */}
              <div className="border-b border-dashed border-slate-300 my-2.5" />

              {/* Transaction Metadata */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">INVOICE:</span>
                  <span className="font-bold text-slate-900">{invoice.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DATE:</span>
                  <span>{dateFormatted} {timeFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DOCTOR:</span>
                  <span className="truncate max-w-[150px]">{doctorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PATIENT:</span>
                  <span className="truncate max-w-[150px] font-bold text-slate-900">
                    {invoice.party}
                  </span>
                </div>
                {invoice.patient?.mrn && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">MRN:</span>
                    <span>#{invoice.patient.mrn}</span>
                  </div>
                )}
                {invoice.patient?.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">PHONE:</span>
                    <span>{invoice.patient.phone}</span>
                  </div>
                )}
              </div>

              {/* Dashed Separator */}
              <div className="border-b border-dashed border-slate-300 my-2.5" />

              {/* Items Table Header */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>SERVICE / PROCEDURE</span>
                  <span>QTY x RATE</span>
                  <span className="text-right">TOTAL</span>
                </div>

                {lines.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between font-medium">
                      <span className="truncate max-w-[170px] text-slate-900">
                        {item.description}
                      </span>
                      <span>
                        {item.quantity} x {formatTk(item.rate)}
                      </span>
                      <span className="text-right font-bold text-slate-900">
                        {formatTk(item.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dashed Separator */}
              <div className="border-b border-dashed border-slate-300 my-2.5" />

              {/* Calculation Totals */}
              <div className="space-y-1">
                {discount > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subtotal:</span>
                      <span>{formatTk(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount:</span>
                      <span>-{formatTk(discount)}</span>
                    </div>
                  </>
                )}
                <div className="border-t border-slate-200 pt-1 flex justify-between text-sm font-bold text-slate-900">
                  <span>GRAND TOTAL:</span>
                  <span>{formatTk(invoice.amount)}</span>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between">
                  <span className="text-slate-500">PAYMENT STATUS:</span>
                  <span className={`font-bold ${isPaid ? "text-emerald-700" : "text-amber-700"}`}>
                    {isPaid ? "PAID IN FULL" : `DUE (${invoice.due_date})`}
                  </span>
                </div>

                {invoice.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">PAYMENT METHOD:</span>
                    <span className="font-semibold uppercase">{invoice.payment_method}</span>
                  </div>
                )}
              </div>

              {/* Barcode Visual Representation */}
              <div className="text-center mt-5 space-y-1">
                <div className="inline-block py-1 tracking-[4px] font-mono font-bold text-xs bg-slate-100 px-3 rounded border border-slate-200">
                  |||| | |||| |||| || | |||| |||||
                </div>
                <div className="text-[10px] text-slate-400">
                  {invoice.reference}
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="text-center text-[10px] text-slate-500 mt-4 space-y-1">
                <div>Thank you for choosing {facilityName}!</div>
                <div>Please preserve this slip for your OPD consultation visit.</div>
                <div>Wishing you good health & a fast recovery.</div>
              </div>
            </div>
          ) : (
            /* =================== A4 TAX INVOICE =================== */
            <div
              id="printable-sale-invoice"
              className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-xs text-slate-700 space-y-6 print:border-none print:shadow-none print:p-0"
            >
              {/* Official Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                      HF
                    </div>
                    <span className="text-lg font-bold text-slate-900">
                      {facilityName}
                    </span>
                  </div>
                  <div className="mt-2 text-slate-500 space-y-0.5">
                    <p>Outpatient Department (OPD) & Clinical Consultation</p>
                    <p>HealthFlow Hospital Operating System</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    OPD MONEY RECEIPT
                  </div>
                  <div className="mt-2 font-mono font-bold text-emerald-800 text-sm">
                    {invoice.reference}
                  </div>
                  <div className="text-slate-500 mt-1">Date: {dateFormatted} ({timeFormatted})</div>
                  <div className="text-slate-500">
                    Payment Method:{" "}
                    <span className="font-semibold text-slate-800 uppercase">
                      {invoice.payment_method || (isPaid ? "CASH" : "DUE")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer / Billing details */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Billed Patient:
                  </div>
                  <div className="font-bold text-sm text-slate-900">
                    {invoice.party}
                  </div>
                  {invoice.patient?.mrn && (
                    <div className="text-slate-500 mt-0.5 font-mono">
                      MRN: #{invoice.patient.mrn}
                    </div>
                  )}
                  {invoice.patient?.phone && (
                    <div className="text-slate-500">Phone: {invoice.patient.phone}</div>
                  )}
                  {invoice.patient?.gender && (
                    <div className="text-slate-500 capitalize">Gender: {invoice.patient.gender}</div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Consultation Details:
                  </div>
                  <div className="text-slate-600">
                    Attending Doctor:{" "}
                    <span className="font-semibold text-slate-900">{doctorName}</span>
                  </div>
                  <div className="text-slate-600">
                    Payment Status:{" "}
                    <span className={`font-semibold ${isPaid ? "text-emerald-700" : "text-amber-700"}`}>
                      {isPaid ? "Paid in Full" : `Payment Due (Due Date: ${invoice.due_date})`}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Facility:{" "}
                    <span className="font-semibold text-slate-900">{facilityName}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">Clinical Service / Procedure</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Unit Rate</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {item.description}
                        </td>
                        <td className="py-3 px-4 text-center font-medium font-mono">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatTk(item.rate)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatTk(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculations and Breakdown */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-xs">
                  {discount > 0 && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Gross Subtotal:</span>
                        <span>{formatTk(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount:</span>
                        <span>-{formatTk(discount)}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
                    <span>Grand Total:</span>
                    <span>{formatTk(invoice.amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 pt-1">
                    <span>Status:</span>
                    <span className={`font-bold uppercase ${isPaid ? "text-emerald-700" : "text-amber-700"}`}>
                      {isPaid ? "Settled" : "Outstanding Due"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures & Notes */}
              <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-200">
                <div className="text-[11px] text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700">Notice:</p>
                  <p>1. Official OPD Medical Consultation Receipt.</p>
                  <p>2. Please preserve this receipt for follow-up verification.</p>
                  <p>3. This is a computer-generated invoice and requires no physical seal.</p>
                </div>

                <div className="text-right space-y-8">
                  <div className="text-[11px] text-slate-400">Authorized Medical Officer</div>
                  <div className="border-b border-slate-300 w-48 ml-auto font-serif italic text-slate-800 text-sm">
                    {doctorName}
                  </div>
                  <div className="text-xs font-medium text-slate-600">
                    Signatory & Stamp
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Pharma POS style) */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{viewMode === "invoice" ? "Print Invoice" : "Print Receipt"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
