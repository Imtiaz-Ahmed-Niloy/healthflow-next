-- 0098: exposes the real lab catalogue, ward/cabin room inventory, and the
-- management body captured on /super/hospitals, to the public site.
--
-- /hospitals/<slug> has shown invented lab tests, room types and leadership
-- bios since the page was built, none of it read from a real table. The lab
-- catalogue (0066), wards/beds (0017) and cabins (0018) are real by now; this
-- migration is what makes them visible outside the admin panels.

-- ---------------------------------------------------------- lab_tests_public ---
-- Same shape as hospitals_public/doctors_public: only what is safe to publish,
-- and only for hospitals the directory already lists (0097).

create view public.lab_tests_public as
  select
    l.id,
    t.slug as hospital_slug,
    l.name,
    l.category,
    l.price,
    l.turnaround
  from public.lab_tests l
  join public.tenants t on t.id = l.tenant_id
  where l.status = 'active'
    and t.status in ('approved', 'pending')
    and t.kind = 'hospital';

grant select on public.lab_tests_public to anon, authenticated;

-- ------------------------------------------------------- hospital_rooms_public ---
-- One row per ward (a real "type" already: name/category/rate/facilities
-- describe a tier, and beds are counted for availability), plus one row per
-- cabin category per hospital -- cabins have no type table of their own, so
-- rows are grouped and their rates/amenities averaged/unioned.
--
-- No occupant data crosses this view: beds.patient and cabins.patient/
-- attendant/admitted_on are never selected, only counts.

create view public.hospital_rooms_public as
  select
    w.id as room_id,
    t.slug as hospital_slug,
    w.name as type,
    case when w.category = 'icu' then 'ICU' else 'Ward' end as category,
    w.daily_rate as price,
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
    min(c.id::text)::uuid as room_id,
    t.slug as hospital_slug,
    initcap(c.category::text) as type,
    'Cabin' as category,
    round(avg(c.daily_rate), 2) as price,
    coalesce((
      select array_agg(distinct a)
      from public.cabins c2, unnest(c2.amenities) as a
      where c2.tenant_id = c.tenant_id and c2.category = c.category
    ), '{}') as included,
    count(*) as total,
    count(*) filter (where c.status = 'available') as available
  from public.cabins c
  join public.tenants t on t.id = c.tenant_id
  where t.status in ('approved', 'pending') and t.kind = 'hospital'
  group by c.tenant_id, c.category, t.slug;

grant select on public.hospital_rooms_public to anon, authenticated;

-- --------------------------------------------------------- hospitals_public ---
-- Adds management_body, the leadership list captured on step 3 of the
-- hospital form ("Owner & Management"). chairman/ceo/medical_director stay
-- off: they are quick-reference duplicates of names already in
-- management_body, and owner_* stays off as before -- that is personal data
-- about the hospital's owner, not its public leadership listing.

create or replace view public.hospitals_public as
  select
    id,
    name,
    slug,
    tagline,
    location,
    division,
    district,
    subdistrict,
    address,
    logo_url,
    cover_image_url,
    specialties,
    facilities,
    opening_hours,
    summary,
    about,
    beds,
    doctor_count,
    founded_year,
    rating,
    reviews_count,
    contact_phone,
    contact_email,
    additional_phones,
    additional_emails,
    websites,
    social,
    created_at,
    (status = 'approved') as is_partner,
    -- Appended at the end: CREATE OR REPLACE VIEW can only add columns after
    -- the existing ones, not splice them in by "logical" position.
    management_body
  from public.tenants
  where status in ('approved', 'pending')
    and kind = 'hospital';

grant select on public.hospitals_public to anon, authenticated;
