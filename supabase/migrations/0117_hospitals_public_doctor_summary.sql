-- 0117_hospitals_public_doctor_summary.sql
-- How many doctors a hospital lists, and in which specialties, on the
-- hospital itself.
--
-- The hospital list used to fetch every doctor on the site to count each
-- hospital's and match a specialty filter. With the DrListify directory
-- (0116) that is 14,000 rows for a page of hospital cards, and past
-- PostgREST's 1,000-row cap. Both answers are small; the view carries them.

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
     and t.kind = 'hospital'::public.tenant_kind;
