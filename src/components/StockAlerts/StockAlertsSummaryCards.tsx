"use client";

import React from "react";
import { Package, Clock, XCircle, AlertTriangle } from "lucide-react";

interface StockAlertsSummaryCardsProps {
  lowStockCount: number;
  expiringSoonCount: number;
  outOfStockCount: number;
  activeTab: "low-stock" | "expiring" | "out-of-stock";
  onSelectTab: (tab: "low-stock" | "expiring" | "out-of-stock") => void;
}

export const StockAlertsSummaryCards: React.FC<StockAlertsSummaryCardsProps> = ({
  lowStockCount,
  expiringSoonCount,
  outOfStockCount,
  activeTab,
  onSelectTab,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Low Stock Items */}
      <div
        onClick={() => onSelectTab("low-stock")}
        className={`rounded-lg relative overflow-hidden p-5 text-white border-0 cursor-pointer transition-all duration-200 ${
          activeTab === "low-stock"
            ? "bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-lg shadow-emerald-900/30 ring-2 ring-white/80 scale-[1.02]"
            : "bg-gradient-to-br from-emerald-600/90 to-emerald-700/90 shadow-md hover:shadow-lg hover:scale-[1.01] opacity-90 hover:opacity-100"
        }`}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              Low Stock Items
            </span>
            <Package className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white">
            {lowStockCount}
          </div>
          <p className="text-xs text-emerald-200 mt-2">
            Items below reorder level
          </p>
        </div>
      </div>

      {/* 2. Expiring Soon */}
      <div
        onClick={() => onSelectTab("expiring")}
        className={`rounded-lg relative overflow-hidden p-5 text-white border-0 cursor-pointer transition-all duration-200 ${
          activeTab === "expiring"
            ? "bg-gradient-to-br from-green-600 to-emerald-700 shadow-lg shadow-emerald-900/30 ring-2 ring-white/80 scale-[1.02]"
            : "bg-gradient-to-br from-green-600/90 to-emerald-700/90 shadow-md hover:shadow-lg hover:scale-[1.01] opacity-90 hover:opacity-100"
        }`}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              Expiring Soon
            </span>
            <Clock className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white">
            {expiringSoonCount}
          </div>
          <p className="text-xs text-emerald-200 mt-2">
            Items expiring within 90 days
          </p>
        </div>
      </div>

      {/* 3. Out of Stock */}
      <div
        onClick={() => onSelectTab("out-of-stock")}
        className={`rounded-lg relative overflow-hidden p-5 text-white border-0 cursor-pointer transition-all duration-200 ${
          activeTab === "out-of-stock"
            ? "bg-gradient-to-br from-teal-600 to-emerald-700 shadow-lg shadow-emerald-900/30 ring-2 ring-white/80 scale-[1.02]"
            : "bg-gradient-to-br from-teal-600/90 to-emerald-700/90 shadow-md hover:shadow-lg hover:scale-[1.01] opacity-90 hover:opacity-100"
        }`}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              Out of Stock
            </span>
            <XCircle className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white">
            {outOfStockCount}
          </div>
          <p className="text-xs text-emerald-200 mt-2">
            Items with zero quantity
          </p>
        </div>
      </div>
    </div>
  );
};
