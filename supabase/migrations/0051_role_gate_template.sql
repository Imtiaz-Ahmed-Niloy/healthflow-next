-- 0051_role_gate_template.sql
-- HF-83. One definition for the role gate, applied by name — the same argument
-- 0002 makes for apply_tenant_rls, and for the same reason.
--
-- The tenant template is role-blind: `is_super_admin() or tenant_id =
-- auth_tenant_id()`. Any account carrying a hospital's tenant_id can read every
-- tenant-scoped table in it, and doctors carry one. 0045 closed that for the
-- tables that existed then by hand-writing restrictive policies.
--
-- It kept happening. Three more tables since have each needed the same gate
-- hand-written — procurement_requisitions (0048), certificates (0049),
-- attendance_records and leave_requests (0050) — and lab_orders (0047)
-- deliberately did NOT, which is exactly what makes it easy to get wrong: it is
-- a judgement call every time, and forgetting produces no error, no failing
-- test and no visible symptom. Just a quiet read permission nobody notices.
--
-- Ten hand-written copies of the same four lines is nine too many.

create or replace function public.apply_role_gate(
  p_table       regclass,
  p_read_roles  public.app_role[],
  -- Null means "the same roles may write". Pass a narrower list where reading
  -- and writing genuinely differ — employees is read by finance (payroll is
  -- computed from it) but written only by the desks that hire.
  p_write_roles public.app_role[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_table  text := p_table::text;
  v_policy text := replace(split_part(v_table, '.', 2), '"', '') || '_role_gate';
  v_read   text;
  v_write  text;
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

  execute format('drop policy if exists %I on %s', v_policy, v_table);

  -- RESTRICTIVE, so it ANDs with the tenant policy rather than widening it.
  -- A gate that could widen access would be a worse bug than the one it fixes.
  execute format(
    'create policy %I on %s as restrictive for all to authenticated '
    || 'using (%s) with check (%s)',
    v_policy, v_table, v_read, v_write);
end;
$fn$;

comment on function public.apply_role_gate(regclass, public.app_role[], public.app_role[]) is
  'Layers the standard restrictive role gate on a table that already has tenant RLS. See supabase/migrations/0051_role_gate_template.sql and docs/module-guide.md.';

-- Migration-time tool, never an API call — same reasoning as the revoke on
-- apply_tenant_rls in 0004. PostgREST exposes SECURITY DEFINER functions at
-- /rest/v1/rpc/<name>, and this one rewrites policies.
revoke execute on function public.apply_role_gate(regclass, public.app_role[], public.app_role[])
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Replace the hand-written copies with the template.
--
-- Each call reproduces exactly the policy it replaces; apply_role_gate drops
-- the old one by name first, so this is a swap rather than an addition. The
-- proofs in the PR re-run the same role matrix afterwards.

select public.apply_role_gate('public.payroll_runs',                 '{hospital_admin,hr_admin,finance_admin}');
select public.apply_role_gate('public.payroll_payslips',             '{hospital_admin,hr_admin,finance_admin}');
select public.apply_role_gate('public.payroll_settings',             '{hospital_admin,hr_admin,finance_admin}');
select public.apply_role_gate('public.payroll_deduction_overrides',  '{hospital_admin,hr_admin,finance_admin}');

-- Read by finance because payroll is computed from these rows; written by the
-- two desks that hire.
select public.apply_role_gate('public.employees',
                              '{hospital_admin,hr_admin,finance_admin}',
                              '{hospital_admin,hr_admin}');

select public.apply_role_gate('public.procurement_requisitions',     '{hospital_admin,finance_admin}');
select public.apply_role_gate('public.certificates',                 '{hospital_admin,hr_admin}');
select public.apply_role_gate('public.attendance_records',           '{hospital_admin,hr_admin}');
select public.apply_role_gate('public.leave_requests',               '{hospital_admin,hr_admin}');

-- finance_invoices is deliberately NOT converted. Its gate carries a third
-- branch — a patient reading their own bills, via is_my_patient_record (0044) —
-- and a template that took arbitrary predicates would be a template that could
-- express anything, which is no template at all. It stays hand-written, and
-- 0045 explains why beside it.
