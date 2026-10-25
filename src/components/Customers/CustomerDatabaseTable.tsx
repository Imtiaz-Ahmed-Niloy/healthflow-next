"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Award,
  Coins,
  Gift,
  ArrowUpDown,
  ExternalLink,
  Edit2,
  Trash2,
  Copy,
  Check,
  Calendar,
  Sparkles,
  Filter,
} from "lucide-react";
import { Customer, LoyaltyTier } from "@/types/pharmacy";
import { usePharmacy } from "@/context/PharmacyContext";
import { formatCurrency } from "@/lib/utils";

interface CustomerDatabaseTableProps {
  onAwardPoints: (customer: Customer) => void;
  onRedeemPoints: (customer: Customer) => void;
  onViewDetails: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
}

export function CustomerDatabaseTable({
  onAwardPoints,
  onRedeemPoints,
  onViewDetails,
  onEditCustomer,
}: CustomerDatabaseTableProps) {
  const { customers, deleteCustomer, loyaltySettings, currencySymbol } = usePharmacy();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"points" | "spent" | "orders" | "recent" | "name">("points");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getTierBadge = (tier: LoyaltyTier) => {
    switch (tier) {
      case "Platinum":
        return {
          bg: "bg-purple-50 text-purple-800 border-purple-200",
          icon: "💎",
          multiplier: "2.0x",
        };
      case "Gold":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: "🥇",
          multiplier: "1.5x",
        };
      case "Silver":
        return {
          bg: "bg-slate-100 text-slate-800 border-slate-200",
          icon: "🥈",
          multiplier: "1.25x",
        };
      case "Bronze":
      default:
        return {
          bg: "bg-orange-50 text-orange-800 border-orange-200",
          icon: "🥉",
          multiplier: "1.0x",
        };
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...customers];

    // Filter by search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const cleanDigits = searchTerm.replace(/\D/g, "");
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (cleanDigits && c.phone.replace(/\D/g, "").includes(cleanDigits)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          c.id.toLowerCase().includes(q)
      );
    }

    // Filter by tier
    if (selectedTier !== "ALL") {
      result = result.filter((c) => c.loyaltyTier === selectedTier);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "points":
          return b.points - a.points;
        case "spent":
          return b.totalSpent - a.totalSpent;
        case "orders":
          return b.totalOrders - a.totalOrders;
        case "name":
          return a.name.localeCompare(b.name);
        case "recent":
        default:
          return (b.pointsHistory?.[0]?.timestamp || 0) - (a.pointsHistory?.[0]?.timestamp || 0);
      }
    });

    return result;
  }, [customers, searchTerm, selectedTier, sortBy]);

  const tierCounts = useMemo(() => {
    return {
      ALL: customers.length,
      Platinum: customers.filter((c) => c.loyaltyTier === "Platinum").length,
      Gold: customers.filter((c) => c.loyaltyTier === "Gold").length,
      Silver: customers.filter((c) => c.loyaltyTier === "Silver").length,
      Bronze: customers.filter((c) => c.loyaltyTier === "Bronze").length,
    };
  }, [customers]);

  return (
    <div className="glass-panel card-sheen rounded-2xl overflow-hidden shadow-sm">
      {/* Controls Bar */}
      <div className="p-4 border-b border-emerald-900/10 space-y-3 bg-white/60 backdrop-blur-xs">
        {/* Tier Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          {[
            { id: "ALL", label: "All Members", count: tierCounts.ALL },
            { id: "Platinum", label: "💎 Platinum", count: tierCounts.Platinum },
            { id: "Gold", label: "🥇 Gold", count: tierCounts.Gold },
            { id: "Silver", label: "🥈 Silver", count: tierCounts.Silver },
            { id: "Bronze", label: "🥉 Bronze", count: tierCounts.Bronze },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTier(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedTier === tab.id
                  ? "bg-white text-emerald-800 border border-slate-200/80 shadow-2xs font-semibold"
                  : "bg-slate-100/70 text-slate-600 hover:bg-slate-100 font-medium"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedTier === tab.id
                    ? "bg-emerald-50 text-emerald-700 font-bold"
                    : "bg-white text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* General Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by customer name, phone, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
            >
              <option value="points">Most Points Balance</option>
              <option value="spent">Highest Lifetime Spend</option>
              <option value="orders">Most Orders Placed</option>
              <option value="recent">Recent Visit Date</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-[11px] uppercase tracking-wider bg-[#f8faf9] text-slate-500 border-b border-slate-100 font-semibold">
            <tr>
              <th className="px-5 py-3">Customer & Membership</th>
              <th className="px-5 py-3">Contact & Phone</th>
              <th className="px-5 py-3 text-center">Loyalty Tier</th>
              <th className="px-5 py-3 text-right">Available Points</th>
              <th className="px-5 py-3 text-right">Total Purchases</th>
              <th className="px-5 py-3 text-right">Last Visit</th>
              <th className="px-5 py-3 text-center">Reward Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSorted.length > 0 ? (
              filteredAndSorted.map((c) => {
                const tierInfo = getTierBadge(c.loyaltyTier);
                const cashValue = Number(
                  (c.points / (loyaltySettings.redemptionRate || 100)).toFixed(2)
                );

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-[#f3f7f4] transition-colors group"
                  >
                    {/* Customer & ID */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div
                            onClick={() => onViewDetails(c)}
                            className="font-semibold text-slate-900 group-hover:text-emerald-700 cursor-pointer transition-colors"
                          >
                            {c.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ID: {c.id} • Joined: {c.joinedDate || "N/A"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact & Phone */}
                    <td className="px-5 py-3 text-slate-600">
                      <div className="flex items-center gap-1 font-semibold text-emerald-700">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{c.phone}</span>
                        <button
                          type="button"
                          onClick={() => copyPhone(c.phone, c.id)}
                          title="Copy phone number"
                          className="p-0.5 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          {copiedId === c.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {c.email || "—"}
                      </div>
                    </td>

                    {/* Loyalty Tier */}
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${tierInfo.bg}`}
                      >
                        <span>{tierInfo.icon}</span>
                        <span>{c.loyaltyTier}</span>
                        <span className="opacity-75 text-[9px]">({tierInfo.multiplier})</span>
                      </span>
                    </td>

                    {/* Available Points */}
                    <td className="px-5 py-3 text-right tabular-nums">
                      <div className="font-bold font-mono text-sm text-slate-900">
                        {c.points.toLocaleString()}{" "}
                        <span className="text-[11px] font-normal text-slate-400">pts</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ≈ {formatCurrency(cashValue, currencySymbol)} value
                      </div>
                    </td>

                    {/* Purchases */}
                    <td className="px-5 py-3 text-right tabular-nums">
                      <div className="font-semibold text-slate-900 font-mono">
                        {formatCurrency(c.totalSpent, currencySymbol)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {c.totalOrders} {c.totalOrders === 1 ? "order" : "orders"}
                      </div>
                    </td>

                    {/* Last Visit */}
                    <td className="px-5 py-3 text-right text-slate-500 whitespace-nowrap text-[11px]">
                      {c.lastVisit || "N/A"}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Award Points on Purchase */}
                        <button
                          type="button"
                          onClick={() => onAwardPoints(c)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-700 text-emerald-700 hover:text-white rounded-lg border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                          title="Award Points on Purchase"
                        >
                          <Award className="w-3.5 h-3.5" />
                        </button>

                        {/* Redeem Points */}
                        <button
                          type="button"
                          onClick={() => onRedeemPoints(c)}
                          disabled={c.points < (loyaltySettings.minRedeemPoints || 50)}
                          className="p-1.5 bg-amber-50 hover:bg-amber-600 disabled:opacity-30 text-amber-700 hover:text-white rounded-lg border border-amber-200 transition-colors shadow-2xs cursor-pointer"
                          title="Redeem Points"
                        >
                          <Gift className="w-3.5 h-3.5" />
                        </button>

                        {/* View Dossier / Ledger */}
                        <button
                          type="button"
                          onClick={() => onViewDetails(c)}
                          className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                          title="View Customer Dossier & Points Ledger"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => onEditCustomer(c)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Customer Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-slate-700">
                    No customers match your search criteria.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting your filters or search keywords.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      <div className="p-3.5 bg-[#f8faf9] border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div>
          Showing <strong>{filteredAndSorted.length}</strong> of <strong>{customers.length}</strong> registered loyalty members
        </div>
        <div className="flex items-center gap-4">
          <span>
            Total Points Issued:{" "}
            <strong className="text-emerald-700 font-mono">
              {customers.reduce((sum, c) => sum + c.points, 0).toLocaleString()} pts
            </strong>
          </span>
          <span>
            Redemption Liability:{" "}
            <strong className="text-slate-800 font-mono">
              {formatCurrency(
                customers.reduce((sum, c) => sum + c.points, 0) /
                  (loyaltySettings.redemptionRate || 100),
                currencySymbol
              )}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
