-- 0001_core_schema.sql
-- Core multi-tenant foundation: packages, tenants, roles, profiles.
--
-- RLS policies live in 0002, the JWT claims hook in 0003 — this file only
-- defines shape.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums ---

create type public.app_role as enum (
  'super_admin',
  'hospital_admin',
  'hr_admin',
  'finance_admin',
  'lab_admin',
  'pharmacy_admin',
  'doctor',
  'patient'
);

create type public.tenant_status as enum (
  'pending',    -- submitted, sitting in the onboarding queue
  'active',
  'suspended'
);

-- ---------------------------------------------------------------- utils ---

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------- packages ---
-- Platform-wide subscription tiers. Not tenant-scoped: super_admin owns these.

create table public.packages (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  price_monthly numeric(10,2) not null default 0,
  max_users     integer,
  features      jsonb not null default '{}'::jsonb,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger packages_set_updated_at
  before update on public.packages
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------- tenants ---
-- One row per hospital. `tenants.id` is the tenant_id every other table
-- carries, so this table is scoped by `id`, not by a `tenant_id` column.

create table public.tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  status        public.tenant_status not null default 'pending',
  package_id    uuid references public.packages(id) on delete set null,
  contact_email text,
  contact_phone text,
  address       text,
  logo_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tenants_status_idx     on public.tenants (status);
create index tenants_package_id_idx on public.tenants (package_id);

create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- roles ---
-- Metadata + permission matrix behind /super/roles. The enum above is the
-- source of truth for *which* roles exist; this table describes them.

create table public.roles (
  role        public.app_role primary key,
  label       text not null,
  description text,
  permissions jsonb not null default '{}'::jsonb,
  is_system   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger roles_set_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

insert into public.roles (role, label, description) values
  ('super_admin',     'Super Admin',     'Platform owner. Full access across every hospital.'),
  ('hospital_admin',  'Hospital Admin',  'Full access within one hospital.'),
  ('hr_admin',        'HR Admin',        'HR, employees, attendance, payroll for one hospital.'),
  ('finance_admin',   'Finance Admin',   'Accounts, invoices, billing for one hospital.'),
  ('lab_admin',       'Lab Admin',       'Lab orders and results for one hospital.'),
  ('pharmacy_admin',  'Pharmacy Admin',  'Pharmacy inventory and dispensing for one hospital.'),
  ('doctor',          'Doctor',          'Own schedule, patient queue, prescriptions.'),
  ('patient',         'Patient',         'Own appointments, records and prescriptions.');

-- ------------------------------------------------------------- profiles ---
-- Maps auth.users -> role + tenant_id. Read by the access-token hook (0003)
-- on every login, so keep it narrow and indexed.

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  tenant_id  uuid references public.tenants (id) on delete cascade,
  role       public.app_role not null default 'patient',
  full_name  text,
  email      text,
  phone      text,
  avatar_url text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- super_admin is platform-level and belongs to no hospital.
  -- patients are allowed to exist before choosing one (public signup).
  -- every staff role must be bound to exactly one hospital.
  constraint profiles_tenant_scope check (
    case role
      when 'super_admin' then tenant_id is null
      when 'patient'     then true
      else tenant_id is not null
    end
  )
);

create index profiles_tenant_id_idx on public.profiles (tenant_id);
create index profiles_role_idx      on public.profiles (role);
create index profiles_tenant_role_idx on public.profiles (tenant_id, role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
