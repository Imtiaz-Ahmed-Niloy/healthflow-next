"use client";

import React, { useState } from "react";
import { MarginInsight } from "@/types/pharmacy";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Sparkles,
} from "lucide-react";

interface MarginInsightsBannerProps {
  insights: MarginInsight[];
  currencySymbol: string;
}

export const MarginInsightsBanner: React.FC<MarginInsightsBannerProps> = ({
  insights,
  currencySymbol,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const getPriorityBadge = (priority: MarginInsight["priority"]) => {
    switch (priority) {
      case "high":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            high priority
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            medium
          </span>
        );
      case "low":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            optimized
          </span>
        );
    }
  };

  if (!isExpanded) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Margin Insights</h3>
            <p className="text-xs text-slate-500">
              AI-driven pricing and velocity recommendations across your catalog
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <span>Analyze Margins</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 transition-all">
      {/* Header when expanded */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Margin Insights</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {insights.length} suggestions
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Updated daily based on trailing 90-day retail transactions and wholesale cost changes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors ${
              isRefreshing ? "opacity-60" : ""
            }`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Collapse Margin Insights"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of suggestion cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {insights.map((item, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-xs transition-all space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900 capitalize truncate">
                {item.productName}
              </h4>
              {getPriorityBadge(item.priority)}
            </div>

            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
              {item.suggestion}
            </p>

            <div className="pt-2 border-t border-slate-200/70 grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-mono">
              <div>
                <span className="block text-slate-400">Price / Cost:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(item.price, currencySymbol)} / {formatCurrency(item.costPrice, currencySymbol)}
                </span>
              </div>
              <div>
                <span className="block text-slate-400">Margin:</span>
                <span className="font-semibold text-emerald-700">
                  {item.marginPercentage.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="block text-slate-400">Sold (90d):</span>
                <span className="font-semibold text-slate-800">
                  {item.sold90d} units
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
