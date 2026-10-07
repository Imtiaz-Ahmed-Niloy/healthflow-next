"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";
import { DayPicker, isDateAfterType, isDateBeforeType, type Matcher, type MonthCaptionProps, useDayPicker } from "react-day-picker";
import { bn } from "react-day-picker/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const YEARS_PER_PAGE = 20;
const NAV_BUTTON_CLASS = cn(buttonVariants({ variant: "ghost" }), "h-7 w-7 shrink-0 bg-transparent p-0");

/** The page's language as a BCP 47 tag, for month names and digits. */
const useDateLocale = () => (useLocale() === "bn" ? "bn-BD" : "en-US");

/**
 * The month's caption: its full name between the previous and next arrows.
 * Pressing the name swaps the day grid for a grid of years.
 */
const InlineCaption = ({ calendarMonth, onLabelClick }: MonthCaptionProps & { onLabelClick: () => void }) => {
  const { previousMonth, nextMonth, goToMonth } = useDayPicker();
  const locale = useDateLocale();
  return (
    <div className="flex items-center justify-center gap-2 pt-1">
      <button
        type="button"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        className={cn(NAV_BUTTON_CLASS, "disabled:opacity-40")}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onLabelClick}
        className="min-w-[9rem] rounded-md px-2 py-0.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-accent">
        {calendarMonth.date.toLocaleString(locale, { month: "long", year: "numeric" })}
      </button>
      <button
        type="button"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        className={cn(NAV_BUTTON_CLASS, "disabled:opacity-40")}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

/**
 * Twenty years at a time, to jump the calendar a long way — a date of birth,
 * say — shown in place of the day grid, under its own range and arrows.
 */
const YearGrid = ({ currentDate, rangeStart, onRangeStartChange, onSelectYear, disabled }: {
  currentDate: Date;
  rangeStart: number;
  onRangeStartChange: (next: number) => void;
  onSelectYear: (year: number) => void;
  disabled?: Matcher | Matcher[];
}) => {
  const locale = useDateLocale();
  const matchers = disabled ? (Array.isArray(disabled) ? disabled : [disabled]) : [];
  // Every before/after matcher counts: a year is only offered if it is inside
  // all of them.
  const afterMatchers = matchers.filter(isDateAfterType);
  const beforeMatchers = matchers.filter(isDateBeforeType);
  const selectedYear = currentDate.getFullYear();

  const isYearDisabled = (year: number) =>
    afterMatchers.some(m => year > m.after.getFullYear()) || beforeMatchers.some(m => year < m.before.getFullYear());

  const yearLabel = (year: number) => new Date(year, 0, 1).toLocaleString(locale, { year: "numeric" });
  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => rangeStart + i);

  return (
    <div className="p-5">
      <div className="flex items-center justify-center gap-2 pt-1">
        <button type="button" onClick={() => onRangeStartChange(rangeStart - YEARS_PER_PAGE)} className={NAV_BUTTON_CLASS}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[9rem] text-center text-sm font-medium text-foreground">
          {yearLabel(rangeStart)} - {yearLabel(rangeStart + YEARS_PER_PAGE - 1)}
        </span>
        <button type="button" onClick={() => onRangeStartChange(rangeStart + YEARS_PER_PAGE)} className={NAV_BUTTON_CLASS}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        {years.map(year => {
          const isDisabled = isYearDisabled(year);
          return (
            <button
              key={year}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectYear(year)}
              className={cn(
                buttonVariants({ variant: year === selectedYear ? "default" : "ghost" }),
                "h-9 w-full p-0 font-normal",
                isDisabled && "cursor-not-allowed text-muted-foreground opacity-50",
              )}>
              {yearLabel(year)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * The calendar every date picker here draws (react-day-picker 10), the same
 * one as the Scouty desktop app: the month's name between two arrows, and a
 * year grid behind the name. `captionLayout="dropdown"` gives react-day-picker's
 * own month and year dropdowns instead.
 *
 * It follows the month itself unless `month` is passed.
 */
function Calendar({ className, classNames, showOutsideDays = true, captionLayout, month, defaultMonth, onMonthChange, ...props }: CalendarProps) {
  const labelMode = captionLayout === undefined || captionLayout === "label";
  const appLocale = useLocale();
  const [view, setView] = React.useState<"days" | "years">("days");
  const [yearRangeStart, setYearRangeStart] = React.useState(0);
  const [ownMonth, setOwnMonth] = React.useState<Date>(() => defaultMonth ?? new Date());

  const currentDate = month ?? ownMonth;
  const changeMonth = (next: Date) => {
    setOwnMonth(next);
    onMonthChange?.(next);
  };

  const openYearGrid = () => {
    setYearRangeStart(currentDate.getFullYear() - 2);
    setView("years");
  };

  const selectYear = (year: number) => {
    changeMonth(new Date(year, currentDate.getMonth(), 1));
    setView("days");
  };

  // One caption component for the life of the calendar: a new one each render
  // makes react-day-picker remount the caption, and focus is lost on every
  // arrow press. The ref always holds the latest openYearGrid.
  const openYearGridRef = React.useRef(openYearGrid);
  React.useEffect(() => {
    openYearGridRef.current = openYearGrid;
  });
  const MonthCaptionWithYearToggle = React.useMemo(() => {
    const Component = (p: MonthCaptionProps) => <InlineCaption {...p} onLabelClick={() => openYearGridRef.current()} />;
    Component.displayName = "MonthCaptionWithYearToggle";
    return Component;
  }, []);

  if (labelMode && view === "years") {
    return (
      <YearGrid
        currentDate={currentDate}
        rangeStart={yearRangeStart}
        onRangeStartChange={setYearRangeStart}
        onSelectYear={selectYear}
        disabled={props.disabled}
      />
    );
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      locale={appLocale === "bn" ? bn : undefined}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "relative flex w-full flex-col gap-4",
        month_caption: "flex justify-center pt-1 items-center",
        caption_label: "sr-only",
        dropdowns: "flex items-center gap-1",
        dropdown_root: "relative",
        dropdown: "bg-transparent text-foreground text-sm font-medium cursor-pointer focus:outline-none",
        // In label mode the arrows live inside the caption, so the default nav is hidden.
        nav: labelMode ? "hidden" : "absolute top-0 inset-x-0 flex items-center justify-between px-3 pt-3",
        button_previous: cn(buttonVariants({ variant: "ghost" }), "h-7 w-7 bg-transparent p-0 z-10"),
        button_next: cn(buttonVariants({ variant: "ghost" }), "h-7 w-7 bg-transparent p-0 z-10"),
        month_grid: "w-full border-collapse",
        weekdays: "flex w-full",
        weekday: "flex-1 text-muted-foreground font-normal text-[0.8rem] text-center",
        week: "flex w-full mt-2",
        day: "relative flex-1 p-0 text-center text-sm",
        day_button: cn(buttonVariants({ variant: "ghost" }), "mx-auto h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        outside: "[&>button]:text-muted-foreground [&>button]:opacity-50",
        disabled: "[&>button]:text-muted-foreground [&>button]:opacity-50 [&>button]:cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") return <ChevronLeft className="h-4 w-4" />;
          if (orientation === "right") return <ChevronRight className="h-4 w-4" />;
          return <ChevronDown className="h-4 w-4" />;
        },
        ...(labelMode ? { MonthCaption: MonthCaptionWithYearToggle } : {}),
      }}
      fixedWeeks
      month={currentDate}
      onMonthChange={changeMonth}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
