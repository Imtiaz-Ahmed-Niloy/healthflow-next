-- 0010_admissions_bed_stays.sql
-- Admissions (one row per hospital stay) and bed_stays (occupancy history
-- within that stay). Bundled because transfer_admission() below writes to
-- both atomically — they ship as a single feature.
--
-- admissions deliberately carries NO bed_id/cabin_id: putting a location
-- directly on the stay would give a transfer nowhere to record where the
-- patient came FROM. bed_stays is the history; "the current location" is
-- whichever bed_stays row for an admission has ended_at is null.
--
-- The mock's "Transferred" admission status (src/views/admin/Admissions.tsx)
-- is deliberately NOT one of admission_status's values below — a transfer is
-- a location change, not a clinical status, and is now represented by a new
-- bed_stays row instead.

create type public.admission_status   as enum ('admitted', 'under_observation', 'in_surgery', 'discharged');
create type public.admission_priority as enum ('routine', 'urgent', 'critical');

-- ------------------------------------------------------------ admissions ---

create table public.admissions (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  -- restrict: admission history is an audit trail, shouldn't silently
  -- disappear if a patient record is ever deleted.
  patient_id uuid not null references public.patients (id) on delete restrict,
  doctor_id  uuid references public.doctors (id) on delete set null,

  admitted_at    timestamptz not null default now(),
  discharged_at  timestamptz,
  status         public.admission_status not null default 'admitted',
  priority       public.admission_priority not null default 'routine',
  diagnosis      text,
  notes          text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admissions_discharge_after_admit
    check (discharged_at is null or discharged_at >= admitted_at)
);

create index admissions_tenant_id_idx  on public.admissions (tenant_id);
create index admissions_patient_id_idx on public.admissions (patient_id);
create index admissions_doctor_id_idx  on public.admissions (doctor_id);
create index admissions_status_idx     on public.admissions (tenant_id, status);

-- Powers the "active admissions" KPI without scanning discharged history.
create index admissions_active_idx on public.admissions (tenant_id) where discharged_at is null;

create trigger admissions_set_updated_at
  before update on public.admissions
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.admissions');

-- ------------------------------------------------------------ bed_stays ---
-- One row per bed/cabin placement. A transfer closes one row (ended_at =
-- now()) and opens another under the same admission_id — see
-- transfer_admission() below, which is the only thing allowed to do that in
-- one atomic step.

create table public.bed_stays (
  id        uuid primary key default gen_random_uuid(),
  -- Denormalized on purpose: apply_tenant_rls needs a direct tenant_id
  -- column, it cannot be derived through the admission_id join.
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  admission_id uuid not null references public.admissions (id) on delete cascade,
  bed_id       uuid references public.beds (id) on delete restrict,
  cabin_id     uuid references public.cabins (id) on delete restrict,

  started_at timestamptz not null default now(),
  ended_at   timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Exactly one of bed_id/cabin_id — never both, never neither.
  constraint bed_stays_one_location check ((bed_id is not null) <> (cabin_id is not null)),
  constraint bed_stays_ended_after_started check (ended_at is null or ended_at >= started_at)
);

create index bed_stays_tenant_id_idx     on public.bed_stays (tenant_id);
create index bed_stays_admission_id_idx  on public.bed_stays (admission_id);
create index bed_stays_bed_id_idx        on public.bed_stays (bed_id);
create index bed_stays_cabin_id_idx      on public.bed_stays (cabin_id);

-- Double-booking is a database-level impossibility, not an application
-- convention: an admission can't have two live placements, and a bed/cabin
-- can't have two live occupants, enforced regardless of what any caller does.
create unique index bed_stays_one_open_per_admission on public.bed_stays (admission_id) where ended_at is null;
create unique index bed_stays_one_open_per_bed        on public.bed_stays (bed_id)        where ended_at is null;
create unique index bed_stays_one_open_per_cabin       on public.bed_stays (cabin_id)      where ended_at is null;

