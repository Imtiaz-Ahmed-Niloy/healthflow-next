"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Banknote, Download, Eye, Printer, ReceiptText, RotateCcw, ShoppingCart, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { ReturnDialog } from "@/components/pharmacy/ReturnDialog";
import { Pager, SearchBox, StateBlock, Tile, fetchAllRows, useDebounced, usePharmacyCan, usePharmacyError } from "@/components/pharmacy/ui";
import { usePharmacyPrint } from "@/components/pharmacy/usePharmacyPrint";
import { Btn, Card, Pill } from "@/components/admin/ui";
import { Chips, DataTable, Field, Input, Modal, Select, exportCSV, type Column } from "@/components/admin/crud";
import { DateInput } from "@/components/ui/date-input";
import { useBookingClock, useFormatters } from "@/lib/appSettings";
import {
  COLLECT_METHODS, PAYMENT_METHODS, asSold, dueOn, monthStartOf, shiftDay,
  type PaymentStatus, type PharmacySale, type SaleStatus,
} from "@/lib/pharmacy";
import { pharmacySalesApi, usePharmacyReportQuery, usePharmacySettingsQuery, useSaleActionMutation } from "@/redux/api/pharmacy";

const PERIODS = ["today", "yesterday", "last7", "thisMonth", "allTime", "custom"] as const;
type Period = (typeof PERIODS)[number];

const STATUSES = ["all", "completed", "partial_return", "returned"] as const;
const STATUS_TONE: Record<SaleStatus, "ok" | "warn" | "bad"> = { completed: "ok", partial_return: "warn", returned: "bad" };
const PAID_TONE: Record<PaymentStatus, "ok" | "warn" | "bad"> = { paid: "ok", partial: "warn", unpaid: "bad" };

/** Far enough back to mean "everything". */
const EPOCH = "2000-01-01";

// --------------------------------------------------------------- payment ---
const PaymentDialog = ({ sale, onClose }: { sale: PharmacySale | null; onClose: () => void }) => {
  const t = useTranslations("pharmacy.sales");
  const tc = useTranslations("pharmacy.common");
  const tm = useTranslations("pharmacy.methods");
  const describe = usePharmacyError();
  const { formatCurrency } = useFormatters();
  const [act, { isLoading }] = useSaleActionMutation();

  if (!sale) return null;
  const due = dueOn(sale);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await act({
        id: sale.id,
        body: { action: "payment", amount: Number(form.get("amount")), method: String(form.get("method")), reference: String(form.get("reference") ?? "") || null },
      }).unwrap();
      toast.success(t("paymentDone"));
      onClose();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <Modal open onClose={onClose} title={t("collectTitle", { invoice: sale.invoice_number })} size="sm">
      <form onSubmit={submit}>
        <p className="text-sm text-muted-foreground mb-4">{t("amountDue")}: <b className="text-destructive tabular-nums">{formatCurrency(due)}</b></p>
        <Field label={tc("amount")} required>
          <Input name="amount" type="number" min={0.01} max={due} step="any" defaultValue={due} required autoFocus />
        </Field>
        <Field label={t("paidBy")} required>
          <Select name="method" defaultValue="cash">
            {COLLECT_METHODS.map(value => <option key={value} value={value}>{tm(value)}</option>)}
          </Select>
        </Field>
        <Field label={tc("reference")}><Input name="reference" /></Field>
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose}>{tc("cancel")}</Btn>
          <Btn type="submit" disabled={isLoading}>{isLoading ? tc("saving") : t("confirmPayment")}</Btn>
        </div>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------- detail ---
