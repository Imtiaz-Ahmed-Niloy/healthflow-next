"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Flame,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  ShieldCheck,
  Building2,
  FileText,
  Search,
  Filter,
  ArrowRight,
  X,
  Plus,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { toast } from "sonner";

interface CriticalIncident {
  id: string;
  reference: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  location: string; // e.g. "ICU Bed 04", "Emergency Ward", "Cabin 502"
  test_name: string;
  analyte: string;
  critical_value: string;
  reference_range: string;
  doctor_name: string;
  doctor_phone: string;
  detected_at: string;
  status: "pending_call" | "notified" | "escalated";
  call_timestamp?: string;
  receiver_name?: string;
  receiver_role?: string;
  read_back_confirmed?: boolean;
  notes?: string;
  technologist: string;
}

const INITIAL_CRITICALS: CriticalIncident[] = [
  {
    id: "crit-1",
    reference: "L-1050",
    patient_name: "Rafiqul Islam",
    patient_age: 63,
    patient_gender: "Male",
    location: "ICU - Bed 04",
    test_name: "Renal Function Panel (KFT)",
    analyte: "Serum Potassium (K+)",
    critical_value: "6.2 mEq/L",
    reference_range: "3.5 – 5.1 mEq/L (Critical High > 6.0)",
    doctor_name: "Dr. Shamsul Alam",
    doctor_phone: "+880 1711 987654",
    detected_at: "10 mins ago",
    status: "pending_call",
    technologist: "Md. Kabir Hossain",
  },
  {
    id: "crit-2",
    reference: "L-1032",
    patient_name: "Begum Rowshan Ara",
    patient_age: 71,
    patient_gender: "Female",
    location: "CCU - Bed 02",
    test_name: "Cardiac Biomarkers",
    analyte: "High-Sensitivity Troponin I",
    critical_value: "4.82 ng/mL",
    reference_range: "< 0.04 ng/mL (Critical Myocardial Infarction)",
    doctor_name: "Prof. Dr. Nazmul Huda",
    doctor_phone: "+880 1819 223344",
    detected_at: "45 mins ago",
    status: "notified",
    call_timestamp: "38 mins ago",
    receiver_name: "Dr. Tanvir (CCU Medical Officer)",
    receiver_role: "Attending Physician",
    read_back_confirmed: true,
    notes: "Informed immediately. Patient initiated on emergency cath-lab prep protocol.",
    technologist: "Sumaya Akter",
  },
  {
    id: "crit-3",
    reference: "L-1025",
    patient_name: "Master Abrar Fahim",
    patient_age: 7,
    patient_gender: "Male",
    location: "Pediatric Ward - Bed 12",
    test_name: "Complete Blood Count",
    analyte: "Platelet Count",
    critical_value: "14,000 /µL",
    reference_range: "150,000 – 450,000 /µL (Severe Thrombocytopenia)",
    doctor_name: "Dr. Fahmida Shireen",
    doctor_phone: "+880 1715 667788",
    detected_at: "2 hours ago",
    status: "notified",
    call_timestamp: "1h 50m ago",
    receiver_name: "Sister Mary (Charge Nurse)",
    receiver_role: "Duty Ward Sister",
    read_back_confirmed: true,
    notes: "Platelet concentrate transfusion ordered immediately.",
    technologist: "Md. Tanvir",
  },
];

