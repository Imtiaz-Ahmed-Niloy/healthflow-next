-- 0147_doctor_team_members.sql
-- A doctor's own team: the people who work for the doctor, not for a hospital.
--
-- doctor_assistants (0013) is a hospital's staff record, written by its admin.
-- A doctor now practises across hospitals and chambers as one person, and
-- builds a team of their own from /portal/team: an assistant, a second one, a
-- nurse, an intern, a receptionist. Each member may be given a login (the
-- doctor_staff role, 0146), created by the doctor the way a hospital admin
-- creates a doctor's (/api/v1/portal/team/[id]/login).
--
-- A member belongs to the doctor — owner_profile_id, the doctor's login — and
-- optionally to one place they practise at. No tenant_id: the row is not a
-- hospital's, so apply_tenant_rls doesn't fit and the policies below are the
-- owner's, like doctors_self_select (0081).
--
-- What a member's login can open is deliberately small. Their profile has no
-- hospital, so the token's tenant_ids are empty and every tenant policy grants
-- them nothing: no patient table, no appointments, no records. The one thing
-- they read is their doctor's day list, through doctor_staff_queue below,
-- which checks the member row itself and returns a handful of columns:
--
--   assistant, receptionist   the queue, with each patient's phone
--   nurse, intern             the queue, without phone numbers
--
-- Nobody on the team sees prescriptions, medical records, vitals or billing.

-- ---------------------------------------------------------------- table ---

create table public.doctor_team_members (
  id               uuid primary key default gen_random_uuid(),

  -- The doctor whose team this is: their login, so the member follows them
  -- across every hospital and chamber.
  owner_profile_id uuid not null default auth.uid()
                     references public.profiles (id) on delete cascade,

  -- The member's own login, once the doctor creates one. Written only by the
  -- login route's service-role client: not grantable to `authenticated`.
  profile_id       uuid unique
                     references public.profiles (id) on delete set null,

  role             text not null default 'assistant'
                     constraint doctor_team_members_role_check
                     check (role in ('assistant', 'nurse', 'intern', 'receptionist')),

  name             text not null
                     constraint doctor_team_members_name_check check (length(btrim(name)) > 0),
  phone            text,
  email            text
                     constraint doctor_team_members_email_check
                     check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),

  -- Optional: the one hospital or chamber they work at with the doctor. Null
  -- is all of them.
  place_tenant_id  uuid references public.tenants (id) on delete set null,

  -- Same vocabulary as doctor_assistants. Anything but active pauses their login's access.
  status           text not null default 'active'
                     constraint doctor_team_members_status_check
                     check (status in ('active', 'on_leave', 'suspended')),

  notes            text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index doctor_team_members_owner_idx on public.doctor_team_members (owner_profile_id);
create index doctor_team_members_place_idx on public.doctor_team_members (place_tenant_id);

create trigger doctor_team_members_set_updated_at
  before update on public.doctor_team_members
  for each row execute function public.set_updated_at();

select public.attach_audit('public.doctor_team_members');

-- ---------------------------------------------------------- privileges ---
-- The owner and the login are never the doctor's to rewrite: a row can't be
-- handed to another doctor, nor pointed at somebody else's account.

revoke all on public.doctor_team_members from anon;
revoke insert, update on public.doctor_team_members from authenticated;
grant select, delete on public.doctor_team_members to authenticated;
grant insert (owner_profile_id, role, name, phone, email, place_tenant_id, status, notes)
  on public.doctor_team_members to authenticated;
grant update (role, name, phone, email, place_tenant_id, status, notes)
  on public.doctor_team_members to authenticated;

-- ---------------------------------------------------------------- RLS ---

alter table public.doctor_team_members enable row level security;

-- The doctor sees their team; a member sees their own row.
create policy doctor_team_members_select on public.doctor_team_members
  for select to authenticated
  using (
    owner_profile_id = (select auth.uid())
    or profile_id = (select auth.uid())
    or public.is_super_admin()
  );

-- Only a doctor builds a team, only their own, and only at a place they
-- practise at.
create policy doctor_team_members_insert on public.doctor_team_members
  for insert to authenticated
  with check (
    public.is_super_admin()
    or (
      owner_profile_id = (select auth.uid())
      and public.auth_role() = 'doctor'
      and (
        place_tenant_id is null
        or exists (
          select 1 from public.doctors d
          where d.profile_id = owner_profile_id and d.tenant_id = place_tenant_id
        )
      )
    )
  );

create policy doctor_team_members_update on public.doctor_team_members
  for update to authenticated
  using (
    public.is_super_admin()
    or (owner_profile_id = (select auth.uid()) and public.auth_role() = 'doctor')
  )
  with check (
    public.is_super_admin()
    or (
      owner_profile_id = (select auth.uid())
      and public.auth_role() = 'doctor'
      and (
        place_tenant_id is null
        or exists (
          select 1 from public.doctors d
          where d.profile_id = owner_profile_id and d.tenant_id = place_tenant_id
        )
      )
    )
  );

