"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Barcode, Check, CircleDot, Clock, History, Layers, Package, Pill as PillIcon, Search, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDebounced } from "@/components/pharmacy/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatters } from "@/lib/appSettings";
import { priceOf, sizeOf, unitsOf, type PosItem, type SaleUnit } from "@/lib/pharmacy";
import { usePosItemsQuery } from "@/redux/api/pharmacy";

/** Box first, then strip, then the single piece: the order a counter reaches for them. */
export const UNIT_ORDER: SaleUnit[] = ["box", "strip", "unit"];
export const UNIT_ICON = { box: Package, strip: Layers, unit: CircleDot } as const;

/** "3* napa" or "2x seclo": a quantity typed in front of the name. */
export const parseSearch = (text: string) => {
  const trimmed = text.trim();
  const match = trimmed.match(/^(\d+)\s*[*xX]\s*(.*)$/);
  return match
    ? { multiplier: Math.max(1, parseInt(match[1], 10) || 1), query: match[2].trim() }
    : { multiplier: 1, query: trimmed };
};

/** The part of a name that matches what was typed, marked. */
const Highlight = ({ text, query }: { text?: string | null; query: string }) => {
  if (!text) return null;
  if (!query) return <>{text}</>;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-accent/60 text-accent-foreground font-bold px-0.5 rounded-sm">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
};

/**
 * The till's search box, with a list that drops under it.
 *
 * Typing searches the whole catalogue by brand, generic, SKU or company. With
 * nothing typed the list is what has been selling lately. Enter adds the
 * highlighted row — or, when what was typed is exactly a SKU, that product,
 * which is what a barcode scanner sends. "/" or Ctrl+K puts the cursor here.
 */
