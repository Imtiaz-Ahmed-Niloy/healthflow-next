-- 0141_doctor_opd_invoices.sql
-- Enables doctors to create, read, and manage OPD invoices for patients at their workplace facilities and chambers.

-- 1. Update finance_invoices_role_gate to include doctors for their workplace tenants
drop policy if exists finance_invoices_role_gate on public.finance_invoices;
create policy finance_invoices_role_gate on public.finance_invoices
  as restrictive for all to authenticated
  using (
    public.is_super_admin()
    or public.auth_role() in ('hospital_admin', 'finance_admin')
    or (patient_id is not null and public.is_my_patient_record(patient_id))
    or (
      public.auth_role() = 'doctor'
      and (
        exists (
          select 1 from public.doctors d
          where d.tenant_id = finance_invoices.tenant_id
            and d.profile_id = (select auth.uid())
        )
        or exists (
          select 1 from public.appointments a
          join public.doctors d on d.id = a.doctor_id
          where a.id = finance_invoices.appointment_id
            and d.profile_id = (select auth.uid())
        )
      )
    )
  )
  with check (
    public.is_super_admin()
    or public.auth_role() in ('hospital_admin', 'finance_admin')
    or (
      public.auth_role() = 'doctor'
      and exists (
        select 1 from public.doctors d
        where d.tenant_id = finance_invoices.tenant_id
          and d.profile_id = (select auth.uid())
      )
    )
  );

-- 2. Dedicated function to create OPD invoices with line items and verification
create or replace function public.create_opd_invoice(
  p_tenant_id uuid,
  p_patient_id uuid default null,
  p_party text default 'Patient',
  p_amount numeric default 0,
  p_description text default null,
  p_line_items jsonb default '[]'::jsonb,
  p_paid boolean default false,
  p_appointment_id uuid default null,
  p_due_date date default current_date
)
returns public.finance_invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref text;
  v_inv public.finance_invoices;
  v_caller uuid := (select auth.uid());
begin
  if v_caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  if not (
    public.is_super_admin()
    or public.auth_role() in ('hospital_admin', 'finance_admin')
    or exists (
      select 1 from public.doctors d
      where d.tenant_id = p_tenant_id
        and d.profile_id = v_caller
    )
  ) then
    raise exception 'You do not have permission to invoice for this facility' using errcode = '42501';
  end if;

  if p_amount < 0 then
    raise exception 'Invoice amount cannot be negative' using errcode = 'P0001';
  end if;

  v_ref := 'OPD-' || to_char(current_date, 'YYMMDD') || '-'
        || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.finance_invoices (
    tenant_id,
    reference,
    party,
    kind,
    amount,
    due_date,
    paid_at,
    patient_id,
    appointment_id,
    description,
    line_items
  )
  values (
    p_tenant_id,
    v_ref,
    coalesce(nullif(btrim(p_party), ''), 'Patient'),
    'receivable',
    p_amount,
    coalesce(p_due_date, current_date),
    case when p_paid then now() else null end,
    p_patient_id,
    p_appointment_id,
    p_description,
    p_line_items
  )
  returning * into v_inv;

  return v_inv;
end;
$$;

grant execute on function public.create_opd_invoice to authenticated;