create policy doctor_team_members_delete on public.doctor_team_members
  for delete to authenticated
  using (
    public.is_super_admin()
    or (owner_profile_id = (select auth.uid()) and public.auth_role() = 'doctor')
  );

-- A member with a login signs in with their email, so it stays put while the
-- login exists. The service role (no auth.uid()) and a super admin may still.
create or replace function public.doctor_team_members_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and not public.is_super_admin()
     and old.profile_id is not null
     and new.email is distinct from old.email then
    raise exception 'This member signs in with %, so the email can''t change while they have a login.', old.email
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger doctor_team_members_guard
  before update on public.doctor_team_members
  for each row execute function public.doctor_team_members_guard();

-- ------------------------------------------------------------- secrets ---
-- The generated password, encrypted, so the doctor can view it again — the
-- posture of doctor_login_secrets (0021): RLS on, no policies, service role only.

create table public.doctor_team_member_secrets (
  member_id    uuid primary key references public.doctor_team_members (id) on delete cascade,
  password_enc text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger doctor_team_member_secrets_set_updated_at
  before update on public.doctor_team_member_secrets
  for each row execute function public.set_updated_at();

alter table public.doctor_team_member_secrets enable row level security;
revoke all on public.doctor_team_member_secrets from authenticated, anon;

-- ------------------------------------------------------ the new login ---
-- A team member's login has no hospital, like a doctor's (0081). Read live
-- before replacing; only the role list changes.

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

  if v_role not in ('super_admin', 'patient', 'doctor', 'doctor_staff') and v_tenant_id is null then
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

-- ------------------------------------------------ what a member reads ---

-- Who they are on whose team, for the /staff page's header.
create or replace function public.doctor_staff_context()
returns table (
  member_id   uuid,
  member_name text,
  member_role text,
  status      text,
  doctor_name text,
  place_name  text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    m.name,
    m.role,
    m.status,
    coalesce(
      (select d.name from public.doctors d
        where d.profile_id = m.owner_profile_id
        order by (d.tenant_id is null) desc, d.created_at
        limit 1),
      p.full_name
    ),
    t.name
  from public.doctor_team_members m
  join public.profiles p on p.id = m.owner_profile_id
  left join public.tenants t on t.id = m.place_tenant_id
  where m.profile_id = (select auth.uid())
$$;

-- Their doctor's appointments on one day, at their place or all of them. The
-- columns are the whole of what a member sees; the phone only for the roles
-- that call patients.
create or replace function public.doctor_staff_queue(p_date date)
returns table (
  appointment_id uuid,
  scheduled_date date,
  scheduled_time time,
  status         text,
  priority       text,
  walk_in        boolean,
  patient_name   text,
  patient_phone  text,
  place_name     text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_member public.doctor_team_members;
begin
  if public.auth_role() is distinct from 'doctor_staff' then
    raise exception 'Only a member of a doctor''s team can read this' using errcode = '42501';
  end if;

  select * into v_member
    from public.doctor_team_members m
   where m.profile_id = (select auth.uid());

  if v_member.id is null then
    raise exception 'You are not on a doctor''s team' using errcode = '42501';
  end if;
  if v_member.status <> 'active' then
    raise exception 'Your access is paused. Ask your doctor to set you active again.' using errcode = '42501';
  end if;

  return query
    select
      a.id,
      a.scheduled_date,
      a.scheduled_time,
      a.status::text,
      a.priority::text,
      coalesce(a.walk_in, false),
      pt.full_name,
      case when v_member.role in ('assistant', 'receptionist') then pt.phone end,
      t.name
    from public.doctors d
    join public.appointments a on a.doctor_id = d.id and a.tenant_id = d.tenant_id
    left join public.patients pt on pt.id = a.patient_id
    join public.tenants t on t.id = d.tenant_id
    where d.profile_id = v_member.owner_profile_id
      and d.tenant_id is not null
      and (v_member.place_tenant_id is null or d.tenant_id = v_member.place_tenant_id)
      and a.scheduled_date = p_date
    order by a.scheduled_time nulls last, a.created_at;
end;
$$;

revoke execute on function public.doctor_staff_context() from public, anon;
revoke execute on function public.doctor_staff_queue(date) from public, anon;
grant execute on function public.doctor_staff_context() to authenticated;
grant execute on function public.doctor_staff_queue(date) to authenticated;

-- ----------------------------------------------------- /super/roles row ---
-- A system row, because doctor_staff is an app_role value (0146). The insert
-- trigger refuses is_system from the API; this migration is the enum's owner.

alter table public.roles disable trigger roles_reject_forged_system;

insert into public.roles (role, label, description, is_system, scope, pages)
values (
  'doctor_staff',
  'Doctor''s Team',
  'A member of a doctor''s own team: assistant, nurse, intern or receptionist. Sees the doctor''s day list only.',
  true,
  'Clinical',
  '{/staff}'
)
on conflict (role) do nothing;

alter table public.roles enable trigger roles_reject_forged_system;
