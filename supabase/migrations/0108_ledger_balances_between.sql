-- 0108_ledger_balances_between.sql
-- Ledger balances for a date range, for the Trial Balance's date filter.
--
-- ledger_balances (0074) adds up every posted voucher ever. This does the
-- same over posted vouchers dated from p_from to p_to, both inclusive, either
-- left null for no bound. With no p_from the range starts at the beginning,
-- so each account's opening balance counts; with one, only that period's
-- activity does and opening is reported as 0.
--
-- Same columns as the view, so the page lays it out the same way. security
-- invoker, like the view: RLS on the tables underneath keeps it to the
-- caller's hospital.

create or replace function public.ledger_balances_between(p_from date default null, p_to date default null)
returns table (
  tenant_id uuid,
  account_id uuid,
  code text,
  name text,
  "group" text,
  active boolean,
  opening_balance numeric,
  debit_total numeric,
  credit_total numeric,
  balance numeric,
  subgroup text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.tenant_id,
    a.id,
    a.code::text,
    a.name::text,
    a."group"::text,
    a.active,
    case when p_from is null then a.opening_balance else 0 end,
    coalesce(sum(l.debit), 0),
    coalesce(sum(l.credit), 0),
    case when p_from is null then a.opening_balance else 0 end
      + case when a."group" in ('asset', 'expense')
             then coalesce(sum(l.debit), 0) - coalesce(sum(l.credit), 0)
             else coalesce(sum(l.credit), 0) - coalesce(sum(l.debit), 0)
        end,
    a.subgroup::text
  from public.ledger_accounts a
  left join (
    public.journal_lines l
    join public.journal_entries e
      on e.id = l.entry_id
     and e.status = 'posted'
     and (p_from is null or e.entry_date >= p_from)
     and (p_to is null or e.entry_date <= p_to)
  ) on l.account_id = a.id
  group by a.tenant_id, a.id, a.code, a.name, a."group", a.active, a.opening_balance, a.subgroup
  order by a.code;
$$;

revoke execute on function public.ledger_balances_between(date, date) from public;
grant execute on function public.ledger_balances_between(date, date) to authenticated;
