-- 0013_doctor_assistants.sql
-- The table behind /admin/doctor-assistants, which until now kept its rows in
-- localStorage: the assistants a hospital "added" were visible only in the
-- browser that added them.
--
-- An assistant is hospital staff attached to a doctor. Standard tenant scoping.

create table public.doctor_assistants (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,

  name       text not null
               constraint doctor_assistants_name_check check (length(btrim(name)) > 0),

  -- Nullable on purpose. A hospital hires an assistant before deciding which
  -- doctor they support, and reassignment is routine, so "not yet assigned"
  -- has to be a state the table can hold.
  doctor_id  uuid,

  shift      text not null default 'Morning'
               constraint doctor_assistants_shift_check
               check (shift in ('Morning', 'Evening', 'Night')),

  phone      text,
  email      text
               constraint doctor_assistants_email_check
               check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),

  -- Same vocabulary as doctors.status in 0005. An assistant is staff, and
  -- staff statuses should read the same across the module.
  status     text not null default 'active'
               constraint doctor_assistants_status_check
               check (status in ('active', 'on_leave', 'suspended')),

  notes      text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The pair, not just the id — same reasoning as doctor_shifts in 0012. RLS
  -- stops a hospital_admin referencing another hospital's doctor, but a
  -- super_admin passes tenant_id explicitly and could otherwise file an
  -- assistant under hospital B pointing at hospital A's doctor.
  --
  -- SET NULL names doctor_id alone (Postgres 15+). Without the column list it
  -- would try to null tenant_id too, which is NOT NULL, and deleting a doctor
  -- would fail outright. Deleting a doctor unassigns their assistants; it does
  -- not delete them, because the assistant is still employed.
  constraint doctor_assistants_doctor_fkey
    foreign key (doctor_id, tenant_id)
    references public.doctors (id, tenant_id) on delete set null (doctor_id)
);

create index doctor_assistants_tenant_id_idx on public.doctor_assistants (tenant_id);
create index doctor_assistants_doctor_idx    on public.doctor_assistants (tenant_id, doctor_id);

create trigger doctor_assistants_set_updated_at
  before update on public.doctor_assistants
  for each row execute function public.set_updated_at();

-- The entire security story for this table.
select public.apply_tenant_rls('public.doctor_assistants');
