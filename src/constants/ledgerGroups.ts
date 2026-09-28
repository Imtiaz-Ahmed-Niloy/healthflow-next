/**
 * The groups a ledger can sit under — Tally's, as hospitals already keep them
 * (0074, extended in 0105). Shared by the API's validation and the Accounts
 * page, so what the form offers and what the server accepts are one list.
 *
 * The class — asset, liability and so on — is derived from the group by a
 * trigger in the database; it is listed here only as documentation of where
 * each lands. Keep this and `ledger_accounts_subgroup_check` in step.
 */
export const LEDGER_SUBGROUPS = [
  // asset
  "cash_in_hand", "bank_accounts", "current_assets", "sundry_debtors", "fixed_assets",
  "accumulated_depreciation", "closing_stock", "stock_in_hand", "deposits_asset",
  "investments", "loans_advances", "fixed_assets_at_cost",
  // liability
  "sundry_creditors", "duties_taxes", "current_liabilities", "loans",
  "bank_od", "branch_divisions", "others_payable", "provisions",
  "secured_loans", "unsecured_loans", "suspense",
  // capital
  "capital", "retained_earnings",
  // income
  "direct_income", "indirect_income", "sales_accounts",
  // expense
  "direct_expenses", "indirect_expenses", "purchase_accounts",
  "administrative_expenses", "financial_charges", "marketing_selling_expenses",
  "pre_operating_expenses", "telephone_expenses",
  "vehicle_fuel", "vehicle_insurance_tax", "vehicle_maintenance",
] as const;

export type LedgerSubgroup = (typeof LEDGER_SUBGROUPS)[number];

/**
 * Income and expense that sit above gross profit — Tally's trading account.
 * Every other income or expense group is indirect and counts only toward net
 * profit.
 */
export const DIRECT_INCOME_SUBGROUPS: readonly string[] = ["direct_income", "sales_accounts"];
export const DIRECT_EXPENSE_SUBGROUPS: readonly string[] = ["direct_expenses", "purchase_accounts"];
