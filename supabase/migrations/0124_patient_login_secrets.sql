-- 0124_patient_login_secrets.sql
-- A patient added at a hospital's desk is given a login on the spot: their
-- mobile number and a short password the desk reads out to them. The desk has
-- to be able to read it out again next week, so — exactly as for doctors
-- (0021) — the password is kept here, encrypted, beside the hashed copy
-- Supabase Auth signs them in with.
--
-- Its own table for the reasons 0021 gives: `patients` is served through the
-- generic resource route with `select *`, and a doctor can read that resource.
--
-- Only ever ciphertext (AES-256-GCM, src/lib/credentials.ts). A row exists
-- only for a login this hospital created; a patient who signed up themselves,
-- or was given a login by another hospital, has none here and their password
-- is nobody's to look up.

create table public.patient_login_secrets (
  patient_id   uuid primary key references public.patients (id) on delete cascade,
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  password_enc text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index patient_login_secrets_tenant_id_idx on public.patient_login_secrets (tenant_id);

create trigger patient_login_secrets_set_updated_at
  before update on public.patient_login_secrets
  for each row execute function public.set_updated_at();

-- RLS on with no policies at all, as 0021: a hospital admin's browser session
-- must not be able to select this. It is read only by the service-role client
-- inside /api/v1/patients/[id]/login.
alter table public.patient_login_secrets enable row level security;
