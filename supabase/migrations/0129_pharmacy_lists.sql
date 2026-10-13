-- 0129_pharmacy_lists.sql
-- Two things the pharmacy's list pages filter on that a plain column could
-- not answer.

-- The hospital's own calendar day a sale was made on. `sold_at` is a moment,
-- and "today's sales" asked of it in UTC would start six hours late in Dhaka.
-- Set once, when the sale is made, so the sales list, its date filter and the
-- reports all agree on which day a sale belongs to.
alter table public.pharmacy_sales
  add column sale_date date not null default public.pharmacy_today();

create index pharmacy_sales_tenant_date_idx on public.pharmacy_sales (tenant_id, sale_date desc);

-- A batch with its product's name beside it, and whether it is still good.
-- The stock page searches by product name and filters by state, and neither
-- is on pharmacy_batches itself.
--
-- Same shape as pharmacy_customers_overview (0126): one table underneath and
-- sub-selects in the list, so a batch's own columns — expiry, shelf, cost —
-- can still be saved through this name. security_invoker keeps the caller's
-- RLS on every table it reads.
create view public.pharmacy_batches_overview
with (security_invoker = true)
as
select
  b.*,
  (select i.name          from public.pharmacy_items i where i.id = b.item_id) as item_name,
  (select i.sku           from public.pharmacy_items i where i.id = b.item_id) as sku,
  (select i.generic_name  from public.pharmacy_items i where i.id = b.item_id) as generic_name,
  (select i.category      from public.pharmacy_items i where i.id = b.item_id) as category,
  (select i.reorder       from public.pharmacy_items i where i.id = b.item_id) as reorder,
  (select i.selling_price from public.pharmacy_items i where i.id = b.item_id) as selling_price,
  (select s.name from public.pharmacy_suppliers s where s.id = b.supplier_id) as supplier_name,
  (b.expiry_date - public.pharmacy_today()) as days_left,
  case
    when b.quantity <= 0 then 'empty'
    when b.expiry_date is not null and b.expiry_date < public.pharmacy_today() then 'expired'
    when b.expiry_date is not null
     and b.expiry_date <= public.pharmacy_today()
                          + coalesce((select st.expiring_soon_days from public.pharmacy_settings st
                                       where st.tenant_id = b.tenant_id), 90) then 'expiring_soon'
    else 'ok'
  end as state
from public.pharmacy_batches b;
