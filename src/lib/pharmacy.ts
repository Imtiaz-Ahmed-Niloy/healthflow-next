/**
 * The shapes the pharmacy panel reads (0126–0129), written out by hand.
 *
 * src/lib/supabase/types.ts is generated, and these tables are newer than the
 * last time it was. Once it has been regenerated these can be swapped for the
 * generated rows; until then this is what the API answers with.
 */

/** What the till offers. "split" is two or more of the others on one bill. */
export const PAYMENT_METHODS = ["cash", "card", "mobile", "split", "credit", "other"] as const;
/** Everything a saved sale can say it was paid by. */
export type PaymentMethod = (typeof PAYMENT_METHODS)[number] | "store_credit";

/** What one part of a split payment can be. */
export const SPLIT_METHODS = ["cash", "card", "mobile", "other", "store_credit"] as const;
export type SplitMethod = (typeof SPLIT_METHODS)[number];
export type PaymentPart = { method: SplitMethod; amount: number; reference: string | null };

/** How a product is counted at the till (0133). Stock is always single units. */
export const SALE_UNITS = ["unit", "strip", "box"] as const;
export type SaleUnit = (typeof SALE_UNITS)[number];

type Packs = {
  selling_price: number;
  strip_size: number | null;
  box_size: number | null;
  strip_price: number | null;
  box_price: number | null;
};

/** The ways this product can be sold: always by the unit, and by the strip or box if it has a size for one. */
export const unitsOf = (item: Packs): SaleUnit[] =>
  SALE_UNITS.filter(unit => unit === "unit" || (unit === "strip" ? item.strip_size : item.box_size));

/** How many single units one of these is. */
export const sizeOf = (item: Packs, unit: SaleUnit) =>
  unit === "strip" ? (item.strip_size ?? 1) : unit === "box" ? (item.box_size ?? 1) : 1;

/** What one of these costs: its own price if it has one, otherwise its units added up. Mirrors pharmacy_create_sale. */
export const priceOf = (item: Packs, unit: SaleUnit) => {
  const each = Number(item.selling_price);
  if (unit === "strip") return Number(item.strip_price ?? each * sizeOf(item, unit));
  if (unit === "box") return Number(item.box_price ?? each * sizeOf(item, unit));
  return each;
};

export const LOYALTY_TIERS = ["bronze", "silver", "gold", "platinum"] as const;
export type LoyaltyTier = (typeof LOYALTY_TIERS)[number];

export const RETURN_CONDITIONS = ["restock", "damaged", "expired"] as const;
export type ReturnCondition = (typeof RETURN_CONDITIONS)[number];

export const STAFF_ROLES = ["manager", "pharmacist", "cashier", "stock_keeper"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** One yes or no each (0133). The database checks every one of them again. */
export const PERMISSIONS = ["discount", "approve_returns", "manage_cash", "manage_stock", "see_reports", "administer"] as const;
export type Permission = (typeof PERMISSIONS)[number];
export type PermissionFlags = Record<`can_${Permission}`, boolean>;

/** What a new login of each kind starts with. The form can change any of them. */
export const ROLE_DEFAULTS: Record<StaffRole, Permission[]> = {
  manager: [...PERMISSIONS],
  pharmacist: ["discount", "approve_returns", "manage_stock", "see_reports"],
  cashier: [],
  stock_keeper: ["manage_stock"],
};

/** The signed-in person's own details, with what they are in the pharmacy. */
export type PharmacyProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  pharmacy: PharmacyMe | null;
};

export type PharmacyMe = {
  role: string | null;
  staff_role: StaffRole | null;
  branch_id: string | null;
  has_pin: boolean;
  can: Record<Permission, boolean>;
};

/** How money against a sale on account can arrive later. Not "credit": that is the debt itself. */
export const COLLECT_METHODS = ["cash", "card", "mobile", "other"] as const;

export const ADJUST_REASONS = ["adjustment", "damaged", "expired", "lost"] as const;
export type AdjustReason = (typeof ADJUST_REASONS)[number];

export type ItemStatus = "active" | "low_stock" | "out_of_stock";

export type PharmacyItem = {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  generic_name: string | null;
  description: string | null;
  category: string | null;
  manufacturer: string | null;
  selling_price: number;
  cost_price: number;
  reorder: number;
  stock: number;
  status: ItemStatus;
  requires_prescription: boolean;
  track_expiry: boolean;
  is_active: boolean;
  strip_size: number | null;
  box_size: number | null;
  strip_price: number | null;
  box_price: number | null;
  created_at: string;
  updated_at: string;
};

export type PharmacySupplier = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: "active" | "inactive";
  created_at: string;
};

