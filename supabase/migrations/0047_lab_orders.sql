-- 0047_lab_orders.sql
-- Finishes HF-66. The catalogue half of /admin/lab has been real since 0032 —
-- `lab_tests`, wired through ResourcePage. The other half, the actual requests,
-- was still a hardcoded array of four: Aisha B.'s blood count, John D.'s lipid
-- panel, the same four for every hospital, none of it saved.
--
-- An order is one test requested for one patient: who asked, what was asked
-- for, and how far along it is.

create type public.lab_order_status as enum (
  'pending', 'sample_collected', 'processing', 'reported'
);

create table public.lab_orders (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,

  -- Human-facing code shown in the table ("L-1001"). A real column rather than
  -- something derived at render time, because it is what staff say out loud to
  -- each other and write on a sample tube.
  reference    text not null
                 constraint lab_orders_reference_check check (length(btrim(reference)) > 0),

  patient_id   uuid not null references public.patients (id) on delete cascade,

  -- Which catalogue entry was ordered, and what it was called at the time.
  --
  -- The link goes null rather than taking the order with it if a test is
  -- retired from the catalogue, and `test_name` is the snapshot that keeps the
  -- order readable afterwards — same reasoning as the employee snapshot on
  -- payroll_payslips (0042). What was ordered in March does not change because
  -- the price list was edited in June.
  lab_test_id  uuid references public.lab_tests (id) on delete set null,
  test_name    text not null
                 constraint lab_orders_test_name_check check (length(btrim(test_name)) > 0),

  -- Who requested it. Null for a walk-in the lab took directly.
  doctor_id    uuid references public.doctors (id) on delete set null,

  status       public.lab_order_status not null default 'pending',

  requested_at timestamptz not null default now(),

  -- Filled in at the end. A result with no reported_at, or the reverse, is a
  -- half-finished order, so the two move together.
  result       text,
  reported_at  timestamptz,
  constraint lab_orders_reported_together
    check ((result is null) = (reported_at is null)),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index lab_orders_tenant_id_idx on public.lab_orders (tenant_id);
create index lab_orders_patient_idx   on public.lab_orders (patient_id);
-- The list the page actually draws: what is still outstanding, oldest first.
create index lab_orders_open_idx
  on public.lab_orders (tenant_id, requested_at)
  where status <> 'reported';

-- Two orders with the same code inside one hospital are the same request
-- recorded twice, and the code goes on the sample tube. Case-insensitive for
-- the same reason as the invoice reference in 0043.
create unique index lab_orders_tenant_reference_key
  on public.lab_orders (tenant_id, lower(btrim(reference)));

create trigger lab_orders_set_updated_at
  before update on public.lab_orders
  for each row execute function public.set_updated_at();

-- The entire security story for this table.
select public.apply_tenant_rls('public.lab_orders');
