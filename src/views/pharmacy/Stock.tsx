"use client";

import { useEffect, useState } from "react";
import { History, Pencil, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { ItemPicker, Pager, SearchBox, StateBlock, useDebounced, usePharmacyCan, usePharmacyError } from "@/components/pharmacy/ui";
import { Btn, Card, Pill } from "@/components/admin/ui";
import { Chips, DataTable, Field, Input, Modal, Select, type Column } from "@/components/admin/crud";
import { DateInput } from "@/components/ui/date-input";
import { useBookingClock, useFormatters } from "@/lib/appSettings";
import {
  ADJUST_REASONS, sizeOf, unitsOf,
  type AdjustReason, type BatchState, type PharmacyBatch, type PharmacyItem, type SaleUnit, type StockMovement,
} from "@/lib/pharmacy";
import { pharmacyBatchesApi, pharmacyMovementsApi, useStockActionMutation } from "@/redux/api/pharmacy";

const STATES = ["all", "ok", "expiring_soon", "expired", "empty"] as const;
const STATE_TONE: Record<BatchState, "ok" | "warn" | "bad" | "default"> = { ok: "ok", expiring_soon: "warn", expired: "bad", empty: "default" };

// -------------------------------------------------------------------- add ---
const AddDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const t = useTranslations("pharmacy.stock");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const { today } = useBookingClock();
  const tu = useTranslations("pharmacy.units");
  const [item, setItem] = useState<PharmacyItem | null>(null);
  const [expiry, setExpiry] = useState("");
  // Stock is kept in single pieces. A delivery is usually counted in boxes, so the form does the multiplying.
  const [unit, setUnit] = useState<SaleUnit>("unit");
  const [act, { isLoading }] = useStockActionMutation();
  const units = item ? unitsOf(item) : (["unit"] as SaleUnit[]);
  const counted = units.includes(unit) ? unit : "unit";

  const close = () => { setItem(null); setExpiry(""); onClose(); };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item) return;
    const form = new FormData(event.currentTarget);
    try {
      await act({
        action: "add", item_id: item.id,
        batch_number: String(form.get("batch_number") ?? ""),
        quantity: Number(form.get("quantity")) * sizeOf(item, counted),
        expiry_date: expiry || null,
        location: String(form.get("location") ?? "") || null,
        unit_cost: form.get("unit_cost") === "" ? null : Number(form.get("unit_cost")),
        note: String(form.get("note") ?? "") || null,
      }).unwrap();
      toast.success(t("stockAdded"));
      close();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <Modal open={open} onClose={close} title={t("addTitle")} size="lg">
      <form onSubmit={submit}>
        <p className="text-sm text-muted-foreground mb-4">{t("addHint")}</p>
        <Field label={tc("product")} required>
          <ItemPicker value={item} onPick={setItem} placeholder={t("pickProduct")} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label={t("batchNumber")} required><Input name="batch_number" required /></Field>
          <Field label={tc("quantity")} required hint={item && counted !== "unit" ? t("countedHint", { count: sizeOf(item, counted) }) : undefined}>
            <div className="flex gap-2">
              <Input name="quantity" type="number" min={1} step={1} required />
              {units.length > 1 && (
                <Select value={counted} onChange={e => setUnit(e.target.value as SaleUnit)} className="!w-auto" aria-label={t("countedIn")}>
                  {units.map(value => <option key={value} value={value}>{tu(value)}</option>)}
                </Select>
              )}
            </div>
          </Field>
          <Field label={t("expiryDate")} required={item?.track_expiry ?? true}>
            <DateInput value={expiry} onChange={setExpiry} min={today} required={item?.track_expiry ?? true} />
          </Field>
          <Field label={tc("shelf")}><Input name="location" placeholder="Main" /></Field>
          <Field label={t("unitCost")}>
            <Input key={item?.id ?? "none"} name="unit_cost" type="number" min={0} step="any" defaultValue={item ? Number(item.cost_price) : ""} />
          </Field>
          <Field label={tc("note")}><Input name="note" /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={close}>{tc("cancel")}</Btn>
          <Btn type="submit" disabled={!item || isLoading}>{isLoading ? tc("saving") : tc("save")}</Btn>
        </div>
      </form>
    </Modal>
  );
};

