-- 0034_hospital_admin_secrets.sql
-- HF-73: lets a super admin view a hospital admin's generated password more
-- than once, not just at the moment the hospital is approved.
--
-- The same problem 0021 solved for doctors, and the same solution. Until now
-- /api/v1/hospitals/[id]/approve returned the password in its response and
-- nowhere else — its own comment read "Shown once and never stored. There is
-- no endpoint that returns it again." Close the modal and it was gone.
--
-- Keyed on tenant_id rather than a profile id: a hospital has exactly one
-- hospital_admin login in this flow, approve finds it by
-- (tenant_id, role = 'hospital_admin'), and keying on the tenant means the row
-- survives that admin's profile being replaced.
--
-- Same encryption as doctor_login_secrets — AES-256-GCM under
-- DOCTOR_LOGIN_ENCRYPTION_KEY, applied in src/lib/credentials.ts before the
-- value ever reaches Postgres. This table only stores ciphertext. The key name
-- is now doing double duty; renaming it would mean re-encrypting every stored
-- doctor password, so it stays as-is and this comment is the signpost.

create table public.hospital_admin_secrets (
  tenant_id    uuid primary key references public.tenants (id) on delete cascade,

  -- The address the login was created for. Denormalised deliberately: it is
  -- what the super admin needs to read back alongside the password, and
  -- chasing it through profiles at read time would mean a join that returns
  -- nothing once a profile is deleted, hiding the password too.
  email        text not null,

  password_enc text not null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger hospital_admin_secrets_set_updated_at
  before update on public.hospital_admin_secrets
  for each row execute function public.set_updated_at();

-- RLS enabled with NO policies at all — not for `authenticated`, not the
-- tenant template from 0002, and deliberately nothing for is_super_admin()
-- either. A super admin's own browser session must not be able to select this
-- table directly; the password is only ever readable by decrypting it
-- server-side, through /api/v1/hospitals/[id]/login, which uses the
-- service-role client. Same posture as doctor_login_secrets.
--
-- apply_tenant_rls() is NOT used here on purpose: it would grant every
-- authenticated user of a hospital read access to their own hospital's row,
-- which is precisely the ciphertext we are keeping out of browsers.
alter table public.hospital_admin_secrets enable row level security;
