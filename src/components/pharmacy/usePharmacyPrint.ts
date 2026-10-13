"use client";

import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/lib/appSettings";
import { BRAND_INFO } from "@/constants/brand";
import { usePharmacySettingsQuery } from "@/redux/api/pharmacy";
import { asSold, dueOn, type CashShift, type PharmacySale, type PurchaseOrder, type SaleItem, type SaleReturn } from "@/lib/pharmacy";

/**
 * What the pharmacy prints: a sale (as a full-page invoice or a till slip), a
 * purchase order, and a cash drawer's closing slip.
 *
 * Each opens in a window of its own and prints itself, the way the finance
 * invoice and the payslip do — a page of its own has no sidebar to hide and
 * comes out the same from any screen. Headed with the pharmacy's name from
 * its settings, or the hospital's when none has been set.
 */

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

const PAGE_CSS = `
  *{box-sizing:border-box}body{font-family:system-ui,-apple-system,"Segoe UI","Nirmala UI",sans-serif;color:#111;margin:0;padding:32px;font-size:13px}
  .head{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:18px}
  .brand{font-size:20px;font-weight:700}.muted{color:#555;font-size:12px}h1{font-size:18px;margin:0 0 4px}
  .meta{display:flex;flex-wrap:wrap;gap:8px 32px;margin:0 0 18px}.meta b{display:block;font-size:11px;color:#666;font-weight:600}
  table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e5e7eb;padding:7px 6px;text-align:left;vertical-align:top}
  th{background:#f3f4f6;font-size:11px}.num{text-align:right;white-space:nowrap}
  .totals{margin:14px 0 0 auto;width:280px}.totals div{display:flex;justify-content:space-between;padding:3px 0}
  .totals .grand{border-top:2px solid #111;margin-top:4px;padding-top:6px;font-weight:700;font-size:15px}
  .foot{margin-top:28px;color:#555;font-size:12px}.sign{margin-top:56px;width:220px;border-top:1px solid #111;padding-top:6px;font-size:11px;color:#555}
`;

const SLIP_CSS = `
  @page{size:80mm auto;margin:4mm}*{box-sizing:border-box}
  body{font-family:ui-monospace,Consolas,"Nirmala UI",monospace;color:#000;margin:0;padding:0;width:72mm;font-size:11px;line-height:1.35}
  .c{text-align:center}.b{font-weight:700}.big{font-size:14px}hr{border:0;border-top:1px dashed #000;margin:6px 0}
  .row{display:flex;justify-content:space-between;gap:8px}.sm{font-size:10px}
`;

