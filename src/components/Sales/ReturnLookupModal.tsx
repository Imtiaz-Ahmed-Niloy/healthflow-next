"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Scan,
  Phone,
  FileText,
  RotateCcw,
  X,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";
import { Sale } from "@/types/pharmacy";
import { formatCurrency } from "@/lib/utils";

interface ReturnLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSaleForReturn: (sale: Sale) => void;
  currencySymbol?: string;
}

export const ReturnLookupModal: React.FC<ReturnLookupModalProps> = ({
  isOpen,
  onClose,
  onSelectSaleForReturn,
  currencySymbol = "$",
}) => {
  const { sales } = usePharmacy();
  const [searchInput, setSearchInput] = useState("");

  // Filter matching sales (Hooks must always run in the same order)
  const matchedSales = useMemo(() => {
    if (!isOpen) return [];
    const q = searchInput.trim().toLowerCase();
    if (!q) return sales.slice(0, 8); // show latest 8 if empty

    const cleanDigits = q.replace(/\D/g, "");

    return sales.filter((s) => {
      const matchInvoice = s.invoiceNumber.toLowerCase().includes(q);
      const matchCustomer = s.customer?.name.toLowerCase().includes(q);
      const matchPhone =
        cleanDigits.length >= 3 &&
        s.customer?.phone &&
        s.customer.phone.replace(/\D/g, "").includes(cleanDigits);

      const matchItem = s.items.some((it) => it.name.toLowerCase().includes(q));

      return matchInvoice || matchCustomer || matchPhone || matchItem;
    });
  }, [sales, searchInput, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#f7faf8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#0e6245] flex items-center justify-center font-bold">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Fast Return Invoice Lookup
              </h2>
              <p className="text-xs text-slate-500">
                Scan receipt barcode, type invoice #, or search by customer phone number
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

        {/* Search Bar */}
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Scan receipt barcode, enter INV-2026-XXXX, or customer phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
            />
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <Lightbulb className="w-3.5 h-3.5 text-slate-700 shrink-0" />
            <span className="font-semibold text-slate-700">Tip:</span>
            <span>You can directly scan barcodes from the printed invoice slip.</span>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#fbfdfb]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Matching Transactions ({matchedSales.length})
          </div>

          {matchedSales.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No matching purchase records found</p>
              <p className="text-xs text-slate-400 mt-1">Check the phone number or invoice barcode.</p>
            </div>
          ) : (
            matchedSales.map((sale) => {
              const alreadyReturned = sale.status === "RETURNED";
              const isPartial = sale.status === "PARTIAL_RETURN";
              const returnableItemsCount = sale.items.filter(
                (i) => i.quantity - (i.returnedQuantity || 0) > 0
              ).length;

              return (
                <div
                  key={sale.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {sale.invoiceNumber}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          alreadyReturned
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : isPartial
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {sale.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {sale.customer?.name || "Walk-in Customer"}
                      </span>
                      {sale.customer?.phone && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {sale.customer.phone}
                          </span>
                        </>
                      )}
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400 text-[11px]">{sale.date}</span>
                    </div>

                    {/* Items preview */}
                    <div className="text-[11px] text-slate-500 mt-1.5 flex flex-wrap gap-1">
                      {sale.items.slice(0, 3).map((it, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 text-[10px]"
                        >
                          {it.quantity}x {it.name}
                        </span>
                      ))}
                      {sale.items.length > 3 && (
                        <span className="text-[10px] text-slate-400">
                          +{sale.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:self-center self-end">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Total Bill</div>
                      <div className="font-mono text-sm font-bold text-slate-900">
                        {formatCurrency(sale.totalAmount, currencySymbol)}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={alreadyReturned || returnableItemsCount === 0}
                      onClick={() => {
                        onSelectSaleForReturn(sale);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0e6245] hover:bg-[#0b4d37] disabled:opacity-40 disabled:hover:bg-[#0e6245] text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{alreadyReturned ? "Fully Returned" : "Select for Return"}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-[#f7faf8] flex items-center justify-between text-xs text-slate-500">
          <span>Total Recorded Invoices: {sales.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
