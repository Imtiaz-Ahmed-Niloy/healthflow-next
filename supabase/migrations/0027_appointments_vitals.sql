-- 0027_appointments_vitals.sql
-- Blood pressure is a per-visit reading, not a standing patient attribute --
-- an assistant takes it fresh at triage, before the doctor ever sees the
-- patient, and it belongs to *this* consultation. That's a different shape
-- of fact than weight/height (0026_patients_vitals.sql), which are read as
-- "the patient's current measurement" and deliberately live on `patients`.
-- BP living on `appointments` instead is that same reasoning pointing the
-- other way.

alter table public.appointments
  add column bp_systolic  integer check (bp_systolic  > 0 and bp_systolic  < 300),
  add column bp_diastolic integer check (bp_diastolic > 0 and bp_diastolic < 200);
