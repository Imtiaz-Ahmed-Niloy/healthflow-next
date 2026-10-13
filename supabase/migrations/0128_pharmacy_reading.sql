-- 0128_pharmacy_reading.sql
-- What the pharmacy panel reads that is not a plain list: the till's product
-- search, the alerts, the dashboard, the reports and the forecast.
--
-- These are functions rather than queries from the route for one reason:
-- PostgREST stops at 1,000 rows, and a month of sales is more than that. A
-- total added up in the browser from the first thousand rows is a wrong
-- total that looks right.
--
-- All SECURITY INVOKER and all read-only, so each answers from exactly the
-- rows the caller's own policies let them see: their hospital's, if they are
-- its admin, its pharmacy or its finance desk, and nothing for anyone else.
--
-- "Revenue" everywhere here is what a sale came to less what was returned
-- from it, counted on the day of the sale.

-- ---------------------------------------------------------- at the till ---
-- What can be sold right now. `sellable` leaves expired batches out, which
-- pharmacy_items.stock does not: that one is what is physically on the shelf.
-- With nothing typed, what has been selling comes first.
create or replace function public.pharmacy_pos_items(
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
  sold_recent           integer
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
         coalesce(st.sellable, 0), st.next_expiry, coalesce(r.sold, 0)
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

-- The categories in use, for a filter and for the product form's suggestions.
create or replace function public.pharmacy_categories()
returns text[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(distinct btrim(i.category) order by btrim(i.category)), '{}')
    from public.pharmacy_items i
   where i.category is not null and btrim(i.category) <> ''
$$;

-- --------------------------------------------------------------- alerts ---
-- Two lists. `stock` is per product: nothing left to sell, or at or under its
-- reorder level. `batches` is per batch: past its date, or within the
-- hospital's "expiring soon" window of it.
create or replace function public.pharmacy_stock_alerts()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with cfg as (
    select public.pharmacy_today() as today,
           coalesce((select s.expiring_soon_days from public.pharmacy_settings s
                      where s.tenant_id = public.auth_tenant_id()), 90) as days
  ),
  sellable as (
    select b.item_id, sum(b.quantity)::integer as qty
      from public.pharmacy_batches b, cfg
     where b.quantity > 0 and (b.expiry_date is null or b.expiry_date >= cfg.today)
     group by b.item_id
  ),
  low as (
    select i.id, i.sku, i.name, i.generic_name, i.category, i.reorder,
           coalesce(s.qty, 0) as quantity,
           case when coalesce(s.qty, 0) <= 0 then 'out_of_stock' else 'low_stock' end as kind
      from public.pharmacy_items i
      left join sellable s on s.item_id = i.id
     where i.is_active and coalesce(s.qty, 0) <= i.reorder
     order by coalesce(s.qty, 0), i.name
     limit 500
  ),
  dated as (
    select b.id, b.item_id, i.sku, i.name, i.generic_name, b.batch_number, b.quantity,
           b.expiry_date, b.location, (b.expiry_date - cfg.today) as days_left,
           case when b.expiry_date < cfg.today then 'expired' else 'expiring_soon' end as kind
      from public.pharmacy_batches b
      join public.pharmacy_items i on i.id = b.item_id, cfg
     where b.quantity > 0
       and b.expiry_date is not null
       and b.expiry_date <= cfg.today + cfg.days
     order by b.expiry_date, i.name
     limit 500
  )
  select jsonb_build_object(
    'expiring_soon_days', (select days from cfg),
    'stock',   coalesce((select jsonb_agg(to_jsonb(l) order by l.quantity, l.name) from low l), '[]'::jsonb),
    'batches', coalesce((select jsonb_agg(to_jsonb(d) order by d.expiry_date, d.name) from dated d), '[]'::jsonb)
  )
$$;

-- ------------------------------------------------------------ dashboard ---
create or replace function public.pharmacy_dashboard()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with cfg as (
    select public.pharmacy_tz() as tz,
           public.pharmacy_today() as today,
           date_trunc('month', public.pharmacy_today()::timestamp)::date as month_start,
           date_trunc('year', public.pharmacy_today()::timestamp)::date as year_start,
           coalesce((select s.expiring_soon_days from public.pharmacy_settings s
                      where s.tenant_id = public.auth_tenant_id()), 90) as days
  ),
  -- Since the start of the year, or of last month if that is earlier: in
  -- January "last month" is the year before.
  sales as (
    select s.id, s.customer_id, s.payment_method, s.discount, s.tax, s.total_amount,
           s.total_amount - s.refunded_amount as net,
           (s.sold_at at time zone cfg.tz)::date as day,
           extract(hour from s.sold_at at time zone cfg.tz)::integer as hr
      from public.pharmacy_sales s, cfg
     where s.sold_at >= (least(cfg.year_start, (cfg.month_start - interval '1 month')::date)::timestamp at time zone cfg.tz)
  ),
  lines as (
    select s.day, si.item_name,
           (si.quantity - si.returned_quantity) as qty,
           (si.quantity - si.returned_quantity) * si.unit_price as revenue,
           (si.quantity - si.returned_quantity) * si.unit_cost as cost
      from public.pharmacy_sale_items si
      join sales s on s.id = si.sale_id
  ),
  agg as (
    select
      coalesce(sum(s.net) filter (where s.day = cfg.today), 0) as today_revenue,
      count(*) filter (where s.day = cfg.today) as today_count,
      coalesce(sum(s.net) filter (where s.day = cfg.today - 1), 0) as yesterday_revenue,
      coalesce(sum(s.net) filter (where s.day >= cfg.month_start), 0) as month_revenue,
      coalesce(sum(s.tax * case when s.total_amount > 0 then s.net / s.total_amount else 1 end)
                 filter (where s.day >= cfg.month_start), 0) as month_tax,
      coalesce(sum(s.net) filter (where s.day < cfg.month_start
                                    and s.day >= (cfg.month_start - interval '1 month')::date), 0) as last_month_revenue,
      coalesce(sum(s.net) filter (where s.day >= cfg.year_start), 0) as year_revenue,
      coalesce(sum(s.net) filter (where s.day > cfg.today - 7), 0) as week_revenue,
      coalesce(sum(s.net) filter (where s.day = cfg.today and s.payment_method = 'credit'), 0) as today_credit,
      count(*) filter (where s.day = cfg.today and s.payment_method = 'credit') as today_credit_count,
      count(distinct s.customer_id) filter (where s.day = cfg.today and s.customer_id is not null) as today_customers,
      coalesce(sum(s.discount * case when s.total_amount > 0 then s.net / s.total_amount else 1 end)
                 filter (where s.day = cfg.today), 0) as today_discount
    from sales s, cfg
  ),
  line_agg as (
    select
      coalesce(sum(l.qty) filter (where l.day = cfg.today), 0) as today_units,
      coalesce(sum(l.revenue) filter (where l.day = cfg.today), 0) as today_goods,
      coalesce(sum(l.cost) filter (where l.day = cfg.today), 0) as today_cost
    from lines l, cfg
  ),
  on_shelf as (
    select b.item_id, b.quantity, b.unit_cost, b.expiry_date, i.selling_price
      from public.pharmacy_batches b
      join public.pharmacy_items i on i.id = b.item_id
     where b.quantity > 0
  ),
  sellable as (
    select o.item_id, sum(o.quantity)::integer as qty
      from on_shelf o, cfg
     where o.expiry_date is null or o.expiry_date >= cfg.today
     group by o.item_id
  ),
  item_state as (
    select i.id, i.name, i.generic_name, i.reorder, coalesce(s.qty, 0) as qty
      from public.pharmacy_items i
      left join sellable s on s.item_id = i.id
     where i.is_active
  ),
  owed as (
    select s.customer_id, greatest(s.total_amount - s.refunded_amount - s.paid_amount, 0) as due
      from public.pharmacy_sales s
     where s.payment_status <> 'paid'
  )
  select jsonb_build_object(
    'today', (
      select jsonb_build_object(
        'date', cfg.today,
        'revenue', a.today_revenue,
        'transactions', a.today_count,
        'units', la.today_units,
        'gross_profit', la.today_goods - a.today_discount - la.today_cost,
        'margin', case when la.today_goods - a.today_discount > 0
                       then round((la.today_goods - a.today_discount - la.today_cost) / (la.today_goods - a.today_discount) * 100, 1)
                       else 0 end,
        'avg_basket', case when a.today_count > 0 then round(a.today_revenue / a.today_count, 2) else 0 end,
        'customers', a.today_customers,
        'credit_amount', a.today_credit,
        'credit_count', a.today_credit_count
      )
      from agg a, line_agg la, cfg
    ),
    'yesterday', (select jsonb_build_object('revenue', a.yesterday_revenue) from agg a),
    'month', (
      select jsonb_build_object(
        'revenue', a.month_revenue,
        'tax', round(a.month_tax, 2),
        'last_month_revenue', a.last_month_revenue,
        'expenses', coalesce((select sum(e.amount) from public.pharmacy_expenses e where e.expense_date >= cfg.month_start), 0)
      )
      from agg a, cfg
    ),
    'year', (select jsonb_build_object('revenue', a.year_revenue) from agg a),
    'week', (select jsonb_build_object('revenue', a.week_revenue) from agg a),
    'customers', (
      select jsonb_build_object(
        'total', (select count(*) from public.pharmacy_customers),
        'new_this_month', (select count(*) from public.pharmacy_customers c
                            where (c.created_at at time zone cfg.tz)::date >= cfg.month_start),
        'with_balance', (select count(distinct o.customer_id) from owed o where o.due > 0 and o.customer_id is not null),
        'balance_due', coalesce((select sum(o.due) from owed o), 0)
      )
      from cfg
    ),
    'purchase_orders', jsonb_build_object(
      'open', (select count(*) from public.pharmacy_purchase_orders o where o.status in ('ordered', 'partial'))
    ),
    'inventory', (
      select jsonb_build_object(
        'products', (select count(*) from public.pharmacy_items i where i.is_active),
        'units', coalesce((select sum(o.quantity) from on_shelf o), 0),
        'value_retail', coalesce((select sum(o.quantity * o.selling_price) from on_shelf o), 0),
        'value_cost', coalesce((select sum(o.quantity * o.unit_cost) from on_shelf o), 0)
      )
    ),
    'alerts', (
      select jsonb_build_object(
        'out_of_stock', (select count(*) from item_state s where s.qty <= 0),
        'low_stock', (select count(*) from item_state s where s.qty > 0 and s.qty <= s.reorder),
        'expiring', (select count(*) from on_shelf o
                      where o.expiry_date is not null and o.expiry_date >= cfg.today and o.expiry_date <= cfg.today + cfg.days),
        'expired', (select count(*) from on_shelf o where o.expiry_date is not null and o.expiry_date < cfg.today),
        'expiring_soon_days', cfg.days
      )
      from cfg
    ),
    'trend', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'day', d.day,
               'revenue', coalesce(t.revenue, 0),
               'transactions', coalesce(t.n, 0)) order by d.day), '[]'::jsonb)
        from (select cfg.today - 13 + g.n as day from cfg cross join generate_series(0, 13) as g(n)) d
        left join (select s.day, sum(s.net) as revenue, count(*) as n from sales s group by s.day) t on t.day = d.day
    ),
    'payment_mix', (
      select coalesce(jsonb_agg(jsonb_build_object('method', m.payment_method, 'revenue', m.revenue, 'count', m.n)
                                order by m.revenue desc), '[]'::jsonb)
        from (select s.payment_method, sum(s.net) as revenue, count(*) as n
                from sales s, cfg where s.day = cfg.today group by s.payment_method) m
    ),
    'hourly', (
      select coalesce(jsonb_agg(jsonb_build_object('hour', h.hr, 'revenue', coalesce(t.revenue, 0)) order by h.hr), '[]'::jsonb)
        from generate_series(0, 23) as h(hr)
        left join (select s.hr, sum(s.net) as revenue from sales s, cfg where s.day = cfg.today group by s.hr) t on t.hr = h.hr
    ),
    'top_sellers', (
      select coalesce(jsonb_agg(jsonb_build_object('name', t.item_name, 'quantity', t.qty, 'revenue', t.revenue)
                                order by t.revenue desc), '[]'::jsonb)
        from (select l.item_name, sum(l.qty) as qty, sum(l.revenue) as revenue
                from lines l, cfg
               where l.day > cfg.today - 7
               group by l.item_name
              having sum(l.qty) > 0
               order by sum(l.revenue) desc
               limit 5) t
    ),
    'recent_sales', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.sold_at desc), '[]'::jsonb)
        from (select s.id, s.invoice_number, s.total_amount, s.sold_at, s.created_by_name as cashier, s.status,
                     (select string_agg(x.quantity || '× ' || x.item_name, ', ')
                        from (select si.item_name, sum(si.quantity) as quantity
                                from public.pharmacy_sale_items si where si.sale_id = s.id
                               group by si.item_name order by si.item_name) x) as items
                from public.pharmacy_sales s
               order by s.sold_at desc
               limit 5) r
    ),
    'stock_watch', (
      select coalesce(jsonb_agg(to_jsonb(w)), '[]'::jsonb)
        from (
          (select s.name, s.generic_name, s.qty as quantity, s.reorder, null::date as expiry_date,
                  case when s.qty <= 0 then 'out_of_stock' else 'low_stock' end as kind
             from item_state s
            where s.qty <= s.reorder
            order by s.qty, s.name
            limit 4)
          union all
          (select i.name, i.generic_name, b.quantity, i.reorder, b.expiry_date,
                  case when b.expiry_date < cfg.today then 'expired' else 'expiring_soon' end as kind
             from public.pharmacy_batches b
             join public.pharmacy_items i on i.id = b.item_id, cfg
            where b.quantity > 0 and b.expiry_date is not null and b.expiry_date <= cfg.today + cfg.days
            order by b.expiry_date
            limit 4)
        ) w
    ),
    'drawer', (
      select jsonb_build_object('id', s.id, 'opened_at', s.opened_at, 'balance', public.pharmacy_shift_balance(s.id))
        from public.pharmacy_cash_shifts s
       where s.opened_by = (select auth.uid()) and s.status = 'open'
       limit 1
    )
  )
