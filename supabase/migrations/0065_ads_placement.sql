-- 0065_ads_placement.sql
-- Generalises 0064. That table was `signin_ads`, and its name was a promise
-- that this would only ever be the sign-in page — but the same cards belong on
-- the home page and inside the portals sooner or later, and a second table per
-- surface would mean a second super admin screen per surface too.
--
-- One table, `ads`, with a `placement` saying where each card goes. `side` and
-- `position` keep their meaning WITHIN a placement.
--
-- The placement is an enum rather than free text on purpose. A new value is
-- not just data: something has to render it, so adding one is a migration
-- alongside the code that draws it — which is exactly the moment to think
-- about it.

alter table public.signin_ads rename to ads;

create type public.ad_placement as enum ('signin');

alter table public.ads
  add column placement public.ad_placement not null default 'signin';

-- The four seeded cards were sign-in cards, which is what the default gives
-- them; nothing to backfill.

drop index if exists public.signin_ads_slot_idx;
create index ads_slot_idx on public.ads (placement, side, position);

alter index if exists signin_ads_pkey rename to ads_pkey;
alter table public.ads rename constraint signin_ads_badge_tone_check to ads_badge_tone_check;
alter table public.ads rename constraint signin_ads_title_check     to ads_title_check;
alter table public.ads rename constraint signin_ads_window_check    to ads_window_check;

alter trigger signin_ads_set_updated_at on public.ads rename to ads_set_updated_at;

alter policy signin_ads_public_read  on public.ads rename to ads_public_read;
alter policy signin_ads_super_read   on public.ads rename to ads_super_read;
alter policy signin_ads_super_insert on public.ads rename to ads_super_insert;
alter policy signin_ads_super_update on public.ads rename to ads_super_update;
alter policy signin_ads_super_delete on public.ads rename to ads_super_delete;

-- The audit trigger needs nothing: attach_audit names it `audit_log` on every
-- table (0058), so the rename carried it across intact, and what it RECORDS is
-- read from the table at write time. Rows written from here on say `ads`; the
-- four inserts from 0064 still say `signin_ads`, because that is what the table
-- was called when they happened. An audit trail is not rewritten to match a
-- later rename.

comment on column public.ads.placement is
  'Where the card is shown. Adding a value means writing the code that renders it.';
