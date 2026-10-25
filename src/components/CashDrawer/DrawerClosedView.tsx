"use client";

import React, { useState } from "react";
import { Calculator } from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";

export function DrawerClosedView() {
  const { openDrawer, currencySymbol } = usePharmacy();
  const [openingAmount, setOpeningAmount] = useState<string>("1000.00");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(openingAmount);
    if (isNaN(val) || val < 0) {
      setError("Please enter a valid opening amount");
      return;
    }
    setError(null);
    openDrawer(val);
  };

  return (
    <div className="max-w-md">
      <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        {/* Header with icon */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Open Cash Drawer
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Start a new shift by entering the opening balance
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Opening Balance
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingAmount}
                onChange={(e) => {
                  setOpeningAmount(e.target.value);
                  setError(null);
                }}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400">Quick:</span>
            {[100, 500, 1000, 5000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setOpeningAmount(preset.toFixed(2))}
                className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                {currencySymbol}{preset}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-[#7c8cf8] hover:bg-[#687bf7] active:scale-[0.99] text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 mt-2"
          >
            Open Drawer
          </button>
        </form>
      </div>
    </div>
  );
}
