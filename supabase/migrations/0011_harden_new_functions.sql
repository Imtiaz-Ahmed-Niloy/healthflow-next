-- 0011_harden_new_functions.sql
-- Closes the linter warnings raised by the three trigger functions added in
-- 0009 and 0010, exactly as 0004 did for 0001-0003.
--
-- All three are SECURITY DEFINER, and PostgREST exposes every function in the
-- public schema at /rest/v1/rpc/<name>. Postgres refuses to run a trigger
-- function called directly, so the practical reach is nil — but an endpoint
-- that only ever returns an error is still an endpoint, and 0004 set the
-- convention that these are revoked rather than explained away.
--
-- As 0004 notes: revoking EXECUTE does not stop a trigger from firing.
-- PostgreSQL does not check EXECUTE on a trigger function when the trigger
-- runs; the privilege only governs direct calls.

revoke execute on function public.roles_protect_system()
  from public, anon, authenticated;

revoke execute on function public.roles_reject_forged_system()
  from public, anon, authenticated;

revoke execute on function public.hospital_packages_sync_tenant()
  from public, anon, authenticated;
