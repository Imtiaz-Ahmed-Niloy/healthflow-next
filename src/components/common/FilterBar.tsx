"use client";

import { X } from "lucide-react";

/**
 * The pieces the patient's Find Doctors and Find Hospitals filter bars share,
 * so the two pages look like one product.
 */

/** Every control in a filter bar — search box, pickers — shares this look. */
export const FILTER_CONTROL = "h-11 w-full rounded-xl border-0 bg-muted/50 px-3.5 text-sm text-foreground hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 transition-colors";

export const FILTER_ICON = "h-4 w-4 shrink-0 text-muted-foreground";

/** One active filter under the bar, with its own ✕. */
export const FilterChip = ({ label, onClear }: { label: string; onClear: () => void }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1 text-xs font-medium text-primary">
    {label}
    <button type="button" onClick={onClear} aria-label={`Remove ${label}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-primary/15">
      <X className="h-3 w-3" />
    </button>
  </span>
);
