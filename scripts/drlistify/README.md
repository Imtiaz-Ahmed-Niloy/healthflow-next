# DrListify import

Brings DrListify's public directory (doctors, their photos and hospitals) into
HealthFlow as listing-only hospitals and doctors: shown on the site, called for
a serial, never booked online (migrations 0116–0119). DrListify gave permission
to use its data by email to Ridwan on 2026-09-29.

## Run order

```sh
node scripts/drlistify/fetch.mjs          # download to scripts/drlistify/data/ (git-ignored)
node scripts/drlistify/import.mjs --dry-run
node scripts/drlistify/import.mjs         # doctors, their places, photos to R2
node scripts/drlistify/hospitals.mjs --dry-run
node scripts/drlistify/hospitals.mjs      # every other hospital page, merges, districts
```

All three are safe to re-run: every row carries `source_ref`, and what is
already imported is skipped. To pick up DrListify's latest, delete `data/` and
run the lot again.

Needs `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
and the `R2_*` keys (photos are stored in R2 as object keys; without R2 the
DrListify image URL is kept instead).

## What it creates

- `tenants` with `listing_only = true`, `source_ref = 'drlistify:h:…'`
- `doctors` rows, one per place, sharing `person_key = 'drlistify:<id>'`

## Showing or hiding them

The public views include them only while the switch is on:

```sql
update public.global_settings set directory_listings_live = true;   -- show
update public.global_settings set directory_listings_live = false;  -- hide
```

`lib.mjs` holds the district detection both import scripts share.
