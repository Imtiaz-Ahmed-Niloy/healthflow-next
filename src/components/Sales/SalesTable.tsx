"use client";

import React, { useState } from "react";
import {
  Eye,
  Printer,
  RotateCcw,
  Receipt,
  Copy,
  Check,
  CreditCard,
  Banknote,
  Smartphone,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingBag,
} from "lucide-react";
import { Sale } from "@/types/pharmacy";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface SalesTableProps {
  sales: Sale[];
  onViewReceipt: (sale: Sale, mode?: "invoice" | "thermal") => void;
  onOpenReturn: (sale: Sale) => void;
  currencySymbol: string;
  onResetFilters?: () => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  onViewReceipt,
  onOpenReturn,
  currencySymbol,
  onResetFilters,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [copiedInvoice, setCopiedInvoice] = useState<string | null>(null);

  const handleCopy = (invoice: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(invoice);
    setCopiedInvoice(invoice);
    setTimeout(() => setCopiedInvoice(null), 2000);
  };

  // Pagination calculation
  const totalItems = sales.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentSales = sales.slice(startIndex, endIndex);

  const renderPaymentBadge = (method: Sale["paymentMethod"]) => {
    switch (method) {
      case "CASH":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Banknote className="w-3 h-3 text-emerald-600" />
            CASH
          </span>
        );
      case "CARD":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
            <CreditCard className="w-3 h-3 text-sky-600" />
            CARD
          </span>
        );
      case "MOBILE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Smartphone className="w-3 h-3 text-purple-600" />
            MOBILE
          </span>
        );
      case "CREDIT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <BookOpen className="w-3 h-3 text-slate-600" />
            CREDIT
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
            {method}
          </span>
        );
    }
  };

  const renderStatusBadge = (status: Sale["status"], refundedAmount: number) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            Completed
          </span>
        );
      case "PARTIAL_RETURN":
        return (
          <div className="flex flex-col items-start gap-0.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
              Partial Return
            </span>
            {refundedAmount > 0 && (
              <span className="text-[10px] text-amber-600 font-mono">
                -{formatCurrency(refundedAmount, currencySymbol)}
              </span>
            )}
          </div>
        );
      case "RETURNED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            Fully Returned
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">No Sales Transactions Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No sale records matched your active filter criteria. Try adjusting your search term, date range, or status filter.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          {onResetFilters && (
            <button
              onClick={onResetFilters}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          )}
          <Link
            href="/pharmacy/pos"
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
          >
            Create New Sale
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Items</th>
              <th className="py-3 px-3">Payment</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-4 text-right">Net Amount</th>
              <th className="py-3 px-4">Cashier</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentSales.map((sale) => {
              const netAmount = Math.max(0, sale.totalAmount - (sale.refundedAmount || 0));
              const canReturn =
                sale.status !== "RETURNED" &&
                sale.items.some((i) => (i.returnedQuantity || 0) < i.quantity);

              const firstItem = sale.items[0];
              const remainingCount = sale.items.length - 1;

              return (
                <tr
                  key={sale.id}
                  onClick={() => onViewReceipt(sale, "invoice")}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                >
                  {/* Invoice # */}
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-700 group-hover:underline">
                        {sale.invoiceNumber}
                      </span>
                      <button
                        onClick={(e) => handleCopy(sale.invoiceNumber, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity p-0.5 rounded"
                        title="Copy invoice #"
                      >
                        {copiedInvoice === sale.invoiceNumber ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Date & Time */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                    <div className="font-medium text-slate-800">
                      {sale.date.split(" ")[0]}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {sale.date.split(" ").slice(1).join(" ")}
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900 truncate max-w-[140px]">
                      {sale.customer.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {sale.customer.phone || sale.customer.type || "Walk-in"}
                    </div>
                  </td>

                  {/* Items preview */}
                  <td className="py-3.5 px-4">
                    {firstItem ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-800 font-medium truncate max-w-[160px]">
                          {firstItem.name} <span className="text-slate-400">×{firstItem.quantity}</span>
                        </span>
                        {remainingCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-semibold">
                            +{remainingCount} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No items</span>
                    )}
                  </td>

                  {/* Payment Method */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {renderPaymentBadge(sale.paymentMethod)}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {renderStatusBadge(sale.status, sale.refundedAmount || 0)}
                  </td>

                  {/* Net Amount */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(netAmount, currencySymbol)}
                    </div>
                    {sale.refundedAmount > 0 && (
                      <div className="text-[10px] text-slate-400 line-through font-mono">
                        {formatCurrency(sale.totalAmount, currencySymbol)}
                      </div>
                    )}
                  </td>

                  {/* Cashier */}
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                    {sale.cashier}
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onViewReceipt(sale, "invoice")}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Print Sales Invoice"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-700" />
                      </button>

                      <button
                        onClick={() => onViewReceipt(sale, "invoice")}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="View Sales Invoice / Receipt"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {canReturn && (
                        <button
                          onClick={() => onOpenReturn(sale)}
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Process Return & Refund"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <span>Showing</span>
          <span className="font-semibold text-slate-800">
            {startIndex + 1}–{endIndex}
          </span>
          <span>of</span>
          <span className="font-semibold text-slate-800">{totalItems}</span>
          <span>records</span>

          <span className="mx-2 text-slate-300">|</span>

          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Page Nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={validCurrentPage <= 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="px-3 py-1 text-slate-700 font-medium">
            Page <span className="font-bold">{validCurrentPage}</span> of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={validCurrentPage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
