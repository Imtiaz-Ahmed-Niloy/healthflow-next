"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/crud";
import { Btn } from "@/components/admin/ui";
import { useFormatters } from "@/lib/appSettings";
import { BRAND_INFO } from "@/constants/brand";
import { Printer, FileText, CheckCircle2 } from "lucide-react";
import type { AdmissionRow } from "@/redux/api/resources";

type DischargeSummaryModalProps = {
  admission: AdmissionRow | null;
  onClose: () => void;
};

export function DischargeSummaryModal({ admission, onClose }: DischargeSummaryModalProps) {
  const { formatDate, formatDateTime } = useFormatters();

  const [condition, setCondition] = useState("Improved & Clinically Stable");
  const [medications, setMedications] = useState(
    "1. Tab. Paracetamol 500mg - 1 tab 8 hourly if fever/pain\n2. Tab. Pantoprazole 20mg - 1 tab daily before breakfast for 14 days\n3. Cap. Cefixime 200mg - 1 cap 12 hourly for 5 days"
  );
  const [advice, setAdvice] = useState(
    "Rest for 7 days. Maintain adequate fluid intake. Avoid lifting heavy weights. Return immediately if high fever, severe pain, or bleeding occurs."
  );
  const [followUp, setFollowUp] = useState("After 7 days at OPD");

  if (!admission) return null;

  const a = admission;
  const p = a.patients;
  const doc = a.doctors;

  const admittedDate = a.admitted_at ? new Date(a.admitted_at) : new Date();
  const dischargedDate = a.discharged_at ? new Date(a.discharged_at) : new Date();
  const stayDays = Math.max(1, Math.ceil((dischargedDate.getTime() - admittedDate.getTime()) / (1000 * 60 * 60 * 24)));

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=850,height=950");
    if (!w) return;

    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Discharge Summary - ${p?.full_name || "Patient"}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; color: #1f2937; }
            .header { text-align: center; border-bottom: 2px solid #047857; padding-bottom: 15px; margin-bottom: 20px; }
            .brand { font-size: 24px; font-weight: 800; color: #065f46; letter-spacing: 0.5px; }
            .sub { font-size: 12px; color: #6b7280; margin-top: 3px; }
            .title { font-size: 16px; font-weight: bold; text-transform: uppercase; background: #ecfdf5; color: #047857; display: inline-block; padding: 4px 16px; border-radius: 4px; margin-top: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; margin-bottom: 20px; background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .label { color: #6b7280; font-size: 12px; }
            .val { font-weight: 600; color: #111827; }
            .section { margin-bottom: 18px; }
            .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #065f46; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
            .content { font-size: 13px; line-height: 1.6; white-space: pre-wrap; color: #374151; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; font-size: 12px; }
            .sign-box { text-align: center; width: 200px; border-top: 1px solid #9ca3af; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">${BRAND_INFO.name}</div>
            <div class="sub">Advanced Inpatient & Surgical Care Facility • Clinical Discharge Certificate</div>
            <div class="title">Official Discharge Summary</div>
          </div>

          <div class="grid">
            <div><span class="label">Patient Name:</span> <span class="val">${p?.full_name || "—"}</span></div>
            <div><span class="label">MRN:</span> <span class="val font-mono">${p?.mrn || "—"}</span></div>
            <div><span class="label">Gender / Blood:</span> <span class="val">${p?.gender || "—"} / ${(p as any)?.blood_group ? (p as any).blood_group.toUpperCase() : "—"}</span></div>
            <div><span class="label">Contact Phone:</span> <span class="val">${p?.phone || "—"}</span></div>
            <div><span class="label">Date of Admission:</span> <span class="val">${formatDateTime(a.admitted_at)}</span></div>
            <div><span class="label">Date of Discharge:</span> <span class="val">${a.discharged_at ? formatDateTime(a.discharged_at) : formatDateTime(new Date().toISOString())}</span></div>
            <div><span class="label">Length of Stay:</span> <span class="val">${stayDays} Day(s)</span></div>
            <div><span class="label">Attending Consultant:</span> <span class="val">Dr. ${doc?.name || "Assigned Physician"} ${doc?.specialty ? `(${doc.specialty})` : ""}</span></div>
          </div>

          <div class="section">
            <div class="section-title">Final Diagnosis</div>
            <div class="content font-bold">${a.diagnosis || "Under evaluation and supportive management."}</div>
          </div>

          <div class="section">
            <div class="section-title">Condition at Discharge</div>
            <div class="content">${condition}</div>
          </div>

          <div class="section">
            <div class="section-title">Hospital Course & Clinical Summary</div>
            <div class="content">${a.notes || "Patient received standard inpatient medical care, responded favorably to the treatment regimen, vitals stabilized, and is discharged in stable condition."}</div>
          </div>

          <div class="section">
            <div class="section-title">Discharge Medications & Regimen</div>
            <div class="content font-mono">${medications}</div>
          </div>

          <div class="section">
            <div class="section-title">Dietary & Activity Advice</div>
            <div class="content">${advice}</div>
          </div>

          <div class="section">
            <div class="section-title">Follow-up Instructions</div>
            <div class="content font-bold">${followUp}</div>
          </div>

          <div class="footer">
            <div class="sign-box">Resident Medical Officer</div>
            <div class="sign-box">Attending Consultant Signature</div>
          </div>

          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <Modal open={!!admission} title={`Discharge Summary — ${p?.full_name || "Patient"}`} onClose={onClose} size="lg">
      <div className="space-y-4 text-xs">
        {/* Patient Summary Header */}
        <div className="bg-muted/40 p-3 rounded-xl flex items-center justify-between">
          <div>
            <p className="font-bold text-sm text-foreground">{p?.full_name || "Patient"}</p>
            <p className="text-muted-foreground">
              MRN: <span className="font-mono font-semibold">{p?.mrn}</span> • Stay: {stayDays} day(s) • Dx: {a.diagnosis || "—"}
            </p>
          </div>
          <Btn onClick={handlePrint} variant="outline" className="text-xs py-1.5 px-3 flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print Summary Report
          </Btn>
        </div>

        {/* Discharge Form Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
              Condition at Discharge
            </label>
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full bg-card border border-border/70 rounded-lg p-2 text-foreground font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
              Discharge Medications & Dosage Plan
            </label>
            <textarea
              rows={4}
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              className="w-full bg-card border border-border/70 rounded-lg p-2 text-foreground font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
              Diet, Physical Activity & Warning Signs
            </label>
            <textarea
              rows={3}
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              className="w-full bg-card border border-border/70 rounded-lg p-2 text-foreground"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
              Follow-up Schedule
            </label>
            <input
              type="text"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className="w-full bg-card border border-border/70 rounded-lg p-2 text-foreground font-medium"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose} className="text-xs">
            Close
          </Btn>
          <Btn onClick={handlePrint} variant="outline" className="text-xs flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print Official Certificate
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
