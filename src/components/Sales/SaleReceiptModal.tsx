"use client";

import React, { useState } from "react";
import {
  X,
  Printer,
  RotateCcw,
  Receipt,
  FileText,
  Check,
  Copy,
  AlertTriangle,
  Calendar,
  User,
  CreditCard,
  Building,
  Award,
  Gift,
} from "lucide-react";
import { Sale } from "@/types/pharmacy";
import { formatCurrency } from "@/lib/utils";

interface SaleReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReturnModal: (sale: Sale) => void;
  currencySymbol: string;
  initialMode?: "thermal" | "invoice";
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  sale,
  isOpen,
  onClose,
  onOpenReturnModal,
  currencySymbol,
  initialMode = "invoice",
}) => {
  const [viewMode, setViewMode] = useState<"thermal" | "invoice">(initialMode);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setViewMode(initialMode);
    }
  }, [isOpen, initialMode]);

  if (!isOpen || !sale) return null;

  const handleCopyInvoice = () => {
    navigator.clipboard.writeText(sale.invoiceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const canReturn =
    sale.status !== "RETURNED" &&
    sale.items.some((i) => (i.returnedQuantity || 0) < i.quantity);

  return (
    <div className="sale-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 print:static print:inset-auto print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none">
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
                  {sale.invoiceNumber}
                </h2>
                <button
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
                    sale.status === "COMPLETED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : sale.status === "PARTIAL_RETURN"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {sale.status === "PARTIAL_RETURN" ? "Partial Return" : sale.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">{sale.date}</p>
            </div>
          </div>

          {/* View Mode Toggle, Quick Print & Close Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
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
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Print Now"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
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
                  PHARMACYNEXT HEALTHCARE
                </div>
                <div className="text-[10px] text-slate-500">
                  123 Medical Center Way, Suite 400
                </div>
                <div className="text-[10px] text-slate-500">
                  Tel: (555) 234-5678 • TRN: 88492019
                </div>
                <div className="text-[10px] text-slate-500">
                  Govt. Pharmacy Reg: PH-2026-991
                </div>
              </div>

              {/* Dashed Separator */}
              <div className="border-b border-dashed border-slate-300 my-2.5" />

              {/* Transaction Metadata */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">INVOICE:</span>
                  <span className="font-bold text-slate-900">{sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DATE:</span>
                  <span>{sale.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CASHIER:</span>
                  <span>{sale.cashier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CUSTOMER:</span>
                  <span className="truncate max-w-[150px]">
                    {sale.customer.name} ({sale.customer.type || "Walk-in"})
                  </span>
                </div>
                {sale.customer.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">PHONE:</span>
                    <span>{sale.customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Dashed Separator */}
              <div className="border-b border-dashed border-slate-300 my-2.5" />

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                  <span>ITEM / BATCH</span>
                  <span>QTY x RATE</span>
                  <span className="text-right">TOTAL</span>
                </div>

                {sale.items.map((item, idx) => {
                  const isItemReturned = (item.returnedQuantity || 0) > 0;
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-medium">
                        <span className="truncate max-w-[180px] text-slate-900">
                          {item.name}
                        </span>
                        <span>
                          {item.quantity} {item.unit ? `[${item.unit}]` : ""} x {formatCurrency(item.unitPrice, currencySymbol)}
                        </span>
                        <span className="text-right font-bold text-slate-900">
                          {formatCurrency(item.total, currencySymbol)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>
                          Batch: {item.batchNumber} • Exp: {item.expiryDate}
                        </span>
                        {isItemReturned && (
                          <span className="text-amber-600 font-semibold">
                            ({item.returnedQuantity} returned)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dashed Separator */}
              <div className="border-b border-dashed border-slate-300 my-2.5" />

              {/* Calculation Totals */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span>{formatCurrency(sale.subtotal, currencySymbol)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span>-{formatCurrency(sale.discount, currencySymbol)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">VAT (5%):</span>
                  <span>{formatCurrency(sale.tax, currencySymbol)}</span>
                </div>
                <div className="border-t border-slate-200 pt-1 flex justify-between text-sm font-bold text-slate-900">
                  <span>GRAND TOTAL:</span>
                  <span>{formatCurrency(sale.totalAmount, currencySymbol)}</span>
                </div>

                {/* Refunded if any */}
                {sale.refundedAmount > 0 && (
                  <div className="flex justify-between text-amber-700 font-bold bg-amber-50 p-1 rounded">
                    <span>REFUNDED:</span>
                    <span>-{formatCurrency(sale.refundedAmount, currencySymbol)}</span>
                  </div>
                )}
                {sale.refundedAmount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>NET AMOUNT:</span>
                    <span>
                      {formatCurrency(
                        Math.max(0, sale.totalAmount - sale.refundedAmount),
                        currencySymbol
                      )}
                    </span>
                  </div>
                )}

                {sale.customer.loyaltyPointsEarned ? (
                  <div className="flex justify-between items-center text-emerald-800 font-bold bg-emerald-50 px-1 py-0.5 rounded text-[11px]">
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3 text-slate-800" /> REWARD POINTS EARNED:
                    </span>
                    <span>+{sale.customer.loyaltyPointsEarned} pts</span>
                  </div>
                ) : null}
                {sale.customer.loyaltyPointsRedeemed ? (
                  <div className="flex justify-between items-center text-amber-800 font-bold bg-amber-50 px-1 py-0.5 rounded text-[11px]">
                    <span className="flex items-center gap-1">
                      <Gift className="w-3 h-3 text-slate-800" /> POINTS REDEEMED:
                    </span>
                    <span>-{sale.customer.loyaltyPointsRedeemed} pts</span>
                  </div>
                ) : null}

                <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between">
                  <span className="text-slate-500">PAYMENT ({sale.paymentMethod}):</span>
                  <span>{formatCurrency(sale.paidAmount, currencySymbol)}</span>
                </div>
                {sale.paymentMethod === "CASH" && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">CHANGE DUE:</span>
                    <span>{formatCurrency(sale.changeAmount, currencySymbol)}</span>
                  </div>
                )}
              </div>

              {/* Returns Section / Audit Note if applicable */}
              {sale.returns && sale.returns.length > 0 && (
                <div className="mt-3 p-2 bg-amber-50/70 border border-amber-200 rounded text-[10px] text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-amber-800">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>RETURN AUDIT LOG:</span>
                  </div>
                  {sale.returns.map((ret, rIdx) => (
                    <div key={rIdx} className="border-t border-amber-200/60 pt-1">
                      <div>
                        {ret.returnDate}: Refunded{" "}
                        <span className="font-bold">
                          {formatCurrency(ret.refundAmount, currencySymbol)}
                        </span>{" "}
                        via {ret.refundMethod}
                      </div>
                      <div className="italic text-amber-700">Reason: {ret.reason}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Barcode Visual Representation */}
              <div className="text-center mt-5 space-y-1">
                <div className="inline-block py-1 tracking-[4px] font-mono font-bold text-xs bg-slate-100 px-3 rounded border border-slate-200">
                  ||||| | |||| |||| || | |||| |||||
                </div>
                <div className="text-[10px] text-slate-400">
                  {sale.invoiceNumber.replace(/[^0-9]/g, "") || "202610018849"}
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="text-center text-[10px] text-slate-500 mt-4 space-y-1">
                <div>Thank you for choosing PharmacyNext!</div>
                <div>Returns accepted within 7 days with valid receipt.</div>
                <div>Store medications below 25°C in a dry place.</div>
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
                      P+
                    </div>
                    <span className="text-lg font-bold text-slate-900">
                      PharmacyNext Healthcare Ltd.
                    </span>
                  </div>
                  <div className="mt-2 text-slate-500 space-y-0.5">
                    <p>123 Medical Center Way, Suite 400</p>
                    <p>Healthcare District, Metro City 10001</p>
                    <p>Tax Registration No: TRN-88492019-VAT</p>
                    <p>Pharmacy Board License: PH-2026-991</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    TAX INVOICE
                  </div>
                  <div className="mt-2 font-mono font-bold text-emerald-800 text-sm">
                    {sale.invoiceNumber}
                  </div>
                  <div className="text-slate-500 mt-1">Date: {sale.date}</div>
                  <div className="text-slate-500">
                    Payment Method:{" "}
                    <span className="font-semibold text-slate-800">
                      {sale.paymentMethod}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer / Billing details */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Billed To:
                  </div>
                  <div className="font-bold text-sm text-slate-900">
                    {sale.customer.name}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Customer Type: {sale.customer.type || "Walk-in Retail"}
                  </div>
                  {sale.customer.phone && (
                    <div className="text-slate-500">Phone: {sale.customer.phone}</div>
                  )}
                  {sale.customer.email && (
                    <div className="text-slate-500">Email: {sale.customer.email}</div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Transaction Details:
                  </div>
                  <div className="text-slate-600">
                    Dispensed By:{" "}
                    <span className="font-semibold text-slate-900">{sale.cashier}</span>
                  </div>
                  <div className="text-slate-600">
                    Payment Status:{" "}
                    <span className="font-semibold text-emerald-700">
                      {sale.paymentStatus}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Order Status:{" "}
                    <span className="font-semibold text-slate-900">{sale.status}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">Medicine Item</th>
                      <th className="py-2.5 px-4">Batch / Exp</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-center">Ret.</th>
                      <th className="py-2.5 px-4 text-right">Unit Rate</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {item.batchNumber} ({item.expiryDate})
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          <span>{item.quantity}</span>
                          {item.unit && (
                            <span className="text-[10px] text-slate-500 font-normal block font-sans">
                              ({item.unit})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-amber-600 font-semibold">
                          {item.returnedQuantity || 0}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatCurrency(item.unitPrice, currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.total, currencySymbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculations and Breakdown */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(sale.subtotal, currencySymbol)}</span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(sale.discount, currencySymbol)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>VAT / Tax (5%):</span>
                    <span>{formatCurrency(sale.tax, currencySymbol)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(sale.totalAmount, currencySymbol)}</span>
                  </div>
                  {sale.refundedAmount > 0 && (
                    <div className="flex justify-between font-bold text-amber-700 bg-amber-50 p-1 rounded">
                      <span>Total Refunded:</span>
                      <span>-{formatCurrency(sale.refundedAmount, currencySymbol)}</span>
                    </div>
                  )}
                  {sale.refundedAmount > 0 && (
                    <div className="flex justify-between font-bold text-emerald-800 text-sm border-t border-slate-200 pt-1">
                      <span>Net Settled:</span>
                      <span>
                        {formatCurrency(
                          Math.max(0, sale.totalAmount - sale.refundedAmount),
                          currencySymbol
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Return Audit trail if available */}
              {sale.returns && sale.returns.length > 0 && (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Return & Refund Transactions on this Invoice:</span>
                  </div>
                  {sale.returns.map((ret, rIdx) => (
                    <div
                      key={rIdx}
                      className="text-xs text-amber-800 bg-white p-2.5 rounded-lg border border-amber-100 flex justify-between items-center"
                    >
                      <div>
                        <span className="font-semibold">{ret.returnDate}</span>:{" "}
                        {ret.reason} (Refund via {ret.refundMethod})
                      </div>
                      <div className="font-mono font-bold text-amber-700">
                        -{formatCurrency(ret.refundAmount, currencySymbol)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Signatures & Notes */}
              <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-200">
                <div className="text-[11px] text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700">Terms & Conditions:</p>
                  <p>1. Prescribed items are non-refundable once opened or used.</p>
                  <p>2. Unopened medicines can be exchanged within 7 days with receipt.</p>
                  <p>3. This is a computer-generated tax invoice and requires no physical seal.</p>
                </div>

                <div className="text-right space-y-8">
                  <div className="text-[11px] text-slate-400">Authorized Signature & Stamp</div>
                  <div className="border-b border-slate-300 w-48 ml-auto" />
                  <div className="text-xs font-medium text-slate-600">
                    Chief Dispensing Pharmacist
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {canReturn && (
              <button
                onClick={() => {
                  onClose();
                  onOpenReturnModal(sale);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Process Return</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{viewMode === "invoice" ? "Print Invoice" : "Print Receipt"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
