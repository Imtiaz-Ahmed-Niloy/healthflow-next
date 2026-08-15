-- 0008_hospitals.sql
-- Turns `tenants` into the full hospital record behind /super/hospitals.
--
-- Context: the table now holds EVERY hospital in Bangladesh, not only paying
-- customers. Most rows are directory data. `status` is what separates a plain
-- directory entry from an approved partner, and only approved rows are visible
-- publicly (see the view at the bottom).
--
-- No RLS work here: the `tenants` policies in 0002 are already correct and
-- hand-written, because this table is scoped by `id`, not `tenant_id`.
-- `apply_tenant_rls()` would refuse it for exactly that reason.

-- ---------------------------------------------------------------- status ---
-- 'active' -> 'approved'. Only seed.sql and the generated types referenced the
-- old spelling, both updated in this PR. Gives pending / approved / suspended.

alter type public.tenant_status rename value 'active' to 'approved';

-- --------------------------------------------------------------- columns ---
-- Every form field becomes a real typed column, so it stays filterable and
-- sortable through createResourceRoute (which builds .eq()/.ilike() against
-- top-level columns only). The two exceptions are arrays of objects.

alter table public.tenants
  -- directory
  add column tagline           text,
  add column location          text,
  add column region            text,
  add column division          text,
  add column district          text,
  add column subdistrict       text,
  add column cover_image_url   text,

  -- scale
  add column beds              integer,
  add column doctor_count      integer,
  add column founded_year      integer,
  add column rating            numeric(2,1),
  add column reviews_count     integer,

  -- descriptive
  add column specialties       text,
  add column certifications    text,
  add column opening_hours     text,
  add column facilities        text,
  add column awards            text,
  add column summary           text,
  add column about             text,

  -- contact. `contact_email` / `contact_phone` (0001) stay the canonical single
  -- values — provisioning sends credentials there. These are the extra ones the
  -- form collects.
  add column additional_phones text[]  not null default '{}',
  add column additional_emails text[]  not null default '{}',
  add column websites          text[]  not null default '{}',
  -- array of { platform, url } — no scalar column holds that
  add column social            jsonb   not null default '[]'::jsonb,

  -- registration / licences
  add column tin               text,
  add column bin               text,
  add column trade_license     text,
  add column operating_license text,
  add column other_licenses    text,

  -- owner
  add column owner_name        text,
  add column ownership_type    text,
  add column owner_nid         text,
  add column owner_email       text,
  add column owner_phone       text,
  add column owner_address     text,
  add column owner_since       date,

  -- management body
  add column chairman          text,
  add column ceo               text,
  add column medical_director  text,
  -- array of { name, role, phone, email }
  add column management_body   jsonb   not null default '[]'::jsonb,
  add column board_notes       text;

-- numeric(2,1) alone would silently accept 9.9 as a rating out of 5.
alter table public.tenants
  add constraint tenants_rating_range check (rating is null or rating between 0 and 5);

-- ---------------------------------------------------------------- indexes ---
-- `trade_license` is NOT NOT-NULL on purpose: a future bulk import of the
-- national hospital directory will have rows without one, and the existing seed
-- tenant has none. The form requires it via Zod instead. The partial unique
-- index still stops the same hospital being entered twice.
create unique index tenants_trade_license_key
  on public.tenants (trade_license)
  where trade_license is not null;

create index tenants_division_idx on public.tenants (division);
create index tenants_district_idx on public.tenants (district);

-- ------------------------------------------------------------------ slug ---
-- `slug` is not null unique and the form has no field for it. The resource
-- factory inserts the parsed body verbatim with no hook for a derived column,
-- so deriving it here keeps the factory untouched for every other module — and
-- keeps working for a bulk import that never touches the API.
--
-- Mirrors src/lib/slug.ts: lowercase, non-alphanumerics to '-', trim dashes.
-- BEFORE INSERT runs ahead of the not-null check, so the constraint holds.
--
-- The collision loop reads `tenants` as the invoker, so RLS applies. That is
-- fine for the two roles that actually insert — super_admin (sees everything)
-- and the service-role client used for imports (bypasses RLS). If a role with a
-- narrower view ever inserts, it could pick a slug it cannot see, and the unique
-- constraint would reject it with 23505 — a loud failure, not silent corruption.

create or replace function public.tenants_set_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_base      text;
  v_candidate text;
  v_n         integer := 1;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  v_base := trim(both '-' from regexp_replace(lower(coalesce(new.name, '')), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then
    v_base := 'hospital';
  end if;

  v_candidate := v_base;
  while exists (select 1 from public.tenants where slug = v_candidate) loop
    v_n := v_n + 1;
    v_candidate := v_base || '-' || v_n;
  end loop;

  new.slug := v_candidate;
  return new;
end;
$$;

create trigger tenants_set_slug_trigger
  before insert on public.tenants
  for each row execute function public.tenants_set_slug();

-- ------------------------------------------------------------ public view ---
-- The public site reads this, never `tenants` directly.
--
-- THE COLUMN LIST IS THE SECURITY BOUNDARY. `tenants` now holds owner_nid, tin,
-- bin and trade_license. An anonymous `select *` on the base table would publish
-- national ID and licence numbers, so anon is never granted the base table —
-- only this projection. Do not add a column here without asking whether it is
-- safe to show the entire internet.
--
-- Deliberately NOT security_invoker. The view runs as its owner and does the
-- filtering itself, so no role needs select on `tenants` for this to work.
--
-- security_invoker = true was tried and is wrong here, for two reasons:
--   1. anon would need a select policy on `tenants`, and RLS is row-level, not
--      column-level — an approved row would expose owner_nid/tin/bin to anyone
--      who queried the base table directly.
--   2. authenticated already has a narrower policy (own hospital only, 0002),
--      so a logged-in patient would see ZERO hospitals in the public listing.
--      Widening that policy to all approved rows would leak the same columns to
--      every signed-in user, and column grants cannot express "all columns for
--      my own hospital, six columns for everyone else's".
--
-- This trips Supabase's `security_definer_view` advisor. That is expected and
-- correct here: the view IS the access-control boundary for public data, which
-- is the pattern that warning exists to make you think about.

create view public.hospitals_public as
  select
    id,
    name,
    slug,
    tagline,
    location,
    division,
    district,
    subdistrict,
    logo_url,
    cover_image_url,
    specialties,
    facilities,
    opening_hours,
    summary,
    about,
    beds,
    doctor_count,
    founded_year,
    rating,
    reviews_count,
    created_at
  from public.tenants
  where status = 'approved';

grant select on public.hospitals_public to anon, authenticated;

-- No policy is added to `public.tenants` for anon, on purpose. Direct anonymous
-- access to the base table stays denied; the view is the only public door.
