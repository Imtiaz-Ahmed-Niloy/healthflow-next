-- 0064_signin_ads.sql
-- The promotional cards either side of the sign-in form.
--
-- They were four objects in src/views/SignIn.tsx — VitaBoost Pro, NeuroPlus,
-- EcoSanit Max, SleepWell Mist — so changing a promotion meant a code change
-- and a deploy. This is the table behind /super/ads, and the sign-in page
-- renders whatever is in it.
--
-- Platform-level, not tenant-scoped: /signin is one page for everybody, and it
-- is reached before anyone has a hospital. Same shape as `packages` and the
-- system `roles`, and like them it gets hand-written policies rather than the
-- tenant template, which refuses a table with no tenant_id.

create type public.ad_side as enum ('left', 'right');

create table public.signin_ads (
  id           uuid primary key default gen_random_uuid(),

  side         public.ad_side not null,
  -- Order within a column. Not a unique constraint: two ads sharing a slot is
  -- untidy, not broken, and a unique index would make reordering a dance of
  -- temporary values.
  position     integer not null default 0,

  -- The little pill over the image: "SPONSORED", "NEW ARRIVAL". Optional —
  -- an ad without one simply shows no pill.
  badge        text,
  badge_tone   text not null default 'primary'
                 constraint signin_ads_badge_tone_check
                 check (badge_tone in ('primary', 'accent', 'destructive', 'muted')),

  title        text not null
                 constraint signin_ads_title_check check (length(btrim(title)) > 0),
  body         text,

  -- An R2 object key, or one of the bundled /assets paths the seeded four use.
  -- Never a data URL: see src/lib/media.ts.
  image_url    text,

  -- Where the card goes when clicked. Null means it is not clickable.
  link_url     text,

  active       boolean not null default true,

  -- An optional run window. A promotion that ends on a date should stop
  -- showing on that date without anybody remembering to switch it off.
  starts_on    date,
  ends_on      date,
  constraint signin_ads_window_check check (ends_on is null or starts_on is null or ends_on >= starts_on),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index signin_ads_slot_idx on public.signin_ads (side, position);

create trigger signin_ads_set_updated_at
  before update on public.signin_ads
  for each row execute function public.set_updated_at();

alter table public.signin_ads enable row level security;

/**
 * Anyone may read a LIVE ad — the sign-in page is public and is read before
 * anybody has signed in, so anon has to see these.
 *
 * "Live" is part of the policy rather than only a query filter, so a draft or
 * an expired promotion cannot be pulled out of PostgREST directly with the
 * publishable key that ships in the browser bundle. What is not live is not
 * public.
 */
create policy signin_ads_public_read on public.signin_ads
  for select
  to anon, authenticated
  using (
    active
    and (starts_on is null or starts_on <= current_date)
    and (ends_on is null or ends_on >= current_date)
  );

/** A super admin sees every row, live or not — that is the point of the page. */
create policy signin_ads_super_read on public.signin_ads
  for select to authenticated using (public.is_super_admin());

create policy signin_ads_super_insert on public.signin_ads
  for insert to authenticated with check (public.is_super_admin());

create policy signin_ads_super_update on public.signin_ads
  for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy signin_ads_super_delete on public.signin_ads
  for delete to authenticated using (public.is_super_admin());

-- Marketing copy on the front door of the platform: worth knowing who changed
-- it and when. No personal data here, so the values are captured too.
select public.attach_audit('public.signin_ads', true);

-- The four that were hardcoded, so the page looks the same the moment this
-- lands and there is something to edit rather than an empty table.
insert into public.signin_ads (side, position, badge, badge_tone, title, body, image_url) values
  ('left',  1, 'SPONSORED',     'primary',     'VitaBoost Pro',
   'Advanced multivitamin complex for daily performance and immunity support.',
   '/assets/product-vitamin.jpg'),
  ('left',  2, 'NEW ARRIVAL',   'primary',     'EcoSanit Max',
   'Eco-friendly medical grade sanitization for healthcare professionals.',
   '/assets/product-sanitizer.jpg'),
  ('right', 1, 'LIMITED OFFER', 'destructive', 'NeuroPlus',
   'Nootropic formulation for enhanced cognitive focus and mental clarity.',
   '/assets/product-brain.jpg'),
  ('right', 2, 'HEALTH TIP',    'accent',      'SleepWell Mist',
   'Calming lavender and melatonin pillow spray for restorative sleep cycles.',
   '/assets/product-mist.jpg');
