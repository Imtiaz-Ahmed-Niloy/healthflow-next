"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  Key,
  Info,
  Check,
  AlertTriangle,
  Save,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { usePharmacySettingsQuery, useSavePharmacySettingsMutation } from "@/redux/api/pharmacy";

export default function AiSettingsPage() {
  const { data: settingsData, isLoading } = usePharmacySettingsQuery();
  const [saveSettings, { isLoading: isSaving }] = useSavePharmacySettingsMutation();

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Toggles state
  const [features, setFeatures] = useState({
    ai_assistant: true,
    ai_interactions: true,
    ai_predictions: true,
    ai_expiry: true,
    prescriptionProcessing: true,
    medicationSubstitution: true,
  });

  const [severityThreshold, setSeverityThreshold] = useState<"minor" | "moderate" | "major" | "severe">("moderate");

  useEffect(() => {
    if (settingsData?.data) {
      const s = settingsData.data;
      setFeatures({
        ai_assistant: s.ai_assistant ?? true,
        ai_interactions: s.ai_interactions ?? true,
        ai_predictions: s.ai_predictions ?? true,
        ai_expiry: s.ai_expiry ?? true,
        prescriptionProcessing: true,
        medicationSubstitution: true,
      });
      if (s.ai_interaction_level) {
        setSeverityThreshold(s.ai_interaction_level as "minor" | "moderate" | "major" | "severe");
      }
    }
  }, [settingsData]);

  const toggleFeature = (key: keyof typeof features) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      await saveSettings({
        ai_assistant: features.ai_assistant,
        ai_interactions: features.ai_interactions,
        ai_predictions: features.ai_predictions,
        ai_expiry: features.ai_expiry,
        ai_interaction_level: severityThreshold,
      }).unwrap();
      setSavedSuccess(true);
      toast.success("AI Configuration saved successfully!");
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      toast.error("Failed to save settings. Please try again.");
    }
  };

  const aiConfigured = settingsData?.ai_configured ?? true;

  return (
    <div className="min-h-full pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/60 shadow-2xs">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Configuration</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure clinical AI assistance and drug interaction safety controls
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Cloud AI Engine Integration Status Card */}
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Key className="w-4 h-4 text-blue-600" />
              <h2>Server-Side Clinical AI Engine</h2>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                aiConfigured
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-amber-50 text-amber-700 border border-amber-200/60"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {aiConfigured ? "Engine Active (Anthropic Claude)" : "Running in Local Heuristic Mode"}
            </span>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Enterprise Zero-Data-Leak Architecture</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              HealthFlow executes AI queries server-side via protected API tokens (<code>ANTHROPIC_API_KEY</code>). API keys are never stored on client devices or exposed in web bundles. Patient identities and phone numbers are scrubbed before interaction checks.
            </p>
          </div>
        </div>

        {/* AI Features Toggles Card */}
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-5">
            <Bot className="w-4 h-4 text-purple-600" />
            <h2>Clinical &amp; Inventory AI Features</h2>
          </div>

          <div className="space-y-3">
            {/* 1. Drug Interaction Checker */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200/80 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-gray-900">Drug Interaction Safety Checker</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Live checking for dangerous cross-reactions between medicines in the POS cart
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFeature("ai_interactions")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  features.ai_interactions ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    features.ai_interactions ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* 2. Pharmacy AI Assistant */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200/80 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-gray-900">Natural Language Pharmacy Assistant</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Conversational business answers on sales velocity, revenue, and stock on /pharmacy/ai-assistant
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFeature("ai_assistant")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  features.ai_assistant ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    features.ai_assistant ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* 3. Inventory Predictions */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200/80 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-gray-900">Demand Forecasting &amp; Smart Reorders</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Calculates stockout velocity and suggests quantities on Purchase Orders
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFeature("ai_predictions")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  features.ai_predictions ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    features.ai_predictions ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* 4. Smart Expiry Management */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200/80 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-orange-500 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-gray-900">Smart FEFO Expiry Tracking</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Proactive alerts for batches expiring within 90 days with return-to-supplier guidance
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFeature("ai_expiry")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  features.ai_expiry ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    features.ai_expiry ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Settings Card */}
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4">
            <SlidersHorizontal className="w-4 h-4 text-slate-700" />
            <h2>Clinical Alert Thresholds</h2>
          </div>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Drug Interaction Severity Threshold
            </label>
            <select
              value={severityThreshold}
              onChange={(e) => setSeverityThreshold(e.target.value as "minor" | "moderate" | "major" | "severe")}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg shadow-2xs focus:outline-hidden focus:border-blue-500 bg-white cursor-pointer"
            >
              <option value="minor">Minor - Flag all interactions (comprehensive)</option>
              <option value="moderate">Moderate - Flag moderate, major, and severe (recommended)</option>
              <option value="major">Major - Flag major and severe only (critical)</option>
              <option value="severe">Severe - Flag life-threatening interactions only</option>
            </select>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Determines when the cashier POS should display a safety warning modal during checkout
            </p>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Settings saved successfully!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
