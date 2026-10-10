-- 0125_doctor_schedule_blocks.sql
-- Time a doctor is not seeing patients, added by the doctor on
-- /portal/schedule: leave, an operation, a hospital round, a class or
-- meeting, or simply busy.
--
-- Until now a doctor's time was only their weekly days and hours
-- (doctors.availability), and nothing said "not next week". A doctor on leave
-- could still be booked for every day of it.
--
-- One row is one thing they added. It covers each date from start_date to
-- end_date (no end_date: until they remove it), on every day or only on the
-- weekdays in repeat_days (a round every Saturday to Thursday), for the whole
-- day or only between start_time and end_time.
--
-- The doctor's own, like saved_doctors (0092): the row belongs to the login,
-- not to a hospital — a doctor on leave is on leave at every place they sit.
-- doctor_id narrows it to one place (an operation at one hospital leaves the
-- evening chamber open); null is everywhere.

create table public.doctor_schedule_blocks (
  id          uuid primary key default gen_random_uuid(),

  -- Whose time. Stamped from the session by the API, never taken from the
  -- request.
  profile_id  uuid not null references public.profiles (id) on delete cascade,

  -- One of their doctors rows — the hospital or chamber it holds for. Null:
  -- all of them.
  doctor_id   uuid references public.doctors (id) on delete cascade,

  kind        text not null
              constraint doctor_schedule_blocks_kind_check
              check (kind in ('leave', 'surgery', 'round', 'teaching', 'busy')),

  start_date  date not null,
  end_date    date,

  -- Both or neither: neither is the whole day.
  start_time  time,
  end_time    time,

  -- Weekdays it holds on, 0 = Sunday as in extract(dow). Null: every day.
  repeat_days smallint[],

  -- False for time that is written down but still bookable — a round the
  -- doctor will fit a patient into.
  blocks_booking boolean not null default true,

  -- The doctor's own note. Never shown to a patient.
  note        text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint doctor_schedule_blocks_dates_check
    check (end_date is null or end_date >= start_date),
  constraint doctor_schedule_blocks_times_check
    check ((start_time is null and end_time is null)
        or (start_time is not null and end_time is not null and end_time > start_time)),
  -- Only something that repeats may run with no end.
  constraint doctor_schedule_blocks_open_end_check
    check (end_date is not null or repeat_days is not null),
  constraint doctor_schedule_blocks_repeat_days_check
    check (repeat_days is null
        or (cardinality(repeat_days) between 1 and 7 and repeat_days <@ array[0,1,2,3,4,5,6]::smallint[]))
);

create index doctor_schedule_blocks_profile_idx on public.doctor_schedule_blocks (profile_id, start_date);
create index doctor_schedule_blocks_doctor_idx  on public.doctor_schedule_blocks (doctor_id);

create trigger doctor_schedule_blocks_set_updated_at
  before update on public.doctor_schedule_blocks
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------- RLS ---

alter table public.doctor_schedule_blocks enable row level security;

-- Yours: add, look, change, remove. Nobody else reads the rows, in any role —
-- the note is private, and everyone else learns only what doctor_blocked()
-- below tells them.
create policy doctor_schedule_blocks_self on public.doctor_schedule_blocks
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

select public.attach_audit('public.doctor_schedule_blocks');

comment on table public.doctor_schedule_blocks is
  'Time a doctor is not seeing patients — leave, surgery, round, teaching, busy (0125). Added on /portal/schedule; visible to the owner only. Booking asks doctor_blocked().';

-- ---------------------------------------------------- what booking asks ---
--
-- Whether this doctors row can be booked at this date and time, and if not,
-- by what. The one thing anyone else may know about a doctor's blocked time:
-- its kind and its span, never the note. Security definer because the rows
-- themselves are the doctor's alone, and the caller is a patient booking, or
-- a hospital's desk adding an appointment.
--
-- With no time, only a whole-day block answers: a date can be refused before
-- a time is picked, but a morning operation does not close the day.

create or replace function public.doctor_blocked(
  p_doctor_id uuid,
  p_date      date,
  p_time      time default null
)
returns table (
  kind       text,
  start_date date,
  end_date   date,
  start_time time,
  end_time   time
)
language sql
stable
security definer
set search_path = public
as $$
  select b.kind, b.start_date, b.end_date, b.start_time, b.end_time
  from public.doctor_schedule_blocks b
  join public.doctors d
    on d.id = p_doctor_id
   and d.profile_id = b.profile_id
  where b.blocks_booking
    and (b.doctor_id is null or b.doctor_id = p_doctor_id)
    and p_date >= b.start_date
    and (b.end_date is null or p_date <= b.end_date)
    and (b.repeat_days is null or extract(dow from p_date)::smallint = any (b.repeat_days))
    and (b.start_time is null
      or (p_time is not null and p_time >= b.start_time and p_time < b.end_time))
  -- A whole day says more than an hour of it.
  order by (b.start_time is null) desc, b.start_date
  limit 1;
$$;

revoke all on function public.doctor_blocked(uuid, date, time) from public;
grant execute on function public.doctor_blocked(uuid, date, time) to anon, authenticated, service_role;

comment on function public.doctor_blocked(uuid, date, time) is
  'The block (0125) that stops this doctors row being booked at this date and time, or no row. Kind and span only.';
