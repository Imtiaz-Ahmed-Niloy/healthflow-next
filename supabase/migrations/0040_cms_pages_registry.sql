-- 0040_cms_pages_registry.sql
-- Makes cms_pages the register of every public route, not just the six with
-- an editor.
--
-- The CMS page list (/super/cms) ran on localStorage: "New Page", the publish
-- pill and delete all wrote to one browser, and nothing on the public site
-- ever read them, so the publish toggle did nothing at all.
--
-- Three columns turn the existing table into that register:
--   path       the route the row stands for ('/features'), so the public side
--              can look a page up by URL
--   built_in   the route exists in the app router; it can be renamed and
--              unpublished, never deleted
--   protected  unpublishing it would lock people out (sign-in, sign-up), so
--              the database refuses

alter table public.cms_pages
  add column path      text,
  add column built_in  boolean not null default false,
  add column protected boolean not null default false;

-- Sign-in cannot be drafted. Enforced here rather than in the UI alone: a
-- drafted /signin locks every user, super admin included, out of the app that
-- would let them undo it.
alter table public.cms_pages
  add constraint cms_pages_protected_stays_published
  check (not protected or published);

-- The six rows that already exist keep their titles — a super admin may have
-- edited them — and gain their route.
update public.cms_pages set path = '/',         built_in = true where slug = 'home';
update public.cms_pages set path = '/features', built_in = true where slug = 'features';
update public.cms_pages set path = '/pricing',  built_in = true where slug = 'pricing';
update public.cms_pages set path = '/about',    built_in = true where slug = 'about';
update public.cms_pages set path = '/contact',  built_in = true where slug = 'contact';
update public.cms_pages set path = '/blog',     built_in = true where slug = 'blog';

-- The thirteen routes that render today but were never in the table.
insert into public.cms_pages (slug, title, path, built_in, protected, published) values
  ('hospitals',    'Hospitals',           '/hospitals',    true, false, true),
  ('doctors',      'Doctors',             '/doctors',      true, false, true),
  ('lab-tests',    'Lab Booking',         '/lab-tests',    true, false, true),
  ('reserve-room', 'Room Reservation',    '/reserve-room', true, false, true),
  ('telehealth',   'Telehealth',          '/telehealth',   true, false, true),
  ('career',       'Career',              '/career',       true, false, true),
  ('help-center',  'Help Center',         '/help-center',  true, false, true),
  ('privacy',      'Privacy Policy',      '/privacy',      true, false, true),
  ('terms',        'Terms & Conditions',  '/terms',        true, false, true),
  ('data-use',     'Data Use',            '/data-use',     true, false, true),
  ('cookies',      'Cookies',             '/cookies',      true, false, true),
  ('signin',       'Sign In',             '/signin',       true, true,  true),
  ('signup',       'Sign Up',             '/signup',       true, true,  true)
on conflict (slug) do nothing;

-- Every row has a route now, so the column can carry its constraints.
alter table public.cms_pages alter column path set not null;
create unique index cms_pages_path_key on public.cms_pages (path);
