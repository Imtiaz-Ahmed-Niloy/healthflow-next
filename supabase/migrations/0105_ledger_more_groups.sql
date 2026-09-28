-- 0105_ledger_more_groups.sql
-- More groups for a ledger, from the chart of accounts hospitals already keep
-- in Tally: Accumulated Depreciation, Bank OD A/c, Provisions, Secured and
-- Unsecured Loans, Retained Earnings, Sales and Purchase Accounts, the vehicle
-- and telephone expense heads, and the rest listed below.
--
-- 0074 fixed the groups in two places, and both are replaced here: the check
-- constraint that names which groups belong to which class, and the trigger
-- that derives the class from the group. The class is what every balance and
-- report sums by, so each new group is placed under the class Tally gives it:
--
--   asset      accumulated_depreciation (a contra asset: it carries a credit
--              balance and nets off Fixed Assets), closing_stock,
--              stock_in_hand, deposits_asset, investments, loans_advances,
--              fixed_assets_at_cost
--   liability  bank_od, branch_divisions, others_payable, provisions,
--              secured_loans, unsecured_loans, suspense
--   capital    retained_earnings
--   income     sales_accounts (direct, so it counts toward gross profit)
--   expense    purchase_accounts (direct); administrative, financial,
--              marketing & selling, pre-operating, telephone and the three
--              vehicle heads (indirect)
--
-- Nothing existing moves: every current key keeps its class.

alter table public.ledger_accounts drop constraint ledger_accounts_subgroup_check;

alter table public.ledger_accounts add constraint ledger_accounts_subgroup_check check (
     ("group" = 'asset' and subgroup in (
        'cash_in_hand', 'bank_accounts', 'current_assets', 'sundry_debtors', 'fixed_assets',
        'accumulated_depreciation', 'closing_stock', 'stock_in_hand', 'deposits_asset',
        'investments', 'loans_advances', 'fixed_assets_at_cost'))
  or ("group" = 'liability' and subgroup in (
        'sundry_creditors', 'duties_taxes', 'current_liabilities', 'loans',
        'bank_od', 'branch_divisions', 'others_payable', 'provisions',
        'secured_loans', 'unsecured_loans', 'suspense'))
  or ("group" = 'capital' and subgroup in ('capital', 'retained_earnings'))
  or ("group" = 'income' and subgroup in ('direct_income', 'indirect_income', 'sales_accounts'))
  or ("group" = 'expense' and subgroup in (
        'direct_expenses', 'indirect_expenses', 'purchase_accounts',
        'administrative_expenses', 'financial_charges', 'marketing_selling_expenses',
        'pre_operating_expenses', 'telephone_expenses',
        'vehicle_fuel', 'vehicle_insurance_tax', 'vehicle_maintenance'))
);

create or replace function public.ledger_accounts_group_from_subgroup()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new."group" := case
    when new.subgroup in (
      'cash_in_hand', 'bank_accounts', 'current_assets', 'sundry_debtors', 'fixed_assets',
      'accumulated_depreciation', 'closing_stock', 'stock_in_hand', 'deposits_asset',
      'investments', 'loans_advances', 'fixed_assets_at_cost')
      then 'asset'::public.ledger_group
    when new.subgroup in (
      'sundry_creditors', 'duties_taxes', 'current_liabilities', 'loans',
      'bank_od', 'branch_divisions', 'others_payable', 'provisions',
      'secured_loans', 'unsecured_loans', 'suspense')
      then 'liability'::public.ledger_group
    when new.subgroup in ('capital', 'retained_earnings')
      then 'capital'::public.ledger_group
    when new.subgroup in ('direct_income', 'indirect_income', 'sales_accounts')
      then 'income'::public.ledger_group
    when new.subgroup in (
      'direct_expenses', 'indirect_expenses', 'purchase_accounts',
      'administrative_expenses', 'financial_charges', 'marketing_selling_expenses',
      'pre_operating_expenses', 'telephone_expenses',
      'vehicle_fuel', 'vehicle_insurance_tax', 'vehicle_maintenance')
      then 'expense'::public.ledger_group
    -- Unknown: leave the class alone and let the check constraint refuse it.
    else new."group"
  end;
  return new;
end;
$$;