const SaleDetail = ({ sale, onClose, onReturn, onCollect }: {
  sale: PharmacySale | null; onClose: () => void; onReturn: () => void; onCollect: () => void;
}) => {
  const t = useTranslations("pharmacy.sales");
  const tc = useTranslations("pharmacy.common");
  const tm = useTranslations("pharmacy.methods");
  const ts = useTranslations("pharmacy.saleStatus");
  const tr = useTranslations("pharmacy.receipt");
  const tpos = useTranslations("pharmacy.pos");
  const tu = useTranslations("pharmacy.unitCount");
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();
  const { printSale } = usePharmacyPrint();
  const { data: settings } = usePharmacySettingsQuery();

  if (!sale) return null;
  const due = dueOn(sale);
  const row = (label: string, value: string, strong = false) => (
    <div className={`flex justify-between ${strong ? "font-semibold text-primary" : ""}`}><dt className={strong ? "" : "text-muted-foreground"}>{label}</dt><dd className="tabular-nums">{value}</dd></div>
  );

  return (
    <Modal open onClose={onClose} title={sale.invoice_number} size="lg"
      footer={<>
        <Btn variant="outline" onClick={() => printSale(sale, "slip")}><Printer className="h-4 w-4" /> {tpos("printSlip")}</Btn>
        <Btn variant="outline" onClick={() => printSale(sale, "invoice")}><Printer className="h-4 w-4" /> {tpos("printReceipt")}</Btn>
        {due > 0 && <Btn variant="outline" onClick={onCollect}><Banknote className="h-4 w-4" /> {t("collect")}</Btn>}
        {sale.status !== "returned" && <Btn variant="danger" onClick={onReturn}><Undo2 className="h-4 w-4" /> {t("return")}</Btn>}
      </>}>
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-4">
        <div><p className="text-[10px] tracking-widest font-bold text-muted-foreground">{tc("date").toUpperCase()}</p>{formatDateTime(sale.sold_at)}</div>
        <div><p className="text-[10px] tracking-widest font-bold text-muted-foreground">{tc("customer").toUpperCase()}</p>{sale.customer_name ?? tc("walkIn")}{sale.customer_phone ? ` · ${sale.customer_phone}` : ""}</div>
        <div><p className="text-[10px] tracking-widest font-bold text-muted-foreground">{tc("cashier").toUpperCase()}</p>{sale.created_by_name ?? "—"}</div>
        <div>
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{tc("payment").toUpperCase()}</p>
          {sale.payment_parts?.length
            ? sale.payment_parts.map(part => `${tm(part.method)} ${formatCurrency(Number(part.amount))}`).join(" + ")
            : <>{tm(sale.payment_method)}{sale.payment_reference ? ` · ${sale.payment_reference}` : ""}</>}
        </div>
        {sale.branch && <div><p className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("branch").toUpperCase()}</p>{sale.branch.name}</div>}
        <div><p className="text-[10px] tracking-widest font-bold text-muted-foreground">{tc("status").toUpperCase()}</p><Pill tone={STATUS_TONE[sale.status]}>{ts(sale.status)}</Pill></div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-[10px] tracking-widest text-muted-foreground">
            <tr>
              <th className="py-2 px-3">{tr("item").toUpperCase()}</th>
              <th className="py-2 px-3">{tr("batchExp").toUpperCase()}</th>
              <th className="py-2 px-3 text-right">{tr("qty").toUpperCase()}</th>
              <th className="py-2 px-3 text-right">{tr("rate").toUpperCase()}</th>
              <th className="py-2 px-3 text-right">{tr("amount").toUpperCase()}</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map(item => {
              // "2 strip" rather than "20", when it was sold that way.
              const sold = asSold(item);
              return (
                <tr key={item.id} className="border-t border-border/40">
                  <td className="py-2 px-3">
                    <span className="font-semibold text-primary">{item.item_name}</span>
                    {item.returned_quantity > 0 && <span className="ml-2"><Pill tone="warn">{t("returnedCount", { count: item.returned_quantity })}</Pill></span>}
                  </td>
                  <td className="py-2 px-3 text-xs text-muted-foreground">{item.batch_number}{item.expiry_date ? ` · ${formatDate(item.expiry_date)}` : ""}</td>
                  <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">{tu(sold.unit, { count: sold.count })}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(sold.price)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(Number(item.line_total))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-4 w-full sm:w-72 text-sm space-y-1">
        {row(t("subtotal"), formatCurrency(Number(sale.subtotal)))}
        {Number(sale.discount) - Number(sale.points_discount) > 0 && row(t("discount"), `-${formatCurrency(Number(sale.discount) - Number(sale.points_discount))}`)}
        {sale.points_redeemed > 0 && row(t("pointsUsed", { count: sale.points_redeemed }), `-${formatCurrency(Number(sale.points_discount))}`)}
        {Number(sale.tax) > 0 && row(tr("tax", { label: settings?.data.tax_label ?? "VAT", rate: Number(sale.tax_rate) }), formatCurrency(Number(sale.tax)))}
        {row(t("total"), formatCurrency(Number(sale.total_amount)), true)}
        {row(t("paid"), formatCurrency(Number(sale.paid_amount)))}
        {Number(sale.change_amount) > 0 && row(t("change"), formatCurrency(Number(sale.change_amount)))}
        {Number(sale.refunded_amount) > 0 && row(t("refunded"), `-${formatCurrency(Number(sale.refunded_amount))}`)}
        {due > 0 && <div className="flex justify-between font-semibold text-destructive"><dt>{t("balance")}</dt><dd className="tabular-nums">{formatCurrency(due)}</dd></div>}
        {sale.points_earned > 0 && <p className="pt-1 text-[11px] text-muted-foreground text-right">{t("pointsEarned", { count: sale.points_earned })}</p>}
      </dl>

      {sale.returns.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-primary mb-2">{t("returnsTitle")}</h4>
          <ul className="space-y-2">
            {sale.returns.map(entry => (
              <li key={entry.id} className="rounded-xl bg-muted/40 p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-semibold">
                    {entry.return_number && <span className="font-mono text-xs text-primary mr-2">{entry.return_number}</span>}
                    {entry.lines.map(line => `${line.quantity}× ${line.item_name} (${t(`conditions.${line.condition}`)})`).join(", ")}
                  </span>
                  <span className="tabular-nums font-semibold text-destructive">-{formatCurrency(Number(entry.refund_amount))}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {formatDateTime(entry.returned_at)} · {entry.created_by_name ?? "—"} · {entry.reason} · {entry.refund_method === "credit"
                    ? t("keptAsCredit", { amount: formatCurrency(Number(entry.paid_back)) })
                    : t("paidBack", { amount: formatCurrency(Number(entry.paid_back)) })}
                  {entry.approved_by_name && ` · ${t("approvedBy", { name: entry.approved_by_name })}`}
                  {entry.points_reversed > 0 && ` · ${t("pointsTakenBack", { count: entry.points_reversed })}`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sale.payments.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-primary mb-2">{t("paymentsTitle")}</h4>
          <ul className="space-y-1 text-sm">
            {sale.payments.map(payment => (
              <li key={payment.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
                <span>{formatDateTime(payment.created_at)} · {tm(payment.method)}{payment.reference ? ` · ${payment.reference}` : ""} · {payment.created_by_name ?? "—"}</span>
                <span className="tabular-nums font-semibold">{formatCurrency(Number(payment.amount))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
};

// ------------------------------------------------------------------ page ---
const Page = () => {
  const t = useTranslations("pharmacy.sales");
  const tc = useTranslations("pharmacy.common");
  const tm = useTranslations("pharmacy.methods");
  const ts = useTranslations("pharmacy.saleStatus");
  const tp = useTranslations("pharmacy.paymentStatus");
  const tn = useTranslations("pharmacyNav.links");
  const describe = usePharmacyError();
  const can = usePharmacyCan();
  const { formatCurrency, formatDateTime } = useFormatters();
  const { today } = useBookingClock();
  const { printSale } = usePharmacyPrint();

  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<Period>("today");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [customer, setCustomer] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const search = useDebounced(q);

  const [viewing, setViewing] = useState<string | null>(null);
  const [returning, setReturning] = useState<string | null>(null);
  const [collecting, setCollecting] = useState<string | null>(null);

  // Arriving from a customer's row: that customer's sales, over all time.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("customer");
    if (wanted) { setCustomer(wanted); setPeriod("allTime"); }
  }, []);

  const range = useMemo(() => {
    if (period === "today") return { from: today, to: today };
    if (period === "yesterday") return { from: shiftDay(today, -1), to: shiftDay(today, -1) };
    if (period === "last7") return { from: shiftDay(today, -6), to: today };
    if (period === "thisMonth") return { from: monthStartOf(today), to: today };
    if (period === "allTime") return { from: EPOCH, to: today };
    return { from: from || today, to: to || today };
  }, [period, from, to, today]);

  useEffect(() => { setPage(1); }, [search, range.from, range.to, method, status, customer]);

  const { data, isLoading, isFetching, error, refetch } = pharmacySalesApi.useList({
    page, limit: 20, q: search,
    filters: {
      sale_date_from: range.from, sale_date_to: range.to,
      payment_method: method || undefined, status: status === "all" ? undefined : status, customer_id: customer ?? undefined,
    },
  });
  // The totals above the list are a report, and reports are for those given them (0131).
  const seesReports = can("see_reports");
  const { data: report } = usePharmacyReportQuery(range, { skip: !seesReports });
  const rows = data?.data ?? [];
  const summary = report?.data.summary;
  const find = (id: string | null) => rows.find(row => row.id === id) ?? null;

  const columns: Column<PharmacySale>[] = [
    { key: "invoice", label: t("columns.invoice"), render: r => <span className="font-mono text-xs font-semibold text-primary">{r.invoice_number}</span> },
    { key: "date", label: t("columns.date"), render: r => <span className="whitespace-nowrap">{formatDateTime(r.sold_at)}</span> },
    { key: "customer", label: t("columns.customer"), render: r => r.customer_name ?? <span className="text-muted-foreground">{tc("walkIn")}</span> },
    { key: "items", label: t("columns.items"), render: r => {
      const names = [...new Set(r.items.map(item => item.item_name))];
      return <span className="text-xs text-muted-foreground">{names.slice(0, 2).join(", ")}{names.length > 2 ? ` +${names.length - 2}` : ""}</span>;
    } },
    { key: "payment", label: t("columns.payment"), render: r => (
      <div className="text-xs">
        <p className="font-semibold">{tm(r.payment_method)}</p>
        {r.payment_status !== "paid" && <Pill tone={PAID_TONE[r.payment_status]}>{tp(r.payment_status)}</Pill>}
      </div>
    ) },
    { key: "status", label: t("columns.status"), render: r => <Pill tone={STATUS_TONE[r.status]}>{ts(r.status)}</Pill> },
    { key: "amount", label: t("columns.amount"), render: r => (
      <div className="tabular-nums">
        <p className="font-semibold">{formatCurrency(Number(r.total_amount) - Number(r.refunded_amount))}</p>
        {dueOn(r) > 0 && <p className="text-[11px] text-destructive">{t("due", { amount: formatCurrency(dueOn(r)) })}</p>}
      </div>
    ) },
    { key: "cashier", label: t("columns.cashier"), render: r => <span className="text-xs">{r.created_by_name ?? "—"}</span> },
  ];

  // Every sale that matches what is on screen, not only this page of it.
  const download = async () => {
    try {
      const all = await fetchAllRows<PharmacySale>("pharmacy-sales", {
        q: search || undefined, sale_date_from: range.from, sale_date_to: range.to,
        payment_method: method || undefined, status: status === "all" ? undefined : status, customer_id: customer ?? undefined,
      });
      exportCSV(all.map(r => ({
        invoice: r.invoice_number, date: r.sold_at, customer: r.customer_name ?? "", phone: r.customer_phone ?? "",
        items: r.items.map(item => `${item.quantity}x ${item.item_name}`).join("; "),
        payment: r.payment_method, status: r.status, subtotal: r.subtotal, discount: r.discount, tax: r.tax,
        total: r.total_amount, refunded: r.refunded_amount, paid: r.paid_amount, due: dueOn(r), cashier: r.created_by_name ?? "",
      })), `pharmacy-sales-${range.from}-${range.to}.csv`);
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  const iconBtn = "p-1.5 rounded-lg hover:bg-muted text-foreground/70";

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")}>
      {seesReports && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Tile icon={ReceiptText} label={t("stats.sales")} value={formatCurrency(Number(summary?.revenue ?? 0))} />
          <Tile icon={ShoppingCart} label={t("stats.count")} value={summary?.transactions ?? 0} />
          <Tile icon={Banknote} label={t("stats.avg")} value={formatCurrency(Number(summary?.avg_ticket ?? 0))} />
          <Tile icon={RotateCcw} label={t("stats.refunds")} value={formatCurrency(Number(summary?.refunds ?? 0))} tone={Number(summary?.refunds ?? 0) > 0 ? "bad" : "default"} />
        </div>
      )}

      <Card className="p-4 lg:p-5">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <SearchBox value={q} onChange={setQ} placeholder={t("searchPlaceholder")} className="flex-1" />
          <Select value={method} onChange={e => setMethod(e.target.value)} className="!w-auto" aria-label={t("columns.payment")}>
            <option value="">{t("allMethods")}</option>
            {[...PAYMENT_METHODS, "store_credit" as const].map(value => <option key={value} value={value}>{tm(value)}</option>)}
          </Select>
          <Btn variant="outline" onClick={download}><Download className="h-4 w-4" /> {tc("exportCsv")}</Btn>
          <Link href="/pharmacy/pos"><Btn><ShoppingCart className="h-4 w-4" /> {tn("pos")}</Btn></Link>
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Chips value={period} onChange={setPeriod} options={PERIODS.map(value => ({ value, label: t(`periods.${value}`) }))} />
          {period === "custom" && (
            <>
              <DateInput value={from} onChange={setFrom} max={to || today} aria-label={tc("from")} wrapperClassName="w-40" showClear={false} />
              <DateInput value={to} onChange={setTo} min={from} max={today} aria-label={tc("to")} wrapperClassName="w-40" showClear={false} />
            </>
          )}
          <Chips value={status} onChange={setStatus}
            options={STATUSES.map(value => ({ value, label: value === "all" ? t("allStatuses") : ts(value) }))} />
          {customer && (
            <button type="button" onClick={() => setCustomer(null)}
              className="inline-flex items-center gap-1 rounded-full bg-chip text-chip-foreground px-3 py-1 text-xs font-semibold">
              {rows[0]?.customer_name ?? tc("customer")} <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isLoading || error || rows.length === 0 ? (
          <StateBlock loading={isLoading} error={error} onRetry={refetch} empty={t("noSales")} />
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <DataTable<PharmacySale> rows={rows} columns={columns} onRow={row => setViewing(row.id)}
              actions={row => (
                <div className="inline-flex items-center gap-1">
                  <button onClick={() => setViewing(row.id)} className={iconBtn} title={t("view")} aria-label={t("view")}><Eye className="h-4 w-4" /></button>
                  <button onClick={() => printSale(row, "slip")} className={iconBtn} title={tc("print")} aria-label={tc("print")}><Printer className="h-4 w-4" /></button>
                  {dueOn(row) > 0 && <button onClick={() => setCollecting(row.id)} className={iconBtn} title={t("collect")} aria-label={t("collect")}><Banknote className="h-4 w-4" /></button>}
                  {row.status !== "returned" && <button onClick={() => setReturning(row.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title={t("return")} aria-label={t("return")}><Undo2 className="h-4 w-4" /></button>}
                </div>
              )} />
          </div>
        )}
        {data?.meta && <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      </Card>

      <SaleDetail sale={returning || collecting ? null : find(viewing)} onClose={() => setViewing(null)}
        onReturn={() => setReturning(viewing)} onCollect={() => setCollecting(viewing)} />
      <ReturnDialog sale={find(returning)} onClose={() => setReturning(null)} />
      <PaymentDialog sale={find(collecting)} onClose={() => setCollecting(null)} />
    </PharmacyLayout>
  );
};

export default Page;
