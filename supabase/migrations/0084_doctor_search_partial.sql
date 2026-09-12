-- 0084_doctor_search_partial.sql
-- "Add an existing doctor" searches the way a search box does.
--
-- 0082 matched a name in part but an email only in full and a phone only by
-- its last ten digits, to keep the search from being a way to walk the address
-- book. In use that read as broken: typing part of an address or a number found
-- nothing. Every field now matches in part.
--
-- What keeps it from being a directory of contact details is unchanged: only
-- doctors with an active login who are not at the caller's hospital, at most
-- twenty, and every email and phone masked in what comes back.
--
-- A phone matches on its digits alone, so "01712", "+880 1712" and "1712 300"
-- all find +880 1712 300501. At least three digits, or every number would match.

create or replace function public.search_doctors_to_add(p_query text)
returns table (
  profile_id  uuid,
  name        text,
  specialty   text,
  photo_url   text,
  bmdc_number text,
  email_hint  text,
  phone_hint  text,
  hospitals   text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := public.auth_tenant_id();
  v_q      text := btrim(coalesce(p_query, ''));
  v_like   text;
  v_digits text;
begin
  if public.auth_role() is null
     or public.auth_role() not in ('hospital_admin', 'hr_admin')
     or v_tenant is null then
    raise exception 'Only a hospital''s admin can add doctors to it' using errcode = '42501';
  end if;

  if length(v_q) < 2 then
    return;
  end if;

  -- The query as literal text inside ILIKE: % and _ are the user's, not wildcards.
  v_like   := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  v_digits := regexp_replace(v_q, '\D', '', 'g');

  return query
  with people as (
    select distinct on (d.profile_id)
      d.profile_id, d.name, d.specialty, d.photo_url, d.bmdc_number, d.phone,
      coalesce(p.email, d.email) as email
    from public.doctors d
    join public.profiles p on p.id = d.profile_id
    where p.role = 'doctor'
      and p.is_active
      and not exists (
        select 1 from public.doctors x
        where x.profile_id = d.profile_id and x.tenant_id = v_tenant
      )
    order by d.profile_id, d.updated_at desc
  )
  select
    pe.profile_id,
    pe.name,
    pe.specialty,
    pe.photo_url,
    pe.bmdc_number,
    case when pe.email is null then null
         else left(split_part(pe.email, '@', 1), 2) || '•••@' || split_part(pe.email, '@', 2) end,
    case when coalesce(pe.phone, '') = '' then null
         else '••• ' || right(regexp_replace(pe.phone, '\D', '', 'g'), 3) end,
    array(
      select t.name
      from public.doctors x
      join public.tenants t on t.id = x.tenant_id
      where x.profile_id = pe.profile_id and t.status = 'approved'
      order by t.name
    )
  from people pe
  where pe.name ilike v_like
     or pe.email ilike v_like
     or pe.bmdc_number ilike v_like
     or (length(v_digits) >= 3
         and regexp_replace(coalesce(pe.phone, ''), '\D', '', 'g') like '%' || v_digits || '%')
  order by pe.name
  limit 20;
end;
$$;

comment on function public.search_doctors_to_add(text) is
  'Doctors with an active login who are not at the caller''s hospital, matched in part by name, email, BMDC number or phone digits. Hospital and HR admins only; at most twenty, contact details masked.';
