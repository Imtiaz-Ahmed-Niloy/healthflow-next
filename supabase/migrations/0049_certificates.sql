-- 0049_certificates.sql
-- The table behind /admin/administration, which kept six demo certificates in
-- localStorage under storeKey "admin-certificates" — a birth certificate for
-- "Baby of Anita Sharma", a death certificate for "Mr. Suresh Kapoor" — the
-- same six for every hospital, none of it saved.
--
-- These are documents a hospital issues about a person: about a patient (birth,
-- death, fitness, discharge) or about a member of staff (experience, NOC,
-- relieving, salary).

create type public.certificate_type as enum (
  'birth', 'death', 'medical_fitness', 'discharge', 'vaccination', 'disability',
  'experience', 'noc', 'relieving', 'salary'
);

-- 'revoked' is not the end of the forward flow, it is a withdrawal: a
-- certificate that was issued and should no longer be relied on. Recorded
-- rather than deleted, for the same reason a rejected requisition is (0048) —
-- "this document was withdrawn" is a fact someone will need to prove.
create type public.certificate_status as enum ('pending', 'issued', 'revoked');

create table public.certificates (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,

  -- What appears on the document itself ("BC-2026-0142").
  certificate_no  text not null
                    constraint certificates_no_check check (length(btrim(certificate_no)) > 0),

  type            public.certificate_type not null,

  -- Who it is about.
  --
  -- Both links are nullable and the name is not: a hospital issues certificates
  -- about people who have no record in it — a relative collecting a death
  -- certificate, a former employee asking for an experience letter years later.
  -- The name is what is printed, so it is the required part, and it is a
  -- snapshot: renaming a patient must not silently reword a document already
  -- handed over.
  recipient_name  text not null
                    constraint certificates_recipient_check
                    check (length(btrim(recipient_name)) > 0),
  patient_id      uuid references public.patients (id) on delete set null,
  employee_id     uuid references public.employees (id) on delete set null,

  -- Who signed it. Free text: it may be a doctor, or an office rather than a
  -- person ("HR Office").
  issued_by       text,

  -- Null while pending. An issued certificate must carry the date it was
  -- issued — a document with no date on it is not a document.
  issued_on       date,

  details         text,

  status          public.certificate_status not null default 'pending',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint certificates_issued_has_date
    check (status <> 'issued' or issued_on is not null)
);

create index certificates_tenant_id_idx on public.certificates (tenant_id);
create index certificates_type_idx      on public.certificates (tenant_id, type);
create index certificates_patient_idx   on public.certificates (patient_id);
create index certificates_employee_idx  on public.certificates (employee_id);

-- A certificate number identifies one document. Two rows sharing one inside a
-- hospital means two different documents claim to be the same one, which is
-- exactly the thing a certificate number exists to prevent. Case-insensitive,
-- like the invoice reference in 0043.
create unique index certificates_tenant_no_key
  on public.certificates (tenant_id, lower(btrim(certificate_no)));

create trigger certificates_set_updated_at
  before update on public.certificates
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.certificates');

-- Role gate, for the reason 0045 exists: the tenant template is role-blind and
-- doctors carry a tenant_id, so without this any doctor could read every salary
-- certificate the hospital has ever issued. Restrictive, so it ANDs with the
-- tenant policy and can only narrow.
create policy certificates_role_gate on public.certificates
  as restrictive for all to authenticated
  using (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin'))
  with check (public.is_super_admin() or public.auth_role() in ('hospital_admin', 'hr_admin'));
