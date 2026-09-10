-- 0074_accounts_registers.sql
-- Everything /admin/accounts drew from nothing when 0063 made its books real.
-- The design has twelve tabs; 0063 could back five of them. This backs the
-- rest:
--
--   ledger_accounts.subgroup      the Tally group under each class — Bank
--                                 Accounts, Sundry Debtors, Duties & Taxes.
--                                 Cash & Bank, VAT and gross profit each need
--                                 to know which accounts are which, and the
--                                 five classes cannot say.
--   cost_centers                  departments with a budget; what they spent
--                                 is the expense posted against them.
--   journal_entries.cost_center_id, reconciled_on
--                                 which department a voucher is booked to, and
--                                 the day it was ticked off a bank statement.
--   budgets                       a planned figure per account per month; the
--                                 actual is what was posted, never typed.
--   stock_items                   the stores register the finance desk values.
--   ledger_movements              posted debits and credits per account, per
--                                 month, per cost center — the one aggregate
--                                 the trend chart, budgets and cost centers
--                                 all read.
--
-- Nothing here stores a total. Spent, actual, closing and stock value are all
-- computed from rows that exist for another reason.

-- --------------------------------------------------------------- subgroups ---

alter table public.ledger_accounts add column subgroup text;

-- The standard chart (0063) by code, guarded by class so a hospital that used
-- 1010 for something else keeps its own meaning. Anything unrecognised gets
-- the plain group for its class, which is what it was before this column.
update public.ledger_accounts
   set subgroup = case
     when code = '1010' and "group" = 'asset'     then 'cash_in_hand'
     when code = '1020' and "group" = 'asset'     then 'bank_accounts'
     when code = '1100' and "group" = 'asset'     then 'sundry_debtors'
     when code = '1200' and "group" = 'asset'     then 'fixed_assets'
     when code = '2010' and "group" = 'liability' then 'sundry_creditors'
     when code = '2200' and "group" = 'liability' then 'duties_taxes'
     when code = '5020' and "group" = 'expense'   then 'direct_expenses'
     when "group" = 'asset'     then 'current_assets'
     when "group" = 'liability' then 'current_liabilities'
     when "group" = 'capital'   then 'capital'
     when "group" = 'income'    then 'direct_income'
     else 'indirect_expenses'
   end;

alter table public.ledger_accounts
  alter column subgroup set not null,
  add constraint ledger_accounts_subgroup_check check (
       ("group" = 'asset'     and subgroup in ('cash_in_hand', 'bank_accounts', 'current_assets', 'sundry_debtors', 'fixed_assets'))
    or ("group" = 'liability' and subgroup in ('sundry_creditors', 'duties_taxes', 'current_liabilities', 'loans'))
    or ("group" = 'capital'   and subgroup = 'capital')
    or ("group" = 'income'    and subgroup in ('direct_income', 'indirect_income'))
    or ("group" = 'expense'   and subgroup in ('direct_expenses', 'indirect_expenses'))
  );

-- The subgroup decides the class. The form picks one of thirteen groups the
-- way Tally does, and asking it to send a matching class as well would be one
-- more pair of fields able to disagree.
create or replace function public.ledger_accounts_group_from_subgroup()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new."group" := case
    when new.subgroup in ('cash_in_hand', 'bank_accounts', 'current_assets', 'sundry_debtors', 'fixed_assets')
      then 'asset'::public.ledger_group
    when new.subgroup in ('sundry_creditors', 'duties_taxes', 'current_liabilities', 'loans')
      then 'liability'::public.ledger_group
    when new.subgroup = 'capital'
      then 'capital'::public.ledger_group
    when new.subgroup in ('direct_income', 'indirect_income')
      then 'income'::public.ledger_group
    when new.subgroup in ('direct_expenses', 'indirect_expenses')
      then 'expense'::public.ledger_group
    -- Unknown: leave the class alone and let the check constraint refuse it.
    else new."group"
  end;
  return new;
end;
$$;

create trigger ledger_accounts_derive_group
  before insert or update on public.ledger_accounts
  for each row execute function public.ledger_accounts_group_from_subgroup();

