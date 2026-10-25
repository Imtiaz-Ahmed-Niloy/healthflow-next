"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Building2,
  Percent,
  Coins,
  Calculator,
  RotateCcw,
  Check,
  X,
  Store,
  Info,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  type EarningsCalculationSettings,
  type FacilityCalculationSetting,
  DEFAULT_EARNINGS_CALCULATION_SETTINGS,
  calculateConsultationSettlement,
} from "@/lib/portal/earningsSettings";

interface EarningsCalculationSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: EarningsCalculationSettings;
  facilities: FacilityCalculationSetting[];
  onSave: (updated: EarningsCalculationSettings) => Promise<boolean>;
  formatTk: (amount: number) => string;
}

export function EarningsCalculationSettingsModal({
  open,
  onClose,
  settings: initialSettings,
  facilities,
  onSave,
  formatTk,
}: EarningsCalculationSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"global" | "facilities" | "simulator">("global");
  const [draft, setDraft] = useState<EarningsCalculationSettings>(initialSettings);
  const [saving, setSaving] = useState(false);

  // Simulator test inputs
  const [simFee, setSimFee] = useState<number>(1000);
  const [simFacilityId, setSimFacilityId] = useState<string>("global");

  useEffect(() => {
    if (open) {
      setDraft(JSON.parse(JSON.stringify(initialSettings)));
      setActiveTab("global");
    }
  }, [open, initialSettings]);

  if (!open) return null;

  const handleGlobalShareChange = (val: number) => {
    setDraft((prev) => ({
      ...prev,
      default_doctor_share_percentage: Math.max(0, Math.min(100, val)),
    }));
  };

  const handleGlobalFeeChange = (val: number) => {
    setDraft((prev) => ({
      ...prev,
      default_consultation_fee: Math.max(0, val),
    }));
  };

  const handleFacilityDeductionChange = (val: number) => {
    setDraft((prev) => ({
      ...prev,
      facility_deduction: Math.max(0, val),
    }));
  };

  const handleTaxPctChange = (val: number) => {
    setDraft((prev) => ({
      ...prev,
      tax_deduction_percentage: Math.max(0, Math.min(100, val)),
    }));
  };

  const toggleFacilityOverride = (tenantId: string, facilityName: string, kind?: string, defaultFee?: number) => {
    setDraft((prev) => {
      const existing = prev.facilities[tenantId] ?? {
        tenant_id: tenantId,
        facility_name: facilityName,
        kind,
        consultation_fee: defaultFee || prev.default_consultation_fee,
        doctor_share_percentage: kind === "chamber" ? 100 : prev.default_doctor_share_percentage,
        facility_deduction: prev.facility_deduction,
        override_global: false,
      };

      return {
        ...prev,
        facilities: {
          ...prev.facilities,
          [tenantId]: {
            ...existing,
            override_global: !existing.override_global,
          },
        },
      };
    });
  };

  const updateFacilitySetting = (tenantId: string, patch: Partial<FacilityCalculationSetting>) => {
    setDraft((prev) => {
      const existing = prev.facilities[tenantId] || {
        tenant_id: tenantId,
        facility_name: "Facility",
        consultation_fee: prev.default_consultation_fee,
        doctor_share_percentage: prev.default_doctor_share_percentage,
        facility_deduction: prev.facility_deduction,
        override_global: true,
      };

      return {
        ...prev,
        facilities: {
          ...prev.facilities,
          [tenantId]: {
            ...existing,
            ...patch,
          },
        },
      };
    });
  };

  const applyPreset = (preset: "hospital_80" | "chamber_100" | "associate_70") => {
    if (preset === "hospital_80") {
      setDraft((prev) => ({
        ...prev,
        default_doctor_share_percentage: 80,
        default_consultation_fee: 500,
        facility_deduction: 0,
        tax_deduction_percentage: 0,
      }));
    } else if (preset === "chamber_100") {
      setDraft((prev) => ({
        ...prev,
        default_doctor_share_percentage: 100,
        default_consultation_fee: 1000,
        facility_deduction: 50,
        tax_deduction_percentage: 0,
      }));
    } else if (preset === "associate_70") {
      setDraft((prev) => ({
        ...prev,
        default_doctor_share_percentage: 70,
        default_consultation_fee: 800,
        facility_deduction: 0,
        tax_deduction_percentage: 5,
      }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const ok = await onSave(draft);
      if (ok) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(JSON.parse(JSON.stringify(DEFAULT_EARNINGS_CALCULATION_SETTINGS)));
  };

  // Simulator calculation
  const simResult = calculateConsultationSettlement(
    simFee,
    simFacilityId === "global" ? null : simFacilityId,
    draft
  );

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative bg-card rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-border/70 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-border/50 bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Sliders className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                Calculation & Fee Settings
              </h2>
              <p className="text-xs text-muted-foreground">
                Set doctor revenue splits, consultation fees, and facility deductions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Presets Strip */}
        <div className="px-6 py-2.5 bg-muted/40 border-b border-border/40 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-600" />
            Quick Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset("hospital_80")}
            className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors ${
              draft.default_doctor_share_percentage === 80 && draft.tax_deduction_percentage === 0
                ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            Standard Hospital (80/20)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("chamber_100")}
            className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors ${
              draft.default_doctor_share_percentage === 100
                ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            Solo Chamber (100% Payout)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("associate_70")}
            className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors ${
              draft.default_doctor_share_percentage === 70 && draft.tax_deduction_percentage === 5
                ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            Associate (70% + 5% TDS)
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-border/40">
          <button
            type="button"
            onClick={() => setActiveTab("global")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "global"
                ? "border-emerald-600 text-emerald-700 font-extrabold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Global Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("facilities")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "facilities"
                ? "border-emerald-600 text-emerald-700 font-extrabold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Workplace Overrides ({facilities.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("simulator")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "simulator"
                ? "border-emerald-600 text-emerald-700 font-extrabold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calculator className="h-3.5 w-3.5" />
            Live Simulator
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: Global Rules */}
          {activeTab === "global" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Doctor Share Percentage */}
              <div className="rounded-2xl border border-border/80 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Percent className="h-4 w-4 text-emerald-600" />
                      Doctor Revenue Share (%)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Percentage of the consultation fee credited to you
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-border px-3 py-1 rounded-xl shadow-xs">
                    <span className="font-extrabold text-lg text-emerald-700">
                      {draft.default_doctor_share_percentage}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Slider
                    value={[draft.default_doctor_share_percentage]}
                    max={100}
                    min={0}
                    step={5}
                    onValueChange={(val) => handleGlobalShareChange(val[0] ?? 80)}
                    className="py-1"
                  />
                </div>

                {/* Quick Split Bar */}
                <div className="h-2 w-full rounded-full overflow-hidden bg-slate-200 flex">
                  <div
                    style={{ width: `${draft.default_doctor_share_percentage}%` }}
                    className="bg-emerald-600 transition-all duration-300"
                  />
                  <div
                    style={{ width: `${100 - draft.default_doctor_share_percentage}%` }}
                    className="bg-blue-600/70 transition-all duration-300"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                  <span className="text-emerald-700 font-bold">
                    Doctor Share: {draft.default_doctor_share_percentage}%
                  </span>
                  <span className="text-blue-700 font-bold">
                    Hospital Cut: {100 - draft.default_doctor_share_percentage}%
                  </span>
                </div>

                {/* Quick Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[60, 70, 75, 80, 85, 90, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleGlobalShareChange(pct)}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border transition-all ${
                        draft.default_doctor_share_percentage === pct
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-muted-foreground border-border hover:bg-slate-100"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Consultation Fee & Facility Overhead */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Default Consultation Fee */}
                <div className="rounded-2xl border border-border/80 bg-slate-50/70 p-4 space-y-2.5">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-emerald-600" />
                    Default Consultation Fee
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Baseline fee when none is specified
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">৳</span>
                    <Input
                      type="number"
                      min={0}
                      step={50}
                      value={draft.default_consultation_fee}
                      onChange={(e) => handleGlobalFeeChange(Number(e.target.value) || 0)}
                      className="pl-8 bg-white font-bold text-foreground"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[500, 800, 1000, 1200, 1500].map((fee) => (
                      <button
                        key={fee}
                        type="button"
                        onClick={() => handleGlobalFeeChange(fee)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                          draft.default_consultation_fee === fee
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-muted-foreground border-border hover:bg-slate-100"
                        }`}
                      >
                        ৳{fee}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Facility / Overhead Deduction */}
                <div className="rounded-2xl border border-border/80 bg-slate-50/70 p-4 space-y-2.5">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-slate-600" />
                    Facility Cut / Overhead (৳)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Fixed utility/reception fee per visit
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">৳</span>
                    <Input
                      type="number"
                      min={0}
                      step={10}
                      value={draft.facility_deduction}
                      onChange={(e) => handleFacilityDeductionChange(Number(e.target.value) || 0)}
                      className="pl-8 bg-white font-bold text-foreground"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[0, 30, 50, 100].map((ded) => (
                      <button
                        key={ded}
                        type="button"
                        onClick={() => handleFacilityDeductionChange(ded)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                          draft.facility_deduction === ded
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-muted-foreground border-border hover:bg-slate-100"
                        }`}
                      >
                        ৳{ded}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tax / TDS Rate */}
              <div className="rounded-2xl border border-border/80 bg-slate-50/70 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      TDS Withholding Tax Rate (%)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Section 52 Tax Deducted at Source for professional doctor payments
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-border px-3 py-1 rounded-xl shadow-xs">
                    <span className="font-extrabold text-base text-amber-700">
                      {draft.tax_deduction_percentage}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[0, 5, 10, 12].map((tax) => (
                    <button
                      key={tax}
                      type="button"
                      onClick={() => handleTaxPctChange(tax)}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border transition-colors ${
                        draft.tax_deduction_percentage === tax
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-muted-foreground border-border hover:bg-slate-100"
                      }`}
                    >
                      {tax}% TDS
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Workplace Overrides */}
          {activeTab === "facilities" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Set customized consultation fees and revenue splits for specific chambers or hospitals:
              </p>

              {facilities.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground italic border border-dashed rounded-2xl">
                  No workplace facilities found linked to your account.
                </div>
              ) : (
                facilities.map((f) => {
                  const setting = draft.facilities[f.tenant_id] || {
                    tenant_id: f.tenant_id,
                    facility_name: f.facility_name,
                    kind: f.kind,
                    consultation_fee: f.consultation_fee,
                    doctor_share_percentage: f.kind === "chamber" ? 100 : draft.default_doctor_share_percentage,
                    facility_deduction: draft.facility_deduction,
                    override_global: false,
                  };

                  const isChamber = f.kind === "chamber";
                  const isOverride = setting.override_global;

                  return (
                    <div
                      key={f.tenant_id}
                      className={`rounded-2xl border p-4 transition-all ${
                        isOverride
                          ? "border-emerald-400 bg-emerald-50/30 shadow-xs"
                          : "border-border/80 bg-slate-50/50"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-border/40">
                        <div className="flex items-center gap-2">
                          <span
                            className={`p-1.5 rounded-lg ${
                              isChamber ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {isChamber ? <Store className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                          </span>
                          <div>
                            <h4 className="font-bold text-sm text-foreground">{f.facility_name}</h4>
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                isChamber ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {isChamber ? "Chamber (Self-managed)" : "Hospital / Clinic"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`override-${f.tenant_id}`}
                            className="text-xs font-semibold cursor-pointer text-muted-foreground"
                          >
                            Custom Override:
                          </Label>
                          <Switch
                            id={`override-${f.tenant_id}`}
                            checked={isOverride}
                            onCheckedChange={() =>
                              toggleFacilityOverride(f.tenant_id, f.facility_name, f.kind, f.consultation_fee)
                            }
                          />
                        </div>
                      </div>

                      {isOverride ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                          <div>
                            <Label className="text-[11px] font-semibold text-muted-foreground">
                              Consultation Fee (৳)
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              step={50}
                              value={setting.consultation_fee}
                              onChange={(e) =>
                                updateFacilitySetting(f.tenant_id, {
                                  consultation_fee: Number(e.target.value) || 0,
                                })
                              }
                              className="mt-1 h-8 text-xs font-bold bg-white"
                            />
                            {isChamber && (
                              <p className="text-[10px] text-emerald-700 mt-1">
                                ✓ Syncs directly to your chamber profile
                              </p>
                            )}
                          </div>

                          <div>
                            <Label className="text-[11px] font-semibold text-muted-foreground">
                              Doctor Share (%)
                            </Label>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={setting.doctor_share_percentage}
                                onChange={(e) =>
                                  updateFacilitySetting(f.tenant_id, {
                                    doctor_share_percentage: Number(e.target.value) || 0,
                                  })
                                }
                                className="h-8 text-xs font-bold bg-white"
                              />
                              <span className="text-xs font-bold text-muted-foreground">%</span>
                            </div>
                          </div>

                          <div>
                            <Label className="text-[11px] font-semibold text-muted-foreground">
                              Facility Deduction (৳)
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              step={10}
                              value={setting.facility_deduction}
                              onChange={(e) =>
                                updateFacilitySetting(f.tenant_id, {
                                  facility_deduction: Number(e.target.value) || 0,
                                })
                              }
                              className="mt-1 h-8 text-xs font-bold bg-white"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 text-xs text-muted-foreground flex items-center justify-between">
                          <span>Inheriting global rules:</span>
                          <span className="font-semibold text-foreground">
                            {draft.default_doctor_share_percentage}% Share · ৳{f.consultation_fee || draft.default_consultation_fee} Fee
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* TAB 3: Live Simulator */}
          {activeTab === "simulator" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="rounded-2xl border border-border/80 bg-slate-50/70 p-4 space-y-3">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-emerald-600" />
                  Test Consultation Settlement
                </h4>
                <p className="text-xs text-muted-foreground">
                  Simulate exact payout for a given patient consultation fee using your active rules
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Test Patient Fee (৳)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={simFee}
                      onChange={(e) => setSimFee(Number(e.target.value) || 0)}
                      className="mt-1 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Apply Rules Of:</Label>
                    <select
                      value={simFacilityId}
                      onChange={(e) => setSimFacilityId(e.target.value)}
                      className="mt-1 w-full h-9 rounded-md border border-input bg-white px-3 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="global">Global Default Rules</option>
                      {facilities.map((f) => (
                        <option key={f.tenant_id} value={f.tenant_id}>
                          {f.facility_name} ({f.kind === "chamber" ? "Chamber" : "Hospital"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Simulation Result Breakdown Card */}
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-300">Net Doctor Take-Home Payout</p>
                    <h3 className="font-display text-3xl font-black text-emerald-400 mt-0.5">
                      {formatTk(simResult.net_doctor_payout)}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {simResult.share_percentage}% Effective Split
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Hospital/Facility: {formatTk(simResult.hospital_cut)}
                    </p>
                  </div>
                </div>

                {/* Waterfall breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-300">Base Consultation Fee:</span>
                    <span className="font-bold text-white">{formatTk(simResult.fee)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-300">Gross Doctor Share ({simResult.share_percentage}%):</span>
                    <span className="font-bold text-emerald-400">+{formatTk(simResult.gross_doctor_share)}</span>
                  </div>
                  {simResult.facility_deduction > 0 && (
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-300">Facility / Overhead Cut:</span>
                      <span className="font-bold text-rose-300">-{formatTk(simResult.facility_deduction)}</span>
                    </div>
                  )}
                  {simResult.tax_deduction > 0 && (
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-300">Tax Withholding (TDS):</span>
                      <span className="font-bold text-amber-300">-{formatTk(simResult.tax_deduction)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 text-sm font-black text-white">
                    <span>Net Take-Home:</span>
                    <span className="text-emerald-300">{formatTk(simResult.net_doctor_payout)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border/50 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save Calculation Settings
            </Button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
