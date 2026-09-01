-- 0052_support_tickets.sql
-- The table behind /super/tickets, which kept three demo tickets in hardcoded
-- seed data under storeKey "tickets" — "Cannot generate payroll for May" from
-- "Greenfield", the same three for every viewer, none of it saved.
--
-- A support ticket is a hospital asking the platform for help. So the hospital
-- is not optional: `tenant_id` is not null. A ticket with no hospital on it is
-- one nobody can answer and nobody can find again.

create type public.support_ticket_priority as enum ('low', 'medium', 'high', 'critical');

create type public.support_ticket_status as enum ('pending', 'processing', 'resolved');

create table public.support_tickets (
  id          uuid primary key default gen_random_uuid(),

  -- Who raised it. Not null on purpose — see the header. Cascade because a
  -- deleted hospital's support history has nothing left to refer to.
  tenant_id   uuid not null references public.tenants (id) on delete cascade,

  subject     text not null
                constraint support_tickets_subject_check
                check (length(btrim(subject)) > 0 and length(btrim(subject)) <= 200),

  -- The body of the request. Optional: a one-line subject is a real ticket.
  details     text,

  -- Who on the support desk owns it. Free text rather than a profile
  -- reference: the desk is platform-side staff, and they are not users of any
  -- hospital in this database. Same reasoning as assets.assignee (0033).
  assignee    text
                constraint support_tickets_assignee_check
                check (assignee is null or length(btrim(assignee)) <= 200),

  priority    public.support_ticket_priority not null default 'medium',
  status      public.support_ticket_status not null default 'pending',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- There is deliberately no `tenant` name column. The hospital's name is one
-- join away through tenant_id, and a copy of it here would be a second answer
-- to the same question — one that goes stale the moment a hospital is renamed.
-- It could not even be defended as a snapshot: the FK cascades, so the ticket
-- dies with the hospital and there is nothing for a snapshot to outlive.

create index support_tickets_tenant_id_idx  on public.support_tickets (tenant_id);
create index support_tickets_created_at_idx on public.support_tickets (created_at desc);

create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

select public.apply_tenant_rls('public.support_tickets');

-- Tenant RLS is role-blind, so without this every doctor and nurse carrying the
-- hospital's tenant_id could read its support tickets straight from Postgres
-- with the publishable key. These carry billing disputes, outage reports and
-- whatever an admin typed while angry — administrative correspondence, not
-- clinical data. super_admin passes inside the template, which is what makes
-- the triage screen work. See docs/module-guide.md, "Does your table need a
-- role gate?".
select public.apply_role_gate('public.support_tickets', '{hospital_admin}');
