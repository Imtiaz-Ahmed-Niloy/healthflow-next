-- 0097: the public hospital list shows pending hospitals too.
--
-- The directory is every hospital in the country, not only the ones signed up
-- with HealthFlow. A pending hospital is listed like any other; what it lacks
-- is the "Partner hospital" badge, which only an approved one carries — hence
-- `is_partner`, appended as the last column.
--
-- Suspended stays out: that is a super admin taking a hospital down on
-- purpose. Chambers stay out as before (0088).
--
-- Same columns, same order and same security as 0088 — still no
-- security_invoker; see 0054. Column list is unchanged apart from the one
-- appended, so no licence or tax field comes near the public site.
--
-- doctors_public is left as it is: doctors are listed only at approved
-- hospitals, so a pending hospital's page shows no roster and takes no
-- bookings — it has no admin to receive them.

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
    (status = 'approved') as is_partner
  from public.tenants
  where status in ('approved', 'pending')
    and kind = 'hospital';

comment on column public.hospitals_public.is_partner is
  'Approved on HealthFlow (0097). The public site shows the Partner hospital badge only on these.';
