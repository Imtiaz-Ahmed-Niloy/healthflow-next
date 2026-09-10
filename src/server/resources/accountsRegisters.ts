import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The registers the accounts page keeps beside the books (0074):
 * /api/v1/cost-centers, /api/v1/budgets and /api/v1/stock-items.
 *
 * None of them stores an outcome. What a cost center spent and what a budget
 * head actually cost are read from posted vouchers; a stock item's value is a
 * generated column. What is written here is only what a person decides — a
 * department's budget, a month's plan, a count and a rate.
 */

/** Same two roles as the books themselves (0063). */
const BOOKS_ROLES = ["hospital_admin", "finance_admin"] as const;

/**
 * A money or count field from a form. "" is checked first: z.coerce.number()
 * turns "" into 0, so an emptied field would otherwise save as zero.
 */
const amount = z
  .literal("")
  .transform(() => undefined)
  .or(z.coerce.number().min(0, "Cannot be negative").max(9_999_999_999))
  .optional();

const count = z
  .literal("")
  .transform(() => undefined)
  .or(z.coerce.number().int("Must be a whole number").min(0, "Cannot be negative"))
  .optional();

const flag = z.preprocess(
  value => (value === "" || value === undefined ? undefined : value === true || value === "true"),
  z.boolean().optional(),
);

// ----------------------------------------------------------- cost centers ---

export const costCenterCreateSchema = z.object({
  name: z.string().trim().min(1, "A cost center needs a name").max(200),
  budget: amount,
  active: flag,
});

export const costCentersResource: ResourceDefinition<
  z.infer<typeof costCenterCreateSchema>,
  Partial<z.infer<typeof costCenterCreateSchema>>
> = {
  name: "cost-centers",
  table: "cost_centers",
  tenantScoped: true,
  createSchema: costCenterCreateSchema,
  updateSchema: costCenterCreateSchema.partial(),
  searchFields: ["name"],
  filterFields: ["active"],
  defaultSort: { column: "created_at", ascending: false },
  roles: { read: [...BOOKS_ROLES], write: [...BOOKS_ROLES] },
};

// ---------------------------------------------------------------- budgets ---

export const budgetCreateSchema = z.object({
  account_id: z.string().uuid("Pick a ledger"),
  // A month, sent as its first day. "2026-05" from a month input is accepted
  // and completed, because that is what the browser's month picker produces.
  period: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}(-01)?$/, "Pick a month")
    .transform(value => (value.length === 7 ? `${value}-01` : value)),
  planned: amount,
});

export const budgetsResource: ResourceDefinition<
  z.infer<typeof budgetCreateSchema>,
  Partial<z.infer<typeof budgetCreateSchema>>
> = {
  name: "budgets",
  table: "budgets",
  tenantScoped: true,
  createSchema: budgetCreateSchema,
  updateSchema: budgetCreateSchema.partial(),
  select: "*, ledger_accounts ( id, code, name, group )",
  filterFields: ["period", "account_id"],
  // The month IS the recency a reader wants, the same way an appointment's
  // date is — see ResourceDefinition.defaultSort.
  defaultSort: { column: "period", ascending: false },
  roles: { read: [...BOOKS_ROLES], write: [...BOOKS_ROLES] },
};

// ------------------------------------------------------------ stock items ---

export const STOCK_UNITS = ["pcs", "box", "strip", "vial", "pack", "kg", "ltr"] as const;

export const stockItemCreateSchema = z.object({
  name: z.string().trim().min(1, "An item needs a name").max(200),
  unit: z.enum(STOCK_UNITS).optional(),
  qty: count,
  rate: amount,
  reorder: count,
  // `value` is generated in the database (qty × rate) and deliberately
  // absent: a valuation typed in by hand is one that can be wrong.
});

export const stockItemsResource: ResourceDefinition<
  z.infer<typeof stockItemCreateSchema>,
  Partial<z.infer<typeof stockItemCreateSchema>>
> = {
  name: "stock-items",
  table: "stock_items",
  tenantScoped: true,
  createSchema: stockItemCreateSchema,
  updateSchema: stockItemCreateSchema.partial(),
  searchFields: ["name"],
  filterFields: ["unit"],
  defaultSort: { column: "created_at", ascending: false },
  roles: { read: [...BOOKS_ROLES], write: [...BOOKS_ROLES] },
};
