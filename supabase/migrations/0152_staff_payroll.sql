-- 0152_staff_payroll.sql
-- Payroll for the people a doctor or a pharmacy pays themselves.
--
-- The hospital already has payroll (0037, 0042) for its employees table. A
-- doctor's own team (0147) and a pharmacy's staff are paid by the doctor and
-- by the pharmacy, not by a hospital, so each gets its own small ledger:
--
--   doctor_team_members.monthly_salary   what a member is paid a month
--   doctor_team_payslips                 one row per member per month
--
--   pharmacy_employees                   everyone the pharmacy pays — with or
--                                        without a pharmacy login (a delivery
--                                        boy has none)
--   pharmacy_payslips                    one row per employee per month
--
-- A payslip is basic + allowance + bonus - deduction - advance. `net` is
-- worked out by the database so the two panels and the apps can't disagree.
-- The name and the role are copied onto the slip when it is made, so last
-- year's slip still reads the same after somebody is renamed or removed.
--
-- Paying a pharmacy payslip (pharmacy_pay_payslip) also books the money as a
-- "Salary" expense, so the month's expenses and the profit report include
-- wages without anyone typing them in twice. Undoing the payment removes that
-- expense again.
--
-- Who sees what:
--   doctor side    the doctor sees and writes their own team's slips; a member
--                  with a login (doctor_staff) reads their own, nothing else
--   pharmacy side  tenant RLS, then only a login that may administer the
--                  pharmacy (pharmacy_can('administer')), the hospital's admin,
--                  or finance (read only). Salaries are not a cashier's
--                  business.

-- ============================================================ doctor side ===

alter table public.doctor_team_members
  add column monthly_salary numeric(12,2) not null default 0
    constraint doctor_team_members_monthly_salary_check check (monthly_salary >= 0);

-- 0147 grants insert and update column by column; the salary joins them.
grant insert (monthly_salary) on public.doctor_team_members to authenticated;
grant update (monthly_salary) on public.doctor_team_members to authenticated;

create table public.doctor_team_payslips (
  id               uuid primary key default gen_random_uuid(),

  -- The doctor who pays. Defaults to the caller; RLS holds it there.
  owner_profile_id uuid not null default auth.uid()
                     references public.profiles (id) on delete cascade,
  member_id        uuid not null
                     references public.doctor_team_members (id) on delete cascade,

  -- The month paid for, as its first day.
  period           date not null
                     constraint doctor_team_payslips_period_check check (extract(day from period) = 1),

  member_name      text not null,
  member_role      text not null,

  basic            numeric(12,2) not null default 0 constraint doctor_team_payslips_basic_check check (basic >= 0),
  allowance        numeric(12,2) not null default 0 constraint doctor_team_payslips_allowance_check check (allowance >= 0),
  bonus            numeric(12,2) not null default 0 constraint doctor_team_payslips_bonus_check check (bonus >= 0),
  deduction        numeric(12,2) not null default 0 constraint doctor_team_payslips_deduction_check check (deduction >= 0),
  advance          numeric(12,2) not null default 0 constraint doctor_team_payslips_advance_check check (advance >= 0),
  net              numeric(12,2) generated always as (basic + allowance + bonus - deduction - advance) stored,

  status           text not null default 'unpaid'
                     constraint doctor_team_payslips_status_check check (status in ('unpaid', 'paid')),
  paid_on          date,
  payment_method   text
                     constraint doctor_team_payslips_method_check
                     check (payment_method is null or payment_method in ('cash', 'bkash', 'nagad', 'rocket', 'bank', 'other')),
  notes            text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint doctor_team_payslips_member_period_key unique (member_id, period),
  -- A paid slip says when.
  constraint doctor_team_payslips_paid_check check (status = 'unpaid' or paid_on is not null)
);

create index doctor_team_payslips_owner_period_idx on public.doctor_team_payslips (owner_profile_id, period desc);

create trigger doctor_team_payslips_set_updated_at
  before update on public.doctor_team_payslips
  for each row execute function public.set_updated_at();

select public.attach_audit('public.doctor_team_payslips');

-- The slip stays with its member and its doctor: neither can be rewritten.
revoke all on public.doctor_team_payslips from anon;
revoke insert, update on public.doctor_team_payslips from authenticated;
grant select, delete on public.doctor_team_payslips to authenticated;
grant insert (owner_profile_id, member_id, period, member_name, member_role, basic, allowance, bonus,
              deduction, advance, status, paid_on, payment_method, notes)
  on public.doctor_team_payslips to authenticated;
