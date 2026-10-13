import { baseApi } from "./baseApi";
import { createResourceApi } from "./createResourceApi";
import type {
  AuditRow, CashShift, ChatMessage, CustomerLedgerLine, InteractionCheck, Drawer, LoyaltySummary, PaymentPart, PermissionFlags, PharmacyBatch,
  PharmacyBranch, PharmacyCustomer, PharmacyProfile, PharmacyDashboard, PharmacyExpense, PharmacyInsights, PharmacyItem, PharmacyMe,
  PharmacyRegister, PharmacyReport, PharmacySale, PharmacySettings, PharmacySupplier, PosItem, PurchaseOrder,
  ReturnCondition, SaleUnit, StaffLogin, StaffRole, StockAlerts, StockMovement,
} from "@/lib/pharmacy";

/**
 * Client for the pharmacy panel.
 *
 * The lists are createResourceApi like every other module. Everything that
 * moves stock or money goes through /api/v1/pharmacy/*, which is not CRUD, so
 * those are endpoints of their own here — on the same baseApi, so one of them
 * can invalidate the lists it changed. A sale has to refresh the sales list,
 * the stock, the drawer and the dashboard, and none of those are "the
 * resource that was written to".
 */

// ---------------------------------------------------------------- lists ---
export const pharmacyItemsApi = createResourceApi<PharmacyItem>("pharmacy-items");
export const pharmacySuppliersApi = createResourceApi<PharmacySupplier>("pharmacy-suppliers");
export const pharmacyCustomersApi = createResourceApi<PharmacyCustomer>("pharmacy-customers");
export const pharmacyExpensesApi = createResourceApi<PharmacyExpense>("pharmacy-expenses");
export const pharmacyBatchesApi = createResourceApi<PharmacyBatch>("pharmacy-batches");
export const pharmacyMovementsApi = createResourceApi<StockMovement>("pharmacy-stock-movements");
export const pharmacySalesApi = createResourceApi<PharmacySale>("pharmacy-sales");
export const pharmacyPurchaseOrdersApi = createResourceApi<PurchaseOrder>("pharmacy-purchase-orders");
export const pharmacyCashShiftsApi = createResourceApi<CashShift>("pharmacy-cash-shifts");
export const pharmacyBranchesApi = createResourceApi<PharmacyBranch>("pharmacy-branches");
export const pharmacyRegistersApi = createResourceApi<PharmacyRegister>("pharmacy-registers");
export const pharmacyLedgerApi = createResourceApi<CustomerLedgerLine>("pharmacy-customer-ledger");

// --------------------------------------------------------------- actions ---
const api = baseApi.enhanceEndpoints({ addTagTypes: ["Resource", "Pharmacy"] });

const list = (resource: string) => ({ type: "Resource" as const, id: `${resource}:LIST` });
const own = (id: string) => ({ type: "Pharmacy" as const, id });

/**
 * The totals are counted from these lists, so a row added or edited through
 * the plain CRUD endpoints (createResourceApi invalidates "<list>:LIST") has to
 * refresh them too: an expense typed in changes this month's spending.
 */
const TOTALS = [own("OVERVIEW"), list("pharmacy-expenses"), list("pharmacy-items"), list("pharmacy-customers")];

/** Everything on screen that a change to stock makes stale. */
const STOCK = [
  list("pharmacy-items"), list("pharmacy-batches"), list("pharmacy-stock-movements"),
  own("POS"), own("ALERTS"), own("OVERVIEW"),
];
/** And a change to money. */
const MONEY = [
  list("pharmacy-sales"), list("pharmacy-customers"), list("pharmacy-cash-shifts"), list("pharmacy-customer-ledger"),
  own("DRAWER"), own("OVERVIEW"), own("LOYALTY"),
];

export type SaleRequest = {
  /** `quantity` counts whatever `unit` is: 2 with "strip" is two strips. */
  items: { item_id: string; quantity: number; unit?: SaleUnit }[];
  payment_method: string;
  /** The parts of a split payment. */
  payments?: PaymentPart[] | null;
  tendered?: number;
  discount?: number;
  redeem_points?: number;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  payment_reference?: string | null;
  notes?: string | null;
};

export type SaleAction =
  | {
      action: "return";
      items: { sale_item_id: string; quantity: number; condition: ReturnCondition }[];
      reason: string;
      refund_method: "cash" | "original" | "credit";
      notes?: string | null;
      manager_pin?: string | null;
    }
  | { action: "payment"; amount: number; method: string; reference?: string | null };

/** What a login is and may do, as the staff form posts it. */
export type StaffAccessRequest = PermissionFlags & {
  staff_role: StaffRole;
  branch_id: string | null;
  pin?: string | null;
  clear_pin?: boolean;
};

