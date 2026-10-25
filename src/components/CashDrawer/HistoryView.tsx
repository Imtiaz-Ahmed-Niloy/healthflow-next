"use client";

import React, { useState } from "react";
import { usePharmacy } from "@/context/PharmacyContext";
import { formatCurrency } from "@/lib/utils";
import { CashDrawerShift } from "@/types/pharmacy";
import {
  Search,
  Eye,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  X,
} from "lucide-react";

interface HistoryViewProps {
  onShowReceipt: (shift: CashDrawerShift) => void;
}

export function HistoryView({ onShowReceipt }: HistoryViewProps) {
  const { shiftsHistory, currencySymbol } = usePharmacy();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedShift, setSelectedShift] = useState<CashDrawerShift | null>(null);

  const pageSize = 10;

  const filtered = shiftsHistory.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.openedAt.toLowerCase().includes(term) ||
      (s.closedAt?.toLowerCase().includes(term) ?? false) ||
      s.cashier.toLowerCase().includes(term) ||
      (s.closingNote?.toLowerCase().includes(term) ?? false)
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedShifts = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportCsv = () => {
    const headers = [
      "Shift ID",
      "Opened At",
      "Closed At",
      "Cashier",
      "Opening Balance",
      "Closing Balance",
      "Expected Balance",
      "Discrepancy",
      "Transactions Count",
      "Closing Note",
    ];

    const rows = shiftsHistory.map((s) => [
      s.id,
      s.openedAt,
      s.closedAt || "N/A",
      s.cashier,
      s.openingBalance,
      s.closingBalance ?? "N/A",
      s.expectedBalance,
      s.discrepancy ?? 0,
      s.transactions.length,
      `"${(s.closingNote || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `cash_drawer_history_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 gap-3">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Shift History
        </h2>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search history..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
            />
          </div>

          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            title="Export shift history to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-5">Opened</th>
              <th className="py-3 px-5">Closed</th>
              <th className="py-3 px-5">Opening</th>
              <th className="py-3 px-5">Closing</th>
              <th className="py-3 px-5">Expected</th>
              <th className="py-3 px-5">Discrepancy</th>
              <th className="py-3 px-5">Cashier</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedShifts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  No shifts found matching your search.
                </td>
              </tr>
            ) : (
              paginatedShifts.map((shift) => {
                const disc = shift.discrepancy ?? 0;
                const isExact = Math.abs(disc) < 0.001;
                const isOver = disc > 0;
                return (
                  <tr
                    key={shift.id}
                    className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                    onClick={() => setSelectedShift(shift)}
                  >
                    <td className="py-3 px-5 font-mono text-slate-600 whitespace-nowrap">
                      {shift.openedAt}
                    </td>
                    <td className="py-3 px-5 font-mono text-slate-600 whitespace-nowrap">
                      {shift.closedAt || (
                        <span className="text-emerald-600 font-semibold">Active</span>
                      )}
                    </td>
                    <td className="py-3 px-5 font-medium font-mono text-slate-800">
                      {formatCurrency(shift.openingBalance, currencySymbol)}
                    </td>
                    <td className="py-3 px-5 font-medium font-mono text-slate-800">
                      {shift.closingBalance !== undefined
                        ? formatCurrency(shift.closingBalance, currencySymbol)
                        : "—"}
                    </td>
                    <td className="py-3 px-5 font-medium font-mono text-slate-800">
                      {formatCurrency(shift.expectedBalance, currencySymbol)}
                    </td>
                    <td className="py-3 px-5 font-semibold font-mono whitespace-nowrap">
                      {isExact ? (
                        <span className="text-emerald-600 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          $0.00
                        </span>
                      ) : isOver ? (
                        <span className="text-emerald-600 inline-flex items-center gap-1">
                          +{formatCurrency(disc, currencySymbol)}
                        </span>
                      ) : (
                        <span className="text-red-600 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          {formatCurrency(disc, currencySymbol)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-slate-600 whitespace-nowrap">
                      {shift.cashier}
                    </td>
                    <td
                      className="py-3 px-5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedShift(shift)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View shift details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onShowReceipt(shift)}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Print shift summary"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar (Matching screenshot) */}
      <div className="flex items-center justify-center sm:justify-end px-6 py-3 bg-slate-50/50 border-t border-slate-100">
        <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-xs shadow-xs">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-600 transition-colors"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`min-w-7 py-1.5 px-2 text-center font-semibold rounded ${
                currentPage === page
                  ? "bg-blue-50 text-blue-600 border border-blue-200 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-600 transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Shift Details Modal */}
      {selectedShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Shift Details Breakdown
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {selectedShift.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedShift(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 flex-1">
              {/* Summary 4-grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block mb-0.5">Opened At</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {selectedShift.openedAt}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Closed At</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {selectedShift.closedAt || "Still Open"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Opening Balance</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatCurrency(selectedShift.openingBalance, currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Closing Balance</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {selectedShift.closingBalance !== undefined
                      ? formatCurrency(selectedShift.closingBalance, currencySymbol)
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Expected Balance</span>
                  <span className="font-bold text-blue-600 font-mono">
                    {formatCurrency(selectedShift.expectedBalance, currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Discrepancy</span>
                  <span
                    className={`font-bold font-mono ${
                      (selectedShift.discrepancy ?? 0) === 0
                        ? "text-emerald-600"
                        : (selectedShift.discrepancy ?? 0) > 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(selectedShift.discrepancy ?? 0, currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Cashier & Notes */}
              <div className="text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Cashier:</span>
                  <span className="font-medium text-slate-800">
                    {selectedShift.cashier}
                  </span>
                </div>
                {selectedShift.closingNote && (
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-amber-900">
                    <span className="font-semibold block mb-0.5">Closing Note:</span>
                    {selectedShift.closingNote}
                  </div>
                )}
              </div>

              {/* Transactions in this shift */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
                  Transactions ({selectedShift.transactions.length})
                </h4>
                {selectedShift.transactions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No individual cash movements recorded in this shift.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedShift.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg text-xs"
                      >
                        <div>
                          <span className="font-mono text-slate-500 block text-[11px]">
                            {tx.time}
                          </span>
                          <span className="text-slate-700 font-medium">
                            {tx.note || tx.type}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-bold ${
                            tx.amount > 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {tx.amount > 0 ? "+" : ""}
                          {formatCurrency(tx.amount, currencySymbol)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  onShowReceipt(selectedShift);
                  setSelectedShift(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Shift Slip</span>
              </button>

              <button
                onClick={() => setSelectedShift(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
