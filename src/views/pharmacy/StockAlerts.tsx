"use client";

import React, { useState, useMemo } from "react";
import { usePharmacy } from "@/context/PharmacyContext";
import { StockAlertsSummaryCards } from "@/components/StockAlerts/StockAlertsSummaryCards";
import {
  Search,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
} from "lucide-react";

export type AlertSortOption =
  | "alertType"
  | "productName"
  | "sku"
  | "quantity"
  | "expiryDate";

export default function StockAlertsPage() {
  const { inventory: rawInventory } = usePharmacy();
  const inventory = rawInventory || [];

  const [activeTab, setActiveTab] = useState<"low-stock" | "expiring" | "out-of-stock">("out-of-stock");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<AlertSortOption>("productName");
  const [sortAscending, setSortAscending] = useState<boolean>(true);
  const [filterDropdown, setFilterDropdown] = useState<string>("ALL");
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reference date: October 7, 2026
  const now = 1791350400000; // 07/10/2026
  const ninetyDaysFromNow = now + 90 * 24 * 60 * 60 * 1000;

  // Counts
  const outOfStockItems = useMemo(() => {
    return (inventory || []).filter((i) => i.quantity === 0);
  }, [inventory]);

  const lowStockItems = useMemo(() => {
    return (inventory || []).filter((i) => i.quantity > 0 && i.quantity <= i.reorderLevel);
  }, [inventory]);

  const expiringSoonItems = useMemo(() => {
    return (inventory || []).filter(
      (i) =>
        i.quantity > 0 &&
        (i.status === "EXPIRING_SOON" ||
          i.status === "EXPIRED" ||
          (i.expiryTimestamp && i.expiryTimestamp <= ninetyDaysFromNow))
    );
  }, [inventory, ninetyDaysFromNow]);

  // Active items based on Tab or Filter dropdown
  const baseItems = useMemo(() => {
    if (filterDropdown === "LOW_STOCK") return lowStockItems;
    if (filterDropdown === "EXPIRING") return expiringSoonItems;
    if (filterDropdown === "OUT_OF_STOCK") return outOfStockItems;

    // By tab:
    if (activeTab === "low-stock") return lowStockItems;
    if (activeTab === "expiring") return expiringSoonItems;
    return outOfStockItems;
  }, [activeTab, filterDropdown, lowStockItems, expiringSoonItems, outOfStockItems]);

  // Filter by search & sort
  const filteredAndSorted = useMemo(() => {
    return baseItems
      .filter((item) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase().trim();
        return (
          item.productName.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.batchNumber.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let aVal: string | number | undefined = a[sortField as keyof typeof a];
        let bVal: string | number | undefined = b[sortField as keyof typeof b];

        if (sortField === "expiryDate") {
          aVal = a.expiryTimestamp || 0;
          bVal = b.expiryTimestamp || 0;
        }

        if (typeof aVal === "string") {
          return sortAscending
            ? (aVal as string).localeCompare((bVal as string) || "")
            : ((bVal as string) || "").localeCompare(aVal as string);
        }

        if (typeof aVal === "number") {
          return sortAscending
            ? (aVal as number) - ((bVal as number) || 0)
            : ((bVal as number) || 0) - (aVal as number);
        }

        return 0;
      });
  }, [baseItems, searchTerm, sortField, sortAscending]);

  // Pagination
  const totalItems = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentItems = filteredAndSorted.slice(startIndex, endIndex);

  const renderStatus = (item: typeof inventory[0]) => {
    if (item.quantity === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
          Out of Stock
        </span>
      );
    }
    if (item.status === "EXPIRED" || item.expiryTimestamp <= now) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
          Expired
        </span>
      );
    }
    if (item.status === "EXPIRING_SOON" || item.expiryTimestamp <= ninetyDaysFromNow) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
          Expiring Soon
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
        Low Stock
      </span>
    );
  };

  return (
    <div className="w-full space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>Dashboard</span>
          <span>/</span>
          <span>Inventory</span>
          <span>/</span>
          <span className="text-blue-600 font-semibold">Stock Alerts</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Stock Alerts
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitor inventory status and take action
        </p>
      </div>

      {/* 3 Summary Cards */}
      <StockAlertsSummaryCards
        lowStockCount={lowStockItems.length}
        expiringSoonCount={expiringSoonItems.length}
        outOfStockCount={outOfStockItems.length}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setFilterDropdown("ALL");
          setCurrentPage(1);
        }}
      />

      {/* Control & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search alerts..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 placeholder-slate-400 transition-all"
          />
        </div>

        {/* Sub-controls: Sort by, sort toggle, filter dropdown, per page, summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as AlertSortOption)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="productName">Product Name</option>
              <option value="sku">SKU</option>
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

            <span className="text-slate-400 ml-1">|</span>

            <span className="text-slate-500 font-medium">Filter:</span>
            <select
              value={filterDropdown}
              onChange={(e) => {
                setFilterDropdown(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Alerts</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="EXPIRING">Expiring Soon</option>
            </select>
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
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
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
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab("low-stock");
            setFilterDropdown("ALL");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "low-stock" && filterDropdown === "ALL"
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Low Stock</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-100 text-amber-800">
            {lowStockItems.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("expiring");
            setFilterDropdown("ALL");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "expiring" && filterDropdown === "ALL"
              ? "border-orange-600 text-orange-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Expiring Soon</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-orange-100 text-orange-800">
            {expiringSoonItems.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("out-of-stock");
            setFilterDropdown("ALL");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "out-of-stock" && filterDropdown === "ALL"
              ? "border-rose-600 text-rose-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Out of Stock</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-100 text-rose-800">
            {outOfStockItems.length}
          </span>
        </button>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        {currentItems.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800">No alerts found</h3>
            <p className="text-xs text-slate-500">Everything looks good!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4 text-center">Reorder Level</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-600 text-[11px] whitespace-nowrap">
                      {item.sku}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Batch: {item.batchNumber}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      {item.reorderLevel}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {item.expiryDate}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {item.location}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderStatus(item)}
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
    </div>
  );
}

