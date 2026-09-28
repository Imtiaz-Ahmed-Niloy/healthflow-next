-- 0104_global_settings_support_phone.sql
-- The public contact number, set from /super/global-settings.
--
-- The footer's phone used to be a constant in src/constants/brand.ts, so
-- changing it meant a code change and a deploy. It now lives on the platform
-- row beside support_email, readable by signed-out visitors through the
-- existing global_settings_read policy, and audited by the trigger 0058
-- already put on this table.
--
-- Loose on format on purpose: people write numbers with spaces, dashes and a
-- leading +, and the footer prints it as typed. Only digits and those
-- separators are allowed, so it can never carry markup or a URL.

alter table public.global_settings
  add column support_phone text
    constraint global_settings_support_phone_check
    check (support_phone is null or support_phone ~ '^\+?[0-9 ()-]{6,24}$');

-- What the footer showed until now, so nothing changes until someone edits it.
update public.global_settings set support_phone = '+880 0000000000' where singleton;
