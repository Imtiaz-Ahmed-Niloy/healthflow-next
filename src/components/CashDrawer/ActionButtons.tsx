"use client";

import React from "react";
import { Plus, Minus, ArrowDown, Lock } from "lucide-react";

interface ActionButtonsProps {
  onOpenCashIn: () => void;
  onOpenCashOut: () => void;
  onOpenExpense: () => void;
  onOpenCloseDrawer: () => void;
}

export function ActionButtons({
  onOpenCashIn,
  onOpenCashOut,
  onOpenExpense,
  onOpenCloseDrawer,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      {/* Left Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* + Cash In */}
        <button
          onClick={onOpenCashIn}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.98] text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Cash In</span>
        </button>

        {/* - Cash Out */}
        <button
          onClick={onOpenCashOut}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] active:scale-[0.98] text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
        >
          <Minus className="w-4 h-4 stroke-[3]" />
          <span>Cash Out</span>
        </button>

        {/* ↓ Expense */}
        <button
          onClick={onOpenExpense}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] active:scale-[0.98] text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
        >
          <ArrowDown className="w-4 h-4 stroke-[3]" />
          <span>Expense</span>
        </button>
      </div>

      {/* Right Action Button: Close Drawer */}
      <div>
        <button
          onClick={onOpenCloseDrawer}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1e293b] hover:bg-[#0f172a] active:scale-[0.98] text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
        >
          <Lock className="w-4 h-4" />
          <span>Close Drawer</span>
        </button>
      </div>
    </div>
  );
}
