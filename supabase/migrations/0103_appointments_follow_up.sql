-- 0103_appointments_follow_up.sql
-- When the doctor wants to see the patient again.
--
-- The prescription pad's General Advice now ends with a Follow-up picker:
-- "after 7 days", "after 1 month", "after 3 months", or a date of the
-- doctor's own. What is stored is the date itself, worked out from the day
-- of the visit, so the printed sheet and the patient's records can say
-- "come back on 04 Oct 2026" without doing the arithmetic again.
--
-- On the visit's own row, like the rest of the chart (0028). Null = no
-- follow-up was set.

alter table public.appointments
  add column follow_up_date date;

comment on column public.appointments.follow_up_date is
  'The date the doctor asked the patient to come back, set on the prescription pad (0103). Null when none was set.';
