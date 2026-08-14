-- 0015_support_staff.sql
-- The table behind /admin/support-staff, the last of the three staff screens
-- still keeping its rows in localStorage. Doctor assistants landed in 0013,
-- nurses in 0014; this closes the set.
--
-- Support staff are the non-clinical people: cleaners, guards, technicians,
-- kitchen and transport. They attach to a department rather than to a doctor
-- or a ward, so there is no relation here beyond the tenant.

create table public.support_staff (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,

  name       text not null
               constraint support_staff_name_check check (length(btrim(name)) > 0),

  -- A closed list, unlike nurses.ward in 0014. Ward was left free text because
  -- Raidul's wards table is coming and will own that vocabulary; nothing is
  -- coming for departments, so the constraint belongs here. Adding one later
  -- costs a migration, which is the correct price for changing an org chart.
  --
  -- NOT NULL with no default on purpose: every support staffer works in a
  -- department, and a default would quietly file the first guard hired under
  -- Janitorial. The form's select always sends one; anything that does not is
  -- rejected with a message rather than silently mislabelled.
  department text not null
               constraint support_staff_department_check
               check (department in ('Janitorial', 'Security', 'Maintenance', 'Kitchen', 'Transport')),

  -- Free text. "Cleaner", "Guard", "Night Technician" — it varies by hospital,
  -- and it is a job title, not a permission. public.roles is the permissions
  -- table and deliberately has nothing to do with this column.
  role       text,

  phone      text,
  email      text
               constraint support_staff_email_check
               check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),

  -- Same vocabulary as doctors, doctor_assistants and nurses. Staff statuses
  -- read the same across every staff module.
  status     text not null default 'active'
               constraint support_staff_status_check
               check (status in ('active', 'on_leave', 'suspended')),

  notes      text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_staff_tenant_id_idx  on public.support_staff (tenant_id);
create index support_staff_department_idx on public.support_staff (tenant_id, department);

create trigger support_staff_set_updated_at
  before update on public.support_staff
  for each row execute function public.set_updated_at();

-- The entire security story for this table.
select public.apply_tenant_rls('public.support_staff');
