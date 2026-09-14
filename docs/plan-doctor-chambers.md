# Doctor chambers — technical plan

Status: built 2026-09-15. 0088 and 0089 (chamber address and phone on
doctors_public) are applied. A doctor's own chamber goes live at once
(Ridwan's call). Chambers are added from Edit in /super/doctors, not from Add
Doctor, because a chamber needs a login.

## Decision: a chamber is a tenant

`tenants` gets `kind` (`hospital` | `chamber`) and `owner_profile_id`. A
chamber is a tenant row with `kind = 'chamber'`, owned by one doctor.

Why not a separate `chambers` table: every clinical table (appointments,
patients, prescriptions on appointments, consultation invoices, patient
documents) is tenant-scoped through `apply_tenant_rls`. A chamber as a tenant
gets all of it for free:

- The doctor gets a normal `doctors` row with `tenant_id = chamber`. Hours
  and fee sit on that row (`availability`, `consultation_fee`), exactly as
  they do per hospital today. Booking and reschedule already read them.
- The JWT hook already puts every non-null doctor tenant into `tenant_ids`
  (0077/0081). The portal queue, walk-ins and prescriptions already work
  across a doctor's tenants and label rows by tenant.
- The booking route already creates or links a `patients` row in the
  doctor's tenant. A chamber is just another tenant.
- The prescription print reads `tenants.name, address, contact_phone`
  (portal/consultation/[id]), so a chamber prescription prints the chamber.
- The consultation invoice (0075) is raised per tenant and shows on
  /patient/billing.

A separate table would mean `tenant_id null` appointments and hand-written
policies on every clinical table. That is the thing AGENTS.md forbids.

The cost: everything that lists `tenants` as "hospitals" must filter
`kind = 'hospital'`. The list is below and it is short.

## Rules

- One doctor per chamber in v1 (the owner). A doctor can have many chambers.
- Hours live on the chamber (the doctor's row there), never on the home row.
  The home row's "individual availability" editor goes away.
- A doctor with a chamber is bookable. `doctors_public` already hides the home
  row once an approved tenant row exists (0086). A chamber counts.
- Status: created by the super admin → `approved`. Created by the doctor →
  `approved` too (the doctor is already vetted). The super admin can suspend.
  **Open for Ridwan:** should a doctor's own chamber wait for approval?
- No hospital modules for a chamber: no hospital_admin, no HR, no wards. The
  doctor manages it from /portal.

## Migration 0088_doctor_chambers.sql

1. `create type tenant_kind as enum ('hospital','chamber')`. Add
   `tenants.kind not null default 'hospital'` and
   `tenants.owner_profile_id uuid references profiles(id)`. Add a check that a
   chamber has an owner.
2. `create_chamber(p_name, p_address, p_division, p_district, p_subdistrict,
   p_location, p_phone, p_availability, p_fee, p_profile_id default null)`.
   SECURITY DEFINER.
   - Caller is a doctor, so the owner is `auth.uid()`. Or caller is super
     admin, with `p_profile_id` naming the doctor.
   - Inserts the tenant (kind chamber, slug from the name plus a short id).
   - Inserts the doctor row there, copying personal fields from the doctor's
     existing row (reuse `doctors_pull_person`).
   - Validates `p_availability` as a week.
3. `update_chamber(p_tenant_id, …)` and `close_chamber(p_tenant_id)`. Owner or
   super admin only. Close = status `suspended` and doctor row `inactive`.
   Appointments keep their history.
4. `tenants_select` already allows the doctor (`id = any(auth_tenant_ids())`).
   No update policy for doctors: edits go through the functions only.
5. `hospitals_public` gets `and kind = 'hospital'`. Same columns, no
   security_invoker. See the note in 0054.
6. `doctors_public` gets `t.kind as practice_kind` as its last column. The
   existing `hospital_name` carries the chamber's name.
7. `attach_audit` is already on tenants. Check it is.
8. Dry run as doctor, as a different doctor, as hospital_admin and as super
   admin, inside `begin … rollback`.

## App changes

Server:
- `src/app/api/v1/portal/chambers/route.ts`: GET my chambers; POST, PATCH
  and DELETE call the RPCs. After POST the client must call
  `supabase.auth.refreshSession()` so `tenant_ids` includes the new chamber.
- `src/app/api/v1/super/doctors/route.ts`:
  - The hospital list for pickers filters `kind = 'hospital'`.
  - GET returns `chambers[]` per person.
  - POST and PATCH accept `chambers` adds, edits and removals, through the
    same RPCs. Drop `home_availability`.
- `src/server/resources/hospitals.ts`: base filter `kind = 'hospital'`. Covers
  /super/hospitals and approvals.
- `src/app/api/v1/super/dashboard/route.ts`: hospital counts filter by kind.
  Add a chamber count.
- The hook's `auth.tenantId` for a chamber-only doctor is the chamber. The
  queue POST guard "No hospital on this account" still passes.

UI:
- /portal: a new "My Chambers" page and sidebar link.
  - Cards in the same style as super Doctors' HospitalCard: name, address,
    area, phone, fee, and `WeeklyHoursField`.
  - Add, edit and close.
- /super/doctors create and edit:
  - Add a "Chambers" section next to Hospitals, with the same card design.
  - Remove the individual-availability block.
- Queue and Prescription: the hospital label already comes from the tenant
  name. Check that the wording says "Chamber" where `kind = 'chamber'`.
  Optional.
- Public:
  - DoctorCard and DoctorDetail use `practice_kind`. "Practicing At" lists the
    chamber with its address; no hospital link for a chamber.
  - A doctor with a chamber is bookable, so `independent` is false.
  - Book Appointment works unchanged.
- /patient/find-doctors and appointments: show the chamber name as the place.
  The data already arrives as `hospital_name`.
- Portal Profile's hospitals list: show chambers too, labelled as chambers.

## Existing data

Home rows with `availability` set (the demo independents): offer to turn each
into a chamber, or clear it. Ask before touching production.

## Later (not v1)

- An assistant or receptionist login for a chamber.
- Chamber earnings for the doctor. finance_invoices is role-gated, so the
  doctor can't read the chamber's invoices yet.
- Several doctors sharing one chamber.
- A platform subscription or package for chambers (0056 invoices per tenant).

## Order

1. 0088 migration plus dry runs, then apply after Ridwan approves.
2. Filters on the hospital lists (hospitals resource, hospitals_public,
   dashboard, super pickers).
3. Portal "My Chambers".
4. Super doctors Chambers section; remove individual availability.
5. Public card, profile and booking labels.
6. tsc, lint, tests. Ridwan checks the visuals.
