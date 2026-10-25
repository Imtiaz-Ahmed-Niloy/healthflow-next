"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowUp,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";

interface ForecastItem {
  id: string;
  name: string;
  sku: string;
  riskLevel: "Low" | "Medium" | "High";
  baseProjected30d: number;
  currentStock: number;
  dailyDemand: number;
  daysToStockout: number | "infinity";
  trend: "rising" | "steady" | "falling";
  suggestedAction: string;
}

const INITIAL_FORECASTS: ForecastItem[] = [
  {
    id: "f-1",
    name: "ANTACID",
    sku: "ANTAD-8APU",
    riskLevel: "Medium",
    baseProjected30d: 56,
    currentStock: 0,
    dailyDemand: 1.87,
    daysToStockout: 0,
    trend: "rising",
    suggestedAction: "Urgent reorder — demand rising",
  },
  {
    id: "f-2",
    name: "ACETAMINOPHEN",
    sku: "ACEGR-TENF",
    riskLevel: "Low",
    baseProjected30d: 0,
    currentStock: 0,
    dailyDemand: 0.01,
    daysToStockout: 0,
    trend: "steady",
    suggestedAction: "Reorder immediately",
  },
  {
    id: "f-3",
    name: "AVLAYAH",
    sku: "AVLDE150-VVYF",
    riskLevel: "Low",
    baseProjected30d: 0,
    currentStock: 0,
    dailyDemand: 0.01,
    daysToStockout: 0,
    trend: "steady",
    suggestedAction: "Reorder immediately",
  },
  {
    id: "f-4",
    name: "Acetaminophen",
    sku: "ACEWA-YFSM",
    riskLevel: "Low",
    baseProjected30d: 2,
    currentStock: 0,
    dailyDemand: 0.06,
    daysToStockout: 0,
    trend: "falling",
    suggestedAction: "Reorder immediately",
  },
  {
    id: "f-5",
    name: "ANTACID",
    sku: "ANTAD-7T54",
    riskLevel: "Medium",
    baseProjected30d: 17,
    currentStock: 0,
    dailyDemand: 0.57,
    daysToStockout: 0,
    trend: "rising",
    suggestedAction: "Urgent reorder — demand rising",
  },
  {
    id: "f-6",
    name: "Acid Reducer",
    sku: "ACICV-6R2S",
    riskLevel: "Low",
    baseProjected30d: 3,
    currentStock: 0,
    dailyDemand: 0.09,
    daysToStockout: 0,
    trend: "steady",
    suggestedAction: "Reorder immediately",
  },
  {
    id: "f-7",
    name: "AMOXICILLIN AND CLAVULANATE POTASSIUM",
    sku: "AMOA-250-MY3L",
    riskLevel: "Low",
    baseProjected30d: 2,
    currentStock: 0,
    dailyDemand: 0.06,
    daysToStockout: 0,
    trend: "steady",
    suggestedAction: "Reorder immediately",
  },
  {
    id: "f-8",
    name: "Emzor Paracetamol",
    sku: "PAREmz",
    riskLevel: "Low",
    baseProjected30d: 4,
    currentStock: 0,
    dailyDemand: 0.14,
    daysToStockout: 0,
    trend: "steady",
    suggestedAction: "Reorder immediately",
  },
  {
    id: "f-9",
    name: "Accucaine",
    sku: "ACCAD20-5G6M",
    riskLevel: "Low",
    baseProjected30d: 0,
    currentStock: 0,
    dailyDemand: 0.01,
    daysToStockout: 0,
    trend: "steady",
    suggestedAction: "Reorder immediately",
  },
  {
    id: "f-10",
    name: "AVLAYAH",
    sku: "AVLDE150-3EKD",
    riskLevel: "Medium",
    baseProjected30d: 14,
    currentStock: 17,
    dailyDemand: 0.46,
    daysToStockout: 37,
    trend: "steady",
    suggestedAction: "Stock healthy",
  },
  {
    id: "f-11",
    name: "panadol",
    sku: "100100",
    riskLevel: "Medium",
    baseProjected30d: 12,
    currentStock: 28,
    dailyDemand: 0.4,
    daysToStockout: 70,
    trend: "steady",
    suggestedAction: "Stock healthy",
  },
  {
    id: "f-12",
    name: "ACETAMINOPHEN",
    sku: "ACEGR-X86P",
    riskLevel: "Medium",
    baseProjected30d: 37,
    currentStock: 150,
    dailyDemand: 1.22,
    daysToStockout: 123,
    trend: "falling",
    suggestedAction: "Stock healthy",
  },
  {
    id: "f-13",
    name: "ATROPINE SULFATE",
    sku: "ATRHF04-X9Z4",
    riskLevel: "Medium",
    baseProjected30d: 35,
    currentStock: 794,
    dailyDemand: 1.16,
    daysToStockout: 687,
    trend: "falling",
    suggestedAction: "Stock healthy",
  },
  {
    id: "f-14",
    name: "ACTIDOM DMX",
    sku: "ACTAC-IFMD",
    riskLevel: "Medium",
    baseProjected30d: 19,
    currentStock: 1236,
    dailyDemand: 0.64,
    daysToStockout: 1918,
    trend: "falling",
    suggestedAction: "Stock healthy",
  },
  {
    id: "f-15",
    name: "AZSTARYS",
    sku: "AZSCO104-LG5U",
    riskLevel: "Low",
    baseProjected30d: 0,
    currentStock: 1198,
    dailyDemand: 0.01,
    daysToStockout: "infinity",
    trend: "steady",
    suggestedAction: "Stock healthy",
  },
];

