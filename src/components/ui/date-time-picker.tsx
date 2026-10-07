"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { addDays, endOfDay, format, isAfter, isBefore, isValid, parse, set, startOfDay } from "date-fns";
import { bn } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Matcher } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogFooter, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";

/**
 * A date and time picked in a small dialog: a Date tab with the calendar, a
 * Time tab with hour, minute and AM/PM columns, and Today / Cancel / Done
 * underneath. The same picker as the Scouty desktop app, in this app's colours
 * and languages. `dateOnly` drops the Time tab.
 *
 * The value is a wall-clock string, "YYYY-MM-DD HH:mm" ("" when empty), and
 * nothing here converts between timezones: what is picked is what is handed
 * back. "Now", for the past/future switches, is the browser's unless `now` says
 * otherwise — pass the hospital's clock (useBookingClock) where that matters.
 */

/** The value's format, in date-fns tokens. */
const VALUE_FORMAT = "yyyy-MM-dd HH:mm";
const DATE_FORMAT = "yyyy-MM-dd";
const DATE_ONLY_DISPLAY = "MMMM dd, yyyy";

type Period = "AM" | "PM";
type Tab = "date" | "time";

export type DateTimePickerProps = {
  /** Controlled value, always "YYYY-MM-DD HH:mm" (or "" when empty). */
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** date-fns format for the trigger and the header (ignored when dateOnly). */
  displayFormat?: string;
  /** Hide the Time tab and pick a date only. */
  dateOnly?: boolean;
  /** Minutes between the choices in the minute column (default 5). */
  minuteStep?: number;
  disabled?: boolean;
  /** Show a clear (×) button when there is a value. */
  showClear?: boolean;
  error?: boolean;
  className?: string;
  /** A timezone named under the header, for the reader only — "Asia/Dhaka". */
  timezone?: string;
  /** "YYYY-MM-DD HH:mm" to stand in for the browser's clock. */
  now?: string;

  disablePastDates?: boolean;
  disableFutureDates?: boolean;
  /** Disable everything before this "YYYY-MM-DD HH:mm". */
  disableBefore?: string;
  /** Disable everything after this "YYYY-MM-DD HH:mm". */
  disableAfter?: string;
  /** Specific days to disable, "YYYY-MM-DD". */
  disabledDates?: string[];
  /**
   * A rule of the caller's own — a doctor's working days and hours, say.
   * Asked with only a date ("YYYY-MM-DD") for whether the whole day is out,
   * and with a time ("HH:mm") for one slot on it.
   */
  isSlotDisabled?: (date: string, time?: string) => boolean;
};

const PERIODS: Period[] = ["AM", "PM"];
const HOURS = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));

const to24 = (hour12: number, period: Period) =>
  period === "AM" ? (hour12 === 12 ? 0 : hour12) : hour12 === 12 ? 12 : hour12 + 12;

const from24 = (hour24: number): { hour12: number; period: Period } => ({
  hour12: hour24 % 12 === 0 ? 12 : hour24 % 12,
  period: hour24 >= 12 ? "PM" : "AM",
});

const parseValue = (value: string | undefined) => {
  if (!value) return null;
  const parsed = parse(value, VALUE_FORMAT, new Date());
  return isValid(parsed) ? parsed : null;
};

const parseDay = (value: string) => parse(value, DATE_FORMAT, new Date());

