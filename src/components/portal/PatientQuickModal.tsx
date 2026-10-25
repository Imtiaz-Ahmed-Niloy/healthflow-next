"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  User, Phone, Calendar, Clock, Activity, Heart, ArrowRight,
  Copy, Check, BellRing, MapPin, ShieldAlert, Sparkles, AlertCircle, Receipt
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocale } from "next-intl";

export type QuickPatientData = {
  id: string;
  scheduled_time: string;
  priority: "high" | "standard" | "routine";
  reason: string | null;
  walk_in?: boolean;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  in_consultation: boolean;
  waited_minutes: number;
  hospital: { id: string; name: string };
  tokenNo?: string;
  patient: {
    id: string;
    mrn?: string;
    full_name: string;
    date_of_birth: string | null;
    phone: string | null;
    gender?: string | null;
    blood_group?: string | null;
    weight_kg?: number | null;
    height_feet?: number | null;
    height_inches?: number | null;
  } | null;
};

type Props = {
  patient: QuickPatientData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartConsult: (p: QuickPatientData) => void;
  onCallToken: (token: string, name: string) => void;
  onCreateInvoice?: (p: QuickPatientData) => void;
  ageLabel: (dob: string | null) => string;
};

export const PatientQuickModal = ({
  patient,
  open,
  onOpenChange,
  onStartConsult,
  onCallToken,
  onCreateInvoice,
  ageLabel,
}: Props) => {
  const locale = useLocale();
  const isBn = locale === "bn";
  const [copied, setCopied] = useState(false);

  if (!patient) return null;

  const p = patient.patient;

  const copyPhone = () => {
    if (p?.phone) {
      navigator.clipboard.writeText(p.phone);
      setCopied(true);
      toast.success(isBn ? "ফোন নম্বর কপি হয়েছে" : "Phone number copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const bloodGroupLabel = (bg: string | null | undefined) => {
    if (!bg) return "—";
    return bg.replace("_positive", " +ve").replace("_negative", " -ve").toUpperCase();
  };

  const bpStatus = () => {
    if (!patient.bp_systolic || !patient.bp_diastolic) return null;
    const sys = patient.bp_systolic;
    const dia = patient.bp_diastolic;
    if (sys >= 140 || dia >= 90) {
      return { label: "High / Stage 1 HTN", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" };
    }
    if (sys >= 120 || dia >= 80) {
      return { label: "Elevated / Pre-HTN", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
    }
    return { label: "Normal", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
  };

  const bmiCalc = () => {
    if (!p?.weight_kg || !p?.height_feet) return null;
    const totalInches = p.height_feet * 12 + (p.height_inches ?? 0);
    const meters = totalInches * 0.0254;
    if (meters <= 0) return null;
    const bmi = (p.weight_kg / (meters * meters)).toFixed(1);
    return bmi;
  };

  const bpInfo = bpStatus();
  const bmi = bmiCalc();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-card via-chip/30 to-card p-6 border-b border-border/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-16 w-16 rounded-2xl bg-card border border-border flex flex-col items-center justify-center font-display shadow-xs shrink-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Token</span>
                <span className="text-2xl font-black text-primary leading-none">
                  {patient.tokenNo || "—"}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl font-bold text-primary">
                    {p?.full_name || (isBn ? "রোগী" : "Patient")}
                  </h3>
                  {patient.priority === "high" && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold border border-rose-500/20 flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" /> {isBn ? "জরুরি" : "Urgent"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {p?.mrn && <span className="font-mono text-primary font-semibold">#{p.mrn}</span>}
                  <span>•</span>
                  <span>{ageLabel(p?.date_of_birth ?? null)}</span>
                  {p?.gender && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{p.gender}</span>
                    </>
                  )}
                  {p?.blood_group && (
                    <>
                      <span>•</span>
                      <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold text-[10px]">
                        {bloodGroupLabel(p.blood_group)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => onCallToken(patient.tokenNo || "1", p?.full_name || "Patient")}
              className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition flex flex-col items-center gap-1 text-[10px] font-bold shrink-0"
              title="Broadcast Call on TV Screen"
            >
              <BellRing className="h-4 w-4" />
              <span>Call</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Appointment Meta Strip */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-chip/40 border border-border/50">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{isBn ? "সময়" : "Time"}</p>
              <p className="font-semibold text-primary mt-0.5">{patient.scheduled_time.slice(0, 5)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{isBn ? "অপেক্ষার সময়" : "Waited"}</p>
              <p className="font-semibold text-primary mt-0.5">{patient.waited_minutes} mins</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{isBn ? "ধরন" : "Type"}</p>
              <p className="font-semibold text-primary mt-0.5">
                {patient.walk_in ? (isBn ? "ওয়াক-ইন" : "Walk-in") : (isBn ? "অ্যাপয়েন্টমেন্ট" : "Pre-booked")}
              </p>
            </div>
          </div>

          {/* Vitals Triage Card */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              {isBn ? "ট্রায়াজ ও ভাইটালস পরিমাপ" : "Triage Vitals Measurement"}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-card border border-border/60">
                <span className="text-[10px] text-muted-foreground font-medium">Blood Pressure</span>
                <p className="font-mono text-sm font-bold text-primary mt-1">
                  {patient.bp_systolic && patient.bp_diastolic
                    ? `${patient.bp_systolic}/${patient.bp_diastolic}`
                    : "—"}
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">mmHg</span>
                </p>
                {bpInfo && (
                  <span className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold border ${bpInfo.color}`}>
                    {bpInfo.label}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/60">
                <span className="text-[10px] text-muted-foreground font-medium">Weight</span>
                <p className="font-mono text-sm font-bold text-primary mt-1">
                  {p?.weight_kg != null ? p.weight_kg : "—"}
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">kg</span>
                </p>
                {bmi && (
                  <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-muted text-muted-foreground">
                    BMI: {bmi}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/60">
                <span className="text-[10px] text-muted-foreground font-medium">Height</span>
                <p className="font-mono text-sm font-bold text-primary mt-1">
                  {p?.height_feet != null ? `${p.height_feet}'${p.height_inches ?? 0}"` : "—"}
                </p>
                <span className="inline-block mt-1 text-[9px] text-muted-foreground">
                  Feet & Inches
                </span>
              </div>
            </div>
          </div>

          {/* Contact & Location */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {isBn ? "যোগাযোগের ফোন" : "Phone Contact"}
              </span>
              {p?.phone ? (
                <div className="flex items-center gap-2">
                  <a href={`tel:${p.phone}`} className="font-mono font-semibold text-primary hover:underline">
                    {p.phone}
                  </a>
                  <button onClick={copyPhone} className="p-1 text-muted-foreground hover:text-primary transition" title="Copy">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ) : (
                <span className="text-muted-foreground italic">Not provided</span>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border/40 pt-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {isBn ? "হাসপাতাল / চেম্বার" : "Chamber / Facility"}
              </span>
              <span className="font-semibold text-primary">{patient.hospital.name}</span>
            </div>
          </div>

          {/* Chief Complaint / Reason */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              {isBn ? "আসার কারণ ও লক্ষণ" : "Stated Reason / Chief Complaint"}
            </p>
            <div className="p-3 rounded-xl bg-chip/30 border border-border/50 text-foreground/80">
              {patient.reason || (isBn ? "কোনো অতিরিক্ত তথ্য উল্লেখ নেই" : "Routine medical consultation")}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 bg-card border-t border-border/50 flex flex-wrap sm:justify-between items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {isBn ? "বন্ধ করুন" : "Close"}
          </Button>

          <div className="flex items-center gap-2">
            {onCreateInvoice && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onCreateInvoice(patient);
                }}
                className="rounded-full border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 gap-1.5 text-xs font-semibold"
              >
                <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                {isBn ? "ওপিডি বিল" : "OPD Invoice"}
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onStartConsult(patient);
              }}
              className="rounded-full bg-gradient-dark text-surface-dark-foreground shadow-glow gap-1.5 text-xs font-semibold"
            >
              {patient.in_consultation ? (isBn ? "পরামর্শে ফিরে যান" : "Resume Consult") : (isBn ? "পরামর্শ শুরু করুন" : "Start Consult")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
