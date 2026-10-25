"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Receipt,
  Package,
  Clock,
  Users,
  Phone,
  Award,
  Coins,
  Gift,
  Search,
  X,
  Sparkles,
  Check,
  Pause,
  Play,
  UserPlus,
  Pill,
  CreditCard,
  Split,
  FileCheck,
  AlertTriangle,
  Flame,
  Layers,
  RotateCcw,
  CircleDot,
  Banknote,
  Smartphone,
  Wallet,
  Landmark,
  Bandage,
  Droplet,
  Activity,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { SaleReceiptModal } from "@/components/Sales/SaleReceiptModal";
import { ProcessReturnModal } from "@/components/Sales/ProcessReturnModal";
import { ReturnLookupModal } from "@/components/Sales/ReturnLookupModal";
import { FetchPrescriptionModal } from "./FetchPrescriptionModal";
import { ClinicalInteractionModal } from "./ClinicalInteractionModal";
import { checkPrescriptionSafety, type ClinicalAlert } from "@/lib/clinicalSafety";
import { Customer, Sale } from "@/types/pharmacy";
import {
  PosProductSearch,
  PosProduct,
  DispenseUnit,
  saveRecentProductId,
  getRecentProductIds,
  MAX_RECENT_USES,
  RECENT_USES_STORAGE_KEY,
} from "./PosProductSearch";

export type Product = PosProduct;

export function getProductUnitPrice(product: PosProduct, unit: DispenseUnit): number {
  if (unit === "Strip") {
    if (product.stripPrice !== undefined) return product.stripPrice;
    if (product.packSize && product.packSize > 0) {
      return Number((product.price / product.packSize).toFixed(2));
    }
    return product.price;
  }
  if (unit === "Unit") {
    if (product.unitPrice !== undefined) return product.unitPrice;
    if (product.stripPrice && product.unitsPerStrip && product.unitsPerStrip > 0) {
      return Number((product.stripPrice / product.unitsPerStrip).toFixed(2));
    }
    if (product.packSize && product.unitsPerStrip) {
      return Number((product.price / (product.packSize * product.unitsPerStrip)).toFixed(2));
    }
    return product.price;
  }
  return product.price; // Box
}

const defaultMockProducts: PosProduct[] = [
  {
    id: "p1",
    name: "Paracetamol 500mg (20 Tabs)",
    genericName: "Paracetamol / Acetaminophen",
    category: "Pain Relief",
    price: 4.5,
    stock: 142,
    sku: "MED-001",
    requiresPrescription: false,
    expiryDate: "11/2027",
    supportsUnitDispensing: true,
    packSize: 2,
    unitsPerStrip: 10,
    stripPrice: 2.25,
    unitPrice: 0.25,
    defaultUnit: "Box",
  },
  {
    id: "p1_sub1",
    name: "Napa Rapid 500mg (10 Tabs)",
    genericName: "Paracetamol / Acetaminophen",
    category: "Pain Relief",
    price: 4.0,
    stock: 98,
    sku: "MED-001-A",
    requiresPrescription: false,
    expiryDate: "08/2027",
    supportsUnitDispensing: true,
    packSize: 1,
    unitsPerStrip: 10,
    stripPrice: 4.0,
    unitPrice: 0.40,
    defaultUnit: "Box",
  },
  {
    id: "p1_sub2",
    name: "Panadol Extra 500mg (24 Tabs)",
    genericName: "Paracetamol / Acetaminophen",
    category: "Pain Relief",
    price: 5.2,
    stock: 65,
    sku: "MED-001-B",
    requiresPrescription: false,
    expiryDate: "05/2027",
    supportsUnitDispensing: true,
    packSize: 2,
    unitsPerStrip: 12,
    stripPrice: 2.6,
    unitPrice: 0.25,
    defaultUnit: "Box",
  },
  {
    id: "p2",
    name: "Amoxicillin 250mg Capsules",
    genericName: "Amoxicillin Trihydrate",
    category: "Antibiotics",
    price: 12.8,
    stock: 64,
    sku: "MED-002",
    requiresPrescription: true,
    expiryDate: "04/2026",
    supportsUnitDispensing: true,
    packSize: 4,
    unitsPerStrip: 10,
    stripPrice: 3.2,
    unitPrice: 0.35,
    defaultUnit: "Box",
  },
  {
    id: "p2_sub1",
    name: "Moxilin 250mg Suspension 100ml",
    genericName: "Amoxicillin Trihydrate",
    category: "Antibiotics",
    price: 11.5,
    stock: 35,
    sku: "MED-002-A",
    requiresPrescription: true,
    expiryDate: "09/2026",
    supportsUnitDispensing: false,
    defaultUnit: "Box",
  },
  {
    id: "p2_sub2",
    name: "Amoxil Forte 500mg Capsules",
    genericName: "Amoxicillin Trihydrate",
    category: "Antibiotics",
    price: 18.0,
    stock: 42,
    sku: "MED-002-B",
    requiresPrescription: true,
    expiryDate: "12/2026",
    supportsUnitDispensing: true,
    packSize: 4,
    unitsPerStrip: 10,
    stripPrice: 4.5,
    unitPrice: 0.50,
    defaultUnit: "Box",
  },
  {
    id: "p3",
    name: "Ibuprofen 400mg Rapid Relief",
    genericName: "Ibuprofen",
    category: "Anti-Inflammatory",
    price: 6.2,
    stock: 89,
    sku: "MED-003",
    requiresPrescription: false,
    expiryDate: "03/2027",
    supportsUnitDispensing: true,
    packSize: 2,
    unitsPerStrip: 10,
    stripPrice: 3.1,
    unitPrice: 0.35,
    defaultUnit: "Box",
  },
  {
    id: "p3_sub1",
    name: "Advil Liquid-Gels 400mg (16s)",
    genericName: "Ibuprofen",
    category: "Anti-Inflammatory",
    price: 7.5,
    stock: 54,
    sku: "MED-003-A",
    requiresPrescription: false,
    expiryDate: "10/2027",
    supportsUnitDispensing: true,
    packSize: 2,
    unitsPerStrip: 8,
    stripPrice: 3.75,
    unitPrice: 0.50,
    defaultUnit: "Box",
  },
  {
    id: "p4",
    name: "Vitamin C 1000mg Effervescent",
    genericName: "Ascorbic Acid",
    category: "Supplements",
    price: 8.9,
    stock: 120,
    sku: "MED-004",
    requiresPrescription: false,
    expiryDate: "01/2028",
    supportsUnitDispensing: true,
    packSize: 2,
    unitsPerStrip: 10,
    stripPrice: 4.5,
    unitPrice: 0.50,
    defaultUnit: "Box",
  },
  {
    id: "p5",
    name: "Omeprazole 20mg Delayed-Release",
    genericName: "Omeprazole",
    category: "Gastrointestinal",
    price: 15.0,
    stock: 45,
    sku: "MED-005",
    requiresPrescription: true,
    expiryDate: "07/2026",
    supportsUnitDispensing: true,
    packSize: 3,
    unitsPerStrip: 10,
    stripPrice: 5.0,
    unitPrice: 0.55,
    defaultUnit: "Box",
  },
  {
    id: "p5_sub1",
    name: "Losec MUPS 20mg Tablets (14s)",
    genericName: "Omeprazole",
    category: "Gastrointestinal",
    price: 16.5,
    stock: 30,
    sku: "MED-005-A",
    requiresPrescription: true,
    expiryDate: "09/2026",
    supportsUnitDispensing: true,
    packSize: 2,
    unitsPerStrip: 7,
    stripPrice: 8.25,
    unitPrice: 1.20,
    defaultUnit: "Box",
  },
  {
    id: "p6",
    name: "Digital Upper Arm BP Monitor",
    genericName: "Sphygmomanometer",
    category: "Medical Devices",
    price: 45.0,
    stock: 18,
    sku: "DEV-001",
    requiresPrescription: false,
    expiryDate: "N/A",
    supportsUnitDispensing: false,
    defaultUnit: "Box",
  },
  {
    id: "p7",
    name: "Antiseptic Wound Dressing Kit",
    genericName: "Povidone Iodine & Gauze",
    category: "First Aid",
    price: 7.5,
    stock: 75,
    sku: "AID-001",
    requiresPrescription: false,
    expiryDate: "12/2028",
    supportsUnitDispensing: false,
    defaultUnit: "Box",
  },
  {
    id: "p8",
    name: "Saline Nasal Decongestant Spray",
    genericName: "Sodium Chloride 0.9%",
    category: "Respiratory",
    price: 5.75,
    stock: 92,
    sku: "MED-006",
    requiresPrescription: false,
    expiryDate: "06/2027",
    supportsUnitDispensing: false,
    defaultUnit: "Box",
  },
];

