-- 0063_accounting.sql
-- The books behind /admin/accounts, which until now were a 775-line demo: a
-- hardcoded chart of accounts, sixteen invented ledgers, a trial balance that
-- always balanced because the numbers were chosen to, and vouchers kept in
-- localStorage.
--
-- This is double entry, enforced by the database rather than by the form:
--
--   ledger_accounts   the chart of accounts — what the hospital can post to
--   journal_entries   one voucher: a date, a type, a narration, a status
--   journal_lines     its debits and credits, at least two, summing equal
--
-- Deliberately NOT included: automatic posting from invoices, payroll runs or
-- procurement. Those integrations are a business decision about when revenue
-- is recognised, not a schema question, and inventing an answer here would put
-- entries in the books nobody asked for. Vouchers are entered by the finance
-- desk until that decision is made.

create type public.ledger_group as enum
  ('asset', 'liability', 'income', 'expense', 'capital');

create type public.voucher_type as enum
  ('payment', 'receipt', 'contra', 'journal', 'sales', 'purchase', 'credit_note', 'debit_note');

create type public.journal_status as enum ('draft', 'posted');

-- ------------------------------------------------------- chart of accounts ---

create table public.ledger_accounts (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,

  -- The hospital's own account code ("1010"). Theirs, not ours, so free text.
  code         text not null
                 constraint ledger_accounts_code_check check (length(btrim(code)) > 0),
  name         text not null
                 constraint ledger_accounts_name_check check (length(btrim(name)) > 0),

  "group"      public.ledger_group not null,

  -- What the account stood at when the books were opened here, in its own
  -- natural direction: positive is a debit for assets and expenses, a credit
  -- for everything else. Signed rather than two columns, because an opening
  -- balance is one number and storing it twice invites them to disagree.
  opening_balance numeric(14, 2) not null default 0,

  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index ledger_accounts_tenant_id_idx on public.ledger_accounts (tenant_id);

-- One code means one account inside a hospital; two hospitals may each run
-- their own numbering.
create unique index ledger_accounts_tenant_code_key
  on public.ledger_accounts (tenant_id, lower(btrim(code)));

create trigger ledger_accounts_set_updated_at
  before update on public.ledger_accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- vouchers ---

create table public.journal_entries (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,

  entry_no     text not null
                 constraint journal_entries_no_check check (length(btrim(entry_no)) > 0),
  entry_date   date not null default current_date,
  type         public.voucher_type not null default 'journal',

  -- Who it was with. Free text for the same reason finance_invoices.party is:
  -- the counterparties of a hospital are not a list worth a migration.
  party        text,
  narration    text,

  status       public.journal_status not null default 'draft',

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index journal_entries_tenant_date_idx on public.journal_entries (tenant_id, entry_date desc);

create unique index journal_entries_tenant_no_key
  on public.journal_entries (tenant_id, lower(btrim(entry_no)));

create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

create table public.journal_lines (
  id           uuid primary key default gen_random_uuid(),
  -- Denormalised from the entry so the tenant RLS template applies here too;
  -- the trigger below keeps it honest.
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  entry_id     uuid not null references public.journal_entries (id) on delete cascade,
  account_id   uuid not null references public.ledger_accounts (id) on delete restrict,

  debit        numeric(14, 2) not null default 0
                 constraint journal_lines_debit_check check (debit >= 0),
  credit       numeric(14, 2) not null default 0
                 constraint journal_lines_credit_check check (credit >= 0),

  -- A line is one side or the other. Both, or neither, is not a line.
  constraint journal_lines_one_side
    check ((debit > 0) <> (credit > 0)),

  created_at   timestamptz not null default now()
);

create index journal_lines_entry_idx   on public.journal_lines (entry_id);
create index journal_lines_account_idx on public.journal_lines (account_id);

-- A line must belong to the same hospital as its voucher and its account.
-- Without this, a caller could point a line at another hospital's account and
-- move money across the boundary RLS is supposed to hold.
create or replace function public.journal_lines_check_tenant()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry_tenant   uuid;
  v_account_tenant uuid;
begin
  select tenant_id into v_entry_tenant   from public.journal_entries  where id = new.entry_id;
  select tenant_id into v_account_tenant from public.ledger_accounts  where id = new.account_id;

  if v_entry_tenant is null or v_account_tenant is null then
    raise exception 'journal line references a voucher or account that does not exist';
  end if;
  if v_entry_tenant <> v_account_tenant then
    raise exception 'a voucher and its account must belong to the same hospital';
  end if;

  new.tenant_id := v_entry_tenant;
  return new;
end;
$$;

create trigger journal_lines_tenant_guard
  before insert or update on public.journal_lines
  for each row execute function public.journal_lines_check_tenant();

-- A posted voucher is a record of what happened. Editing its lines afterwards
-- rewrites history, which is the one thing a ledger may not do; correct it
-- with another voucher instead.
create or replace function public.journal_lines_immutable_once_posted()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status public.journal_status;
begin
  select status into v_status
    from public.journal_entries
   where id = coalesce(new.entry_id, old.entry_id);

  if v_status = 'posted' then
    raise exception 'this voucher is posted — correct it with another voucher rather than editing it';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger journal_lines_no_edit_after_posting
  before insert or update or delete on public.journal_lines
  for each row execute function public.journal_lines_immutable_once_posted();

-- ------------------------------------------------------------- posting ---

/**
 * Posts one voucher, after checking it balances.
 *
 * The balance check lives here rather than in a constraint because it is a
 * statement about a SET of rows, and a row-level check cannot see its
 * siblings. Posting is the moment the question can be asked, and a voucher
 * that does not balance is refused rather than stored.
 *
 * SECURITY INVOKER: RLS decides whose books these are.
 */
create or replace function public.post_journal_entry(p_entry_id uuid)
returns public.journal_entries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry  public.journal_entries;
  v_debit  numeric(14, 2);
  v_credit numeric(14, 2);
  v_lines  integer;
begin
  select * into v_entry from public.journal_entries where id = p_entry_id;
  if v_entry.id is null then
    raise exception 'voucher not found';
  end if;
  if v_entry.status = 'posted' then
    raise exception 'this voucher is already posted';
  end if;

  select count(*), coalesce(sum(debit), 0), coalesce(sum(credit), 0)
    into v_lines, v_debit, v_credit
    from public.journal_lines
   where entry_id = p_entry_id;

  if v_lines < 2 then
    raise exception 'a voucher needs at least one debit and one credit';
  end if;
  if v_debit <> v_credit then
    raise exception 'this voucher does not balance: debits %, credits %', v_debit, v_credit;
  end if;

  update public.journal_entries
     set status = 'posted'
   where id = p_entry_id
  returning * into v_entry;

  return v_entry;
end;
$$;

revoke execute on function public.post_journal_entry(uuid) from public;
grant execute on function public.post_journal_entry(uuid) to authenticated;

/**
 * One voucher and its lines in a single transaction, then posted.
 *
 * Without this the API would insert the entry, then the lines, and a failure
 * in between would leave an empty voucher in the books.
 *
 * `p_lines` is [{ "account_id": uuid, "debit": number, "credit": number }].
 */
create or replace function public.record_voucher(
  p_entry_no   text,
  p_entry_date date,
  p_type       public.voucher_type,
  p_party      text,
  p_narration  text,
  p_lines      jsonb,
  p_post       boolean default true
)
returns public.journal_entries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry public.journal_entries;
begin
  insert into public.journal_entries (tenant_id, entry_no, entry_date, type, party, narration)
  values (public.auth_tenant_id(), p_entry_no, p_entry_date, p_type, p_party, p_narration)
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

revoke execute on function public.record_voucher(text, date, public.voucher_type, text, text, jsonb, boolean) from public;
grant execute on function public.record_voucher(text, date, public.voucher_type, text, text, jsonb, boolean) to authenticated;

-- --------------------------------------------------------------- balances ---

/**
 * Every account with what has been posted to it. Draft vouchers are excluded
 * on purpose — a draft has not happened yet.
 *
 * security_invoker so the view answers as the person asking, and the RLS on
 * the tables underneath scopes it to their hospital. Without it this view
 * would read as its owner and publish every hospital's books.
 */
create view public.ledger_balances
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
    -- The closing balance in the account's natural direction: assets and
    -- expenses rise with debits, everything else with credits.
    case when a."group" in ('asset', 'expense')
         then a.opening_balance + coalesce(sum(l.debit), 0) - coalesce(sum(l.credit), 0)
         else a.opening_balance + coalesce(sum(l.credit), 0) - coalesce(sum(l.debit), 0)
    end as balance
  from public.ledger_accounts a
  left join public.journal_lines l on l.account_id = a.id
  left join public.journal_entries e on e.id = l.entry_id
  where e.id is null or e.status = 'posted'
  group by a.tenant_id, a.id, a.code, a.name, a."group", a.active, a.opening_balance;

-- ------------------------------------------------------- chart, on request ---

/**
 * A standard chart of accounts for a hospital that has none yet.
 *
 * Called from the page the first time it is opened, rather than seeded into
 * every tenant: a hospital that keeps its books elsewhere should not find
 * sixteen accounts it never asked for.
 */
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
  insert into public.ledger_accounts (tenant_id, code, name, "group")
  values
    (v_tenant, '1010', 'Cash in Hand',            'asset'),
    (v_tenant, '1020', 'Bank Account',            'asset'),
    (v_tenant, '1100', 'Accounts Receivable',     'asset'),
    (v_tenant, '1200', 'Medical Equipment',       'asset'),
    (v_tenant, '1300', 'Pharmacy Stock',          'asset'),
    (v_tenant, '2010', 'Accounts Payable',        'liability'),
    (v_tenant, '2100', 'Salaries Payable',        'liability'),
    (v_tenant, '2200', 'VAT Payable',             'liability'),
    (v_tenant, '3010', 'Capital Account',         'capital'),
    (v_tenant, '4010', 'Consultation Revenue',    'income'),
    (v_tenant, '4020', 'Pharmacy Sales',          'income'),
    (v_tenant, '4030', 'Laboratory Revenue',      'income'),
    (v_tenant, '4040', 'Admission & Bed Revenue', 'income'),
    (v_tenant, '5010', 'Salaries & Wages',        'expense'),
    (v_tenant, '5020', 'Medical Supplies',        'expense'),
    (v_tenant, '5030', 'Rent',                    'expense'),
    (v_tenant, '5040', 'Utilities',               'expense'),
    (v_tenant, '5050', 'Equipment Maintenance',   'expense')
  returning *;
end;
$$;

revoke execute on function public.seed_chart_of_accounts() from public;
grant execute on function public.seed_chart_of_accounts() to authenticated;

-- ------------------------------------------------------------------- RLS ---

select public.apply_tenant_rls('public.ledger_accounts');
select public.apply_tenant_rls('public.journal_entries');
select public.apply_tenant_rls('public.journal_lines');

-- The books are not staff-facing material. Same reasoning as payroll and the
-- confidential files shelf: apply_tenant_rls is role-blind, and every doctor
-- and receptionist carries this hospital's tenant_id.
select public.apply_role_gate('public.ledger_accounts', '{hospital_admin,finance_admin}');
select public.apply_role_gate('public.journal_entries', '{hospital_admin,finance_admin}');
select public.apply_role_gate('public.journal_lines',   '{hospital_admin,finance_admin}');

select public.attach_audit('public.ledger_accounts');
select public.attach_audit('public.journal_entries');
select public.attach_audit('public.journal_lines');
