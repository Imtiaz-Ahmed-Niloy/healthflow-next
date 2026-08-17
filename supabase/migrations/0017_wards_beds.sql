-- 0008_wards_beds.sql
-- Ward pricing/category config, and the physical beds that belong to a ward.
-- Bundled in one migration because beds cannot exist without wards (FK) and
-- the two ship as a single feature. CABINS (0009) is deliberately NOT part of
-- this file — it's a separate product with its own rate/attributes, not a
-- kind of ward.
--
-- Column names mirror src/views/admin/Wards.tsx's existing mock shapes
-- exactly (WardConfigRow -> wards, BedRow -> beds), per module-guide.md:
-- "your column and field names must be the database's names."

create type public.ward_category as enum ('general', 'semi_private', 'icu', 'maternity', 'pediatric');
create type public.bed_type      as enum ('general', 'icu', 'cabin');
create type public.bed_status    as enum ('available', 'occupied', 'cleaning');

-- ---------------------------------------------------------------- wards ---
-- One row per ward *type* (e.g. "ICU", "Maternity") — pricing and facility
-- config, not a physical bed. Mirrors WardConfigRow in Wards.tsx.

create table public.wards (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  name           text not null,
  category       public.ward_category not null default 'general',
  daily_rate     numeric(10, 2) not null default 0 check (daily_rate >= 0),
  nursing_charge numeric(10, 2) not null default 0 check (nursing_charge >= 0),
  facilities     text[] not null default '{}'::text[],
  notes          text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Two wards sharing a name in one hospital is a data-entry mistake, not a
  -- real case to accommodate (unlike doctors, where two "Dr Rahman"s
  -- legitimately coexist) — so a plain unique constraint, no slug needed.
  constraint wards_tenant_name_unique unique (tenant_id, name)
);

create index wards_tenant_id_idx on public.wards (tenant_id);
create index wards_category_idx  on public.wards (tenant_id, category);

create trigger wards_set_updated_at
  before update on public.wards
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.wards');

-- ----------------------------------------------------------------- beds ---
-- Physical inventory, one row per bed, child of a ward config. Mirrors
-- BedRow in Wards.tsx.

create table public.beds (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  -- restrict, not cascade: deleting a ward config shouldn't silently vaporize
  -- bed inventory — an admin must reassign or remove the beds first.
  ward_id uuid not null references public.wards (id) on delete restrict,

  number text not null,
  type   public.bed_type   not null default 'general',
  status public.bed_status not null default 'available',

  -- Transitional: mirrors the mock's free-text occupant field. There is no
  -- real occupancy model yet — that lands with admissions/bed_stays in a
  -- later migration. Drop this column once that ships and the frontend stops
  -- writing to it directly.
  patient text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint beds_ward_number_unique unique (ward_id, number)
);

create index beds_tenant_id_idx on public.beds (tenant_id);
create index beds_ward_id_idx   on public.beds (ward_id);
create index beds_status_idx    on public.beds (tenant_id, status);

create trigger beds_set_updated_at
  before update on public.beds
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.beds');
