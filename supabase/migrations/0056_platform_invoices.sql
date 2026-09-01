-- 0056_platform_invoices.sql
-- What each hospital owes HealthFlow, per month.
--
-- /super/billing kept its invoices in localStorage under "super-invoices",
-- alongside a "super-rx-counts" map a super admin typed prescription counts
-- into by hand. Every number on the screen was whatever the last person sat at
-- that browser had typed, and it vanished with the cache.
--
-- The charge is usage-based: a hospital pays for the prescriptions its doctors
-- wrote, at the rate on its package. So an invoice is
--
--     prescriptions in the month x the package's price, less its discount
--
-- and a prescription is a completed consultation carrying at least one
-- medicine. An appointment that was booked, or seen and prescribed nothing, is
-- not a prescription and is not billed.
--
-- Two conditions gate the whole thing, and they are enforced in the generator
-- rather than left to whoever presses the button: the hospital must be
-- APPROVED, and its package assignment must be ACTIVE. A suspended hospital or
-- a lapsed plan produces no invoice at all.

-- ------------------------------------------------------------- status ---
-- No 'overdue'. Overdue is `pending` with a due date in the past — it is a
-- fact about today, not a state anybody sets, and storing it means every
-- invoice in the table silently becomes wrong at midnight unless something
-- sweeps them. The screen derives it. 'void' is for an invoice raised in
-- error: kept, not deleted, because a missing invoice number is worse than a
-- cancelled one.
create type public.platform_invoice_status as enum ('pending', 'paid', 'void');

