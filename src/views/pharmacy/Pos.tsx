"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, ArrowLeft, Banknote, Check, CheckCircle2, Clock, CreditCard, Flame, Gift, Landmark, Layers, Minus, Package, Pause,
  Phone, Pill as PillIcon, Play, Plus, Receipt, RotateCcw, ShieldAlert, ShoppingCart, Smartphone, Sparkles, Split, Trash2, UserPlus, Users, Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { PosSearch, UNIT_ICON, UNIT_ORDER, parseSearch } from "@/components/pharmacy/PosSearch";
import { ReceiptDialog } from "@/components/pharmacy/ReceiptDialog";
import { ReturnDialog, ReturnLookup } from "@/components/pharmacy/ReturnDialog";
import { CustomerPicker, StateBlock, TierPill, useDebounced, usePharmacyCan, usePharmacyError } from "@/components/pharmacy/ui";
import { Btn, Card } from "@/components/admin/ui";
import { Field, Input, Modal, Select } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import {
  PAYMENT_METHODS, priceOf, sizeOf, tierRate, unitsOf,
  type InteractionCheck, type InteractionLevel, type PaymentMethod, type PharmacyCustomer, type PharmacySale, type PosItem, type SaleUnit, type SplitMethod,
} from "@/lib/pharmacy";
import {
  pharmacyCustomersApi, useCheckInteractionsMutation, useCreateSaleMutation, useDrawerQuery, usePharmacySettingsQuery, usePosItemsQuery,
} from "@/redux/api/pharmacy";

const LEVEL_STYLE: Record<InteractionLevel, string> = {
  minor: "bg-muted text-foreground/70", moderate: "bg-yellow-100 text-yellow-800",
  major: "bg-orange-100 text-orange-900", severe: "bg-destructive/10 text-destructive",
};

/** `quantity` counts whatever `unit` is: 2 with "strip" is two strips. */
type CartLine = { item: PosItem; unit: SaleUnit; quantity: number };

/** An order put aside while the next customer is served. Kept in this browser only. */
type HeldOrder = { id: string; at: string; lines: CartLine[]; customer: PharmacyCustomer | null; walkInName: string; total: number };

const HELD_KEY = "healthflow.pharmacy.heldOrders";
/** The two views of the catalogue that are not one of the hospital's own categories. */
const RECENT = "__recent";
const ALL = "__all";

const METHOD_ICON: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote, card: CreditCard, mobile: Smartphone, split: Split, other: Wallet, credit: Landmark, store_credit: Gift,
};
const CASH_NOTES = [50, 100, 200, 500, 1000];
const CARD_HINTS = ["Visa", "Mastercard", "Amex", "POS Terminal"];
const WALLET_HINTS = ["bKash", "Nagad", "Rocket", "Upay"];

const round2 = (value: number) => Math.round(value * 100) / 100;
const keyOf = (line: Pick<CartLine, "item" | "unit">) => `${line.item.id}:${line.unit}`;
/** How many single units of this product the lines take, leaving one line out. */
const unitsTaken = (lines: CartLine[], itemId: string, except?: string) =>
  lines.filter(line => line.item.id === itemId && keyOf(line) !== except).reduce((sum, line) => sum + line.quantity * sizeOf(line.item, line.unit), 0);

const readHeld = (): HeldOrder[] => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(HELD_KEY) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const NewCustomerDialog = ({ open, phone, onClose, onSaved }: {
  open: boolean; phone: string; onClose: () => void; onSaved: (customer: PharmacyCustomer) => void;
}) => {
  const t = useTranslations("pharmacy.pos");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const [create, { isLoading }] = pharmacyCustomersApi.useCreate();

  if (!open) return null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const saved = await create({
        name: String(form.get("name") ?? ""), phone: String(form.get("phone") ?? ""), email: String(form.get("email") ?? "") || null,
      }).unwrap();
      toast.success(t("customerSaved"));
      // A new customer has no points, credit or tier yet; the list would say the same.
      onSaved({ ...(saved.data as PharmacyCustomer), points: 0, lifetime_points: 0, store_credit: 0, tier: "bronze" });
      onClose();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <Modal open onClose={onClose} title={t("registerCustomer")} size="sm">
      <p className="text-sm text-muted-foreground -mt-1 mb-4">{t("registerHint")}</p>
      <form onSubmit={submit}>
        <Field label={t("customerName")} required><Input name="name" required autoFocus /></Field>
        <Field label={t("customerPhone")} required><Input name="phone" type="tel" required defaultValue={phone} /></Field>
        <Field label={t("customerEmail")}><Input name="email" type="email" /></Field>
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose}>{tc("cancel")}</Btn>
          <Btn type="submit" disabled={isLoading}>{isLoading ? tc("saving") : t("registerNow")}</Btn>
        </div>
      </form>
    </Modal>
  );
};