-- The standard chart, now with its groups. Same eighteen accounts as 0063.
create or replace function public.seed_chart_of_accounts()
returns setof public.ledger_accounts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.auth_tenant_id();
begin
  if v_tenant is null then
    raise exception 'no hospital on this account';
  end if;

  if exists (select 1 from public.ledger_accounts where tenant_id = v_tenant) then
    raise exception 'this hospital already has a chart of accounts';
  end if;

  return query
  insert into public.ledger_accounts (tenant_id, code, name, "group", subgroup)
  values
    (v_tenant, '1010', 'Cash in Hand',            'asset',     'cash_in_hand'),
    (v_tenant, '1020', 'Bank Account',            'asset',     'bank_accounts'),
    (v_tenant, '1100', 'Accounts Receivable',     'asset',     'sundry_debtors'),
    (v_tenant, '1200', 'Medical Equipment',       'asset',     'fixed_assets'),
    (v_tenant, '1300', 'Pharmacy Stock',          'asset',     'current_assets'),
    (v_tenant, '2010', 'Accounts Payable',        'liability', 'sundry_creditors'),
    (v_tenant, '2100', 'Salaries Payable',        'liability', 'current_liabilities'),
    (v_tenant, '2200', 'VAT Payable',             'liability', 'duties_taxes'),
    (v_tenant, '3010', 'Capital Account',         'capital',   'capital'),
    (v_tenant, '4010', 'Consultation Revenue',    'income',    'direct_income'),
    (v_tenant, '4020', 'Pharmacy Sales',          'income',    'direct_income'),
    (v_tenant, '4030', 'Laboratory Revenue',      'income',    'direct_income'),
    (v_tenant, '4040', 'Admission & Bed Revenue', 'income',    'direct_income'),
    (v_tenant, '5010', 'Salaries & Wages',        'expense',   'indirect_expenses'),
    (v_tenant, '5020', 'Medical Supplies',        'expense',   'direct_expenses'),
    (v_tenant, '5030', 'Rent',                    'expense',   'indirect_expenses'),
    (v_tenant, '5040', 'Utilities',               'expense',   'indirect_expenses'),
    (v_tenant, '5050', 'Equipment Maintenance',   'expense',   'indirect_expenses')
  returning *;
end;
$$;

-- ------------------------------------------------------------ cost centers ---

