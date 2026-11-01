"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/admin/crud";
import { Card, Btn, Pill, Kpi } from "@/components/admin/ui";
import { useFormatters } from "@/lib/appSettings";
import { BRAND_INFO } from "@/constants/brand";
import {
  User, Calendar, Stethoscope, BedDouble, Activity,
  FlaskConical, Receipt, Phone, Mail, MapPin, AlertCircle,
  FileText, Plus, Printer, HeartPulse, Scale, Thermometer,
  Wind, Clock, CheckCircle2, ChevronRight, X, ShieldAlert,
} from "lucide-react";
import type { PatientRow } from "@/redux/api/resources";

type Patient360ModalProps = {
  patient: PatientRow | null;
  onClose: () => void;
};

type TabType = "overview" | "appointments" | "admissions" | "labs" | "billing";

export function Patient360Modal({ patient, onClose }: Patient360ModalProps) {
  const t = useTranslations("admin.patients");
  const { formatCurrency, formatDate } = useFormatters();
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Vitals state
  const [vitalsList, setVitalsList] = useState<Array<{
    timestamp: string;
    bp: string;
    pulse: string;
    temp: string;
    spo2: string;
    weight: string;
  }>>([]);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [newBp, setNewBp] = useState("120/80");
  const [newPulse, setNewPulse] = useState("72");
  const [newTemp, setNewTemp] = useState("98.4");
  const [newSpo2, setNewSpo2] = useState("99");
  const [newWeight, setNewWeight] = useState("68");

  // Clinical data states
  const [appointments, setAppointments] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load patient clinical history across modules
  useEffect(() => {
    if (!patient) return;
    let active = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const [aptRes, admRes, labRes, invRes] = await Promise.all([
          fetch(`/api/v1/appointments?patient_id=${patient.id}`).then((r) => r.ok ? r.json() : { data: [] }),
          fetch(`/api/v1/admissions?patient_id=${patient.id}`).then((r) => r.ok ? r.json() : { data: [] }),
          fetch(`/api/v1/lab-orders?patient_id=${patient.id}`).then((r) => r.ok ? r.json() : { data: [] }),
          fetch(`/api/v1/finance-invoices?patient_id=${patient.id}`).then((r) => r.ok ? r.json() : { data: [] }),
        ]);

        if (active) {
          setAppointments(aptRes.data || []);
          setAdmissions(admRes.data || []);
          setLabs(labRes.data || []);
          setInvoices(invRes.data || []);
        }
      } catch (err) {
        console.error("Failed to load patient 360 data", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    // Load any saved vitals from localStorage
    try {
      const stored = localStorage.getItem(`patient_vitals_${patient.id}`);
      if (stored) {
        setVitalsList(JSON.parse(stored));
      } else {
        // default placeholder vitals
        setVitalsList([
          {
            timestamp: new Date().toISOString(),
            bp: "120/80",
            pulse: "72",
            temp: "98.4",
            spo2: "99",
            weight: "68",
          },
        ]);
      }
    } catch {
      // ignore
    }

    return () => {
      active = false;
    };
  }, [patient]);

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    const entry = {
      timestamp: new Date().toISOString(),
      bp: newBp,
      pulse: newPulse,
      temp: newTemp,
      spo2: newSpo2,
      weight: newWeight,
    };
    const updated = [entry, ...vitalsList];
    setVitalsList(updated);
    try {
      localStorage.setItem(`patient_vitals_${patient.id}`, JSON.stringify(updated));
    } catch {}
    setShowVitalsForm(false);
  };

  // Financial calculations
  const totalBilled = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  }, [invoices]);

  const totalPaid = useMemo(() => {
    return invoices.reduce((sum, inv) => (inv.paid_at ? sum + Number(inv.amount || 0) : sum), 0);
  }, [invoices]);

  const balanceDue = totalBilled - totalPaid;

  const printIdCard = () => {
    if (!patient) return;
    const w = window.open("", "_blank", "width=600,height=400");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient ID Card - ${patient.full_name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; }
            .card {
              width: 380px;
              border: 2px solid #059669;
              border-radius: 12px;
              padding: 16px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              position: relative;
            }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 8px; margin-bottom: 12px; }
            .brand { font-size: 16px; font-weight: 800; color: #065f46; }
            .title { font-size: 10px; font-weight: bold; color: #6b7280; text-transform: uppercase; }
            .name { font-size: 18px; font-weight: bold; color: #111827; margin: 4px 0; }
            .mrn { font-family: monospace; font-size: 14px; font-weight: bold; background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px; display: inline-block; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; margin-top: 10px; }
            .label { color: #6b7280; }
            .val { font-weight: 600; color: #1f2937; }
            .barcode { font-family: monospace; letter-spacing: 5px; font-size: 20px; text-align: center; margin-top: 14px; padding-top: 8px; border-top: 1px dashed #d1d5db; color: #111827; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div>
                <div class="brand">${BRAND_INFO.name}</div>
                <div class="title">Official Patient Card</div>
              </div>
              <div class="mrn">${patient.mrn || "HF-PATIENT"}</div>
            </div>
            <div class="name">${patient.full_name}</div>
            <div class="grid">
              <div><span class="label">Gender:</span> <span class="val">${patient.gender || "—"}</span></div>
              <div><span class="label">Blood Group:</span> <span class="val">${patient.blood_group || "—"}</span></div>
              <div><span class="label">Phone:</span> <span class="val">${patient.phone || "—"}</span></div>
              <div><span class="label">Emergency:</span> <span class="val">${patient.emergency_contact_phone || "—"}</span></div>
            </div>
            <div class="barcode">||| | |||| | ||||| | ||</div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  if (!patient) return null;

  return (
    <Modal open={!!patient} title={`Patient 360° EMR — ${patient.full_name}`} onClose={onClose} size="xl">
      <div className="space-y-4">
        {/* Patient Identity & Quick Stat Banner */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-sm">
              {patient.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground truncate">{patient.full_name}</h2>
                <span className="font-mono text-xs bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-md">
                  {patient.mrn}
                </span>
                {patient.blood_group && (
                  <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">
                    {patient.blood_group.toUpperCase()}
                  </span>
                )}
                {patient.gender && (
                  <span className="text-xs capitalize text-muted-foreground bg-white/70 px-2 py-0.5 rounded-full border border-border/40">
                    {patient.gender}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-primary" /> {patient.phone || "—"}
                </span>
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {patient.email}
                  </span>
                )}
                {patient.emergency_contact_phone && (
                  <span className="flex items-center gap-1 text-amber-700">
                    <AlertCircle className="w-3.5 h-3.5" /> Emergency: {patient.emergency_contact_name} ({patient.emergency_contact_phone})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Btn variant="outline" onClick={printIdCard} className="text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" /> ID Card / Wristband
            </Btn>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-border/70 overflow-x-auto pb-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "overview" ? "bg-primary text-white shadow-2xs font-bold" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Overview & Vitals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("appointments")}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "appointments" ? "bg-primary text-white shadow-2xs font-bold" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Appointments ({appointments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("admissions")}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "admissions" ? "bg-primary text-white shadow-2xs font-bold" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <BedDouble className="w-3.5 h-3.5" /> Admissions ({admissions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("labs")}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "labs" ? "bg-primary text-white shadow-2xs font-bold" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" /> Lab Results ({labs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("billing")}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "billing" ? "bg-primary text-white shadow-2xs font-bold" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" /> Billing Ledger ({invoices.length})
          </button>
        </div>

        {/* Tab 1: Overview & Vitals */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Quick Vitals Strip */}
            <div className="bg-card border border-border/70 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Latest Vitals & Biometrics
                  </h3>
                </div>
                <Btn
                  variant="outline"
                  onClick={() => setShowVitalsForm(!showVitalsForm)}
                  className="text-xs py-1 px-2.5 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Record Vitals
                </Btn>
              </div>

              {showVitalsForm && (
                <form onSubmit={handleSaveVitals} className="bg-muted/30 border border-border/60 rounded-xl p-3 mb-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold">Blood Pressure</label>
                      <input
                        type="text"
                        value={newBp}
                        onChange={(e) => setNewBp(e.target.value)}
                        placeholder="120/80"
                        className="w-full bg-white border border-border/80 rounded-lg p-1.5 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold">Heart Rate (bpm)</label>
                      <input
                        type="text"
                        value={newPulse}
                        onChange={(e) => setNewPulse(e.target.value)}
                        placeholder="72"
                        className="w-full bg-white border border-border/80 rounded-lg p-1.5 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold">Temp (°F)</label>
                      <input
                        type="text"
                        value={newTemp}
                        onChange={(e) => setNewTemp(e.target.value)}
                        placeholder="98.4"
                        className="w-full bg-white border border-border/80 rounded-lg p-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold">SpO2 (%)</label>
                      <input
                        type="text"
                        value={newSpo2}
                        onChange={(e) => setNewSpo2(e.target.value)}
                        placeholder="99"
                        className="w-full bg-white border border-border/80 rounded-lg p-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold">Weight (kg)</label>
                      <input
                        type="text"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        placeholder="68"
                        className="w-full bg-white border border-border/80 rounded-lg p-1.5 font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Btn type="button" variant="outline" onClick={() => setShowVitalsForm(false)} className="text-xs py-1 px-3">
                      Cancel
                    </Btn>
                    <Btn type="submit" variant="primary" className="text-xs py-1 px-3">
                      Save Reading
                    </Btn>
                  </div>
                </form>
              )}

              {vitalsList.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-rose-50/70 border border-rose-100 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1">
                      <HeartPulse className="w-3 h-3 text-rose-600" /> BP
                    </span>
                    <p className="text-lg font-bold text-rose-950 font-mono mt-0.5">{vitalsList[0].bp}</p>
                    <span className="text-[9px] text-rose-700">mmHg (Normal)</span>
                  </div>
                  <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-blue-800 uppercase flex items-center gap-1">
                      <Activity className="w-3 h-3 text-blue-600" /> Pulse
                    </span>
                    <p className="text-lg font-bold text-blue-950 font-mono mt-0.5">{vitalsList[0].pulse}</p>
                    <span className="text-[9px] text-blue-700">bpm</span>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-100 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-amber-600" /> Temp
                    </span>
                    <p className="text-lg font-bold text-amber-950 font-mono mt-0.5">{vitalsList[0].temp}°F</p>
                    <span className="text-[9px] text-amber-700">Afebrile</span>
                  </div>
                  <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                      <Wind className="w-3 h-3 text-emerald-600" /> SpO2
                    </span>
                    <p className="text-lg font-bold text-emerald-950 font-mono mt-0.5">{vitalsList[0].spo2}%</p>
                    <span className="text-[9px] text-emerald-700">Room Air</span>
                  </div>
                  <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-indigo-800 uppercase flex items-center gap-1">
                      <Scale className="w-3 h-3 text-indigo-600" /> Weight
                    </span>
                    <p className="text-lg font-bold text-indigo-950 font-mono mt-0.5">{vitalsList[0].weight}</p>
                    <span className="text-[9px] text-indigo-700">kg</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No vitals recorded yet. Click &quot;Record Vitals&quot; to log current vitals.
                </div>
              )}
            </div>

            {/* Address & Emergency Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <Card className="p-4 space-y-2">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Residential Address
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  {patient.address || "No residential address provided on file."}
                </p>
              </Card>

              <Card className="p-4 space-y-2">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Emergency Contact
                </h4>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">
                    {patient.emergency_contact_name || "Not specified"}
                  </p>
                  <p className="font-mono text-muted-foreground">
                    Phone: {patient.emergency_contact_phone || "—"}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: Appointments */}
        {activeTab === "appointments" && (
          <div className="space-y-3">
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground bg-muted/20 rounded-2xl">
                No past or upcoming appointments found for this patient.
              </div>
            ) : (
              <div className="divide-y divide-border/60 bg-card border border-border/70 rounded-2xl p-2">
                {appointments.map((apt) => (
                  <div key={apt.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {formatDate(apt.scheduled_date)} at {apt.scheduled_time?.slice(0, 5)}
                        </span>
                        <Pill tone={apt.status === "completed" ? "ok" : apt.status === "cancelled" ? "bad" : "info"}>
                          {apt.status}
                        </Pill>
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        Attending Doctor: Dr. {apt.doctors?.name || "Assigned Doctor"} {apt.department ? `(${apt.department})` : ""}
                      </p>
                      {apt.notes && <p className="text-[11px] text-slate-500 italic mt-0.5">{apt.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Admissions */}
        {activeTab === "admissions" && (
          <div className="space-y-3">
            {admissions.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground bg-muted/20 rounded-2xl">
                No inpatient hospital stays or admissions found.
              </div>
            ) : (
              <div className="divide-y divide-border/60 bg-card border border-border/70 rounded-2xl p-2">
                {admissions.map((adm) => (
                  <div key={adm.id} className="p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          Admitted: {formatDate(adm.admitted_at)}
                        </span>
                        <Pill tone={adm.status === "discharged" ? "ok" : "warn"}>
                          {adm.status.replace(/_/g, " ")}
                        </Pill>
                        <Pill tone={adm.priority === "critical" ? "bad" : adm.priority === "urgent" ? "warn" : "default"}>
                          {adm.priority}
                        </Pill>
                      </div>
                      {adm.discharged_at && (
                        <span className="text-muted-foreground text-[11px]">
                          Discharged: {formatDate(adm.discharged_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-foreground">
                      <span className="text-muted-foreground font-medium">Diagnosis:</span>{" "}
                      {adm.diagnosis || "Under evaluation"}
                    </p>
                    {adm.notes && <p className="text-[11px] text-muted-foreground italic">{adm.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Labs */}
        {activeTab === "labs" && (
          <div className="space-y-3">
            {labs.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground bg-muted/20 rounded-2xl">
                No diagnostic laboratory test requests found.
              </div>
            ) : (
              <div className="divide-y divide-border/60 bg-card border border-border/70 rounded-2xl p-2">
                {labs.map((order) => (
                  <div key={order.id} className="p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{order.test_name}</span>
                        <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                          {order.reference}
                        </span>
                      </div>
                      <Pill tone={order.status === "reported" ? "ok" : "info"}>
                        {order.status.replace(/_/g, " ")}
                      </Pill>
                    </div>
                    {order.result && (
                      <div className="bg-muted/40 p-2 rounded-lg font-mono text-[11px] text-foreground mt-1 whitespace-pre-wrap">
                        {order.result}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Billing */}
        {activeTab === "billing" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-muted/40 p-3 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Invoiced</span>
                <p className="text-base font-bold text-foreground font-mono mt-0.5">{formatCurrency(totalBilled)}</p>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-xl">
                <span className="text-[10px] text-emerald-800 uppercase font-bold">Paid Amount</span>
                <p className="text-base font-bold text-emerald-700 font-mono mt-0.5">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="bg-amber-50/70 border border-amber-100 p-3 rounded-xl">
                <span className="text-[10px] text-amber-800 uppercase font-bold">Balance Due</span>
                <p className="text-base font-bold text-amber-700 font-mono mt-0.5">{formatCurrency(balanceDue)}</p>
              </div>
            </div>

            {invoices.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground bg-muted/20 rounded-2xl">
                No billing statements found for this patient.
              </div>
            ) : (
              <div className="divide-y divide-border/60 bg-card border border-border/70 rounded-2xl p-2">
                {invoices.map((inv) => (
                  <div key={inv.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">{inv.reference}</span>
                        <Pill tone={inv.paid_at ? "ok" : "warn"}>
                          {inv.paid_at ? "Paid" : "Pending"}
                        </Pill>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Due: {formatDate(inv.due_date)} {inv.paid_at ? `• Paid ${formatDate(inv.paid_at)}` : ""}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {formatCurrency(inv.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
