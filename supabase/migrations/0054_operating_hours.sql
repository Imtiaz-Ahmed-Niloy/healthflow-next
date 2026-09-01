-- 0054_operating_hours.sql
-- `tenants.opening_hours` becomes structured data.
--
-- It was `text`, and what people typed into it was a sentence: "Mon – Fri 9:00
-- AM – 9:00 PM · Sat – Sun 10:00 AM – 6:00 PM · Emergency 24 Hours". A sentence
-- cannot answer "is this hospital open now?", cannot be grouped, and cannot be
-- edited by anything but a free-text box.
--
-- The editor (/super/hospitals) now writes one value covering all seven days,
-- and this is where it lands. Shape, in full:
--
--   {
--     "sun": { "mode": "hours", "open": "09:00", "close": "17:00" },
--     "fri": { "mode": "closed" },
--     "sat": { "mode": "24h" }
--   }
--
-- Each day carries a MODE rather than only a pair of times, because "closed"
-- and "open around the clock" are not times. Encoding them as 00:00–00:00 is
-- how a hospital ends up claiming to be shut and open at once.
--
-- See src/lib/hours.ts, which holds the same rules in TypeScript.

-- ---------------------------------------------------------------------------
-- 1. What counts as a valid week.
--
-- A function rather than an inline check: the expression is long, it is wanted
-- on `doctors` too when consultation hours get the same treatment, and a check
-- constraint nobody can read is a check constraint nobody will maintain.

create or replace function public.is_operating_hours(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $fn$
  select
    -- null is "no hours recorded", which is different from "closed", and both
    -- are legitimate.
    p_value is null
    or (
      jsonb_typeof(p_value) = 'object'
      -- Only the seven day keys, nothing else smuggled alongside them.
      and not exists (
        select 1 from jsonb_object_keys(p_value) as k(key)
        where k.key not in ('sun','mon','tue','wed','thu','fri','sat')
      )
      -- At least one day, or it is an empty object pretending to be a week.
      and exists (select 1 from jsonb_object_keys(p_value))
      -- And every day present must itself be well formed.
      and not exists (
        select 1
        from jsonb_each(p_value) as d(key, value)
        where not (
          jsonb_typeof(d.value) = 'object'
          and (
            d.value ->> 'mode' in ('closed', '24h')
            or (
              d.value ->> 'mode' = 'hours'
              -- 24-hour HH:MM, both ends required.
              and d.value ->> 'open'  ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
              and d.value ->> 'close' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
            )
          )
        )
      )
    );
$fn$;

comment on function public.is_operating_hours(jsonb) is
  'True when the value is a well-formed weekly operating-hours object. See supabase/migrations/0054_operating_hours.sql and src/lib/hours.ts.';

-- ---------------------------------------------------------------------------
-- 2. The view has to go first.
--
-- Postgres refuses to change the type of a column a view selects, so
-- hospitals_public is dropped and rebuilt below, unchanged apart from
-- opening_hours now being jsonb. Recreated verbatim from 0035.

drop view if exists public.hospitals_public;

-- ---------------------------------------------------------------------------
-- 3. Convert, translating what can be translated.
--
-- Two distinct strings existed across all 21 hospitals, and both were seed
-- placeholders rather than anything a hospital told us:
--
--   "24/7"
--     Means something exact, so it survives: every day, 24 hours.
--
--   "Mon – Fri 9:00 AM – 9:00 PM · Sat – Sun 10:00 AM – 6:00 PM · Emergency
--    24 Hours"
--     The same invented sentence on eighteen different hospitals. Converting it
--     would turn a placeholder into structured data that reads as fact — a
--     schedule nobody ever confirmed, now precise enough to be believed. It
--     becomes null: "we do not know this hospital's hours", which is true.
--
-- Anything already holding a JSON object (nothing does today, but a row written
-- between this being written and applied would) is cast across as-is.

alter table public.tenants
  alter column opening_hours type jsonb
  using (
    case
      when opening_hours is null or btrim(opening_hours) = '' then null
      when btrim(opening_hours) = '24/7' then
        jsonb_build_object(
          'sun', jsonb_build_object('mode','24h'),
          'mon', jsonb_build_object('mode','24h'),
          'tue', jsonb_build_object('mode','24h'),
          'wed', jsonb_build_object('mode','24h'),
          'thu', jsonb_build_object('mode','24h'),
          'fri', jsonb_build_object('mode','24h'),
          'sat', jsonb_build_object('mode','24h')
        )
      when btrim(opening_hours) like '{%' then btrim(opening_hours)::jsonb
      else null
    end
  );

alter table public.tenants
  add constraint tenants_opening_hours_check
  check (public.is_operating_hours(opening_hours));

comment on column public.tenants.opening_hours is
  'Weekly operating hours, one object keyed by day. See 0054_operating_hours.sql.';

-- ---------------------------------------------------------------------------
-- 4. Rebuild the public view.
--
-- Same columns, same order, same filter as 0035, and deliberately the same
-- security too: NO security_invoker, exactly as it was before this migration.
--
-- That is what lets a signed-out visitor read it. The view runs as its owner,
-- so RLS on `tenants` — which requires super_admin or a matching tenant_id —
-- does not apply, and the public hospital pages work. Adding security_invoker
-- here would blank every one of them.
--
-- Supabase's advisor flags this view for that reason and Ridwan has seen it;
-- fixing it properly means giving anon its own policy on tenants, which is a
-- deliberate decision with its own ticket. Quietly changing it inside a
-- migration about opening hours is exactly how that decision gets made by
-- accident.

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
    address,
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
    contact_phone,
    contact_email,
    additional_phones,
    additional_emails,
    websites,
    social,
    created_at
  from public.tenants
  where status = 'approved';

grant select on public.hospitals_public to anon, authenticated;
