-- 0110_stock_item_supplier.sql
-- Where a stock item comes from: the company that makes it, the distributor
-- it was bought through, and the purchase itself — date, invoice or bill
-- number, and free-text details (batch, terms, anything else worth keeping).
--
-- All optional: stock counted before this existed has none of it, and a small
-- hospital may buy some things over the counter with no invoice at all.

alter table public.stock_items
  add column company_name text
    constraint stock_items_company_name_check check (company_name is null or length(company_name) <= 200),
  add column distributor_name text
    constraint stock_items_distributor_name_check check (distributor_name is null or length(distributor_name) <= 200),
  add column purchase_date date,
  add column invoice_no text
    constraint stock_items_invoice_no_check check (invoice_no is null or length(invoice_no) <= 100),
  add column purchase_details text
    constraint stock_items_purchase_details_check check (purchase_details is null or length(purchase_details) <= 2000);
