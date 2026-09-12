-- 0086_public_independent_doctors.sql
-- Doctors at no hospital appear in the public directory.
--
-- doctors_public (0022) joined tenants, so only a doctor at an approved
-- hospital reached /doctors and a patient's Find Doctors. 0081 put doctors on
-- HealthFlow at no hospital — their home row — and they were nowhere a patient
-- could see them.
--
-- The view now also lists a home row, as long as the same person is not
-- already listed through an approved hospital: a doctor with a login at a
-- hospital shows once, as the doctor there, not twice. A home row carries no
-- hospital, so its hospital columns are null and the pages say "Independent
-- practice".
--
-- Listing is not booking. An appointment belongs to a hospital, and
-- /api/v1/patient/appointments already refuses a doctor without one; the pages
-- say so instead of offering a booking that would fail.
--
-- Same columns in the same order, so the view is replaced in place and keeps
-- its grants (anon and authenticated: select). It still exposes nothing a
-- hospital listing did not: no email, no phone, no login.

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
left join public.tenants t on t.id = d.tenant_id
where d.status = 'active'
  and (
    t.status = 'approved'
    or (
      d.tenant_id is null
      and not exists (
        select 1
        from public.doctors x
        join public.tenants tx on tx.id = x.tenant_id
        where d.profile_id is not null
          and x.profile_id = d.profile_id
          and x.status = 'active'
          and tx.status = 'approved'
      )
    )
  );
