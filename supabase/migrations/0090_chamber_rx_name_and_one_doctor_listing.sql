-- 0090_chamber_rx_name_and_one_doctor_listing.sql
-- Two things about doctors and their chambers (0088).
--
-- 1. Whether a chamber's name prints on its prescriptions.
--
--    A doctor's chamber is often just where they sit — "Dr. Talha's Chamber",
--    or a room in a pharmacy — and they would rather the pad carry their own
--    name alone. `tenants.prescription_shows_name` says whether the name
--    prints; the address and phone always do, since a patient needs to find
--    and call the place. Default true, so nothing changes until someone turns
--    it off. The chamber functions take it; they are dropped and recreated
--    because their parameter lists grow.
--
-- 2. One public listing per doctor.
--
--    doctors_public is one row per doctors row, so a doctor at a hospital and
--    at their chamber showed as two cards, each with its own page and URL.
--    `person_slug` names the person: the same value on every row of one login
--    — the slug of their oldest row at a hospital or chamber, or of their home
--    row (0081) when they have neither — and the row's own slug for a doctor
--    with no login, who is only ever one row. The site groups by it: one
--    card, one page at /doctors/<person_slug>, listing every place they
--    practise. Each row's own slug still opens that page.
--
--    A home row's slug was made from the name as first typed; a hospital or
--    chamber row's is newer and nearer the name they go by, so those lead.

-- ---------------------------------------------------------------------------
-- 1.

alter table public.tenants
  add column prescription_shows_name boolean not null default true;

comment on column public.tenants.prescription_shows_name is
  'Whether the tenant''s name prints on prescriptions (0090). A chamber''s doctor can turn it off; the address and phone always print.';

drop function if exists public.create_chamber(text, text, text, text, text, text, text, numeric, text, uuid);
drop function if exists public.update_chamber(uuid, text, text, text, text, text, text, text, numeric, text);

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
  p_show_name        boolean default true
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
                              division, district, subdistrict, contact_phone, prescription_shows_name)
  values (v_name, '', 'chamber', v_owner, 'approved', nullif(btrim(p_address), ''),
          nullif(btrim(p_location), ''), nullif(btrim(p_division), ''), nullif(btrim(p_district), ''),
          nullif(btrim(p_subdistrict), ''), nullif(btrim(p_phone), ''), coalesce(p_show_name, true))
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
  'Opens a doctor''s chamber (0088, 0090): the tenant, and their row at it with the fee and hours. The doctor for their own; the super admin for any doctor with a login.';

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
  p_show_name        boolean default null
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
         contact_phone = nullif(btrim(p_phone), ''),
         -- Null leaves it as it is.
         prescription_shows_name = coalesce(p_show_name, prescription_shows_name)
   where id = p_tenant_id;

  update public.doctors
     set consultation_fee = p_consultation_fee,
         availability = v_hours
   where tenant_id = p_tenant_id and profile_id = v_owner;

  return p_tenant_id;
end;
$$;

comment on function public.update_chamber(uuid, text, text, text, text, text, text, text, numeric, text, boolean) is
  'Changes a chamber''s details, fee, hours and whether its name prints on prescriptions (0088, 0090). Its doctor or the super admin.';

revoke execute on function public.create_chamber(text, text, text, text, text, text, text, numeric, text, uuid, boolean) from public, anon;
revoke execute on function public.update_chamber(uuid, text, text, text, text, text, text, text, numeric, text, boolean) from public, anon;
grant execute on function public.create_chamber(text, text, text, text, text, text, text, numeric, text, uuid, boolean) to authenticated;
grant execute on function public.update_chamber(uuid, text, text, text, text, text, text, text, numeric, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. As 0089, with person_slug as the last column.

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
  t.contact_phone as practice_phone,
  case
    when d.profile_id is null then d.slug
    else (
      select x.slug
      from public.doctors x
      where x.profile_id = d.profile_id
      order by (x.tenant_id is null), x.created_at, x.id
      limit 1
    )
  end as person_slug
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

notify pgrst, 'reload schema';
