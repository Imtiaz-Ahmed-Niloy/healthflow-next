"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileBadge, Printer, X, Building2, Stethoscope, CheckCircle2 } from "lucide-react";
import { useLocale } from "next-intl";

type CertType = "fitness" | "sick_leave" | "referral";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: {
    name: string;
    specialty: string | null;
    education: string | null;
    bmdc_number?: string | null;
  };
  hospital: {
    name: string | null;
    address: string | null;
    contact_phone: string | null;
  };
  patient: {
    full_name: string;
    mrn: string;
    gender: string | null;
    ageString?: string;
  };
  vitals?: {
    bp?: string;
    weight?: string;
  };
  diagnosis?: string[];
};

export const MedicalCertificatesDialog = ({
  open,
  onOpenChange,
  doctor,
  hospital,
  patient,
  vitals,
  diagnosis = [],
}: Props) => {
  const locale = useLocale();
  const isBn = locale === "bn";

  const [certType, setCertType] = useState<CertType>("fitness");
  const [issuedDate, setIssuedDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Fitness Fields
  const [fitnessPurpose, setFitnessPurpose] = useState("employment / academic admission / physical fitness");
  const [fitnessNotes, setFitnessNotes] = useState("Clinically free from active infectious diseases or organic disability.");

  // Sick Leave Fields
  const [leaveDays, setLeaveDays] = useState("3");
  const [leaveStartDate, setLeaveStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [leaveReason, setLeaveReason] = useState(
    diagnosis.length > 0 ? diagnosis.join(", ") : "Acute systemic illness requiring bed rest"
  );
  const [resumeDate, setResumeDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().slice(0, 10);
  });

  // Referral Fields
  const [referToDoctor, setReferToDoctor] = useState("Specialist / Department of Internal Medicine");
  const [referHospital, setReferHospital] = useState("BSMMU / Dhaka Medical College Hospital");
  const [referReason, setReferReason] = useState(
    "Further specialized clinical evaluation, advanced diagnostic workup and tertiary management."
  );
  const [clinicalSummary, setClinicalSummary] = useState(
    diagnosis.length > 0
      ? `Patient presented with ${diagnosis.join(", ")}. Vitals: ${vitals?.bp || "Stable"}.`
      : "Clinical evaluation attached."
  );

  const [printMode, setPrintMode] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="border-b pb-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FileBadge className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-primary">
                {isBn ? "মেডিকেল সার্টিফিকেট ও রেফারেল লেটার" : "Medical Certificates & Referral Letters"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {isBn
                  ? "অফিসিয়াল লেটারহেড ও বিএমডিসি সনদ নম্বরসহ প্রিন্টযোগ্য প্রত্যয়নপত্র"
                  : "Official printable medical certificates with BMDC seal and letterhead"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Certificate Type Selector */}
        <div className="flex gap-2 border-b pb-3 print:hidden">
          <button
            onClick={() => setCertType("fitness")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              certType === "fitness"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-chip text-primary hover:bg-primary/15"
            }`}
          >
            {isBn ? "শারীরিক সুস্থতা সনদ (Fitness)" : "Medical Fitness"}
          </button>
          <button
            onClick={() => setCertType("sick_leave")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              certType === "sick_leave"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-chip text-primary hover:bg-primary/15"
            }`}
          >
            {isBn ? "অসুস্থতাজনিত ছুটির সনদ (Sick Leave)" : "Medical / Sick Leave"}
          </button>
          <button
            onClick={() => setCertType("referral")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              certType === "referral"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-chip text-primary hover:bg-primary/15"
            }`}
          >
            {isBn ? "বিশেষজ্ঞ রেফারেল লেটার (Referral)" : "Specialist Referral Letter"}
          </button>
        </div>

        {/* Form Inputs (Hidden during Print) */}
        <div className="grid grid-cols-2 gap-3 py-2 text-xs print:hidden">
          {certType === "fitness" && (
            <>
              <div>
                <Label className="text-xs">Purpose / Authority</Label>
                <Input
                  value={fitnessPurpose}
                  onChange={(e) => setFitnessPurpose(e.target.value)}
                  placeholder="e.g. Employment, Study Abroad, Sports"
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Clinical Observation</Label>
                <Input
                  value={fitnessNotes}
                  onChange={(e) => setFitnessNotes(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </>
          )}

          {certType === "sick_leave" && (
            <>
              <div>
                <Label className="text-xs">Rest Duration (Days)</Label>
                <Input
                  type="number"
                  value={leaveDays}
                  onChange={(e) => setLeaveDays(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Medical Reason / Diagnosis</Label>
                <Input
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Fit to Resume Duty Date</Label>
                <Input
                  type="date"
                  value={resumeDate}
                  onChange={(e) => setResumeDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </>
          )}

          {certType === "referral" && (
            <>
              <div>
                <Label className="text-xs">Referred To (Consultant / Dept)</Label>
                <Input
                  value={referToDoctor}
                  onChange={(e) => setReferToDoctor(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Referred Institution / Center</Label>
                <Input
                  value={referHospital}
                  onChange={(e) => setReferHospital(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Reason for Referral</Label>
                <Input
                  value={referReason}
                  onChange={(e) => setReferReason(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Clinical Summary & Current Treatment</Label>
                <Textarea
                  rows={2}
                  value={clinicalSummary}
                  onChange={(e) => setClinicalSummary(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </>
          )}
        </div>

        {/* Printable Official Document Sheet */}
        <div className="rounded-2xl border border-slate-300 p-8 bg-white text-slate-900 shadow-sm print:border-none print:shadow-none print:p-0">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {hospital.name || "Doctor Consultation Chamber"}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">{hospital.address || "Dhaka, Bangladesh"}</p>
              {hospital.contact_phone && (
                <p className="text-xs text-slate-600">Phone: {hospital.contact_phone}</p>
              )}
            </div>

            <div className="text-right">
              <p className="text-base font-bold text-slate-900">{doctor.name}</p>
              <p className="text-xs text-slate-700">{doctor.education}</p>
              <p className="text-xs text-slate-700">{doctor.specialty}</p>
              {doctor.bmdc_number && (
                <p className="text-xs font-mono font-bold text-primary mt-0.5">
                  BMDC Reg: {doctor.bmdc_number}
                </p>
              )}
            </div>
          </div>

          {/* Certificate Title */}
          <div className="text-center my-6">
            <h1 className="text-lg font-black uppercase tracking-widest text-slate-900 underline underline-offset-4">
              {certType === "fitness" && "MEDICAL FITNESS CERTIFICATE"}
              {certType === "sick_leave" && "MEDICAL SICK LEAVE CERTIFICATE"}
              {certType === "referral" && "SPECIALIST CLINICAL REFERRAL LETTER"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">Date: {issuedDate}</p>
          </div>

          {/* Certificate Body */}
          <div className="text-sm leading-relaxed space-y-4 my-6 text-slate-800">
            {certType === "fitness" && (
              <>
                <p>
                  This is to certify that I have clinically examined{" "}
                  <strong>{patient.full_name}</strong> (Patient MRN: #{patient.mrn}
                  {patient.ageString ? `, Age: ${patient.ageString}` : ""}
                  {patient.gender ? `, Sex: ${patient.gender}` : ""}) on this day.
                </p>
                <p>
                  On comprehensive general and systemic examination, the candidate was found to be in{" "}
                  <strong>good physical and mental health</strong>. {fitnessNotes}
                </p>
                {vitals?.bp && <p className="text-xs text-slate-700 font-mono">Recorded Vitals: BP {vitals.bp}</p>}
                <p>
                  In my clinical opinion, <strong>{patient.full_name}</strong> is medically{" "}
                  <strong className="text-slate-950 uppercase underline">FIT</strong> for the purpose of{" "}
                  <strong>{fitnessPurpose}</strong>.
                </p>
              </>
            )}

            {certType === "sick_leave" && (
              <>
                <p>
                  This is to certify that <strong>{patient.full_name}</strong> (Patient MRN: #{patient.mrn})
                  has been under my medical care and treatment for{" "}
                  <strong>{leaveReason}</strong>.
                </p>
                <p>
                  Due to the severity of the clinical condition and to prevent further complications, the
                  patient was advised strict medical bed rest and absence from duty / classes for a period
                  of <strong>{leaveDays} days</strong>, commencing from <strong>{leaveStartDate}</strong>.
                </p>
                <p>
                  The patient is anticipated to be clinically reassessed and fit to resume normal duties
                  on <strong>{resumeDate}</strong>.
                </p>
              </>
            )}

            {certType === "referral" && (
              <>
                <div className="p-3 rounded-lg bg-slate-50 border text-xs">
                  <p>
                    <strong>To:</strong> {referToDoctor}
                  </p>
                  <p>
                    <strong>Hospital / Institute:</strong> {referHospital}
                  </p>
                </div>
                <p>
                  <strong>Dear Colleague,</strong>
                </p>
                <p>
                  I am referring <strong>{patient.full_name}</strong> (MRN: #{patient.mrn}
                  {patient.ageString ? `, Age: ${patient.ageString}` : ""}) for your expert evaluation and
                  management.
                </p>
                <p>
                  <strong>Clinical Summary:</strong> {clinicalSummary}
                </p>
                <p>
                  <strong>Reason for Referral:</strong> {referReason}
                </p>
                <p>Thank you for seeing this patient in consultation. Warm regards.</p>
              </>
            )}
          </div>

          {/* Signature Footer */}
          <div className="mt-16 pt-4 border-t border-slate-300 flex justify-between items-end">
            <div className="text-[11px] text-slate-500 font-mono">
              <p>Generated via HealthFlow Clinical Suite</p>
              <p>Verification Code: HF-DOC-{patient.mrn.slice(0, 6)}</p>
            </div>

            <div className="text-right">
              <div className="h-10" />
              <p className="border-t border-slate-900 pt-1 font-bold text-sm text-slate-900">
                {doctor.name}
              </p>
              <p className="text-xs text-slate-600">{doctor.specialty || "Medical Practitioner"}</p>
              {doctor.bmdc_number && (
                <p className="text-xs font-mono text-slate-600">BMDC Reg: {doctor.bmdc_number}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-3 print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint} className="bg-primary text-primary-foreground gap-1.5 font-bold">
            <Printer className="h-4 w-4" />
            Print Official Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
