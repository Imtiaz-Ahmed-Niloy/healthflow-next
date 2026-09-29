-- 0116_directory_listings.sql
-- Hospitals and doctors that are LISTED on HealthFlow without running on it.
--
-- DrListify's directory (7,000 doctors, 2,000 hospitals and diagnostic
-- centres; imported with their permission by scripts/drlistify) is mostly
-- places that do not use HealthFlow. They belong on the public site — a
-- patient looking for a neurologist in Bogura should find one — but nobody at
-- those places would ever see a HealthFlow booking. So:
--
--   tenants.listing_only   shown publicly, never bookable online. The doctor's
--                          card offers their serial number to call instead.
--                          Not a partner (hospitals_public.is_partner), and a
--                          trigger refuses any appointment at one.
--   doctors.person_key     one person across several rows. A doctor with a
--                          login is already one person through profile_id
--                          (0077/0090); an imported doctor has no login, so
--                          the rows at their chamber and at their job share a
--                          key instead, and the public view gives them one
--                          person_slug — one profile, one card.
--   doctors.designation    their post at that place: "Associate Professor
--                          (Neurology)".
--   *.source_ref           where an imported row came from, so re-running the
--                          import updates rather than duplicates.
--
-- Also: the specialties a directory this size needs beside the original 16,
-- and search_doctors_public(), which filters and pages the directory in the
-- database. The site used to fetch every doctor and filter in the browser; at
-- 14,000 rows that is both slow and past PostgREST's 1,000-row cap.

-- ------------------------------------------------------------ columns ---

alter table public.tenants
  add column listing_only boolean not null default false,
  add column source_ref text;

create unique index tenants_source_ref_key on public.tenants (source_ref) where source_ref is not null;

alter table public.doctors
  add column person_key text,
  add column source_ref text,
  add column designation text
    constraint doctors_designation_check check (designation is null or length(designation) <= 300);

create index doctors_person_key_idx on public.doctors (person_key) where person_key is not null;
create unique index doctors_source_ref_key on public.doctors (source_ref) where source_ref is not null;

-- -------------------------------------------------------- specialties ---

insert into public.specialties (name, sort_order)
select v.name, v.sort_order
  from (values
    ('Ophthalmology', 170), ('Pulmonology', 180), ('Rheumatology', 190),
    ('Hematology', 200), ('Physical Medicine', 210), ('Anesthesiology', 220),
    ('Homeopathy', 230)
  ) as v(name, sort_order)
 where not exists (select 1 from public.specialties s where lower(s.name) = lower(v.name));

-- -------------------------------------------------------------- views ---

-- As before; a listing-only hospital is not a partner, and says so.
create or replace view public.hospitals_public as
  select id, name, slug, tagline, location, division, district, subdistrict, address,
         logo_url, cover_image_url, specialties, facilities, opening_hours, summary, about,
         beds, doctor_count, founded_year, rating, reviews_count, contact_phone, contact_email,
         additional_phones, additional_emails, websites, social, created_at,
         (status = 'approved'::public.tenant_status and not listing_only) as is_partner,
         management_body,
         listing_only
    from public.tenants
   where status = any (array['approved'::public.tenant_status, 'pending'::public.tenant_status])
     and kind = 'hospital'::public.tenant_kind;

-- As before, plus: person_slug also joins rows sharing a person_key; and at
-- the end whether the row can be booked online, the number to call for a
-- serial where it cannot, and the doctor's post there.
create or replace view public.doctors_public as
  select d.id, d.tenant_id, d.name, d.slug, d.specialty, d.education, d.bio, d.languages,
         d.expertise, d.experience_years, d.rating, d.consultation_fee, d.patients_treated,
         d.consultation_duration_minutes, d.availability, d.photo_url, d.status, d.created_at,
         t.location, t.division, t.district, t.subdistrict,
         t.name as hospital_name, t.slug as hospital_slug,
         d.gender, d.bmdc_number,
         (t.kind)::text as practice_kind,
         t.address as practice_address,
         t.contact_phone as practice_phone,
         case
           when d.profile_id is not null then (
             select x.slug from public.doctors x
              where x.profile_id = d.profile_id
              order by (x.tenant_id is null), x.created_at, x.id
              limit 1)
           when d.person_key is not null then (
             select x.slug from public.doctors x
              where x.person_key = d.person_key
              order by x.created_at, x.id
              limit 1)
           else d.slug
         end as person_slug,
         not coalesce(t.listing_only, false) as bookable,
         case when t.listing_only then coalesce(nullif(d.phone, ''), t.contact_phone) end as serial_phone,
         d.designation
    from public.doctors d
    left join public.tenants t on t.id = d.tenant_id
   where d.status = 'active'::public.doctor_status
     and (t.status = 'approved'::public.tenant_status
          or (d.tenant_id is null
              and not exists (
                select 1 from public.doctors x
                  join public.tenants tx on tx.id = x.tenant_id
                 where d.profile_id is not null
                   and x.profile_id = d.profile_id
                   and x.status = 'active'::public.doctor_status
                   and tx.status = 'approved'::public.tenant_status)));

-- ------------------------------------------------------------ booking ---

create or replace function public.appointments_not_at_listing()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.tenants t where t.id = new.tenant_id and t.listing_only) then
    raise exception 'this hospital is listed on HealthFlow but does not take bookings here — call for a serial';
  end if;
  return new;
end;
$$;

create trigger appointments_not_at_listing
  before insert on public.appointments
  for each row execute function public.appointments_not_at_listing();

-- ------------------------------------------------------------- search ---

/**
 * One page of the public doctor directory, filtered and sorted here rather
 * than in the browser. A doctor is a person (person_slug): the filters match
 * if any of their rows does, and the page holds whole people — every row of
 * each, so the card can list all their places.
 *
 * Returns { "total": people matching, "rows": [doctors_public rows] }.
 * Partners come first under every sort: a doctor who can be booked here is
 * the more useful answer.
 */
create or replace function public.search_doctors_public(
  p_q text default null,
  p_specialty text default null,
  p_gender text default null,
  p_division text default null,
  p_district text default null,
  p_upazila text default null,
  p_sort text default 'recommended',
  p_limit integer default 24,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with matched as (
    select coalesce(v.person_slug, v.slug) as person,
           v.bookable, v.photo_url, v.experience_years, v.consultation_fee, v.created_at
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
           max(created_at) as created
      from matched
     group by person
  ),
  page as (
    select person, count(*) over () as total
      from people
     order by bookable desc,
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

grant execute on function public.search_doctors_public(text, text, text, text, text, text, text, integer, integer) to anon, authenticated;