export const DateTimePicker = ({
  value,
  onChange,
  placeholder,
  displayFormat = "MMMM dd, yyyy '@' h:mm a",
  dateOnly = false,
  minuteStep = 5,
  disabled = false,
  showClear = true,
  error = false,
  className,
  timezone,
  now,
  disablePastDates = false,
  disableFutureDates = false,
  disableBefore,
  disableAfter,
  disabledDates,
  isSlotDisabled,
}: DateTimePickerProps) => {
  const t = useTranslations("pickers");
  const dateLocale = useLocale() === "bn" ? bn : undefined;

  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<Tab>("date");
  const [selectedDate, setSelectedDate] = React.useState("");
  const [hour12, setHour12] = React.useState(12);
  const [minute, setMinute] = React.useState(0);
  const [period, setPeriod] = React.useState<Period>("AM");
  const [displayMonth, setDisplayMonth] = React.useState<Date>(() => new Date());

  const hourSelRef = React.useRef<HTMLButtonElement>(null);
  const minuteSelRef = React.useRef<HTMLButtonElement>(null);
  const periodSelRef = React.useRef<HTMLButtonElement>(null);

  const minutes = React.useMemo(
    () => Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => i * minuteStep),
    [minuteStep],
  );

  const displayFmt = dateOnly ? DATE_ONLY_DISPLAY : displayFormat;
  const emptyLabel = placeholder ?? (dateOnly ? t("selectDate") : t("selectDateTime"));
  const show = (date: Date) => format(date, displayFmt, { locale: dateLocale });

  const clock = () => parseValue(now) ?? new Date();
  const before = parseValue(disableBefore);
  const after = parseValue(disableAfter);

  const at = (dateStr: string, h12: number, min: number, p: Period) =>
    set(parseDay(dateStr), { hours: to24(h12, p), minutes: min, seconds: 0, milliseconds: 0 });

  const isTimeDisabled = (dateStr: string, h12: number, min: number, p: Period) => {
    if (!dateStr) return false;
    const time = at(dateStr, h12, min, p);
    if (disablePastDates && isBefore(time, clock())) return true;
    if (disableFutureDates && isAfter(time, clock())) return true;
    if (before && isBefore(time, before)) return true;
    if (after && isAfter(time, after)) return true;
    if (isSlotDisabled?.(dateStr, format(time, "HH:mm"))) return true;
    return false;
  };

  const isHourDisabled = (dateStr: string, h12: number, p: Period) =>
    minutes.every(m => isTimeDisabled(dateStr, h12, m, p));
  const isPeriodDisabled = (dateStr: string, p: Period) =>
    HOURS.every(h => minutes.every(m => isTimeDisabled(dateStr, h, m, p)));

  /** The time as it is if that is allowed on this date, or the first one that is. */
  const ensureValidTime = (dateStr: string, h12: number, min: number, p: Period) => {
    if (!isTimeDisabled(dateStr, h12, min, p)) return { hour12: h12, minute: min, period: p };
    for (const pp of PERIODS) {
      for (const h of HOURS) {
        for (const m of minutes) {
          if (!isTimeDisabled(dateStr, h, m, pp)) return { hour12: h, minute: m, period: pp };
        }
      }
    }
    return { hour12: h12, minute: min, period: p };
  };

  const isDayDisabled = (date: Date) => {
    const day = startOfDay(date);
    const today = startOfDay(clock());
    if (disablePastDates && isBefore(day, today)) return true;
    if (disableFutureDates && isAfter(day, today)) return true;
    if (before && isBefore(day, startOfDay(before))) return true;
    if (after && isAfter(day, startOfDay(after))) return true;
    if (disabledDates?.includes(format(day, DATE_FORMAT))) return true;
    if (isSlotDisabled?.(format(day, DATE_FORMAT))) return true;
    return false;
  };

  const disabledMatchers: Matcher[] = [
    ...(disablePastDates ? [{ before: startOfDay(clock()) }] : []),
    ...(disableFutureDates ? [{ after: endOfDay(clock()) }] : []),
    ...(before ? [{ before: startOfDay(before) }] : []),
    ...(after ? [{ after: endOfDay(after) }] : []),
    ...(disabledDates ?? []).map(parseDay),
    ...(isSlotDisabled ? [(date: Date) => isSlotDisabled(format(date, DATE_FORMAT))] : []),
  ];

  /** What the dialog shows the moment it opens: the value, or the first day and time that can be picked. */
  const seed = () => {
    const current = parseValue(value);
    if (current) {
      const { hour12: h, period: p } = from24(current.getHours());
      setSelectedDate(format(current, DATE_FORMAT));
      setDisplayMonth(current);
      setHour12(h);
      setMinute(current.getMinutes());
      setPeriod(p);
    } else {
      let day = startOfDay(clock());
      let step = disableFutureDates ? -1 : 1;
      if (isDayDisabled(day)) {
        // Start from whichever limit rules today out: a day-by-day search from
        // today can miss a limit that is years away.
        if (after) {
          day = startOfDay(after);
          step = -1;
        } else if (before) {
          day = startOfDay(before);
          step = 1;
        }
      }
      for (let i = 0; i < 366 && isDayDisabled(day); i++) day = addDays(day, step);
      const dateStr = format(day, DATE_FORMAT);
      const valid = ensureValidTime(dateStr, 12, 0, "AM");
      setSelectedDate(dateStr);
      setDisplayMonth(day);
      setHour12(valid.hour12);
      setMinute(valid.minute);
      setPeriod(valid.period);
    }
    setActiveTab("date");
  };

  const openChange = (next: boolean) => {
    if (next) seed();
    setOpen(next);
  };

  // Bring the chosen hour, minute and AM/PM to the middle of their columns.
  React.useEffect(() => {
    if (!open || activeTab !== "time") return;
    const id = setTimeout(() => {
      const opts: ScrollIntoViewOptions = { block: "center" };
      hourSelRef.current?.scrollIntoView(opts);
      minuteSelRef.current?.scrollIntoView(opts);
      periodSelRef.current?.scrollIntoView(opts);
    }, 30);
    return () => clearTimeout(id);
  }, [open, activeTab, hour12, minute, period]);

  const pickDay = (date: Date) => {
    const dateStr = format(date, DATE_FORMAT);
    setSelectedDate(dateStr);
    const valid = ensureValidTime(dateStr, hour12, minute, period);
    setHour12(valid.hour12);
    setMinute(valid.minute);
    setPeriod(valid.period);
  };

  const selectToday = () => {
    const today = clock();
    if (isDayDisabled(today)) return;
    setDisplayMonth(today);
    pickDay(today);
  };

  const built = () => at(selectedDate, hour12, minute, period);

  const current = parseValue(value);
  const triggerLabel = current ? show(current) : "";
  const headerLabel = selectedDate ? show(built()) : emptyLabel;

  const done = () => {
    if (selectedDate) onChange?.(format(built(), VALUE_FORMAT));
    setOpen(false);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
  };

  const onDateTab = dateOnly || activeTab === "date";

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => openChange(true)}
        className={cn(
          "relative flex h-auto w-full items-center rounded-lg border bg-muted/40 px-3 py-2 text-left text-sm transition-colors",
          error ? "border-destructive" : "border-transparent hover:border-primary/60",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}>
        <span className={cn("flex-1 truncate", triggerLabel ? "text-foreground" : "text-muted-foreground")}>
          {triggerLabel || emptyLabel}
        </span>
        {showClear && triggerLabel ? (
          <span role="button" tabIndex={-1} onClick={clear} aria-label={t("clear")}
            className="ml-2 shrink-0 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </span>
        ) : (
          <CalendarDays className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      <Dialog open={open} onOpenChange={openChange}>
        <DialogPortal>
          {/* Above the admin panels' own modal (z-60), which a form opens this from. */}
          <DialogOverlay className="z-[80]" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed left-[50%] top-[50%] z-[80] flex max-h-[90vh] w-[calc(100%-2rem)] max-w-72 translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-lg border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
            <div className="px-5 pt-5 text-center">
              <DialogTitle className="text-base font-semibold text-foreground">{headerLabel}</DialogTitle>
              {timezone && (
                <p className="mt-0.5 text-xs text-muted-foreground">{t("localTime", { zone: timezone.replace(/_/g, " ") })}</p>
              )}
            </div>

            {!dateOnly && (
              <div className="mt-4 flex">
                {(["date", "time"] as Tab[]).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 border-b-2 pb-2 text-sm font-medium transition-colors",
                      activeTab === tab
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}>
                    {t(tab)}
                  </button>
                ))}
              </div>
            )}

            <div className="min-h-[360px] flex-1 overflow-y-auto">
              {onDateTab ? (
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    required
                    selected={selectedDate ? parseDay(selectedDate) : undefined}
                    month={displayMonth}
                    onMonthChange={setDisplayMonth}
                    onSelect={pickDay}
                    captionLayout="label"
                    disabled={disabledMatchers}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-px px-1 py-2">
                  <TimeColumn>
                    {HOURS.map(h => {
                      const off = isHourDisabled(selectedDate, h, period);
                      const active = hour12 === h;
                      return (
                        <TimeItem key={h} ref={active ? hourSelRef : undefined} active={active} disabled={off}
                          onClick={() => !off && setHour12(h)}>
                          {h}
                        </TimeItem>
                      );
                    })}
                  </TimeColumn>

                  <TimeColumn className="rounded-lg bg-muted/40">
                    {minutes.map(m => {
                      const off = isTimeDisabled(selectedDate, hour12, m, period);
                      const active = minute === m;
                      return (
                        <TimeItem key={m} ref={active ? minuteSelRef : undefined} active={active} disabled={off}
                          onClick={() => !off && setMinute(m)}>
                          {String(m).padStart(2, "0")}
                        </TimeItem>
                      );
                    })}
                  </TimeColumn>

                  <TimeColumn>
                    {PERIODS.map(p => {
                      const off = isPeriodDisabled(selectedDate, p);
                      const active = period === p;
                      return (
                        <TimeItem key={p} ref={active ? periodSelRef : undefined} active={active} disabled={off}
                          onClick={() => !off && setPeriod(p)}>
                          {p}
                        </TimeItem>
                      );
                    })}
                  </TimeColumn>
                </div>
              )}
            </div>

            <DialogFooter className="flex-row items-center justify-between space-x-0 border-t border-border px-5 py-3 sm:justify-between sm:space-x-0">
              {onDateTab ? (
                <button type="button" onClick={selectToday} disabled={isDayDisabled(clock())}
                  className="text-sm font-medium text-primary hover:text-foreground disabled:opacity-40">
                  {t("today")}
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="button" size="sm" onClick={done} disabled={!selectedDate}>
                  {t("done")}
                </Button>
              </div>
            </DialogFooter>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
};

const TimeColumn = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div
    className={cn(
      "flex h-[340px] flex-col gap-1 overflow-y-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      className,
    )}>
    {children}
  </div>
);

const TimeItem = ({ ref, active, disabled, onClick, children }: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}) => (
  <button
    ref={ref}
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "shrink-0 rounded-md py-2 text-center text-sm font-medium transition-colors",
      active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
      disabled && "opacity-30 hover:bg-transparent",
    )}>
    {children}
  </button>
);
