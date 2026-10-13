-- 0134_pharmacy_loyalty_staff_operations.sql
-- The functions for 0133: selling by the strip and the box, split payments,
-- loyalty points, store credit, returns that somebody approved, staff and
-- their PINs, and the pharmacy's own view of the audit trail.
--
-- The rules of 0127 still hold. Everything that moves stock or money is one
-- function and so one transaction; refusals a person can fix are PH001 with a
-- key in HINT; and they run as the caller, so RLS applies to every statement.
-- The exceptions are named where they are: the handful that must read or
-- write something no signed-in person is allowed to touch directly.

-- ------------------------------------------------------- who is asking ---
-- As 0127, with one addition: name a permission and a login without it is
-- refused here, before anything is read or written.
drop function public.pharmacy_staff_tenant();

create function public.pharmacy_staff_tenant(p_perm text default null)
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.auth_tenant_id();
  v_role   public.app_role := public.auth_role();
begin
  if v_role is null or v_role not in ('hospital_admin', 'pharmacy_admin') then
    raise exception 'Only pharmacy staff can do this.'
      using errcode = 'PH403', hint = 'not_pharmacy_staff';
  end if;

  if v_tenant is null then
    raise exception 'This login is not attached to a hospital.'
      using errcode = 'PH403', hint = 'no_hospital';
  end if;

  if p_perm is not null and not public.pharmacy_can(p_perm) then
    raise exception 'You do not have permission to do this.'
      using errcode = 'PH403', hint = 'no_permission', detail = p_perm;
  end if;

  return v_tenant;
end;
$$;

-- What the panel asks once when it opens, to decide which screens to show.
create or replace function public.pharmacy_me()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'role', public.auth_role(),
    'staff_role', (select s.staff_role from public.pharmacy_staff s where s.profile_id = (select auth.uid())),
    'branch_id', (select s.branch_id from public.pharmacy_staff s where s.profile_id = (select auth.uid())),
    'has_pin', coalesce((select s.has_pin from public.pharmacy_staff s where s.profile_id = (select auth.uid())), false),
    'can', jsonb_build_object(
      'discount', public.pharmacy_can('discount'),
      'approve_returns', public.pharmacy_can('approve_returns'),
      'manage_cash', public.pharmacy_can('manage_cash'),
      'manage_stock', public.pharmacy_can('manage_stock'),
      'see_reports', public.pharmacy_can('see_reports'),
      'administer', public.pharmacy_can('administer')
    )
  )
$$;

