-- 0004_harden_functions.sql
-- Closes the warnings raised by the Supabase security linter after 0001-0003.
--
-- 1. set_updated_at had a mutable search_path. A trigger function without a
--    pinned search_path can be hijacked by a user-created schema shadowing a
--    catalog object.
--
-- 2. apply_tenant_rls and profiles_guard_privileged_columns are SECURITY
--    DEFINER, which PostgREST happily exposes at /rest/v1/rpc/<name>. Left
--    alone, any signed-in user could call apply_tenant_rls on a table of
--    their choosing and overwrite its policies with the permissive tenant
--    template — including on a table that had deliberately stricter rules.
--
--    apply_tenant_rls is a migration-time tool: it should only ever be called
--    by the migration runner, never over the API.
--
--    Revoking EXECUTE does not stop profiles_guard_privileged_columns from
--    firing. PostgreSQL does not check EXECUTE on a trigger function when the
--    trigger runs; the privilege only governs direct calls.

alter function public.set_updated_at() set search_path = '';

revoke execute on function public.apply_tenant_rls(regclass)
  from public, anon, authenticated;

revoke execute on function public.profiles_guard_privileged_columns()
  from public, anon, authenticated;
