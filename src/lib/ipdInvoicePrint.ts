/**
 * Official IPD Inpatient Hospital Invoice Printing Utility
 * Opens an isolated print preview with dedicated styling to ensure
 * Chrome, Firefox, Safari, and Edge render full A4 previews without blank pages.
 */

export interface IpdPrintInvoiceData {
  reference: string;
  generatedAt: string;
  isDismissed: boolean;
  isSettled: boolean;
  hospital: {
    name: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  };
  patient: {
    name: string;
    mrn?: string;
    phone?: string;
    age?: string | number | null;
    gender?: string | null;
    bloodGroup?: string | null;
  };
  admission: {
    admissionDate: string;
    calculatedThrough: string;
    stayDays: number;
    location: string;
    doctorName: string;
    doctorSpecialty?: string;
  };
  lines: Array<{
    description: string;
    subtext?: string;
    quantity: number | string;
    unitLabel?: string;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  discount?: number;
  grandTotal: number;
  paymentStatus: string;
  formatCurrency: (amount: number) => string;
}

export const printIpdInvoice = (data: IpdPrintInvoiceData) => {
  if (typeof window === "undefined") return;

  const fmt = data.formatCurrency;
  const hospitalName = data.hospital.name || "HealthFlow Hospital";
  const tagline = data.hospital.tagline || "Inpatient Department (IPD) · Admission & Bed Services";
  const contactText = [data.hospital.phone, data.hospital.email].filter(Boolean).join(" · ");
  const addressText = data.hospital.address || "";

  const rowsHtml = data.lines
    .map(
      (l, idx) => `
      <tr>
        <td style="width: 30px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: #0f172a;">${l.description}</div>
          ${l.subtext ? `<div class="subtext">${l.subtext}</div>` : ""}
        </td>
        <td class="center font-mono">${l.quantity} ${l.unitLabel || "Days"}</td>
        <td class="num">${fmt(l.rate)}</td>
        <td class="num" style="font-weight: 700; color: #0f172a;">${fmt(l.amount)}</td>
      </tr>
    `
    )
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>IPD Inpatient Hospital Invoice - ${data.reference}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #fff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-card {
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 14px;
            border-bottom: 2px solid #059669;
            margin-bottom: 16px;
          }
          .brand-box {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo {
            height: 48px;
            width: auto;
            max-width: 130px;
            object-fit: contain;
          }
          .hospital-name {
            font-size: 18px;
            font-weight: 800;
            color: #065f46;
            line-height: 1.2;
          }
          .tagline {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
          }
          .contact-line {
            font-size: 10px;
            color: #64748b;
            margin-top: 1px;
          }
          .invoice-meta {
            text-align: right;
          }
          .invoice-title {
            font-size: 15px;
            font-weight: 900;
            letter-spacing: -0.02em;
            text-transform: uppercase;
            color: #0f172a;
          }
          .invoice-ref {
            font-family: monospace;
            font-weight: 700;
            font-size: 13px;
            color: #059669;
            margin-top: 2px;
          }
          .invoice-date {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 9999px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            margin-top: 5px;
            letter-spacing: 0.03em;
          }
          .badge-live {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
          }
          .badge-paid {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }
          .badge-discharge {
            background: #e0e7ff;
            color: #3730a3;
            border: 1px solid #c7d2fe;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 16px;
          }
          .info-section-title {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            margin-bottom: 6px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10.5px;
          }
          .info-label {
            color: #64748b;
          }
          .info-val {
            font-weight: 600;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            font-size: 11px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 8px 10px;
            text-align: left;
            border-bottom: 1px solid #cbd5e1;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }
          .subtext {
            font-size: 9.5px;
            color: #64748b;
            margin-top: 2px;
          }
          .num {
            text-align: right;
            font-family: monospace;
          }
          .center {
            text-align: center;
          }
          .totals-container {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 20px;
          }
          .totals-box {
            width: 320px;
            font-size: 11px;
            line-height: 1.8;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
          }
          .grand-total {
            font-size: 13.5px;
            font-weight: 800;
            color: #065f46;
            border-top: 2px solid #059669;
            padding-top: 4px;
            margin-top: 4px;
          }
          .status-row {
            border-top: 1px dashed #cbd5e1;
            padding-top: 4px;
            margin-top: 4px;
            font-weight: 700;
          }
          .footer-grid {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 20px;
            border-top: 1px solid #e2e8f0;
            padding-top: 14px;
            margin-top: 24px;
          }
          .terms {
            font-size: 9.5px;
            color: #64748b;
            line-height: 1.5;
          }
          .terms-title {
            font-weight: 700;
            color: #334155;
            margin-bottom: 3px;
          }
          .sign-box {
            text-align: right;
            font-size: 9.5px;
            color: #64748b;
          }
          .sign-line {
            border-bottom: 1px solid #94a3b8;
            width: 180px;
            margin-left: auto;
            margin-top: 32px;
            margin-bottom: 4px;
          }
          .sign-name {
            font-weight: 700;
            color: #0f172a;
            font-size: 10.5px;
          }
          .font-mono {
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="invoice-card">
          <!-- Header -->
          <div class="header">
            <div class="brand-box">
              ${data.hospital.logoUrl ? `<img src="${data.hospital.logoUrl}" class="logo" alt="${hospitalName}" />` : ""}
              <div>
                <div class="hospital-name">${hospitalName}</div>
                <div class="tagline">${tagline}</div>
                ${addressText ? `<div class="contact-line">${addressText}</div>` : ""}
                ${contactText ? `<div class="contact-line">Helpline: ${contactText}</div>` : ""}
              </div>
            </div>
            <div class="invoice-meta">
              <div class="invoice-title">
                ${data.isDismissed ? "IPD DISCHARGE INVOICE" : "IPD LIVE PATIENT BILL"}
              </div>
              <div class="invoice-ref">#${data.reference}</div>
              <div class="invoice-date">Generated: ${data.generatedAt}</div>
              <div>
                ${
                  data.isSettled
                    ? '<span class="badge badge-paid">SETTLED & PAID</span>'
                    : data.isDismissed
                    ? '<span class="badge badge-discharge">DISCHARGED · FINAL</span>'
                    : '<span class="badge badge-live">● ACTIVE ADMISSION · LIVE CHARGES</span>'
                }
              </div>
            </div>
          </div>

          <!-- Info Grid -->
          <div class="info-grid">
            <div>
              <div class="info-section-title">BILLED PATIENT (INPATIENT):</div>
              <div class="info-row">
                <span class="info-label">Patient Name:</span>
                <span class="info-val">${data.patient.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">MRN:</span>
                <span class="info-val font-mono">#${data.patient.mrn || "—"}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-val">${data.patient.phone || "—"}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Age / Gender:</span>
                <span class="info-val">${data.patient.age ? `${data.patient.age} Yrs` : "—"} · ${data.patient.gender || "—"}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Blood Group:</span>
                <span class="info-val">${data.patient.bloodGroup || "—"}</span>
              </div>
            </div>

            <div>
              <div class="info-section-title">ADMISSION & STAY DETAILS:</div>
              <div class="info-row">
                <span class="info-label">Admission Date:</span>
                <span class="info-val">${data.admission.admissionDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Calculated Through:</span>
                <span class="info-val">${data.admission.calculatedThrough}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Stay Duration:</span>
                <span class="info-val" style="color: #047857; font-weight: 700;">${data.admission.stayDays} Day(s)</span>
              </div>
              <div class="info-row">
                <span class="info-label">Assigned Location:</span>
                <span class="info-val">${data.admission.location}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Attending Doctor:</span>
                <span class="info-val">${data.admission.doctorName} ${data.admission.doctorSpecialty ? `(${data.admission.doctorSpecialty})` : ""}</span>
              </div>
            </div>
          </div>

          <!-- Line Items Table -->
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Particulars / Inpatient Service Description</th>
                <th style="text-align: center; width: 100px;">Duration / Qty</th>
                <th style="text-align: right; width: 110px;">Unit Rate</th>
                <th style="text-align: right; width: 120px;">Total (${fmt(0).split(" ")[0] || "BDT"})</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="totals-container">
            <div class="totals-box">
              <div class="totals-row">
                <span style="color: #64748b;">Stay & Bed Subtotal:</span>
                <span class="num">${fmt(data.subtotal)}</span>
              </div>
              ${
                data.discount && data.discount > 0
                  ? `<div class="totals-row">
                      <span style="color: #64748b;">Discount / Waiver:</span>
                      <span class="num" style="color: #dc2626;">-${fmt(data.discount)}</span>
                    </div>`
                  : `<div class="totals-row">
                      <span style="color: #64748b;">Discount / Waiver:</span>
                      <span class="num">${fmt(0)}</span>
                    </div>`
              }
              <div class="totals-row grand-total">
                <span>Grand Total:</span>
                <span class="num">${fmt(data.grandTotal)}</span>
              </div>
              <div class="totals-row status-row">
                <span style="color: #64748b;">Payment Status:</span>
                <span style="color: ${data.isSettled ? "#059669" : data.isDismissed ? "#d97706" : "#2563eb"};">
                  ${data.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          <!-- Terms & Authorized Signatures -->
          <div class="footer-grid">
            <div class="terms">
              <div class="terms-title">Terms & Instructions:</div>
              <div>1. This is an official computer-generated inpatient bill from ${hospitalName}.</div>
              <div>2. Final billing settlement and discharge summary clearance are completed at the billing cash counter.</div>
              <div>3. Wishing the patient a speedy and complete recovery.</div>
            </div>
            <div class="sign-box">
              <div>Authorized Hospital Accounts</div>
              <div class="sign-line"></div>
              <div class="sign-name">${hospitalName} Accounts & Billing Desk</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 100);
          };
        </script>
      </body>
    </html>
  `;

  // Try opening print popup window first
  const w = window.open("", "_blank", "width=850,height=950");
  if (w) {
    w.document.write(htmlContent);
    w.document.close();
    return;
  }

  // Fallback to hidden iframe if popup blocker is active
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  }, 300);
};

