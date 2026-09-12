-- 0083_doctor_login_without_hospital.sql
-- A doctor with no hospital can be given a login.
--
-- 0081 let a doctor exist at no hospital — a home row — and let a doctor's
-- profile have no main hospital (profiles_tenant_scope). It missed the step
-- before that: handle_new_user (0006), which builds the profile when the auth
-- user is created, still refused any role but super_admin and patient without a
-- tenant_id. So /super/doctors adding a doctor at no hospital with "Give them a
-- login" failed at the moment the login was made.
--
-- Doctors now join super_admin and patient. Every other staff role still needs
-- the hospital it works for.

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

  if v_role not in ('super_admin', 'patient', 'doctor') and v_tenant_id is null then
    raise exception
      'handle_new_user: role % requires tenant_id in user metadata', v_role;
  end if;

  insert into public.profiles (id, role, tenant_id, email, full_name, phone, avatar_url)
  values (
    new.id,
    v_role,
    v_tenant_id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