export const PosSearch = ({ value, onChange, onAdd }: {
  value: string;
  onChange: (value: string) => void;
  onAdd: (item: PosItem, quantity: number, unit: SaleUnit) => void;
}) => {
  const t = useTranslations("pharmacy.pos");
  const tu = useTranslations("pharmacy.units");
  const { formatCurrency, formatDate } = useFormatters();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [added, setAdded] = useState<string | null>(null);
  // Every brand of one generic, when that has been asked for.
  const [generic, setGeneric] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseSearch(value), [value]);
  const settled = useDebounced(generic ?? parsed.query, 200);
  const { data, isFetching } = usePosItemsQuery({ q: settled, limit: 12 });

  const rows = useMemo(() => {
    const list = data?.data ?? [];
    return generic ? list.filter(item => item.generic_name?.toLowerCase().trim() === generic.toLowerCase().trim()) : list;
  }, [data, generic]);

  useEffect(() => { setActive(0); }, [rows]);

  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement | null)?.tagName ?? "");
      if ((event.key === "/" && !typing) || (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey))) {
        event.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    const away = (event: MouseEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("keydown", focus);
    document.addEventListener("mousedown", away);
    return () => { document.removeEventListener("keydown", focus); document.removeEventListener("mousedown", away); };
  }, []);

  const add = (item: PosItem, unit: SaleUnit = "unit") => {
    if (item.sellable < sizeOf(item, unit)) return;
    onAdd(item, parsed.multiplier, unit);
    setAdded(`${parsed.multiplier > 1 ? `${parsed.multiplier}× ` : ""}${item.name}${unit !== "unit" ? ` · ${tu(unit)}` : ""}`);
    setTimeout(() => setAdded(null), 2500);
  };

  const addAndClear = (item: PosItem) => {
    add(item);
    onChange("");
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) { setOpen(true); return; }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (rows.length) setActive(index => (index + 1) % rows.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (rows.length) setActive(index => (index - 1 + rows.length) % rows.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      // A scanned barcode is a whole SKU: that product wins over whatever row is highlighted.
      const exact = rows.find(item => item.sku.toLowerCase() === parsed.query.toLowerCase());
      const pick = exact ?? rows[active];
      if (pick) addAndClear(pick);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (generic) setGeneric(null);
      else { setOpen(false); input.current?.blur(); }
    }
  };

  const typed = value.trim().length > 0;

  return (
    <div ref={box} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-primary pointer-events-none" />
        <input ref={input} value={value} autoFocus
          onChange={event => { onChange(event.target.value); setGeneric(null); setOpen(true); }}
          onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
          placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")}
          className="w-full rounded-2xl border border-border/60 bg-card pl-10 pr-44 py-3 text-sm shadow-soft outline-none focus:border-primary/60" />
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {parsed.multiplier > 1 && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{t("qtyBadge", { count: parsed.multiplier })}</span>
          )}
          {typed ? (
            <button type="button" onClick={() => { onChange(""); setGeneric(null); input.current?.focus(); }} title={t("clearSearch")} aria-label={t("clearSearch")}
              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted"><X className="h-4 w-4" /></button>
          ) : (
            <span className="hidden sm:flex items-center gap-1 rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              / <span className="font-sans">{t("or")}</span> Ctrl K
            </span>
          )}
          <span className="hidden md:flex text-muted-foreground" title={t("scanHint")}><Barcode className="h-4 w-4" /></span>
        </div>
      </div>

      {added && (
        <div className="absolute right-0 -top-9 z-30 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg">
          <Check className="h-3.5 w-3.5" /> <span className="truncate max-w-[260px]">{t("addedToast", { name: added })}</span>
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
          {generic && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-violet-50 px-3.5 py-2 text-xs text-violet-900">
              <span className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-4 w-4" /> <span className="font-semibold">{t("substitutesFor")}</span>
                <span className="font-bold underline">{generic}</span>
                <span className="rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-bold">{t("availableCount", { count: rows.length })}</span>
              </span>
              <button type="button" onClick={() => { setGeneric(null); input.current?.focus(); }} className="inline-flex items-center gap-1 font-semibold hover:underline">
                {t("clearFilter")} <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-3.5 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-primary">
              {generic ? t("brandsAvailable") : typed ? (
                <><Search className="h-3.5 w-3.5" /> {t("suggested", { count: rows.length })}</>
              ) : (
                <><Clock className="h-3.5 w-3.5" /> {t("recentUses")}</>
              )}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              {typed ? (
                <>{t("press")} <kbd className="rounded border border-border/60 bg-card px-1 py-0.5 font-mono">↵ Enter</kbd> {t("toAdd")}{parsed.multiplier > 1 ? ` (${parsed.multiplier}×)` : ""}</>
              ) : (
                <><History className="h-3 w-3" /> {t("frequentlySold")}</>
              )}
            </span>
          </div>

          <div className={`max-h-[380px] overflow-y-auto divide-y divide-border/40 ${isFetching ? "opacity-70" : ""}`}>
            {rows.length === 0 && isFetching && <div className="p-3"><Skeleton className="h-10 w-full" /></div>}
            {rows.length === 0 && !isFetching && (
              <div className="py-8 px-4 text-center">
                <Package className="h-6 w-6 mx-auto text-muted-foreground/60" />
                <p className="mt-2 text-sm font-semibold text-primary">{t("noProducts")}</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">{t("noProductsHint")}</p>
              </div>
            )}
            {rows.map((item, index) => {
              const out = item.sellable <= 0;
              const units = UNIT_ORDER.filter(unit => unitsOf(item).includes(unit));
              return (
                <div key={item.id} onMouseEnter={() => setActive(index)} onClick={() => !out && addAndClear(item)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${out ? "opacity-60" : "cursor-pointer"} ${
                    index === active ? "bg-accent/30 border-l-4 border-primary pl-2.5" : "hover:bg-muted/40"
                  }`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.requires_prescription ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700"><PillIcon className="h-2.5 w-2.5" /> {t("rxOnly")}</span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">{t("otc")}</span>
                      )}
                      <span className="text-sm font-semibold text-primary"><Highlight text={item.name} query={parsed.query} /></span>
                      {item.category && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/70">{item.category}</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {item.generic_name && (
                        <button type="button" title={t("sameGeneric")} onClick={event => { event.stopPropagation(); setGeneric(item.generic_name); setOpen(true); }}
                          className="hover:text-primary hover:underline"><Highlight text={item.generic_name} query={parsed.query} /></button>
                      )}
                      <span className="font-mono text-[11px]">SKU: <Highlight text={item.sku} query={parsed.query} /></span>
                      {item.next_expiry && <span className="text-[11px]">{t("exp", { date: formatDate(item.next_expiry) })}</span>}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${out ? "text-destructive" : item.sellable > 20 ? "text-emerald-700" : "text-amber-700"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${out ? "bg-destructive" : item.sellable > 20 ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {out ? t("outOfStock") : item.sellable > 20 ? t("inStock", { count: item.sellable }) : t("lowLeft", { count: item.sellable })}
                    </span>
                    <div className="flex items-center gap-1">
                      {units.map(unit => {
                        const Icon = UNIT_ICON[unit];
                        return (
                          <button key={unit} type="button" disabled={item.sellable < sizeOf(item, unit)}
                            onClick={event => { event.stopPropagation(); add(item, unit); }} title={t("dispenseOne", { unit: tu(unit) })}
                            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card px-1.5 py-1 text-[10px] font-semibold tabular-nums hover:border-primary/60 hover:text-primary disabled:opacity-40 disabled:pointer-events-none">
                            <Icon className="h-3 w-3" /> {tu(unit)} {formatCurrency(priceOf(item, unit))}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