$$;

-- -------------------------------------------------------------- reports ---
-- Everything the reports page shows for a span of days, both ends included.
create or replace function public.pharmacy_report(p_from date, p_to date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with cfg as (
    select public.pharmacy_tz() as tz,
           public.pharmacy_today() as today,
           least(p_from, p_to) as d_from,
           greatest(p_from, p_to) as d_to,
           coalesce((select s.expiring_soon_days from public.pharmacy_settings s
                      where s.tenant_id = public.auth_tenant_id()), 90) as days
  ),
  sales as (
    select s.id, s.customer_id, s.payment_method, s.subtotal, s.discount, s.tax, s.total_amount,
           s.refunded_amount, s.created_by_name,
           s.total_amount - s.refunded_amount as net,
           case when s.total_amount > 0 then (s.total_amount - s.refunded_amount) / s.total_amount else 1 end as kept,
           (s.sold_at at time zone cfg.tz)::date as day
      from public.pharmacy_sales s, cfg
     where s.sold_at >= (cfg.d_from::timestamp at time zone cfg.tz)
       and s.sold_at <  ((cfg.d_to + 1)::timestamp at time zone cfg.tz)
  ),
  lines as (
    select si.item_id, si.item_name, si.sku, coalesce(nullif(btrim(si.category), ''), '—') as category,
           (si.quantity - si.returned_quantity) as qty,
           (si.quantity - si.returned_quantity) * si.unit_price as revenue,
           (si.quantity - si.returned_quantity) * si.unit_cost as cost,
           coalesce(i.requires_prescription, false) as rx
      from public.pharmacy_sale_items si
      join sales s on s.id = si.sale_id
      left join public.pharmacy_items i on i.id = si.item_id
  ),
  totals as (
    select
      coalesce(sum(s.net), 0) as revenue,
      coalesce(sum(s.subtotal * s.kept), 0) as subtotal,
      coalesce(sum(s.discount * s.kept), 0) as discount,
      coalesce(sum(s.tax * s.kept), 0) as tax,
      coalesce(sum(s.refunded_amount), 0) as refunds,
      count(*) as transactions,
      count(*) filter (where s.refunded_amount > 0) as returned_count,
      coalesce(sum(s.net) filter (where s.payment_method = 'credit'), 0) as credit_sales,
      coalesce(sum(s.net) filter (where s.customer_id is not null), 0) as customer_sales,
      coalesce(sum(s.net) filter (where s.customer_id is null), 0) as walk_in_sales
    from sales s
  ),
  line_totals as (
    select coalesce(sum(l.qty), 0) as units,
           coalesce(sum(l.revenue), 0) as goods,
           coalesce(sum(l.cost), 0) as cost,
           coalesce(sum(l.revenue) filter (where l.rx), 0) as prescription_sales
      from lines l
  ),
  spent as (
    select coalesce(nullif(btrim(e.category), ''), '—') as category, sum(e.amount) as amount
      from public.pharmacy_expenses e, cfg
     where e.expense_date between cfg.d_from and cfg.d_to
     group by 1
  ),
  on_shelf as (
    select b.item_id, b.quantity, b.unit_cost, b.expiry_date, i.selling_price
      from public.pharmacy_batches b
      join public.pharmacy_items i on i.id = b.item_id
     where b.quantity > 0
  ),
  sellable as (
    select o.item_id, sum(o.quantity)::integer as qty
      from on_shelf o, cfg
     where o.expiry_date is null or o.expiry_date >= cfg.today
     group by o.item_id
  ),
  item_state as (
    select i.id, i.reorder, coalesce(s.qty, 0) as qty
      from public.pharmacy_items i
      left join sellable s on s.item_id = i.id
     where i.is_active
  )
  select jsonb_build_object(
    'from', (select d_from from cfg),
    'to', (select d_to from cfg),
    'summary', (
      select jsonb_build_object(
        'revenue', t.revenue,
        'subtotal', round(t.subtotal, 2),
        'discount', round(t.discount, 2),
        'tax', round(t.tax, 2),
        'refunds', t.refunds,
        'returned_count', t.returned_count,
        'transactions', t.transactions,
        'units', lt.units,
        'gross_profit', round(lt.goods - t.discount - lt.cost, 2),
        'margin', case when lt.goods - t.discount > 0
                       then round((lt.goods - t.discount - lt.cost) / (lt.goods - t.discount) * 100, 1) else 0 end,
        'avg_ticket', case when t.transactions > 0 then round(t.revenue / t.transactions, 2) else 0 end,
        'expenses', coalesce((select sum(sp.amount) from spent sp), 0),
        'net', t.revenue - coalesce((select sum(sp.amount) from spent sp), 0),
        'credit_sales', t.credit_sales,
        'customer_sales', t.customer_sales,
        'walk_in_sales', t.walk_in_sales,
        'prescription_sales', lt.prescription_sales,
        'purchases', coalesce((select sum(o.total_amount) from public.pharmacy_purchase_orders o, cfg
                                where o.status <> 'cancelled' and o.order_date between cfg.d_from and cfg.d_to), 0)
      )
      from totals t, line_totals lt
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'day', d.day, 'revenue', coalesce(x.revenue, 0), 'transactions', coalesce(x.n, 0)) order by d.day), '[]'::jsonb)
        from (select cfg.d_from + g.n as day
                from cfg cross join lateral generate_series(0, least(cfg.d_to - cfg.d_from, 400)) as g(n)) d
        left join (select s.day, sum(s.net) as revenue, count(*) as n from sales s group by s.day) x on x.day = d.day
    ),
    'payment_mix', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'method', m.payment_method, 'revenue', m.revenue, 'count', m.n,
               'avg', case when m.n > 0 then round(m.revenue / m.n, 2) else 0 end) order by m.revenue desc), '[]'::jsonb)
        from (select s.payment_method, sum(s.net) as revenue, count(*) as n from sales s group by s.payment_method) m
    ),
    'by_category', (
      select coalesce(jsonb_agg(jsonb_build_object('category', c.category, 'revenue', c.revenue, 'quantity', c.qty)
                                order by c.revenue desc), '[]'::jsonb)
        from (select l.category, sum(l.revenue) as revenue, sum(l.qty) as qty
                from lines l group by l.category having sum(l.qty) > 0
               order by sum(l.revenue) desc limit 12) c
    ),
    'top_products', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'name', p.item_name, 'sku', p.sku, 'quantity', p.qty, 'revenue', p.revenue, 'profit', p.revenue - p.cost)
               order by p.revenue desc), '[]'::jsonb)
        from (select l.item_name, max(l.sku) as sku, sum(l.qty) as qty, sum(l.revenue) as revenue, sum(l.cost) as cost
                from lines l group by l.item_name having sum(l.qty) > 0
               order by sum(l.revenue) desc limit 20) p
    ),
    'cashiers', (
      select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'revenue', c.revenue, 'count', c.n)
                                order by c.revenue desc), '[]'::jsonb)
        from (select coalesce(s.created_by_name, '—') as name, sum(s.net) as revenue, count(*) as n
                from sales s group by 1) c
    ),
    'expenses_by_category', (
      select coalesce(jsonb_agg(jsonb_build_object('category', sp.category, 'amount', sp.amount)
                                order by sp.amount desc), '[]'::jsonb)
        from spent sp
    ),
    'inventory', (
      select jsonb_build_object(
        'products', (select count(*) from public.pharmacy_items i where i.is_active),
        'units', coalesce((select sum(o.quantity) from on_shelf o), 0),
        'value_retail', coalesce((select sum(o.quantity * o.selling_price) from on_shelf o), 0),
        'value_cost', coalesce((select sum(o.quantity * o.unit_cost) from on_shelf o), 0),
        'out_of_stock', (select count(*) from item_state s where s.qty <= 0),
        'low_stock', (select count(*) from item_state s where s.qty > 0 and s.qty <= s.reorder),
        'expiring', (select count(*) from on_shelf o
                      where o.expiry_date is not null and o.expiry_date >= cfg.today and o.expiry_date <= cfg.today + cfg.days),
        'expired', (select count(*) from on_shelf o where o.expiry_date is not null and o.expiry_date < cfg.today)
      )
      from cfg
    )
  )
