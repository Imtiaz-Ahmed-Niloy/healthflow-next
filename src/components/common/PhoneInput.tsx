"use client";

import { useState } from "react";
import { PHONE_COUNTRIES, bdLocalPart, bdStoredPhone, isBdMobile, type PhoneCountry } from "@/lib/phone";

/**
 * Drawn, not the emoji: Windows shows flag emoji as the letters "BD". One
 * entry per country in PHONE_COUNTRIES.
 */
const FLAGS: Record<PhoneCountry["iso"], React.ReactNode> = {
  BD: (
    <>
      <rect width="20" height="12" fill="#006a4e" />
      <circle cx="9" cy="6" r="4" fill="#f42a41" />
    </>
  ),
};

const inputCls = "flex-1 min-w-0 bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm aria-[invalid=true]:border aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive/30";

/**
 * A mobile number with its country code fixed in a box of its own, so nobody
 * types it or wonders whether to. Every form that asks for a number uses this;
 * the countries it knows live in src/lib/phone.ts.
 *
 * What it hands back is the stored spelling, 01712345678 — the box is for the
 * eye only. With `name` it posts that in a form by itself; `onChange` is for a
 * caller that acts on the number, and gets "" until the number is complete.
 */
export const PhoneInput = ({ name, defaultValue, onChange, required, invalid, autoFocus, disabled }: {
  name?: string;
  defaultValue?: unknown;
  onChange?: (phone: string) => void;
  required?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}) => {
  const country = PHONE_COUNTRIES[0];
  const [local, setLocal] = useState(() => bdLocalPart(typeof defaultValue === "string" ? defaultValue : ""));

  const type = (typed: string) => {
    const next = bdLocalPart(typed).slice(0, country.maxLength);
    setLocal(next);
    onChange?.(isBdMobile(next) ? bdStoredPhone(next) : "");
  };

  return (
    <div className="flex items-stretch gap-2">
      {name && <input type="hidden" name={name} value={local ? bdStoredPhone(local) : ""} />}
      <span className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 text-sm font-mono text-muted-foreground select-none">
        <svg viewBox="0 0 20 12" className="h-3 w-5 rounded-[2px] shrink-0" aria-hidden="true">{FLAGS[country.iso]}</svg>
        {country.dial}
      </span>
      <input type="tel" inputMode="numeric" value={local} onChange={e => type(e.target.value)}
        required={required} aria-invalid={invalid} autoFocus={autoFocus} disabled={disabled}
        pattern={country.pattern} maxLength={country.maxLength + 4} placeholder={country.placeholder} className={inputCls} />
    </div>
  );
};
