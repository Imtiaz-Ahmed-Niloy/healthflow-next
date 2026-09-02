-- 0060_community_platform_wide.sql
-- The community is every doctor on HealthFlow, not one hospital's.
--
-- 0059 scoped the feed to the author's own hospital, on the reasoning that
-- posts carry case details and this database keeps one hospital's clinical
-- material away from another everywhere else. Ridwan's call is that a doctors'
-- community that stops at the hospital wall is not a community: a colleague at
-- another hospital is exactly who you want an answer from. So the wall comes
-- down for reading and for taking part.
--
-- What does NOT change:
--
--   * You still write only as yourself. The author is still a column default,
--     and update stays limited to your own rows.
--   * `tenant_id` still records which hospital each post, comment and reaction
--     came from. It is provenance now rather than a boundary — the feed shows
--     it next to the author's name, so it is clear who you are talking to.
--   * A hospital_admin still sees and moderates only their own hospital's
--     material. They are not doctors; a platform-wide clinical feed is not
--     theirs to read, and moderating other hospitals' posts is not their job.
--
-- Nothing else in the database is opened up by this. Posts are the only place
-- where doctors write to each other, and everything they name — patients,
-- appointments, prescriptions — remains tenant-scoped.

-- ------------------------------------------------------------ reading ---

drop policy community_posts_read on public.community_posts;

create policy community_posts_read on public.community_posts
  for select to authenticated
  using (
    public.auth_role() = 'doctor'
    or (public.auth_role() = 'hospital_admin' and tenant_id = public.auth_tenant_id())
  );

-- A hospital_admin sees replies written by their own doctors, and every reply
-- under their own hospital's posts. The second half is not generosity: without
-- it they could not moderate the one thread they are responsible for —
-- Postgres applies the SELECT policy to the rows a DELETE has to find, so a
-- reply they cannot see is a reply they cannot remove.
drop policy community_comments_read on public.community_comments;

create policy community_comments_read on public.community_comments
  for select to authenticated
  using (
    public.auth_role() = 'doctor'
    or (
      public.auth_role() = 'hospital_admin'
      and (
        tenant_id = public.auth_tenant_id()
        or exists (
          select 1 from public.community_posts p
           where p.id = post_id and p.tenant_id = public.auth_tenant_id()
        )
      )
    )
  );

-- Same shape, so an admin's view of a post of theirs carries the same counts
-- everyone else sees rather than only the reactions from their own doctors.
drop policy community_reactions_read on public.community_reactions;

create policy community_reactions_read on public.community_reactions
  for select to authenticated
  using (
    public.auth_role() = 'doctor'
    or (
      public.auth_role() = 'hospital_admin'
      and (
        tenant_id = public.auth_tenant_id()
        or exists (
          select 1 from public.community_posts p
           where p.id = post_id and p.tenant_id = public.auth_tenant_id()
        )
      )
    )
  );

-- ----------------------------------------------------------- replying ---
-- The comment's own tenant_id is still the COMMENTER's hospital, stamped from
-- their token — it says where the reply came from, not where the post lives.
-- The check that the post exists stays: it stops a comment being hung on an id
-- that is not a post at all. It just no longer demands the post be ours.

drop policy community_comments_insert on public.community_comments;

create policy community_comments_insert on public.community_comments
  for insert to authenticated
  with check (
    tenant_id = public.auth_tenant_id()
    and doctor_id = public.auth_doctor_id()
    and exists (select 1 from public.community_posts p where p.id = post_id)
  );

-- --------------------------------------------------------- moderating ---
-- A hospital_admin could already delete comments written BY their doctors.
-- Now that outsiders can reply, they also need to be able to take a reply off
-- a post of their own — otherwise the one thread they are responsible for is
-- the one they cannot clean up.

drop policy community_comments_delete on public.community_comments;

create policy community_comments_delete on public.community_comments
  for delete to authenticated
  using (
    (doctor_id = public.auth_doctor_id() and tenant_id = public.auth_tenant_id())
    or (
      public.auth_role() = 'hospital_admin'
      and (
        tenant_id = public.auth_tenant_id()
        or exists (
          select 1 from public.community_posts p
           where p.id = post_id and p.tenant_id = public.auth_tenant_id()
        )
      )
    )
  );
