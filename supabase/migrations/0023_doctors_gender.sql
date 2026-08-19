-- 0023_doctors_gender.sql
-- Adds a real gender column to doctors. Previously the UI hardcoded every
-- doctor as "male" (removed in the HF-49 cleanup) — this replaces that dead
-- field with an actual, admin-entered value.
--
-- Reuses public.patient_gender (0016_patients.sql) rather than inventing a
-- second enum with the same three values.

alter table public.doctors add column gender public.patient_gender;

-- Recreate doctors_public to expose it. New column has to go at the very
-- end of the select list -- create or replace view refuses to reorder or
-- rename existing output columns.
create or replace view public.doctors_public as
  select
    d.id,
    d.tenant_id,
    d.name,
    d.slug,
    d.specialty,
    d.education,
    d.bio,
    d.languages,
    d.expertise,
    d.experience_years,
    d.rating,
    d.consultation_fee,
    d.patients_treated,
    d.consultation_duration_minutes,
    d.availability,
    d.photo_url,
    d.status,
    d.created_at,
    t.location,
    t.division,
    t.district,
    t.subdistrict,
    t.name as hospital_name,
    t.slug as hospital_slug,
    d.gender
  from public.doctors d
  join public.tenants t on d.tenant_id = t.id
  where d.status = 'active'
    and t.status = 'approved';

grant select on public.doctors_public to anon, authenticated;
