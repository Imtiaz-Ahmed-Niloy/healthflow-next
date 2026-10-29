-- 0142_global_settings_support_phone_2.sql
-- A second public contact number, set from /super/global-settings beside the
-- first (0104), and shown under it in the website footer.
--
-- Same rules as support_phone: loose on format, digits and separators only,
-- readable by signed-out visitors through global_settings_read, and audited by
-- the trigger 0058 already put on this table.

alter table public.global_settings
  add column support_phone_2 text
    constraint global_settings_support_phone_2_check
    check (support_phone_2 is null or support_phone_2 ~ '^\+?[0-9 ()-]{6,24}$');

-- HealthFlow's second line.
update public.global_settings set support_phone_2 = '+8809612567890' where singleton;
