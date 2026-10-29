"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  CashTransaction,
  CashDrawerShift,
  UserProfile,
  TransactionType,
  Sale,
  SaleReturnRecord,
  Product,
  InventoryItem,
  MarginInsight,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  ReorderSuggestion,
  Expense,
  Customer,
  LoyaltyTier,
  LoyaltyPointsHistory,
  LoyaltyProgramSettings,
  StaffMember,
  StaffRole,
  RolePermissions,
  AuditLogEntry,
  PharmacyBranch,
  PosTerminal,
  ItemReturnCondition,
  ReturnedItemLine,
} from "@/types/pharmacy";
import {
  initialShiftHistory,
  initialSales,
  initialProducts,
  initialInventory,
  initialMarginInsights,
  initialSuppliers,
  initialPurchaseOrders,
  initialReorderSuggestions,
  initialExpenses,
  initialExpenseCategories,
  initialCustomers,
  initialLoyaltySettings,
  initialStaffMembers,
  initialBranches,
  initialAuditLogs,
  defaultRolePermissions,
} from "@/data/mockData";
import { formatDateTime } from "@/lib/utils";
import { playSound } from "@/lib/audio";

interface PharmacyContextType {
  user: UserProfile | null;
  drawerStatus: "OPEN" | "CLOSED";
  openingBalance: number;
  currentBalance: number;
  openedAt: string;
  transactions: CashTransaction[];
  shiftsHistory: CashDrawerShift[];
  sales: Sale[];
  products: Product[];
  inventory: InventoryItem[];
  marginInsights: MarginInsight[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  reorderSuggestions: ReorderSuggestion[];
  expenses: Expense[];
  expenseCategories: string[];
  customers: Customer[];
  loyaltySettings: LoyaltyProgramSettings;
  staffMembers: StaffMember[];
  branches: PharmacyBranch[];
  auditLogs: AuditLogEntry[];
  soundEnabled: boolean;
  currencySymbol: string;
  activeTab: "current" | "history";
  setActiveTab: (tab: "current" | "history") => void;
  setSoundEnabled: (enabled: boolean) => void;
  setCurrencySymbol: (sym: string) => void;
  openDrawer: (balance: number) => void;
  closeDrawer: (closingBalance: number, note?: string) => CashDrawerShift;
  addTransaction: (type: TransactionType, amount: number, note?: string) => void;
  deleteTransaction: (id: string) => void;
  addSale: (saleData: Omit<Sale, "id">) => Sale;
  processReturn: (
    saleId: string,
    returnData: {
      items: Array<{
        productId: string;
        quantity: number;
        condition: ItemReturnCondition;
        unit?: string;
        batchNumber?: string;
      }>;
      reason: string;
      refundMethod: "CASH" | "ORIGINAL" | "CREDIT";
      notes?: string;
      managerPin: string;
      authorizedManagerName: string;
    }
  ) => { success: boolean; returnRecord?: SaleReturnRecord; error?: string };
  getSaleById: (id: string) => Sale | undefined;
  addProduct: (product: Omit<Product, "id">) => Product;
  updateProduct: (id: string, productData: Partial<Product>) => boolean;
  deleteProduct: (id: string) => boolean;
  addInventory: (item: Omit<InventoryItem, "id" | "status" | "expiryTimestamp">) => InventoryItem;
  deleteInventory: (id: string) => boolean;
  bulkAddProducts: (productsList: Array<Omit<Product, "id">>) => number;
  addSupplier: (supplierData: Omit<Supplier, "id" | "createdAt">) => Supplier;
  updateSupplier: (id: string, supplierData: Partial<Supplier>) => boolean;
  deleteSupplier: (id: string) => boolean;
  addPurchaseOrder: (poData: Omit<PurchaseOrder, "id" | "poNumber" | "createdAt" | "timestamp">) => PurchaseOrder;
  updatePurchaseOrderStatus: (id: string, status: PurchaseOrder["status"]) => boolean;
  receivePurchaseOrderStock: (
    poId: string,
    receivedLines: Array<{
      productId: string;
      receivedQty: number;
      batchNumber: string;
      expiryDate: string;
      location?: string;
      reorderLevel?: number;
    }>
  ) => boolean;
  addExpense: (expenseData: Omit<Expense, "id" | "createdAt">) => Expense;
  updateExpense: (id: string, expenseData: Partial<Expense>) => boolean;
  deleteExpense: (id: string) => boolean;
  addExpenseCategory: (category: string) => boolean;
  addCustomer: (
    customerData: Omit<Customer, "id" | "pointsHistory"> & {
      pointsHistory?: LoyaltyPointsHistory[];
    }
  ) => Customer;
  updateCustomer: (id: string, customerData: Partial<Customer>) => boolean;
  deleteCustomer: (id: string) => boolean;
  awardPointsOnPurchase: (params: {
    customerId: string;
    purchaseAmount: number;
    invoiceNumber?: string;
    customPoints?: number;
    reason?: string;
  }) => { pointsAwarded: number; newTotalPoints: number; newTier: LoyaltyTier } | null;
  redeemCustomerPoints: (params: {
    customerId: string;
    pointsToRedeem: number;
    invoiceNumber?: string;
    discountAmount?: number;
    reason?: string;
  }) => boolean;
  adjustCustomerPoints: (
    customerId: string,
    pointsDelta: number,
    reason: string
  ) => boolean;
  findCustomerByPhone: (phone: string) => Customer | undefined;
  updateLoyaltySettings: (settings: Partial<LoyaltyProgramSettings>) => void;
  addStaffMember: (staffData: Omit<StaffMember, "id" | "joinedDate">) => StaffMember;
  updateStaffMember: (id: string, staffData: Partial<StaffMember>) => boolean;
  deleteStaffMember: (id: string) => boolean;
  addAuditLog: (entryData: Omit<AuditLogEntry, "id" | "timestamp" | "formattedTime">) => AuditLogEntry;
  addBranch: (branchData: Omit<PharmacyBranch, "id" | "totalStaffCount">) => PharmacyBranch;
  updateBranch: (id: string, branchData: Partial<PharmacyBranch>) => boolean;
  deleteBranch: (id: string) => boolean;
  addTerminalToBranch: (branchId: string, terminalData: Omit<PosTerminal, "id">) => boolean;
  updateTerminal: (branchId: string, terminalId: string, terminalData: Partial<PosTerminal>) => boolean;
  deleteTerminal: (branchId: string, terminalId: string) => boolean;
  resetAllData: () => void;
  login: (email: string, role?: "superadmin" | "admin") => void;
  logout: () => void;
}

const STORAGE_KEY = "pharmacynext_cash_drawer_state_v1";
const SALES_STORAGE_KEY = "pharmacynext_sales_state_v1";
const PRODUCTS_STORAGE_KEY = "pharmacynext_products_state_v1";
const INVENTORY_STORAGE_KEY = "pharmacynext_inventory_state_v1";
const MARGIN_STORAGE_KEY = "pharmacynext_margin_state_v1";
const SUPPLIERS_STORAGE_KEY = "pharmacynext_suppliers_state_v1";
const PURCHASES_STORAGE_KEY = "pharmacynext_purchases_state_v1";
const REORDER_STORAGE_KEY = "pharmacynext_reorder_state_v1";
const EXPENSES_STORAGE_KEY = "pharmacynext_expenses_state_v1";
const EXPENSE_CATS_STORAGE_KEY = "pharmacynext_expense_categories_v1";
const CUSTOMERS_STORAGE_KEY = "pharmacynext_customers_state_v1";
const LOYALTY_SETTINGS_STORAGE_KEY = "pharmacynext_loyalty_settings_state_v1";
const STAFF_STORAGE_KEY = "pharmacynext_staff_state_v1";
const BRANCHES_STORAGE_KEY = "pharmacynext_branches_state_v1";
const AUDIT_LOGS_STORAGE_KEY = "pharmacynext_audit_logs_state_v1";

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined);