export type PharmacyCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  patient_id: string | null;
  notes: string | null;
  allergies: string | null;
  is_active: boolean;
  points: number;
  lifetime_points: number;
  redeemed_points: number;
  store_credit: number;
  tier: LoyaltyTier;
  created_at: string;
  orders_count: number;
  total_spent: number;
  balance_due: number;
  last_visit: string | null;
};

export type LedgerKind =
  | "earned" | "redeemed" | "bonus" | "adjusted" | "reversed" | "restored" | "credit_added" | "credit_used";

export type CustomerLedgerLine = {
  id: string;
  customer_id: string;
  kind: LedgerKind;
  points: number;
  amount: number;
  points_after: number;
  credit_after: number;
  reference: string | null;
  reason: string | null;
  created_by_name: string | null;
  created_at: string;
};

export type LoyaltySummary = {
  customers: number;
  members: number;
  points: number;
  store_credit: number;
} & Record<LoyaltyTier, number>;

export type PharmacyRegister = {
  id: string;
  branch_id: string;
  name: string;
  code: string;
  is_active: boolean;
  branch?: { id: string; name: string; code: string } | null;
};

export type PharmacyBranch = {
  id: string;
  name: string;
  code: string;
  is_main: boolean;
  status: "active" | "maintenance" | "inactive";
  address: string | null;
  phone: string | null;
  email: string | null;
  license_no: string | null;
  vat_no: string | null;
  pharmacist_in_charge: string | null;
  opening_hours: string | null;
  created_at: string;
  registers: PharmacyRegister[];
};

export type AuditRow = {
  id: number;
  occurred_at: string;
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  table_name: string;
  action: "insert" | "update" | "delete";
  changed_fields: string[];
  record_id: string | null;
  label: string | null;
};

export type PharmacyExpense = {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
  shift_id: string | null;
  created_by_name: string | null;
  created_at: string;
};

export type BatchState = "ok" | "expiring_soon" | "expired" | "empty";

export type PharmacyBatch = {
  id: string;
  item_id: string;
  batch_number: string;
  quantity: number;
  unit_cost: number;
  expiry_date: string | null;
  location: string;
  supplier_id: string | null;
  received_at: string;
  item_name: string;
  sku: string;
  generic_name: string | null;
  category: string | null;
  reorder: number;
  selling_price: number;
  supplier_name: string | null;
  days_left: number | null;
  state: BatchState;
};

export type StockMovement = {
  id: number;
  item_id: string;
  batch_id: string | null;
  batch_number: string | null;
  kind: "opening" | "purchase" | "sale" | "return" | "adjustment" | "damaged" | "expired" | "lost";
  quantity: number;
  reference: string | null;
  note: string | null;
  created_by_name: string | null;
  created_at: string;
};

export type SaleItem = {
  id: string;
  item_id: string;
  item_name: string;
  sku: string | null;
  category: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  quantity: number;
  returned_quantity: number;
  unit_price: number;
  line_total: number;
  /** What it was sold as. `quantity` is always single units; this many make one of `sold_unit`. */
  sold_unit: SaleUnit;
  pack_size: number;
};

export type SaleReturn = {
  id: string;
  return_number: string | null;
  returned_at: string;
  refund_amount: number;
  paid_back: number;
  refund_method: "cash" | "original" | "credit";
  reason: string;
  notes: string | null;
  restocked: boolean;
  approved_by_name: string | null;
  points_reversed: number;
  points_restored: number;
  created_by_name: string | null;
  lines: { id: string; item_name: string; quantity: number; unit_price: number; condition: ReturnCondition }[];
};

export type SalePayment = {
  id: string;
  amount: number;
  method: Exclude<PaymentMethod, "credit">;
  reference: string | null;
  created_by_name: string | null;
  created_at: string;
};

export type SaleStatus = "completed" | "partial_return" | "returned";
export type PaymentStatus = "paid" | "partial" | "unpaid";

export type PharmacySale = {
  id: string;
  invoice_number: string;
  sold_at: string;
  sale_date: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax: number;
  total_amount: number;
  paid_amount: number;
  tendered_amount: number;
  change_amount: number;
  refunded_amount: number;
  payment_method: PaymentMethod;
  payment_reference: string | null;
  payment_status: PaymentStatus;
  status: SaleStatus;
  notes: string | null;
  created_by_name: string | null;
  payment_parts: PaymentPart[] | null;
  /** The part of `discount` that was loyalty points. */
  points_discount: number;
  points_redeemed: number;
  points_earned: number;
  branch: { id: string; name: string; code: string; address: string | null; phone: string | null } | null;
  items: SaleItem[];
  payments: SalePayment[];
  returns: SaleReturn[];
};

