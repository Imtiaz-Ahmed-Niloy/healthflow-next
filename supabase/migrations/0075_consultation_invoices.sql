-- 0075_consultation_invoices.sql
-- A consultation bills itself.
--
-- A doctor carries a consultation fee (doctors.consultation_fee, 0005), and a
-- patient has a billing page that reads finance_invoices (0044) — but nothing
-- joined the two. The fee sat on the doctor's profile, the visit ended, and the
-- patient's bills stayed empty until someone at the finance desk typed one in.
--
-- Now the moment an appointment becomes `completed` — the doctor submitting
-- the prescription, or the front desk closing the visit — the hospital raises
-- a receivable for that doctor's fee against that patient.
--
-- A trigger rather than route code, for two reasons:
--   - there is more than one way to complete a visit (the doctor's portal,
--     the admin appointments page), and a bill that depends on which button
--     was pressed is a bill that will be missed;
--   - the doctor completing the visit is not allowed to write invoices
--     (finance_invoices_role_gate, 0045), and should not be. The trigger runs
--     as SECURITY DEFINER and writes exactly one row, derived from the visit
--     itself — nothing in it comes from the request.
--
-- Not backfilled: visits completed before this migration were settled however
-- they were settled, and inventing invoices for them now would put debts on
-- patients' pages that nobody raised.

alter table public.finance_invoices
  -- The visit this invoice bills, when it bills one. set null, not cascade:
  -- an invoice is a financial record and outlives the appointment row.
  add column appointment_id uuid references public.appointments (id) on delete set null,
  -- What the charge is for, in words a patient can read: "Consultation with
  -- Dr. Rahman on 11 Sep 2026". The reference alone tells them nothing.
  add column description text;

comment on column public.finance_invoices.appointment_id is
  'The consultation this invoice bills. Set by raise_consultation_invoice (0075); null for invoices raised by hand.';

-- One visit, one bill. Reopening a completed visit and completing it again must
-- not charge the patient twice; this is what the trigger's ON CONFLICT leans on.
create unique index finance_invoices_appointment_key
  on public.finance_invoices (appointment_id)
  where appointment_id is not null;

create or replace function public.raise_consultation_invoice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fee     numeric(10, 2);
  v_doctor  text;
  v_patient text;
  v_ref     text;
begin
  if new.doctor_id is null then
    return new;
  end if;

  -- The fee as it stands when the visit ends — a later change to the doctor's
  -- fee must not rewrite what this patient was charged. Matched on tenant as
  -- well as id, so a visit can only ever bill its own hospital's doctor.
  select d.consultation_fee, d.name
    into v_fee, v_doctor
    from public.doctors d
   where d.id = new.doctor_id
     and d.tenant_id = new.tenant_id;

  -- No fee set is not a free visit to invoice at zero; it is no invoice.
  if coalesce(v_fee, 0) <= 0 then
    return new;
  end if;

  select p.full_name into v_patient from public.patients p where p.id = new.patient_id;

  v_ref := 'CON-' || to_char(new.scheduled_date, 'YYMMDD') || '-'
        || upper(substr(replace(new.id::text, '-', ''), 1, 8));

  begin
    insert into public.finance_invoices (
      tenant_id, reference, party, kind, amount, due_date,
      patient_id, appointment_id, description
    )
    values (
      new.tenant_id,
      v_ref,
      coalesce(nullif(btrim(v_patient), ''), 'Patient'),
      'receivable',
      v_fee,
      -- A week to settle. The finance desk marks it paid when the money is in.
      current_date + 7,
      new.patient_id,
      new.id,
      'Consultation with ' || coalesce(v_doctor, 'your doctor')
        || ' on ' || to_char(new.scheduled_date, 'DD Mon YYYY')
    )
    on conflict (appointment_id) where appointment_id is not null do nothing;
  exception when unique_violation then
    -- The only other unique key is the reference. Eight hex characters of a
    -- uuid on the same date colliding is vanishingly unlikely, but a
    -- collision must not stop a doctor submitting a prescription — so fall
    -- back to the whole id, which cannot collide.
    insert into public.finance_invoices (
      tenant_id, reference, party, kind, amount, due_date,
      patient_id, appointment_id, description
    )
    values (
      new.tenant_id,
      'CON-' || upper(replace(new.id::text, '-', '')),
      coalesce(nullif(btrim(v_patient), ''), 'Patient'),
      'receivable',
      v_fee,
      current_date + 7,
      new.patient_id,
      new.id,
      'Consultation with ' || coalesce(v_doctor, 'your doctor')
        || ' on ' || to_char(new.scheduled_date, 'DD Mon YYYY')
    )
    on conflict (appointment_id) where appointment_id is not null do nothing;
  end;

  return new;
end;
$$;

-- A trigger function, never an API call. Same tightening as 0004.
revoke execute on function public.raise_consultation_invoice() from public, anon, authenticated;

-- AFTER, so the visit is already written when the bill is; `of status` so
-- editing a completed visit's notes does not re-enter this at all.
create trigger appointments_raise_consultation_invoice
  after insert or update of status on public.appointments
  for each row
  when (new.status = 'completed')
  execute function public.raise_consultation_invoice();