create table public.cost_centers (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,

  name        text not null
                constraint cost_centers_name_check check (length(btrim(name)) > 0),

  -- For the period the hospital is tracking, in its own currency. What was
  -- spent against it is not a column: it is the expense posted to vouchers
  -- carrying this center, and it is read from ledger_movements.
  budget      numeric(14, 2) not null default 0
                constraint cost_centers_budget_check check (budget >= 0),

  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index cost_centers_tenant_id_idx on public.cost_centers (tenant_id);

create unique index cost_centers_tenant_name_key
  on public.cost_centers (tenant_id, lower(btrim(name)));

create trigger cost_centers_set_updated_at
  before update on public.cost_centers
  for each row execute function public.set_updated_at();

-- ------------------------------------------------- vouchers: center, bank tick ---

alter table public.journal_entries
  -- A voucher is booked to one department or none. Deleting the department
  -- leaves the voucher standing, unallocated, rather than taking it with it.
  add column cost_center_id uuid references public.cost_centers (id) on delete set null,
  -- The day this voucher was matched against a bank statement. Null is "not
  -- yet", which is every voucher until someone reconciles.
  add column reconciled_on  date;

create index journal_entries_cost_center_idx on public.journal_entries (cost_center_id);

-- Same guard journal_lines has for accounts: a voucher cannot be booked to
-- another hospital's department. Security invoker, so RLS already hides a
-- foreign center and the lookup comes back empty.
create or replace function public.journal_entries_check_cost_center()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  if new.cost_center_id is null then
    return new;
  end if;

  select tenant_id into v_tenant from public.cost_centers where id = new.cost_center_id;

  if v_tenant is distinct from new.tenant_id then
    raise exception 'a voucher and its cost center must belong to the same hospital';
  end if;

  return new;
end;
$$;

create trigger journal_entries_cost_center_guard
  before insert or update of cost_center_id on public.journal_entries
  for each row execute function public.journal_entries_check_cost_center();

-- record_voucher learns the cost center. Dropped and recreated rather than
-- overloaded: two functions with one name and different argument lists is how
-- PostgREST ends up calling the wrong one.
drop function public.record_voucher(text, date, public.voucher_type, text, text, jsonb, boolean);

create or replace function public.record_voucher(
  p_entry_no       text,
  p_entry_date     date,
  p_type           public.voucher_type,
  p_party          text,
  p_narration      text,
  p_lines          jsonb,
  p_post           boolean default true,
  p_cost_center_id uuid    default null
)
returns public.journal_entries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry public.journal_entries;
begin
  insert into public.journal_entries (tenant_id, entry_no, entry_date, type, party, narration, cost_center_id)
  values (public.auth_tenant_id(), p_entry_no, p_entry_date, p_type, p_party, p_narration, p_cost_center_id)
  returning * into v_entry;

  insert into public.journal_lines (tenant_id, entry_id, account_id, debit, credit)
  select v_entry.tenant_id,
         v_entry.id,
         (line ->> 'account_id')::uuid,
         coalesce((line ->> 'debit')::numeric, 0),
         coalesce((line ->> 'credit')::numeric, 0)
    from jsonb_array_elements(p_lines) as line;

  if p_post then
    return public.post_journal_entry(v_entry.id);
  end if;

  return v_entry;
end;
$$;

revoke execute on function public.record_voucher(text, date, public.voucher_type, text, text, jsonb, boolean, uuid) from public;
grant execute on function public.record_voucher(text, date, public.voucher_type, text, text, jsonb, boolean, uuid) to authenticated;

-- ----------------------------------------------------------------- budgets ---

create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,

  -- The head being budgeted is an account in the chart, so "actual" is what
  -- was posted to it that month and cannot be typed in.
  account_id  uuid not null references public.ledger_accounts (id) on delete cascade,

  -- The first of the month the budget covers.
  period      date not null
                constraint budgets_period_check check (extract(day from period) = 1),

  planned     numeric(14, 2) not null default 0
                constraint budgets_planned_check check (planned >= 0),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index budgets_tenant_id_idx on public.budgets (tenant_id);

-- One figure per head per month. Two would leave "planned" meaning whichever
-- the page happened to read first.
create unique index budgets_tenant_account_period_key
  on public.budgets (tenant_id, account_id, period);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

create or replace function public.budgets_check_account()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.ledger_accounts where id = new.account_id;

  if v_tenant is distinct from new.tenant_id then
    raise exception 'a budget and its account must belong to the same hospital';
  end if;

  return new;
end;
$$;

create trigger budgets_account_guard
  before insert or update of account_id on public.budgets
  for each row execute function public.budgets_check_account();

-- ------------------------------------------------------------- stock items ---

create table public.stock_items (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,

  name        text not null
                constraint stock_items_name_check check (length(btrim(name)) > 0),

  -- Stored lowercase, like every other module's enumerated text. The page
  -- owns the display labels.
  unit        text not null default 'pcs'
                constraint stock_items_unit_check check (unit in ('pcs', 'box', 'strip', 'vial', 'pack', 'kg', 'ltr')),

  qty         integer not null default 0
                constraint stock_items_qty_check check (qty >= 0),
  rate        numeric(14, 2) not null default 0
                constraint stock_items_rate_check check (rate >= 0),
  reorder     integer not null default 0
                constraint stock_items_reorder_check check (reorder >= 0),

  -- Generated, so the valuation can never disagree with the count and rate
  -- it is made of.
  value       numeric(16, 2) generated always as (qty * rate) stored,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index stock_items_tenant_id_idx on public.stock_items (tenant_id);

create unique index stock_items_tenant_name_key
  on public.stock_items (tenant_id, lower(btrim(name)));

create trigger stock_items_set_updated_at
  before update on public.stock_items
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------- views ---

-- 0063's view, with the subgroup on the end. Appended rather than inserted:
-- create or replace view can add a column but cannot move one.
create or replace view public.ledger_balances
with (security_invoker = true) as
  select
    a.tenant_id,
    a.id   as account_id,
    a.code,
    a.name,
    a."group",
    a.active,
    a.opening_balance,
    coalesce(sum(l.debit), 0)  as debit_total,
    coalesce(sum(l.credit), 0) as credit_total,
    case when a."group" in ('asset', 'expense')
         then a.opening_balance + coalesce(sum(l.debit), 0) - coalesce(sum(l.credit), 0)
         else a.opening_balance + coalesce(sum(l.credit), 0) - coalesce(sum(l.debit), 0)
    end as balance,
    a.subgroup
  from public.ledger_accounts a
  left join public.journal_lines l on l.account_id = a.id
  left join public.journal_entries e on e.id = l.entry_id
  where e.id is null or e.status = 'posted'
  group by a.tenant_id, a.id, a.code, a.name, a."group", a.active, a.opening_balance, a.subgroup;

/**
 * Posted debits and credits, per account, per month, per cost center.
 *
 * The income-and-expense trend, budget actuals and cost center spend are all
 * this, summed a different way. security_invoker for the same reason as
 * ledger_balances: without it the view reads as its owner and publishes every
 * hospital's books.
 */
create view public.ledger_movements
with (security_invoker = true) as
  select
    l.tenant_id,
    l.account_id,
    e.cost_center_id,
    date_trunc('month', e.entry_date)::date as month,
    sum(l.debit)  as debit,
    sum(l.credit) as credit
  from public.journal_lines l
  join public.journal_entries e on e.id = l.entry_id
  where e.status = 'posted'
  group by l.tenant_id, l.account_id, e.cost_center_id, date_trunc('month', e.entry_date);

-- ------------------------------------------------------------------- RLS ---

select public.apply_tenant_rls('public.cost_centers');
select public.apply_tenant_rls('public.budgets');
select public.apply_tenant_rls('public.stock_items');

-- The books' own gate (0063): budgets, departments' spending and the stores
-- valuation are finance material, and apply_tenant_rls lets every doctor in.
select public.apply_role_gate('public.cost_centers', '{hospital_admin,finance_admin}');
select public.apply_role_gate('public.budgets',      '{hospital_admin,finance_admin}');
select public.apply_role_gate('public.stock_items',  '{hospital_admin,finance_admin}');

select public.attach_audit('public.cost_centers');
select public.attach_audit('public.budgets');
select public.attach_audit('public.stock_items');
