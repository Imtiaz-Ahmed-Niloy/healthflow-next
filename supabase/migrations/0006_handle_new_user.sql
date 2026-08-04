-- 0006_handle_new_user.sql
-- Creates the profiles row for every new auth user.
--
-- Without this, signup is broken in a way that is hard to diagnose: the user
-- is created, login succeeds, but the access-token hook finds no profile, so
-- user_role and tenant_id come back null and every RLS policy denies them.
-- The app looks empty rather than broken.
--
-- Role and tenant come from user metadata when the caller sets it — that is
-- how hospital provisioning creates a hospital_admin bound to its hospital.
-- Public signup sets neither, so it lands on 'patient' with no tenant.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role      public.app_role;
  v_tenant_id uuid;
begin
  v_role := coalesce(
    nullif(new.raw_user_meta_data ->> 'role', '')::public.app_role,
    'patient'
  );

  v_tenant_id := nullif(new.raw_user_meta_data ->> 'tenant_id', '')::uuid;

  -- profiles_tenant_scope would reject this anyway, but its message is about
  -- a constraint. Fail with something that names the actual mistake, because
  -- this only happens when provisioning forgot to pass a hospital.
  if v_role not in ('super_admin', 'patient') and v_tenant_id is null then
    raise exception
      'handle_new_user: role % requires tenant_id in user metadata', v_role;
  end if;

  insert into public.profiles (id, role, tenant_id, email, full_name, phone)
  values (
    new.id,
    v_role,
    v_tenant_id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Not callable over the API — it is a trigger function only.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
