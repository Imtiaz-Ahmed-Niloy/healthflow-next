-- 0080_admission_invoices.sql
-- A hospital stay bills itself, the way a consultation does (0075).
--
-- /admin/admissions showed an "invoice" only once a patient was discharged, and
-- its figures were typed into the JSX — ৳2,500 a day for a bed, ৳3,500 for
-- "diagnostics" nobody ordered — while every ward and cabin already carries a
-- real daily rate (0017, 0018). Nothing reached the patient's billing page.
--
-- Now:
--   - admission_bill() prices a stay from the beds and cabins it actually used,
--     at their own rates. It is a PostgREST computed field, so the admissions
--     list carries the running bill on every row, discharged or not.
--   - Discharging raises a receivable from that same function, so the invoice
--     and the bill on screen cannot disagree. It lands on /patient/billing
--     through the policy 0044 already gave patients.
--
-- Not backfilled, for the reason 0075 gives: stays that ended before this were
-- settled however they were settled.

alter table public.finance_invoices
  -- set null, not cascade: an invoice outlives the admission row.
  add column admission_id uuid references public.admissions (id) on delete set null,
  -- What the amount is made of, frozen when the invoice is raised: a later
  -- change to a ward's rate must not rewrite what this patient was charged.
  -- [{ description, quantity, rate, amount }]. Null for an invoice typed in by
  -- the desk, which has only its amount.
  add column line_items jsonb;

comment on column public.finance_invoices.admission_id is
  'The hospital stay this invoice bills. Set by raise_admission_invoice (0080); null otherwise.';

-- One stay, one bill.
create unique index finance_invoices_admission_key
  on public.finance_invoices (admission_id)
  where admission_id is not null;

-- ------------------------------------------------------------ the bill ---
-- One line per placement, plus the ward's nursing charge where it has one.
-- A day is each started 24 hours of a placement, so a patient moved after two
-- hours is not charged a full day at both beds on top of the day they stayed.
--
-- A placement ends when it was released, or at the discharge time if that is
-- earlier — the desk may backdate a discharge, and the release is stamped
-- now(). An open placement on a live admission runs to now().
--
-- SECURITY INVOKER: on the admissions page it reads beds, wards and cabins
-- through the caller's own RLS. Called from the invoice trigger below it runs
-- as that trigger's owner.

create or replace function public.admission_bill(a public.admissions)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with stays as (
    select
      s.started_at,
      greatest(
        s.started_at,
        least(coalesce(s.ended_at, now()), coalesce(a.discharged_at, 'infinity'::timestamptz))
      ) as ended_at,
      b.number as bed_number,
      w.name as ward_name,
      w.daily_rate as ward_rate,
      w.nursing_charge,
      c.number as cabin_number,
      c.category::text as cabin_category,
      c.daily_rate as cabin_rate
    from public.bed_stays s
    left join public.beds b on b.id = s.bed_id
    left join public.wards w on w.id = b.ward_id
    left join public.cabins c on c.id = s.cabin_id
    where s.admission_id = a.id
  ),
  counted as (
    select *, ceil(extract(epoch from (ended_at - started_at)) / 86400)::int as days
    from stays
  ),
  lines as (
    select started_at, 0 as ord,
           case
             when cabin_number is not null
               then 'Cabin ' || cabin_number || ' (' || initcap(cabin_category) || ')'
             else coalesce(ward_name, 'Ward') || ' · Bed ' || coalesce(bed_number, '—')
           end as description,
           days as quantity,
           coalesce(cabin_rate, ward_rate, 0) as rate
    from counted
    union all
    select started_at, 1, 'Nursing care · ' || ward_name, days, nursing_charge
    from counted
    where cabin_number is null and nursing_charge > 0
  )
  select jsonb_build_object(
    'lines', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'description', description,
          'quantity', quantity,
          'rate', rate,
          'amount', quantity * rate
        )
        order by started_at, ord
      ),
      '[]'::jsonb
    ),
    'total', coalesce(sum(quantity * rate), 0)
  )
  from lines
  where quantity > 0;
