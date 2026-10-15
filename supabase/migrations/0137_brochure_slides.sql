-- 0137_brochure_slides.sql
-- Global table for managing slides and configuration of the digital brochure (/brochure).
-- Follows the announcements (0053) and cms_pages (0007) pattern:
-- Platform-wide content (no tenant_id), public read of published slides,
-- and super_admin writes.

create table public.brochure_slides (
  id               uuid primary key default gen_random_uuid(),
  position         integer not null default 0,
  type             text not null default 'custom'
                     constraint brochure_slides_type_check
                     check (type in ('cover', 'overview', 'doctor', 'hospital', 'pathology', 'pharmacy', 'custom')),
  title            text not null
                     constraint brochure_slides_title_check
                     check (length(btrim(title)) between 1 and 300),
  subtitle         text not null default ''
                     constraint brochure_slides_subtitle_check
                     check (length(subtitle) <= 1000),
  badge            text not null default ''
                     constraint brochure_slides_badge_check
                     check (length(badge) <= 100),
  tagline          text not null default ''
                     constraint brochure_slides_tagline_check
                     check (length(tagline) <= 500),
  features         jsonb not null default '[]'::jsonb,
  highlight_badge  jsonb,
  image            text,
  cta_label        text
                     constraint brochure_slides_cta_label_check
                     check (cta_label is null or length(cta_label) <= 100),
  cta_url          text
                     constraint brochure_slides_cta_url_check
                     check (cta_url is null or length(cta_url) <= 2000),
  status           text not null default 'published'
                     constraint brochure_slides_status_check
                     check (status in ('published', 'draft', 'archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index brochure_slides_position_idx on public.brochure_slides (status, position asc);

create trigger brochure_slides_set_updated_at
  before update on public.brochure_slides
  for each row execute function public.set_updated_at();

-- Hand-written RLS for global table
alter table public.brochure_slides enable row level security;

-- Public read of published brochure slides
create policy brochure_slides_public_read on public.brochure_slides
  for select to anon, authenticated
  using (status = 'published');

-- Super admin writes and sees all slides
create policy brochure_slides_super_write on public.brochure_slides
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());
