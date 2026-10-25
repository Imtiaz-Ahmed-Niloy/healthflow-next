"use client";

import React from "react";
import {
  AlertTriangle,
  ShieldAlert,
  X,
  CheckCircle2,
  Stethoscope,
  Info,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { ClinicalAlert } from "@/lib/clinicalSafety";

interface ClinicalInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: ClinicalAlert[];
  onConfirmOverride: () => void;
}

export const ClinicalInteractionModal: React.FC<ClinicalInteractionModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onConfirmOverride,
}) => {
  if (!isOpen || alerts.length === 0) return null;

  const hasHighSeverity = alerts.some((a) => a.severity === "high");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between text-white ${
            hasHighSeverity ? "bg-rose-700" : "bg-amber-600"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Clinical Drug-Drug Interaction Warning
              </h3>
              <p className="text-xs text-white/90">
                {alerts.length} potential medication {alerts.length === 1 ? "interaction" : "interactions"} detected in current cart
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div
          className={`px-6 py-3 border-b text-xs flex items-center gap-2.5 ${
            hasHighSeverity
              ? "bg-rose-50 border-rose-100 text-rose-900 font-semibold"
              : "bg-amber-50 border-amber-100 text-amber-900 font-medium"
          }`}
        >
          <AlertTriangle
            className={`w-4 h-4 shrink-0 ${
              hasHighSeverity ? "text-rose-600" : "text-amber-600"
            }`}
          />
          <span>
            {hasHighSeverity
              ? "High clinical risk detected. Review interaction mechanism and clinical recommendations before dispensing."
              : "Moderate clinical interaction detected. Exercise pharmacist judgement."}
          </span>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5 bg-slate-50/50">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all ${
                alert.severity === "high"
                  ? "bg-white border-rose-200 shadow-2xs ring-1 ring-rose-100"
                  : "bg-white border-amber-200 shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    alert.severity === "high"
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}
                >
                  {alert.severity === "high" ? "Major Clinical Risk" : "Moderate Precaution"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Alert #{idx + 1}</span>
              </div>

              <h4 className="font-bold text-sm text-slate-900 mb-1">
                {alert.title}
              </h4>

              <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
                {alert.description}
              </p>

              {alert.recommendation && (
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5 text-xs text-emerald-950 flex items-start gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-900">Clinical Recommendation: </span>
                    <span>{alert.recommendation}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer / Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Modify Cart Items
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirmOverride();
              onClose();
            }}
            className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 ${
              hasHighSeverity
                ? "bg-rose-700 hover:bg-rose-800"
                : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Pharmacist Clinical Override & Proceed</span>
          </button>
        </div>
      </div>
    </div>
  );
};
