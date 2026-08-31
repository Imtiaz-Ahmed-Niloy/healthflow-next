-- 0038_announcements.sql
-- The table behind /super/announcements, which until now kept two demo
-- announcements in localStorage under "hf:announcements:v1" (see
-- src/data/announcements.ts) -- so every visitor saw the same two, and anything
-- a super admin wrote lived only in their own browser and never reached the
-- public site.
--
-- Global, not tenant-scoped. An announcement is a platform-wide broadcast: it
-- comes from HealthFlow and goes to everyone, the same as cms_pages and
-- packages. There is no tenant to stamp, and apply_tenant_rls (which refuses
-- tables without a tenant_id) does not apply. Policies are hand-written below,
-- the same way cms_pages does it in 0007 -- public read of the published rows,
-- super_admin writes.

create table public.announcements (
  id         uuid primary key default gen_random_uuid(),

  -- 'text' renders the gradient header; 'image' renders the uploaded picture.
  type       text not null default 'text'
               constraint announcements_type_check check (type in ('text', 'image')),

  title      text not null
               constraint announcements_title_check
               check (length(btrim(title)) between 1 and 200),

  body       text not null default ''
               constraint announcements_body_check check (length(body) <= 5000),

  -- A base64 data URL today, carried on the record exactly as the localStorage
  -- version did. Real upload is waiting on Cloudflare R2 (docs/image-uploads-
  -- r2.md); when it lands this column holds an R2 URL instead, and because it
  -- is already text that swap needs no migration.
  image      text,

  cta_label  text
               constraint announcements_cta_label_check
               check (cta_label is null or length(cta_label) <= 100),
  cta_url    text
               constraint announcements_cta_url_check
               check (cta_url is null or length(cta_url) <= 2000),

  -- Lowercase to match doctors, assets and the rest; the page owns the display
  -- labels. Only 'published' is visible on the public site -- 'draft' and
  -- 'archived' are super-admin-only, enforced by the read policies below.
  status     text not null default 'draft'
               constraint announcements_status_check
               check (status in ('published', 'draft', 'archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The public popup asks for published rows newest-first; the super admin table
-- filters by status. Nothing queries this table any other way.
create index announcements_status_idx on public.announcements (status, created_at desc);

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- Hand-written RLS (global table -- see "Global tables" in docs/module-guide.md)
alter table public.announcements enable row level security;

-- Public read of published announcements. The marketing-site popup must work
-- for signed-out visitors, so this grants `anon` as well as `authenticated` --
-- exactly the cms_pages pattern. Draft and archived rows are never visible
-- through this policy.
create policy announcements_public_read on public.announcements
  for select to anon, authenticated
  using (status = 'published');

-- A super admin does everything else: reads every row (drafts and archived
-- included, so the console is complete) and is the only writer.
create policy announcements_super_write on public.announcements
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());
