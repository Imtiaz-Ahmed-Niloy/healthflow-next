-- 0123_profiles_language.sql
-- A person's language follows their account, not just their browser.
--
-- The language was only ever a cookie (src/i18n), so someone who picked Bangla
-- at the hospital's front desk got the platform default again on their own
-- laptop. The switchers now write it here as well, and signing in on a new
-- machine reads it back.
--
-- Null means "never picked": the cookie, and under it the platform default
-- (global_settings.language), still decide. Nothing is backfilled, because
-- nobody has chosen anything yet as far as the database knows.
--
-- No new policy. profiles_update_self (0002) already lets a person change
-- their own row and profiles_guard_privileged_columns leaves this column
-- alone; the check is what keeps a hand-written PATCH to 'en' or 'bn'.

alter table public.profiles
  add column language text
    constraint profiles_language_check
    check (language in ('en', 'bn'));
