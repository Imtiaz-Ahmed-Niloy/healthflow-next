/**
 * Official Daily Inpatient Ward Census & Bed Occupancy Report
 * Generates an isolated, A4 Landscape print document for nursing shift handovers,
 * bed board reviews, and administrative hospital census audits.
 */

export interface WardCensusData {
  generatedAt: string;
  shift: string;
  hospital: {
    name: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  };
  summary: {
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    cleaningBeds: number;
    occupancyPct: number;
    totalCabins: number;
    occupiedCabins: number;
    availableCabins: number;
  };
  wards: Array<{
    name: string;
    category: string;
    dailyRate: number;
    beds: Array<{
      number: string;
      type: string;
      status: string;
      patientName?: string;
      mrn?: string;
      gender?: string | null;
      age?: number | null;
      admittedAt?: string;
      stayDays?: number;
      diagnosis?: string | null;
      priority?: string;
      doctorName?: string;
    }>;
  }>;
  cabins: Array<{
    number: string;
    floor: string;
    category: string;
    dailyRate: number;
    status: string;
    patientName?: string;
    mrn?: string;
    gender?: string | null;
    admittedAt?: string;
    stayDays?: number;
    diagnosis?: string | null;
    doctorName?: string;
  }>;
  formatCurrency: (amount: number) => string;
}

