-- 0066_personal_patient_profile.sql
-- /patient/profile was empty for every new account, and could not be filled in
-- either: it read and wrote `patients`, and a `patients` row only exists once
-- a hospital has registered the person — `patients.tenant_id` is NOT NULL,
-- because a row there means "this person, at this hospital". So a patient who
-- signed up and went straight to their profile got a blank form whose Save
-- answered "You do not have a patient record yet".
--
-- The mistake was where the data lived, not the page. A date of birth, a blood
-- group, an emergency contact and an allergy belong to the PERSON. They do not
-- change per hospital and should not need one to exist.
--
-- So the personal record moves to the login, and the hospital connects to it
-- through the link it already has — `patients.profile_id`:
--
--   profiles           who you are, and your role (0001)
--   patient_profiles   your own details — this file
--   patients           one row per hospital that has registered you, carrying
--                      that hospital's MRN and its clinical record of you
--
-- A doctor treating you can still read your allergies: the policies below let
-- a hospital's staff through when — and only when — a patients row links you
-- to their hospital.

create table public.patient_profiles (
  -- One row per login, so the id IS the profile. No separate key to keep in
  -- step, and no way to end up with two personal records for one person.
  profile_id   uuid primary key references public.profiles (id) on delete cascade,

  date_of_birth   date,
  gender          public.patient_gender,
  -- The same enum `patients` uses (0046), so the backfill below is a copy
  -- rather than a cast and the two cannot drift apart.
  marital_status  public.marital_status,
  national_id     text,
  address         text,

  blood_group     public.blood_group,

  -- Height as feet and inches because that is how it is asked and answered
  -- here; weight in kg for the same reason. Neither is derived from the other.
  height_feet     integer
                    constraint patient_profiles_height_feet_check
                    check (height_feet is null or height_feet between 0 and 9),
  height_inches   integer
                    constraint patient_profiles_height_inches_check
                    check (height_inches is null or height_inches between 0 and 11),
  weight_kg       numeric(5, 2)
                    constraint patient_profiles_weight_check
                    check (weight_kg is null or weight_kg between 0 and 700),

  emergency_contact_name     text,
  emergency_contact_phone    text,
  emergency_contact_relation text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger patient_profiles_set_updated_at
  before update on public.patient_profiles
  for each row execute function public.set_updated_at();

-- --------------------------------------------------- the standing history ---
--
-- patient_history (0046) had the same problem: keyed by patients.id, so
-- allergies could not be recorded until a hospital existed, and were recorded
-- per hospital afterwards. An allergy is not per hospital.
--
-- The table is empty (checked: 0 rows), so it is rebuilt rather than migrated.

drop table if exists public.patient_history;

create table public.patient_history (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,

  kind        public.patient_history_kind not null,

  -- "Penicillin", "Type 2 Diabetes", "Metformin 500mg", "Appendectomy".
  label       text not null
                constraint patient_history_label_check check (length(btrim(label)) > 0),

  -- Free text the patient or clinician adds: severity, dosage, the hospital
  -- that performed it.
  detail      text,

  started_on  date,

  -- An allergy is forever; a course of antibiotics is not.
  ongoing     boolean not null default true,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index patient_history_profile_idx on public.patient_history (profile_id);

create trigger patient_history_set_updated_at
  before update on public.patient_history
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------- RLS ---
--
-- Not the tenant template: these rows have no tenant. Two rules, applied to
-- both tables.

alter table public.patient_profiles enable row level security;
alter table public.patient_history  enable row level security;

/**
 * True when the caller's hospital has registered this person — i.e. a
 * `patients` row links the two. This is the "connected by the link" rule, and
 * it is what lets a doctor see the allergies of someone they are treating
 * without giving every hospital every patient's personal record.
 *
 * SECURITY DEFINER because `patients` is tenant-scoped and RLS-protected: a
 * patient evaluating their own policy cannot see the rows that would answer
 * this, and a nested policy check is where recursion comes from. The function
 * answers one yes/no question about the CALLER's own hospital and reveals
 * nothing else.
 */
create or replace function public.shares_hospital_with(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patients pt
    where pt.profile_id = p_profile_id
      and pt.tenant_id = public.auth_tenant_id()
  );
$$;

comment on function public.shares_hospital_with(uuid) is
  'True when a patients row links the given login to the caller''s hospital. Used by RLS on the person-owned patient tables, which have no tenant of their own.';

revoke execute on function public.shares_hospital_with(uuid) from public, anon;
grant execute on function public.shares_hospital_with(uuid) to authenticated;

-- Yours to read and write.
create policy patient_profiles_self on public.patient_profiles
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- Readable by a hospital that has you on its books, and by super_admin. Read
-- only: a hospital records its own view of you on `patients`, and must not
-- rewrite the person's own record.
create policy patient_profiles_care_team_read on public.patient_profiles
  for select to authenticated
  using (public.is_super_admin() or public.shares_hospital_with(profile_id));

create policy patient_history_self on public.patient_history
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy patient_history_care_team_read on public.patient_history
  for select to authenticated
  using (public.is_super_admin() or public.shares_hospital_with(profile_id));

select public.attach_audit('public.patient_profiles');
select public.attach_audit('public.patient_history');

-- ------------------------------------------------------------ backfill ---
--
-- Anyone who already has a hospital record keeps their details: copy them onto
-- the personal record they should have had. Newest patients row wins where a
-- login has several, which is the same row /patient/profile used to edit.

insert into public.patient_profiles (
  profile_id, date_of_birth, gender, marital_status, national_id, address,
  blood_group, height_feet, height_inches, weight_kg,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation
)
select distinct on (pt.profile_id)
  pt.profile_id, pt.date_of_birth, pt.gender, pt.marital_status, pt.national_id, pt.address,
  pt.blood_group, pt.height_feet, pt.height_inches, pt.weight_kg,
  pt.emergency_contact_name, pt.emergency_contact_phone, pt.emergency_contact_relation
from public.patients pt
where pt.profile_id is not null
order by pt.profile_id, pt.created_at desc
on conflict (profile_id) do nothing;

-- The columns stay on `patients` on purpose. A hospital's record of a patient
-- is its own document — what it was told, when — and a hospital that corrects
-- a blood group in its own file should not silently rewrite the person's. The
-- booking route copies the personal details across when it first creates the
-- row, so a hospital starts from what the patient has already entered.
