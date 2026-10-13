-- 0131_pharmacy_loyalty_staff_branches.sql
-- The second half of the pharmacy panel. 0126 gave it stock, sales and a cash
-- drawer; this is what a counter with more than one person behind it needs:
--
--   packs            a tablet is stocked one by one and sold by the piece, the
--                    strip or the box
--   loyalty          points earned on a sale, spent on a later one, and a
--                    tier that follows from what a customer has earned
--   store credit     a refund kept on the customer's account, not handed back
--   branches         the pharmacy's counters, and the registers at each
--   staff            what each login is (manager, pharmacist, cashier, stock
--                    keeper), what it may do, and a PIN to approve with
--   returns          a number of their own, a condition per line, and who
--                    approved them
--
-- The functions that use all this are 0132.
--
-- Stock stays one pool per hospital. A branch says where a sale was made and
-- whose drawer it went into; it does not have shelves of its own yet.

-- ------------------------------------------------------------- branches ---
create table public.pharmacy_branches (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants (id) on delete cascade,

  name                 text not null
                         constraint pharmacy_branches_name_check check (length(btrim(name)) > 0),
  code                 text not null
                         constraint pharmacy_branches_code_check check (length(btrim(code)) > 0),
  is_main              boolean not null default false,
  status               text not null default 'active'
                         constraint pharmacy_branches_status_check check (status in ('active', 'maintenance', 'inactive')),

  address              text,
  phone                text,
  email                text,
  license_no           text,
  vat_no               text,
  pharmacist_in_charge text,
  opening_hours        text,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index pharmacy_branches_tenant_id_idx on public.pharmacy_branches (tenant_id);
create unique index pharmacy_branches_code_key on public.pharmacy_branches (tenant_id, lower(btrim(code)));
-- One main branch per hospital.
create unique index pharmacy_branches_one_main on public.pharmacy_branches (tenant_id) where is_main;

create trigger pharmacy_branches_set_updated_at
  before update on public.pharmacy_branches
  for each row execute function public.set_updated_at();

create table public.pharmacy_registers (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  branch_id  uuid not null references public.pharmacy_branches (id) on delete cascade,

  name       text not null
               constraint pharmacy_registers_name_check check (length(btrim(name)) > 0),
  code       text not null
               constraint pharmacy_registers_code_check check (length(btrim(code)) > 0),
  is_active  boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pharmacy_registers_tenant_id_idx on public.pharmacy_registers (tenant_id);
create index pharmacy_registers_branch_id_idx on public.pharmacy_registers (branch_id);
create unique index pharmacy_registers_code_key on public.pharmacy_registers (branch_id, lower(btrim(code)));

create trigger pharmacy_registers_set_updated_at
  before update on public.pharmacy_registers
  for each row execute function public.set_updated_at();

create trigger pharmacy_registers_same_tenant
  before insert or update on public.pharmacy_registers
  for each row execute function public.pharmacy_same_tenant('pharmacy_branches', 'branch_id');

-- ---------------------------------------------------------------- staff ---
-- One row per pharmacy login. Written only by pharmacy_save_staff (0132),
-- which is why nobody signed in is granted insert, update or delete below.
create table public.pharmacy_staff (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,
  profile_id          uuid not null references public.profiles (id) on delete cascade,

  staff_role          text not null default 'cashier'
                        constraint pharmacy_staff_role_check
                        check (staff_role in ('manager', 'pharmacist', 'cashier', 'stock_keeper')),
  branch_id           uuid references public.pharmacy_branches (id) on delete set null,

  -- Take money off a bill by hand. Spending loyalty points is not this.
  can_discount        boolean not null default false,
  -- Take goods back without a manager's PIN, and lend their PIN to others.
  can_approve_returns boolean not null default false,
  -- Put cash in or take it out of a drawer, and enter expenses.
  can_manage_cash     boolean not null default false,
  -- Products, suppliers, purchase orders, adding and writing off stock.
  can_manage_stock    boolean not null default false,
  -- Shown the reports, insights and expenses screens. See the note above.
  can_see_reports     boolean not null default false,
  -- Staff, branches, settings, loyalty rules, the audit trail.
  can_administer      boolean not null default false,

  -- Whether a PIN is set. The PIN itself is in pharmacy_staff_pins.
  has_pin             boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint pharmacy_staff_profile_key unique (profile_id)
);

create index pharmacy_staff_tenant_id_idx on public.pharmacy_staff (tenant_id);

create trigger pharmacy_staff_set_updated_at
  before update on public.pharmacy_staff
  for each row execute function public.set_updated_at();

-- The PIN, hashed, and how many wrong guesses its owner has just made at
-- somebody else's. No policy at all: nothing signed in can read or write
-- this table, only the two definer functions in 0132.
create table public.pharmacy_staff_pins (
  profile_id   uuid primary key references public.profiles (id) on delete cascade,
  pin_hash     text,
  failed       integer not null default 0,
  locked_until timestamptz
);

alter table public.pharmacy_staff_pins enable row level security;
revoke all on public.pharmacy_staff_pins from authenticated, anon;

-- ----------------------------------------------------- who may do what ---
-- One question, asked from policies, triggers and functions alike.
--
-- A pharmacy login carries the pharmacy_admin role whatever it is; what kind
-- of pharmacy login it is lives in pharmacy_staff (below). The hospital's own
-- admin may do all of it. A pharmacy login with no staff row may sell and
-- nothing more: least privilege is the right answer to "we do not know".
--
-- SECURITY DEFINER because it is called from pharmacy_staff's own policies,
-- and a policy that reads its own table through RLS never returns. It reads
-- one row: the caller's.
--
-- 'see_reports' is the odd one out. A cashier has to read sales to print a
-- receipt, so the figures are not a secret from them; that permission decides
-- which screens a login is shown, and is not a wall around the data.
create or replace function public.pharmacy_can(p_perm text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_ok   boolean;
begin
  -- No signed-in user at all: the service key, a migration, a cascade from a
  -- deleted hospital. Those are not the pharmacy's to refuse.
  if coalesce((select auth.role()), 'service_role') = 'service_role' then
    return true;
  end if;

  if public.is_super_admin() then
    return true;
  end if;

  v_role := public.auth_role();

  if v_role = 'hospital_admin' then
    return true;
  end if;

  if v_role = 'finance_admin' then
    return p_perm = 'see_reports';
  end if;

  if v_role is distinct from 'pharmacy_admin' then
    return false;
  end if;

  select case p_perm
           when 'discount'        then s.can_discount
           when 'approve_returns' then s.can_approve_returns
           when 'manage_cash'     then s.can_manage_cash
           when 'manage_stock'    then s.can_manage_stock
           when 'see_reports'     then s.can_see_reports
           when 'administer'      then s.can_administer
           else false
         end
    into v_ok
    from public.pharmacy_staff s
   where s.profile_id = (select auth.uid())
     and s.tenant_id = public.auth_tenant_id();

  return coalesce(v_ok, false);
end;
$$;

revoke execute on function public.pharmacy_can(text) from public, anon;
grant execute on function public.pharmacy_can(text) to authenticated;

-- ---------------------------------------------------------------- packs ---
-- Stock, cost and selling_price are all per single unit: one tablet, one
-- bottle. A product that also sells by the strip or the box says how many
-- units each holds, and may give them a price of their own; without one a
-- strip costs its tablets added up.
alter table public.pharmacy_items
  add column strip_size  integer
    constraint pharmacy_items_strip_size_check check (strip_size is null or strip_size > 1),
  add column box_size    integer
    constraint pharmacy_items_box_size_check check (box_size is null or box_size > 1),
  add column strip_price numeric(12,2)
    constraint pharmacy_items_strip_price_check check (strip_price is null or strip_price >= 0),
  add column box_price   numeric(12,2)
    constraint pharmacy_items_box_price_check check (box_price is null or box_price >= 0);

drop trigger if exists audit_log_details on public.pharmacy_items;

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
    or old.strip_size is distinct from new.strip_size
    or old.box_size is distinct from new.box_size
    or old.strip_price is distinct from new.strip_price
    or old.box_price is distinct from new.box_price
  )
  execute function public.audit_row('names');

-- A sale line still counts single units, so a return and the stock ledger
-- need no arithmetic. It remembers what it was sold as, and its unit price
-- carries enough decimals that a box of 30 for 100.00 still adds up to 100.00.
alter table public.pharmacy_sale_items drop column line_total;

alter table public.pharmacy_sale_items
  alter column unit_price type numeric(16,6),
  add column sold_unit text not null default 'unit'
    constraint pharmacy_sale_items_sold_unit_check check (sold_unit in ('unit', 'strip', 'box')),
  add column pack_size integer not null default 1
    constraint pharmacy_sale_items_pack_size_check check (pack_size >= 1),
  add column line_total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored;

alter table public.pharmacy_sale_return_items
  alter column unit_price type numeric(16,6),
  -- What state it came back in. Only 'restock' goes back on the shelf.
  add column condition text not null default 'restock'
    constraint pharmacy_sale_return_items_condition_check check (condition in ('restock', 'damaged', 'expired'));

-- A direct edit to a batch — its expiry date, its number, or its quantity
-- typed over — is stock work. A sale changes a quantity too, and says so
-- first (pharmacy.movement_kind), which is how the two are told apart.
create or replace function public.pharmacy_batches_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(current_setting('pharmacy.movement_kind', true), '') = ''
     and not public.pharmacy_can('manage_stock') then
    raise exception 'You do not have permission to change stock.'
      using errcode = 'PH403', hint = 'no_permission';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger pharmacy_batches_guard
  before insert or update or delete on public.pharmacy_batches
  for each row execute function public.pharmacy_batches_guard();

-- ------------------------------------------------------------- settings ---
alter table public.pharmacy_settings
  add column tax_id                  text,
  add column payment_terms           text,

  add column loyalty_enabled         boolean not null default false,
  -- Spend this much, earn one point.
  add column loyalty_spend_per_point numeric(12,2) not null default 100
    constraint pharmacy_settings_loyalty_spend_check check (loyalty_spend_per_point > 0),
  -- What one point is worth when it is spent.
  add column loyalty_point_value     numeric(12,2) not null default 1
    constraint pharmacy_settings_loyalty_value_check check (loyalty_point_value >= 0),
  add column loyalty_min_redeem      integer not null default 50
    constraint pharmacy_settings_loyalty_min_check check (loyalty_min_redeem >= 1),
  -- Points earned in all, at which a customer moves up. Bronze is everyone else.
  add column loyalty_silver_at       integer not null default 500,
  add column loyalty_gold_at         integer not null default 2000,
  add column loyalty_platinum_at     integer not null default 5000,
  -- How much faster each tier earns. Bronze earns at 1.
  add column loyalty_silver_rate     numeric(4,2) not null default 1.25,
  add column loyalty_gold_rate       numeric(4,2) not null default 1.5,
  add column loyalty_platinum_rate   numeric(4,2) not null default 2,

  add constraint pharmacy_settings_loyalty_tiers_check
    check (loyalty_silver_at > 0 and loyalty_gold_at > loyalty_silver_at and loyalty_platinum_at > loyalty_gold_at),
  add constraint pharmacy_settings_loyalty_rates_check
    check (loyalty_silver_rate between 1 and 10 and loyalty_gold_rate between 1 and 10 and loyalty_platinum_rate between 1 and 10);

alter table public.pharmacy_counters
  add column next_return_no bigint not null default 1;

-- ------------------------------------------------------------ customers ---
alter table public.pharmacy_customers
  add column points          integer not null default 0
    constraint pharmacy_customers_points_check check (points >= 0),
  -- Everything ever earned. The tier follows from this, so spending points
  -- does not cost a customer their standing.
  add column lifetime_points integer not null default 0
    constraint pharmacy_customers_lifetime_check check (lifetime_points >= 0),
  add column redeemed_points integer not null default 0
    constraint pharmacy_customers_redeemed_check check (redeemed_points >= 0),
  add column store_credit    numeric(14,2) not null default 0
    constraint pharmacy_customers_store_credit_check check (store_credit >= 0),
  add column allergies       text,
  add column is_active       boolean not null default true;

-- Every change to a customer's points or store credit, and why. Append-only,
-- written by the trigger below and by nothing else.
create table public.pharmacy_customer_ledger (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  customer_id     uuid not null references public.pharmacy_customers (id) on delete cascade,

  kind            text not null
                    constraint pharmacy_customer_ledger_kind_check
                    check (kind in ('earned', 'redeemed', 'bonus', 'adjusted', 'reversed', 'restored',
                                    'credit_added', 'credit_used')),
  -- Signed. One of the two is zero.
  points          integer not null default 0,
  amount          numeric(14,2) not null default 0,
  points_after    integer not null default 0,
  credit_after    numeric(14,2) not null default 0,

  sale_id         uuid references public.pharmacy_sales (id) on delete set null,
  reference       text,
  reason          text,

  created_by      uuid references public.profiles (id) on delete set null,
  created_by_name text,
  created_at      timestamptz not null default now()
);

create index pharmacy_customer_ledger_tenant_idx on public.pharmacy_customer_ledger (tenant_id, created_at desc);
create index pharmacy_customer_ledger_customer_idx on public.pharmacy_customer_ledger (customer_id, created_at desc);

-- Points and credit are not typed in. A new customer starts at nothing, and
-- the numbers move only inside a pharmacy function that has said so.
-- coalesce on the flag, for the reason given in pharmacy_items_guard (0126).
create or replace function public.pharmacy_customers_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.points := 0;
    new.lifetime_points := 0;
    new.redeemed_points := 0;
    new.store_credit := 0;
  elsif coalesce(current_setting('pharmacy.ledger_kind', true), '') = '' then
    new.points := old.points;
    new.lifetime_points := old.lifetime_points;
    new.redeemed_points := old.redeemed_points;
    new.store_credit := old.store_credit;
  end if;

  return new;
end;
$$;

create trigger pharmacy_customers_guard
  before insert or update on public.pharmacy_customers
  for each row execute function public.pharmacy_customers_guard();

-- SECURITY DEFINER for the same reason as pharmacy_batches_sync: nobody
-- signed in may write the ledger. It writes for the customer's own hospital.
create or replace function public.pharmacy_customers_ledger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind   text := nullif(current_setting('pharmacy.ledger_kind', true), '');
  v_ref    text := nullif(current_setting('pharmacy.ledger_ref', true), '');
  v_reason text := nullif(current_setting('pharmacy.ledger_reason', true), '');
  v_sale   uuid := nullif(current_setting('pharmacy.ledger_sale', true), '')::uuid;
  v_user   uuid := (select auth.uid());
  v_name   text := (select p.full_name from public.profiles p where p.id = v_user);
begin
  if new.points <> old.points then
    insert into public.pharmacy_customer_ledger (
      tenant_id, customer_id, kind, points, points_after, credit_after,
      sale_id, reference, reason, created_by, created_by_name
    )
    values (
      new.tenant_id, new.id,
      case when v_kind in ('earned', 'redeemed', 'bonus', 'adjusted', 'reversed', 'restored') then v_kind else 'adjusted' end,
      new.points - old.points, new.points, new.store_credit,
      v_sale, v_ref, v_reason, v_user, v_name
    );
  end if;

  if new.store_credit <> old.store_credit then
    insert into public.pharmacy_customer_ledger (
      tenant_id, customer_id, kind, amount, points_after, credit_after,
      sale_id, reference, reason, created_by, created_by_name
    )
    values (
      new.tenant_id, new.id,
      case when new.store_credit > old.store_credit then 'credit_added' else 'credit_used' end,
      new.store_credit - old.store_credit, new.points, new.store_credit,
      v_sale, v_ref, v_reason, v_user, v_name
    );
  end if;

  return null;
end;
$$;

revoke all on function public.pharmacy_customers_ledger() from public, anon, authenticated;

create trigger pharmacy_customers_ledger
  after update on public.pharmacy_customers
  for each row
  when (old.points is distinct from new.points or old.store_credit is distinct from new.store_credit)
  execute function public.pharmacy_customers_ledger();

-- A sale moves its customer's points, and is already a line in the log. The
-- log hears about a customer being added, removed, or edited by a person.
drop trigger if exists audit_log on public.pharmacy_customers;

create trigger audit_log
  after insert or delete on public.pharmacy_customers
  for each row execute function public.audit_row('names');

create trigger audit_log_details
  after update on public.pharmacy_customers
  for each row
  when (
    old.name is distinct from new.name
    or old.phone is distinct from new.phone
    or old.email is distinct from new.email
    or old.address is distinct from new.address
    or old.notes is distinct from new.notes
    or old.allergies is distinct from new.allergies
    or old.is_active is distinct from new.is_active
    or old.patient_id is distinct from new.patient_id
  )
  execute function public.audit_row('names');

-- Bronze, silver, gold or platinum, from what a customer has earned in all
-- and where their hospital has drawn the lines.
create or replace function public.pharmacy_tier(p_tenant uuid, p_lifetime integer)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case
           when p_lifetime >= coalesce(s.loyalty_platinum_at, 5000) then 'platinum'
           when p_lifetime >= coalesce(s.loyalty_gold_at, 2000) then 'gold'
           when p_lifetime >= coalesce(s.loyalty_silver_at, 500) then 'silver'
           else 'bronze'
         end
    from (select 1) one
    left join public.pharmacy_settings s on s.tenant_id = p_tenant
$$;

-- The view lists the customer's columns by name at the moment it is made, so
-- it is made again now that there are more of them.
drop view public.pharmacy_customers_overview;

create view public.pharmacy_customers_overview
with (security_invoker = true)
as
select
  c.*,
  public.pharmacy_tier(c.tenant_id, c.lifetime_points) as tier,
  (select count(*) from public.pharmacy_sales s where s.customer_id = c.id)::integer as orders_count,
  (select coalesce(sum(s.total_amount - s.refunded_amount), 0)
     from public.pharmacy_sales s where s.customer_id = c.id)::numeric(14,2) as total_spent,
  (select coalesce(sum(greatest(s.total_amount - s.refunded_amount - s.paid_amount, 0)), 0)
     from public.pharmacy_sales s where s.customer_id = c.id)::numeric(14,2) as balance_due,
  (select max(s.sold_at) from public.pharmacy_sales s where s.customer_id = c.id) as last_visit
from public.pharmacy_customers c;

-- ------------------------------------------------------- sales, returns ---
alter table public.pharmacy_sales
  drop constraint pharmacy_sales_payment_method_check,
  add constraint pharmacy_sales_payment_method_check
    check (payment_method in ('cash', 'card', 'mobile', 'credit', 'other', 'split', 'store_credit')),
  -- A split sale's parts: [{ "method": "cash", "amount": 300, "reference": null }, ...]
  add column payment_parts   jsonb,
  -- `discount` is everything taken off. This is the part that was points.
  add column points_discount numeric(14,2) not null default 0,
  add column points_redeemed integer not null default 0,
  add column points_earned   integer not null default 0,
  add column branch_id       uuid references public.pharmacy_branches (id) on delete set null;

create index pharmacy_sales_branch_idx on public.pharmacy_sales (branch_id);

create trigger pharmacy_sales_same_tenant_branch
  before insert or update on public.pharmacy_sales
  for each row execute function public.pharmacy_same_tenant('pharmacy_branches', 'branch_id');

alter table public.pharmacy_sale_returns
  drop constraint pharmacy_sale_returns_method_check,
  add constraint pharmacy_sale_returns_method_check check (refund_method in ('cash', 'original', 'credit')),
  add column return_number    text,
  -- Whoever said yes: the person at the till if they may, or the manager
  -- whose PIN was typed.
  add column approved_by      uuid references public.profiles (id) on delete set null,
  add column approved_by_name text,
  add column points_reversed  integer not null default 0,
  add column points_restored  integer not null default 0;

create unique index pharmacy_sale_returns_number_key
  on public.pharmacy_sale_returns (tenant_id, return_number) where return_number is not null;

alter table public.pharmacy_cash_shifts
  add column branch_id   uuid references public.pharmacy_branches (id) on delete set null,
  add column register_id uuid references public.pharmacy_registers (id) on delete set null;

-- One open drawer per register, as there is one per person.
create unique index pharmacy_cash_shifts_one_open_register
  on public.pharmacy_cash_shifts (register_id) where status = 'open' and register_id is not null;

create trigger pharmacy_cash_shifts_same_tenant_branch
  before insert or update on public.pharmacy_cash_shifts
  for each row execute function public.pharmacy_same_tenant(
    'pharmacy_branches', 'branch_id', 'pharmacy_registers', 'register_id');

-- --------------------------------------------------- RLS, gates, audit ---
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'pharmacy_branches', 'pharmacy_registers', 'pharmacy_staff', 'pharmacy_customer_ledger'
  ] loop
    perform public.apply_tenant_rls(('public.' || v_table)::regclass);
    perform public.apply_role_gate(
      ('public.' || v_table)::regclass,
      '{hospital_admin,pharmacy_admin,finance_admin}',
      '{hospital_admin,pharmacy_admin}');
  end loop;

  foreach v_table in array array['pharmacy_branches', 'pharmacy_registers', 'pharmacy_staff'] loop
    perform public.attach_audit(('public.' || v_table)::regclass);
  end loop;
end;
$$;

revoke insert, update, delete on public.pharmacy_customer_ledger from authenticated, anon;
revoke insert, update, delete on public.pharmacy_staff from authenticated, anon;

-- The role gate (0130) says "pharmacy staff may write". These say which
-- pharmacy staff. Restrictive, so they only ever take away.
do $$
declare
  v_pair  text[];
  v_table text;
  v_perm  text;
begin
  foreach v_pair slice 1 in array array[
    array['pharmacy_items', 'manage_stock'],
    array['pharmacy_suppliers', 'manage_stock'],
    array['pharmacy_purchase_orders', 'manage_stock'],
    array['pharmacy_purchase_order_items', 'manage_stock'],
    array['pharmacy_expenses', 'manage_cash'],
    array['pharmacy_settings', 'administer'],
    array['pharmacy_branches', 'administer'],
    array['pharmacy_registers', 'administer']
  ] loop
    v_table := v_pair[1];
    v_perm  := v_pair[2];

    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated with check (public.pharmacy_can(%L))',
      v_table || '_perm_insert', v_table, v_perm);
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated using (public.pharmacy_can(%L)) with check (public.pharmacy_can(%L))',
      v_table || '_perm_update', v_table, v_perm, v_perm);
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated using (public.pharmacy_can(%L))',
      v_table || '_perm_delete', v_table, v_perm);
  end loop;
end;
$$;

-- ------------------------------------------------------- the role's pages ---
update public.roles
   set pages = pages || array['/pharmacy/staff', '/pharmacy/branches', '/pharmacy/audit']
 where role = 'pharmacy_admin' and tenant_id is null
   and not pages @> array['/pharmacy/staff'];