-- Returns get a number of their own (RET-2026-000007). The settings row is no
-- longer made here: a cashier may not write settings (0133), and a hospital
-- without one simply uses the default prefixes.
create or replace function public.pharmacy_next_number(p_tenant uuid, p_kind text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_no     bigint;
  v_prefix text;
begin
  insert into public.pharmacy_counters (tenant_id) values (p_tenant) on conflict (tenant_id) do nothing;

  if p_kind = 'invoice' then
    update public.pharmacy_counters set next_invoice_no = next_invoice_no + 1
     where tenant_id = p_tenant returning next_invoice_no - 1 into v_no;
    v_prefix := coalesce((select s.invoice_prefix from public.pharmacy_settings s where s.tenant_id = p_tenant), 'INV');
  elsif p_kind = 'return' then
    update public.pharmacy_counters set next_return_no = next_return_no + 1
     where tenant_id = p_tenant returning next_return_no - 1 into v_no;
    v_prefix := 'RET';
  else
    update public.pharmacy_counters set next_po_no = next_po_no + 1
     where tenant_id = p_tenant returning next_po_no - 1 into v_no;
    v_prefix := coalesce((select s.po_prefix from public.pharmacy_settings s where s.tenant_id = p_tenant), 'PO');
  end if;

  return upper(v_prefix) || '-' || to_char(public.pharmacy_today(), 'YYYY') || '-' || lpad(v_no::text, 6, '0');
end;
$$;

-- --------------------------------------- permissions on what is already there ---
-- The functions of 0127 keep their bodies. Each one starts by asking
-- pharmacy_staff_tenant() who is calling; these now name what that caller
-- must be allowed to do. Rewritten in place so there is one copy of each.
do $$
declare
  v record;
begin
  for v in
    select p.oid, t.perm
      from (values
        ('pharmacy_create_purchase_order', 'manage_stock'),
        ('pharmacy_receive_purchase_order', 'manage_stock'),
        ('pharmacy_cancel_purchase_order', 'manage_stock'),
        ('pharmacy_pay_purchase_order', 'manage_stock'),
        ('pharmacy_add_stock', 'manage_stock'),
        ('pharmacy_adjust_stock', 'manage_stock'),
        ('pharmacy_cash_move', 'manage_cash'),
        ('pharmacy_remove_cash_transaction', 'manage_cash')
      ) as t(fn, perm)
      join pg_catalog.pg_proc p on p.proname = t.fn
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  loop
    execute replace(
      pg_catalog.pg_get_functiondef(v.oid),
      'public.pharmacy_staff_tenant();',
      format('public.pharmacy_staff_tenant(%L);', v.perm));
  end loop;

  -- Closing or correcting somebody else's drawer was the hospital admin's
  -- alone. A pharmacy manager may now do it too.
  for v in
    select p.oid
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
     where p.proname in ('pharmacy_close_shift', 'pharmacy_remove_cash_transaction')
  loop
    execute replace(replace(
      pg_catalog.pg_get_functiondef(v.oid),
      'public.auth_role() = ''hospital_admin''', 'public.pharmacy_can(''administer'')'),
      'public.auth_role() <> ''hospital_admin''', 'not public.pharmacy_can(''administer'')');
  end loop;
end;
$$;

-- ---------------------------------------------------------- cash drawer ---
-- A drawer may now be opened on a register. It is still one per person; a
-- register adds "and one per till", and says which branch the sales are for.
drop function public.pharmacy_open_shift(numeric);

create function public.pharmacy_open_shift(p_opening_balance numeric, p_register_id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.pharmacy_staff_tenant();
  v_user   uuid := (select auth.uid());
  v_branch uuid;
  v_shift  uuid;
begin
  if p_opening_balance is null or p_opening_balance < 0 then
    raise exception 'Enter what is in the drawer to start with.'
      using errcode = 'PH001', hint = 'bad_amount';
  end if;

  if exists (
    select 1 from public.pharmacy_cash_shifts s
     where s.tenant_id = v_tenant and s.opened_by = v_user and s.status = 'open'
  ) then
    raise exception 'Your cash drawer is already open.'
      using errcode = 'PH001', hint = 'drawer_already_open';
  end if;

  if p_register_id is not null then
    select r.branch_id into v_branch
      from public.pharmacy_registers r
     where r.id = p_register_id and r.is_active;

    if not found then
      raise exception 'That register could not be found.'
        using errcode = 'PH001', hint = 'register_not_found';
    end if;

    if exists (
      select 1 from public.pharmacy_cash_shifts s
       where s.register_id = p_register_id and s.status = 'open'
    ) then
      raise exception 'Somebody else has a drawer open on that register.'
        using errcode = 'PH001', hint = 'register_in_use';
    end if;
  else
    select s.branch_id into v_branch from public.pharmacy_staff s where s.profile_id = v_user;
  end if;

  insert into public.pharmacy_cash_shifts (tenant_id, opened_by, opened_by_name, opening_balance, branch_id, register_id)
  values (v_tenant, v_user, (select p.full_name from public.profiles p where p.id = v_user),
          p_opening_balance, v_branch, p_register_id)
  returning id into v_shift;

  return v_shift;
end;
$$;

-- ----------------------------------------------------------------- sell ---
-- p_items:    [{ "item_id": uuid, "quantity": 2, "unit": "strip" }, ...]
--             quantity counts strips when unit is strip. unit defaults to unit.
-- p_payments: only for a split: [{ "method": "cash", "amount": 300 },
--             { "method": "mobile", "amount": 250, "reference": "TX1" }]
--
-- Prices are still the catalogue's. A strip costs strip_price, or its tablets
-- added up when the product has not been given one.
--
-- Points: spending them is a discount, taken off before VAT like any other.
-- They are earned on what the sale came to, at the customer's tier.
drop function public.pharmacy_create_sale(jsonb, text, numeric, numeric, uuid, text, text, text, text);

create function public.pharmacy_create_sale(
  p_items             jsonb,
  p_payment_method    text,
  p_tendered          numeric default 0,
  p_discount          numeric default 0,
  p_customer_id       uuid default null,
  p_customer_name     text default null,
  p_customer_phone    text default null,
  p_payment_reference text default null,
  p_notes             text default null,
  p_redeem_points     integer default 0,
  p_payments          jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant      uuid := public.pharmacy_staff_tenant();
  v_user        uuid := (select auth.uid());
  v_today       date := public.pharmacy_today();
  v_cfg         public.pharmacy_settings;
  v_cust        public.pharmacy_customers;
  v_line        record;
  v_part        record;
  v_item        public.pharmacy_items;
  v_batch       record;
  v_size        integer;
  v_pack_price  numeric(12,2);
  v_need        integer;
  v_take        integer;
  v_alloc       jsonb := '[]'::jsonb;
  v_parts       jsonb := null;
  v_subtotal    numeric(14,2) := 0;
  v_manual      numeric(14,2);
  v_redeem      integer := greatest(coalesce(p_redeem_points, 0), 0);
  v_points_off  numeric(14,2) := 0;
  v_discount    numeric(14,2);
  v_tax_rate    numeric(5,2);
  v_tax         numeric(14,2);
  v_total       numeric(14,2);
  v_tendered    numeric(14,2) := greatest(coalesce(p_tendered, 0), 0);
  v_paid        numeric(14,2);
  v_change      numeric(14,2) := 0;
  v_cash_part   numeric(14,2) := 0;
  v_credit_part numeric(14,2) := 0;
  v_other_part  numeric(14,2) := 0;
  v_cash_in     numeric(14,2) := 0;
  v_earn        integer := 0;
  v_rate        numeric(4,2) := 1;
  v_shift       uuid;
  v_branch      uuid;
  v_sale        uuid;
  v_invoice     text;
  v_cust_name   text := nullif(btrim(coalesce(p_customer_name, '')), '');
  v_cust_phone  text := nullif(btrim(coalesce(p_customer_phone, '')), '');
begin
  if p_payment_method is null
     or p_payment_method not in ('cash', 'card', 'mobile', 'credit', 'other', 'split', 'store_credit') then
    raise exception 'Pick how the customer is paying.'
      using errcode = 'PH001', hint = 'bad_payment_method';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one product to the order.'
      using errcode = 'PH001', hint = 'empty_cart';
  end if;

  select * into v_cfg from public.pharmacy_settings s where s.tenant_id = v_tenant;

  if p_customer_id is not null then
    -- Locked: this sale may move their points and their credit.
    select * into v_cust from public.pharmacy_customers c where c.id = p_customer_id for update;

    if not found then
      raise exception 'That customer could not be found.'
        using errcode = 'PH001', hint = 'customer_not_found';
    end if;

    v_cust_name  := v_cust.name;
    v_cust_phone := coalesce(v_cust_phone, v_cust.phone);
  end if;

  -- Money owed has to be owed by somebody who can be found again.
  if p_payment_method = 'credit' and p_customer_id is null then
    raise exception 'A sale on account needs a saved customer.'
      using errcode = 'PH001', hint = 'credit_needs_customer';
  end if;

  if p_payment_method = 'split' then
    if p_payments is null or jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) < 2 then
      raise exception 'A split payment needs at least two parts.'
        using errcode = 'PH001', hint = 'split_needs_parts';
    end if;

    for v_part in
      select e ->> 'method' as method,
             sum((e ->> 'amount')::numeric)::numeric(14,2) as amount,
             max(nullif(btrim(coalesce(e ->> 'reference', '')), '')) as reference
        from jsonb_array_elements(p_payments) e
       group by 1
       order by 1
    loop
      if v_part.method is null or v_part.method not in ('cash', 'card', 'mobile', 'other', 'store_credit')
         or v_part.amount is null or v_part.amount <= 0 then
        raise exception 'Every part of a split payment needs a method and an amount.'
          using errcode = 'PH001', hint = 'split_needs_parts';
      end if;

      if v_part.method = 'cash' then
        v_cash_part := v_part.amount;
      elsif v_part.method = 'store_credit' then
        v_credit_part := v_part.amount;
      else
        v_other_part := v_other_part + v_part.amount;
      end if;

      v_parts := coalesce(v_parts, '[]'::jsonb) || jsonb_build_object(
        'method', v_part.method, 'amount', v_part.amount, 'reference', v_part.reference);
    end loop;
  end if;

  if (p_payment_method = 'store_credit' or v_credit_part > 0 or v_redeem > 0) and p_customer_id is null then
    raise exception 'Pick a saved customer first.'
      using errcode = 'PH001', hint = 'customer_required';
  end if;

  select s.id, s.branch_id into v_shift, v_branch
    from public.pharmacy_cash_shifts s
   where s.tenant_id = v_tenant and s.opened_by = v_user and s.status = 'open';

  if v_branch is null then
    select s.branch_id into v_branch from public.pharmacy_staff s where s.profile_id = v_user;
  end if;

  if (p_payment_method = 'cash' or v_cash_part > 0) and v_shift is null then
    raise exception 'Open your cash drawer before taking cash.'
      using errcode = 'PH001', hint = 'drawer_closed';
  end if;

  v_invoice := public.pharmacy_next_number(v_tenant, 'invoice');

  perform set_config('pharmacy.movement_kind', 'sale', true);
  perform set_config('pharmacy.movement_ref', v_invoice, true);

  -- Products in id order, always: two sales that share two products then
  -- lock them in the same order and cannot deadlock each other.
  for v_line in
    select (e ->> 'item_id')::uuid as item_id,
           coalesce(nullif(e ->> 'unit', ''), 'unit') as unit,
           sum((e ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) e
     group by 1, 2
     order by 1, 2
  loop
    if v_line.item_id is null or v_line.quantity is null or v_line.quantity <= 0 then
      raise exception 'Every line needs a product and a quantity above zero.'
        using errcode = 'PH001', hint = 'bad_quantity';
    end if;

    select * into v_item from public.pharmacy_items i where i.id = v_line.item_id;

    if not found or not v_item.is_active then
      raise exception 'One of the products is no longer on sale.'
        using errcode = 'PH001', hint = 'item_not_found';
    end if;

    v_size := case v_line.unit
                when 'unit' then 1
                when 'strip' then v_item.strip_size
                when 'box' then v_item.box_size
              end;

    if v_size is null then
      raise exception '% is not sold that way.', v_item.name
        using errcode = 'PH001', hint = 'bad_unit', detail = v_item.name;
    end if;

    v_pack_price := case v_line.unit
                      when 'strip' then coalesce(v_item.strip_price, v_item.selling_price * v_size)
                      when 'box' then coalesce(v_item.box_price, v_item.selling_price * v_size)
                      else v_item.selling_price
                    end;

    v_need := v_line.quantity * v_size;

    for v_batch in
      select b.id, b.batch_number, b.expiry_date, b.quantity, b.unit_cost
        from public.pharmacy_batches b
       where b.item_id = v_item.id
         and b.quantity > 0
         and (b.expiry_date is null or b.expiry_date >= v_today)
       order by b.expiry_date nulls last, b.received_at, b.id
         for update
    loop
      exit when v_need <= 0;

      v_take := least(v_need, v_batch.quantity);

      update public.pharmacy_batches set quantity = quantity - v_take where id = v_batch.id;

      v_alloc := v_alloc || jsonb_build_object(
        'item_id', v_item.id,
        'batch_id', v_batch.id,
        'item_name', v_item.name,
        'sku', v_item.sku,
        'category', v_item.category,
        'batch_number', v_batch.batch_number,
        'expiry_date', v_batch.expiry_date,
        'quantity', v_take,
        'sold_unit', v_line.unit,
        'pack_size', v_size,
        'unit_price', round(v_pack_price / v_size, 6),
        'unit_cost', case when v_batch.unit_cost > 0 then v_batch.unit_cost else v_item.cost_price end
      );

      v_need := v_need - v_take;
    end loop;

    if v_need > 0 then
      raise exception 'Not enough stock of %.', v_item.name
        using errcode = 'PH001', hint = 'insufficient_stock', detail = v_item.name;
    end if;

    v_subtotal := v_subtotal + v_pack_price * v_line.quantity;
  end loop;

  perform set_config('pharmacy.movement_kind', '', true);
  perform set_config('pharmacy.movement_ref', '', true);

  v_manual := least(greatest(coalesce(p_discount, 0), 0), v_subtotal);

  if v_manual > 0 and not public.pharmacy_can('discount') then
    raise exception 'You do not have permission to give a discount.'
      using errcode = 'PH403', hint = 'no_permission', detail = 'discount';
  end if;

  if v_redeem > 0 then
    if not coalesce(v_cfg.loyalty_enabled, false) then
      raise exception 'Loyalty points are switched off.'
        using errcode = 'PH001', hint = 'loyalty_off';
    end if;

    if v_redeem < coalesce(v_cfg.loyalty_min_redeem, 50) then
      raise exception 'At least % points have to be used at a time.', coalesce(v_cfg.loyalty_min_redeem, 50)
        using errcode = 'PH001', hint = 'redeem_too_few', detail = coalesce(v_cfg.loyalty_min_redeem, 50)::text;
    end if;

    if v_redeem > v_cust.points then
      raise exception 'The customer does not have that many points.'
        using errcode = 'PH001', hint = 'redeem_too_many';
    end if;

    v_points_off := round(v_redeem * coalesce(v_cfg.loyalty_point_value, 1), 2);

    if v_points_off > v_subtotal - v_manual then
      raise exception 'Those points are worth more than the bill.'
        using errcode = 'PH001', hint = 'redeem_over_total';
    end if;
  end if;

  v_tax_rate := coalesce(v_cfg.tax_rate, 0);
  v_discount := v_manual + v_points_off;
  v_tax      := round((v_subtotal - v_discount) * v_tax_rate / 100, 2);
  v_total    := v_subtotal - v_discount + v_tax;

  if p_payment_method = 'cash' then
    if v_tendered < v_total then
      raise exception 'The cash received is less than the total.'
        using errcode = 'PH001', hint = 'cash_short';
    end if;
    v_paid    := v_total;
    v_change  := v_tendered - v_total;
    v_cash_in := v_total;
  elsif p_payment_method = 'credit' then
    v_paid     := 0;
    v_tendered := 0;
  elsif p_payment_method = 'store_credit' then
    v_credit_part := v_total;
    v_paid        := v_total;
    v_tendered    := v_total;
  elsif p_payment_method = 'split' then
    -- Only cash can be handed over in excess; change comes out of the cash.
    if v_other_part + v_credit_part > v_total then
      raise exception 'The parts add up to more than the total.'
        using errcode = 'PH001', hint = 'split_over';
    end if;

    if v_other_part + v_credit_part + v_cash_part < v_total then
      raise exception 'The parts add up to less than the total.'
        using errcode = 'PH001', hint = 'split_short';
    end if;

    v_tendered := v_other_part + v_credit_part + v_cash_part;
    v_change   := v_tendered - v_total;
    v_cash_in  := v_cash_part - v_change;
    v_paid     := v_total;
  else
    v_paid     := v_total;
    v_tendered := v_total;
  end if;

  if v_credit_part > 0 and v_credit_part > v_cust.store_credit then
    raise exception 'The customer does not have that much store credit.'
      using errcode = 'PH001', hint = 'credit_short';
  end if;

  if coalesce(v_cfg.loyalty_enabled, false) and p_customer_id is not null and v_total > 0 then
    v_rate := case public.pharmacy_tier(v_tenant, v_cust.lifetime_points)
                when 'platinum' then v_cfg.loyalty_platinum_rate
                when 'gold' then v_cfg.loyalty_gold_rate
                when 'silver' then v_cfg.loyalty_silver_rate
                else 1
              end;
    v_earn := floor(v_total / v_cfg.loyalty_spend_per_point * v_rate)::integer;
  end if;

  insert into public.pharmacy_sales (
    tenant_id, invoice_number, customer_id, customer_name, customer_phone,
    subtotal, discount, tax_rate, tax, total_amount,
    paid_amount, tendered_amount, change_amount,
    payment_method, payment_reference, payment_status, notes, shift_id,
    payment_parts, points_discount, points_redeemed, points_earned, branch_id
  )
  values (
    v_tenant, v_invoice, p_customer_id, v_cust_name, v_cust_phone,
    v_subtotal, v_discount, v_tax_rate, v_tax, v_total,
    v_paid, v_tendered, v_change,
    p_payment_method, nullif(btrim(coalesce(p_payment_reference, '')), ''),
    case when v_paid >= v_total then 'paid' when v_paid > 0 then 'partial' else 'unpaid' end,
    nullif(btrim(coalesce(p_notes, '')), ''), v_shift,
    v_parts, v_points_off, v_redeem, v_earn, v_branch
  )
  returning id into v_sale;

  insert into public.pharmacy_sale_items (
    tenant_id, sale_id, item_id, batch_id, item_name, sku, category,
    batch_number, expiry_date, quantity, sold_unit, pack_size, unit_price, unit_cost
  )
  select v_tenant, v_sale, a.item_id, a.batch_id, a.item_name, a.sku, a.category,
         a.batch_number, a.expiry_date, a.quantity, a.sold_unit, a.pack_size, a.unit_price, a.unit_cost
    from jsonb_to_recordset(v_alloc) as a(
      item_id uuid, batch_id uuid, item_name text, sku text, category text,
      batch_number text, expiry_date date, quantity integer, sold_unit text, pack_size integer,
      unit_price numeric, unit_cost numeric
    );

  if v_cash_in > 0 then
    insert into public.pharmacy_cash_transactions (tenant_id, shift_id, type, amount, note, sale_id)
    values (v_tenant, v_shift, 'sale', v_cash_in, v_invoice, v_sale);
  end if;

  if p_customer_id is not null and (v_redeem > 0 or v_credit_part > 0 or v_earn > 0) then
    perform set_config('pharmacy.ledger_ref', v_invoice, true);
    perform set_config('pharmacy.ledger_sale', v_sale::text, true);
    perform set_config('pharmacy.ledger_reason', '', true);

    if v_redeem > 0 or v_credit_part > 0 then
      perform set_config('pharmacy.ledger_kind', 'redeemed', true);
      update public.pharmacy_customers
         set points          = points - v_redeem,
             redeemed_points = redeemed_points + v_redeem,
             store_credit    = store_credit - v_credit_part
       where id = p_customer_id;
    end if;

    if v_earn > 0 then
      perform set_config('pharmacy.ledger_kind', 'earned', true);
      update public.pharmacy_customers
         set points          = points + v_earn,
             lifetime_points = lifetime_points + v_earn
       where id = p_customer_id;
    end if;

    perform set_config('pharmacy.ledger_kind', '', true);
    perform set_config('pharmacy.ledger_ref', '', true);
    perform set_config('pharmacy.ledger_sale', '', true);
  end if;

  return v_sale;
end;
$$;

-- ------------------------------------------------------------- the PIN ---
-- Is this the PIN of somebody at this hospital who may approve a return?
--
-- SECURITY DEFINER: the hashes are in a table nobody signed in can read.
-- It answers rather than raises, on purpose. A wrong guess has to be counted,
-- and a raise would roll the count back with everything else: five wrong
-- PINs lock the person guessing out for fifteen minutes, which turns ten
-- thousand possible PINs into three weeks of trying.
create or replace function public.pharmacy_verify_pin(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := (select auth.uid());
  v_tenant uuid := public.auth_tenant_id();
  v_me     public.pharmacy_staff_pins;
  v_hit    record;
begin
  if v_user is null or v_tenant is null
     or public.auth_role() is null or public.auth_role() not in ('hospital_admin', 'pharmacy_admin') then
    return jsonb_build_object('ok', false, 'code', 'not_pharmacy_staff');
  end if;

  insert into public.pharmacy_staff_pins (profile_id) values (v_user) on conflict (profile_id) do nothing;
  select * into v_me from public.pharmacy_staff_pins x where x.profile_id = v_user for update;

  if v_me.locked_until is not null and v_me.locked_until > now() then
    return jsonb_build_object('ok', false, 'code', 'pin_locked');
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok', false, 'code', 'pin_required');
  end if;

  select s.profile_id, p.full_name
    into v_hit
    from public.pharmacy_staff s
    join public.pharmacy_staff_pins x on x.profile_id = s.profile_id
    join public.profiles p on p.id = s.profile_id
   where s.tenant_id = v_tenant
     and s.can_approve_returns
     and p.is_active
     and x.pin_hash is not null
     and x.pin_hash = extensions.crypt(p_pin, x.pin_hash)
   limit 1;

  if not found then
    update public.pharmacy_staff_pins
       set failed       = case when failed + 1 >= 5 then 0 else failed + 1 end,
           locked_until = case when failed + 1 >= 5 then now() + interval '15 minutes' else null end
     where profile_id = v_user;

    return jsonb_build_object('ok', false, 'code', 'bad_pin');
  end if;

  update public.pharmacy_staff_pins set failed = 0, locked_until = null where profile_id = v_user;

  return jsonb_build_object('ok', true, 'profile_id', v_hit.profile_id, 'name', v_hit.full_name);
end;
$$;

-- --------------------------------------------------------------- return ---
-- p_items: [{ "sale_item_id": uuid, "quantity": 1, "condition": "restock" }, ...]
--          condition: restock (back on the shelf), damaged, expired.
--
-- Somebody has to say yes: the person at the till if they may approve
-- returns, otherwise a manager's PIN. A refused PIN is an answer, not an
-- error ({ "ok": false, "code": "bad_pin" }), so that it is counted.
--
-- The refund is still the goods' share of what the sale came to. It can now
-- also be kept as store credit. Points follow the money: what the sale
-- earned is taken back in the same proportion, and points spent on it are
-- given back.
drop function public.pharmacy_return_sale(uuid, jsonb, text, text, boolean, text);

create function public.pharmacy_return_sale(
  p_sale_id       uuid,
  p_items         jsonb,
  p_reason        text,
  p_refund_method text default 'cash',
  p_notes         text default null,
  p_manager_pin   text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant    uuid := public.pharmacy_staff_tenant();
  v_user      uuid := (select auth.uid());
  v_sale      public.pharmacy_sales;
  v_cust      public.pharmacy_customers;
  v_check     jsonb;
  v_approver  uuid;
  v_app_name  text;
  v_line      record;
  v_si        public.pharmacy_sale_items;
  v_lines     jsonb := '[]'::jsonb;
  v_goods     numeric(16,6) := 0;
  v_refund    numeric(14,2);
  v_net       numeric(14,2);
  v_payback   numeric(14,2);
  v_all_back  boolean;
  v_restocked boolean := false;
  v_reverse   integer := 0;
  v_restore   integer := 0;
  v_shift     uuid;
  v_return    uuid;
  v_number    text;
  v_reason    text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if p_refund_method is null or p_refund_method not in ('cash', 'original', 'credit') then
    raise exception 'Pick how the money goes back.'
      using errcode = 'PH001', hint = 'bad_refund_method';
  end if;

  if v_reason is null then
    raise exception 'Say why it is being returned.'
      using errcode = 'PH001', hint = 'reason_required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Pick what is being returned.'
      using errcode = 'PH001', hint = 'nothing_to_return';
  end if;

  -- Before anything is written: a refusal here returns, and what a return
  -- commits is the count of wrong guesses and nothing else.
  if public.pharmacy_can('approve_returns') then
    v_approver := v_user;
    v_app_name := (select p.full_name from public.profiles p where p.id = v_user);
  else
    v_check := public.pharmacy_verify_pin(p_manager_pin);

    if not (v_check ->> 'ok')::boolean then
      return v_check;
    end if;

    v_approver := (v_check ->> 'profile_id')::uuid;
    v_app_name := v_check ->> 'name';
  end if;

  select * into v_sale from public.pharmacy_sales s where s.id = p_sale_id for update;

  if not found then
    raise exception 'That sale could not be found.'
      using errcode = 'PH001', hint = 'sale_not_found';
  end if;

  if v_sale.status = 'returned' then
    raise exception 'Everything on this invoice has already been returned.'
      using errcode = 'PH001', hint = 'already_returned';
  end if;

  if p_refund_method = 'credit' and v_sale.customer_id is null then
    raise exception 'Store credit needs a saved customer on the invoice.'
      using errcode = 'PH001', hint = 'customer_required';
  end if;

  v_number := public.pharmacy_next_number(v_tenant, 'return');

  perform set_config('pharmacy.movement_kind', 'return', true);
  perform set_config('pharmacy.movement_ref', v_sale.invoice_number, true);

  for v_line in
    select (e ->> 'sale_item_id')::uuid as sale_item_id,
           coalesce(nullif(e ->> 'condition', ''), 'restock') as condition,
           sum((e ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) e
     group by 1, 2
     order by 1, 2
  loop
    continue when v_line.quantity is null or v_line.quantity <= 0;

    if v_line.condition not in ('restock', 'damaged', 'expired') then
      raise exception 'Say what state each returned item is in.'
        using errcode = 'PH001', hint = 'bad_condition';
    end if;

    select * into v_si
      from public.pharmacy_sale_items si
     where si.id = v_line.sale_item_id and si.sale_id = v_sale.id
       for update;

    if not found then
      raise exception 'One of those lines is not on this invoice.'
        using errcode = 'PH001', hint = 'line_not_on_sale';
    end if;

    if v_line.quantity > v_si.quantity - v_si.returned_quantity then
      raise exception 'More of % is being returned than was sold.', v_si.item_name
        using errcode = 'PH001', hint = 'return_too_many', detail = v_si.item_name;
    end if;

    update public.pharmacy_sale_items
       set returned_quantity = returned_quantity + v_line.quantity
     where id = v_si.id;

    if v_line.condition = 'restock' then
      v_restocked := true;

      if v_si.batch_id is not null then
        update public.pharmacy_batches set quantity = quantity + v_line.quantity where id = v_si.batch_id;
      else
        -- The batch it came from has been removed since. Back under the same number.
        insert into public.pharmacy_batches as b (tenant_id, item_id, batch_number, quantity, unit_cost, expiry_date)
        values (v_tenant, v_si.item_id, coalesce(v_si.batch_number, 'RETURN'), v_line.quantity, v_si.unit_cost, v_si.expiry_date)
        on conflict (item_id, lower(btrim(batch_number)))
        do update set quantity = b.quantity + excluded.quantity;
      end if;
    end if;

    v_goods := v_goods + v_line.quantity * v_si.unit_price;
    v_lines := v_lines || jsonb_build_object(
      'sale_item_id', v_si.id, 'item_name', v_si.item_name,
      'quantity', v_line.quantity, 'unit_price', v_si.unit_price, 'condition', v_line.condition
    );
  end loop;

  perform set_config('pharmacy.movement_kind', '', true);
  perform set_config('pharmacy.movement_ref', '', true);

  if jsonb_array_length(v_lines) = 0 then
    raise exception 'Pick what is being returned.'
      using errcode = 'PH001', hint = 'nothing_to_return';
  end if;

  v_all_back := not exists (
    select 1 from public.pharmacy_sale_items si
     where si.sale_id = v_sale.id and si.returned_quantity < si.quantity
  );

  -- The last return takes whatever is left of the bill, so pennies lost to
  -- rounding on the earlier ones do not leave a sale worth 0.01.
  if v_all_back then
    v_refund := v_sale.total_amount - v_sale.refunded_amount;
  elsif v_sale.subtotal > 0 then
    v_refund := least(round(v_goods / v_sale.subtotal * v_sale.total_amount, 2),
                      v_sale.total_amount - v_sale.refunded_amount);
  else
    v_refund := 0;
  end if;

  v_net     := v_sale.total_amount - v_sale.refunded_amount - v_refund;
  v_payback := greatest(v_sale.paid_amount - v_net, 0);

  select s.id into v_shift
    from public.pharmacy_cash_shifts s
   where s.tenant_id = v_tenant and s.opened_by = v_user and s.status = 'open';

  if p_refund_method = 'cash' and v_payback > 0 then
    if v_shift is null then
      raise exception 'Open your cash drawer before refunding cash.'
        using errcode = 'PH001', hint = 'drawer_closed';
    end if;

    if v_payback > public.pharmacy_shift_balance(v_shift) then
      raise exception 'There is not enough cash in the drawer for this refund.'
        using errcode = 'PH001', hint = 'drawer_insufficient';
    end if;
  end if;

  -- Points, in the proportion the money went back. The last return settles
  -- whatever is left, as it does for the refund.
  if v_sale.customer_id is not null and (v_sale.points_earned > 0 or v_sale.points_redeemed > 0) then
    select coalesce(sum(r.points_reversed), 0), coalesce(sum(r.points_restored), 0)
      into v_reverse, v_restore
      from public.pharmacy_sale_returns r
     where r.sale_id = v_sale.id;

    if v_all_back or v_sale.total_amount <= 0 then
      v_reverse := v_sale.points_earned - v_reverse;
      v_restore := v_sale.points_redeemed - v_restore;
    else
      v_reverse := least(round(v_sale.points_earned * v_refund / v_sale.total_amount)::integer,
                         v_sale.points_earned - v_reverse);
      v_restore := least(round(v_sale.points_redeemed * v_refund / v_sale.total_amount)::integer,
                         v_sale.points_redeemed - v_restore);
    end if;

    v_reverse := greatest(v_reverse, 0);
    v_restore := greatest(v_restore, 0);
  end if;

  insert into public.pharmacy_sale_returns (
    tenant_id, sale_id, return_number, refund_amount, paid_back, refund_method, reason, notes,
    restocked, shift_id, approved_by, approved_by_name, points_reversed, points_restored
  )
  values (
    v_tenant, v_sale.id, v_number, v_refund, v_payback, p_refund_method, v_reason,
    nullif(btrim(coalesce(p_notes, '')), ''), v_restocked, v_shift,
    v_approver, v_app_name, v_reverse, v_restore
  )
  returning id into v_return;

  insert into public.pharmacy_sale_return_items (tenant_id, return_id, sale_item_id, item_name, quantity, unit_price, condition)
  select v_tenant, v_return, l.sale_item_id, l.item_name, l.quantity, l.unit_price, l.condition
    from jsonb_to_recordset(v_lines) as l(sale_item_id uuid, item_name text, quantity integer, unit_price numeric, condition text);

  update public.pharmacy_sales
     set refunded_amount = refunded_amount + v_refund,
         paid_amount     = paid_amount - v_payback,
         status          = case when v_all_back then 'returned' else 'partial_return' end,
         payment_status  = case
                             when paid_amount - v_payback >= v_net then 'paid'
                             when paid_amount - v_payback > 0 then 'partial'
                             else 'unpaid'
                           end
   where id = v_sale.id;

  if p_refund_method = 'cash' and v_payback > 0 then
    insert into public.pharmacy_cash_transactions (tenant_id, shift_id, type, amount, note, sale_id)
    values (v_tenant, v_shift, 'refund', -v_payback, v_number, v_sale.id);
  end if;

  if v_sale.customer_id is not null
     and (v_reverse > 0 or v_restore > 0 or (p_refund_method = 'credit' and v_payback > 0)) then
    select * into v_cust from public.pharmacy_customers c where c.id = v_sale.customer_id for update;

    if found then
      perform set_config('pharmacy.ledger_ref', v_number, true);
      perform set_config('pharmacy.ledger_sale', v_sale.id::text, true);
      perform set_config('pharmacy.ledger_reason', v_reason, true);

      if v_reverse > 0 then
        -- Points already spent elsewhere cannot be taken back below nothing.
        perform set_config('pharmacy.ledger_kind', 'reversed', true);
        update public.pharmacy_customers
           set points          = greatest(points - v_reverse, 0),
               lifetime_points = greatest(lifetime_points - v_reverse, 0)
         where id = v_cust.id;
      end if;

      if v_restore > 0 or (p_refund_method = 'credit' and v_payback > 0) then
        perform set_config('pharmacy.ledger_kind', 'restored', true);
        update public.pharmacy_customers
           set points          = points + v_restore,
               redeemed_points = greatest(redeemed_points - v_restore, 0),
               store_credit    = store_credit + case when p_refund_method = 'credit' then v_payback else 0 end
         where id = v_cust.id;
      end if;

      perform set_config('pharmacy.ledger_kind', '', true);
      perform set_config('pharmacy.ledger_ref', '', true);
      perform set_config('pharmacy.ledger_sale', '', true);
      perform set_config('pharmacy.ledger_reason', '', true);
    end if;
  end if;

  return jsonb_build_object('ok', true, 'return_id', v_return, 'return_number', v_number);
end;
$$;

-- --------------------------------------------------------------- points ---
-- A bonus, or a correction, by hand. Never below nothing.
create or replace function public.pharmacy_adjust_points(p_customer_id uuid, p_points integer, p_reason text)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.pharmacy_staff_tenant('administer');
  v_cust   public.pharmacy_customers;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if p_points is null or p_points = 0 then
    raise exception 'Enter how many points to add or take away.'
      using errcode = 'PH001', hint = 'bad_amount';
  end if;

  if v_reason is null then
    raise exception 'Say why the points are being changed.'
      using errcode = 'PH001', hint = 'reason_required';
  end if;

  select * into v_cust from public.pharmacy_customers c where c.id = p_customer_id for update;

  if not found then
    raise exception 'That customer could not be found.'
      using errcode = 'PH001', hint = 'customer_not_found';
  end if;

  if v_cust.points + p_points < 0 then
    raise exception 'The customer does not have that many points.'
      using errcode = 'PH001', hint = 'redeem_too_many';
  end if;

  perform set_config('pharmacy.ledger_kind', case when p_points > 0 then 'bonus' else 'adjusted' end, true);
  perform set_config('pharmacy.ledger_reason', v_reason, true);
  perform set_config('pharmacy.ledger_ref', '', true);
  perform set_config('pharmacy.ledger_sale', '', true);

  update public.pharmacy_customers
     set points          = points + p_points,
         lifetime_points = lifetime_points + greatest(p_points, 0)
   where id = v_cust.id;

  perform set_config('pharmacy.ledger_kind', '', true);
  perform set_config('pharmacy.ledger_reason', '', true);

  return v_cust.points + p_points;
end;
$$;

-- What the customers page shows above its list.
create or replace function public.pharmacy_loyalty_summary()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'customers', count(*),
    'members', count(*) filter (where t.lifetime_points > 0),
    'points', coalesce(sum(t.points), 0),
    'store_credit', coalesce(sum(t.store_credit), 0),
    'bronze', count(*) filter (where t.tier = 'bronze'),
    'silver', count(*) filter (where t.tier = 'silver'),
    'gold', count(*) filter (where t.tier = 'gold'),
    'platinum', count(*) filter (where t.tier = 'platinum')
  )
  from (
    select c.points, c.lifetime_points, c.store_credit,
           public.pharmacy_tier(c.tenant_id, c.lifetime_points) as tier
      from public.pharmacy_customers c
     where c.tenant_id = public.auth_tenant_id()
  ) t
$$;

-- ---------------------------------------------------------------- staff ---
-- The one door into pharmacy_staff and the PIN table.
--
-- SECURITY DEFINER: nobody is granted a write on either (0133). So it checks
-- everything itself — that the caller administers this hospital's pharmacy,
-- that the login being edited is a pharmacy login of that same hospital, and
-- that the branch is theirs too.
create or replace function public.pharmacy_save_staff(
  p_profile_id          uuid,
  p_staff_role          text,
  p_branch_id           uuid default null,
  p_can_discount        boolean default false,
  p_can_approve_returns boolean default false,
  p_can_manage_cash     boolean default false,
  p_can_manage_stock    boolean default false,
  p_can_see_reports     boolean default false,
  p_can_administer      boolean default false,
  p_pin                 text default null,
  p_clear_pin           boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := public.auth_tenant_id();
  v_user   uuid := (select auth.uid());
  v_pin    text := nullif(btrim(coalesce(p_pin, '')), '');
  v_staff  uuid;
begin
  if v_user is null or v_tenant is null
     or public.auth_role() is null or public.auth_role() not in ('hospital_admin', 'pharmacy_admin')
     or not public.pharmacy_can('administer') then
    raise exception 'You do not have permission to do this.'
      using errcode = 'PH403', hint = 'no_permission', detail = 'administer';
  end if;

  if p_staff_role is null or p_staff_role not in ('manager', 'pharmacist', 'cashier', 'stock_keeper') then
    raise exception 'Pick what this person does.'
      using errcode = 'PH001', hint = 'bad_staff_role';
  end if;

  if not exists (
    select 1 from public.profiles p
     where p.id = p_profile_id and p.tenant_id = v_tenant and p.role = 'pharmacy_admin'
  ) then
    raise exception 'That login could not be found.'
      using errcode = 'PH001', hint = 'staff_not_found';
  end if;

  if p_branch_id is not null and not exists (
    select 1 from public.pharmacy_branches b where b.id = p_branch_id and b.tenant_id = v_tenant
  ) then
    raise exception 'That branch could not be found.'
      using errcode = 'PH001', hint = 'branch_not_found';
  end if;

  -- Nobody saws off the branch they are sitting on.
  if p_profile_id = v_user and not coalesce(p_can_administer, false) then
    raise exception 'You cannot take this permission away from yourself.'
      using errcode = 'PH001', hint = 'own_access';
  end if;

  if v_pin is not null and v_pin !~ '^[0-9]{4}$' then
    raise exception 'A PIN is four digits.'
      using errcode = 'PH001', hint = 'bad_pin_format';
  end if;

  insert into public.pharmacy_staff as s (
    tenant_id, profile_id, staff_role, branch_id,
    can_discount, can_approve_returns, can_manage_cash, can_manage_stock, can_see_reports, can_administer
  )
  values (
    v_tenant, p_profile_id, p_staff_role, p_branch_id,
    coalesce(p_can_discount, false), coalesce(p_can_approve_returns, false), coalesce(p_can_manage_cash, false),
    coalesce(p_can_manage_stock, false), coalesce(p_can_see_reports, false), coalesce(p_can_administer, false)
  )
  on conflict (profile_id) do update
     set staff_role          = excluded.staff_role,
         branch_id           = excluded.branch_id,
         can_discount        = excluded.can_discount,
         can_approve_returns = excluded.can_approve_returns,
         can_manage_cash     = excluded.can_manage_cash,
         can_manage_stock    = excluded.can_manage_stock,
         can_see_reports     = excluded.can_see_reports,
         can_administer      = excluded.can_administer
   where s.tenant_id = v_tenant
  returning s.id into v_staff;

  if v_pin is not null then
    insert into public.pharmacy_staff_pins as x (profile_id, pin_hash)
    values (p_profile_id, extensions.crypt(v_pin, extensions.gen_salt('bf')))
    on conflict (profile_id) do update set pin_hash = excluded.pin_hash;

    update public.pharmacy_staff set has_pin = true where id = v_staff;
  elsif coalesce(p_clear_pin, false) then
    update public.pharmacy_staff_pins set pin_hash = null where profile_id = p_profile_id;
    update public.pharmacy_staff set has_pin = false where id = v_staff;
  end if;

  -- So that the first sale by somebody who may not write settings finds them.
  insert into public.pharmacy_settings (tenant_id) values (v_tenant) on conflict (tenant_id) do nothing;

  return v_staff;
end;
$$;

-- Everyone who signs in to this hospital's pharmacy, with what they may do.
-- SECURITY DEFINER because a pharmacy manager has to see their colleagues'
-- names, and the page should not depend on what profiles' own policies allow.
create or replace function public.pharmacy_staff_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := public.auth_tenant_id();
begin
  if (select auth.uid()) is null or v_tenant is null
     or public.auth_role() is null or public.auth_role() not in ('hospital_admin', 'pharmacy_admin')
     or not public.pharmacy_can('administer') then
    raise exception 'You do not have permission to do this.'
      using errcode = 'PH403', hint = 'no_permission', detail = 'administer';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.created_at desc)
      from (
        select p.id, p.full_name, p.email, p.phone, p.is_active, p.created_at,
               coalesce(s.staff_role, 'cashier') as staff_role,
               s.branch_id, b.name as branch_name,
               coalesce(s.can_discount, false) as can_discount,
               coalesce(s.can_approve_returns, false) as can_approve_returns,
               coalesce(s.can_manage_cash, false) as can_manage_cash,
               coalesce(s.can_manage_stock, false) as can_manage_stock,
               coalesce(s.can_see_reports, false) as can_see_reports,
               coalesce(s.can_administer, false) as can_administer,
               coalesce(s.has_pin, false) as has_pin
          from public.profiles p
          left join public.pharmacy_staff s on s.profile_id = p.id
          left join public.pharmacy_branches b on b.id = s.branch_id
         where p.tenant_id = v_tenant and p.role = 'pharmacy_admin'
      ) r
  ), '[]'::jsonb);
end;
$$;

-- ------------------------------------------------------- the audit trail ---
-- /super/logs is the platform's. This is the same log, cut down to one
-- hospital's pharmacy tables, for whoever administers that pharmacy.
--
-- SECURITY DEFINER because audit_logs is readable by super admins only. It
-- can only ever answer for the caller's own hospital and for tables whose
-- name starts with pharmacy_. `label` is what the record is called today —
-- an invoice number, a product's name — or null if it has since been deleted.
create or replace function public.pharmacy_audit_log(
  p_from   date default null,
  p_to     date default null,
  p_table  text default null,
  p_action text default null,
  p_q      text default null,
  p_limit  integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := public.auth_tenant_id();
  v_tz     text := public.pharmacy_tz();
  v_q      text := nullif(btrim(coalesce(p_q, '')), '');
  v_result jsonb;
begin
  if (select auth.uid()) is null or v_tenant is null
     or public.auth_role() is null or public.auth_role() not in ('hospital_admin', 'pharmacy_admin')
     or not public.pharmacy_can('administer') then
    raise exception 'You do not have permission to do this.'
      using errcode = 'PH403', hint = 'no_permission', detail = 'administer';
  end if;

  with hits as (
    select a.id, a.occurred_at, a.actor_id, a.actor_email, a.actor_role,
           a.table_name, a.record_id, a.action::text as action, a.changed_fields
      from public.audit_logs a
     where a.tenant_id = v_tenant
       and a.table_name like 'pharmacy\_%'
       and (p_from is null or a.occurred_at >= (p_from::timestamp at time zone v_tz))
       and (p_to is null or a.occurred_at < ((p_to + 1)::timestamp at time zone v_tz))
       and (coalesce(p_table, '') = '' or a.table_name = p_table)
       and (coalesce(p_action, '') = '' or a.action::text = p_action)
       and (v_q is null
            or a.actor_email ilike '%' || v_q || '%'
            or exists (select 1 from public.profiles p where p.id = a.actor_id and p.full_name ilike '%' || v_q || '%'))
  ),
  page as (
    select h.*,
           (select p.full_name from public.profiles p where p.id = h.actor_id) as actor_name,
           case h.table_name
             when 'pharmacy_sales' then (select s.invoice_number from public.pharmacy_sales s where s.id = h.record_id)
             when 'pharmacy_sale_returns' then (select coalesce(r.return_number, s.invoice_number)
                                                   from public.pharmacy_sale_returns r
                                                   join public.pharmacy_sales s on s.id = r.sale_id
                                                  where r.id = h.record_id)
             when 'pharmacy_sale_payments' then (select s.invoice_number
                                                    from public.pharmacy_sale_payments sp
                                                    join public.pharmacy_sales s on s.id = sp.sale_id
                                                   where sp.id = h.record_id)
             when 'pharmacy_items' then (select i.name from public.pharmacy_items i where i.id = h.record_id)
             when 'pharmacy_batches' then (select i.name || ' · ' || b.batch_number
                                              from public.pharmacy_batches b
                                              join public.pharmacy_items i on i.id = b.item_id
                                             where b.id = h.record_id)
             when 'pharmacy_suppliers' then (select s.name from public.pharmacy_suppliers s where s.id = h.record_id)
             when 'pharmacy_customers' then (select c.name from public.pharmacy_customers c where c.id = h.record_id)
             when 'pharmacy_purchase_orders' then (select o.po_number from public.pharmacy_purchase_orders o where o.id = h.record_id)
             when 'pharmacy_expenses' then (select e.category from public.pharmacy_expenses e where e.id = h.record_id)
             when 'pharmacy_cash_shifts' then (select s.opened_by_name from public.pharmacy_cash_shifts s where s.id = h.record_id)
             when 'pharmacy_cash_transactions' then (select t.note from public.pharmacy_cash_transactions t where t.id = h.record_id)
             when 'pharmacy_branches' then (select b.name from public.pharmacy_branches b where b.id = h.record_id)
             when 'pharmacy_registers' then (select r.name from public.pharmacy_registers r where r.id = h.record_id)
             when 'pharmacy_staff' then (select p.full_name
                                            from public.pharmacy_staff s
                                            join public.profiles p on p.id = s.profile_id
                                           where s.id = h.record_id)
           end as label
      from hits h
     order by h.id desc
     limit least(greatest(coalesce(p_limit, 25), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select jsonb_build_object(
           'total', (select count(*) from hits),
           'rows', coalesce((select jsonb_agg(to_jsonb(pg) order by pg.id desc) from page pg), '[]'::jsonb))
    into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------- at the till ---
-- As 0128, and now says how each product may be sold: by the strip and the
-- box as well as the piece, and what each costs.
drop function public.pharmacy_pos_items(text, text, integer);

create function public.pharmacy_pos_items(
  p_q        text default null,
  p_category text default null,
  p_limit    integer default 24
)
returns table (
  id                    uuid,
  sku                   text,
  name                  text,
  generic_name          text,
  category              text,
  manufacturer          text,
  selling_price         numeric,
  requires_prescription boolean,
  sellable              integer,
  next_expiry           date,
  sold_recent           integer,
  strip_size            integer,
  box_size              integer,
  strip_price           numeric,
  box_price             numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with stock as (
    select b.item_id, sum(b.quantity)::integer as sellable, min(b.expiry_date) as next_expiry
      from public.pharmacy_batches b
     where b.quantity > 0
       and (b.expiry_date is null or b.expiry_date >= public.pharmacy_today())
     group by b.item_id
  ),
  recent as (
    select si.item_id, sum(si.quantity - si.returned_quantity)::integer as sold
      from public.pharmacy_sale_items si
      join public.pharmacy_sales s on s.id = si.sale_id
     where s.sold_at >= now() - interval '30 days'
     group by si.item_id
  )
  select i.id, i.sku, i.name, i.generic_name, i.category, i.manufacturer,
         i.selling_price, i.requires_prescription,
         coalesce(st.sellable, 0), st.next_expiry, coalesce(r.sold, 0),
         i.strip_size, i.box_size,
         case when i.strip_size is not null then coalesce(i.strip_price, i.selling_price * i.strip_size) end,
         case when i.box_size is not null then coalesce(i.box_price, i.selling_price * i.box_size) end
    from public.pharmacy_items i
    left join stock st on st.item_id = i.id
    left join recent r on r.item_id = i.id
   where i.is_active
     and (coalesce(btrim(p_category), '') = '' or i.category = p_category)
     and (coalesce(btrim(p_q), '') = ''
          or i.name ilike '%' || btrim(p_q) || '%'
          or i.generic_name ilike '%' || btrim(p_q) || '%'
          or i.sku ilike '%' || btrim(p_q) || '%'
          or i.manufacturer ilike '%' || btrim(p_q) || '%')
   order by (coalesce(st.sellable, 0) > 0) desc, coalesce(r.sold, 0) desc, i.name
   limit least(greatest(coalesce(p_limit, 24), 1), 100)
$$;

-- --------------------------------------------------------------- grants ---
do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.pharmacy_staff_tenant(text)',
    'public.pharmacy_me()',
    'public.pharmacy_open_shift(numeric, uuid)',
    'public.pharmacy_create_sale(jsonb, text, numeric, numeric, uuid, text, text, text, text, integer, jsonb)',
    'public.pharmacy_verify_pin(text)',
    'public.pharmacy_return_sale(uuid, jsonb, text, text, text, text)',
    'public.pharmacy_adjust_points(uuid, integer, text)',
    'public.pharmacy_loyalty_summary()',
    'public.pharmacy_save_staff(uuid, text, uuid, boolean, boolean, boolean, boolean, boolean, boolean, text, boolean)',
    'public.pharmacy_staff_list()',
    'public.pharmacy_audit_log(date, date, text, text, text, integer, integer)',
    'public.pharmacy_pos_items(text, text, integer)',
    'public.pharmacy_tier(uuid, integer)'
  ] loop
    execute format('revoke execute on function %s from public, anon', v_fn);
    execute format('grant execute on function %s to authenticated', v_fn);
  end loop;
end;
$$;
