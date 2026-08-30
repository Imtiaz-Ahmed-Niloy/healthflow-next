-- 0045_salary_data_role_gate.sql
-- The tenant template is role-blind, and on salary data that is too wide.
--
-- apply_tenant_rls (0002) writes one predicate:
--
--     public.is_super_admin() or tenant_id = public.auth_tenant_id()
--
-- No role check. So *any* account carrying a hospital's tenant_id can read
-- every tenant-scoped table in that hospital — and doctors carry one (all
-- eleven doctor accounts have a tenant_id; patients, by contrast, have none,
-- which is why 0044 needed its own policy).
--
-- Verified before writing this, with a real doctor's claims, in a transaction
-- that rolled back:
--
--     doctor's JWT -> payroll_payslips  -> 1 row: "A Colleague", gross 95000
--                  -> employees         -> 1 row: "A Colleague", salary 95000
--                  -> payroll_settings  -> readable
--
-- The API's `roles` gate does refuse this (payroll-payslips is
-- hr/finance/hospital_admin only), but that gate lives in the Next route, and
-- the Supabase publishable key ships in the browser bundle. A doctor can query
-- the database directly and never touch our API. docs/module-guide.md says it
-- plainly: roles is defence in depth, RLS is the boundary. Here the boundary
-- had a hole.
--
-- Scope: this is *within* one hospital. Hospital-to-hospital isolation was
-- never affected and is re-proved in the PR.
--
-- These are RESTRICTIVE policies, layered on top rather than edits to
-- tenant_select — the pattern 0002's own comment prescribes. Restrictive
-- policies AND with the permissive ones, so this can only narrow access, never
-- widen it, and re-running apply_tenant_rls cannot silently undo it.

-- --------------------------------------------------------------- payroll ---
-- Same three roles the resource definitions already list.

create policy payroll_runs_role_gate on public.payroll_runs
  as restrictive for all to authenticated
  using (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin', 'finance_admin'))
  with check (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin', 'finance_admin'));

create policy payroll_payslips_role_gate on public.payroll_payslips
  as restrictive for all to authenticated
  using (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin', 'finance_admin'))
  with check (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin', 'finance_admin'));

create policy payroll_settings_role_gate on public.payroll_settings
  as restrictive for all to authenticated
  using (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin', 'finance_admin'))
  with check (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin', 'finance_admin'));

create policy payroll_deduction_overrides_role_gate on public.payroll_deduction_overrides
  as restrictive for all to authenticated
  using (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin', 'finance_admin'))
  with check (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin', 'finance_admin'));

-- ------------------------------------------------------------- employees ---
-- The staff register carries gross_salary, so it is salary data too. Reading
-- is the three admin desks; writing is the two that hire, matching
-- src/server/resources/employees.ts.

create policy employees_role_gate on public.employees
  as restrictive for all to authenticated
  using (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin', 'finance_admin'))
  with check (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin'));

-- ------------------------------------------------------- finance invoices ---
-- With a carve-out, because 0044 deliberately lets a patient read their own
-- bills. A restrictive policy AND-ing over that would have silently broken
-- /patient/billing, so the patient path is named here too.
--
-- `with check` omits it on purpose: a patient may read a bill, never write
-- one. Settling an invoice stays with the finance desk.

create policy finance_invoices_role_gate on public.finance_invoices
  as restrictive for all to authenticated
  using (
    public.is_super_admin()
    or public.auth_role() in ('hospital_admin', 'finance_admin')
    or (patient_id is not null and public.is_my_patient_record(patient_id))
  )
  with check (
    public.is_super_admin()
    or public.auth_role() in ('hospital_admin', 'finance_admin')
  );

-- ------------------------------------------------------------ tightening ---
-- is_my_patient_record (0044) is SECURITY DEFINER, and PostgREST exposes every
-- such function at /rest/v1/rpc/<name>. `authenticated` must keep EXECUTE —
-- the policy above calls it during evaluation — but `anon` has no reason to
-- reach it. It would only ever return false for them (auth.uid() is null), so
-- this closes a linter finding rather than a live hole; same reasoning as the
-- revokes in 0004_harden_functions.sql.

revoke execute on function public.is_my_patient_record(uuid) from public, anon;
