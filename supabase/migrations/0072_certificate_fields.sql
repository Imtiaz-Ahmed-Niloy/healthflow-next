-- 0072_certificate_fields.sql
-- Ten kinds of certificate (0049) were printing as one document: a title, the
-- recipient's name, and a single free-text `details` box. They are not one
-- document. A birth record carries a time, a weight and two parents; a
-- cause-of-death certificate carries a sequence of conditions and the interval
-- each ran for; a salary certificate carries a period and a figure. None of
-- that fits in a remarks box, and none of it could be read back out of one.
--
-- `fields` holds what belongs to the type, keyed by the field names in
-- src/data/certificateFormats.ts, which is also what builds the form and lays
-- out the printed page.
--
-- jsonb rather than columns because the fields are per-type by definition:
-- as columns this would be forty on one table, thirty-six of them null on any
-- given row, and every new certificate type another migration. Nothing filters
-- or aggregates on them — they are read only as part of the certificate that
-- owns them, the same reasoning as the work order lines in 0071.

alter table public.certificates
  add column fields jsonb not null default '{}'::jsonb;

-- An object, not an array or a bare string. Without this a malformed write
-- would surface as a render error on a document rather than a rejected insert.
alter table public.certificates
  add constraint certificates_fields_is_object
  check (jsonb_typeof(fields) = 'object');

comment on column public.certificates.fields is
  'Per-type certificate content, keyed by the field names in src/data/certificateFormats.ts. Shape varies by certificates.type; `details` remains for free-text remarks alongside it.';
