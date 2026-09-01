-- 0057_global_settings.sql
-- The platform's own defaults, for /super/global-settings.
--
-- The screen was a mock: uncontrolled inputs over hardcoded strings, a Save
-- button that only raised a toast, five feature flags rendered as pills with
-- nothing behind them, and a "Compliance & Region" card claiming a us-east-1
-- data residency, GDPR mode and HIPAA logging — none of which this product has
-- or, for a Bangladeshi hospital platform on Supabase, should claim. Nothing
-- on it was true and nothing on it saved.
--
-- What replaces it is only what can actually take effect: the defaults every
-- screen formats dates, times and money with, and a maintenance notice. A
-- setting that changes nothing is worse than no setting, because someone will
-- eventually trust it.
--
-- These are DEFAULTS, not policy. `src/lib/appSettings.ts` layers them under
-- whatever a user has chosen for themselves in Settings, so changing the
-- platform's timezone moves everyone who never picked one and nobody who did.

create table public.global_settings (
  id uuid primary key default gen_random_uuid(),

  -- One row, forever. The column exists to carry the constraint that says so:
  -- `unique` allows a single true, and the check forbids false, so a second
  -- row cannot be inserted at all rather than being inserted and ignored.
  singleton boolean not null default true unique
              constraint global_settings_one_row check (singleton),

  -- IANA name. Not constrained against pg_timezone_names: that catalogue is
  -- not immutable, so it cannot appear in a check. The API validates against
  -- the list the picker offers, which is the list a super admin can send.
  timezone     text not null default 'Asia/Dhaka'
                 constraint global_settings_timezone_check
                 check (length(btrim(timezone)) > 0),

  language     text not null default 'en'
                 constraint global_settings_language_check
                 check (language in ('en', 'bn')),

  currency     text not null default 'BDT'
                 constraint global_settings_currency_check
                 check (currency in ('USD', 'BDT', 'GBP')),

  -- Token formats, matching what appSettings.formatDate understands. Stored as
  -- the token string rather than a name, so nothing has to translate between
  -- "short" and what it actually renders.
  date_format  text not null default 'DD MMM YYYY'
                 constraint global_settings_date_format_check
                 check (date_format in ('MMM DD, YYYY', 'DD MMM YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')),

  time_format  text not null default '12h'
                 constraint global_settings_time_format_check
                 check (time_format in ('12h', '24h')),

  -- Shown on the maintenance notice, so people have somewhere to go while a
  -- panel is down. Null is allowed: better no address than a wrong one.
  support_email text
                 constraint global_settings_support_email_check
                 check (support_email is null or support_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),

  -- A notice, not a lock. It puts a banner on every panel; it does not sign
  -- anyone out or refuse a request, and the screen says so rather than letting
  -- someone believe they have closed the doors.
  maintenance_mode    boolean not null default false,
  maintenance_message text
                 constraint global_settings_maintenance_message_check
                 check (maintenance_message is null or length(maintenance_message) <= 500),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger global_settings_set_updated_at
  before update on public.global_settings
  for each row execute function public.set_updated_at();

-- The row itself. Everything below reads it, so it exists from the start
-- rather than being created by whoever opens the screen first — an app whose
-- defaults depend on someone having visited a settings page has no defaults.
insert into public.global_settings (timezone, language, currency, date_format, time_format, support_email)
values ('Asia/Dhaka', 'en', 'BDT', 'DD MMM YYYY', '12h', 'care@healthflowbd.com');

-- ---------------------------------------------------------------- rls ---
-- Readable by everyone, including signed-out visitors: these are a timezone, a
-- currency and a maintenance notice, and the public site formats dates too.
-- Writable by super_admin alone.

alter table public.global_settings enable row level security;

create policy global_settings_read on public.global_settings
  for select to anon, authenticated
  using (true);

create policy global_settings_write on public.global_settings
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());
