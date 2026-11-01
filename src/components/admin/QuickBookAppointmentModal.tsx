"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal, Field, Input, Select, TextArea } from "@/components/admin/crud";
import { Btn } from "@/components/admin/ui";
import { appointmentsApi, doctorsApi, type PatientRow } from "@/redux/api/resources";
import { Phone, User, Heart, CheckCircle2 } from "lucide-react";
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

export const QuickBookAppointmentModal = ({
  patient,
  onClose,
  onSuccess,
}: {
  patient: PatientRow;
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  const [createAppointment, { isLoading }] = appointmentsApi.useCreate();
  const { data: doctorsData, isLoading: doctorsLoading } = doctorsApi.useList({ limit: 100 });
  const doctors = doctorsData?.data ?? [];

  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const toLocalTimeStr = (d: Date) => {
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const [doctorId, setDoctorId] = useState("");
  const [department, setDepartment] = useState("");
  const [scheduledDate, setScheduledDate] = useState(toLocalDateStr(new Date()));
  const [scheduledTime, setScheduledTime] = useState(toLocalTimeStr(new Date()));
  const [notes, setNotes] = useState("");

  const handleDoctorChange = (id: string) => {
    setDoctorId(id);
    const doc = doctors.find((d) => d.id === id);
    if (doc?.specialty) {
      setDepartment(doc.specialty);
    }
  };

  const handleSave = async () => {
    if (!scheduledDate || !scheduledTime) {
      toast.error("Date and time are required for the appointment.");
      return;
    }

    try {
      await createAppointment({
        patient_id: patient.id,
        doctor_id: doctorId || undefined,
        department: department || undefined,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime.length === 5 ? `${scheduledTime}:00` : scheduledTime,
        notes: notes || undefined,
        status: "scheduled",
      }).unwrap();

      toast.success(`Appointment booked for ${patient.full_name} on ${scheduledDate} at ${scheduledTime}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error("Failed to book appointment", { description: msg || "Please check details and try again." });
    }
  };

  const age = patient.date_of_birth ? differenceInYears(new Date(), new Date(patient.date_of_birth)) : null;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Book Appointment"
      size="md"
      footer={
        <>
          <Btn variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Btn>
          <Btn onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Booking..." : "Book Appointment"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {/* Auto-filled Patient Summary Card */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                {patient.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-foreground">{patient.full_name}</span>
                  {patient.mrn && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">
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

        {/* Appointment Details Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Attending Doctor">
              <Select value={doctorId} onChange={(e) => handleDoctorChange(e.target.value)}>
                <option value="">{doctorsLoading ? "Loading doctors..." : "— Not assigned (Any available) —"}</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.specialty ? `· ${d.specialty}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div>
            <Field label="Department / Specialty">
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Cardiology, General Medicine"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Field label="Date" required>
                <Input
                  type="date"
                  value={scheduledDate}
                  min={toLocalDateStr(new Date())}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </Field>
            </div>
            <div>
              <Field label="Time" required>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
              </Field>
            </div>
          </div>
        </div>

        <div>
          <Field label="Reason / Clinical Notes">
            <TextArea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for visit, symptoms, or special instructions..."
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
};