$$;

comment on function public.admission_bill(public.admissions) is
  'The bill for a hospital stay, priced from the beds and cabins it used. Computed field on admissions; also what raise_admission_invoice charges.';

revoke execute on function public.admission_bill(public.admissions) from public, anon;
grant execute on function public.admission_bill(public.admissions) to authenticated;

-- ---------------------------------------------------------- the invoice ---
-- A trigger rather than route code, for 0075's reasons: a stay can be ended
-- from the discharge button or the edit form, and the doctor who discharges a
-- patient may not write invoices (finance_invoices_role_gate, 0045).
--
-- Re-discharging — a discharge undone and done again, or its date corrected —
-- reprices the invoice, but only while it is unpaid. A settled invoice is a
-- record of money received and is never rewritten.

create or replace function public.raise_admission_invoice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bill        jsonb;
  v_total       numeric(14, 2);
  v_patient     text;
  v_tz          text;
  v_left        timestamptz;
  v_ref         text;
  v_description text;
begin
  v_bill  := public.admission_bill(new);
  v_total := coalesce((v_bill ->> 'total')::numeric, 0);

  -- Nothing to charge (no bed or cabin, or rates of zero) is no invoice, not
  -- an invoice for nothing.
  if v_total <= 0 then
    return new;
  end if;

  select p.full_name into v_patient from public.patients p where p.id = new.patient_id;

  -- Dates in words are the hospital's dates, not UTC's: a patient discharged
  -- at 1 a.m. in Dhaka left on that day, not the day before.
  select g.timezone into v_tz from public.global_settings g limit 1;
  v_tz   := coalesce(nullif(btrim(v_tz), ''), 'Asia/Dhaka');
  v_left := coalesce(new.discharged_at, now());

  v_ref := 'ADM-' || to_char(v_left at time zone v_tz, 'YYMMDD') || '-'
        || upper(substr(replace(new.id::text, '-', ''), 1, 8));

  v_description := 'Hospital stay · '
    || to_char(new.admitted_at at time zone v_tz, 'DD Mon') || ' – '
    || to_char(v_left at time zone v_tz, 'DD Mon YYYY');

  begin
    insert into public.finance_invoices (
      tenant_id, reference, party, kind, amount, due_date,
      patient_id, admission_id, description, line_items
    )
    values (
      new.tenant_id, v_ref, coalesce(nullif(btrim(v_patient), ''), 'Patient'),
      'receivable', v_total, current_date + 7,
      new.patient_id, new.id, v_description, v_bill -> 'lines'
    )
    on conflict (admission_id) where admission_id is not null do update
      set amount      = excluded.amount,
          line_items  = excluded.line_items,
          description = excluded.description,
          due_date    = excluded.due_date
      where public.finance_invoices.paid_at is null;
  exception when unique_violation then
    -- The reference collided (see 0075). Fall back to the whole id.
    insert into public.finance_invoices (
      tenant_id, reference, party, kind, amount, due_date,
      patient_id, admission_id, description, line_items
    )
    values (
      new.tenant_id, 'ADM-' || upper(replace(new.id::text, '-', '')),
      coalesce(nullif(btrim(v_patient), ''), 'Patient'),
      'receivable', v_total, current_date + 7,
      new.patient_id, new.id, v_description, v_bill -> 'lines'
    )
    on conflict (admission_id) where admission_id is not null do update
      set amount      = excluded.amount,
          line_items  = excluded.line_items,
          description = excluded.description,
          due_date    = excluded.due_date
      where public.finance_invoices.paid_at is null;
  end;

  return new;
end;
$$;

revoke execute on function public.raise_admission_invoice() from public, anon, authenticated;

-- AFTER, so the discharge is written — and the discharge button has already
-- released the bed — before the bill is read.
create trigger admissions_raise_invoice
  after insert or update of status, discharged_at on public.admissions
  for each row
  when (new.status = 'discharged')
  execute function public.raise_admission_invoice();

notify pgrst, 'reload schema';
