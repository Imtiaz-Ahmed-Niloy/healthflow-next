-- 0143_doctor_break_minutes.sql
-- How long the doctor's "break" button pauses their queue and the lounge TV.
-- It was a fixed 10 minutes in the browser; now each doctor sets their own on
-- My Profile, 10 until they do.
--
-- It is the person's, not the hospital's — the same break wherever they sit —
-- so it joins the personal columns 0077's triggers keep in step across a
-- doctor's rows, and that 0078's guard lets the doctor change and no one else.
--
-- UNUSED since 2026-10-30: the doctor now picks the length at the break button
-- each time (src/components/portal/BreakButton.tsx), so nothing in the app
-- reads or writes this column. It is left in place for now. Dropping it later
-- means first re-creating doctors_sync_person, doctors_guard_person and
-- doctors_pull_person without break_minutes — all three name the column, and
-- would fail on every doctors write once it is gone.

alter table public.doctors
  add column if not exists break_minutes smallint not null default 10
    constraint doctors_break_minutes_range check (break_minutes between 1 and 120);

comment on column public.doctors.break_minutes is
  'Length in minutes of the doctor''s queue break (Queue and Prescription pages, lounge TV). Personal: synced across the doctor''s rows.';

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
  if old.profile_id is distinct from new.profile_id then
    return new;
  end if;

  update public.doctors d
     set name = new.name, specialty = new.specialty, education = new.education, bio = new.bio,
         languages = new.languages, expertise = new.expertise, experience_years = new.experience_years,
         email = new.email, phone = new.phone, photo_url = new.photo_url, gender = new.gender,
         bmdc_number = new.bmdc_number, summary = new.summary, break_minutes = new.break_minutes
   where d.profile_id = new.profile_id
     and d.id <> new.id
     and (d.name, d.specialty, d.education, d.bio, d.languages, d.expertise, d.experience_years,
          d.email, d.phone, d.photo_url, d.gender, d.bmdc_number, d.summary, d.break_minutes)
         is distinct from
         (new.name, new.specialty, new.education, new.bio, new.languages, new.expertise, new.experience_years,
          new.email, new.phone, new.photo_url, new.gender, new.bmdc_number, new.summary, new.break_minutes);

  return new;
end;
$$;

create or replace function public.doctors_guard_person()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_personal text[] := array['name', 'specialty', 'education', 'bio', 'languages', 'expertise',
    'experience_years', 'email', 'phone', 'photo_url', 'gender', 'bmdc_number', 'summary',
    'break_minutes', 'updated_at'];
begin
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
      new.experience_years, new.email, new.phone, new.photo_url, new.gender, new.bmdc_number, new.summary,
      new.break_minutes)
     is distinct from
     (old.name, old.specialty, old.education, old.bio, old.languages, old.expertise,
      old.experience_years, old.email, old.phone, old.photo_url, old.gender, old.bmdc_number, old.summary,
      old.break_minutes) then
    raise exception '% manages their own profile — they can change their personal details from the doctor portal', old.name
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- A new hospital row takes the person's existing details. 0131 added summary
-- to the sync and guard but not here, so it is carried now too.
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
    new.bmdc_number := s.bmdc_number; new.summary := s.summary;
    new.break_minutes := s.break_minutes;
  end if;
  return new;
end;
$$;

revoke execute on function public.doctors_pull_person() from public, anon, authenticated;
