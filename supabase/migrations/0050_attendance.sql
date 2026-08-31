-- 0050_attendance.sql
-- The tables behind /admin/attendance. The staff list has been real since
-- HF-68 (employees), but everything the page recorded about them was in
-- localStorage under three keys — attendance-records-v1, leave-requests-v2 and
-- holidays-v1 — seeded with a demo month on first load. Every browser had its
-- own private attendance history, and nobody else could see any of it.

-- ------------------------------------------------------------- attendance ---
--
-- Only real events are recorded: someone was present, late, absent, on leave,
-- or worked half a day.
--
-- The page's status list also had "Weekend" and "Holiday", and its demo seeder
-- wrote a row per employee per calendar day to carry them. Neither is a fact
-- about a person — a Friday is a Friday for everyone, and a public holiday is
-- the row in `holidays` below. Deriving them instead keeps this table to the
-- days something actually happened, which is roughly a fifth the rows.
create type public.attendance_status as enum (
  'present', 'late', 'absent', 'leave', 'half_day'
);

create table public.attendance_records (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  employee_id  uuid not null references public.employees (id) on delete cascade,

  work_date    date not null,

  -- Null when the person never clocked in (absent, on leave). Clock-out can be
  -- null on its own: someone who is still here has arrived but not left.
  check_in     time,
  check_out    time,

  status       public.attendance_status not null,

  note         text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Worked hours are check_out minus check_in and are NOT stored. A stored
  -- total is one more thing that can disagree with the two times beside it.
  constraint attendance_records_times_ordered
    check (check_in is null or check_out is null or check_out > check_in)
);

create index attendance_records_tenant_date_idx
  on public.attendance_records (tenant_id, work_date);
create index attendance_records_employee_idx
  on public.attendance_records (employee_id, work_date);

-- One record per person per day. Two is a double clock-in, which inflates
-- every total on the monthly sheet.
create unique index attendance_records_employee_date_key
  on public.attendance_records (employee_id, work_date);

create trigger attendance_records_set_updated_at
  before update on public.attendance_records
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.attendance_records');

-- ----------------------------------------------------------------- leave ---

create type public.leave_type as enum ('sick', 'casual', 'vacation', 'maternity', 'unpaid');
create type public.leave_status as enum ('pending', 'approved', 'rejected');

create table public.leave_requests (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  employee_id  uuid not null references public.employees (id) on delete cascade,

  type         public.leave_type not null,
  start_date   date not null,
  end_date     date not null,
  reason       text,
  status       public.leave_status not null default 'pending',

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Day count is end minus start and is not stored, for the same reason worked
  -- hours are not.
  constraint leave_requests_dates_ordered check (end_date >= start_date)
);

create index leave_requests_tenant_idx   on public.leave_requests (tenant_id, status);
create index leave_requests_employee_idx on public.leave_requests (employee_id, start_date);

create trigger leave_requests_set_updated_at
  before update on public.leave_requests
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.leave_requests');

-- -------------------------------------------------------------- holidays ---
-- A hospital's own calendar. Public holidays differ by country and by year, so
-- this is data a hospital keeps, not a constant in the code — which is what it
-- was.

create table public.holidays (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,

  holiday_on  date not null,
  name        text not null
                constraint holidays_name_check check (length(btrim(name)) > 0),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index holidays_tenant_date_idx on public.holidays (tenant_id, holiday_on);

-- One holiday per date per hospital.
create unique index holidays_tenant_date_key on public.holidays (tenant_id, holiday_on);

create trigger holidays_set_updated_at
  before update on public.holidays
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.holidays');

-- ------------------------------------------------------------- role gate ---
-- Attendance and leave are HR records about named staff, so they get the same
-- gate as employees and payroll (0045). Without one, the role-blind tenant
-- template would let any doctor read when every colleague clocked in and what
-- leave they had asked for. Holidays are deliberately NOT gated: the hospital
-- calendar is not sensitive and other modules will want it.
create policy attendance_records_role_gate on public.attendance_records
  as restrictive for all to authenticated
  using (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin'))
  with check (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin'));

create policy leave_requests_role_gate on public.leave_requests
  as restrictive for all to authenticated
  using (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin'))
  with check (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin'));
