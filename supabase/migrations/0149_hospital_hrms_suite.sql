-- 0143_hospital_hrms_suite.sql
-- Comprehensive Hospital HR & Administration Suite:
-- 1. Duty Rostering & Clinical Shift Management (duty_rosters)
-- 2. Staff Credentialing & License Tracker (staff_credentials)
-- 3. Administrative Circulars & Internal Notices (hospital_circulars)
-- 4. Employee Exit Clearance & Offboarding (exit_clearances)
-- 5. Hospital Vacancies & Recruitment Pipeline (job_openings)

-- -------------------------------------------------- 1. DUTY ROSTERS ---
create table public.duty_rosters (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,

  employee_id       uuid not null references public.employees (id) on delete cascade,
  department        text,
  shift_name        text not null default 'Morning'
                      constraint duty_rosters_shift_check check (shift_name in ('Morning', 'Evening', 'Night', 'General', 'On-Call', 'Emergency')),
  shift_date        date not null,
  start_time        text not null default '08:00',
  end_time          text not null default '14:00',
  ward_or_unit      text,
  is_on_call        boolean not null default false,
  status            text not null default 'scheduled'
                      constraint duty_rosters_status_check check (status in ('scheduled', 'confirmed', 'completed', 'swapped', 'absent')),
  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index duty_rosters_tenant_id_idx on public.duty_rosters (tenant_id);
create index duty_rosters_date_idx on public.duty_rosters (tenant_id, shift_date);
create index duty_rosters_employee_idx on public.duty_rosters (tenant_id, employee_id);

create trigger duty_rosters_set_updated_at
  before update on public.duty_rosters
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.duty_rosters');
select public.attach_audit('public.duty_rosters');


-- --------------------------------------------- 2. STAFF CREDENTIALS ---
create table public.staff_credentials (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,

  employee_id         uuid not null references public.employees (id) on delete cascade,
  title               text not null constraint staff_credentials_title_check check (length(btrim(title)) > 0),
  credential_type     text not null default 'medical_license'
                        constraint staff_credentials_type_check check (credential_type in ('medical_license', 'nursing_license', 'clinical_certification', 'life_support', 'fellowship', 'other')),
  registration_number text not null constraint staff_credentials_reg_check check (length(btrim(registration_number)) > 0),
  issuing_authority   text not null constraint staff_credentials_auth_check check (length(btrim(issuing_authority)) > 0),
  issue_date          date,
  expiry_date         date,
  verification_status text not null default 'pending'
                        constraint staff_credentials_status_check check (verification_status in ('pending', 'verified', 'expired', 'rejected')),
  document_url        text,
  notes               text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index staff_credentials_tenant_id_idx on public.staff_credentials (tenant_id);
create index staff_credentials_employee_idx on public.staff_credentials (tenant_id, employee_id);
create index staff_credentials_expiry_idx on public.staff_credentials (tenant_id, expiry_date);

create trigger staff_credentials_set_updated_at
  before update on public.staff_credentials
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.staff_credentials');
select public.attach_audit('public.staff_credentials');


-- ------------------------------------------- 3. HOSPITAL CIRCULARS ---
create table public.hospital_circulars (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,

  circular_number   text not null constraint hospital_circulars_num_check check (length(btrim(circular_number)) > 0),
  title             text not null constraint hospital_circulars_title_check check (length(btrim(title)) > 0),
  category          text not null default 'administrative'
                      constraint hospital_circulars_cat_check check (category in ('administrative', 'clinical_protocol', 'emergency', 'holiday_policy', 'infection_control', 'general')),
  priority          text not null default 'normal'
                      constraint hospital_circulars_priority_check check (priority in ('normal', 'urgent', 'critical')),
  target_audience   text not null default 'all_staff'
                      constraint hospital_circulars_audience_check check (target_audience in ('all_staff', 'doctors_only', 'nurses_only', 'administrative', 'clinical_staff')),
  published_date    date not null default current_date,
  valid_until       date,
  content           text not null constraint hospital_circulars_content_check check (length(btrim(content)) > 0),
  status            text not null default 'published'
                      constraint hospital_circulars_status_check check (status in ('draft', 'published', 'archived')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index hospital_circulars_tenant_id_idx on public.hospital_circulars (tenant_id);
create index hospital_circulars_date_idx on public.hospital_circulars (tenant_id, published_date);

create trigger hospital_circulars_set_updated_at
  before update on public.hospital_circulars
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.hospital_circulars');
select public.attach_audit('public.hospital_circulars');


-- --------------------------------------------- 4. EXIT CLEARANCES ---
create table public.exit_clearances (
  id                          uuid primary key default gen_random_uuid(),
  tenant_id                   uuid not null references public.tenants (id) on delete cascade,

  employee_id                 uuid not null references public.employees (id) on delete cascade,
  resignation_date            date not null,
  last_working_day            date not null,
  reason_for_leaving          text,
  pharmacy_cleared            boolean not null default false,
  pharmacy_notes              text,
  it_assets_cleared           boolean not null default false,
  it_notes                    text,
  library_records_cleared     boolean not null default false,
  accounts_finance_cleared    boolean not null default false,
  accounts_notes              text,
  hr_admin_cleared            boolean not null default false,
  final_settlement_status     text not null default 'pending'
                                constraint exit_clearances_settlement_check check (final_settlement_status in ('pending', 'calculated', 'disbursed', 'on_hold')),
  service_certificate_issued  boolean not null default false,
  notes                       text,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index exit_clearances_tenant_id_idx on public.exit_clearances (tenant_id);
create index exit_clearances_employee_idx on public.exit_clearances (tenant_id, employee_id);

create trigger exit_clearances_set_updated_at
  before update on public.exit_clearances
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.exit_clearances');
select public.attach_audit('public.exit_clearances');


-- ------------------------------------------------ 5. JOB OPENINGS ---
create table public.job_openings (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,

  job_title           text not null constraint job_openings_title_check check (length(btrim(job_title)) > 0),
  department          text not null constraint job_openings_dept_check check (length(btrim(department)) > 0),
  employment_type     text not null default 'full_time'
                        constraint job_openings_emp_type_check check (employment_type in ('full_time', 'part_time', 'contract', 'locum', 'intern')),
  experience_required text,
  vacancies           integer not null default 1 constraint job_openings_vacancies_check check (vacancies > 0),
  closing_date        date,
  job_description     text,
  requirements        text,
  status              text not null default 'active'
                        constraint job_openings_status_check check (status in ('draft', 'active', 'interviewing', 'closed', 'cancelled')),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index job_openings_tenant_id_idx on public.job_openings (tenant_id);
create index job_openings_status_idx on public.job_openings (tenant_id, status);

create trigger job_openings_set_updated_at
  before update on public.job_openings
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.job_openings');
select public.attach_audit('public.job_openings');

