"use client";

import React, { useState } from "react";
import { X, CheckCircle2, AlertTriangle, Printer } from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";
import { formatCurrency } from "@/lib/utils";
import { CashDrawerShift } from "@/types/pharmacy";

interface CloseDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowReceipt?: (shift: CashDrawerShift) => void;
}

export function CloseDrawerModal({
  isOpen,
  onClose,
  onShowReceipt,
}: CloseDrawerModalProps) {
  const { openingBalance, currentBalance, currencySymbol, closeDrawer } =
    usePharmacy();
  const [actualClosing, setActualClosing] = useState<string>("");
  const [closingNote, setClosingNote] = useState<string>("");
  const [autoPrint, setAutoPrint] = useState<boolean>(true);

  if (!isOpen) return null;

  const numericActual = parseFloat(actualClosing);
  const isValidNumber = !isNaN(numericActual) && actualClosing.trim() !== "";
  const discrepancy = isValidNumber ? numericActual - currentBalance : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidNumber) return;

    const closedShift = closeDrawer(numericActual, closingNote);
    onClose();
    if (autoPrint && onShowReceipt) {
      onShowReceipt(closedShift);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Close Cash Drawer
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Summary Box */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Opening Balance</span>
              <span className="text-slate-900 font-bold">
                {formatCurrency(openingBalance, currencySymbol)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Expected Balance</span>
              <span className="text-blue-600 font-bold">
                {formatCurrency(currentBalance, currencySymbol)}
              </span>
            </div>
          </div>

          {/* Actual Closing Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Actual Closing Balance
              </label>
              <button
                type="button"
                onClick={() => setActualClosing(currentBalance.toFixed(2))}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                Match Expected
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={actualClosing}
                onChange={(e) => setActualClosing(e.target.value)}
                placeholder="Count the cash and enter total"
                autoFocus
                className="w-full pl-8 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>

            {/* Real-time Discrepancy indicator */}
            {isValidNumber && (
              <div className="mt-2.5 p-2.5 rounded-lg text-xs font-medium transition-all duration-200">
                {discrepancy === 0 ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Discrepancy: $0.00 (Perfect match!)</span>
                  </div>
                ) : discrepancy > 0 ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Over by +{formatCurrency(discrepancy, currencySymbol)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-red-700 bg-red-50 border border-red-200 p-2 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>
                      Short by {formatCurrency(discrepancy, currencySymbol)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Handover Note (optional)
            </label>
            <textarea
              rows={2}
              value={closingNote}
              onChange={(e) => setClosingNote(e.target.value)}
              placeholder="Shift summary or discrepancy explanation..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* Auto Print Receipt Toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Printer className="w-3 h-3 text-slate-400" />
                Generate printable shift summary
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValidNumber}
              className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-all ${
                isValidNumber
                  ? "bg-[#64748b] hover:bg-[#475569] text-white active:scale-[0.98]"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
            >
              Close Drawer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
