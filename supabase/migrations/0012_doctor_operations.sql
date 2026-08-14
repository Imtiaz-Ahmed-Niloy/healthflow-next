-- 0012_doctor_operations.sql
-- The two tables behind the Performance and Scheduling tabs of
-- /admin/doctors. The Directory tab has run on `public.doctors` since 0005;
-- these two still kept their data in localStorage, so the metrics a hospital
-- typed in were visible only in the browser that typed them.
--
-- Both are hospital-scoped and take the standard template.

-- Lets the child tables below carry a composite foreign key. `id` alone is
-- already the primary key, so this adds no new guarantee about doctors — it
-- exists so that (doctor_id, tenant_id) can be checked as a pair.
alter table public.doctors
  add constraint doctors_id_tenant_key unique (id, tenant_id);

-- -------------------------------------------------- doctor performance ---
-- One row per doctor: the figures shown on the Performance tab.
--
-- These are entered, not derived. Consultations and revenue could eventually
-- be counted from appointments and billing, but neither table exists yet, and
-- a hospital needs somewhere to record them meanwhile. When those tables land
-- this becomes a view and the columns go away.

create table public.doctor_performance (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,

  -- Unique: the tab shows one row per doctor, not a history.
  doctor_id      uuid not null unique,

  patient_volume integer not null default 0
                   constraint doctor_performance_patient_volume_check check (patient_volume >= 0),
  consultations  integer not null default 0
                   constraint doctor_performance_consultations_check check (consultations >= 0),
  revenue        numeric(12, 2) not null default 0
                   constraint doctor_performance_revenue_check check (revenue >= 0),

  -- Same 0-5 scale as doctors.rating in 0005.
  feedback       numeric(2, 1) not null default 0
                   constraint doctor_performance_feedback_check check (feedback >= 0 and feedback <= 5),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- The pair, not just the id. RLS already stops a hospital_admin writing
  -- another hospital's tenant_id, but a super_admin passes tenant_id
  -- explicitly, and without this could file a row under hospital B that
  -- points at hospital A's doctor.
  constraint doctor_performance_doctor_fkey
    foreign key (doctor_id, tenant_id)
    references public.doctors (id, tenant_id) on delete cascade
);

create index doctor_performance_tenant_id_idx on public.doctor_performance (tenant_id);

create trigger doctor_performance_set_updated_at
  before update on public.doctor_performance
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.doctor_performance');

-- ------------------------------------------------------ doctor shifts ---
-- The weekly duty roster. Many rows per doctor.

create table public.doctor_shifts (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  doctor_id   uuid not null,

  -- Stored as the three-letter label the roster renders, so the grid needs no
  -- lookup table and no locale-dependent weekday maths.
  day_of_week text not null
                constraint doctor_shifts_day_of_week_check
                check (day_of_week in ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),

  start_time  time not null,
  end_time    time not null,

  shift_type  text not null default 'Regular'
                constraint doctor_shifts_shift_type_check
                check (shift_type in ('Regular', 'On-Call', 'Emergency', 'Surgery', 'Off')),

  ward        text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Deliberately NOT `end_time > start_time`. A night shift running 20:00 to
  -- 06:00 is ordinary in a hospital, and that constraint would reject it.
  -- end_time < start_time means the shift crosses midnight. Equal times are
  -- rejected, because a zero-length shift is always a mistake.
  constraint doctor_shifts_duration_check check (end_time <> start_time),

  constraint doctor_shifts_doctor_fkey
    foreign key (doctor_id, tenant_id)
    references public.doctors (id, tenant_id) on delete cascade
);

create index doctor_shifts_tenant_id_idx on public.doctor_shifts (tenant_id);
create index doctor_shifts_doctor_idx    on public.doctor_shifts (tenant_id, doctor_id);
create index doctor_shifts_day_idx       on public.doctor_shifts (tenant_id, day_of_week);

create trigger doctor_shifts_set_updated_at
  before update on public.doctor_shifts
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.doctor_shifts');
