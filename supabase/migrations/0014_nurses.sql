-- 0014_nurses.sql
-- The three tables behind /admin/nurses. All four tabs — Directory, Department
-- Allocation, Shift Management and Performance — kept their data in
-- localStorage, so a hospital's entire nursing roster lived in one browser.
--
-- Department Allocation needs no table of its own: it is a view over
-- nurses.ward, and moving a nurse between wards is an update to that column.

-- --------------------------------------------------------------- nurses ---

create table public.nurses (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,

  name             text not null
                     constraint nurses_name_check check (length(btrim(name)) > 0),

  -- Free text, deliberately, for now. A real `wards` table is coming with the
  -- ward management work (PR #12), and this column should become a foreign key
  -- into it once that lands. Guessing at the shape of that table before it is
  -- merged would mean writing a migration to undo.
  ward             text,

  shift            text not null default 'Morning'
                     constraint nurses_shift_check
                     check (shift in ('Morning', 'Evening', 'Night')),

  license          text,
  phone            text,
  email            text
                     constraint nurses_email_check
                     check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),

  experience_years integer
                     constraint nurses_experience_years_check
                     check (experience_years is null or experience_years >= 0),
  qualification    text,

  -- Same vocabulary as doctors.status in 0005 and doctor_assistants in 0013.
  status           text not null default 'active'
                     constraint nurses_status_check
                     check (status in ('active', 'on_leave', 'suspended')),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Lets the two child tables below carry a composite foreign key.
  constraint nurses_id_tenant_key unique (id, tenant_id)
);

create index nurses_tenant_id_idx on public.nurses (tenant_id);
create index nurses_ward_idx      on public.nurses (tenant_id, ward);

-- A registration number identifies one nurse within a hospital. Partial,
-- because most rows are captured without one and several nulls must coexist.
create unique index nurses_license_key
  on public.nurses (tenant_id, license) where license is not null;

create trigger nurses_set_updated_at
  before update on public.nurses
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.nurses');

-- --------------------------------------------------------- nurse shifts ---
-- The weekly roster grid. Many rows per nurse.
--
-- Note this is NOT shaped like doctor_shifts (0012). A doctor's roster records
-- start and end times; the nurse grid the UI draws records a named shift block
-- per day. Forcing them into one shape would mean inventing times the screen
-- never asks for.

create table public.nurse_shifts (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  nurse_id    uuid not null,

  day_of_week text not null
                constraint nurse_shifts_day_of_week_check
                check (day_of_week in ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),

  shift_type  text not null default 'Morning'
                constraint nurse_shifts_shift_type_check
                check (shift_type in ('Morning', 'Evening', 'Night', 'Off')),

  ward        text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- One nurse may work Morning AND Evening on the same day — a double shift is
  -- ordinary. What is always a mistake is the SAME block twice, so the pair is
  -- unique on (day, type) rather than on day alone.
  constraint nurse_shifts_unique_block unique (tenant_id, nurse_id, day_of_week, shift_type),

  constraint nurse_shifts_nurse_fkey
    foreign key (nurse_id, tenant_id)
    references public.nurses (id, tenant_id) on delete cascade
);

create index nurse_shifts_tenant_id_idx on public.nurse_shifts (tenant_id);
create index nurse_shifts_nurse_idx     on public.nurse_shifts (tenant_id, nurse_id);

create trigger nurse_shifts_set_updated_at
  before update on public.nurse_shifts
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.nurse_shifts');

-- ---------------------------------------------------- nurse performance ---
-- One row per nurse: the figures shown on the Performance tab.
--
-- Entered, not derived — same caveat as doctor_performance in 0012. Once
-- admissions and attendance exist these become countable and this turns into a
-- view.

create table public.nurse_performance (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,

  -- Unique: the tab shows one row per nurse, not a history.
  nurse_id         uuid not null unique,

  patients_handled integer not null default 0
                     constraint nurse_performance_patients_handled_check check (patients_handled >= 0),
  hours_worked     integer not null default 0
                     constraint nurse_performance_hours_worked_check check (hours_worked >= 0),

  attendance_pct   numeric(5, 2) not null default 0
                     constraint nurse_performance_attendance_pct_check
                     check (attendance_pct >= 0 and attendance_pct <= 100),

  incidents        integer not null default 0
                     constraint nurse_performance_incidents_check check (incidents >= 0),

  -- Same 0-5 scale as doctors.rating and doctor_performance.feedback.
  feedback         numeric(2, 1) not null default 0
                     constraint nurse_performance_feedback_check
                     check (feedback >= 0 and feedback <= 5),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint nurse_performance_nurse_fkey
    foreign key (nurse_id, tenant_id)
    references public.nurses (id, tenant_id) on delete cascade
);

create index nurse_performance_tenant_id_idx on public.nurse_performance (tenant_id);

create trigger nurse_performance_set_updated_at
  before update on public.nurse_performance
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.nurse_performance');
