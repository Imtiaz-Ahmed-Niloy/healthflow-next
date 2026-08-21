-- 0029_doctor_medicine_usage.sql
-- The Add Medicine picker's default list (before a doctor types anything)
-- used to be a client-side "recently used" cache in localStorage --
-- per-device (reset on every different workstation), lost if browser
-- storage was ever cleared, and only ever "recent," never "most used,"
-- since a local MRU cache has no way to count how many times something was
-- actually prescribed.
--
-- One row per (doctor, medicine, form, DOSE). Dose is part of the identity
-- on purpose: Napa 20mg and Napa 40mg are tracked as two separate entries,
-- each with its own count. Merging them and just remembering "whichever
-- dose was used most recently" was tried first and rejected -- it means
-- picking "Napa" could silently prefill the wrong dose for this patient
-- (say, a child's 20mg carried over onto an adult who needs 40mg) with
-- nothing prompting the doctor to notice. Getting a default dose wrong is a
-- mistake, not just noise, so it isn't collapsed away.
--
-- Incremented the moment a medicine is added to an Rx (POST
-- /api/v1/portal/medicines, called from Prescription.tsx's saveMedicine),
-- not on final submit -- a doctor shouldn't have to finish and print the
-- whole visit before "used it once" counts, and this way the picker's own
-- most-used list is caught up before the *next* patient's dialog even
-- opens. Not derived by re-aggregating every appointment's medicines on
-- every picker open, which would only get slower as a doctor's history
-- grows.
--
-- Same RLS shape as every other tenant-scoped table (tenant_select/insert/
-- update/delete); the API route additionally filters on doctor_id itself,
-- same defense-in-depth convention as queue/route.ts and consultation/:id.

create table public.doctor_medicine_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  name text not null,
  dosage_form text not null default '',
  dose text not null default '',
  use_count integer not null default 1,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (doctor_id, name, dosage_form, dose)
);

create index doctor_medicine_usage_doctor_rank_idx
  on public.doctor_medicine_usage (doctor_id, use_count desc, last_used_at desc);

alter table public.doctor_medicine_usage enable row level security;

create policy tenant_select on public.doctor_medicine_usage for select
  using (is_super_admin() or (tenant_id = auth_tenant_id()));
create policy tenant_insert on public.doctor_medicine_usage for insert
  with check (is_super_admin() or (tenant_id = auth_tenant_id()));
create policy tenant_update on public.doctor_medicine_usage for update
  using (is_super_admin() or (tenant_id = auth_tenant_id()))
  with check (is_super_admin() or (tenant_id = auth_tenant_id()));
create policy tenant_delete on public.doctor_medicine_usage for delete
  using (is_super_admin() or (tenant_id = auth_tenant_id()));

-- Bulk upsert for one Rx's worth of medicines at once (a handful of RPC
-- round-trips per submit is worth avoiding). GROUP BY dedupes the same
-- medicine+dose appearing twice in one Rx by mistake -- ON CONFLICT DO
-- UPDATE errors if a single statement would touch the same conflict target
-- twice.
create or replace function public.record_medicine_usage(
  p_tenant_id uuid,
  p_doctor_id uuid,
  p_medicines jsonb
) returns void
language plpgsql
set search_path to ''
as $$
begin
  insert into public.doctor_medicine_usage (tenant_id, doctor_id, name, dosage_form, dose, use_count, last_used_at)
  select p_tenant_id, p_doctor_id, m.name, coalesce(m.dosage_form, ''), coalesce(m.dose, ''), 1, now()
  from jsonb_to_recordset(p_medicines) as m(name text, dosage_form text, dose text)
  where m.name is not null and btrim(m.name) <> ''
  group by m.name, coalesce(m.dosage_form, ''), coalesce(m.dose, '')
  on conflict (doctor_id, name, dosage_form, dose)
  do update set
    use_count = public.doctor_medicine_usage.use_count + 1,
    last_used_at = now();
end;
$$;
