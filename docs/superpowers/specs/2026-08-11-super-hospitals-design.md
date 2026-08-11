# /super/hospitals — design

**Date:** 2026-08-11
**Epic:** HF-8 (*2. Hospital onboarding — super admin creates a hospital*)
**Status:** approved, not yet implemented

---

## The problem

`/super/hospitals` looks finished and persists nothing. `src/views/super/Hospitals.tsx`
is a complete 274-line admin screen — a 45-field two-step form, division / district /
upazila and date-range filters, a credential modal — running entirely on `localStorage`
through `storeKey: "super-hospitals"` and a hardcoded `seed`. Reload the browser in a
different profile and the hospitals are gone.

Separately, `/super/onboarding` ("Onboarding Queue") is a second screen listing pending
hospitals, also on `localStorage`.

## What "complete" means

1. **One list, not two.** The Onboarding Queue is retired. Every hospital lives in one
   list, filtered by status. Pending *is* the queue.
2. **Full CRUD** against Postgres, behind the existing `+` button.
3. **The table holds every hospital in Bangladesh**, not only customers. Most rows are
   directory data. Status is what separates a directory entry from an approved partner.
4. **Only approved hospitals carry the partner tag** on the public marketing site.
5. **Approving a hospital provisions its admin login.** Creating a record does not.
6. **Two required fields:** hospital name and trade licence number. Everything else
   optional.

### Consequence: provisioning moves from create to approve

`handleCreated` currently mints credentials for every hospital added. Once the table
holds the whole country's hospitals, that would mean thousands of logins for
organisations that never signed up. Credential generation becomes an explicit action on
a hospital that is actually becoming a partner.

## Non-goals

- No package/subscription billing changes. `package_id` becomes a real select; what a
  package *costs* is out of scope.
- No bulk import of the Bangladesh hospital directory. The schema must not block one
  later, which is why `trade_license` stays nullable in the database.
- No change to `createResourceRoute`'s missing public-read path. This design routes
  around it deliberately (see "Public read"). That gap still blocks HF-33 / PR #8 and is
  tracked separately.

---

## 1. Data model

One migration, `0008_hospitals.sql`, extending `public.tenants`. No new table —
`0001_core_schema.sql:61` already states "one row per hospital", and `tenants.id` is the
`tenant_id` every other table carries. A separate hospitals table would fork identity.

### Status

```sql
alter type public.tenant_status rename value 'active' to 'approved';
```

Yields exactly `pending / approved / suspended`. Safe: `'active'` on tenants is
referenced only by `supabase/seed.sql` and the generated `src/lib/supabase/types.ts`.
Both are updated in the same PR. `Trial` from the current form is dropped.

`statusTone` (`src/components/admin/crud.tsx:233`) already maps `approved → ok`,
`pending → warn`, `suspended → bad` and lowercases its input, so no UI colour work.

### The 40 new columns

Chosen approach: **every field becomes a real typed column** (approach A), except two
that cannot be scalar.

| Group | Columns |
|---|---|
| Directory | `tagline`, `location`, `region`, `division`, `district`, `subdistrict`, `cover_image_url` |
| Scale | `beds int`, `doctor_count int`, `founded_year int`, `rating numeric(2,1)`, `reviews_count int` |
| Descriptive | `specialties`, `certifications`, `opening_hours`, `facilities`, `awards`, `summary`, `about` |
| Contact | `additional_phones text[]`, `additional_emails text[]`, `websites text[]`, `social jsonb` |
| Licences | `tin`, `bin`, `trade_license`, `operating_license`, `other_licenses` |
| Owner | `owner_name`, `ownership_type`, `owner_nid`, `owner_email`, `owner_phone`, `owner_address`, `owner_since date` |
| Management | `chairman`, `ceo`, `medical_director`, `management_body jsonb`, `board_notes` |

All `text` unless stated. Arrays default `'{}'`, jsonb defaults `'[]'`.

**`social` and `management_body` stay `jsonb`.** They are arrays of objects
(`{platform, url}` and `{name, role, phone, email}`). No scalar column holds those, and
the alternative — two child tables — cannot be joined by the resource factory, which
issues single-table selects against `definition.table`.

**Existing `contact_email` / `contact_phone` remain the canonical single values.** The
form's multi-value lists become `additional_emails` / `additional_phones`. Without one
canonical address, provisioning has three candidate emails and no rule for which
receives the credentials.

`logo_url` already exists and is left alone; the form's cover photo maps to the new
`cover_image_url`.

