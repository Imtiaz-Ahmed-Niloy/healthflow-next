"use client";

import React from "react";
import { X, Printer, Check } from "lucide-react";
import { CashDrawerShift } from "@/types/pharmacy";
import { formatCurrency } from "@/lib/utils";
import { usePharmacy } from "@/context/PharmacyContext";

interface ReceiptModalProps {
  shift: CashDrawerShift | null;
  onClose: () => void;
}

export function ReceiptModal({ shift, onClose }: ReceiptModalProps) {
  const { currencySymbol, user } = usePharmacy();

  if (!shift) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalCashIn = shift.transactions
    .filter((t) => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);

  const totalCashOut = shift.transactions
    .filter((t) => t.type === "cash_out")
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const totalExpenses = shift.transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const discrepancy = shift.discrepancy ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Actions */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Shift Summary Slip
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div
          id="printable-slip"
          className="my-3 p-5 bg-slate-50 border border-dashed border-slate-300 rounded-xl font-mono text-xs text-slate-800 space-y-3 overflow-y-auto print:bg-white print:border-none print:p-0 print:m-0"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <h3 className="font-bold text-sm tracking-widest text-slate-900 uppercase">
              {user?.storeName || "DEMO PHARMACY"}
            </h3>
            <p className="text-[10px] text-slate-500">CASH DRAWER SHIFT REPORT</p>
            <p className="text-[10px] text-slate-400 mt-1">
              REF: {shift.id.toUpperCase()}
            </p>
          </div>

          {/* Time & Cashier */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between">
              <span className="text-slate-500">OPENED:</span>
              <span>{shift.openedAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CLOSED:</span>
              <span>{shift.closedAt || "IN PROGRESS"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CASHIER:</span>
              <span>{shift.cashier}</span>
            </div>
          </div>

          {/* Balance breakdown */}
          <div className="space-y-1.5 text-[11px] border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between">
              <span>OPENING FLOAT:</span>
              <span className="font-bold">
                {formatCurrency(shift.openingBalance, currencySymbol)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>(+) CASH IN:</span>
              <span>+{formatCurrency(totalCashIn, currencySymbol)}</span>
            </div>
            <div className="flex justify-between text-orange-700">
              <span>(-) CASH OUT:</span>
              <span>-{formatCurrency(totalCashOut, currencySymbol)}</span>
            </div>
            <div className="flex justify-between text-red-700">
              <span>(-) EXPENSES:</span>
              <span>-{formatCurrency(totalExpenses, currencySymbol)}</span>
            </div>
          </div>

          {/* Reconciliation totals */}
          <div className="space-y-1.5 text-xs border-b border-dashed border-slate-300 pb-3 pt-1">
            <div className="flex justify-between">
              <span className="font-bold">EXPECTED CASH:</span>
              <span className="font-bold text-blue-600">
                {formatCurrency(shift.expectedBalance, currencySymbol)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">ACTUAL CASH:</span>
              <span className="font-bold">
                {shift.closingBalance !== undefined
                  ? formatCurrency(shift.closingBalance, currencySymbol)
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="font-bold">DISCREPANCY:</span>
              <span
                className={`font-bold ${
                  discrepancy === 0
                    ? "text-emerald-600"
                    : discrepancy > 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {discrepancy >= 0 ? "+" : ""}
                {formatCurrency(discrepancy, currencySymbol)}
              </span>
            </div>
          </div>

          {shift.closingNote && (
            <div className="text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200">
              <span className="font-bold block text-slate-400">NOTE:</span>
              {shift.closingNote}
            </div>
          )}

          {/* Signature Line */}
          <div className="pt-4 text-center text-[10px] text-slate-400 space-y-6">
            <div className="border-b border-slate-300 w-3/4 mx-auto" />
            <p>MANAGER / CASHIER SIGNATURE</p>
            <p className="text-[9px] tracking-wider text-slate-400">
              *** END OF SHIFT REPORT ***
            </p>
          </div>
        </div>

        {/* Print Buttons */}
        <div className="flex items-center gap-2 pt-2 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
