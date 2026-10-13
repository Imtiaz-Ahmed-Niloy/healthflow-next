-- 0135_pharmacy_notifications_profile_pages.sql
-- Two more screens in the pharmacy panel: the alert inbox and a person's own
-- profile. Neither has a table of its own. Notifications are worked out from
-- pharmacy_stock_alerts each time they are read, and the profile is the
-- person's own row in profiles, which they could already update (0002).
--
-- All this does is add the two pages to the list the pharmacy_admin role is
-- shown in the role editor.
update public.roles
   set pages = pages || array['/pharmacy/notifications', '/pharmacy/profile']
 where role = 'pharmacy_admin' and tenant_id is null
   and not pages @> array['/pharmacy/notifications'];