const openWindow = (title: string, css: string, body: string, width: number) => {
  const w = window.open("", "_blank", `width=${width},height=900`);
  if (!w) return false;
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head>` +
    `<body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`,
  );
  w.document.close();
  return true;
};

export const usePharmacyPrint = () => {
  const t = useTranslations("pharmacy.receipt");
  const tm = useTranslations("pharmacy.methods");
  const tu = useTranslations("pharmacy.unitCount");
  const tc = useTranslations("pharmacy.sales");
  const tt = useTranslations("pharmacy.drawer.types");
  const te = useTranslations("pharmacy.errors");
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();
  const { data } = usePharmacySettingsQuery();

  const settings = data?.data;
  const name = settings?.pharmacy_name || data?.hospital || BRAND_INFO.name;
  const money = (value: number | string | null | undefined) => formatCurrency(Number(value ?? 0));
  const taxLine = (sale: PharmacySale) => t("tax", { label: settings?.tax_label ?? "VAT", rate: Number(sale.tax_rate) });

  /** A pop-up blocker is the one way this fails, and it fails silently unless told. */
  const show = (opened: boolean) => { if (!opened) toast.error(te("generic")); };

  const contact = [settings?.address, settings?.phone, settings?.email].filter(Boolean).map(esc);
  const licence = [
    settings?.license_no ? esc(t("licence", { number: settings.license_no })) : "",
    settings?.tax_id ? esc(t("taxId", { number: settings.tax_id })) : "",
  ].filter(Boolean).join(" · ");

  /** "2 strip" and the price of a strip, when that is how it was sold. */
  const counted = (item: SaleItem) => {
    const sold = asSold(item);
    return { count: tu(sold.unit, { count: sold.count }), price: money(sold.price) };
  };
  /** A split bill names each part: "Cash 300 + Mobile banking 250". */
  const paidBy = (sale: PharmacySale) =>
    sale.payment_parts?.length
      ? sale.payment_parts.map(part => `${tm(part.method)} ${money(part.amount)}`).join(" + ")
      : `${tm(sale.payment_method)}${sale.payment_reference ? ` · ${sale.payment_reference}` : ""}`;

  const printSale = (sale: PharmacySale, mode: "invoice" | "slip" = "invoice") => {
    const due = dueOn(sale);
    const customer = sale.customer_name || "";
    // A sale made at a branch is headed with that branch's address, when it has one.
    const heading = [sale.branch?.address || settings?.address, sale.branch?.phone || settings?.phone, settings?.email].filter(Boolean).map(esc);
    const branch = sale.branch?.name ? esc(sale.branch.name) : "";
    const points = [
      sale.points_redeemed ? t("pointsUsed", { count: sale.points_redeemed }) : "",
      sale.points_earned ? t("pointsEarned", { count: sale.points_earned }) : "",
    ].filter(Boolean).map(esc);

    if (mode === "slip") {
      const lines = sale.items.map(i => `
        <div>${esc(i.item_name)}</div>
        <div class="row sm"><span>${esc(counted(i).count)} × ${esc(counted(i).price)}${i.returned_quantity ? ` (${esc(t("returned", { count: i.returned_quantity }))})` : ""}</span><span>${esc(money(i.line_total))}</span></div>`).join("");
      show(openWindow(sale.invoice_number, SLIP_CSS, `
        <div class="c b big">${esc(name)}</div>
        ${branch ? `<div class="c sm b">${branch}</div>` : ""}
        ${heading.map(c => `<div class="c sm">${c}</div>`).join("")}
        ${licence ? `<div class="c sm">${licence}</div>` : ""}
        <hr>
        <div class="row"><span>${esc(t("invoice"))}</span><span class="b">${esc(sale.invoice_number)}</span></div>
        <div class="row"><span>${esc(t("date"))}</span><span>${esc(formatDateTime(sale.sold_at))}</span></div>
        <div class="row"><span>${esc(t("cashier"))}</span><span>${esc(sale.created_by_name ?? "")}</span></div>
        ${customer ? `<div class="row"><span>${esc(t("customer"))}</span><span>${esc(customer)}</span></div>` : ""}
        <hr>${lines}<hr>
        <div class="row"><span>${esc(t("subtotal"))}</span><span>${esc(money(sale.subtotal))}</span></div>
        ${Number(sale.discount) ? `<div class="row"><span>${esc(t("discount"))}</span><span>-${esc(money(sale.discount))}</span></div>` : ""}
        ${Number(sale.tax) ? `<div class="row"><span>${esc(taxLine(sale))}</span><span>${esc(money(sale.tax))}</span></div>` : ""}
        <div class="row b big"><span>${esc(t("total"))}</span><span>${esc(money(sale.total_amount))}</span></div>
        <div class="row"><span>${esc(t("paidBy"))}</span><span>${esc(paidBy(sale))}</span></div>
        ${Number(sale.change_amount) ? `<div class="row"><span>${esc(t("change"))}</span><span>${esc(money(sale.change_amount))}</span></div>` : ""}
        ${Number(sale.refunded_amount) ? `<div class="row"><span>${esc(t("refunded"))}</span><span>-${esc(money(sale.refunded_amount))}</span></div>` : ""}
        ${due ? `<div class="row b"><span>${esc(t("balance"))}</span><span>${esc(money(due))}</span></div>` : ""}
        <hr>
        ${points.map(line => `<div class="c sm">${line}</div>`).join("")}
        ${settings?.return_policy ? `<div class="c sm">${esc(settings.return_policy)}</div>` : ""}
        <div class="c">${esc(settings?.receipt_footer || t("thanks"))}</div>`, 420));
      return;
    }

    const rows = sale.items.map(i => `
      <tr><td>${esc(i.item_name)}${i.returned_quantity ? `<div class="muted">${esc(t("returned", { count: i.returned_quantity }))}</div>` : ""}</td>
      <td>${esc(i.batch_number ?? "")}${i.expiry_date ? ` · ${esc(formatDate(i.expiry_date))}` : ""}</td>
      <td class="num">${esc(counted(i).count)}</td><td class="num">${esc(counted(i).price)}</td><td class="num">${esc(money(i.line_total))}</td></tr>`).join("");

    show(openWindow(sale.invoice_number, PAGE_CSS, `
      <div class="head">
        <div><div class="brand">${esc(name)}</div>${branch ? `<div class="muted"><b>${branch}</b></div>` : ""}${heading.map(c => `<div class="muted">${c}</div>`).join("")}${licence ? `<div class="muted">${licence}</div>` : ""}</div>
        <div style="text-align:right"><h1>${esc(t("invoice"))}</h1><div class="muted">${esc(sale.invoice_number)}</div></div>
      </div>
      <div class="meta">
        <div><b>${esc(t("date"))}</b>${esc(formatDateTime(sale.sold_at))}</div>
        <div><b>${esc(t("cashier"))}</b>${esc(sale.created_by_name ?? "")}</div>
        ${customer ? `<div><b>${esc(t("customer"))}</b>${esc(customer)}</div>` : ""}
        ${sale.customer_phone ? `<div><b>${esc(t("phone"))}</b>${esc(sale.customer_phone)}</div>` : ""}
        <div><b>${esc(t("paidBy"))}</b>${esc(paidBy(sale))}</div>
      </div>
      <table><thead><tr><th>${esc(t("item"))}</th><th>${esc(t("batchExp"))}</th><th class="num">${esc(t("qty"))}</th>
        <th class="num">${esc(t("rate"))}</th><th class="num">${esc(t("amount"))}</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals">
        <div><span>${esc(t("subtotal"))}</span><span>${esc(money(sale.subtotal))}</span></div>
        ${Number(sale.discount) ? `<div><span>${esc(t("discount"))}</span><span>-${esc(money(sale.discount))}</span></div>` : ""}
        ${Number(sale.tax) ? `<div><span>${esc(taxLine(sale))}</span><span>${esc(money(sale.tax))}</span></div>` : ""}
        <div class="grand"><span>${esc(t("total"))}</span><span>${esc(money(sale.total_amount))}</span></div>
        <div><span>${esc(t("paid"))}</span><span>${esc(money(sale.paid_amount))}</span></div>
        ${Number(sale.change_amount) ? `<div><span>${esc(t("change"))}</span><span>${esc(money(sale.change_amount))}</span></div>` : ""}
        ${Number(sale.refunded_amount) ? `<div><span>${esc(t("refunded"))}</span><span>-${esc(money(sale.refunded_amount))}</span></div>` : ""}
        ${due ? `<div><span>${esc(t("balance"))}</span><span>${esc(money(due))}</span></div>` : ""}
      </div>
      <div class="foot">${points.map(line => `<div>${line}</div>`).join("")}${settings?.payment_terms ? `<div>${esc(settings.payment_terms)}</div>` : ""}${settings?.return_policy ? `<div>${esc(settings.return_policy)}</div>` : ""}<div>${esc(settings?.receipt_footer || t("thanks"))}</div></div>`, 900));
  };

  const printOrder = (order: PurchaseOrder) => {
    const rows = order.items.map(i => `
      <tr><td>${esc(i.item_name)}<div class="muted">${esc(i.sku ?? "")}</div></td>
      <td class="num">${i.quantity}</td><td class="num">${i.received_quantity}</td>
      <td class="num">${esc(money(i.unit_cost))}</td><td class="num">${esc(money(Number(i.unit_cost) * i.quantity))}</td></tr>`).join("");

    show(openWindow(order.po_number, PAGE_CSS, `
      <div class="head">
        <div><div class="brand">${esc(name)}</div>${contact.map(c => `<div class="muted">${c}</div>`).join("")}</div>
        <div style="text-align:right"><h1>${esc(t("poTitle"))}</h1><div class="muted">${esc(order.po_number)}</div></div>
      </div>
      <div class="meta">
        <div><b>${esc(t("supplier"))}</b>${esc(order.supplier?.name ?? "")}
          ${[order.supplier?.address, order.supplier?.phone, order.supplier?.email].filter(Boolean).map(v => `<div class="muted">${esc(v)}</div>`).join("")}</div>
        <div><b>${esc(t("orderDate"))}</b>${esc(formatDate(order.order_date))}</div>
        ${order.expected_date ? `<div><b>${esc(t("expected"))}</b>${esc(formatDate(order.expected_date))}</div>` : ""}
      </div>
      <table><thead><tr><th>${esc(t("item"))}</th><th class="num">${esc(t("ordered"))}</th><th class="num">${esc(t("received"))}</th>
        <th class="num">${esc(t("unitCost"))}</th><th class="num">${esc(t("amount"))}</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals">
        <div><span>${esc(t("subtotal"))}</span><span>${esc(money(order.subtotal))}</span></div>
        <div class="grand"><span>${esc(t("total"))}</span><span>${esc(money(order.total_amount))}</span></div>
        <div><span>${esc(t("paid"))}</span><span>${esc(money(order.paid_amount))}</span></div>
      </div>
      ${order.notes ? `<div class="foot"><b>${esc(t("notes"))}</b><div>${esc(order.notes)}</div></div>` : ""}
      <div class="sign">${esc(t("signature"))}</div>`, 900));
  };

  const printShift = (shift: CashShift) => {
    const lines = [...shift.lines].sort((a, b) => a.created_at.localeCompare(b.created_at)).map(l => `
      <div class="row sm"><span>${esc(tt(l.type))}${l.note ? ` · ${esc(l.note)}` : ""}</span><span>${esc(money(l.amount))}</span></div>`).join("");

    show(openWindow(t("shiftTitle"), SLIP_CSS, `
      <div class="c b big">${esc(name)}</div>
      <div class="c b">${esc(t("shiftTitle"))}</div>
      <hr>
      <div class="row"><span>${esc(t("cashier"))}</span><span>${esc(shift.opened_by_name ?? "")}</span></div>
      <div class="row"><span>${esc(t("opened"))}</span><span>${esc(formatDateTime(shift.opened_at))}</span></div>
      ${shift.closed_at ? `<div class="row"><span>${esc(t("closed"))}</span><span>${esc(formatDateTime(shift.closed_at))}</span></div>` : ""}
      <hr>
      <div class="row"><span>${esc(t("openingCash"))}</span><span>${esc(money(shift.opening_balance))}</span></div>
      ${lines}
      <hr>
      ${shift.expected_balance !== null ? `<div class="row"><span>${esc(t("expectedCash"))}</span><span>${esc(money(shift.expected_balance))}</span></div>` : ""}
      ${shift.closing_balance !== null ? `<div class="row"><span>${esc(t("countedCash"))}</span><span>${esc(money(shift.closing_balance))}</span></div>` : ""}
      ${shift.discrepancy !== null ? `<div class="row b"><span>${esc(t("difference"))}</span><span>${esc(money(shift.discrepancy))}</span></div>` : ""}
      ${shift.closing_note ? `<hr><div class="sm">${esc(shift.closing_note)}</div>` : ""}
      <div style="margin-top:36px;border-top:1px solid #000;padding-top:4px" class="sm c">${esc(t("signature"))}</div>`, 420));
  };

  /** The slip a customer takes away with their refund: what came back, in what state, and who approved it. */
  const printReturn = (sale: PharmacySale, entry: SaleReturn) => {
    const lines = entry.lines.map(l => `
      <div>${esc(l.item_name)}</div>
      <div class="row sm"><span>${l.quantity} × ${esc(money(l.unit_price))} · ${esc(tc(`conditions.${l.condition}`))}</span><span>${esc(money(Number(l.unit_price) * l.quantity))}</span></div>`).join("");

    show(openWindow(entry.return_number ?? sale.invoice_number, SLIP_CSS, `
      <div class="c b big">${esc(name)}</div>
      <div class="c b">${esc(t("returnTitle"))}</div>
      <hr>
      ${entry.return_number ? `<div class="row"><span>${esc(t("returnNo"))}</span><span class="b">${esc(entry.return_number)}</span></div>` : ""}
      <div class="row"><span>${esc(t("invoice"))}</span><span>${esc(sale.invoice_number)}</span></div>
      <div class="row"><span>${esc(t("date"))}</span><span>${esc(formatDateTime(entry.returned_at))}</span></div>
      ${sale.customer_name ? `<div class="row"><span>${esc(t("customer"))}</span><span>${esc(sale.customer_name)}</span></div>` : ""}
      <div class="row"><span>${esc(t("cashier"))}</span><span>${esc(entry.created_by_name ?? "")}</span></div>
      ${entry.approved_by_name ? `<div class="row"><span>${esc(t("approvedBy"))}</span><span>${esc(entry.approved_by_name)}</span></div>` : ""}
      <hr>${lines}<hr>
      <div class="row b big"><span>${esc(t("refundTotal"))}</span><span>${esc(money(entry.refund_amount))}</span></div>
      <div class="row"><span>${esc(entry.refund_method === "credit" ? t("keptAsCredit") : t("paidBack"))}</span><span>${esc(money(entry.paid_back))}</span></div>
      <div class="row sm"><span>${esc(t("reason"))}</span><span>${esc(entry.reason)}</span></div>
      <div style="margin-top:36px;border-top:1px solid #000;padding-top:4px" class="sm c">${esc(t("signature"))}</div>`, 420));
  };

  return { printSale, printOrder, printShift, printReturn };
};