/**
 * A sale line as a person counts it: "2 strips", not "20". A line that was
 * split across batches may hold a part of a pack; that one is shown in units.
 */
export const asSold = (line: Pick<SaleItem, "quantity" | "sold_unit" | "pack_size" | "unit_price">) => {
  const size = Number(line.pack_size) || 1;
  const whole = size > 1 && line.quantity % size === 0;
  return whole
    ? { count: line.quantity / size, unit: line.sold_unit, price: Number(line.unit_price) * size }
    : { count: line.quantity, unit: "unit" as SaleUnit, price: Number(line.unit_price) };
};

/** What is still owed on a sale, after what came back and what was paid. */
export const dueOn = (sale: Pick<PharmacySale, "total_amount" | "refunded_amount" | "paid_amount">) =>
  Math.max(Number(sale.total_amount) - Number(sale.refunded_amount) - Number(sale.paid_amount), 0);

export type PurchaseOrderItem = {
  id: string;
  item_id: string;
  item_name: string;
  sku: string | null;
  quantity: number;
  received_quantity: number;
  unit_cost: number;
};

export type PurchaseStatus = "ordered" | "partial" | "received" | "cancelled";

export type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id: string;
  status: PurchaseStatus;
  payment_status: PaymentStatus;
  order_date: string;
  expected_date: string | null;
  subtotal: number;
  tax: number;
  shipping_cost: number;
  total_amount: number;
  paid_amount: number;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
  supplier: Pick<PharmacySupplier, "id" | "name" | "phone" | "email" | "address"> | null;
  items: PurchaseOrderItem[];
};

export type CashLineType = "cash_in" | "cash_out" | "expense" | "sale" | "refund" | "payment";

export type CashLine = {
  id: string;
  type: CashLineType;
  amount: number;
  note: string | null;
  sale_id: string | null;
  created_by_name: string | null;
  created_at: string;
};

export type CashShift = {
  id: string;
  opened_by: string | null;
  opened_by_name: string | null;
  opened_at: string;
  opening_balance: number;
  status: "open" | "closed";
  closed_at: string | null;
  closed_by_name: string | null;
  expected_balance: number | null;
  closing_balance: number | null;
  discrepancy: number | null;
  closing_note: string | null;
  register_id: string | null;
  register?: { id: string; name: string; code: string } | null;
  lines: CashLine[];
};

/** The signed-in person's open drawer, with what should be in it right now. */
export type Drawer = CashShift & {
  balance: number;
  totals: { sales: number; cash_in: number; cash_out: number; expenses: number; refunds: number };
};

export type PosItem = {
  id: string;
  sku: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  manufacturer: string | null;
  selling_price: number;
  requires_prescription: boolean;
  sellable: number;
  next_expiry: string | null;
  sold_recent: number;
  strip_size: number | null;
  box_size: number | null;
  /** Already worked out by the database: its own price, or the units added up. */
  strip_price: number | null;
  box_price: number | null;
};

export type StockAlerts = {
  expiring_soon_days: number;
  stock: {
    id: string; sku: string; name: string; generic_name: string | null; category: string | null;
    reorder: number; quantity: number; kind: "out_of_stock" | "low_stock";
  }[];
  batches: {
    id: string; item_id: string; sku: string; name: string; generic_name: string | null; batch_number: string;
    quantity: number; expiry_date: string; location: string; days_left: number; kind: "expired" | "expiring_soon";
  }[];
};

export type PharmacyDashboard = {
  today: {
    date: string; revenue: number; transactions: number; units: number; gross_profit: number; margin: number;
    avg_basket: number; customers: number; credit_amount: number; credit_count: number;
  };
  yesterday: { revenue: number };
  month: { revenue: number; tax: number; last_month_revenue: number; expenses: number };
  year: { revenue: number };
  week: { revenue: number };
  customers: { total: number; new_this_month: number; with_balance: number; balance_due: number };
  purchase_orders: { open: number };
  inventory: { products: number; units: number; value_retail: number; value_cost: number };
  alerts: { out_of_stock: number; low_stock: number; expiring: number; expired: number; expiring_soon_days: number };
  trend: { day: string; revenue: number; transactions: number }[];
  payment_mix: { method: PaymentMethod; revenue: number; count: number }[];
  hourly: { hour: number; revenue: number }[];
  top_sellers: { name: string; quantity: number; revenue: number }[];
  recent_sales: {
    id: string; invoice_number: string; total_amount: number; sold_at: string; cashier: string | null;
    status: SaleStatus; items: string | null;
  }[];
  stock_watch: {
    name: string; generic_name: string | null; quantity: number; reorder: number; expiry_date: string | null;
    kind: "out_of_stock" | "low_stock" | "expired" | "expiring_soon";
  }[];
  drawer: { id: string; opened_at: string; balance: number } | null;
};

