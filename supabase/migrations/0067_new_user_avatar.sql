-- 0067_new_user_avatar.sql
-- Google hands us a profile picture at sign-in and we were dropping it.
--
-- handle_new_user (0006) copies the name and phone out of the new user's
-- metadata; this adds the picture, which Google supplies as `avatar_url` (and
-- `picture` — the same URL under the older key, kept as a fallback because
-- other providers use it).
--
-- The column takes an absolute URL here rather than an R2 key, and mediaUrl
-- passes those through untouched (src/lib/media.ts) — the same way the seeded
-- Unsplash hospital covers work. A patient who uploads their own picture
-- overwrites it with a key, which is the normal path.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role      public.app_role;
  v_tenant_id uuid;
begin
  v_role := coalesce(
    nullif(new.raw_user_meta_data ->> 'role', '')::public.app_role,
    'patient'
  );

  v_tenant_id := nullif(new.raw_user_meta_data ->> 'tenant_id', '')::uuid;

  if v_role not in ('super_admin', 'patient') and v_tenant_id is null then
    raise exception
      'handle_new_user: role % requires tenant_id in user metadata', v_role;
  end if;

  insert into public.profiles (id, role, tenant_id, email, full_name, phone, avatar_url)
  values (
    new.id,
    v_role,
    v_tenant_id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Anyone who signed in with Google before this landed keeps their picture too.
update public.profiles p
   set avatar_url = coalesce(
         nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
         nullif(u.raw_user_meta_data ->> 'picture', '')
       )
  from auth.users u
 where u.id = p.id
   and p.avatar_url is null
   and coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') is not null;
