-- 0033_assets.sql
-- The equipment register behind /admin/assets, which until now kept three demo
-- machines in localStorage under storeKey "assets" — so every hospital saw the
-- same fake MRI scanner and nothing an admin typed survived a refresh.
--
-- This is the register (what the hospital owns and where it is), not a
-- maintenance log (who serviced it, when, and what it cost). The status column
-- carries 'maintenance' as a state, but a service history is a separate table
-- with its own dates and costs, and it will reference this one.

create table public.assets (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,

  -- The inventory tag physically stuck on the equipment. Required, because an
  -- asset nobody can identify in a corridor is not a managed asset.
  tag          text not null
                 constraint assets_tag_check check (length(btrim(tag)) > 0),

  name         text not null
                 constraint assets_name_check check (length(btrim(name)) > 0),

  -- Free text, same reasoning as vendors.category in 0030: how a hospital
  -- divides its equipment is its own vocabulary, and pinning the list here
  -- would cost a migration every time biomedical met a new class of device.
  -- The form still offers the common ones as a select.
  category     text,

  -- Where it physically is — a ward, a room, a department. Deliberately not a
  -- reference to wards: assets sit in corridors, stores and offices too, none
  -- of which are wards.
  location     text,

  -- Deliberately text, not a staff reference. The seed this replaces carried
  -- "ICU Team", and that is the honest shape of it: equipment is signed out to
  -- a department or a shift as often as to a named person. A profile FK would
  -- force every team to be invented as a fake user.
  assignee     text,

  -- A date, not a timestamptz. Nobody records the hour an MRI was purchased,
  -- and storing one would invent a precision the invoice never had.
  purchased_at date,

  -- Lowercase to match doctors, nurses, support_staff and lab_tests; the UI
  -- supplies the labels. 'retired' is the terminal state — kept rather than
  -- deleted so an audit can still see what the hospital used to own.
  status       text not null default 'active'
                 constraint assets_status_check
                 check (status in ('active', 'maintenance', 'retired')),

  notes        text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index assets_tenant_id_idx on public.assets (tenant_id);
create index assets_status_idx    on public.assets (tenant_id, status);

-- An asset tag identifies one physical thing. Two rows sharing a tag inside a
-- hospital means the register can no longer answer "where is AST-0001". Scoped
-- to the tenant, so two hospitals may each run their own AST-0001 numbering.
create unique index assets_tenant_tag_key
  on public.assets (tenant_id, lower(btrim(tag)));

create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

-- The entire security story for this table.
select public.apply_tenant_rls('public.assets');
