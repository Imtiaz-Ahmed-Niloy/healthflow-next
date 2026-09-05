-- Scanned licence documents for a hospital.
--
-- HF-35: the registration section captured licence NUMBERS as text — TIN, BIN,
-- trade licence, operating licence, other accreditations — with nowhere to put
-- the certificate itself. A super admin verifying a hospital had to take the
-- number on trust.
--
-- Five columns, alongside the numbers rather than replacing them. A number is
-- searchable, printable and already populated; a scan is neither, and proves
-- what the number only claims. Both are worth having.
--
-- Each holds an R2 OBJECT KEY — "documents/2026/09/a1b2c3d4.pdf" — never a URL
-- and never the file. Same rule as logo_url, for the same reason: the address
-- is built when the document is opened, so moving to a custom domain later is
-- one environment variable rather than a rewrite of every row. See
-- src/lib/media.ts and docs/image-uploads-r2.md.
--
-- Nullable throughout: the table holds every hospital in Bangladesh, most of
-- them captured from partial public information, and almost none of those rows
-- will ever have a scan attached.

alter table public.tenants
  add column tin_doc               text,
  add column bin_doc               text,
  add column trade_license_doc     text,
  add column operating_license_doc text,
  add column other_licenses_doc    text;

comment on column public.tenants.tin_doc is
  'R2 object key of the scanned TIN certificate. Never a URL — see src/lib/media.ts.';
comment on column public.tenants.bin_doc is
  'R2 object key of the scanned BIN certificate.';
comment on column public.tenants.trade_license_doc is
  'R2 object key of the scanned trade licence.';
comment on column public.tenants.operating_license_doc is
  'R2 object key of the scanned hospital operating licence.';
comment on column public.tenants.other_licenses_doc is
  'R2 object key of a scan covering other licences and accreditations.';

-- No change to `hospitals_public` (0035), and that is the point. Its column
-- list is the security boundary: tin, bin, trade_license and operating_license
-- are deliberately outside it, so the scans of those documents stay outside it
-- too. A licence certificate carries the owner's details and signature — it is
-- the last thing that should be readable by the anonymous public site.
--
-- Row access is unchanged as well: the existing policies on public.tenants
-- govern these columns, and 0058's audit trigger is attached to the table
-- already, so uploading or clearing a scan is recorded like any other write.
