-- 0091_nameless_chambers_and_walk_in_moves.sql
-- A chamber may have no name, and a walk-in can be moved to another of the
-- doctor's places.
--
-- 1. A chamber with no name.
--
--    0090 asked whether a chamber's name printed on prescriptions. That was
--    the wrong question. Many chambers have no name at all: the doctor sits
--    there, and patients know them by their own name. So the switch is whether
--    the chamber HAS a name — `tenants.has_name`, renamed from 0090's column,
--    same default (true), same values.
--
--    A nameless chamber still needs a `tenants.name`: queues, bookings,
--    invoices and every list label a place by it. It is made from the doctor
--    and the area — "Dr. Rahman's Chamber, Uttara" — and made again whenever
--    the chamber is saved. On a prescription it prints no name at all: the
--    address and phone head the pad, under the doctor's own name.
--
-- 2. Which visits are walk-ins.
--
--    A patient who booked chose where they would be seen. A walk-in didn't:
--    the doctor put them in a queue at whichever place was picked, and the
--    doctor may be sitting somewhere else. `appointments.walk_in` says which is
--    which. The queue sets it; everything booked before now stays false, which
--    is right — they were not marked, so they are not moved.
--
-- 3. move_walk_in: the doctor refiles a walk-in at another of their places.
--
--    The visit moves with its doctor row and its patient record: the patient's
--    record at the new place is found by login, then phone, or copied across.
--    A record at the old place made for this walk-in alone — nothing else
--    points at it — is removed, so that place isn't left with a patient who
--    never came. Only a walk-in, only one still scheduled, only by its doctor,
--    and only to a place that doctor works at.

-- ---------------------------------------------------------------------------
-- 1.

alter table public.tenants rename column prescription_shows_name to has_name;

comment on column public.tenants.has_name is
  'Whether the place has a name of its own (0091). A doctor''s chamber may not: its name is then made from the doctor and the area, and none prints on prescriptions.';