create table public.platform_invoices (
  id            uuid primary key default gen_random_uuid(),

  tenant_id     uuid not null references public.tenants (id) on delete cascade,

  -- The month being billed, as its first day. A month is the whole period, so
  -- an end column would be a second way of saying the same thing.
  billing_month date not null
                  constraint platform_invoices_month_check
                  check (billing_month = date_trunc('month', billing_month)::date),

  -- What was counted, and what it was counted at. Both are snapshots taken
  -- when the invoice was raised.
  --
  -- Snapshots are usually the wrong instinct — see the note against
  -- support_tickets (0052) — but an invoice is the one place they are right.
  -- It is a statement of what was charged on a date. Re-pricing an issued
  -- invoice because the plan's price changed in March is not a correction,
  -- it is a different invoice.
  prescriptions integer not null
                  constraint platform_invoices_prescriptions_check check (prescriptions >= 0),
  unit_price    numeric(12, 2) not null
                  constraint platform_invoices_unit_price_check check (unit_price >= 0),
  discount_pct  numeric(5, 2) not null default 0
                  constraint platform_invoices_discount_check check (discount_pct between 0 and 100),

  -- Which plan it was billed under. The id can go null if the plan is deleted;
  -- the name is the snapshot that keeps the invoice readable afterwards.
  package_id    uuid references public.packages (id) on delete set null,
  package_name  text not null,

  -- Derived, so it cannot drift from the three numbers above — and stored, so
  -- the totals on the screen are one sum() rather than a page of arithmetic.
  total         numeric(14, 2)
                  generated always as
                  (round(prescriptions * unit_price * (1 - discount_pct / 100), 2)) stored,

  status        public.platform_invoice_status not null default 'pending',

  issued_on     date not null default current_date,
  due_date      date not null
                  constraint platform_invoices_due_check check (due_date >= issued_on),

  -- When it was actually settled. Set by the trigger below rather than by the
  -- caller, so "paid" and "paid on" can never disagree.
  paid_at       timestamptz,

  notes         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One invoice per hospital per month. This is what makes generation safe to
-- run twice: the second run finds the row and reports it rather than raising a
-- duplicate bill.
create unique index platform_invoices_tenant_month_key
  on public.platform_invoices (tenant_id, billing_month);

create index platform_invoices_month_idx  on public.platform_invoices (billing_month desc);
create index platform_invoices_status_idx on public.platform_invoices (status);

create trigger platform_invoices_set_updated_at
  before update on public.platform_invoices
  for each row execute function public.set_updated_at();

-- Invoker, not definer: it only edits the row already being written, and the
-- write itself has already been through RLS by the time it runs. Definer would
-- hand it privileges it has no use for, and the linter is right to say so.
create or replace function public.platform_invoices_stamp_paid()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    new.paid_at := coalesce(new.paid_at, now());
  elsif new.status <> 'paid' then
    -- Marked paid by mistake and put back: the date goes with it.
    new.paid_at := null;
  end if;
  return new;
end;
$$;

create trigger platform_invoices_stamp_paid
  before insert or update on public.platform_invoices
  for each row execute function public.platform_invoices_stamp_paid();

-- A trigger function is not an API. PostgREST exposes every function in the
-- public schema at /rest/v1/rpc, so this one is taken back off it; the trigger
-- calls it regardless of who may execute it.
revoke all on function public.platform_invoices_stamp_paid() from public, anon, authenticated;

-- ---------------------------------------------------------------- rls ---
-- Not the tenant template. That template lets a hospital write its own rows,
-- which here would mean a hospital issuing, editing or paying off its own
-- platform invoices. So: super_admin owns them, and a hospital_admin may read
-- their own hospital's — the bill it is being asked to pay — and nothing else.
-- Doctors and nurses have no business in the platform's accounts at all.

alter table public.platform_invoices enable row level security;

create policy platform_invoices_super_all on public.platform_invoices
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy platform_invoices_tenant_read on public.platform_invoices
  for select to authenticated
  using (
    public.auth_role() = 'hospital_admin'
    and tenant_id = public.auth_tenant_id()
  );

-- --------------------------------------------------------- generation ---
-- One statement raises the month's invoices, and reports what it did with
-- every paying hospital — including the ones it deliberately skipped. Silence
-- is the wrong answer to "why is there no invoice for this hospital?".
--
-- SECURITY DEFINER because it reads across every tenant's appointments, which
-- no caller can do; the super_admin check is therefore the first thing in it.
-- The reported set is hospitals holding a package assignment — those are the
-- customers. A directory listing that never signed up is not "skipped", it is
-- simply not a customer, and listing every hospital in Bangladesh as skipped
-- would bury the four lines that matter.

create or replace function public.generate_platform_invoices(p_month date)
returns table (
  tenant_id     uuid,
  hospital      text,
  outcome       text,
  invoice_id    uuid,
  prescriptions integer,
  total         numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_month)::date;
  r       record;
  v_count integer;
  v_id    uuid;
  v_total numeric;
begin
  if not public.is_super_admin() then
    raise exception 'generate_platform_invoices: super_admin only'
      using errcode = '42501';
  end if;

  if v_month > date_trunc('month', current_date)::date then
    raise exception 'generate_platform_invoices: % has not started yet', to_char(v_month, 'Mon YYYY')
      using errcode = '22023';
  end if;

  for r in
    select
      t.id            as tenant_id,
      t.name          as hospital,
      t.status        as tenant_status,
      hp.status       as package_status,
      hp.base_price   as unit_price,
      hp.discount_pct as discount_pct,
      hp.package_id   as package_id,
      coalesce(p.name, 'Package') as package_name
    from public.hospital_packages hp
    join public.tenants t on t.id = hp.tenant_id
    left join public.packages p on p.id = hp.package_id
    order by t.name
  loop
    -- Already billed for this month. Reported, not replaced: an issued
    -- invoice is a statement that was sent, and regenerating it would rewrite
    -- history every time somebody pressed the button twice.
    select i.id, i.prescriptions, i.total
      into v_id, v_count, v_total
      from public.platform_invoices i
     where i.tenant_id = r.tenant_id and i.billing_month = v_month;

    if found then
      return query select r.tenant_id, r.hospital, 'exists'::text, v_id, v_count, v_total;
      continue;
    end if;

    if r.tenant_status <> 'approved' then
      return query select r.tenant_id, r.hospital, 'not_approved'::text, null::uuid, null::integer, null::numeric;
      continue;
    end if;

    if r.package_status <> 'active' then
      return query select r.tenant_id, r.hospital, 'no_active_package'::text, null::uuid, null::integer, null::numeric;
      continue;
    end if;

    -- A prescription: a consultation a doctor completed with at least one
    -- medicine on it. Dated by the visit, not by when the row was last
    -- touched, so reopening an old chart cannot move it into this month's
    -- bill.
    select count(*)
      into v_count
      from public.appointments a
     where a.tenant_id = r.tenant_id
       and a.status = 'completed'
       and a.doctor_id is not null
       -- typeof first: the column defaults to '[]' but nothing constrains it
       -- to an array, and jsonb_array_length on an object raises rather than
       -- returning 0 — one malformed chart would fail the whole run.
       and jsonb_typeof(a.medicines) = 'array'
       and jsonb_array_length(a.medicines) > 0
       and a.scheduled_date >= v_month
       and a.scheduled_date < (v_month + interval '1 month')::date;

    if v_count = 0 then
      -- No usage, no invoice. A zero-total bill is not a bill; it is a
      -- statement nobody needs to read, act on or pay.
      return query select r.tenant_id, r.hospital, 'no_prescriptions'::text, null::uuid, 0, null::numeric;
      continue;
    end if;

    insert into public.platform_invoices (
      tenant_id, billing_month, prescriptions, unit_price, discount_pct,
      package_id, package_name, due_date
    )
    values (
      r.tenant_id, v_month, v_count, r.unit_price, r.discount_pct,
      r.package_id, r.package_name, current_date + 14
    )
    returning platform_invoices.id, platform_invoices.total into v_id, v_total;

    return query select r.tenant_id, r.hospital, 'created'::text, v_id, v_count, v_total;
  end loop;
end;
$$;

revoke all on function public.generate_platform_invoices(date) from public, anon;
grant execute on function public.generate_platform_invoices(date) to authenticated;

comment on function public.generate_platform_invoices(date) is
  'Raises one platform invoice per approved hospital on an active package for the given month, counting completed consultations that carry at least one medicine. super_admin only; safe to run twice.';
