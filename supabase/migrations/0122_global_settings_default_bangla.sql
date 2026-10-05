-- 0122_global_settings_default_bangla.sql
-- Bangla is the platform's default language.
--
-- DEFAULT_LOCALE in src/i18n/config.ts is what the server renders for a
-- browser with no language cookie, but PlatformSettings then applies this row
-- on top of it. Left at 'en', the row would flip every first-time visitor
-- back to English a moment after the Bangla page arrived — so the two move
-- together. Anyone who already picked a language keeps their cookie.

alter table public.global_settings alter column language set default 'bn';

update public.global_settings set language = 'bn' where language = 'en';
