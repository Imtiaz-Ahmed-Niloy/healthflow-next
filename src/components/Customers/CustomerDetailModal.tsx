"use client";

import React, { useState } from "react";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  Coins,
  Gift,
  History,
  Receipt,
  AlertTriangle,
  FileText,
  User,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { Customer, LoyaltyTier } from "@/types/pharmacy";
import { usePharmacy } from "@/context/PharmacyContext";
import { formatCurrency } from "@/lib/utils";

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onAwardPoints: (customer: Customer) => void;
  onRedeemPoints: (customer: Customer) => void;
  onEditCustomer?: (customer: Customer) => void;
}

export function CustomerDetailModal({
  isOpen,
  onClose,
  customer,
  onAwardPoints,
  onRedeemPoints,
  onEditCustomer,
}: CustomerDetailModalProps) {
  const { loyaltySettings, sales, currencySymbol, adjustCustomerPoints } = usePharmacy();
  const [activeTab, setActiveTab] = useState<"points" | "sales">("points");
  const [showAdjustPoints, setShowAdjustPoints] = useState<boolean>(false);
  const [adjustPointsValue, setAdjustPointsValue] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("");

  if (!isOpen || !customer) return null;

  // Filter sales made by this customer
  const customerSales = sales.filter(
    (s) =>
      s.customer.customerId === customer.id ||
      (s.customer.phone && customer.phone && s.customer.phone === customer.phone) ||
      (s.customer.name && s.customer.name.toLowerCase() === customer.name.toLowerCase())
  );

  const getTierDetails = (tier: LoyaltyTier) => {
    switch (tier) {
      case "Platinum":
        return {
          icon: "💎",
          badgeBg: "bg-purple-50 text-purple-800 border-purple-200",
          nextTier: null,
          nextThreshold: 3000,
          currentThreshold: 3000,
        };
      case "Gold":
        return {
          icon: "🥇",
          badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
          nextTier: "Platinum",
          nextThreshold: loyaltySettings.tierThresholds.platinum,
          currentThreshold: loyaltySettings.tierThresholds.gold,
        };
      case "Silver":
        return {
          icon: "🥈",
          badgeBg: "bg-slate-100 text-slate-800 border-slate-200",
          nextTier: "Gold",
          nextThreshold: loyaltySettings.tierThresholds.gold,
          currentThreshold: loyaltySettings.tierThresholds.silver,
        };
      case "Bronze":
      default:
        return {
          icon: "🥉",
          badgeBg: "bg-orange-50 text-orange-800 border-orange-200",
          nextTier: "Silver",
          nextThreshold: loyaltySettings.tierThresholds.silver,
          currentThreshold: 0,
        };
    }
  };

  const tierDetails = getTierDetails(customer.loyaltyTier);
  const cashEquivalent = Number(
    (customer.points / (loyaltySettings.redemptionRate || 100)).toFixed(2)
  );

  const progressPercent = tierDetails.nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((customer.lifetimePointsEarned - tierDetails.currentThreshold) /
              (tierDetails.nextThreshold - tierDetails.currentThreshold)) *
              100
          )
        )
      )
    : 100;

  const handleAdjustPointsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(adjustPointsValue, 10);
    if (isNaN(val) || val === 0) return;
    adjustCustomerPoints(customer.id, val, adjustReason.trim() || "Manual adjustment");
    setShowAdjustPoints(false);
    setAdjustPointsValue("");
    setAdjustReason("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-[#f8faf9]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center text-xl font-bold flex-shrink-0">
                {customer.name.charAt(0)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {customer.name}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${tierDetails.badgeBg}`}
                  >
                    <span>{tierDetails.icon}</span>
                    <span>{customer.loyaltyTier} Tier Member</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {customer.id}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> {customer.phone}
                  </span>
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {customer.email}
                    </span>
                  )}
                  {customer.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {customer.address}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" /> Member Since: {customer.joinedDate}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-200/80">
            <button
              type="button"
              onClick={() => onAwardPoints(customer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Award Points on Purchase</span>
            </button>

            <button
              type="button"
              onClick={() => onRedeemPoints(customer)}
              disabled={customer.points < (loyaltySettings.minRedeemPoints || 50)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Redeem Points</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAdjustPoints(!showAdjustPoints)}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-slate-500" />
              <span>Adjust Points</span>
            </button>

            {onEditCustomer && (
              <button
                type="button"
                onClick={() => onEditCustomer(customer)}
                className="ml-auto text-xs text-slate-500 hover:text-emerald-700 font-semibold cursor-pointer"
              >
                Edit Customer Details
              </button>
            )}
          </div>

          {/* Manual Adjust Points Drawer */}
          {showAdjustPoints && (
            <form
              onSubmit={handleAdjustPointsSubmit}
              className="mt-3 p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5 animate-in slide-in-from-top-2"
            >
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" /> Manual Point Adjustment
                <span className="text-[10px] text-slate-400 font-normal">
                  (Positive to add, negative to deduct)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="number"
                  required
                  value={adjustPointsValue}
                  onChange={(e) => setAdjustPointsValue(e.target.value)}
                  placeholder="e.g. +50 or -30"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason (e.g. Birthday gift, return correction)..."
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustPoints(false)}
                  className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-white">
          {/* Key Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-emerald-600" /> Available Points
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">
                {customer.points.toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-0.5">
                ≈ {formatCurrency(cashEquivalent, currencySymbol)} discount value
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f8faf9] border border-slate-200/80">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Lifetime Points
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {customer.lifetimePointsEarned.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Redeemed: {customer.lifetimePointsRedeemed.toLocaleString()} pts
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f8faf9] border border-slate-200/80">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Orders
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {customer.totalOrders}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Last: {customer.lastVisit || "N/A"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f8faf9] border border-slate-200/80">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Spent
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(customer.totalSpent, currencySymbol)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                AR Balance: {formatCurrency(customer.balance || 0, currencySymbol)}
              </div>
            </div>
          </div>

          {/* Tier Progress Bar */}
          {tierDetails.nextTier ? (
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-[#f8faf9] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">
                  Progression to <strong>{tierDetails.nextTier} Tier</strong>
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {customer.lifetimePointsEarned.toLocaleString()} /{" "}
                  {tierDetails.nextThreshold.toLocaleString()} lifetime points ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs font-semibold text-purple-900 flex items-center gap-2">
              <span>💎</span>
              <span>Top Tier Status Reached! Customer enjoys 2.0x VIP points multiplier.</span>
            </div>
          )}

          {/* Notes & Allergies */}
          {(customer.notes || (customer.allergies && customer.allergies.length > 0)) && (
            <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 space-y-2 text-xs">
              {customer.allergies && customer.allergies.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Drug Allergies:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {customer.allergies.map((all, i) => (
                      <span
                        key={i}
                        className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-semibold text-[11px]"
                      >
                        {all}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {customer.notes && (
                <div className="text-slate-700">
                  <strong>Pharmacy Notes:</strong> {customer.notes}
                </div>
              )}
            </div>
          )}

          {/* Tabs: Points Ledger vs Sales History */}
          <div className="space-y-3">
            <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("points")}
                className={`pb-2.5 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === "points"
                    ? "border-b-2 border-emerald-700 text-emerald-800 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <History className="w-4 h-4" />
                <span>Points Transaction Ledger ({customer.pointsHistory?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("sales")}
                className={`pb-2.5 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === "sales"
                    ? "border-b-2 border-emerald-700 text-emerald-800 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Purchase Invoices ({customerSales.length})</span>
              </button>
            </div>

            {/* TAB 1: Points History */}
            {activeTab === "points" && (
              <div className="overflow-x-auto">
                {customer.pointsHistory && customer.pointsHistory.length > 0 ? (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#f8faf9] uppercase text-[10px] text-slate-500 border-b border-slate-100 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-right">Points</th>
                        <th className="py-2.5 px-3">Order / Reference</th>
                        <th className="py-2.5 px-3">Reason / Details</th>
                        <th className="py-2.5 px-3 text-right">Cashier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customer.pointsHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-[#f3f7f4]">
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {item.date}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.points > 0
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {item.points > 0 ? (
                                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3 text-amber-600" />
                              )}
                              {item.type}
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold font-mono tabular-nums ${
                              item.points > 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {item.points > 0 ? `+${item.points}` : item.points}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                            {item.orderId || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                            {item.reason || "Loyalty reward"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500 text-[11px]">
                            {item.processedBy || "Pharmacy Admin"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No points transactions recorded yet.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Sales Invoices */}
            {activeTab === "sales" && (
              <div className="overflow-x-auto">
                {customerSales.length > 0 ? (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#f8faf9] uppercase text-[10px] text-slate-500 border-b border-slate-100 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Items Purchased</th>
                        <th className="py-2.5 px-3 text-right">Total Amount</th>
                        <th className="py-2.5 px-3 text-center">Payment</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-[#f3f7f4]">
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">
                            {sale.invoiceNumber}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {sale.date}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            {sale.items.map((it) => `${it.name} (x${it.quantity})`).join(", ")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                            {formatCurrency(sale.totalAmount, currencySymbol)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                              {sale.paymentMethod}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[10px]">
                              {sale.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No sales invoices recorded for this customer yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
