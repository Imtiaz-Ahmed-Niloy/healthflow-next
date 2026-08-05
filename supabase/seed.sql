-- supabase/seed.sql
--
-- DEVELOPMENT ONLY. Never run this against production.
--
-- Deliberately NOT a migration. Migrations run everywhere, including
-- production; this file only runs when someone asks for it
-- (`supabase db reset`, or applied by hand). Demo accounts with published
-- passwords must never follow the migration chain into a live system.
--
-- Creates one demo hospital and the four accounts behind the demo buttons on
-- the sign-in screen, one per role.
--
--   Patient      p-user@demo.pro    patient123
--   Doctor       dr-smith@demo.pro  clinical456
--   Management   mgmt@demo.pro      flow789
--   Super Admin  root@demo.pro      system000
--
-- Idempotent — safe to run repeatedly.

-- ------------------------------------------------------------ hospital ---

insert into public.tenants (id, name, slug, status, contact_email)
values (
  '000d0000-0000-0000-0000-00000000d001',
  'Demo General Hospital',
  'demo-general-hospital',
  'active',
  'mgmt@demo.pro'
)
on conflict (id) do nothing;

-- ------------------------------------------------------------ accounts ---
-- profiles rows are created automatically by the handle_new_user trigger
-- (migration 0006), which reads role and tenant_id out of user metadata.
--
-- An auth.identities row is required alongside auth.users; without it
-- GoTrue has no email identity to match and password sign-in fails.

create or replace function public.__seed_demo_user(
  p_id       uuid,
  p_email    text,
  p_password text,
  p_metadata jsonb
)
returns void
language plpgsql
as $$
begin
  if exists (select 1 from auth.users where id = p_id) then
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    -- These must be '' and not NULL. Several have no column default, and the
    -- auth server scans them into non-nullable strings — leave them NULL and
    -- every login fails with a 500 "Database error querying schema", which
    -- says nothing about the real cause.
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    -- pgcrypto lives in the extensions schema on Supabase, not public.
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    p_metadata,
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email',
    p_id::text,
    now(), now(), now()
  );
end;
$$;

select public.__seed_demo_user(
  '000d0000-0000-0000-0000-00000000a001',
  'p-user@demo.pro',
  'patient123',
  '{"full_name":"Demo Patient"}'::jsonb
);

select public.__seed_demo_user(
  '000d0000-0000-0000-0000-00000000a002',
  'dr-smith@demo.pro',
  'clinical456',
  '{"full_name":"Dr. Demo Smith","role":"doctor","tenant_id":"000d0000-0000-0000-0000-00000000d001"}'::jsonb
);

select public.__seed_demo_user(
  '000d0000-0000-0000-0000-00000000a003',
  'mgmt@demo.pro',
  'flow789',
  '{"full_name":"Demo Hospital Admin","role":"hospital_admin","tenant_id":"000d0000-0000-0000-0000-00000000d001"}'::jsonb
);

select public.__seed_demo_user(
  '000d0000-0000-0000-0000-00000000a004',
  'root@demo.pro',
  'system000',
  '{"full_name":"Demo Super Admin","role":"super_admin"}'::jsonb
);

drop function public.__seed_demo_user(uuid, text, text, jsonb);

-- --------------------------------------------------------------- doctor ---
-- Gives the demo doctor a row in the directory so the Doctors module has
-- something to show when signing in as the hospital admin.

insert into public.doctors (id, tenant_id, profile_id, name, slug, specialty, email, status)
values (
  '000d0000-0000-0000-0000-00000000c001',
  '000d0000-0000-0000-0000-00000000d001',
  '000d0000-0000-0000-0000-00000000a002',
  'Dr. Demo Smith',
  'dr-demo-smith',
  'Cardiology',
  'dr-smith@demo.pro',
  'active'
)
on conflict (id) do nothing;
