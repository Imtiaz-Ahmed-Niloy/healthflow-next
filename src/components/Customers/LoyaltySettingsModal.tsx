"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  X,
  Coins,
  DollarSign,
  Award,
  Sparkles,
  HelpCircle,
  Save,
  RotateCcw,
} from "lucide-react";
import { LoyaltyProgramSettings } from "@/types/pharmacy";
import { usePharmacy } from "@/context/PharmacyContext";
import { initialLoyaltySettings } from "@/data/mockData";

interface LoyaltySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoyaltySettingsModal({ isOpen, onClose }: LoyaltySettingsModalProps) {
  const { loyaltySettings, updateLoyaltySettings, currencySymbol } = usePharmacy();

  const [pointsPerDollar, setPointsPerDollar] = useState<number>(1);
  const [redemptionRate, setRedemptionRate] = useState<number>(100);
  const [minRedeemPoints, setMinRedeemPoints] = useState<number>(50);

  const [silverThreshold, setSilverThreshold] = useState<number>(500);
  const [goldThreshold, setGoldThreshold] = useState<number>(1500);
  const [platinumThreshold, setPlatinumThreshold] = useState<number>(3000);

  const [bronzeMultiplier, setBronzeMultiplier] = useState<number>(1.0);
  const [silverMultiplier, setSilverMultiplier] = useState<number>(1.25);
  const [goldMultiplier, setGoldMultiplier] = useState<number>(1.5);
  const [platinumMultiplier, setPlatinumMultiplier] = useState<number>(2.0);

  useEffect(() => {
    if (isOpen) {
      setPointsPerDollar(loyaltySettings.pointsPerDollar || 1);
      setRedemptionRate(loyaltySettings.redemptionRate || 100);
      setMinRedeemPoints(loyaltySettings.minRedeemPoints || 50);

      setSilverThreshold(loyaltySettings.tierThresholds?.silver || 500);
      setGoldThreshold(loyaltySettings.tierThresholds?.gold || 1500);
      setPlatinumThreshold(loyaltySettings.tierThresholds?.platinum || 3000);

      setBronzeMultiplier(loyaltySettings.tierMultipliers?.bronze || 1.0);
      setSilverMultiplier(loyaltySettings.tierMultipliers?.silver || 1.25);
      setGoldMultiplier(loyaltySettings.tierMultipliers?.gold || 1.5);
      setPlatinumMultiplier(loyaltySettings.tierMultipliers?.platinum || 2.0);
    }
  }, [isOpen, loyaltySettings]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateLoyaltySettings({
      pointsPerDollar,
      redemptionRate,
      minRedeemPoints,
      tierThresholds: {
        bronze: 0,
        silver: silverThreshold,
        gold: goldThreshold,
        platinum: platinumThreshold,
      },
      tierMultipliers: {
        bronze: bronzeMultiplier,
        silver: silverMultiplier,
        gold: goldMultiplier,
        platinum: platinumMultiplier,
      },
    });
    onClose();
  };

  const handleResetDefaults = () => {
    updateLoyaltySettings(initialLoyaltySettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#f8faf9]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Loyalty Program Rules & Settings
              </h2>
              <p className="text-xs text-slate-500">
                Configure reward points calculation rates, tiers, and redemption values
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 bg-white">
          {/* Section 1: Points Accrual & Redemption */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-600" /> Points Earning & Redemption Rates
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#f8faf9] border border-slate-200/80 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Points per $1 Spent
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={pointsPerDollar}
                  onChange={(e) => setPointsPerDollar(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="text-[10px] text-slate-400 block">Base rate before tier bonus</span>
              </div>

              <div className="p-3 rounded-xl bg-[#f8faf9] border border-slate-200/80 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Points for $1 Discount
                </label>
                <input
                  type="number"
                  min="10"
                  required
                  value={redemptionRate}
                  onChange={(e) => setRedemptionRate(parseInt(e.target.value, 10) || 100)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="text-[10px] text-slate-400 block">
                  {redemptionRate} pts = {currencySymbol}1.00 OFF
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#f8faf9] border border-slate-200/80 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Min Points to Redeem
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={minRedeemPoints}
                  onChange={(e) => setMinRedeemPoints(parseInt(e.target.value, 10) || 50)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="text-[10px] text-slate-400 block">Minimum threshold</span>
              </div>
            </div>
          </div>

          {/* Section 2: Membership Tier Thresholds & Multipliers */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" /> Tier Thresholds & Points Multipliers
            </h3>

            <div className="space-y-2.5">
              {/* Bronze */}
              <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥉</span>
                  <div>
                    <div className="font-bold text-slate-900">Bronze Tier</div>
                    <div className="text-[10px] text-slate-500">Starting entry tier (0 pts)</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">Multiplier:</span>
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    value={bronzeMultiplier}
                    onChange={(e) => setBronzeMultiplier(parseFloat(e.target.value) || 1)}
                    className="w-20 px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-900 text-center font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <span className="text-slate-700 font-semibold">x</span>
                </div>
              </div>

              {/* Silver */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥈</span>
                  <div>
                    <div className="font-bold text-slate-900">Silver Tier</div>
                    <div className="text-[10px] text-slate-500">Threshold: {silverThreshold} pts</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Points Req:</span>
                    <input
                      type="number"
                      step="50"
                      value={silverThreshold}
                      onChange={(e) => setSilverThreshold(parseInt(e.target.value, 10) || 500)}
                      className="w-20 px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-900 text-center font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Rate:</span>
                    <input
                      type="number"
                      step="0.05"
                      value={silverMultiplier}
                      onChange={(e) => setSilverMultiplier(parseFloat(e.target.value) || 1.25)}
                      className="w-16 px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-900 text-center font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <span className="text-slate-700 font-semibold">x</span>
                  </div>
                </div>
              </div>

              {/* Gold */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥇</span>
                  <div>
                    <div className="font-bold text-slate-900">Gold Tier</div>
                    <div className="text-[10px] text-slate-500">Threshold: {goldThreshold} pts</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Points Req:</span>
                    <input
                      type="number"
                      step="50"
                      value={goldThreshold}
                      onChange={(e) => setGoldThreshold(parseInt(e.target.value, 10) || 1500)}
                      className="w-20 px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-900 text-center font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Rate:</span>
                    <input
                      type="number"
                      step="0.05"
                      value={goldMultiplier}
                      onChange={(e) => setGoldMultiplier(parseFloat(e.target.value) || 1.5)}
                      className="w-16 px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-900 text-center font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <span className="text-slate-700 font-semibold">x</span>
                  </div>
                </div>
              </div>

              {/* Platinum */}
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <div>
                    <div className="font-bold text-slate-900">Platinum Tier (VIP)</div>
                    <div className="text-[10px] text-slate-500">Threshold: {platinumThreshold} pts</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Points Req:</span>
                    <input
                      type="number"
                      step="50"
                      value={platinumThreshold}
                      onChange={(e) => setPlatinumThreshold(parseInt(e.target.value, 10) || 3000)}
                      className="w-20 px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-900 text-center font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Rate:</span>
                    <input
                      type="number"
                      step="0.05"
                      value={platinumMultiplier}
                      onChange={(e) => setPlatinumMultiplier(parseFloat(e.target.value) || 2.0)}
                      className="w-16 px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-900 text-center font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <span className="text-slate-700 font-semibold">x</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Loyalty Rules</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