export type PharmacyReport = {
  from: string;
  to: string;
  summary: {
    revenue: number; subtotal: number; discount: number; tax: number; refunds: number; returned_count: number;
    transactions: number; units: number; gross_profit: number; margin: number; avg_ticket: number;
    expenses: number; net: number; credit_sales: number; customer_sales: number; walk_in_sales: number;
    prescription_sales: number; purchases: number;
  };
  daily: { day: string; revenue: number; transactions: number }[];
  payment_mix: { method: PaymentMethod; revenue: number; count: number; avg: number }[];
  by_category: { category: string; revenue: number; quantity: number }[];
  top_products: { name: string; sku: string | null; quantity: number; revenue: number; profit: number }[];
  cashiers: { name: string; revenue: number; count: number }[];
  expenses_by_category: { category: string; amount: number }[];
  inventory: {
    products: number; units: number; value_retail: number; value_cost: number;
    out_of_stock: number; low_stock: number; expiring: number; expired: number;
  };
};

export type ForecastRow = {
  item_id: string;
  sku: string;
  name: string;
  generic_name: string | null;
  stock: number;
  reorder: number;
  sold_30: number;
  daily: number;
  trend: "up" | "down" | "flat" | "none";
  unit_cost: number;
  supplier_id: string | null;
  supplier_name: string | null;
  days_to_stockout: number | null;
  suggested: number;
};

export type InsightFlagType =
  | "expired_stock" | "under_cost" | "cash_discrepancy" | "dead_stock"
  | "frequent_returns" | "thin_margin" | "sales_spike";

export type InsightFlag = {
  type: InsightFlagType;
  severity: "high" | "medium" | "low";
  count: number;
  value?: number;
  rows: Record<string, string | number | null>[];
};

export type PharmacyInsights = { forecast: ForecastRow[]; flags: InsightFlag[] };

export type PharmacySettings = {
  pharmacy_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  license_no: string | null;
  tax_label: string;
  tax_rate: number;
  invoice_prefix: string;
  po_prefix: string;
  receipt_footer: string | null;
  return_policy: string | null;
  expiring_soon_days: number;
  expense_categories: string[];
  tax_id: string | null;
  payment_terms: string | null;
  loyalty_enabled: boolean;
  /** Spend this much, earn one point. */
  loyalty_spend_per_point: number;
  /** What one point is worth when it is spent. */
  loyalty_point_value: number;
  loyalty_min_redeem: number;
  loyalty_silver_at: number;
  loyalty_gold_at: number;
  loyalty_platinum_at: number;
  loyalty_silver_rate: number;
  loyalty_gold_rate: number;
  loyalty_platinum_rate: number;
  /** AI features (0136). The two that call a model are ai_assistant and ai_interactions. */
  ai_assistant: boolean;
  ai_interactions: boolean;
  ai_predictions: boolean;
  ai_expiry: boolean;
  ai_interaction_level: InteractionLevel;
};

export const INTERACTION_LEVELS = ["minor", "moderate", "major", "severe"] as const;
export type InteractionLevel = (typeof INTERACTION_LEVELS)[number];

export type DrugInteraction = { drugs: string[]; severity: InteractionLevel; effect: string; advice: string };
export type InteractionCheck = { interactions: DrugInteraction[]; hidden: number; summary: string };
export type ChatMessage = { role: "user" | "assistant"; content: string };

/** How much faster this tier earns points than bronze. */
export const tierRate = (settings: PharmacySettings, tier: LoyaltyTier) =>
  tier === "platinum" ? Number(settings.loyalty_platinum_rate)
  : tier === "gold" ? Number(settings.loyalty_gold_rate)
  : tier === "silver" ? Number(settings.loyalty_silver_rate)
  : 1;

/** A YYYY-MM-DD day moved by a number of days. Works on the calendar, not on a clock. */
export const shiftDay = (day: string, by: number) => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + by)).toISOString().slice(0, 10);
};

/** The first of the month a day falls in. */
export const monthStartOf = (day: string) => `${day.slice(0, 7)}-01`;

/**
 * Reads CSV text into rows of cells. Handles quoted cells, a comma or a line
 * break inside quotes, and "" for a quote — what a spreadsheet writes when it
 * saves as CSV. A leading byte-order mark is dropped.
 */
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^﻿/, "");

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some(value => value.trim() !== "")) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some(value => value.trim() !== "")) rows.push(row);

  return rows;
};

export type StaffLogin = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  staff_role: StaffRole;
  branch_id: string | null;
  branch_name: string | null;
  has_pin: boolean;
} & PermissionFlags;