create trigger bed_stays_set_updated_at
  before update on public.bed_stays
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.bed_stays');

-- ------------------------------------------------------- transfer_admission ---
-- The one write in this codebase that is not a single-row insert/update.
-- Closes the admission's current open bed_stays row (if any), opens a new
-- one at the given bed/cabin (if any), and syncs the cache columns
-- (beds.status / cabins.status) — all in one transaction, so a crash midway
-- leaves either the old state or the new one, never a torn mix of both.
--
-- Covers three UI actions with one function: initial bed assignment at
-- admission time, a mid-stay transfer, and discharge's bed release (call with
-- p_bed_id and p_cabin_id both null to release-only).
--
-- security definer means this bypasses RLS entirely, so — unlike every other
-- write in this codebase — it re-implements its own tenant/role check by
-- hand instead of leaning on a policy. This is the one place that's true.
create or replace function public.transfer_admission(
  p_admission_id uuid,
  p_bed_id       uuid default null,
  p_cabin_id     uuid default null
)
returns public.bed_stays
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admission  public.admissions;
  v_bed_tenant uuid;
  v_cab_tenant uuid;
  v_old_stay   public.bed_stays;
  v_new_stay   public.bed_stays;
begin
  if p_bed_id is not null and p_cabin_id is not null then
    raise exception 'transfer_admission: choose a bed or a cabin, not both';
  end if;

  select * into v_admission from public.admissions where id = p_admission_id;
  if v_admission is null then
    raise exception 'transfer_admission: admission % not found', p_admission_id;
  end if;

  if not (public.is_super_admin() or v_admission.tenant_id = public.auth_tenant_id()) then
    raise exception 'transfer_admission: not allowed';
  end if;

  if v_admission.discharged_at is not null then
    raise exception 'transfer_admission: admission % is already discharged', p_admission_id;
  end if;

  if p_bed_id is not null then
    select tenant_id into v_bed_tenant from public.beds where id = p_bed_id;
    if v_bed_tenant is null then
      raise exception 'transfer_admission: bed % not found', p_bed_id;
    end if;
    if not (public.is_super_admin() or v_bed_tenant = public.auth_tenant_id()) then
      raise exception 'transfer_admission: not allowed';
    end if;
  end if;

  if p_cabin_id is not null then
    select tenant_id into v_cab_tenant from public.cabins where id = p_cabin_id;
    if v_cab_tenant is null then
      raise exception 'transfer_admission: cabin % not found', p_cabin_id;
    end if;
    if not (public.is_super_admin() or v_cab_tenant = public.auth_tenant_id()) then
      raise exception 'transfer_admission: not allowed';
    end if;
  end if;

  -- Close the current open placement, if one exists.
  update public.bed_stays
     set ended_at = now()
   where admission_id = p_admission_id
     and ended_at is null
  returning * into v_old_stay;

  if v_old_stay.bed_id is not null then
    update public.beds set status = 'cleaning' where id = v_old_stay.bed_id;
  elsif v_old_stay.cabin_id is not null then
    update public.cabins set status = 'cleaning' where id = v_old_stay.cabin_id;
  end if;

  -- Open the new placement, unless this call was release-only.
  if p_bed_id is not null or p_cabin_id is not null then
    insert into public.bed_stays (tenant_id, admission_id, bed_id, cabin_id)
    values (v_admission.tenant_id, p_admission_id, p_bed_id, p_cabin_id)
    returning * into v_new_stay;

    if p_bed_id is not null then
      update public.beds set status = 'occupied' where id = p_bed_id;
    else
      update public.cabins set status = 'occupied' where id = p_cabin_id;
    end if;
  end if;

  return v_new_stay;
end;
$$;

revoke execute on function public.transfer_admission(uuid, uuid, uuid) from public, anon;
grant execute on function public.transfer_admission(uuid, uuid, uuid) to authenticated;
