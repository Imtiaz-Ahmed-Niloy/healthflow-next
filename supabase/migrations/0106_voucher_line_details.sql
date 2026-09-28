-- 0106_voucher_line_details.sql
-- A voucher with several entries, each with its own party, narration and
-- cost center.
--
-- The New Voucher form used to take one debit ledger, one credit ledger and
-- one amount. It now takes a list of entries under one voucher number and
-- date — "Rahim, Dr Rent, Cr Cash, 5,000" then "Karim, Dr Fuel, Cr Cash, 800"
-- — and each entry becomes a debit line and a credit line. Party, narration
-- and cost center were columns of the voucher only, so they move down to the
-- line as well. The voucher keeps its own: the API fills them from the
-- entries, so every list and export that reads them keeps working.

alter table public.journal_lines
  add column party text
    constraint journal_lines_party_check check (party is null or length(party) <= 200),
  add column narration text
    constraint journal_lines_narration_check check (narration is null or length(narration) <= 2000),
  add column cost_center_id uuid references public.cost_centers (id) on delete set null;

create index journal_lines_cost_center_id_idx on public.journal_lines (cost_center_id);

-- ------------------------------------------------------------ guards ---

-- A line's cost center is its hospital's, as the voucher's is (0074).
create or replace function public.journal_lines_check_cost_center()
returns trigger
language plpgsql
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
    raise exception 'a voucher line and its cost center must belong to the same hospital';
  end if;

  return new;
end;
$$;

create trigger journal_lines_cost_center_guard
  before insert or update of cost_center_id on public.journal_lines
  for each row execute function public.journal_lines_check_cost_center();

-- Posted lines stay frozen, with one exception: deleting a cost center clears
-- it from the lines booked to it (the foreign key's `on delete set null`).
-- Without this, a center used on any posted voucher could never be deleted.
-- Only that: the center must really be gone, so nobody can use this to strip
-- a live center off a posted line by hand.
create or replace function public.journal_lines_immutable_once_posted()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.journal_status;
begin
  if tg_op = 'UPDATE'
     and new.cost_center_id is null
     and old.cost_center_id is not null
     and (to_jsonb(new) - 'cost_center_id') = (to_jsonb(old) - 'cost_center_id')
     and not exists (select 1 from public.cost_centers where id = old.cost_center_id) then
    return new;
  end if;

  select status into v_status
    from public.journal_entries
   where id = coalesce(new.entry_id, old.entry_id);

  if v_status = 'posted' then
    raise exception 'this voucher is posted — correct it with another voucher rather than editing it';
  end if;

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------- movements ---

-- Spending by cost center counts a line's own center first, then its
-- voucher's — so vouchers from before this migration count exactly as before.
create or replace view public.ledger_movements
with (security_invoker = true) as
select l.tenant_id,
       l.account_id,
       coalesce(l.cost_center_id, e.cost_center_id) as cost_center_id,
       date_trunc('month', e.entry_date::timestamptz)::date as month,
       sum(l.debit) as debit,
       sum(l.credit) as credit
  from public.journal_lines l
  join public.journal_entries e on e.id = l.entry_id
 where e.status = 'posted'
 group by l.tenant_id, l.account_id, coalesce(l.cost_center_id, e.cost_center_id),
          date_trunc('month', e.entry_date::timestamptz);

-- ------------------------------------------------------ record_voucher ---

-- Same signature as 0074, so nothing calling it changes; each line may now
-- carry party, narration and cost_center_id.
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

  insert into public.journal_lines (tenant_id, entry_id, account_id, debit, credit, party, narration, cost_center_id)
  select v_entry.tenant_id,
         v_entry.id,
         (line ->> 'account_id')::uuid,
         coalesce((line ->> 'debit')::numeric, 0),
         coalesce((line ->> 'credit')::numeric, 0),
         nullif(btrim(line ->> 'party'), ''),
         nullif(btrim(line ->> 'narration'), ''),
         nullif(line ->> 'cost_center_id', '')::uuid
    from jsonb_array_elements(p_lines) as line;

  if p_post then
    return public.post_journal_entry(v_entry.id);
  end if;

  return v_entry;
end;
$$;
