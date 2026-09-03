-- 0068_identity_documents.sql
-- Proof of who a patient is: a birth certificate, an NID or a passport,
-- uploaded by the patient and checked by a super admin.
--
-- Why it matters beyond a badge: if something happens to a patient in a
-- hospital's care, the platform can say who they actually are on paper rather
-- than who the account claimed to be.
--
-- The document belongs to the PERSON, like everything else 0066 moved off the
-- hospital record — a passport is not issued per hospital. Verification is a
-- platform judgement, so it is a super admin who makes it and nobody else.
--
-- A table rather than columns on patient_profiles, even though the UI takes
-- one document today: a person may hold several kinds, a rejected submission
-- should stay visible next to its replacement, and "verified" is a property of
-- a DOCUMENT that was checked, not of a row that happens to have a file on it.

create type public.id_document_kind as enum ('birth_certificate', 'nid', 'passport');

/**
 * `pending` the moment it is uploaded — there is no 'unverified' value,
 * because that is the absence of a document, not a state of one. Deriving it
 * keeps the two from disagreeing.
 */
create type public.id_verification_status as enum ('pending', 'verified', 'rejected');

create table public.identity_documents (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,

  kind         public.id_document_kind not null,

  -- The R2 object key ("identity/2026/09/a1b2c3d4.pdf"), never a URL and never
  -- the file. Served only through /api/v1/documents, which checks who is
  -- asking — see that route.
  file_key     text not null
                 constraint identity_documents_file_key_check check (length(btrim(file_key)) > 0),

  -- What the patient called it, so a reviewer sees "nid-front.jpg" rather than
  -- a random key. Not trusted for anything else.
  file_name    text,

  status       public.id_verification_status not null default 'pending',

  submitted_at timestamptz not null default now(),

  -- Filled in by the review. reviewed_by is the super admin who decided, kept
  -- so a decision has a name against it.
  reviewed_at  timestamptz,
  reviewed_by  uuid references public.profiles (id) on delete set null,
  /** Why it was rejected. The patient reads this, so it is written for them. */
  review_note  text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index identity_documents_profile_idx on public.identity_documents (profile_id);
-- The review queue: oldest submission first, which is the order to work it in.
create index identity_documents_pending_idx
  on public.identity_documents (submitted_at)
  where status = 'pending';

create trigger identity_documents_set_updated_at
  before update on public.identity_documents
  for each row execute function public.set_updated_at();

-- One document of each kind per person. Re-uploading a replacement should
-- replace, not pile up beside the old one.
create unique index identity_documents_profile_kind_key
  on public.identity_documents (profile_id, kind);

/**
 * A patient may upload and replace their own document. They may NOT decide
 * whether it is genuine — that is the whole point of the review, and a policy
 * alone cannot express it because the patient legitimately updates the same
 * row when replacing the file.
 *
 * So the column is guarded here: only a super admin moves the status, and
 * doing so stamps who decided and when. A patient replacing their file is sent
 * back to `pending`, because the thing that was checked is gone.
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

  -- A new file is a new submission, whatever it replaced.
  if new.file_key is distinct from old.file_key then
    new.status       := 'pending';
    new.submitted_at := now();
    new.reviewed_at  := null;
    new.reviewed_by  := null;
    new.review_note  := null;
  end if;

  return new;
end;
$$;

create trigger identity_documents_status_guard
  before update on public.identity_documents
  for each row execute function public.identity_documents_guard_status();

/** A fresh upload is always pending, whatever the client sent. */
create or replace function public.identity_documents_force_pending()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    new.status      := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.review_note := null;
  end if;
  return new;
end;
$$;

create trigger identity_documents_new_is_pending
  before insert on public.identity_documents
  for each row execute function public.identity_documents_force_pending();

-- ------------------------------------------------------------------- RLS ---

alter table public.identity_documents enable row level security;

-- Yours: upload, replace, look at, withdraw.
create policy identity_documents_self on public.identity_documents
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- The reviewer sees every submission. Deliberately NOT the hospitals: a
-- passport scan is identity evidence for the platform, not clinical
-- information a hospital needs. They see the badge, not the document.
create policy identity_documents_super on public.identity_documents
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Who uploaded what, and who decided: exactly the trail this feature exists to
-- leave. Column names only — the values are a file key and a person's status.
select public.attach_audit('public.identity_documents');

comment on table public.identity_documents is
  'Legal identity documents a patient uploads and a super admin verifies. The verified badge is derived from these rows, never stored on the profile.';
