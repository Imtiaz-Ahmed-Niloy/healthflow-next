-- 0126_pharmacy_module.sql
-- The pharmacy becomes a module of its own, with its own panel (/pharmacy)
-- for the pharmacy_admin role, which until now only opened the admin panel
-- and had one screen there: a stock list with a number typed in by hand.
--
-- What a pharmacy actually keeps:
--
--   pharmacy_items                 the catalogue (0036), now with prices
--   pharmacy_suppliers             who medicine is bought from
--   pharmacy_batches               stock, per batch number and expiry date
--   pharmacy_stock_movements       every change to a batch's quantity, and why
--   pharmacy_purchase_orders       an order to a supplier, and its lines
--   pharmacy_customers             people who buy on account, or come back
--   pharmacy_cash_shifts           one cashier's drawer, opened and counted
--   pharmacy_cash_transactions     what went in and out of it
--   pharmacy_expenses              rent, utilities, the tea boy
--   pharmacy_sales                 an invoice, its lines, payments and returns
--   pharmacy_settings              one row per hospital: receipt wording, VAT
--
-- Nothing here writes a sale or moves stock by itself. That is 0127: a sale
-- and the stock it takes have to succeed or fail together, which a route
-- handler making four separate calls cannot promise.
--
-- Every table carries the tenant template (0002) and the role gate (0051).
-- Finance reads, because pharmacy sales are hospital income; only the
-- hospital admin and the pharmacy write.

-- ------------------------------------------------------------- helpers ---

-- The hospital's working day. A sale at 00:30 Dhaka time is today's sale,
-- not yesterday's, whatever the database server's clock thinks.
create or replace function public.pharmacy_tz()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select g.timezone from public.global_settings g limit 1), 'Asia/Dhaka')
$$;

create or replace function public.pharmacy_today()
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select (now() at time zone public.pharmacy_tz())::date
$$;

revoke execute on function public.pharmacy_tz() from public;
revoke execute on function public.pharmacy_today() from public;
grant execute on function public.pharmacy_tz() to authenticated;
grant execute on function public.pharmacy_today() to authenticated;

-- A row must point at records of its own hospital. RLS checks the row's own
-- tenant_id and nothing else, and a foreign key is checked without RLS, so
-- without this a batch could be filed against another hospital's product by
-- anyone who knew its id. Same reasoning as journal_lines_check_tenant (0063).
--
-- Arguments come in pairs: the parent table, then the column pointing at it.
-- Runs as the caller, so a parent in another hospital is invisible to it and
-- reads as "does not exist".
create or replace function public.pharmacy_same_tenant()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  i        integer := 0;
  v_table  text;
  v_column text;
  v_id     uuid;
  v_tenant uuid;
begin
  while i < tg_nargs loop
    v_table  := tg_argv[i];
    v_column := tg_argv[i + 1];

    execute format('select ($1).%I', v_column) using new into v_id;

    if v_id is not null then
      execute format('select tenant_id from public.%I where id = $1', v_table) using v_id into v_tenant;

      if v_tenant is null or v_tenant <> new.tenant_id then
        raise exception '% on % does not belong to this hospital', v_column, tg_table_name
          using errcode = 'PH002', hint = 'wrong_hospital';
      end if;
    end if;

    i := i + 2;
  end loop;

  return new;
end;
$$;

-- Who did it, from the session rather than the request body. The name is
-- kept beside the id so a receipt printed in two years still says who served,
-- even if that login is long gone.
create or replace function public.pharmacy_stamp_actor()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is not null then
    new.created_by := v_user;
    new.created_by_name := (select p.full_name from public.profiles p where p.id = v_user);
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------- items ---
-- 0036 pinned category to five values. A pharmacy's shelves are not five
-- kinds of thing, so it is free text now and the page offers what is already
-- in use.
alter table public.pharmacy_items
  drop constraint if exists pharmacy_items_category_check;

alter table public.pharmacy_items
  add column generic_name          text,
  add column description           text,
  add column manufacturer          text,
  add column selling_price         numeric(12,2) not null default 0
    constraint pharmacy_items_selling_price_check check (selling_price >= 0),
  -- What it usually costs to buy. The real cost of what is on the shelf is on
  -- each batch; this one prefills a purchase order line.
  add column cost_price            numeric(12,2) not null default 0
    constraint pharmacy_items_cost_price_check check (cost_price >= 0),
  add column requires_prescription boolean not null default false,
  add column track_expiry          boolean not null default true,
  -- A product with sales behind it cannot be deleted. It is switched off.
  add column is_active             boolean not null default true;

