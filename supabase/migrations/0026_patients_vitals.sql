-- 0026_patients_vitals.sql
-- /portal/prescription (HF-57) showed a fixed "64 kg" / "6ft" no matter who
-- the patient was -- there was nowhere on `patients` to hold a real value.
-- Nullable on purpose: most existing patients have neither on file yet, and
-- the page shows a real dash rather than inventing a number for them.
--
-- Height is feet + inches, not centimetres -- that's not how it's read out
-- in a Bangladeshi hospital ("5 feet 4", not "162 cm"). Two integer columns
-- rather than one decimal: inches is naturally 0-11, and it keeps the
-- stored value exactly what was entered instead of a lossy cm conversion
-- both directions.

alter table public.patients
  add column weight_kg numeric(5, 1) check (weight_kg > 0),
  add column height_feet integer check (height_feet > 0),
  add column height_inches integer check (height_inches >= 0 and height_inches < 12);
