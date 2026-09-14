-- 0088_doctor_chambers.sql
-- A doctor's own chamber: their private practice, with its own address,
-- phone, fee and hours, where patients book them and they write prescriptions.
--
-- A chamber is a tenant. `tenants.kind` says which of the two a row is, and a
-- chamber names the doctor who owns it. The alternative — a `chambers` table —
-- would leave every appointment, patient record, prescription and invoice at a
-- chamber with no tenant_id, and each of those tables would need policies
-- written by hand beside apply_tenant_rls. As a tenant, a chamber gets all of
-- it unchanged:
--
--   - The doctor is a doctors row there, like at a hospital. The fee and hours
--     live on that row, where booking and reschedule already read them. Hours
--     belong to the chamber, not to the person: the home row's are not used.
--   - The token hook (0077/0081) already carries every tenant a doctor has a
--     row at, so the queue, walk-ins and prescriptions cover the chamber.
--   - Booking already makes or links a patients row at the doctor's tenant.
--   - A prescription prints the tenant's name, address and phone.
--
-- The price is that anything listing tenants as hospitals must now say so:
-- hospitals_public here, and the admin lists in the app.
--
-- Rules:
--   - One doctor per chamber: the owner. A doctor can have several.
--   - A chamber needs a doctor with a login. It is run from their own panel,
--     and without one no one would ever see its bookings.
--   - Open at once, whoever adds it: the doctor is already on HealthFlow. The
--     super admin can close one; so can its doctor.
--   - Closing stops new bookings. Appointments already made stay, as history
--     and on the doctor's queue.
--   - No hospital admin, staff or wards. Only these functions change a
--     chamber; there is no direct write to it for a doctor.

-- ---------------------------------------------------------------------------
-- 1. What kind of tenant, and whose.

create type public.tenant_kind as enum ('hospital', 'chamber');

alter table public.tenants
  add column kind public.tenant_kind not null default 'hospital',
  add column owner_profile_id uuid references public.profiles (id) on delete restrict;

alter table public.tenants
  add constraint tenants_chamber_owner check (
    (kind = 'chamber') = (owner_profile_id is not null)
  );

create index tenants_kind_idx  on public.tenants (kind);
create index tenants_owner_idx on public.tenants (owner_profile_id) where owner_profile_id is not null;

comment on column public.tenants.kind is
  'hospital, or a doctor''s own chamber (0088). Lists of hospitals filter on it.';
comment on column public.tenants.owner_profile_id is
  'The doctor who owns a chamber. Null for a hospital.';

-- ---------------------------------------------------------------------------
-- 2. A doctor sets their own fee and hours at their own chamber.
--
-- At a hospital those are the hospital's to set, and this guard refuses them
-- to the doctor (0077). At a chamber they own, they are the doctor's. Moving
-- the row to another tenant, or to another login, is still refused.

create or replace function public.doctors_guard_person()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_personal text[] := array['name', 'specialty', 'education', 'bio', 'languages', 'expertise',
    'experience_years', 'email', 'phone', 'photo_url', 'gender', 'bmdc_number', 'updated_at'];
begin
  if pg_trigger_depth() > 1 or (select auth.uid()) is null or public.is_super_admin() then
    return new;
  end if;

  if old.profile_id is not null and (select auth.uid()) = old.profile_id then
    if public.auth_role() in ('hospital_admin', 'hr_admin') then
      return new;
    end if;
    if new.tenant_id is not distinct from old.tenant_id
       and new.profile_id is not distinct from old.profile_id
       and exists (
         select 1 from public.tenants t
          where t.id = old.tenant_id and t.kind = 'chamber' and t.owner_profile_id = old.profile_id
       ) then
      return new;
    end if;
    if (to_jsonb(new) - v_personal) is distinct from (to_jsonb(old) - v_personal) then
      raise exception 'Your fee, schedule and status are set by the hospital — ask its admin to change them'
        using errcode = 'P0001';
    end if;
    return new;
  end if;

  if old.profile_id is null then
    return new;
  end if;

  if (new.name, new.specialty, new.education, new.bio, new.languages, new.expertise,
      new.experience_years, new.email, new.phone, new.photo_url, new.gender, new.bmdc_number)
     is distinct from
     (old.name, old.specialty, old.education, old.bio, old.languages, old.expertise,
      old.experience_years, old.email, old.phone, old.photo_url, old.gender, old.bmdc_number) then
    raise exception '% manages their own profile — they can change their personal details from the doctor portal', old.name
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. A doctor at no hospital takes their first chamber as their tenant.
--
-- Their token's tenant_id comes from profiles.tenant_id, and a doctor at no
-- hospital has none — so the portal, which reads it, would say "no hospital on
-- this account" in their own chamber. The guard lets a doctor point it at a
-- chamber they own, and at nothing else.

