"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/crud";
import { Btn, Pill } from "@/components/admin/ui";
import { useFormatters } from "@/lib/appSettings";
import { BRAND_INFO } from "@/constants/brand";
import { Printer, FlaskConical, Plus, Trash2, CheckCircle2 } from "lucide-react";

type LabReportModalProps = {
  order: any | null;
  onClose: () => void;
  onSaveResult?: (orderId: string, resultText: string) => Promise<void>;
};

type ParameterRow = {
  parameter: string;
  value: string;
  unit: string;
  refRange: string;
  flag: "normal" | "high" | "low";
};

export function LabReportModal({ order, onClose, onSaveResult }: LabReportModalProps) {
  const { formatDate, formatDateTime } = useFormatters();

  // Try parsing existing result if it has structured rows
  const [remarks, setRemarks] = useState(
    order?.result || "Sample received in good condition. Test performed on automated analyzer and verified by clinical pathologist."
  );

  const [parameters, setParameters] = useState<ParameterRow[]>([
    { parameter: "Primary Investigation", value: "Normal", unit: "—", refRange: "Normal", flag: "normal" },
  ]);

  const [saving, setSaving] = useState(false);

  if (!order) return null;

  const handleAddParam = () => {
    setParameters([
      ...parameters,
      { parameter: "", value: "", unit: "", refRange: "", flag: "normal" },
    ]);
  };

  const handleRemoveParam = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const handleUpdateParam = (index: number, field: keyof ParameterRow, val: string) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: val };
    setParameters(updated);
  };

  const buildResultText = () => {
    const rowsText = parameters
      .filter((p) => p.parameter.trim())
      .map((p) => `${p.parameter}: ${p.value} ${p.unit} (Ref: ${p.refRange}) [${p.flag.toUpperCase()}]`)
      .join("\n");

    return `${rowsText}\n\nRemarks:\n${remarks}`.trim();
  };

  const handleSave = async () => {
    if (!onSaveResult) return;
    setSaving(true);
    try {
      await onSaveResult(order.id, buildResultText());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=850,height=950");
    if (!w) return;

    const patientName = order.patients?.full_name || "Patient";
    const doctorName = order.doctors?.name || "Self / Walk-in";
    const ref = order.reference;
    const testName = order.test_name;
    const reportedTime = order.reported_at ? formatDateTime(order.reported_at) : formatDateTime(new Date().toISOString());

    const tableRows = parameters.map((p) => {
      const flagStyle = p.flag === "high" ? "color: #dc2626; font-weight: bold;" : p.flag === "low" ? "color: #2563eb; font-weight: bold;" : "color: #16a34a;";
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${p.parameter || testName}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 14px; ${flagStyle}">${p.value}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${p.unit}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #4b5563;">${p.refRange}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 11px; text-transform: uppercase; ${flagStyle}">${p.flag}</td>
        </tr>
      `;
    }).join("");

    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Diagnostic Laboratory Report - ${ref}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; color: #1f2937; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px; }
            .brand { font-size: 22px; font-weight: 800; color: #065f46; }
            .sub { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
            .badge { font-family: monospace; font-size: 14px; font-weight: bold; background: #ecfdf5; color: #047857; padding: 4px 8px; border-radius: 4px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px; }
            .label { color: #6b7280; }
            .val { font-weight: 600; color: #111827; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th { text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; background: #f3f4f6; color: #4b5563; border-bottom: 2px solid #d1d5db; }
            .remarks-box { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-top: 20px; font-size: 12px; }
            .remarks-title { font-weight: bold; color: #065f46; text-transform: uppercase; font-size: 11px; margin-bottom: 4px; }
            .footer { margin-top: 80px; display: flex; justify-content: space-between; font-size: 11px; }
            .sign-box { text-align: center; width: 180px; border-top: 1px solid #9ca3af; padding-top: 5px; color: #4b5563; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">${BRAND_INFO.name}</div>
              <div class="sub">Department of Diagnostic Pathology & Clinical Biochemistry</div>
            </div>
            <div class="badge">SAMPLE ID: ${ref}</div>
          </div>

          <div class="meta-grid">
            <div><span class="label">Patient Name:</span> <span class="val">${patientName}</span></div>
            <div><span class="label">Referred By:</span> <span class="val">Dr. ${doctorName}</span></div>
            <div><span class="label">Investigation:</span> <span class="val">${testName}</span></div>
            <div><span class="label">Reported At:</span> <span class="val">${reportedTime}</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Test Parameter</th>
                <th>Result Value</th>
                <th>Unit</th>
                <th>Biological Reference Interval</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="remarks-box">
            <div class="remarks-title">Pathologist Interpretation & Remarks</div>
            <div>${remarks}</div>
          </div>

          <div class="footer">
            <div class="sign-box">Medical Lab Technologist</div>
            <div class="sign-box">Consultant Pathologist (MD, FRCPath)</div>
          </div>

          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <Modal open={!!order} title={`Diagnostic Test Report — ${order.reference}`} onClose={onClose} size="xl">
      <div className="space-y-4 text-xs">
        {/* Patient and Test Info Banner */}
        <div className="bg-muted/40 p-3 rounded-xl flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">{order.test_name}</span>
              <span className="font-mono text-xs bg-primary/20 text-primary font-bold px-1.5 py-0.2 rounded">
                {order.reference}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5">
              Patient: <span className="font-semibold text-foreground">{order.patients?.full_name || "—"}</span> • Ref: Dr. {order.doctors?.name || "Walk-in"}
            </p>
          </div>
          <Btn onClick={handlePrint} variant="primary" className="text-xs py-1.5 px-3 flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print Official Lab Report
          </Btn>
        </div>

        {/* Structured Parameter Entry Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
              Observed Parameters & Biomarkers
            </h4>
            <Btn onClick={handleAddParam} variant="outline" className="text-[11px] py-1 px-2.5 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Parameter
            </Btn>
          </div>

          <div className="border border-border/70 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 font-semibold text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Parameter</th>
                  <th className="p-2 text-left w-24">Observed</th>
                  <th className="p-2 text-left w-20">Unit</th>
                  <th className="p-2 text-left w-32">Reference Range</th>
                  <th className="p-2 text-left w-24">Flag</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {parameters.map((p, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="p-2">
                      <input
                        type="text"
                        value={p.parameter}
                        onChange={(e) => handleUpdateParam(idx, "parameter", e.target.value)}
                        placeholder="e.g. Hemoglobin"
                        className="w-full bg-white border border-border/70 rounded px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={p.value}
                        onChange={(e) => handleUpdateParam(idx, "value", e.target.value)}
                        placeholder="13.5"
                        className="w-full bg-white border border-border/70 rounded px-2 py-1 font-mono text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={p.unit}
                        onChange={(e) => handleUpdateParam(idx, "unit", e.target.value)}
                        placeholder="g/dL"
                        className="w-full bg-white border border-border/70 rounded px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={p.refRange}
                        onChange={(e) => handleUpdateParam(idx, "refRange", e.target.value)}
                        placeholder="12.0 - 16.0"
                        className="w-full bg-white border border-border/70 rounded px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={p.flag}
                        onChange={(e) => handleUpdateParam(idx, "flag", e.target.value as any)}
                        className={`w-full border rounded px-1.5 py-1 text-xs font-semibold ${
                          p.flag === "high" ? "text-rose-700 bg-rose-50 border-rose-200" : p.flag === "low" ? "text-blue-700 bg-blue-50 border-blue-200" : "text-emerald-700 bg-emerald-50 border-emerald-200"
                        }`}
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                      </select>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveParam(idx)}
                        className="text-muted-foreground hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
            Pathologist Interpretation & Clinical Remarks
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full bg-card border border-border/70 rounded-lg p-2 text-foreground"
          />
        </div>

        <div className="pt-2 border-t border-border/60 flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose} className="text-xs">
            Close
          </Btn>
          {onSaveResult && (
            <Btn onClick={handleSave} disabled={saving} variant="primary" className="text-xs">
              {saving ? "Publishing..." : "Save & Publish Result"}
            </Btn>
          )}
          <Btn onClick={handlePrint} variant="outline" className="text-xs flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print Report
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
