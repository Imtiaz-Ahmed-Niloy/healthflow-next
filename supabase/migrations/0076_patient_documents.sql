-- 0076_patient_documents.sql
-- A patient's own medical paperwork, on /patient/medical-records.
--
-- The profile's "Documents" tab was a placeholder — "uploading and storing
-- files is not built yet". People arrive with years of paper: a prescription
-- from a chamber that has never heard of HealthFlow, a blood report from a
-- diagnostic centre, an X-ray, a discharge summary. This is where they keep
-- it, beside the records HealthFlow itself produced.
--
-- The patient's alone. Like identity_documents (0068) the row belongs to the
-- login, not to a hospital: a patient may be treated in several, and a file
-- they upload is theirs to show, not the first hospital's to read. No hospital
-- role and no tenant_id. Nobody but the owner sees a row — not even a super
-- admin, who has no clinical reason to open someone's blood report.
--
-- The file itself sits in R2 under records/, and is served only through
-- /api/v1/documents, which checks this table (RLS answers "is it yours") and
-- then hands out a 60-second link. The public address is never rendered.

create type public.patient_document_kind as enum (
  'prescription',       -- written by any doctor, anywhere
  'lab_report',         -- blood, urine, pathology
  'imaging',            -- X-ray, ultrasound, CT, MRI
  'discharge_summary',  -- leaving a hospital
  'vaccination',        -- a card or certificate
  'insurance',          -- a policy, a claim
  'other'
);

create table public.patient_documents (
  id            uuid primary key default gen_random_uuid(),

  -- Whose paper. Stamped from the session by the API (ownerColumn), never
  -- taken from the request.
  profile_id    uuid not null references public.profiles (id) on delete cascade,

  kind          public.patient_document_kind not null default 'other',

  title         text not null
                  constraint patient_documents_title_check check (length(btrim(title)) > 0),

  -- An R2 object key from /api/v1/uploads (folder records/), never a URL.
  file_key      text not null
                  constraint patient_documents_file_key_check check (file_key like 'records/%'),
  file_name     text,
  content_type  text,
  size_bytes    bigint
                  constraint patient_documents_size_check check (size_bytes is null or size_bytes > 0),

  -- The date printed on the paper — when the test was done, not when it was
  -- uploaded. Optional: plenty of old paper has none.
  document_date date,
  notes         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index patient_documents_profile_idx on public.patient_documents (profile_id, created_at desc);

create trigger patient_documents_set_updated_at
  before update on public.patient_documents
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------- RLS ---

alter table public.patient_documents enable row level security;

-- Yours: upload, rename, look at, remove. Nobody else, in any role.
create policy patient_documents_self on public.patient_documents
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

select public.attach_audit('public.patient_documents');

comment on table public.patient_documents is
  'Medical paperwork a patient uploads for themselves — prescriptions, reports, scans. Visible to the owner only; files served through /api/v1/documents.';
