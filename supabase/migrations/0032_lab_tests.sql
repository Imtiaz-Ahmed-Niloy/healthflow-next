-- 0032_lab_tests.sql
-- The lab test catalogue behind /admin/lab, which until now kept four demo
-- tests in localStorage under storeKey "lab-catalog" — so every hospital saw
-- the same fake catalogue and nothing an admin typed survived a refresh.
--
-- This is the catalogue (what a hospital offers and charges), not the request
-- queue (who ordered what for which patient). The queue on the same page is
-- still seed-backed and needs its own table and ticket; it carries patient and
-- doctor references this table deliberately has none of.
--
-- Tenant-scoped, which is the whole point of the ticket: a hospital's price
-- list is its own. Note this replaces a free-text `hospital` column the old
-- seed carried, whose "All Hospitals" value existed only because there was
-- nothing else to scope by. tenant_id is that scope now, so the column is gone
-- rather than migrated — see the resource file.

create table public.lab_tests (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,

  name        text not null
                constraint lab_tests_name_check check (length(btrim(name)) > 0),

  -- Free text rather than a check constraint, same reasoning as
  -- vendors.category in 0030: a hospital's lab departments are its own
  -- vocabulary, and pinning the list here would mean a migration every time a
  -- lab added a section. The form still offers the common ones as a select.
  category    text,

  -- numeric(10,2) matches the form's 0.01 step. Not null because a catalogue
  -- entry with no price is not something a patient can be quoted.
  price       numeric(10,2) not null
                constraint lab_tests_price_check check (price >= 0),

  -- Deliberately text, not an interval: these are human-facing quotes like
  -- "4 hours" or "same day", and labs quote ranges that no interval can hold.
  turnaround  text,

  -- What is collected — blood, urine, none for imaging.
  sample      text,

  -- Fasting, timing, what to remove before a scan. Shown to the patient.
  prep        text,

  description text,

  -- Whether the hospital currently offers it. Lowercase to match doctors,
  -- nurses and support_staff; the UI supplies the labels.
  status      text not null default 'active'
                constraint lab_tests_status_check check (status in ('active', 'inactive')),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index lab_tests_tenant_id_idx on public.lab_tests (tenant_id);
create index lab_tests_category_idx  on public.lab_tests (tenant_id, category);

-- A hospital cannot list the same test twice. Scoped to the tenant, so two
-- hospitals may each carry their own "Complete Blood Count" row.
create unique index lab_tests_tenant_name_key
  on public.lab_tests (tenant_id, lower(btrim(name)));

create trigger lab_tests_set_updated_at
  before update on public.lab_tests
  for each row execute function public.set_updated_at();

-- The entire security story for this table.
select public.apply_tenant_rls('public.lab_tests');
