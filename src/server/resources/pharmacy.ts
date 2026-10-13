import { z } from "zod";
import type { AppRole } from "@/lib/supabase/server";
import type { ResourceDefinition } from "./types";

/**
 * The pharmacy's lists (0126, 0129) — the ones that are plain rows. The
 * catalogue itself is pharmacyItems.ts.
 *
 * Several of these are read-only on purpose. A sale, a purchase order, a cash
 * drawer and the stock ledger are written by database functions (0127), where
 * the stock and the money move with them or not at all; their routes export
 * GET alone, and the write schemas below accept nothing.
 */

const READ: AppRole[] = ["hospital_admin", "pharmacy_admin", "finance_admin"];
const WRITE: AppRole[] = ["hospital_admin", "pharmacy_admin"];
const roles = { read: READ, write: WRITE };

/** "" from a form clears the column rather than being skipped. */
const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform((value) => (value === "" ? null : value));

const optionalEmail = z
  .string().trim().max(200).email("Enter a valid email").nullable().optional()
  .or(z.literal("").transform(() => null));

const optionalUuid = z
  .string().uuid().nullable().optional()
  .or(z.literal("").transform(() => null));

/** A checkbox posts "on", a select posts "true"/"false", JSON posts a boolean. */
const flag = z
  .union([z.boolean(), z.enum(["true", "false", "on", "off", "1", "0"])])
  .transform((value) => value === true || value === "true" || value === "on" || value === "1")
  .optional();

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

/** For the lists nothing may be posted to: any body fails here, before the database is asked. */
const nothing = z.never();

// ------------------------------------------------------------- suppliers ---

export const pharmacySupplierCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  contact_person: optionalText(200),
  phone: optionalText(40),
  email: optionalEmail,
  address: optionalText(500),
  notes: optionalText(2000),
  status: z.enum(["active", "inactive"]).optional(),
});

export const pharmacySuppliersResource: ResourceDefinition = {
  name: "pharmacy-suppliers",
  table: "pharmacy_suppliers",
  tenantScoped: true,
  createSchema: pharmacySupplierCreateSchema,
  updateSchema: pharmacySupplierCreateSchema.partial(),
  searchFields: ["name", "contact_person", "phone", "email"],
  filterFields: ["status"],
  defaultSort: { column: "created_at", ascending: false },
  roles,
};

// ------------------------------------------------------------- customers ---

export const pharmacyCustomerCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: optionalText(40),
  email: optionalEmail,
  address: optionalText(500),
  patient_id: optionalUuid,
  notes: optionalText(2000),
  allergies: optionalText(500),
  is_active: flag,
});

/**
 * Reads and writes through the view (0126, 0131), which adds each customer's
 * order count, what they have spent and still owe, their last visit and their
 * loyalty tier. The view passes a write to the customer's own columns straight
 * down to pharmacy_customers.
 *
 * Points and store credit are on the row but not in the schema: they move
 * inside a sale or a return, and the database ignores a value typed for them.
 */
export const pharmacyCustomersResource: ResourceDefinition = {
  name: "pharmacy-customers",
  table: "pharmacy_customers_overview",
  tenantScoped: true,
  createSchema: pharmacyCustomerCreateSchema,
  updateSchema: pharmacyCustomerCreateSchema.partial(),
  searchFields: ["name", "phone", "email"],
  filterFields: ["tier", "is_active"],
  defaultSort: { column: "created_at", ascending: false },
  roles,
};

/** A customer's points and store credit, line by line. Written by a trigger (0131). */
export const pharmacyCustomerLedgerResource: ResourceDefinition = {
  name: "pharmacy-customer-ledger",
  table: "pharmacy_customer_ledger",
  tenantScoped: true,
  createSchema: nothing,
  updateSchema: nothing,
  filterFields: ["customer_id", "kind"],
  defaultSort: { column: "created_at", ascending: false },
  roles,
};

// --------------------------------------------------- branches, registers ---

export const pharmacyBranchCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  code: z.string().trim().min(1, "Code is required").max(20),
  is_main: flag,
  status: z.enum(["active", "maintenance", "inactive"]).optional(),
  address: optionalText(500),
  phone: optionalText(40),
  email: optionalEmail,
  license_no: optionalText(100),
  vat_no: optionalText(100),
  pharmacist_in_charge: optionalText(200),
  opening_hours: optionalText(200),
});

/** Who may change these is decided in the database (0131): administrators of the pharmacy. */
export const pharmacyBranchesResource: ResourceDefinition = {
  name: "pharmacy-branches",
  table: "pharmacy_branches",
  tenantScoped: true,
  createSchema: pharmacyBranchCreateSchema,
  updateSchema: pharmacyBranchCreateSchema.partial(),
  select: "*, registers:pharmacy_registers(*)",
  searchFields: ["name", "code", "address", "license_no", "pharmacist_in_charge"],
  filterFields: ["status"],
  defaultSort: { column: "created_at", ascending: true },
  roles,
};

