-- 0114_voucher_status_workflow.sql
-- A voucher's approval workflow. Only a posted voucher is in the books —
-- ledger_balances and ledger_movements already read posted alone — so every
-- other status is a stage on the way there, or a record that it never got
-- there.
--
--   draft      being written              -> pending, posted, cancelled
--   pending    waiting for approval       -> approved, rejected, draft, cancelled
--   approved   cleared to post            -> posted, cancelled
--   rejected   sent back, with a reason   -> draft (by editing it), cancelled
--   posted     in the books               -> cancelled (password again)
--   cancelled  kept as a record           -> nothing
--
-- Approving and rejecting are the hospital admin's; a finance admin prepares
-- and posts. Cancelling a posted voucher takes it out of the books, so, like
-- editing and deleting one (0109, 0111), it needs a password sign-in in the
-- last two minutes.
--
-- Every status change goes through set_voucher_status() or
-- post_journal_entry(); a trigger refuses any other. `status_note` carries the
-- reason for the latest change — why it was rejected or cancelled.

alter table public.journal_entries
  add column status_note text
    constraint journal_entries_status_note_check check (status_note is null or length(status_note) <= 1000);

-- A password sign-in in the last two minutes, from the token's `amr` claim.
create or replace function public.password_confirmed_recently()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(max((a ->> 'timestamp')::numeric), 0) >= extract(epoch from now()) - 120
    from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as a
   where a ->> 'method' = 'password';
$$;

-- ---------------------------------------------------------------- guards ---

-- 0111's, with status joining number, date and type: only the workflow
-- functions change it.
create or replace function public.journal_entries_header_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  -- coalesce: in a session that never set the flag, current_setting() is
  -- null, and `not null` would let every change through.
  v_editing boolean := coalesce(current_setting('app.voucher_edit', true) = old.id::text, false);
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    return new;
  end if;

  if not v_editing
     and (new.entry_no is distinct from old.entry_no
          or new.entry_date is distinct from old.entry_date
          or new.type is distinct from old.type) then
    raise exception 'edit a voucher from the Accounts page — it asks for your password';
  end if;

  if not v_editing
     and current_setting('app.voucher_status', true) is distinct from old.id::text
     and (new.status is distinct from old.status or new.status_note is distinct from old.status_note) then
    raise exception 'change a voucher''s status from the Accounts page';
  end if;

  return new;
end;
$$;

-- Lines can be written while a voucher is a draft or sent back; at any other
-- stage they are frozen, except through update_voucher and delete_voucher.
create or replace function public.journal_lines_immutable_once_posted()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.journal_status;
begin
  if current_setting('app.voucher_edit', true) = coalesce(new.entry_id, old.entry_id)::text then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE'
     and current_setting('app.voucher_delete', true) = old.entry_id::text then
    return old;
  end if;

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
  if v_status not in ('draft', 'rejected') then
    raise exception 'this voucher is % — its entries cannot change', v_status;
  end if;

  return coalesce(new, old);
end;
$$;

-- --------------------------------------------------------------- posting ---

-- 0063's, posting only a draft or an approved voucher.
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
  if v_entry.status not in ('draft', 'approved') then
    raise exception 'a % voucher cannot be posted', v_entry.status;
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

  perform set_config('app.voucher_status', p_entry_id::text, true);
  update public.journal_entries
     set status = 'posted', status_note = null
   where id = p_entry_id
  returning * into v_entry;
  perform set_config('app.voucher_status', '', true);

  return v_entry;
end;
$$;

-- ---------------------------------------------------------------- status ---

create or replace function public.set_voucher_status(
  p_entry_id uuid,
  p_status public.journal_status,
  p_note text default null
)
returns public.journal_entries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry public.journal_entries;
  v_allowed boolean;
begin
  select * into v_entry from public.journal_entries where id = p_entry_id for update;
  if v_entry.id is null then
    raise exception 'voucher not found';
  end if;

  if p_status = 'posted' then
    raise exception 'post the voucher to put it in the books';
  end if;

  v_allowed := case v_entry.status
    when 'draft'    then p_status in ('pending', 'cancelled')
    when 'pending'  then p_status in ('approved', 'rejected', 'draft', 'cancelled')
    when 'approved' then p_status in ('cancelled')
    when 'rejected' then p_status in ('draft', 'cancelled')
    when 'posted'   then p_status in ('cancelled')
    else false
  end;
  if not v_allowed then
    raise exception 'a % voucher cannot be marked %', v_entry.status, p_status;
  end if;

  if p_status in ('approved', 'rejected')
     and not (public.is_super_admin() or public.auth_role() = 'hospital_admin') then
    raise exception 'only a hospital admin can approve or reject a voucher';
  end if;

  if v_entry.status = 'posted' and not public.password_confirmed_recently() then
    raise exception 'confirm your password to cancel a posted voucher';
  end if;

  perform set_config('app.voucher_status', p_entry_id::text, true);
  update public.journal_entries
     set status = p_status,
         status_note = nullif(btrim(p_note), '')
   where id = p_entry_id
  returning * into v_entry;
  perform set_config('app.voucher_status', '', true);

  return v_entry;
end;
$$;

revoke execute on function public.set_voucher_status(uuid, public.journal_status, text) from public;
grant execute on function public.set_voucher_status(uuid, public.journal_status, text) to authenticated;

-- ---------------------------------------------------------------- update ---

-- 0111's, for a draft, a rejected voucher (which goes back to draft) or a
-- posted one. Pending and approved vouchers are under review, and a cancelled
-- one is a record.
create or replace function public.update_voucher(
  p_entry_id uuid,
  p_entry_no text,
  p_entry_date date,
  p_type public.voucher_type,
  p_party text,
  p_narration text,
  p_lines jsonb,
  p_post boolean default false,
  p_cost_center_id uuid default null
)
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
  if not public.password_confirmed_recently() then
    raise exception 'confirm your password to edit a voucher';
  end if;

  select * into v_entry from public.journal_entries where id = p_entry_id for update;
  if v_entry.id is null then
    raise exception 'voucher not found';
  end if;
  if v_entry.status not in ('draft', 'rejected', 'posted') then
    raise exception 'a % voucher cannot be edited', v_entry.status;
  end if;

  perform set_config('app.voucher_edit', p_entry_id::text, true);

  update public.journal_entries
     set entry_no = p_entry_no,
         entry_date = p_entry_date,
         type = p_type,
         party = p_party,
         narration = p_narration,
         cost_center_id = p_cost_center_id,
         status = case when v_entry.status = 'rejected' then 'draft'::public.journal_status else v_entry.status end,
         status_note = case when v_entry.status = 'rejected' then null else v_entry.status_note end
   where id = p_entry_id;

  delete from public.journal_lines where entry_id = p_entry_id;

  insert into public.journal_lines (tenant_id, entry_id, account_id, debit, credit, party, narration, cost_center_id)
  select v_entry.tenant_id,
         p_entry_id,
         (line ->> 'account_id')::uuid,
         coalesce((line ->> 'debit')::numeric, 0),
         coalesce((line ->> 'credit')::numeric, 0),
         nullif(btrim(line ->> 'party'), ''),
         nullif(btrim(line ->> 'narration'), ''),
         nullif(line ->> 'cost_center_id', '')::uuid
    from jsonb_array_elements(p_lines) as line;

  perform set_config('app.voucher_edit', '', true);

  if v_entry.status = 'posted' then
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
  elsif p_post then
    return public.post_journal_entry(p_entry_id);
  end if;

  select * into v_entry from public.journal_entries where id = p_entry_id;
  return v_entry;
end;
$$;
