-- 0069_document_number_and_emergency_contact.sql
-- Two additions to what 0066 and 0068 built, both asked for by the same
-- reasoning: a document is its number as much as its scan, and the person to
-- call in an emergency needs more than a phone that might not answer.
--
-- 1. identity_documents.document_number — the NID / passport / birth
--    certificate number written on the paper. The pattern is the trade licence
--    on the hospital form: a number AND the scan, because the number is what
--    anyone else can look up and the scan is what proves it.
--
-- 2. patient_profiles.emergency_contact_email / _address — a phone is one way
--    to reach someone and not always the working one.

-- ------------------------------------------------------ the document number ---

alter table public.identity_documents
  add column document_number text
    constraint identity_documents_document_number_check
    check (document_number is null or length(btrim(document_number)) > 0);

comment on column public.identity_documents.document_number is
  'The number printed on the document. Nullable: someone may upload a scan '
  'they cannot read the number off, and a reviewer reads it from the file.';

/**
 * The number is part of what gets checked, so changing it is a new submission
 * exactly as a new file is. Otherwise a verified passport could keep its badge
 * while the number underneath it quietly became a different one.
 *
 * Replaces the body from 0068; everything else about it is unchanged.
 */
create or replace function public.identity_documents_guard_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if public.is_super_admin() then
    if new.status is distinct from old.status then
      new.reviewed_at := now();
      new.reviewed_by := (select auth.uid());
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'only a super admin decides whether a document is verified';
  end if;

  -- A new file, or a different number, is a new submission — whatever it
  -- replaced and whatever the old one had been decided to be.
  if new.file_key is distinct from old.file_key
     or new.document_number is distinct from old.document_number then
    new.status       := 'pending';
    new.submitted_at := now();
    new.reviewed_at  := null;
    new.reviewed_by  := null;
    new.review_note  := null;
  end if;

  return new;
end;
$$;

-- -------------------------------------------------- the emergency contact ---

alter table public.patient_profiles
  add column emergency_contact_email text
    constraint patient_profiles_emergency_contact_email_check
    check (emergency_contact_email is null
           or emergency_contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  add column emergency_contact_address text;

comment on column public.patient_profiles.emergency_contact_email is
  'Where to write to the emergency contact when a call does not connect.';
comment on column public.patient_profiles.emergency_contact_address is
  'Where that person is, which is what matters when nobody answers at all.';
