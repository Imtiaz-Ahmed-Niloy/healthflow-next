-- 0100: hospital_rooms_public shows each cabin as itself, not grouped by category.
--
-- Cabins used to be grouped by category ("Standard", "Deluxe"...) because
-- category was the only thing distinguishing rows when the Add Cabin form
-- still asked for it. It no longer does (Wards.tsx now calls the field
-- "Cabin Name" and category defaults to 'standard' for everything), so every
-- cabin was showing up publicly as "Standard" regardless of what an admin
-- actually typed. Each cabin is now its own room row instead, named by its
-- real `number` ("AC Cabin 1"), which is what the public page should have
-- been showing all along.

create or replace view public.hospital_rooms_public as
  select
    w.id as room_id,
    t.slug as hospital_slug,
    w.name as type,
    case when w.category = 'icu' then 'ICU' else 'Ward' end as category,
    w.daily_rate::numeric as price,
    w.facilities as included,
    count(b.id) as total,
    count(b.id) filter (where b.status = 'available') as available
  from public.wards w
  join public.tenants t on t.id = w.tenant_id
  left join public.beds b on b.ward_id = w.id
  where t.status in ('approved', 'pending') and t.kind = 'hospital'
  group by w.id, t.slug

  union all

  select
    c.id as room_id,
    t.slug as hospital_slug,
    c.number as type,
    'Cabin' as category,
    c.daily_rate::numeric as price,
    c.amenities as included,
    1 as total,
    (case when c.status = 'available' then 1 else 0 end) as available
  from public.cabins c
  join public.tenants t on t.id = c.tenant_id
  where t.status in ('approved', 'pending') and t.kind = 'hospital';

grant select on public.hospital_rooms_public to anon, authenticated;