create index pharmacy_items_tenant_name_idx on public.pharmacy_items (tenant_id, lower(name));

-- `stock` and `status` stop being typed in. Stock is the sum of the batches
-- (kept by pharmacy_batches_sync below) and status follows from it, so the
-- number on the screen is the number on the shelf.
--
-- coalesce on the flag: in a session that never set it current_setting is
-- null, and `null <> '1'` is null, which would let a typed-in stock through.
create or replace function public.pharmacy_items_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.stock := 0;
  elsif new.stock is distinct from old.stock
        and coalesce(current_setting('pharmacy.syncing_stock', true), '') <> '1' then
    new.stock := old.stock;
  end if;

  new.status := case
    when new.stock <= 0 then 'out_of_stock'
    when new.stock <= new.reorder then 'low_stock'
    else 'active'
  end;

  return new;
end;
$$;

create trigger pharmacy_items_guard
  before insert or update on public.pharmacy_items
  for each row execute function public.pharmacy_items_guard();

-- Cost prices sit on this row now. Doctors could read the table before; they
-- had no screen that did, and a cost price is not theirs to see.
select public.apply_role_gate('public.pharmacy_items',
                              '{hospital_admin,pharmacy_admin,finance_admin}',
                              '{hospital_admin,pharmacy_admin}');

