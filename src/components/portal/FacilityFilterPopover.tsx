"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Building2, Store, Check, ChevronDown, RotateCcw, X } from "lucide-react";

export interface FacilityOption {
  id: string;
  name: string;
  kind?: string;
  count?: number;
}

interface FacilityFilterPopoverProps {
  value: string;
  onChange: (value: string) => void;
  facilities: FacilityOption[];
  allLabel?: string;
  className?: string;
}

export const FacilityFilterPopover: React.FC<FacilityFilterPopoverProps> = ({
  value,
  onChange,
  facilities,
  allLabel = "All Chambers / Hospitals",
  className = "",
}) => {
  const [open, setOpen] = useState(false);

  const isFiltered = value !== "all" && value !== "ALL";

  const selectedOption = facilities.find(
    (f) => f.name.toLowerCase() === value.toLowerCase()
  );

  const isChamber = selectedOption?.kind === "chamber";

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const handleReset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(value === "ALL" ? "ALL" : "all");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-2 h-8 px-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs group focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-w-[220px] ${
            isFiltered
              ? "bg-emerald-50/90 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-xs"
              : "bg-background text-foreground border-border hover:bg-muted/50 hover:border-slate-300"
          } ${className}`}
        >
          <span className="flex items-center gap-1.5 truncate">
            {isChamber ? (
              <Store
                className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                  isFiltered ? "text-emerald-600" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
            ) : (
              <Building2
                className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                  isFiltered ? "text-emerald-600" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
            )}
            <span className="truncate">
              {isFiltered ? selectedOption?.name ?? value : allLabel}
            </span>
          </span>

          {isFiltered && (
            <span
              onClick={handleReset}
              className="p-0.5 rounded-md hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition-colors shrink-0"
              title="Clear facility filter"
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
        align="start"
        sideOffset={6}
        className="w-[280px] p-3 rounded-2xl border border-border/80 bg-card shadow-xl text-card-foreground space-y-2 z-50 backdrop-blur-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-1.5">
            <span className="h-6 w-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-bold text-foreground">Filter by Workplace</span>
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

        {/* Options List */}
        <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5">
          {/* All option */}
          <button
            type="button"
            onClick={() => handleSelect(value === "ALL" ? "ALL" : "all")}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all border ${
              !isFiltered
                ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 shadow-2xs font-semibold"
                : "bg-background/80 hover:bg-muted/60 border-border/60 text-foreground"
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold leading-tight truncate">{allLabel}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">All consultations & visits</span>
              </div>
            </div>
            {!isFiltered && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
          </button>

          {/* Individual facility options */}
          {facilities.map((fac) => {
            const isSelected = fac.name.toLowerCase() === value.toLowerCase();
            const isChamberOption = fac.kind === "chamber";

            return (
              <button
                key={fac.id || fac.name}
                type="button"
                onClick={() => handleSelect(fac.name)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all border ${
                  isSelected
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 shadow-2xs font-semibold"
                    : "bg-background/80 hover:bg-muted/60 border-border/60 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {isChamberOption ? (
                    <Store className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  )}
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-semibold leading-tight truncate">{fac.name}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight capitalize">
                      {fac.kind || "Hospital / Chamber"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {fac.count != null && fac.count > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {fac.count}
                    </span>
                  )}
                  {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
