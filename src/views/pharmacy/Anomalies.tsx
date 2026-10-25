"use client";

import React, { useState } from "react";
import {
  Shield,
  RotateCw,
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
} from "lucide-react";

interface Anomaly {
  id: string;
  title: string;
  description: string;
  categoryBadge: string;
  categoryBadgeColor: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  severityBadgeColor: string;
  borderLeftColor: string;
  bgColor: string;
  borderColor: string;
  affectedItems: string[];
  detectedTime: string;
}

const INITIAL_ANOMALIES: Anomaly[] = [
  {
    id: "a-1",
    title: "2 products with no sales in 90 days",
    description: "2 products still in stock but haven't sold in the last 90 days",
    categoryBadge: "Dead Stock",
    categoryBadgeColor: "bg-gray-100 text-gray-700",
    severity: "LOW",
    severityBadgeColor: "bg-blue-100 text-blue-700",
    borderLeftColor: "border-l-blue-500",
    bgColor: "bg-blue-50/25",
    borderColor: "border-blue-200/70",
    affectedItems: ["panadol", "AZSTARYS"],
    detectedTime: "10/7/2026, 3:54:10 PM",
  },
  {
    id: "a-2",
    title: "5 products with unusual volume spikes",
    description: "5 products have >3x their normal daily sales volume in the last 7 days",
    categoryBadge: "Unusual Volume",
    categoryBadgeColor: "bg-purple-100 text-purple-700",
    severity: "MEDIUM",
    severityBadgeColor: "bg-amber-100 text-amber-800",
    borderLeftColor: "border-l-amber-500",
    bgColor: "bg-amber-50/25",
    borderColor: "border-amber-200/70",
    affectedItems: [
      "ATROPINE SULFATE",
      "ACETAMINOPHEN",
      "ACTIDOM DMX",
      "ANTACID",
      "AVLAYAH",
    ],
    detectedTime: "10/7/2026, 3:54:10 PM",
  },
];

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>(INITIAL_ANOMALIES);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const handleRescan = () => {
    setIsScanning(true);
    setScanMessage("Scanning pharmacy ledger, transactions and batch turnover...");

    setTimeout(() => {
      const now = new Date();
      const timeStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}, ${now.toLocaleTimeString(
        [],
        { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }
      )}`;

      setAnomalies((prev) =>
        prev.map((a) => ({
          ...a,
          detectedTime: timeStr,
        }))
      );

      setIsScanning(false);
      setScanMessage("Scan complete. 2 anomalies identified.");
      setTimeout(() => setScanMessage(null), 3000);
    }, 900);
  };

  const totalCount = anomalies.length;
  const highCount = anomalies.filter((a) => a.severity === "HIGH").length;
  const mediumCount = anomalies.filter((a) => a.severity === "MEDIUM").length;
  const lowCount = anomalies.filter((a) => a.severity === "LOW").length;

  return (
    <div className="min-h-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100/60 shadow-2xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Anomaly Detection</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Automated scanning for unusual patterns in your pharmacy data
            </p>
          </div>
        </div>

        {/* Re-scan button */}
        <div className="flex items-center gap-3">
          {scanMessage && (
            <span className="text-xs text-emerald-600 font-medium animate-fade-in">
              {scanMessage}
            </span>
          )}
          <button
            onClick={handleRescan}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-60"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
            <span>Re-scan</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Anomalies */}
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-4">
          <div className="text-xs font-medium text-gray-500">Total Anomalies</div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight mt-1">{totalCount}</div>
        </div>

        {/* High Severity */}
        <div className="bg-white rounded-xl border border-red-200/90 shadow-2xs p-4">
          <div className="text-xs font-medium text-red-600">High Severity</div>
          <div className="text-2xl font-bold text-red-600 tracking-tight mt-1">{highCount}</div>
        </div>

        {/* Medium Severity */}
        <div className="bg-white rounded-xl border border-amber-200/90 shadow-2xs p-4">
          <div className="text-xs font-medium text-amber-600">Medium Severity</div>
          <div className="text-2xl font-bold text-amber-600 tracking-tight mt-1">
            {mediumCount}
          </div>
        </div>

        {/* Low Severity */}
        <div className="bg-white rounded-xl border border-blue-200/90 shadow-2xs p-4">
          <div className="text-xs font-medium text-blue-600">Low Severity</div>
          <div className="text-2xl font-bold text-blue-600 tracking-tight mt-1">{lowCount}</div>
        </div>
      </div>

      {/* Anomaly Cards List */}
      <div className="space-y-4">
        {anomalies.map((item) => (
          <div
            key={item.id}
            className={`border-l-4 ${item.borderLeftColor} ${item.bgColor} border ${item.borderColor} rounded-xl p-5 shadow-2xs transition-all`}
          >
            {/* Header row with icon, title, and badges */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {item.severity === "LOW" && (
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                )}
                {item.severity === "MEDIUM" && (
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                )}
                {item.severity === "HIGH" && (
                  <AlertOctagon className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight">{item.title}</h3>
                  <p className="text-xs text-gray-600 mt-0.5">{item.description}</p>
                </div>
              </div>

              {/* Badges on right */}
              <div className="flex items-center gap-2 self-start">
                <span
                  className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${item.categoryBadgeColor}`}
                >
                  {item.categoryBadge}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${item.severityBadgeColor}`}
                >
                  {item.severity}
                </span>
              </div>
            </div>

            {/* Affected items section */}
            <div className="mt-4 pt-3 border-t border-gray-200/40">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                AFFECTED ITEMS
              </div>
              <div className="flex flex-wrap gap-2">
                {item.affectedItems.map((prod, idx) => (
                  <span
                    key={idx}
                    className="inline-block bg-white border border-gray-200/90 text-gray-700 text-xs px-2.5 py-1 rounded-md shadow-2xs font-medium"
                  >
                    {prod}
                  </span>
                ))}
              </div>
            </div>

            {/* Timestamp footer */}
            <div className="text-[11px] text-gray-400 mt-3.5">
              Detected: {item.detectedTime}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

