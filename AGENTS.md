# HealthFlow

## This site is live

Production is https://healthflowbd.com/ — real hospitals, real patients. The
Supabase project this repo talks to is the live one, not a copy: a migration
applied here is applied to production, and a row deleted here is gone.

## Architecture

### Pages are thin; views hold the UI

`src/app/**/page.tsx` is usually two lines — `export const dynamic = "force-dynamic"` plus a re-export of a component in `src/views/**`. The home page is the exception and is ISR (`export const revalidate = 60`); keep it that way.

Four panels, gated by prefix in `src/middleware.ts`: `/super` (super_admin), `/admin` (hospital + department admins), `/portal` (doctor), `/patient`.

### A module is three files

Read `docs/module-guide.md` before adding one; `doctors` is the worked example.

```
supabase/migrations/00xx_<module>.sql          table + RLS + audit
src/server/resources/<module>.ts               zod schemas + ResourceDefinition
src/app/api/v1/<module>/[[...id]]/route.ts     export { GET, POST, PATCH, DELETE } = createResourceRoute(...)
```

`createResourceRoute` handles auth, tenant stamping, pagination, search, filters and sorting. `createResourceApi` (`src/redux/api/`) is the RTK Query mirror, and `src/components/admin/ResourcePage.tsx` is the config-driven table/form/drawer every admin screen is built from. Writing a query, an auth check or a tenant filter by hand means the factory is not being used.

**Field names are column names.** Form values post straight through with no mapping layer, so a `FieldDef` name is `snake_case` exactly as in the migration.

Hand-built screens (Roles, Package Management, Billing, Logs, Community) call the typed hooks in `src/redux/api/resources.ts` directly instead.

### Security is RLS, everything else is defence in depth

- `select public.apply_tenant_rls('public.<table>')` in the migration is the whole security story for a tenant table. Do not hand-write policies; fix the template (`0002_rls_template.sql`) if it is wrong.
- `apply_tenant_rls` is **role-blind** — any account carrying the hospital's tenant_id can read. Anything not everyone in the building should see (salaries, invoices, certificates, licence scans) also needs `apply_role_gate`.
- The `roles` block in a ResourceDefinition returns a clean 403; it is not the boundary. Empty `write: []` means super_admin only.
- The publishable key ships in the browser bundle, so anyone signed in can query PostgREST directly. A gate that exists only in a route handler does not exist.
- `createAdminSupabase()` bypasses RLS and is for provisioning and seeding only. Never reach for it to make a denied query work.
- **Prove access rules, do not assert them**: run the check as each role inside `begin; … rollback;` and paste the result. See the pattern at the end of `docs/module-guide.md`.

### Migrations

Numbered and applied in order; never renumber a merged one. `select public.attach_audit('public.<table>')` puts the 0058 trigger on it so writes appear on `/super/logs` — forgetting it is silent. Pass `true` for the values-capturing variant only on tables holding no personal data.

The database is shared and live — see the top of this file. Types live in `src/lib/supabase/types.ts` and are generated from it.

### Cross-cutting pieces worth knowing before you touch them

- **`src/lib/appSettings.ts`** — three layers, `DEFAULTS` < platform (`/super/global-settings`, 0057) < what this person chose, stored per key so a platform change moves only those who never picked. `useFormatters()` is how anything renders a date, time or amount.
- **`src/lib/media.ts`** — uploads go browser → Cloudflare R2 via a presigned PUT from `/api/v1/uploads`, and the column stores the object **key**, never a URL. The bucket is public-read, so licence PDFs (`documents/`) are served only through `/api/v1/documents`, which authenticates and redirects to a 60-second presigned GET.
- **`src/i18n/`** — English and Bangla; the language switcher is on every layout.

## Conventions the reviewer enforces

- Never accept `tenant_id` (or any owning id) from a request body — the route stamps it from the JWT.
- Don't store what can be derived. Snapshots are justified for invoices and audit rows, not for counts or statuses.
- Next 15 is async: `cookies()` returns a Promise and route `params` must be awaited. Copy-pasted Next 14 code will not compile.
- Sessions live in cookies, not localStorage — `src/lib/supabase/client.ts` uses `createBrowserClient` deliberately.
- A denied single-record read returns 404, not 403, so it cannot confirm the record exists elsewhere.
- Most files in this repo are **CRLF**. A multi-line string edit that assumes LF silently matches nothing.
- CI (`.github/workflows/deploy.yml`) runs lint and build, then deploys over SSH to DigitalOcean — a red build stops the deploy.

## Other docs

`docs/module-guide.md` (how to build a module) · `docs/module-status.md` (which screens are on real data) · `docs/image-uploads-r2.md` (the R2 setup and why the bucket is public).