export const pharmacyRegisterCreateSchema = z.object({
  branch_id: z.string().uuid("Pick a branch"),
  name: z.string().trim().min(1, "Name is required").max(200),
  code: z.string().trim().min(1, "Code is required").max(20),
  is_active: flag,
});

export const pharmacyRegistersResource: ResourceDefinition = {
  name: "pharmacy-registers",
  table: "pharmacy_registers",
  tenantScoped: true,
  createSchema: pharmacyRegisterCreateSchema,
  updateSchema: pharmacyRegisterCreateSchema.partial(),
  select: "*, branch:pharmacy_branches(id, name, code)",
  searchFields: ["name", "code"],
  filterFields: ["branch_id", "is_active"],
  defaultSort: { column: "created_at", ascending: true },
  roles,
};

// -------------------------------------------------------------- expenses ---

export const pharmacyExpenseCreateSchema = z.object({
  expense_date: day,
  category: z.string().trim().min(1, "Category is required").max(100),
  description: optionalText(500),
  amount: z.coerce.number().positive("Enter an amount above zero").max(99_999_999),
});

export const pharmacyExpensesResource: ResourceDefinition = {
  name: "pharmacy-expenses",
  table: "pharmacy_expenses",
  tenantScoped: true,
  createSchema: pharmacyExpenseCreateSchema,
  updateSchema: pharmacyExpenseCreateSchema.partial(),
  searchFields: ["category", "description", "created_by_name"],
  filterFields: ["category"],
  rangeFields: ["expense_date"],
  defaultSort: { column: "expense_date", ascending: false },
  roles,
};

// --------------------------------------------------------------- batches ---

/**
 * What may be corrected on a batch by hand. The quantity is not among them:
 * that changes through "Adjust stock", which asks why and writes the ledger
 * line under the right reason.
 */
export const pharmacyBatchUpdateSchema = z.object({
  expiry_date: day.nullable().optional().or(z.literal("").transform(() => null)),
  location: z.string().trim().min(1).max(100).optional(),
  unit_cost: z.coerce.number().min(0).max(99_999_999).optional(),
  supplier_id: optionalUuid,
});

export const pharmacyBatchesResource: ResourceDefinition = {
  name: "pharmacy-batches",
  table: "pharmacy_batches_overview",
  tenantScoped: true,
  createSchema: nothing,
  updateSchema: pharmacyBatchUpdateSchema,
  searchFields: ["item_name", "sku", "generic_name", "batch_number", "location"],
  filterFields: ["state", "item_id", "supplier_id"],
  defaultSort: { column: "received_at", ascending: false },
  roles,
};

// ---------------------------------------------------------- read-only lists ---

export const pharmacyStockMovementsResource: ResourceDefinition = {
  name: "pharmacy-stock-movements",
  table: "pharmacy_stock_movements",
  tenantScoped: true,
  createSchema: nothing,
  updateSchema: nothing,
  filterFields: ["item_id", "batch_id", "kind"],
  defaultSort: { column: "created_at", ascending: false },
  roles,
};

export const pharmacySalesResource: ResourceDefinition = {
  name: "pharmacy-sales",
  table: "pharmacy_sales",
  tenantScoped: true,
  createSchema: nothing,
  updateSchema: nothing,
  select:
    "*, items:pharmacy_sale_items(*), payments:pharmacy_sale_payments(*), " +
    "returns:pharmacy_sale_returns(*, lines:pharmacy_sale_return_items(*)), " +
    "branch:pharmacy_branches(id, name, code, address, phone)",
  searchFields: ["invoice_number", "customer_name", "customer_phone", "created_by_name"],
  filterFields: ["status", "payment_method", "payment_status", "customer_id", "shift_id"],
  rangeFields: ["sale_date"],
  defaultSort: { column: "sold_at", ascending: false },
  roles,
};

export const pharmacyPurchaseOrdersResource: ResourceDefinition = {
  name: "pharmacy-purchase-orders",
  table: "pharmacy_purchase_orders",
  tenantScoped: true,
  createSchema: nothing,
  updateSchema: nothing,
  select:
    "*, supplier:pharmacy_suppliers(id, name, phone, email, address), " +
    "items:pharmacy_purchase_order_items(*)",
  searchFields: ["po_number", "notes"],
  filterFields: ["status", "payment_status", "supplier_id"],
  rangeFields: ["order_date"],
  defaultSort: { column: "created_at", ascending: false },
  roles,
};

export const pharmacyCashShiftsResource: ResourceDefinition = {
  name: "pharmacy-cash-shifts",
  table: "pharmacy_cash_shifts",
  tenantScoped: true,
  createSchema: nothing,
  updateSchema: nothing,
  select: "*, lines:pharmacy_cash_transactions(*), register:pharmacy_registers(id, name, code)",
  searchFields: ["opened_by_name", "closing_note"],
  filterFields: ["status", "opened_by"],
  defaultSort: { column: "opened_at", ascending: false },
  roles,
};
