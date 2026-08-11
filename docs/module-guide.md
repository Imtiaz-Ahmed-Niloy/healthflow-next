# Module guide

How to add a module to HealthFlow. Read this once, then copy `doctors`.

A module is **three small files**. If you find yourself writing a database
query, an auth check, a tenant filter, or pagination code, stop — the factory
already does it and you are about to introduce a bug the reviewer will reject.

```
supabase/migrations/00xx_<module>.sql          table + RLS
src/server/resources/<module>.ts               shape + validation
src/app/api/v1/<module>/[[...id]]/route.ts     3 lines
```

Plus one line on the frontend to point the existing admin page at real data.

The worked example is **doctors**. Every file below exists in the repo — open
them side by side with this guide.

---

## 0. One-time setup

```bash
git clone <repo> && cd healthflow-next
cp .env.example .env.local        # ask Ridwan for the values
yarn install                      # yarn, not npm — package-lock.json is gone
yarn dev
```

Link the Supabase CLI once, so you can read the schema and generate types:

```bash
npx supabase link --project-ref hrpninjpfppgrsatbzmv
```

That is the **shared** project — the one database all of us develop against.
Linking lets you read it. It does not make applying migrations your job; see
step 1.

---

## 1. The migration

`supabase/migrations/00xx_<module>.sql`. Take the next free number — they are
applied in order and the number is the version, so never renumber a migration
that has already been merged.

```sql
-- 00xx_<module>.sql

create table public.<module> (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,

  -- your columns here

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index <module>_tenant_id_idx on public.<module> (tenant_id);

create trigger <module>_set_updated_at
  before update on public.<module>
  for each row execute function public.set_updated_at();

-- The entire security story for this table.
select public.apply_tenant_rls('public.<module>');
```

`apply_tenant_rls` applies the one reviewed policy set: `super_admin` sees
everything, everyone else sees only their own hospital. It is defined in
`0002_rls_template.sql`. **Do not hand-write policies.** If the template is
wrong, fix the template — that fixes all 27 tables at once. If your module
genuinely needs something stricter (a doctor seeing only their own patients),
add a *restrictive* policy on top and flag it in your PR.

`apply_tenant_rls` refuses any table without a `tenant_id` column, on purpose.

**Do not apply it.** Commit the `.sql` file and stop there — no `supabase db
push`, on any task.

`db push` applies whatever is in your branch to that shared project, and a
migration has no down step. One bad push blocks the other six of us, so applying
is a review gate rather than a step in your task. Ridwan pushes it when your PR
merges and commits the regenerated `src/lib/supabase/types.ts` alongside it, so
pull `main` after your merge to pick the new types up.

If you need the table to exist while you are still building against it, ask and
it gets applied early. Asking is free; an unreviewed push is not.

Never change the database by hand in the dashboard either. A change that is not
in a migration file does not exist as far as the rest of the team is concerned.

### Global tables

A handful of tables are not hospital-scoped (`packages`, `roles`, lookups).
They get hand-written policies and `tenantScoped: false` in step 2. Check with
Ridwan before deciding your module is one of these — almost none are.

---

## 2. The resource definition

`src/server/resources/<module>.ts`. See `doctors.ts` for the real thing.

```ts
import { z } from "zod";
import type { ResourceDefinition } from "./types";

export const thingCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  // tenant_id is deliberately absent — see below
});

export const thingUpdateSchema = thingCreateSchema.partial();

export const thingResource: ResourceDefinition<
  z.infer<typeof thingCreateSchema>,
  z.infer<typeof thingUpdateSchema>
> = {
  name: "things",              // URL segment; must match the folder in step 3
  table: "things",             // Postgres table
  tenantScoped: true,
  createSchema: thingCreateSchema,
  updateSchema: thingUpdateSchema,
  searchFields: ["name"],      // matched with ilike when ?q= is present
  filterFields: ["status"],    // exact-match filters from the query string
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    read: ["hospital_admin", "doctor"],
    write: ["hospital_admin"],
  },
};
```

**Never put `tenant_id` in your create schema.** The route stamps it from the
signed-in user's JWT. Accepting it from the request body would let a client
write into another hospital — and the database will reject the write anyway,
so all you would achieve is a confusing error.

`roles` is defence in depth, not the security boundary. RLS is the boundary.
`roles` exists to return a clean 403 instead of a baffling empty list when a
role has no business touching a module at all. `super_admin` always passes.

Form fields arrive as strings, so use `z.coerce.number()` for numbers and
treat `""` as absent. `doctors.ts` has `optionalText` and `optionalNumber`
helpers you can copy.

---

## 3. The route

`src/app/api/v1/<module>/[[...id]]/route.ts` — the whole file:

