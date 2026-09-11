-- 0077_multi_hospital_doctors.sql
-- A doctor is a person, and a person can work at more than one hospital.
--
-- Until now a doctor's login carried exactly one hospital: `tenant_id` in the
-- JWT, stamped from profiles (0003), and every tenant-scoped policy compared a
-- row against that one id. A consultant who also sits in a second chamber
-- needed a second account.
--
-- Now:
--
--   1. The token carries a LIST of hospitals — `tenant_ids` — alongside the
--      single `tenant_id`. For a doctor it is every hospital with a `doctors`
--      row pointing at their login; for everyone else it is their one
--      hospital, so nothing changes for admins, nurses or patients.
--
--   2. The tenant RLS template (0002) asks "is this row's hospital in your
--      list?" instead of "is it your hospital?", and is re-applied to every
--      table built on it. The role gates layered on top (0051) are untouched,
--      so a doctor still sees exactly what a doctor sees — at each of their
--      hospitals, instead of at one.
--
--   3. One doctor, one set of personal details. A `doctors` row is the
--      doctor AT a hospital: its fee, availability and status are that
--      hospital's. The name, photo, bio, education, specialty and BMDC number
--      are the person's, and are kept identical across all of their rows. Once
--      a doctor has a login they own those details — they change them from
--      their portal, or a super admin does — and a hospital admin can no
--      longer rewrite another hospital's view of them.
--
--   4. Removing a doctor from one hospital ends that job, not the person:
--      their account survives while any hospital still has them.
--
-- Community (0059) keeps its single-doctor helper: a doctor posts as one
-- person, filed under their main hospital.

-- ----------------------------------------------------------- the list ---

/**
 * Every hospital the caller may act in, from the token. Falls back to the
 * single tenant_id for a token issued before this migration, so nobody loses
 * access in the hour it takes their token to refresh.
 */
create or replace function public.auth_tenant_ids()
returns uuid[]
language sql
stable
set search_path = ''
as $$
  select case
    when jsonb_typeof(auth.jwt() -> 'tenant_ids') = 'array' then
      coalesce(
        (select array_agg(value::uuid) from jsonb_array_elements_text(auth.jwt() -> 'tenant_ids') as t(value)),
        '{}'::uuid[]
      )
    when public.auth_tenant_id() is not null then array[public.auth_tenant_id()]
    else '{}'::uuid[]
  end
$$;

-- ------------------------------------------------------- the template ---

create or replace function public.apply_tenant_rls(p_table regclass)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_table text := p_table::text;
  -- "Your hospital" became "one of your hospitals" (0077). For every role but
  -- a multi-hospital doctor the list has one entry, and this is the old rule.
  v_scope text := 'public.is_super_admin() or tenant_id = any(public.auth_tenant_ids())';
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

revoke execute on function public.apply_tenant_rls(regclass) from public, anon, authenticated;

-- Every table the template built, rebuilt with the new rule. Found by the
-- policy the template names, so a table added later by the template is
-- covered and a hand-written one is not touched.
do $$
declare
  r record;
begin
  for r in
    select distinct schemaname, tablename
      from pg_policies
     where schemaname = 'public' and policyname = 'tenant_select'
  loop
    perform public.apply_tenant_rls(format('%I.%I', r.schemaname, r.tablename)::regclass);
  end loop;
end;
$$;

-- A doctor needs the names of the hospitals they work at, to label each
-- patient in their queue. Read only; changing a hospital stays its admin's.
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
  for select to authenticated
  using (public.is_super_admin() or id = any(public.auth_tenant_ids()));

-- --------------------------------------------------------- the token ---

-- The hook reads doctors to list a doctor's hospitals. It runs as the auth
-- server, which needs its own read path, exactly as it has for profiles.
grant select on table public.doctors to supabase_auth_admin;

