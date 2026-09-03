# HealthFlow

Live at https://healthflowbd.com/ — real hospitals, real patients, and the
Supabase project this repo talks to is production, not a copy. A migration
applied here is applied there; a row deleted here is gone.

## Shape

`src/app/**/page.tsx` re-exports a component from `src/views/**` — edit the
view. `/` is ISR (`revalidate = 60`), the rest `force-dynamic`. Panels are
gated by prefix in `src/middleware.ts`: `/super`, `/admin`, `/portal` (doctor),
`/patient`.

A module is three files: the migration, `src/server/resources/<name>.ts`, and a
route that re-exports `createResourceRoute(...)`. The frontend mirror is
`createResourceApi` plus `src/components/admin/ResourcePage.tsx`. Hand-writing
a query, an auth check, a tenant filter or pagination means the factory is
being bypassed. Field names are column names — form values post straight
through with no mapping layer. Read `docs/module-guide.md` before adding one.

## Security

RLS is the boundary. Everything else is defence in depth.

- `select public.apply_tenant_rls('public.<table>')` is the entire policy set
  for a tenant table. Don't hand-write policies — fix `0002_rls_template.sql`.
- It is **role-blind**: anyone carrying the hospital's tenant_id can read.
  Salaries, invoices, certificates and licence scans also need
  `apply_role_gate`.
- The publishable key ships in the browser bundle, so a gate that lives only in
  a route handler does not exist.
- `createAdminSupabase()` bypasses RLS — provisioning and seeding only, never
  to make a denied query work.
- Never accept `tenant_id` from a request body; the route stamps it from the JWT.
- Prove access rules as each role inside `begin; … rollback;` rather than
  asserting them.

## Traps

- `select public.attach_audit('public.<table>')` in the migration, or that
  table's writes never reach `/super/logs`. Forgetting it is silent.
- Uploads store the R2 object **key**, never a URL (`src/lib/media.ts`). The
  bucket is public-read, so licence PDFs are served only through
  `/api/v1/documents`, which authenticates and returns a 60-second link.
- Dates, times and money render through `useFormatters()`
  (`src/lib/appSettings.ts`): platform settings underneath each person's own.
- A denied single-record read returns 404, not 403 — deliberately.
- Most files are CRLF. An edit that assumes LF matches nothing.

`docs/module-guide.md` · `docs/module-status.md` · `docs/image-uploads-r2.md`