grant update (member_name, member_role, basic, allowance, bonus, deduction, advance, status, paid_on,
              payment_method, notes)
  on public.doctor_team_payslips to authenticated;

alter table public.doctor_team_payslips enable row level security;

create policy doctor_team_payslips_select on public.doctor_team_payslips
  for select to authenticated
  using (
    owner_profile_id = (select auth.uid())
    or public.is_super_admin()
    or exists (
      select 1 from public.doctor_team_members m
      where m.id = doctor_team_payslips.member_id and m.profile_id = (select auth.uid())
    )
  );

-- Only for a member of the doctor's own team.
create policy doctor_team_payslips_insert on public.doctor_team_payslips
  for insert to authenticated
  with check (
    public.is_super_admin()
    or (
      owner_profile_id = (select auth.uid())
      and public.auth_role() = 'doctor'
      and exists (
        select 1 from public.doctor_team_members m
        where m.id = member_id and m.owner_profile_id = (select auth.uid())
      )
    )
  );

create policy doctor_team_payslips_update on public.doctor_team_payslips
  for update to authenticated
  using (public.is_super_admin() or (owner_profile_id = (select auth.uid()) and public.auth_role() = 'doctor'))
  with check (public.is_super_admin() or (owner_profile_id = (select auth.uid()) and public.auth_role() = 'doctor'));

create policy doctor_team_payslips_delete on public.doctor_team_payslips
  for delete to authenticated
  using (public.is_super_admin() or (owner_profile_id = (select auth.uid()) and public.auth_role() = 'doctor'));

-- ========================================================== pharmacy side ===

create table public.pharmacy_employees (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,

  name           text not null
                   constraint pharmacy_employees_name_check check (length(btrim(name)) > 0),
  phone          text,
  designation    text,
  branch_id      uuid references public.pharmacy_branches (id) on delete set null,
  -- Their pharmacy login, when they have one (pharmacy_staff.profile_id).
  profile_id     uuid references public.profiles (id) on delete set null,

  monthly_salary numeric(12,2) not null default 0
                   constraint pharmacy_employees_monthly_salary_check check (monthly_salary >= 0),
  joined_on      date,
  status         text not null default 'active'
                   constraint pharmacy_employees_status_check check (status in ('active', 'inactive')),
  notes          text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index pharmacy_employees_tenant_idx on public.pharmacy_employees (tenant_id);
create unique index pharmacy_employees_profile_key on public.pharmacy_employees (profile_id) where profile_id is not null;

create trigger pharmacy_employees_set_updated_at
  before update on public.pharmacy_employees
  for each row execute function public.set_updated_at();

create trigger pharmacy_employees_same_tenant
  before insert or update on public.pharmacy_employees
  for each row execute function public.pharmacy_same_tenant('pharmacy_branches', 'branch_id');

create table public.pharmacy_payslips (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  employee_id    uuid not null references public.pharmacy_employees (id) on delete cascade,

  period         date not null
                   constraint pharmacy_payslips_period_check check (extract(day from period) = 1),

  employee_name  text not null,
  designation    text,

  basic          numeric(12,2) not null default 0 constraint pharmacy_payslips_basic_check check (basic >= 0),
  allowance      numeric(12,2) not null default 0 constraint pharmacy_payslips_allowance_check check (allowance >= 0),
  bonus          numeric(12,2) not null default 0 constraint pharmacy_payslips_bonus_check check (bonus >= 0),
  deduction      numeric(12,2) not null default 0 constraint pharmacy_payslips_deduction_check check (deduction >= 0),
  advance        numeric(12,2) not null default 0 constraint pharmacy_payslips_advance_check check (advance >= 0),
  net            numeric(12,2) generated always as (basic + allowance + bonus - deduction - advance) stored,

  status         text not null default 'unpaid'
                   constraint pharmacy_payslips_status_check check (status in ('unpaid', 'paid')),
  paid_on        date,
  payment_method text
                   constraint pharmacy_payslips_method_check
                   check (payment_method is null or payment_method in ('cash', 'bkash', 'nagad', 'rocket', 'bank', 'other')),
  -- The "Salary" expense the payment was booked as. Set and cleared only by
  -- pharmacy_pay_payslip / pharmacy_unpay_payslip.
  expense_id     uuid references public.pharmacy_expenses (id) on delete set null,
  notes          text,

  created_by      uuid references public.profiles (id) on delete set null,
  created_by_name text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint pharmacy_payslips_employee_period_key unique (employee_id, period)
);

create index pharmacy_payslips_tenant_period_idx on public.pharmacy_payslips (tenant_id, period desc);

create trigger pharmacy_payslips_set_updated_at
  before update on public.pharmacy_payslips
  for each row execute function public.set_updated_at();

create trigger pharmacy_payslips_stamp_actor
  before insert on public.pharmacy_payslips
  for each row execute function public.pharmacy_stamp_actor();

create trigger pharmacy_payslips_same_tenant
  before insert or update on public.pharmacy_payslips
  for each row execute function public.pharmacy_same_tenant('pharmacy_employees', 'employee_id');

-- Paying goes through the function, so the expense moves with it. A plain
-- update may correct the amounts and the note of an unpaid slip only. A
-- column revoke can't narrow a table grant, so the grant is replaced.
revoke update on public.pharmacy_payslips from authenticated;
grant update (employee_name, designation, basic, allowance, bonus, deduction, advance, notes)
  on public.pharmacy_payslips to authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['pharmacy_employees', 'pharmacy_payslips'] loop
    perform public.apply_tenant_rls(('public.' || v_table)::regclass);
    perform public.apply_role_gate(
      ('public.' || v_table)::regclass,
      '{hospital_admin,pharmacy_admin,finance_admin}',
      '{hospital_admin,pharmacy_admin}');

    -- Restrictive, like the permission policies in 0133: only ever take away.
    execute format(
      'create policy %I on public.%I as restrictive for select to authenticated '
      || 'using (public.pharmacy_can(''administer'') or public.auth_role() = ''finance_admin'')',
      v_table || '_perm_select', v_table);
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated with check (public.pharmacy_can(''administer''))',
      v_table || '_perm_insert', v_table);
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated '
      || 'using (public.pharmacy_can(''administer'')) with check (public.pharmacy_can(''administer''))',
      v_table || '_perm_update', v_table);
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated using (public.pharmacy_can(''administer''))',
      v_table || '_perm_delete', v_table);

    perform public.attach_audit(('public.' || v_table)::regclass);
  end loop;