export function PharmacyProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>({
    name: "Pharmacy Admin",
    email: "admin@pharmacy.com",
    role: "admin",
    storeName: "HealthFlow Pharma",
  });

  const [drawerStatus, setDrawerStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const [openingBalance, setOpeningBalance] = useState<number>(100000.0);
  const [currentBalance, setCurrentBalance] = useState<number>(100000.0);
  const [openedAt, setOpenedAt] = useState<string>("06/10/2026 18:30:05");
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [shiftsHistory, setShiftsHistory] = useState<CashDrawerShift[]>(initialShiftHistory);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [marginInsights, setMarginInsights] = useState<MarginInsight[]>(initialMarginInsights);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>(initialReorderSuggestions);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(initialExpenseCategories);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltyProgramSettings>(initialLoyaltySettings);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(initialStaffMembers);
  const [branches, setBranches] = useState<PharmacyBranch[]>(initialBranches);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currencySymbol, setCurrencySymbol] = useState<string>("Tk");
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load state from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.user !== undefined) setUser(parsed.user);
        if (parsed.drawerStatus) setDrawerStatus(parsed.drawerStatus);
        if (parsed.openingBalance !== undefined) setOpeningBalance(parsed.openingBalance);
        if (parsed.currentBalance !== undefined) setCurrentBalance(parsed.currentBalance);
        if (parsed.openedAt) setOpenedAt(parsed.openedAt);
        if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
        if (Array.isArray(parsed.shiftsHistory)) setShiftsHistory(parsed.shiftsHistory);
        if (parsed.soundEnabled !== undefined) setSoundEnabled(parsed.soundEnabled);
        if (parsed.currencySymbol) setCurrencySymbol((parsed.currencySymbol === "$" || parsed.currencySymbol === "৳") ? "Tk" : parsed.currencySymbol);
      }

      const savedSales = localStorage.getItem(SALES_STORAGE_KEY);
      if (savedSales) {
        const parsedSales = JSON.parse(savedSales);
        if (Array.isArray(parsedSales)) {
          setSales(parsedSales);
        }
      }

      const savedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (savedProducts) {
        const parsedProducts = JSON.parse(savedProducts);
        if (Array.isArray(parsedProducts)) {
          setProducts(parsedProducts);
        }
      }

      const savedInventory = localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (savedInventory) {
        const parsedInv = JSON.parse(savedInventory);
        if (Array.isArray(parsedInv)) {
          setInventory(parsedInv);
        }
      }

      const savedMargin = localStorage.getItem(MARGIN_STORAGE_KEY);
      if (savedMargin) {
        const parsedMargin = JSON.parse(savedMargin);
        if (Array.isArray(parsedMargin)) {
          setMarginInsights(parsedMargin);
        }
      }

      const savedSuppliers = localStorage.getItem(SUPPLIERS_STORAGE_KEY);
      if (savedSuppliers) {
        const parsedSup = JSON.parse(savedSuppliers);
        if (Array.isArray(parsedSup)) {
          setSuppliers(parsedSup);
        }
      }

      const savedPO = localStorage.getItem(PURCHASES_STORAGE_KEY);
      if (savedPO) {
        const parsedPO = JSON.parse(savedPO);
        if (Array.isArray(parsedPO)) {
          setPurchaseOrders(parsedPO);
        }
      }

      const savedReorder = localStorage.getItem(REORDER_STORAGE_KEY);
      if (savedReorder) {
        const parsedReorder = JSON.parse(savedReorder);
        if (Array.isArray(parsedReorder)) {
          setReorderSuggestions(parsedReorder);
        }
      }

      const savedExpenses = localStorage.getItem(EXPENSES_STORAGE_KEY);
      if (savedExpenses) {
        const parsedExp = JSON.parse(savedExpenses);
        if (Array.isArray(parsedExp)) {
          setExpenses(parsedExp);
        }
      }

      const savedCats = localStorage.getItem(EXPENSE_CATS_STORAGE_KEY);
      if (savedCats) {
        const parsedCats = JSON.parse(savedCats);
        if (Array.isArray(parsedCats)) {
          setExpenseCategories(parsedCats);
        }
      }

      const savedCustomers = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
      if (savedCustomers) {
        const parsedCust = JSON.parse(savedCustomers);
        if (Array.isArray(parsedCust)) {
          setCustomers(parsedCust);
        }
      }

      const savedSettings = localStorage.getItem(LOYALTY_SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsedSet = JSON.parse(savedSettings);
        if (parsedSet && typeof parsedSet === "object") {
          setLoyaltySettings((prev) => ({ ...prev, ...parsedSet }));
        }
      }

      const savedStaff = localStorage.getItem(STAFF_STORAGE_KEY);
      if (savedStaff) {
        const parsedStaff = JSON.parse(savedStaff);
        if (Array.isArray(parsedStaff)) {
          setStaffMembers(parsedStaff);
        }
      }

      const savedBranches = localStorage.getItem(BRANCHES_STORAGE_KEY);
      if (savedBranches) {
        const parsedBranches = JSON.parse(savedBranches);
        if (Array.isArray(parsedBranches)) {
          setBranches(parsedBranches);
        }
      }

      const savedAuditLogs = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
      if (savedAuditLogs) {
        const parsedLogs = JSON.parse(savedAuditLogs);
        if (Array.isArray(parsedLogs)) {
          setAuditLogs(parsedLogs);
        }
      }
    } catch (e) {
      console.warn("Failed to parse saved state", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save state on change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const stateToSave = {
        user,
        drawerStatus,
        openingBalance,
        currentBalance,
        openedAt,
        transactions,
        shiftsHistory,
        soundEnabled,
        currencySymbol,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
      localStorage.setItem(MARGIN_STORAGE_KEY, JSON.stringify(marginInsights));
      localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(suppliers));
      localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(purchaseOrders));
      localStorage.setItem(REORDER_STORAGE_KEY, JSON.stringify(reorderSuggestions));
      localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
      localStorage.setItem(EXPENSE_CATS_STORAGE_KEY, JSON.stringify(expenseCategories));
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
      localStorage.setItem(LOYALTY_SETTINGS_STORAGE_KEY, JSON.stringify(loyaltySettings));
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staffMembers));
      localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(branches));
      localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(auditLogs));
    } catch (e) {
      console.warn("Failed to persist state", e);
    }
  }, [
    isLoaded,
    user,
    drawerStatus,
    openingBalance,
    currentBalance,
    openedAt,
    transactions,
    shiftsHistory,
    sales,
    products,
    inventory,
    marginInsights,
    suppliers,
    purchaseOrders,
    reorderSuggestions,
    expenses,
    expenseCategories,
    customers,
    loyaltySettings,
    staffMembers,
    branches,
    auditLogs,
    soundEnabled,
    currencySymbol,
  ]);

  const openDrawer = (balance: number) => {
    const nowStr = formatDateTime(new Date());
    setDrawerStatus("OPEN");
    setOpeningBalance(balance);
    setCurrentBalance(balance);
    setOpenedAt(nowStr);
    setTransactions([]);
    if (soundEnabled) playSound("cash");
  };

  const closeDrawer = (actualClosingBalance: number, closingNote?: string): CashDrawerShift => {
    const closedTime = formatDateTime(new Date());
    const expected = currentBalance;
    const discrepancy = actualClosingBalance - expected;

    const newShift: CashDrawerShift = {
      id: `shift-${Date.now()}`,
      openedAt,
      closedAt: closedTime,
      openedTimestamp: Date.now() - 3600000,
      closedTimestamp: Date.now(),
      openingBalance,
      closingBalance: actualClosingBalance,
      expectedBalance: expected,
      discrepancy,
      cashier: user?.name || "Pharmacy Admin",
      status: "CLOSED",
      transactions: [...transactions],
      closingNote,
    };

    setShiftsHistory((prev) => [newShift, ...prev]);
    setDrawerStatus("CLOSED");
    setTransactions([]);
    if (soundEnabled) playSound("success");
    return newShift;
  };

  const addTransaction = (type: TransactionType, rawAmount: number, note?: string) => {
    const now = new Date();
    const formattedTime = formatDateTime(now);
    // Amount is positive for cash_in and sale, negative for cash_out, expense, and refund
    const finalAmount =
      type === "cash_in" || type === "sale"
        ? Math.abs(rawAmount)
        : -Math.abs(rawAmount);

    const newTx: CashTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      time: formattedTime,
      timestamp: now.getTime(),
      type,
      amount: finalAmount,
      note: note?.trim() || undefined,
      cashier: user?.name || "Pharmacy Admin",
    };

    setTransactions((prev) => [newTx, ...prev]);
    setCurrentBalance((prev) => prev + finalAmount);
    if (soundEnabled) playSound("cash");
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setCurrentBalance((prev) => prev - tx.amount);
    if (soundEnabled) playSound("warn");
  };

  const calculateLoyaltyTier = (
    lifetimePoints: number,
    thresholds: LoyaltyProgramSettings["tierThresholds"]
  ): LoyaltyTier => {
    if (lifetimePoints >= thresholds.platinum) return "Platinum";
    if (lifetimePoints >= thresholds.gold) return "Gold";
    if (lifetimePoints >= thresholds.silver) return "Silver";
    return "Bronze";
  };

  const findCustomerByPhone = (phoneQuery: string): Customer | undefined => {
    if (!phoneQuery || !phoneQuery.trim()) return undefined;
    const cleanQuery = phoneQuery.replace(/\D/g, "");
    if (!cleanQuery) {
      return customers.find((c) =>
        c.phone.toLowerCase().includes(phoneQuery.toLowerCase())
      );
    }
    return customers.find((c) => {
      const cleaned = c.phone.replace(/\D/g, "");
      return cleaned.includes(cleanQuery) || cleanQuery.includes(cleaned);
    });
  };

  const addCustomer = (
    customerData: Omit<Customer, "id" | "pointsHistory"> & {
      pointsHistory?: LoyaltyPointsHistory[];
    }
  ): Customer => {
    const newId = `c-${Date.now()}`;
    const newCustomer: Customer = {
      ...customerData,
      id: newId,
      pointsHistory: customerData.pointsHistory || [],
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    if (soundEnabled) playSound("success");
    return newCustomer;
  };

  const updateCustomer = (
    id: string,
    customerData: Partial<Customer>
  ): boolean => {
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...customerData };
      return updated;
    });
    if (soundEnabled) playSound("click");
    return true;
  };

  const deleteCustomer = (id: string): boolean => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (soundEnabled) playSound("warn");
    return true;
  };

  const awardPointsOnPurchase = ({
    customerId,
    purchaseAmount,
    invoiceNumber,
    customPoints,
    reason,
  }: {
    customerId: string;
    purchaseAmount: number;
    invoiceNumber?: string;
    customPoints?: number;
    reason?: string;
  }): { pointsAwarded: number; newTotalPoints: number; newTier: LoyaltyTier } | null => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return null;

    const tierKey = customer.loyaltyTier.toLowerCase() as keyof typeof loyaltySettings.tierMultipliers;
    const multiplier = loyaltySettings.tierMultipliers[tierKey] || 1.0;

    const calculatedPoints =
      customPoints !== undefined && customPoints > 0
        ? customPoints
        : Math.max(
            1,
            Math.round(purchaseAmount * loyaltySettings.pointsPerDollar * multiplier)
          );

    const newPoints = customer.points + calculatedPoints;
    const newLifetime = customer.lifetimePointsEarned + calculatedPoints;
    const newTier = calculateLoyaltyTier(newLifetime, loyaltySettings.tierThresholds);

    const now = new Date();
    const historyItem: LoyaltyPointsHistory = {
      id: `lph-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: formatDateTime(now),
      timestamp: now.getTime(),
      type: "EARNED_PURCHASE",
      points: calculatedPoints,
      orderId: invoiceNumber,
      orderAmount: purchaseAmount,
      reason:
        reason ||
        `Purchase of $${purchaseAmount.toFixed(2)} (${customer.loyaltyTier} Tier ${multiplier}x multiplier)`,
      processedBy: user?.name || "Pharmacy Admin",
    };

    const pad = (n: number) => n.toString().padStart(2, "0");
    const todayStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          return {
            ...c,
            points: newPoints,
            lifetimePointsEarned: newLifetime,
            loyaltyTier: newTier,
            totalSpent: Number((c.totalSpent + purchaseAmount).toFixed(2)),
            totalOrders: c.totalOrders + 1,
            lastVisit: todayStr,
            pointsHistory: [historyItem, ...(c.pointsHistory || [])],
          };
        }
        return c;
      })
    );

    if (soundEnabled) playSound("cash");
    return { pointsAwarded: calculatedPoints, newTotalPoints: newPoints, newTier };
  };

  const redeemCustomerPoints = ({
    customerId,
    pointsToRedeem,
    invoiceNumber,
    discountAmount,
    reason,
  }: {
    customerId: string;
    pointsToRedeem: number;
    invoiceNumber?: string;
    discountAmount?: number;
    reason?: string;
  }): boolean => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer || customer.points < pointsToRedeem || pointsToRedeem <= 0)
      return false;

    const newPoints = customer.points - pointsToRedeem;
    const newLifetimeRedeemed = customer.lifetimePointsRedeemed + pointsToRedeem;
    const disc =
      discountAmount !== undefined
        ? discountAmount
        : Number((pointsToRedeem / loyaltySettings.redemptionRate).toFixed(2));

    const now = new Date();
    const historyItem: LoyaltyPointsHistory = {
      id: `lph-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: formatDateTime(now),
      timestamp: now.getTime(),
      type: "REDEEMED",
      points: -pointsToRedeem,
      orderId: invoiceNumber,
      orderAmount: disc,
      reason:
        reason ||
        `Redeemed ${pointsToRedeem} points for $${disc.toFixed(2)} discount`,
      processedBy: user?.name || "Pharmacy Admin",
    };

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          return {
            ...c,
            points: newPoints,
            lifetimePointsRedeemed: newLifetimeRedeemed,
            pointsHistory: [historyItem, ...(c.pointsHistory || [])],
          };
        }
        return c;
      })
    );

    if (soundEnabled) playSound("click");
    return true;
  };

  const adjustCustomerPoints = (
    customerId: string,
    pointsDelta: number,
    reason: string
  ): boolean => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer || pointsDelta === 0) return false;

    const newPoints = Math.max(0, customer.points + pointsDelta);
    const newLifetime =
      pointsDelta > 0
        ? customer.lifetimePointsEarned + pointsDelta
        : customer.lifetimePointsEarned;
    const newTier = calculateLoyaltyTier(newLifetime, loyaltySettings.tierThresholds);

    const now = new Date();
    const historyItem: LoyaltyPointsHistory = {
      id: `lph-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: formatDateTime(now),
      timestamp: now.getTime(),
      type: pointsDelta > 0 ? "BONUS" : "ADJUSTED",
      points: pointsDelta,
      reason: reason || "Manual point adjustment by admin",
      processedBy: user?.name || "Pharmacy Admin",
    };

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          return {
            ...c,
            points: newPoints,
            lifetimePointsEarned: newLifetime,
            loyaltyTier: newTier,
            pointsHistory: [historyItem, ...(c.pointsHistory || [])],
          };
        }
        return c;
      })
    );

    if (soundEnabled) playSound("click");
    return true;
  };

  const updateLoyaltySettings = (settings: Partial<LoyaltyProgramSettings>) => {
    setLoyaltySettings((prev) => ({ ...prev, ...settings }));
    if (soundEnabled) playSound("success");
  };

  const addAuditLog = (
    entryData: Omit<AuditLogEntry, "id" | "timestamp" | "formattedTime">
  ): AuditLogEntry => {
    const now = new Date();
    const newEntry: AuditLogEntry = {
      ...entryData,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.getTime(),
      formattedTime: formatDateTime(now),
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
    return newEntry;
  };

  const addStaffMember = (
    staffData: Omit<StaffMember, "id" | "joinedDate">
  ): StaffMember => {
    const now = new Date();
    const newStaff: StaffMember = {
      ...staffData,
      id: `staff-${Date.now()}`,
      joinedDate: `${String(now.getDate()).padStart(2, "0")}/${String(
        now.getMonth() + 1
      ).padStart(2, "0")}/${now.getFullYear()}`,
      customPermissions:
        staffData.customPermissions ||
        defaultRolePermissions[staffData.role] ||
        defaultRolePermissions.cashier,
    };
    setStaffMembers((prev) => [newStaff, ...prev]);
    addAuditLog({
      staffName: user?.name || "System Admin",
      staffRole: user?.role || "admin",
      category: "STAFF_PERM_CHANGE",
      severity: "MEDIUM",
      action: `Created new staff member: ${newStaff.name} (${newStaff.role})`,
      details: `Assigned to branch: ${newStaff.branchName}. Status: ${newStaff.status}.`,
      branchName: newStaff.branchName,
    });
    if (soundEnabled) playSound("success");
    return newStaff;
  };

  const updateStaffMember = (
    id: string,
    staffData: Partial<StaffMember>
  ): boolean => {
    let targetStaffName = "";
    setStaffMembers((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          targetStaffName = s.name;
          return { ...s, ...staffData };
        }
        return s;
      })
    );
    addAuditLog({
      staffName: user?.name || "System Admin",
      staffRole: user?.role || "admin",
      category: "STAFF_PERM_CHANGE",
      severity: "MEDIUM",
      action: `Updated staff profile & permissions: ${targetStaffName || id}`,
      details: `Modified fields: ${Object.keys(staffData).join(", ")}`,
      branchName: staffData.branchName || "Main Central Pharmacy",
    });
    if (soundEnabled) playSound("click");
    return true;
  };

  const deleteStaffMember = (id: string): boolean => {
    const staff = staffMembers.find((s) => s.id === id);
    setStaffMembers((prev) => prev.filter((s) => s.id !== id));
    if (staff) {
      addAuditLog({
        staffName: user?.name || "System Admin",
        staffRole: user?.role || "admin",
        category: "STAFF_PERM_CHANGE",
        severity: "HIGH",
        action: `Removed staff member: ${staff.name}`,
        details: `Role: ${staff.role}. Branch: ${staff.branchName}`,
        branchName: staff.branchName,
      });
    }
    if (soundEnabled) playSound("warn");
    return true;
  };

  const addBranch = (
    branchData: Omit<PharmacyBranch, "id" | "totalStaffCount">
  ): PharmacyBranch => {
    const newBranch: PharmacyBranch = {
      ...branchData,
      id: `br-${Date.now()}`,
      totalStaffCount: 0,
      terminals: branchData.terminals || [],
    };
    setBranches((prev) => [...prev, newBranch]);
    addAuditLog({
      staffName: user?.name || "System Admin",
      staffRole: user?.role || "admin",
      category: "BRANCH_CONFIG",
      severity: "HIGH",
      action: `Created new pharmacy branch: ${newBranch.name} (${newBranch.code})`,
      details: `Address: ${newBranch.address}. Drug License: ${newBranch.drugLicenseNo}.`,
      branchName: newBranch.name,
    });
    if (soundEnabled) playSound("success");
    return newBranch;
  };

  const updateBranch = (
    id: string,
    branchData: Partial<PharmacyBranch>
  ): boolean => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...branchData } : b))
    );
    addAuditLog({
      staffName: user?.name || "System Admin",
      staffRole: user?.role || "admin",
      category: "BRANCH_CONFIG",
      severity: "MEDIUM",
      action: `Updated branch settings for ${branchData.name || id}`,
      details: `Modified details: ${Object.keys(branchData).join(", ")}`,
      branchName: branchData.name || "Main Central Pharmacy",
    });
    if (soundEnabled) playSound("click");
    return true;
  };

  const deleteBranch = (id: string): boolean => {
    const branch = branches.find((b) => b.id === id);
    setBranches((prev) => prev.filter((b) => b.id !== id));
    if (branch) {
      addAuditLog({
        staffName: user?.name || "System Admin",
        staffRole: user?.role || "admin",
        category: "BRANCH_CONFIG",
        severity: "CRITICAL",
        action: `Deleted branch: ${branch.name}`,
        details: `Code: ${branch.code}, License: ${branch.drugLicenseNo}`,
        branchName: branch.name,
      });
    }
    if (soundEnabled) playSound("warn");
    return true;
  };

  const addTerminalToBranch = (
    branchId: string,
    terminalData: Omit<PosTerminal, "id">
  ): boolean => {
    const newTerminal: PosTerminal = {
      ...terminalData,
      id: `t-${Date.now()}`,
    };
    let branchName = "";
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id === branchId) {
          branchName = b.name;
          return {
            ...b,
            terminals: [...b.terminals, newTerminal],
          };
        }
        return b;
      })
    );
    addAuditLog({
      staffName: user?.name || "System Admin",
      staffRole: user?.role || "admin",
      category: "BRANCH_CONFIG",
      severity: "MEDIUM",
      action: `Added POS Terminal ${newTerminal.terminalCode} to ${branchName}`,
      details: `Terminal: ${newTerminal.name}, IP: ${newTerminal.ipAddress || "N/A"}`,
      branchName: branchName || "Main Central Pharmacy",
      terminalId: newTerminal.terminalCode,
    });
    if (soundEnabled) playSound("success");
    return true;
  };

  const updateTerminal = (
    branchId: string,
    terminalId: string,
    terminalData: Partial<PosTerminal>
  ): boolean => {
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id === branchId) {
          return {
            ...b,
            terminals: b.terminals.map((t) =>
              t.id === terminalId ? { ...t, ...terminalData } : t
            ),
          };
        }
        return b;
      })
    );
    if (soundEnabled) playSound("click");
    return true;
  };

  const deleteTerminal = (branchId: string, terminalId: string): boolean => {
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id === branchId) {
          return {
            ...b,
            terminals: b.terminals.filter((t) => t.id !== terminalId),
          };
        }
        return b;
      })
    );
    if (soundEnabled) playSound("warn");
    return true;
  };

  const addSale = (saleData: Omit<Sale, "id">): Sale => {
    const newId = `sale-${Date.now()}`;
    const newSale: Sale = {
      ...saleData,
      id: newId,
    };
    setSales((prev) => [newSale, ...prev]);

    // Check if customer is registered and award points on purchase
    if (saleData.customer?.customerId) {
      awardPointsOnPurchase({
        customerId: saleData.customer.customerId,
        purchaseAmount: saleData.totalAmount,
        invoiceNumber: saleData.invoiceNumber,
        reason: `POS Checkout (${saleData.invoiceNumber})`,
      });
    } else if (saleData.customer?.phone) {
      const match = findCustomerByPhone(saleData.customer.phone);
      if (match) {
        awardPointsOnPurchase({
          customerId: match.id,
          purchaseAmount: saleData.totalAmount,
          invoiceNumber: saleData.invoiceNumber,
          reason: `POS Checkout (${saleData.invoiceNumber})`,
        });
      }
    }

    if (soundEnabled) playSound("cash");
    return newSale;
  };

  const processReturn = (
    saleId: string,
    returnData: {
      items: Array<{
        productId: string;
        quantity: number;
        condition: ItemReturnCondition;
        unit?: string;
        batchNumber?: string;
      }>;
      reason: string;
      refundMethod: "CASH" | "ORIGINAL" | "CREDIT";
      notes?: string;
      managerPin: string;
      authorizedManagerName: string;
    }
  ): { success: boolean; returnRecord?: SaleReturnRecord; error?: string } => {
    const targetSale = sales.find((s) => s.id === saleId);
    if (!targetSale) {
      return { success: false, error: "Original sale invoice not found." };
    }

    const returnTimestamp = Date.now();
    const returnDate = formatDateTime(new Date(returnTimestamp));
    const voucherSeq = Math.floor(1000 + Math.random() * 9000);
    const returnVoucherNumber = `RET-2026-${voucherSeq}`;

    // Calculate line items refund & check restock conditions
    let totalLineRefund = 0;
    const returnedItemsSummary: ReturnedItemLine[] = [];
    let restockedCount = 0;
    let disposedCount = 0;

    const updatedItems = targetSale.items.map((item) => {
      const match = returnData.items.find((ri) => ri.productId === item.productId);
      if (match && match.quantity > 0) {
        const remainingQty = item.quantity - (item.returnedQuantity || 0);
        const qtyToReturn = Math.min(match.quantity, remainingQty);

        if (qtyToReturn > 0) {
          const itemSubtotal = qtyToReturn * item.unitPrice;
          totalLineRefund += itemSubtotal;
          const isRestocked = match.condition === "SEALED_RESTOCK";

          if (isRestocked) {
            restockedCount += qtyToReturn;
          } else {
            disposedCount += qtyToReturn;
          }

          returnedItemsSummary.push({
            productId: item.productId,
            name: item.name,
            unit: match.unit || item.unit || "Box",
            quantity: qtyToReturn,
            unitPrice: item.unitPrice,
            subtotal: itemSubtotal,
            condition: match.condition,
            batchNumber: item.batchNumber,
            restocked: isRestocked,
          });

          return {
            ...item,
            returnedQuantity: (item.returnedQuantity || 0) + qtyToReturn,
          };
        }
      }
      return item;
    });

    if (returnedItemsSummary.length === 0) {
      return { success: false, error: "No valid item quantities to return." };
    }

    // Proportionate tax refund based on item ratio
    const taxRate = targetSale.subtotal > 0 ? targetSale.tax / targetSale.subtotal : 0.05;
    const refundedTax = Number((totalLineRefund * taxRate).toFixed(2));
    const totalRefund = Number((totalLineRefund + refundedTax).toFixed(2));

    // Check if fully returned or partially returned
    const allItemsFullyReturned = updatedItems.every(
      (item) => (item.returnedQuantity || 0) >= item.quantity
    );

    // Points reversal calculation
    let pointsReversed = 0;
    if (targetSale.customer?.customerId && targetSale.customer.loyaltyPointsEarned) {
      const totalPointsEarned = targetSale.customer.loyaltyPointsEarned || 0;
      const proportion = targetSale.totalAmount > 0 ? totalRefund / targetSale.totalAmount : 1;
      pointsReversed = Math.min(
        totalPointsEarned,
        Math.round(totalPointsEarned * proportion)
      );
    }

    const newReturnRecord: SaleReturnRecord = {
      id: `ret-${Date.now()}`,
      returnVoucherNumber,
      returnDate,
      returnTimestamp,
      refundAmount: totalRefund,
      reason: returnData.reason,
      refundMethod: returnData.refundMethod,
      items: returnedItemsSummary,
      notes: returnData.notes,
      processedBy: user?.name || "Pharmacy Admin",
      authorizedByManager: returnData.authorizedManagerName || "Pharmacist-in-Charge",
      managerPinUsed: "****",
      pointsReversed,
    };

    const updatedSale: Sale = {
      ...targetSale,
      items: updatedItems,
      status: allItemsFullyReturned ? "RETURNED" : "PARTIAL_RETURN",
      refundedAmount: Number(((targetSale.refundedAmount || 0) + totalRefund).toFixed(2)),
      returns: [...(targetSale.returns || []), newReturnRecord],
    };

    setSales((prev) => prev.map((s) => (s.id === saleId ? updatedSale : s)));

    // 1. Restock sealed medicines back to physical inventory
    if (restockedCount > 0) {
      setInventory((prev) =>
        prev.map((inv) => {
          const retItem = returnedItemsSummary.find(
            (ri) => ri.productId === inv.productId && ri.restocked
          );
          if (retItem) {
            return {
              ...inv,
              quantity: inv.quantity + retItem.quantity,
            };
          }
          return inv;
        })
      );
    }

    // 2. Log damaged/quarantined items as loss write-off
    if (disposedCount > 0) {
      addAuditLog({
        staffName: returnData.authorizedManagerName || user?.name || "Pharmacy Admin",
        staffRole: "Pharmacist",
        category: "INVENTORY_ADJUST",
        severity: "MEDIUM",
        action: `Quarantine/Disposal on Return ${returnVoucherNumber}`,
        details: `${disposedCount} item(s) written off as medical waste due to open/damaged seals.`,
        branchName: "Main Central Pharmacy",
      });
    }

    // 3. Settle Refund Payout
    if (returnData.refundMethod === "CASH" && drawerStatus === "OPEN") {
      addTransaction(
        "refund",
        totalRefund,
        `Return Refund for ${targetSale.invoiceNumber} (${returnVoucherNumber})`
      );
    } else if (returnData.refundMethod === "CREDIT" && targetSale.customer?.customerId) {
      // Add to Customer Store Credit Wallet
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === targetSale.customer.customerId) {
            return {
              ...c,
              balance: Number(((c.balance || 0) + totalRefund).toFixed(2)),
              notes:
                (c.notes ? c.notes + " • " : "") +
                `Store Credit $${totalRefund} from Return ${returnVoucherNumber}`,
            };
          }
          return c;
        })
      );
    }

    // 4. Reverse Loyalty Points
    if (pointsReversed > 0 && targetSale.customer?.customerId) {
      adjustCustomerPoints(
        targetSale.customer.customerId,
        -pointsReversed,
        `Reversed points for Return ${returnVoucherNumber} (Refund: $${totalRefund})`
      );
    }

    // 5. Immutable Audit Log
    addAuditLog({
      staffName: returnData.authorizedManagerName || "Manager",
      staffRole: "Manager / Pharmacist",
      category: "SALES_VOID",
      severity: "HIGH",
      action: `Approved Return #${returnVoucherNumber} for Invoice #${targetSale.invoiceNumber}`,
      details: `Refund: $${totalRefund} via ${returnData.refundMethod}. Restocked: ${restockedCount}, Disposed: ${disposedCount}, Points Reversed: ${pointsReversed}. Authorized by Manager PIN.`,
      branchName: "Main Central Pharmacy",
    });

    if (soundEnabled) playSound("success");
    return { success: true, returnRecord: newReturnRecord };
  };

  const getSaleById = (id: string) => {
    return sales.find((s) => s.id === id || s.invoiceNumber === id);
  };

  const addProduct = (product: Omit<Product, "id">) => {
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setProducts((prev) => [newProduct, ...prev]);
    if (soundEnabled) playSound("success");
    return newProduct;
  };

  const updateProduct = (id: string, productData: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...productData } : p))
    );
    if (soundEnabled) playSound("click");
    return true;
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (soundEnabled) playSound("warn");
    return true;
  };

  const addInventory = (item: Omit<InventoryItem, "id" | "status" | "expiryTimestamp">) => {
    let expiryTimestamp = Date.now() + 365 * 24 * 60 * 60 * 1000;
    if (item.expiryDate) {
      if (item.expiryDate.includes("/")) {
        const parts = item.expiryDate.split("/");
        if (parts.length === 3) {
          expiryTimestamp = new Date(
            Number(parts[2]),
            Number(parts[1]) - 1,
            Number(parts[0])
          ).getTime();
        }
      } else {
        expiryTimestamp = new Date(item.expiryDate).getTime();
      }
    }

    const now = Date.now();
    const daysUntilExpiry = (expiryTimestamp - now) / (1000 * 60 * 60 * 24);

    let status: InventoryItem["status"] = "NORMAL";
    if (item.quantity <= 0) {
      status = "LOW_STOCK";
    } else if (expiryTimestamp < now) {
      status = "EXPIRED";
    } else if (daysUntilExpiry <= 90) {
      status = "EXPIRING_SOON";
    } else if (item.quantity <= item.reorderLevel) {
      status = "LOW_STOCK";
    }

    const newItem: InventoryItem = {
      ...item,
      id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      expiryTimestamp,
      status,
    };

    setInventory((prev) => [newItem, ...prev]);
    if (soundEnabled) playSound("success");
    return newItem;
  };

  const deleteInventory = (id: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
    if (soundEnabled) playSound("warn");
    return true;
  };

  const bulkAddProducts = (productsList: Array<Omit<Product, "id">>) => {
    const newProds: Product[] = productsList.map((p, idx) => ({
      ...p,
      id: `prod-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString().split("T")[0],
    }));
    setProducts((prev) => [...newProds, ...prev]);
    if (soundEnabled) playSound("success");
    return newProds.length;
  };

  const addSupplier = (supplierData: Omit<Supplier, "id" | "createdAt">) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
    if (soundEnabled) playSound("success");
    return newSupplier;
  };

  const updateSupplier = (id: string, supplierData: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...supplierData } : s))
    );
    if (soundEnabled) playSound("success");
    return true;
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    if (soundEnabled) playSound("warn");
    return true;
  };

  const addPurchaseOrder = (
    poData: Omit<PurchaseOrder, "id" | "poNumber" | "createdAt" | "timestamp">
  ) => {
    const ts = Date.now();
    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${ts}`,
      poNumber: `PO-${ts}`,
      timestamp: ts,
      createdAt: new Date().toISOString(),
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    if (soundEnabled) playSound("success");
    return newPO;
  };

  const updatePurchaseOrderStatus = (id: string, status: PurchaseOrder["status"]) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === id ? { ...po, status } : po))
    );
    if (soundEnabled) playSound("click");
    return true;
  };

  const receivePurchaseOrderStock = (
    poId: string,
    receivedLines: Array<{
      productId: string;
      receivedQty: number;
      batchNumber: string;
      expiryDate: string;
      location?: string;
      reorderLevel?: number;
    }>
  ) => {
    const targetPO = purchaseOrders.find((p) => p.id === poId);
    if (!targetPO) return false;

    // 1. Add each received item to inventory
    receivedLines.forEach((line) => {
      if (line.receivedQty <= 0) return;
      const product = products.find((p) => p.id === line.productId);
      const prodName = product?.name || "Product";
      const sku = product?.sku || "SKU-N/A";
      const generic = product?.genericName;

      addInventory({
        productId: line.productId,
        productName: prodName,
        genericName: generic,
        sku,
        batchNumber: line.batchNumber || `BAT-${Date.now().toString().slice(-4)}`,
        quantity: line.receivedQty,
        reorderLevel: line.reorderLevel !== undefined ? line.reorderLevel : 10,
        location: line.location || "Main",
        expiryDate: line.expiryDate || "12/12/2027",
      });
    });

    // 2. Update purchase order items and status
    let allReceived = true;
    const updatedItems = targetPO.items.map((item) => {
      const line = receivedLines.find((l) => l.productId === item.productId);
      if (line) {
        const newRecv = item.receivedQuantity + line.receivedQty;
        if (newRecv < item.quantity) allReceived = false;
        return {
          ...item,
          receivedQuantity: newRecv,
          batchNumber: line.batchNumber || item.batchNumber,
          expiryDate: line.expiryDate || item.expiryDate,
        };
      }
      if (item.receivedQuantity < item.quantity) allReceived = false;
      return item;
    });

    const newStatus: PurchaseOrder["status"] = allReceived ? "Received" : "Partial Received";

    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === poId
          ? {
              ...p,
              items: updatedItems,
              status: newStatus,
              paymentStatus: allReceived ? "PAID" : p.paymentStatus,
            }
          : p
      )
    );

    // 3. Update reorder suggestions
    setReorderSuggestions((prev) =>
      prev.filter((sug) => {
        const received = receivedLines.find((l) => l.productId === sug.productId);
        return !received || received.receivedQty < sug.suggestedUnits;
      })
    );

    if (soundEnabled) playSound("success");
    return true;
  };

  const addExpense = (expenseData: Omit<Expense, "id" | "createdAt">) => {
    const ts = expenseData.timestamp || Date.now();
    const newExp: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: ts,
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [newExp, ...prev]);
    if (soundEnabled) playSound("cash");
    return newExp;
  };

  const updateExpense = (id: string, expenseData: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...expenseData } : e))
    );
    if (soundEnabled) playSound("success");
    return true;
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (soundEnabled) playSound("warn");
    return true;
  };

  const addExpenseCategory = (cat: string) => {
    const trimmed = cat.trim();
    if (!trimmed || expenseCategories.includes(trimmed)) return false;
    setExpenseCategories((prev) => [...prev, trimmed]);
    if (soundEnabled) playSound("success");
    return true;
  };

  const resetAllData = () => {
    setDrawerStatus("OPEN");
    setOpeningBalance(100000.0);
    setCurrentBalance(100000.0);
    setOpenedAt("06/10/2026 18:30:05");
    setTransactions([]);
    setShiftsHistory(initialShiftHistory);
    setSales(initialSales);
    setProducts(initialProducts);
    setInventory(initialInventory);
    setMarginInsights(initialMarginInsights);
    setSuppliers(initialSuppliers);
    setPurchaseOrders(initialPurchaseOrders);
    setReorderSuggestions(initialReorderSuggestions);
    setExpenses(initialExpenses);
    setExpenseCategories(initialExpenseCategories);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SALES_STORAGE_KEY);
    localStorage.removeItem(PRODUCTS_STORAGE_KEY);
    localStorage.removeItem(INVENTORY_STORAGE_KEY);
    localStorage.removeItem(MARGIN_STORAGE_KEY);
    localStorage.removeItem(SUPPLIERS_STORAGE_KEY);
    localStorage.removeItem(PURCHASES_STORAGE_KEY);
    localStorage.removeItem(REORDER_STORAGE_KEY);
    localStorage.removeItem(EXPENSES_STORAGE_KEY);
    localStorage.removeItem(EXPENSE_CATS_STORAGE_KEY);
    localStorage.removeItem(CUSTOMERS_STORAGE_KEY);
    localStorage.removeItem(LOYALTY_SETTINGS_STORAGE_KEY);
    localStorage.removeItem(STAFF_STORAGE_KEY);
    localStorage.removeItem(BRANCHES_STORAGE_KEY);
    localStorage.removeItem(AUDIT_LOGS_STORAGE_KEY);
    setCustomers(initialCustomers);
    setLoyaltySettings(initialLoyaltySettings);
    setStaffMembers(initialStaffMembers);
    setBranches(initialBranches);
    setAuditLogs(initialAuditLogs);
    if (soundEnabled) playSound("success");
  };

  const login = (email: string, role: "superadmin" | "admin" = "admin") => {
    const isSuper = role === "superadmin" || email.includes("superadmin");
    setUser({
      name: isSuper ? "Platform Admin" : "Pharmacy Admin",
      email: email.trim(),
      role: isSuper ? "superadmin" : "admin",
      storeName: "HealthFlow Pharma",
    });
    if (soundEnabled) playSound("click");
  };

  const logout = () => {
    setUser(null);
    if (soundEnabled) playSound("click");
  };

  return (
    <PharmacyContext.Provider
      value={{
        user,
        drawerStatus,
        openingBalance,
        currentBalance,
        openedAt,
        transactions,
        shiftsHistory,
        sales,
        products,
        inventory,
        marginInsights,
        suppliers,
        purchaseOrders,
        reorderSuggestions,
        expenses,
        expenseCategories,
        customers,
        loyaltySettings,
        staffMembers,
        branches,
        auditLogs,
        soundEnabled,
        currencySymbol,
        activeTab,
        setActiveTab,
        setSoundEnabled,
        setCurrencySymbol,
        openDrawer,
        closeDrawer,
        addTransaction,
        deleteTransaction,
        addSale,
        processReturn,
        getSaleById,
        addProduct,
        updateProduct,
        deleteProduct,
        addInventory,
        deleteInventory,
        bulkAddProducts,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addPurchaseOrder,
        updatePurchaseOrderStatus,
        receivePurchaseOrderStock,
        addExpense,
        updateExpense,
        deleteExpense,
        addExpenseCategory,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        awardPointsOnPurchase,
        redeemCustomerPoints,
        adjustCustomerPoints,
        findCustomerByPhone,
        updateLoyaltySettings,
        addStaffMember,
        updateStaffMember,
        deleteStaffMember,
        addAuditLog,
        addBranch,
        updateBranch,
        deleteBranch,
        addTerminalToBranch,
        updateTerminal,
        deleteTerminal,
        resetAllData,
        login,
        logout,
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
}


export function usePharmacy() {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error("usePharmacy must be used within a PharmacyProvider");
  }
  return context;
}
