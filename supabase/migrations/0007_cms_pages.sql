-- 0007_cms_pages.sql
-- Global table: platform-wide CMS content, not per-hospital.
-- One row per page (home, features, pricing, about, contact, blog).

create table public.cms_pages (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,     -- 'home', 'features', 'pricing', etc.
  title      text not null,
  blocks     jsonb not null default '{}'::jsonb,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cms_pages_slug_idx on public.cms_pages (slug);

create trigger cms_pages_set_updated_at
  before update on public.cms_pages
  for each row execute function public.set_updated_at();

-- Hand-written RLS (global table — see "Global tables" in docs/module-guide.md)
alter table public.cms_pages enable row level security;

-- Public read (marketing site must not require login)
create policy cms_pages_public_read on public.cms_pages
  for select to anon, authenticated using (published);

-- Only super_admin can write
create policy cms_pages_super_write on public.cms_pages
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());