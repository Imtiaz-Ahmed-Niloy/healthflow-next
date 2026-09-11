-- 0078: auth_doctor_id() resolves to the doctor's main-hospital row, and
-- writes to `doctors` get a role gate.
--
-- ---------------------------------------------------------------------------
-- 1. auth_doctor_id()
--
-- Since 0077 one doctor can have a row at several hospitals, and they can see
-- every one of them. auth_doctor_id() was `limit 1` with no order, so it could
-- return any of those rows — while the community policies (0059/0060) pair it
-- with `tenant_id = auth_tenant_id()`. A doctor handed the other hospital's
-- row would have every post, comment and reaction refused.
--
-- The main hospital is profiles.tenant_id (the JWT's tenant_id); its row wins,
-- then the oldest. /api/v1/portal/me picks the same row.

create or replace function public.auth_doctor_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select d.id
  from public.doctors d
  where d.profile_id = (select auth.uid())
  order by (d.tenant_id = public.auth_tenant_id()) desc, d.created_at
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- 2. Who may write `doctors`
--
-- The table only ever had 0002's role-blind tenant policies, so anyone
-- carrying the hospital's tenant_id — a patient included — could update or
-- delete its doctors straight through the publishable key. The resource route
-- limits writes to hospital_admin / hr_admin, but a gate that lives only in a
-- route handler does not exist.
--
-- apply_role_gate would gate reads too, and every role reads doctors (patients
-- book them), so these are write-only restrictive policies instead. They
-- narrow 0002's; they don't replace them, so the tenant rule still applies.
-- A doctor may update their own rows, and only their own — the trigger below
-- keeps that to their personal details.

drop policy if exists doctors_insert_gate on public.doctors;
create policy doctors_insert_gate on public.doctors as restrictive for insert to authenticated
  with check (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin'));

drop policy if exists doctors_update_gate on public.doctors;
create policy doctors_update_gate on public.doctors as restrictive for update to authenticated
  using (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin') or profile_id = (select auth.uid()))
  with check (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin') or profile_id = (select auth.uid()));

drop policy if exists doctors_delete_gate on public.doctors;
create policy doctors_delete_gate on public.doctors as restrictive for delete to authenticated
  using (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin'));

-- ---------------------------------------------------------------------------
-- 3. The guard, both ways round
--
-- 0077's guard stopped a hospital from rewriting a linked doctor's personal
-- details. The other half: the doctor editing their own row may change only
-- those details. Fee, availability, status, rating and the rest are the
-- hospital's to set — otherwise a doctor could rate themselves 5.0.

create or replace function public.doctors_guard_person()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_personal text[] := array['name', 'specialty', 'education', 'bio', 'languages', 'expertise',
    'experience_years', 'email', 'phone', 'photo_url', 'gender', 'bmdc_number', 'updated_at'];
begin
  -- Nested: the 0077 sync trigger copying a doctor's own edit to their other
  -- rows. Service role (no auth.uid()) and super admins: provisioning.
  if pg_trigger_depth() > 1 or (select auth.uid()) is null or public.is_super_admin() then
    return new;
  end if;

  if old.profile_id is not null and (select auth.uid()) = old.profile_id then
    if public.auth_role() in ('hospital_admin', 'hr_admin') then
      return new;
    end if;
    if (to_jsonb(new) - v_personal) is distinct from (to_jsonb(old) - v_personal) then
      raise exception 'Your fee, schedule and status are set by the hospital — ask its admin to change them'
        using errcode = 'P0001';
    end if;
    return new;
  end if;

  if old.profile_id is null then
    return new;
  end if;

  if (new.name, new.specialty, new.education, new.bio, new.languages, new.expertise,
      new.experience_years, new.email, new.phone, new.photo_url, new.gender, new.bmdc_number)
     is distinct from
     (old.name, old.specialty, old.education, old.bio, old.languages, old.expertise,
      old.experience_years, old.email, old.phone, old.photo_url, old.gender, old.bmdc_number) then
    raise exception '% manages their own profile — they can change their personal details from the doctor portal', old.name
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
