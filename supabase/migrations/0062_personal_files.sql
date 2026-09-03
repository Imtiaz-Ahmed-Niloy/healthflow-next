-- 0062_personal_files.sql
-- The document shelf behind /admin/personal-files (HF-64), which until now kept
-- three fake files in localStorage under storeKey "files" — the same vendor
-- agreement and infection-control policy in every hospital on the platform.
--
-- The ticket has been blocked on having somewhere to put a file. It is not any
-- more: 0061 added the `documents` folder in R2, uploads go browser →
-- Cloudflare by presigned PUT, and /api/v1/documents serves one back through a
-- link that expires in a minute. This table is the index over that shelf.

create table public.personal_files (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,

  -- How the hospital files it. Free text for the same reason as
  -- assets.category (0033): every hospital divides its paperwork differently,
  -- and pinning the list here would cost a migration each time. The form
  -- offers the common ones.
  folder       text not null default 'Other'
                 constraint personal_files_folder_check check (length(btrim(folder)) > 0),

  title        text not null
                 constraint personal_files_title_check check (length(btrim(title)) > 0),

  -- Whose document it is: a person, a department, a committee. Text rather
  -- than a profile reference, same reasoning as assets.assignee — "Quality
  -- Team" owns a policy and is nobody's login.
  owner        text,

  -- The R2 object key — "documents/2026/09/a1b2c3d4.pdf" — never a URL and
  -- never the file. Nullable on purpose: a hospital logging that a signed
  -- contract exists in a filing cabinet is a legitimate row, and refusing it
  -- would push that record back into a spreadsheet.
  file_key     text,

  -- Captured at upload from the browser, which is the only place it is known
  -- for free. Kept because a list of documents that cannot say how big they
  -- are makes people open each one to find out.
  size_bytes   bigint
                 constraint personal_files_size_check check (size_bytes is null or size_bytes > 0),

  -- Lowercase to match assets, doctors, nurses and lab_tests; the UI supplies
  -- the labels.
  status       text not null default 'active'
                 constraint personal_files_status_check
                 check (status in ('active', 'draft', 'archived')),

  notes        text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index personal_files_tenant_id_idx on public.personal_files (tenant_id);
create index personal_files_folder_idx    on public.personal_files (tenant_id, folder);

-- One row per stored object. Two rows pointing at the same key would mean
-- deleting one silently breaks the other's link.
create unique index personal_files_file_key_key
  on public.personal_files (file_key)
  where file_key is not null;

create trigger personal_files_set_updated_at
  before update on public.personal_files
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.personal_files');

-- The tenant policy alone is wrong here, and this is exactly the case the role
-- gate exists for. `apply_tenant_rls` is role-blind: every doctor, nurse and
-- receptionist carries the hospital's tenant_id, so without this line the
-- shelf holding contracts, licences and confidential staff paperwork would be
-- readable by all of them. The page is called Personal & Confidential Files.
select public.apply_role_gate('public.personal_files', '{hospital_admin,hr_admin}');

-- Column names only, never values — the default. These rows describe staff
-- documents.
select public.attach_audit('public.personal_files');
