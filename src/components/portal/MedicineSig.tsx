"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * How a medicine is taken depends on its form. A tablet can be split into
 * halves and quarters and is usually written per time of day ("1+0+½"), but a
 * capsule never splits. A syrup goes by spoon or ml, drops by count and where
 * they go, an injection by amp or vial and route, a cream by where it's
 * applied, and an inhaler by puffs. Doctors in Bangladesh write anything past
 * three doses a day as "4 times daily" or "6 hourly", not "1+1+1+1".
 *
 * Every form gets the same saved shape: a single free-text `frequency`
 * string. The chips here only build that string. The text box underneath is
 * the actual value and stays editable for anything the chips don't cover.
 */

type Kind = {
  /** Per-slot choices for the Morning/Afternoon/Night pattern. Absent = that pattern doesn't fit this form. */
  schedule?: string[];
  amounts: string[];
  sites?: string[];
  siteLabel?: "where" | "route";
  /** Taken by mouth, so before or after meals matters. */
  oral: boolean;
  times?: string[];
};

const TIMES = ["Once daily", "Twice daily", "3 times daily", "4 times daily", "6 hourly", "8 hourly", "12 hourly", "At bedtime", "Once weekly", "As needed"];

const KINDS: Record<string, Kind> = {
  tablet: { schedule: ["0", "¼", "½", "¾", "1", "1½", "2", "3"], amounts: ["½ tablet", "1 tablet", "2 tablets"], oral: true },
  capsule: { schedule: ["0", "1", "2", "3"], amounts: ["1 capsule", "2 capsules"], oral: true },
  liquid: { amounts: ["½ tsp", "1 tsp", "1½ tsp", "2 tsp", "2 ml", "5 ml", "10 ml"], oral: true },
  // Oral solutions are dosed by syringe or dropper more than by spoon: small
  // ml for children, 10-15 ml for lactulose-type laxatives, drops for vitamin D.
  solution: { amounts: ["0.5 ml", "1 ml", "2 ml", "2.5 ml", "5 ml", "10 ml", "15 ml", "½ tsp", "1 tsp", "2 tsp", "5 drops", "10 drops"], oral: true },
  drops: { amounts: ["1 drop", "2 drops", "3 drops", "5 drops", "0.5 ml", "1 ml", "2 ml"], sites: ["each eye", "each ear", "each nostril", "by mouth"], siteLabel: "where", oral: false },
  injection: {
    amounts: ["½ amp", "1 amp", "1 vial"],
    sites: ["IV", "IM", "SC"],
    siteLabel: "route",
    oral: false,
    times: ["Stat", "Once daily", "Twice daily", "8 hourly", "12 hourly", "Once weekly", "As needed"],
  },
  topical: { amounts: ["Apply thin layer"], sites: ["on affected area", "on face", "on scalp"], siteLabel: "where", oral: false },
  inhaler: { amounts: ["1 puff", "2 puffs"], oral: false },
  spray: { amounts: ["1 spray", "2 sprays"], sites: ["each nostril", "in mouth"], siteLabel: "where", oral: false },
  suppository: { amounts: ["½ suppository", "1 suppository"], oral: false },
  other: { amounts: [], oral: true },
};

/** MedEx names forms loosely ("Pediatric Drops", "Powder for Suspension", "IV Infusion"), so match on the word, not the exact label. */
export const formKind = (form: string): string => {
  const f = form.toLowerCase();
  if (/inhal|rotacap|nebul|evohaler|accuhaler/.test(f)) return "inhaler";
  if (/spray/.test(f)) return "spray";
  if (/drop/.test(f)) return "drops";
  if (/inj|infusion|vial|amp/.test(f)) return "injection";
  if (/cream|ointment|gel|lotion|oint/.test(f)) return "topical";
  if (/suppos/.test(f)) return "suppository";
  if (/solution/.test(f)) return "solution";
  if (/syrup|suspension|elixir|mixture|liquid/.test(f)) return "liquid";
  if (/capsule/.test(f)) return "capsule";
  if (/tablet|\btab\b/.test(f)) return "tablet";
  return "other";
};

/** Drops by mouth still care about meals, while eye or ear drops don't. */
export const needsMeal = (form: string, frequency: string): boolean => {
  const kind = formKind(form);
  if (kind === "drops") return frequency.includes("by mouth");
  return KINDS[kind].oral;
};

export const MEALS = ["Before Meal", "After Meal", "With Meal", "Empty Stomach"];

const PATTERN = /^([^+·]+)\+([^+·]+)\+([^+·]+)$/;
/** "0+0+0" is the untouched pattern, which is not a real instruction. */
export const isSigFilled = (frequency: string): boolean => !!frequency.trim() && !/^0\+0\+0$/.test(frequency.trim());

