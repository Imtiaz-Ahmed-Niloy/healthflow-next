-- 0140_patient_family_members.sql
-- Family & Dependents list on the patient profile.
-- A patient can record their family members (spouse, children, elderly parents)
-- with name, relation, DOB, gender, blood group, and medical notes.

alter table public.patient_profiles
  add column if not exists family_members jsonb not null default '[]'::jsonb;

comment on column public.patient_profiles.family_members is
  'Family members and dependents recorded by the patient (0140). Stored as an array of objects: id, name, relation, dob, gender, blood_group, phone, notes.';
