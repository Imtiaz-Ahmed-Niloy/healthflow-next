-- 0115_cash_flow_between.sql
-- Where cash came from and went, for the Cash Flow Statement (direct method).
--
-- Cash is every ledger under cash_in_hand or bank_accounts. For each posted
-- voucher dated in the range that touches cash, the voucher's OTHER lines say
-- what the cash was for: a credit to Consultation Revenue is cash received
-- from patients, a debit to Rent is cash paid for rent. Because a voucher
-- balances, those lines' credits less debits add up to exactly the cash that
-- moved — so the statement always reconciles to the change in cash.
--
-- A contra between cash and bank has no other lines and so no flow, as it
-- should: money moved between two pockets. A voucher that touches no cash
-- (a journal, a credit sale) is not a cash flow at all.
--
-- One row per ledger, `amount` positive for cash in and negative for cash
-- out. The page sorts them into operating, investing and financing by head.
-- security invoker: RLS keeps it to the caller's hospital.

create or replace function public.cash_flow_between(p_from date default null, p_to date default null)
returns table (
  account_id uuid,
  code text,
  name text,
  "group" text,
  subgroup text,
  amount numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with cash_entries as (
    select distinct l.entry_id
      from public.journal_lines l
      join public.ledger_accounts a on a.id = l.account_id
      join public.journal_entries e on e.id = l.entry_id
     where a.subgroup in ('cash_in_hand', 'bank_accounts')
       and e.status = 'posted'
       and (p_from is null or e.entry_date >= p_from)
       and (p_to is null or e.entry_date <= p_to)
  )
  select a.id, a.code::text, a.name::text, a."group"::text, a.subgroup::text,
         sum(l.credit - l.debit)
    from public.journal_lines l
    join public.ledger_accounts a on a.id = l.account_id
   where l.entry_id in (select entry_id from cash_entries)
     and a.subgroup not in ('cash_in_hand', 'bank_accounts')
   group by a.id, a.code, a.name, a."group", a.subgroup
  having sum(l.credit - l.debit) <> 0
   order by a.code;
$$;

revoke execute on function public.cash_flow_between(date, date) from public;
grant execute on function public.cash_flow_between(date, date) to authenticated;