### Constraints and indexes

```sql
check (rating between 0 and 5)          -- numeric(2,1) otherwise silently caps at 9.9
create unique index tenants_trade_license_key
  on public.tenants (trade_license) where trade_license is not null;
create index tenants_division_idx on public.tenants (division);
create index tenants_district_idx on public.tenants (district);
```

**`trade_license` is nullable in the database but required by the form.** Zod enforces it
on create. A `not null` column would block a future bulk directory import, where many
rows will lack one, and would break the existing seed tenant.

The partial unique index stops the same hospital being entered twice — cheap now, painful
to retrofit once the table holds thousands of rows.

### Slug derivation

`slug` is `not null unique` and the form has no field for it. The factory inserts
`parsed.data` verbatim and offers no hook for a derived column, so `0008` adds a
`before insert` trigger on `tenants` filling `slug` from `name`, appending `-2`, `-3` on
collision. `BEFORE INSERT` fires ahead of the not-null check, so the constraint holds.

Deriving it in the database rather than the route means it also works for a bulk import
that never touches the API, and leaves the factory untouched for the other 27 modules.

### `0008` has to be applied before the frontend can compile

§3 and §5 both read from the regenerated `src/lib/supabase/types.ts` — the `TenantColumn`
type and `Constants.public.Enums.tenant_status`. Neither exists until `0008` is applied and
types are regenerated, but the new policy in `module-guide.md` applies migrations on merge.
That is circular.

This is exactly the case the guide's escape hatch covers: *"If you need the table to exist
while you are still building against it, ask and it gets applied early."* So `0008` is
applied to the shared project at the start of the backend phase, and the regenerated
`types.ts` is committed with it — before frontend work begins.

---

## 2. Backend

### `src/server/resources/hospitals.ts`

```ts
name: "hospitals",   // /api/v1/hospitals
table: "tenants",    // public.tenants
tenantScoped: false,
```

`tenantScoped: false` is load-bearing. `tenants` is keyed by `id`, not `tenant_id`; were
it `true`, `POST` would stamp a nonexistent `tenant_id` column and every insert would
fail.

- **Zod:** `name` and `trade_license` required. Everything else optional, reusing the
  `optionalText` / `optionalNumber` helpers from `doctors.ts`.
- **`slug` is absent from the create schema** — derived in the database, never accepted
  from a client. Same reasoning as `tenant_id` in `doctors.ts`.
- `searchFields: ["name", "region", "location"]`
- `filterFields: ["status", "division", "district", "subdistrict", "package_id"]` — this
  is what makes the one-list-filtered-by-status design work.
- `defaultSort: { column: "created_at", ascending: false }`
- `roles: { read: ["hospital_admin"], write: [] }` — an empty write list denies everyone,
  and `canWrite` returns early for `super_admin`, so this reads as "super admin only".

### `src/app/api/v1/hospitals/[[...id]]/route.ts`

The ordinary three-line factory file. That is all of CRUD.

### `POST /api/v1/hospitals/[id]/approve`

Outside the factory: it is an action, not CRUD; it needs the service-role client; and it
must never run twice.

1. Reject anyone who is not `super_admin`.
2. Load the hospital; 404 if absent.
3. **If a `hospital_admin` profile already exists for it, stop** and return current
   state. This is what makes a double-click harmless.
4. Create the `auth.users` row via the admin client. Email from `contact_email`, falling
   back to `owner_email`. Password from the existing `src/lib/credentials.ts`.
5. Insert the `profiles` row: `role = 'hospital_admin'`, `tenant_id = <hospital id>`.
6. Set `status = 'approved'`.
7. Return the credentials once.

**Failure ordering.** If step 5 fails, step 4's auth user is deleted so a retry starts
clean. If step 6 fails, the admin exists while the hospital still reads `pending`; step 3
makes the retry flip the status rather than duplicate anything.

Next 15.5 scores segment specificity (`sortable-routes.ts`: static 0, dynamic 1,
catch-all 2, optional catch-all 3, lower wins), so this nested route resolves ahead of
`[[...id]]` rather than colliding with it. If it does error at build time, the fallback is
`POST /api/v1/hospital-approvals` with the id in the body — same logic, no nesting.

### Shared with HF-32

Steps 4–5 go in `src/server/provisioning.ts` as
`provisionUser({ email, role, tenantId })`. HF-32 (Azad — provision a doctor login) is
the same procedure with a different role, so it becomes a thin caller instead of a second
copy of the risky part, and the compensating delete has one home.

---

