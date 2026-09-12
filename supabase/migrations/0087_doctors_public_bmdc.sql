-- 0087_doctors_public_bmdc.sql
-- A doctor's BMDC registration number on their public profile.
--
-- The number is a public registration: BMDC publishes it for anyone to check a
-- doctor against, and a patient looking at a profile is exactly who should be
-- able to. It is the one thing on the page that says the doctor is licensed.
--
-- Added as the view's last column, so the view is replaced in place and keeps
-- its grants. Otherwise as 0086.

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
  d.gender,
  d.bmdc_number
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
