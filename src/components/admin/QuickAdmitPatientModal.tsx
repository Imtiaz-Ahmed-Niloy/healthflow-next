"use client";

import { useState } from "react";
import { Modal, Field, Input, Select, TextArea } from "@/components/admin/crud";
import { Btn } from "@/components/admin/ui";
import { useAdmitPatient } from "@/components/admin/useAdmitPatient";
import { doctorsApi, bedsApi, cabinsApi, type PatientRow, type AdmissionRow } from "@/redux/api/resources";
import { DateTimeLocalInput } from "@/components/ui/date-input";
import { User, Phone, Heart, CheckCircle2 } from "lucide-react";
import { differenceInYears } from "date-fns";

const BLOOD_GROUPS: Record<string, string> = {
  o_positive: "O+",
  o_negative: "O−",
  a_positive: "A+",
  a_negative: "A−",
  b_positive: "B+",
  b_negative: "B−",
  ab_positive: "AB+",
  ab_negative: "AB−",
};

const toLocalInput = (d: Date | string) => {
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const fromLocalInput = (value: string) => new Date(value).toISOString();

export const QuickAdmitPatientModal = ({
  patient,
  onClose,
  onSuccess,
}: {
  patient: PatientRow;
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  const { admit, isAdmitting } = useAdmitPatient();
  const { data: doctorsData, isLoading: doctorsLoading } = doctorsApi.useList({ limit: 100 });
  const doctors = doctorsData?.data ?? [];

  const { data: bedsData } = bedsApi.useList({ limit: 100, filters: { status: "available" } });
  const availableBeds = bedsData?.data ?? [];

  const { data: cabinsData } = cabinsApi.useList({ limit: 100, filters: { status: "available" } });
  const availableCabins = cabinsData?.data ?? [];

  const [doctorId, setDoctorId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [priority, setPriority] = useState<AdmissionRow["priority"]>("routine");
  const [bedId, setBedId] = useState("");
  const [cabinId, setCabinId] = useState("");
  const [admittedAt, setAdmittedAt] = useState(toLocalInput(new Date()));
  const [notes, setNotes] = useState("");

  const handleSave = async () => {
    const ok = await admit({
      patient_id: patient.id,
      doctor_id: doctorId || undefined,
      diagnosis: diagnosis || undefined,
      priority,
      notes: notes || undefined,
      admitted_at: admittedAt ? fromLocalInput(admittedAt) : undefined,
      patientName: patient.full_name,
      bed_id: bedId || undefined,
      cabin_id: cabinId || undefined,
    });

    if (ok) {
      onSuccess?.();
      onClose();
    }
  };

  const age = patient.date_of_birth ? differenceInYears(new Date(), new Date(patient.date_of_birth)) : null;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Admit Patient to Ward / Cabin"
      size="lg"
      footer={
        <>
          <Btn variant="outline" onClick={onClose} disabled={isAdmitting}>
            Cancel
          </Btn>
          <Btn onClick={handleSave} disabled={isAdmitting}>
            {isAdmitting ? "Admitting..." : "Admit Patient"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {/* Auto-filled Patient Summary Card */}
        <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0">
                {patient.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-foreground">{patient.full_name}</span>
                  {patient.mrn && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                      {patient.mrn}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Auto-Filled
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  {patient.phone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="h-3 w-3" />
                      {patient.phone}
                    </span>
                  )}
                  {patient.gender && (
                    <span className="capitalize flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {patient.gender}
                    </span>
                  )}
                  {age !== null && <span>• {age} yrs</span>}
                  {patient.blood_group && (
                    <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                      <Heart className="h-3 w-3" />
                      {BLOOD_GROUPS[patient.blood_group] || patient.blood_group}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admission Form Fields */}
        <div className="grid sm:grid-cols-2 gap-x-5 gap-y-3">
          <Field label="Attending Doctor">
            <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">{doctorsLoading ? "Loading doctors..." : "— Not assigned —"}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.specialty ? `· ${d.specialty}` : ""}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Diagnosis / Reason for Admission">
            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute appendicitis, observation"
            />
          </Field>

          <Field label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as AdmissionRow["priority"])}>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </Select>
          </Field>

          <Field label="Admitted At">
            <DateTimeLocalInput value={admittedAt} onChange={setAdmittedAt} />
          </Field>

          <Field label="Assign Bed (Ward)" hint="Select vacant bed or leave empty">
            <Select
              value={bedId}
              onChange={(e) => {
                setBedId(e.target.value);
                if (e.target.value) setCabinId("");
              }}
            >
              <option value="">— No bed assigned —</option>
              {availableBeds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.wards?.name ?? "Ward"} · Bed {b.number}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Assign Cabin" hint="Select vacant cabin or leave empty">
            <Select
              value={cabinId}
              onChange={(e) => {
                setCabinId(e.target.value);
                if (e.target.value) setBedId("");
              }}
            >
              <option value="">— No cabin assigned —</option>
              {availableCabins.map((c) => (
                <option key={c.id} value={c.id}>
                  Cabin {c.number} ({c.category})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div>
          <Field label="Clinical Notes">
            <TextArea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, vitals, initial instructions..."
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
};

