-- 0028_appointments_prescription_content.sql
-- /portal/prescription (HF-57) never actually saved chief complaints,
-- examination, investigation, diagnosis, medicines, or advice anywhere --
-- "Print & Submit" only flipped `status` to completed. A doctor reopening
-- an already-submitted visit (e.g. from Queue's "Seen Today" list) saw a
-- blank chart, as if the whole consult had never happened.
--
-- One JSONB column per section, on `appointments` -- same reasoning as
-- bp_systolic/bp_diastolic (0027): this is content specific to *this*
-- visit, not a standing fact about the patient. Arrays of plain strings
-- for the free-text sections; medicines is an array of
-- {name, dose, frequency, days, meal} objects, matching the shape the
-- Rx builder already uses client-side. Defaulted to '[]', not null --
-- every appointment has a (possibly empty) chart, never a missing one.

alter table public.appointments
  add column complaints    jsonb not null default '[]'::jsonb,
  add column examination   jsonb not null default '[]'::jsonb,
  add column investigation jsonb not null default '[]'::jsonb,
  add column diagnosis     jsonb not null default '[]'::jsonb,
  add column medicines     jsonb not null default '[]'::jsonb,
  add column advice        jsonb not null default '[]'::jsonb;
