"use client";

import React from "react";
import { Calculator, History } from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";

export function DrawerHeader() {
  const { activeTab, setActiveTab } = usePharmacy();

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Title */}
      <h1 className="text-[26px] font-bold text-slate-900 tracking-tight">
        Cash Drawer
      </h1>

      {/* Segmented Tabs */}
      <div className="flex items-center">
        <div className="inline-flex items-center p-1 bg-[#e8ede9] rounded-xl border border-slate-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
          <button
            onClick={() => setActiveTab("current")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "current"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calculator className="w-4 h-4 text-blue-600" />
            <span>Current</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "history"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>History</span>
          </button>
        </div>
      </div>
    </div>
  );
}
