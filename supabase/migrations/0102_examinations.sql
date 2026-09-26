-- 0102_examinations.sql
-- The list of examination findings a doctor picks from on the prescription
-- pad, each with the values it is usually recorded with.
--
-- Works like Chief Complaints (0101): the On Examination section searches
-- this list as the doctor types, then asks for the finding's value and
-- suggests some from `details` — "Temperature" then "102°F", "Blood
-- Pressure" then "120/80 mmHg". Anything not on the list can still be typed.
--
-- 62 examinations, from the examination picker of the prescription tool the
-- hospitals were using before (a screenshot of it, 2026-09-27). Its entries
-- that were already a finding with its value ("Bp-120/80mmhg", "Wt-60kg",
-- "Respiratory : End inspiratory bibasal fine crepitation") became values of
-- Blood Pressure, Weight and Lungs instead. The values are ours.
--
-- A global lookup like complaints: the same for every hospital.
-- Signed-in users read it and only the super admin writes.

create table public.examinations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null
               constraint examinations_name_check check (length(btrim(name)) between 1 and 200),
  -- Values suggested after this examination is picked.
  details    text[] not null default '{}',
  -- Lower first. Ties fall back to the name.
  sort_order integer not null default 0,
  -- Hidden from the pad's picker; prescriptions that already name it keep it.
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index examinations_name_key on public.examinations (lower(btrim(name)));

create trigger examinations_set_updated_at
  before update on public.examinations
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------- RLS ---

alter table public.examinations enable row level security;

create policy examinations_select on public.examinations
  for select to authenticated
  using (true);

create policy examinations_write on public.examinations
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- No personal data in here, so the audit trail keeps whole rows.
select public.attach_audit('public.examinations', true);

comment on table public.examinations is
  'Examination findings a doctor picks from on the prescription pad (0102). A global lookup; the super admin edits it.';

-- ------------------------------------------------------------------ data ---

insert into public.examinations (name, details, sort_order)
select c->>'name',
       coalesce(array(select jsonb_array_elements_text(c->'details')), '{}'),
       i::int
from jsonb_array_elements($json$[
{"name":"Temperature","details":["Afebrile","98°F","98.6°F","99°F","100°F","101°F","102°F","103°F","104°F"]},
{"name":"Blood Pressure","details":["Normal","90/60 mmHg","100/60 mmHg","100/70 mmHg","110/70 mmHg","110/80 mmHg","120/80 mmHg","120/90 mmHg","130/80 mmHg","130/90 mmHg","140/90 mmHg","150/100 mmHg","160/100 mmHg"]},
{"name":"Weight","details":["40 kg","50 kg","60 kg","70 kg","80 kg"]},
{"name":"BP","details":["Normal","90/60 mmHg","100/60 mmHg","100/70 mmHg","110/70 mmHg","110/80 mmHg","120/80 mmHg","120/90 mmHg","130/80 mmHg","130/90 mmHg","140/90 mmHg","150/100 mmHg","160/100 mmHg"]},
{"name":"Lymphadenopathy","details":["Absent","Present","Cervical","Axillary","Inguinal"]},
{"name":"Dehydration","details":["No","Some","Severe"]},
{"name":"Breath sounds","details":["Vesicular","Bronchial","Diminished","Absent"]},
{"name":"Pulse","details":["Regular","Irregular","72 b/min","80 b/min","88 b/min","96 b/min","100 b/min","110 b/min"]},
{"name":"Heart sounds","details":["S1 + S2 + 0","Normal","Muffled"]},
{"name":"Liver","details":["Not palpable","Palpable","Tender"]},
{"name":"Spleen","details":["Not palpable","Palpable"]},
{"name":"Edema","details":["Absent","Pitting","Non-pitting","Bilateral pedal"]},
{"name":"Cyanosis","details":["Absent","Central","Peripheral"]},
{"name":"Consciousness","details":["Conscious, oriented","Drowsy","Unconscious","GCS 15/15"]},
{"name":"Clubbing","details":["Absent","Present"]},
{"name":"Thyroid enlargement","details":["Not enlarged","Diffuse","Nodular"]},
{"name":"BDR"},
{"name":"Wear"},
{"name":"Fractured crown"},
{"name":"Missing tooth"},
{"name":"Malocclusion"},
{"name":"Dental calculus"},
{"name":"Jaundice","details":["Absent","Mild","Moderate","Severe"]},
{"name":"Heart murmur","details":["Absent","Systolic","Diastolic"]},
{"name":"Percussion note","details":["Resonant","Dull","Stony dull","Hyper-resonant"]},
{"name":"Abdomen","details":["Soft, non-tender","Distended","Tender","Guarding"]},
{"name":"Ascites","details":["Absent","Mild","Moderate","Gross"]},
{"name":"Motor power","details":["5/5","4/5","3/5","2/5","1/5","0/5"]},
{"name":"Respiratory Rate","details":["16 breaths/min","18 breaths/min","20 breaths/min","24 breaths/min","30 breaths/min"]},
{"name":"LBP"},
{"name":"Tenderness","details":["Absent","Present","Epigastric","Right iliac fossa"]},
{"name":"Rounded scaly, centrally clear"},
{"name":"Oxygen Saturation","details":["99%","98%","97%","96%","95%","94%","92%","90%"]},
{"name":"Percussion","details":["Resonant","Dull","Tympanic"]},
{"name":"Limb length discrepancy"},
{"name":"Behavior","details":["Normal","Agitated","Withdrawn"]},
{"name":"Loose motion"},
{"name":"Loose watery stool"},
{"name":"Right Eye (OD) SPH"},
{"name":"Right Eye (OD) CYL"},
{"name":"Right Eye (OD) AXIS","details":["90°","180°"]},
{"name":"Right Eye (OD) VA","details":["6/6","6/9","6/12","6/18","6/24","6/36","6/60"]},
{"name":"Right Eye (OD) ADD"},
{"name":"Left Eye (OS) SPH"},
{"name":"Left Eye (OS) CYL"},
{"name":"Left Eye (OS) AXIS","details":["90°","180°"]},
{"name":"Left Eye (OS) VA","details":["6/6","6/9","6/12","6/18","6/24","6/36","6/60"]},
{"name":"Left Eye (OS) ADD"},
{"name":"Mood","details":["Normal","Low","Anxious"]},
{"name":"Lungs","details":["Clear","End inspiratory bibasal fine crepitation","Wheeze","Crepitations"]},
{"name":"EDD"},
{"name":"Gestational age"},
{"name":"Pallor","details":["Absent","Mild","Moderate","Severe"]},
{"name":"Icterus","details":["Absent","Mild","Moderate","Severe"]},
{"name":"Built","details":["Average","Thin","Obese"]},
{"name":"Nutrition","details":["Normal","Well nourished","Poor"]},
{"name":"Apex beat","details":["Normal position","Displaced"]},
{"name":"JVP","details":["Not raised","Raised"]},
{"name":"Peripheral pulses","details":["Palpable","Weak","Absent"]},
{"name":"Chest shape","details":["Normal","Barrel shaped"]},
{"name":"Trachea","details":["Central","Shifted to left","Shifted to right"]},
{"name":"Added sounds","details":["None","Wheeze","Crepitations","Rhonchi"]}
]$json$::jsonb) with ordinality as list(c, i);
