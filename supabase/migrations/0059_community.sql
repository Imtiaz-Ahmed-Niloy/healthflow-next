-- 0059_community.sql
-- The doctors' community feed behind /portal/community.
--
-- The screen was the worst demo page in the app: it did not even use
-- localStorage. Posts, comments and reactions lived in component state, so a
-- doctor could write a case discussion, watch two colleagues appear to reply
-- (they were seeded), refresh, and find the whole thread gone. The three
-- seeded doctors — Sarah Chen, Ahmed Rashid, Emily Park — greeted every user
-- of every hospital with the same three posts, and the header claimed "2,148
-- doctors, 47 today".
--
-- Three tables: a post, its comments, and one reaction per doctor per post.
--
-- The feed is HOSPITAL-SCOPED. That is a decision, not an oversight: these
-- posts carry case details — "54M with atypical chest pain, ECG showed…" —
-- and this database keeps one hospital's clinical material away from another
-- everywhere else. A platform-wide feed is a consent question first and a
-- schema change second; if it is wanted, the tenant predicate in the read
-- policies is the only thing that has to move.

create type public.community_category as enum ('discussion', 'question', 'case_study', 'thought');
create type public.community_reaction as enum ('like', 'love', 'insightful');

/**
 * Which doctor the caller is, or null if they are not one.
 *
 * The portal already resolves this per request by looking up
 * `doctors.profile_id = auth.uid()`; the policies below need the same answer,
 * so it lives in the database once rather than being re-derived in each one.
 */
-- Invoker, not definer: a doctor can already read the doctors of their own
-- hospital, so this needs no privileges of its own. Definer would hand it a
-- read across every tenant to answer a question about one row.
create or replace function public.auth_doctor_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select d.id from public.doctors d where d.profile_id = (select auth.uid()) limit 1
$$;

revoke all on function public.auth_doctor_id() from public, anon;
grant execute on function public.auth_doctor_id() to authenticated;

-- ------------------------------------------------------------- posts ---

create table public.community_posts (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  -- Defaulted rather than sent: the author is whoever is writing, and a
  -- request cannot claim to be someone else even before RLS checks it.
  -- Cascade, because a post signed by a doctor who no longer exists is a post
  -- nobody can answer.
  doctor_id uuid not null default public.auth_doctor_id()
              references public.doctors (id) on delete cascade,

  category  public.community_category not null default 'discussion',

  content   text not null
              constraint community_posts_content_check
              check (length(btrim(content)) > 0 and length(content) <= 5000),

  -- R2 object keys, never URLs: [{"key": "community/2026/09/ab12.png"}].
  -- Same rule as every other image in this codebase — see src/lib/media.ts.
  media     jsonb not null default '[]'::jsonb
              constraint community_posts_media_check
              check (jsonb_typeof(media) = 'array' and jsonb_array_length(media) <= 4),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_posts_feed_idx on public.community_posts (tenant_id, created_at desc);
create index community_posts_doctor_idx on public.community_posts (doctor_id);

create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------- comments ---

create table public.community_comments (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  post_id   uuid not null references public.community_posts (id) on delete cascade,
  doctor_id uuid not null default public.auth_doctor_id()
              references public.doctors (id) on delete cascade,

  body      text not null
              constraint community_comments_body_check
              check (length(btrim(body)) > 0 and length(body) <= 2000),

  -- "This is what I would do" rather than "I agree". The screen has always
  -- shown these differently; now it is a column rather than a seeded flag.
  is_suggestion boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_comments_post_idx on public.community_comments (post_id, created_at);

create trigger community_comments_set_updated_at
  before update on public.community_comments
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------- reactions ---

create table public.community_reactions (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  post_id   uuid not null references public.community_posts (id) on delete cascade,
  doctor_id uuid not null default public.auth_doctor_id()
              references public.doctors (id) on delete cascade,
  reaction  public.community_reaction not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One reaction per doctor per post: changing your mind is an update, not a
-- second row. This is also what makes the counts trustworthy — there is
-- deliberately no `like_count` column to drift out of step with the rows.
create unique index community_reactions_one_per_doctor
  on public.community_reactions (post_id, doctor_id);

create index community_reactions_post_idx on public.community_reactions (post_id);

create trigger community_reactions_set_updated_at
  before update on public.community_reactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- rls ---
-- Hand-written rather than apply_tenant_rls, because the template's write rule
-- is "anyone in this hospital", and here it has to be "the person who wrote
-- it". Reading is the hospital's doctors and its admin; writing is yourself.
-- A hospital_admin can delete — someone has to be able to take down a post
-- that should not have been made — but cannot edit, because editing someone
-- else's words under their name is a different thing entirely.

alter table public.community_posts      enable row level security;
alter table public.community_comments   enable row level security;
alter table public.community_reactions  enable row level security;

create policy community_posts_read on public.community_posts
  for select to authenticated
  using (
    tenant_id = public.auth_tenant_id()
    and public.auth_role() in ('doctor', 'hospital_admin')
  );

create policy community_posts_insert on public.community_posts
  for insert to authenticated
  with check (
    tenant_id = public.auth_tenant_id()
    and doctor_id = public.auth_doctor_id()
  );

create policy community_posts_update on public.community_posts
  for update to authenticated
  using (tenant_id = public.auth_tenant_id() and doctor_id = public.auth_doctor_id())
  with check (tenant_id = public.auth_tenant_id() and doctor_id = public.auth_doctor_id());

create policy community_posts_delete on public.community_posts
  for delete to authenticated
  using (
    tenant_id = public.auth_tenant_id()
    and (doctor_id = public.auth_doctor_id() or public.auth_role() = 'hospital_admin')
  );

create policy community_comments_read on public.community_comments
  for select to authenticated
  using (
    tenant_id = public.auth_tenant_id()
    and public.auth_role() in ('doctor', 'hospital_admin')
  );

create policy community_comments_insert on public.community_comments
  for insert to authenticated
  with check (
    tenant_id = public.auth_tenant_id()
    and doctor_id = public.auth_doctor_id()
    -- and only under a post you can actually see
    and exists (
      select 1 from public.community_posts p
       where p.id = post_id and p.tenant_id = public.auth_tenant_id()
    )
  );

create policy community_comments_update on public.community_comments
  for update to authenticated
  using (tenant_id = public.auth_tenant_id() and doctor_id = public.auth_doctor_id())
  with check (tenant_id = public.auth_tenant_id() and doctor_id = public.auth_doctor_id());

create policy community_comments_delete on public.community_comments
  for delete to authenticated
  using (
    tenant_id = public.auth_tenant_id()
    and (doctor_id = public.auth_doctor_id() or public.auth_role() = 'hospital_admin')
  );

-- Reactions are yours alone: no moderation case, so no admin exception.
create policy community_reactions_read on public.community_reactions
  for select to authenticated
  using (
    tenant_id = public.auth_tenant_id()
    and public.auth_role() in ('doctor', 'hospital_admin')
  );

create policy community_reactions_write on public.community_reactions
  for all to authenticated
  using (tenant_id = public.auth_tenant_id() and doctor_id = public.auth_doctor_id())
  with check (tenant_id = public.auth_tenant_id() and doctor_id = public.auth_doctor_id());

-- -------------------------------------------------------------- audit ---
-- Names of columns only, never values: a post is a doctor writing about a
-- patient, and copying that into the audit trail would put it somewhere every
-- super admin can read across hospitals. See 0058.

select public.attach_audit('public.community_posts');
select public.attach_audit('public.community_comments');
select public.attach_audit('public.community_reactions');
