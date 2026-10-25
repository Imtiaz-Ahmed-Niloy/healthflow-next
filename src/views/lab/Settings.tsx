"use client";

import React, { useState } from "react";
import {
  Settings,
  ShieldCheck,
  Building2,
  Clock,
  AlertTriangle,
  FileText,
  Printer,
  Save,
  CheckCircle2,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { toast } from "sonner";

export default function LabSettingsView() {
  const [labName, setLabName] = useState("Central Hospital Pathology & Diagnostic Laboratory");
  const [accreditation, setAccreditation] = useState("ISO 15189:2022 Accredited (Reg: LAB-DH-2026-904)");
  const [statTat, setStatTat] = useState("60");
  const [routineTat, setRoutineTat] = useState("240");
  const [autoNotifyDoctor, setAutoNotifyDoctor] = useState(true);
  const [leadPathologist, setLeadPathologist] = useState("Dr. Farhana Yasmin, MBBS, FCPS (Pathology)");
  const [headTechnologist, setHeadTechnologist] = useState("Md. Kabir Hossain, BSc (Medical Lab Tech)");
  const [labelFormat, setLabelFormat] = useState("50x25mm Thermal Barcode");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Laboratory configuration settings saved successfully!");
  };

  return (
    <LabLayout
      title="Laboratory Configuration"
      subtitle="Accreditation credentials, critical value notification rules, report sign-offs & printing defaults"
    >
      <form onSubmit={handleSave} className="max-w-4xl space-y-6">
        {/* Lab Profile */}
        <div className="p-6 rounded-2xl bg-card border border-border/70 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm border-b border-border/60 pb-3">
            <Building2 className="h-4 w-4" /> Laboratory Identity & Accreditation
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Official Laboratory Facility Name</label>
              <input
                type="text"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Accreditation & License Numbers</label>
              <input
                type="text"
                value={accreditation}
                onChange={(e) => setAccreditation(e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Turnaround Time (TAT) Targets */}
        <div className="p-6 rounded-2xl bg-card border border-border/70 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm border-b border-border/60 pb-3">
            <Clock className="h-4 w-4" /> Turnaround Time (TAT) Targets
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">STAT / Emergency Orders Target (Minutes)</label>
              <input
                type="number"
                value={statTat}
                onChange={(e) => setStatTat(e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Alerts if sample exceeds this duration.</p>
            </div>

            <div>
              <label className="block font-semibold mb-1">Routine Orders Target (Minutes)</label>
              <input
                type="number"
                value={routineTat}
                onChange={(e) => setRoutineTat(e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Standard OPD outpatient target.</p>
            </div>
          </div>
        </div>

        {/* Critical Value Alerts */}
        <div className="p-6 rounded-2xl bg-card border border-border/70 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm border-b border-border/60 pb-3">
            <AlertTriangle className="h-4 w-4" /> Critical & Panic Value Alert Rules
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoNotifyDoctor}
                onChange={(e) => setAutoNotifyDoctor(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-primary/30"
              />
              <div>
                <span className="font-semibold text-foreground">
                  Instantly notify referring doctor upon Critical (Panic) result entry
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Triggers SMS and high-priority in-app alert to the ordering physician or ward station.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Signatures & Report Presets */}
        <div className="p-6 rounded-2xl bg-card border border-border/70 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm border-b border-border/60 pb-3">
            <FileText className="h-4 w-4" /> Diagnostic Report Signatories & Presets
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">Consultant Pathologist (Authorized Signatory)</label>
              <input
                type="text"
                value={leadPathologist}
                onChange={(e) => setLeadPathologist(e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Chief Medical Technologist</label>
              <input
                type="text"
                value={headTechnologist}
                onChange={(e) => setHeadTechnologist(e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <Save className="h-4 w-4" />
            Save Configuration
          </button>
        </div>
      </form>
    </LabLayout>
  );
}
