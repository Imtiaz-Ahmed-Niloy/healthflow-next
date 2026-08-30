-- 0041_cms_blog_posts.sql
-- Global table: the public blog's articles.
--
-- 0007 moved the blog *page* (masthead, section copy) into cms_pages and left
-- the articles themselves on localStorage, seeded from a hardcoded array in
-- src/data/blog.ts. Both the admin editor and the public /blog read that same
-- browser key, so an article written in the CMS existed only in the browser
-- that wrote it and no visitor ever saw it.
--
-- Not tenant-scoped: this is the platform's own publication, the same for
-- every hospital, so it gets hand-written policies like cms_pages rather than
-- apply_tenant_rls. See "Global tables" in docs/module-guide.md.

create table public.cms_blog_posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  dek          text not null default '',
  category     text not null default '',
  cover        text not null default '',
  author       text not null default '',
  author_photo text not null default '',
  author_role  text not null default '',
  body         text[] not null default '{}',
  published_at date not null default current_date,
  read_time    integer not null default 5,
  views        integer not null default 0,
  featured     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- The blog lists newest first.
create index cms_blog_posts_published_at_idx on public.cms_blog_posts (published_at desc);

-- One lead story. The editor clears the current lead before setting the new
-- one, and this index makes sure a bug there cannot leave two behind.
create unique index cms_blog_posts_one_featured on public.cms_blog_posts (featured)
  where featured;

create trigger cms_blog_posts_set_updated_at
  before update on public.cms_blog_posts
  for each row execute function public.set_updated_at();

alter table public.cms_blog_posts enable row level security;

-- Public read: the blog is marketing, it must not require a login.
create policy cms_blog_posts_public_read on public.cms_blog_posts
  for select to anon, authenticated using (true);

-- Only super_admin writes.
create policy cms_blog_posts_super_write on public.cms_blog_posts
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Seed the nine articles that were hardcoded in src/data/blog.ts, so the
-- public blog does not go blank the moment it starts reading real data. They
-- shared one placeholder body there and still do here; a real body arrives
-- when someone edits the post.
with body as (
  select array[
    $p$We've spent the last three years quietly measuring something most hospitals take for granted: the way a room makes a body feel. The results are unambiguous — design is medicine.$p$,
    $p$Across two flagship campuses, post-surgical patients in our biophilic wards reported lower pain scores, used 22% less PRN analgesia, and were discharged on average 1.7 days sooner than a matched cohort in standard rooms.$p$,
    $p$The mechanism, we believe, is a combination of three inputs: filtered daylight that anchors the circadian system, planted volumes that lower measured cortisol within fifteen minutes of exposure, and acoustic engineering that drops ambient noise to under 35 decibels at night.$p$,
    $p$None of this replaces the surgeon, the medication or the nurse. It is, instead, the substrate on which their work compounds. We think every hospital should be built this way — and we think the data is now strong enough to demand it.$p$
  ] as paragraphs
),
seed (slug, title, dek, category, cover, author, author_photo, author_role, published_at, read_time, views, featured) as (values
  ('biophilic-recovery',           'How Biophilic Wards Cut Recovery Time by 28%',              'A 3-year study across our flagship campuses links daylight, plants and natural acoustics to faster post-surgical healing.',        'Research',      '/assets/hub-atrium.jpg',  'Dr. Elena Park',   '/assets/doctors/doc-1.jpg', 'Cardiology',    date '2026-05-02', 8, 12400, true),
  ('heart-of-cities',              'The Quiet Epidemic: Urban Heart Disease in Under-40s',      'Why young professionals in dense cities are presenting with cardiac events a decade earlier — and what to do about it.',           'Cardiology',    '/assets/hub-coastal.jpg', 'Dr. Marcus Vale',  '/assets/doctors/doc-2.jpg', 'Neurology',     date '2026-04-28', 6,  8920, false),
  ('pediatric-screen-time',        'Screen Time and Sleep: A Pediatrician''s Honest Guide',     'Practical, judgement-free routines that work for real families with toddlers, tweens and teens.',                                 'Pediatrics',    '/assets/hub-atrium.jpg',  'Dr. Aisha Rahman', '/assets/doctors/doc-3.jpg', 'Pediatrics',    date '2026-04-24', 5, 15200, false),
  ('joint-longevity',              'Joint Longevity After 40: Strength, Mobility, Recovery',    'The three-pillar protocol I prescribe to weekend athletes who want to keep moving for the next 40 years.',                        'Orthopedics',   '/assets/hub-coastal.jpg', 'Dr. Liam Chen',    '/assets/doctors/doc-4.jpg', 'Orthopedics',   date '2026-04-19', 7,  6700, false),
  ('early-detection-breakthroughs','Early Detection: What Liquid Biopsy Means for Patients',    'A plain-language guide to the blood-test breakthroughs reshaping how we catch cancer in stage zero.',                             'Oncology',      '/assets/hub-atrium.jpg',  'Dr. Noor Hassan',  '/assets/doctors/doc-5.jpg', 'Oncology',      date '2026-04-14', 9, 11300, false),
  ('skin-microbiome',              'Your Skin Has a Microbiome. Here''s How to Feed It.',       'Why the gentle, less-is-more approach is winning in modern dermatology — and the five products I actually recommend.',              'Dermatology',   '/assets/hub-coastal.jpg', 'Dr. Sofia Mendes', '/assets/doctors/doc-6.jpg', 'Dermatology',   date '2026-04-09', 4, 18600, false),
  ('mindful-burnout',              'Burnout Isn''t Weakness — It''s Biology',                   'What the latest neuroscience says about chronic stress, and the recovery framework we use with high-performers.',                  'Mental Health', '/assets/hub-atrium.jpg',  'Dr. Mira Solis',   '/assets/doctors/doc-5.jpg', 'Mental Health', date '2026-04-05', 6,  9450, false),
  ('lung-altitude',                'Breathing at Altitude: A Pulmonologist in the Rockies',     'Field notes from treating elite climbers, weekend hikers and lifelong residents at 5,400 feet.',                                  'Pulmonology',   '/assets/hub-coastal.jpg', 'Dr. Priya Iyer',   '/assets/doctors/doc-3.jpg', 'Pulmonology',   date '2026-03-30', 7,  5300, false),
  ('robotic-surgery',              'Robotic Surgery in 2026: What Patients Should Ask',         'Five honest questions to ask your surgeon before you consent to a robotic-assisted procedure.',                                   'Surgery',       '/assets/hub-atrium.jpg',  'Dr. Hiro Tanaka',  '/assets/doctors/doc-2.jpg', 'Surgery',       date '2026-03-22', 8,  7800, false)
)
insert into public.cms_blog_posts
  (slug, title, dek, category, cover, author, author_photo, author_role, published_at, read_time, views, featured, body)
select seed.*, body.paragraphs from seed cross join body;
