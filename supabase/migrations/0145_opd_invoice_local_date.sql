-- 0145_opd_invoice_local_date.sql
-- An OPD invoice raised in the morning in Dhaka was dated yesterday.
--
-- create_opd_invoice (0141, 0144) took "today" from current_date — the
-- database's UTC date — for both its OPD-YYMMDD reference and a missing due
-- date. Before 06:00 Asia/Dhaka that is still the previous day, so a bill
-- raised at 05:45 on 30 Oct read OPD-261029-… and was due 29 Oct. Found by
-- clicking through it, not in review.
--
-- Today is now the platform's date, from global_settings.timezone, the way
-- 0080 dates an admission's bill. The route sends a null due date rather than
-- the server's own UTC date, and null now means that same platform today.
--
-- Otherwise identical to 0144.

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
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref text;
  v_inv public.finance_invoices;
  v_existing public.finance_invoices;
  v_visit_tenant uuid;
  v_visit_patient uuid;
  v_tz text;
  v_today date;
  v_caller uuid := (select auth.uid());
begin
  if v_caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  if not (
    public.is_super_admin()
    or (public.auth_role() in ('hospital_admin', 'finance_admin')
        and p_tenant_id = any(public.auth_tenant_ids()))
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

  if p_patient_id is not null and not exists (
    select 1 from public.patients p where p.id = p_patient_id and p.tenant_id = p_tenant_id
  ) then
    raise exception 'That patient is not registered at this facility' using errcode = 'P0001';
  end if;

  select g.timezone into v_tz from public.global_settings g limit 1;
  v_tz := coalesce(nullif(btrim(v_tz), ''), 'Asia/Dhaka');
  v_today := (now() at time zone v_tz)::date;

  v_ref := 'OPD-' || to_char(v_today, 'YYMMDD') || '-'
        || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  if p_appointment_id is not null then
    select a.tenant_id, a.patient_id into v_visit_tenant, v_visit_patient
      from public.appointments a
     where a.id = p_appointment_id;
    if v_visit_tenant is distinct from p_tenant_id then
      raise exception 'That visit is not at this facility' using errcode = 'P0001';
    end if;
    if p_patient_id is not null and v_visit_patient is distinct from p_patient_id then
      raise exception 'That visit is for a different patient' using errcode = 'P0001';
    end if;
    -- The visit knows its patient even when the form did not say.
    p_patient_id := coalesce(p_patient_id, v_visit_patient);

    select * into v_existing
      from public.finance_invoices
     where appointment_id = p_appointment_id
       for update;

    if v_existing.id is not null then
      if v_existing.reference like 'OPD-%' then
        raise exception 'This visit already has OPD invoice %', v_existing.reference using errcode = 'P0001';
      end if;
      if v_existing.paid_at is not null then
        raise exception 'This visit''s bill % is already paid', v_existing.reference using errcode = 'P0001';
      end if;

      update public.finance_invoices
         set reference = v_ref,
             party = coalesce(nullif(btrim(p_party), ''), party),
             amount = p_amount,
             due_date = coalesce(p_due_date, v_today),
             paid_at = case when p_paid then now() else null end,
             patient_id = p_patient_id,
             description = p_description,
             line_items = p_line_items
       where id = v_existing.id
      returning * into v_inv;
      return to_jsonb(v_inv);
    end if;
  end if;

  insert into public.finance_invoices (
    tenant_id, reference, party, kind, amount, due_date, paid_at,
    patient_id, appointment_id, description, line_items
  )
  values (
    p_tenant_id, v_ref, coalesce(nullif(btrim(p_party), ''), 'Patient'), 'receivable',
    p_amount, coalesce(p_due_date, v_today),
    case when p_paid then now() else null end,
    p_patient_id, p_appointment_id, p_description, p_line_items
  )
  returning * into v_inv;

  return to_jsonb(v_inv);
end;
$$;

revoke execute on function public.create_opd_invoice from public, anon;
grant execute on function public.create_opd_invoice to authenticated;
