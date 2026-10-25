"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  FileText,
  Printer,
  ReceiptText,
  X,
  Sparkles,
  QrCode,
  Building2,
  Calendar,
  User,
  Phone,
  Clock,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BRAND_INFO } from "@/constants/brand";
import { toast } from "sonner";

export interface LabInvoiceItem {
  id: string;
  code: string;
  name: string;
  department: string;
  sample_tube: string;
  price: number;
  fasting_required?: boolean;
}

export interface LabInvoiceData {
  id: string;
  invoice_no: string;
  token_no: string;
  date_time: string;
  cashier_name: string;
  patient_name: string;
  patient_phone: string;
  patient_age: string | number;
  patient_gender: string;
  mrn_number?: string;
  referring_doctor: string;
  counter: string;
  items: LabInvoiceItem[];
  subtotal: number;
  stat_fee: number;
  discount_percent: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  payment_method: "cash" | "card" | "bkash" | "nagad";
}

type ReceiptMode = "invoice" | "slip";

const PAGE_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #111;
    margin: 0;
    padding: 24px;
    font-size: 13px;
    background: #fff;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .brand { font-size: 20px; font-weight: 800; color: #0284c7; }
  .lab-subtitle { font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
  .muted { color: #64748b; font-size: 11px; margin-top: 2px; }
  .token-box {
    border: 2px solid #0284c7;
    background: #f0f9ff;
    padding: 6px 14px;
    border-radius: 8px;
    text-align: right;
  }
  .token-title { font-size: 10px; font-weight: 700; color: #0369a1; text-transform: uppercase; }
  .token-val { font-size: 22px; font-weight: 900; color: #0284c7; font-family: monospace; }
  .counter-badge { font-size: 11px; font-weight: 700; color: #059669; }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 16px;
    font-size: 12px;
  }
  .meta-grid div b { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  th { background: #f1f5f9; padding: 8px; text-align: left; font-weight: 700; border-bottom: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .num { text-align: right; font-family: monospace; }
  .totals-wrap { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 14px; }
  .instructions { width: 55%; font-size: 11px; color: #475569; background: #fffbeb; border: 1px solid #fef3c7; padding: 8px 12px; border-radius: 6px; }
  .totals { width: 38%; font-size: 12px; }
  .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
  .totals .grand { border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 4px; font-size: 15px; font-weight: 800; color: #0f172a; }
  .foot { margin-top: 32px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #64748b; }
  .barcode { font-family: monospace; font-size: 16px; letter-spacing: 4px; font-weight: 700; margin-top: 4px; }
`;

const SLIP_CSS = `
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body {
    font-family: ui-monospace, Consolas, "Courier New", monospace;
    color: #000;
    margin: 0;
    padding: 0;
    width: 72mm;
    font-size: 11px;
    line-height: 1.35;
    background: #fff;
  }
  .c { text-align: center; }
  .b { font-weight: 700; }
  .big { font-size: 15px; }
  .token-banner { font-size: 18px; font-weight: 900; padding: 4px; border: 2px dashed #000; margin: 6px 0; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .sm { font-size: 10px; }
`;

export const LabReceiptDialog = ({
  invoice,
  open,
  onClose,
  initialMode = "invoice",
}: {
  invoice: LabInvoiceData | null;
  open: boolean;
  onClose: () => void;
  initialMode?: ReceiptMode;
}) => {
  const [mode, setMode] = useState<ReceiptMode>(initialMode);
  const [copied, setCopied] = useState(false);

  if (!open || !invoice) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invoice.invoice_no);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Invoice number copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const printReceipt = () => {
    const isSlip = mode === "slip";
    const title = `${isSlip ? "Token-Slip" : "Invoice"}-${invoice.invoice_no}`;
    const css = isSlip ? SLIP_CSS : PAGE_CSS;

    let body = "";
    if (isSlip) {
      body = `
        <div class="c">
          <div class="b big">${BRAND_INFO.name}</div>
          <div class="sm">CLINICAL DIAGNOSTIC LABORATORY</div>
          <div class="sm">House #14, Road #07, Dhanmondi, Dhaka</div>
          <div class="sm">Hotline: 10660 · +880 1700 000000</div>
          <div class="token-banner">TOKEN: ${invoice.token_no}</div>
          <div class="b">${invoice.counter}</div>
        </div>
        <hr />
        <div class="row"><span>Inv No:</span><b>${invoice.invoice_no}</b></div>
        <div class="row"><span>Date:</span><span>${invoice.date_time}</span></div>
        <div class="row"><span>Cashier:</span><span>${invoice.cashier_name}</span></div>
        <div class="row"><span>Patient:</span><b>${invoice.patient_name} (${invoice.patient_gender}, ${invoice.patient_age}y)</b></div>
        <div class="row"><span>Phone:</span><span>${invoice.patient_phone}</span></div>
        <div class="row"><span>Doctor:</span><span>${invoice.referring_doctor}</span></div>
        <hr />
        <div class="b sm" style="margin-bottom:4px;">TEST INVESTIGATIONS:</div>
        ${invoice.items
          .map(
            (item, i) => `
          <div style="margin-bottom:3px;">
            <div>${i + 1}. ${item.name}</div>
            <div class="row sm" style="color:#333;">
              <span>${item.sample_tube}</span>
              <b>৳${item.price}</b>
            </div>
          </div>
        `
          )
          .join("")}
        <hr />
        <div class="row"><span>Subtotal:</span><span>৳${invoice.subtotal}</span></div>
        ${invoice.stat_fee ? `<div class="row"><span>STAT Fee (+20%):</span><span>৳${invoice.stat_fee}</span></div>` : ""}
        ${invoice.discount_amount ? `<div class="row"><span>Discount (${invoice.discount_percent}%):</span><span>-৳${invoice.discount_amount}</span></div>` : ""}
        <div class="row b" style="font-size:13px;"><span>TOTAL:</span><span>৳${invoice.total_amount}</span></div>
        <div class="row"><span>Paid By (${invoice.payment_method.toUpperCase()}):</span><b>৳${invoice.paid_amount}</b></div>
        ${invoice.change_amount ? `<div class="row"><span>Change Returned:</span><span>৳${invoice.change_amount}</span></div>` : ""}
        <hr />
        <div class="c sm">
          <div>Please show this token at phlebotomy room.</div>
          <div class="b" style="margin-top:4px;">* Fasting patients will receive token priority *</div>
          <div style="margin-top:6px;">Thank you for trusting ${BRAND_INFO.name}.</div>
        </div>
      `;
    } else {
      body = `
        <div class="header">
          <div>
            <div class="brand">${BRAND_INFO.name}</div>
            <div class="lab-subtitle">Clinical Diagnostic & Pathological Laboratories</div>
            <div class="muted">Accredited ISO 15189:2022 Medical Laboratory • Dhaka, Bangladesh</div>
            <div class="muted">Tel: +880 2 9876543 • 24/7 Lab Helpline: 10660 • web: healthflowbd.com</div>
          </div>
          <div class="token-box">
            <div class="token-title">Sample Collection Token</div>
            <div class="token-val">${invoice.token_no}</div>
            <div class="counter-badge">${invoice.counter}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <b>Money Receipt No</b>
            <span>${invoice.invoice_no}</span>
          </div>
          <div>
            <b>Date & Time</b>
            <span>${invoice.date_time}</span>
          </div>
          <div>
            <b>Hospital MRN / UHID</b>
            <span>${invoice.mrn_number || "WALK-IN OPD"}</span>
          </div>
          <div>
            <b>Attending Cashier</b>
            <span>${invoice.cashier_name}</span>
          </div>
          <div>
            <b>Patient Name</b>
            <span><strong>${invoice.patient_name}</strong></span>
          </div>
          <div>
            <b>Age / Gender</b>
            <span>${invoice.patient_age} Years / ${invoice.patient_gender}</span>
          </div>
          <div>
            <b>Contact Phone</b>
            <span>${invoice.patient_phone}</span>
          </div>
          <div>
            <b>Referring Consultant</b>
            <span>${invoice.referring_doctor}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th style="width:90px;">Code</th>
              <th>Investigation / Diagnostic Test Name</th>
              <th>Department</th>
              <th>Sample Tube / Specimen</th>
              <th class="num">Tariff (৳)</th>
              <th class="num">Net (৳)</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items
              .map(
                (item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td style="font-family:monospace;font-weight:700;color:#0284c7;">${item.code}</td>
                <td>
                  <strong>${item.name}</strong>
                  ${item.fasting_required ? `<span style="font-size:10px;color:#d97706;font-weight:600;display:block;">[Fasting 10-12h required]</span>` : ""}
                </td>
                <td>${item.department}</td>
                <td style="color:#475569;">${item.sample_tube}</td>
                <td class="num">৳${item.price}</td>
                <td class="num"><strong>৳${item.price}</strong></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="totals-wrap">
          <div class="instructions">
            <strong>Important Patient Instructions:</strong>
            <ul style="margin:4px 0 0 16px;padding:0;">
              <li>Please proceed immediately to <strong>${invoice.counter}</strong> for blood/sample collection.</li>
              <li>Routine reports will be available online & via SMS by 5:00 PM today.</li>
              <li>Critical / STAT investigations processed in &lt; 45 minutes with automated physician alert.</li>
            </ul>
          </div>
          <div class="totals">
            <div><span>Subtotal Amount:</span><span>৳${invoice.subtotal}</span></div>
            ${invoice.stat_fee ? `<div><span>STAT Processing (+20%):</span><span>+৳${invoice.stat_fee}</span></div>` : ""}
            ${invoice.discount_amount ? `<div><span>Discount / Concession (${invoice.discount_percent}%):</span><span>-৳${invoice.discount_amount}</span></div>` : ""}
            <div class="grand"><span>Net Payable Total:</span><span>৳${invoice.total_amount}</span></div>
            <div style="margin-top:6px;border-top:1px dashed #cbd5e1;padding-top:4px;">
              <span>Payment Mode:</span>
              <strong style="text-transform:uppercase;">${invoice.payment_method}</strong>
            </div>
            <div><span>Paid Amount:</span><span>৳${invoice.paid_amount}</span></div>
            ${invoice.change_amount ? `<div><span>Change Returned:</span><span>৳${invoice.change_amount}</span></div>` : ""}
          </div>
        </div>

        <div class="foot">
          <div>
            <div>Computer generated diagnostic receipt. No physical signature required.</div>
            <div class="barcode">||||| | |||| |||| || | |||| |||</div>
            <div style="font-size:10px;">Token Verification: ${invoice.token_no} · ${invoice.invoice_no}</div>
          </div>
          <div style="text-align:right;">
            <div style="border-top:1px solid #94a3b8;width:180px;margin-bottom:4px;"></div>
            <div>Authorized Phlebotomy Seal</div>
          </div>
        </div>
      `;
    }

    const w = window.open("", "_blank", `width=${isSlip ? 420 : 880},height=920`);
    if (!w) {
      toast.error("Pop-up blocked by browser. Please allow pop-ups to print.");
      return;
    }
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head>` +
        `<body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`
    );
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative bg-card rounded-2xl shadow-2xl border border-border/80 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Dialog Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-foreground">Diagnostic Money Receipt</h3>
                <span className="font-mono text-xs font-bold text-primary">{invoice.invoice_no}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy Invoice #"
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Toggle (Full Invoice vs Thermal Slip) */}
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-background text-xs">
              <button
                type="button"
                onClick={() => setMode("invoice")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                  mode === "invoice"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Sales Invoice
              </button>
              <button
                type="button"
                onClick={() => setMode("slip")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                  mode === "slip"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ReceiptText className="h-3.5 w-3.5" />
                Thermal Slip (80mm)
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Preview Area */}
        <div className="p-5 overflow-y-auto flex-1 bg-muted/10">
          {mode === "slip" ? (
            /* Thermal POS Slip Format (80mm) */
            <div className="mx-auto w-full max-w-[320px] rounded-xl border border-dashed border-border bg-card p-4 font-mono text-[11px] leading-relaxed text-foreground shadow-md">
              <div className="text-center space-y-0.5">
                <p className="font-bold text-sm">{BRAND_INFO.name}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">CLINICAL DIAGNOSTIC LABS</p>
                <p className="text-[10px] text-muted-foreground">House 14, Road 7, Dhanmondi, Dhaka</p>
                <p className="text-[10px] text-muted-foreground">Hotline: 10660</p>
                <div className="my-2 py-1.5 px-2 border-2 border-dashed border-primary rounded bg-primary/5 text-primary text-center">
                  <p className="text-[9px] uppercase font-bold">Sample Collection Token</p>
                  <p className="text-xl font-black">{invoice.token_no}</p>
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{invoice.counter}</p>
                </div>
              </div>

              <hr className="my-2 border-dashed border-border" />

              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>Invoice:</span>
                  <span className="font-bold">{invoice.invoice_no}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{invoice.date_time}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{invoice.cashier_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Patient:</span>
                  <span className="font-bold">
                    {invoice.patient_name} ({invoice.patient_gender}, {invoice.patient_age}y)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{invoice.patient_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Doctor:</span>
                  <span>{invoice.referring_doctor}</span>
                </div>
              </div>

              <hr className="my-2 border-dashed border-border" />

              <p className="font-bold text-[10px] mb-1">TESTS:</p>
              <div className="space-y-1">
                {invoice.items.map((item, idx) => (
                  <div key={item.id} className="text-[10px]">
                    <p className="font-semibold">
                      {idx + 1}. {item.name}
                    </p>
                    <div className="flex justify-between text-muted-foreground text-[9px]">
                      <span>{item.sample_tube}</span>
                      <span className="font-bold text-foreground">৳{item.price}</span>
                    </div>
                  </div>
                ))}
              </div>

              <hr className="my-2 border-dashed border-border" />

              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>৳{invoice.subtotal}</span>
                </div>
                {invoice.stat_fee > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>STAT (+20%):</span>
                    <span>+৳{invoice.stat_fee}</span>
                  </div>
                )}
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({invoice.discount_percent}%):</span>
                    <span>-৳{invoice.discount_amount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-border">
                  <span>TOTAL:</span>
                  <span>৳{invoice.total_amount}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span>Paid By ({invoice.payment_method.toUpperCase()}):</span>
                  <span className="font-bold">৳{invoice.paid_amount}</span>
                </div>
                {invoice.change_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span>৳{invoice.change_amount}</span>
                  </div>
                )}
              </div>

              <hr className="my-2 border-dashed border-border" />

              <div className="text-center text-[9px] text-muted-foreground space-y-0.5">
                <p>Please proceed to {invoice.counter}.</p>
                <p className="font-bold text-foreground">Thank you for choosing HealthFlow.</p>
              </div>
            </div>
          ) : (
            /* Full Sales Invoice Format */
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5 text-foreground">
              {/* Top Hospital & Lab Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-primary/20">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-primary" />
                    <h2 className="text-xl font-black tracking-tight text-primary">{BRAND_INFO.name}</h2>
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                    Clinical Diagnostic & Pathological Laboratories
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Accredited ISO 15189:2022 Medical Laboratory • Dhanmondi, Dhaka, Bangladesh
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Hotline: <span className="font-semibold text-foreground">10660</span> • Tel: +880 2 9876543 • web: healthflowbd.com
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Phlebotomy Token</p>
                  <p className="text-2xl font-black font-mono text-primary mt-0.5">{invoice.token_no}</p>
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center justify-end gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {invoice.counter}
                  </p>
                </div>
              </div>

              {/* Patient & Invoice Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/20 text-xs">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Receipt Number</p>
                  <p className="font-mono font-bold text-foreground mt-0.5">{invoice.invoice_no}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Date & Time</p>
                  <p className="font-medium text-foreground mt-0.5">{invoice.date_time}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">MRN / Hospital ID</p>
                  <p className="font-mono text-foreground mt-0.5">{invoice.mrn_number || "WALK-IN OPD"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Attending Cashier</p>
                  <p className="font-medium text-foreground mt-0.5">{invoice.cashier_name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Patient Name</p>
                  <p className="font-bold text-foreground mt-0.5">{invoice.patient_name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Age / Gender</p>
                  <p className="font-medium text-foreground mt-0.5">
                    {invoice.patient_age} Years / {invoice.patient_gender}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Contact Phone</p>
                  <p className="font-medium text-foreground mt-0.5">{invoice.patient_phone}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Referring Doctor</p>
                  <p className="font-medium text-foreground mt-0.5 truncate" title={invoice.referring_doctor}>
                    {invoice.referring_doctor}
                  </p>
                </div>
              </div>

              {/* Investigation Items Table */}
              <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3 w-20">Code</th>
                      <th className="py-2.5 px-3">Investigation Name</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Specimen Tube</th>
                      <th className="py-2.5 px-3 text-right">Tariff</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {invoice.items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-primary">{item.code}</td>
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {item.name}
                          {item.fasting_required && (
                            <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              • 10-12h Overnight Fasting Required
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">{item.department}</td>
                        <td className="py-2.5 px-3 text-muted-foreground font-medium">{item.sample_tube}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">৳{item.price}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">৳{item.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Instructions & Totals */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start pt-2">
                <div className="sm:col-span-7 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs space-y-1.5">
                  <p className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    Instructions for Patient & Phlebotomy:
                  </p>
                  <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
                    <li>
                      Proceed with this slip to <strong>{invoice.counter}</strong> for sample drawing.
                    </li>
                    <li>Routine test reports ready within 4-6 hours today (SMS notification sent when signed).</li>
                    <li>Online report download with Invoice # at <code>healthflowbd.com/reports</code>.</li>
                  </ul>
                </div>

                <div className="sm:col-span-5 p-3.5 rounded-xl border border-border bg-muted/20 text-xs space-y-1.5">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono">৳{invoice.subtotal}</span>
                  </div>
                  {invoice.stat_fee > 0 && (
                    <div className="flex justify-between text-amber-600 font-medium">
                      <span>STAT Processing (+20%)</span>
                      <span className="font-mono">+৳{invoice.stat_fee}</span>
                    </div>
                  )}
                  {invoice.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount ({invoice.discount_percent}%)</span>
                      <span className="font-mono">-৳{invoice.discount_amount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-foreground pt-1.5 border-t border-border">
                    <span>Net Paid Total</span>
                    <span className="font-mono text-primary">৳{invoice.total_amount}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                    <span>Paid via: <strong className="uppercase text-foreground">{invoice.payment_method}</strong></span>
                    <span className="font-mono">৳{invoice.paid_amount}</span>
                  </div>
                  {invoice.change_amount > 0 && (
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Change Due:</span>
                      <span className="font-mono font-bold text-foreground">৳{invoice.change_amount}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Stamp & Barcode */}
              <div className="pt-4 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                <div>
                  <p className="font-mono tracking-widest font-bold text-foreground text-sm">
                    ||||| | |||| |||| || | |||| |||
                  </p>
                  <p className="text-[10px] mt-0.5">
                    Token: {invoice.token_no} • Authenticated Digital Money Receipt
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Payment Settled & Authorized
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-border bg-card">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-foreground transition-all"
            >
              Close
            </button>
            <Link
              href="/lab/queue"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary transition-all"
            >
              <Users className="h-3.5 w-3.5" />
              View in Queue List
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-foreground transition-all"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy Number"}
            </button>
            <button
              type="button"
              onClick={printReceipt}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Print {mode === "slip" ? "Thermal Slip (80mm)" : "Sales Invoice (A4)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
