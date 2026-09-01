-- 0055_roles_tenant.sql
-- A custom role now belongs to a hospital.
--
-- `public.roles` holds two kinds of row (0009). The eight system rows mirror
-- the app_role enum: they are the auth layer, they exist once for the whole
-- platform, and every hospital's staff is made of them. A custom row is
-- something else entirely — "Ward Manager", "Night Duty Officer" — a page
-- grant template one hospital asked for. Kept platform-wide it showed up on
-- every other hospital's permission matrix and read as a role they could use.
--
-- So custom roles get a tenant, system roles keep none, and the check below
-- makes those the only two shapes a row can have.

alter table public.roles
  add column tenant_id uuid references public.tenants (id) on delete cascade;

-- Cascade, because a custom role is only meaningful to the hospital that asked
-- for it: nothing outside that hospital references it, and a role left behind
-- by a deleted hospital is a template nobody can explain.

-- The eight seeded rows stay global, which is what `is_system` already means.
-- No backfill: there are no custom rows yet, and none can be created without a
-- hospital from here on.
alter table public.roles
  add constraint roles_tenant_check
  check (case when is_system then tenant_id is null else tenant_id is not null end);

comment on column public.roles.tenant_id is
  'The hospital a custom role belongs to. Null on the eight system roles, which are platform-wide.';

create index roles_tenant_id_idx on public.roles (tenant_id);

-- One "Ward Manager" per hospital. Case-insensitive because the duplicate
-- people actually create is "Ward manager", and two rows a super admin cannot
-- tell apart are two rows nobody can maintain. Partial, so it never touches
-- the system rows.
create unique index roles_tenant_label_key
  on public.roles (tenant_id, lower(label))
  where tenant_id is not null;

-- ------------------------------------------------------------------ rls ---
-- Read was `using (true)`: every signed-in user could list every role. That
-- was defensible while a role described the platform. Now that a row can name
-- one hospital's internal job titles, it is not — so a hospital sees the
-- system roles, which it is made of, plus its own.
--
-- Writes are untouched: super_admin only, as in 0002.

drop policy roles_select on public.roles;

create policy roles_select on public.roles
  for select to authenticated
  using (
    tenant_id is null
    or public.is_super_admin()
    or tenant_id = public.auth_tenant_id()
  );