export const printWardCensus = (data: WardCensusData) => {
  if (typeof window === "undefined") return;

  const fmt = data.formatCurrency;
  const hospitalName = data.hospital.name || "HealthFlow Hospital";
  const tagline = data.hospital.tagline || "Inpatient Ward Services & Bed Board Operations";
  const contactText = [data.hospital.phone, data.hospital.email].filter(Boolean).join(" · ");
  const addressText = data.hospital.address || "";

  // Build Wards Tables
  const wardsHtml = data.wards
    .map((w) => {
      const bedsHtml = w.beds
        .map((b) => {
          const isOcc = b.status === "occupied";
          const isClean = b.status === "cleaning";
          const statusBadge = isOcc
            ? `<span class="badge badge-occupied">OCCUPIED</span>`
            : isClean
            ? `<span class="badge badge-cleaning">CLEANING</span>`
            : `<span class="badge badge-available">AVAILABLE</span>`;

          const priorityBadge =
            b.priority === "critical"
              ? `<span class="pill pill-critical">CRITICAL</span>`
              : b.priority === "urgent"
              ? `<span class="pill pill-urgent">URGENT</span>`
              : b.priority === "routine"
              ? `<span class="pill pill-routine">ROUTINE</span>`
              : "—";

          const genderChar =
            b.gender === "male" ? "♂ M" : b.gender === "female" ? "♀ F" : b.gender || "—";
          const ageStr = b.age !== null && b.age !== undefined ? `${b.age}y` : "";
          const sexAge = [genderChar, ageStr].filter(Boolean).join(" · ");

          return `
          <tr class="${isOcc ? "row-occupied" : ""}">
            <td class="font-mono font-bold center">${b.number}</td>
            <td class="capitalize">${b.type}</td>
            <td class="center">${statusBadge}</td>
            <td>
              ${
                isOcc
                  ? `<div class="font-bold text-dark">${b.patientName || "Admitted Patient"}</div>
                     <div class="subtext font-mono">MRN: ${b.mrn || "—"}</div>`
                  : `<span class="italic text-muted">${b.status === "cleaning" ? "Sanitization in progress" : "Ready for admission"}</span>`
              }
            </td>
            <td class="center">${isOcc ? sexAge : "—"}</td>
            <td>${isOcc && b.admittedAt ? b.admittedAt : "—"}</td>
            <td class="center font-mono font-bold">${isOcc && b.stayDays ? `${b.stayDays}d` : "—"}</td>
            <td class="center">${isOcc ? priorityBadge : "—"}</td>
            <td>
              ${
                isOcc
                  ? `<div>${b.doctorName || "Attending Consultant"}</div>
                     ${b.diagnosis ? `<div class="subtext">Dx: ${b.diagnosis}</div>` : ""}`
                  : "—"
              }
            </td>
          </tr>
        `;
        })
        .join("");

      return `
        <div class="ward-block">
          <div class="ward-header">
            <div class="ward-title">
              <span class="ward-name">${w.name}</span>
              <span class="ward-cat">${w.category.replace("_", " ").toUpperCase()}</span>
            </div>
            <div class="ward-meta">
              Rate: ${fmt(w.dailyRate)}/day · Total Beds: ${w.beds.length} (Occupied: ${w.beds.filter((b) => b.status === "occupied").length})
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 55px; text-align: center;">Bed #</th>
                <th style="width: 70px;">Type</th>
                <th style="width: 85px; text-align: center;">Status</th>
                <th>Patient Details & MRN</th>
                <th style="width: 70px; text-align: center;">Sex/Age</th>
                <th style="width: 105px;">Admitted At</th>
                <th style="width: 60px; text-align: center;">Stay</th>
                <th style="width: 80px; text-align: center;">Acuity</th>
                <th>Attending Doctor & Diagnosis</th>
              </tr>
            </thead>
            <tbody>
              ${bedsHtml.length > 0 ? bedsHtml : `<tr><td colspan="9" class="center text-muted">No beds registered in this ward</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
    })
    .join("");

  // Build Cabins Table
  const cabinsHtml = data.cabins
    .map((c) => {
      const isOcc = c.status === "occupied";
      const statusClass =
        c.status === "occupied"
          ? "badge-occupied"
          : c.status === "cleaning"
          ? "badge-cleaning"
          : c.status === "reserved"
          ? "badge-reserved"
          : "badge-available";

      return `
      <tr class="${isOcc ? "row-occupied" : ""}">
        <td class="font-mono font-bold center">${c.number}</td>
        <td>${c.floor || "1st Floor"}</td>
        <td class="capitalize">${c.category}</td>
        <td class="num">${fmt(c.dailyRate)}</td>
        <td class="center"><span class="badge ${statusClass}">${c.status.toUpperCase()}</span></td>
        <td>
          ${
            isOcc
              ? `<div class="font-bold text-dark">${c.patientName || "Admitted Patient"}</div>
                 <div class="subtext font-mono">MRN: ${c.mrn || "—"}</div>`
              : `<span class="italic text-muted">${c.status === "available" ? "Ready for occupancy" : c.status}</span>`
          }
        </td>
        <td>${isOcc && c.admittedAt ? c.admittedAt : "—"}</td>
        <td class="center font-mono font-bold">${isOcc && c.stayDays ? `${c.stayDays}d` : "—"}</td>
        <td>${isOcc ? c.doctorName || "Attending Consultant" : "—"}</td>
      </tr>
    `;
    })
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Daily Ward Census & Bed Occupancy Report - ${data.generatedAt}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
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
            font-size: 10px;
            line-height: 1.4;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .report-wrapper {
            width: 100%;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #059669;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .brand-box {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .logo {
            height: 38px;
            width: auto;
            max-width: 100px;
            object-fit: contain;
          }
          .hospital-name {
            font-size: 16px;
            font-weight: 800;
            color: #065f46;
            line-height: 1.1;
          }
          .tagline {
            font-size: 9.5px;
            color: #64748b;
          }
          .contact-line {
            font-size: 9px;
            color: #64748b;
          }
          .report-meta {
            text-align: right;
          }
          .report-title {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.01em;
          }
          .report-date {
            font-size: 9.5px;
            color: #475569;
            margin-top: 1px;
          }
          .shift-badge {
            display: inline-block;
            background: #e0f2fe;
            color: #0369a1;
            border: 1px solid #bae6fd;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 8.5px;
            font-weight: 700;
            margin-top: 2px;
          }
          .kpi-strip {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 6px 10px;
            margin-bottom: 12px;
          }
          .kpi-item {
            text-align: center;
          }
          .kpi-val {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
          }
          .kpi-lbl {
            font-size: 8px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .ward-block {
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          .ward-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f1f5f9;
            padding: 4px 8px;
            border: 1px solid #cbd5e1;
            border-bottom: none;
            border-radius: 4px 4px 0 0;
          }
          .ward-name {
            font-size: 11px;
            font-weight: 800;
            color: #0f172a;
          }
          .ward-cat {
            font-size: 8px;
            font-weight: 700;
            background: #059669;
            color: #fff;
            padding: 1px 5px;
            border-radius: 3px;
            margin-left: 6px;
          }
          .ward-meta {
            font-size: 9px;
            color: #475569;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
            border: 1px solid #cbd5e1;
            margin-bottom: 6px;
          }
          th {
            background: #f8fafc;
            color: #334155;
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 4px 6px;
            text-align: left;
            border: 1px solid #cbd5e1;
          }
          td {
            padding: 4px 6px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
          }
          .row-occupied {
            background: #fff;
          }
          .center {
            text-align: center;
          }
          .num {
            text-align: right;
            font-family: monospace;
          }
          .font-mono {
            font-family: monospace;
          }
          .font-bold {
            font-weight: 700;
          }
          .text-muted {
            color: #64748b;
          }
          .text-dark {
            color: #0f172a;
          }
          .subtext {
            font-size: 8px;
            color: #64748b;
          }
          .italic {
            font-style: italic;
          }
          .badge {
            display: inline-block;
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.03em;
          }
          .badge-occupied {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fecaca;
          }
          .badge-available {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
          }
          .badge-cleaning {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
          }
          .badge-reserved {
            background: #dbeafe;
            color: #1e40af;
            border: 1px solid #bfdbfe;
          }
          .pill {
            display: inline-block;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 7.5px;
            font-weight: 800;
          }
          .pill-critical {
            background: #ef4444;
            color: #fff;
          }
          .pill-urgent {
            background: #f59e0b;
            color: #fff;
          }
          .pill-routine {
            background: #e2e8f0;
            color: #475569;
          }
          .handover-footer {
            margin-top: 20px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            page-break-inside: avoid;
          }
          .sign-box {
            text-align: center;
          }
          .sign-line {
            border-bottom: 1px solid #94a3b8;
            height: 28px;
            margin-bottom: 4px;
          }
          .sign-title {
            font-size: 8.5px;
            font-weight: 700;
            color: #334155;
          }
          .sign-sub {
            font-size: 7.5px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="report-wrapper">
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
            <div class="report-meta">
              <div class="report-title">DAILY INPATIENT WARD CENSUS & BED BOARD ROSTER</div>
              <div class="report-date">Generated: ${data.generatedAt}</div>
              <div><span class="shift-badge">${data.shift}</span></div>
            </div>
          </div>

          <!-- KPI Summary Strip -->
          <div class="kpi-strip">
            <div class="kpi-item">
              <div class="kpi-val">${data.summary.totalBeds}</div>
              <div class="kpi-lbl">Total Ward Beds</div>
            </div>
            <div class="kpi-item">
              <div class="kpi-val" style="color: #dc2626;">${data.summary.occupiedBeds}</div>
              <div class="kpi-lbl">Occupied Beds (${data.summary.occupancyPct}%)</div>
            </div>
            <div class="kpi-item">
              <div class="kpi-val" style="color: #16a34a;">${data.summary.availableBeds}</div>
              <div class="kpi-lbl">Available Beds</div>
            </div>
            <div class="kpi-item">
              <div class="kpi-val" style="color: #d97706;">${data.summary.cleaningBeds}</div>
              <div class="kpi-lbl">Sanitizing Beds</div>
            </div>
            <div class="kpi-item">
              <div class="kpi-val">${data.summary.totalCabins}</div>
              <div class="kpi-lbl">Total Cabins</div>
            </div>
            <div class="kpi-item">
              <div class="kpi-val" style="color: #0284c7;">${data.summary.occupiedCabins} Occ / ${data.summary.availableCabins} Avail</div>
              <div class="kpi-lbl">Cabin Status</div>
            </div>
          </div>

          <!-- Wards Tables -->
          ${wardsHtml}

          <!-- Private Cabins Section -->
          ${
            data.cabins.length > 0
              ? `
            <div class="ward-block" style="margin-top: 14px;">
              <div class="ward-header">
                <div class="ward-title">
                  <span class="ward-name">Private Inpatient Cabins & Suites</span>
                  <span class="ward-cat" style="background: #0284c7;">CABINS</span>
                </div>
                <div class="ward-meta">
                  Total Cabins: ${data.cabins.length} (Occupied: ${data.summary.occupiedCabins} · Available: ${data.summary.availableCabins})
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 60px; text-align: center;">Cabin #</th>
                    <th style="width: 75px;">Floor</th>
                    <th style="width: 80px;">Category</th>
                    <th style="width: 80px; text-align: right;">Daily Rate</th>
                    <th style="width: 85px; text-align: center;">Status</th>
                    <th>Occupant Patient & MRN</th>
                    <th style="width: 105px;">Admitted At</th>
                    <th style="width: 60px; text-align: center;">Stay</th>
                    <th>Attending Doctor</th>
                  </tr>
                </thead>
                <tbody>
                  ${cabinsHtml}
                </tbody>
              </table>
            </div>
          `
              : ""
          }

          <!-- Clinical Shift Handover Signatures -->
          <div class="handover-footer">
            <div class="sign-box">
              <div class="sign-line"></div>
              <div class="sign-title">Relieving Duty Staff Nurse</div>
              <div class="sign-sub">Signature & Employee ID</div>
            </div>
            <div class="sign-box">
              <div class="sign-line"></div>
              <div class="sign-title">Incoming Duty Staff Nurse</div>
              <div class="sign-sub">Signature & Handover Acceptance</div>
            </div>
            <div class="sign-box">
              <div class="sign-line"></div>
              <div class="sign-title">Nursing Supervisor / Matron In-Charge</div>
              <div class="sign-sub">Verified & Approved Census</div>
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
  const w = window.open("", "_blank", "width=1050,height=800");
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

