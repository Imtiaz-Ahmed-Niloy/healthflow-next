"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  ShoppingCart,
  ShieldAlert,
  Clock,
  Landmark,
  Receipt,
  Scale,
  CreditCard,
  Users,
  UserPlus,
  DollarSign,
  Package,
  Calendar,
  BarChart2,
  CalendarRange,
  Warehouse,
  Boxes,
  ShoppingBag,
  TrendingUp,
  ShoppingBasket,
  PieChart,
  Bot,
  Sparkles,
  ArrowDown,
  ArrowRight,
  TrendingDown,
  History,
  Activity,
  Truck,
  RotateCcw,
  Sliders,
  Settings,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";

export default function DashboardPage() {
  const {
    user,
    sales,
    products,
    inventory,
    expenses,
    purchaseOrders,
    currencySymbol,
  } = usePharmacy();

  // Hydration-safe live date/time state
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [hoveredHourIdx, setHoveredHourIdx] = useState<number | null>(null);

  useEffect(() => {
    // Format live time
    const updateTime = () => {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      setCurrentDateTime(`${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Trend Data for 14 Days
  const trendData = useMemo(() => [
    { date: "Sep 24", label: "Sep 24", rev: 1200, tx: 1 },
    { date: "Sep 25", label: "", rev: 1800, tx: 1 },
    { date: "Sep 26", label: "", rev: 4600, tx: 3 },
    { date: "Sep 27", label: "Sep 27", rev: 2200, tx: 2 },
    { date: "Sep 28", label: "", rev: 900, tx: 1 },
    { date: "Sep 29", label: "", rev: 700, tx: 1 },
    { date: "Sep 30", label: "Sep 30", rev: 4600, tx: 3 },
    { date: "Oct 01", label: "Oct 01", rev: 2500, tx: 2 },
    { date: "Oct 02", label: "Oct 02", rev: 145, tx: 1 },
    { date: "Oct 03", label: "Oct 03", rev: 246, tx: 1 },
    { date: "Oct 04", label: "", rev: 0, tx: 0 },
    { date: "Oct 05", label: "", rev: 0, tx: 0 },
    { date: "Oct 06", label: "Oct 06", rev: 4999.6, tx: 3 },
    { date: "Oct 07", label: "Oct 07", rev: 536.5, tx: 1 },
  ], []);

  // Today's hourly sales data (24 clock hours in 2-hour increments)
  const hourlyData = useMemo(() => [
    { hour: "0:00", rev: 536.5 },
    { hour: "2:00", rev: 0 },
    { hour: "4:00", rev: 0 },
    { hour: "6:00", rev: 0 },
    { hour: "8:00", rev: 0 },
    { hour: "10:00", rev: 0 },
    { hour: "12:00", rev: 0 },
    { hour: "14:00", rev: 0 },
    { hour: "16:00", rev: 0 },
    { hour: "18:00", rev: 0 },
    { hour: "20:00", rev: 0 },
    { hour: "22:00", rev: 0 },
  ], []);

  // Calculate live values or fallbacks
  const todaySalesAmount = useMemo(() => {
    return 536.50;
  }, []);

  const totalExpensesMonth = useMemo(() => {
    return 27.00;
  }, []);

  const openPOCount = useMemo(() => {
    return 25;
  }, []);

  return (
    <div className="space-y-8">
      {/* 1. TOP EMERALD BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-700 to-emerald-800 text-white shadow-lg shadow-emerald-900/20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6 md:py-7 ring-1 ring-emerald-900/10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl"></div>
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl"></div>
        
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-sm">Dashboard</h1>
            <p className="text-emerald-100/95 mt-1">
              Welcome back, <span className="font-medium text-white">{user?.name || "Pharmacy Admin"}</span>
              <span className="mx-2 text-emerald-300/90">·</span>
              {currentDateTime}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/pharmacy/notifications"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200/90 bg-white/15 backdrop-blur-sm text-amber-100 text-sm font-medium hover:bg-white/25 transition-all interactive-btn active:scale-95"
            >
              <Bell className="w-4 h-4 fill-current" />
              3 unread
            </Link>
            <Link
              href="/pharmacy/pos"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white !text-emerald-800 rounded-xl font-medium shadow-lg shadow-emerald-950/20 no-underline hover:bg-emerald-50 hover:!text-emerald-900 active:bg-emerald-100 active:!text-emerald-900 transition-all interactive-btn active:scale-95"
            >
              <ShoppingCart className="w-4 h-4 shrink-0 !text-emerald-700" />
              Open POS
            </Link>
          </div>
        </div>

        {/* 4 Embedded Glass Cards */}
        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {/* Card 1: TODAY */}
          <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/15 cursor-default">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-100/90">
              <DollarSign className="w-3.5 h-3.5 text-emerald-200" />
              Today
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums">${todaySalesAmount.toFixed(2)}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-100/80">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                <ArrowDown className="text-[10px] w-3 h-3" />
                89.3%
              </span>
              <span>vs yesterday</span>
            </div>
          </div>

          {/* Card 2: TRANSACTIONS */}
          <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/15 cursor-default">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-100/90">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-200" />
              Transactions
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums">1</div>
            <div className="mt-0.5 text-[11px] text-emerald-100/80">4 units</div>
          </div>

          {/* Card 3: GROSS PROFIT */}
          <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/15 cursor-default">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-100/90">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-200" />
              Gross profit
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums">$166.50</div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-100/80">
              <span>%</span>
              <span>31.0% margin</span>
            </div>
          </div>

          {/* Card 4: AVG BASKET */}
          <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/15 cursor-default">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-100/90">
              <ShoppingBasket className="w-3.5 h-3.5 text-emerald-200" />
              Avg basket
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums">$536.50</div>
            <div className="mt-0.5 text-[11px] text-emerald-100/80">0 customers today</div>
          </div>
        </div>
      </div>

      {/* 2. ANOMALY ALERT BANNER */}
      <div className="rounded-lg border text-card-foreground shadow-sm p-4 bg-yellow-50 border-yellow-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-xl shrink-0 text-yellow-500 w-6 h-6" />
            <div>
              <p className="font-semibold text-yellow-800">2 anomalies detected</p>
              <p className="text-sm text-yellow-600">Review unusual patterns in sales or inventory</p>
            </div>
          </div>
          <Link
            href="/pharmacy/anomalies"
            className="px-4 py-2 rounded-lg text-sm font-medium text-center transition-colors bg-yellow-600 text-white hover:bg-yellow-700"
          >
            Review anomalies
          </Link>
        </div>
      </div>

      {/* 3. BUSINESS SNAPSHOT */}
      <div>
        <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wider mb-3 pl-3 border-l-4 border-emerald-600">
          Business snapshot
        </h2>
        
        {/* Row 1: 5 Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Yesterday */}
          <div className="rounded-lg text-card-foreground p-4 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5 interactive-card">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Yesterday
            </div>
            <p className="text-lg font-bold text-gray-900 tabular-nums">$4999.60</p>
            <p className="text-[10px] text-gray-500 mt-1">Full day</p>
          </div>

          {/* Tax (month) */}
          <div className="rounded-lg text-card-foreground p-4 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5 interactive-card">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
              <Landmark className="w-3.5 h-3.5 text-amber-600" />
              Tax (month)
            </div>
            <p className="text-lg font-bold text-gray-900 tabular-nums">$1021.60</p>
            <p className="text-[10px] text-gray-500 mt-1">Collected on sales</p>
          </div>

          {/* Expenses (month) */}
          <div className="rounded-lg text-card-foreground p-4 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5 interactive-card">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
              <Receipt className="w-3.5 h-3.5 text-rose-500" />
              Expenses (month)
            </div>
            <p className="text-lg font-bold text-gray-900 tabular-nums">${totalExpensesMonth.toFixed(2)}</p>
            <Link href="/pharmacy/expenses" className="text-[10px] text-emerald-700 hover:underline mt-1 inline-block">
              View ledger
            </Link>
          </div>

          {/* Est. net (month) */}
          <div className="rounded-lg text-card-foreground p-4 border border-emerald-200/60 bg-gradient-to-br from-emerald-50/90 to-white shadow-sm shadow-emerald-900/5 interactive-card">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
              <Scale className="w-3.5 h-3.5 text-emerald-600" />
              Est. net (month)
            </div>
            <p className="text-lg font-bold text-emerald-800 tabular-nums">$7379.60</p>
            <p className="text-[10px] text-gray-500 mt-1">Revenue − expenses</p>
          </div>

          {/* Credit sales today */}
          <div className="rounded-lg text-card-foreground p-4 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5 interactive-card">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
              <CreditCard className="w-3.5 h-3.5 text-violet-500" />
              Credit sales today
            </div>
            <p className="text-lg font-bold text-gray-900 tabular-nums">$0.00</p>
            <p className="text-[10px] text-gray-500 mt-1">0 transactions</p>
          </div>
        </div>

        {/* Row 2: 4 Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          {/* Customers */}
          <Link
            href="/pharmacy/customers"
            className="flex items-center justify-between p-4 rounded-xl border border-emerald-100/80 bg-white hover:border-emerald-300 transition-all shadow-sm shadow-emerald-900/5 interactive-card"
          >
            <div>
              <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-teal-500" /> Customers
              </div>
              <p className="text-xl font-bold text-gray-900">12</p>
            </div>
            <UserPlus className="text-gray-300 text-lg w-5 h-5" />
          </Link>

          {/* New this month */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
            <div>
              <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5 text-green-500" /> New this month
              </div>
              <p className="text-xl font-bold text-gray-900">0</p>
            </div>
          </div>

          {/* AR balance */}
          <Link
            href="/pharmacy/customers"
            className="flex items-center justify-between p-4 rounded-xl border border-amber-200/80 bg-amber-50/50 hover:border-amber-300 hover:-translate-y-0.5 hover:shadow-md transition-all"
          >
            <div>
              <div className="text-xs font-medium text-amber-800 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" /> AR balance
              </div>
              <p className="text-xl font-bold text-amber-900">0</p>
              <p className="text-[10px] text-amber-700/80">With balance &gt; 0</p>
            </div>
          </Link>

          {/* Open POs */}
          <Link
            href="/pharmacy/purchases"
            className="flex items-center justify-between p-4 rounded-xl border border-orange-200 bg-orange-50/50 hover:border-orange-300 hover:-translate-y-0.5 hover:shadow-md transition-all"
          >
            <div>
              <div className="text-xs font-medium text-orange-800 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-orange-500" /> Open POs
              </div>
              <p className="text-xl font-bold text-orange-900">{openPOCount}</p>
              <p className="text-[10px] text-orange-700/80">Draft / ordered / partial</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 4. REVENUE & VALUE */}
      <div>
        <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wider mb-3 pl-3 border-l-4 border-emerald-600">
          Revenue &amp; value
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Year to date */}
          <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/25">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-emerald-200" />
                <p className="text-sm font-medium text-emerald-100">Year to date</p>
              </div>
              <p className="text-2xl font-bold tabular-nums">$107160.33</p>
              <p className="text-xs text-emerald-200 mt-2">Since Jan 1</p>
            </div>
          </div>

          {/* This month */}
          <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-green-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/25">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4 text-emerald-200" />
                <p className="text-sm font-medium text-emerald-100">This month</p>
              </div>
              <p className="text-2xl font-bold tabular-nums">$7406.60</p>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  <ArrowDown className="text-[10px] w-3 h-3" />
                  0.8%
                </span>
                <span className="text-xs text-emerald-200">vs last month</span>
              </div>
            </div>
          </div>

          {/* Last 7 days */}
          <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-teal-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/25">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <CalendarRange className="w-4 h-4 text-teal-200" />
                <p className="text-sm font-medium text-emerald-100">Last 7 days</p>
              </div>
              <p className="text-2xl font-bold tabular-nums">$7406.60</p>
              <p className="text-xs text-emerald-200 mt-2">Sum of completed sales in trend window</p>
            </div>
          </div>

          {/* Inventory value */}
          <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white border-0 shadow-lg shadow-emerald-950/30">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Warehouse className="w-4 h-4 text-emerald-300" />
                <p className="text-sm font-medium text-emerald-200">Inventory value</p>
              </div>
              <p className="text-2xl font-bold tabular-nums">$396000.00</p>
              <p className="text-xs text-emerald-300/90 mt-2">At retail (qty × price)</p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. TODAY'S OPERATIONS */}
      <div>
        <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wider mb-3 pl-3 border-l-4 border-emerald-600">
          Today&apos;s operations
        </h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Transactions */}
          <div className="rounded-lg text-card-foreground p-4 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
              Transactions
            </div>
            <p className="text-2xl font-bold text-gray-900">1</p>
          </div>

          {/* Gross profit */}
          <div className="rounded-lg text-card-foreground p-4 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Gross profit
            </div>
            <p className="text-xl font-bold text-gray-900 tabular-nums">$166.50</p>
            <p className="text-xs text-gray-500 mt-0.5">31.0% margin</p>
          </div>

          {/* Units sold */}
          <div className="rounded-lg text-card-foreground p-4 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
              <Boxes className="w-3.5 h-3.5 text-amber-500" />
              Units sold
            </div>
            <p className="text-2xl font-bold text-gray-900">4</p>
          </div>

          {/* Avg basket */}
          <div className="rounded-lg text-card-foreground p-4 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
              <ShoppingBasket className="w-3.5 h-3.5 text-rose-500" />
              Avg basket
            </div>
            <p className="text-xl font-bold text-gray-900 tabular-nums">$536.50</p>
          </div>

          {/* Customers today */}
          <div className="rounded-lg text-card-foreground p-4 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
              <Users className="w-3.5 h-3.5 text-teal-500" />
              Customers today
            </div>
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500 mt-0.5">Unique on receipts</p>
          </div>
        </div>
      </div>

      {/* 6. RISK ALERT STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/pharmacy/stock-alerts"
          className="flex items-center justify-between p-4 rounded-xl border border-red-200 bg-red-50/80 hover:bg-red-100/80:bg-red-950/40 hover:-translate-y-0.5 hover:shadow-md transition-all"
        >
          <span className="text-sm font-medium text-red-800">Low stock SKUs</span>
          <span className="text-xl font-bold text-red-700">10</span>
        </Link>
        <Link
          href="/pharmacy/stock-alerts"
          className="flex items-center justify-between p-4 rounded-xl border border-orange-200 bg-orange-50/80 hover:bg-orange-100/80:bg-orange-950/40 hover:-translate-y-0.5 hover:shadow-md transition-all"
        >
          <span className="text-sm font-medium text-orange-800">Expiring (3 mo)</span>
          <span className="text-xl font-bold text-orange-700">7</span>
        </Link>
        <Link
          href="/pharmacy/inventory"
          className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100:bg-gray-800 hover:-translate-y-0.5 hover:shadow-md transition-all"
        >
          <span className="text-sm font-medium text-gray-700">Expired batches</span>
          <span className="text-xl font-bold text-gray-900">8</span>
        </Link>
      </div>

      {/* 7. SALES TREND & PAYMENT MIX TODAY */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="rounded-lg text-card-foreground xl:col-span-2 p-5 md:p-6 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sales trend</h2>
              <p className="text-xs text-gray-500">
                Completed sales — last 14 days (revenue + transactions)
              </p>
            </div>
            <Link
              href="/pharmacy/reports"
              className="text-sm text-emerald-700 hover:underline font-medium"
            >
              Full reports
            </Link>
          </div>

          {/* Interactive Dual-Axis Chart with SVG */}
          <div className="w-full relative">
            {/* Chart Legend */}
            <div className="flex items-center justify-center gap-6 mb-2 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block"></span>
                <span>Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 inline-block bg-white"></span>
                <span>Transactions</span>
              </div>
            </div>

            <div className="w-full h-[280px]">
              <svg viewBox="0 0 760 260" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="emeraldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines & Left/Right Axis Labels */}
                {[
                  { val: "$5k", tx: "3", y: 20 },
                  { val: "$4.5k", tx: "", y: 40 },
                  { val: "$4k", tx: "", y: 60 },
                  { val: "$3.5k", tx: "", y: 80 },
                  { val: "$3k", tx: "2", y: 100 },
                  { val: "$2.5k", tx: "", y: 120 },
                  { val: "$2k", tx: "", y: 140 },
                  { val: "$1.5k", tx: "1", y: 160 },
                  { val: "$1k", tx: "", y: 180 },
                  { val: "$500", tx: "", y: 200 },
                  { val: "$0", tx: "0", y: 220 },
                ].map((item, idx) => (
                  <g key={idx}>
                    <line
                      x1="55"
                      y1={item.y}
                      x2="710"
                      y2={item.y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x="50"
                      y={item.y + 3}
                      textAnchor="end"
                      className="text-[10px] fill-gray-400 select-none font-sans"
                    >
                      {item.val}
                    </text>
                    {item.tx !== "" && (
                      <text
                        x="718"
                        y={item.y + 3}
                        textAnchor="start"
                        className="text-[10px] fill-gray-400 select-none font-sans"
                      >
                        {item.tx}
                      </text>
                    )}
                  </g>
                ))}

                {/* Area under curve */}
                <path
                  d="M 60,172 
                     C 100,148 120,38 160,36 
                     C 200,34 220,132 260,132 
                     C 300,132 320,184 360,192 
                     C 400,200 420,36 460,36 
                     C 500,36 520,120 560,120 
                     C 600,120 620,214 660,214 
                     C 680,214 700,198 710,198 
                     L 710,220 L 60,220 Z"
                  fill="url(#emeraldFill)"
                />

                {/* Revenue Line Curve */}
                <path
                  d="M 60,172 
                     C 100,148 120,38 160,36 
                     C 200,34 220,132 260,132 
                     C 300,132 320,184 360,192 
                     C 400,200 420,36 460,36 
                     C 500,36 520,120 560,120 
                     C 600,120 620,214 660,214 
                     C 680,214 700,198 710,198"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.75"
                  strokeLinecap="round"
                />

                {/* Dotted Transactions Line Curve */}
                <path
                  d="M 60,160 
                     C 100,160 120,20 160,20 
                     C 200,20 220,100 260,100 
                     C 300,100 320,160 360,160 
                     C 400,160 420,20 460,20 
                     C 500,20 520,100 560,100 
                     C 600,100 620,160 660,160 
                     C 680,160 700,160 710,160"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Data Points on Curve */}
                {[
                  { cx: 60, cy: 172, date: "Sep 24", rev: "$1,200.00", tx: 1 },
                  { cx: 160, cy: 36, date: "Sep 26", rev: "$4,600.00", tx: 3 },
                  { cx: 260, cy: 132, date: "Sep 27", rev: "$2,200.00", tx: 2 },
                  { cx: 360, cy: 192, date: "Sep 29", rev: "$700.00", tx: 1 },
                  { cx: 460, cy: 36, date: "Sep 30", rev: "$4,600.00", tx: 3 },
                  { cx: 560, cy: 120, date: "Oct 01", rev: "$2,500.00", tx: 2 },
                  { cx: 660, cy: 214, date: "Oct 03", rev: "$246.50", tx: 1 },
                  { cx: 710, cy: 198, date: "Oct 07", rev: "$536.50", tx: 1 },
                ].map((pt, i) => (
                  <g key={i} className="cursor-pointer group" onMouseEnter={() => setHoveredTrendIdx(i)} onMouseLeave={() => setHoveredTrendIdx(null)}>
                    <circle cx={pt.cx} cy={pt.cy} r="6" fill="#059669" opacity="0.15" />
                    <circle cx={pt.cx} cy={pt.cy} r="3.5" fill="#ffffff" stroke="#059669" strokeWidth="2.5" />
                  </g>
                ))}

                {/* X-axis date labels */}
                {[
                  { x: 60, label: "Sep 24" },
                  { x: 190, label: "Sep 27" },
                  { x: 320, label: "Sep 30" },
                  { x: 410, label: "Oct 01" },
                  { x: 480, label: "Oct 02" },
                  { x: 550, label: "Oct 03" },
                  { x: 630, label: "Oct 06" },
                  { x: 700, label: "Oct 07" },
                ].map((item, idx) => (
                  <text
                    key={idx}
                    x={item.x}
                    y="242"
                    textAnchor="middle"
                    className="text-[10px] fill-gray-400 select-none font-sans"
                  >
                    {item.label}
                  </text>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* Payment Mix Today */}
        <div className="rounded-lg text-card-foreground p-5 md:p-6 border border-emerald-100/80 bg-white flex flex-col shadow-sm shadow-emerald-900/5">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-600" />
              Payment mix today
            </h2>
            <p className="text-xs text-gray-500">By revenue</p>
          </div>

          {/* Donut Chart */}
          <div className="flex-1 min-h-[220px] flex items-center justify-center relative">
            <svg viewBox="0 0 160 160" className="w-44 h-44">
              {/* Background circle track */}
              <circle
                cx="80"
                cy="80"
                r="56"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="24"
              />
              {/* 100% Cash Emerald Segment */}
              <circle
                cx="80"
                cy="80"
                r="56"
                fill="none"
                stroke="#059669"
                strokeWidth="24"
                strokeDasharray="351.85 351.85"
                strokeDashoffset="0"
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
              />
            </svg>
          </div>

          {/* Legend Summary */}
          <ul className="mt-3 space-y-1.5 text-xs border-t border-gray-100 pt-3">
            <li className="flex justify-between items-center text-gray-600">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block"></span>
                Cash
              </span>
              <span className="tabular-nums text-gray-900 font-medium">
                $536.50 <span className="text-gray-400 font-normal">(1)</span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* 8. AI INSIGHTS CARD */}
      <div className="rounded-lg text-card-foreground relative overflow-hidden p-5 md:p-6 border border-violet-100 bg-gradient-to-br from-white via-violet-50/40 to-white shadow-sm">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl"></div>
        
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-600">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI insights</h2>
              <p className="text-xs text-gray-500">
                Built-in machine intelligence — anomaly detection, demand forecasting, smart reorders.
              </p>
            </div>
          </div>
          
          <Link
            href="/pharmacy/ai"
            className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 4 Feature Subcards */}
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Anomaly Detection */}
          <Link
            href="/pharmacy/anomalies"
            className="group rounded-xl border border-violet-100 bg-white/70 p-4 hover:border-violet-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                2 active
              </span>
            </div>
            <div className="mt-3 text-sm font-semibold text-gray-900">
              Anomaly detection
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Spot unusual returns, dead stock, refund spikes.
            </div>
          </Link>

          {/* Demand Forecast */}
          <Link
            href="/pharmacy/forecasts"
            className="group rounded-xl border border-violet-100 bg-white/70 p-4 hover:border-violet-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <Activity className="w-5 h-5 text-sky-500" />
              <span className="text-[10px] font-medium text-sky-600">
                Live
              </span>
            </div>
            <div className="mt-3 text-sm font-semibold text-gray-900">
              Demand forecast
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Predict per-product demand for the next weeks.
            </div>
          </Link>

          {/* Reorder Suggestions */}
          <Link
            href="/pharmacy/purchases"
            className="group rounded-xl border border-violet-100 bg-white/70 p-4 hover:border-violet-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
              <span className="text-[10px] font-medium text-amber-600">
                Smart
              </span>
            </div>
            <div className="mt-3 text-sm font-semibold text-gray-900">
              Reorder suggestions
            </div>
            <div className="mt-1 text-xs text-gray-500">
              AI-driven PO drafts based on velocity &amp; lead time.
            </div>
          </Link>

          {/* AI Assistant */}
          <Link
            href="/pharmacy/ai-assistant"
            className="group rounded-xl border border-violet-100 bg-white/70 p-4 hover:border-violet-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <Sparkles className="w-5 h-5 text-violet-500" />
              <span className="text-[10px] font-medium text-violet-600">
                Ask
              </span>
            </div>
            <div className="mt-3 text-sm font-semibold text-gray-900">
              AI assistant
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Natural language Q&amp;A across your pharmacy data.
            </div>
          </Link>
        </div>
      </div>

      {/* 9. TODAY'S SALES BY HOUR */}
      <div className="rounded-lg text-card-foreground p-5 md:p-6 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Today&apos;s sales by hour
            </h2>
            <p className="text-xs text-gray-500">
              Revenue per clock hour (server UTC). Use for staffing patterns.
            </p>
          </div>
        </div>

        {/* Hourly Bar Chart */}
        <div className="h-56 w-full">
          <svg viewBox="0 0 1000 200" className="w-full h-full overflow-visible">
            {/* Horizontal Grid lines & Left labels */}
            {[
              { val: "$600", y: 20 },
              { val: "$500", y: 50 },
              { val: "$400", y: 80 },
              { val: "$300", y: 110 },
              { val: "$200", y: 140 },
              { val: "$100", y: 170 },
              { val: "$0", y: 190 },
            ].map((item, idx) => (
              <g key={idx}>
                <line
                  x1="50"
                  y1={item.y}
                  x2="970"
                  y2={item.y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x="44"
                  y={item.y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-gray-400 select-none font-sans"
                >
                  {item.val}
                </text>
              </g>
            ))}

            {/* Vertical Bar at 0:00 (Today's Sale: $536.50) */}
            <g className="cursor-pointer group">
              <rect
                x="80"
                y="38"
                width="8"
                height="152"
                rx="4"
                className="fill-emerald-600 transition-all hover:fill-emerald-500"
              />
            </g>

            {/* X-axis hours labels */}
            {[
              { x: 84, label: "0:00" },
              { x: 164, label: "2:00" },
              { x: 244, label: "4:00" },
              { x: 324, label: "6:00" },
              { x: 404, label: "8:00" },
              { x: 484, label: "10:00" },
              { x: 564, label: "12:00" },
              { x: 644, label: "14:00" },
              { x: 724, label: "16:00" },
              { x: 804, label: "18:00" },
              { x: 884, label: "20:00" },
              { x: 964, label: "22:00" },
            ].map((item, idx) => (
              <text
                key={idx}
                x={item.x}
                y="208"
                textAnchor="middle"
                className="text-[10px] fill-gray-400 select-none font-sans"
              >
                {item.label}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* 10. TOP SELLERS & SHORTCUTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sellers Table */}
        <div className="rounded-lg text-card-foreground p-5 md:p-6 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Top sellers</h2>
              <p className="text-xs text-gray-500">Last 7 days by line revenue</p>
            </div>
            <Link
              href="/pharmacy/products"
              className="text-sm text-emerald-700 hover:underline font-medium"
            >
              Products
            </Link>
          </div>

          <div className="overflow-x-auto -mx-1">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="pb-2 pr-3">#</th>
                  <th className="pb-2 pr-3">Product</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="text-gray-900 hover:bg-gray-50:bg-gray-700/30 transition-colors">
                  <td className="py-2.5 text-gray-400 w-8">1</td>
                  <td className="py-2.5 font-medium">ACETAMINOPHEN</td>
                  <td className="py-2.5 text-right tabular-nums">16</td>
                  <td className="py-2.5 text-right tabular-nums font-semibold">$2000.00</td>
                </tr>
                <tr className="text-gray-900 hover:bg-gray-50:bg-gray-700/30 transition-colors">
                  <td className="py-2.5 text-gray-400 w-8">2</td>
                  <td className="py-2.5 font-medium">ATROPINE SULFATE</td>
                  <td className="py-2.5 text-right tabular-nums">15</td>
                  <td className="py-2.5 text-right tabular-nums font-semibold">$1260.00</td>
                </tr>
                <tr className="text-gray-900 hover:bg-gray-50:bg-gray-700/30 transition-colors">
                  <td className="py-2.5 text-gray-400 w-8">3</td>
                  <td className="py-2.5 font-medium">AVLAYAH</td>
                  <td className="py-2.5 text-right tabular-nums">9</td>
                  <td className="py-2.5 text-right tabular-nums font-semibold">$1125.00</td>
                </tr>
                <tr className="text-gray-900 hover:bg-gray-50:bg-gray-700/30 transition-colors">
                  <td className="py-2.5 text-gray-400 w-8">4</td>
                  <td className="py-2.5 font-medium">ACTIDOM DMX</td>
                  <td className="py-2.5 text-right tabular-nums">9</td>
                  <td className="py-2.5 text-right tabular-nums font-semibold">$1125.00</td>
                </tr>
                <tr className="text-gray-900 hover:bg-gray-50:bg-gray-700/30 transition-colors">
                  <td className="py-2.5 text-gray-400 w-8">5</td>
                  <td className="py-2.5 font-medium">ANTACID</td>
                  <td className="py-2.5 text-right tabular-nums">7</td>
                  <td className="py-2.5 text-right tabular-nums font-semibold">$875.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Shortcuts 4x4 Grid */}
        <div className="rounded-lg text-card-foreground p-5 md:p-6 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Shortcuts</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {/* 1. POS */}
            <Link
              href="/pharmacy/pos"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <ShoppingCart className="text-xl mb-1.5 text-emerald-600 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">POS</span>
            </Link>

            {/* 2. Sales history */}
            <Link
              href="/pharmacy/sales/history"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <History className="text-xl mb-1.5 text-emerald-700 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Sales history</span>
            </Link>

            {/* 3. Inventory */}
            <Link
              href="/pharmacy/inventory"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <Boxes className="text-xl mb-1.5 text-green-600 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Inventory</span>
            </Link>

            {/* 4. Reports */}
            <Link
              href="/pharmacy/reports"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <BarChart2 className="text-xl mb-1.5 text-purple-600 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Reports</span>
            </Link>

            {/* 5. Analytics */}
            <Link
              href="/pharmacy/analytics"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <Activity className="text-xl mb-1.5 text-indigo-600 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Analytics</span>
            </Link>

            {/* 6. Expenses */}
            <Link
              href="/pharmacy/expenses"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <Receipt className="text-xl mb-1.5 text-red-500 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Expenses</span>
            </Link>

            {/* 7. Customers */}
            <Link
              href="/pharmacy/customers"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <Users className="text-xl mb-1.5 text-teal-600 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Customers</span>
            </Link>

            {/* 8. Suppliers */}
            <Link
              href="/pharmacy/suppliers"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <Truck className="text-xl mb-1.5 text-amber-600 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Suppliers</span>
            </Link>

            {/* 9. Purchases */}
            <Link
              href="/pharmacy/purchases"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <Package className="text-xl mb-1.5 text-orange-600 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Purchases</span>
            </Link>

            {/* 10. Cash drawer */}
            <Link
              href="/pharmacy/cash-drawer"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <Landmark className="text-xl mb-1.5 text-cyan-600 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Cash drawer</span>
            </Link>

            {/* 11. Forecasts */}
            <Link
              href="/pharmacy/forecasts"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <Activity className="text-xl mb-1.5 text-sky-500 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Forecasts</span>
            </Link>

            {/* 12. Reminders */}
            <Link
              href="/pharmacy/reminders"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <Clock className="text-xl mb-1.5 text-pink-500 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Reminders</span>
            </Link>

            {/* 13. Notifications */}
            <Link
              href="/pharmacy/notifications"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <Bell className="text-xl mb-1.5 text-yellow-600 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Notifications</span>
            </Link>

            {/* 14. Anomalies */}
            <Link
              href="/pharmacy/anomalies"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <ShieldAlert className="text-xl mb-1.5 text-red-600 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Anomalies</span>
            </Link>

            {/* 15. AI assistant */}
            <Link
              href="/pharmacy/ai-assistant"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <Bot className="text-xl mb-1.5 text-violet-600 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">AI assistant</span>
            </Link>

            {/* 16. Settings */}
            <Link
              href="/pharmacy/settings"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:border-emerald-300:border-gray-600 hover:bg-emerald-50:bg-gray-700/50 transition-colors"
            >
              <Settings className="text-xl mb-1.5 text-gray-600 w-5 h-5" />
              <span className="text-xs font-medium text-center text-gray-700 leading-tight">Settings</span>
            </Link>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 font-mono text-[10px]">⌘</kbd> <kbd className="px-1.5 py-0.5 rounded bg-gray-200 font-mono text-[10px]">K</kbd> for command palette
          </p>
        </div>
      </div>

      {/* 11. RECENT SALES & STOCK & EXPIRY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales List */}
        <div className="rounded-lg text-card-foreground p-5 md:p-6 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent sales</h2>
            <Link
              href="/pharmacy/sales/history"
              className="text-sm text-emerald-700 hover:underline font-medium"
            >
              View all
            </Link>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {sales.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
                No recent sales recorded yet.
              </div>
            ) : (
              sales.slice(0, 6).map((sale) => (
                <div key={sale.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/70 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 tabular-nums">
                          {currencySymbol}{sale.totalAmount.toFixed(2)}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800">
                          {sale.paymentMethod}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                        {sale.items.map((i) => `${i.quantity}× ${i.name}`).join(", ") || "General sale items"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <span>{sale.cashier || "Pharmacy Staff"}</span>
                        <span>·</span>
                        <span>{sale.date}</span>
                        {sale.customer?.name && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-700 font-medium truncate">{sale.customer.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stock & Expiry */}
        <div className="rounded-lg text-card-foreground p-5 md:p-6 border border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Stock &amp; expiry</h2>
            <Link
              href="/pharmacy/stock-alerts"
              className="text-sm text-emerald-700 hover:underline font-medium"
            >
              Stock alerts
            </Link>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {(() => {
              const alertItems = inventory
                .filter((item) => item.status !== "NORMAL")
                .slice(0, 6);

              if (alertItems.length === 0) {
                return (
                  <div className="p-8 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
                    All stock levels and expiry dates are optimal.
                  </div>
                );
              }

              return alertItems.map((item) => {
                const isBad = item.quantity === 0 || item.status === "EXPIRED";
                const badgeLabel =
                  item.quantity === 0
                    ? "Out"
                    : item.status === "LOW_STOCK"
                      ? "Low"
                      : item.status === "EXPIRED"
                        ? "Expired"
                        : "Expiring";

                return (
                  <div key={item.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {item.productName}
                          {item.batchNumber && <span className="text-gray-500 font-normal"> (Batch: {item.batchNumber})</span>}
                        </h3>
                        <p className="text-sm text-gray-600">Stock {item.quantity} · reorder {item.reorderLevel}</p>
                        <p className={`text-sm mt-0.5 ${isBad ? "text-red-600 font-medium" : "text-orange-600"}`}>
                          Expires {item.expiryDate}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                          isBad ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"
                        }`}>
                          {badgeLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
