export type TransactionType = 'cash_in' | 'cash_out' | 'expense' | 'sale' | 'refund';

export interface SaleItem {
  productId: string;
  name: string;
  category: string;
  sku: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  returnedQuantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
}

export type ItemReturnCondition = 'SEALED_RESTOCK' | 'DAMAGED_DISPOSAL' | 'EXPIRED_QUARANTINE';

export interface ReturnedItemLine {
  productId: string;
  name: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  condition: ItemReturnCondition;
  batchNumber?: string;
  restocked: boolean;
}

export interface SaleReturnRecord {
  id: string;
  returnVoucherNumber: string;
  returnDate: string;
  returnTimestamp: number;
  refundAmount: number;
  reason: string;
  refundMethod: 'CASH' | 'ORIGINAL' | 'CREDIT';
  items: ReturnedItemLine[];
  notes?: string;
  processedBy: string;
  authorizedByManager: string;
  managerPinUsed?: string;
  pointsReversed?: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  timestamp: number;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    type?: 'Walk-in' | 'Registered' | 'Insurance';
    customerId?: string;
    loyaltyPointsEarned?: number;
    loyaltyPointsRedeemed?: number;
    loyaltyTier?: LoyaltyTier;
  };
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'MOBILE' | 'CREDIT' | 'OTHER';
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  status: 'COMPLETED' | 'PARTIAL_RETURN' | 'RETURNED';
  refundedAmount: number;
  cashier: string;
  returns?: SaleReturnRecord[];
  notes?: string;
}

export interface CashTransaction {
  id: string;
  time: string; // ISO string or formatted string
  timestamp: number;
  type: TransactionType;
  amount: number; // positive for cash in, negative for cash out & expense
  note?: string;
  cashier: string;
}

export interface CashDrawerShift {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedTimestamp: number;
  closedTimestamp?: number;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance: number;
  discrepancy?: number;
  cashier: string;
  status: 'OPEN' | 'CLOSED';
  transactions: CashTransaction[];
  closingNote?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'cashier';
  storeName: string;
}

export interface Product {
  id: string;
  name: string;
  genericName: string;
  description?: string;
  category: string;
  manufacturer: string;
  sku: string;
  sellingPrice: number;
  costPrice: number;
  requiresPrescription: boolean;
  trackExpiryDate: boolean;
  createdAt?: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  genericName?: string;
  sku: string;
  batchNumber: string;
  quantity: number;
  reorderLevel: number;
  location: string;
  expiryDate: string; // DD/MM/YYYY
  expiryTimestamp: number;
  status: 'NORMAL' | 'LOW_STOCK' | 'EXPIRING_SOON' | 'EXPIRED';
}

export interface MarginInsight {
  productId: string;
  productName: string;
  price: number;
  costPrice: number;
  marginPercentage: number;
  velocity90d: number;
  sold90d: number;
  priority: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  totalCost: number;
  batchNumber?: string;
  expiryDate?: string;
  location?: string;
  reorderLevel?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  date: string;
  timestamp: number;
  expectedDate?: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  shippingCost?: number;
  totalAmount: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  status: 'Ordered' | 'Received' | 'Partial Received' | 'Cancelled';
  notes?: string;
  createdAt: string;
}

export interface ReorderSuggestion {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  supplierName: string;
  suggestedUnits: number;
  currentStock: number;
  dailyDemand: number;
  daysUntilStockout: number;
  estimatedCost: number;
}

export interface Expense {
  id: string;
  date: string; // DD/MM/YYYY
  timestamp: number;
  category: string;
  description: string;
  amount: number;
  recordedBy: string;
  createdAt: string;
}

export type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export type LoyaltyTransactionType =
  | "EARNED_PURCHASE"
  | "BONUS"
  | "REDEEMED"
  | "ADJUSTED";

export interface LoyaltyPointsHistory {
  id: string;
  date: string;
  timestamp: number;
  type: LoyaltyTransactionType;
  points: number; // positive for earned/bonus, negative for redeemed/deducted
  orderId?: string;
  orderAmount?: number;
  reason?: string;
  processedBy?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyaltyTier: LoyaltyTier;
  points: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;
  totalSpent: number;
  totalOrders: number;
  balance: number; // AR / credit balance
  joinedDate: string;
  lastVisit: string;
  status: "ACTIVE" | "INACTIVE";
  notes?: string;
  allergies?: string[];
  pointsHistory: LoyaltyPointsHistory[];
}

export interface LoyaltyProgramSettings {
  pointsPerDollar: number; // e.g. 1 pt per $1 spent
  redemptionRate: number; // e.g. 100 points = $1 discount
  minRedeemPoints: number; // e.g. 50
  tierThresholds: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  tierMultipliers: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
}

// ==========================================
// Administration & Governance Types
// ==========================================

export type StaffRole =
  | 'superadmin'
  | 'admin'
  | 'pharmacist'
  | 'cashier'
  | 'inventory_manager';

export interface RolePermissions {
  canVoidSales: boolean;
  canApplyManualDiscount: boolean;
  canPriceOverride: boolean;
  canViewCostMargins: boolean;
  canOpenDrawerNoSale: boolean;
  canModifyInventory: boolean;
  canManageStaff: boolean;
  canViewFinancialReports: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  branchId: string;
  branchName: string;
  posPin: string; // 4-digit PIN for rapid register authorization
  status: 'ACTIVE' | 'INACTIVE';
  joinedDate: string;
  lastLogin?: string;
  customPermissions: RolePermissions;
}

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AuditCategory =
  | 'SALES_VOID'
  | 'DISCOUNT_APPLIED'
  | 'PRICE_OVERRIDE'
  | 'INVENTORY_ADJUST'
  | 'DRAWER_OPEN'
  | 'STAFF_PERM_CHANGE'
  | 'LOGIN_ATTEMPT'
  | 'BRANCH_CONFIG';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  formattedTime: string;
  staffName: string;
  staffRole: string;
  category: AuditCategory;
  severity: AuditSeverity;
  action: string;
  details: string;
  ipAddress?: string;
  terminalId?: string;
  branchName: string;
}

export interface PosTerminal {
  id: string;
  name: string;
  terminalCode: string;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY';
  currentCashier?: string;
  activeShiftId?: string;
  ipAddress?: string;
  lastPing?: string;
}

export interface PharmacyBranch {
  id: string;
  name: string;
  code: string;
  isMainBranch: boolean;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  address: string;
  phone: string;
  email: string;
  drugLicenseNo: string;
  vatRegistrationNo: string;
  pharmacistInCharge: string;
  operatingHours: string;
  terminals: PosTerminal[];
  totalStaffCount: number;
}



