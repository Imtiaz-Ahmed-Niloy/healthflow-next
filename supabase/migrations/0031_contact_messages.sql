-- 0031_contact_messages.sql
-- The table behind the /contact form, which until now threw every submission
-- away: onSubmit fired a success toast and cleared the fields, and nothing was
-- ever stored or emailed.
--
-- Global, not tenant-scoped. /contact is the marketing site's own form — a
-- visitor writing to HealthFlow, not to any one hospital — so there is no
-- tenant to stamp and apply_tenant_rls (which refuses tables without a
-- tenant_id) does not apply. Policies are hand-written below, the same way
-- cms_pages does it in 0007.
--
-- This is the first table in the schema that takes writes from ANONYMOUS
-- callers, which changes what the policies have to defend against. The
-- publishable key is public by definition — it ships in the browser bundle —
-- so anyone can POST straight at PostgREST without going near our route
-- handler. Every constraint that matters is therefore in the database, not in
-- the Zod schema: the schema is a nicer error message, the constraints are the
-- boundary.

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),

  -- Length caps are the DB's job here, not the form's. Unbounded text from an
  -- anonymous writer is a free disk-fill; these are generous for a real
  -- enquiry and useless for a payload.
  name       text not null
               constraint contact_messages_name_check
               check (length(btrim(name)) between 1 and 120),

  email      text not null
               constraint contact_messages_email_check
               check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
                      and length(email) <= 254),

  -- Free text rather than a check constraint against the four subjects in
  -- defaultContactContent. That list is CMS content — a super admin edits it
  -- on /super/cms/contact — so pinning it in a constraint would mean a
  -- migration every time someone renamed a dropdown option.
  subject    text not null
               constraint contact_messages_subject_check
               check (length(btrim(subject)) between 1 and 200),

  message    text not null
               constraint contact_messages_message_check
               check (length(btrim(message)) between 1 and 5000),

  -- Triage state for whoever reads these. 'new' is the only value an
  -- anonymous writer may insert; see the insert policy.
  status     text not null default 'new'
               constraint contact_messages_status_check
               check (status in ('new', 'read', 'replied', 'archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The inbox is read newest-first and filtered by status, which is the whole
-- of how this table is queried.
create index contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index contact_messages_status_idx     on public.contact_messages (status, created_at desc);

create trigger contact_messages_set_updated_at
  before update on public.contact_messages
  for each row execute function public.set_updated_at();

-- Hand-written RLS (global table — see "Global tables" in docs/module-guide.md)
alter table public.contact_messages enable row level security;

-- Anyone may write one. This is the point of a public contact form.
--
-- `status = 'new'` is enforced here rather than left to the column default,
-- because a default only applies when the column is omitted — a direct
-- PostgREST call with the publishable key can name it, and without this a
-- spammer could file straight into 'archived' and never be seen.
create policy contact_messages_public_insert on public.contact_messages
  for insert to anon, authenticated
  with check (status = 'new');

-- A super admin may file one at any status — the enquiry that arrived by phone
-- and belongs in the same inbox. Permissive policies are OR'd, so this widens
-- the rule above for super admins without loosening it for anyone else.
create policy contact_messages_super_insert on public.contact_messages
  for insert to authenticated
  with check (public.is_super_admin());

-- Nobody may read them back except a super admin. Note there is deliberately
-- no read policy for anon: the sender cannot re-read their own message, which
-- is what stops the insert policy above from turning this table into a public
-- pastebin.
create policy contact_messages_super_read on public.contact_messages
  for select to authenticated
  using (public.is_super_admin());

-- Triage (marking read/replied/archived) and clean-up, super admin only.
create policy contact_messages_super_update on public.contact_messages
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy contact_messages_super_delete on public.contact_messages
  for delete to authenticated
  using (public.is_super_admin());
