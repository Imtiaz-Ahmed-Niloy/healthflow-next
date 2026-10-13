-- 0127_pharmacy_operations.sql
-- The things a pharmacy does that are more than one write: sell, take a
-- return, receive a delivery, run a cash drawer.
--
-- Each is one function, so it is one transaction. A sale that took the stock
-- and then failed to save its invoice would leave the shelf short and nothing
-- to show for it; here either all of it happens or none of it does.
--
-- All SECURITY INVOKER. Every statement inside runs as the person at the
-- counter, so the tenant policy and the role gate from 0126 hold on each one
-- and none of these can reach another hospital however it is called.
--
-- Refusals a person can fix are raised with SQLSTATE PH001, a sentence in
-- English, and a short key in HINT. The route passes all three on and the
-- page says it in the reader's own language from the key.

-- The caller's hospital, or a refusal. hospital_admin and pharmacy_admin only:
-- finance may read the pharmacy's books (0126) but does not stand at its till.
create or replace function public.pharmacy_staff_tenant()
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

  return v_tenant;
end;
$$;

-- INV-2026-000042. The counter row is locked until the sale commits, so two
-- tills cannot be handed the same number, and a sale that fails gives its
-- number back.
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
  insert into public.pharmacy_settings (tenant_id) values (p_tenant) on conflict (tenant_id) do nothing;
  insert into public.pharmacy_counters (tenant_id) values (p_tenant) on conflict (tenant_id) do nothing;

  if p_kind = 'invoice' then
    update public.pharmacy_counters
       set next_invoice_no = next_invoice_no + 1
     where tenant_id = p_tenant
    returning next_invoice_no - 1 into v_no;

    select s.invoice_prefix into v_prefix from public.pharmacy_settings s where s.tenant_id = p_tenant;
  else
    update public.pharmacy_counters
       set next_po_no = next_po_no + 1
     where tenant_id = p_tenant
    returning next_po_no - 1 into v_no;

    select s.po_prefix into v_prefix from public.pharmacy_settings s where s.tenant_id = p_tenant;
  end if;

  return upper(v_prefix) || '-' || to_char(public.pharmacy_today(), 'YYYY') || '-' || lpad(v_no::text, 6, '0');
end;
$$;

