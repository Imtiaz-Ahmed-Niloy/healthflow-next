"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Package,
  DollarSign,
  Wallet,
  Info,
  ShieldCheck,
  Lock,
  Printer,
  FileText,
  Building2,
  Trash2,
  RefreshCw,
  Star,
  Check,
  Banknote,
  CreditCard,
  Coins,
  AlertCircle,
} from "lucide-react";
import { Sale, ItemReturnCondition, SaleReturnRecord } from "@/types/pharmacy";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { usePharmacy } from "@/context/PharmacyContext";

interface ProcessReturnModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
}

export const ProcessReturnModal: React.FC<ProcessReturnModalProps> = ({
  sale,
  isOpen,
  onClose,
  currencySymbol,
}) => {
  const { processReturn, drawerStatus, staffMembers } = usePharmacy();

  // Return quantities indexed by productId
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  // Item conditions indexed by productId
  const [itemConditions, setItemConditions] = useState<Record<string, ItemReturnCondition>>({});

  const [reason, setReason] = useState<string>("Customer Purchased Wrong Item");
  const [customReason, setCustomReason] = useState<string>("");
  const [refundMethod, setRefundMethod] = useState<"CASH" | "ORIGINAL" | "CREDIT">("CASH");
  const [notes, setNotes] = useState<string>("");

  // Manager Authorization PIN state (MANDATORY for every refund)
  const [managerPin, setManagerPin] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [returnResult, setReturnResult] = useState<SaleReturnRecord | null>(null);

  // Initialize return states when modal opens
  useEffect(() => {
    if (sale) {
      const initialQtys: Record<string, number> = {};
      const initialConds: Record<string, ItemReturnCondition> = {};
      sale.items.forEach((item) => {
        initialQtys[item.productId] = 0;
        initialConds[item.productId] = "SEALED_RESTOCK";
      });
      setReturnQtys(initialQtys);
      setItemConditions(initialConds);
      setReason("Customer Purchased Wrong Item");
      setCustomReason("");
      setRefundMethod(sale.paymentMethod === "CASH" ? "CASH" : "ORIGINAL");
      setNotes("");
      setManagerPin("");
      setPinError("");
      setReturnResult(null);
    }
  }, [sale, isOpen]);

  // Live Manager/Pharmacist verification
  const verifyingManager = useMemo(() => {
    if (!managerPin || managerPin.length !== 4) return null;
    return staffMembers.find(
      (s) =>
        s.posPin === managerPin &&
        s.status === "ACTIVE" &&
        (s.role === "superadmin" ||
          s.role === "admin" ||
          s.role === "pharmacist" ||
          s.customPermissions?.canVoidSales === true)
    );
  }, [managerPin, staffMembers]);

  if (!isOpen || !sale) return null;

  // Quantity helpers
  const handleQtyChange = (productId: string, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(val, max));
    setReturnQtys((prev) => ({
      ...prev,
      [productId]: clamped,
    }));
  };

  const handleReturnAll = () => {
    const allQtys: Record<string, number> = {};
    sale.items.forEach((item) => {
      const maxReturnable = item.quantity - (item.returnedQuantity || 0);
      allQtys[item.productId] = Math.max(0, maxReturnable);
    });
    setReturnQtys(allQtys);
  };

  const handleClearAll = () => {
    const clearedQtys: Record<string, number> = {};
    sale.items.forEach((item) => {
      clearedQtys[item.productId] = 0;
    });
    setReturnQtys(clearedQtys);
  };

  // Calculations
  const selectedItemsToReturn = sale.items
    .map((item) => {
      const qty = returnQtys[item.productId] || 0;
      const condition = itemConditions[item.productId] || "SEALED_RESTOCK";
      return {
        ...item,
        qtyToReturn: qty,
        condition,
        unit: item.unit || "Box",
        lineRefund: Number((qty * item.unitPrice).toFixed(2)),
      };
    })
    .filter((i) => i.qtyToReturn > 0);

  const subtotalRefund = selectedItemsToReturn.reduce(
    (sum, item) => sum + item.lineRefund,
    0
  );

  const taxRate = sale.subtotal > 0 ? sale.tax / sale.subtotal : 0.05;
  const taxRefund = Number((subtotalRefund * taxRate).toFixed(2));
  const totalRefund = Number((subtotalRefund + taxRefund).toFixed(2));

  const totalReturnUnits = selectedItemsToReturn.reduce(
    (sum, i) => sum + i.qtyToReturn,
    0
  );

  // Proportional points reversal
  const pointsToReverse =
    sale.customer?.customerId && sale.customer.loyaltyPointsEarned
      ? Math.min(
          sale.customer.loyaltyPointsEarned,
          Math.round(
            sale.customer.loyaltyPointsEarned *
              (sale.totalAmount > 0 ? totalRefund / sale.totalAmount : 1)
          )
        )
      : 0;

  // Handle Return Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemsToReturn.length === 0) return;

    // Strict Manager / Pharmacist PIN enforcement
    if (!verifyingManager) {
      setPinError("Valid Manager or Pharmacist PIN is strictly required to authorize returns.");
      return;
    }

    setIsSubmitting(true);
    setPinError("");

    const effectiveReason = reason === "Other" && customReason ? customReason : reason;

    const returnPayload = {
      items: selectedItemsToReturn.map((item) => ({
        productId: item.productId,
        quantity: item.qtyToReturn,
        condition: item.condition,
        unit: item.unit,
        batchNumber: item.batchNumber,
      })),
      reason: effectiveReason,
      refundMethod,
      notes: notes.trim() || undefined,
      managerPin,
      authorizedManagerName: `${verifyingManager.name} (${verifyingManager.role.toUpperCase()})`,
    };

    const res = processReturn(sale.id, returnPayload);

    setIsSubmitting(false);

    if (res.success && res.returnRecord) {
      setReturnResult(res.returnRecord);
    } else {
      alert(res.error || "Failed to process return. Please check quantities.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#f7faf8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {returnResult ? "Official Return Voucher & Credit Note" : "Process Item Return & Refund"}
              </h2>
              <p className="text-xs text-slate-500">
                Invoice #{sale.invoiceNumber} • {sale.customer?.name || "Walk-in Customer"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {returnResult ? (
          /* ============================================================== */
          /* OFFICIAL RETURN VOUCHER / RECEIPT VIEW */
          /* ============================================================== */
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#fafcfa]">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#0e6245] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Return Completed Successfully</h3>
                <p className="text-xs text-slate-600">
                  Refund of {formatCurrency(returnResult.refundAmount, currencySymbol)} issued via{" "}
                  <strong>{returnResult.refundMethod}</strong>.
                </p>
              </div>
            </div>

            {/* Printable Voucher Paper Slip */}
            <div
              id="printableReturnSlip"
              className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs"
            >
              <div className="text-center pb-3 border-b border-slate-200">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  PharmacyNext Dispensary
                </div>
                <h4 className="text-lg font-black text-slate-900 mt-0.5">RETURN CREDIT NOTE</h4>
                <div className="font-mono text-xs font-bold text-slate-600 mt-1">
                  Voucher: {returnResult.returnVoucherNumber}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Ref Invoice: {sale.invoiceNumber} • {returnResult.returnDate}
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 text-xs py-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Customer:</span>
                  <span className="font-semibold text-slate-800">
                    {sale.customer?.name || "Walk-in Customer"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Refund Method:</span>
                  <span className="font-bold text-slate-900">{returnResult.refundMethod}</span>
                </div>
              </div>

              {/* Returned Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5 text-center">Unit</th>
                      <th className="p-2.5 text-center">Condition</th>
                      <th className="p-2.5 text-right">Qty</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnResult.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-medium text-slate-900">{it.name}</td>
                        <td className="p-2.5 text-center text-slate-600 font-mono text-[11px]">
                          {it.unit || "Box"}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              it.condition === "SEALED_RESTOCK"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {it.condition === "SEALED_RESTOCK" ? "Restocked" : "Disposed"}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold">{it.quantity}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(it.subtotal, currencySymbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Refund Summary */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-800">Total Refunded:</span>
                <span className="font-mono text-base font-black text-[#0e6245]">
                  {formatCurrency(returnResult.refundAmount, currencySymbol)}
                </span>
              </div>

              {/* Loyalty Points deduction alert */}
              {returnResult.pointsReversed ? (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                  <span>Loyalty Points Reversed:</span>
                  <span className="font-bold font-mono">-{returnResult.pointsReversed} Points</span>
                </div>
              ) : null}

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-6 text-xs text-slate-500">
                <div className="border-t border-slate-300 pt-2 text-center">
                  <div className="font-semibold text-slate-800">
                    {returnResult.authorizedByManager}
                  </div>
                  <div className="text-[10px] text-slate-400">Pharmacist Authorization</div>
                </div>
                <div className="border-t border-slate-300 pt-2 text-center">
                  <div className="font-semibold text-slate-800">
                    {sale.customer?.name || "Customer"}
                  </div>
                  <div className="text-[10px] text-slate-400">Customer Signature</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Print Return Voucher Slip</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-[#0e6245] hover:bg-[#0b4d37] text-white font-semibold rounded-xl text-xs shadow-sm transition-colors"
              >
                Done / Close
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* RETURN INITIATION FORM */
          /* ============================================================== */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Quick Full Return / Clear Buttons */}
            <div className="flex items-center justify-between pb-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Items to Return & Unit Quantities
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReturnAll}
                  className="px-2.5 py-1 text-xs font-semibold text-[#0e6245] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                >
                  Return All Items
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Item Selection Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-2 text-center">Unit</th>
                    <th className="py-2.5 px-2 text-center">Sold (Rem)</th>
                    <th className="py-2.5 px-2 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Return Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item) => {
                    const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                    const currentReturn = returnQtys[item.productId] || 0;
                    const isFullyReturned = maxReturnable <= 0;
                    const condition = itemConditions[item.productId] || "SEALED_RESTOCK";

                    return (
                      <React.Fragment key={item.productId}>
                        <tr className={isFullyReturned ? "bg-slate-50/70 opacity-50" : ""}>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            {item.batchNumber && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Batch: {item.batchNumber}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[10px] font-semibold">
                              {item.unit || "Box"}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center font-mono">
                            <span className="font-semibold text-slate-800">{item.quantity}</span>
                            <span className="text-slate-400 text-[10px]"> ({maxReturnable})</span>
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-medium text-slate-800">
                            {formatCurrency(item.unitPrice, currencySymbol)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isFullyReturned || currentReturn <= 0}
                                onClick={() =>
                                  handleQtyChange(item.productId, currentReturn - 1, maxReturnable)
                                }
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={maxReturnable}
                                disabled={isFullyReturned}
                                value={currentReturn}
                                onChange={(e) =>
                                  handleQtyChange(
                                    item.productId,
                                    parseInt(e.target.value) || 0,
                                    maxReturnable
                                  )
                                }
                                className="w-12 text-center py-0.5 border border-slate-200 rounded text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <button
                                type="button"
                                disabled={isFullyReturned || currentReturn >= maxReturnable}
                                onClick={() =>
                                  handleQtyChange(item.productId, currentReturn + 1, maxReturnable)
                                }
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Condition Selector Row (if item is selected for return) */}
                        {currentReturn > 0 && (
                          <tr className="bg-amber-50/30">
                            <td colSpan={5} className="px-3 py-2 border-t border-slate-100">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-600 flex items-center gap-1">
                                  <span>Package Condition:</span>
                                </span>
                                <div className="flex items-center gap-2">
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`cond-${item.productId}`}
                                      checked={condition === "SEALED_RESTOCK"}
                                      onChange={() =>
                                        setItemConditions((prev) => ({
                                          ...prev,
                                          [item.productId]: "SEALED_RESTOCK",
                                        }))
                                      }
                                      className="text-emerald-700 accent-emerald-700"
                                    />
                                    <span className="text-emerald-800 font-medium flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-800" />
                                      <span>Sealed & Intact (Restock)</span>
                                    </span>
                                  </label>

                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`cond-${item.productId}`}
                                      checked={condition === "DAMAGED_DISPOSAL"}
                                      onChange={() =>
                                        setItemConditions((prev) => ({
                                          ...prev,
                                          [item.productId]: "DAMAGED_DISPOSAL",
                                        }))
                                      }
                                      className="text-rose-700 accent-rose-700"
                                    />
                                    <span className="text-rose-800 font-medium flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5 text-slate-800" />
                                      <span>Damaged / Unsealed (Waste)</span>
                                    </span>
                                  </label>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Reason for Return */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Return
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Customer Purchased Wrong Item">Customer Purchased Wrong Item</option>
                  <option value="Doctor Changed Prescription">Doctor Changed Prescription</option>
                  <option value="Adverse Reaction / Allergy">Adverse Reaction / Allergy</option>
                  <option value="Damaged / Broken Blister on Purchase">
                    Damaged / Broken Blister on Purchase
                  </option>
                  <option value="Customer No Longer Needs Medication">
                    Customer No Longer Needs Medication
                  </option>
                  <option value="Other">Other (Custom Reason)</option>
                </select>
              </div>

              {/* Refund Payout Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Refund Payout Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer text-xs transition-all ${
                      refundMethod === "CASH"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="CASH"
                      checked={refundMethod === "CASH"}
                      onChange={() => setRefundMethod("CASH")}
                      className="hidden"
                    />
                    <span className="flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-slate-800" />
                      <span>Cash</span>
                    </span>
                  </label>

                  <label
                    className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer text-xs transition-all ${
                      refundMethod === "ORIGINAL"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="ORIGINAL"
                      checked={refundMethod === "ORIGINAL"}
                      onChange={() => setRefundMethod("ORIGINAL")}
                      className="hidden"
                    />
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-800" />
                      <span>Original</span>
                    </span>
                  </label>

                  <label
                    className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer text-xs transition-all ${
                      refundMethod === "CREDIT"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value="CREDIT"
                      checked={refundMethod === "CREDIT"}
                      onChange={() => setRefundMethod("CREDIT")}
                      className="hidden"
                    />
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-slate-800" />
                      <span>Store Credit</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Custom Reason input */}
            {reason === "Other" && (
              <div>
                <input
                  type="text"
                  required
                  placeholder="Specify custom reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Financial Summary Card */}
            <div className="bg-[#f8faf8] p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Selected Items Subtotal:</span>
                <span className="font-mono font-medium">
                  {formatCurrency(subtotalRefund, currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Proportional Tax Refund:</span>
                <span className="font-mono font-medium">
                  {formatCurrency(taxRefund, currencySymbol)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total Refund Amount:</span>
                <span className="font-mono text-base font-black text-[#0e6245]">
                  {formatCurrency(totalRefund, currencySymbol)}
                </span>
              </div>

              {pointsToReverse > 0 && (
                <div className="pt-2 border-t border-slate-200/80 flex justify-between text-amber-700 text-[11px] font-semibold">
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" />
                    <span>Loyalty Points Reversal:</span>
                  </span>
                  <span>-{pointsToReverse} points</span>
                </div>
              )}
            </div>

            {/* ============================================================== */}
            {/* MANDATORY MANAGER / PHARMACIST PIN AUTHORIZATION BOX */}
            {/* ============================================================== */}
            <div className="p-4 bg-amber-50/70 border-2 border-amber-300/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Mandatory Manager / Pharmacist PIN Authorization</span>
                </div>
                <span className="text-[10px] font-semibold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  Security Required
                </span>
              </div>

              <p className="text-[11px] text-amber-800 leading-relaxed">
                By pharmacy regulatory policy, all medicine returns and financial refunds require verification by a licensed Pharmacist or Store Manager PIN.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative w-full sm:w-48">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={4}
                    value={managerPin}
                    onChange={(e) => {
                      setManagerPin(e.target.value.replace(/\D/g, ""));
                      setPinError("");
                    }}
                    placeholder="Enter 4-digit PIN"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-mono tracking-widest text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                {verifyingManager ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-[#0e6245] border border-emerald-300 text-xs font-bold animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Verified: {verifyingManager.name} ({verifyingManager.role.toUpperCase()})
                    </span>
                  </div>
                ) : managerPin.length === 4 ? (
                  <div className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Invalid or unauthorized Manager PIN</span>
                  </div>
                ) : (
                  <div className="text-xs text-amber-700">
                    Enter Manager/Pharmacist PIN (e.g. 9901 or 4182)
                  </div>
                )}
              </div>

              {pinError && (
                <div className="text-xs text-rose-600 font-semibold">{pinError}</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={totalReturnUnits === 0 || isSubmitting || !verifyingManager}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#0e6245] hover:bg-[#0b4d37] disabled:opacity-40 disabled:hover:bg-[#0e6245] rounded-xl transition-all shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? "Processing Return..."
                    : `Authorize & Complete Return (${formatCurrency(totalRefund, currencySymbol)})`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
