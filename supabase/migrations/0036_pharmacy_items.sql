-- 0036_pharmacy_items.sql
-- The pharmacy items inventory table behind /admin/pharmacy, which until now
-- kept its demo items in localStorage under storeKey "pharmacy".
--
-- Tenant-scoped: each hospital maintains its own pharmacy inventory, stock
-- levels, and reorder thresholds.

create table public.pharmacy_items (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,

  sku        text not null
               constraint pharmacy_items_sku_check check (length(btrim(sku)) > 0),
  name       text not null
               constraint pharmacy_items_name_check check (length(btrim(name)) > 0),

  -- Stored lowercase to match doctors, nurses, support staff, lab tests and
  -- assets. The page maps these to display labels; nothing user-facing reads
  -- the stored value directly.
  category   text
               constraint pharmacy_items_category_check check (category in ('analgesic', 'antibiotic', 'endocrine', 'cardio', 'vitamins')),

  stock      integer not null default 0
               constraint pharmacy_items_stock_check check (stock >= 0),

  reorder    integer not null default 0
               constraint pharmacy_items_reorder_check check (reorder >= 0),

  -- Stored lowercase, same as every other module's status column.
  status     text not null default 'active'
               constraint pharmacy_items_status_check check (status in ('active', 'low_stock', 'out_of_stock')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pharmacy_items_tenant_id_idx on public.pharmacy_items (tenant_id);

-- A hospital cannot have the same SKU registered multiple times.
create unique index pharmacy_items_tenant_sku_key
  on public.pharmacy_items (tenant_id, lower(btrim(sku)));

create trigger pharmacy_items_set_updated_at
  before update on public.pharmacy_items
  for each row execute function public.set_updated_at();

-- Apply RLS
select public.apply_tenant_rls('public.pharmacy_items');
