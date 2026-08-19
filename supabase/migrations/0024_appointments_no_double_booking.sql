-- 0024_appointments_no_double_booking.sql
-- HF-53. Nothing stopped two patients from booking the exact same doctor at
-- the exact same date and time — both requests would insert fine.
--
-- A partial unique index, not an app-level "check then insert": the same
-- pattern HF-37 already used for beds/cabins (bed_stays_one_open_per_bed/
-- cabin). An app-level check-then-insert has a race window between two
-- concurrent requests; the database refusing the second INSERT outright does
-- not.
--
-- Scoped to status = 'scheduled' only: a cancelled slot frees up for someone
-- else, and a completed one is history, not a live conflict.

create unique index appointments_doctor_slot_unique
  on public.appointments (doctor_id, scheduled_date, scheduled_time)
  where status = 'scheduled';