// ----------------------------------------------------------------- adjust ---
const AdjustDialog = ({ batch, onClose }: { batch: PharmacyBatch | null; onClose: () => void }) => {
  const t = useTranslations("pharmacy.stock");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<AdjustReason>("adjustment");
  const [note, setNote] = useState("");
  const [act, { isLoading }] = useStockActionMutation();

  useEffect(() => { setQuantity(batch ? String(batch.quantity) : ""); setReason(batch?.state === "expired" ? "expired" : "adjustment"); setNote(""); }, [batch]);
  if (!batch) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await act({ action: "adjust", batch_id: batch.id, quantity: Number(quantity), reason, note: note || null }).unwrap();
      toast.success(t("stockAdjusted"));
      onClose();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <Modal open onClose={onClose} title={t("adjustTitle", { name: batch.item_name })} size="sm">
      <form onSubmit={submit}>
        <p className="text-sm text-muted-foreground mb-4">{tc("batch")} {batch.batch_number} · {t("recorded")}: <b className="text-primary tabular-nums">{batch.quantity}</b></p>
        <Field label={t("reason")} required>
          <Select value={reason} onChange={e => setReason(e.target.value as AdjustReason)}>
            {ADJUST_REASONS.map(value => <option key={value} value={value}>{t(`reasons.${value}`)}</option>)}
          </Select>
        </Field>
        <Field label={t("counted")} required>
          <div className="flex gap-2">
            <Input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" min={0} step={1}
              max={reason === "adjustment" ? undefined : batch.quantity} required autoFocus className="text-right tabular-nums" />
            {reason !== "adjustment" && <Btn variant="outline" onClick={() => setQuantity("0")} className="shrink-0">{t("writeOffAll")}</Btn>}
          </div>
        </Field>
        <Field label={tc("note")}><Input value={note} onChange={e => setNote(e.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose}>{tc("cancel")}</Btn>
          <Btn type="submit" disabled={isLoading || Number(quantity) === batch.quantity}>{isLoading ? tc("saving") : tc("save")}</Btn>
        </div>
      </form>
    </Modal>
  );
};

// ------------------------------------------------------------------- edit ---
const EditDialog = ({ batch, onClose }: { batch: PharmacyBatch | null; onClose: () => void }) => {
  const t = useTranslations("pharmacy.stock");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const [expiry, setExpiry] = useState("");
  const [update, { isLoading }] = pharmacyBatchesApi.useUpdate();

  useEffect(() => { setExpiry(batch?.expiry_date ?? ""); }, [batch]);
  if (!batch) return null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await update(batch.id, {
        expiry_date: expiry || null,
        location: String(form.get("location") ?? "") || "Main",
        unit_cost: Number(form.get("unit_cost") ?? 0),
      }).unwrap();
      toast.success(t("batchSaved"));
      onClose();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <Modal open onClose={onClose} title={t("editTitle", { name: batch.item_name })} size="sm">
      <form onSubmit={submit}>
        <Field label={t("expiryDate")}><DateInput value={expiry} onChange={setExpiry} /></Field>
        <Field label={tc("shelf")}><Input name="location" defaultValue={batch.location} /></Field>
        <Field label={t("unitCost")}><Input name="unit_cost" type="number" min={0} step="any" defaultValue={Number(batch.unit_cost)} /></Field>
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose}>{tc("cancel")}</Btn>
          <Btn type="submit" disabled={isLoading}>{isLoading ? tc("saving") : tc("save")}</Btn>
        </div>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------- history ---
const HistoryDialog = ({ batch, onClose }: { batch: PharmacyBatch | null; onClose: () => void }) => {
  const t = useTranslations("pharmacy.stock");
  const tc = useTranslations("pharmacy.common");
  const { formatDateTime } = useFormatters();
  // Every batch of the product, not this one alone: "where did it all go" is asked of the product.
  const { data, isLoading, error } = pharmacyMovementsApi.useList({ limit: 50, filters: { item_id: batch?.item_id } }, );
  if (!batch) return null;
  const rows = (data?.data ?? []).map(row => ({ ...row, id: String(row.id) }));

  const columns: Column<Omit<StockMovement, "id"> & { id: string }>[] = [
    { key: "when", label: tc("when"), render: r => <span className="whitespace-nowrap text-xs">{formatDateTime(r.created_at)}</span> },
    { key: "kind", label: tc("status"), render: r => <Pill tone={r.quantity > 0 ? "ok" : r.kind === "sale" ? "default" : "warn"}>{t(`kinds.${r.kind}`)}</Pill> },
    { key: "batch", label: tc("batch"), render: r => <span className="font-mono text-xs">{r.batch_number ?? "—"}</span> },
    { key: "quantity", label: tc("quantity"), render: r => (
      <span className={`tabular-nums font-semibold ${r.quantity < 0 ? "text-destructive" : "text-emerald-700"}`}>{r.quantity > 0 ? "+" : ""}{r.quantity}</span>
    ) },
    { key: "reference", label: tc("reference"), render: r => <span className="text-xs text-muted-foreground">{[r.reference, r.note].filter(Boolean).join(" · ") || "—"}</span> },
    { key: "by", label: tc("by"), render: r => <span className="text-xs">{r.created_by_name ?? "—"}</span> },
  ];

  return (
    <Modal open onClose={onClose} title={t("historyTitle", { name: batch.item_name })} size="xl">
      {isLoading || error || rows.length === 0
        ? <StateBlock loading={isLoading} error={error} empty={t("noHistory")} />
        : <DataTable rows={rows} columns={columns} />}
    </Modal>
  );
};

