-- 0089_doctors_public_practice_contact.sql
-- Where to find a doctor at their chamber: its address and phone.
--
-- A hospital's address and phone reach its doctors' profiles from
-- hospitals_public, by slug. A chamber (0088) is not a hospital and is not in
-- that view, so a patient reading a chamber doctor's profile had the chamber's
-- name and area and no way to get there or call. Both are what the doctor
-- entered as public — "Phone for appointments" — so they are listed here.
--
-- Added as the view's last columns, so it is replaced in place and keeps its
-- grants. Otherwise as 0088.

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
  d.bmdc_number,
  t.kind::text as practice_kind,
  t.address as practice_address,
  t.contact_phone as practice_phone
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
