"use client";

import React from "react";
import Link from "next/link";
import {
  Search,
  X,
  Filter,
  Download,
  Printer,
  Plus,
  Calendar,
  RotateCcw,
  ArrowUpDown,
} from "lucide-react";
import { Sale } from "@/types/pharmacy";

export type DateRangePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last7days"
  | "thisMonth"
  | "custom";

export type StatusFilter = "ALL" | "COMPLETED" | "PARTIAL_RETURN" | "RETURNED";
export type PaymentMethodFilter = "ALL" | "CASH" | "CARD" | "MOBILE" | "CREDIT";
export type SortOption = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

interface SalesFilterBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (status: StatusFilter) => void;
  datePreset: DateRangePreset;
  setDatePreset: (preset: DateRangePreset) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
  paymentMethodFilter: PaymentMethodFilter;
  setPaymentMethodFilter: (method: PaymentMethodFilter) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  counts: {
    all: number;
    completed: number;
    partial: number;
    returned: number;
  };
  onExportCsv: () => void;
  onPrint: () => void;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export const SalesFilterBar: React.FC<SalesFilterBarProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  datePreset,
  setDatePreset,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  paymentMethodFilter,
  setPaymentMethodFilter,
  sortBy,
  setSortBy,
  counts,
  onExportCsv,
  onPrint,
  onResetFilters,
  isFiltered,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 space-y-4">
      {/* Top Action Row: Title / Search / Quick Actions */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search invoice #, customer, medicine or cashier..."
            className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800 placeholder-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Buttons: New Sale, Export, Print */}
        <div className="flex items-center gap-2 flex-wrap">
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            title="Print sales table report"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Report</span>
          </button>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <Link
            href="/pharmacy/pos"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Sale (POS)</span>
          </Link>
        </div>
      </div>

      {/* Middle Row: Status Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
            statusFilter === "ALL"
              ? "bg-slate-900 text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>All Orders</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              statusFilter === "ALL"
                ? "bg-slate-700 text-slate-200"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("COMPLETED")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
            statusFilter === "COMPLETED"
              ? "bg-emerald-700 text-white shadow-2xs"
              : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          <span>Completed</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              statusFilter === "COMPLETED"
                ? "bg-emerald-800 text-emerald-100"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {counts.completed}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("PARTIAL_RETURN")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
            statusFilter === "PARTIAL_RETURN"
              ? "bg-amber-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-amber-700 hover:bg-amber-50"
          }`}
        >
          <span>Partial Returns</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              statusFilter === "PARTIAL_RETURN"
                ? "bg-amber-700 text-amber-100"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {counts.partial}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("RETURNED")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
            statusFilter === "RETURNED"
              ? "bg-rose-600 text-white shadow-2xs"
              : "text-slate-600 hover:text-rose-700 hover:bg-rose-50"
          }`}
        >
          <span>Fully Returned</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              statusFilter === "RETURNED"
                ? "bg-rose-700 text-rose-100"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {counts.returned}
          </span>
        </button>
      </div>

      {/* Bottom Filter Controls: Date Range Presets, Payment Method, Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        {/* Date presets */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Period:
          </span>
          {(
            [
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last7days", label: "Last 7 Days" },
              { id: "thisMonth", label: "This Month" },
              { id: "custom", label: "Custom" },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDatePreset(preset.id)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                datePreset === preset.id
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold"
                  : "text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Dropdowns: Payment Method & Sort */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Payment Method filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Payment:</span>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value as PaymentMethodFilter)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="MOBILE">Mobile Money</option>
              <option value="CREDIT">Store Credit</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Custom Date Range Pickers (only shown if datePreset === 'custom') */}
      {datePreset === "custom" && (
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 flex-wrap text-xs">
          <span className="text-slate-600 font-medium">Custom Range:</span>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
