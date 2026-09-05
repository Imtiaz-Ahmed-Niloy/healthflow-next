-- 0073_notifications.sql
-- The hospital's own notice board: things that happened in this hospital that
-- somebody on the admin side should see.
--
-- Until now `/admin/notifications` read a localStorage array seeded with three
-- invented rows (NotificationProvider.tsx). That is not a notification system,
-- it is a toast history: it lived in one browser, so a second admin saw
-- nothing, the same person on their phone saw nothing, and a refresh in a
-- private window emptied it. Anything worth telling somebody about has to
-- outlive the tab it happened in.
--
-- Two tables, because a notification and whether *you* have read it are
-- different facts with different owners. The event belongs to the hospital and
-- is written once; "read" belongs to a person and is written by each of them.
-- Putting a `read` boolean on the event itself would mean the first admin to
-- open the bell marked it read for everyone.

create type public.notification_tone as enum ('info', 'ok', 'warn', 'bad');

create table public.notifications (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,

  -- What kind of thing happened, in a form code can branch on — the title is
  -- for people, this is for filtering and for choosing an icon. Text rather
  -- than an enum on purpose: a new kind should not need a migration, and
  -- nothing in the database depends on the set being closed.
  kind      text not null
              constraint notifications_kind_check
              check (kind ~ '^[a-z][a-z0-9_.]{1,60}$'),

  title     text not null
              constraint notifications_title_check
              check (length(btrim(title)) > 0 and length(title) <= 200),
  body      text constraint notifications_body_check check (length(body) <= 2000),

  tone      public.notification_tone not null default 'info',

  /**
   * What it is about, so the feed can link to it: ('admissions', <uuid>)
   * becomes a row you can click through to.
   *
   * Deliberately NOT a foreign key, and deliberately a plain text table name
   * rather than a reference to anything: a notification is a statement that
   * something happened, and it stays true after the row it mentions is
   * deleted. The same reasoning as the actor snapshot on audit_logs (0058).
   * The UI treats a dead link as an unlinked row rather than an error.
   */
  entity_type text constraint notifications_entity_type_check
                check (entity_type is null or entity_type ~ '^[a-z_]{1,60}$'),
  entity_id   uuid,

  -- There is deliberately no actor column. attach_audit below already records
  -- who wrote each row, and a second copy of that fact on the notification
  -- would be one more thing to keep honest for something the feed never shows.

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The feed is "this hospital, newest first", which is the only way it is read.
create index notifications_tenant_created_idx
  on public.notifications (tenant_id, created_at desc);

-- "Everything about this admission" — used to link the other way.
create index notifications_entity_idx
  on public.notifications (entity_type, entity_id)
  where entity_type is not null;

create trigger notifications_set_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.notifications');

-- The tenant template is role-blind, and a notification title carries whatever
-- the event was about — "Invoice INV-20406 marked paid", "Payroll run
-- approved". That is the finance desk's business, and a doctor holds this
-- hospital's tenant_id too. Same panel the page itself sits behind
-- (src/middleware.ts), minus the clinical roles that have no admin feed.
select public.apply_role_gate('public.notifications',
                              '{hospital_admin,hr_admin,finance_admin,lab_admin,pharmacy_admin}');

select public.attach_audit('public.notifications');

comment on table public.notifications is
  'Hospital-scoped notice board. One row per event worth telling an admin about; whether a given person has read it lives in notification_reads.';

-- ------------------------------------------------------------- the reads ---

create table public.notification_reads (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,

  notification_id uuid not null
                    references public.notifications (id) on delete cascade,

  -- Stamped from the session by the route (ResourceDefinition.ownerColumn),
  -- for the same reason it stamps tenant_id: a body field must never choose
  -- whose read receipt this is. The policy below enforces it regardless.
  profile_id      uuid not null references public.profiles (id) on delete cascade,

  read_at         timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Reading something twice is still having read it once.
create unique index notification_reads_one_per_person
  on public.notification_reads (notification_id, profile_id);

-- "Which of these have I read" — the query behind the unread count.
create index notification_reads_profile_idx
  on public.notification_reads (profile_id, notification_id);

create trigger notification_reads_set_updated_at
  before update on public.notification_reads
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.notification_reads');

-- On top of the tenant policy: a read receipt is personal. Without this,
-- everyone in the hospital could see (and clear) everyone else's unread marks,
-- which is both wrong and useless — the count would move on its own.
create policy notification_reads_own_only
  on public.notification_reads
  as restrictive
  for all
  to authenticated
  using      (public.is_super_admin() or profile_id = (select auth.uid()))
  with check (public.is_super_admin() or profile_id = (select auth.uid()));

-- No attach_audit here, and that is a decision rather than an oversight.
-- Every bell-open would write an audit row per notification, burying the
-- writes /super/logs exists to show under a stream of "X read a thing". The
-- notification itself is audited above; who read it is not an accountable act.

comment on table public.notification_reads is
  'One row per person per notification they have read. Personal: RLS narrows it to the reader''s own rows. Deliberately not audited — see 0073.';
