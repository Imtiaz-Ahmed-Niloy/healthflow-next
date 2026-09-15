-- 0093_specialties.sql
-- One list of specialties, for picking a doctor's and for filtering by it.
--
-- A doctor's specialty was free text, typed into Add Doctor — so the same
-- field came out as "Orthopaedics" and "Orthopedics", "Paediatrics" and
-- "Pediatrics", "Medicine" and "General Medicine". The site's filters were a
-- separate list hard-coded in the app (src/data/doctors.ts), and a doctor was
-- sorted into one by guessing from keywords in whatever had been typed.
--
-- Now there is one list, here. Add Doctor picks from it, and the home page and
-- /doctors filter by it, matching a doctor's specialty exactly. The super
-- admin adds, renames, orders or hides entries.
--
-- doctors.specialty stays text — the chosen name — rather than a foreign key:
-- hiding a specialty must not strip it from the doctors who have it, and the
-- public view, search and every list already read the text. Renaming an entry
-- renames it on those doctors too (trigger below), so the two stay the same.
--
-- A global lookup, like packages: every hospital and visitor shares it. Anyone
-- may read it — the public filter needs it signed out — and only the super
-- admin writes.

create table public.specialties (
  id         uuid primary key default gen_random_uuid(),
  name       text not null
               constraint specialties_name_check check (length(btrim(name)) between 1 and 100),
  -- Lower first. Ties fall back to the name.
  sort_order integer not null default 0,
  -- Hidden from pickers and filters; doctors who have it keep it.
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index specialties_name_key on public.specialties (lower(btrim(name)));

create trigger specialties_set_updated_at
  before update on public.specialties
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------- RLS ---

alter table public.specialties enable row level security;

create policy specialties_select on public.specialties
  for select to anon, authenticated
  using (true);

create policy specialties_write on public.specialties
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- No personal data, so the old and new values are kept too.
select public.attach_audit('public.specialties', true);

-- ------------------------------------------------------ rename follows ---
-- A renamed specialty is renamed on every doctor who has it, so a doctor
-- never falls out of the filter because the list's spelling changed.

create or replace function public.specialties_rename_on_doctors()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.name is distinct from old.name then
    update public.doctors
       set specialty = new.name
     where lower(btrim(specialty)) = lower(btrim(old.name));
  end if;
  return new;
end;
$$;

create trigger specialties_rename_on_doctors
  after update of name on public.specialties
  for each row execute function public.specialties_rename_on_doctors();

-- --------------------------------------------------------------- the list ---
-- The 15 the site filtered by, plus Dermatology, which three doctors have and
-- the old list lacked.

insert into public.specialties (name, sort_order) values
  ('Cardiology', 10),
  ('Dentistry', 20),
  ('Dermatology', 30),
  ('ENT', 40),
  ('Endocrinology', 50),
  ('Gastroenterology', 60),
  ('General Medicine', 70),
  ('Gynecology', 80),
  ('Nephrology', 90),
  ('Neurology', 100),
  ('Oncology', 110),
  ('Orthopedics', 120),
  ('Pediatrics', 130),
  ('Psychiatry', 140),
  ('Surgery', 150),
  ('Urology', 160);

-- ------------------------------------------------------- doctors, tidied ---
-- Other spellings of the same specialty, to the list's. Personal details, so
-- the 0077 sync carries each change to the doctor's other rows.

update public.doctors set specialty = 'Orthopedics'
 where lower(btrim(specialty)) = 'orthopaedics';
update public.doctors set specialty = 'Pediatrics'
 where lower(btrim(specialty)) = 'paediatrics';
update public.doctors set specialty = 'Gynecology'
 where lower(btrim(specialty)) in ('gynaecology', 'gynaecology & obstetrics', 'gynecology & obstetrics');
update public.doctors set specialty = 'General Medicine'
 where lower(btrim(specialty)) = 'medicine';
update public.doctors set specialty = 'Surgery'
 where lower(btrim(specialty)) = 'general surgery';

-- And the list's own names, in the list's case and without stray spaces.
update public.doctors d
   set specialty = s.name
  from public.specialties s
 where lower(btrim(d.specialty)) = lower(s.name)
   and d.specialty is distinct from s.name;

comment on table public.specialties is
  'The specialties a doctor is given and the site filters by (0093). doctors.specialty holds the name; renaming one here renames it there.';