## 3. Frontend

### The rename is the bulk of the work

`module-guide.md:192-195` requires field names to be the database's names, snake_case,
with no mapping layer — form values post straight through. So `src/data/hospitalFields.ts`
and `src/views/super/Hospitals.tsx` are rewritten off camelCase: `tradeLicense →
trade_license`, `createdAt → created_at`, `ownerName → owner_name`, through `type H`,
`filterFn` and every column accessor.

This is where the task bites. A mistyped key does not crash — it silently posts a field
the API rejects with 422, or defines a filter that never matches. See §5 for how that
class of bug is made a compile error instead.

### Wiring

- add `resource: "hospitals"`, drop `seed`, keep `storeKey` (still the CSV export name)
- `statuses` reads from `Constants.public.Enums.tenant_status` (`types.ts:345`) rather
  than three hardcoded strings that can drift from the enum
- widen `ResourceConfig.statuses` to `(string | { value: string; label: string })[]`, so
  the filter shows "Pending" not "pending". `doctors` needs this too — `on_leave`
  displays just as badly today.

### Retiring the Onboarding Queue

- remove the nav entry at `src/components/super/SuperLayout.tsx:26`
- delete `src/app/super/onboarding/page.tsx` and `src/views/super/Onboarding.tsx`
- strip `handleCreated` and the `ONBOARD_KEY` writes from `Hospitals.tsx`
- redirect `/super/onboarding` → `/super/hospitals?status=pending` rather than 404, since
  that URL may be bookmarked or linked from elsewhere in the panel

### Approve as a row action

`ResourceConfig` gains `rowActions?: (row: T) => ReactNode` — today Edit and Delete are
hardcoded at `ResourcePage.tsx:444-448`. `Hospitals.tsx` renders an Approve button on
`pending` rows, calling the endpoint from §2. The existing credential modal is reused
unchanged; it fires on approve instead of on create.

### Public read

The marketing site must read approved hospitals without a login. Under approach A all 40
columns sit on `tenants`, including `owner_nid`, `tin`, `bin` and `trade_license` — so an
anonymous `select *` through the resource factory would publish owner national ID and
licence numbers to the internet.

The public read therefore does **not** go through `/api/v1`. `0008` adds a view:

```sql
create view public.hospitals_public with (security_invoker = true) as
  select id, name, slug, tagline, location, division, district,
         logo_url, cover_image_url, specialties, summary, rating
  from public.tenants
  where status = 'approved';
```

`grant select on public.hospitals_public to anon;`

**The column list is the security boundary** — a field cannot leak unless someone
deliberately adds it here. The marketing site reads this view server-side with the anon
client.

