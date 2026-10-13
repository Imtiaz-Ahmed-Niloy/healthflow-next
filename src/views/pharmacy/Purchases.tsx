"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Ban, Banknote, ChevronDown, ChevronUp, Eye, Lightbulb, PackageCheck, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { ItemPicker, Pager, SearchBox, StateBlock, useDebounced, usePharmacyError } from "@/components/pharmacy/ui";
import { usePharmacyPrint } from "@/components/pharmacy/usePharmacyPrint";
import { Btn, Card, Pill } from "@/components/admin/ui";
import { ConfirmDialog, DataTable, Field, Input, Modal, Select, TextArea, type Column } from "@/components/admin/crud";
import { DateInput } from "@/components/ui/date-input";
import { useBookingClock, useFormatters } from "@/lib/appSettings";
import type { ForecastRow, PaymentStatus, PharmacyItem, PurchaseOrder, PurchaseStatus } from "@/lib/pharmacy";
import {
  pharmacyPurchaseOrdersApi, pharmacySuppliersApi, useCreatePurchaseMutation, usePharmacyInsightsQuery, usePurchaseActionMutation,
} from "@/redux/api/pharmacy";

const STATUSES: PurchaseStatus[] = ["ordered", "partial", "received", "cancelled"];
const STATUS_TONE: Record<PurchaseStatus, "ok" | "warn" | "bad" | "info"> = { ordered: "info", partial: "warn", received: "ok", cancelled: "bad" };
const PAID_TONE: Record<PaymentStatus, "ok" | "warn" | "bad"> = { paid: "ok", partial: "warn", unpaid: "bad" };

type DraftLine = { key: number; item: PharmacyItem | null; quantity: string; unit_cost: string };
type Draft = { supplier_id: string; lines: DraftLine[]; notes: string };

let lineKey = 0;
const blankLine = (): DraftLine => ({ key: ++lineKey, item: null, quantity: "1", unit_cost: "" });

/** A forecast row as the product the order form expects. Only the fields the form reads are real. */
const asItem = (row: ForecastRow): PharmacyItem => ({
  id: row.item_id, tenant_id: "", sku: row.sku, name: row.name, generic_name: row.generic_name, description: null,
  category: null, manufacturer: null, selling_price: 0, cost_price: row.unit_cost, reorder: row.reorder, stock: row.stock,
  status: "active", requires_prescription: false, track_expiry: true, is_active: true,
  strip_size: null, box_size: null, strip_price: null, box_price: null, created_at: "", updated_at: "",
});

