-- 0109_delete_voucher_with_password.sql
-- Vouchers, posted ones included, can be deleted, but only right after the
-- person deleting has typed their password again.
--
-- The publishable key ships in the browser, so a password check in a route
-- handler alone could be walked around with a direct delete. The database
-- holds the rule instead:
--
--   * delete_voucher() is the only way a signed-in user deletes a voucher. It
--     refuses unless the caller's token shows a password sign-in in the last
--     two minutes — the `amr` claim Supabase stamps on every session. The
--     route /api/v1/accounts/vouchers/[id] gets that fresh sign-in by signing
--     in again with the password it was sent, then calls this.
--   * A trigger refuses any other delete of a voucher by a signed-in user.
--     Service-role work (provisioning, removing a whole hospital) is not
--     affected.
--   * 0063's trigger that freezes a posted voucher's lines lets them go when
--     it is delete_voucher removing that voucher.
--
-- RLS still decides whose vouchers these are and who may touch the books
-- (hospital_admin, finance_admin). Both tables carry attach_audit, so every
-- deletion, with its old values, reaches /super/logs.

-- ---------------------------------------------------------------- guards ---

create or replace function public.journal_entries_delete_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
     and current_setting('app.voucher_delete', true) is distinct from old.id::text then
    raise exception 'delete a voucher from the Accounts page — it asks for your password';
  end if;
  return old;
end;
$$;

create trigger journal_entries_delete_guard
  before delete on public.journal_entries
  for each row execute function public.journal_entries_delete_guard();

-- 0063's, as since amended for a deleted cost center, with one more way
-- through: delete_voucher removing this voucher.
create or replace function public.journal_lines_immutable_once_posted()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.journal_status;
begin
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

-- ---------------------------------------------------------------- delete ---

create or replace function public.delete_voucher(p_entry_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_signed_in_at numeric;
begin
  select max((a ->> 'timestamp')::numeric)
    into v_signed_in_at
    from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as a
   where a ->> 'method' = 'password';

  if v_signed_in_at is null or v_signed_in_at < extract(epoch from now()) - 120 then
    raise exception 'confirm your password to delete a voucher';
  end if;

  perform set_config('app.voucher_delete', p_entry_id::text, true);

  delete from public.journal_entries where id = p_entry_id;
  if not found then
    raise exception 'voucher not found';
  end if;

  perform set_config('app.voucher_delete', '', true);
end;
$$;

revoke execute on function public.delete_voucher(uuid) from public;
grant execute on function public.delete_voucher(uuid) to authenticated;