Side effect: hospitals is not blocked on the `createResourceRoute` public-read decision.
That still has to be settled for `cms_pages` (PR #8), but this feature ships without it.

### The public site is already coupled to the admin screen's storage

**This is not optional cleanup — skipping it ships a silent regression.**

`src/hooks/useHospitals.ts:7` reads `localStorage["hf:super-hospitals"]` — the *same key*
`Hospitals.tsx` writes — merged over a static fallback in `src/data/hospitals.ts`. The
public `/hospitals` and `/hospitals/[slug]` pages (`src/views/Hospitals.tsx`,
`src/views/HospitalDetail.tsx`) consume that hook.

So the moment the admin screen moves to Postgres, the public site stops seeing any
hospital added through it and quietly falls back to the static seed. Nothing errors; the
page just goes stale forever.

`useHospitals` must therefore be repointed at `hospitals_public` in the same change. That
hook is 244 lines and also assembles doctors, lab tests, rooms and management from other
localStorage keys — those are out of scope. Only the hospital list and lookup
(`findHospital(slug)`) move to the view; the rest keeps its current behaviour until their
own modules land.

This is also where the partner tag renders: the hospital cards in `src/views/Hospitals.tsx`
and the detail header in `src/views/HospitalDetail.tsx`. Because `hospitals_public`
filters `status = 'approved'`, every row the public site can see is a partner by
construction — the tag is unconditional on those pages rather than a per-row check.

---

## 4. RLS

No policy work. `tenants` policies at `0002_rls_template.sql:128-154` are already correct
and hand-written — `super_admin` has full CRUD, a `hospital_admin` may edit their own
hospital, members read their own. `apply_tenant_rls()` is not used and would refuse this
table anyway, since it requires a `tenant_id` column.

---

## 5. Correctness

### Prevent the rename bug rather than test for it

```ts
type TenantColumn = keyof Database["public"]["Tables"]["tenants"]["Insert"];
// HOSPITAL_FIELDS entries typed { name: TenantColumn, ... }
```

`trade_licence`, or a leftover `createdAt`, becomes a compile error under
`tsc --noEmit` — which passes clean on `main` today, so the signal is trustworthy.

### Error handling

The factory already maps `23505 → 409`, `42501 → 403`, and Zod failures → `422`. New
cases are all in provisioning:

| Case | Behaviour |
|---|---|
| Duplicate `trade_license` | partial unique index → `23505` → 409, already mapped |
| `contact_email` already in `auth.users` | **409 with a clear message. Never attach the existing user** — if a patient signed up with that address, attaching would hand them `hospital_admin` over an entire hospital |
| No `contact_email` and no `owner_email` | 422 before touching auth — never half-provision |
| Approve pressed twice | idempotent via the step-3 profile check; no second login |
| `profiles` insert fails after auth user created | compensating delete of the auth user |
| `rating` out of range | `check (rating between 0 and 5)` |

### Proving it works

`module-guide.md:206-219` requires the non-owning-role denial to be demonstrated in SQL,
not asserted. `tenants` is keyed by `id`, so the proof differs from a tenant-scoped table:

1. `hospital_admin` of hospital A selects hospitals → exactly one row, its own
2. `hospital_admin` of A updates hospital B → 0 rows affected
3. `anon` selects from `public.tenants` → denied
4. `anon` selects from `hospitals_public` → approved rows only, and no `owner_nid`,
   `tin`, `bin` or `trade_license` column exists to select
5. A `pending` hospital is absent from `hospitals_public` and appears on approval

Run 3 and 4 first. They are the difference between shipping and publishing national ID
numbers.

### Tests

`vitest` and `@testing-library/react` are installed and `src/test/example.test.ts` exists,
but there is no config file and no `test` script — `yarn test` does not run today. This
task wires it: `vitest.config.ts` plus `"test": "vitest run"`.

Then: the Zod schemas (`name` and `trade_license` required, everything else optional,
`slug` rejected if submitted) and the approve endpoint's idempotency with a mocked admin
client. RLS stays SQL.

Wiring vitest is separable if this task needs to stay narrow.

### Definition of done

Against `module-guide.md:206-215`:

1. Migration `0008` merged, applied on merge by Ridwan with regenerated types
2. `hospitals.ts` resource config + `[[...id]]` route + approve endpoint
3. `Hospitals.tsx` reads and writes real data, no `localStorage`; Onboarding Queue gone
4. Non-owning role provably denied — the five SQL checks above
5. Empty state and error state handled
6. A hospital approved through the UI can log in as `hospital_admin`

---

## Sequencing

Too large for one PR. Four, in order, each independently reviewable:

| # | PR | Contents |
|---|---|---|
| 1 | Schema | `0008` — 40 columns, enum rename, slug trigger, constraints, indexes, `hospitals_public` view. Applied early; regenerated `types.ts` committed with it. `seed.sql` updated for `'approved'`. |
| 2 | Backend | `hospitals.ts` resource, `[[...id]]` route, `provisioning.ts` helper, approve endpoint. Plus the SQL denial proofs from §5. |
| 3 | Admin frontend | snake_case rename, `resource: "hospitals"`, `rowActions` + `statuses` label support on `ResourceConfig`, Approve button, Onboarding Queue retired + redirect. |
| 4 | Public site | `useHospitals` repointed at `hospitals_public`, partner tag on cards and detail header. |

PR 3 and PR 4 must land together or in quick succession — PR 3 alone leaves the public
site stale (see §3). If they cannot ship together, PR 3 should keep writing the
`localStorage` mirror temporarily so nothing regresses in between.

Vitest wiring rides with PR 2, or is dropped if the task needs to stay narrow.

## Open questions

- **Does `docs/_mvp-plan.md` get deleted?** Ridwan said it can go. Flagged but unresolved:
  Jira holds 4 tasks, the plan holds four weeks of roadmap plus a risks section. Deleting
  it loses that content, since Jira has not caught up. Options are to delete and accept
  the loss, or port the still-true parts into Jira issues first.
- **HF-32 is titled `[Azad]` but assigned to nobody** in Jira. If the shared
  `provisionUser` helper lands here, someone should own the doctor half.
- **`AGENTS.md` points at `node_modules/next/dist/docs/`, which does not exist** in this
  install (Next 15.5.22 ships no bundled docs). Next.js facts in this spec came from
  context7 instead.
