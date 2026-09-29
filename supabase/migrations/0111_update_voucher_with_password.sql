-- 0111_update_voucher_with_password.sql
-- A voucher, posted ones included, can be edited in full — number, date,
-- type and every entry — but only right after the person editing has typed
-- their password again. Same rule and same mechanism as deleting (0109).
--
--   * update_voucher() rewrites the voucher's header and replaces its lines
--     in one transaction. It refuses unless the caller's token shows a
--     password sign-in in the last two minutes (the `amr` claim). The route
--     PATCH /api/v1/accounts/vouchers/[id] gets that fresh sign-in by signing
--     in again with the password it was sent.
--   * A posted voucher stays posted, and must still balance after the edit:
--     the same checks post_journal_entry (0063) makes. A draft can be posted
--     as part of the edit.
--   * 0063's trigger that freezes a posted voucher's lines lets them change
--     when it is update_voucher changing that voucher.
--   * A new trigger refuses a change to a voucher's number, date or type by a
--     signed-in user any other way. Party, narration, cost center, bank
--     reconciliation and posting keep working as before.
--
-- Both tables carry attach_audit, so each edit and its old values reach
-- /super/logs.

-- ---------------------------------------------------------------- guards ---

create or replace function public.journal_entries_header_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
     and current_setting('app.voucher_edit', true) is distinct from old.id::text
     and (new.entry_no is distinct from old.entry_no
          or new.entry_date is distinct from old.entry_date
          or new.type is distinct from old.type) then
    raise exception 'edit a voucher from the Accounts page — it asks for your password';
  end if;
  return new;
end;
$$;

create trigger journal_entries_header_guard
  before update on public.journal_entries
  for each row execute function public.journal_entries_header_guard();

-- 0109's version, with one more way through: update_voucher editing this
-- voucher.
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

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------- update ---

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
  v_signed_in_at numeric;
  v_entry  public.journal_entries;
  v_debit  numeric(14, 2);
  v_credit numeric(14, 2);
  v_lines  integer;
begin
  select max((a ->> 'timestamp')::numeric)
    into v_signed_in_at
    from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as a
   where a ->> 'method' = 'password';

  if v_signed_in_at is null or v_signed_in_at < extract(epoch from now()) - 120 then
    raise exception 'confirm your password to edit a voucher';
  end if;

  select * into v_entry from public.journal_entries where id = p_entry_id for update;
  if v_entry.id is null then
    raise exception 'voucher not found';
  end if;

  perform set_config('app.voucher_edit', p_entry_id::text, true);

  update public.journal_entries
     set entry_no = p_entry_no,
         entry_date = p_entry_date,
         type = p_type,
         party = p_party,
         narration = p_narration,
         cost_center_id = p_cost_center_id
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
    -- Still posted, so it must still balance: post_journal_entry's checks.
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

revoke execute on function public.update_voucher(uuid, text, date, public.voucher_type, text, text, jsonb, boolean, uuid) from public;
grant execute on function public.update_voucher(uuid, text, date, public.voucher_type, text, text, jsonb, boolean, uuid) to authenticated;
