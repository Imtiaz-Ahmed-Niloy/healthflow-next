-- 0044_finance_invoices_patient.sql
-- HF-77. /patient/billing was four invoices typed into the JSX, a "$1,240.50"
-- balance and a "12.4kg of paper saved" stat — the same figures for every
-- patient, in dollars, connected to nothing.
--
-- A patient's unpaid bill and a hospital's receivable are the same fact from
-- two sides, so this adds a link rather than a parallel table: finance_invoices
-- (0043) gains the patient the invoice is for.

alter table public.finance_invoices
  add column patient_id uuid references public.patients (id) on delete set null;

comment on column public.finance_invoices.patient_id is
  'The patient this invoice bills, when it bills one. Null for vendor payables and insurer receivables.';

-- Partial: most invoices are not a patient's.
create index finance_invoices_patient_id_idx
  on public.finance_invoices (patient_id)
  where patient_id is not null;

-- ---------------------------------------------------------------------------
-- Letting a patient read their own bills
-- ---------------------------------------------------------------------------
--
-- The tenant policy from 0002 cannot express this. It reads
-- `tenant_id = auth_tenant_id()`, and a patient has no tenant_id at all
-- (0001_core_schema.sql — patients are allowed to exist outside a hospital,
-- and every patient account in the system today has a null one). One login can
-- also hold a `patients` row in more than one hospital, so "my bills" is not a
-- tenant question in the first place.
--
-- The check cannot be an inline subquery either: `patients` is itself
-- tenant-scoped, so a patient evaluating the policy could not see their own
-- patients row to match against. Hence a SECURITY DEFINER helper, kept as
-- narrow as it can be — it answers one yes/no question about the caller's own
-- records and reveals nothing about anyone else's.

create or replace function public.is_my_patient_record(p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patients
    where id = p_patient_id
      and profile_id = (select auth.uid())
  );
$$;

comment on function public.is_my_patient_record(uuid) is
  'True when the given patients.id belongs to the calling login. Used by RLS where tenant scoping cannot apply, because patients may have no tenant and may exist in several.';

-- Permissive, so it ORs with tenant_select rather than narrowing it: a finance
-- admin keeps seeing the hospital's invoices, and a patient additionally sees
-- their own.
create policy finance_invoices_patient_select on public.finance_invoices
  for select to authenticated
  using (patient_id is not null and public.is_my_patient_record(patient_id));

-- Read only, deliberately. A patient may look at a bill; raising, editing or
-- settling one stays with the hospital's finance desk.
