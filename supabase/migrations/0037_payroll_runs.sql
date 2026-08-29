-- 0037_payroll_runs.sql
-- The table behind /admin/payroll, which until now kept two demo salary runs in
-- localStorage under storeKey "payroll" — so every hospital saw the same fake
-- "PR-2026-04 / PR-2026-05" rows and nothing an admin created survived a
-- refresh.
--
-- A payroll run is one month's salary disbursement for a hospital: pick a
-- period (and optionally a single department), process payslips from the active
-- employees, then walk it draft -> approved -> paid. Payslip lines are still
-- computed client-side from the Onboarding module (localStorage) and are out of
-- scope here; this table only records the run itself. When payslips get their
-- own table they can add a run_id foreign key without reshaping anything here.

create type public.payroll_run_status as enum ('draft', 'approved', 'paid');

create table public.payroll_runs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,

  -- Calendar month the run pays out, as 'YYYY-MM'. A plain text month rather
  -- than a date keeps the form a native <input type="month"> with no timezone
  -- games, and the check stops anything else reaching the column.
  period      text not null
                constraint payroll_runs_period_check check (period ~ '^[0-9]{4}-[0-9]{2}$'),

  -- Null means the run covers every department. A named department scopes it to
  -- that team only. Free text, like vendors.category in 0030 — a hospital's org
  -- chart is its own vocabulary and no closed list is worth a migration per new
  -- team.
  department  text
                constraint payroll_runs_department_check
                check (department is null or length(btrim(department)) > 0),

  -- Human-facing run code shown in the table ("PR-2026-04"). Derived in the UI,
  -- not entered; nullable so a row is still valid without one.
  reference   text,

  -- Filled in when the run is processed. Zero on a freshly created draft.
  headcount   integer not null default 0
                constraint payroll_runs_headcount_check check (headcount >= 0),
  gross_total numeric(14, 2) not null default 0
                constraint payroll_runs_gross_total_check check (gross_total >= 0),
  net_total   numeric(14, 2) not null default 0
                constraint payroll_runs_net_total_check check (net_total >= 0),

  status      public.payroll_run_status not null default 'draft',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index payroll_runs_tenant_id_idx on public.payroll_runs (tenant_id);
create index payroll_runs_status_idx     on public.payroll_runs (tenant_id, status);

-- The run code is derived from the period and department, so submitting the
-- "New payroll run" form twice produces two rows that claim to be the same
-- disbursement. On payroll that is a double payment, not a duplicate listing.
-- Partial because `reference` is nullable: a row without one is still valid.
create unique index payroll_runs_tenant_reference_key
  on public.payroll_runs (tenant_id, lower(btrim(reference)))
  where reference is not null;

create trigger payroll_runs_set_updated_at
  before update on public.payroll_runs
  for each row execute function public.set_updated_at();

-- The entire security story for this table.
select public.apply_tenant_rls('public.payroll_runs');
