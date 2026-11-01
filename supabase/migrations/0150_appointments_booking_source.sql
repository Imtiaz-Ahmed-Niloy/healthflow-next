-- 0144_appointments_booking_source.sql
-- Distinguish appointment booking channels:
-- 'patient_portal' (Patient Panel self-service booking from /patient)
-- 'doctor_walk_in' (Doctor Panel walk-in patient added from /portal/queue)
-- 'hospital_admin' (Hospital Management panel front desk /admin/appointments)

alter table public.appointments
  add column if not exists booking_source text default 'hospital_admin';

update public.appointments
  set booking_source = 'doctor_walk_in'
  where walk_in = true and (booking_source is null or booking_source = 'hospital_admin');

create index if not exists appointments_booking_source_idx
  on public.appointments (tenant_id, booking_source);

