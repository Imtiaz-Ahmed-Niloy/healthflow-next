# Ward / Bed / Cabin / Admission API

Reference for the six modules built for hospital ward management: `patients`,
`wards`, `beds`, `cabins`, `admissions`, `bed_stays`, plus one bespoke
endpoint, `bed-transfers`. All follow the pattern in
[`module-guide.md`](./module-guide.md) — read that first if anything here is
unclear. This document only records what exists; it isn't a tutorial.

**Status:** code-complete, not yet live. The migrations exist as files under
`supabase/migrations/` but have not been pushed to any database (local or
hosted) — see [Status & open items](#status--open-items) at the bottom before
assuming any of this is callable yet.

---

## Endpoint summary

| Method | Path | Module |
|---|---|---|
| `GET/POST` | `/api/v1/patients` | Patients |
| `GET/PATCH/DELETE` | `/api/v1/patients/:id` | Patients |
| `GET/POST` | `/api/v1/wards` | Wards |
| `GET/PATCH/DELETE` | `/api/v1/wards/:id` | Wards |
| `GET/POST` | `/api/v1/beds` | Beds |
| `GET/PATCH/DELETE` | `/api/v1/beds/:id` | Beds |
| `GET/POST` | `/api/v1/cabins` | Cabins |
| `GET/PATCH/DELETE` | `/api/v1/cabins/:id` | Cabins |
| `GET/POST` | `/api/v1/admissions` | Admissions |
| `GET/PATCH/DELETE` | `/api/v1/admissions/:id` | Admissions |
| `GET/POST` | `/api/v1/bed-stays` | Bed stays |
| `GET/PATCH/DELETE` | `/api/v1/bed-stays/:id` | Bed stays |
| `POST` | `/api/v1/bed-transfers` | **Bespoke** — not `createResourceRoute` |

Every list endpoint accepts `?page=&limit=&q=&sort=&order=` plus that
module's filter fields (below). Lists respond
`{ data, meta: { page, limit, total, totalPages } }`; single records
`{ data }`; errors `{ error: { message, details? } }` — all inherited free
from `createResourceRoute`, nothing module-specific about the response shape.

---

## Patients

`supabase/migrations/0016_patients.sql` · `src/server/resources/patients.ts`

The registry every other module here points at. `mrn` is server-generated
(a trigger, not the client) and unique per tenant.

| Field | Type | Notes |
|---|---|---|
| `full_name` | text | required |
| `gender` | enum `male` / `female` / `other` | optional |
| `date_of_birth` | date | optional, cannot be in the future |
| `phone` | text | optional |
| `email` | text | optional, validated |
| `address` | text | optional |
| `blood_group` | enum, 8 values (`o_positive` … `ab_negative`) | optional |
| `emergency_contact_name` / `emergency_contact_phone` | text | optional |
| `profile_id` | uuid → `profiles` | optional — set once the patient has a login |

Not accepted from the client: `mrn` (trigger-derived, `P-<8 hex chars>`),
`tenant_id` (stamped from the caller's JWT).

- **Search:** `full_name`, `mrn`, `phone`, `email`
- **Filter:** `gender`
- **Sort default:** `created_at desc`
- **Roles —** read: `hospital_admin`, `hr_admin`, `doctor` · write: `hospital_admin`, `hr_admin`

---

## Wards

`supabase/migrations/0017_wards_beds.sql` · `src/server/resources/wards.ts`

A ward *type* — pricing and facility config, not a physical bed. One row per
category like "ICU" or "Maternity".

| Field | Type | Notes |
|---|---|---|
| `name` | text | required, unique per tenant |
| `category` | enum `general` / `semi_private` / `icu` / `maternity` / `pediatric` | default `general` |
| `daily_rate` | numeric | ≥ 0 |
| `nursing_charge` | numeric | ≥ 0 |
| `facilities` | text[] | free-form list, e.g. `["AC","Oxygen Supply"]` |
| `notes` | text | optional |

- **Search:** `name`
- **Filter:** `category`
- **Sort default:** `name asc`
- **Roles —** read: `hospital_admin`, `hr_admin`, `doctor` · write: `hospital_admin`, `hr_admin`

---

## Beds

`supabase/migrations/0017_wards_beds.sql` · `src/server/resources/beds.ts`

Physical inventory, one row per bed, child of a ward.

| Field | Type | Notes |
|---|---|---|
| `ward_id` | uuid → `wards` | required, `on delete restrict` |
| `number` | text | required, unique per ward |
| `type` | enum `general` / `icu` / `cabin` | default `general` |
| `status` | enum `available` / `occupied` / `cleaning` | **cache** — see below |
| `patient` | text | **transitional**, see below |

> `status` is a denormalized cache for the floor-map UI. Once `admissions`/
> `bed_stays` (this doc's later sections) are wired into the frontend, the
> real answer to "is this bed occupied" is a `bed_stays` row with
> `ended_at is null` — `transfer_admission()` keeps this column in sync.
> `patient` is a leftover free-text field mirroring the current mock; it has
> no FK to `patients` and is meant to be dropped once the frontend stops
> writing to it directly.

`select` embeds the parent ward: `*, wards(id, name, category, daily_rate)`.

- **Search:** `number`
- **Filter:** `status`, `type`, `ward_id`
- **Sort default:** `number asc`
- **Roles —** read: `hospital_admin`, `hr_admin`, `doctor` · write: `hospital_admin`, `hr_admin`

---

## Cabins

`supabase/migrations/0018_cabins.sql` · `src/server/resources/cabins.ts`

A standalone product — not a child of any ward, own rate and amenities.

| Field | Type | Notes |
|---|---|---|
| `number` | text | required, unique per tenant |
| `category` | enum `standard` / `deluxe` / `premium` / `suite` | default `standard` |
| `floor` | text | required, free text (e.g. `"2nd Floor"`) |
| `capacity` | integer | > 0 |
| `daily_rate` | numeric | ≥ 0 |
| `amenities` | text[] | e.g. `["WiFi","TV","AC"]` |
| `status` | enum `available` / `occupied` / `cleaning` / `maintenance` / `reserved` | **cache**, same caveat as beds |
| `patient`, `attendant`, `admitted_on` | text / text / date | **transitional**, same caveat as beds.patient |

- **Search:** `number`
- **Filter:** `status`, `category`, `floor`
- **Sort default:** `number asc`
- **Roles —** read: `hospital_admin`, `hr_admin`, `doctor` · write: `hospital_admin`, `hr_admin`

---

## Admissions

`supabase/migrations/0019_admissions_bed_stays.sql` · `src/server/resources/admissions.ts`

One row per hospital stay (episode). **Carries no bed/cabin location** —
that lives in `bed_stays` so a transfer has somewhere to record where the
patient came from. Assigning, moving, or releasing a bed/cabin never goes
through this resource's `PATCH` — see [Bed transfers](#bed-transfers-post-apiv1bed-transfers).

| Field | Type | Notes |
|---|---|---|
| `patient_id` | uuid → `patients` | required, `on delete restrict` |
| `doctor_id` | uuid → `doctors` | optional |
| `admitted_at` | timestamptz | defaults to now |
| `discharged_at` | timestamptz | null = still admitted |
| `status` | enum `admitted` / `under_observation` / `in_surgery` / `discharged` | note: **no `transferred` value** — a transfer is a location change, represented by a new `bed_stays` row, not an admission status |
| `priority` | enum `routine` / `urgent` / `critical` | default `routine` |
| `diagnosis`, `notes` | text | optional |

`select` embeds patient, doctor, and the full stay history:
`*, patients(id, full_name, mrn, gender, date_of_birth, phone), doctors(id, name, specialty), bed_stays(id, bed_id, cabin_id, started_at, ended_at, beds(number), cabins(number))`.
PostgREST embeds return *every* `bed_stays` row for the admission — there's
no way to filter the embed to `ended_at is null` through a plain select
string, so the client picks the open one.

- **Search:** `diagnosis`, `notes` only — patient-name search can't reach
  through the embed via a plain `ilike`; it piggybacks on
  `useResourceCrud`'s existing client-side filtering instead.
- **Filter:** `status`, `priority`, `patient_id`, `doctor_id`
- **Sort default:** `admitted_at desc`
- **Roles —** read: `hospital_admin`, `hr_admin`, `doctor` · write: `hospital_admin`, `hr_admin`, `doctor` (doctors update their own patients' clinical fields)

---

## Bed stays

`supabase/migrations/0019_admissions_bed_stays.sql` · `src/server/resources/bedStays.ts`

Occupancy history — one row per bed/cabin placement.

| Field | Type | Notes |
|---|---|---|
| `admission_id` | uuid → `admissions` | required |
| `bed_id` | uuid → `beds` | exactly one of `bed_id`/`cabin_id`, enforced by a check constraint |
| `cabin_id` | uuid → `cabins` | ″ |
| `started_at` | timestamptz | defaults to now |
| `ended_at` | timestamptz | null = this is the current placement |

Three partial unique indexes make double-booking a database-level
impossibility regardless of application code: an admission can't have two
open placements, and a bed/cabin can't have two open occupants
(`... where ended_at is null`).

A `bed_stays_sync_status` trigger on this table keeps `beds.status`/
`cabins.status` truthful on every insert/update, regardless of whether the
row came from `transfer_admission()` or a direct write through this
resource — see [Bed transfers](#bed-transfers-post-apiv1bed-transfers) for
why that used to be a gap.

`select` embeds bed/cabin numbers: `*, beds(number), cabins(number)`.

- **Filter:** `admission_id`, `bed_id`, `cabin_id`
- **Sort default:** `started_at desc`
- **Roles —** read: `hospital_admin`, `hr_admin`, `doctor` · **write: `hospital_admin` only**

> Why write is still this narrow even with the sync trigger in place: a bare
> `PATCH`/`POST` here still has no knowledge of the *business rules*
> `transfer_admission()` enforces by hand (same-tenant bed/cabin, admission
> not already discharged, one open placement per admission). The trigger
> closes the cache-drift gap; it doesn't replace those checks. This path
> exists for manual/emergency correction, not the day-to-day flow — that's
> the endpoint below.

---

## Bed transfers — `POST /api/v1/bed-transfers`

`src/app/api/v1/bed-transfers/route.ts` — **not** `createResourceRoute`. The
one write in this codebase that touches two rows atomically, so it calls a
database function (`transfer_admission`, defined in `0019_admissions_bed_stays.sql`)
via `supabase.rpc()` instead of a plain insert/update.

**Why it isn't nested under `/admissions/:id/transfer`:** `admissions/[[...id]]`
already occupies that route segment as a catch-all; Next 15 forbids two
different dynamic-segment shapes at the same level. Hence a sibling
top-level route.

**Request body:**

| Field | Type | Notes |
|---|---|---|
| `admission_id` | uuid | required |
| `bed_id` | uuid \| null | optional |
| `cabin_id` | uuid \| null | optional — exactly one of `bed_id`/`cabin_id`, or both omitted/null to release only |

**What happens, in one transaction:**
1. Validates the caller's tenant/role against the admission (done by hand
   inside the function — it's `security definer` and bypasses RLS, so it
   can't lean on a policy the way every other write in this codebase does).
2. Closes the admission's current open `bed_stays` row, if any.
3. Opens a new `bed_stays` row at the given `bed_id`/`cabin_id`, if one was
   given.
4. Returns the new `bed_stays` row (or a null-ish row if this was a
   release-only call).

Steps 2 and 3 each fire the `bed_stays_sync_status` trigger (see
[Bed stays](#bed-stays)), which is what actually sets the old bed/cabin's
cache `status` to `cleaning` and the new one's to `occupied` — this function
no longer touches those columns directly.

One function covers three UI actions: assigning the first bed at admission
time, a mid-stay transfer, and discharge's bed release.

- **Roles allowed to call:** `hospital_admin`, `hr_admin`, `doctor` (`super_admin` always)
- **Errors:** `401` not signed in · `403` not allowed / cross-tenant target ·
  `404` admission or bed/cabin not found · `422` validation failure or
  admission already discharged
- Each failure case is raised with its own SQLSTATE (`HF001` not found,
  `HF002` not allowed, `HF003` already discharged, `HF004` invalid input) so
  the route's status mapping matches on `error.code`, not on the wording of
  the message — rewording a `raise exception` message later can't silently
  change what HTTP status a client sees.

---

## Status & open items

- **Not deployed.** No migration has been pushed to any database (local or
  the hosted project) — `patients`/`wards`/`beds`/`cabins`/`admissions`/
  `bed_stays` don't exist as real tables anywhere yet. Pushing is deferred
  on purpose; everything above was developed and validated (`tsc`, `eslint`)
  against the codebase only.
- **Frontend not wired.** `Wards.tsx` and `Admissions.tsx` still run on
  `useCrud` (localStorage). Wiring them to `useResourceCrud` — plus the
  capitalization fix (mock uses `"Deluxe"`/`"Occupied"`, the DB enums are
  lowercase) and the free-text `patient`/`ward` fields becoming real
  selects — is a separate, later pass across both files at once.
- **`permissions.ts` untouched.** `super_admin`/`hospital_admin` already
  cover every new resource via their wildcard; `hr_admin`/`doctor` need
  explicit entries for `wards`/`beds`/`cabins`/`patients`/`admissions`
  added before their UI reflects what the API now actually allows.
- **No `nurse` role.** `app_role` has no value for ward/nursing staff —
  `hospital_admin` and `hr_admin` are standing in as the only write roles.
  Adding one touches the foundational `0001_core_schema.sql` enum and is
  deliberately out of scope here.
- **RLS isolation proofs not run.** Per `module-guide.md`'s "definition of
  done," each migration should ship with a same-transaction SQL proof (two
  tenants, assert one can't see the other's rows) pasted into its PR. Not
  yet run because there's no database to run it against — plus
  `transfer_admission()` needs its own proof beyond the standard one, since
  `security definer` bypasses the table-level RLS the standard proof checks.
- **No dedicated Patients page.** `patients` is table + API only for now,
  meant to be consumed inline as a search/quick-add combobox inside the
  Admissions form once that's wired — not a new admin nav item. The
  existing "Patients" page (`src/views/admin/Patients.tsx`) is an unrelated
  OPD-visit log and is untouched.
