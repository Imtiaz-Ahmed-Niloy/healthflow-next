-- 0070_identity_document_holder.sql
-- Whose document this is.
--
-- 0068 assumed every identity document belonged to the patient. It doesn't:
-- the emergency contact needs proving too. When a hospital calls the person a
-- patient named and hands over a decision about their care, "who is this on
-- the phone" is exactly the question the papers answer.
--
-- A column rather than a second table: it is the same document, checked by the
-- same reviewer against the same rules, and splitting it would duplicate the
-- trigger, the policies and the review queue for one word of difference.

create type public.id_document_holder as enum ('self', 'emergency_contact');

alter table public.identity_documents
  add column holder public.id_document_holder not null default 'self';

comment on column public.identity_documents.holder is
  'Whose papers these are — the patient''s own, or their emergency contact''s. '
  'Only a verified `self` document puts the badge on a name.';

-- One document of each kind per person PER HOLDER: a patient and the person
-- they nominated may both have an NID, and both belong on the same profile.
drop index if exists public.identity_documents_profile_kind_key;
create unique index identity_documents_profile_holder_kind_key
  on public.identity_documents (profile_id, holder, kind);

/**
 * Same guard as 0069, with one more thing that counts as a new submission:
 * moving a document from one holder to the other. A scan verified as the
 * patient's own is not thereby verified as their brother's.
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

  -- A new file, a different number, or a different holder is a new
  -- submission — whatever it replaced and whatever it had been decided to be.
  if new.file_key is distinct from old.file_key
     or new.document_number is distinct from old.document_number
     or new.holder is distinct from old.holder then
    new.status       := 'pending';
    new.submitted_at := now();
    new.reviewed_at  := null;
    new.reviewed_by  := null;
    new.review_note  := null;
  end if;

  return new;
end;
$$;
