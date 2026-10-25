"use client";

import React, { useState } from "react";
import { Settings, X, Volume2, VolumeX, RotateCcw, Shield, Store } from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";

export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    user,
    soundEnabled,
    setSoundEnabled,
    currencySymbol,
    setCurrencySymbol,
    resetAllData,
    login,
  } = usePharmacy();

  const [storeNameInput, setStoreNameInput] = useState(user?.storeName || "Demo Pharmacy");

  const currencies = ["$", "€", "£", "৳", "₹", "AED", "SAR"];

  return (
    <>
      {/* Floating Gear Button (Fixed Bottom Right) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-11 h-11 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-full shadow-lg border border-slate-200/80 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 group"
        title="Settings & Preferences"
      >
        <Settings className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
      </button>

      {/* Settings Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-700" />
                <h2 className="text-base font-bold text-slate-900">
                  Settings & Preferences
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Store & Role Info */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Current User:</span>
                  <span className="font-semibold text-slate-800">
                    {user?.name} ({user?.role})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Store:</span>
                  <span className="font-semibold text-slate-800">
                    {user?.storeName}
                  </span>
                </div>
              </div>

              {/* Currency Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Currency Symbol
                </label>
                <div className="flex flex-wrap gap-2">
                  {currencies.map((sym) => (
                    <button
                      key={sym}
                      onClick={() => setCurrencySymbol(sym)}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                        currencySymbol === sym
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Feedback Toggle */}
              <div className="flex items-center justify-between py-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <span className="font-semibold text-slate-700 block">
                      Audio Chimes
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Tactile sound for cash drawer & clicks
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    soundEnabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      soundEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Switch Role Quick buttons */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Quick Switch Account
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => login("admin@pharmacy.com", "admin")}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      user?.role === "admin"
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Store className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-slate-800">
                        Pharmacy Admin
                      </div>
                      <div className="text-[10px] text-slate-400">admin@pharmacy.com</div>
                    </div>
                  </button>

                  <button
                    onClick={() => login("superadmin@pharmacy.com", "superadmin")}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      user?.role === "superadmin"
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Shield className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-semibold text-slate-800">
                        Platform Admin
                      </div>
                      <div className="text-[10px] text-slate-400">
                        superadmin@pharmacy.com
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Reset Demo Data Button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    if (confirm("Reset all cash drawer and shift data back to initial demo state?")) {
                      resetAllData();
                      setIsOpen(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo Data to Initial State</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