interface CartItem extends PosProduct {
  quantity: number;
  selectedUnit: DispenseUnit;
  effectivePrice: number;
}

type PaymentMethodType = "Cash" | "Card" | "Mobile" | "Split" | "Other" | "Credit";

interface ParkedCart {
  id: string;
  timestamp: number;
  timeFormatted: string;
  customerName: string;
  customer: Customer | null;
  items: CartItem[];
  total: number;
  note?: string;
}

const PARKED_CARTS_STORAGE_KEY = "pharmacynext_pos_parked_carts_v1";

export function PosView() {
  const {
    addTransaction,
    addSale,
    currencySymbol,
    drawerStatus,
    user,
    products: contextProducts,
    inventory: contextInventory,
    customers,
    addCustomer,
    loyaltySettings,
    redeemCustomerPoints,
  } = usePharmacy();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Recent Uses");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [checkoutSuccess, setCheckoutSuccess] = useState<boolean>(false);
  const [lastTotal, setLastTotal] = useState<number>(0);
  const [recentProductIds, setRecentProductIds] = useState<string[]>([]);
  const [cartBounce, setCartBounce] = useState<boolean>(false);
  const [recentlyAddedKey, setRecentlyAddedKey] = useState<string | null>(null);

  // Customer & Loyalty Program State in POS
  const [selectedLoyaltyCustomer, setSelectedLoyaltyCustomer] = useState<Customer | null>(null);
  const [customerSearchInput, setCustomerSearchInput] = useState<string>("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState<boolean>(false);
  const [redeemedPoints, setRedeemedPoints] = useState<number>(0);

  // Quick Customer Registration Modal State
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>("");
  const [newCustPhone, setNewCustPhone] = useState<string>("");
  const [newCustEmail, setNewCustEmail] = useState<string>("");

  // Suspended / Parked Carts State
  const [parkedCarts, setParkedCarts] = useState<ParkedCart[]>([]);
  const [isParkedModalOpen, setIsParkedModalOpen] = useState<boolean>(false);

  // Reference UI Payment States
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("Cash");
  const [cashReceived, setCashReceived] = useState<string>("0.00");
  const [cardRef, setCardRef] = useState<string>("");
  const [mobileRef, setMobileRef] = useState<string>("");
  const [creditCustomer, setCreditCustomer] = useState<string>("");
  const [otherRef, setOtherRef] = useState<string>("");

  // Split Payment States
  const [splitCashAmount, setSplitCashAmount] = useState<string>("");
  const [splitCardAmount, setSplitCardAmount] = useState<string>("");
  const [splitSecondaryType, setSplitSecondaryType] = useState<"Card" | "Mobile">("Card");
  const [splitSecondaryRef, setSplitSecondaryRef] = useState<string>("");

  // Receipt Modal State
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  // Return & Refund Modal States
  const [isReturnLookupOpen, setIsReturnLookupOpen] = useState<boolean>(false);
  const [returnSaleTarget, setReturnSaleTarget] = useState<Sale | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);

  // Doctor Prescription Fetching Modal State
  const [isFetchPrescriptionOpen, setIsFetchPrescriptionOpen] = useState<boolean>(false);

  // Clinical Drug-Drug Interaction Safety State
  const [isClinicalInteractionModalOpen, setIsClinicalInteractionModalOpen] = useState<boolean>(false);
  const [clinicalOverrideApproved, setClinicalOverrideApproved] = useState<boolean>(false);

  // Compute live clinical safety alerts across current cart medications
  const clinicalAlerts: ClinicalAlert[] = useMemo(() => {
    if (cart.length < 2) return [];
    const items = cart.map((c) => ({
      name: `${c.name} ${c.genericName || ""}`,
    }));
    return checkPrescriptionSafety(items);
  }, [cart]);

  // Reset clinical override whenever cart contents change
  useEffect(() => {
    setClinicalOverrideApproved(false);
  }, [cart]);

  const handleLoadPrescription = (
    itemsToLoad: { product: PosProduct; quantity: number; unit: DispenseUnit }[],
    customer: { name: string; phone: string; type?: "Walk-in" | "Registered" | "Insurance" }
  ) => {
    // Set customer profile in POS
    const matchedCustomer = (customers || []).find(
      (c) => (customer.phone && c.phone === customer.phone) || c.name.toLowerCase() === customer.name.toLowerCase()
    );
    if (matchedCustomer) {
      setSelectedLoyaltyCustomer(matchedCustomer);
      setCustomerSearchInput(matchedCustomer.name);
    } else {
      setSelectedLoyaltyCustomer({
        id: `rx-cust-${Date.now()}`,
        name: customer.name,
        phone: customer.phone,
        email: "",
        points: 0,
        loyaltyTier: "Bronze",
        lifetimePointsEarned: 0,
        lifetimePointsRedeemed: 0,
        totalSpent: 0,
        totalOrders: 1,
        balance: 0,
        joinedDate: new Date().toISOString().split("T")[0],
        lastVisit: new Date().toISOString().split("T")[0],
        status: "ACTIVE",
        pointsHistory: [],
      });
      setCustomerSearchInput(customer.name);
    }

    // Add items into cart
    itemsToLoad.forEach(({ product, quantity, unit }) => {
      addToCart(product, quantity, unit);
    });
  };

  // Load parked carts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PARKED_CARTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setParkedCarts(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const saveParkedCarts = (updated: ParkedCart[]) => {
    setParkedCarts(updated);
    try {
      localStorage.setItem(PARKED_CARTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  // Combine default mock products and products from context
  const allProducts: PosProduct[] = useMemo(() => {
    const list: PosProduct[] = [...defaultMockProducts];
    const existingIds = new Set(list.map((p) => p.id));
    const existingSkus = new Set(list.map((p) => p.sku.toLowerCase()));

    (contextProducts || []).forEach((cp) => {
      if (!existingIds.has(cp.id) && !existingSkus.has(cp.sku?.toLowerCase())) {
        const invQty = (contextInventory || [])
          .filter((i) => i.productId === cp.id || i.sku === cp.sku)
          .reduce((sum, item) => sum + (item.quantity || 0), 0);
        list.push({
          id: cp.id,
          name: cp.name,
          genericName: cp.genericName,
          category: cp.category || "General",
          price: cp.sellingPrice || 10,
          stock: invQty > 0 ? invQty : 45,
          sku: cp.sku || `SKU-${cp.id.slice(0, 6)}`,
          requiresPrescription: Boolean(cp.requiresPrescription),
          expiryDate: "12/2027",
          supportsUnitDispensing: cp.category === "Pain Relief" || cp.category === "Antibiotics" || cp.category === "Gastrointestinal",
          packSize: 2,
          unitsPerStrip: 10,
          stripPrice: Number(((cp.sellingPrice || 10) / 2).toFixed(2)),
          unitPrice: Number(((cp.sellingPrice || 10) / 20).toFixed(2)),
          defaultUnit: "Box",
        });
      }
    });

    return list;
  }, [contextProducts, contextInventory]);

  // Load and sync tracked recent 9 uses from localStorage
  useEffect(() => {
    const loaded = getRecentProductIds();
    if (loaded.length >= MAX_RECENT_USES) {
      setRecentProductIds(loaded);
    } else {
      const existingSet = new Set(loaded);
      const combined = [...loaded];
      for (const p of allProducts) {
        if (!existingSet.has(p.id)) {
          combined.push(p.id);
          existingSet.add(p.id);
          if (combined.length >= MAX_RECENT_USES) break;
        }
      }
      setRecentProductIds(combined);
      try {
        localStorage.setItem(RECENT_USES_STORAGE_KEY, JSON.stringify(combined));
      } catch {
        // Ignore storage error
      }
    }
  }, [allProducts]);

  // Compute the 9 recent products
  const recentProducts = useMemo(() => {
    const map = new Map(allProducts.map((p) => [p.id, p]));
    const list: PosProduct[] = [];

    recentProductIds.forEach((id) => {
      const p = map.get(id);
      if (p) list.push(p);
    });

    if (list.length < MAX_RECENT_USES) {
      for (const p of allProducts) {
        if (!list.some((item) => item.id === p.id)) {
          list.push(p);
          if (list.length >= MAX_RECENT_USES) break;
        }
      }
    }

    return list.slice(0, MAX_RECENT_USES);
  }, [allProducts, recentProductIds]);

  // Dynamic categories with Recent Uses as the default primary option
  const categories = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["Recent Uses", "All", ...Array.from(set)];
  }, [allProducts]);

  // Products displayed in the given section (Strictly 9 items only)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // If searching, show up to 9 matching products
    if (q) {
      return allProducts
        .filter((p) => {
          if (
            selectedCategory !== "Recent Uses" &&
            selectedCategory !== "All" &&
            p.category !== selectedCategory
          ) {
            return false;
          }
          const matchesName = p.name.toLowerCase().includes(q);
          const matchesGeneric = p.genericName?.toLowerCase().includes(q);
          const matchesSku = p.sku.toLowerCase().includes(q);
          const matchesCategory = p.category.toLowerCase().includes(q);
          return matchesName || matchesGeneric || matchesSku || matchesCategory;
        })
        .slice(0, 9);
    }

    // Default view: strictly show the recent uses
    if (selectedCategory === "Recent Uses" || selectedCategory === "All") {
      return recentProducts.slice(0, 9);
    }

    // Category filter: show up to 9 products in that category
    return allProducts
      .filter((p) => p.category === selectedCategory)
      .slice(0, 9);
  }, [allProducts, recentProducts, selectedCategory, searchQuery]);

  // Add to cart with unit dispensing support
  const addToCart = (
    product: PosProduct,
    quantity = 1,
    unit: DispenseUnit = product.defaultUnit || "Box"
  ) => {
    const updated = saveRecentProductId(product.id);
    setRecentProductIds(updated);
    const effPrice = getProductUnitPrice(product, unit);

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.id === product.id && item.selectedUnit === unit
      );
      if (existingIdx >= 0) {
        return prev.map((item, idx) =>
          idx === existingIdx
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          ...product,
          quantity,
          selectedUnit: unit,
          effectivePrice: effPrice,
        },
      ];
    });
    setCheckoutSuccess(false);

    // Tactile micro-animation feedback
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 420);
    setRecentlyAddedKey(`${product.id}-${unit}`);
    setTimeout(() => setRecentlyAddedKey(null), 1000);
  };

  // Switch dispensing unit of an existing cart item
  const handleUnitChange = (
    productId: string,
    currentUnit: DispenseUnit,
    newUnit: DispenseUnit
  ) => {
    if (currentUnit === newUnit) return;
    setCart((prev) => {
      const targetItem = prev.find(
        (it) => it.id === productId && it.selectedUnit === currentUnit
      );
      if (!targetItem) return prev;

      const newEffPrice = getProductUnitPrice(targetItem, newUnit);
      const existingNewUnit = prev.find(
        (it) => it.id === productId && it.selectedUnit === newUnit
      );

      if (existingNewUnit) {
        // Merge with existing item having the new unit
        return prev
          .filter((it) => !(it.id === productId && it.selectedUnit === currentUnit))
          .map((it) =>
            it.id === productId && it.selectedUnit === newUnit
              ? { ...it, quantity: it.quantity + targetItem.quantity }
              : it
          );
      }

      // Update unit and effective price
      return prev.map((it) =>
        it.id === productId && it.selectedUnit === currentUnit
          ? {
              ...it,
              selectedUnit: newUnit,
              effectivePrice: newEffPrice,
            }
          : it
      );
    });

    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 350);
    setRecentlyAddedKey(`${productId}-${newUnit}`);
    setTimeout(() => setRecentlyAddedKey(null), 850);
  };

  const updateQuantity = (id: string, unit: DispenseUnit, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id && item.selectedUnit === unit) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );

    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 350);
    setRecentlyAddedKey(`${id}-${unit}`);
    setTimeout(() => setRecentlyAddedKey(null), 850);
  };

  const removeFromCart = (id: string, unit: DispenseUnit) => {
    setCart((prev) =>
      prev.filter((item) => !(item.id === id && item.selectedUnit === unit))
    );
  };

  // Points & Loyalty Calculations
  const discountFromPoints = useMemo(() => {
    if (!redeemedPoints || !loyaltySettings?.redemptionRate) return 0;
    return Number((redeemedPoints / loyaltySettings.redemptionRate).toFixed(2));
  }, [redeemedPoints, loyaltySettings]);

  // Subtotal & Total based on effective unit prices
  const subtotal = cart.reduce((acc, it) => acc + it.effectivePrice * it.quantity, 0);
  const total = Math.max(0, Number((subtotal - discountFromPoints).toFixed(2)));

  // Auto-init split amounts when split mode is active or total changes
  useEffect(() => {
    if (paymentMethod === "Split") {
      if (!splitCashAmount && !splitCardAmount) {
        const half = (total / 2).toFixed(2);
        setSplitCashAmount(half);
        setSplitCardAmount((total - parseFloat(half)).toFixed(2));
      }
    }
  }, [paymentMethod, total, splitCashAmount, splitCardAmount]);

  const pointsToEarn = useMemo(() => {
    if (!selectedLoyaltyCustomer || total <= 0) return 0;
    const tierKey = selectedLoyaltyCustomer.loyaltyTier.toLowerCase() as keyof typeof loyaltySettings.tierMultipliers;
    const mult = loyaltySettings?.tierMultipliers?.[tierKey] || 1.0;
    return Math.max(1, Math.round(total * (loyaltySettings?.pointsPerDollar || 1) * mult));
  }, [selectedLoyaltyCustomer, total, loyaltySettings]);

  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, cashReceivedNum - total);

  // Check if any cart item requires prescription
  const hasRxItem = useMemo(() => {
    return cart.some((it) => it.requiresPrescription);
  }, [cart]);

  // Split calculation helper
  const splitCashNum = parseFloat(splitCashAmount) || 0;
  const splitCardNum = parseFloat(splitCardAmount) || 0;
  const splitTotalTendered = splitCashNum + splitCardNum;
  const splitDifference = Number((splitTotalTendered - total).toFixed(2));

  // Park (Hold) Current Cart
  const handleParkCurrentCart = () => {
    if (cart.length === 0) return;

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const timeFormatted = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const newParked: ParkedCart = {
      id: `parked-${Date.now()}`,
      timestamp: now.getTime(),
      timeFormatted,
      customerName: selectedLoyaltyCustomer
        ? selectedLoyaltyCustomer.name
        : `Customer #${parkedCarts.length + 1}`,
      customer: selectedLoyaltyCustomer,
      items: [...cart],
      total,
      note: `${cart.length} item(s)`,
    };

    saveParkedCarts([newParked, ...parkedCarts]);
    setCart([]);
    setSelectedLoyaltyCustomer(null);
    setRedeemedPoints(0);
    setCashReceived("0.00");
  };

  // Resume a Held Cart
  const handleResumeParkedCart = (pCart: ParkedCart) => {
    if (cart.length > 0) {
      handleParkCurrentCart();
    }
    setCart(pCart.items);
    setSelectedLoyaltyCustomer(pCart.customer);
    saveParkedCarts(parkedCarts.filter((c) => c.id !== pCart.id));
    setIsParkedModalOpen(false);
  };

  // Discard a Held Cart
  const handleDeleteParkedCart = (id: string) => {
    saveParkedCarts(parkedCarts.filter((c) => c.id !== id));
  };

  // Quick Customer Registration Submit
  const handleQuickCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    const created = addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: newCustEmail.trim() || undefined,
      loyaltyTier: "Bronze",
      points: 0,
      lifetimePointsEarned: 0,
      lifetimePointsRedeemed: 0,
      totalSpent: 0,
      totalOrders: 0,
      balance: 0,
      joinedDate: new Date().toLocaleDateString(),
      lastVisit: new Date().toLocaleDateString(),
      status: "ACTIVE",
    });

    setSelectedLoyaltyCustomer(created);
    setNewCustName("");
    setNewCustPhone("");
    setNewCustEmail("");
    setIsQuickCustomerModalOpen(false);
    setIsCustomerSearchOpen(false);
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      alert("Please add at least one product to the order before completing the sale.");
      return;
    }

    // Clinical Drug-Drug Interaction Safety Gate
    if (clinicalAlerts.length > 0 && !clinicalOverrideApproved) {
      setIsClinicalInteractionModalOpen(true);
      return;
    }

    if ((paymentMethod === "Cash" || paymentMethod === "Split") && drawerStatus !== "OPEN") {
      alert("Please open the Cash Drawer first before processing cash transactions!");
      return;
    }

    if (paymentMethod === "Split" && splitTotalTendered < total) {
      alert(`Split payment deficit: You need $${(total - splitTotalTendered).toFixed(2)} more to reach $${total.toFixed(2)}`);
      return;
    }

    const itemsSummary = cart
      .map((it) => `${it.quantity}x ${it.name} [${it.selectedUnit}]`)
      .join(", ");

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const formattedDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const invoiceNumber = `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const saleItems = cart.map((it) => ({
      productId: it.id,
      name: `${it.name} [${it.selectedUnit}]`,
      category: it.category,
      sku: it.sku,
      unit: it.selectedUnit,
      batchNumber: `BT-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      expiryDate: it.expiryDate || `12/${now.getFullYear() + 2}`,
      quantity: it.quantity,
      returnedQuantity: 0,
      unitPrice: it.effectivePrice,
      total: Number((it.effectivePrice * it.quantity).toFixed(2)),
    }));

    const methodMapping: Record<PaymentMethodType, "CASH" | "CARD" | "MOBILE" | "OTHER" | "CREDIT"> = {
      Cash: "CASH",
      Card: "CARD",
      Mobile: "MOBILE",
      Split: "OTHER",
      Other: "OTHER",
      Credit: "CREDIT",
    };

    let paidAmount = total;
    let finalChangeAmount = 0;

    if (paymentMethod === "Cash") {
      paidAmount = Math.max(total, cashReceivedNum);
      finalChangeAmount = changeDue;
    } else if (paymentMethod === "Split") {
      paidAmount = splitTotalTendered;
      finalChangeAmount = Math.max(0, splitDifference);
    }

    if (redeemedPoints > 0 && selectedLoyaltyCustomer) {
      redeemCustomerPoints({
        customerId: selectedLoyaltyCustomer.id,
        pointsToRedeem: redeemedPoints,
        invoiceNumber,
        discountAmount: discountFromPoints,
        reason: `Points Redeemed at POS Checkout (${invoiceNumber})`,
      });
    }

    const customerName = selectedLoyaltyCustomer
      ? selectedLoyaltyCustomer.name
      : creditCustomer.trim() || "Walk-in Customer";

    let saleNotes = `POS ${paymentMethod} Sale`;
    if (paymentMethod === "Card" && cardRef) saleNotes += ` [Ref: ${cardRef}]`;
    if (paymentMethod === "Mobile" && mobileRef) saleNotes += ` [Trx: ${mobileRef}]`;
    if (paymentMethod === "Split") {
      saleNotes += ` [Split: $${splitCashNum.toFixed(2)} Cash + $${splitCardNum.toFixed(2)} ${splitSecondaryType}${splitSecondaryRef ? ` #${splitSecondaryRef}` : ""}]`;
    }

    const newSaleRecord: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNumber,
      date: formattedDate,
      timestamp: now.getTime(),
      customer: {
        name: customerName,
        phone: selectedLoyaltyCustomer ? selectedLoyaltyCustomer.phone : undefined,
        type: selectedLoyaltyCustomer ? "Registered" : paymentMethod === "Credit" ? "Registered" : "Walk-in",
        customerId: selectedLoyaltyCustomer ? selectedLoyaltyCustomer.id : undefined,
        loyaltyPointsEarned: selectedLoyaltyCustomer ? pointsToEarn : undefined,
        loyaltyPointsRedeemed: redeemedPoints > 0 ? redeemedPoints : undefined,
        loyaltyTier: selectedLoyaltyCustomer ? selectedLoyaltyCustomer.loyaltyTier : undefined,
      },
      items: saleItems,
      subtotal: Number(subtotal.toFixed(2)),
      tax: 0,
      discount: discountFromPoints,
      totalAmount: Number(total.toFixed(2)),
      paidAmount: Number(paidAmount.toFixed(2)),
      changeAmount: Number(finalChangeAmount.toFixed(2)),
      paymentMethod: methodMapping[paymentMethod],
      paymentStatus: paymentMethod === "Credit" ? "UNPAID" : "PAID",
      status: "COMPLETED",
      refundedAmount: 0,
      cashier: user?.name || "Pharmacy Admin",
      notes: saleNotes,
    };

    const savedSale = addSale(newSaleRecord);

    // Record cash in drawer: pure cash or cash portion of split
    if (paymentMethod === "Cash") {
      addTransaction("sale", total, `POS Cash Sale: ${itemsSummary}`);
    } else if (paymentMethod === "Split" && splitCashNum > 0) {
      addTransaction("sale", splitCashNum, `POS Split Sale (Cash portion): ${itemsSummary}`);
    }

    setLastTotal(total);
    setCompletedSale(savedSale || newSaleRecord);
    setIsReceiptOpen(true);
    setCart([]);
    setCashReceived("0.00");
    setSplitCashAmount("");
    setSplitCardAmount("");
    setSelectedLoyaltyCustomer(null);
    setRedeemedPoints(0);
    setCustomerSearchInput("");
    setCheckoutSuccess(true);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Product Catalog */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Point of Sale
            </h2>
            <p className="text-xs text-slate-500">
              Select medications, dispense by Box / Strip / Tablet, and ring up sales
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFetchPrescriptionOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all shadow-2xs cursor-pointer interactive-btn active:scale-95"
            >
              <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Fetch Prescription</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReturnLookupOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all shadow-2xs cursor-pointer interactive-btn active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>Customer Return</span>
            </button>

            {parkedCarts.length > 0 && (
              <button
                type="button"
                onClick={() => setIsParkedModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all shadow-2xs cursor-pointer animate-pulse interactive-btn active:scale-95"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Suspended Carts ({parkedCarts.length})</span>
              </button>
            )}

            <Link
              href="/pharmacy/cash-drawer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-2xs interactive-btn active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Drawer</span>
            </Link>
          </div>
        </div>

        {/* Product Search Box with Live Suggestions & Unit Dispensing */}
        <PosProductSearch
          products={allProducts}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectProduct={(prod, qty, unit) => addToCart(prod, qty, unit)}
          currencySymbol={currencySymbol || "$"}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
        />

        {/* Fast-Movers / OTC Quick Pick Toolbar */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" /> Fast Pick:
          </span>
          {[
            { id: "p1", name: "Paracetamol", icon: Pill, price: 4.5, defaultUnit: "Box" as DispenseUnit },
            { id: "p4", name: "Vitamin C", icon: Sparkles, price: 8.9, defaultUnit: "Box" as DispenseUnit },
            { id: "p7", name: "Antiseptic Kit", icon: Bandage, price: 7.5, defaultUnit: "Box" as DispenseUnit },
            { id: "p8", name: "Saline Spray", icon: Droplet, price: 5.75, defaultUnit: "Box" as DispenseUnit },
            { id: "p5", name: "Omeprazole", icon: Pill, price: 15.0, defaultUnit: "Box" as DispenseUnit },
            { id: "p6", name: "BP Monitor", icon: Activity, price: 45.0, defaultUnit: "Box" as DispenseUnit },
          ].map((item) => {
            const product = allProducts.find((p) => p.id === item.id);
            if (!product) return null;
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => addToCart(product, 1, item.defaultUnit)}
                className="shrink-0 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title={`Quick add ${product.name}`}
              >
                <IconComp className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span>{item.name}</span>
                <span className="font-mono text-slate-400 text-[10px]">
                  ({formatCurrency(item.price, currencySymbol)})
                </span>
              </button>
            );
          })}
        </div>

        {/* Search status & active filter chip */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between text-xs bg-emerald-50/80 border border-emerald-100 px-3.5 py-1.5 rounded-xl text-emerald-900">
            <span className="font-medium">
              Showing {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "result" : "results"} for &ldquo;
              <span className="font-bold">{searchQuery}</span>&rdquo;
              {selectedCategory !== "All" && selectedCategory !== "Recent Uses" && (
                <span className="text-emerald-700"> in {selectedCategory}</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Section Header: Recent Uses */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {searchQuery.trim()
                ? `Search Results (${filteredProducts.length})`
                : selectedCategory === "Recent Uses"
                ? "Recent Uses"
                : `${selectedCategory} (${filteredProducts.length})`}
            </h3>
            {/* Show items count badge only when searching or browsing another category, removed beside Recent Uses */}
            {(searchQuery.trim() || selectedCategory !== "Recent Uses") && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                {filteredProducts.length} Items
              </span>
            )}
          </div>

          {selectedCategory !== "Recent Uses" && !searchQuery.trim() && (
            <button
              type="button"
              onClick={() => setSelectedCategory("Recent Uses")}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Back to Recent Uses</span>
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer interactive-chip ${
                selectedCategory === cat
                  ? "bg-emerald-700 text-white shadow-xs font-bold"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid: 3x3 grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">
                No products found
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No items match your active filters
                {searchQuery ? ` ("${searchQuery}")` : ""}
                {selectedCategory !== "All" && selectedCategory !== "Recent Uses"
                  ? ` in ${selectedCategory}`
                  : ""}.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Clear search query
                </button>
              )}
              {selectedCategory !== "Recent Uses" && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("Recent Uses")}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                >
                  Show Recent Uses
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredProducts.map((p, idx) => {
              const isRecent =
                selectedCategory === "Recent Uses" ||
                (!searchQuery.trim() && selectedCategory === "All");

              return (
                <div
                  key={p.id}
                  className="glass-panel card-sheen glass-panel-hover rounded-2xl p-4 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        {p.requiresPrescription ? (
                          <span className="text-[9px] font-bold bg-red-50 text-red-700 border border-red-200 px-1 py-0.2 rounded shrink-0">
                            Rx
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.2 rounded shrink-0">
                            OTC
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded truncate">
                          {p.category}
                        </span>
                        {isRecent && (
                          <span className="text-[9px] font-mono font-medium text-emerald-800 bg-emerald-100/70 px-1 py-0.2 rounded">
                            #{idx + 1}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {p.sku}
                      </span>
                    </div>

                    <h3 className="font-semibold text-sm text-slate-800 mt-2 group-hover:text-emerald-700 transition-colors line-clamp-2">
                      {p.name}
                    </h3>
                    {p.genericName && (
                      <p className="text-[11px] text-slate-400 italic truncate mt-0.5">
                        {p.genericName}
                      </p>
                    )}
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">
                        Stock: {p.stock}
                      </span>
                      {p.expiryDate && (
                        <span className="text-slate-400 text-[10px]">
                          Exp: {p.expiryDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unit Dispensing Actions on Product Card */}
                  {p.supportsUnitDispensing ? (
                    <div className="mt-3 pt-2 border-t border-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Layers className="w-3 h-3 text-emerald-600" /> Dispense:
                        </span>
                        <span className="font-bold text-slate-900 font-mono text-xs">
                          {formatCurrency(p.price, currencySymbol)} / box
                        </span>
                      </div>
                      <div className="flex items-stretch gap-1.5">
                        <button
                          type="button"
                          onClick={() => addToCart(p, 1, "Box")}
                          className="flex-1 min-w-0 py-1.5 px-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-all cursor-pointer text-center interactive-btn active:scale-95 flex flex-col items-center justify-center gap-0.5"
                          title="Dispense 1 Full Box"
                        >
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800">
                            <Package className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                            <span>Box</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 font-medium">
                            (${p.price.toFixed(2)})
                          </span>
                        </button>

                        {p.stripPrice !== undefined && (
                          <button
                            type="button"
                            onClick={() => addToCart(p, 1, "Strip")}
                            className="flex-1 min-w-0 py-1.5 px-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-all cursor-pointer text-center interactive-btn active:scale-95 flex flex-col items-center justify-center gap-0.5"
                            title="Dispense 1 Strip"
                          >
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800">
                              <Layers className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                              <span>Strip</span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 font-medium">
                              (${p.stripPrice.toFixed(2)})
                            </span>
                          </button>
                        )}

                        {p.unitPrice !== undefined && (
                          <button
                            type="button"
                            onClick={() => addToCart(p, 1, "Unit")}
                            className="flex-1 min-w-0 py-1.5 px-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-all cursor-pointer text-center interactive-btn active:scale-95 flex flex-col items-center justify-center gap-0.5"
                            title="Dispense 1 Tablet"
                          >
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800">
                              <CircleDot className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                              <span>Tab</span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 font-medium">
                              (${p.unitPrice.toFixed(2)})
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        {formatCurrency(p.price, currencySymbol)}
                      </span>
                      <button
                        type="button"
                        onClick={() => addToCart(p, 1, "Box")}
                        className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center hover:bg-emerald-700 hover:text-white transition-all cursor-pointer interactive-btn active:scale-95"
                        title="Add to order"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart & Current Order Panel (Glassmorphism Effect) */}
      <div className="w-full lg:w-[420px] xl:w-[440px] glass-cart card-sheen rounded-3xl p-4 sm:p-5 flex flex-col shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-2rem)] overflow-hidden relative shadow-2xl shadow-emerald-950/10">
        {/* Ambient frosted light orbs for true glass refraction */}
        <div className="absolute -top-14 -right-14 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-16 w-36 h-36 bg-teal-300/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-14 right-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-900/10 shrink-0 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg glass-cart-chip flex items-center justify-center text-emerald-700 shadow-2xs">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Current Order</h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold transition-all duration-300 ${
                cartBounce
                  ? "bg-emerald-600 text-white animate-cart-bounce shadow-xs"
                  : "glass-cart-chip text-emerald-900 font-bold"
              }`}
            >
              {cart.reduce((a, b) => a + b.quantity, 0)} items
            </span>

            {cart.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleParkCurrentCart}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50/80 hover:bg-amber-100 border border-amber-200/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer interactive-btn active:scale-95 shadow-2xs"
                  title="Suspend / Hold this cart for later"
                >
                  <Pause className="w-3 h-3" />
                  <span>Hold</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer px-1 py-0.5"
                  title="Clear all items from order"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Prescription Required Alert Banner */}
        {hasRxItem && (
          <div className="mt-2.5 p-2 bg-blue-50/80 backdrop-blur-sm border border-blue-200/80 rounded-xl flex items-center gap-2 text-[11px] text-blue-800 relative z-10">
            <Pill className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              <strong className="font-bold">Rx Medication in Cart:</strong> Verify valid doctor prescription before dispensing.
            </span>
          </div>
        )}

        {/* Cart Items List */}
        <div className="my-3 space-y-2 overflow-y-auto pr-1 max-h-[190px] sm:max-h-[220px] lg:max-h-[200px] xl:max-h-[240px] shrink-0 relative z-10">
          {cart.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Your cart is empty. Click any product to add.
            </div>
          ) : (
            cart.map((it) => {
              const isRecentItem = recentlyAddedKey === `${it.id}-${it.selectedUnit}`;
              return (
                <div
                  key={`${it.id}-${it.selectedUnit}`}
                  className={`p-2.5 rounded-2xl text-xs space-y-1.5 transition-all duration-300 ${
                    isRecentItem
                      ? "bg-emerald-50/90 border border-emerald-300 ring-2 ring-emerald-400/40 shadow-sm animate-row-flash"
                      : "glass-cart-inner hover:bg-white/75 hover:border-emerald-200/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {it.requiresPrescription && (
                          <span className="text-[8px] font-bold text-red-700 bg-red-100 px-1 py-0.2 rounded">
                            Rx
                          </span>
                        )}
                        <p className="font-semibold text-slate-800 truncate">{it.name}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100/90 text-emerald-800">
                          {it.selectedUnit}
                        </span>
                      </div>
                      <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                        {formatCurrency(it.effectivePrice, currencySymbol)} / {it.selectedUnit.toLowerCase()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center glass-cart-chip rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQuantity(it.id, it.selectedUnit, -1)}
                          className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer active:scale-90 transition-transform"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-1.5 font-bold text-slate-800 font-mono">
                          {it.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(it.id, it.selectedUnit, 1)}
                          className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer active:scale-90 transition-transform"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(it.id, it.selectedUnit)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer interactive-btn active:scale-90"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Unit Dispensing Selector Buttons inside Cart Item */}
                  {it.supportsUnitDispensing && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                      <span className="text-[10px] text-slate-400 font-medium">Dispense:</span>
                      <div className="flex items-center gap-1">
                        {(["Box", "Strip", "Unit"] as DispenseUnit[]).map((u) => {
                          if (u === "Unit" && it.unitPrice === undefined) return null;
                          if (u === "Strip" && it.stripPrice === undefined && !it.packSize) return null;
                          const isSelected = it.selectedUnit === u;
                          const uPrice = getProductUnitPrice(it, u);
                          const uName = u === "Unit" ? "Tab" : u;

                          return (
                            <button
                              key={u}
                              type="button"
                              onClick={() => handleUnitChange(it.id, it.selectedUnit, u)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer interactive-btn active:scale-95 flex items-center gap-1 ${
                                isSelected
                                  ? "bg-slate-900 text-white shadow-2xs font-bold"
                                  : "glass-cart-chip text-slate-700 hover:bg-white"
                              }`}
                              title={`Switch to ${uName} @ ${formatCurrency(uPrice, currencySymbol)}`}
                            >
                              {u === "Box" && <Package className={`w-3 h-3 ${isSelected ? "text-white" : "text-slate-700"}`} />}
                              {u === "Strip" && <Layers className={`w-3 h-3 ${isSelected ? "text-white" : "text-slate-700"}`} />}
                              {u === "Unit" && <CircleDot className={`w-3 h-3 ${isSelected ? "text-white" : "text-slate-700"}`} />}
                              <span>{uName} (${uPrice.toFixed(2)})</span>
                            </button>
                          );
                        })}
                      </div>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        ${(it.effectivePrice * it.quantity).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Selected Section (Payment, Totals & Checkout) */}
        <div className="pt-3 border-t border-emerald-900/10 space-y-3 shrink-0 overflow-y-auto max-h-[calc(100vh-340px)] pr-0.5 relative z-10">
          {/* Customer / Loyalty Program Card */}
          <div className="glass-cart-inner rounded-2xl p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                Customer Loyalty
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerModalOpen(true)}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  title="Quick register new walk-in customer"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>+ New</span>
                </button>
                {selectedLoyaltyCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLoyaltyCustomer(null);
                      setRedeemedPoints(0);
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {selectedLoyaltyCustomer ? (
              /* Selected Customer Loyalty Profile */
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>{selectedLoyaltyCustomer.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-200/80 text-emerald-900 rounded-full">
                      {selectedLoyaltyCustomer.loyaltyTier}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    {selectedLoyaltyCustomer.points.toLocaleString()} pts
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    {selectedLoyaltyCustomer.phone}
                  </span>
                  <span>
                    ≈ {formatCurrency(Number((selectedLoyaltyCustomer.points / (loyaltySettings?.redemptionRate || 100)).toFixed(2)), currencySymbol)} value
                  </span>
                </div>

                {/* Points To Earn Preview */}
                {total > 0 && (
                  <div className="flex items-center justify-between text-[11px] bg-white/80 p-1.5 rounded border border-emerald-100 text-emerald-800 font-semibold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Points to Earn:
                    </span>
                    <span className="font-bold">+{pointsToEarn} pts</span>
                  </div>
                )}

                {/* Redeem Points Toggle */}
                {selectedLoyaltyCustomer.points >= (loyaltySettings?.minRedeemPoints || 50) && total > 0 && (
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        if (redeemedPoints > 0) {
                          setRedeemedPoints(0);
                        } else {
                          const maxPtsToCover = Math.min(
                            selectedLoyaltyCustomer.points,
                            Math.floor(subtotal * (loyaltySettings?.redemptionRate || 100))
                          );
                          setRedeemedPoints(Math.min(100, maxPtsToCover));
                        }
                      }}
                      className={`text-[11px] font-bold px-2 py-1 rounded-md border flex items-center gap-1 transition-all cursor-pointer ${
                        redeemedPoints > 0
                          ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                          : "glass-cart-chip text-amber-800 hover:bg-amber-50"
                      }`}
                    >
                      <Gift className="w-3 h-3" />
                      {redeemedPoints > 0 ? `Redeemed ${redeemedPoints} pts` : "Redeem Points"}
                    </button>

                    {redeemedPoints > 0 && (
                      <span className="text-[11px] text-amber-700 font-bold">
                        -${discountFromPoints.toFixed(2)} OFF
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Quick Phone Search Input for Customer */
              <div className="relative">
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearchInput}
                    onChange={(e) => {
                      setCustomerSearchInput(e.target.value);
                      setIsCustomerSearchOpen(true);
                    }}
                    onFocus={() => setIsCustomerSearchOpen(true)}
                    placeholder="Find customer by phone (e.g. 555-234-8901)..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-white/80 bg-white/70 backdrop-blur-sm text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  />
                  {customerSearchInput && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearchInput("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {isCustomerSearchOpen && customerSearchInput.trim() !== "" && (
                  <div className="absolute top-full left-0 right-0 mt-1 glass-cart border border-white/90 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto p-1.5 space-y-1">
                    {customers
                      .filter((c) => {
                        const q = customerSearchInput.toLowerCase();
                        const cleanQ = customerSearchInput.replace(/\D/g, "");
                        return (
                          c.name.toLowerCase().includes(q) ||
                          c.phone.includes(customerSearchInput) ||
                          (cleanQ && c.phone.replace(/\D/g, "").includes(cleanQ))
                        );
                      })
                      .slice(0, 5)
                      .map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedLoyaltyCustomer(c);
                            setIsCustomerSearchOpen(false);
                            setCustomerSearchInput("");
                          }}
                          className="p-2 hover:bg-emerald-50/80 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{c.name}</div>
                            <div className="text-[10px] text-slate-400">{c.phone}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                              {c.loyaltyTier}
                            </span>
                            <div className="text-[11px] font-mono font-bold text-emerald-700">
                              {c.points} pts
                            </div>
                          </div>
                        </div>
                      ))}
                    {customers.filter((c) => {
                      const q = customerSearchInput.toLowerCase();
                      const cleanQ = customerSearchInput.replace(/\D/g, "");
                      return (
                        c.name.toLowerCase().includes(q) ||
                        c.phone.includes(customerSearchInput) ||
                        (cleanQ && c.phone.replace(/\D/g, "").includes(cleanQ))
                      );
                    }).length === 0 && (
                      <div className="p-3 text-center text-xs space-y-2">
                        <p className="text-slate-400">
                          No customer found with &quot;{customerSearchInput}&quot;
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNewCustPhone(customerSearchInput);
                            setIsCustomerSearchOpen(false);
                            setIsQuickCustomerModalOpen(true);
                          }}
                          className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition-colors"
                        >
                          + Register as New Customer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Method Header & Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-6 gap-1">
              {[
                { id: "Cash", label: "Cash", icon: Banknote },
                { id: "Card", label: "Card", icon: CreditCard },
                { id: "Mobile", label: "Mobile", icon: Smartphone },
                { id: "Split", label: "Split", icon: Split },
                { id: "Other", label: "Other", icon: Wallet },
                { id: "Credit", label: "Credit", icon: Landmark },
              ].map((m) => {
                const isActive = paymentMethod === m.id;
                const IconComp = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as PaymentMethodType)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-medium transition-all cursor-pointer interactive-btn active:scale-95 ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs font-semibold scale-[1.02]"
                        : "glass-cart-chip text-slate-700 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-slate-700"}`} />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Received Card */}
          {paymentMethod === "Cash" && (
            <div className="glass-cart-inner rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  Cash Received:
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={cashReceived}
                  onFocus={() => {
                    if (cashReceived === "0.00" || cashReceived === "0") {
                      setCashReceived("");
                    }
                  }}
                  onBlur={() => {
                    if (!cashReceived.trim()) {
                      setCashReceived("0.00");
                    }
                  }}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0.00"
                  className="w-32 bg-white/80 backdrop-blur-sm border border-white/80 focus:bg-white rounded-lg px-3 py-1 text-right text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                />
              </div>

              {/* Denomination Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {["50", "100", "200", "500", "1000"].map((denom) => (
                  <button
                    key={denom}
                    type="button"
                    onClick={() => setCashReceived(denom)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shadow-2xs cursor-pointer interactive-chip active:scale-95 ${
                      cashReceived === denom
                        ? "bg-emerald-700 text-white border border-emerald-700 font-bold scale-[1.03]"
                        : "glass-cart-chip text-slate-700 hover:bg-white"
                    }`}
                  >
                    {denom}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCashReceived(total > 0 ? total.toFixed(2) : "0.00")}
                  className="px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-semibold text-xs rounded-lg hover:bg-emerald-100 transition-all shadow-2xs cursor-pointer interactive-chip active:scale-95"
                >
                  Exact
                </button>
              </div>

              {/* Change Due Row if Cash Received Exceeds Total */}
              {cashReceivedNum > total && total > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-100/70 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-emerald-200">
                  <span className="font-medium">Change Due:</span>
                  <span className="font-bold font-mono">
                    ${changeDue.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Split Payment Card */}
          {paymentMethod === "Split" && (
            <div className="glass-cart-inner rounded-2xl p-3.5 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Split Tender Breakdown</span>
                <button
                  type="button"
                  onClick={() => {
                    const cashVal = parseFloat(splitCashAmount) || 0;
                    setSplitCardAmount(Math.max(0, total - cashVal).toFixed(2));
                  }}
                  className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  Auto-Balance
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Cash Portion ($)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={splitCashAmount}
                    onChange={(e) => setSplitCashAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/80 backdrop-blur-sm border border-white/80 focus:bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-600">
                      {splitSecondaryType} Portion ($)
                    </label>
                    <select
                      value={splitSecondaryType}
                      onChange={(e) => setSplitSecondaryType(e.target.value as "Card" | "Mobile")}
                      className="text-[10px] font-semibold text-emerald-700 bg-transparent border-none p-0 focus:outline-none cursor-pointer"
                    >
                      <option value="Card">Card</option>
                      <option value="Mobile">Mobile</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={splitCardAmount}
                    onChange={(e) => setSplitCardAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/80 backdrop-blur-sm border border-white/80 focus:bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={splitSecondaryRef}
                  onChange={(e) => setSplitSecondaryRef(e.target.value)}
                  placeholder={`Optional ${splitSecondaryType} Ref / Trx ID...`}
                  className="w-full bg-white/80 backdrop-blur-sm border border-white/80 focus:bg-white rounded-lg px-2.5 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                />
              </div>

              {/* Live Balance Status Indicator */}
              <div
                className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold ${
                  splitDifference === 0
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : splitDifference > 0
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                <span>Tendered: ${splitTotalTendered.toFixed(2)}</span>
                <span className="flex items-center gap-1">
                  {splitDifference === 0 ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Balanced</span>
                    </>
                  ) : splitDifference > 0 ? (
                    `+$${splitDifference.toFixed(2)} Change`
                  ) : (
                    `Deficit: -$${Math.abs(splitDifference).toFixed(2)}`
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Contextual cards for other payment methods */}
          {paymentMethod === "Card" && (
            <div className="glass-cart-inner rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  Card / Terminal Ref:
                </span>
                <input
                  type="text"
                  value={cardRef}
                  onChange={(e) => setCardRef(e.target.value)}
                  placeholder="Last 4 / Auth #"
                  className="w-36 bg-white/80 backdrop-blur-sm border border-white/80 focus:bg-white rounded-lg px-3 py-1 text-right text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {["Visa", "Mastercard", "Amex", "POS Terminal"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCardRef(c)}
                    className="px-2.5 py-1 glass-cart-chip rounded-lg text-xs font-medium text-slate-700 hover:bg-white transition-colors shadow-2xs"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {paymentMethod === "Mobile" && (
            <div className="glass-cart-inner rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  Trx ID / Wallet:
                </span>
                <input
                  type="text"
                  value={mobileRef}
                  onChange={(e) => setMobileRef(e.target.value)}
                  placeholder="TrxID / Phone"
                  className="w-36 bg-white/80 backdrop-blur-sm border border-white/80 focus:bg-white rounded-lg px-3 py-1 text-right text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {["bKash", "Nagad", "Rocket", "M-Pesa"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMobileRef(m)}
                    className="px-2.5 py-1 glass-cart-chip rounded-lg text-xs font-medium text-slate-700 hover:bg-white transition-colors shadow-2xs"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {paymentMethod === "Credit" && (
            <div className="glass-cart-inner rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  Customer Account:
                </span>
                <input
                  type="text"
                  value={creditCustomer}
                  onChange={(e) => setCreditCustomer(e.target.value)}
                  placeholder="Customer Name / Tel"
                  className="w-36 bg-white/80 backdrop-blur-sm border border-white/80 focus:bg-white rounded-lg px-3 py-1 text-right text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Sale will be recorded under customer credit ledger.
              </p>
            </div>
          )}

          {paymentMethod === "Other" && (
            <div className="glass-cart-inner rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-700">
                  Reference Note:
                </span>
                <input
                  type="text"
                  value={otherRef}
                  onChange={(e) => setOtherRef(e.target.value)}
                  placeholder="Cheque / Voucher / Note"
                  className="w-36 bg-white/80 backdrop-blur-sm border border-white/80 focus:bg-white rounded-lg px-3 py-1 text-right text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* Subtotal Row */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-700 pt-1">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900 font-mono">
              ${subtotal.toFixed(2)}
            </span>
          </div>

          {discountFromPoints > 0 && (
            <div className="flex items-center justify-between text-xs text-amber-700 font-bold bg-amber-50/90 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-amber-200">
              <span className="flex items-center gap-1">
                <Gift className="w-3.5 h-3.5" /> Points Discount ({redeemedPoints} pts):
              </span>
              <span className="font-mono">
                -${discountFromPoints.toFixed(2)}
              </span>
            </div>
          )}

          {/* Clinical Drug-Drug Interaction Warning Badge */}
          {clinicalAlerts.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClinicalInteractionModalOpen(true)}
              className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
                clinicalAlerts.some((a) => a.severity === "high")
                  ? "bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100 ring-1 ring-rose-200"
                  : "bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100 ring-1 ring-amber-200"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 ${
                    clinicalAlerts.some((a) => a.severity === "high")
                      ? "text-rose-600 animate-pulse"
                      : "text-amber-600"
                  }`}
                />
                <span className="font-bold text-left truncate">
                  ⚠️ {clinicalAlerts.length} Clinical Drug {clinicalAlerts.length === 1 ? "Interaction" : "Interactions"}
                </span>
              </div>
              <span className="text-[11px] underline font-bold shrink-0 ml-1">
                Review Guidance
              </span>
            </button>
          )}

          {/* TOTAL Box */}
          <div className="bg-gradient-to-r from-emerald-100/70 via-teal-100/60 to-emerald-100/70 backdrop-blur-md border border-emerald-300/60 rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-xs">
            <div>
              <span className="font-bold text-emerald-950 text-xs sm:text-sm tracking-wider uppercase block">
                TOTAL
              </span>
              {pointsToEarn > 0 && (
                <span className="text-[11px] text-emerald-800 font-bold flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Earns +{pointsToEarn} points reward
                </span>
              )}
            </div>
            <span className="text-2xl font-bold text-emerald-800 font-mono">
              ${total.toFixed(2)}
            </span>
          </div>

          {/* Cash Drawer Closed Warning */}
          {(paymentMethod === "Cash" || paymentMethod === "Split") && drawerStatus === "CLOSED" && (
            <div className="flex items-center gap-1.5 p-2 bg-amber-50/90 backdrop-blur-sm border border-amber-200 rounded-xl text-amber-800 text-[11px]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Cash Drawer is closed. Please open shift before cash checkout.</span>
            </div>
          )}

          {/* Checkout Success Banner */}
          {checkoutSuccess && (
            <div className="flex items-center justify-between p-2.5 bg-emerald-50/90 backdrop-blur-sm border border-emerald-200 rounded-xl text-emerald-800 text-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>
                  Sale completed! (${lastTotal.toFixed(2)})
                </span>
              </div>
              {completedSale && (
                <button
                  type="button"
                  onClick={() => setIsReceiptOpen(true)}
                  className="flex items-center gap-1 font-semibold underline text-emerald-900 hover:text-emerald-700 cursor-pointer"
                >
                  <Receipt className="w-3 h-3" />
                  <span>View / Print Invoice</span>
                </button>
              )}
            </div>
          )}

          {/* Generate Sale & Invoice Button */}
          <button
            type="button"
            onClick={handleCompleteSale}
            className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-white font-semibold text-sm rounded-2xl cursor-pointer interactive-btn transition-all duration-200 shadow-lg ${
              cart.length > 0
                ? "bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:from-emerald-800 shadow-emerald-800/25 hover:shadow-xl hover:shadow-emerald-800/30 active:scale-[0.98]"
                : "bg-slate-400 hover:bg-slate-500 opacity-90 shadow-slate-400/20"
            }`}
          >
            <Receipt className="w-4 h-4 text-white shrink-0" />
            <span>Generate Sale & Invoice — ${total.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* Held / Parked Carts Modal */}
      {isParkedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-[#f8faf9]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Pause className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Suspended Orders & Held Carts
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Resume or clear transactions parked while customer was waiting
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsParkedModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {parkedCarts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No parked orders currently suspended.
                </div>
              ) : (
                parkedCarts.map((pCart) => (
                  <div
                    key={pCart.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-amber-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {pCart.customerName}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                          {pCart.timeFormatted}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                        {pCart.items.map((it) => `${it.quantity}x ${it.name} [${it.selectedUnit}]`).join(", ")}
                      </p>
                      <div className="mt-1 text-xs font-bold text-slate-900 font-mono">
                        ${pCart.total.toFixed(2)} ({pCart.items.length} lines)
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteParkedCart(pCart.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Discard parked cart"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResumeParkedCart(pCart)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-[#f8faf9] flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {parkedCarts.length} suspended order(s)
              </span>
              <button
                type="button"
                onClick={() => setIsParkedModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Customer Registration Modal */}
      {isQuickCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-[#f8faf9]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Register Walk-in Customer
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Create loyalty account instantly at POS register
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCustomerModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCustomerSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +1 555-0192"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. sarah@example.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-800 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Loyalty Account Auto-Enrolled
                </span>
                <p className="text-slate-600">
                  Customer begins in Bronze Tier and earns reward points immediately on this order!
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Save & Link to Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sale Receipt & Invoice Modal */}
      {completedSale && (
        <SaleReceiptModal
          sale={completedSale}
          isOpen={isReceiptOpen}
          initialMode="invoice"
          onClose={() => setIsReceiptOpen(false)}
          onOpenReturnModal={(saleToReturn) => {
            setReturnSaleTarget(saleToReturn);
            setIsReturnModalOpen(true);
          }}
          currencySymbol={currencySymbol || "$"}
        />
      )}

      {/* Return Lookup Modal (Barcode / Phone) */}
      {isReturnLookupOpen && (
        <ReturnLookupModal
          isOpen={isReturnLookupOpen}
          onClose={() => setIsReturnLookupOpen(false)}
          onSelectSaleForReturn={(s) => {
            setReturnSaleTarget(s);
            setIsReturnModalOpen(true);
          }}
          currencySymbol={currencySymbol || "$"}
        />
      )}

      {/* Process Return & Refund Modal */}
      {isReturnModalOpen && returnSaleTarget && (
        <ProcessReturnModal
          sale={returnSaleTarget}
          isOpen={isReturnModalOpen}
          onClose={() => {
            setIsReturnModalOpen(false);
            setReturnSaleTarget(null);
          }}
          currencySymbol={currencySymbol || "$"}
        />
      )}

      {/* Fetch Doctor Prescription Modal */}
      <FetchPrescriptionModal
        isOpen={isFetchPrescriptionOpen}
        onClose={() => setIsFetchPrescriptionOpen(false)}
        allProducts={allProducts}
        onLoadPrescription={handleLoadPrescription}
      />

      {/* Clinical Drug-Drug Interaction Safety Review Modal */}
      <ClinicalInteractionModal
        isOpen={isClinicalInteractionModalOpen}
        onClose={() => setIsClinicalInteractionModalOpen(false)}
        alerts={clinicalAlerts}
        onConfirmOverride={() => {
          setClinicalOverrideApproved(true);
          setTimeout(() => {
            handleCompleteSale();
          }, 60);
        }}
      />
    </div>
  );
}
