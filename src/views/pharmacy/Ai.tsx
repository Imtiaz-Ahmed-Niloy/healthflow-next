"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bot,
  TrendingUp,
  Clock,
  LineChart,
  AlertTriangle,
  Search,
  Camera,
  Pill,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export default function AiAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"inventory" | "expiry">("inventory");
  const [inventoryAnalysisTriggered, setInventoryAnalysisTriggered] = useState(false);
  const [expiryAnalysisTriggered, setExpiryAnalysisTriggered] = useState(false);
  const [showSimulatedInventory, setShowSimulatedInventory] = useState(false);
  const [showSimulatedExpiry, setShowSimulatedExpiry] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRunInventoryAnalysis = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setInventoryAnalysisTriggered(true);
    }, 500);
  };

  const handleRunExpiryAnalysis = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setExpiryAnalysisTriggered(true);
    }, 500);
  };

  return (
    <div className="min-h-full pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/60 shadow-2xs">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Analytics</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Intelligent pharmacy management powered by AI
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200/80 mb-6">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-2 pb-3 text-xs font-semibold transition-all relative cursor-pointer ${
            activeTab === "inventory"
              ? "text-purple-700 border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Inventory Predictions</span>
        </button>

        <button
          onClick={() => setActiveTab("expiry")}
          className={`flex items-center gap-2 pb-3 text-xs font-semibold transition-all relative cursor-pointer ${
            activeTab === "expiry"
              ? "text-purple-700 border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Expiry Management</span>
        </button>
      </div>

      {/* Tab 1: Smart Inventory Predictions */}
      {activeTab === "inventory" && (
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6 mb-8">
          <div className="flex items-start gap-2.5 mb-5">
            <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-gray-900">Smart Inventory Predictions</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                AI analyzes your sales patterns to predict future demand and suggest optimal
                reorder quantities
              </p>
            </div>
          </div>

          {/* Analysis View Area */}
          <div className="rounded-xl border border-gray-200/70 bg-gray-50/40 p-10 flex flex-col items-center justify-center text-center">
            {inventoryAnalysisTriggered ? (
              /* OpenAI API key not configured banner matching target screenshot */
              <div className="flex flex-col items-center justify-center max-w-lg py-4">
                <AlertTriangle className="w-8 h-8 text-red-500 mb-2.5" />
                <h3 className="text-sm font-bold text-red-600 mb-1">
                  OpenAI API key not configured. Please configure it in AI Settings.
                </h3>
                <p className="text-xs text-gray-500 mb-5">
                  Please configure your OpenAI API key in AI Settings to use this feature.
                </p>
                <div className="flex items-center gap-3">
                  <Link
                    href="/pharmacy/ai-settings"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                  >
                    <span>Go to AI Settings</span>
                  </Link>
                  <button
                    onClick={() => setShowSimulatedInventory(!showSimulatedInventory)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>{showSimulatedInventory ? "Hide Preview" : "Preview Local Model"}</span>
                  </button>
                </div>

                {/* Simulated Model Insights if preview clicked */}
                {showSimulatedInventory && (
                  <div className="w-full mt-6 text-left bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-3">
                    <div className="text-xs font-bold text-gray-900 flex items-center justify-between">
                      <span>Simulated Demand Recommendations</span>
                      <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded">
                        Offline Model
                      </span>
                    </div>
                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex items-center justify-between p-2 rounded bg-gray-50">
                        <span>• ANTACID (100mg)</span>
                        <span className="font-semibold text-emerald-700">Reorder +60 units</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-gray-50">
                        <span>• ACETAMINOPHEN (500mg)</span>
                        <span className="font-semibold text-emerald-700">Reorder +120 units</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-gray-50">
                        <span>• ATROPINE SULFATE (1mg/mL)</span>
                        <span className="font-semibold text-gray-500">Stock optimal (687d)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Initial State */
              <div className="flex flex-col items-center justify-center max-w-md">
                <LineChart className="w-12 h-12 text-gray-300 mb-3" />
                <h3 className="text-sm font-bold text-gray-800 mb-1">AI Inventory Analysis</h3>
                <p className="text-xs text-gray-500 mb-6">
                  Get AI-powered predictions for inventory demand, reorder recommendations, and
                  stock optimization insights.
                </p>
                <button
                  onClick={handleRunInventoryAnalysis}
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Run AI Analysis</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Smart Expiry Management */}
      {activeTab === "expiry" && (
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-6 mb-8">
          <div className="flex items-start gap-2.5 mb-5">
            <Clock className="w-4 h-4 text-orange-500 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-gray-900">Smart Expiry Management</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                AI-powered recommendations for managing expiring medications and optimizing
                inventory rotation
              </p>
            </div>
          </div>

          {/* Analysis View Area */}
          <div className="rounded-xl border border-gray-200/70 bg-gray-50/40 p-10 flex flex-col items-center justify-center text-center">
            {expiryAnalysisTriggered ? (
              <div className="flex flex-col items-center justify-center max-w-lg py-4">
                <AlertTriangle className="w-8 h-8 text-red-500 mb-2.5" />
                <h3 className="text-sm font-bold text-red-600 mb-1">
                  OpenAI API key not configured. Please configure it in AI Settings.
                </h3>
                <p className="text-xs text-gray-500 mb-5">
                  Please configure your OpenAI API key in AI Settings to use this feature.
                </p>
                <div className="flex items-center gap-3">
                  <Link
                    href="/pharmacy/ai-settings"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                  >
                    <span>Go to AI Settings</span>
                  </Link>
                  <button
                    onClick={() => setShowSimulatedExpiry(!showSimulatedExpiry)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                    <span>{showSimulatedExpiry ? "Hide Preview" : "Preview Rotation Rules"}</span>
                  </button>
                </div>

                {/* Simulated Expiry Insights */}
                {showSimulatedExpiry && (
                  <div className="w-full mt-6 text-left bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-3">
                    <div className="text-xs font-bold text-gray-900 flex items-center justify-between">
                      <span>Rotation Actions (FEFO - First Expire First Out)</span>
                      <span className="text-[10px] bg-orange-50 text-orange-700 font-semibold px-2 py-0.5 rounded">
                        7 Batches At Risk
                      </span>
                    </div>
                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex items-center justify-between p-2 rounded bg-gray-50">
                        <span>• Batch BN-2024-90 (Expires in 42d)</span>
                        <span className="font-semibold text-orange-600">Apply 15% markdown</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-gray-50">
                        <span>• Batch BN-2024-71 (Expires in 65d)</span>
                        <span className="font-semibold text-blue-600">Front dispenser shelf</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center max-w-md">
                <Clock className="w-12 h-12 text-gray-300 mb-3" />
                <h3 className="text-sm font-bold text-gray-800 mb-1">AI Expiry Management</h3>
                <p className="text-xs text-gray-500 mb-6">
                  Get AI-powered recommendations for managing expiring medications, optimizing
                  inventory rotation, and reducing waste.
                </p>
                <button
                  onClick={handleRunExpiryAnalysis}
                  disabled={loading}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Run AI Analysis</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Section: Available AI Features */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 mb-4">Available AI Features</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Drug Interaction Checker */}
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-2 text-red-600 font-semibold text-xs mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Drug Interaction Checker</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Automatically detects dangerous drug interactions during sales processing
            </p>
          </div>

          {/* 2. AI Product Search */}
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs mb-1">
              <Search className="w-4 h-4" />
              <span>AI Product Search</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Natural language search for products using symptoms and medical conditions
            </p>
          </div>

          {/* 3. Prescription Processing */}
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-2 text-purple-600 font-semibold text-xs mb-1">
              <Camera className="w-4 h-4" />
              <span>Prescription Processing</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              OCR and AI to extract prescription details from images
            </p>
          </div>

          {/* 4. Medication Substitution */}
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs mb-1">
              <Pill className="w-4 h-4" />
              <span>Medication Substitution</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              AI-powered generic alternatives and cost savings recommendations
            </p>
          </div>

          {/* 5. Inventory Predictions */}
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Inventory Predictions</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Predict demand and suggest optimal reorder quantities
            </p>
          </div>

          {/* 6. Expiry Management */}
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-2 text-orange-500 font-semibold text-xs mb-1">
              <Clock className="w-4 h-4" />
              <span>Expiry Management</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Smart alerts and recommendations for expiring medications
            </p>
          </div>

          {/* 7. More Coming Soon */}
          <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs mb-1">
              <Bot className="w-4 h-4" />
              <span>More Coming Soon</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Additional AI features are being developed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

