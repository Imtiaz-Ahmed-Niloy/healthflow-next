"use client";

import React from "react";
import { usePharmacy } from "@/context/PharmacyContext";
import { formatCurrency } from "@/lib/utils";
import { Wallet, TrendingUp, Receipt, Clock } from "lucide-react";

export function StatCards() {
  const { openingBalance, currentBalance, transactions, openedAt, currencySymbol } =
    usePharmacy();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Opening Balance */}
      <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/25">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-emerald-200" />
            <p className="text-sm font-medium text-emerald-100">Opening Balance</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-white">
            {formatCurrency(openingBalance, currencySymbol)}
          </p>
          <p className="text-xs text-emerald-200 mt-2">Initial shift float</p>
        </div>
      </div>

      {/* 2. Current Balance */}
      <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-green-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/25">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-200" />
            <p className="text-sm font-medium text-emerald-100">Current Balance</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-white">
            {formatCurrency(currentBalance, currencySymbol)}
          </p>
          <p className="text-xs text-emerald-200 mt-2">Live till balance in register</p>
        </div>
      </div>

      {/* 3. Transactions Count */}
      <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-teal-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/25">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-teal-200" />
            <p className="text-sm font-medium text-emerald-100">Transactions</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-white">
            {transactions.length}
          </p>
          <p className="text-xs text-emerald-200 mt-2">Shift movements recorded</p>
        </div>
      </div>

      {/* 4. Opened At */}
      <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white border-0 shadow-lg shadow-emerald-950/30">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-emerald-300" />
            <p className="text-sm font-medium text-emerald-200">Shift Started</p>
          </div>
          <p className="text-lg font-bold tabular-nums text-white mt-0.5 truncate">
            {openedAt}
          </p>
          <p className="text-xs text-emerald-300/90 mt-2">Active cashier shift session</p>
        </div>
      </div>
    </div>
  );
}
