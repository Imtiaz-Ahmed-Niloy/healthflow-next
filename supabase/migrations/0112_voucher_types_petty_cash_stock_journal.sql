-- 0112_voucher_types_petty_cash_stock_journal.sql
-- Two more voucher types, as Tally users expect them:
--
--   petty_cash     small cash spends out of the petty cash float (PCV-0001).
--                  Like a payment, its credit side is cash; the form holds it
--                  to that.
--   stock_journal  stock moved, consumed or adjusted (SJV-0001), e.g. medical
--                  supplies issued to a ward.
--
-- Both post debits and credits like any other voucher; the type is what the
-- voucher is, for its number, its label and filtering.

alter type public.voucher_type add value if not exists 'petty_cash';
alter type public.voucher_type add value if not exists 'stock_journal';