export default function ForecastsPage() {
  const [horizon, setHorizon] = useState<number>(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Adjust projected demand based on selected forecast horizon
  const displayItems = useMemo(() => {
    const ratio = horizon / 30;
    return INITIAL_FORECASTS.map((item) => {
      const projected = Math.round(item.baseProjected30d * ratio);
      return {
        ...item,
        projected,
      };
    });
  }, [horizon]);

  // Metric counts
  const criticalCount = displayItems.filter(
    (i) => typeof i.daysToStockout === "number" && i.daysToStockout < 7
  ).length;

  const warningCount = displayItems.filter(
    (i) =>
      typeof i.daysToStockout === "number" &&
      i.daysToStockout >= 7 &&
      i.daysToStockout <= 14
  ).length;

  const healthyCount = displayItems.filter(
    (i) =>
      i.daysToStockout === "infinity" ||
      (typeof i.daysToStockout === "number" && i.daysToStockout > 14)
  ).length;

  return (
    <div className="min-h-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Demand Forecasts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Statistical demand forecasting based on the last 180 days of sales data. Products are
            sorted by stockout risk.
          </p>
        </div>

        {/* Horizon selector & Refresh */}
        <div className="flex items-center gap-3">
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg shadow-2xs focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value={7}>7-day forecast</option>
            <option value={14}>14-day forecast</option>
            <option value={30}>30-day forecast</option>
            <option value={60}>60-day forecast</option>
            <option value={90}>90-day forecast</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 3 Summary Risk Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Critical */}
        <div className="bg-red-50/50 border border-red-200/90 rounded-xl p-4 shadow-2xs">
          <div className="text-2xl font-bold text-red-600 tracking-tight">{criticalCount}</div>
          <div className="text-xs font-medium text-red-600 mt-1">Critical (&lt;7 days)</div>
        </div>

        {/* Warning */}
        <div className="bg-amber-50/50 border border-amber-200/90 rounded-xl p-4 shadow-2xs">
          <div className="text-2xl font-bold text-amber-600 tracking-tight">{warningCount}</div>
          <div className="text-xs font-medium text-amber-600 mt-1">Warning (7-14 days)</div>
        </div>

        {/* Healthy */}
        <div className="bg-emerald-50/50 border border-emerald-200/90 rounded-xl p-4 shadow-2xs">
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">{healthyCount}</div>
          <div className="text-xs font-medium text-emerald-600 mt-1">Healthy (14+ days)</div>
        </div>
      </div>

      {/* Forecast Table Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">PRODUCT</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-center">CURRENT STOCK</th>
                <th className="py-3 px-4 text-center">DAILY DEMAND</th>
                <th className="py-3 px-4 text-center">DAYS TO STOCKOUT</th>
                <th className="py-3 px-4 text-center">TREND</th>
                <th className="py-3 px-4">SUGGESTED ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayItems.map((item) => {
                const isZeroStock = item.currentStock === 0;
                return (
                  <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Product & Projected Demand */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            item.riskLevel === "Medium"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-orange-50 text-orange-700"
                          }`}
                        >
                          {item.riskLevel}
                        </span>
                        <span>·</span>
                        <span>
                          {item.projected} projected / {horizon}d
                        </span>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">
                      {item.sku}
                    </td>

                    {/* Current Stock */}
                    <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                      {item.currentStock}
                    </td>

                    {/* Daily Demand */}
                    <td className="py-3.5 px-4 text-center text-gray-600">
                      {item.dailyDemand}/day
                    </td>

                    {/* Days to stockout */}
                    <td className="py-3.5 px-4 text-center">
                      {item.daysToStockout === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold text-[11px]">
                          <span>▲</span> 0d
                        </span>
                      ) : item.daysToStockout === "infinity" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                          <span>✓</span> ∞
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                          <span>✓</span> {item.daysToStockout}d
                        </span>
                      )}
                    </td>

                    {/* Trend */}
                    <td className="py-3.5 px-4 text-center">
                      {item.trend === "rising" && (
                        <span className="text-red-500 font-bold text-sm">↑</span>
                      )}
                      {item.trend === "steady" && (
                        <span className="text-gray-400 font-bold text-sm">→</span>
                      )}
                      {item.trend === "falling" && (
                        <span className="text-emerald-500 font-bold text-sm">↓</span>
                      )}
                    </td>

                    {/* Suggested Action */}
                    <td className="py-3.5 px-4 text-gray-700 font-medium">
                      {item.suggestedAction}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

