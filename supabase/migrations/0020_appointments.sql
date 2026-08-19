-- 0020_appointments.sql
-- Reconstructed 2026-08-19. This migration was applied directly to the
-- database on 2026-08-17 (recorded in supabase_migrations.schema_migrations
-- as 0020_appointments) but the .sql file itself never made it into git —
-- discovered while reconciling PR #16's 0020_doctors_public.sql, which had
-- picked the same number without knowing it was already taken.
--
-- Written from the live schema (information_schema, pg_indexes, pg_trigger,
-- pg_policies) so the repo matches what's actually running. This file is
-- for history only and has NOT been re-applied — the table already exists.

create type public.appointment_status as enum ('scheduled', 'completed', 'cancelled');

create table public.appointments (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete restrict,
  doctor_id  uuid references public.doctors (id) on delete set null,

  department     text,
  scheduled_date date not null default current_date,
  scheduled_time time not null default '09:00:00',
  status         public.appointment_status not null default 'scheduled',
  notes          text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_tenant_id_idx  on public.appointments (tenant_id);
create index appointments_patient_id_idx on public.appointments (patient_id);
create index appointments_doctor_id_idx  on public.appointments (doctor_id);
create index appointments_status_idx     on public.appointments (tenant_id, status);
create index appointments_date_idx       on public.appointments (tenant_id, scheduled_date);

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- The whole security story for this table, in one line.
select public.apply_tenant_rls('public.appointments');