$$;

-- ------------------------------------------------------------- insights ---
-- The forecast is arithmetic, and says so on the page: what sold in the last
-- thirty days, divided by thirty, against what is left to sell.
--
--   days_to_stockout   stock / daily demand; null when nothing has sold
--   trend              the last week's daily rate against the three before
--   suggested          enough to cover thirty days, when under fourteen
--
-- `flags` are things worth a second look, each counted from rows:
-- stock that has not moved in ninety days, a week far above a product's
-- usual, a product that keeps coming back, a price under its cost, stock
-- past its date still on the shelf, and drawers that did not add up.
create or replace function public.pharmacy_insights()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with cfg as (
    select public.pharmacy_today() as today
  ),
  sellable as (
    select b.item_id, sum(b.quantity)::integer as qty, min(b.received_at) as first_received
      from public.pharmacy_batches b, cfg
     where b.quantity > 0 and (b.expiry_date is null or b.expiry_date >= cfg.today)
     group by b.item_id
  ),
  sold as (
    select si.item_id,
           sum(si.quantity - si.returned_quantity) filter (where s.sold_at >= now() - interval '7 days') as d7,
           sum(si.quantity - si.returned_quantity) filter (where s.sold_at >= now() - interval '30 days') as d30,
           sum(si.quantity - si.returned_quantity) filter (where s.sold_at >= now() - interval '35 days'
                                                           and s.sold_at < now() - interval '7 days') as prior28,
           sum(si.quantity - si.returned_quantity) as d90,
           sum(si.quantity) filter (where s.sold_at >= now() - interval '30 days') as gross30,
           sum(si.returned_quantity) filter (where s.sold_at >= now() - interval '30 days') as returned30
      from public.pharmacy_sale_items si
      join public.pharmacy_sales s on s.id = si.sale_id
     where s.sold_at >= now() - interval '90 days'
     group by si.item_id
  ),
  last_supplier as (
    select distinct on (b.item_id) b.item_id, b.supplier_id, sp.name as supplier_name
      from public.pharmacy_batches b
      join public.pharmacy_suppliers sp on sp.id = b.supplier_id
     where sp.status = 'active'
     order by b.item_id, b.received_at desc
  ),
  items as (
    select i.id, i.sku, i.name, i.generic_name, i.selling_price, i.cost_price, i.reorder,
           coalesce(st.qty, 0) as stock, st.first_received,
           coalesce(so.d7, 0) as d7, coalesce(so.d30, 0) as d30, coalesce(so.prior28, 0) as prior28,
           coalesce(so.d90, 0) as d90, coalesce(so.gross30, 0) as gross30, coalesce(so.returned30, 0) as returned30,
           ls.supplier_id, ls.supplier_name
      from public.pharmacy_items i
      left join sellable st on st.item_id = i.id
      left join sold so on so.item_id = i.id
      left join last_supplier ls on ls.item_id = i.id
     where i.is_active
  ),
  forecast as (
    select f.*,
           case when f.daily > 0 then floor(f.stock / f.daily)::integer end as days_to_stockout,
           case
             when f.daily > 0 and f.stock / f.daily < 14 then greatest(ceil(f.daily * 30)::integer - f.stock, 0)
             else 0
           end as suggested
      from (
        select it.id as item_id, it.sku, it.name, it.generic_name, it.stock, it.reorder,
               it.d30 as sold_30, round(it.d30 / 30.0, 2) as daily,
               case
                 when it.d30 = 0 then 'none'
                 when it.d7 / 7.0 > (it.d30 - it.d7) / 23.0 * 1.25 then 'up'
                 when it.d7 / 7.0 < (it.d30 - it.d7) / 23.0 * 0.75 then 'down'
                 else 'flat'
               end as trend,
               it.cost_price as unit_cost, it.supplier_id, it.supplier_name
          from items it
         where it.d30 > 0 or it.stock > 0
      ) f
  ),
  dead as (
    select it.name, it.sku, it.stock as quantity, it.stock * it.cost_price as value
      from items it
     where it.stock > 0 and it.d90 = 0 and it.first_received < now() - interval '30 days'
  ),
  spikes as (
    select it.name, it.sku, it.d7 as quantity, round(it.prior28 / 4.0, 1) as usual
      from items it
     -- With nothing sold in the weeks before, a first week is not a spike.
     where it.d7 >= 5 and it.prior28 > 0 and it.d7 > it.prior28 / 4.0 * 2
  ),
  bounced as (
    select it.name, it.sku, it.returned30 as quantity, it.gross30 as sold
      from items it
     where it.returned30 >= 3 and it.returned30 > it.gross30 * 0.2
  ),
  under_cost as (
    select it.name, it.sku, it.selling_price as price, it.cost_price as cost
      from items it
     where it.cost_price > 0 and it.selling_price < it.cost_price
  ),
  thin as (
    select it.name, it.sku, it.selling_price as price, it.cost_price as cost,
           round((it.selling_price - it.cost_price) / nullif(it.selling_price, 0) * 100, 1) as margin, it.d90 as sold
      from items it
     where it.cost_price > 0 and it.selling_price >= it.cost_price
       and (it.selling_price - it.cost_price) / nullif(it.selling_price, 0) < 0.1
  ),
  expired as (
    select i.name, i.sku, b.batch_number, b.quantity, b.expiry_date, b.quantity * b.unit_cost as value
      from public.pharmacy_batches b
      join public.pharmacy_items i on i.id = b.item_id, cfg
     where b.quantity > 0 and b.expiry_date is not null and b.expiry_date < cfg.today
  ),
  drawers as (
    select s.opened_by_name as cashier, s.closed_at, s.expected_balance as expected,
           s.closing_balance as counted, s.discrepancy
      from public.pharmacy_cash_shifts s
     where s.status = 'closed' and s.closed_at >= now() - interval '30 days' and coalesce(s.discrepancy, 0) <> 0
  )
  select jsonb_build_object(
    'forecast', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select * from forecast f
         order by f.days_to_stockout nulls last, f.sold_30 desc, f.name
         limit 300
      ) x), '[]'::jsonb),
    'flags', (
      select coalesce(jsonb_agg(f.flag order by f.rank), '[]'::jsonb)
        from (
          select 1 as rank, jsonb_build_object(
                   'type', 'expired_stock', 'severity', 'high',
                   'count', (select count(*) from expired),
                   'value', coalesce((select sum(e.value) from expired e), 0),
                   'rows', coalesce((select jsonb_agg(to_jsonb(e)) from (select * from expired order by expiry_date limit 20) e), '[]'::jsonb)) as flag
           where exists (select 1 from expired)
          union all
          select 2, jsonb_build_object(
                   'type', 'under_cost', 'severity', 'high',
                   'count', (select count(*) from under_cost),
                   'rows', coalesce((select jsonb_agg(to_jsonb(u)) from (select * from under_cost order by name limit 20) u), '[]'::jsonb))
           where exists (select 1 from under_cost)
          union all
          select 3, jsonb_build_object(
                   'type', 'cash_discrepancy',
                   'severity', case when exists (select 1 from drawers d where d.discrepancy < 0) then 'high' else 'low' end,
                   'count', (select count(*) from drawers),
                   'value', coalesce((select sum(d.discrepancy) from drawers d), 0),
                   'rows', coalesce((select jsonb_agg(to_jsonb(d)) from (select * from drawers order by closed_at desc limit 20) d), '[]'::jsonb))
           where exists (select 1 from drawers)
          union all
          select 4, jsonb_build_object(
                   'type', 'dead_stock', 'severity', 'medium',
                   'count', (select count(*) from dead),
                   'value', coalesce((select sum(d.value) from dead d), 0),
                   'rows', coalesce((select jsonb_agg(to_jsonb(d)) from (select * from dead order by value desc limit 20) d), '[]'::jsonb))
           where exists (select 1 from dead)
          union all
          select 5, jsonb_build_object(
                   'type', 'frequent_returns', 'severity', 'medium',
                   'count', (select count(*) from bounced),
                   'rows', coalesce((select jsonb_agg(to_jsonb(b)) from (select * from bounced order by quantity desc limit 20) b), '[]'::jsonb))
           where exists (select 1 from bounced)
          union all
          select 6, jsonb_build_object(
                   'type', 'thin_margin', 'severity', 'low',
                   'count', (select count(*) from thin),
                   'rows', coalesce((select jsonb_agg(to_jsonb(t)) from (select * from thin order by margin limit 20) t), '[]'::jsonb))
           where exists (select 1 from thin)
          union all
          select 7, jsonb_build_object(
                   'type', 'sales_spike', 'severity', 'low',
                   'count', (select count(*) from spikes),
                   'rows', coalesce((select jsonb_agg(to_jsonb(s)) from (select * from spikes order by quantity desc limit 20) s), '[]'::jsonb))
           where exists (select 1 from spikes)
        ) f
    )
  )
$$;

-- --------------------------------------------------------------- grants ---
do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.pharmacy_pos_items(text, text, integer)',
    'public.pharmacy_categories()',
    'public.pharmacy_stock_alerts()',
    'public.pharmacy_dashboard()',
    'public.pharmacy_report(date, date)',
    'public.pharmacy_insights()'
  ] loop
    execute format('revoke execute on function %s from public, anon', v_fn);
    execute format('grant execute on function %s to authenticated', v_fn);
  end loop;
end;
$$;
