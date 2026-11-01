-- 0142_hospital_specialized_modules.sql
-- Adds specialized clinical and operational hospital management modules:
-- 1. Operation Theatre (OT) Management & Surgical Scheduling
-- 2. Blood Bank & Donor Management
-- 3. Ambulance & Emergency Transport Fleet
-- 4. Emergency & Casualty Triage Desk

-- -------------------------------------------------- 1. OPERATION THEATRE ---
create table public.operation_theatres (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,

  name              text not null constraint operation_theatres_name_check check (length(btrim(name)) > 0),
  code              text not null constraint operation_theatres_code_check check (length(btrim(code)) > 0),
  status            text not null default 'available'
                      constraint operation_theatres_status_check check (status in ('available', 'in_use', 'cleaning', 'maintenance')),
  floor             text,
  charges_per_hour  numeric(12, 2) not null default 0 constraint operation_theatres_charges_check check (charges_per_hour >= 0),
  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index operation_theatres_tenant_id_idx on public.operation_theatres (tenant_id);
create unique index operation_theatres_tenant_code_key on public.operation_theatres (tenant_id, lower(btrim(code)));

create trigger operation_theatres_set_updated_at
  before update on public.operation_theatres
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.operation_theatres');
select public.attach_audit('public.operation_theatres');

-- Surgical Schedules
create table public.ot_schedules (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants (id) on delete cascade,

  ot_id                 uuid not null references public.operation_theatres (id) on delete restrict,
  patient_id            uuid not null references public.patients (id) on delete cascade,
  doctor_id             uuid references public.doctors (id) on delete set null,
  anesthesiologist_id   uuid references public.doctors (id) on delete set null,

  surgery_name          text not null constraint ot_schedules_surgery_check check (length(btrim(surgery_name)) > 0),
  start_time            timestamptz not null,
  end_time              timestamptz,
  status                text not null default 'scheduled'
                          constraint ot_schedules_status_check check (status in ('scheduled', 'in_progress', 'completed', 'cancelled', 'delayed')),
  anesthesia_type       text default 'General'
                          constraint ot_schedules_anesthesia_check check (anesthesia_type in ('General', 'Spinal', 'Local', 'Sedation', 'Epidural', 'None')),
  pre_op_notes          text,
  post_op_notes         text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index ot_schedules_tenant_id_idx on public.ot_schedules (tenant_id);
create index ot_schedules_timing_idx on public.ot_schedules (tenant_id, start_time);
create index ot_schedules_patient_idx on public.ot_schedules (tenant_id, patient_id);

create trigger ot_schedules_set_updated_at
  before update on public.ot_schedules
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.ot_schedules');
select public.attach_audit('public.ot_schedules');

-- ------------------------------------------------------- 2. BLOOD BANK ---
create table public.blood_donors (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,

  name                text not null constraint blood_donors_name_check check (length(btrim(name)) > 0),
  blood_group         text not null constraint blood_donors_group_check check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  phone               text not null constraint blood_donors_phone_check check (length(btrim(phone)) > 0),
  email               text,
  age                 integer constraint blood_donors_age_check check (age is null or (age >= 16 and age <= 80)),
  gender              text constraint blood_donors_gender_check check (gender is null or gender in ('male', 'female', 'other')),
  last_donation_date  date,
  eligible            boolean not null default true,
  notes               text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index blood_donors_tenant_id_idx on public.blood_donors (tenant_id);
create index blood_donors_group_idx on public.blood_donors (tenant_id, blood_group);

create trigger blood_donors_set_updated_at
  before update on public.blood_donors
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.blood_donors');
select public.attach_audit('public.blood_donors');

-- Blood inventory bags
create table public.blood_inventory (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,

  bag_number        text not null constraint blood_inventory_bag_check check (length(btrim(bag_number)) > 0),
  blood_group       text not null constraint blood_inventory_group_check check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  component         text not null default 'whole_blood'
                      constraint blood_inventory_component_check check (component in ('whole_blood', 'rbc', 'platelets', 'plasma', 'cryoprecipitate')),
  donor_id          uuid references public.blood_donors (id) on delete set null,
  collected_date    date not null default current_date,
  expiry_date       date not null,
  volume_ml         integer not null default 450 constraint blood_inventory_volume_check check (volume_ml > 0),
  status            text not null default 'available'
                      constraint blood_inventory_status_check check (status in ('available', 'reserved', 'transfused', 'discarded', 'expired')),
  storage_location  text default 'Refrigerator 1',

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index blood_inventory_tenant_id_idx on public.blood_inventory (tenant_id);
create index blood_inventory_group_status_idx on public.blood_inventory (tenant_id, blood_group, status);
create unique index blood_inventory_tenant_bag_key on public.blood_inventory (tenant_id, lower(btrim(bag_number)));

create trigger blood_inventory_set_updated_at
  before update on public.blood_inventory
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.blood_inventory');
select public.attach_audit('public.blood_inventory');

-- ----------------------------------------------------- 3. AMBULANCE FLEET ---
create table public.ambulance_fleet (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,

  vehicle_number  text not null constraint ambulance_fleet_number_check check (length(btrim(vehicle_number)) > 0),
  vehicle_model   text,
  type            text not null default 'basic'
                    constraint ambulance_fleet_type_check check (type in ('basic', 'icu', 'ac', 'cardiac')),
  driver_name     text not null constraint ambulance_fleet_driver_check check (length(btrim(driver_name)) > 0),
  driver_phone    text not null constraint ambulance_fleet_phone_check check (length(btrim(driver_phone)) > 0),
  status          text not null default 'available'
                    constraint ambulance_fleet_status_check check (status in ('available', 'on_trip', 'maintenance', 'out_of_service')),
  has_oxygen      boolean not null default true,
  has_ventilator  boolean not null default false,
  base_charge     numeric(12, 2) not null default 0 constraint ambulance_fleet_base_charge_check check (base_charge >= 0),
  charge_per_km   numeric(12, 2) not null default 0 constraint ambulance_fleet_km_charge_check check (charge_per_km >= 0),
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index ambulance_fleet_tenant_id_idx on public.ambulance_fleet (tenant_id);
create unique index ambulance_fleet_tenant_vehicle_key on public.ambulance_fleet (tenant_id, lower(btrim(vehicle_number)));

create trigger ambulance_fleet_set_updated_at
  before update on public.ambulance_fleet
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.ambulance_fleet');
select public.attach_audit('public.ambulance_fleet');

-- -------------------------------------------------- 4. EMERGENCY & TRIAGE ---
create table public.emergency_triage (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,

  ticket_number       text not null constraint emergency_triage_ticket_check check (length(btrim(ticket_number)) > 0),
  patient_id          uuid references public.patients (id) on delete set null,
  patient_name        text not null constraint emergency_triage_patient_name_check check (length(btrim(patient_name)) > 0),
  gender              text constraint emergency_triage_gender_check check (gender is null or gender in ('male', 'female', 'other')),
  age                 integer constraint emergency_triage_age_check check (age is null or age >= 0),
  phone               text,

  triage_level        text not null default 'yellow'
                        constraint emergency_triage_level_check check (triage_level in ('red', 'yellow', 'green', 'black')),
  chief_complaint     text not null constraint emergency_triage_complaint_check check (length(btrim(chief_complaint)) > 0),
  vitals              jsonb default '{}'::jsonb,
  assigned_doctor_id  uuid references public.doctors (id) on delete set null,
  assigned_bed        text,
  status              text not null default 'waiting'
                        constraint emergency_triage_status_check check (status in ('waiting', 'under_treatment', 'admitted', 'discharged', 'transferred', 'expired')),
  arrival_time        timestamptz not null default now(),
  disposition_time    timestamptz,
  treatment_notes     text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index emergency_triage_tenant_id_idx on public.emergency_triage (tenant_id);
create index emergency_triage_status_level_idx on public.emergency_triage (tenant_id, status, triage_level);
create unique index emergency_triage_tenant_ticket_key on public.emergency_triage (tenant_id, lower(btrim(ticket_number)));

create trigger emergency_triage_set_updated_at
  before update on public.emergency_triage
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.emergency_triage');
select public.attach_audit('public.emergency_triage');

