"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/useSession";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Store,
  ShoppingCart,
  History,
  Calculator,
  Warehouse,
  Package,
  Boxes,
  AlertTriangle,
  ShoppingBag,
  TrendingUp,
  Brain,
  UserCircle,
  Shield,
  LogOut,
  Search,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Truck,
  BarChart3,
  Receipt,
  MessageSquare,
  Bot,
  Bell,
  Settings as SettingsIcon,
  Users,
  FileText,
  Building2,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";
import { BRAND_INFO } from "@/constants/brand";

interface SidebarProps {
  onOpenSearch: () => void;
  onOpenPos?: () => void;
}

export function Sidebar({ onOpenSearch, onOpenPos }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = usePharmacy();
  const { signOut } = useSession();
  const [posOpen, setPosOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const [procurementOpen, setProcurementOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const isDashboard = pathname === "/pharmacy" || pathname === "/pharmacy/dashboard" || pathname === "/";
  const isCashDrawer = pathname === "/pharmacy/cash-drawer";
  const isPos = pathname === "/pharmacy/pos";
  const isSalesHistory = pathname === "/pharmacy/sales";
  const isProducts = pathname.startsWith("/pharmacy/products");
  const isInventory = pathname === "/pharmacy/inventory";
  const isStockAlerts = pathname === "/pharmacy/stock-alerts";
  const isPurchases = pathname === "/pharmacy/purchases";
  const isSuppliers = pathname === "/pharmacy/suppliers";
  const isReports = pathname === "/pharmacy/reports";
  const isExpenses = pathname === "/pharmacy/expenses";
  const isAiAssistant = pathname === "/pharmacy/ai-assistant";
  const isForecasts = pathname === "/pharmacy/forecasts";
  const isAnomalies = pathname === "/pharmacy/anomalies";
  const isAiAnalytics = pathname === "/pharmacy/ai";
  const isNotifications = pathname === "/pharmacy/notifications";
  const isProfile = pathname === "/pharmacy/profile";
  const isSettings = pathname === "/pharmacy/settings";
  const isCustomers = pathname.startsWith("/pharmacy/customers");
  const isAdminStaff = pathname.startsWith("/pharmacy/administration/staff");
  const isAdminAuditLogs = pathname.startsWith("/pharmacy/administration/audit-logs");
  const isAdminBranches = pathname.startsWith("/pharmacy/administration/branches");
  const isAdministration = pathname.startsWith("/pharmacy/administration");

  const handleSignOut = async () => {
    logout();
    try {
      await signOut();
    } catch {
      // ignore
    }
    toast.success("Signed out successfully");
    window.location.href = "/";
  };

  return (
    <aside
      className={`relative flex flex-col border-r border-emerald-900/10 bg-gradient-to-b from-white/95 via-[#f2f8f4]/95 to-[#e4f1e9]/95 backdrop-blur-xl shadow-[4px_0_24px_-4px_rgba(15,118,110,0.04)] transition-all duration-300 select-none ${
        collapsed ? "w-20" : "w-64"
      }`}
      style={{ minHeight: "100vh" }}
    >
      {/* Top Brand Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#e2e8e4]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="relative flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center">
            <img
              src={BRAND_INFO.logoMark}
              alt={`${BRAND_INFO.name} logo`}
              className="w-8 h-8 object-contain shrink-0"
            />
          </div>
          {!collapsed && (
            <div className="truncate font-bold text-slate-900 text-[15px] tracking-tight">
              HealthFlow Pharma
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-[#dce6df] transition-all interactive-btn active:scale-90 cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ArrowLeft
            className={`w-4 h-4 transition-transform duration-300 ${
              collapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Quick Search */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={onOpenSearch}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-normal text-slate-600 bg-white/70 hover:bg-white border border-[#cbd5e1] rounded-lg transition-all interactive-btn active:scale-95 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
            collapsed ? "justify-center px-2" : "justify-between"
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            {!collapsed && <span>Search...</span>}
          </div>
          {!collapsed && (
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-300 text-slate-500 rounded">
              ⌘K
            </kbd>
          )}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {/* Dashboard */}
        <Link
          href="/pharmacy"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
            isDashboard
              ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
              : "text-slate-700 hover:bg-[#dfede4]"
          }`}
        >
          <LayoutDashboard
            className={`w-4 h-4 flex-shrink-0 ${
              isDashboard ? "text-[#0e6245]" : "text-emerald-700"
            }`}
          />
          {!collapsed && <span>Dashboard</span>}
        </Link>

        {/* Point of Sale Section (Accordion) */}
        <div>
          <button
            type="button"
            onClick={() => setPosOpen(!posOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 hover:bg-[#dfede4] transition-colors text-sm font-medium"
          >
            <div className="flex items-center gap-3">
              <Store className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              {!collapsed && <span>Point of Sale</span>}
            </div>
            {!collapsed && (
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  posOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            )}
          </button>

          {/* Sub menu items */}
          {posOpen && !collapsed && (
            <div className="pl-6 pt-1 space-y-1 border-l-2 border-emerald-600/20 ml-4 my-1">
              {/* POS */}
              <Link
                href="/pharmacy/pos"
                onClick={onOpenPos}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isPos
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <ShoppingCart className="w-4 h-4 text-slate-500" />
                <span>Point of Sale</span>
              </Link>

              {/* Sales History */}
              <Link
                href="/pharmacy/sales"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isSalesHistory
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <History className="w-4 h-4 text-slate-500" />
                <span>Sales History</span>
              </Link>

              {/* Cash Drawer (ACTIVE in screenshot) */}
              <Link
                href="/pharmacy/cash-drawer"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isCashDrawer
                    ? "bg-[#d0ede1] text-[#0e6245] font-bold shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <Calculator className="w-4 h-4 text-[#0e6245]" />
                <span>Cash Drawer</span>
              </Link>

              {/* Customers & Loyalty */}
              <Link
                href="/pharmacy/customers"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isCustomers
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <Users className={`w-4 h-4 ${isCustomers ? "text-[#0e6245]" : "text-slate-500"}`} />
                <span>Customers & Loyalty</span>
              </Link>
            </div>
          )}
        </div>

        {/* Inventory Section (Accordion) */}
        <div>
          <button
            type="button"
            onClick={() => setInventoryOpen(!inventoryOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 hover:bg-[#dfede4] transition-colors text-sm font-medium"
          >
            <div className="flex items-center gap-3">
              <Warehouse className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              {!collapsed && <span>Inventory</span>}
            </div>
            {!collapsed && (
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  inventoryOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            )}
          </button>

          {/* Sub menu items */}
          {inventoryOpen && !collapsed && (
            <div className="pl-6 pt-1 space-y-1 border-l-2 border-emerald-600/20 ml-4 my-1">
              {/* Product Catalog */}
              <Link
                href="/pharmacy/products"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isProducts
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <Package className="w-4 h-4 text-slate-500" />
                <span>Product Catalog</span>
              </Link>

              {/* Stock Management */}
              <Link
                href="/pharmacy/inventory"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isInventory
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <Boxes className="w-4 h-4 text-slate-500" />
                <span>Stock Management</span>
              </Link>

              {/* Stock Alerts */}
              <Link
                href="/pharmacy/stock-alerts"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isStockAlerts
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-slate-500" />
                <span>Stock Alerts</span>
              </Link>
            </div>
          )}
        </div>

        {/* Procurement Section (Accordion) */}
        <div>
          <button
            type="button"
            onClick={() => setProcurementOpen(!procurementOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 hover:bg-[#dfede4] transition-colors text-sm font-medium"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              {!collapsed && <span>Procurement</span>}
            </div>
            {!collapsed && (
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  procurementOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            )}
          </button>

          {/* Sub menu items */}
          {procurementOpen && !collapsed && (
            <div className="pl-6 pt-1 space-y-1 border-l-2 border-emerald-600/20 ml-4 my-1">
              {/* Purchase Orders */}
              <Link
                href="/pharmacy/purchases"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isPurchases
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <ClipboardList className="w-4 h-4 text-slate-500" />
                <span>Purchase Orders</span>
              </Link>

              {/* Suppliers */}
              <Link
                href="/pharmacy/suppliers"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isSuppliers
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <Truck className="w-4 h-4 text-slate-500" />
                <span>Suppliers</span>
              </Link>
            </div>
          )}
        </div>

        {/* Reports & Finance Section (Accordion) */}
        <div>
          <button
            type="button"
            onClick={() => setReportsOpen(!reportsOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 hover:bg-[#dfede4] transition-colors text-sm font-medium"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              {!collapsed && <span>Reports & Finance</span>}
            </div>
            {!collapsed && (
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  reportsOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            )}
          </button>

          {/* Sub menu items */}
          {reportsOpen && !collapsed && (
            <div className="pl-6 pt-1 space-y-1 border-l-2 border-emerald-600/20 ml-4 my-1">
              {/* Reports */}
              <Link
                href="/pharmacy/reports"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isReports
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <span>Reports</span>
              </Link>

              {/* Expenses */}
              <Link
                href="/pharmacy/expenses"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isExpenses
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <Receipt className="w-4 h-4 text-slate-500" />
                <span>Expenses</span>
              </Link>
            </div>
          )}
        </div>

        {/* AI & Insights Section (Accordion) */}
        <div>
          <button
            type="button"
            onClick={() => setAiOpen(!aiOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 hover:bg-[#dfede4] transition-colors text-sm font-medium"
          >
            <div className="flex items-center gap-3">
              <Brain className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              {!collapsed && <span>AI & Insights</span>}
            </div>
            {!collapsed && (
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  aiOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            )}
          </button>

          {/* Sub menu items */}
          {aiOpen && !collapsed && (
            <div className="pl-6 pt-1 space-y-1 border-l-2 border-emerald-600/20 ml-4 my-1">
              {/* AI Assistant */}
              <Link
                href="/pharmacy/ai-assistant"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isAiAssistant
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <span>AI Assistant</span>
              </Link>

              {/* Demand Forecast */}
              <Link
                href="/pharmacy/forecasts"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isForecasts
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <span>Demand Forecast</span>
              </Link>

              {/* Anomalies */}
              <Link
                href="/pharmacy/anomalies"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isAnomalies
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <Shield className="w-4 h-4 text-slate-500" />
                <span>Anomalies</span>
              </Link>

              {/* AI Analytics */}
              <Link
                href="/pharmacy/ai"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isAiAnalytics
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <Bot className="w-4 h-4 text-slate-500" />
                <span>AI Analytics</span>
              </Link>
            </div>
          )}
        </div>

        {/* Account Settings Section (Accordion) */}
        <div>
          <button
            type="button"
            onClick={() => setAccountOpen(!accountOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 hover:bg-[#dfede4] transition-colors text-sm font-medium"
          >
            <div className="flex items-center gap-3">
              <UserCircle className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              {!collapsed && <span>Account Settings</span>}
            </div>
            {!collapsed && (
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  accountOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            )}
          </button>

          {/* Sub menu items */}
          {accountOpen && !collapsed && (
            <div className="pl-6 pt-1 space-y-1 border-l-2 border-emerald-600/20 ml-4 my-1">
              {/* Notifications */}
              <Link
                href="/pharmacy/notifications"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isNotifications
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <Bell className="w-4 h-4 text-slate-500" />
                <span>Notifications</span>
              </Link>

              {/* My Profile */}
              <Link
                href="/pharmacy/profile"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isProfile
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <UserCircle className="w-4 h-4 text-slate-500" />
                <span>My Profile</span>
              </Link>

              {/* System Settings */}
              <Link
                href="/pharmacy/settings"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isSettings
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <SettingsIcon className="w-4 h-4 text-slate-500" />
                <span>Settings</span>
              </Link>
            </div>
          )}
        </div>


        {/* Administration Section (Accordion) */}
        <div>
          <button
            type="button"
            onClick={() => setAdminOpen(!adminOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              isAdministration
                ? "bg-[#e2ede6] text-[#0e6245] font-semibold"
                : "text-slate-700 hover:bg-[#dfede4]"
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              {!collapsed && <span>Administration</span>}
            </div>
            {!collapsed && (
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  adminOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            )}
          </button>

          {/* Sub menu items */}
          {adminOpen && !collapsed && (
            <div className="pl-6 pt-1 space-y-1 border-l-2 border-emerald-600/20 ml-4 my-1">
              {/* Staff & Roles (RBAC) */}
              <Link
                href="/pharmacy/administration/staff"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isAdminStaff
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <Users className="w-4 h-4 text-slate-500" />
                <span>Staff & Roles</span>
              </Link>

              {/* Audit Logs */}
              <Link
                href="/pharmacy/administration/audit-logs"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isAdminAuditLogs
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Audit Logs</span>
              </Link>

              {/* Branches & Registers */}
              <Link
                href="/pharmacy/administration/branches"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isAdminBranches
                    ? "bg-[#d0ede1] text-[#0e6245] font-semibold shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#dfede4]"
                }`}
              >
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>Branches & Registers</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sign Out */}
      <div className="p-3 pb-8 border-t border-[#d9e4dd]">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4 text-slate-500 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
