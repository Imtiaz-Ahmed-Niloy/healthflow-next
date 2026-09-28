-- 0107_prescription_edit_window.sql
-- A submitted prescription can be corrected for 24 hours, then it is final.
--
-- Until now "Print & Submit" closed the visit for good: submitting again was
-- refused (409), so a doctor who spotted a wrong dose a minute later had no
-- way to fix it. Now the doctor may re-submit the same visit for 24 hours
-- after first submitting it. After that the chart is the record the patient
-- was given, and it stays as it is.
--
-- The rule lives here, not only in the consultation route: the publishable
-- key ships in the browser, so a lock that only a route handler enforces is
-- no lock. The trigger refuses any change to the prescription columns of a
-- visit completed more than 24 hours ago, or to its status, whoever makes it.

alter table public.appointments add column completed_at timestamptz;

-- Visits already completed: their last update is the best record there is of
-- when that happened. Nearly all of them are well past 24 hours anyway.
update public.appointments set completed_at = updated_at where status = 'completed';

-- Stamped when a visit becomes completed, and cleared if it is ever reopened,
-- so the window always counts from the latest submission.
create or replace function public.appointments_stamp_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();
  elsif new.status is distinct from 'completed' then
    new.completed_at := null;
  else
    -- Still completed: the stamp is the database's, not the caller's.
    new.completed_at := old.completed_at;
  end if;
  return new;
end;
$$;

create trigger appointments_stamp_completed_at
  before update of status, completed_at on public.appointments
  for each row execute function public.appointments_stamp_completed_at();

create or replace function public.appointments_prescription_locked()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'completed'
     and old.completed_at is not null
     and old.completed_at < now() - interval '24 hours'
     -- The status too: reopening the visit would otherwise lift the lock
     -- and let the chart be rewritten after all.
     and (new.status        is distinct from old.status
       or new.complaints    is distinct from old.complaints
       or new.examination   is distinct from old.examination
       or new.investigation is distinct from old.investigation
       or new.diagnosis     is distinct from old.diagnosis
       or new.medicines     is distinct from old.medicines
       or new.advice        is distinct from old.advice
       or new.follow_up_date is distinct from old.follow_up_date) then
    raise exception 'this prescription was submitted more than 24 hours ago and can no longer be changed'
      using errcode = 'P0001', hint = 'prescription_locked';
  end if;
  return new;
end;
$$;

create trigger appointments_prescription_locked
  before update on public.appointments
  for each row execute function public.appointments_prescription_locked();
