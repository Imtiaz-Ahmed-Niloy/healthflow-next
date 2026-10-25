"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Award,
  X,
  Coins,
  DollarSign,
  Receipt,
  Sparkles,
  Check,
  TrendingUp,
  UserCheck,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { Customer, LoyaltyTier } from "@/types/pharmacy";
import { usePharmacy } from "@/context/PharmacyContext";
import { formatCurrency } from "@/lib/utils";

interface AwardPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCustomer?: Customer | null;
  onSuccess?: (customer: Customer, pointsAwarded: number) => void;
}

export function AwardPointsModal({
  isOpen,
  onClose,
  targetCustomer,
  onSuccess,
}: AwardPointsModalProps) {
  const { customers, loyaltySettings, awardPointsOnPurchase, sales, currencySymbol } =
    usePharmacy();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [purchaseAmount, setPurchaseAmount] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [customPointsEnabled, setCustomPointsEnabled] = useState<boolean>(false);
  const [customPointsInput, setCustomPointsInput] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");
  const [awardSuccess, setAwardSuccess] = useState<boolean>(false);
  const [lastAwardInfo, setLastAwardInfo] = useState<{
    points: number;
    newTotal: number;
    tier: LoyaltyTier;
    customerName: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (targetCustomer) {
        setSelectedCustomerId(targetCustomer.id);
      } else if (customers.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(customers[0].id);
      }
      setAwardSuccess(false);
      setLastAwardInfo(null);
      setPurchaseAmount("");
      setInvoiceNumber("");
      setCustomPointsEnabled(false);
      setCustomPointsInput("");
      setNote("");
    }
  }, [isOpen, targetCustomer, customers]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const tierMultiplier = useMemo(() => {
    if (!selectedCustomer) return 1.0;
    const tierKey = selectedCustomer.loyaltyTier.toLowerCase() as keyof typeof loyaltySettings.tierMultipliers;
    return loyaltySettings.tierMultipliers[tierKey] || 1.0;
  }, [selectedCustomer, loyaltySettings]);

  const amountNum = parseFloat(purchaseAmount) || 0;

  const calculatedPoints = useMemo(() => {
    if (customPointsEnabled) {
      return parseInt(customPointsInput, 10) || 0;
    }
    if (amountNum <= 0) return 0;
    return Math.max(
      1,
      Math.round(amountNum * (loyaltySettings.pointsPerDollar || 1) * tierMultiplier)
    );
  }, [amountNum, tierMultiplier, loyaltySettings.pointsPerDollar, customPointsEnabled, customPointsInput]);

  const projectedNewPoints = (selectedCustomer?.points || 0) + calculatedPoints;
  const projectedLifetime = (selectedCustomer?.lifetimePointsEarned || 0) + calculatedPoints;

  const projectedTier = useMemo((): LoyaltyTier => {
    const thresh = loyaltySettings.tierThresholds;
    if (projectedLifetime >= thresh.platinum) return "Platinum";
    if (projectedLifetime >= thresh.gold) return "Gold";
    if (projectedLifetime >= thresh.silver) return "Silver";
    return "Bronze";
  }, [projectedLifetime, loyaltySettings.tierThresholds]);

  const willTierUpgrade = selectedCustomer && projectedTier !== selectedCustomer.loyaltyTier;

  // Filtered customers for customer picker
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const q = customerSearchQuery.toLowerCase();
    const cleanQ = customerSearchQuery.replace(/\D/g, "");
    return customers.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = c.phone.toLowerCase().includes(q) || (cleanQ && c.phone.replace(/\D/g, "").includes(cleanQ));
      return matchName || matchPhone;
    });
  }, [customers, customerSearchQuery]);

  if (!isOpen) return null;

  const handleQuickFillSale = (sale: (typeof sales)[0]) => {
    setPurchaseAmount(sale.totalAmount.toString());
    setInvoiceNumber(sale.invoiceNumber);
    setNote(`Purchase reward for Sale ${sale.invoiceNumber}`);
  };

  const handleConfirmAward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || calculatedPoints <= 0) return;

    const result = awardPointsOnPurchase({
      customerId: selectedCustomer.id,
      purchaseAmount: amountNum,
      invoiceNumber: invoiceNumber.trim() || undefined,
      customPoints: customPointsEnabled ? calculatedPoints : undefined,
      reason: note.trim() || undefined,
    });

    if (result) {
      setLastAwardInfo({
        points: result.pointsAwarded,
        newTotal: result.newTotalPoints,
        tier: result.newTier,
        customerName: selectedCustomer.name,
      });
      setAwardSuccess(true);
      if (onSuccess) {
        onSuccess(selectedCustomer, result.pointsAwarded);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#f8faf9]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Award Purchase Reward Points
              </h2>
              <p className="text-xs text-slate-500">
                Credit loyalty reward points on customer pharmacy purchases
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {awardSuccess && lastAwardInfo ? (
          /* Success Screen */
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                Points Successfully Credited!
              </span>
              <h3 className="text-2xl font-bold font-mono text-slate-900 mt-2">
                +{lastAwardInfo.points.toLocaleString()} Reward Points
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Awarded to <strong className="text-slate-900">{lastAwardInfo.customerName}</strong>
              </p>
            </div>

            <div className="bg-[#f8faf9] p-4 rounded-xl border border-slate-200 max-w-sm mx-auto space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>New Points Balance:</span>
                <strong className="text-emerald-700 font-mono text-sm">
                  {lastAwardInfo.newTotal.toLocaleString()} pts
                </strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Membership Tier:</span>
                <strong className="text-slate-800">
                  {lastAwardInfo.tier} Tier
                </strong>
              </div>
            </div>

            <div className="pt-2 flex justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setAwardSuccess(false);
                  setPurchaseAmount("");
                  setInvoiceNumber("");
                  setNote("");
                }}
                className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Award Another Purchase
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Award Form */
          <form onSubmit={handleConfirmAward} className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Customer Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Customer Account
              </label>

              {targetCustomer ? (
                /* Locked target customer card */
                <div className="p-3 rounded-xl border border-slate-200 bg-[#f8faf9] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      {targetCustomer.name}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {targetCustomer.phone} • {targetCustomer.loyaltyTier} Tier
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                    {targetCustomer.points.toLocaleString()} pts
                  </span>
                </div>
              ) : (
                /* Select dropdown with search */
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="Search customer by name or phone..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 placeholder-slate-400"
                  />
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                  >
                    {filteredCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.phone} ({c.loyaltyTier} • {c.points} pts)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Selected Customer Loyalty Tier Card */}
            {selectedCustomer && (
              <div className="p-3 bg-[#f8faf9] rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Tier Multiplier: </span>
                  <strong className="text-emerald-700 font-bold">
                    {tierMultiplier}x Points Rate
                  </strong>
                  <span className="text-slate-400 ml-1">({selectedCustomer.loyaltyTier} Tier)</span>
                </div>
                <div>
                  <span className="text-slate-500">Current Balance: </span>
                  <strong className="text-slate-800 font-bold font-mono">
                    {selectedCustomer.points.toLocaleString()} pts
                  </strong>
                </div>
              </div>
            )}

            {/* Purchase Amount & Invoice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Purchase Amount ($) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required={!customPointsEnabled}
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Invoice / Receipt # <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Receipt className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2026-0105"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Custom Points Override Toggle */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={customPointsEnabled}
                  onChange={(e) => setCustomPointsEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>Manually override / grant custom bonus points</span>
              </label>

              {customPointsEnabled && (
                <div className="mt-2 relative">
                  <Coins className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                  <input
                    type="number"
                    min="1"
                    required
                    value={customPointsInput}
                    onChange={(e) => setCustomPointsInput(e.target.value)}
                    placeholder="Enter custom points amount..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-amber-300 bg-amber-50/30 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-slate-400"
                  />
                </div>
              )}
            </div>

            {/* Notes / Reason */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Reward Notes / Reason
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Prescription refill & wellness vitamins purchase"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 placeholder-slate-400"
              />
            </div>

            {/* Live Calculation Preview Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Points to Credit:
                </span>
                <span className="text-2xl font-bold font-mono tracking-tight">
                  +{calculatedPoints.toLocaleString()} pts
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-emerald-100 pt-1 border-t border-emerald-600/40">
                <span>
                  New Points Total: <strong className="font-mono">{projectedNewPoints.toLocaleString()} pts</strong>
                </span>
                <span>
                  Tier Status: <strong>{projectedTier}</strong>
                </span>
              </div>

              {willTierUpgrade && (
                <div className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1.5">
                  <span>🎉</span>
                  <span>Will upgrade customer to {projectedTier} Tier!</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={calculatedPoints <= 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Confirm & Award +{calculatedPoints} Points</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
