-- 0009_roles_management.sql
-- Makes public.roles serve /super/roles.
--
-- 0001 created this table keyed by the app_role enum, which is right for the
-- eight roles the auth layer knows about but leaves two gaps the Role
-- Management screen needs closing:
--
--   1. createResourceRoute addresses every row by an `id` column. An enum
--      primary key means PATCH /api/v1/roles/:id can never match.
--   2. The screen stores a page-access matrix and a scope. Neither exists.
--
-- So: `id` becomes the key, `role` becomes a nullable unique link back to the
-- enum, and the two missing columns are added.
--
-- Nothing references roles.role by foreign key (profiles.role is the enum
-- type, not a reference to this table), so moving the key is safe.

-- --------------------------------------------------------------- shape ---

-- Fills every existing row before the column carries the key.
alter table public.roles
  add column id uuid not null default gen_random_uuid();

alter table public.roles drop constraint roles_pkey;
alter table public.roles add primary key (id);

-- A row with role = null is a custom role: it exists, it carries page grants,
-- but no user can hold it until app_role gains a matching value. Postgres
-- allows many nulls under a unique constraint, so custom roles do not collide.
alter table public.roles alter column role drop not null;
alter table public.roles add constraint roles_role_key unique (role);

-- Which layer of the product a role operates at. Drives grouping in the UI;
-- it does not grant anything on its own.
alter table public.roles
  add column scope text not null default 'Tenant'
  constraint roles_scope_check check (scope in ('Platform', 'Tenant', 'Clinical', 'Self'));

-- Panel paths this role may open, e.g. {'/admin/dashboard','/admin/payroll'}.
-- Paths are stored raw rather than as a foreign key: the page catalogue lives
-- in the frontend (src/data/rolePages.ts) and changes with every release, so a
-- constraint here would block deploys rather than catch mistakes.
alter table public.roles
  add column pages text[] not null default '{}'::text[];

-- A system role is one the auth enum depends on. Deleting it would leave
-- profiles carrying a role with no description, so it is blocked below.
--
-- 0001 defaulted this to true because the only rows were the eight seeded
-- ones. Every row inserted from here on arrives through the API and is custom,
-- so the default flips — otherwise each new role would inherit the protection
-- that makes it undeletable.
alter table public.roles alter column is_system set default false;

comment on column public.roles.is_system is
  'True for the eight app_role values. System roles cannot be deleted or have their role/is_system changed.';

-- --------------------------------------------------------------- seed ---
-- Scope and default page grants for the eight system roles. These mirror
-- DEFAULT_ROLES in src/data/rolePages.ts, which is what the screen showed
-- while it ran on localStorage.

update public.roles set scope = 'Platform' where role = 'super_admin';
update public.roles set scope = 'Clinical' where role = 'doctor';
update public.roles set scope = 'Self'     where role = 'patient';
-- the four *_admin roles keep the 'Tenant' default

update public.roles set pages = array[
  '/super/dashboard', '/super/hospitals', '/super/roles', '/super/logs',
  '/super/packages', '/super/global-settings', '/super/whitelisting',
  '/super/cms', '/super/billing', '/super/integrations', '/super/settings',
  '/super/onboarding', '/super/announcements', '/super/tickets'
] where role = 'super_admin';

update public.roles set pages = array[
  '/admin/dashboard', '/admin/doctors', '/admin/doctor-assistants',
  '/admin/nurses', '/admin/support-staff', '/admin/wards', '/admin/lab',
  '/admin/pharmacy', '/admin/hospital-profile', '/admin/reports', '/admin/hr',
  '/admin/onboarding', '/admin/payroll', '/admin/personal-files',
  '/admin/attendance', '/admin/assets', '/admin/procurement',
  '/admin/administration', '/admin/finance', '/admin/accounts',
  '/admin/vendors', '/admin/patients', '/admin/appointments',
  '/admin/notifications', '/admin/settings'
] where role = 'hospital_admin';

update public.roles set pages = array[
  '/admin/dashboard', '/admin/hr', '/admin/onboarding', '/admin/personal-files',
  '/admin/attendance', '/admin/payroll', '/admin/nurses', '/admin/support-staff',
  '/admin/doctor-assistants'
] where role = 'hr_admin';

update public.roles set pages = array[
  '/admin/dashboard', '/admin/finance', '/admin/accounts', '/admin/payroll',
  '/admin/procurement', '/admin/vendors', '/admin/reports'
] where role = 'finance_admin';

update public.roles set pages = array[
  '/admin/dashboard', '/admin/lab', '/admin/reports'
] where role = 'lab_admin';

update public.roles set pages = array[
  '/admin/dashboard', '/admin/pharmacy', '/admin/procurement', '/admin/vendors'
] where role = 'pharmacy_admin';

update public.roles set pages = array[
  '/portal/schedule', '/portal/queue', '/portal/prescription', '/portal/directory'
] where role = 'doctor';

update public.roles set pages = array[
  '/patient/dashboard', '/patient/appointments', '/patient/find-doctors',
  '/patient/medical-records', '/patient/billing', '/patient/profile',
  '/patient/tutorial'
] where role = 'patient';

-- -------------------------------------------------------------- guards ---
-- RLS (0002) already limits writes to super_admin. These guard the one
-- super_admin mistake that cannot be undone from the UI: dropping a role the
-- auth enum still hands out.

create or replace function public.roles_protect_system()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      raise exception 'roles: % is a system role and cannot be deleted', old.role;
    end if;
    return old;
  end if;

  -- Re-pointing a system row at another enum value, or laundering it into a
  -- custom row to get around the delete guard.
  if old.is_system then
    if new.role is distinct from old.role then
      raise exception 'roles: the role of a system role cannot be changed';
    end if;
    if new.is_system is distinct from old.is_system then
      raise exception 'roles: a system role cannot be turned into a custom role';
    end if;
  end if;

  return new;
end;
$$;

create trigger roles_protect_system
  before update or delete on public.roles
  for each row execute function public.roles_protect_system();

-- A custom role must not claim to be a system one, which would grant it the
-- protection above and let it survive as an undeletable row.
create or replace function public.roles_reject_forged_system()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_system then
    raise exception 'roles: is_system is reserved for the app_role enum';
  end if;
  return new;
end;
$$;

create trigger roles_reject_forged_system
  before insert on public.roles
  for each row execute function public.roles_reject_forged_system();
