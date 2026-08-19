-- 0021_doctor_login_credentials.sql
-- HF-32: lets a hospital admin view a doctor's generated login password more
-- than once, not just at the moment it's created.
--
-- Deliberately its own table, not a column on `doctors` or `profiles`:
--
--   `doctors` is served through the generic resource route, whose default
--   select is `*` — a ciphertext column there would ride along on every
--   /api/v1/doctors response, including to `doctor` and `patient`, who both
--   have read access to the doctors resource.
--
--   `profiles` is read by the access-token hook (0003) on every single
--   login and is documented in 0002 to stay narrow. This is neither hot nor
--   small enough to belong there.
--
-- The password itself is encrypted at the application layer (AES-256-GCM,
-- DOCTOR_LOGIN_ENCRYPTION_KEY, server-only — see src/lib/credentials.ts)
-- before it reaches Postgres. This table only ever stores and returns
-- ciphertext.

create table public.doctor_login_secrets (
  doctor_id    uuid primary key references public.doctors (id) on delete cascade,
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  password_enc text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index doctor_login_secrets_tenant_id_idx on public.doctor_login_secrets (tenant_id);

create trigger doctor_login_secrets_set_updated_at
  before update on public.doctor_login_secrets
  for each row execute function public.set_updated_at();

-- RLS enabled with NO policies for `authenticated` — not even the
-- read-your-own-hospital template from 0002. A hospital_admin's own browser
-- session must not be able to select this table directly; the password is
-- only ever readable by decrypting it server-side, through
-- /api/v1/doctors/[id]/login, which uses the service-role client. Same
-- reasoning as profiles having no insert/delete policy for provisioning.
alter table public.doctor_login_secrets enable row level security;