drop policy if exists doctors_select_auth_admin on public.doctors;
create policy doctors_select_auth_admin on public.doctors
  for select to supabase_auth_admin
  using (true);

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
  -- doctors row on their login, plus their main one. Anyone else: their one.
  if v_role = 'doctor' then
    select coalesce(array_agg(distinct t), '{}'::uuid[])
      into v_tenant_ids
      from (
        select v_tenant_id as t where v_tenant_id is not null
        union
        select d.tenant_id from public.doctors d where d.profile_id = v_user
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

-- ---------------------------------------------------- the person ---

alter table public.doctors add column bmdc_number text;

comment on column public.doctors.bmdc_number is
  'Bangladesh Medical & Dental Council registration number. Personal, like the name: identical across every hospital the doctor works at, and one of the two keys (with email) a hospital uses to find a doctor already on HealthFlow.';

-- A person is at a hospital once.
create unique index doctors_tenant_profile_key
  on public.doctors (tenant_id, profile_id)
  where profile_id is not null;

create index doctors_bmdc_idx on public.doctors (lower(btrim(bmdc_number))) where bmdc_number is not null;
create index doctors_email_idx on public.doctors (lower(btrim(email))) where email is not null;

/**
 * A linked doctor's personal details are theirs. A direct change to one of
 * them — not the sync below, which runs one level down — is allowed from the
 * doctor themselves or a super admin, and refused from a hospital admin, who
 * would otherwise be rewriting the doctor as every other hospital sees them.
 * Unchanged values pass, so saving the rest of the form still works.
 */
create or replace function public.doctors_guard_person()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.profile_id is null or pg_trigger_depth() > 1 then
    return new;
  end if;
  if (select auth.uid()) = old.profile_id or public.is_super_admin() or (select auth.uid()) is null then
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

create trigger doctors_guard_person
  before update on public.doctors
  for each row execute function public.doctors_guard_person();

/**
 * Linking a row to a doctor who is already on HealthFlow — a new hospital
 * adding them, or a login being attached — makes the row TAKE that person's
 * details from their existing rows. The other way round would let whatever a
 * hospital typed overwrite the doctor everywhere else. A doctor with no other
 * row yet keeps what was entered: that is the first copy of them.
 */
create or replace function public.doctors_pull_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.doctors;
begin
  if new.profile_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.profile_id is not distinct from new.profile_id then
    return new;
  end if;

  select * into s
    from public.doctors
   where profile_id = new.profile_id and id <> new.id
   order by updated_at desc
   limit 1;

  if s.id is not null then
    new.name := s.name;               new.specialty := s.specialty;
    new.education := s.education;     new.bio := s.bio;
    new.languages := s.languages;     new.expertise := s.expertise;
    new.experience_years := s.experience_years;
    new.email := s.email;             new.phone := s.phone;
    new.photo_url := s.photo_url;     new.gender := s.gender;
    new.bmdc_number := s.bmdc_number;
  end if;
  return new;
end;
$$;

revoke execute on function public.doctors_pull_person() from public, anon, authenticated;

create trigger doctors_pull_person
  before insert or update of profile_id on public.doctors
  for each row execute function public.doctors_pull_person();

/**
 * Keeps a person's details identical at every hospital once they change:
 * an edit on one row is copied to the others. Security definer because the
 * doctor's other hospitals are, correctly, invisible to whoever made the
 * change; what it writes is only the person's own fields, copied from a row
 * the caller was allowed to change (and doctors_guard_person decides who that
 * is).
 */
create or replace function public.doctors_sync_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is null or pg_trigger_depth() > 1 then
    return new;
  end if;
  -- Just linked: doctors_pull_person already made this row match the others.
  if old.profile_id is distinct from new.profile_id then
    return new;
  end if;

  update public.doctors d
     set name = new.name, specialty = new.specialty, education = new.education, bio = new.bio,
         languages = new.languages, expertise = new.expertise, experience_years = new.experience_years,
         email = new.email, phone = new.phone, photo_url = new.photo_url, gender = new.gender,
         bmdc_number = new.bmdc_number
   where d.profile_id = new.profile_id
     and d.id <> new.id
     and (d.name, d.specialty, d.education, d.bio, d.languages, d.expertise, d.experience_years,
          d.email, d.phone, d.photo_url, d.gender, d.bmdc_number)
         is distinct from
         (new.name, new.specialty, new.education, new.bio, new.languages, new.expertise, new.experience_years,
          new.email, new.phone, new.photo_url, new.gender, new.bmdc_number);

  return new;
end;
$$;

revoke execute on function public.doctors_sync_person() from public, anon, authenticated;

create trigger doctors_sync_person
  after update on public.doctors
  for each row execute function public.doctors_sync_person();

-- --------------------------------------------------- leaving a hospital ---

/**
 * Ends one doctor's job at one hospital, before its doctors row is deleted.
 *
 *   - no login on the row          → nothing to do
 *   - still at another hospital    → the account stays; if this was their
 *                                    main hospital, another becomes main;
 *                                    sessions end so the next token no longer
 *                                    lists this hospital
 *   - this was their last hospital → the account is deactivated, as 0038
 *
 * Service role only, like revoke_staff_access: the route calls it after the
 * caller has shown they can see the row.
 */
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
   where profile_id = v_profile and id <> p_doctor_id
   order by created_at
   limit 1;

  if v_other is null then
    perform public.revoke_staff_access(v_profile);
    return 'revoked';
  end if;

  update public.profiles
     set tenant_id = v_other, updated_at = now()
   where id = v_profile and tenant_id = v_tenant;

  delete from auth.refresh_tokens where user_id = v_profile::text;
  delete from auth.sessions       where user_id = v_profile;

  return 'released';
end;
$$;

revoke execute on function public.release_doctor_affiliation(uuid) from public, anon, authenticated;