-- What is in a drawer right now: what it opened with, plus everything since.
create or replace function public.pharmacy_shift_balance(p_shift_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select s.opening_balance
       + coalesce((select sum(t.amount) from public.pharmacy_cash_transactions t where t.shift_id = s.id), 0)
    from public.pharmacy_cash_shifts s
   where s.id = p_shift_id
$$;

-- ----------------------------------------------------------------- sell ---
-- p_items: [{ "item_id": uuid, "quantity": 3 }, ...]
--
-- The price is the catalogue's, not the request's: a till that could name
-- its own price is a till that can give medicine away.
--
-- Stock leaves the batch that expires soonest, and an expired batch is never
-- sold from. One product can come out of two batches; each is its own line.
create or replace function public.pharmacy_create_sale(
  p_items             jsonb,
  p_payment_method    text,
  p_tendered          numeric default 0,
  p_discount          numeric default 0,
  p_customer_id       uuid default null,
  p_customer_name     text default null,
  p_customer_phone    text default null,
  p_payment_reference text default null,
  p_notes             text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant     uuid := public.pharmacy_staff_tenant();
  v_user       uuid := (select auth.uid());
  v_today      date := public.pharmacy_today();
  v_tax_rate   numeric(5,2);
  v_line       record;
  v_item       public.pharmacy_items;
  v_batch      record;
  v_need       integer;
  v_take       integer;
  v_alloc      jsonb := '[]'::jsonb;
  v_subtotal   numeric(14,2) := 0;
  v_discount   numeric(14,2);
  v_tax        numeric(14,2);
  v_total      numeric(14,2);
  v_tendered   numeric(14,2) := greatest(coalesce(p_tendered, 0), 0);
  v_paid       numeric(14,2);
  v_change     numeric(14,2) := 0;
  v_shift      uuid;
  v_sale       uuid;
  v_invoice    text;
  v_cust_name  text := nullif(btrim(coalesce(p_customer_name, '')), '');
  v_cust_phone text := nullif(btrim(coalesce(p_customer_phone, '')), '');
begin
  if p_payment_method is null or p_payment_method not in ('cash', 'card', 'mobile', 'credit', 'other') then
    raise exception 'Pick how the customer is paying.'
      using errcode = 'PH001', hint = 'bad_payment_method';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one product to the order.'
      using errcode = 'PH001', hint = 'empty_cart';
  end if;

  if p_customer_id is not null then
    select c.name, coalesce(v_cust_phone, c.phone)
      into v_cust_name, v_cust_phone
      from public.pharmacy_customers c
     where c.id = p_customer_id;

    if not found then
      raise exception 'That customer could not be found.'
        using errcode = 'PH001', hint = 'customer_not_found';
    end if;
  end if;

  -- Money owed has to be owed by somebody who can be found again.
  if p_payment_method = 'credit' and p_customer_id is null then
    raise exception 'A sale on account needs a saved customer.'
      using errcode = 'PH001', hint = 'credit_needs_customer';
  end if;

  select s.id into v_shift
    from public.pharmacy_cash_shifts s
   where s.tenant_id = v_tenant and s.opened_by = v_user and s.status = 'open';

  if p_payment_method = 'cash' and v_shift is null then
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
           sum((e ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) e
     group by 1
     order by 1
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

    v_need := v_line.quantity;

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
        'unit_price', v_item.selling_price,
        'unit_cost', case when v_batch.unit_cost > 0 then v_batch.unit_cost else v_item.cost_price end
      );

      v_need := v_need - v_take;
    end loop;

    if v_need > 0 then
      raise exception 'Not enough stock of %.', v_item.name
        using errcode = 'PH001', hint = 'insufficient_stock', detail = v_item.name;
    end if;

    v_subtotal := v_subtotal + v_item.selling_price * v_line.quantity;
  end loop;

  perform set_config('pharmacy.movement_kind', '', true);
  perform set_config('pharmacy.movement_ref', '', true);

  select coalesce((select s.tax_rate from public.pharmacy_settings s where s.tenant_id = v_tenant), 0)
    into v_tax_rate;

  v_discount := least(greatest(coalesce(p_discount, 0), 0), v_subtotal);
  v_tax      := round((v_subtotal - v_discount) * v_tax_rate / 100, 2);
  v_total    := v_subtotal - v_discount + v_tax;

  if p_payment_method = 'cash' then
    if v_tendered < v_total then
      raise exception 'The cash received is less than the total.'
        using errcode = 'PH001', hint = 'cash_short';
    end if;
    v_paid   := v_total;
    v_change := v_tendered - v_total;
  elsif p_payment_method = 'credit' then
    v_paid     := 0;
    v_tendered := 0;
  else
    v_paid     := v_total;
    v_tendered := v_total;
  end if;

  insert into public.pharmacy_sales (
    tenant_id, invoice_number, customer_id, customer_name, customer_phone,
    subtotal, discount, tax_rate, tax, total_amount,
    paid_amount, tendered_amount, change_amount,
    payment_method, payment_reference, payment_status, notes, shift_id
  )
  values (
    v_tenant, v_invoice, p_customer_id, v_cust_name, v_cust_phone,
    v_subtotal, v_discount, v_tax_rate, v_tax, v_total,
    v_paid, v_tendered, v_change,
    p_payment_method, nullif(btrim(coalesce(p_payment_reference, '')), ''),
    case when v_paid >= v_total then 'paid' when v_paid > 0 then 'partial' else 'unpaid' end,
    nullif(btrim(coalesce(p_notes, '')), ''), v_shift
  )
  returning id into v_sale;

  insert into public.pharmacy_sale_items (
    tenant_id, sale_id, item_id, batch_id, item_name, sku, category,
    batch_number, expiry_date, quantity, unit_price, unit_cost
  )
  select v_tenant, v_sale, a.item_id, a.batch_id, a.item_name, a.sku, a.category,
         a.batch_number, a.expiry_date, a.quantity, a.unit_price, a.unit_cost
    from jsonb_to_recordset(v_alloc) as a(
      item_id uuid, batch_id uuid, item_name text, sku text, category text,
      batch_number text, expiry_date date, quantity integer, unit_price numeric, unit_cost numeric
    );

  if p_payment_method = 'cash' and v_paid > 0 then
    insert into public.pharmacy_cash_transactions (tenant_id, shift_id, type, amount, note, sale_id)
    values (v_tenant, v_shift, 'sale', v_paid, v_invoice, v_sale);
  end if;

  return v_sale;
end;
$$;

-- --------------------------------------------------------------- return ---
-- p_items: [{ "sale_item_id": uuid, "quantity": 1 }, ...]
--
-- The refund is the returned goods' share of what the whole sale came to, so
-- a discount and the VAT come back in proportion with them.
--
-- What is handed back is a separate number. On a sale that was on account
-- and never paid, a return only makes the bill smaller; money goes back only
-- once more has been paid than the bill is now worth.
create or replace function public.pharmacy_return_sale(
  p_sale_id       uuid,
  p_items         jsonb,
  p_reason        text,
  p_refund_method text default 'cash',
  p_restock       boolean default true,
  p_notes         text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant   uuid := public.pharmacy_staff_tenant();
  v_user     uuid := (select auth.uid());
  v_sale     public.pharmacy_sales;
  v_line     record;
  v_si       public.pharmacy_sale_items;
  v_lines    jsonb := '[]'::jsonb;
  v_goods    numeric(14,2) := 0;
  v_refund   numeric(14,2);
  v_net      numeric(14,2);
  v_payback  numeric(14,2);
  v_all_back boolean;
  v_shift    uuid;
  v_return   uuid;
  v_reason   text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if p_refund_method is null or p_refund_method not in ('cash', 'original') then
    raise exception 'Pick how the money goes back.'
      using errcode = 'PH001', hint = 'bad_refund_method';
  end if;

  if v_reason is null then
    raise exception 'Say why it is being returned.'
      using errcode = 'PH001', hint = 'reason_required';
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

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Pick what is being returned.'
      using errcode = 'PH001', hint = 'nothing_to_return';
  end if;

  perform set_config('pharmacy.movement_kind', 'return', true);
  perform set_config('pharmacy.movement_ref', v_sale.invoice_number, true);

  for v_line in
    select (e ->> 'sale_item_id')::uuid as sale_item_id,
           sum((e ->> 'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_items) e
     group by 1
     order by 1
  loop
    continue when v_line.quantity is null or v_line.quantity <= 0;

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

    if p_restock then
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
      'quantity', v_line.quantity, 'unit_price', v_si.unit_price
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

  insert into public.pharmacy_sale_returns (
    tenant_id, sale_id, refund_amount, paid_back, refund_method, reason, notes, restocked, shift_id
  )
  values (
    v_tenant, v_sale.id, v_refund, v_payback, p_refund_method, v_reason,
    nullif(btrim(coalesce(p_notes, '')), ''), coalesce(p_restock, true), v_shift
  )
  returning id into v_return;

  insert into public.pharmacy_sale_return_items (tenant_id, return_id, sale_item_id, item_name, quantity, unit_price)
  select v_tenant, v_return, l.sale_item_id, l.item_name, l.quantity, l.unit_price
    from jsonb_to_recordset(v_lines) as l(sale_item_id uuid, item_name text, quantity integer, unit_price numeric);

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
    values (v_tenant, v_shift, 'refund', -v_payback, v_sale.invoice_number, v_sale.id);
  end if;

  return v_return;
end;
$$;

-- ------------------------------------------------- money against a sale ---
create or replace function public.pharmacy_collect_payment(
  p_sale_id   uuid,
  p_amount    numeric,
  p_method    text,
  p_reference text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant  uuid := public.pharmacy_staff_tenant();
  v_user    uuid := (select auth.uid());
  v_sale    public.pharmacy_sales;
  v_due     numeric(14,2);
  v_shift   uuid;
  v_payment uuid;
begin
  if p_method is null or p_method not in ('cash', 'card', 'mobile', 'other') then
    raise exception 'Pick how the customer is paying.'
      using errcode = 'PH001', hint = 'bad_payment_method';
  end if;

  select * into v_sale from public.pharmacy_sales s where s.id = p_sale_id for update;

  if not found then
    raise exception 'That sale could not be found.'
      using errcode = 'PH001', hint = 'sale_not_found';
  end if;

  v_due := greatest(v_sale.total_amount - v_sale.refunded_amount - v_sale.paid_amount, 0);

  if v_due <= 0 then
    raise exception 'Nothing is owed on this invoice.'
      using errcode = 'PH001', hint = 'nothing_due';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount above zero.'
      using errcode = 'PH001', hint = 'bad_amount';
  end if;

  if p_amount > v_due then
    raise exception 'That is more than is owed on this invoice.'
      using errcode = 'PH001', hint = 'payment_too_much';
  end if;

  select s.id into v_shift
    from public.pharmacy_cash_shifts s
   where s.tenant_id = v_tenant and s.opened_by = v_user and s.status = 'open';

  if p_method = 'cash' and v_shift is null then
    raise exception 'Open your cash drawer before taking cash.'
      using errcode = 'PH001', hint = 'drawer_closed';
  end if;

  insert into public.pharmacy_sale_payments (tenant_id, sale_id, amount, method, reference, shift_id)
  values (v_tenant, v_sale.id, p_amount, p_method, nullif(btrim(coalesce(p_reference, '')), ''), v_shift)
  returning id into v_payment;

  update public.pharmacy_sales
     set paid_amount    = paid_amount + p_amount,
         payment_status = case when p_amount >= v_due then 'paid' else 'partial' end
   where id = v_sale.id;

  if p_method = 'cash' then
    insert into public.pharmacy_cash_transactions (tenant_id, shift_id, type, amount, note, sale_id)
    values (v_tenant, v_shift, 'payment', p_amount, v_sale.invoice_number, v_sale.id);
  end if;

  return v_payment;
end;
$$;

-- ------------------------------------------------------ purchase orders ---
-- p_items: [{ "item_id": uuid, "quantity": 100, "unit_cost": 4.5 }, ...]
create or replace function public.pharmacy_create_purchase_order(
  p_supplier_id   uuid,
  p_items         jsonb,
  p_expected_date date default null,
  p_notes         text default null,
  p_tax           numeric default 0,
  p_shipping      numeric default 0
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant   uuid := public.pharmacy_staff_tenant();
  v_line     record;
  v_item     public.pharmacy_items;
  v_lines    jsonb := '[]'::jsonb;
  v_cost     numeric(12,2);
  v_subtotal numeric(14,2) := 0;
  v_tax      numeric(14,2) := greatest(coalesce(p_tax, 0), 0);
  v_shipping numeric(14,2) := greatest(coalesce(p_shipping, 0), 0);
  v_order    uuid;
begin
  if not exists (select 1 from public.pharmacy_suppliers s where s.id = p_supplier_id) then
    raise exception 'Pick a supplier.'
      using errcode = 'PH001', hint = 'supplier_required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one product to the order.'
      using errcode = 'PH001', hint = 'empty_order';
  end if;

  for v_line in
    select (e ->> 'item_id')::uuid as item_id,
           sum((e ->> 'quantity')::integer)::integer as quantity,
           max(nullif(e ->> 'unit_cost', '')::numeric) as unit_cost
      from jsonb_array_elements(p_items) e
     group by 1
     order by 1
  loop
    if v_line.item_id is null or v_line.quantity is null or v_line.quantity <= 0 then
      raise exception 'Every line needs a product and a quantity above zero.'
        using errcode = 'PH001', hint = 'bad_quantity';
    end if;

    select * into v_item from public.pharmacy_items i where i.id = v_line.item_id;

    if not found then
      raise exception 'One of the products could not be found.'
        using errcode = 'PH001', hint = 'item_not_found';
    end if;

    v_cost := greatest(coalesce(v_line.unit_cost, v_item.cost_price, 0), 0);

    v_lines := v_lines || jsonb_build_object(
      'item_id', v_item.id, 'item_name', v_item.name, 'sku', v_item.sku,
      'quantity', v_line.quantity, 'unit_cost', v_cost
    );
    v_subtotal := v_subtotal + v_cost * v_line.quantity;
  end loop;

  insert into public.pharmacy_purchase_orders (
    tenant_id, po_number, supplier_id, order_date, expected_date,
    subtotal, tax, shipping_cost, total_amount, notes
  )
  values (
    v_tenant, public.pharmacy_next_number(v_tenant, 'po'), p_supplier_id,
    public.pharmacy_today(), p_expected_date,
    v_subtotal, v_tax, v_shipping, v_subtotal + v_tax + v_shipping,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into v_order;

  insert into public.pharmacy_purchase_order_items (tenant_id, purchase_order_id, item_id, item_name, sku, quantity, unit_cost)
  select v_tenant, v_order, l.item_id, l.item_name, l.sku, l.quantity, l.unit_cost
    from jsonb_to_recordset(v_lines) as l(item_id uuid, item_name text, sku text, quantity integer, unit_cost numeric);

  return v_order;
end;
$$;

-- p_lines: [{ "po_item_id": uuid, "quantity": 60, "batch_number": "B-17",
--             "expiry_date": "2028-01-31", "location": "A1" }, ...]
--
-- A delivery becomes batches. The same batch number arriving again adds to
-- the batch that is already there. Answers the order's new status.
create or replace function public.pharmacy_receive_purchase_order(
  p_order_id uuid,
  p_lines    jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.pharmacy_staff_tenant();
  v_order  public.pharmacy_purchase_orders;
  v_line   record;
  v_poi    public.pharmacy_purchase_order_items;
  v_track  boolean;
  v_count  integer := 0;
  v_status text;
begin
  select * into v_order from public.pharmacy_purchase_orders o where o.id = p_order_id for update;

  if not found then
    raise exception 'That order could not be found.'
      using errcode = 'PH001', hint = 'order_not_found';
  end if;

  if v_order.status in ('received', 'cancelled') then
    raise exception 'This order is closed.'
      using errcode = 'PH001', hint = 'order_closed';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'Enter what arrived.'
      using errcode = 'PH001', hint = 'nothing_received';
  end if;

  perform set_config('pharmacy.movement_kind', 'purchase', true);
  perform set_config('pharmacy.movement_ref', v_order.po_number, true);

  for v_line in
    select (e ->> 'po_item_id')::uuid as po_item_id,
           (e ->> 'quantity')::integer as quantity,
           nullif(btrim(coalesce(e ->> 'batch_number', '')), '') as batch_number,
           nullif(e ->> 'expiry_date', '')::date as expiry_date,
           nullif(btrim(coalesce(e ->> 'location', '')), '') as location
      from jsonb_array_elements(p_lines) e
     order by 1
  loop
    continue when v_line.quantity is null or v_line.quantity <= 0;

    select * into v_poi
      from public.pharmacy_purchase_order_items i
     where i.id = v_line.po_item_id and i.purchase_order_id = v_order.id
       for update;

    if not found then
      raise exception 'One of those lines is not on this order.'
        using errcode = 'PH001', hint = 'line_not_on_order';
    end if;

    if v_line.quantity > v_poi.quantity - v_poi.received_quantity then
      raise exception 'More of % arrived than was ordered.', v_poi.item_name
        using errcode = 'PH001', hint = 'receive_too_many', detail = v_poi.item_name;
    end if;

    if v_line.batch_number is null then
      raise exception 'Enter the batch number for %.', v_poi.item_name
        using errcode = 'PH001', hint = 'batch_required', detail = v_poi.item_name;
    end if;

    select i.track_expiry into v_track from public.pharmacy_items i where i.id = v_poi.item_id;

    if coalesce(v_track, true) and v_line.expiry_date is null then
      raise exception 'Enter the expiry date for %.', v_poi.item_name
        using errcode = 'PH001', hint = 'expiry_required', detail = v_poi.item_name;
    end if;

    insert into public.pharmacy_batches as b (
      tenant_id, item_id, batch_number, quantity, unit_cost, expiry_date, location, supplier_id
    )
    values (
      v_tenant, v_poi.item_id, v_line.batch_number, v_line.quantity, v_poi.unit_cost,
      v_line.expiry_date, coalesce(v_line.location, 'Main'), v_order.supplier_id
    )
    on conflict (item_id, lower(btrim(batch_number)))
    do update set quantity    = b.quantity + excluded.quantity,
                  unit_cost   = excluded.unit_cost,
                  expiry_date = coalesce(excluded.expiry_date, b.expiry_date),
                  location    = excluded.location,
                  supplier_id = excluded.supplier_id;

    update public.pharmacy_purchase_order_items
       set received_quantity = received_quantity + v_line.quantity
     where id = v_poi.id;

    -- What it costs to buy follows the last delivery.
    update public.pharmacy_items
       set cost_price = v_poi.unit_cost
     where id = v_poi.item_id and v_poi.unit_cost > 0 and cost_price <> v_poi.unit_cost;

    v_count := v_count + 1;
  end loop;

  perform set_config('pharmacy.movement_kind', '', true);
  perform set_config('pharmacy.movement_ref', '', true);

  if v_count = 0 then
    raise exception 'Enter what arrived.'
      using errcode = 'PH001', hint = 'nothing_received';
  end if;

  v_status := case
    when exists (
      select 1 from public.pharmacy_purchase_order_items i
       where i.purchase_order_id = v_order.id and i.received_quantity < i.quantity
    ) then 'partial'
    else 'received'
  end;

  update public.pharmacy_purchase_orders set status = v_status where id = v_order.id;

  return v_status;
end;
$$;

create or replace function public.pharmacy_cancel_purchase_order(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.pharmacy_staff_tenant();
  v_order  public.pharmacy_purchase_orders;
begin
  select * into v_order from public.pharmacy_purchase_orders o where o.id = p_order_id for update;

  if not found then
    raise exception 'That order could not be found.'
      using errcode = 'PH001', hint = 'order_not_found';
  end if;

  -- Stock that has arrived is on the shelf. The order that brought it stays.
  if v_order.status <> 'ordered' then
    raise exception 'Only an order with nothing received yet can be cancelled.'
      using errcode = 'PH001', hint = 'order_cannot_cancel';
  end if;

  update public.pharmacy_purchase_orders set status = 'cancelled' where id = v_order.id;
end;
$$;

-- Money paid to the supplier against an order.
create or replace function public.pharmacy_pay_purchase_order(p_order_id uuid, p_amount numeric)
returns numeric
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.pharmacy_staff_tenant();
  v_order  public.pharmacy_purchase_orders;
  v_due    numeric(14,2);
begin
  select * into v_order from public.pharmacy_purchase_orders o where o.id = p_order_id for update;

  if not found then
    raise exception 'That order could not be found.'
      using errcode = 'PH001', hint = 'order_not_found';
  end if;

  if v_order.status = 'cancelled' then
    raise exception 'This order is closed.'
      using errcode = 'PH001', hint = 'order_closed';
  end if;

  v_due := v_order.total_amount - v_order.paid_amount;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount above zero.'
      using errcode = 'PH001', hint = 'bad_amount';
  end if;

  if p_amount > v_due then
    raise exception 'That is more than is owed on this order.'
      using errcode = 'PH001', hint = 'payment_too_much';
  end if;

  update public.pharmacy_purchase_orders
     set paid_amount    = paid_amount + p_amount,
         payment_status = case when p_amount >= v_due then 'paid' else 'partial' end
   where id = v_order.id;

  return v_due - p_amount;
end;
$$;

-- ---------------------------------------------------------- cash drawer ---
create or replace function public.pharmacy_open_shift(p_opening_balance numeric)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.pharmacy_staff_tenant();
  v_user   uuid := (select auth.uid());
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

  insert into public.pharmacy_cash_shifts (tenant_id, opened_by, opened_by_name, opening_balance)
  values (v_tenant, v_user, (select p.full_name from public.profiles p where p.id = v_user), p_opening_balance)
  returning id into v_shift;

  return v_shift;
end;
$$;

-- Closes the caller's own drawer. A hospital admin may name somebody else's,
-- for the one left open by a cashier who has gone home.
create or replace function public.pharmacy_close_shift(
  p_counted  numeric,
  p_note     text default null,
  p_shift_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant   uuid := public.pharmacy_staff_tenant();
  v_user     uuid := (select auth.uid());
  v_shift    public.pharmacy_cash_shifts;
  v_expected numeric(14,2);
begin
  if p_counted is null or p_counted < 0 then
    raise exception 'Count the cash and enter the total.'
      using errcode = 'PH001', hint = 'bad_amount';
  end if;

  if p_shift_id is not null and public.auth_role() = 'hospital_admin' then
    select * into v_shift
      from public.pharmacy_cash_shifts s
     where s.id = p_shift_id and s.status = 'open'
       for update;
  else
    select * into v_shift
      from public.pharmacy_cash_shifts s
     where s.tenant_id = v_tenant and s.opened_by = v_user and s.status = 'open'
       for update;
  end if;

  if not found then
    raise exception 'There is no open cash drawer to close.'
      using errcode = 'PH001', hint = 'drawer_closed';
  end if;

  v_expected := public.pharmacy_shift_balance(v_shift.id);

  update public.pharmacy_cash_shifts
     set status           = 'closed',
         closed_at        = now(),
         closed_by_name   = (select p.full_name from public.profiles p where p.id = v_user),
         expected_balance = v_expected,
         closing_balance  = p_counted,
         discrepancy      = p_counted - v_expected,
         closing_note     = nullif(btrim(coalesce(p_note, '')), '')
   where id = v_shift.id;

  return v_shift.id;
end;
$$;

-- Cash put in, taken out, or spent, by hand. An expense is also written to
-- the expenses book, so the month's spending does not depend on remembering
-- to enter it twice.
create or replace function public.pharmacy_cash_move(
  p_type     text,
  p_amount   numeric,
  p_note     text default null,
  p_category text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant  uuid := public.pharmacy_staff_tenant();
  v_user    uuid := (select auth.uid());
  v_shift   uuid;
  v_expense uuid;
  v_line    uuid;
  v_note    text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_type is null or p_type not in ('cash_in', 'cash_out', 'expense') then
    raise exception 'Pick cash in, cash out or expense.'
      using errcode = 'PH001', hint = 'bad_cash_type';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount above zero.'
      using errcode = 'PH001', hint = 'bad_amount';
  end if;

  select s.id into v_shift
    from public.pharmacy_cash_shifts s
   where s.tenant_id = v_tenant and s.opened_by = v_user and s.status = 'open'
     for update;

  if v_shift is null then
    raise exception 'Open your cash drawer first.'
      using errcode = 'PH001', hint = 'drawer_closed';
  end if;

  if p_type <> 'cash_in' and p_amount > public.pharmacy_shift_balance(v_shift) then
    raise exception 'There is not that much cash in the drawer.'
      using errcode = 'PH001', hint = 'drawer_insufficient';
  end if;

  if p_type = 'expense' then
    insert into public.pharmacy_expenses (tenant_id, expense_date, category, description, amount, shift_id)
    values (
      v_tenant, public.pharmacy_today(),
      coalesce(nullif(btrim(coalesce(p_category, '')), ''), 'Other'),
      v_note, p_amount, v_shift
    )
    returning id into v_expense;
  end if;

  insert into public.pharmacy_cash_transactions (tenant_id, shift_id, type, amount, note, expense_id)
  values (
    v_tenant, v_shift, p_type,
    case when p_type = 'cash_in' then p_amount else -p_amount end,
    v_note, v_expense
  )
  returning id into v_line;

  return v_line;
end;
$$;

-- Takes back a line entered by hand, while the drawer is still open. A sale,
-- a refund or a payment is not undone from here: those are undone by a
-- return, which puts the stock back too.
create or replace function public.pharmacy_remove_cash_transaction(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.pharmacy_staff_tenant();
  v_user   uuid := (select auth.uid());
  v_line   public.pharmacy_cash_transactions;
  v_shift  public.pharmacy_cash_shifts;
begin
  select * into v_line from public.pharmacy_cash_transactions t where t.id = p_id for update;

  if not found then
    raise exception 'That line could not be found.'
      using errcode = 'PH001', hint = 'cash_line_not_found';
  end if;

  if v_line.type not in ('cash_in', 'cash_out', 'expense') then
    raise exception 'A sale or a refund cannot be removed from the drawer. Use a return.'
      using errcode = 'PH001', hint = 'cash_line_fixed';
  end if;

  select * into v_shift from public.pharmacy_cash_shifts s where s.id = v_line.shift_id for update;

  if v_shift.status <> 'open' then
    raise exception 'That drawer has been closed and counted.'
      using errcode = 'PH001', hint = 'drawer_counted';
  end if;

  if v_shift.opened_by is distinct from v_user and public.auth_role() <> 'hospital_admin' then
    raise exception 'That is somebody else''s cash drawer.'
      using errcode = 'PH001', hint = 'not_your_drawer';
  end if;

  delete from public.pharmacy_cash_transactions where id = v_line.id;

  if v_line.expense_id is not null then
    delete from public.pharmacy_expenses where id = v_line.expense_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------- stock ---
-- Stock that did not come through a purchase order: what was on the shelf
-- the day the pharmacy started using this, or a gift, or a correction.
create or replace function public.pharmacy_add_stock(
  p_item_id      uuid,
  p_batch_number text,
  p_quantity     integer,
  p_expiry_date  date default null,
  p_location     text default null,
  p_unit_cost    numeric default null,
  p_supplier_id  uuid default null,
  p_note         text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.pharmacy_staff_tenant();
  v_item   public.pharmacy_items;
  v_number text := nullif(btrim(coalesce(p_batch_number, '')), '');
  v_batch  uuid;
begin
  select * into v_item from public.pharmacy_items i where i.id = p_item_id;

  if not found then
    raise exception 'Pick a product.'
      using errcode = 'PH001', hint = 'item_not_found';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Enter a quantity above zero.'
      using errcode = 'PH001', hint = 'bad_quantity';
  end if;

  if v_number is null then
    raise exception 'Enter the batch number for %.', v_item.name
      using errcode = 'PH001', hint = 'batch_required', detail = v_item.name;
  end if;

  if v_item.track_expiry and p_expiry_date is null then
    raise exception 'Enter the expiry date for %.', v_item.name
      using errcode = 'PH001', hint = 'expiry_required', detail = v_item.name;
  end if;

  perform set_config('pharmacy.movement_kind', 'opening', true);
  perform set_config('pharmacy.movement_note', coalesce(btrim(coalesce(p_note, '')), ''), true);

  insert into public.pharmacy_batches as b (
    tenant_id, item_id, batch_number, quantity, unit_cost, expiry_date, location, supplier_id
  )
  values (
    v_tenant, v_item.id, v_number, p_quantity,
    greatest(coalesce(p_unit_cost, v_item.cost_price, 0), 0),
    p_expiry_date, coalesce(nullif(btrim(coalesce(p_location, '')), ''), 'Main'), p_supplier_id
  )
  on conflict (item_id, lower(btrim(batch_number)))
  do update set quantity    = b.quantity + excluded.quantity,
                expiry_date = coalesce(excluded.expiry_date, b.expiry_date),
                location    = excluded.location
  returning b.id into v_batch;

  perform set_config('pharmacy.movement_kind', '', true);
  perform set_config('pharmacy.movement_note', '', true);

  return v_batch;
end;
$$;

-- Sets what is really on the shelf for one batch, and says why it differs.
-- p_quantity is the new count, not the difference.
create or replace function public.pharmacy_adjust_stock(
  p_batch_id uuid,
  p_quantity integer,
  p_reason   text,
  p_note     text default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tenant uuid := public.pharmacy_staff_tenant();
  v_batch  public.pharmacy_batches;
begin
  if p_reason is null or p_reason not in ('adjustment', 'damaged', 'expired', 'lost') then
    raise exception 'Pick a reason for the change.'
      using errcode = 'PH001', hint = 'bad_reason';
  end if;

  if p_quantity is null or p_quantity < 0 then
    raise exception 'Enter the quantity that is on the shelf now.'
      using errcode = 'PH001', hint = 'bad_quantity';
  end if;

  select * into v_batch from public.pharmacy_batches b where b.id = p_batch_id for update;

  if not found then
    raise exception 'That batch could not be found.'
      using errcode = 'PH001', hint = 'batch_not_found';
  end if;

  if p_quantity = v_batch.quantity then
    raise exception 'That is the quantity already recorded.'
      using errcode = 'PH001', hint = 'no_change';
  end if;

  -- Damaged, expired and lost stock only ever goes down.
  if p_reason <> 'adjustment' and p_quantity > v_batch.quantity then
    raise exception 'A write-off cannot add stock. Use a correction instead.'
      using errcode = 'PH001', hint = 'write_off_adds';
  end if;

  perform set_config('pharmacy.movement_kind', p_reason, true);
  perform set_config('pharmacy.movement_note', coalesce(btrim(coalesce(p_note, '')), ''), true);

  update public.pharmacy_batches set quantity = p_quantity where id = v_batch.id;

  perform set_config('pharmacy.movement_kind', '', true);
  perform set_config('pharmacy.movement_note', '', true);

  return p_quantity;
end;
$$;

-- --------------------------------------------------------------- grants ---
-- Supabase grants execute on new functions to anon as well as to public.
-- Every one of these refuses a caller without a pharmacy role, so anon could
-- do nothing with them, but it has no business being offered them either.
do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.pharmacy_staff_tenant()',
    'public.pharmacy_next_number(uuid, text)',
    'public.pharmacy_shift_balance(uuid)',
    'public.pharmacy_create_sale(jsonb, text, numeric, numeric, uuid, text, text, text, text)',
    'public.pharmacy_return_sale(uuid, jsonb, text, text, boolean, text)',
    'public.pharmacy_collect_payment(uuid, numeric, text, text)',
    'public.pharmacy_create_purchase_order(uuid, jsonb, date, text, numeric, numeric)',
    'public.pharmacy_receive_purchase_order(uuid, jsonb)',
    'public.pharmacy_cancel_purchase_order(uuid)',
    'public.pharmacy_pay_purchase_order(uuid, numeric)',
    'public.pharmacy_open_shift(numeric)',
    'public.pharmacy_close_shift(numeric, text, uuid)',
    'public.pharmacy_cash_move(text, numeric, text, text)',
    'public.pharmacy_remove_cash_transaction(uuid)',
    'public.pharmacy_add_stock(uuid, text, integer, date, text, numeric, uuid, text)',
    'public.pharmacy_adjust_stock(uuid, integer, text, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', v_fn);
    execute format('grant execute on function %s to authenticated', v_fn);
  end loop;
end;
$$;
