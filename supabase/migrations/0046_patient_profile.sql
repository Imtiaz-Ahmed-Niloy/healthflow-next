-- 0046_patient_profile.sql
-- HF-79. /patient/profile is 991 lines and five tabs, and had no save path at
-- all — no fetch, no submit handler, nothing. A patient could fill in every
-- field and none of it went anywhere.
--
-- Most of what the General tab asks for is already on `patients` (0016):
-- full_name, date_of_birth, gender, email, phone, address, blood_group,
-- height, weight, emergency contact name and phone. Three fields it asks for
-- were missing, and the Clinical tab's four lists had nowhere to live at all.

-- --------------------------------------------------------------- general ---

create type public.marital_status as enum ('single', 'married', 'divorced', 'widowed');

alter table public.patients
  add column marital_status public.marital_status,
  -- NID or passport number. Free text: a passport and a Bangladeshi NID have
  -- different shapes, and a patient may hold either.
  add column national_id text
    constraint patients_national_id_check
    check (national_id is null or length(btrim(national_id)) > 0),
  -- The emergency contact's name and phone are already here; their
  -- relationship to the patient was the field the card showed and the table
  -- could not store.
  add column emergency_contact_relation text
    constraint patients_emergency_contact_relation_check
    check (emergency_contact_relation is null or length(btrim(emergency_contact_relation)) > 0);

comment on column public.patients.national_id is
  'NID or passport number, as the patient reports it. Never used as a key — mrn is the identifier.';

-- -------------------------------------------------------------- clinical ---
-- Allergies, chronic illnesses, standing medications and past procedures.
--
-- One table with a `kind`, not four tables and not four jsonb columns on
-- `patients`. They share a shape exactly — a label, some detail, a date it
-- started, whether it still applies — and jsonb would have made the one query
-- that actually matters clinically impossible to write: "does this patient
-- have a drug allergy". A doctor's screen should be able to ask that.
--
-- These are standing facts about the person, which is what separates them from
-- the per-visit chart on `appointments` (0028). A penicillin allergy is not a
-- property of the Tuesday appointment where it was mentioned.

create type public.patient_history_kind as enum ('allergy', 'illness', 'medication', 'procedure');

create table public.patient_history (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,

  kind        public.patient_history_kind not null,

  -- "Penicillin", "Type 2 Diabetes", "Metformin 500mg", "Appendectomy".
  label       text not null
                constraint patient_history_label_check check (length(btrim(label)) > 0),

  -- Free text the patient or clinician adds: severity, dosage, the hospital
  -- that performed it.
  detail      text,

  started_on  date,

  -- An allergy is forever; a course of antibiotics is not. Defaults true
  -- because most of what gets recorded here is still true when it is recorded.
  ongoing     boolean not null default true,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index patient_history_patient_idx on public.patient_history (patient_id, kind);
create index patient_history_tenant_id_idx on public.patient_history (tenant_id);

-- The same thing recorded twice is a data-entry slip, not two conditions.
-- Case-insensitive for the same reason as the invoice reference in 0043.
create unique index patient_history_patient_kind_label_key
  on public.patient_history (patient_id, kind, lower(btrim(label)));

create trigger patient_history_set_updated_at
  before update on public.patient_history
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.patient_history');
