-- 0030_vendors.sql
-- The table behind /admin/vendors, which until now kept its four demo suppliers
-- in localStorage under storeKey "vendors" — so every hospital saw the same
-- fake list and nothing an admin typed survived a refresh.
--
-- Vendors are the suppliers behind procurement: medical consumables, reagents,
-- stationery, furniture. They attach to nothing but the tenant. Purchase orders
-- and stock will reference this table when those modules land; keeping it a
-- plain tenant-scoped list now means those can add their own foreign keys
-- without reshaping anything here.

create table public.vendors (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,

  name           text not null
                   constraint vendors_name_check check (length(btrim(name)) > 0),

  -- Free text, unlike support_staff.department in 0015. A hospital's supplier
  -- categories are its own commercial vocabulary — "Imaging Reagents" matters
  -- to one buyer and means nothing to the next — so there is no closed list
  -- worth agreeing on here, and a check constraint would only cost a migration
  -- every time procurement met a new kind of supplier.
  category       text,

  -- The human you actually call at the supplier, not a user of this system.
  -- Deliberately not a profile reference: vendor staff never sign in.
  contact_person text,

  phone          text,
  email          text
                   constraint vendors_email_check
                   check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),

  -- Nullable on purpose: a vendor added today has not been rated yet, and
  -- defaulting that to any number would invent a judgement nobody made.
  -- numeric(2,1) matches the form's 0.1 step; the check keeps it on 1-5.
  rating         numeric(2,1)
                   constraint vendors_rating_check
                   check (rating is null or (rating >= 1 and rating <= 5)),

  -- Vendor lifecycle, not staff lifecycle — 'on_hold' rather than the staff
  -- modules' 'on_leave'. Suspended means struck off; on hold means paused
  -- mid-relationship, which is the state procurement actually uses most.
  status         text not null default 'active'
                   constraint vendors_status_check
                   check (status in ('active', 'on_hold', 'suspended')),

  notes          text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index vendors_tenant_id_idx on public.vendors (tenant_id);
create index vendors_status_idx    on public.vendors (tenant_id, status);

create trigger vendors_set_updated_at
  before update on public.vendors
  for each row execute function public.set_updated_at();

-- The entire security story for this table.
select public.apply_tenant_rls('public.vendors');
