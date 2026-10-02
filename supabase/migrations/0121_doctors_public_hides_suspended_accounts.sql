-- 0121_doctors_public_hides_suspended_accounts.sql
-- A doctor the super admin suspended was still on the site. Suspending an
-- account (0079) sets profiles.is_active = false and ends their sessions; it
-- does not touch doctors.status, which is all doctors_public looked at. So
-- they could not sign in, and patients could still find and book them.
--
-- The view now leaves out every row of a doctor whose account is suspended:
-- the home page, Find Doctors, their own page, their hospital's page and the
-- sitemap all read it. Reactivating the account brings them back. A directory
-- doctor has no account (profile_id is null) and is not affected.
--
-- The view is otherwise 0119's, unchanged.

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
              order by length(x.slug), x.slug
              limit 1)
           else d.slug
         end as person_slug,
         (t.id is not null and not t.listing_only) as bookable,
         case when t.listing_only then coalesce(nullif(d.phone, ''), t.contact_phone) end as serial_phone,
         d.designation
    from public.doctors d
    left join public.tenants t on t.id = d.tenant_id
   where d.status = 'active'::public.doctor_status
     and not exists (
           select 1 from public.profiles p
            where p.id = d.profile_id and not p.is_active)
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