end;
$$;

-- A paid slip is history: its amounts no longer change, and it can't be
-- deleted until the payment is undone (which also removes the expense).
create or replace function public.pharmacy_payslips_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('healthflow.payslip_payment', true), '') = 'on' then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    -- A person deleting a paid slip. The service role removing a whole
    -- pharmacy (no auth.uid()) cascades through regardless.
    if old.status = 'paid' and (select auth.uid()) is not null then
      raise exception 'This payslip is paid. Undo the payment first.'
        using errcode = 'PH001', hint = 'payslip_paid';
    end if;
    return old;
  end if;

  if old.status = 'paid' and (
       new.basic is distinct from old.basic or new.allowance is distinct from old.allowance
       or new.bonus is distinct from old.bonus or new.deduction is distinct from old.deduction
       or new.advance is distinct from old.advance) then
    raise exception 'This payslip is paid. Undo the payment before changing the amounts.'
      using errcode = 'PH001', hint = 'payslip_paid';
  end if;
  return new;
end;
$$;

create trigger pharmacy_payslips_guard
  before update or delete on public.pharmacy_payslips
  for each row execute function public.pharmacy_payslips_guard();

-- ------------------------------------------------------------ functions ---

-- Makes this month's slips: one per active employee who has none yet, at
-- their monthly salary. Slips already made are left alone. Answers with how
-- many were made.
create or replace function public.pharmacy_generate_payslips(p_period date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := public.auth_tenant_id();
  v_period date := date_trunc('month', p_period)::date;
  v_user   uuid := (select auth.uid());
  v_name   text := (select p.full_name from public.profiles p where p.id = (select auth.uid()));
  v_count  integer;
begin
  if v_tenant is null or not public.pharmacy_can('administer') then
    raise exception 'You do not have permission to run payroll.' using errcode = 'PH403', hint = 'no_permission';
  end if;

  insert into public.pharmacy_payslips (tenant_id, employee_id, period, employee_name, designation, basic, created_by, created_by_name)
  select e.tenant_id, e.id, v_period, e.name, e.designation, e.monthly_salary, v_user, v_name
    from public.pharmacy_employees e
   where e.tenant_id = v_tenant
     and e.status = 'active'
     and (e.joined_on is null or e.joined_on < (v_period + interval '1 month')::date)
  on conflict (employee_id, period) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Marks a slip paid and books it as a "Salary" expense on the day it was paid.
create or replace function public.pharmacy_pay_payslip(p_id uuid, p_method text default 'cash', p_paid_on date default current_date)
returns public.pharmacy_payslips
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slip    public.pharmacy_payslips;
  v_expense uuid;
begin
  if not public.pharmacy_can('administer') then
    raise exception 'You do not have permission to run payroll.' using errcode = 'PH403', hint = 'no_permission';
  end if;

  select * into v_slip from public.pharmacy_payslips
   where id = p_id and tenant_id = public.auth_tenant_id()
   for update;

  if v_slip.id is null then
    raise exception 'Payslip not found' using errcode = 'PH001', hint = 'not_found';
  end if;
  if v_slip.status = 'paid' then
    raise exception 'This payslip is already paid.' using errcode = 'PH001', hint = 'payslip_paid';
  end if;
  if v_slip.net < 0 then
    raise exception 'Deductions are more than the pay on this slip.' using errcode = 'PH001', hint = 'negative_net';
  end if;

  if v_slip.net > 0 then
    insert into public.pharmacy_expenses (tenant_id, expense_date, category, description, amount)
    values (
      v_slip.tenant_id,
      coalesce(p_paid_on, current_date),
      'Salary',
      v_slip.employee_name || ' — ' || to_char(v_slip.period, 'Mon YYYY'),
      v_slip.net
    )
    returning id into v_expense;
  end if;

  perform set_config('healthflow.payslip_payment', 'on', true);

  update public.pharmacy_payslips
     set status = 'paid',
         paid_on = coalesce(p_paid_on, current_date),
         payment_method = coalesce(nullif(btrim(p_method), ''), 'cash'),
         expense_id = v_expense
   where id = v_slip.id
  returning * into v_slip;

  perform set_config('healthflow.payslip_payment', 'off', true);
  return v_slip;
end;
$$;

-- Undoes a payment made by mistake, and takes its expense back out.
create or replace function public.pharmacy_unpay_payslip(p_id uuid)
returns public.pharmacy_payslips
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slip    public.pharmacy_payslips;
  v_expense uuid;
begin
  if not public.pharmacy_can('administer') then
    raise exception 'You do not have permission to run payroll.' using errcode = 'PH403', hint = 'no_permission';
  end if;

  select * into v_slip from public.pharmacy_payslips
   where id = p_id and tenant_id = public.auth_tenant_id()
   for update;

  if v_slip.id is null then
    raise exception 'Payslip not found' using errcode = 'PH001', hint = 'not_found';
  end if;
  if v_slip.status <> 'paid' then
    return v_slip;
  end if;

  v_expense := v_slip.expense_id;

  perform set_config('healthflow.payslip_payment', 'on', true);

  update public.pharmacy_payslips
     set status = 'unpaid', paid_on = null, payment_method = null, expense_id = null
   where id = v_slip.id
  returning * into v_slip;

  perform set_config('healthflow.payslip_payment', 'off', true);

  if v_expense is not null then
    delete from public.pharmacy_expenses where id = v_expense;
  end if;

  return v_slip;
end;
$$;

revoke execute on function public.pharmacy_generate_payslips(date) from public, anon;
revoke execute on function public.pharmacy_pay_payslip(uuid, text, date) from public, anon;
revoke execute on function public.pharmacy_unpay_payslip(uuid) from public, anon;
grant execute on function public.pharmacy_generate_payslips(date) to authenticated;
grant execute on function public.pharmacy_pay_payslip(uuid, text, date) to authenticated;
grant execute on function public.pharmacy_unpay_payslip(uuid) to authenticated;

-- ------------------------------------------------------- the role's pages ---
update public.roles
   set pages = pages || array['/pharmacy/payroll']
 where role = 'pharmacy_admin' and tenant_id is null
   and not pages @> array['/pharmacy/payroll'];

update public.roles
   set pages = pages || array['/portal/payroll']
 where role = 'doctor' and tenant_id is null
   and not pages @> array['/portal/payroll'];
