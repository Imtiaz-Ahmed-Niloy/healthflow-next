-- 0039_employees.sql
-- The table behind /admin/onboarding (HF-68), which until now kept three demo
-- staff in localStorage under storeKey "hr-onboarding-v2" — so every hospital
-- saw the same fake Nadia/Tanvir/Mariam and nothing an HR admin entered
-- survived a refresh.
--
-- WHY `employees` AND NOT `onboarding_records`
-- The ticket calls them onboarding records, and the page is headed "Onboard new
-- employees". But this is not a checklist that gets archived when onboarding
-- finishes — it is the hospital's staff register, and two other modules already
-- read it as exactly that:
--
--   src/lib/payroll.ts       getEligibleEmployees() — who gets paid
--   src/views/admin/Attendance.tsx — who can clock in and request leave
--
-- Onboarding is the first three columns of a row's life (documents ->
-- orientation -> active), not the reason the row exists. Naming it
-- `onboarding_records` would have the next person reasonably assume they may
-- delete completed ones, which would silently empty payroll.
--
-- Statuses are lowercase text with a check, matching assets (0033) and
-- pharmacy_items (0036), not a Postgres enum — adding a value later is then an
-- ALTER of one constraint rather than a type migration.

create table public.employees (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,

  -- The hospital's own staff number ("EMP-1101"). Theirs, not ours, so it is
  -- free text — but it identifies one person inside one hospital, hence the
  -- unique index below.
  emp_id       text not null
                 constraint employees_emp_id_check check (length(btrim(emp_id)) > 0),
  name         text not null
                 constraint employees_name_check check (length(btrim(name)) > 0),

  -- Personal details. All optional: HR fills these in over time, and a row has
  -- to be creatable the moment someone is hired.
  father_name  text,
  mother_name  text,
  marital_status text
                 constraint employees_marital_status_check
                 check (marital_status in ('single', 'married', 'divorced', 'widowed')),
  religion     text
                 constraint employees_religion_check
                 check (religion in ('islam', 'hinduism', 'christianity', 'buddhism', 'other')),
  -- Not lowercased: a blood group is a printed medical value, and 'ab+' would
  -- be wrong on a form that a nurse reads in a hurry.
  blood_group  text
                 constraint employees_blood_group_check
                 check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  nid          text,
  phone        text,
  email        text,

  -- Job. `department` is free text like vendors.category (0030) — a hospital's
  -- org chart is its own vocabulary and no closed list is worth a migration per
  -- new team. The form still offers the common ones.
  department   text,
  designation  text,
  employment_type text
                 constraint employees_employment_type_check
                 check (employment_type in ('full_time', 'part_time', 'contract', 'intern', 'consultant')),
  -- Read by payroll: 'terminated' and 'resigned' are excluded from a run.
  job_status   text not null default 'active'
                 constraint employees_job_status_check
                 check (job_status in ('active', 'probation', 'suspended', 'terminated', 'resigned')),
  gross_salary numeric(14, 2)
                 constraint employees_gross_salary_check check (gross_salary >= 0),
  start_date   date,
  end_date     date,
  present_address   text,
  permanent_address text,

  -- Onboarding progress. Named `*_status` because bare `documents` reads like a
  -- list of files, which is what HF-64 will add and this is not.
  documents_status  text not null default 'pending'
                 constraint employees_documents_status_check
                 check (documents_status in ('pending', 'verified', 'rejected')),
  orientation_status text not null default 'pending'
                 constraint employees_orientation_status_check
                 check (orientation_status in ('pending', 'scheduled', 'completed')),
  status       text not null default 'pending'
                 constraint employees_status_check
                 check (status in ('pending', 'in_progress', 'completed')),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index employees_tenant_id_idx on public.employees (tenant_id);
create index employees_status_idx    on public.employees (tenant_id, status);
-- Payroll and attendance both filter on job_status before doing anything else.
create index employees_job_status_idx on public.employees (tenant_id, job_status);

-- One staff number identifies one person inside a hospital. Without this, two
-- rows sharing EMP-1101 means payroll pays a number it cannot attribute.
-- Scoped to the tenant, so two hospitals may each run their own numbering.
create unique index employees_tenant_emp_id_key
  on public.employees (tenant_id, lower(btrim(emp_id)));

create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- The entire security story for this table.
select public.apply_tenant_rls('public.employees');
