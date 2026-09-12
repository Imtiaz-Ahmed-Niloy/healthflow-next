-- 0085_add_doctor_without_login.sql
-- "Add an existing doctor" also finds a doctor with no login yet.
--
-- 0082 found only doctors with an active login: a login is what lets one
-- person be a row at several hospitals. But a super admin can put a doctor on
-- HealthFlow at no hospital and without a login (0081) — their home row — and
-- that doctor was invisible to every hospital's search. Adding the login is a
-- separate step that can fail, or be left for later; the doctor is still there.
--
-- Now the search also returns those home rows: at no hospital, no login,
-- active. Adding one moves the home row to the caller's hospital, with its fee
-- and hours. Without a login there is nothing to link a second row to, so such
-- a doctor can be at one hospital until they have one — the same rule the super
-- admin's Edit applies. A hospital's own directory rows (a tenant, no login)
-- are never offered: they are that hospital's listing, not a person to take.
--
-- The return type gains `doctor_id` (the home row, when there is no login) and
-- `has_login`; a function's result columns can't change in place, so both
-- functions are dropped and recreated, and their grants restated.

drop function if exists public.search_doctors_to_add(text);
drop function if exists public.add_doctor_to_hospital(uuid, numeric, text);

create function public.search_doctors_to_add(p_query text)
returns table (
  profile_id  uuid,
  doctor_id   uuid,
  name        text,
  specialty   text,
  photo_url   text,
  bmdc_number text,
  email_hint  text,
  phone_hint  text,
  hospitals   text[],
  has_login   boolean
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
  with with_login as (
    -- One entry per login: the most recently updated of their rows.
    select distinct on (d.profile_id)
      d.profile_id, null::uuid as doctor_id, d.name, d.specialty, d.photo_url, d.bmdc_number, d.phone,
      coalesce(p.email, d.email) as email, true as has_login
    from public.doctors d
    join public.profiles p on p.id = d.profile_id
    where p.role = 'doctor'
      and p.is_active
      and not exists (
        select 1 from public.doctors x
        where x.profile_id = d.profile_id and x.tenant_id = v_tenant
      )
    order by d.profile_id, d.updated_at desc
  ),
  without_login as (
    -- On HealthFlow at no hospital, with no login yet (0081).
    select null::uuid, d.id, d.name, d.specialty, d.photo_url, d.bmdc_number, d.phone, d.email, false
    from public.doctors d
    where d.tenant_id is null and d.profile_id is null and d.status = 'active'
  ),
  people as (
    select * from with_login
    union all
    select * from without_login
  )
  select
    pe.profile_id,
    pe.doctor_id,
    pe.name,
    pe.specialty,
    pe.photo_url,
    pe.bmdc_number,
    case when pe.email is null then null
         else left(split_part(pe.email, '@', 1), 2) || '•••@' || split_part(pe.email, '@', 2) end,
    case when coalesce(pe.phone, '') = '' then null
         else '••• ' || right(regexp_replace(pe.phone, '\D', '', 'g'), 3) end,
    case when pe.profile_id is null then '{}'::text[]
         else array(
           select t.name
           from public.doctors x
           join public.tenants t on t.id = x.tenant_id
           where x.profile_id = pe.profile_id and t.status = 'approved'
           order by t.name
         ) end,
    pe.has_login
  from people pe
  where pe.name ilike v_like
     or pe.email ilike v_like
     or pe.bmdc_number ilike v_like
     or (length(v_digits) >= 3
         and regexp_replace(coalesce(pe.phone, ''), '\D', '', 'g') like '%' || v_digits || '%')
  order by pe.name
  limit 20;
end;
$$;

comment on function public.search_doctors_to_add(text) is
  'Doctors a hospital could add: those with an active login not at the caller''s hospital, and those at no hospital with no login yet. Matched in part by name, email, BMDC number or phone digits. Hospital and HR admins only; at most twenty, contact details masked.';

create function public.add_doctor_to_hospital(
  p_profile_id       uuid default null,
  p_consultation_fee numeric default null,
  p_availability     text default null,
  p_doctor_id        uuid default null
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

  if p_consultation_fee is not null and p_consultation_fee < 0 then
    raise exception 'The fee can''t be negative' using errcode = 'P0001';
  end if;

  -- A doctor with no login: their home row becomes the doctor at this hospital.
  if p_profile_id is null then
    if p_doctor_id is null then
      raise exception 'Pick a doctor to add' using errcode = 'P0001';
    end if;

    update public.doctors
       set tenant_id = v_tenant,
           consultation_fee = p_consultation_fee,
           availability = coalesce(nullif(btrim(p_availability), ''), availability)
     where id = p_doctor_id
       and tenant_id is null
       and profile_id is null
       and status = 'active'
    returning id into v_id;

    if v_id is null then
      raise exception 'That doctor has just been added to a hospital, or is no longer on HealthFlow' using errcode = 'P0001';
    end if;
    return v_id;
  end if;

  -- A doctor with a login: a new row at this hospital, linked to it.
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

comment on function public.add_doctor_to_hospital(uuid, numeric, text, uuid) is
  'Adds a doctor already on HealthFlow to the caller''s hospital, with its fee and hours: a row linked to their login, or — for a doctor with no login — their home row, moved here. Hospital and HR admins only.';

revoke execute on function public.search_doctors_to_add(text) from public, anon;
revoke execute on function public.add_doctor_to_hospital(uuid, numeric, text, uuid) from public, anon;
grant execute on function public.search_doctors_to_add(text) to authenticated;
grant execute on function public.add_doctor_to_hospital(uuid, numeric, text, uuid) to authenticated;

notify pgrst, 'reload schema';