// ------------------------------------------------------------- new order ---
const OrderDialog = ({ draft, onClose }: { draft: Draft | null; onClose: () => void }) => {
  const t = useTranslations("pharmacy.purchases");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const { formatCurrency } = useFormatters();
  const { today } = useBookingClock();
  const { data: suppliers } = pharmacySuppliersApi.useList({ limit: 100, filters: { status: "active" } });
  const [create, { isLoading }] = useCreatePurchaseMutation();

  const [supplier, setSupplier] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [expected, setExpected] = useState("");
  const [shipping, setShipping] = useState("");
  const [tax, setTax] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!draft) return;
    setSupplier(draft.supplier_id); setLines(draft.lines.length ? draft.lines : [blankLine()]);
    setExpected(""); setShipping(""); setTax(""); setNotes(draft.notes);
  }, [draft]);

  if (!draft) return null;
  const list = suppliers?.data ?? [];
  const patch = (key: number, change: Partial<DraftLine>) => setLines(all => all.map(line => (line.key === key ? { ...line, ...change } : line)));
  const ready = lines.filter(line => line.item && Number(line.quantity) > 0);
  const subtotal = ready.reduce((sum, line) => sum + Number(line.quantity) * (Number(line.unit_cost) || 0), 0);
  const total = subtotal + (Number(shipping) || 0) + (Number(tax) || 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const saved = await create({
        supplier_id: supplier,
        items: ready.map(line => ({ item_id: line.item!.id, quantity: Number(line.quantity), unit_cost: Number(line.unit_cost) || 0 })),
        expected_date: expected || null, notes: notes || null, shipping_cost: Number(shipping) || 0, tax: Number(tax) || 0,
      }).unwrap();
      toast.success(t("created", { number: saved.data.po_number }));
      onClose();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <Modal open onClose={onClose} title={t("newOrder")} size="xl">
      {list.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">{t("needSupplier")}</p>
          <Link href="/pharmacy/suppliers"><Btn className="mt-3"><Plus className="h-4 w-4" /> {t("addSupplier")}</Btn></Link>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <Field label={tc("supplier")} required>
              <Select value={supplier} onChange={e => setSupplier(e.target.value)} required>
                <option value="">{t("pickSupplier")}</option>
                {list.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
              </Select>
            </Field>
            <Field label={t("expectedDate")}><DateInput value={expected} onChange={setExpected} min={today} /></Field>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("lines").toUpperCase()}</span>
            <button type="button" onClick={() => setLines(all => [...all, blankLine()])} className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> {t("addLine")}
            </button>
          </div>
          <div className="space-y-2">
            {lines.map(line => (
              <div key={line.key} className="grid grid-cols-[minmax(0,1fr)_84px_110px_32px] gap-2 items-start">
                <ItemPicker value={line.item} placeholder={t("pickProduct")}
                  onPick={item => patch(line.key, { item, unit_cost: item ? String(Number(item.cost_price) || "") : line.unit_cost })} />
                <Input value={line.quantity} onChange={e => patch(line.key, { quantity: e.target.value })} type="number" min={1} step={1}
                  aria-label={t("qty")} placeholder={t("qty")} className="text-right tabular-nums" />
                <Input value={line.unit_cost} onChange={e => patch(line.key, { unit_cost: e.target.value })} type="number" min={0} step="any"
                  aria-label={t("unitCost")} placeholder={t("unitCost")} className="text-right tabular-nums" />
                <button type="button" disabled={lines.length <= 1} onClick={() => setLines(all => all.filter(l => l.key !== line.key))}
                  aria-label={tc("remove")} className="p-2 text-muted-foreground hover:text-destructive disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-x-4 mt-4">
            <Field label={t("shipping")}><Input value={shipping} onChange={e => setShipping(e.target.value)} type="number" min={0} step="any" className="text-right tabular-nums" /></Field>
            <Field label={t("taxAmount")}><Input value={tax} onChange={e => setTax(e.target.value)} type="number" min={0} step="any" className="text-right tabular-nums" /></Field>
          </div>
          <Field label={tc("notes")}><TextArea value={notes} onChange={e => setNotes(e.target.value)} /></Field>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">{t("estimated")}: <b className="font-display text-xl text-primary tabular-nums">{formatCurrency(total)}</b></p>
            <div className="flex gap-2">
              <Btn variant="outline" onClick={onClose}>{tc("cancel")}</Btn>
              <Btn type="submit" disabled={!supplier || ready.length === 0 || isLoading}>{isLoading ? tc("saving") : t("create")}</Btn>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

// --------------------------------------------------------------- receive ---
type ReceiveLine = { quantity: string; batch_number: string; expiry_date: string; location: string };

const ReceiveDialog = ({ order, onClose }: { order: PurchaseOrder | null; onClose: () => void }) => {
  const t = useTranslations("pharmacy.purchases");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const { today } = useBookingClock();
  const [lines, setLines] = useState<Record<string, ReceiveLine>>({});
  const [act, { isLoading }] = usePurchaseActionMutation();

  useEffect(() => {
    if (!order) return;
    setLines(Object.fromEntries(order.items.map(item => [item.id, {
      quantity: String(Math.max(item.quantity - item.received_quantity, 0)), batch_number: "", expiry_date: "", location: "",
    }])));
  }, [order]);

  if (!order) return null;
  const open = order.items.filter(item => item.received_quantity < item.quantity);
  const patch = (id: string, change: Partial<ReceiveLine>) => setLines(all => ({ ...all, [id]: { ...all[id], ...change } }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await act({
        id: order.id,
        body: {
          action: "receive",
          lines: open.map(item => ({
            po_item_id: item.id, quantity: Number(lines[item.id]?.quantity) || 0,
            batch_number: lines[item.id]?.batch_number ?? "", expiry_date: lines[item.id]?.expiry_date || null,
            location: lines[item.id]?.location ?? "",
          })),
        },
      }).unwrap();
      toast.success(t("receivedDone"));
      onClose();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <Modal open onClose={onClose} title={t("receiveTitle", { number: order.po_number })} size="xl">
      <form onSubmit={submit}>
        <div className="space-y-3">
          {open.map(item => {
            const left = item.quantity - item.received_quantity;
            const line = lines[item.id];
            if (!line) return null;
            return (
              <div key={item.id} className="rounded-xl bg-muted/40 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                  <p className="font-semibold text-primary">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">{t("remaining", { count: left })}</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <Input value={line.quantity} onChange={e => patch(item.id, { quantity: e.target.value })} type="number" min={0} max={left} step={1}
                    aria-label={t("receiveQty")} placeholder={t("receiveQty")} className="!bg-card text-right tabular-nums" />
                  <Input value={line.batch_number} onChange={e => patch(item.id, { batch_number: e.target.value })}
                    aria-label={t("batchNumber")} placeholder={t("batchNumber")} className="!bg-card" />
                  <DateInput value={line.expiry_date} onChange={value => patch(item.id, { expiry_date: value })} min={today}
                    aria-label={t("expiryDate")} placeholder={t("expiryDate")} />
                  <Input value={line.location} onChange={e => patch(item.id, { location: e.target.value })}
                    aria-label={tc("shelf")} placeholder={tc("shelf")} className="!bg-card" />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="outline" onClick={onClose}>{tc("cancel")}</Btn>
          <Btn type="submit" disabled={isLoading}><PackageCheck className="h-4 w-4" /> {isLoading ? tc("saving") : t("confirmReceive")}</Btn>
        </div>
      </form>
    </Modal>
  );
};

// ------------------------------------------------------------------- pay ---
const PayDialog = ({ order, onClose }: { order: PurchaseOrder | null; onClose: () => void }) => {
  const t = useTranslations("pharmacy.purchases");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const { formatCurrency } = useFormatters();
  const [act, { isLoading }] = usePurchaseActionMutation();
  if (!order) return null;
  const owed = Math.max(Number(order.total_amount) - Number(order.paid_amount), 0);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await act({ id: order.id, body: { action: "pay", amount: Number(new FormData(event.currentTarget).get("amount")) } }).unwrap();
      toast.success(t("paidDone"));
      onClose();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <Modal open onClose={onClose} title={t("payTitle", { number: order.po_number })} size="sm">
      <form onSubmit={submit}>
        <dl className="text-sm space-y-1 mb-4">
          <div className="flex justify-between"><dt className="text-muted-foreground">{t("paidSoFar")}</dt><dd className="tabular-nums">{formatCurrency(Number(order.paid_amount))}</dd></div>
          <div className="flex justify-between font-semibold"><dt>{t("owed")}</dt><dd className="tabular-nums text-destructive">{formatCurrency(owed)}</dd></div>
        </dl>
        <Field label={tc("amount")} required>
          <Input name="amount" type="number" min={0.01} max={owed} step="any" defaultValue={owed} required autoFocus className="text-right tabular-nums" />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose}>{tc("cancel")}</Btn>
          <Btn type="submit" disabled={isLoading}>{isLoading ? tc("saving") : tc("save")}</Btn>
        </div>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------- detail ---
const OrderDetail = ({ order, onClose, onReceive, onPay, onCancel }: {
  order: PurchaseOrder | null; onClose: () => void; onReceive: () => void; onPay: () => void; onCancel: () => void;
}) => {
  const t = useTranslations("pharmacy.purchases");
  const tc = useTranslations("pharmacy.common");
  const { formatCurrency, formatDate } = useFormatters();
  const { printOrder } = usePharmacyPrint();
  if (!order) return null;
  const owed = Math.max(Number(order.total_amount) - Number(order.paid_amount), 0);
  const live = order.status === "ordered" || order.status === "partial";

  return (
    <Modal open onClose={onClose} title={order.po_number} size="lg"
      footer={<>
        <Btn variant="outline" onClick={() => printOrder(order)}><Printer className="h-4 w-4" /> {t("printOrder")}</Btn>
        {order.status !== "cancelled" && owed > 0 && <Btn variant="outline" onClick={onPay}><Banknote className="h-4 w-4" /> {t("pay")}</Btn>}
        {order.status === "ordered" && <Btn variant="danger" onClick={onCancel}><Ban className="h-4 w-4" /> {t("cancel")}</Btn>}
        {live && <Btn onClick={onReceive}><PackageCheck className="h-4 w-4" /> {t("receive")}</Btn>}
      </>}>
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-4">
        <div><p className="text-[10px] tracking-widest font-bold text-muted-foreground">{tc("supplier").toUpperCase()}</p>{order.supplier?.name ?? "—"}</div>
        <div><p className="text-[10px] tracking-widest font-bold text-muted-foreground">{tc("date").toUpperCase()}</p>{formatDate(order.order_date)}</div>
        {order.expected_date && <div><p className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("expectedDate").toUpperCase()}</p>{formatDate(order.expected_date)}</div>}
        <div><p className="text-[10px] tracking-widest font-bold text-muted-foreground">{tc("status").toUpperCase()}</p><Pill tone={STATUS_TONE[order.status]}>{t(`statuses.${order.status}`)}</Pill></div>
      </div>
      {order.created_by_name && <p className="text-xs text-muted-foreground mb-3">{t("orderedBy", { name: order.created_by_name })}</p>}

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-[10px] tracking-widest text-muted-foreground">
            <tr>
              <th className="py-2 px-3">{tc("product").toUpperCase()}</th>
              <th className="py-2 px-3 text-right">{t("ordered").toUpperCase()}</th>
              <th className="py-2 px-3 text-right">{t("receivedQty").toUpperCase()}</th>
              <th className="py-2 px-3 text-right">{t("unitCost").toUpperCase()}</th>
              <th className="py-2 px-3 text-right">{t("lineTotal").toUpperCase()}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => (
              <tr key={item.id} className="border-t border-border/40">
                <td className="py-2 px-3"><span className="font-semibold text-primary">{item.item_name}</span><span className="block text-[11px] text-muted-foreground font-mono">{item.sku}</span></td>
                <td className="py-2 px-3 text-right tabular-nums">{item.quantity}</td>
                <td className={`py-2 px-3 text-right tabular-nums ${item.received_quantity >= item.quantity ? "text-emerald-700" : ""}`}>{item.received_quantity}</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(Number(item.unit_cost))}</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(Number(item.unit_cost) * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-4 w-full sm:w-72 text-sm space-y-1">
        {Number(order.shipping_cost) > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">{t("shipping")}</dt><dd className="tabular-nums">{formatCurrency(Number(order.shipping_cost))}</dd></div>}
        {Number(order.tax) > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">{t("taxAmount")}</dt><dd className="tabular-nums">{formatCurrency(Number(order.tax))}</dd></div>}
        <div className="flex justify-between font-semibold text-primary"><dt>{tc("total")}</dt><dd className="tabular-nums">{formatCurrency(Number(order.total_amount))}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">{t("paidSoFar")}</dt><dd className="tabular-nums">{formatCurrency(Number(order.paid_amount))}</dd></div>
        {owed > 0 && order.status !== "cancelled" && <div className="flex justify-between font-semibold text-destructive"><dt>{t("owed")}</dt><dd className="tabular-nums">{formatCurrency(owed)}</dd></div>}
      </dl>
      {order.notes && <p className="mt-4 text-sm text-muted-foreground">{order.notes}</p>}
    </Modal>
  );
};

// ----------------------------------------------------------- suggestions ---
const Suggestions = ({ onOrder }: { onOrder: (draft: Draft) => void }) => {
  const t = useTranslations("pharmacy.purchases");
  const [open, setOpen] = useState(true);
  const { data } = usePharmacyInsightsQuery();

  const groups = useMemo(() => {
    const wanted = (data?.data.forecast ?? []).filter(row => row.suggested > 0);
    const bySupplier = new Map<string, { id: string | null; name: string | null; rows: ForecastRow[] }>();
    for (const row of wanted) {
      const key = row.supplier_id ?? "";
      const group = bySupplier.get(key) ?? { id: row.supplier_id, name: row.supplier_name, rows: [] };
      group.rows.push(row);
      bySupplier.set(key, group);
    }
    return [...bySupplier.values()];
  }, [data]);

  const count = groups.reduce((sum, group) => sum + group.rows.length, 0);
  if (count === 0) return null;

  return (
    <Card className="p-4 lg:p-5 mb-4">
      <button type="button" onClick={() => setOpen(value => !value)} className="w-full flex items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-yellow-100 text-yellow-800 grid place-items-center shrink-0"><Lightbulb className="h-5 w-5" /></span>
          <span>
            <span className="block font-display text-lg text-primary">{t("suggestTitle")} · {t("suggestCount", { count })}</span>
            <span className="block text-xs text-muted-foreground">{t("suggestHint")}</span>
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open && (
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          {groups.map(group => (
            <div key={group.id ?? "none"} className="rounded-xl border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-primary truncate">{group.name ?? t("noSupplier")}</p>
                <Btn variant="outline" className="!px-3 !py-1.5 shrink-0" onClick={() => onOrder({
                  supplier_id: group.id ?? "", notes: "",
                  lines: group.rows.map(row => ({ key: ++lineKey, item: asItem(row), quantity: String(row.suggested), unit_cost: String(Number(row.unit_cost) || "") })),
                })}>{t("createFor")}</Btn>
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                {group.rows.slice(0, 5).map(row => (
                  <li key={row.item_id} className="flex justify-between gap-2">
                    <span className="truncate">{row.name}</span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {row.days_to_stockout !== null && `${t("daysLeft", { count: row.days_to_stockout })} · `}{t("suggestQty", { count: row.suggested })}
                    </span>
                  </li>
                ))}
                {group.rows.length > 5 && <li className="text-muted-foreground">+{group.rows.length - 5}</li>}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ------------------------------------------------------------------ page ---
const Page = () => {
  const t = useTranslations("pharmacy.purchases");
  const tc = useTranslations("pharmacy.common");
  const tp = useTranslations("pharmacy.paymentStatus");
  const describe = usePharmacyError();
  const { formatCurrency, formatDate } = useFormatters();
  const { printOrder } = usePharmacyPrint();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [supplier, setSupplier] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  useEffect(() => { setPage(1); }, [search, status, supplier]);

  const { data, isLoading, isFetching, error, refetch } = pharmacyPurchaseOrdersApi.useList({
    page, limit: 20, q: search, filters: { status: status || undefined, supplier_id: supplier || undefined },
  });
  const { data: suppliers } = pharmacySuppliersApi.useList({ limit: 100 });
  const [act] = usePurchaseActionMutation();
  const rows = data?.data ?? [];

  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [receiving, setReceiving] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<PurchaseOrder | null>(null);
  const find = (id: string | null) => rows.find(row => row.id === id) ?? null;

  const cancel = async () => {
    if (!cancelling) return;
    try {
      await act({ id: cancelling.id, body: { action: "cancel" } }).unwrap();
      toast.success(t("cancelled"));
      setViewing(null);
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  const columns: Column<PurchaseOrder>[] = [
    { key: "order", label: t("columns.order"), render: r => <span className="font-mono text-xs font-semibold text-primary">{r.po_number}</span> },
    { key: "supplier", label: t("columns.supplier"), render: r => r.supplier?.name ?? "—" },
    { key: "date", label: t("columns.date"), render: r => <span className="whitespace-nowrap">{formatDate(r.order_date)}</span> },
    { key: "items", label: t("columns.items"), render: r => <span className="tabular-nums">{r.items.length}</span> },
    { key: "total", label: t("columns.total"), render: r => <span className="tabular-nums font-semibold">{formatCurrency(Number(r.total_amount))}</span> },
    { key: "received", label: t("columns.received"), render: r => {
      const ordered = r.items.reduce((sum, item) => sum + item.quantity, 0);
      const received = r.items.reduce((sum, item) => sum + item.received_quantity, 0);
      return <span className="tabular-nums text-xs">{received} / {ordered}</span>;
    } },
    { key: "payment", label: t("columns.payment"), render: r => r.status === "cancelled" ? "—" : <Pill tone={PAID_TONE[r.payment_status]}>{tp(r.payment_status)}</Pill> },
    { key: "status", label: t("columns.status"), render: r => <Pill tone={STATUS_TONE[r.status]}>{t(`statuses.${r.status}`)}</Pill> },
  ];

  const iconBtn = "p-1.5 rounded-lg hover:bg-muted text-foreground/70";

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")} needs="manage_stock">
      <Suggestions onOrder={setDraft} />

      <Card className="p-4 lg:p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SearchBox value={q} onChange={setQ} placeholder={t("searchPlaceholder")} className="flex-1" />
          <Select value={status} onChange={e => setStatus(e.target.value)} className="!w-auto" aria-label={t("columns.status")}>
            <option value="">{t("allStatuses")}</option>
            {STATUSES.map(value => <option key={value} value={value}>{t(`statuses.${value}`)}</option>)}
          </Select>
          <Select value={supplier} onChange={e => setSupplier(e.target.value)} className="!w-auto" aria-label={t("columns.supplier")}>
            <option value="">{t("allSuppliers")}</option>
            {(suppliers?.data ?? []).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </Select>
          <Btn onClick={() => setDraft({ supplier_id: "", lines: [], notes: "" })}><Plus className="h-4 w-4" /> {t("newOrder")}</Btn>
        </div>

        {isLoading || error || rows.length === 0 ? (
          <StateBlock loading={isLoading} error={error} onRetry={refetch} empty={t("noOrders")} />
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <DataTable<PurchaseOrder> rows={rows} columns={columns} onRow={row => setViewing(row.id)}
              actions={row => (
                <div className="inline-flex items-center gap-1">
                  <button onClick={() => setViewing(row.id)} className={iconBtn} title={t("view")} aria-label={t("view")}><Eye className="h-4 w-4" /></button>
                  <button onClick={() => printOrder(row)} className={iconBtn} title={t("printOrder")} aria-label={t("printOrder")}><Printer className="h-4 w-4" /></button>
                  {(row.status === "ordered" || row.status === "partial") && (
                    <button onClick={() => setReceiving(row.id)} className={iconBtn} title={t("receive")} aria-label={t("receive")}><PackageCheck className="h-4 w-4" /></button>
                  )}
                </div>
              )} />
          </div>
        )}
        {data?.meta && <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      </Card>

      <OrderDialog draft={draft} onClose={() => setDraft(null)} />
      <OrderDetail order={receiving || paying || cancelling ? null : find(viewing)} onClose={() => setViewing(null)}
        onReceive={() => setReceiving(viewing)} onPay={() => setPaying(viewing)} onCancel={() => setCancelling(find(viewing))} />
      <ReceiveDialog order={find(receiving)} onClose={() => setReceiving(null)} />
      <PayDialog order={find(paying)} onClose={() => setPaying(null)} />
      <ConfirmDialog open={cancelling !== null} onClose={() => setCancelling(null)} onConfirm={cancel}
        title={cancelling ? t("cancelConfirm", { number: cancelling.po_number }) : ""} description={t("cancelHint")} />
    </PharmacyLayout>
  );
};

export default Page;
