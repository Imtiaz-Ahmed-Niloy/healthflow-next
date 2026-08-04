-- 0005_doctors.sql
-- First module built on the template. Every other module copies this file's
-- shape: table -> indexes -> updated_at trigger -> apply_tenant_rls().
--
-- Fields are derived from the existing admin UI (src/pages/admin/Doctors.tsx)
-- since the field inventory is still in progress. Reconcile when it lands.

create type public.doctor_status as enum ('active', 'on_leave', 'suspended');

create table public.doctors (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,

  -- Set once the doctor has a login. Null for directory-only records, which
  -- is the normal state until Azad's provisioning lands.
  profile_id uuid references public.profiles (id) on delete set null,

  name       text not null,
  slug       text not null,
  specialty  text,
  education  text,
  bio        text,

  -- Comma-separated, matching the existing admin form exactly. Arrays would
  -- model this better, but ResourcePage submits every field as a string and
  -- the point of the template is that a module needs no bespoke glue.
  languages  text,
  expertise  text,

  experience_years              integer check (experience_years >= 0),
  rating                        numeric(2, 1) check (rating >= 0 and rating <= 5),
  consultation_fee              numeric(10, 2) check (consultation_fee >= 0),
  patients_treated              integer check (patients_treated >= 0),
  consultation_duration_minutes integer check (consultation_duration_minutes > 0),

  availability text,
  email        text,
  phone        text,
  photo_url    text,

  status     public.doctor_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Slugs only need to be unique within a hospital: two hospitals may both
  -- employ a Dr Rahman.
  constraint doctors_tenant_slug_unique unique (tenant_id, slug)
);

create index doctors_tenant_id_idx  on public.doctors (tenant_id);
create index doctors_status_idx     on public.doctors (tenant_id, status);
create index doctors_specialty_idx  on public.doctors (tenant_id, specialty);
create index doctors_profile_id_idx on public.doctors (profile_id);

create trigger doctors_set_updated_at
  before update on public.doctors
  for each row execute function public.set_updated_at();

-- Slug is derived, not entered. Doing it in the database keeps the resource
-- factory generic — it has no notion of computed columns, and adding one for
-- a single module would be the wrong trade.
create or replace function public.doctors_set_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := btrim(regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g'), '-');

    if new.slug = '' then
      new.slug := 'doctor';
    end if;

    -- Disambiguates the two Dr Rahmans working at the same hospital.
    new.slug := new.slug || '-' || substr(new.id::text, 1, 8);
  end if;

  return new;
end;
$$;

create trigger doctors_set_slug
  before insert on public.doctors
  for each row execute function public.doctors_set_slug();

-- The whole security story for this table, in one line.
select public.apply_tenant_rls('public.doctors');
