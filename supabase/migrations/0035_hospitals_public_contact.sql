-- Contact details on the public hospital page.
--
-- /hospitals/<slug> renders a "Contact & Visit" card, but every field in it
-- resolved empty: `hospitals_public` (0008) carries no contact columns, so the
-- client had nothing to map and hardcoded "". A super admin could fill in
-- "Main phone" and the number still went nowhere the public could see it.
--
-- The column list of this view is the security boundary (see the comment on the
-- original in 0008). These seven are added deliberately:
--
--   address, contact_phone, contact_email, additional_phones,
--   additional_emails, websites, social
--
-- All seven are the hospital's *published* business contact — the same details
-- printed on its signboard. They are not the owner's: owner_nid, owner_phone,
-- owner_email, tin, bin, trade_license and operating_license stay out, and must
-- stay out. Adding a column here publishes it to the entire internet.

drop view public.hospitals_public;

create view public.hospitals_public as
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
    created_at
  from public.tenants
  where status = 'approved';

grant select on public.hospitals_public to anon, authenticated;
