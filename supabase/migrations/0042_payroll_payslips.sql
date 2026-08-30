-- 0042_payroll_payslips.sql
-- Finishes HF-67. 0037 made the payroll *runs* real and said so plainly:
-- "Payslip lines are still computed client-side ... When payslips get their
-- own table they can add a run_id foreign key without reshaping anything
-- here." This is that table, and two others the payslips depend on.
--
-- What was still in localStorage after 0037:
--   payslips:<runId>                  the payslip lines themselves
--   payroll-settings-v1               the percentages every amount is derived from
--   payroll-deduction-overrides-v1    per-employee tax / other overrides
--
-- The settings one is the reason this could not be left half-done: two admins
-- in the same hospital had their own private idea of what "basic" is, so the
-- same employee produced different payslips depending on whose browser
-- processed the run.

-- ---------------------------------------------------------------------------
-- Settings: one row per hospital.
-- ---------------------------------------------------------------------------

create table public.payroll_settings (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null unique references public.tenants (id) on delete cascade,

  -- Percentages of gross. Defaults match the old localStorage defaults exactly,
  -- so a hospital that never opened the settings dialog sees no change.
  basic_pct        numeric(5, 2) not null default 50,
  house_rent_pct   numeric(5, 2) not null default 30,
  medical_pct      numeric(5, 2) not null default 10,
  conveyance_pct   numeric(5, 2) not null default 10,

  pf_pct           numeric(5, 2) not null default 8,   -- of basic
  tax_pct          numeric(5, 2) not null default 5,   -- of gross, above the threshold
  tax_threshold    numeric(14, 2) not null default 25000,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint payroll_settings_pct_range check (
    basic_pct between 0 and 100 and house_rent_pct between 0 and 100 and
    medical_pct between 0 and 100 and conveyance_pct between 0 and 100 and
    pf_pct between 0 and 100 and tax_pct between 0 and 100
  ),
  constraint payroll_settings_tax_threshold_check check (tax_threshold >= 0),

  -- The four earnings components split the gross between them, so they have to
  -- total 100. The dialog already refused to save otherwise; now the database
  -- does too, because a run processed through the API never sees that dialog.
  constraint payroll_settings_earnings_total_100 check (
    basic_pct + house_rent_pct + medical_pct + conveyance_pct = 100
  )
);

create trigger payroll_settings_set_updated_at
  before update on public.payroll_settings
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.payroll_settings');

-- ---------------------------------------------------------------------------
-- Payslips: one line per employee per run.
-- ---------------------------------------------------------------------------

create table public.payroll_payslips (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  run_id       uuid not null references public.payroll_runs (id) on delete cascade,

  -- Who it belongs to now, and who it belonged to then.
  --
  -- employee_id is the live link, and goes null rather than taking the payslip
  -- with it when someone is removed from the register. The four snapshot
  -- columns below are why: a payslip is a record of a payment that was made,
  -- so renaming an employee or moving them between departments must not
  -- silently rewrite what last March's payslip says.
  employee_id  uuid references public.employees (id) on delete set null,
  emp_id       text not null,
  name         text not null,
  department   text,
  designation  text,

  period       text not null
                 constraint payroll_payslips_period_check check (period ~ '^[0-9]{4}-[0-9]{2}$'),

  -- Earnings. transport absorbs the rounding remainder so the four always sum
  -- to gross exactly, same as the engine has always done.
  basic        numeric(14, 2) not null default 0,
  house_rent   numeric(14, 2) not null default 0,
  medical      numeric(14, 2) not null default 0,
  transport    numeric(14, 2) not null default 0,
  gross        numeric(14, 2) not null default 0,

  -- Deductions.
  pf           numeric(14, 2) not null default 0,
  tax          numeric(14, 2) not null default 0,
  loan         numeric(14, 2) not null default 0,
  total_deductions numeric(14, 2) not null default 0,

  -- Deliberately unconstrained: a large enough loan or advance can put a month
  -- underwater, and refusing to record that would not make it untrue.
  net          numeric(14, 2) not null default 0,

  generated_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint payroll_payslips_amounts_non_negative check (
    basic >= 0 and house_rent >= 0 and medical >= 0 and transport >= 0 and
    gross >= 0 and pf >= 0 and tax >= 0 and loan >= 0 and total_deductions >= 0
  )
);

create index payroll_payslips_tenant_id_idx on public.payroll_payslips (tenant_id);
create index payroll_payslips_run_id_idx    on public.payroll_payslips (run_id);

-- One payslip per employee per run. Processing a run twice replaces its lines
-- rather than adding a second set — without this, a double-click on "Process"
-- doubles a hospital's reported gross.
create unique index payroll_payslips_run_employee_key
  on public.payroll_payslips (run_id, emp_id);

create trigger payroll_payslips_set_updated_at
  before update on public.payroll_payslips
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.payroll_payslips');

-- ---------------------------------------------------------------------------
-- Deduction overrides: a standing adjustment for one employee.
-- ---------------------------------------------------------------------------

create table public.payroll_deduction_overrides (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  employee_id  uuid not null references public.employees (id) on delete cascade,

  -- Null means "use the computed figure". Zero is a real override meaning
  -- "deduct nothing", which is why these are nullable rather than defaulted.
  tax          numeric(14, 2)
                 constraint payroll_deduction_overrides_tax_check check (tax is null or tax >= 0),
  other        numeric(14, 2)
                 constraint payroll_deduction_overrides_other_check check (other is null or other >= 0),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index payroll_deduction_overrides_tenant_id_idx
  on public.payroll_deduction_overrides (tenant_id);

create unique index payroll_deduction_overrides_employee_key
  on public.payroll_deduction_overrides (tenant_id, employee_id);

create trigger payroll_deduction_overrides_set_updated_at
  before update on public.payroll_deduction_overrides
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.payroll_deduction_overrides');
