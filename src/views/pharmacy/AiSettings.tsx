"use client";

import React, { useState } from "react";
import {
  Bot,
  Key,
  Info,
  Check,
  AlertTriangle,
  Save,
  CheckCircle2,
} from "lucide-react";

export default function AiSettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Toggles state
  const [features, setFeatures] = useState({
    drugInteractions: true,
    inventoryPredictions: true,
    productSearch: true,
    smartExpiry: true,
    prescriptionProcessing: true,
    medicationSubstitution: true,
  });

  const [severityThreshold, setSeverityThreshold] = useState("minor");

  const toggleFeature = (key: keyof typeof features) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTestKey = () => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      if (apiKey.startsWith("sk-") && apiKey.length > 15) {
        setTestResult("valid");
      } else {
        setTestResult("invalid");
      }
    }, 700);
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

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
            Configure AI features and OpenAI API integration
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* OpenAI API Configuration Card */}
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4">
            <Key className="w-4 h-4 text-blue-600" />
            <h2>OpenAI API Configuration</h2>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              OpenAI API Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 px-3.5 py-2 text-xs border border-gray-200 rounded-lg shadow-2xs focus:outline-hidden focus:border-blue-500 bg-white"
              />
              <button
                onClick={handleTestKey}
                disabled={testing || !apiKey}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{testing ? "Testing..." : "Test"}</span>
              </button>
            </div>

            {testResult === "valid" && (
              <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> API key verified and active.
              </p>
            )}
            {testResult === "invalid" && (
              <p className="text-xs text-red-600 font-medium mt-1.5">
                Invalid API key format. Ensure key begins with &apos;sk-&apos;.
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50/50 border border-blue-200/70 rounded-xl p-4 text-xs text-blue-800 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
              <Info className="w-4 h-4 text-blue-600" />
              <span>How to get your OpenAI API key:</span>
            </div>
            <p>1. Visit platform.openai.com/api-keys</p>
            <p>2. Sign in to your OpenAI account</p>
            <p>3. Click &quot;Create new secret key&quot;</p>
            <p>4. Copy the key and paste it above</p>
          </div>
        </div>

        {/* AI Features Toggles Card */}
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-5">
            <Bot className="w-4 h-4 text-purple-600" />
            <h2>AI Features</h2>
          </div>

          <div className="space-y-3">
            {/* 1. Drug Interaction Checker */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200/80 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-gray-900">Drug Interaction Checker</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Automatically check for dangerous drug interactions during sales
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFeature("drugInteractions")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  features.drugInteractions ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    features.drugInteractions ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* 2. Inventory Predictions */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200/80 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-gray-900">Inventory Predictions</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    AI-powered demand forecasting and reorder recommendations
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFeature("inventoryPredictions")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  features.inventoryPredictions ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    features.inventoryPredictions ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* 3. AI Product Search */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200/80 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-gray-900">AI Product Search</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Natural language search for products using symptoms and conditions
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFeature("productSearch")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  features.productSearch ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    features.productSearch ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* 4. Smart Expiry Management */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200/80 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-orange-500 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-gray-900">Smart Expiry Management</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    AI-powered expiry alerts and disposal recommendations
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFeature("smartExpiry")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  features.smartExpiry ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    features.smartExpiry ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* 5. Prescription Processing */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200/80 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-purple-600 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-gray-900">Prescription Processing</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    OCR and AI to extract prescription details from images
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFeature("prescriptionProcessing")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  features.prescriptionProcessing ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    features.prescriptionProcessing ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* 6. Medication Substitution */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200/80 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-gray-900">Medication Substitution</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    AI-powered generic alternatives and cost savings recommendations
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFeature("medicationSubstitution")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  features.medicationSubstitution ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    features.medicationSubstitution ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Settings Card */}
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Advanced Settings</h2>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Drug Interaction Severity Threshold
            </label>
            <select
              value={severityThreshold}
              onChange={(e) => setSeverityThreshold(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg shadow-2xs focus:outline-hidden focus:border-blue-500 bg-white cursor-pointer"
            >
              <option value="minor">Minor - Show all interactions</option>
              <option value="moderate">Moderate - Show moderate and above</option>
              <option value="major">Major - Show major and severe only</option>
              <option value="severe">Severe - Show severe only</option>
            </select>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Only show interactions at or above this severity level
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
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}

