-- 0038_revoke_staff_access.sql
-- HF-75: a doctor deleted from /admin/doctors could still sign in and read the
-- hospital's patients, appointments, wards and everything else tenant-scoped.
--
-- Deleting the doctor removed the `doctors` row and cascaded away
-- `doctor_login_secrets`, but the auth user and their `profiles` row survived
-- carrying `role: doctor` and the hospital's `tenant_id`. RLS resolves the
-- tenant from the JWT, and the JWT is stamped from `profiles`, so the account
-- kept its access.
--
-- WHY NOT DELETE OR BAN THE AUTH USER
-- A doctor may work at more than one hospital: the account is the person, not
-- the job. Removing them from hospital A has to sever that employment and
-- leave the account — and its history — intact.
--
-- WHY NOT NULL OUT tenant_id, OR DOWNGRADE THE ROLE
-- Both fight the schema and lose information. `profiles_tenant_scope` (0001)
-- rejects a `doctor` with no tenant, and demoting them to `patient` throws away
-- the record of what they were. `profiles.is_active` has existed since 0001 and
-- nothing has ever read it — this finishes that column rather than inventing a
-- state next to it. `role` and `tenant_id` stay as the historical fact of who
-- they were and where; `is_active` says the access is gone.
--
-- When the profile <-> tenant membership table lands and staff become genuinely
-- multi-hospital, revocation moves onto the membership row and this stays
-- meaningful as account-level suspension. Nothing here has to be unwound.

-- ---------------------------------------------------------------------------
-- 1. The token stops carrying a hospital once the account is deactivated.
-- ---------------------------------------------------------------------------
-- Same hook as 0003 with `is_active` added. A deactivated profile is stamped
-- with a null role and a null tenant, so `auth_tenant_id()` returns null and
-- every tenant-scoped policy on the schema denies the row. There is no policy
-- to change: the claim is the boundary, so cutting the claim closes all of them
-- at once.
--
-- Claims are only recomputed when a token is issued, which is why step 2 also
-- destroys the sessions. Without that this would take effect at their next
-- refresh — up to an hour of continued access after being deleted.

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
  v_is_active boolean;
begin
  select p.role, p.tenant_id, p.is_active
    into v_role, v_tenant_id, v_is_active
  from public.profiles p
  where p.id = (event ->> 'user_id')::uuid;

  -- A profile that is present but deactivated is treated exactly like one that
  -- does not exist: no role, no tenant. Coalesce so a missing row (which
  -- already produced null claims) keeps behaving as it did.
  if not coalesce(v_is_active, true) then
    v_role      := null;
    v_tenant_id := null;
  end if;

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

-- ---------------------------------------------------------------------------
-- 2. Revoke: deactivate the profile and destroy every live session.
-- ---------------------------------------------------------------------------
-- Deleting the sessions is what makes this immediate. The access token already
-- in the doctor's browser is signed and self-contained — it cannot be recalled
-- — but it is short-lived, and with no session row it cannot be refreshed. The
-- window is the remaining life of that one token rather than indefinite.
--
-- Returns true when a profile was actually deactivated, so the caller can tell
-- "revoked" from "there was nothing to revoke" instead of guessing.

create or replace function public.revoke_staff_access(p_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_found boolean;
begin
  update public.profiles
     set is_active = false,
         updated_at = now()
   where id = p_profile_id
     and is_active
  returning true into v_found;

  -- Unconditional: if the profile was already deactivated but somehow still
  -- holds a session, that session should still go.
  delete from auth.refresh_tokens where user_id = p_profile_id::text;
  delete from auth.sessions       where user_id = p_profile_id;

  return coalesce(v_found, false);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Restore: the re-hire path.
-- ---------------------------------------------------------------------------
-- Reactivates a staff profile this system previously revoked, at the SAME
-- hospital and in the SAME role it already had.
--
-- Every one of those words is load-bearing:
--
--   not is_active  — re-attaching a live account is how somebody takes over
--                    another person's login by claiming their email address.
--                    provisionUser has always refused that and still does.
--   role = p_role  — this is a re-hire, not a promotion.
--   tenant_id      — matched, never written. 0002's guard lets only a super
--                    admin change tenant_id and it stays that way; the first
--                    draft of this migration poked a hole in that guard and the
--                    hole turned out to swallow every caller, because inside a
--                    SECURITY DEFINER trigger current_user is always the owner.
--                    Nothing here touches the guard now.
--
-- The cost is that re-hiring a doctor at a DIFFERENT hospital still fails with
-- email_taken, exactly as it does today — that case needs the profile <-> tenant
-- membership table this ticket deliberately defers, and it is the honest place
-- for it. Same-hospital re-hire, which is what "a returning doctor" means in
-- practice, works without touching a privileged column at all.

create or replace function public.restore_staff_access(
  p_profile_id uuid,
  p_tenant_id  uuid,
  p_role       public.app_role
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_found boolean;
begin
  update public.profiles
     set is_active  = true,
         updated_at = now()
   where id = p_profile_id
     and role = p_role
     and tenant_id = p_tenant_id
     and not is_active
  returning true into v_found;

  return coalesce(v_found, false);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------------
-- Both functions are SECURITY DEFINER and both cross a tenant boundary, so
-- neither may be reachable from the browser. The publishable key ships in the
-- client bundle and `authenticated` is one sign-up away — leaving execute on
-- `public` would put revoke_staff_access on /rest/v1/rpc for anyone with an
-- account.

revoke execute on function public.revoke_staff_access(uuid) from public, anon, authenticated;
revoke execute on function public.restore_staff_access(uuid, uuid, public.app_role)
  from public, anon, authenticated;

grant execute on function public.revoke_staff_access(uuid) to service_role;
grant execute on function public.restore_staff_access(uuid, uuid, public.app_role) to service_role;
