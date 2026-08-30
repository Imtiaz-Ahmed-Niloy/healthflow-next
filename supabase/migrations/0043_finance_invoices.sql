-- 0043_finance_invoices.sql
-- The table behind /admin/finance, which kept four demo invoices in
-- localStorage under storeKey "finance" — the same fake MetLife and Cigna rows
-- for every hospital, and nothing an admin entered survived a refresh.
--
-- One row is one invoice, in either direction: money the hospital is owed
-- (receivable) or owes (payable).

create type public.finance_invoice_kind as enum ('receivable', 'payable');

create table public.finance_invoices (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,

  -- Human-facing invoice code shown in the table ("INV-202608-001"). Typed or
  -- accepted from the form's suggestion, so it is a real column rather than
  -- something derived at render time.
  reference   text not null
                constraint finance_invoices_reference_check
                check (length(btrim(reference)) > 0),

  -- Who the invoice is with: an insurer, a vendor, a patient. Free text, like
  -- vendors.category in 0030 — the counterparties of a hospital are not a list
  -- worth a migration per new name.
  party       text not null
                constraint finance_invoices_party_check check (length(btrim(party)) > 0),

  kind        public.finance_invoice_kind not null,

  amount      numeric(14, 2) not null
                constraint finance_invoices_amount_check check (amount >= 0),

  due_date    date not null,

  -- When it was settled. NULL means outstanding.
  --
  -- There is deliberately no `status` column. The seed had one, storing
  -- "Pending" / "Paid" / "Overdue" as if all three were things someone
  -- chooses — but overdue is not an action, it is a date passing, so a stored
  -- "Overdue" is wrong the moment it is written and a stored "Pending" is
  -- wrong the day after it is due. Status is derived from this column and
  -- due_date instead (see src/lib/finance.ts), which also means paid_at and a
  -- status can never disagree.
  paid_at     timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index finance_invoices_tenant_id_idx on public.finance_invoices (tenant_id);
-- The two lists the page actually draws: what is outstanding, and what is due
-- soonest.
create index finance_invoices_outstanding_idx
  on public.finance_invoices (tenant_id, due_date)
  where paid_at is null;

-- Two invoices with the same code inside one hospital are the same debt
-- recorded twice, which double-counts every total on the page. Case-insensitive
-- because "inv-1001" and "INV-1001" are the same invoice to everyone but
-- Postgres.
create unique index finance_invoices_tenant_reference_key
  on public.finance_invoices (tenant_id, lower(btrim(reference)));

create trigger finance_invoices_set_updated_at
  before update on public.finance_invoices
  for each row execute function public.set_updated_at();

-- The entire security story for this table.
select public.apply_tenant_rls('public.finance_invoices');
