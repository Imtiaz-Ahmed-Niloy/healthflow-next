-- 0025_appointments_queue.sql
-- /portal/queue (the doctor's live "today's patients") ran entirely on
-- src/data/queue.ts -- three hardcoded names, no persistence, same disease
-- every other screen had before its HF ticket.
--
-- Two things the existing appointments table has no way to express yet:
--
-- 1. Priority. Not a booking concept (a patient never picks their own
--    priority), so it lives on the row a doctor/front-desk sets, default
--    'standard' so every already-booked appointment is valid the moment
--    this column exists.
-- 2. "Currently in consultation" vs "still waiting". `status` already means
--    something else (scheduled/completed/cancelled is the booking
--    lifecycle -- see 0020_appointments.sql) and overloading it would break
--    every existing cancel/reschedule check that assumes 'scheduled' means
--    "not yet happened". A nullable timestamp keeps the two concerns apart:
--    null = waiting, set = in consultation, and it doubles as the
--    consultation's start time for free.

create type appointment_priority as enum ('high', 'standard', 'routine');

alter table public.appointments
  add column priority appointment_priority not null default 'standard',
  add column consultation_started_at timestamptz;
