-- 0009_cabins.sql
-- Private cabins — a separate product from wards/beds (its own floor,
-- capacity, amenities and rate), not a child of any ward. See the ERD
-- discussion for why this is its own table rather than folded into `beds`:
-- doing so would mean a pile of nullable columns that only apply to one
-- shape or the other.
--
-- Column names mirror src/views/admin/Wards.tsx's CabinRow exactly, per
-- module-guide.md, with one rename: `rate` -> `daily_rate`, matching the same
-- rename already made on `wards` (and doctors.ts's own "fee" ->
-- "consultation_fee" precedent) for naming consistency across the ward
-- domain.

create type public.cabin_category as enum ('standard', 'deluxe', 'premium', 'suite');
create type public.cabin_status   as enum ('available', 'occupied', 'cleaning', 'maintenance', 'reserved');

create table public.cabins (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  number     text not null,
  category   public.cabin_category not null default 'standard',
  floor      text not null,
  capacity   integer not null default 1 check (capacity > 0),
  daily_rate numeric(10, 2) not null default 0 check (daily_rate >= 0),
  amenities  text[] not null default '{}'::text[],
  status     public.cabin_status not null default 'available',

  -- Transitional: mirrors the mock's free-text occupant/attendant/admission
  -- fields, same rationale as beds.patient in 0008_wards_beds.sql. Dropped
  -- once admissions/bed_stays lands and the frontend stops writing to these
  -- directly.
  patient     text,
  attendant   text,
  admitted_on date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cabins_tenant_number_unique unique (tenant_id, number)
);

create index cabins_tenant_id_idx on public.cabins (tenant_id);
create index cabins_status_idx    on public.cabins (tenant_id, status);

create trigger cabins_set_updated_at
  before update on public.cabins
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.cabins');
