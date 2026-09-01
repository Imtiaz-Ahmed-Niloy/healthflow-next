-- 0052_support_tickets.sql
-- The support tickets table behind /super/tickets, which until now kept its
-- demo tickets in hardcoded seed data under storeKey "tickets".
--
-- Tenant-scoped: tickets carry a tenant_id so hospital admins can view their own
-- raised support tickets, while super_admin can view and triage tickets across all hospitals.

create table public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid references public.tenants (id) on delete cascade,

  subject    text not null
               constraint support_tickets_subject_check check (length(btrim(subject)) > 0 and length(btrim(subject)) <= 200),

  tenant     text
               constraint support_tickets_tenant_check check (tenant is null or length(btrim(tenant)) <= 200),

  priority   text not null default 'Medium'
               constraint support_tickets_priority_check check (priority in ('Low', 'Medium', 'High', 'Critical')),

  assignee   text
               constraint support_tickets_assignee_check check (assignee is null or length(btrim(assignee)) <= 200),

  status     text not null default 'Pending'
               constraint support_tickets_status_check check (status in ('Pending', 'Processing', 'Resolved')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_tenant_id_idx on public.support_tickets (tenant_id);
create index support_tickets_created_at_idx on public.support_tickets (created_at desc);

create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- Apply RLS (super_admin sees everything, everyone else sees only their own hospital)
select public.apply_tenant_rls('public.support_tickets');