create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_super_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'profiles.role may only be changed by a super_admin';
  end if;

  if new.tenant_id is distinct from old.tenant_id and (select auth.uid()) is not null
     and not (
       old.role = 'doctor'
       and (select auth.uid()) = old.id
       and exists (
         select 1 from public.tenants t
          where t.id = new.tenant_id and t.kind = 'chamber' and t.owner_profile_id = old.id
       )
     ) then
    raise exception 'profiles.tenant_id may only be changed by a super_admin';
  end if;

  if new.is_active is distinct from old.is_active and (select auth.uid()) is not null then
    raise exception 'profiles.is_active may only be changed by a super_admin';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Who may manage a chamber: its doctor, or the super admin.

create or replace function public.chamber_caller_owner(p_profile_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.is_super_admin() then
    if p_profile_id is null then
      raise exception 'Pick the doctor this chamber belongs to' using errcode = 'P0001';
    end if;
    return p_profile_id;
  end if;

  if public.auth_role() is distinct from 'doctor' then
    raise exception 'Only a doctor or the super admin can manage a chamber' using errcode = '42501';
  end if;
  if p_profile_id is not null and p_profile_id <> (select auth.uid()) then
    raise exception 'A doctor can only manage their own chambers' using errcode = '42501';
  end if;
  return (select auth.uid());
end;
$$;

revoke execute on function public.chamber_caller_owner(uuid) from public, anon, authenticated;

-- The hours, checked as a week. Blank is "not set yet"; free text is refused —
-- booking holds a patient to these hours, and it can't read a sentence.
create or replace function public.chamber_hours(p_availability text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v jsonb;
begin
  if p_availability is null or btrim(p_availability) = '' then
    return null;
  end if;
  begin
    v := p_availability::jsonb;
  exception when others then
    raise exception 'The hours aren''t a weekly schedule' using errcode = 'P0001';
  end;
  if not public.is_operating_hours(v) then
    raise exception 'The hours aren''t a weekly schedule' using errcode = 'P0001';
  end if;
  return p_availability;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Open a chamber.

create or replace function public.create_chamber(
  p_name             text,
  p_address          text default null,
  p_location         text default null,
  p_division         text default null,
  p_district         text default null,
  p_subdistrict      text default null,
  p_phone            text default null,
  p_consultation_fee numeric default null,
  p_availability     text default null,
  p_profile_id       uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner  uuid := public.chamber_caller_owner(p_profile_id);
  v_name   text := btrim(coalesce(p_name, ''));
  v_hours  text := public.chamber_hours(p_availability);
  v_doctor text;
  v_tenant uuid;
begin
  if v_name = '' then
    raise exception 'Give the chamber a name' using errcode = 'P0001';
  end if;
  if p_consultation_fee is not null and p_consultation_fee < 0 then
    raise exception 'The fee can''t be negative' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.profiles where id = v_owner and role = 'doctor' and is_active) then
    raise exception 'A chamber needs a doctor with an active login — create their login first' using errcode = 'P0001';
  end if;

  -- Any name will do: doctors_pull_person replaces it, and the rest of the
  -- person's details, with theirs.
  select d.name into v_doctor
    from public.doctors d
   where d.profile_id = v_owner
   order by d.updated_at desc
   limit 1;
  if v_doctor is null then
    raise exception 'That login has no doctor profile' using errcode = 'P0001';
  end if;

  insert into public.tenants (name, slug, kind, owner_profile_id, status, address, location,
                              division, district, subdistrict, contact_phone)
  values (v_name, '', 'chamber', v_owner, 'approved', nullif(btrim(p_address), ''),
          nullif(btrim(p_location), ''), nullif(btrim(p_division), ''), nullif(btrim(p_district), ''),
          nullif(btrim(p_subdistrict), ''), nullif(btrim(p_phone), ''))
  returning id into v_tenant;

  insert into public.doctors (tenant_id, profile_id, name, slug, consultation_fee, availability, status)
  values (v_tenant, v_owner, v_doctor, '', p_consultation_fee, v_hours, 'active');

  -- A doctor at nowhere else works from here until a hospital adds them. One
  -- already at a hospital keeps what they had.
  update public.profiles
     set tenant_id = v_tenant, updated_at = now()
   where id = v_owner
     and tenant_id is null
     and not exists (
       select 1 from public.doctors
        where profile_id = v_owner and tenant_id is not null and tenant_id <> v_tenant
     );

  return v_tenant;
end;
$$;

comment on function public.create_chamber(text, text, text, text, text, text, text, numeric, text, uuid) is
  'Opens a doctor''s chamber (0088): the tenant, and their row at it with the fee and hours. The doctor for their own; the super admin for any doctor with a login.';

-- ---------------------------------------------------------------------------
-- 6. Change a chamber.

create or replace function public.update_chamber(
  p_tenant_id        uuid,
  p_name             text,
  p_address          text default null,
  p_location         text default null,
  p_division         text default null,
  p_district         text default null,
  p_subdistrict      text default null,
  p_phone            text default null,
  p_consultation_fee numeric default null,
  p_availability     text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_name  text := btrim(coalesce(p_name, ''));
  v_hours text := public.chamber_hours(p_availability);
begin
  select owner_profile_id into v_owner
    from public.tenants where id = p_tenant_id and kind = 'chamber';
  if v_owner is null or v_owner <> public.chamber_caller_owner(v_owner) then
    raise exception 'Chamber not found' using errcode = 'P0002';
  end if;
  if v_name = '' then
    raise exception 'Give the chamber a name' using errcode = 'P0001';
  end if;
  if p_consultation_fee is not null and p_consultation_fee < 0 then
    raise exception 'The fee can''t be negative' using errcode = 'P0001';
  end if;

  update public.tenants
     set name = v_name,
         address = nullif(btrim(p_address), ''),
         location = nullif(btrim(p_location), ''),
         division = nullif(btrim(p_division), ''),
         district = nullif(btrim(p_district), ''),
         subdistrict = nullif(btrim(p_subdistrict), ''),
         contact_phone = nullif(btrim(p_phone), '')
   where id = p_tenant_id;

  update public.doctors
     set consultation_fee = p_consultation_fee,
         availability = v_hours
   where tenant_id = p_tenant_id and profile_id = v_owner;

  return p_tenant_id;
end;
$$;

comment on function public.update_chamber(uuid, text, text, text, text, text, text, text, numeric, text) is
  'Changes a chamber''s details, fee and hours (0088). Its doctor or the super admin.';

-- ---------------------------------------------------------------------------
-- 7. Close or reopen a chamber.
--
-- Closing takes it off the public list, so no new bookings. What was booked
-- stays: those patients were told a time, and the doctor still sees them.

create or replace function public.set_chamber_open(p_tenant_id uuid, p_open boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select owner_profile_id into v_owner
    from public.tenants where id = p_tenant_id and kind = 'chamber';
  if v_owner is null or v_owner <> public.chamber_caller_owner(v_owner) then
    raise exception 'Chamber not found' using errcode = 'P0002';
  end if;

  -- The tenant only. doctors_public lists a doctor at an approved tenant, so
  -- this is what takes the chamber off it; the doctor's own row is left as it
  -- was, and reopening puts everything back as it stood.
  update public.tenants
     set status = case when p_open then 'approved' else 'suspended' end::public.tenant_status
   where id = p_tenant_id;

  return p_tenant_id;
end;
$$;

comment on function public.set_chamber_open(uuid, boolean) is
  'Closes a chamber to new bookings, or reopens it (0088). Its doctor or the super admin.';

-- A doctor sees their own chambers, including one opened a moment ago that
-- their token doesn't carry until it next refreshes.
create policy tenants_owner_select on public.tenants
  for select to authenticated
  using (owner_profile_id = (select auth.uid()));

revoke execute on function public.create_chamber(text, text, text, text, text, text, text, numeric, text, uuid) from public, anon;
revoke execute on function public.update_chamber(uuid, text, text, text, text, text, text, text, numeric, text) from public, anon;
revoke execute on function public.set_chamber_open(uuid, boolean) from public, anon;
grant execute on function public.create_chamber(text, text, text, text, text, text, text, numeric, text, uuid) to authenticated;
grant execute on function public.update_chamber(uuid, text, text, text, text, text, text, text, numeric, text) to authenticated;
grant execute on function public.set_chamber_open(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. The public hospital list is hospitals.
--
-- Same columns, same order and same security as 0054 — still no
-- security_invoker; see the note there. Only the filter is new.

create or replace view public.hospitals_public as
  select
    id,
    name,
    slug,
    tagline,
    location,
    division,
    district,
    subdistrict,
    address,
    logo_url,
    cover_image_url,
    specialties,
    facilities,
    opening_hours,
    summary,
    about,
    beds,
    doctor_count,
    founded_year,
    rating,
    reviews_count,
    contact_phone,
    contact_email,
    additional_phones,
    additional_emails,
    websites,
    social,
    created_at
  from public.tenants
  where status = 'approved'
    and kind = 'hospital';

-- ---------------------------------------------------------------------------
-- 9. Where a listed doctor practises: a hospital, a chamber, or neither.
--
-- As 0087, with `practice_kind` as the last column. A chamber is an approved
-- tenant, so a doctor with one is listed there and bookable, and their home
-- row stops showing — the same as when a hospital adds them.

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
  t.kind::text as practice_kind
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

-- ---------------------------------------------------------------------------
-- 10. "Works at" in a hospital's doctor search names hospitals only.
--
-- As 0085, with the hospital names filtered to hospitals. A chamber is not a
-- place another hospital needs to know about when adding a doctor.

create or replace function public.search_doctors_to_add(p_query text)
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

  v_like   := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  v_digits := regexp_replace(v_q, '\D', '', 'g');

  return query
  with with_login as (
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
           where x.profile_id = pe.profile_id and t.status = 'approved' and t.kind = 'hospital'
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

notify pgrst, 'reload schema';
