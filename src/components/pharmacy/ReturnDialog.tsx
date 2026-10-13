"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Printer, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { SearchBox, StateBlock, useDebounced, usePharmacyCan, usePharmacyError } from "@/components/pharmacy/ui";
import { usePharmacyPrint } from "@/components/pharmacy/usePharmacyPrint";
import { Btn, Pill } from "@/components/admin/ui";
import { Field, Input, Modal, Select, TextArea } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import { RETURN_CONDITIONS, asSold, type PharmacySale, type ReturnCondition, type SaleReturn } from "@/lib/pharmacy";
import { pharmacySalesApi, useSaleActionMutation } from "@/redux/api/pharmacy";

const RETURN_REASONS = ["changed_mind", "wrong_item", "damaged", "expired", "doctor_changed", "other"] as const;
type RefundMethod = "cash" | "original" | "credit";

/**
 * Taking goods back on one invoice.
 *
 * Each line says how many came back and in what state: only what can be sold
 * again goes back on the shelf. Somebody has to approve it — the person at the
 * till if they may, otherwise a manager types their PIN here. The database
 * decides which (pharmacy_return_sale, 0134); this only asks for the PIN when
 * it is going to be needed.
 */
export const ReturnDialog = ({ sale, onClose }: { sale: PharmacySale | null; onClose: () => void }) => {
  const t = useTranslations("pharmacy.sales");
  const tc = useTranslations("pharmacy.common");
  const tu = useTranslations("pharmacy.unitCount");
  const describe = usePharmacyError();
  const can = usePharmacyCan();
  const { formatCurrency } = useFormatters();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [conditions, setConditions] = useState<Record<string, ReturnCondition>>({});
  const [reason, setReason] = useState<(typeof RETURN_REASONS)[number]>("changed_mind");
  const [other, setOther] = useState("");
  const [method, setMethod] = useState<RefundMethod>("cash");
  const [notes, setNotes] = useState("");
  const [pin, setPin] = useState("");
  // Once saved: the sale as it now stands and the return just made, for the voucher.
  const [saved, setSaved] = useState<{ sale: PharmacySale; entry: SaleReturn } | null>(null);
  const [act, { isLoading }] = useSaleActionMutation();
  const { printReturn } = usePharmacyPrint();

  useEffect(() => {
    setQuantities({}); setConditions({}); setReason("changed_mind"); setOther(""); setMethod("cash"); setNotes(""); setPin(""); setSaved(null);
  }, [sale?.id]);

  if (!sale) return null;

  if (saved) {
    return (
      <Modal open onClose={onClose} title={t("returnDone")} size="sm"
        footer={<>
          <Btn variant="outline" onClick={onClose}>{tc("close")}</Btn>
          <Btn onClick={() => printReturn(saved.sale, saved.entry)}><Printer className="h-4 w-4" /> {t("printVoucher")}</Btn>
        </>}>
        <div className="text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
          {saved.entry.return_number && <p className="mt-3 font-mono text-sm font-bold text-primary">{saved.entry.return_number}</p>}
          <p className="mt-1 font-display text-2xl text-primary tabular-nums">{formatCurrency(Number(saved.entry.refund_amount))}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {saved.entry.refund_method === "credit"
              ? t("keptAsCredit", { amount: formatCurrency(Number(saved.entry.paid_back)) })
              : t("paidBack", { amount: formatCurrency(Number(saved.entry.paid_back)) })}
            {saved.entry.approved_by_name && ` · ${t("approvedBy", { name: saved.entry.approved_by_name })}`}
          </p>
        </div>
      </Modal>
    );
  }

  const needsPin = !can("approve_returns");
  const goods = sale.items.reduce((sum, item) => sum + (quantities[item.id] ?? 0) * Number(item.unit_price), 0);
  // The returned goods' share of the whole bill, discount and tax included. The database works out the exact figure.
  const estimate = Number(sale.subtotal) > 0 ? (goods / Number(sale.subtotal)) * Number(sale.total_amount) : 0;
  const picked = Object.values(quantities).some(quantity => quantity > 0);
  const reasonText = reason === "other" ? other.trim() : t(`reasons.${reason}`);
  const pointsBack = Number(sale.total_amount) > 0 ? Math.round((sale.points_earned * estimate) / Number(sale.total_amount)) : 0;

  const submit = async () => {
    try {
      const answer = await act({
        id: sale.id,
        body: {
          action: "return",
          items: Object.entries(quantities)
            .filter(([, quantity]) => quantity > 0)
            .map(([sale_item_id, quantity]) => ({ sale_item_id, quantity, condition: conditions[sale_item_id] ?? "restock" })),
          reason: reasonText,
          refund_method: method,
          notes: notes.trim() || null,
          manager_pin: needsPin ? pin : null,
        },
      }).unwrap();
      toast.success(t("returnDone"));
      // The newest return on the sale is the one just made. Show it, so the voucher can be printed.
      const entry = [...answer.data.returns].sort((a, b) => b.returned_at.localeCompare(a.returned_at))[0];
      if (entry) setSaved({ sale: answer.data, entry });
      else onClose();
    } catch (cause) {
      setPin("");
      toast.error(describe(cause));
    }
  };

  return (
    <Modal open onClose={onClose} title={t("returnTitle", { invoice: sale.invoice_number })} size="lg"
      footer={<>
        <Btn variant="outline" onClick={onClose}>{tc("cancel")}</Btn>
        <Btn variant="danger" onClick={submit} disabled={!picked || !reasonText || isLoading || (needsPin && pin.length !== 4)}>
          {isLoading ? tc("saving") : t("confirmReturn")}
        </Btn>
      </>}>
      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-[10px] tracking-widest text-muted-foreground">
            <tr>
              <th className="py-2 px-3">{tc("product").toUpperCase()}</th>
              <th className="py-2 px-3 text-right">{t("sold").toUpperCase()}</th>
              <th className="py-2 px-3 text-right">{t("alreadyReturned").toUpperCase()}</th>
              <th className="py-2 px-3 text-right">{t("returnQty").toUpperCase()}</th>
              <th className="py-2 px-3">{t("condition").toUpperCase()}</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map(item => {
              const left = item.quantity - item.returned_quantity;
              const sold = asSold(item);
              return (
                <tr key={item.id} className="border-t border-border/40">
                  <td className="py-2 px-3">
                    <p className="font-semibold text-primary">{item.item_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.batch_number} · {formatCurrency(Number(item.unit_price))}
                      {sold.unit !== "unit" && ` · ${t("soldAs", { pack: tu(sold.unit, { count: sold.count }) })}`}
                    </p>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{item.returned_quantity}</td>
                  <td className="py-2 px-3 text-right">
                    <Input type="number" min={0} max={left} disabled={left <= 0} value={quantities[item.id] ?? 0}
                      onChange={e => setQuantities(q => ({ ...q, [item.id]: Math.min(Math.max(Math.floor(Number(e.target.value)) || 0, 0), left) }))}
                      className="!w-20 text-right tabular-nums ml-auto" aria-label={t("returnQty")} />
                  </td>
                  <td className="py-2 px-3">
                    <Select value={conditions[item.id] ?? "restock"} disabled={left <= 0} className="!w-auto"
                      onChange={e => setConditions(c => ({ ...c, [item.id]: e.target.value as ReturnCondition }))} aria-label={t("condition")}>
                      {RETURN_CONDITIONS.map(value => <option key={value} value={value}>{t(`conditions.${value}`)}</option>)}
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">{t("conditionHint")}</p>

      <div className="grid sm:grid-cols-2 gap-x-4 mt-4">
        <Field label={t("reason")} required>
          <Select value={reason} onChange={e => setReason(e.target.value as typeof reason)}>
            {RETURN_REASONS.map(value => <option key={value} value={value}>{t(`reasons.${value}`)}</option>)}
          </Select>
        </Field>
        <Field label={t("refundMethod")}>
          <Select value={method} onChange={e => setMethod(e.target.value as RefundMethod)}>
            <option value="cash">{t("refundCash")}</option>
            <option value="original">{t("refundOriginal")}</option>
            {/* Credit is kept on a customer's account, so there has to be one. */}
            {sale.customer_id && <option value="credit">{t("refundCredit")}</option>}
          </Select>
        </Field>
      </div>
      {reason === "other" && <TextArea value={other} onChange={e => setOther(e.target.value)} placeholder={t("otherReason")} className="mb-4" />}
      <Field label={tc("notes")}><Input value={notes} onChange={e => setNotes(e.target.value)} /></Field>

      {needsPin && (
        <div className="rounded-xl bg-muted/40 p-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-primary" htmlFor="return-manager-pin">
            <ShieldCheck className="h-4 w-4" /> {t("managerPin")}
          </label>
          <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">{t("managerPinHint")}</p>
          <Input id="return-manager-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" className="!w-28 tracking-[0.4em] text-center" />
        </div>
      )}

      {picked && (
        <div className="mt-4 text-sm">
          <p className="font-semibold text-primary">{t("refundTotal", { amount: formatCurrency(estimate) })}</p>
          {pointsBack > 0 && <p className="text-[11px] text-muted-foreground">{t("pointsBack", { count: pointsBack })}</p>}
        </div>
      )}
    </Modal>
  );
};

/**
 * Find the invoice a customer is bringing something back on: by its number,
 * by their name or by their phone. Picking one opens the return itself.
 */
export const ReturnLookup = ({ open, onClose, onPick }: {
  open: boolean; onClose: () => void; onPick: (sale: PharmacySale) => void;
}) => {
  const t = useTranslations("pharmacy.sales");
  const ts = useTranslations("pharmacy.saleStatus");
  const { formatCurrency, formatDateTime } = useFormatters();
  const [q, setQ] = useState("");
  const search = useDebounced(q);
  // With nothing typed this is the latest few invoices, which is usually the one wanted.
  const { data, isFetching, error, refetch } = pharmacySalesApi.useList({ q: search, limit: 8 });
  const rows = data?.data ?? [];

  useEffect(() => { if (!open) setQ(""); }, [open]);

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title={t("lookupTitle")} size="md">
      <SearchBox value={q} onChange={setQ} placeholder={t("lookupPlaceholder")} autoFocus />
      <p className="text-[11px] text-muted-foreground mt-2">{t("lookupHint")}</p>
      <div className="mt-3">
        {isFetching || error || rows.length === 0 ? (
          <StateBlock loading={isFetching} error={error} onRetry={refetch} empty={t("lookupNone")} rows={3} />
        ) : (
          <ul className="space-y-2">
            {rows.map(sale => {
              const left = sale.items.reduce((sum, item) => sum + item.quantity - item.returned_quantity, 0);
              return (
                <li key={sale.id}>
                  <button type="button" disabled={left <= 0} onClick={() => onPick(sale)}
                    className="w-full text-left rounded-xl border border-border/60 bg-card p-3 transition hover:border-primary/50 disabled:opacity-50 disabled:pointer-events-none">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">{sale.invoice_number}</span>
                      <span className="text-sm font-semibold tabular-nums">{formatCurrency(Number(sale.total_amount) - Number(sale.refunded_amount))}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="truncate">{formatDateTime(sale.sold_at)} · {sale.customer_name ?? "—"}{sale.customer_phone ? ` · ${sale.customer_phone}` : ""}</span>
                      {left > 0 ? <span>{t("returnable", { count: left })}</span> : <Pill tone="bad">{ts("returned")}</Pill>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
};
