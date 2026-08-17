-- 0007_patients.sql
-- Patient registry — the foundation the Ward/Bed/Cabin/Admission modules need.
-- Nothing in this codebase currently models "a patient" as a row: Admissions,
-- the OPD-visit log, and the patient-portal profile each carry their own
-- free-text patient snapshot instead. This is the first real one.
--
-- Column choices are pulled from what already exists across the UI, not
-- invented:
--   full_name, gender, phone     -> src/views/admin/Admissions.tsx
--                                    (Admission.patient / .gender / .contact)
--   full_name, email, gender,
--   date_of_birth                -> src/redux/features/auth/authApi.ts
--                                    (PatientSignupRequest — patient self-signup
--                                    already collects exactly these)
--   address                      -> src/views/patient/Profile.tsx
--                                    (GeneralInfoSection.address)
--   blood_group                  -> src/views/patient/Profile.tsx
--                                    (Clinical tab vitals; also Family tab's
--                                    "Blood Type" field) — bedside-relevant for
--                                    an admission, so kept even though the rest
--                                    of the Clinical tab is out of scope below.
--   emergency_contact_name/phone -> src/views/patient/Profile.tsx
--                                    (EmergencyContactCard), reduced to two
--                                    plain columns — the card's other fields
--                                    (NID, photo, contact address) are patient
--                                    self-service KYC, a separate feature from
--                                    the admission-facing registry this table
--                                    is for.
--
-- Deliberately NOT included (separate, larger scope than the ward/admission
-- work this table exists for): marital status, NID/passport, insurance,
-- documents, illnesses/medications/procedures/allergies — that's a future
-- medical-records-style module built on top of this table, not part of it.

create type public.patient_gender as enum ('male', 'female', 'other');

create type public.blood_group as enum (
  'o_positive', 'o_negative',
  'a_positive', 'a_negative',
  'b_positive', 'b_negative',
  'ab_positive', 'ab_negative'
);

create table public.patients (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,

  -- Set once the patient has a login (self-signup or provisioned). Null for a
  -- walk-in/admission-desk record created before anyone signs up — same shape
  -- as doctors.profile_id.
  profile_id uuid references public.profiles (id) on delete set null,

  -- Human-friendly registry number. Auto-derived below, same pattern as
  -- doctors.slug — never accepted from the create schema.
  mrn text not null,

  full_name     text not null,
  gender        public.patient_gender,
  date_of_birth date,
  phone         text,
  email         text,
  address       text,
  blood_group   public.blood_group,

  emergency_contact_name  text,
  emergency_contact_phone text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- MRNs only need to be unique within a hospital, same reasoning as
  -- doctors_tenant_slug_unique: two hospitals may each register a "John Doe".
  constraint patients_tenant_mrn_unique unique (tenant_id, mrn),
  constraint patients_dob_not_future check (date_of_birth is null or date_of_birth <= current_date)
);

create index patients_tenant_id_idx  on public.patients (tenant_id);
create index patients_profile_id_idx on public.patients (profile_id);
create index patients_full_name_idx  on public.patients (tenant_id, full_name);

create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- mrn is derived, not entered, exactly like doctors.slug — keeps the resource
-- factory generic (it has no notion of computed columns).
create or replace function public.patients_set_mrn()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.mrn is null or btrim(new.mrn) = '' then
    new.mrn := 'P-' || upper(substr(new.id::text, 1, 8));
  end if;

  return new;
end;
$$;

create trigger patients_set_mrn
  before insert on public.patients
  for each row execute function public.patients_set_mrn();

-- The whole security story for this table, in one line.
select public.apply_tenant_rls('public.patients');
