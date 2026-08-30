-- 0048_procurement_requisitions.sql
-- The table behind /admin/procurement, which kept five demo requisitions in
-- localStorage under storeKey "procurement" — surgical gloves, MRI contrast,
-- office stationery, the same five for every hospital, none of it saved.
--
-- A requisition is one request to buy something: what, for which department,
-- from which vendor, and how far along it is.

-- 'rejected' is not part of the forward flow, which is why it sits at the end.
--
-- The page used to reject a requisition by DELETING it. That is the wrong
-- verb: a refused purchase request is exactly the kind of thing a hospital
-- needs to be able to point at later — who asked, for how much, and that it
-- was turned down. Rejecting now records the decision instead of erasing the
-- evidence of it.
create type public.requisition_stage as enum (
  'pending', 'approved', 'ordered', 'delivered', 'rejected'
);

create table public.procurement_requisitions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,

  -- Human-facing code shown on the card ("REQ-3041").
  reference    text not null
                 constraint procurement_requisitions_reference_check
                 check (length(btrim(reference)) > 0),

  title        text not null
                 constraint procurement_requisitions_title_check
                 check (length(btrim(title)) > 0),

  -- Which department wants it. Free text, like vendors.category in 0030 — a
  -- hospital's org chart is its own vocabulary.
  department   text,

  -- Who it is being bought from, and what they were called at the time.
  --
  -- The link goes null rather than taking the requisition with it if a vendor
  -- is removed, and vendor_name is the snapshot that keeps a delivered order
  -- readable afterwards. Same reasoning as the test snapshot on lab_orders
  -- (0047) and the employee snapshot on payroll_payslips (0042).
  vendor_id    uuid references public.vendors (id) on delete set null,
  vendor_name  text,

  amount       numeric(14, 2) not null default 0
                 constraint procurement_requisitions_amount_check check (amount >= 0),

  stage        public.requisition_stage not null default 'pending',

  notes        text,

  requested_at timestamptz not null default now(),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index procurement_requisitions_tenant_id_idx
  on public.procurement_requisitions (tenant_id);
-- The board only ever draws the four live stages, oldest first.
create index procurement_requisitions_open_idx
  on public.procurement_requisitions (tenant_id, requested_at)
  where stage <> 'rejected';

-- Two requisitions with the same code inside one hospital are the same request
-- raised twice, which double-counts committed spend. Case-insensitive for the
-- same reason as the invoice reference in 0043.
create unique index procurement_requisitions_tenant_reference_key
  on public.procurement_requisitions (tenant_id, lower(btrim(reference)));

create trigger procurement_requisitions_set_updated_at
  before update on public.procurement_requisitions
  for each row execute function public.set_updated_at();

-- The entire security story for this table.
select public.apply_tenant_rls('public.procurement_requisitions');

-- --------------------------------------------------------- the role gate ---
-- Without this, the table would land with exactly the hole 0045 was written to
-- close: the tenant template is role-blind, so any account carrying this
-- hospital's tenant_id could read it, and doctors carry one. Verified before
-- adding it — a doctor's claims returned the requisition.
--
-- The purchase ledger is the finance desk's, so the gate matches the roles the
-- resource definition already lists. Restrictive, so it ANDs with the tenant
-- policy and can only narrow.
create policy procurement_requisitions_role_gate on public.procurement_requisitions
  as restrictive for all to authenticated
  using (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'finance_admin'))
  with check (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'finance_admin'));
