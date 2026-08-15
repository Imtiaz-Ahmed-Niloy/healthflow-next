-- 0010_package_management.sql
-- Everything behind /super/package-management.
--
-- Three parts:
--   1. seed public.packages — the plan catalogue, created empty by 0001
--   2. public.offers            — discount codes
--   3. public.hospital_packages — which plan a hospital is on, at what price
--
-- `packages` already holds the catalogue and `tenants.package_id` already
-- records which plan a hospital is on. What neither can express is the
-- commercial detail around that choice: a negotiated price, a discount, a
-- billing cycle, a renewal date. hospital_packages carries those, and
-- tenants.package_id stays as the cheap answer to "which plan?" that the
-- dashboard already reads.

-- ------------------------------------------------------------ catalogue ---
-- Mirrors defaultPricing.plans in src/data/pricing.ts, which is what the
-- pricing page and this screen showed before either had a database behind it.
--
-- Idempotent on slug: this is reference data, and re-running the migration
-- must not duplicate a plan or overwrite a price that has since been edited
-- through the UI.

insert into public.packages (name, slug, description, price_monthly, max_users, features)
values
  ('Basic', 'basic', 'Essential care for individuals.', 10, 5,
   '{"storage_gb": 5, "support": "email", "ai_insights": "standard"}'::jsonb),
  ('Professional', 'professional', 'Complete restorative solution.', 30, 25,
   '{"storage_gb": 20, "support": "priority_24_7", "ai_insights": "predictive"}'::jsonb),
  ('Enterprise', 'enterprise', 'Scaleable care for teams.', 50, null,
   '{"storage_gb": null, "support": "dedicated", "ai_insights": "custom", "api_access": true}'::jsonb)
on conflict (slug) do nothing;

-- --------------------------------------------------------------- offers ---
-- Global, like packages: an offer is a platform-wide campaign, not something
-- one hospital owns.

create table public.offers (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  label        text not null default '',
  discount_pct numeric(5,2) not null default 0
                 constraint offers_discount_pct_check check (discount_pct >= 0 and discount_pct <= 100),

  -- null means every plan. A reference rather than a plan name, so renaming a
  -- plan cannot silently detach the offers that pointed at it.
  package_id   uuid references public.packages (id) on delete cascade,

  valid_until  date,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index offers_package_id_idx on public.offers (package_id);
create index offers_active_idx     on public.offers (active);

create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

-- Any signed-in user may read the catalogue of offers; only super_admin edits.
-- Matches the packages policy in 0002 — a hospital admin has to be able to see
-- the discount applied to their own bill.
alter table public.offers enable row level security;

create policy offers_select on public.offers
  for select to authenticated
  using (true);

create policy offers_write on public.offers
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- --------------------------------------------------- hospital packages ---
-- One row per hospital: the plan it is on and the commercial terms.

create table public.hospital_packages (
  id            uuid primary key default gen_random_uuid(),

  -- Unique: a hospital is on one plan at a time. History belongs in a billing
  -- ledger, which does not exist yet; this table is current state only.
  tenant_id     uuid not null unique references public.tenants (id) on delete cascade,

  -- restrict, not cascade: deleting a plan that hospitals are still paying for
  -- should fail loudly rather than quietly unsubscribe them.
  package_id    uuid not null references public.packages (id) on delete restrict,

  -- Copied from packages.price_monthly when the plan is assigned, then
  -- editable. A negotiated price has to survive a change to the list price.
  base_price    numeric(10,2) not null default 0
                  constraint hospital_packages_base_price_check check (base_price >= 0),

  discount_pct  numeric(5,2) not null default 0
                  constraint hospital_packages_discount_pct_check
                  check (discount_pct >= 0 and discount_pct <= 100),

  -- Which offer produced the discount, when one did. set null on delete: the
  -- agreed discount stays, the campaign it came from does not have to.
  offer_id      uuid references public.offers (id) on delete set null,

  billing_cycle text not null default 'monthly'
                  constraint hospital_packages_billing_cycle_check
                  check (billing_cycle in ('monthly', 'yearly')),

  status        text not null default 'active'
                  constraint hospital_packages_status_check
                  check (status in ('active', 'trial', 'suspended', 'expired')),

  start_date    date not null default current_date,
  renew_date    date,
  notes         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint hospital_packages_renew_after_start
    check (renew_date is null or renew_date >= start_date)
);

-- tenant_id is unique and indexed by that constraint; these two are not.
create index hospital_packages_package_id_idx on public.hospital_packages (package_id);
create index hospital_packages_offer_id_idx   on public.hospital_packages (offer_id);
create index hospital_packages_status_idx     on public.hospital_packages (status);

create trigger hospital_packages_set_updated_at
  before update on public.hospital_packages
  for each row execute function public.set_updated_at();

-- Hand-written rather than apply_tenant_rls, and NOT because this table is
-- global — it does carry tenant_id and the template would apply cleanly.
--
-- The template grants a hospital write access to its own rows. Here that would
-- let a hospital_admin set their own discount to 100%. Read is tenant-scoped
-- as usual; write is super_admin only.
alter table public.hospital_packages enable row level security;

create policy hospital_packages_select on public.hospital_packages
  for select to authenticated
  using (public.is_super_admin() or tenant_id = public.auth_tenant_id());

create policy hospital_packages_write on public.hospital_packages
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Keeps tenants.package_id — read by the dashboard and by every "which plan is
-- this hospital on?" query — in step with the assignment made here, so the two
-- cannot disagree.
create or replace function public.hospital_packages_sync_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.tenants set package_id = null where id = old.tenant_id;
    return old;
  end if;

  -- An assignment moved to a different hospital. Without this the hospital it
  -- left keeps a package_id it is no longer paying for.
  if tg_op = 'UPDATE' and old.tenant_id is distinct from new.tenant_id then
    update public.tenants set package_id = null where id = old.tenant_id;
  end if;

  update public.tenants set package_id = new.package_id where id = new.tenant_id;
  return new;
end;
$$;

create trigger hospital_packages_sync_tenant
  after insert or update or delete on public.hospital_packages
  for each row execute function public.hospital_packages_sync_tenant();
