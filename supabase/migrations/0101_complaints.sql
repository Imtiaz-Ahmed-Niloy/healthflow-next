-- 0101_complaints.sql
-- The list of chief complaints a doctor picks from on the prescription pad.
--
-- The pad's Chief Complaints section was a free-text box. Now it searches
-- this list as they type, like Investigation (0094) and Advice (0095), and a
-- complaint that isn't on it can still be typed in.
--
-- After a complaint is picked the pad asks for a detail ("7 days", "Left
-- side") and suggests some. Durations are suggested for every complaint by
-- the pad itself; `details` holds the extra ones that only fit this one —
-- "Dry" and "Productive" for a cough, "High grade" for a fever.
--
-- 67 complaints, from the complaint picker of the prescription tool the
-- hospitals were using before (a screenshot of it, 2026-09-27).
--
-- A global lookup like investigations: the same for every hospital.
-- Signed-in users read it and only the super admin writes.

create table public.complaints (
  id         uuid primary key default gen_random_uuid(),
  name       text not null
               constraint complaints_name_check check (length(btrim(name)) between 1 and 200),
  -- Suggestions for the detail typed after this complaint, besides durations.
  details    text[] not null default '{}',
  -- Lower first. Ties fall back to the name.
  sort_order integer not null default 0,
  -- Hidden from the pad's picker; prescriptions that already name it keep it.
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index complaints_name_key on public.complaints (lower(btrim(name)));

create trigger complaints_set_updated_at
  before update on public.complaints
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------- RLS ---

alter table public.complaints enable row level security;

create policy complaints_select on public.complaints
  for select to authenticated
  using (true);

create policy complaints_write on public.complaints
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- No personal data in here, so the audit trail keeps whole rows.
select public.attach_audit('public.complaints', true);

comment on table public.complaints is
  'Chief complaints a doctor picks from on the prescription pad (0101). A global lookup; the super admin edits it.';

-- ------------------------------------------------------------------ data ---

insert into public.complaints (name, details, sort_order)
select c->>'name',
       coalesce(array(select jsonb_array_elements_text(c->'details')), '{}'),
       i::int
from jsonb_array_elements($json$[
{"name":"Fever","details":["High grade","Low grade","Intermittent","Continuous","With chills","At night"]},
{"name":"Pain","details":["Left side","Right side","Both sides","Mild","Severe","On and off"]},
{"name":"Weakness","details":["Generalised","Left side of the body","Right side of the body","Limbs"]},
{"name":"Loose tooth"},
{"name":"Cough","details":["Dry","Productive","At night","With blood"]},
{"name":"Pain around Knee","details":["Left","Right","Both","On walking"]},
{"name":"Fractured tooth"},
{"name":"Loss of appetite"},
{"name":"Memory loss"},
{"name":"Abdominal pain","details":["Upper","Lower","Around the navel","Colicky","After meals"]},
{"name":"Epigastric pain","details":["After meals","Empty stomach","Burning","At night"]},
{"name":"Neckache LBP"},
{"name":"Headache","details":["Frontal","One-sided","Whole head","Morning","Evening"]},
{"name":"Vomiting","details":["After meals","With blood","Projectile"]},
{"name":"Lower abdominal pain","details":["Left","Right","Colicky"]},
{"name":"Constipation"},
{"name":"Post prandial bloating"},
{"name":"Itching","details":["Whole body","At night","Localised"]},
{"name":"Knee joint pain","details":["Left","Right","Both","On walking","Morning stiffness"]},
{"name":"Fever with cough"},
{"name":"Skin discoloration"},
{"name":"Burning during urination"},
{"name":"Dizziness","details":["On standing","Spinning","On and off"]},
{"name":"Depression"},
{"name":"Cough and cold"},
{"name":"Running Nose"},
{"name":"Chest pain","details":["Left side","Central","On exertion","At rest","Radiating to left arm"]},
{"name":"Blood in urine"},
{"name":"Skin lesion"},
{"name":"H/O Trauma to Knee","details":["Left","Right"]},
{"name":"F/U"},
{"name":"Burning & Shooting (In nature) Low back pain"},
{"name":"GORD"},
{"name":"Joint pain","details":["Small joints","Large joints","Morning stiffness","Migratory"]},
{"name":"Poor feeding"},
{"name":"Nausea"},
{"name":"Ringing in ears","details":["Left","Right","Both"]},
{"name":"Shortness of breath","details":["On exertion","At rest","At night","On lying flat"]},
{"name":"Seizures"},
{"name":"Body ache"},
{"name":"Sleep disturbances"},
{"name":"Swelling of legs","details":["Left","Right","Both","Pitting"]},
{"name":"Diarrhea","details":["Watery","With blood","With mucus"]},
{"name":"Blood in stool"},
{"name":"Back pain","details":["Lower","Upper","Radiating to leg"]},
{"name":"Eczema"},
{"name":"Psoriasis"},
{"name":"Ear pain","details":["Left","Right","Both","With discharge"]},
{"name":"Nasal congestion"},
{"name":"Vaginal discharge","details":["White","Foul smelling","Itchy"]},
{"name":"Anxiety"},
{"name":"Insomnia"},
{"name":"Sore throat"},
{"name":"Difficulty walking"},
{"name":"LMP"},
{"name":"ANC"},
{"name":"Headache (migraine, cluster, tension-type)"},
{"name":"Stroke symptoms"},
{"name":"Chills"},
{"name":"Palpitations","details":["On exertion","At rest","On and off"]},
{"name":"Fatigue on exertion"},
{"name":"High blood pressure"},
{"name":"Irregular heartbeat"},
{"name":"Numbness/tingling","details":["Hands","Feet","Left side","Right side"]},
{"name":"Muscle weakness"},
{"name":"Tremor"},
{"name":"Imbalance"}
]$json$::jsonb) with ordinality as list(c, i);
