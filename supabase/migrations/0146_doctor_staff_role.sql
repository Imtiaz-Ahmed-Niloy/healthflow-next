-- 0146_doctor_staff_role.sql
-- The login a doctor gives the people on their own team (0147): an assistant,
-- a nurse, an intern or a receptionist.
--
-- One role for all four, the way every pharmacy login is pharmacy_admin
-- (0126): what kind of member it is lives on their doctor_team_members row.
--
-- On its own because Postgres can't use a new enum value in the transaction
-- that adds it, and 0147 needs it in its functions and policies.

alter type public.app_role add value if not exists 'doctor_staff';
