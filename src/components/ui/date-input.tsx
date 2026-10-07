"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { DateTimePicker } from "@/components/ui/date-time-picker";

/**
 * A date on its own — a date of birth, a due date, one end of a range — in
 * place of `<input type="date">`, and shaped like one so it drops in: the
 * value is "YYYY-MM-DD", `min` and `max` bound it, `name` posts it in a
 * FormData form and `required` holds the form back while it is empty. It opens
 * the same picker as every date and time in the app (date-time-picker), with
 * the Time tab off.
 *
 * Controlled with `value`/`onChange`, or left to itself with `defaultValue`.
 * `onChange` is handed the date, not an event.
 */

/**
 * A date and time in place of `<input type="datetime-local">`, speaking its
 * format: "YYYY-MM-DDTHH:mm". Any minute can be picked, as there.
 */
export const DateTimeLocalInput = ({ value, onChange, min, max, disabled, className, error, showClear = false }: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  showClear?: boolean;
}) => {
  const spaced = (v: string | undefined) => (v ? v.replace("T", " ").slice(0, 16) : undefined);
  return (
    <DateTimePicker
      value={spaced(value) ?? ""}
      onChange={picked => onChange(picked.replace(" ", "T"))}
      disableBefore={spaced(min)}
      disableAfter={spaced(max)}
      minuteStep={1}
      disabled={disabled}
      className={className}
      error={error}
      showClear={showClear}
    />
  );
};

/** The look of this app's shadcn `Input`, for a form built from those. */
export const DATE_INPUT_LOOK = "h-10 rounded-md border-input bg-background";

export const DateInput = ({
  value, defaultValue = "", onChange, name, required, min, max, disabled, placeholder, className, wrapperClassName,
  id, "aria-label": ariaLabel, error, showClear,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  /** Earliest and latest day that can be picked, "YYYY-MM-DD". */
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  /** The trigger's classes, on top of the admin forms' input look. */
  className?: string;
  wrapperClassName?: string;
  id?: string;
  "aria-label"?: string;
  error?: boolean;
  /** The × that empties it; on by default unless the date is required. */
  showClear?: boolean;
}) => {
  const [own, setOwn] = React.useState(defaultValue ?? "");
  const current = (value ?? own ?? "").slice(0, 10);

  const change = (picked: string) => {
    const next = picked.slice(0, 10);
    setOwn(next);
    onChange?.(next);
  };

  return (
    <div className={cn("relative", wrapperClassName)}>
      <DateTimePicker
        dateOnly
        value={current ? `${current} 00:00` : ""}
        onChange={change}
        disableBefore={min ? `${min.slice(0, 10)} 00:00` : undefined}
        disableAfter={max ? `${max.slice(0, 10)} 23:59` : undefined}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        id={id}
        aria-label={ariaLabel}
        error={error}
        showClear={showClear ?? !required}
      />
      {/* What the form reads, and what the browser's own "fill this in"
          message hangs on: a real input nobody can see or reach. */}
      {(name || required) && (
        <input tabIndex={-1} aria-hidden="true" name={name} value={current} required={required} disabled={disabled}
          onChange={() => undefined}
          className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0" />
      )}
    </div>
  );
};