export default function CriticalAlertsView() {
  const [incidents, setIncidents] = useState<CriticalIncident[]>(INITIAL_CRITICALS);
  const [activeCallModal, setActiveCallModal] = useState<CriticalIncident | null>(null);

  // Modal fields
  const [receiverName, setReceiverName] = useState("");
  const [receiverRole, setReceiverRole] = useState("Attending Medical Officer");
  const [readBackConfirmed, setReadBackConfirmed] = useState(true);
  const [callNotes, setCallNotes] = useState("");

  const pendingCount = incidents.filter((i) => i.status === "pending_call").length;
  const notifiedCount = incidents.filter((i) => i.status === "notified").length;

  const handleOpenCallLog = (incident: CriticalIncident) => {
    setActiveCallModal(incident);
    setReceiverName(incident.doctor_name);
    setReceiverRole("Attending Consultant");
    setReadBackConfirmed(true);
    setCallNotes("");
  };

  const handleSaveCallLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCallModal) return;

    if (!readBackConfirmed) {
      toast.warning("CLSI guidelines require verbal read-back confirmation.");
    }

    setIncidents((prev) =>
      prev.map((i) => {
        if (i.id !== activeCallModal.id) return i;
        return {
          ...i,
          status: "notified",
          call_timestamp: "Just now",
          receiver_name: receiverName,
          receiver_role: receiverRole,
          read_back_confirmed: readBackConfirmed,
          notes: callNotes,
        };
      })
    );

    toast.success(`Critical call documented and logged for ${activeCallModal.patient_name}`);
    setActiveCallModal(null);
  };

  return (
    <LabLayout
      title="Critical (Panic) Value Alert Center"
      subtitle="Immediate clinician notification log, verbal read-back verification & accreditation compliance records"
    >
      {/* Top Compliance Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-destructive/30 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-destructive text-xs">
            <span className="font-semibold">Pending Calls</span>
            <Flame className="h-4 w-4 animate-pulse" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-destructive">
            {pendingCount}
          </div>
          <p className="text-[11px] text-destructive/80 mt-0.5">Urgent notification required</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Successfully Notified</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            {notifiedCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Read-backs verified</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Median Call Time</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-foreground">6.5 Mins</div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            Target &lt; 15 mins (Compliant)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Read-Back Rate</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            100%
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Zero unverified releases</p>
        </div>
      </div>

      {/* Critical Incidents List */}
      <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-destructive" /> Critical Analytical Findings Roster
            </h3>
            <p className="text-xs text-muted-foreground">
              Actionable results exceeding clinical threshold limits requiring mandatory physician contact
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{incidents.length} Records</span>
        </div>

        <div className="divide-y divide-border/60">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className={`p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition ${
                inc.status === "pending_call" ? "bg-destructive/5" : "hover:bg-muted/30"
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{inc.reference}</span>
                  <h4 className="font-bold text-sm text-foreground">{inc.patient_name}</h4>
                  <span className="text-xs text-muted-foreground">
                    ({inc.patient_gender}, {inc.patient_age}y)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground border border-border">
                    {inc.location}
                  </span>
                  {inc.status === "pending_call" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground animate-pulse">
                      PENDING IMMEDIATE CALL
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      NOTIFIED &amp; CONFIRMED
                    </span>
                  )}
                </div>

                {/* Analyte Result Banner */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                  <span className="text-muted-foreground">Investigation: <strong>{inc.test_name}</strong></span>
                  <span>·</span>
                  <span className="text-destructive font-mono font-bold text-sm bg-destructive/10 px-2 py-0.5 rounded-md">
                    {inc.analyte}: {inc.critical_value}
                  </span>
                  <span className="text-muted-foreground text-[11px]">({inc.reference_range})</span>
                </div>

                {/* Notification status metadata */}
                {inc.status === "notified" && (
                  <div className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/50 space-y-1 mt-2">
                    <div className="flex flex-wrap items-center gap-3 text-foreground font-medium">
                      <span>Recipient: {inc.receiver_name} ({inc.receiver_role})</span>
                      <span>·</span>
                      <span>Called: {inc.call_timestamp}</span>
                      <span>·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Read-Back Confirmed
                      </span>
                    </div>
                    {inc.notes && <p className="italic text-muted-foreground">{inc.notes}</p>}
                  </div>
                )}
              </div>

              {/* Action Column */}
              <div className="shrink-0 flex items-center gap-2 self-end lg:self-center">
                {inc.status === "pending_call" ? (
                  <button
                    onClick={() => handleOpenCallLog(inc)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition shadow-sm animate-pulse"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call &amp; Log Read-Back
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenCallLog(inc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Review Call Log
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document Call Log Modal */}
      {activeCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4 text-destructive" /> Document Panic Value Notification
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ref: {activeCallModal.reference} · {activeCallModal.patient_name} ({activeCallModal.location})
                </p>
              </div>
              <button
                onClick={() => setActiveCallModal(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              <strong>Critical Finding:</strong> {activeCallModal.analyte} = {activeCallModal.critical_value} ({activeCallModal.reference_range})
            </div>

            <form onSubmit={handleSaveCallLog} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Doctor / Recipient Spoken With *</label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="e.g. Dr. Shamsul Alam or Ward Duty Sister"
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Recipient Professional Role</label>
                <select
                  value={receiverRole}
                  onChange={(e) => setReceiverRole(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                >
                  <option value="Ordering Consultant">Ordering Consultant Physician</option>
                  <option value="Attending Medical Officer">Attending Medical Officer (MO)</option>
                  <option value="ICU / CCU Duty Doctor">ICU / CCU Duty Doctor</option>
                  <option value="Ward Charge Nurse">Ward Charge Nurse</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/80">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readBackConfirmed}
                    onChange={(e) => setReadBackConfirmed(e.target.checked)}
                    className="h-4 w-4 rounded text-primary focus:ring-primary/30"
                  />
                  <div>
                    <span className="font-semibold text-foreground">
                      Verbal Read-Back Confirmed (Mandatory)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Recipient repeated patient name, MRN, analyte, and exact critical value verbatim.
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block font-semibold mb-1">Clinical Communication &amp; Advice Notes</label>
                <textarea
                  rows={2}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="e.g. Informed regarding hyperkalemia, repeat sample sent, ECG requested..."
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCallModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Authorize &amp; Save Call Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </LabLayout>
  );
}
