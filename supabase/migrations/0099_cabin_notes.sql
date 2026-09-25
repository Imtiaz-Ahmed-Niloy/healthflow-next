-- 0099: cabin notes.
--
-- The Add/Edit Cabin form on /admin/wards gets a Notes field, same as wards
-- already has (0017_wards_beds.sql). Free text, nothing reads it structurally.

alter table public.cabins add column notes text;
