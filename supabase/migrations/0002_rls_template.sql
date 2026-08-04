-- 0002_rls_template.sql
-- The one reviewed RLS template every hospital-scoped table copies, plus the
-- claim readers it depends on, plus policies for the core tables.
--
-- Every table's policy comes from one reviewed template. Rather than
-- copy-pasting SQL per module and hoping it stays identical, a module calls:
--
--     select public.apply_tenant_rls('public.doctors');
--
-- One definition, applied by name. Fixing the template fixes every table.

-- ------------------------------------------------------- claim readers ---
-- These read the JWT written by the access-token hook (0003). No table
-- access, so no recursion risk when called from inside a policy.

create or replace function public.auth_role()
returns public.app_role
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'user_role', '')::public.app_role
$$;

create or replace function public.auth_tenant_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'tenant_id', '')::uuid
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.auth_role() = 'super_admin', false)
$$;

-- --------------------------------------------------------- the template ---
-- Standard four policies for a table carrying `tenant_id`:
--   super_admin sees everything; everyone else sees only their own hospital.
-- Modules needing something tighter (e.g. a doctor seeing only their own
-- patients) layer an additional restrictive policy on top — they do not
-- edit these.

create or replace function public.apply_tenant_rls(p_table regclass)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_table text := p_table::text;
  v_scope text := 'public.is_super_admin() or tenant_id = public.auth_tenant_id()';
begin
  if not exists (
    select 1
    from pg_catalog.pg_attribute
    where attrelid = p_table
      and attname  = 'tenant_id'
      and not attisdropped
      and attnum > 0
  ) then
    raise exception
      'apply_tenant_rls: table % has no tenant_id column', v_table;
  end if;

  execute format('alter table %s enable row level security', v_table);

  execute format('drop policy if exists tenant_select on %s', v_table);
  execute format(
    'create policy tenant_select on %s for select to authenticated using (%s)',
    v_table, v_scope);

  execute format('drop policy if exists tenant_insert on %s', v_table);
  execute format(
    'create policy tenant_insert on %s for insert to authenticated with check (%s)',
    v_table, v_scope);

  execute format('drop policy if exists tenant_update on %s', v_table);
  execute format(
    'create policy tenant_update on %s for update to authenticated using (%s) with check (%s)',
    v_table, v_scope, v_scope);

  execute format('drop policy if exists tenant_delete on %s', v_table);
  execute format(
    'create policy tenant_delete on %s for delete to authenticated using (%s)',
    v_table, v_scope);
end;
$fn$;

comment on function public.apply_tenant_rls(regclass) is
  'Applies the standard tenant-isolation RLS policy set to a table with a tenant_id column. See supabase/migrations/0002_rls_template.sql.';

-- ------------------------------------------------ core table policies ---
-- The core tables are not plain tenant-scoped rows, so they get hand-written
-- policies rather than the template.

-- packages: everyone signed in can read the catalogue; only super_admin writes.
alter table public.packages enable row level security;

create policy packages_select on public.packages
  for select to authenticated
  using (true);

create policy packages_write on public.packages
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- roles: readable by any signed-in user (the UI renders permission matrices);
-- only super_admin edits.
alter table public.roles enable row level security;

create policy roles_select on public.roles
  for select to authenticated
  using (true);

create policy roles_write on public.roles
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- tenants: scoped by `id`, not `tenant_id`, so the template does not apply.
-- A member reads their own hospital. Only super_admin creates or deletes;
-- a hospital_admin may edit their own hospital's profile.
alter table public.tenants enable row level security;

create policy tenants_select on public.tenants
  for select to authenticated
  using (public.is_super_admin() or id = public.auth_tenant_id());

create policy tenants_insert on public.tenants
  for insert to authenticated
  with check (public.is_super_admin());

create policy tenants_update on public.tenants
  for update to authenticated
  using (
    public.is_super_admin()
    or (id = public.auth_tenant_id() and public.auth_role() = 'hospital_admin')
  )
  with check (
    public.is_super_admin()
    or (id = public.auth_tenant_id() and public.auth_role() = 'hospital_admin')
  );

create policy tenants_delete on public.tenants
  for delete to authenticated
  using (public.is_super_admin());

-- profiles: a user always sees themselves; staff see co-workers in the same
-- hospital; super_admin sees everyone.
--
-- Deliberately NO insert/delete policy for `authenticated` — provisioning
-- runs through the service-role client (Azad, Week 2), which bypasses RLS.
-- Nothing in the browser may mint or destroy a profile.
alter table public.profiles enable row level security;

create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_tenant on public.profiles
  for select to authenticated
  using (
    public.is_super_admin()
    or (tenant_id is not null and tenant_id = public.auth_tenant_id())
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_super_admin())
  with check (id = (select auth.uid()) or public.is_super_admin());

-- A self-update policy alone would let a patient PATCH their own row to
-- role='super_admin'. Guard the privileged columns in a trigger instead of a
-- policy subquery, which would recurse against profiles' own RLS.
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

  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'profiles.tenant_id may only be changed by a super_admin';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();
