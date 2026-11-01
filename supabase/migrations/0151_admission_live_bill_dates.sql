-- 0145_admission_live_bill_dates.sql
-- Ensure admission_bill() always computes the stay duration from the
-- admission's actual admitted_at date till current date (if still admitted),
-- or till discharged_at (if dismissed).

create or replace function public.admission_bill(a public.admissions)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ordered_stays as (
    select
      s.id,
      s.started_at,
      s.ended_at,
      row_number() over (partition by s.admission_id order by s.started_at asc) as rn_asc,
      row_number() over (partition by s.admission_id order by s.started_at desc) as rn_desc,
      b.number as bed_number,
      w.name as ward_name,
      w.daily_rate as ward_rate,
      w.nursing_charge,
      c.number as cabin_number,
      c.category::text as cabin_category,
      c.daily_rate as cabin_rate
    from public.bed_stays s
    left join public.beds b on b.id = s.bed_id
    left join public.wards w on w.id = b.ward_id
    left join public.cabins c on c.id = s.cabin_id
    where s.admission_id = a.id
  ),
  adjusted_stays as (
    select
      case
        when rn_asc = 1 and a.admitted_at is not null
          then least(started_at, a.admitted_at)
        else started_at
      end as eff_started_at,
      case
        when rn_desc = 1
          then greatest(
            started_at,
            coalesce(a.discharged_at, now())
          )
        else greatest(
          started_at,
          least(coalesce(ended_at, now()), coalesce(a.discharged_at, 'infinity'::timestamptz))
        )
      end as eff_ended_at,
      bed_number,
      ward_name,
      ward_rate,
      nursing_charge,
      cabin_number,
      cabin_category,
      cabin_rate
    from ordered_stays
  ),
  counted as (
    select
      *,
      greatest(1, ceil(extract(epoch from (eff_ended_at - eff_started_at)) / 86400)::int) as days
    from adjusted_stays
  ),
  lines as (
    select eff_started_at as started_at, 0 as ord,
           case
             when cabin_number is not null
               then 'Cabin ' || cabin_number || ' (' || initcap(cabin_category) || ')'
             else coalesce(ward_name, 'Ward') || ' · Bed ' || coalesce(bed_number, '—')
           end as description,
           days as quantity,
           coalesce(cabin_rate, ward_rate, 0) as rate
    from counted
    union all
    select eff_started_at as started_at, 1 as ord,
           'Nursing care · ' || ward_name as description,
           days as quantity,
           nursing_charge as rate
    from counted
    where cabin_number is null and nursing_charge > 0
  )
  select jsonb_build_object(
    'lines', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'description', description,
          'quantity', quantity,
          'rate', rate,
          'amount', quantity * rate
        )
        order by started_at, ord
      ),
      '[]'::jsonb
    ),
    'total', coalesce(sum(quantity * rate), 0)
  )
  from lines
  where quantity > 0;
$$;

revoke execute on function public.admission_bill(public.admissions) from public, anon;
grant execute on function public.admission_bill(public.admissions) to authenticated;

