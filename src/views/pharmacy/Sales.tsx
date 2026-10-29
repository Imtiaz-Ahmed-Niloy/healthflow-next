"use client";

import React, { useState, useMemo } from "react";
import { usePharmacy } from "@/context/PharmacyContext";
import { Sale } from "@/types/pharmacy";
import {
  SalesStatCards,
} from "@/components/Sales/SalesStatCards";
import {
  SalesFilterBar,
  DateRangePreset,
  StatusFilter,
  PaymentMethodFilter,
  SortOption,
} from "@/components/Sales/SalesFilterBar";
import { SalesTable } from "@/components/Sales/SalesTable";
import { SaleReceiptModal } from "@/components/Sales/SaleReceiptModal";
import { ProcessReturnModal } from "@/components/Sales/ProcessReturnModal";
import { ReturnLookupModal } from "@/components/Sales/ReturnLookupModal";
import { ArrowLeft, ShoppingBag, ShieldCheck, Scan } from "lucide-react";
import Link from "next/link";

export default function SalesHistoryPage() {
  const { sales, currencySymbol, user } = usePharmacy();

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [datePreset, setDatePreset] = useState<DateRangePreset>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [paymentMethodFilter, setPaymentMethodFilter] =
    useState<PaymentMethodFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");

  // Modal states
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);
  const [receiptMode, setReceiptMode] = useState<"invoice" | "thermal">("invoice");
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [selectedReturnSale, setSelectedReturnSale] = useState<Sale | null>(null);
  const [isReturnOpen, setIsReturnOpen] = useState<boolean>(false);
  const [isLookupOpen, setIsLookupOpen] = useState<boolean>(false);

  // System reference date
  const refDate = useMemo(() => new Date(), []);

  // Filtered & Sorted Sales calculation
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 86400000 - 1;
    const startOfYesterday = startOfToday - 86400000;
    const sevenDaysAgo = startOfToday - 6 * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return sales
      .filter((sale) => {
        // 1. Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchesInvoice = sale.invoiceNumber.toLowerCase().includes(q);
          const matchesCustomer =
            sale.customer.name.toLowerCase().includes(q) ||
            (sale.customer.phone && sale.customer.phone.includes(q));
          const matchesCashier = sale.cashier.toLowerCase().includes(q);
          const matchesItems = sale.items.some(
            (i) =>
              i.name.toLowerCase().includes(q) ||
              i.batchNumber.toLowerCase().includes(q)
          );

          if (!matchesInvoice && !matchesCustomer && !matchesCashier && !matchesItems) {
            return false;
          }
        }

        // 2. Status filter
        if (statusFilter !== "ALL") {
          if (sale.status !== statusFilter) return false;
        }

        // 3. Payment Method filter
        if (paymentMethodFilter !== "ALL") {
          if (sale.paymentMethod !== paymentMethodFilter) return false;
        }

        // 4. Date Range filter using timestamp
        const saleTime = sale.timestamp || new Date(sale.date).getTime();

        if (datePreset === "today") {
          if (saleTime < startOfToday || saleTime > endOfToday) return false;
        } else if (datePreset === "yesterday") {
          if (saleTime < startOfYesterday || saleTime >= startOfToday) return false;
        } else if (datePreset === "last7days") {
          if (saleTime < sevenDaysAgo) return false;
        } else if (datePreset === "thisMonth") {
          if (saleTime < startOfMonth) return false;
        } else if (datePreset === "custom") {
          if (customStartDate) {
            const startTimestamp = new Date(customStartDate).setHours(0, 0, 0, 0);
            if (saleTime < startTimestamp) return false;
          }
          if (customEndDate) {
            const endTimestamp = new Date(customEndDate).setHours(23, 59, 59, 999);
            if (saleTime > endTimestamp) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const aNet = a.totalAmount - (a.refundedAmount || 0);
        const bNet = b.totalAmount - (b.refundedAmount || 0);

        switch (sortBy) {
          case "date_desc":
            return (b.timestamp || 0) - (a.timestamp || 0);
          case "date_asc":
            return (a.timestamp || 0) - (b.timestamp || 0);
          case "amount_desc":
            return bNet - aNet;
          case "amount_asc":
            return aNet - bNet;
          default:
            return 0;
        }
      });
  }, [
    sales,
    searchTerm,
    statusFilter,
    datePreset,
    customStartDate,
    customEndDate,
    paymentMethodFilter,
    sortBy,
  ]);

  // Counts for status tabs
  const counts = useMemo(() => {
    return {
      all: sales.length,
      completed: sales.filter((s) => s.status === "COMPLETED").length,
      partial: sales.filter((s) => s.status === "PARTIAL_RETURN").length,
      returned: sales.filter((s) => s.status === "RETURNED").length,
    };
  }, [sales]);

  const isFiltered =
    Boolean(searchTerm) ||
    statusFilter !== "ALL" ||
    datePreset !== "all" ||
    paymentMethodFilter !== "ALL" ||
    Boolean(customStartDate) ||
    Boolean(customEndDate);

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setDatePreset("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setPaymentMethodFilter("ALL");
    setSortBy("date_desc");
  };

  // Export CSV
  const handleExportCsv = () => {
    if (filteredSales.length === 0) {
      alert("No sales data available to export.");
      return;
    }

    const headers = [
      "Invoice Number",
      "Date",
      "Customer Name",
      "Customer Phone",
      "Customer Type",
      "Items Count",
      "Items Breakdown",
      "Payment Method",
      "Status",
      "Subtotal",
      "Tax (5%)",
      "Discount",
      "Gross Total",
      "Refunded Amount",
      "Net Settled",
      "Cashier",
    ];

    const rows = filteredSales.map((s) => {
      const itemsList = s.items
        .map((i) => `${i.name} (Qty:${i.quantity}, Price:${i.unitPrice})`)
        .join("; ");
      const net = Math.max(0, s.totalAmount - (s.refundedAmount || 0));

      return [
        `"${s.invoiceNumber}"`,
        `"${s.date}"`,
        `"${s.customer.name}"`,
        `"${s.customer.phone || ""}"`,
        `"${s.customer.type || "Walk-in"}"`,
        s.items.length,
        `"${itemsList}"`,
        s.paymentMethod,
        s.status,
        s.subtotal.toFixed(2),
        s.tax.toFixed(2),
        s.discount.toFixed(2),
        s.totalAmount.toFixed(2),
        (s.refundedAmount || 0).toFixed(2),
        net.toFixed(2),
        `"${s.cashier}"`,
      ].join(",");
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `PharmacyNext_Sales_Ledger_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleViewReceipt = (sale: Sale, mode: "invoice" | "thermal" = "invoice") => {
    setSelectedReceiptSale(sale);
    setReceiptMode(mode);
    setIsReceiptOpen(true);
  };

  const handleOpenReturn = (sale: Sale) => {
    setSelectedReturnSale(sale);
    setIsReturnOpen(true);
  };

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-emerald-700 font-semibold">Sales</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sales History & Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit orders, print thermal receipts, export reports, and process returns
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsLookupOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0e6245] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-2xs"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Fast Return Lookup</span>
          </button>

          <Link
            href="/pharmacy/cash-drawer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cash Drawer</span>
          </Link>

          <Link
            href="/pharmacy/pos"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-sm"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Open POS Register</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat KPI Cards */}
      <SalesStatCards
        sales={sales}
        filteredSales={filteredSales}
        currencySymbol={currencySymbol}
      />

      {/* Filter and Control Bar */}
      <SalesFilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        datePreset={datePreset}
        setDatePreset={setDatePreset}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        paymentMethodFilter={paymentMethodFilter}
        setPaymentMethodFilter={setPaymentMethodFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        counts={counts}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
      />

      {/* Sales Ledger Table */}
      <SalesTable
        sales={filteredSales}
        onViewReceipt={handleViewReceipt}
        onOpenReturn={handleOpenReturn}
        currencySymbol={currencySymbol}
        onResetFilters={handleResetFilters}
      />

      {/* Invoice & Thermal Receipt Modal */}
      <SaleReceiptModal
        sale={selectedReceiptSale}
        isOpen={isReceiptOpen}
        initialMode={receiptMode}
        onClose={() => {
          setIsReceiptOpen(false);
          setSelectedReceiptSale(null);
        }}
        onOpenReturnModal={handleOpenReturn}
        currencySymbol={currencySymbol}
      />

      {/* Process Return & Refund Modal */}
      {isReturnOpen && selectedReturnSale && (
        <ProcessReturnModal
          sale={selectedReturnSale}
          isOpen={isReturnOpen}
          onClose={() => {
            setIsReturnOpen(false);
            setSelectedReturnSale(null);
          }}
          currencySymbol={currencySymbol}
        />
      )}

      {/* Fast Barcode / Phone Return Lookup Modal */}
      {isLookupOpen && (
        <ReturnLookupModal
          isOpen={isLookupOpen}
          onClose={() => setIsLookupOpen(false)}
          onSelectSaleForReturn={(sale) => {
            handleOpenReturn(sale);
          }}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}

