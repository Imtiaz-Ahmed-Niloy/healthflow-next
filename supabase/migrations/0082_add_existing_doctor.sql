-- 0082_add_existing_doctor.sql
-- A hospital can add a doctor who is already on HealthFlow.
--
-- A doctor is one person with a row at each hospital they work at (0077). A
-- hospital admin could already reach an existing doctor, but only sideways:
-- type a new row with the same email or BMDC number, then press the key so
-- /api/v1/doctors/:id/login linked it. There was no way to look for them.
--
-- Two functions, both SECURITY DEFINER because the doctors a hospital is
-- looking for are, correctly, invisible to it under RLS — they work elsewhere.
-- Each answers one narrow question and checks the caller itself:
--
--   search_doctors_to_add(q)  who could be added: doctors with an active
--       login who are not at the caller's hospital. A name matches in part;
--       an email only in full, so the search can't be used to walk the
--       address book; a phone by its last ten digits, which is how the same
--       Bangladeshi number is written with or without +880 and the leading 0.
--       Contact details come back masked — enough to tell two Dr. Rahmans
--       apart, not enough to be a directory of their numbers.
--
--   add_doctor_to_hospital(...)  the caller's hospital gets a row linked to
--       that login, with its own fee and hours. 0077's pull trigger copies the
--       person's own details onto it, so the hospital cannot rename them.

create or replace function public.search_doctors_to_add(p_query text)
returns table (
  profile_id  uuid,
  name        text,
  specialty   text,
  photo_url   text,
  bmdc_number text,
  email_hint  text,
  phone_hint  text,
  hospitals   text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := public.auth_tenant_id();
  v_q      text := btrim(coalesce(p_query, ''));
  v_like   text;
  v_digits text;
begin
  if public.auth_role() is null
     or public.auth_role() not in ('hospital_admin', 'hr_admin')
     or v_tenant is null then
    raise exception 'Only a hospital''s admin can add doctors to it' using errcode = '42501';
  end if;

  if length(v_q) < 2 then
    return;
  end if;

  -- The query as literal text inside ILIKE: % and _ are the user's, not wildcards.
  v_like   := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  v_digits := regexp_replace(v_q, '\D', '', 'g');

  return query
  with people as (
    -- One entry per login: the most recently updated of their rows carries
    -- their current details (0077 keeps them in step anyway).
    select distinct on (d.profile_id)
      d.profile_id, d.name, d.specialty, d.photo_url, d.bmdc_number, d.phone,
      coalesce(p.email, d.email) as email
    from public.doctors d
    join public.profiles p on p.id = d.profile_id
    where p.role = 'doctor'
      and p.is_active
      and not exists (
        select 1 from public.doctors x
        where x.profile_id = d.profile_id and x.tenant_id = v_tenant
      )
    order by d.profile_id, d.updated_at desc
  )
  select
    pe.profile_id,
    pe.name,
    pe.specialty,
    pe.photo_url,
    pe.bmdc_number,
    case when pe.email is null then null
         else left(split_part(pe.email, '@', 1), 2) || '•••@' || split_part(pe.email, '@', 2) end,
    case when coalesce(pe.phone, '') = '' then null
         else '••• ' || right(regexp_replace(pe.phone, '\D', '', 'g'), 3) end,
    array(
      select t.name
      from public.doctors x
      join public.tenants t on t.id = x.tenant_id
      where x.profile_id = pe.profile_id and t.status = 'approved'
      order by t.name
    )
  from people pe
  where pe.name ilike v_like
     or lower(pe.email) = lower(v_q)
     or (length(v_digits) >= 8
         and regexp_replace(coalesce(pe.phone, ''), '\D', '', 'g') like '%' || right(v_digits, 10))
  order by pe.name
  limit 20;
end;
$$;

comment on function public.search_doctors_to_add(text) is
  'Doctors with an active login who are not at the caller''s hospital, matched by name (partial), email (exact) or phone (last ten digits). Hospital and HR admins only; contact details masked.';

create or replace function public.add_doctor_to_hospital(
  p_profile_id       uuid,
  p_consultation_fee numeric default null,
  p_availability     text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := public.auth_tenant_id();
  v_name   text;
  v_id     uuid;
begin
  if public.auth_role() is null
     or public.auth_role() not in ('hospital_admin', 'hr_admin')
     or v_tenant is null then
    raise exception 'Only a hospital''s admin can add doctors to it' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles where id = p_profile_id and role = 'doctor' and is_active
  ) then
    raise exception 'That doctor isn''t on HealthFlow, or their account is suspended' using errcode = 'P0001';
  end if;

  select d.name into v_name
    from public.doctors d
   where d.profile_id = p_profile_id and d.tenant_id = v_tenant;
  if found then
    raise exception '% already works at this hospital', v_name using errcode = 'P0001';
  end if;

  if p_consultation_fee is not null and p_consultation_fee < 0 then
    raise exception 'The fee can''t be negative' using errcode = 'P0001';
  end if;

  -- Any name will do: doctors_pull_person replaces it, and the rest of the
  -- person's details, with theirs.
  select d.name into v_name
    from public.doctors d
   where d.profile_id = p_profile_id
   order by d.updated_at desc
   limit 1;

  insert into public.doctors (tenant_id, profile_id, name, slug, consultation_fee, availability)
  values (v_tenant, p_profile_id, coalesce(v_name, 'Doctor'), '', p_consultation_fee, nullif(btrim(p_availability), ''))
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.add_doctor_to_hospital(uuid, numeric, text) is
  'Adds a doctor already on HealthFlow to the caller''s hospital: a row linked to their login, with this hospital''s fee and hours. Hospital and HR admins only.';

revoke execute on function public.search_doctors_to_add(text) from public, anon;
revoke execute on function public.add_doctor_to_hospital(uuid, numeric, text) from public, anon;
grant execute on function public.search_doctors_to_add(text) to authenticated;
grant execute on function public.add_doctor_to_hospital(uuid, numeric, text) to authenticated;

notify pgrst, 'reload schema';
