-- 0092_saved_doctors.sql
-- A patient's saved doctors — the Save button on a doctor's profile.
--
-- That button only ever showed "saved to favorites"; nothing was stored and
-- there was nowhere to find them again. Now a patient keeps a list, and
-- /patient/saved-doctors shows it, with booking one click away.
--
-- The patient's alone, like patient_documents (0076): the row belongs to the
-- login, not to a hospital, and nobody but its owner sees it.
--
-- A saved doctor is one of their doctors rows — the one the site lists them
-- by (useDoctors' first place). A doctor at several places is one person on
-- the site (0090), so the app counts any of their rows as saved. If the row
-- goes, the entry goes with it: the saved list only holds doctors that exist.

create table public.saved_doctors (
  id         uuid primary key default gen_random_uuid(),

  -- Whose list. Stamped from the session by the API (ownerColumn), never
  -- taken from the request.
  profile_id uuid not null references public.profiles (id) on delete cascade,
  doctor_id  uuid not null references public.doctors (id) on delete cascade,

  created_at timestamptz not null default now(),

  constraint saved_doctors_once unique (profile_id, doctor_id)
);

create index saved_doctors_profile_idx on public.saved_doctors (profile_id, created_at desc);

-- ------------------------------------------------------------------- RLS ---

alter table public.saved_doctors enable row level security;

-- Yours: save, look, unsave. Nobody else, in any role.
create policy saved_doctors_self on public.saved_doctors
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

select public.attach_audit('public.saved_doctors');

comment on table public.saved_doctors is
  'Doctors a patient saved from a profile (0092). Visible to the owner only.';
