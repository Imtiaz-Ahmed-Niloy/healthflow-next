"use client";

import { useState } from "react";
import { Check, Copy, FileText, Printer, ReceiptText, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePharmacyPrint } from "@/components/pharmacy/usePharmacyPrint";
import { Btn, Pill } from "@/components/admin/ui";
import { Modal } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import { BRAND_INFO } from "@/constants/brand";
import { asSold, dueOn, type PharmacySale } from "@/lib/pharmacy";
import { usePharmacySettingsQuery } from "@/redux/api/pharmacy";

type Mode = "invoice" | "slip";

/**
 * A sale as it will print, shown first: the full-page invoice or the narrow
 * till slip. Opens by itself when a sale is completed at the till, so the
 * print button is one click away, and can start a return on the same invoice.
 *
 * What is on screen is a preview. The paper comes from usePharmacyPrint, which
 * lays the same sale out for the printer in a window of its own.
 */
export const ReceiptDialog = ({ sale, onClose, onReturn, initial = "invoice" }: {
  sale: PharmacySale | null; onClose: () => void; onReturn?: (sale: PharmacySale) => void; initial?: Mode;
}) => {
  const t = useTranslations("pharmacy.receipt");
  const tm = useTranslations("pharmacy.methods");
  const tu = useTranslations("pharmacy.unitCount");
  const tc = useTranslations("pharmacy.common");
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();
  const { printSale } = usePharmacyPrint();
  const { data } = usePharmacySettingsQuery();
  const [mode, setMode] = useState<Mode>(initial);
  const [copied, setCopied] = useState(false);

  if (!sale) return null;

  const settings = data?.data;
  const name = settings?.pharmacy_name || data?.hospital || BRAND_INFO.name;
  const address = sale.branch?.address || settings?.address;
  const phone = sale.branch?.phone || settings?.phone;
  const due = dueOn(sale);
  const money = (value: number | string) => formatCurrency(Number(value));
  const paidBy = sale.payment_parts?.length
    ? sale.payment_parts.map(part => `${tm(part.method)} ${money(part.amount)}`).join(" + ")
    : `${tm(sale.payment_method)}${sale.payment_reference ? ` · ${sale.payment_reference}` : ""}`;
  const taxLabel = t("tax", { label: settings?.tax_label ?? "VAT", rate: Number(sale.tax_rate) });

  const copy = async () => {
    await navigator.clipboard.writeText(sale.invoice_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const totals: [string, string, boolean?][] = [
    [t("subtotal"), money(sale.subtotal)],
    ...(Number(sale.discount) ? [[t("discount"), `-${money(sale.discount)}`] as [string, string]] : []),
    ...(Number(sale.tax) ? [[taxLabel, money(sale.tax)] as [string, string]] : []),
    [t("total"), money(sale.total_amount), true],
    [t("paid"), money(sale.paid_amount)],
    ...(Number(sale.change_amount) ? [[t("change"), money(sale.change_amount)] as [string, string]] : []),
    ...(Number(sale.refunded_amount) ? [[t("refunded"), `-${money(sale.refunded_amount)}`] as [string, string]] : []),
    ...(due ? [[t("balance"), money(due), true] as [string, string, boolean]] : []),
  ];

  const tab = (value: Mode, label: string, Icon: typeof FileText) => (
    <button type="button" onClick={() => setMode(value)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        mode === value ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted"
      }`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );

  return (
    <Modal open onClose={onClose} title={t("invoice")} size="lg"
      footer={<>
        <Btn variant="outline" onClick={onClose}>{tc("close")}</Btn>
        {onReturn && sale.status !== "returned" && (
          <Btn variant="outline" onClick={() => onReturn(sale)}><Undo2 className="h-4 w-4" /> {t("processReturn")}</Btn>
        )}
        <Btn onClick={() => printSale(sale, mode)}><Printer className="h-4 w-4" /> {tc("print")}</Btn>
      </>}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-primary">{sale.invoice_number}</span>
          <button type="button" onClick={copy} title={t("copyNumber")} aria-label={t("copyNumber")}
            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <Pill tone={due ? "warn" : "ok"}>{due ? t("balance") : t("paid")}</Pill>
        </div>
        <div className="inline-flex items-center gap-1 rounded-xl bg-muted/40 p-1">
          {tab("invoice", t("salesInvoice"), FileText)}
          {tab("slip", t("thermalSlip"), ReceiptText)}
        </div>
      </div>

      {mode === "slip" ? (
        <div className="mx-auto w-full max-w-[320px] rounded-lg border border-dashed border-border bg-white p-4 font-mono text-[11px] leading-relaxed text-black">
          <p className="text-center text-sm font-bold">{name}</p>
          {sale.branch?.name && <p className="text-center font-bold">{sale.branch.name}</p>}
          {address && <p className="text-center">{address}</p>}
          {phone && <p className="text-center">{phone}</p>}
          <hr className="my-2 border-dashed border-black/60" />
          <p className="flex justify-between"><span>{t("invoice")}</span><b>{sale.invoice_number}</b></p>
          <p className="flex justify-between"><span>{t("date")}</span><span>{formatDateTime(sale.sold_at)}</span></p>
          <p className="flex justify-between"><span>{t("cashier")}</span><span>{sale.created_by_name ?? ""}</span></p>
          {sale.customer_name && <p className="flex justify-between"><span>{t("customer")}</span><span>{sale.customer_name}</span></p>}
          <hr className="my-2 border-dashed border-black/60" />
          {sale.items.map(item => {
            const sold = asSold(item);
            return (
              <div key={item.id} className="mb-1">
                <p>{item.item_name}</p>
                <p className="flex justify-between"><span>{tu(sold.unit, { count: sold.count })} × {money(sold.price)}</span><span>{money(item.line_total)}</span></p>
              </div>
            );
          })}
          <hr className="my-2 border-dashed border-black/60" />
          {totals.map(([label, value, strong]) => (
            <p key={label} className={`flex justify-between ${strong ? "text-sm font-bold" : ""}`}><span>{label}</span><span>{value}</span></p>
          ))}
          <p className="flex justify-between"><span>{t("paidBy")}</span><span className="text-right">{paidBy}</span></p>
          <hr className="my-2 border-dashed border-black/60" />
          {sale.points_earned > 0 && <p className="text-center">{t("pointsEarned", { count: sale.points_earned })}</p>}
          <p className="text-center">{settings?.receipt_footer || t("thanks")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-white p-5 text-sm text-black">
          <div className="flex flex-wrap justify-between gap-4 border-b-2 border-black pb-3">
            <div>
              <p className="text-lg font-bold">{name}</p>
              {sale.branch?.name && <p className="text-xs font-semibold">{sale.branch.name}</p>}
              {[address, phone, settings?.email].filter(Boolean).map(line => <p key={line} className="text-xs text-black/60">{line}</p>)}
              {settings?.license_no && <p className="text-xs text-black/60">{t("licence", { number: settings.license_no })}</p>}
            </div>
            <div className="text-right">
              <p className="text-base font-bold">{t("invoice")}</p>
              <p className="text-xs text-black/60">{sale.invoice_number}</p>
            </div>
          </div>
          <dl className="my-3 flex flex-wrap gap-x-8 gap-y-2 text-xs">
            <div><dt className="font-semibold text-black/50">{t("date")}</dt><dd>{formatDateTime(sale.sold_at)}</dd></div>
            <div><dt className="font-semibold text-black/50">{t("cashier")}</dt><dd>{sale.created_by_name ?? "—"}</dd></div>
            {sale.customer_name && <div><dt className="font-semibold text-black/50">{t("customer")}</dt><dd>{sale.customer_name}{sale.customer_phone ? ` · ${sale.customer_phone}` : ""}</dd></div>}
            <div><dt className="font-semibold text-black/50">{t("paidBy")}</dt><dd>{paidBy}</dd></div>
          </dl>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-black/5 text-left">
                <tr>
                  <th className="py-2 px-2">{t("item")}</th><th className="py-2 px-2">{t("batchExp")}</th>
                  <th className="py-2 px-2 text-right">{t("qty")}</th><th className="py-2 px-2 text-right">{t("rate")}</th><th className="py-2 px-2 text-right">{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map(item => {
                  const sold = asSold(item);
                  return (
                    <tr key={item.id} className="border-b border-black/10">
                      <td className="py-1.5 px-2 font-semibold">{item.item_name}</td>
                      <td className="py-1.5 px-2 text-black/60">{item.batch_number}{item.expiry_date ? ` · ${formatDate(item.expiry_date)}` : ""}</td>
                      <td className="py-1.5 px-2 text-right whitespace-nowrap">{tu(sold.unit, { count: sold.count })}</td>
                      <td className="py-1.5 px-2 text-right">{money(sold.price)}</td>
                      <td className="py-1.5 px-2 text-right">{money(item.line_total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <dl className="ml-auto mt-3 w-full max-w-[260px] space-y-1 text-xs">
            {totals.map(([label, value, strong]) => (
              <div key={label} className={`flex justify-between ${strong ? "border-t border-black pt-1 text-sm font-bold" : ""}`}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-black/60">
            {sale.points_earned > 0 && <>{t("pointsEarned", { count: sale.points_earned })} · </>}
            {settings?.receipt_footer || t("thanks")}
          </p>
        </div>
      )}
    </Modal>
  );
};