// ------------------------------------------------------------------- page ---
const Page = () => {
  const t = useTranslations("pharmacy.stock");
  const tc = useTranslations("pharmacy.common");
  const { formatCurrency, formatDate } = useFormatters();

  const [q, setQ] = useState("");
  const [state, setState] = useState<(typeof STATES)[number]>("all");
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  // Reading the shelf is everyone's. Changing it is stock work (0133).
  const mayManage = usePharmacyCan()("manage_stock");
  const [adding, setAdding] = useState(false);
  const [adjusting, setAdjusting] = useState<PharmacyBatch | null>(null);
  const [editing, setEditing] = useState<PharmacyBatch | null>(null);
  const [tracing, setTracing] = useState<PharmacyBatch | null>(null);

  // Arriving from the alerts page with a state already chosen.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("state");
    if (wanted && (STATES as readonly string[]).includes(wanted)) setState(wanted as (typeof STATES)[number]);
  }, []);
  useEffect(() => { setPage(1); }, [search, state]);

  const { data, isLoading, isFetching, error, refetch } = pharmacyBatchesApi.useList({
    page, limit: 20, q: search, filters: { state: state === "all" ? undefined : state },
  });
  const rows = data?.data ?? [];

  const columns: Column<PharmacyBatch>[] = [
    { key: "product", label: t("columns.product"), render: r => (
      <div className="min-w-0">
        <p className="font-semibold text-primary truncate">{r.item_name}</p>
        <p className="text-xs text-muted-foreground truncate">{[r.generic_name, r.sku].filter(Boolean).join(" · ")}</p>
      </div>
    ) },
    { key: "batch", label: t("columns.batch"), render: r => <span className="font-mono text-xs">{r.batch_number}</span> },
    { key: "quantity", label: t("columns.quantity"), render: r => <span className="tabular-nums font-semibold">{r.quantity}</span> },
    { key: "shelf", label: t("columns.shelf"), render: r => r.location },
    { key: "expiry", label: t("columns.expiry"), render: r => r.expiry_date ? (
      <div>
        <p className="whitespace-nowrap">{formatDate(r.expiry_date)}</p>
        {r.days_left !== null && r.quantity > 0 && (
          <p className={`text-[11px] ${r.days_left < 0 ? "text-destructive" : r.state === "expiring_soon" ? "text-amber-700" : "text-muted-foreground"}`}>
            {r.days_left < 0 ? t("expiredAgo", { count: -r.days_left }) : r.days_left === 0 ? t("expiresToday") : t("daysLeft", { count: r.days_left })}
          </p>
        )}
      </div>
    ) : <span className="text-muted-foreground">{tc("noExpiry")}</span> },
    { key: "cost", label: t("columns.cost"), render: r => <span className="tabular-nums">{formatCurrency(Number(r.unit_cost))}</span> },
    { key: "supplier", label: t("columns.supplier"), render: r => <span className="text-xs">{r.supplier_name ?? "—"}</span> },
    { key: "state", label: t("columns.state"), render: r => <Pill tone={STATE_TONE[r.state]}>{t(`states.${r.state}`)}</Pill> },
  ];

  const iconBtn = "p-1.5 rounded-lg hover:bg-muted text-foreground/70";

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")}>
      <Card className="p-4 lg:p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SearchBox value={q} onChange={setQ} placeholder={t("searchPlaceholder")} className="flex-1" />
          <Chips value={state} onChange={setState} options={STATES.map(value => ({ value, label: t(`states.${value}`) }))} />
          {mayManage && <Btn onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> {t("addStock")}</Btn>}
        </div>

        {isLoading || error || rows.length === 0 ? (
          <StateBlock loading={isLoading} error={error} onRetry={refetch} empty={t("noBatches")} />
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <DataTable<PharmacyBatch> rows={rows} columns={columns}
              actions={row => (
                <div className="inline-flex items-center gap-1">
                  {mayManage && <button onClick={() => setAdjusting(row)} className={iconBtn} title={t("adjust")} aria-label={t("adjust")}><SlidersHorizontal className="h-4 w-4" /></button>}
                  {mayManage && <button onClick={() => setEditing(row)} className={iconBtn} title={t("editBatch")} aria-label={t("editBatch")}><Pencil className="h-4 w-4" /></button>}
                  <button onClick={() => setTracing(row)} className={iconBtn} title={t("history")} aria-label={t("history")}><History className="h-4 w-4" /></button>
                </div>
              )} />
          </div>
        )}
        {data?.meta && <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      </Card>

      <AddDialog open={adding} onClose={() => setAdding(false)} />
      <AdjustDialog batch={adjusting} onClose={() => setAdjusting(null)} />
      <EditDialog batch={editing} onClose={() => setEditing(null)} />
      {tracing && <HistoryDialog batch={tracing} onClose={() => setTracing(null)} />}
    </PharmacyLayout>
  );
};

export default Page;
