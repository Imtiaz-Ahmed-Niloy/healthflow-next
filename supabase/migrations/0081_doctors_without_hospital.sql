-- 0081_doctors_without_hospital.sql
-- A doctor can be on HealthFlow before any hospital has them.
--
-- 0077 made a doctor one person with a `doctors` row at each hospital they
-- work at — so a doctor existed only once a hospital added them. A super admin
-- adding a doctor had to pick a hospital, even for a consultant who is not yet
-- attached anywhere.
--
-- Now a doctor may have one HOME row: a `doctors` row with no hospital. It
-- holds the person — name, specialty, BMDC number, photo — and, once they have
-- a login, is theirs to edit like any other of their rows. It is not a job:
--
--   - it grants no hospital: the token's tenant_ids ignore it, so it opens no
--     hospital's data;
--   - it is not a directory listing: doctors_public joins tenants, so it never
--     reaches the public site or a patient's Find Doctors;
--   - it is never "the doctor" at work: auth_doctor_id() prefers a hospital row.
--
-- When a hospital later adds them — matched by email or BMDC in
-- /api/v1/doctors/:id/login — their login is linked and 0077's pull trigger
-- copies their details onto the hospital's row. The home row stays: it is where
-- the super admin keeps the password it issued, and it keeps the person on
-- HealthFlow if they later leave every hospital.

alter table public.doctors alter column tenant_id drop not null;

comment on column public.doctors.tenant_id is
  'The hospital this row is the doctor AT. Null for a doctor''s home row (0081): the person, with no hospital — created by a super admin, readable by the doctor, granting nothing.';

-- One home per person.
create unique index doctors_home_profile_key
  on public.doctors (profile_id)
  where tenant_id is null and profile_id is not null;

-- The password a super admin issued for a doctor with no hospital is filed
-- against the home row, which has no hospital to file it under.
alter table public.doctor_login_secrets alter column tenant_id drop not null;

-- ---------------------------------------------------------------- RLS ---
-- The tenant policies read `tenant_id = any(auth_tenant_ids())`, which is
-- never true for a null, so a home row is visible only to a super admin. The
-- doctor must see and edit their own. Permissive, so these OR with the tenant
-- policies; the 0078 restrictive gates still apply on top, and 0078's
-- doctors_guard_person still limits a doctor to their personal details — they
-- cannot give their home row a hospital, a fee or a status.
--
-- Nobody but a super admin can create a home row: tenant_insert needs the
-- row's hospital in the caller's token, or is_super_admin().

create policy doctors_self_select on public.doctors
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy doctors_self_update on public.doctors
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- ------------------------------------------------------- the token ---
-- Only hospital rows put a hospital in the token. An array_agg over a home
-- row's null would otherwise hand every policy a null to compare with.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_user       uuid := (event ->> 'user_id')::uuid;
  v_claims     jsonb;
  v_role       public.app_role;
  v_tenant_id  uuid;
  v_is_active  boolean;
  v_tenant_ids uuid[];
begin
  select p.role, p.tenant_id, p.is_active
    into v_role, v_tenant_id, v_is_active
  from public.profiles p
  where p.id = v_user;

  -- Deactivated is the same as absent: no role, no hospital (0038).
  if not coalesce(v_is_active, true) then
    v_role      := null;
    v_tenant_id := null;
  end if;

  -- The hospitals this person may act in. A doctor: every hospital with a
  -- doctors row on their login, plus their main one — not their home row,
  -- which has no hospital (0081). Anyone else: their one.
  if v_role = 'doctor' then
    select coalesce(array_agg(distinct t), '{}'::uuid[])
      into v_tenant_ids
      from (
        select v_tenant_id as t where v_tenant_id is not null
        union
        select d.tenant_id from public.doctors d where d.profile_id = v_user and d.tenant_id is not null
      ) s;
  elsif v_tenant_id is not null then
    v_tenant_ids := array[v_tenant_id];
  else
    v_tenant_ids := '{}'::uuid[];
  end if;

  v_claims := event -> 'claims';

  v_claims := jsonb_set(v_claims, '{user_role}',
    case when v_role is not null then to_jsonb(v_role::text) else 'null'::jsonb end);
  v_claims := jsonb_set(v_claims, '{tenant_id}',
    case when v_tenant_id is not null then to_jsonb(v_tenant_id::text) else 'null'::jsonb end);
  v_claims := jsonb_set(v_claims, '{tenant_ids}', to_jsonb(v_tenant_ids));

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- ------------------------------------------------- which doctor am I ---
-- A hospital row first — the main hospital's, then the oldest — and the home
-- row only for a doctor who has no hospital at all. Without the first key, a
-- home row's null comparison sorted first under DESC and would have become the
-- doctor the community posts as.

