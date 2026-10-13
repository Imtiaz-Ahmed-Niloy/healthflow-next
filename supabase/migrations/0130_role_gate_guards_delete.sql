-- 0130_role_gate_guards_delete.sql
-- The role gate (0051) let a role that may only READ a table DELETE from it.
--
-- It was one policy, `for all`, with the read roles in USING and the write
-- roles in WITH CHECK. That is right for insert and for update, which are
-- held to WITH CHECK. A delete has no new row to check, so Postgres holds it
-- to USING alone — the read list. Anyone allowed to look could remove.
--
-- It only shows where the two lists differ, and until now that was one table:
-- employees, read by finance because payroll is counted from it, "written
-- only by the desks that hire" (0051's own words). Finance could not add or
-- change an employee, and could delete every one of them.
--
-- The pharmacy tables (0126) are the second case — finance reads the
-- pharmacy's books and must not be able to remove a sale from them — which is
-- how this was found: proving the pharmacy's rules as each role, the insert
-- and the update were refused and the delete went through.
--
-- So the gate is four policies now, one per command, and only reading is held
-- to the read list. Where the two lists are the same nothing changes, and the
-- tables gated that way keep the single policy they already have.

create or replace function public.apply_role_gate(
  p_table       regclass,
  p_read_roles  public.app_role[],
  -- Null means "the same roles may write". Pass a narrower list where reading
  -- and writing genuinely differ.
  p_write_roles public.app_role[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_table text := p_table::text;
  v_name  text := replace(split_part(v_table, '.', 2), '"', '') || '_role_gate';
  v_read  text;
  v_write text;
begin
  if array_length(p_read_roles, 1) is null then
    raise exception 'apply_role_gate: give at least one read role for %', v_table;
  end if;

  -- super_admin always passes, exactly as it does in the tenant template.
  v_read := format(
    'public.is_super_admin() or public.auth_role() = any (%L::public.app_role[])',
    p_read_roles);
  v_write := format(
    'public.is_super_admin() or public.auth_role() = any (%L::public.app_role[])',
    coalesce(p_write_roles, p_read_roles));

  -- The first name is the one the single policy had, so this replaces it.
  execute format('drop policy if exists %I on %s', v_name, v_table);
  execute format('drop policy if exists %I on %s', v_name || '_insert', v_table);
  execute format('drop policy if exists %I on %s', v_name || '_update', v_table);
  execute format('drop policy if exists %I on %s', v_name || '_delete', v_table);

  -- All RESTRICTIVE, so each ANDs with the tenant policy and can only narrow.
  execute format(
    'create policy %I on %s as restrictive for select to authenticated using (%s)',
    v_name, v_table, v_read);
  execute format(
    'create policy %I on %s as restrictive for insert to authenticated with check (%s)',
    v_name || '_insert', v_table, v_write);
  execute format(
    'create policy %I on %s as restrictive for update to authenticated using (%s) with check (%s)',
    v_name || '_update', v_table, v_write, v_write);
  -- The one that was missing: removing a row is writing.
  execute format(
    'create policy %I on %s as restrictive for delete to authenticated using (%s)',
    v_name || '_delete', v_table, v_write);
end;
$fn$;

-- Every table whose write list is narrower than its read list, gated again.

select public.apply_role_gate('public.employees',
                              '{hospital_admin,hr_admin,finance_admin}',
                              '{hospital_admin,hr_admin}');

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'pharmacy_items', 'pharmacy_suppliers', 'pharmacy_batches', 'pharmacy_stock_movements',
    'pharmacy_purchase_orders', 'pharmacy_purchase_order_items',
    'pharmacy_customers', 'pharmacy_cash_shifts', 'pharmacy_expenses',
    'pharmacy_sales', 'pharmacy_sale_items', 'pharmacy_sale_payments',
    'pharmacy_sale_returns', 'pharmacy_sale_return_items',
    'pharmacy_cash_transactions', 'pharmacy_settings', 'pharmacy_counters'
  ] loop
    perform public.apply_role_gate(
      ('public.' || v_table)::regclass,
      '{hospital_admin,pharmacy_admin,finance_admin}',
      '{hospital_admin,pharmacy_admin}');
  end loop;
end;
$$;
