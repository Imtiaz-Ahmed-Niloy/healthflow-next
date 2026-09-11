-- 0079: suspending an account sticks, and a super admin can do it.
--
-- The super admin's Doctors and Patients screens suspend and reactivate
-- people. Two things stood in the way.
--
-- 1. is_active was not guarded. 0038 deactivates a login by setting
--    profiles.is_active = false and killing its sessions, and the token hook
--    then hands out no role and no hospital. But Supabase Auth still lets the
--    person sign in, and profiles_update_self lets anyone update their own
--    row — so a deactivated user could sign straight back in and set
--    is_active = true on themselves. The guard now covers it: only a super
--    admin or the service role (no auth.uid(): revoke/restore_staff_access,
--    release_doctor_affiliation) may change it.
--
-- 2. Ending someone's sessions means deleting from auth.*, which only the
--    service role can reach. set_account_active() does it inside the
--    database, checking is_super_admin() itself, so the route calls it with
--    the super admin's own client — no service-role key on the request path.

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

  if new.is_active is distinct from old.is_active and (select auth.uid()) is not null then
    raise exception 'profiles.is_active may only be changed by a super_admin';
  end if;

  return new;
end;
$$;

create or replace function public.set_account_active(p_profile_id uuid, p_active boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can suspend or reactivate an account' using errcode = '42501';
  end if;

  select p.role into v_role from public.profiles p where p.id = p_profile_id;
  if not found then
    return false;
  end if;
  if v_role = 'super_admin' then
    raise exception 'A super admin account can''t be suspended from here' using errcode = 'P0001';
  end if;

  update public.profiles
     set is_active = p_active, updated_at = now()
   where id = p_profile_id;

  -- Signed out everywhere at once. Their next sign-in gets a token with no
  -- role and no hospital (the 0077 hook), so nothing reads through RLS.
  if not p_active then
    delete from auth.refresh_tokens where user_id = p_profile_id::text;
    delete from auth.sessions       where user_id = p_profile_id;
  end if;

  return true;
end;
$$;

revoke all on function public.set_account_active(uuid, boolean) from public, anon;
grant execute on function public.set_account_active(uuid, boolean) to authenticated;

-- A super admin corrects a patient's personal details (name and phone live on
-- profiles, which a super admin can already update; the rest is here). Reads
-- were already allowed by patient_profiles_care_team_read.
drop policy if exists patient_profiles_super_admin_update on public.patient_profiles;
create policy patient_profiles_super_admin_update on public.patient_profiles
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());
