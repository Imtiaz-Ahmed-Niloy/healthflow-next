"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Gift,
  X,
  Coins,
  DollarSign,
  Receipt,
  Sparkles,
  Check,
  AlertCircle,
} from "lucide-react";
import { Customer } from "@/types/pharmacy";
import { usePharmacy } from "@/context/PharmacyContext";
import { formatCurrency } from "@/lib/utils";

interface RedeemPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSuccess?: () => void;
}

export function RedeemPointsModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: RedeemPointsModalProps) {
  const { loyaltySettings, redeemCustomerPoints, currencySymbol } = usePharmacy();
  const [pointsToRedeem, setPointsToRedeem] = useState<string>("100");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (isOpen && customer) {
      const initialPoints = Math.min(customer.points, 100);
      setPointsToRedeem(initialPoints > 0 ? initialPoints.toString() : "0");
      setInvoiceNumber("");
      setNote("");
      setErrorMsg("");
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const pointsNum = parseInt(pointsToRedeem, 10) || 0;
  const rate = loyaltySettings.redemptionRate || 100;
  const discountValue = Number((pointsNum / rate).toFixed(2));
  const remainingPoints = customer.points - pointsNum;

  const minPoints = loyaltySettings.minRedeemPoints || 50;

  const handlePreset = (pts: number) => {
    const capped = Math.min(customer.points, pts);
    setPointsToRedeem(capped.toString());
  };

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (pointsNum <= 0) {
      setErrorMsg("Please enter a valid amount of points to redeem.");
      return;
    }
    if (pointsNum > customer.points) {
      setErrorMsg(`Customer only has ${customer.points} points available.`);
      return;
    }
    if (pointsNum < minPoints) {
      setErrorMsg(`Minimum redemption threshold is ${minPoints} points.`);
      return;
    }

    const success = redeemCustomerPoints({
      customerId: customer.id,
      pointsToRedeem: pointsNum,
      invoiceNumber: invoiceNumber.trim() || undefined,
      discountAmount: discountValue,
      reason: note.trim() || undefined,
    });

    if (success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMsg("Failed to redeem points. Please check customer balance.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#f8faf9]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Redeem Reward Points
              </h2>
              <p className="text-xs text-slate-500">
                Convert points into instant bill discount
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

        {/* Customer Balance Header */}
        <div className="p-4 bg-[#f8faf9] border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400">Customer</div>
            <div className="font-bold text-sm text-slate-900">
              {customer.name}
            </div>
            <div className="text-xs text-slate-500 font-medium">{customer.phone}</div>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-slate-400">Available Points</div>
            <div className="text-xl font-bold font-mono text-amber-600">
              {customer.points.toLocaleString()}{" "}
              <span className="text-xs font-normal text-slate-400">pts</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleRedeem} className="p-6 space-y-4 bg-white">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Quick Presets
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[100, 250, 500, customer.points].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={customer.points < preset}
                  onClick={() => handlePreset(preset)}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    pointsNum === preset
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  }`}
                >
                  {preset === customer.points ? "Max" : `${preset} pts`}
                </button>
              ))}
            </div>
          </div>

          {/* Points to Redeem Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Points to Redeem
            </label>
            <div className="relative">
              <Coins className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
              <input
                type="number"
                min={minPoints}
                max={customer.points}
                value={pointsToRedeem}
                onChange={(e) => setPointsToRedeem(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div className="text-[11px] text-slate-500">
              Conversion rate: {rate} points = {formatCurrency(1, currencySymbol)} discount (min: {minPoints} pts)
            </div>
          </div>

          {/* Discount Value Display Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-bold text-amber-100">
                Discount Provided
              </div>
              <div className="text-2xl font-bold font-mono">
                {formatCurrency(discountValue, currencySymbol)} OFF
              </div>
            </div>
            <div className="text-right text-xs text-amber-100">
              <div>Remaining Balance:</div>
              <div className="font-bold text-white text-sm font-mono">
                {Math.max(0, remainingPoints).toLocaleString()} pts
              </div>
            </div>
          </div>

          {/* Invoice / Reference */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Invoice / Receipt Reference <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2026-0105"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 placeholder-slate-400"
            />
          </div>

          {/* Action Buttons */}
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
              disabled={pointsNum <= 0 || pointsNum > customer.points}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              <span>Redeem {pointsNum} Points</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