-- ------------------------------------------------------------ suppliers ---
create table public.pharmacy_suppliers (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,

  name           text not null
                   constraint pharmacy_suppliers_name_check check (length(btrim(name)) > 0),
  contact_person text,
  phone          text,
  email          text,
  address        text,
  notes          text,

  status         text not null default 'active'
                   constraint pharmacy_suppliers_status_check check (status in ('active', 'inactive')),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index pharmacy_suppliers_tenant_id_idx on public.pharmacy_suppliers (tenant_id);

create trigger pharmacy_suppliers_set_updated_at
  before update on public.pharmacy_suppliers
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------- batches ---
create table public.pharmacy_batches (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  -- No "on delete restrict" anywhere in this file, on purpose. RESTRICT is
  -- checked at once, so deleting a hospital would stop at its first product
  -- that has a batch. The default is checked when the statement ends, by
  -- which time the hospital's own cascade has taken the batches too — and a
  -- product with stock still cannot be deleted on its own.
  item_id      uuid not null references public.pharmacy_items (id),

  batch_number text not null
                 constraint pharmacy_batches_number_check check (length(btrim(batch_number)) > 0),
  quantity     integer not null default 0
                 constraint pharmacy_batches_quantity_check check (quantity >= 0),
  -- What this batch was bought for, per unit. Profit on a sale is counted
  -- against this, not against whatever the product costs today.
  unit_cost    numeric(12,2) not null default 0
                 constraint pharmacy_batches_unit_cost_check check (unit_cost >= 0),
  -- Null for what does not expire: a thermometer, a walking stick.
  expiry_date  date,
  location     text not null default 'Main',

  supplier_id  uuid references public.pharmacy_suppliers (id) on delete set null,
  received_at  timestamptz not null default now(),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index pharmacy_batches_tenant_id_idx on public.pharmacy_batches (tenant_id);
create index pharmacy_batches_item_id_idx on public.pharmacy_batches (item_id);
-- What the alerts page asks: stock still on the shelf, soonest expiry first.
create index pharmacy_batches_expiry_idx on public.pharmacy_batches (tenant_id, expiry_date) where quantity > 0;

-- One row per batch of a product. The same batch arriving twice adds to it.
create unique index pharmacy_batches_item_batch_key
  on public.pharmacy_batches (item_id, lower(btrim(batch_number)));

create trigger pharmacy_batches_set_updated_at
  before update on public.pharmacy_batches
  for each row execute function public.set_updated_at();

create trigger pharmacy_batches_same_tenant
  before insert or update on public.pharmacy_batches
  for each row execute function public.pharmacy_same_tenant(
    'pharmacy_items', 'item_id', 'pharmacy_suppliers', 'supplier_id');

-- ------------------------------------------------------ stock movements ---
-- Append-only. Every change to a batch's quantity lands here from the trigger
-- below, whichever way the change was made — a sale, a delivery, a
-- write-off, or somebody editing the row directly. Nobody signed in can
-- insert, change or delete a line themselves (see the revoke).
create table public.pharmacy_stock_movements (
  id           bigint generated always as identity primary key,
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  item_id      uuid not null references public.pharmacy_items (id) on delete cascade,
  batch_id     uuid references public.pharmacy_batches (id) on delete set null,
  batch_number text,

  kind         text not null
                 constraint pharmacy_stock_movements_kind_check
                 check (kind in ('opening', 'purchase', 'sale', 'return', 'adjustment', 'damaged', 'expired', 'lost')),
  -- Signed: +40 received, -2 sold.
  quantity     integer not null,
  -- The invoice or order it happened on, where there is one.
  reference    text,
  note         text,

  created_by      uuid references public.profiles (id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now()
);

create index pharmacy_stock_movements_tenant_idx on public.pharmacy_stock_movements (tenant_id, created_at desc);
create index pharmacy_stock_movements_item_idx on public.pharmacy_stock_movements (item_id, created_at desc);
create index pharmacy_stock_movements_batch_idx on public.pharmacy_stock_movements (batch_id);

-- Keeps two things true after any write to a batch: the product's stock is
-- the sum of its batches, and the change is on the ledger.
--
-- SECURITY DEFINER because nobody signed in may write the ledger directly.
-- It only ever writes for the batch's own hospital and product, and
-- pharmacy_same_tenant has already tied those two together.
--
-- Stock moves by the difference, not by re-adding the batches up: two sales
-- of one product at the same moment each see only their own change, and a
-- recount by either would lose the other's.
create or replace function public.pharmacy_batches_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delta  integer;
  v_row    public.pharmacy_batches;
  v_kind   text := coalesce(nullif(current_setting('pharmacy.movement_kind', true), ''), 'adjustment');
  v_ref    text := nullif(current_setting('pharmacy.movement_ref', true), '');
  v_note   text := nullif(current_setting('pharmacy.movement_note', true), '');
  v_user   uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    v_row := new;
    v_delta := new.quantity;
  elsif tg_op = 'UPDATE' then
    if new.item_id <> old.item_id then
      raise exception 'A batch cannot be moved to another product.'
        using errcode = 'PH001', hint = 'batch_item_fixed';
    end if;
    v_row := new;
    v_delta := new.quantity - old.quantity;
  else
    v_row := old;
    v_delta := -old.quantity;
  end if;

  if v_delta = 0 then
    return null;
  end if;

  -- The whole hospital is being deleted and this batch is going with it.
  -- There is nothing left to keep a ledger for, and a line written now would
  -- point at a hospital that no longer exists and stop the delete.
  if tg_op = 'DELETE' and not exists (select 1 from public.tenants t where t.id = old.tenant_id) then
    return null;
  end if;

  insert into public.pharmacy_stock_movements (
    tenant_id, item_id, batch_id, batch_number, kind, quantity, reference, note,
    created_by, created_by_name
  )
  values (
    v_row.tenant_id, v_row.item_id,
    -- A deleted batch cannot be pointed at; its number is kept instead.
    case when tg_op = 'DELETE' then null else v_row.id end,
    v_row.batch_number, v_kind, v_delta, v_ref, v_note,
    v_user, (select p.full_name from public.profiles p where p.id = v_user)
  );

  perform set_config('pharmacy.syncing_stock', '1', true);
  update public.pharmacy_items
     set stock = greatest(stock + v_delta, 0)
   where id = v_row.item_id;
  perform set_config('pharmacy.syncing_stock', '', true);

  return null;
end;
$$;

create trigger pharmacy_batches_sync
  after insert or update or delete on public.pharmacy_batches
  for each row execute function public.pharmacy_batches_sync();

-- ------------------------------------------------------ purchase orders ---
create table public.pharmacy_purchase_orders (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,

  po_number      text not null,
  supplier_id    uuid not null references public.pharmacy_suppliers (id),

  status         text not null default 'ordered'
                   constraint pharmacy_purchase_orders_status_check
                   check (status in ('ordered', 'partial', 'received', 'cancelled')),
  payment_status text not null default 'unpaid'
                   constraint pharmacy_purchase_orders_payment_status_check
                   check (payment_status in ('unpaid', 'partial', 'paid')),

  order_date     date not null default current_date,
  expected_date  date,

  subtotal       numeric(14,2) not null default 0,
  tax            numeric(14,2) not null default 0,
  shipping_cost  numeric(14,2) not null default 0,
  total_amount   numeric(14,2) not null default 0,
  paid_amount    numeric(14,2) not null default 0
                   constraint pharmacy_purchase_orders_paid_check check (paid_amount >= 0),

  notes          text,

  created_by      uuid references public.profiles (id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint pharmacy_purchase_orders_number_key unique (tenant_id, po_number)
);

create index pharmacy_purchase_orders_tenant_idx on public.pharmacy_purchase_orders (tenant_id, created_at desc);
create index pharmacy_purchase_orders_supplier_idx on public.pharmacy_purchase_orders (supplier_id);

create trigger pharmacy_purchase_orders_set_updated_at
  before update on public.pharmacy_purchase_orders
  for each row execute function public.set_updated_at();

create trigger pharmacy_purchase_orders_same_tenant
  before insert or update on public.pharmacy_purchase_orders
  for each row execute function public.pharmacy_same_tenant('pharmacy_suppliers', 'supplier_id');

create trigger pharmacy_purchase_orders_stamp_actor
  before insert on public.pharmacy_purchase_orders
  for each row execute function public.pharmacy_stamp_actor();

create table public.pharmacy_purchase_order_items (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,
  purchase_order_id uuid not null references public.pharmacy_purchase_orders (id) on delete cascade,
  item_id           uuid not null references public.pharmacy_items (id),

  -- As it was called on the day it was ordered.
  item_name         text not null,
  sku               text,

  quantity          integer not null
                      constraint pharmacy_purchase_order_items_quantity_check check (quantity > 0),
  received_quantity integer not null default 0
                      constraint pharmacy_purchase_order_items_received_check check (received_quantity >= 0),
  unit_cost         numeric(12,2) not null default 0
                      constraint pharmacy_purchase_order_items_cost_check check (unit_cost >= 0),

  created_at        timestamptz not null default now()
);

create index pharmacy_purchase_order_items_tenant_idx on public.pharmacy_purchase_order_items (tenant_id);
create index pharmacy_purchase_order_items_order_idx on public.pharmacy_purchase_order_items (purchase_order_id);
create index pharmacy_purchase_order_items_item_idx on public.pharmacy_purchase_order_items (item_id);

create trigger pharmacy_purchase_order_items_same_tenant
  before insert or update on public.pharmacy_purchase_order_items
  for each row execute function public.pharmacy_same_tenant(
    'pharmacy_purchase_orders', 'purchase_order_id', 'pharmacy_items', 'item_id');

-- ------------------------------------------------------------ customers ---
create table public.pharmacy_customers (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,

  name       text not null
               constraint pharmacy_customers_name_check check (length(btrim(name)) > 0),
  phone      text,
  email      text,
  address    text,
  -- The hospital's own patient record, when the buyer is one.
  patient_id uuid references public.patients (id) on delete set null,
  notes      text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pharmacy_customers_tenant_id_idx on public.pharmacy_customers (tenant_id);
create index pharmacy_customers_phone_idx on public.pharmacy_customers (tenant_id, phone);

create trigger pharmacy_customers_set_updated_at
  before update on public.pharmacy_customers
  for each row execute function public.set_updated_at();

create trigger pharmacy_customers_same_tenant
  before insert or update on public.pharmacy_customers
  for each row execute function public.pharmacy_same_tenant('patients', 'patient_id');

-- ---------------------------------------------------------- cash shifts ---
-- A drawer belongs to the person who opened it. Two cashiers at two counters
-- each count their own, so a shortfall has a name on it.
create table public.pharmacy_cash_shifts (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,

  opened_by        uuid references public.profiles (id) on delete set null,
  opened_by_name   text,
  opened_at        timestamptz not null default now(),
  opening_balance  numeric(14,2) not null default 0
                     constraint pharmacy_cash_shifts_opening_check check (opening_balance >= 0),

  status           text not null default 'open'
                     constraint pharmacy_cash_shifts_status_check check (status in ('open', 'closed')),

  closed_at        timestamptz,
  closed_by_name   text,
  -- What should be in the drawer, and what was counted. Both are written at
  -- closing; the difference is the discrepancy.
  expected_balance numeric(14,2),
  closing_balance  numeric(14,2),
  discrepancy      numeric(14,2),
  closing_note     text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index pharmacy_cash_shifts_tenant_idx on public.pharmacy_cash_shifts (tenant_id, opened_at desc);

-- One open drawer per person.
create unique index pharmacy_cash_shifts_one_open
  on public.pharmacy_cash_shifts (tenant_id, opened_by) where status = 'open';

create trigger pharmacy_cash_shifts_set_updated_at
  before update on public.pharmacy_cash_shifts
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------- expenses ---
create table public.pharmacy_expenses (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,

  expense_date date not null default current_date,
  category     text not null
                 constraint pharmacy_expenses_category_check check (length(btrim(category)) > 0),
  description  text,
  amount       numeric(14,2) not null
                 constraint pharmacy_expenses_amount_check check (amount > 0),
  -- Set when it was paid out of a cash drawer.
  shift_id     uuid references public.pharmacy_cash_shifts (id) on delete set null,

  created_by      uuid references public.profiles (id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index pharmacy_expenses_tenant_idx on public.pharmacy_expenses (tenant_id, expense_date desc);

create trigger pharmacy_expenses_set_updated_at
  before update on public.pharmacy_expenses
  for each row execute function public.set_updated_at();

create trigger pharmacy_expenses_stamp_actor
  before insert on public.pharmacy_expenses
  for each row execute function public.pharmacy_stamp_actor();

create trigger pharmacy_expenses_same_tenant
  before insert or update on public.pharmacy_expenses
  for each row execute function public.pharmacy_same_tenant('pharmacy_cash_shifts', 'shift_id');

-- ---------------------------------------------------------------- sales ---
create table public.pharmacy_sales (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,

  invoice_number    text not null,
  sold_at           timestamptz not null default now(),

  -- Null for someone who walked in. The name and phone are kept on the sale
  -- either way: a receipt has to read the same after the customer is edited.
  customer_id       uuid references public.pharmacy_customers (id) on delete set null,
  customer_name     text,
  customer_phone    text,

  subtotal          numeric(14,2) not null default 0,
  discount          numeric(14,2) not null default 0,
  tax_rate          numeric(5,2)  not null default 0,
  tax               numeric(14,2) not null default 0,
  total_amount      numeric(14,2) not null default 0,

  -- Settled towards the bill. Change handed back is not part of it.
  paid_amount       numeric(14,2) not null default 0,
  tendered_amount   numeric(14,2) not null default 0,
  change_amount     numeric(14,2) not null default 0,
  -- The value of what came back, at the price it was sold for.
  refunded_amount   numeric(14,2) not null default 0,

  payment_method    text not null
                      constraint pharmacy_sales_payment_method_check
                      check (payment_method in ('cash', 'card', 'mobile', 'credit', 'other')),
  payment_reference text,
  payment_status    text not null default 'paid'
                      constraint pharmacy_sales_payment_status_check
                      check (payment_status in ('paid', 'partial', 'unpaid')),
  status            text not null default 'completed'
                      constraint pharmacy_sales_status_check
                      check (status in ('completed', 'partial_return', 'returned')),

  notes             text,
  shift_id          uuid references public.pharmacy_cash_shifts (id) on delete set null,

  created_by        uuid references public.profiles (id) on delete set null,
  created_by_name   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint pharmacy_sales_invoice_key unique (tenant_id, invoice_number)
);

create index pharmacy_sales_tenant_sold_idx on public.pharmacy_sales (tenant_id, sold_at desc);
create index pharmacy_sales_customer_idx on public.pharmacy_sales (customer_id);
create index pharmacy_sales_shift_idx on public.pharmacy_sales (shift_id);

create trigger pharmacy_sales_set_updated_at
  before update on public.pharmacy_sales
  for each row execute function public.set_updated_at();

create trigger pharmacy_sales_stamp_actor
  before insert on public.pharmacy_sales
  for each row execute function public.pharmacy_stamp_actor();

create trigger pharmacy_sales_same_tenant
  before insert or update on public.pharmacy_sales
  for each row execute function public.pharmacy_same_tenant(
    'pharmacy_customers', 'customer_id', 'pharmacy_cash_shifts', 'shift_id');

-- One line per product and batch: ten strips sold from two batches is two
-- lines, because a return has to go back to the batch it came from.
create table public.pharmacy_sale_items (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,
  sale_id           uuid not null references public.pharmacy_sales (id) on delete cascade,
  item_id           uuid not null references public.pharmacy_items (id),
  batch_id          uuid references public.pharmacy_batches (id) on delete set null,

  -- As sold. The catalogue may rename or reprice it afterwards.
  item_name         text not null,
  sku               text,
  category          text,
  batch_number      text,
  expiry_date       date,

  quantity          integer not null
                      constraint pharmacy_sale_items_quantity_check check (quantity > 0),
  returned_quantity integer not null default 0,
  unit_price        numeric(12,2) not null default 0,
  unit_cost         numeric(12,2) not null default 0,
  line_total        numeric(14,2) generated always as (quantity * unit_price) stored,

  created_at        timestamptz not null default now(),

  constraint pharmacy_sale_items_returned_check
    check (returned_quantity >= 0 and returned_quantity <= quantity)
);

create index pharmacy_sale_items_tenant_idx on public.pharmacy_sale_items (tenant_id);
create index pharmacy_sale_items_sale_idx on public.pharmacy_sale_items (sale_id);
create index pharmacy_sale_items_item_idx on public.pharmacy_sale_items (item_id);

create trigger pharmacy_sale_items_same_tenant
  before insert or update on public.pharmacy_sale_items
  for each row execute function public.pharmacy_same_tenant(
    'pharmacy_sales', 'sale_id', 'pharmacy_items', 'item_id', 'pharmacy_batches', 'batch_id');

-- Money that came in after the day of the sale, against a sale on account.
create table public.pharmacy_sale_payments (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  sale_id         uuid not null references public.pharmacy_sales (id) on delete cascade,

  amount          numeric(14,2) not null
                    constraint pharmacy_sale_payments_amount_check check (amount > 0),
  method          text not null
                    constraint pharmacy_sale_payments_method_check
                    check (method in ('cash', 'card', 'mobile', 'other')),
  reference       text,
  shift_id        uuid references public.pharmacy_cash_shifts (id) on delete set null,

  created_by      uuid references public.profiles (id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now()
);

create index pharmacy_sale_payments_tenant_idx on public.pharmacy_sale_payments (tenant_id);
create index pharmacy_sale_payments_sale_idx on public.pharmacy_sale_payments (sale_id);

create trigger pharmacy_sale_payments_stamp_actor
  before insert on public.pharmacy_sale_payments
  for each row execute function public.pharmacy_stamp_actor();

create trigger pharmacy_sale_payments_same_tenant
  before insert or update on public.pharmacy_sale_payments
  for each row execute function public.pharmacy_same_tenant(
    'pharmacy_sales', 'sale_id', 'pharmacy_cash_shifts', 'shift_id');

create table public.pharmacy_sale_returns (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  sale_id         uuid not null references public.pharmacy_sales (id) on delete cascade,

  returned_at     timestamptz not null default now(),
  -- What the returned goods were sold for, with their share of discount and VAT.
  refund_amount   numeric(14,2) not null default 0,
  -- What was actually handed back. Less than refund_amount when the sale was
  -- on account and not yet paid: then the return only shrinks the bill.
  paid_back       numeric(14,2) not null default 0,
  refund_method   text not null
                    constraint pharmacy_sale_returns_method_check check (refund_method in ('cash', 'original')),
  reason          text not null,
  notes           text,
  -- False when what came back cannot be sold again.
  restocked       boolean not null default true,
  shift_id        uuid references public.pharmacy_cash_shifts (id) on delete set null,

  created_by      uuid references public.profiles (id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now()
);

create index pharmacy_sale_returns_tenant_idx on public.pharmacy_sale_returns (tenant_id, returned_at desc);
create index pharmacy_sale_returns_sale_idx on public.pharmacy_sale_returns (sale_id);

create trigger pharmacy_sale_returns_stamp_actor
  before insert on public.pharmacy_sale_returns
  for each row execute function public.pharmacy_stamp_actor();

create trigger pharmacy_sale_returns_same_tenant
  before insert or update on public.pharmacy_sale_returns
  for each row execute function public.pharmacy_same_tenant(
    'pharmacy_sales', 'sale_id', 'pharmacy_cash_shifts', 'shift_id');

create table public.pharmacy_sale_return_items (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  return_id    uuid not null references public.pharmacy_sale_returns (id) on delete cascade,
  sale_item_id uuid not null references public.pharmacy_sale_items (id) on delete cascade,

  item_name    text not null,
  quantity     integer not null
                 constraint pharmacy_sale_return_items_quantity_check check (quantity > 0),
  unit_price   numeric(12,2) not null default 0,

  created_at   timestamptz not null default now()
);

create index pharmacy_sale_return_items_tenant_idx on public.pharmacy_sale_return_items (tenant_id);
create index pharmacy_sale_return_items_return_idx on public.pharmacy_sale_return_items (return_id);

create trigger pharmacy_sale_return_items_same_tenant
  before insert or update on public.pharmacy_sale_return_items
  for each row execute function public.pharmacy_same_tenant(
    'pharmacy_sale_returns', 'return_id', 'pharmacy_sale_items', 'sale_item_id');

-- ---------------------------------------------------- cash transactions ---
create table public.pharmacy_cash_transactions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  shift_id        uuid not null references public.pharmacy_cash_shifts (id) on delete cascade,

  type            text not null
                    constraint pharmacy_cash_transactions_type_check
                    check (type in ('cash_in', 'cash_out', 'expense', 'sale', 'refund', 'payment')),
  -- Signed: money in is positive, money out is negative.
  amount          numeric(14,2) not null
                    constraint pharmacy_cash_transactions_amount_check check (amount <> 0),
  note            text,

  sale_id         uuid references public.pharmacy_sales (id) on delete set null,
  expense_id      uuid references public.pharmacy_expenses (id) on delete set null,

  created_by      uuid references public.profiles (id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now()
);

create index pharmacy_cash_transactions_tenant_idx on public.pharmacy_cash_transactions (tenant_id);
create index pharmacy_cash_transactions_shift_idx on public.pharmacy_cash_transactions (shift_id, created_at desc);

create trigger pharmacy_cash_transactions_stamp_actor
  before insert on public.pharmacy_cash_transactions
  for each row execute function public.pharmacy_stamp_actor();

create trigger pharmacy_cash_transactions_same_tenant
  before insert or update on public.pharmacy_cash_transactions
  for each row execute function public.pharmacy_same_tenant(
    'pharmacy_cash_shifts', 'shift_id', 'pharmacy_sales', 'sale_id', 'pharmacy_expenses', 'expense_id');

-- ------------------------------------------------------------- settings ---
-- One row per hospital. Currency, date format and timezone are not here:
-- those are the platform's and each person's own (useFormatters).
create table public.pharmacy_settings (
  tenant_id          uuid primary key references public.tenants (id) on delete cascade,

  -- What the receipt is headed with. Blank falls back to the hospital's name.
  pharmacy_name      text,
  phone              text,
  email              text,
  address            text,
  license_no         text,

  tax_label          text not null default 'VAT',
  tax_rate           numeric(5,2) not null default 0
                       constraint pharmacy_settings_tax_rate_check check (tax_rate >= 0 and tax_rate <= 100),

  invoice_prefix     text not null default 'INV'
                       constraint pharmacy_settings_invoice_prefix_check check (invoice_prefix ~ '^[A-Za-z0-9]{1,10}$'),
  po_prefix          text not null default 'PO'
                       constraint pharmacy_settings_po_prefix_check check (po_prefix ~ '^[A-Za-z0-9]{1,10}$'),

  receipt_footer     text,
  return_policy      text,

  -- How many days before its date a batch starts showing as expiring soon.
  expiring_soon_days integer not null default 90
                       constraint pharmacy_settings_expiring_check check (expiring_soon_days between 1 and 730),

  expense_categories text[] not null default
    array['Rent', 'Utilities', 'Salaries', 'Supplies', 'Maintenance', 'Transport', 'Marketing', 'Other'],

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger pharmacy_settings_set_updated_at
  before update on public.pharmacy_settings
  for each row execute function public.set_updated_at();

-- The number the next invoice and the next order will take. Apart from the
-- settings because it moves on every sale, and a settings row that changed
-- three hundred times a day would fill the audit log with nothing.
create table public.pharmacy_counters (
  tenant_id       uuid primary key references public.tenants (id) on delete cascade,
  next_invoice_no bigint not null default 1,
  next_po_no      bigint not null default 1
);

-- ------------------------------------------------------ customer totals ---
-- The customers page wants three things per customer that live on sales:
-- how many orders, what is still owed, and when they last came. A view with
-- sub-selects in its list stays writable for the customer's own columns, so
-- the page can read and save through one name.
--
-- security_invoker: the caller's RLS applies to both tables underneath.
create view public.pharmacy_customers_overview
with (security_invoker = true)
as
select
  c.*,
  (select count(*) from public.pharmacy_sales s where s.customer_id = c.id)::integer as orders_count,
  (select coalesce(sum(greatest(s.total_amount - s.refunded_amount - s.paid_amount, 0)), 0)
     from public.pharmacy_sales s where s.customer_id = c.id)::numeric(14,2) as balance_due,
  (select max(s.sold_at) from public.pharmacy_sales s where s.customer_id = c.id) as last_visit
from public.pharmacy_customers c;

-- --------------------------------------------------- RLS, gates, audit ---
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'pharmacy_suppliers', 'pharmacy_batches', 'pharmacy_stock_movements',
    'pharmacy_purchase_orders', 'pharmacy_purchase_order_items',
    'pharmacy_customers', 'pharmacy_cash_shifts', 'pharmacy_expenses',
    'pharmacy_sales', 'pharmacy_sale_items', 'pharmacy_sale_payments',
    'pharmacy_sale_returns', 'pharmacy_sale_return_items',
    'pharmacy_cash_transactions', 'pharmacy_settings', 'pharmacy_counters'
  ] loop
    perform public.apply_tenant_rls(('public.' || v_table)::regclass);
    perform public.apply_role_gate(
      ('public.' || v_table)::regclass,
      '{hospital_admin,pharmacy_admin,finance_admin}',
      '{hospital_admin,pharmacy_admin}');
  end loop;

  -- The records a person would be asked about later. Their lines are left
  -- out on purpose: a sale of five things is one event, and six rows in
  -- /super/logs for it would bury the ones that matter.
  foreach v_table in array array[
    'pharmacy_suppliers', 'pharmacy_purchase_orders', 'pharmacy_customers',
    'pharmacy_cash_shifts', 'pharmacy_expenses', 'pharmacy_sales',
    'pharmacy_sale_payments', 'pharmacy_sale_returns', 'pharmacy_settings'
  ] loop
    perform public.attach_audit(('public.' || v_table)::regclass);
  end loop;
end;
$$;

-- Three tables are audited by hand rather than with attach_audit, because
-- one sale touches each of them and is already one line in the log:
--
--   pharmacy_batches            a sale changes a quantity, and that is on the
--                               stock ledger with who and why. The log hears
--                               about a batch appearing, vanishing, or having
--                               its expiry date, number, cost or shelf edited
--                               — an edited expiry date is exactly the thing
--                               somebody will ask about.
--   pharmacy_items              the same sale moves the product's stock and
--                               status. The log hears about everything else.
--   pharmacy_cash_transactions  a cash sale writes its own drawer line. The
--                               log hears about money put in or taken out by
--                               hand, and about any line changed or removed.
create trigger audit_log
  after insert or delete on public.pharmacy_batches
  for each row execute function public.audit_row('names');

create trigger audit_log_details
  after update on public.pharmacy_batches
  for each row
  when (
    old.expiry_date is distinct from new.expiry_date
    or old.batch_number is distinct from new.batch_number
    or old.unit_cost is distinct from new.unit_cost
    or old.location is distinct from new.location
    or old.supplier_id is distinct from new.supplier_id
  )
  execute function public.audit_row('names');

drop trigger if exists audit_log on public.pharmacy_items;

create trigger audit_log
  after insert or delete on public.pharmacy_items
  for each row execute function public.audit_row('names');

create trigger audit_log_details
  after update on public.pharmacy_items
  for each row
  when (
    old.sku is distinct from new.sku
    or old.name is distinct from new.name
    or old.generic_name is distinct from new.generic_name
    or old.description is distinct from new.description
    or old.category is distinct from new.category
    or old.manufacturer is distinct from new.manufacturer
    or old.selling_price is distinct from new.selling_price
    or old.cost_price is distinct from new.cost_price
    or old.reorder is distinct from new.reorder
    or old.requires_prescription is distinct from new.requires_prescription
    or old.track_expiry is distinct from new.track_expiry
    or old.is_active is distinct from new.is_active
  )
  execute function public.audit_row('names');

create trigger audit_log
  after insert on public.pharmacy_cash_transactions
  for each row
  when (new.type in ('cash_in', 'cash_out', 'expense'))
  execute function public.audit_row('names');

create trigger audit_log_changes
  after update or delete on public.pharmacy_cash_transactions
  for each row execute function public.audit_row('names');

-- The ledger is written by pharmacy_batches_sync and by nothing else.
revoke insert, update, delete on public.pharmacy_stock_movements from authenticated, anon;

-- ------------------------------------------------------- the role's pages ---
-- 0009 pointed pharmacy_admin at four admin pages. It has its own panel now.
update public.roles
   set pages = array[
         '/pharmacy/dashboard', '/pharmacy/pos', '/pharmacy/sales', '/pharmacy/cash-drawer',
         '/pharmacy/products', '/pharmacy/stock', '/pharmacy/stock-alerts',
         '/pharmacy/purchases', '/pharmacy/suppliers', '/pharmacy/expenses',
         '/pharmacy/reports', '/pharmacy/customers', '/pharmacy/insights',
         '/pharmacy/settings'
       ],
       description = 'Runs the hospital pharmacy from its own panel: sales, stock, purchases and cash.'
 where role = 'pharmacy_admin' and tenant_id is null;