-- "Dr. Rahman's Chamber, Uttara" — for a chamber with no name.
create or replace function public.chamber_made_name(p_doctor text, p_location text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(coalesce(p_doctor, 'Doctor')) || '''s Chamber'
         || coalesce(', ' || nullif(btrim(p_location), ''), '')
$$;

drop function if exists public.create_chamber(text, text, text, text, text, text, text, numeric, text, uuid, boolean);
drop function if exists public.update_chamber(uuid, text, text, text, text, text, text, text, numeric, text, boolean);

create function public.create_chamber(
  p_name             text,
  p_address          text default null,
  p_location         text default null,
  p_division         text default null,
  p_district         text default null,
  p_subdistrict      text default null,
  p_phone            text default null,
  p_consultation_fee numeric default null,
  p_availability     text default null,
  p_profile_id       uuid default null,
  p_has_name         boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner    uuid := public.chamber_caller_owner(p_profile_id);
  v_has_name boolean := coalesce(p_has_name, true);
  v_name     text := btrim(coalesce(p_name, ''));
  v_hours    text := public.chamber_hours(p_availability);
  v_doctor   text;
  v_tenant   uuid;
begin
  if v_has_name and v_name = '' then
    raise exception 'Give the chamber a name, or turn off "has a name"' using errcode = 'P0001';
  end if;
  if p_consultation_fee is not null and p_consultation_fee < 0 then
    raise exception 'The fee can''t be negative' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.profiles where id = v_owner and role = 'doctor' and is_active) then
    raise exception 'A chamber needs a doctor with an active login — create their login first' using errcode = 'P0001';
  end if;

  -- Their name, from their most recently edited row. doctors_pull_person puts
  -- the rest of their details on the new row.
  select d.name into v_doctor
    from public.doctors d
   where d.profile_id = v_owner
   order by d.updated_at desc
   limit 1;
  if v_doctor is null then
    raise exception 'That login has no doctor profile' using errcode = 'P0001';
  end if;

  if not v_has_name then
    v_name := public.chamber_made_name(v_doctor, p_location);
  end if;

  insert into public.tenants (name, slug, kind, owner_profile_id, status, address, location,
                              division, district, subdistrict, contact_phone, has_name)
  values (v_name, '', 'chamber', v_owner, 'approved', nullif(btrim(p_address), ''),
          nullif(btrim(p_location), ''), nullif(btrim(p_division), ''), nullif(btrim(p_district), ''),
          nullif(btrim(p_subdistrict), ''), nullif(btrim(p_phone), ''), v_has_name)
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

comment on function public.create_chamber(text, text, text, text, text, text, text, numeric, text, uuid, boolean) is
  'Opens a doctor''s chamber (0088, 0091): the tenant, and their row at it with the fee and hours. A chamber with no name is named from the doctor and the area. The doctor for their own; the super admin for any doctor with a login.';

create function public.update_chamber(
  p_tenant_id        uuid,
  p_name             text,
  p_address          text default null,
  p_location         text default null,
  p_division         text default null,
  p_district         text default null,
  p_subdistrict      text default null,
  p_phone            text default null,
  p_consultation_fee numeric default null,
  p_availability     text default null,
  p_has_name         boolean default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner    uuid;
  v_had_name boolean;
  v_has_name boolean;
  v_name     text := btrim(coalesce(p_name, ''));
  v_hours    text := public.chamber_hours(p_availability);
  v_doctor   text;
begin
  select owner_profile_id, has_name into v_owner, v_had_name
    from public.tenants where id = p_tenant_id and kind = 'chamber';
  if v_owner is null or v_owner <> public.chamber_caller_owner(v_owner) then
    raise exception 'Chamber not found' using errcode = 'P0002';
  end if;

  -- Null leaves it as it is.
  v_has_name := coalesce(p_has_name, v_had_name);
  if v_has_name and v_name = '' then
    raise exception 'Give the chamber a name, or turn off "has a name"' using errcode = 'P0001';
  end if;
  if p_consultation_fee is not null and p_consultation_fee < 0 then
    raise exception 'The fee can''t be negative' using errcode = 'P0001';
  end if;

  if not v_has_name then
    select d.name into v_doctor
      from public.doctors d
     where d.tenant_id = p_tenant_id and d.profile_id = v_owner;
    v_name := public.chamber_made_name(v_doctor, p_location);
  end if;

  update public.tenants
     set name = v_name,
         has_name = v_has_name,
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

comment on function public.update_chamber(uuid, text, text, text, text, text, text, text, numeric, text, boolean) is
  'Changes a chamber''s details, fee, hours and whether it has a name (0088, 0091). Its doctor or the super admin.';

revoke execute on function public.create_chamber(text, text, text, text, text, text, text, numeric, text, uuid, boolean) from public, anon;
revoke execute on function public.update_chamber(uuid, text, text, text, text, text, text, text, numeric, text, boolean) from public, anon;
grant execute on function public.create_chamber(text, text, text, text, text, text, text, numeric, text, uuid, boolean) to authenticated;
grant execute on function public.update_chamber(uuid, text, text, text, text, text, text, text, numeric, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 2.

alter table public.appointments
  add column walk_in boolean not null default false;

comment on column public.appointments.walk_in is
  'Added from the doctor''s queue as a walk-in (0091), not booked. Only a walk-in can be moved to another of the doctor''s places.';

-- ---------------------------------------------------------------------------
-- 3.

create or replace function public.move_walk_in(p_appointment_id uuid, p_tenant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  a           public.appointments;
  v_patient   public.patients;
  v_doctor_to uuid;
  v_patient_to uuid;
begin
  if public.auth_role() is distinct from 'doctor' then
    raise exception 'Only the doctor can move their walk-in' using errcode = '42501';
  end if;

  select * into a from public.appointments where id = p_appointment_id for update;
  -- Not found and not theirs read the same.
  if not found or not exists (
    select 1 from public.doctors where id = a.doctor_id and profile_id = (select auth.uid())
  ) then
    raise exception 'Visit not found' using errcode = 'P0002';
  end if;

  if not a.walk_in then
    raise exception 'A booked visit stays where the patient booked it' using errcode = 'P0001';
  end if;
  if a.status <> 'scheduled' then
    raise exception 'This visit is finished — it stays where it was seen' using errcode = 'P0001';
  end if;
  if a.tenant_id = p_tenant_id then
    return a.id;
  end if;

  select id into v_doctor_to
    from public.doctors
   where tenant_id = p_tenant_id and profile_id = (select auth.uid()) and status = 'active';
  if v_doctor_to is null then
    raise exception 'That isn''t one of your hospitals or chambers' using errcode = 'P0001';
  end if;

  -- The same person at the new place: by their login, then by phone.
  select * into v_patient from public.patients where id = a.patient_id;
  select p.id into v_patient_to
    from public.patients p
   where p.tenant_id = p_tenant_id
     and ((v_patient.profile_id is not null and p.profile_id = v_patient.profile_id)
       or (coalesce(v_patient.phone, '') <> '' and p.phone = v_patient.phone))
   order by (p.profile_id is not distinct from v_patient.profile_id) desc, p.created_at
   limit 1;

  -- New there: their record, copied. "" asks patients_set_mrn for a number
  -- at the new place.
  if v_patient_to is null then
    insert into public.patients
    select (jsonb_populate_record(null::public.patients, to_jsonb(v_patient) || jsonb_build_object(
      'id', gen_random_uuid(), 'tenant_id', p_tenant_id, 'mrn', '',
      'created_at', now(), 'updated_at', now()
    ))).*
    returning id into v_patient_to;
  end if;

  update public.appointments
     set tenant_id = p_tenant_id, doctor_id = v_doctor_to, patient_id = v_patient_to
   where id = a.id;

  -- The old record, when it was made for this walk-in and nothing else uses
  -- it: no login, created with the visit, and no visit, stay, lab order,
  -- invoice or certificate of its own.
  if v_patient.profile_id is null
     and v_patient.created_at >= a.created_at - interval '1 minute'
     and not exists (select 1 from public.appointments where patient_id = v_patient.id)
     and not exists (select 1 from public.admissions where patient_id = v_patient.id)
     and not exists (select 1 from public.lab_orders where patient_id = v_patient.id)
     and not exists (select 1 from public.finance_invoices where patient_id = v_patient.id)
     and not exists (select 1 from public.certificates where patient_id = v_patient.id) then
    delete from public.patients where id = v_patient.id;
  end if;

  return a.id;
end;
$$;

comment on function public.move_walk_in(uuid, uuid) is
  'Moves a still-scheduled walk-in to another of the calling doctor''s hospitals or chambers (0091), with its patient record.';

revoke execute on function public.move_walk_in(uuid, uuid) from public, anon;
grant execute on function public.move_walk_in(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
