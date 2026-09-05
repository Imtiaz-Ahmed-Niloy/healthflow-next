-- 0071_work_orders.sql
-- The document a hospital issues once a requisition has been approved: what is
-- being made or supplied, by whom, at what unit price, on what terms.
--
-- A requisition (0048) is a request to buy. A work order is the instruction
-- that follows it, and it is the piece the vendor signs. The two are separate
-- rows because they are separate documents with separate lifetimes: a
-- requisition can be rejected and still be worth keeping, and one approved
-- requisition can be worked into an order whose figures were negotiated after
-- the request was raised.
--
-- The layout is fixed by the form the finance desk already uses: a header, a
-- bill-to block, priced lines, subtotal + shipping + other, and four
-- signatures. Column names follow it so the printed document and the row are
-- the same thing read two ways.

create type public.work_order_status as enum (
  'draft', 'issued', 'completed', 'cancelled'
);

create table public.work_orders (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,

  -- The requisition this order was raised from, where there was one. Null is
  -- allowed: not every order starts life as a requisition, and an order must
  -- outlive the request that prompted it rather than vanishing with it.
  requisition_id  uuid references public.procurement_requisitions (id) on delete set null,

  -- "W.O. #" on the form. Human-facing, and the thing people quote on the
  -- phone.
  reference       text not null
                    constraint work_orders_reference_check
                    check (length(btrim(reference)) > 0),

  issued_on       date not null default current_date,

  -- The header block: who asked, under which customer code, for which
  -- department.
  requested_by    text,
  customer_code   text,
  department      text,

  -- "JOB" — the free-text description of the work, which on the paper form is
  -- a paragraph rather than a line.
  job             text,

  -- BILL TO / SHIP TO. Free text rather than a vendors link on purpose: the
  -- party an order is billed to is often not a registered vendor, and the
  -- address is a snapshot of where it was sent on the day. Same reasoning as
  -- the vendor_name snapshot in 0048.
  bill_to_name    text,
  bill_to_contact text,
  bill_to_address text,
  bill_to_phone   text,

  -- The priced lines, in order, as
  --   [{ "qty": text, "description": text, "unit": number, "unit_price": number }]
  --
  -- jsonb rather than a child table because a line has no life of its own: it
  -- is never read, filtered or reported on except as part of the order that
  -- owns it, and a second table would mean the create is two writes that can
  -- half-succeed. `qty` is text because the form's quantity column carries the
  -- packing as written ("2400 Bundle * 50 pcs = 320000 Pcs"); `unit` is the
  -- number that is actually multiplied by the price.
  items           jsonb not null default '[]'::jsonb
                    constraint work_orders_items_is_array
                    check (jsonb_typeof(items) = 'array'),

  -- Stored, not derived.
  --
  -- A work order is signed by both sides, so the figures on it are what was
  -- agreed on the day. Recomputing them from `items` at render time would let
  -- a later change to how a line is totalled quietly restate a document
  -- somebody has already signed. Shipping and other are the form's own "S & H"
  -- and "OTHER" rows.
  subtotal        numeric(14, 2) not null default 0
                    constraint work_orders_subtotal_check check (subtotal >= 0),
  shipping        numeric(14, 2) not null default 0
                    constraint work_orders_shipping_check check (shipping >= 0),
  other           numeric(14, 2) not null default 0
                    constraint work_orders_other_check check (other >= 0),
  total           numeric(14, 2) not null default 0
                    constraint work_orders_total_check check (total >= 0),

  -- The numbered terms under "Other Comments or Special Instructions". One
  -- text block, because the desk edits them as prose per order rather than
  -- picking from a list.
  terms           text,

  status          public.work_order_status not null default 'draft',

  -- "Completed Date:" — set when the work is signed off, so it stays null for
  -- everything still open.
  completed_on    date,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index work_orders_tenant_id_idx on public.work_orders (tenant_id);
-- The list is newest first, which is the order the desk reads them in.
create index work_orders_tenant_issued_idx on public.work_orders (tenant_id, issued_on desc);
-- Opening a requisition shows the orders raised from it.
create index work_orders_requisition_id_idx on public.work_orders (requisition_id)
  where requisition_id is not null;

-- Two orders sharing a number inside one hospital are the same order issued
-- twice, which is a vendor invoiced twice. Case-insensitive, as in 0048.
create unique index work_orders_tenant_reference_key
  on public.work_orders (tenant_id, lower(btrim(reference)));

create trigger work_orders_set_updated_at
  before update on public.work_orders
  for each row execute function public.set_updated_at();

-- The entire security story for this table.
select public.apply_tenant_rls('public.work_orders');

-- --------------------------------------------------------- the role gate ---
-- The tenant template is role-blind, and a work order carries unit prices, a
-- counterparty and a total — the purchase ledger, which the module guide names
-- explicitly as needing a gate. Without this any account holding the
-- hospital's tenant_id could read what it paid and to whom, and doctors hold
-- one.
--
-- Same roles the resource definition lists, so the clean 403 and the database
-- agree. Restrictive, so it can only narrow the tenant policy.
select public.apply_role_gate('public.work_orders',
                              '{hospital_admin,finance_admin}');

-- Who raised an order, who changed its figures, who marked it complete.
-- Column names only: the values are a counterparty and money.
select public.attach_audit('public.work_orders');

comment on table public.work_orders is
  'The order issued against an approved requisition: priced lines, agreed totals and terms. Totals are stored as agreed rather than recomputed, because the document is signed.';
