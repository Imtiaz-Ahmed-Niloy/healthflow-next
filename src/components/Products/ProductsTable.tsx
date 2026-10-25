"use client";

import React, { useState } from "react";
import { Product } from "@/types/pharmacy";
import { formatCurrency } from "@/lib/utils";
import {
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";

export type ProductSortField =
  | "name"
  | "genericName"
  | "sku"
  | "sellingPrice"
  | "category"
  | "manufacturer";

interface ProductsTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  currencySymbol: string;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  onEdit,
  onDelete,
  currencySymbol,
}) => {
  const [sortField, setSortField] = useState<ProductSortField>("name");
  const [sortAscending, setSortAscending] = useState<boolean>(true);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sorting
  const sortedProducts = [...products].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

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
  const totalItems = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentProducts = sortedProducts.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
      {/* Sub-control bar: Sort by, toggle, per page, summary */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 font-medium">Sort by:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as ProductSortField)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="name">Name</option>
            <option value="genericName">Generic Name</option>
            <option value="sku">SKU</option>
            <option value="sellingPrice">Price</option>
            <option value="category">Category</option>
            <option value="manufacturer">Manufacturer</option>
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
      {currentProducts.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <Package className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-xs">No products match your search or filter criteria</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Requires RX</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Name + Generic + Mfr */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                    {p.genericName && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Generic: <span className="text-slate-700 font-medium">{p.genericName}</span>
                      </div>
                    )}
                    {p.manufacturer && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Mfr: {p.manufacturer}
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {p.category}
                    </span>
                  </td>

                  {/* SKU */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                    {p.sku}
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                    {formatCurrency(p.sellingPrice, currencySymbol)}
                  </td>

                  {/* Requires RX */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                    {p.requiresPrescription ? (
                      <span className="font-semibold text-slate-800">Yes</span>
                    ) : (
                      <span>No</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEdit(p)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit product"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete ${p.name}?`)) {
                            onDelete(p.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
