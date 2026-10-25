"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDays, Check, ChevronDown, Clock, RotateCcw, X, ArrowRight } from "lucide-react";

export type DateFilterPreset = "all" | "today" | "yesterday" | "last7days" | "thisMonth" | "custom";

interface DateRangeFilterPopoverProps {
  value: DateFilterPreset;
  onChange: (preset: DateFilterPreset) => void;
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
  onReset: () => void;
  className?: string;
}

const PRESETS: { key: DateFilterPreset; label: string; hint: string }[] = [
  { key: "all", label: "All Dates", hint: "Full history" },
  { key: "today", label: "Today", hint: "Current clinic day" },
  { key: "yesterday", label: "Yesterday", hint: "Previous day" },
  { key: "last7days", label: "Last 7 Days", hint: "Rolling week" },
  { key: "thisMonth", label: "This Month", hint: "Month to date" },
  { key: "custom", label: "Custom Range", hint: "Pick start & end" },
];

export const DateRangeFilterPopover: React.FC<DateRangeFilterPopoverProps> = ({
  value,
  onChange,
  startDate,
  endDate,
  onRangeChange,
  onReset,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  const isFiltered = value !== "all" || Boolean(startDate) || Boolean(endDate);

  // Format short human date like "Oct 26"
  const formatShort = (iso: string) => {
    try {
      const [y, m, d] = iso.split("-").map(Number);
      if (!y || !m || !d) return iso;
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  // Determine button label
  const getDisplayLabel = () => {
    if (value === "today") return "Today";
    if (value === "yesterday") return "Yesterday";
    if (value === "last7days") return "Last 7 Days";
    if (value === "thisMonth") return "This Month";
    if (value === "custom") {
      if (startDate && endDate) {
        return startDate === endDate
          ? formatShort(startDate)
          : `${formatShort(startDate)} – ${formatShort(endDate)}`;
      }
      if (startDate) return `From ${formatShort(startDate)}`;
      if (endDate) return `Until ${formatShort(endDate)}`;
      return "Custom Range";
    }
    return "All Dates";
  };

  const handleSelectPreset = (preset: DateFilterPreset) => {
    onChange(preset);
    if (preset !== "custom") {
      setOpen(false);
    }
  };

  const handleApplyCustom = () => {
    onChange("custom");
    onRangeChange(tempStart, tempEnd);
    setOpen(false);
  };

  const handleReset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTempStart("");
    setTempEnd("");
    onReset();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-2 h-8 px-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs group focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
            isFiltered
              ? "bg-emerald-50/90 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-xs"
              : "bg-background text-foreground border-border hover:bg-muted/50 hover:border-slate-300"
          } ${className}`}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Calendar
              className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                isFiltered ? "text-emerald-600" : "text-muted-foreground group-hover:text-foreground"
              }`}
            />
            <span className="truncate">{getDisplayLabel()}</span>
          </span>

          {isFiltered && (
            <span
              onClick={handleReset}
              className="p-0.5 rounded-md hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition-colors"
              title="Clear date filter"
            >
              <X className="h-3 w-3" />
            </span>
          )}

          <ChevronDown
            className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180 text-foreground" : ""
            }`}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[320px] p-3.5 rounded-2xl border border-border/80 bg-card shadow-xl text-card-foreground space-y-3 z-50 backdrop-blur-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-1.5">
            <span className="h-6 w-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CalendarDays className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-bold text-foreground">Filter by Date</span>
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-semibold text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        {/* Quick Presets Grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => {
            const isSelected = value === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => handleSelectPreset(p.key)}
                className={`flex flex-col items-start px-2.5 py-2 rounded-xl text-left transition-all border ${
                  isSelected
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 shadow-2xs font-semibold"
                    : "bg-background/80 hover:bg-muted/60 border-border/60 text-foreground"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold leading-tight">{p.label}</span>
                  {isSelected && <Check className="h-3 w-3 text-emerald-600 shrink-0" />}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{p.hint}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Range Expansion */}
        {value === "custom" && (
          <div className="pt-2.5 border-t border-border/60 space-y-2.5 animate-in fade-in-50 duration-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Select Date Range</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">From</label>
                <input
                  type="date"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="w-full h-8 text-xs font-mono px-2 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">To</label>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="w-full h-8 text-xs font-mono px-2 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleApplyCustom}
              className="w-full h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 shadow-xs"
            >
              <span>Apply Range</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
