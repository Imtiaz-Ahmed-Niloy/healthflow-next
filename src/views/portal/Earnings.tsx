"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  Calendar,
  Building2,
  Users,
  Download,
  Printer,
  ArrowUpRight,
  Receipt,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Sliders,
  Store,
  Percent,
  Search,
  Filter,
  Coins,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  X,
  ChevronDown,
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useFormatters } from "@/lib/appSettings";
import {
  type EarningsCalculationSettings,
  type FacilityCalculationSetting,
  DEFAULT_EARNINGS_CALCULATION_SETTINGS,
  EARNINGS_SETTINGS_STORAGE_KEY,
} from "@/lib/portal/earningsSettings";
import { EarningsCalculationSettingsModal } from "@/components/portal/EarningsCalculationSettingsModal";
import { DateRangeFilterPopover, type DateFilterPreset } from "@/components/portal/DateRangeFilterPopover";
import { FacilityFilterPopover } from "@/components/portal/FacilityFilterPopover";

interface EarningsSummary {
  total_earnings: number;
  doctor_share: number;
  hospital_share?: number;
  today_earnings: number;
  today_doctor_share?: number;
  week_earnings: number;
  week_doctor_share?: number;
  month_earnings: number;
  month_doctor_share?: number;
  total_patients: number;
  today_patients: number;
  week_patients: number;
  month_patients: number;
}

interface PlaceBreakdown {
  place_id: string;
  place_name: string;
  kind?: string;
  count: number;
  total_fee: number;
  doctor_share: number;
  hospital_cut?: number;
  share_percentage?: number;
  consultation_fee?: number;
}

interface LedgerItem {
  appointment_id: string;
  date: string;
  patient_name: string;
  patient_mrn: string;
  hospital_name: string;
  tenant_id?: string;
  fee: number;
  doctor_share: number;
  gross_doctor_share?: number;
  facility_deduction?: number;
  tax_deduction?: number;
  share_percentage?: number;
  settlement_status: string;
}

