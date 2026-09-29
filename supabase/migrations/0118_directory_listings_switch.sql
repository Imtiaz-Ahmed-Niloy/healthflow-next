-- 0118_directory_listings_switch.sql
-- A switch for the DrListify directory (0116): off, its listing-only
-- hospitals and their doctors stay out of the public views.
--
-- The directory is imported before the site code that understands it is
-- deployed. The code live until then fetches every doctor and hospital in one
-- request (PostgREST caps that at 1,000 rows, so the partners would drop off
-- the list behind the newest imports) and offers Book on every doctor. So the
-- rows go in dark, and the switch goes on once the new code is live:
--
--   update public.global_settings set directory_listings_live = true;
--
-- Partner hospitals and their doctors are never affected by it.

alter table public.global_settings
  add column directory_listings_live boolean not null default false;

-- Readable by anyone through the views; the settings row itself stays behind
-- its own policies.
create or replace function public.directory_listings_live()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select directory_listings_live from public.global_settings limit 1), false);
$$;

grant execute on function public.directory_listings_live() to anon, authenticated;

create or replace view public.hospitals_public as
  select t.id, t.name, t.slug, t.tagline, t.location, t.division, t.district, t.subdistrict, t.address,
         t.logo_url, t.cover_image_url, t.specialties, t.facilities, t.opening_hours, t.summary, t.about,
         t.beds, t.doctor_count, t.founded_year, t.rating, t.reviews_count, t.contact_phone, t.contact_email,
         t.additional_phones, t.additional_emails, t.websites, t.social, t.created_at,
         (t.status = 'approved'::public.tenant_status and not t.listing_only) as is_partner,
         t.management_body,
         t.listing_only,
         (select count(*)::integer from public.doctors d
           where d.tenant_id = t.id and d.status = 'active'::public.doctor_status) as doctors_listed,
         (select coalesce(array_agg(distinct btrim(d.specialty)) filter (where nullif(btrim(d.specialty), '') is not null), '{}')
            from public.doctors d
           where d.tenant_id = t.id and d.status = 'active'::public.doctor_status) as doctor_specialties
    from public.tenants t
   where t.status = any (array['approved'::public.tenant_status, 'pending'::public.tenant_status])
     and t.kind = 'hospital'::public.tenant_kind
     and (not t.listing_only or public.directory_listings_live());

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
     and (d.person_key is null or public.directory_listings_live())
     and (t.status = 'approved'::public.tenant_status
          or (d.tenant_id is null
              and not exists (
                select 1 from public.doctors x
                  join public.tenants tx on tx.id = x.tenant_id
                 where d.profile_id is not null
                   and x.profile_id = d.profile_id
                   and x.status = 'active'::public.doctor_status
                   and tx.status = 'approved'::public.tenant_status)));
