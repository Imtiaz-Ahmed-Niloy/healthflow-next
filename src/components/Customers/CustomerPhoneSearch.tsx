"use client";

import React, { useState, useMemo } from "react";
import {
  Phone,
  Search,
  X,
  Award,
  Gift,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  Coins,
  History,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { Customer, LoyaltyTier } from "@/types/pharmacy";
import { usePharmacy } from "@/context/PharmacyContext";
import { formatCurrency } from "@/lib/utils";

interface CustomerPhoneSearchProps {
  onSelectCustomer?: (customer: Customer) => void;
  onAwardPoints?: (customer: Customer) => void;
  onRedeemPoints?: (customer: Customer) => void;
  onViewDetails?: (customer: Customer) => void;
  onAddCustomerWithPhone?: (phone: string) => void;
}

export function CustomerPhoneSearch({
  onSelectCustomer,
  onAwardPoints,
  onRedeemPoints,
  onViewDetails,
  onAddCustomerWithPhone,
}: CustomerPhoneSearchProps) {
  const { customers, loyaltySettings, currencySymbol } = usePharmacy();
  const [phoneQuery, setPhoneQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Normalize phone search: match raw digits or formatted string
  const cleanQuery = useMemo(() => phoneQuery.replace(/\D/g, ""), [phoneQuery]);

  const matchedCustomers = useMemo(() => {
    if (!phoneQuery.trim()) return [];

    return customers.filter((c) => {
      const cleanPhone = c.phone.replace(/\D/g, "");
      // Match by digits or by formatted string
      const phoneMatches =
        (cleanQuery && cleanPhone.includes(cleanQuery)) ||
        c.phone.toLowerCase().includes(phoneQuery.toLowerCase());
      
      // Also match if user accidentally types name in this quick box
      const nameMatches = c.name.toLowerCase().includes(phoneQuery.toLowerCase());
      
      return phoneMatches || nameMatches;
    });
  }, [customers, phoneQuery, cleanQuery]);

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

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 sm:p-5 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Quick Customer Phone Search
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                Instant Loyalty Lookup
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Type any phone number or digits to instantly pull up loyalty points, perks, and purchase history
            </p>
          </div>
        </div>

        {phoneQuery && (
          <button
            onClick={() => setPhoneQuery("")}
            className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 self-start sm:self-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Input Box */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Phone className="w-4 h-4 text-emerald-600" />
        </div>
        <input
          type="text"
          value={phoneQuery}
          onChange={(e) => setPhoneQuery(e.target.value)}
          placeholder="Enter phone number (e.g. 555-234-8901, +1..., or digits)..."
          className="w-full pl-10 pr-24 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all"
        />
        {phoneQuery ? (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1 text-xs">
            <span className="text-slate-400 mr-1 text-[11px]">
              {matchedCustomers.length} {matchedCustomers.length === 1 ? "match" : "matches"}
            </span>
            <button
              onClick={() => setPhoneQuery("")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[11px] text-slate-400 font-mono">
            TEL / MOBILE
          </div>
        )}
      </div>

      {/* Results Dropdown / Cards */}
      {phoneQuery.trim() !== "" && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          {matchedCustomers.length > 0 ? (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {matchedCustomers.map((customer) => {
                const tierInfo = getTierBadge(customer.loyaltyTier);
                const cashValue = Number(
                  (customer.points / (loyaltySettings.redemptionRate || 100)).toFixed(2)
                );

                return (
                  <div
                    key={customer.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-[#f8faf9] hover:bg-[#f3f7f4] hover:border-emerald-300 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Customer Info */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {customer.name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${tierInfo.bg}`}
                        >
                          <span>{tierInfo.icon}</span>
                          <span>{customer.loyaltyTier}</span>
                          <span className="opacity-75">({tierInfo.multiplier})</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ID: {customer.id}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          {customer.phone}
                          <button
                            type="button"
                            onClick={() => copyPhone(customer.phone, customer.id)}
                            title="Copy phone"
                            className="p-0.5 text-slate-400 hover:text-emerald-700 cursor-pointer"
                          >
                            {copiedId === customer.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </span>
                        {customer.email && (
                          <span className="text-slate-500">📧 {customer.email}</span>
                        )}
                        <span className="text-slate-400">
                          Last Visit: {customer.lastVisit || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Points & Metrics */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:border-l md:border-slate-200 md:pl-4">
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                        <div className="text-[10px] uppercase font-bold text-emerald-700 flex items-center justify-center gap-1">
                          <Coins className="w-3 h-3" /> Reward Points
                        </div>
                        <div className="text-base font-bold font-mono text-slate-900">
                          {customer.points.toLocaleString()}{" "}
                          <span className="text-xs font-normal text-slate-400">pts</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          ≈ {formatCurrency(cashValue, currencySymbol)} value
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 space-y-0.5">
                        <div>
                          Orders: <strong className="text-slate-800">{customer.totalOrders}</strong>
                        </div>
                        <div>
                          Total Spent: <strong className="text-slate-800">{formatCurrency(customer.totalSpent, currencySymbol)}</strong>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                        {onAwardPoints && (
                          <button
                            type="button"
                            onClick={() => onAwardPoints(customer)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            title="Award Points on Purchase"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Award Points</span>
                          </button>
                        )}

                        {onRedeemPoints && customer.points >= (loyaltySettings.minRedeemPoints || 50) && (
                          <button
                            type="button"
                            onClick={() => onRedeemPoints(customer)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            title="Redeem Points"
                          >
                            <Gift className="w-3.5 h-3.5" />
                            <span>Redeem</span>
                          </button>
                        )}

                        {onViewDetails && (
                          <button
                            type="button"
                            onClick={() => onViewDetails(customer)}
                            className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                            title="View Full Customer Dossier & Points History"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 px-4 bg-[#f8faf9] rounded-xl border border-dashed border-slate-200">
              <Phone className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-800">
                No customer found with phone &ldquo;{phoneQuery}&rdquo;
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                This phone number isn&apos;t enrolled in the loyalty program yet. You can register them right now with this phone number to start earning reward points.
              </p>
              {onAddCustomerWithPhone && (
                <button
                  type="button"
                  onClick={() => onAddCustomerWithPhone(phoneQuery)}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register Customer with &quot;{phoneQuery}&quot;</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
