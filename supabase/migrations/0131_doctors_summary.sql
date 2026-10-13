-- 0131_doctors_summary.sql
-- Add summary column to public.doctors, update doctors_public view and person sync/guard triggers.

alter table public.doctors
  add column if not exists summary text;

create or replace function public.doctors_sync_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is null or pg_trigger_depth() > 1 then
    return new;
  end if;
  if old.profile_id is distinct from new.profile_id then
    return new;
  end if;

  update public.doctors d
     set name = new.name, specialty = new.specialty, education = new.education, bio = new.bio,
         languages = new.languages, expertise = new.expertise, experience_years = new.experience_years,
         email = new.email, phone = new.phone, photo_url = new.photo_url, gender = new.gender,
         bmdc_number = new.bmdc_number, summary = new.summary
   where d.profile_id = new.profile_id
     and d.id <> new.id
     and (d.name, d.specialty, d.education, d.bio, d.languages, d.expertise, d.experience_years,
          d.email, d.phone, d.photo_url, d.gender, d.bmdc_number, d.summary)
         is distinct from
         (new.name, new.specialty, new.education, new.bio, new.languages, new.expertise, new.experience_years,
          new.email, new.phone, new.photo_url, new.gender, new.bmdc_number, new.summary);

  return new;
end;
$$;

create or replace function public.doctors_guard_person()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_personal text[] := array['name', 'specialty', 'education', 'bio', 'languages', 'expertise',
    'experience_years', 'email', 'phone', 'photo_url', 'gender', 'bmdc_number', 'summary', 'updated_at'];
begin
  if pg_trigger_depth() > 1 or (select auth.uid()) is null or public.is_super_admin() then
    return new;
  end if;

  if old.profile_id is not null and (select auth.uid()) = old.profile_id then
    if public.auth_role() in ('hospital_admin', 'hr_admin') then
      return new;
    end if;
    if (to_jsonb(new) - v_personal) is distinct from (to_jsonb(old) - v_personal) then
      raise exception 'Your fee, schedule and status are set by the hospital — ask its admin to change them'
        using errcode = 'P0001';
    end if;
    return new;
  end if;

  if old.profile_id is null then
    return new;
  end if;

  if (new.name, new.specialty, new.education, new.bio, new.languages, new.expertise,
      new.experience_years, new.email, new.phone, new.photo_url, new.gender, new.bmdc_number, new.summary)
     is distinct from
     (old.name, old.specialty, old.education, old.bio, old.languages, old.expertise,
      old.experience_years, old.email, old.phone, old.photo_url, old.gender, old.bmdc_number, old.summary) then
    raise exception '% manages their own profile — they can change their personal details from the doctor portal', old.name
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

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
         d.designation,
         d.summary
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
