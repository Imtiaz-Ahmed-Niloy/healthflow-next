-- 0020_doctors_public.sql
-- Exposes active doctors belonging to approved hospitals publicly.
-- Excluding private columns (email, phone, profile_id).

create view public.doctors_public as
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
    -- Joined location columns from tenants
    t.location,
    t.division,
    t.district,
    t.subdistrict,
    t.name as hospital_name,
    t.slug as hospital_slug
  from public.doctors d
  join public.tenants t on d.tenant_id = t.id
  where d.status = 'active'
    and t.status = 'approved';

grant select on public.doctors_public to anon, authenticated;