const Page = () => {
  const t = useTranslations("pharmacy.pos");
  const tc = useTranslations("pharmacy.common");
  const tm = useTranslations("pharmacy.methods");
  const tu = useTranslations("pharmacy.units");
  const describe = usePharmacyError();
  const can = usePharmacyCan();
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState(RECENT);
  const typed = parseSearch(q).query;
  const search = useDebounced(typed, 250);
  const browsing = category !== RECENT && category !== ALL;
  // "Recent uses" is what this pharmacy has been selling: the nine best sellers of the last 30 days.
  const { data, isLoading, isFetching, error, refetch } = usePosItemsQuery({
    q: search, category: browsing ? category : "", limit: category === RECENT ? 9 : 24,
  });
  const { data: fast } = usePosItemsQuery({ q: "", category: "", limit: 9 });
  const { data: settingsData } = usePharmacySettingsQuery();
  const { data: drawer } = useDrawerQuery();
  const [createSale, { isLoading: selling }] = useCreateSaleMutation();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitOther, setSplitOther] = useState("");
  const [splitType, setSplitType] = useState<Exclude<SplitMethod, "cash">>("card");
  const [splitRef, setSplitRef] = useState("");
  const [discount, setDiscount] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [customer, setCustomer] = useState<PharmacyCustomer | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [newCustomer, setNewCustomer] = useState<{ phone: string } | null>(null);
  const [done, setDone] = useState<PharmacySale | null>(null);
  const [receipt, setReceipt] = useState<PharmacySale | null>(null);
  const [held, setHeld] = useState<HeldOrder[]>([]);
  const [showHeld, setShowHeld] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [returning, setReturning] = useState<PharmacySale | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [checkInteractions, checking] = useCheckInteractionsMutation();
  const [interactions, setInteractions] = useState<InteractionCheck | null>(null);

  /** Asks the model whether the medicines in this order are safe together. Advice for the pharmacist; it blocks nothing. */
  const runCheck = async () => {
    const seen = new Map(cart.map(line => [line.item.id, { name: line.item.name, generic_name: line.item.generic_name }]));
    try {
      const answer = await checkInteractions({ items: [...seen.values()] }).unwrap();
      setInteractions(answer.data);
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  // Held orders live in this browser, so they are read after the page is on screen.
  useEffect(() => { setHeld(readHeld()); }, []);

  const saveHeld = (next: HeldOrder[]) => {
    setHeld(next);
    try { window.localStorage.setItem(HELD_KEY, JSON.stringify(next)); } catch { /* a full or blocked store only loses the hold */ }
  };

  const items = data?.data ?? [];
  const categories = data?.categories ?? [];
  const fastPicks = (fast?.data ?? []).filter(item => item.sellable > 0).slice(0, 6);
  const settings = settingsData?.data;
  const taxRate = Number(settings?.tax_rate ?? 0);
  const drawerOpen = Boolean(drawer?.data);
  const mayDiscount = can("discount");
  const loyalty = Boolean(settings?.loyalty_enabled && customer);
  const pointValue = Number(settings?.loyalty_point_value ?? 1);
  const minRedeem = Number(settings?.loyalty_min_redeem ?? 50);
  const credit = Number(customer?.store_credit ?? 0);

  const totals = useMemo(() => {
    const subtotal = round2(cart.reduce((sum, line) => sum + priceOf(line.item, line.unit) * line.quantity, 0));
    const off = mayDiscount ? Math.min(Math.max(Number(discount) || 0, 0), subtotal) : 0;
    // Points can cover what is left after a discount, and no more than the customer has.
    const mostPoints = loyalty && pointValue > 0 ? Math.min(customer?.points ?? 0, Math.floor((subtotal - off) / pointValue)) : 0;
    const points = redeeming && mostPoints >= minRedeem ? mostPoints : 0;
    const pointsOff = round2(points * pointValue);
    const tax = round2(((subtotal - off - pointsOff) * taxRate) / 100);
    const total = round2(subtotal - off - pointsOff + tax);
    const earn = loyalty && settings && total > 0
      ? Math.floor((total / Number(settings.loyalty_spend_per_point)) * tierRate(settings, customer?.tier ?? "bronze"))
      : 0;
    return { subtotal, discount: off, points, pointsOff, mostPoints, tax, total, earn, count: cart.reduce((sum, line) => sum + line.quantity, 0) };
  }, [cart, discount, redeeming, taxRate, mayDiscount, loyalty, pointValue, minRedeem, customer, settings]);

  const cash = Number(tendered) || 0;
  const change = method === "cash" ? Math.max(round2(cash - totals.total), 0) : 0;
  const splitCashNum = Math.max(Number(splitCash) || 0, 0);
  const splitOtherNum = Math.max(Number(splitOther) || 0, 0);
  /** Above zero is change to hand back; below zero is still owed. */
  const splitDiff = round2(splitCashNum + splitOtherNum - totals.total);

  const setQuantity = (line: Pick<CartLine, "item" | "unit">, quantity: number) => {
    setDone(null);
    setCart(lines => {
      const key = keyOf(line);
      // Never more than can be sold: the database would refuse the sale anyway.
      const room = line.item.sellable - unitsTaken(lines, line.item.id, key);
      const capped = Math.min(Math.max(Math.floor(quantity) || 0, 0), Math.floor(room / sizeOf(line.item, line.unit)));
      const exists = lines.some(existing => keyOf(existing) === key);
      if (capped <= 0) return lines.filter(existing => keyOf(existing) !== key);
      return exists
        ? lines.map(existing => (keyOf(existing) === key ? { ...existing, quantity: capped } : existing))
        : [...lines, { item: line.item, unit: line.unit, quantity: capped }];
    });
    setFlash(keyOf(line));
    setTimeout(() => setFlash(null), 900);
  };

  const add = (item: PosItem, quantity = 1, unit: SaleUnit = "unit") => {
    const inCart = cart.find(line => keyOf(line) === keyOf({ item, unit }))?.quantity ?? 0;
    const room = item.sellable - unitsTaken(cart, item.id);
    if (room < sizeOf(item, unit)) { toast.error(t("onlyLeft", { count: Math.max(room, 0) })); return; }
    setQuantity({ item, unit }, inCart + quantity);
  };

  /** The same line, counted another way. Two strips become two boxes only if the shelf has them. */
  const changeUnit = (line: CartLine, unit: SaleUnit) => {
    if (unit === line.unit) return;
    setCart(lines => {
      const target = keyOf({ item: line.item, unit });
      const without = lines.filter(existing => keyOf(existing) !== keyOf(line));
      const room = line.item.sellable - unitsTaken(without, line.item.id, target);
      const merged = (without.find(existing => keyOf(existing) === target)?.quantity ?? 0) + line.quantity;
      const capped = Math.min(merged, Math.floor(room / sizeOf(line.item, unit)));
      if (capped <= 0) { toast.error(t("onlyLeft", { count: Math.max(room, 0) })); return lines; }
      // In place, so the row does not jump down the list when its unit changes.
      return lines.flatMap(existing =>
        keyOf(existing) === keyOf(line) ? [{ item: line.item, unit, quantity: capped }] : keyOf(existing) === target ? [] : [existing]);
    });
  };

  const reset = () => {
    setCart([]);
    setTendered(""); setReference(""); setDiscount(""); setRedeeming(false); setWalkInName(""); setCustomer(null);
    setSplitCash(""); setSplitOther(""); setSplitRef(""); setSplitType("card");
    setMethod("cash");
  };

  const asHeld = (): HeldOrder => ({ id: `${Date.now()}`, at: new Date().toISOString(), lines: cart, customer, walkInName, total: totals.total });

  const hold = () => {
    if (cart.length === 0) return;
    saveHeld([asHeld(), ...held].slice(0, 20));
    reset();
    toast.success(t("orderHeld"));
  };

  const resume = (order: HeldOrder) => {
    // Whatever is on the counter now goes on hold in its place.
    const rest = held.filter(other => other.id !== order.id);
    saveHeld(cart.length > 0 ? [asHeld(), ...rest] : rest);
    setDone(null);
    setCart(order.lines);
    setCustomer(order.customer);
    setWalkInName(order.walkInName);
    setRedeeming(false);
    setShowHeld(false);
  };

  const pickCustomer = (next: PharmacyCustomer | null) => {
    setCustomer(next);
    setRedeeming(false);
    // Store credit and "on account" both need the customer they belonged to.
    if (!next && (method === "store_credit" || method === "credit")) setMethod("cash");
    if (!next && splitType === "store_credit") setSplitType("card");
  };

  const pickMethod = (next: PaymentMethod) => {
    setMethod(next);
    setReference("");
    // A split starts as half and half, the way it is usually asked for.
    if (next === "split" && !splitCash && !splitOther && totals.total > 0) {
      const half = round2(totals.total / 2);
      setSplitCash(half.toFixed(2));
      setSplitOther(round2(totals.total - half).toFixed(2));
    }
  };

  const needsDrawer = method === "cash" || (method === "split" && splitCashNum > 0);
  const blocked =
    cart.length === 0 ? "empty"
    : needsDrawer && !drawerOpen ? "drawer"
    : method === "cash" && cash < totals.total ? "short"
    : (method === "credit" || method === "store_credit") && !customer ? "customer"
    : method === "store_credit" && credit < totals.total ? "credit"
    : method === "split" && (splitCashNum <= 0 || splitOtherNum <= 0) ? "splitParts"
    : method === "split" && splitOtherNum > totals.total ? "splitOver"
    : method === "split" && splitDiff < 0 ? "splitShort"
    : method === "split" && splitType === "store_credit" && splitOtherNum > credit ? "credit"
    : null;

  const complete = async () => {
    try {
      const saved = await createSale({
        items: cart.map(line => ({ item_id: line.item.id, quantity: line.quantity, unit: line.unit })),
        payment_method: method,
        payments: method === "split"
          ? [{ method: "cash", amount: splitCashNum, reference: null }, { method: splitType, amount: splitOtherNum, reference: splitRef.trim() || null }]
          : null,
        tendered: method === "cash" ? cash : 0,
        discount: totals.discount,
        redeem_points: totals.points,
        customer_id: customer?.id ?? null,
        customer_name: customer ? null : walkInName.trim() || null,
        payment_reference: reference.trim() || null,
      }).unwrap();
      setDone(saved.data);
      // The invoice opens by itself, ready to print.
      setReceipt(saved.data);
      reset();
      toast.success(t("saleDone", { invoice: saved.data.invoice_number }));
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  const hasRx = cart.some(line => line.item.requires_prescription);
  // Store credit is only offered to a customer who has some.
  const methods: PaymentMethod[] = [...PAYMENT_METHODS, ...(credit > 0 ? (["store_credit"] as const) : [])];
  const splitTypes: Exclude<SplitMethod, "cash">[] = ["card", "mobile", "other", ...(credit > 0 ? (["store_credit"] as const) : [])];
  const tabs = [{ value: RECENT, label: t("recentUses") }, { value: ALL, label: tc("all") }, ...categories.map(name => ({ value: name, label: name }))];
  const heading = typed ? t("searchResults", { count: items.length }) : category === RECENT ? t("recentUses") : category === ALL ? tc("all") : category;
  const chip = "px-2.5 py-1 rounded-lg text-xs font-medium bg-card border border-border/60 text-foreground/80 hover:border-primary/50 hover:text-primary transition";
  const panel = "rounded-2xl bg-muted/40 p-3.5 space-y-3";
  /** The three buttons in the top bar: smaller than a page's main button, so the bar stays one line. */
  const small = "!px-2.5 !py-1 !text-xs !gap-1.5";

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")}
      actions={<>
        <Btn variant="outline" onClick={() => setLookingUp(true)} className={small}><RotateCcw className="h-3.5 w-3.5" /> {t("customerReturn")}</Btn>
        {held.length > 0 && (
          <Btn variant="outline" onClick={() => setShowHeld(true)} className={small}><Pause className="h-3.5 w-3.5" /> {t("heldCount", { count: held.length })}</Btn>
        )}
        <Link href="/pharmacy/cash-drawer"><Btn variant="outline" className={small}><ArrowLeft className="h-3.5 w-3.5" /> {t("backToDrawer")}</Btn></Link>
      </>}>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Product catalogue */}
        <div className="flex-1 min-w-0 space-y-4">
          <PosSearch value={q} onChange={setQ} onAdd={add} />

          {fastPicks.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground"><Flame className="h-3.5 w-3.5 text-amber-500" /> {t("fastPick")}</span>
              {fastPicks.map(item => (
                <button key={item.id} type="button" onClick={() => add(item)} title={t("quickAdd", { name: item.name })}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:border-primary/50 hover:text-primary transition">
                  <PillIcon className="h-3.5 w-3.5" /> <span className="max-w-[140px] truncate">{item.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">({formatCurrency(Number(item.selling_price))})</span>
                </button>
              ))}
            </div>
          )}

          {typed && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent/30 px-3.5 py-2 text-xs text-accent-foreground">
              <span className="font-medium">
                {t("showingResults", { count: items.length, query: typed })}
                {browsing && <span className="font-semibold"> · {category}</span>}
              </span>
              <button type="button" onClick={() => setQ("")} className="font-semibold underline">{t("clearSearch")}</button>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-primary">{heading}</h2>
              {(typed || category !== RECENT) && (
                <span className="rounded-full bg-accent/50 px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">{t("itemsCount", { count: items.length })}</span>
              )}
            </div>
            {category !== RECENT && !typed && (
              <button type="button" onClick={() => setCategory(RECENT)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <Clock className="h-3.5 w-3.5" /> {t("backToRecent")}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tabs.map(tab => (
              <button key={tab.value} type="button" onClick={() => setCategory(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  category === tab.value ? "bg-primary text-primary-foreground shadow-soft" : "bg-card border border-border/60 text-foreground/70 hover:bg-muted/60"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading || error ? (
            <StateBlock loading={isLoading} error={error} onRetry={refetch} rows={6} />
          ) : items.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="h-7 w-7 mx-auto text-muted-foreground/60" />
              <p className="mt-2 text-sm font-semibold text-primary">{t("noProducts")}</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">{typed || browsing ? t("noMatchFilters") : t("addProductsFirst")}</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {typed && <Btn variant="outline" onClick={() => setQ("")}>{t("clearSearch")}</Btn>}
                {category !== RECENT && <Btn variant="outline" onClick={() => setCategory(RECENT)}>{t("showRecent")}</Btn>}
              </div>
            </Card>
          ) : (
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 ${isFetching ? "opacity-60" : ""} transition-opacity`}>
              {items.map((item, index) => {
                const out = item.sellable <= 0;
                const units = UNIT_ORDER.filter(unit => unitsOf(item).includes(unit));
                const biggest = units[0];
                return (
                  <div key={item.id} className={`flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-3.5 shadow-soft transition hover:border-primary/50 hover:shadow-md ${out ? "opacity-60" : ""}`}>
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex min-w-0 items-center gap-1">
                          {item.requires_prescription
                            ? <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700" title={t("prescriptionNote")}>{t("rx")}</span>
                            : <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">{t("otc")}</span>}
                          {item.category && <span className="truncate rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{item.category}</span>}
                          {category === RECENT && !typed && <span className="rounded bg-accent/50 px-1 text-[9px] font-mono font-medium text-accent-foreground">#{index + 1}</span>}
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{item.sku}</span>
                      </div>
                      <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-primary">{item.name}</h3>
                      {item.generic_name && (
                        // The same medicine under other names: search by what is in it.
                        <button type="button" onClick={() => { setQ(item.generic_name ?? ""); setCategory(ALL); }} title={t("sameGeneric")}
                          className="mt-0.5 block max-w-full truncate text-left text-[11px] text-muted-foreground hover:text-primary hover:underline">{item.generic_name}</button>
                      )}
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className={`font-medium ${out ? "text-destructive" : "text-foreground/70"}`}>{out ? t("outOfStock") : t("stockCount", { count: item.sellable })}</span>
                        {item.next_expiry && <span className="text-[10px] text-muted-foreground">{t("exp", { date: formatDate(item.next_expiry) })}</span>}
                      </div>
                    </div>

                    {units.length > 1 ? (
                      <div className="mt-3 space-y-1.5 border-t border-border/40 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground"><Layers className="h-3 w-3 text-primary" /> {t("dispense")}</span>
                          <span className="font-mono text-xs font-bold text-primary">{formatCurrency(priceOf(item, biggest))} / {tu(biggest)}</span>
                        </div>
                        <div className="flex items-stretch gap-1.5">
                          {units.map(unit => {
                            const Icon = UNIT_ICON[unit];
                            return (
                              <button key={unit} type="button" disabled={item.sellable < sizeOf(item, unit)} onClick={() => add(item, 1, unit)}
                                title={t("dispenseOne", { unit: tu(unit) })}
                                className="flex flex-1 flex-col items-center gap-0.5 rounded-lg border border-border/60 bg-muted/30 px-1 py-1.5 transition hover:border-primary/60 hover:bg-primary/5 disabled:opacity-40 disabled:pointer-events-none">
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-foreground/90"><Icon className="h-3.5 w-3.5 shrink-0" /> {tu(unit)}</span>
                                <span className="font-mono text-[10px] font-medium text-muted-foreground">{formatCurrency(priceOf(item, unit))}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
                        <span className="font-mono text-sm font-bold text-primary">{formatCurrency(Number(item.selling_price))}</span>
                        <button type="button" disabled={out} onClick={() => add(item)} title={t("addToOrder")} aria-label={t("addToOrder")}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Current order */}
        <Card className="w-full lg:w-[420px] shrink-0 p-4 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-primary">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10"><ShoppingCart className="h-3.5 w-3.5" /></span> {t("cart")}
            </h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent/50 px-2.5 py-0.5 text-xs font-bold text-accent-foreground">{t("items", { count: totals.count })}</span>
              {cart.length > 0 && <>
                <button type="button" onClick={hold} title={t("holdHint")} className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-semibold text-foreground/80 hover:border-primary/50 hover:text-primary">
                  <Pause className="h-3 w-3" /> {t("hold")}
                </button>
                <button type="button" onClick={() => setCart([])} className="text-[11px] font-semibold text-destructive hover:underline">{t("clear")}</button>
              </>}
            </div>
          </div>

          {hasRx && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2 text-[11px] text-sky-900">
              <PillIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" /> <span><b>{t("rxInCartTitle")}</b> {t("rxInCart")}</span>
            </p>
          )}

          {/* Two or more different medicines, and the checker switched on and set up on the server. */}
          {new Set(cart.map(line => line.item.id)).size >= 2 && settings?.ai_interactions && settingsData?.ai_configured && (
            <button type="button" onClick={runCheck} disabled={checking.isLoading}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold text-foreground/80 transition hover:border-primary/50 hover:text-primary disabled:opacity-60">
              <ShieldAlert className="h-3.5 w-3.5" /> {checking.isLoading ? t("checkingInteractions") : t("checkInteractions")}
            </button>
          )}

          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {cart.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">{t("cartEmpty")}</p>}
            {cart.map(line => {
              const { item, unit, quantity } = line;
              const each = priceOf(item, unit);
              const units = UNIT_ORDER.filter(value => unitsOf(item).includes(value));
              return (
                <div key={keyOf(line)} className={`space-y-1.5 rounded-2xl p-2.5 text-xs transition ${flash === keyOf(line) ? "bg-accent/40 ring-2 ring-primary/30" : "bg-muted/40"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.requires_prescription && <span className="rounded bg-red-100 px-1 text-[8px] font-bold text-red-700">{t("rx")}</span>}
                        <p className="truncate font-semibold text-primary">{item.name}</p>
                        <span className="rounded bg-accent/60 px-1.5 text-[10px] font-bold text-accent-foreground">{tu(unit)}</span>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{formatCurrency(each)} / {tu(unit)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="flex items-center overflow-hidden rounded-lg border border-border/60 bg-card">
                        <button type="button" onClick={() => setQuantity(line, quantity - 1)} className="p-1.5 hover:text-primary" aria-label="-"><Minus className="h-3 w-3" /></button>
                        <input value={quantity} onChange={event => setQuantity(line, Number(event.target.value))} inputMode="numeric" aria-label={tc("quantity")}
                          className="w-8 bg-transparent text-center font-mono font-bold outline-none" />
                        <button type="button" onClick={() => add(item, 1, unit)} className="p-1.5 hover:text-primary" aria-label="+"><Plus className="h-3 w-3" /></button>
                      </div>
                      <button type="button" onClick={() => setQuantity(line, 0)} className="p-1 text-muted-foreground hover:text-destructive" aria-label={tc("remove")}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5">
                    {units.length > 1 ? (
                      <>
                        {/* No "Dispense:" label and no icons here: the panel is narrow, and three buttons with icons pushed the line total out of the card. */}
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                          {units.map(value => (
                            <button key={value} type="button" onClick={() => changeUnit(line, value)}
                              className={`flex flex-col items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight transition ${
                                value === unit ? "bg-primary text-primary-foreground" : "bg-card border border-border/60 text-foreground/80 hover:border-primary/50"
                              }`}>
                              {/* Name above, price below: narrower than the two side by side. */}
                              <span>{tu(value)}</span>
                              <span className="font-mono font-medium opacity-80">{formatCurrency(priceOf(item, value))}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : <span />}
                    <span className="shrink-0 font-mono text-xs font-bold text-primary">{formatCurrency(round2(each * quantity))}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
            {/* Customer and loyalty */}
            <div className="rounded-2xl bg-muted/40 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-primary"><Users className="h-3.5 w-3.5" /> {t("customerLoyalty")}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setNewCustomer({ phone: "" })} title={t("registerHint")}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"><UserPlus className="h-3 w-3" /> {t("plusNew")}</button>
                  {customer && <button type="button" onClick={() => pickCustomer(null)} className="text-[11px] text-muted-foreground hover:text-destructive">{t("clear")}</button>}
                </div>
              </div>

              {customer ? (
                <div className="space-y-1.5 rounded-lg border border-primary/20 bg-accent/30 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-primary">
                      <span className="truncate">{customer.name}</span>
                      {settings?.loyalty_enabled && <TierPill tier={customer.tier} />}
                    </span>
                    {settings?.loyalty_enabled && <span className="shrink-0 font-mono text-xs font-bold text-primary">{t("pointsHeld", { count: customer.points })}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono"><Phone className="h-3 w-3" /> {customer.phone ?? "—"}</span>
                    {settings?.loyalty_enabled && <span>{t("pointsValue", { amount: formatCurrency(round2(customer.points * pointValue)) })}</span>}
                  </div>
                  {credit > 0 && <p className="text-[11px] font-semibold text-emerald-700">{t("creditHeld", { amount: formatCurrency(credit) })}</p>}
                  {customer.allergies && <p className="text-[11px] font-semibold text-destructive">{t("allergies", { list: customer.allergies })}</p>}
                  {totals.earn > 0 && (
                    <p className="flex items-center justify-between rounded-md bg-card/70 px-2 py-1 text-[11px] text-primary">
                      <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> {t("pointsToEarn")}</span><b>+{totals.earn}</b>
                    </p>
                  )}
                  {loyalty && totals.mostPoints >= minRedeem && (
                    <div className="flex items-center justify-between pt-1">
                      <button type="button" onClick={() => setRedeeming(value => !value)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold transition ${
                          redeeming ? "border-amber-600 bg-amber-500 text-white" : "border-border/60 bg-card text-amber-800 hover:bg-amber-50"
                        }`}>
                        <Gift className="h-3 w-3" /> {redeeming ? t("redeemed", { count: totals.points }) : t("redeemPoints")}
                      </button>
                      {redeeming && <span className="text-[11px] font-bold text-amber-700">-{formatCurrency(totals.pointsOff)}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <CustomerPicker value={null} onPick={pickCustomer} placeholder={t("findCustomer")} />
                  {method !== "credit" && (
                    <Input value={walkInName} onChange={event => setWalkInName(event.target.value)} placeholder={`${t("customerName")} · ${tc("walkIn")}`} />
                  )}
                </>
              )}
            </div>

            {/* Payment method */}
            <div>
              <span className="mb-2 block text-xs font-semibold text-foreground/80">{t("paymentMethod")}</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6 gap-1">
                {methods.map(value => {
                  const Icon = METHOD_ICON[value];
                  return (
                    <button key={value} type="button" onClick={() => pickMethod(value)}
                      className={`flex items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition ${
                        method === value ? "bg-primary text-primary-foreground font-semibold shadow-soft" : "bg-muted/40 text-foreground/80 hover:bg-muted"
                      } ${value === "store_credit" ? "col-span-full" : ""}`}>
                      <Icon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{tm(value)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {method === "cash" && (
              <div className={panel}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground/80">{t("cashReceived")}</span>
                  <Input value={tendered} onChange={event => setTendered(event.target.value)} inputMode="decimal" placeholder="0.00" className="!w-32 text-right font-mono" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {CASH_NOTES.map(note => (
                    <button key={note} type="button" onClick={() => setTendered(String(note))}
                      className={Number(tendered) === note ? "px-2.5 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground" : chip}>{note}</button>
                  ))}
                  <button type="button" onClick={() => setTendered(totals.total > 0 ? totals.total.toFixed(2) : "")}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20">{t("exact")}</button>
                </div>
                {change > 0 && totals.total > 0 && (
                  <p className="flex items-center justify-between rounded-xl bg-accent/40 px-3 py-2 text-sm text-accent-foreground">
                    <span className="font-medium">{t("changeDue")}</span><b className="font-mono">{formatCurrency(change)}</b>
                  </p>
                )}
              </div>
            )}

            {method === "split" && (
              <div className={panel}>
                <div className="flex items-center justify-between text-xs font-bold text-primary">
                  <span>{t("splitTitle")}</span>
                  <button type="button" onClick={() => setSplitOther(Math.max(0, round2(totals.total - splitCashNum)).toFixed(2))}
                    className="text-[11px] font-semibold hover:underline">{t("autoBalance")}</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-foreground/70" htmlFor="split-cash">{t("cashPortion")}</label>
                    <Input id="split-cash" value={splitCash} onChange={event => setSplitCash(event.target.value)} inputMode="decimal" placeholder="0.00" className="text-right font-mono" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <label className="text-[11px] font-medium text-foreground/70" htmlFor="split-other">{t("otherPortion")}</label>
                      <Select value={splitType} onChange={event => setSplitType(event.target.value as typeof splitType)} aria-label={t("paymentMethod")}
                        className="!w-auto !py-0.5 !px-1.5 !text-[11px]">
                        {splitTypes.map(value => <option key={value} value={value}>{tm(value)}</option>)}
                      </Select>
                    </div>
                    <Input id="split-other" value={splitOther} onChange={event => setSplitOther(event.target.value)} inputMode="decimal" placeholder="0.00" className="text-right font-mono" />
                  </div>
                </div>
                {splitType !== "store_credit" && (
                  <Input value={splitRef} onChange={event => setSplitRef(event.target.value)} placeholder={t("splitRef", { method: tm(splitType) })} />
                )}
                <div className={`flex items-center justify-between rounded-xl border p-2 text-xs font-semibold ${
                  blocked === "splitOver" || blocked === "credit" || splitDiff < 0 ? "border-amber-200 bg-amber-50 text-amber-800"
                  : splitDiff > 0 ? "border-sky-200 bg-sky-50 text-sky-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}>
                  <span>{t("tendered", { amount: formatCurrency(round2(splitCashNum + splitOtherNum)) })}</span>
                  <span className="flex items-center gap-1">
                    {blocked === "splitOver" ? t("splitOver")
                      : blocked === "credit" ? t("creditShort", { amount: formatCurrency(credit) })
                      : splitDiff === 0 ? <><Check className="h-3.5 w-3.5" /> {t("balanced")}</>
                      : splitDiff > 0 ? t("splitChange", { amount: formatCurrency(splitDiff) })
                      : t("splitDeficit", { amount: formatCurrency(-splitDiff) })}
                  </span>
                </div>
              </div>
            )}

            {method === "card" && (
              <div className={panel}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground/80">{t("cardRef")}</span>
                  <Input value={reference} onChange={event => setReference(event.target.value)} placeholder={t("cardRefPlaceholder")} className="!w-40 text-right" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {CARD_HINTS.map(name => <button key={name} type="button" onClick={() => setReference(name)} className={chip}>{name}</button>)}
                </div>
              </div>
            )}

            {method === "mobile" && (
              <div className={panel}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground/80">{t("walletRef")}</span>
                  <Input value={reference} onChange={event => setReference(event.target.value)} placeholder={t("walletRefPlaceholder")} className="!w-40 text-right" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {WALLET_HINTS.map(name => <button key={name} type="button" onClick={() => setReference(name)} className={chip}>{name}</button>)}
                </div>
              </div>
            )}

            {method === "credit" && (
              <div className={panel}>
                <p className="text-sm font-medium text-foreground/80">{t("creditAccount")}: <b className="text-primary">{customer?.name ?? "—"}</b></p>
                <p className={`text-[11px] ${customer ? "text-muted-foreground" : "text-destructive"}`}>{customer ? t("creditNote") : describe({ data: { error: { code: "credit_needs_customer" } } })}</p>
              </div>
            )}

            {method === "other" && (
              <div className={panel}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground/80">{t("otherRef")}</span>
                  <Input value={reference} onChange={event => setReference(event.target.value)} placeholder={t("otherRefPlaceholder")} className="!w-44 text-right" />
                </div>
              </div>
            )}

            {method === "store_credit" && (
              <div className={panel}>
                <p className={`text-xs ${blocked === "credit" || blocked === "customer" ? "text-destructive" : "text-muted-foreground"}`}>
                  {blocked === "customer" ? describe({ data: { error: { code: "customer_required" } } })
                    : blocked === "credit" ? t("creditShort", { amount: formatCurrency(credit) })
                    : t("creditAfter", { amount: formatCurrency(round2(credit - totals.total)) })}
                </p>
              </div>
            )}

            {mayDiscount && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground/80">{t("discount")}</span>
                <Input value={discount} onChange={event => setDiscount(event.target.value)} inputMode="decimal" placeholder="0.00" className="!w-32 text-right font-mono" />
              </div>
            )}

            <div className="space-y-1 pt-1 text-sm">
              <div className="flex items-center justify-between text-foreground/80"><span>{t("subtotal")}</span><span className="font-mono font-semibold text-primary">{formatCurrency(totals.subtotal)}</span></div>
              {totals.discount > 0 && <div className="flex items-center justify-between text-foreground/80"><span>{t("discount")}</span><span className="font-mono">-{formatCurrency(totals.discount)}</span></div>}
              {totals.pointsOff > 0 && (
                <div className="flex items-center justify-between font-semibold text-amber-700">
                  <span className="flex items-center gap-1"><Gift className="h-3.5 w-3.5" /> {t("pointsDiscount", { count: totals.points })}</span>
                  <span className="font-mono">-{formatCurrency(totals.pointsOff)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex items-center justify-between text-foreground/80">
                  <span>{t("tax", { label: settings?.tax_label ?? "VAT", rate: taxRate })}</span><span className="font-mono">{formatCurrency(totals.tax)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-accent/40 px-4 py-3">
              <div>
                <span className="block text-sm font-bold text-accent-foreground">{t("total")}</span>
                {totals.earn > 0 && <span className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-accent-foreground"><Sparkles className="h-3 w-3" /> {t("willEarn", { count: totals.earn })}</span>}
              </div>
              <span className="font-mono text-2xl font-bold text-primary">{formatCurrency(totals.total)}</span>
            </div>

            {needsDrawer && !drawerOpen && (
              <div className="flex items-start gap-2 rounded-xl bg-yellow-100 px-3 py-2 text-xs text-yellow-900">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{t("drawerClosed")} <Link href="/pharmacy/cash-drawer" className="font-semibold underline">{t("openDrawer")}</Link></span>
              </div>
            )}
            {blocked === "short" && tendered !== "" && <p className="text-xs text-destructive">{t("cashShort")}</p>}

            {done && cart.length === 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent/40 px-3 py-2 text-xs text-accent-foreground">
                <span className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> {t("saleCompleted", { amount: formatCurrency(Number(done.total_amount)) })}
                  {Number(done.change_amount) > 0 && <> · {t("changeDue")} {formatCurrency(Number(done.change_amount))}</>}
                </span>
                <button type="button" onClick={() => setReceipt(done)} className="inline-flex items-center gap-1 rounded-lg bg-card px-2 py-1 font-semibold text-primary hover:underline">
                  <Receipt className="h-3 w-3" /> {t("viewInvoice")}
                </button>
              </div>
            )}

            <Btn onClick={complete} disabled={blocked !== null || selling} className="w-full justify-center !py-3.5">
              <Receipt className="h-4 w-4" /> {selling ? t("completing") : t("complete", { amount: formatCurrency(totals.total) })}
            </Btn>
          </div>
        </Card>
      </div>

      <NewCustomerDialog open={newCustomer !== null} phone={newCustomer?.phone ?? ""} onClose={() => setNewCustomer(null)} onSaved={pickCustomer} />

      <Modal open={showHeld} onClose={() => setShowHeld(false)} title={t("heldTitle")} size="md"
        footer={<>
          <span className="mr-auto text-[11px] text-muted-foreground">{t("heldFooter", { count: held.length })}</span>
          <Btn variant="outline" onClick={() => setShowHeld(false)}>{tc("close")}</Btn>
        </>}>
        <p className="text-[11px] text-muted-foreground mb-3">{t("heldHint")}</p>
        {held.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">{t("noHeld")}</p>}
        <ul className="space-y-3">
          {held.map(order => (
            <li key={order.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-primary">{order.customer?.name ?? (order.walkInName || tc("walkIn"))}</span>
                  <span className="rounded bg-muted px-1.5 font-mono text-[10px] text-foreground/70">{formatDateTime(order.at)}</span>
                </p>
                <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                  {order.lines.map(line => `${line.quantity}× ${line.item.name} [${tu(line.unit)}]`).join(", ")}
                </p>
                <p className="mt-1 font-mono text-xs font-bold text-primary">{formatCurrency(Number(order.total ?? 0))} ({t("linesCount", { count: order.lines.length })})</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => saveHeld(held.filter(other => other.id !== order.id))} title={t("discardHeld")} aria-label={t("discardHeld")}
                  className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                <Btn onClick={() => resume(order)}><Play className="h-3.5 w-3.5 fill-current" /> {t("resume")}</Btn>
              </div>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal open={interactions !== null} onClose={() => setInteractions(null)} title={t("interactionsTitle")} size="md">
        {interactions && (
          <>
            <p className="text-sm text-foreground/80">{interactions.summary}</p>
            {interactions.interactions.length > 0 && (
              <ul className="mt-4 space-y-2">
                {interactions.interactions.map((entry, index) => (
                  <li key={index} className="rounded-xl border border-border/60 p-3">
                    <p className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-primary">{entry.drugs.join(" + ")}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${LEVEL_STYLE[entry.severity]}`}>{t(`levels.${entry.severity}`)}</span>
                    </p>
                    <p className="mt-1 text-xs text-foreground/80">{entry.effect}</p>
                    <p className="mt-1 text-xs font-medium text-primary">{entry.advice}</p>
                  </li>
                ))}
              </ul>
            )}
            {interactions.hidden > 0 && <p className="mt-3 text-[11px] text-muted-foreground">{t("interactionsHidden", { count: interactions.hidden })}</p>}
            <p className="mt-4 text-[11px] text-muted-foreground">{t("interactionsNote")}</p>
          </>
        )}
      </Modal>

      <ReturnLookup open={lookingUp} onClose={() => setLookingUp(false)} onPick={sale => { setLookingUp(false); setReturning(sale); }} />
      <ReturnDialog sale={returning} onClose={() => setReturning(null)} />
      <ReceiptDialog key={receipt?.id ?? "none"} sale={returning ? null : receipt} onClose={() => setReceipt(null)}
        onReturn={sale => { setReceipt(null); setReturning(sale); }} />
    </PharmacyLayout>
  );
};

export default Page;