export type PurchaseRequest = {
  supplier_id: string;
  items: { item_id: string; quantity: number; unit_cost?: number }[];
  expected_date?: string | null;
  notes?: string | null;
  tax?: number;
  shipping_cost?: number;
};

export type PurchaseAction =
  | { action: "receive"; lines: { po_item_id: string; quantity: number; batch_number?: string; expiry_date?: string | null; location?: string }[] }
  | { action: "pay"; amount: number }
  | { action: "cancel" };

export type DrawerAction =
  | { action: "open"; opening_balance: number; register_id?: string | null }
  | { action: "close"; counted: number; note?: string | null; shift_id?: string | null }
  | { action: "cash_in" | "cash_out" | "expense"; amount: number; note?: string | null; category?: string | null }
  | { action: "remove"; id: string };

export type StockAction =
  | { action: "add"; item_id: string; batch_number: string; quantity: number; expiry_date?: string | null; location?: string | null; unit_cost?: number | null; supplier_id?: string | null; note?: string | null }
  | { action: "adjust"; batch_id: string; quantity: number; reason: string; note?: string | null };

export type ImportResult = { created: number; skipped: number; invalid: { row: number; message: string }[] };
export type StaffSecret = { id: string; email: string; password: string };

const pharmacyApi = api.injectEndpoints({
  endpoints: (build) => ({
    posItems: build.query<{ data: PosItem[]; categories: string[] }, { q?: string; category?: string; limit?: number }>({
      query: ({ q = "", category = "", limit = 24 }) =>
        `/pharmacy/pos?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&limit=${limit}`,
      providesTags: [own("POS"), list("pharmacy-items")],
    }),
    createSale: build.mutation<{ data: PharmacySale }, SaleRequest>({
      query: (body) => ({ url: "/pharmacy/pos", method: "POST", body }),
      invalidatesTags: [...STOCK, ...MONEY],
    }),
    saleAction: build.mutation<{ data: PharmacySale }, { id: string; body: SaleAction }>({
      query: ({ id, body }) => ({ url: `/pharmacy/sales/${id}`, method: "POST", body }),
      invalidatesTags: [...STOCK, ...MONEY],
    }),

    createPurchase: build.mutation<{ data: PurchaseOrder }, PurchaseRequest>({
      query: (body) => ({ url: "/pharmacy/purchases", method: "POST", body }),
      invalidatesTags: [list("pharmacy-purchase-orders"), own("OVERVIEW")],
    }),
    purchaseAction: build.mutation<{ data: PurchaseOrder }, { id: string; body: PurchaseAction }>({
      query: ({ id, body }) => ({ url: `/pharmacy/purchases/${id}`, method: "POST", body }),
      invalidatesTags: [list("pharmacy-purchase-orders"), ...STOCK],
    }),

    drawer: build.query<{ data: Drawer | null }, void>({
      query: () => "/pharmacy/drawer",
      providesTags: [own("DRAWER")],
    }),
    drawerAction: build.mutation<{ data: Drawer | null; closed?: CashShift }, DrawerAction>({
      query: (body) => ({ url: "/pharmacy/drawer", method: "POST", body }),
      invalidatesTags: [own("DRAWER"), own("OVERVIEW"), list("pharmacy-cash-shifts"), list("pharmacy-expenses")],
    }),

    stockAlerts: build.query<{ data: StockAlerts }, void>({
      query: () => "/pharmacy/stock",
      providesTags: [own("ALERTS"), list("pharmacy-items")],
    }),
    stockAction: build.mutation<{ data: { result: unknown } }, StockAction>({
      query: (body) => ({ url: "/pharmacy/stock", method: "POST", body }),
      invalidatesTags: STOCK,
    }),

    pharmacyDashboard: build.query<{ data: PharmacyDashboard }, void>({
      query: () => "/pharmacy/overview?view=dashboard",
      providesTags: TOTALS,
    }),
    pharmacyReport: build.query<{ data: PharmacyReport }, { from: string; to: string }>({
      query: ({ from, to }) => `/pharmacy/overview?view=report&from=${from}&to=${to}`,
      providesTags: TOTALS,
    }),
    pharmacyInsights: build.query<{ data: PharmacyInsights }, void>({
      query: () => "/pharmacy/overview?view=insights",
      providesTags: TOTALS,
    }),

    askAssistant: build.mutation<{ data: { reply: string } }, { messages: ChatMessage[] }>({
      query: (body) => ({ url: "/pharmacy/assistant", method: "POST", body: { mode: "chat", ...body } }),
    }),
    checkInteractions: build.mutation<{ data: InteractionCheck }, { items: { name: string; generic_name: string | null }[] }>({
      query: (body) => ({ url: "/pharmacy/assistant", method: "POST", body: { mode: "interactions", ...body } }),
    }),

    pharmacySettings: build.query<{ data: PharmacySettings; hospital: string | null; ai_configured: boolean }, void>({
      query: () => "/pharmacy/settings",
      providesTags: [own("SETTINGS")],
    }),
    savePharmacySettings: build.mutation<{ data: PharmacySettings }, Partial<PharmacySettings>>({
      query: (body) => ({ url: "/pharmacy/settings", method: "PUT", body }),
      invalidatesTags: [own("SETTINGS"), own("ALERTS"), own("OVERVIEW"), list("pharmacy-batches")],
    }),

    importPharmacyItems: build.mutation<{ data: ImportResult }, { rows: Record<string, unknown>[] }>({
      query: (body) => ({ url: "/pharmacy/import", method: "POST", body }),
      invalidatesTags: [list("pharmacy-items"), own("POS"), own("ALERTS"), own("OVERVIEW")],
    }),

    pharmacyStaff: build.query<{ data: StaffLogin[] }, void>({
      query: () => "/pharmacy/staff",
      providesTags: [own("STAFF")],
    }),
    createPharmacyStaff: build.mutation<
      { data: StaffSecret; warning?: { message: string; code?: string } },
      StaffAccessRequest & { full_name: string; email: string; phone?: string }
    >({
      query: (body) => ({ url: "/pharmacy/staff", method: "POST", body }),
      invalidatesTags: [own("STAFF")],
    }),
    pharmacyStaffAction: build.mutation<
      { data: Partial<StaffSecret> & { id: string; is_active?: boolean } },
      { id: string; action: "reset_password" | "deactivate" | "activate" }
    >({
      query: ({ id, action }) => ({ url: `/pharmacy/staff/${id}`, method: "PATCH", body: { action } }),
      invalidatesTags: [own("STAFF")],
    }),
    savePharmacyStaff: build.mutation<{ data: { id: string } }, { id: string; body: StaffAccessRequest }>({
      query: ({ id, body }) => ({ url: `/pharmacy/staff/${id}`, method: "PATCH", body: { action: "save", ...body } }),
      // The person edited may be the one looking: what they are shown can have changed.
      invalidatesTags: [own("STAFF"), own("ME")],
    }),

    pharmacyMe: build.query<{ data: PharmacyMe }, void>({
      query: () => "/pharmacy/me",
      providesTags: [own("ME")],
    }),

    pharmacyProfile: build.query<{ data: PharmacyProfile }, void>({
      query: () => "/pharmacy/profile",
      providesTags: [own("PROFILE"), own("ME")],
    }),
    savePharmacyProfile: build.mutation<{ data: PharmacyProfile }, { full_name: string; phone: string | null }>({
      query: (body) => ({ url: "/pharmacy/profile", method: "PATCH", body }),
      invalidatesTags: [own("PROFILE"), own("STAFF")],
    }),

    loyaltySummary: build.query<{ data: LoyaltySummary }, void>({
      query: () => "/pharmacy/loyalty",
      providesTags: [own("LOYALTY"), list("pharmacy-customers")],
    }),
    adjustPoints: build.mutation<{ data: { customer_id: string; points: number } }, { customer_id: string; points: number; reason: string }>({
      query: (body) => ({ url: "/pharmacy/loyalty", method: "POST", body }),
      invalidatesTags: [own("LOYALTY"), list("pharmacy-customers"), list("pharmacy-customer-ledger")],
    }),

    pharmacyAudit: build.query<
      { data: AuditRow[]; meta: { page: number; limit: number; total: number; totalPages: number } },
      { from?: string; to?: string; table?: string; action?: string; q?: string; page?: number; limit?: number }
    >({
      query: (params) => {
        const search = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, String(value)); });
        return `/pharmacy/audit?${search}`;
      },
      providesTags: [own("AUDIT")],
      // A log is read fresh: it changes with everything anyone does.
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  usePosItemsQuery,
  useCreateSaleMutation,
  useSaleActionMutation,
  useCreatePurchaseMutation,
  usePurchaseActionMutation,
  useDrawerQuery,
  useDrawerActionMutation,
  useStockAlertsQuery,
  useStockActionMutation,
  usePharmacyDashboardQuery,
  usePharmacyReportQuery,
  usePharmacyInsightsQuery,
  usePharmacySettingsQuery,
  useSavePharmacySettingsMutation,
  useImportPharmacyItemsMutation,
  usePharmacyStaffQuery,
  useCreatePharmacyStaffMutation,
  usePharmacyStaffActionMutation,
  useSavePharmacyStaffMutation,
  usePharmacyMeQuery,
  useAskAssistantMutation,
  useCheckInteractionsMutation,
  usePharmacyProfileQuery,
  useSavePharmacyProfileMutation,
  useLoyaltySummaryQuery,
  useAdjustPointsMutation,
  usePharmacyAuditQuery,
} = pharmacyApi;