type Parts = { mode: "schedule" | "times"; m: string; a: string; n: string; amount: string; site: string; times: string };

/** Reads the chips back out of a saved string, so reopening a line highlights what it was built from. */
const parse = (kind: Kind, value: string): Parts => {
  const base: Parts = { mode: kind.schedule ? "schedule" : "times", m: "0", a: "0", n: "0", amount: "", site: "", times: "" };
  const v = value.trim();
  const p = v.match(PATTERN);
  if (p && kind.schedule) return { ...base, mode: "schedule", m: p[1].trim(), a: p[2].trim(), n: p[3].trim() };
  if (!v) return base;
  const bits = v.split(" · ");
  const timesList = kind.times ?? TIMES;
  const last = bits[bits.length - 1];
  const times = timesList.includes(last) ? last : "";
  const head = times ? bits.slice(0, -1).join(" · ") : v;
  const amount = [...kind.amounts].sort((x, y) => y.length - x.length).find((a) => head.startsWith(a)) ?? "";
  const site = amount ? head.slice(amount.length).trim() : "";
  return { ...base, mode: "times", amount, site: kind.sites?.includes(site) ? site : "", times };
};

const compose = (p: Parts): string =>
  p.mode === "schedule"
    ? `${p.m}+${p.a}+${p.n}`
    : [[p.amount, p.site].filter(Boolean).join(" "), p.times].filter(Boolean).join(" · ");

const chip = (on: boolean) =>
  `rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-chip"}`;

type Props = {
  form: string;
  value: string;
  onChange: (frequency: string) => void;
  meal: string;
  onMealChange: (meal: string) => void;
  invalid?: boolean;
};

/**
 * Remount it with `key={formKind(form)}` so a change of form starts from that
 * form's own chips. The parent clears `value` on the same change.
 */
export const MedicineSig = ({ form, value, onChange, meal, onMealChange, invalid }: Props) => {
  const t = useTranslations("portal.prescription");
  const kind = KINDS[formKind(form)];
  const [parts, setParts] = useState<Parts>(() => parse(kind, value));

  const update = (patch: Partial<Parts>) => {
    const next = { ...parts, ...patch };
    setParts(next);
    onChange(compose(next));
  };
  // Clicking the chip that's already on turns it off, so an optional part like the site can be dropped again.
  const toggle = (key: "amount" | "site" | "times", v: string) => update({ [key]: parts[key] === v ? "" : v });

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label>{t("frequency")}</Label>
          {kind.schedule && (
            <div className="flex rounded-full border border-border p-0.5 text-[11px] font-semibold">
              {(["schedule", "times"] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => update({ mode })}
                  className={`rounded-full px-2.5 py-0.5 transition-colors ${parts.mode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {mode === "schedule" ? t("sigSchedule") : t("sigTimes")}
                </button>
              ))}
            </div>
          )}
        </div>

        {parts.mode === "schedule" && kind.schedule ? (
          <div className="grid grid-cols-3 gap-2">
            {([["m", t("morning")], ["a", t("afternoon")], ["n", t("night")]] as const).map(([slot, label]) => (
              <div key={slot} className="space-y-1">
                <p className="text-[10px] text-muted-foreground text-center">{label}</p>
                <Select value={parts[slot]} onValueChange={(v) => update({ [slot]: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {kind.schedule!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {kind.amounts.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">{t("sigAmount")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {kind.amounts.map((a) => <button key={a} type="button" onClick={() => toggle("amount", a)} className={chip(parts.amount === a)}>{a}</button>)}
                </div>
              </div>
            )}
            {kind.sites && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">{kind.siteLabel === "route" ? t("sigRoute") : t("sigWhere")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {kind.sites.map((s) => <button key={s} type="button" onClick={() => toggle("site", s)} className={chip(parts.site === s)}>{s}</button>)}
                </div>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">{t("sigHowOften")}</p>
              <div className="flex flex-wrap gap-1.5">
                {(kind.times ?? TIMES).map((x) => <button key={x} type="button" onClick={() => toggle("times", x)} className={chip(parts.times === x)}>{x}</button>)}
              </div>
            </div>
          </div>
        )}

        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={t("sigPlaceholder")}
          aria-invalid={invalid} className={`mt-2 ${invalid ? "border-destructive focus-visible:ring-destructive" : ""}`} />
      </div>

      {needsMeal(form, value) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {MEALS.map((m) => (
            <button key={m} type="button" onClick={() => onMealChange(meal === m ? "" : m)}
              className={`rounded-lg px-2 py-2 text-xs font-semibold border transition-colors ${meal === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-chip"}`}>{m}</button>
          ))}
        </div>
      )}
    </div>
  );
};
