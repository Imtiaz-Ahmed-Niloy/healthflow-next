-- 0003_auth_claims_hook.sql
-- Custom Access Token hook: stamps `user_role` and `tenant_id` into every
-- access token at login/refresh, so RLS reads them straight off auth.jwt()
-- with no per-query lookup against profiles.
--
-- IMPORTANT: creating the function is not enough. The hook must also be
-- enabled on the hosted project:
--   Dashboard -> Authentication -> Hooks -> Customize Access Token (JWT) Claims
--   -> select public.custom_access_token_hook
-- (supabase/config.toml wires it up for the local CLI stack only.)
--
-- Claims are refreshed when a token is issued, NOT when profiles changes.
-- After changing a user's role or tenant, their existing token stays stale
-- until it refreshes — force a re-login for role changes.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_claims    jsonb;
  v_role      public.app_role;
  v_tenant_id uuid;
begin
  select p.role, p.tenant_id
    into v_role, v_tenant_id
  from public.profiles p
  where p.id = (event ->> 'user_id')::uuid;

  v_claims := event -> 'claims';

  if v_role is not null then
    v_claims := jsonb_set(v_claims, '{user_role}', to_jsonb(v_role::text));
  else
    v_claims := jsonb_set(v_claims, '{user_role}', 'null'::jsonb);
  end if;

  if v_tenant_id is not null then
    v_claims := jsonb_set(v_claims, '{tenant_id}', to_jsonb(v_tenant_id::text));
  else
    v_claims := jsonb_set(v_claims, '{tenant_id}', 'null'::jsonb);
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

-- The auth server runs the hook as `supabase_auth_admin`. Grant it exactly
-- what it needs and nothing more, and keep the function off the public API.
grant usage on schema public to supabase_auth_admin;

grant execute on function public.custom_access_token_hook(jsonb)
  to supabase_auth_admin;

revoke execute on function public.custom_access_token_hook(jsonb)
  from authenticated, anon, public;

grant select on table public.profiles to supabase_auth_admin;

-- profiles has RLS enabled (0002), so the auth admin needs its own read path.
create policy profiles_select_auth_admin on public.profiles
  for select to supabase_auth_admin
  using (true);
