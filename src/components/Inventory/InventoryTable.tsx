"use client";

import React, { useState } from "react";
import { InventoryItem } from "@/types/pharmacy";
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Boxes,
  AlertTriangle,
  Calendar,
} from "lucide-react";

export type InventorySortField =
  | "productName"
  | "batchNumber"
  | "quantity"
  | "expiryDate"
  | "location";

interface InventoryTableProps {
  inventory: InventoryItem[];
  onDelete: (id: string) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  inventory,
  onDelete,
}) => {
  const [sortField, setSortField] = useState<InventorySortField>("productName");
  const [sortAscending, setSortAscending] = useState<boolean>(true);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sorting
  const sortedItems = [...inventory].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === "expiryDate") {
      aVal = a.expiryTimestamp || 0;
      bVal = b.expiryTimestamp || 0;
      return sortAscending ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    }

    if (typeof aVal === "string") {
      aVal = (aVal || "").toLowerCase();
      bVal = ((bVal as string) || "").toLowerCase();
      return sortAscending
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    }

    if (typeof aVal === "number") {
      return sortAscending
        ? (aVal as number) - ((bVal as number) || 0)
        : ((bVal as number) || 0) - (aVal as number);
    }

    return 0;
  });

  // Pagination
  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentItems = sortedItems.slice(startIndex, endIndex);

  const renderStatusBadge = (item: InventoryItem) => {
    if (item.status === "EXPIRED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
          Expired
        </span>
      );
    }
    if (item.quantity === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
          Out of Stock
        </span>
      );
    }
    if (item.status === "LOW_STOCK" || item.quantity <= item.reorderLevel) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
          Low Stock
        </span>
      );
    }
    if (item.status === "EXPIRING_SOON") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          Expiring Soon
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
        In Stock
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
      {/* Sub-control bar: Sort by, toggle, per page, summary */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 font-medium">Sort by:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as InventorySortField)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="productName">Product Name</option>
            <option value="batchNumber">Batch Number</option>
            <option value="quantity">Quantity</option>
            <option value="expiryDate">Expiry Date</option>
            <option value="location">Location</option>
          </select>

          <button
            onClick={() => setSortAscending(!sortAscending)}
            className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            title={sortAscending ? "Sort Ascending" : "Sort Descending"}
          >
            {sortAscending ? (
              <ArrowUp className="w-3.5 h-3.5" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-3 ml-auto text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <span className="text-slate-400">|</span>

          <span>
            Showing <strong className="text-slate-700">{totalItems > 0 ? startIndex + 1 : 0}</strong> to{" "}
            <strong className="text-slate-700">{endIndex}</strong> of{" "}
            <strong className="text-slate-700">{totalItems}</strong> results
          </span>
        </div>
      </div>

      {/* Table */}
      {currentItems.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <Boxes className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-xs">No inventory items match your search or filter</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.map((item) => {
                const isOutOfStock = item.quantity === 0;
                const isLow = item.quantity <= item.reorderLevel;
                const isExpiring = item.status === "EXPIRING_SOON" || item.status === "EXPIRED";

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Product Name + SKU */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs">
                        {item.productName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        SKU: {item.sku}
                      </div>
                    </td>

                    {/* Batch */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                      {item.batchNumber}
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isOutOfStock
                              ? "text-rose-600"
                              : isLow
                              ? "text-red-500"
                              : "text-slate-800"
                          }`}
                        >
                          {item.quantity}
                        </span>
                        {(isOutOfStock || isLow) && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Reorder at: {item.reorderLevel}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {item.location}
                    </td>

                    {/* Expiry Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className={isExpiring ? "text-amber-700 font-semibold" : ""}>
                          {item.expiryDate}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderStatusBadge(item)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (confirm(`Delete batch ${item.batchNumber} of ${item.productName}?`)) {
                            onDelete(item.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete inventory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs">
        <span className="text-slate-500">
          Page <strong className="text-slate-800">{validPage}</strong> of{" "}
          <strong className="text-slate-800">{totalPages}</strong>
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={validPage <= 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={validPage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
