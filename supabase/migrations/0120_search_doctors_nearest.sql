-- 0120_search_doctors_nearest.sql
-- search_doctors_public (0116) gains a 'nearest' sort: doctors in the
-- visitor's district first, then the rest of their division, then everyone
-- else. The district is the site's guess from the visitor's IP address
-- (src/server/geo.ts), passed in as p_near_district / p_near_division —
-- spelled as in bd_districts / bd_divisions (0096), like the filters.
--
-- A doctor is as near as their nearest place. It is an ordering, not a
-- filter: nobody drops out, so the count is the same under every sort.
--
-- This is the one sort where partners do not come first across the whole
-- list: a bookable doctor in another division is not nearer than a listed one
-- down the road. Within each band of nearness they still do.
--
-- The two new parameters make it a different function, and PostgREST cannot
-- choose between two that both fit a call — so the old one is dropped. Both
-- default to null: a caller sending the old nine arguments gets the old
-- behaviour.

drop function public.search_doctors_public(text, text, text, text, text, text, text, integer, integer);

create function public.search_doctors_public(
  p_q text default null,
  p_specialty text default null,
  p_gender text default null,
  p_division text default null,
  p_district text default null,
  p_upazila text default null,
  p_sort text default 'recommended',
  p_limit integer default 24,
  p_offset integer default 0,
  p_near_division text default null,
  p_near_district text default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with matched as (
    select coalesce(v.person_slug, v.slug) as person,
           v.bookable, v.photo_url, v.experience_years, v.consultation_fee, v.created_at,
           case when v.district = nullif(p_near_district, '') then 2
                when v.division = nullif(p_near_division, '') then 1
                else 0 end as nearness
      from public.doctors_public v
     where (nullif(btrim(p_specialty), '') is null or btrim(v.specialty) = btrim(p_specialty))
       and (nullif(p_gender, '') is null or v.gender::text = p_gender)
       and (nullif(p_division, '') is null or v.division = p_division)
       and (nullif(p_district, '') is null or v.district = p_district)
       and (nullif(p_upazila, '') is null or v.subdistrict = p_upazila)
       and (nullif(btrim(p_q), '') is null
            or v.name ilike '%' || btrim(p_q) || '%'
            or v.specialty ilike '%' || btrim(p_q) || '%'
            or v.hospital_name ilike '%' || btrim(p_q) || '%'
            or v.location ilike '%' || btrim(p_q) || '%'
            or v.district ilike '%' || btrim(p_q) || '%'
            or v.designation ilike '%' || btrim(p_q) || '%')
  ),
  people as (
    select person,
           bool_or(bookable) as bookable,
           bool_or(photo_url is not null) as has_photo,
           max(experience_years) as experience,
           min(consultation_fee) as fee_low,
           max(consultation_fee) as fee_high,
           max(created_at) as created,
           max(nearness) as nearness
      from matched
     group by person
  ),
  page as (
    select person, count(*) over () as total
      from people
     order by case when p_sort = 'nearest' then nearness end desc nulls last,
              bookable desc,
              case when p_sort = 'experience' then experience end desc nulls last,
              case when p_sort = 'feeLow' then fee_low end asc nulls last,
              case when p_sort = 'feeHigh' then fee_high end desc nulls last,
              has_photo desc, created desc, person
     limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset)
  )
  select jsonb_build_object(
    'total', coalesce((select max(total) from page), 0),
    'order', coalesce((select jsonb_agg(person) from page), '[]'::jsonb),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(v))
        from public.doctors_public v
       where coalesce(v.person_slug, v.slug) in (select person from page)
    ), '[]'::jsonb)
  );
$$;

comment on function public.search_doctors_public(text, text, text, text, text, text, text, integer, integer, text, text) is
  'The public doctor directory, filtered, sorted and paged in the database (0116). p_sort ''nearest'' orders by p_near_district, then p_near_division (0120).';

grant execute on function public.search_doctors_public(text, text, text, text, text, text, text, integer, integer, text, text) to anon, authenticated;