create or replace function public.auth_doctor_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select d.id
  from public.doctors d
  where d.profile_id = (select auth.uid())
  order by (d.tenant_id is null), (d.tenant_id = public.auth_tenant_id()) desc nulls last, d.created_at
  limit 1
$$;

-- ------------------------------------------------ the doctor's login ---
-- Every staff login had to carry a hospital. A doctor with only a home row has
-- none — no main hospital, and an empty tenant_ids — so a doctor may now have a
-- null tenant_id, as a patient may. Everyone else on staff still needs one.

alter table public.profiles drop constraint profiles_tenant_scope;
alter table public.profiles add constraint profiles_tenant_scope check (
  case role
    when 'super_admin'::public.app_role then tenant_id is null
    when 'patient'::public.app_role then true
    when 'doctor'::public.app_role then true
    else tenant_id is not null
  end
);

-- ------------------------------------------------- the profile guard ---
-- release_doctor_affiliation below moves a doctor's main hospital when one
-- hospital lets them go. It runs from the server's service role, and this
-- guard refused every tenant_id change from anyone but a super admin — the
-- service role included, since is_super_admin() reads the user's JWT. So a
-- hospital removing a doctor who also works elsewhere, when it was their main
-- hospital, failed outright (0077's own path, found while testing this one).
--
-- Same rule 0079 gave is_active: with no signed-in user, the change comes from
-- the server. A signed-in user's JWT follows them into every function and
-- trigger they call, so auth.uid() is null only for server-side work. role
-- stays super-admin only, with no such exception.

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

  if new.tenant_id is distinct from old.tenant_id and (select auth.uid()) is not null then
    raise exception 'profiles.tenant_id may only be changed by a super_admin';
  end if;

  if new.is_active is distinct from old.is_active and (select auth.uid()) is not null then
    raise exception 'profiles.is_active may only be changed by a super_admin';
  end if;

  return new;
end;
$$;

-- --------------------------------------------------- leaving a hospital ---
-- As 0077, with the home row in mind. Another hospital row keeps the account
-- as before. With no other hospital, a doctor who has a home row stays on
-- HealthFlow without one — the home row is exactly that; one without is
-- deactivated, as before.

create or replace function public.release_doctor_affiliation(p_doctor_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile uuid;
  v_tenant  uuid;
  v_other   uuid;
begin
  select profile_id, tenant_id into v_profile, v_tenant from public.doctors where id = p_doctor_id;
  if v_profile is null then
    return 'no_login';
  end if;

  select tenant_id into v_other
    from public.doctors
   where profile_id = v_profile and id <> p_doctor_id and tenant_id is not null
   order by created_at
   limit 1;

  if v_other is null and not exists (
    select 1 from public.doctors where profile_id = v_profile and tenant_id is null and id <> p_doctor_id
  ) then
    perform public.revoke_staff_access(v_profile);
    return 'revoked';
  end if;

  -- v_other is null when only the home row is left: no main hospital.
  update public.profiles
     set tenant_id = v_other, updated_at = now()
   where id = v_profile and tenant_id is not distinct from v_tenant;

  delete from auth.refresh_tokens where user_id = v_profile::text;
  delete from auth.sessions       where user_id = v_profile;

  return 'released';
end;
$$;

revoke execute on function public.release_doctor_affiliation(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
