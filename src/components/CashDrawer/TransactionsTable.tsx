"use client";

import React, { useState } from "react";
import { usePharmacy } from "@/context/PharmacyContext";
import { formatCurrency } from "@/lib/utils";
import { Trash2, Search, ArrowUpRight, ArrowDownRight, ArrowDown } from "lucide-react";
import { TransactionType } from "@/types/pharmacy";

export function TransactionsTable() {
  const { transactions, currencySymbol, deleteTransaction } = usePharmacy();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      (tx.note?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      tx.time.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const renderTypeBadge = (type: TransactionType) => {
    switch (type) {
      case "cash_in":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowUpRight className="w-3 h-3" />
            Cash In
          </span>
        );
      case "cash_out":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <ArrowDownRight className="w-3 h-3" />
            Cash Out
          </span>
        );
      case "expense":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <ArrowDown className="w-3 h-3" />
            Expense
          </span>
        );
      case "sale":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Sale
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="glass-panel card-sheen rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-emerald-900/10 bg-white/50 backdrop-blur-xs gap-3">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Transactions
        </h2>

        {transactions.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="cash_in">Cash In</option>
              <option value="cash_out">Cash Out</option>
              <option value="expense">Expense</option>
              <option value="sale">Sale</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {transactions.length === 0 ? (
        <div className="py-16 px-6 text-center">
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            No transactions yet. Sales, returns, and manual cash movements will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-6">Time</th>
                <th className="py-3 px-6">Type</th>
                <th className="py-3 px-6">Amount</th>
                <th className="py-3 px-6">Note / Reference</th>
                <th className="py-3 px-6">Cashier</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-600">
                      {tx.time}
                    </td>
                    <td className="py-3.5 px-6">{renderTypeBadge(tx.type)}</td>
                    <td className="py-3.5 px-6 font-semibold font-mono">
                      <span
                        className={
                          isPositive
                            ? "text-[#16a34a]"
                            : "text-[#dc2626]"
                        }
                      >
                        {isPositive ? "+" : ""}
                        {formatCurrency(tx.amount, currencySymbol)}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-700">
                      {tx.note || <span className="text-slate-400 italic">—</span>}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-600">
                      {tx.cashier}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => deleteTransaction(tx.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                        title="Remove transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
