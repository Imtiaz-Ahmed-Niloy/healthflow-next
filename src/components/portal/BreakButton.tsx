"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_BREAK_MINUTES,
  MAX_BREAK_MINUTES,
  MIN_BREAK_MINUTES,
  breakCopy,
  validBreakMinutes,
} from "@/lib/portal/breakTimer";

type Props = {
  /** A break is running — the button ends it instead of asking for a length. */
  onBreak: boolean;
  secondsLeft: number;
  bn: boolean;
  onStart: (minutes: number) => void;
  onEnd: () => void;
};

const STEP = 5;
/** One tap for the usual lengths; anything else is still typed or nudged. */
const PRESETS = [5, 10, 15, 20, 30, 45, 60];

/**
 * The queue's break button, shared by Queue and Prescription. Pressing it asks
 * how long — 10 to begin with, more or less as the doctor likes — and only
 * then starts the break, so every screen counts down the length chosen here.
 */
export const BreakButton = ({ onBreak, secondsLeft, bn, onStart, onEnd }: Props) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(DEFAULT_BREAK_MINUTES));
  const minutes = validBreakMinutes(value);

  const nudge = (by: number) => {
    const current = validBreakMinutes(value) ?? DEFAULT_BREAK_MINUTES;
    setValue(String(Math.min(MAX_BREAK_MINUTES, Math.max(MIN_BREAK_MINUTES, current + by))));
  };

  if (onBreak) {
    return (
      <button
        type="button"
        onClick={onEnd}
        className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs bg-amber-100 border border-amber-400 text-amber-900 font-bold animate-pulse hover:bg-amber-200"
      >
        {`${bn ? "বিরতি চলছে" : "On Break"} (${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}) • ${bn ? "শেষ করুন" : "End"}`}
      </button>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValue(String(DEFAULT_BREAK_MINUTES));
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs bg-white border border-slate-200 text-slate-700 hover:border-amber-500 hover:text-amber-700 hover:bg-amber-50/50"
        >
          {breakCopy(DEFAULT_BREAK_MINUTES, bn).button}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (minutes === null) return;
            setOpen(false);
            onStart(minutes);
          }}
        >
          <Label htmlFor="break-minutes">{bn ? "বিরতির সময় (মিনিট)" : "Break length (minutes)"}</Label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={() => nudge(-STEP)} aria-label={bn ? "কমান" : "Less"}>
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="break-minutes"
              type="number"
              inputMode="numeric"
              min={MIN_BREAK_MINUTES}
              max={MAX_BREAK_MINUTES}
              step={1}
              value={value}
              autoFocus
              onFocus={(e) => e.target.select()}
              onChange={(e) => setValue(e.target.value)}
              className="text-center font-semibold"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => nudge(STEP)} aria-label={bn ? "বাড়ান" : "More"}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => {
              const on = minutes === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setValue(String(preset))}
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/70 hover:text-primary"}`}
                >
                  {bn ? preset.toLocaleString("bn-BD") : preset}
                </button>
              );
            })}
          </div>
          {minutes === null && (
            <p className="text-xs text-destructive">
              {bn
                ? `${MIN_BREAK_MINUTES} থেকে ${MAX_BREAK_MINUTES} মিনিটের মধ্যে দিন`
                : `Enter ${MIN_BREAK_MINUTES} to ${MAX_BREAK_MINUTES} minutes`}
            </p>
          )}
          <Button type="submit" disabled={minutes === null} className="w-full">
            {breakCopy(minutes ?? DEFAULT_BREAK_MINUTES, bn).start}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
};