export function Earnings() {
  const { formatCurrency } = useFormatters();
  const formatTk = (amount: number) => formatCurrency(amount);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [places, setPlaces] = useState<PlaceBreakdown[]>([]);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [facilities, setFacilities] = useState<FacilityCalculationSetting[]>([]);

  // Calculation Fee Settings state
  const [settings, setSettings] = useState<EarningsCalculationSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(EARNINGS_SETTINGS_STORAGE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return DEFAULT_EARNINGS_CALCULATION_SETTINGS;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Filters
  const [selectedPlace, setSelectedPlace] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/portal/earnings");
      const body = await res.json().catch(() => null);
      if (res.ok && body?.data) {
        setSummary(body.data.summary);
        setPlaces(body.data.places ?? []);
        setLedger(body.data.ledger ?? []);
        if (body.data.settings) {
          setSettings(body.data.settings);
          try {
            localStorage.setItem(EARNINGS_SETTINGS_STORAGE_KEY, JSON.stringify(body.data.settings));
          } catch {}
        }
        if (body.data.facilities) {
          setFacilities(body.data.facilities);
        }
      }
    } catch (err) {
      console.error("Failed to load earnings:", err);
      toast.error("Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEarnings();
  }, []);

  const handleSaveSettings = async (updated: EarningsCalculationSettings): Promise<boolean> => {
    try {
      // Optimistically update localStorage and state
      localStorage.setItem(EARNINGS_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      setSettings(updated);

      const res = await fetch("/api/v1/portal/earnings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error("Failed to persist settings on server", { description: body?.error?.message });
        return false;
      }

      toast.success("Calculation fees & settlement rules applied!");
      await loadEarnings();
      return true;
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast.error("Failed to save settings");
      return false;
    }
  };

  const filteredLedger = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterdayStr = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
    const sevenDaysAgoStr = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    return ledger.filter((item) => {
      // Facility filter
      const matchesPlace = selectedPlace === "all" || item.hospital_name === selectedPlace;

      // Text search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.patient_name.toLowerCase().includes(q) ||
        item.patient_mrn.toLowerCase().includes(q) ||
        item.hospital_name.toLowerCase().includes(q);

      // Date filter
      let matchesDate = true;
      if (dateFilter === "today") {
        matchesDate = item.date === todayStr;
      } else if (dateFilter === "yesterday") {
        matchesDate = item.date === yesterdayStr;
      } else if (dateFilter === "last7days") {
        matchesDate = item.date >= sevenDaysAgoStr && item.date <= todayStr;
      } else if (dateFilter === "thisMonth") {
        matchesDate = item.date >= monthStartStr && item.date <= todayStr;
      } else if (dateFilter === "custom") {
        if (startDate && item.date < startDate) matchesDate = false;
        if (endDate && item.date > endDate) matchesDate = false;
      }

      return matchesPlace && matchesSearch && matchesDate;
    });
  }, [ledger, selectedPlace, searchQuery, dateFilter, startDate, endDate]);

  const filteredTotals = useMemo(() => {
    return filteredLedger.reduce(
      (acc, row) => {
        acc.total_fee += row.fee || 0;
        acc.doctor_share += row.doctor_share || 0;
        acc.deductions += (row.facility_deduction ?? 0) + (row.tax_deduction ?? 0);
        return acc;
      },
      { total_fee: 0, doctor_share: 0, deductions: 0 }
    );
  }, [filteredLedger]);

  const exportCSV = () => {
    if (!filteredLedger.length) {
      toast.error("No consultation records found matching filter to export");
      return;
    }
    const headers = [
      "Date,Patient Name,MRN,Clinic/Hospital,Total Fee,Doctor Share %,Deductions,Doctor Net Payout,Status",
    ];
    const rows = filteredLedger.map((l) => {
      const deductions = (l.facility_deduction ?? 0) + (l.tax_deduction ?? 0);
      return `"${l.date}","${l.patient_name}","${l.patient_mrn}","${l.hospital_name}",${l.fee},"${
        l.share_percentage ?? settings.default_doctor_share_percentage
      }%",${deductions},${l.doctor_share},"${l.settlement_status}"`;
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `doctor_earnings_statement_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Statement downloaded successfully (CSV)");
  };

  // Count custom workplace overrides
  const customOverridesCount = Object.values(settings.facilities ?? {}).filter(
    (f) => f.override_global
  ).length;

  // Effective take-home %
  const effectiveSharePct =
    summary?.total_earnings && summary.total_earnings > 0
      ? Math.round((summary.doctor_share / summary.total_earnings) * 100)
      : settings.default_doctor_share_percentage;

  return (
    <PortalLayout>
      <div className="space-y-8 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-xs">
                <Wallet className="h-4 w-4" />
              </span>
              <h1 className="font-display text-2xl font-bold text-primary">
                Earnings
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time consultation revenue, chamber fee shares, and financial reconciliation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
            >
              <Sliders className="h-3.5 w-3.5" />
              Calculation Settings
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="gap-1.5 text-xs border-border"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Export Statement
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs border-border"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              Print
            </Button>
          </div>
        </div>

        {/* Active Calculation Fee Settings Banner Strip */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-slate-50 border border-emerald-200/70 shadow-xs"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-900 bg-white/80 px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
              <Sliders className="h-3.5 w-3.5 text-emerald-700" />
              Active Fee Rules:
            </span>
            <span className="text-slate-700 font-medium">
              Doctor Share:{" "}
              <strong className="text-emerald-800 font-bold">
                {settings.default_doctor_share_percentage}%
              </strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-700 font-medium">
              Default Fee:{" "}
              <strong className="text-slate-900 font-bold">
                {formatTk(settings.default_consultation_fee)}
              </strong>
            </span>
            {settings.facility_deduction > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-700 font-medium">
                  Facility Cut:{" "}
                  <strong className="text-rose-700 font-bold">
                    {formatTk(settings.facility_deduction)}/visit
                  </strong>
                </span>
              </>
            )}
            {settings.tax_deduction_percentage > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-700 font-medium">
                  TDS:{" "}
                  <strong className="text-amber-700 font-bold">
                    {settings.tax_deduction_percentage}%
                  </strong>
                </span>
              </>
            )}
            {customOverridesCount > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                  {customOverridesCount} Workplace Override{customOverridesCount > 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 group whitespace-nowrap"
          >
            Adjust Calculation Fees
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </motion.div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Revenue & Net Doctor Share */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-800 text-white p-6 shadow-md relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
              <Wallet className="h-36 w-36" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                Total Patient Revenue
              </p>
              <h3 className="font-display text-3xl font-extrabold mt-2 tracking-tight">
                {formatTk(summary?.total_earnings ?? 0)}
              </h3>
            </div>
            <div className="mt-4 pt-3 border-t border-white/20 text-xs text-emerald-100 space-y-1">
              <div className="flex items-center justify-between">
                <span>Doctor Net Share ({effectiveSharePct}%):</span>
                <span className="font-bold text-white text-sm">
                  {formatTk(summary?.doctor_share ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-200/80">
                <span>Hospital/Clinic Retained:</span>
                <span>
                  {formatTk(
                    summary?.hospital_share ??
                      (summary?.total_earnings ? summary.total_earnings - summary.doctor_share : 0)
                  )}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Today's Earnings */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl bg-card border border-border/80 p-6 shadow-soft flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Today's Revenue
                </p>
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <h3 className="font-display text-2xl font-bold text-primary mt-2">
                {formatTk(summary?.today_earnings ?? 0)}
              </h3>
            </div>
            <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
              <span>
                Net Share:{" "}
                <strong className="text-emerald-700">
                  {formatTk(summary?.today_doctor_share ?? summary?.today_earnings ?? 0)}
                </strong>
              </span>
              <span className="flex items-center gap-1 font-semibold text-primary">
                <Users className="h-3 w-3" />
                {summary?.today_patients ?? 0} visits
              </span>
            </div>
          </motion.div>

          {/* This Week */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl bg-card border border-border/80 p-6 shadow-soft flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  This Week
                </p>
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <h3 className="font-display text-2xl font-bold text-primary mt-2">
                {formatTk(summary?.week_earnings ?? 0)}
              </h3>
            </div>
            <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
              <span>
                Net Share:{" "}
                <strong className="text-emerald-700">
                  {formatTk(summary?.week_doctor_share ?? summary?.week_earnings ?? 0)}
                </strong>
              </span>
              <span className="flex items-center gap-1 font-semibold text-primary">
                <Users className="h-3 w-3" />
                {summary?.week_patients ?? 0} patients
              </span>
            </div>
          </motion.div>

          {/* This Month */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-3xl bg-card border border-border/80 p-6 shadow-soft flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  This Month
                </p>
                <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <h3 className="font-display text-2xl font-bold text-primary mt-2">
                {formatTk(summary?.month_earnings ?? 0)}
              </h3>
            </div>
            <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
              <span>
                Net Share:{" "}
                <strong className="text-emerald-700">
                  {formatTk(summary?.month_doctor_share ?? summary?.month_earnings ?? 0)}
                </strong>
              </span>
              <span className="flex items-center gap-1 font-semibold text-primary">
                <Users className="h-3 w-3" />
                {summary?.month_patients ?? 0} consultations
              </span>
            </div>
          </motion.div>
        </div>

        {/* Chamber / Hospital Performance Breakdown */}
        {places.length > 0 && (
          <div className="rounded-3xl bg-card border border-border/80 p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-primary flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                Earnings by Chamber & Hospital
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <Sliders className="h-3 w-3" />
                Set Workplace Fees
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {places.map((p) => {
                const isChamber = p.kind === "chamber";
                const appliedRate = p.share_percentage ?? settings.default_doctor_share_percentage;
                return (
                  <div
                    key={p.place_id}
                    className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-2.5 relative flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isChamber ? (
                            <Store className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                          )}
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {p.place_name}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                          {p.count} Visits
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xs text-slate-500">Collected Fee:</span>
                        <span className="text-sm font-bold text-slate-900">{formatTk(p.total_fee)}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 flex items-center gap-1">
                          Doctor Net ({appliedRate}%):
                        </span>
                        <span className="font-extrabold text-emerald-700 text-sm">
                          {formatTk(p.doctor_share)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Facility/Hospital Cut:</span>
                        <span>{formatTk(p.hospital_cut ?? Math.max(0, p.total_fee - p.doctor_share))}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Consultation Settlement Ledger Table */}
        <div className="rounded-3xl bg-card border border-border/80 p-6 shadow-soft space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-primary flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                Recent Consultation & Settlement Ledger
              </h2>
              <p className="text-xs text-muted-foreground">
                Detailed financial records calculated according to your custom fee settings
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Search Patient / MRN */}
              <div className="relative flex-1 min-w-[150px] sm:w-44">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search patient / MRN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              {/* Modern Facility Filter Popover */}
              <FacilityFilterPopover
                value={selectedPlace}
                onChange={setSelectedPlace}
                facilities={places.map((p) => ({
                  id: p.place_id,
                  name: p.place_name,
                  kind: p.kind,
                  count: p.count,
                }))}
                allLabel="All Chambers / Hospitals"
              />

              {/* Modern Date Filter Popover */}
              <DateRangeFilterPopover
                value={dateFilter}
                onChange={setDateFilter}
                startDate={startDate}
                endDate={endDate}
                onRangeChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
                onReset={() => {
                  setDateFilter("all");
                  setStartDate("");
                  setEndDate("");
                }}
              />
            </div>
          </div>

          {/* Filter Status & Totals Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Showing <strong className="text-foreground">{filteredLedger.length}</strong> of{" "}
                {ledger.length} consultations
              </span>
              {(dateFilter !== "all" || selectedPlace !== "all" || searchQuery || startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter("all");
                    setStartDate("");
                    setEndDate("");
                    setSelectedPlace("all");
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 transition cursor-pointer"
                >
                  <X className="h-3 w-3" /> Reset filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
              <span>
                Period Total: <strong className="text-slate-900">{formatTk(filteredTotals.total_fee)}</strong>
              </span>
              <span>•</span>
              <span>
                Doctor Net:{" "}
                <strong className="text-emerald-700 font-bold">
                  {formatTk(filteredTotals.doctor_share)}
                </strong>
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Patient Name & MRN</th>
                    <th className="px-4 py-3">Hospital / Chamber</th>
                    <th className="px-4 py-3 text-right">Consultation Fee</th>
                    <th className="px-4 py-3 text-right">Applied Rate</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Doctor Net Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground italic">
                        {loading ? "Loading records..." : "No consultation records found matching filter"}
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((row) => {
                      const totalDeductions =
                        (row.facility_deduction ?? 0) + (row.tax_deduction ?? 0);
                      const rate = row.share_percentage ?? settings.default_doctor_share_percentage;
                      return (
                        <tr key={row.appointment_id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium text-slate-800">
                            {row.date}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-primary">{row.patient_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              #{row.patient_mrn}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-foreground/80 font-medium">
                            {row.hospital_name}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-foreground">
                            {formatTk(row.fee)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-600">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {rate}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-rose-600 font-medium">
                            {totalDeductions > 0 ? `-${formatTk(totalDeductions)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-emerald-700 text-sm">
                            {formatTk(row.doctor_share)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Calculation Fee Settings Interactive Modal */}
      <EarningsCalculationSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        facilities={facilities}
        onSave={handleSaveSettings}
        formatTk={formatTk}
      />
    </PortalLayout>
  );
}

export default Earnings;

