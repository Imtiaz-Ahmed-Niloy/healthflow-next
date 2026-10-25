"use client";

import React from "react";
import { Sale } from "@/types/pharmacy";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  ShoppingBag,
  RotateCcw,
  CreditCard,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

interface SalesStatCardsProps {
  sales: Sale[];
  filteredSales: Sale[];
  currencySymbol: string;
}

export const SalesStatCards: React.FC<SalesStatCardsProps> = ({
  sales,
  filteredSales,
  currencySymbol,
}) => {
  // Use filtered sales to dynamically reflect active filters, or fallback to all sales
  const currentSet = filteredSales.length > 0 ? filteredSales : sales;

  // 1. Total Gross, Total Refunded, and Net Sales
  const grossSales = currentSet.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalRefunded = currentSet.reduce((sum, s) => sum + (s.refundedAmount || 0), 0);
  const netSales = Math.max(0, grossSales - totalRefunded);

  // 2. Orders & AOV
  const totalOrders = currentSet.length;
  const completedOrders = currentSet.filter(
    (s) => s.status === "COMPLETED" || s.status === "PARTIAL_RETURN"
  ).length;
  const aov = completedOrders > 0 ? netSales / completedOrders : 0;

  // 3. Returns & Return Rate
  const returnedSalesCount = currentSet.filter(
    (s) => s.status === "RETURNED" || s.status === "PARTIAL_RETURN"
  ).length;
  const returnRate = grossSales > 0 ? ((totalRefunded / grossSales) * 100).toFixed(1) : "0.0";

  // 4. Payment Method breakdown
  const paymentBreakdown = currentSet.reduce(
    (acc, s) => {
      const method = s.paymentMethod || "CASH";
      acc[method] = (acc[method] || 0) + (s.totalAmount - (s.refundedAmount || 0));
      return acc;
    },
    {} as Record<string, number>
  );

  const cashShare = paymentBreakdown["CASH"] || 0;
  const cardShare = paymentBreakdown["CARD"] || 0;
  const mobileShare = paymentBreakdown["MOBILE"] || 0;
  const creditShare = paymentBreakdown["CREDIT"] || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Net Revenue / Total Sales */}
      <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/25">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-200" />
            <p className="text-sm font-medium text-emerald-100">Net Sales Revenue</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-white">
            {formatCurrency(netSales, currencySymbol)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-200">
            <span className="inline-flex items-center font-semibold text-white">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-300" />
              {currentSet.length} orders
            </span>
            <span>• Gross: {formatCurrency(grossSales, currencySymbol)}</span>
          </div>
        </div>
      </div>

      {/* 2. Completed Orders & AOV */}
      <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-green-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/25">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-emerald-200" />
            <p className="text-sm font-medium text-emerald-100">Completed Orders</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-white">
            {completedOrders}{" "}
            <span className="text-sm font-normal text-emerald-200">/ {totalOrders}</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-200">
            <span>Avg Order Value (AOV):</span>
            <span className="font-semibold text-white">
              {formatCurrency(aov, currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Returns & Refunds */}
      <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-teal-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/25">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <RotateCcw className="w-4 h-4 text-teal-200" />
            <p className="text-sm font-medium text-emerald-100">Returns & Refunds</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-white">
            {formatCurrency(totalRefunded, currencySymbol)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-200">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/20 text-white border border-white/20">
              {returnRate}% rate
            </span>
            <span>• {returnedSalesCount} returned invoices</span>
          </div>
        </div>
      </div>

      {/* 4. Payment Mix Distribution */}
      <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white border-0 shadow-lg shadow-emerald-950/30">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-emerald-300" />
            <p className="text-sm font-medium text-emerald-200">Payment Mix</p>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-emerald-200">Cash</span>
              <span className="font-bold text-white font-mono">
                {formatCurrency(cashShare, currencySymbol)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-200">Card</span>
              <span className="font-bold text-white font-mono">
                {formatCurrency(cardShare, currencySymbol)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-200">Mobile / Credit</span>
              <span className="font-bold text-white font-mono">
                {formatCurrency(mobileShare + creditShare, currencySymbol)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