```ts
import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { thingResource } from "@/server/resources/things";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(thingResource);
```

The folder name must match `name` in the definition, and the `[[...id]]`
catch-all is required — it is what makes one file serve both `/things` and
`/things/:id`.

You now have:

| | |
|---|---|
| `GET /api/v1/things` | list — `?page=&limit=&q=&sort=&order=` plus your `filterFields` |
| `GET /api/v1/things/:id` | one record |
| `POST /api/v1/things` | create |
| `PATCH /api/v1/things/:id` | update |
| `DELETE /api/v1/things/:id` | delete |

Lists respond `{ data, meta: { page, limit, total, totalPages } }`, single
records `{ data }`, and errors `{ error: { message, details? } }`.

---

## 4. The frontend

Admin pages already use the config-driven `ResourcePage`. Point it at the API
by adding one line and deleting the seed:

```diff
  <ResourcePage<Thing> config={{
    storeKey: "things",
+   resource: "things",
-   seed,
    searchFields: ["name"],
```

That is the whole change. `ResourcePage` swaps `useCrud` (localStorage) for
`useResourceCrud` (RTK Query) and you get loading and error states for free.
Pages without `resource` keep working on localStorage, so you can migrate one
module at a time.

**Your column and field names must be the database's names** — `snake_case`,
exactly as in the migration. Form values post straight through with no
mapping layer. Renaming `fee` to `consultation_fee` in the config is how the
form knows what to send.

If you need the hooks directly (a dashboard widget, a dropdown):

```ts
const thingsApi = createResourceApi<Thing>("things");
const { data, isLoading } = thingsApi.useList({ page: 1, q: search });
```

---

## 5. Definition of done

The reviewer checks every one of these:

1. Migration + RLS policy merged
2. Resource config + route handler
3. Frontend reads and writes real data, no `localStorage`
4. **A non-owning role is provably denied access** — see below
5. Empty state and error state handled

### Proving #4

Do not assert this, demonstrate it. The pattern used for `doctors` runs
entirely in SQL and needs no UI:

```sql
BEGIN;
insert into public.tenants (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111','A','a'),
  ('22222222-2222-2222-2222-222222222222','B','b');
insert into public.things (tenant_id, name) values
  ('11111111-1111-1111-1111-111111111111','A row'),
  ('22222222-2222-2222-2222-222222222222','B row');

select set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"1111...","user_role":"hospital_admin","tenant_id":"11111111-1111-1111-1111-111111111111"}', true);
set local role authenticated;

select count(*) from public.things;   -- must be 1, not 2

reset role;
ROLLBACK;
```

The `ROLLBACK` matters — this leaves no test data behind. Paste the output
into your PR description.

---

## Gotchas

**Next 15 made things async.** `cookies()` returns a Promise, and route
`params` is a Promise you must await. Copy-pasted Next 14 code will not
compile.

**Sessions live in cookies, not localStorage.** `src/lib/supabase/client.ts`
uses `createBrowserClient` for exactly this reason — Route Handlers cannot
read localStorage, so a localStorage session means every API call is
anonymous and RLS denies everything. Do not "fix" this file.

**Never use the admin client to make a query work.** `createAdminSupabase()`
bypasses RLS entirely. It is for provisioning and seeding only. If a normal
query is denied, the policy is what needs fixing. A PR that reaches for the
admin client to dodge a permission error will be rejected.

**Claims are refreshed when a token is issued, not when `profiles` changes.**
Change someone's role or tenant and their existing session keeps the old
claims until it refreshes. Force a re-login when testing role changes.

**A denied single-record read returns 404, not 403.** That is deliberate — a
403 would confirm the record exists in another hospital.

---

## Where things live

| Path | |
|---|---|
| `supabase/migrations/` | every schema change, in order |
| `src/server/resources/` | one config file per module |
| `src/server/resources/createResourceRoute.ts` | the backend factory |
| `src/app/api/v1/` | route files, three lines each |
| `src/lib/supabase/server.ts` | server clients + `getAuthContext()` |
| `src/lib/supabase/client.ts` | browser client |
| `src/redux/api/createResourceApi.ts` | the frontend factory |
| `src/components/admin/ResourcePage.tsx` | the CRUD engine |

## Workflow

Branch `feat/<module>-<who>`, one small PR per task, Ridwan reviews and merges
everything. A PR must build clean, typecheck clean, lint clean, and the
reviewer must be able to log in as the affected role and use the feature.

Migrations are applied by Ridwan only, on merge — never from a feature branch.

Blocked for more than an hour? Say so at standup or before. Surfacing a
blocker early is always cheaper than losing a day to it.
