-- 0139_pharmacy_admin_secrets.sql
-- Lets super admin view and reset a standalone pharmacy admin's generated login password.
-- Follows the exact posture of hospital_admin_secrets (0034) and doctor_login_secrets (0021):
-- Keyed on tenant_id, stores encrypted password (AES-256-GCM), RLS enabled with NO policies
-- so only the service-role client in route handlers can read it.

create table public.pharmacy_admin_secrets (
  tenant_id    uuid primary key references public.tenants (id) on delete cascade,
  email        text not null,
  password_enc text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger pharmacy_admin_secrets_set_updated_at
  before update on public.pharmacy_admin_secrets
  for each row execute function public.set_updated_at();

alter table public.pharmacy_admin_secrets enable row level security;
