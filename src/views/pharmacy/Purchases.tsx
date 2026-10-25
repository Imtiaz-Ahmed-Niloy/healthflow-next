"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Bot,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Eye,
  Printer,
  Truck,
  Ban,
  Search,
  Calendar,
  Filter,
  FileText,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";
import { PurchaseOrder, PurchaseOrderItem, Supplier, Product } from "@/types/pharmacy";

export default function PurchaseOrdersPage() {
  const {
    purchaseOrders,
    suppliers,
    products,
    reorderSuggestions,
    addPurchaseOrder,
    updatePurchaseOrderStatus,
    receivePurchaseOrderStock,
  } = usePharmacy();

  // AI Banner Collapsible
  const [aiSuggestionsOpen, setAiSuggestionsOpen] = useState(true);

  // Filter & Search states
  const [searchOrderNumber, setSearchOrderNumber] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All statuses");
  const [filterSupplier, setFilterSupplier] = useState<string>("All suppliers");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  // Modals state
  const [isNewPoModalOpen, setIsNewPoModalOpen] = useState(false);
  const [selectedPoDetails, setSelectedPoDetails] = useState<PurchaseOrder | null>(null);
  const [receiveStockPo, setReceiveStockPo] = useState<PurchaseOrder | null>(null);
  const [cancelCandidate, setCancelCandidate] = useState<PurchaseOrder | null>(null);

  // New PO form states
  const [newPoSupplierId, setNewPoSupplierId] = useState("");
  const [newPoNotes, setNewPoNotes] = useState("");
  const [newPoLines, setNewPoLines] = useState<
    Array<{ productId: string; quantity: number; unitCost: number }>
  >([{ productId: "", quantity: 1, unitCost: 0 }]);
  const [poFormError, setPoFormError] = useState("");

  // Receive stock form states: Map of productId -> { qty, batch, expiry, location, reorderLevel }
  const [receiveLines, setReceiveLines] = useState<
    Record<
      string,
      {
        receivedQty: number;
        batchNumber: string;
        expiryDate: string;
        location: string;
        reorderLevel: number;
      }
    >
  >({});
  const [receiveFormError, setReceiveFormError] = useState("");

  // Group AI reorder suggestions by supplier
  const suggestionsBySupplier = useMemo(() => {
    const groups: Record<string, typeof reorderSuggestions> = {};
    reorderSuggestions.forEach((sug) => {
      const sup = sug.supplierName || "Unknown Supplier";
      if (!groups[sup]) groups[sup] = [];
      groups[sup].push(sug);
    });
    return groups;
  }, [reorderSuggestions]);

  // Unique supplier names across suggestions
  const suggestionSupplierCount = Object.keys(suggestionsBySupplier).length;

  // Filtered purchase orders list
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      // Order number search
      if (
        searchOrderNumber.trim() &&
        !po.poNumber.toLowerCase().includes(searchOrderNumber.toLowerCase().trim())
      ) {
        return false;
      }

      // Status filter
      if (filterStatus !== "All statuses" && po.status !== filterStatus) {
        return false;
      }

      // Supplier filter
      if (filterSupplier !== "All suppliers" && po.supplierName !== filterSupplier) {
        return false;
      }

      // Date range filters
      if (filterDateFrom) {
        const fromTs = new Date(filterDateFrom).getTime();
        if (po.timestamp < fromTs) return false;
      }

      if (filterDateTo) {
        const toTs = new Date(filterDateTo).getTime() + 86400000;
        if (po.timestamp > toTs) return false;
      }

      return true;
    });
  }, [
    purchaseOrders,
    searchOrderNumber,
    filterStatus,
    filterSupplier,
    filterDateFrom,
    filterDateTo,
  ]);

  // Open "New PO" modal from AI Suggestion group
  const handleCreatePoFromSuggestion = (supplierName: string) => {
    const matchedSupplier = suppliers.find(
      (s) => s.name.toLowerCase() === supplierName.toLowerCase()
    );
    setNewPoSupplierId(matchedSupplier ? matchedSupplier.id : "");

    const groupItems = suggestionsBySupplier[supplierName] || [];
    const lines = groupItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId || p.sku === item.sku);
      return {
        productId: prod ? prod.id : item.productId,
        quantity: item.suggestedUnits || 1,
        unitCost: item.estimatedCost || prod?.costPrice || 0,
      };
    });

    setNewPoLines(lines.length > 0 ? lines : [{ productId: "", quantity: 1, unitCost: 0 }]);
    setNewPoNotes(`AI-suggested reorder for ${supplierName}`);
    setPoFormError("");
    setIsNewPoModalOpen(true);
  };

  // Open standard "New PO" modal
  const handleOpenNewPoModal = () => {
    setNewPoSupplierId(suppliers.length > 0 ? suppliers[0].id : "");
    setNewPoLines([{ productId: "", quantity: 1, unitCost: 0 }]);
    setNewPoNotes("");
    setPoFormError("");
    setIsNewPoModalOpen(true);
  };

  // Add line to New PO
  const handleAddPoLine = () => {
    setNewPoLines((prev) => [...prev, { productId: "", quantity: 1, unitCost: 0 }]);
  };

  // Remove line from New PO
  const handleRemovePoLine = (index: number) => {
    if (newPoLines.length <= 1) return;
    setNewPoLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Update line product
  const handlePoLineProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    setNewPoLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              productId,
              unitCost: prod?.costPrice || 0,
            }
          : line
      )
    );
  };

  // Calculate estimated total for new PO
  const estimatedPoTotal = useMemo(() => {
    return newPoLines.reduce((acc, line) => {
      const q = Number(line.quantity) || 0;
      const c = Number(line.unitCost) || 0;
      return acc + q * c;
    }, 0);
  }, [newPoLines]);

  // Submit New PO
  const handleCreatePoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoSupplierId) {
      setPoFormError("Please select a supplier.");
      return;
    }

    const validLines = newPoLines.filter((l) => l.productId && l.quantity > 0);
    if (validLines.length === 0) {
      setPoFormError("Please select at least one product with quantity > 0.");
      return;
    }

    const selectedSupplier = suppliers.find((s) => s.id === newPoSupplierId);
    const supplierName = selectedSupplier ? selectedSupplier.name : "Vendor";

    const poItems: PurchaseOrderItem[] = validLines.map((line, idx) => {
      const prod = products.find((p) => p.id === line.productId);
      return {
        id: `poi-${Date.now()}-${idx}`,
        productId: line.productId,
        productName: prod?.name || "Product",
        sku: prod?.sku || "SKU-N/A",
        quantity: Number(line.quantity),
        receivedQuantity: 0,
        unitCost: Number(line.unitCost),
        totalCost: Number(line.quantity) * Number(line.unitCost),
      };
    });

    const subtotal = poItems.reduce((acc, item) => acc + item.totalCost, 0);

    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}, ${now.toLocaleTimeString()}`;

    addPurchaseOrder({
      supplierId: newPoSupplierId,
      supplierName,
      supplierPhone: selectedSupplier?.phone,
      supplierEmail: selectedSupplier?.email,
      supplierAddress: selectedSupplier?.address,
      date: dateStr,
      items: poItems,
      subtotal,
      tax: 0,
      totalAmount: subtotal,
      paymentStatus: "UNPAID",
      status: "Ordered",
      notes: newPoNotes.trim() || undefined,
    });

    setIsNewPoModalOpen(false);
  };

  // Open Receive Stock Modal
  const handleOpenReceiveStock = (po: PurchaseOrder) => {
    setSelectedPoDetails(null);
    setReceiveStockPo(po);

    // Initialize line values
    const initialMap: Record<
      string,
      {
        receivedQty: number;
        batchNumber: string;
        expiryDate: string;
        location: string;
        reorderLevel: number;
      }
    > = {};

    po.items.forEach((item) => {
      const remaining = Math.max(0, item.quantity - item.receivedQuantity);
      const randomBatch = `BAT-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
      // default expiry date 2 years out
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 2);
      const expStr = expDate.toISOString().split("T")[0];

      initialMap[item.productId] = {
        receivedQty: remaining,
        batchNumber: item.batchNumber || randomBatch,
        expiryDate: expStr,
        location: item.location || "Main",
        reorderLevel: item.reorderLevel !== undefined ? item.reorderLevel : 10,
      };
    });

    setReceiveLines(initialMap);
    setReceiveFormError("");
  };

  // Submit Receive Stock
  const handleConfirmReceiveStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveStockPo) return;

    const receivedPayload = Object.entries(receiveLines).map(([productId, data]) => ({
      productId,
      receivedQty: Number(data.receivedQty) || 0,
      batchNumber: data.batchNumber.trim(),
      expiryDate: data.expiryDate,
      location: data.location || "Main",
      reorderLevel: Number(data.reorderLevel) || 10,
    }));

    const hasAnyQty = receivedPayload.some((l) => l.receivedQty > 0);
    if (!hasAnyQty) {
      setReceiveFormError("Please enter at least 1 quantity to receive.");
      return;
    }

    const missingBatch = receivedPayload.some((l) => l.receivedQty > 0 && !l.batchNumber);
    if (missingBatch) {
      setReceiveFormError("Batch / lot number is required for received items.");
      return;
    }

    receivePurchaseOrderStock(receiveStockPo.id, receivedPayload);
    setReceiveStockPo(null);
  };

  // Cancel order handler
  const handleConfirmCancelOrder = () => {
    if (cancelCandidate) {
      updatePurchaseOrderStatus(cancelCandidate.id, "Cancelled");
      setCancelCandidate(null);
    }
  };

  // Print purchase order handler
  const handlePrintPo = (po: PurchaseOrder) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order — ${po.poNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
            .po-title { font-size: 24px; font-weight: bold; margin: 0; color: #0f172a; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: #e0e7ff; color: #3730a3; margin-top: 6px; }
            .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { text-align: left; background: #f1f5f9; padding: 10px 14px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
            td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .total-row { font-size: 16px; font-weight: bold; text-align: right; padding-top: 16px; }
            .notes { background: #f8fafc; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #475569; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="po-title">${po.poNumber}</h1>
              <div class="badge">${po.status}</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 6px;">Ordered ${po.date}</div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 18px; color: #0f766e;">PharmacyNext</h2>
              <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Procurement Purchase Order</div>
            </div>
          </div>

          <div class="meta-box">
            <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Supplier</div>
            <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${po.supplierName}</div>
            <div style="font-size: 13px; color: #475569; margin-top: 4px;">${po.supplierPhone || ""} ${po.supplierEmail ? `· ${po.supplierEmail}` : ""}</div>
            ${po.supplierAddress ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">${po.supplierAddress}</div>` : ""}
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: center;">Recv.</th>
                <th style="text-align: right;">Unit</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${po.items
                .map(
                  (item) => `
                <tr>
                  <td>
                    <strong>${item.productName}</strong>
                    <div style="font-size: 12px; color: #64748b; font-family: monospace;">${item.sku}</div>
                  </td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: center;">${item.receivedQuantity}</td>
                  <td style="text-align: right;">$${item.unitCost.toFixed(2)}</td>
                  <td style="text-align: right;">$${item.totalCost.toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="total-row">
            TOTAL: $${po.totalAmount.toFixed(2)}
          </div>

          ${
            po.notes
              ? `
            <div style="margin-top: 24px;">
              <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Notes</div>
              <div class="notes">${po.notes}</div>
            </div>
          `
              : ""
          }

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create orders and receive stock into inventory.
          </p>
        </div>

        <button
          onClick={handleOpenNewPoModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New purchase order</span>
        </button>
      </div>

      {/* AI Reorder Suggestions Expandable Banner (Exact replica of purchases_page_top_1791363607655.png) */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden mb-6">
        {/* Banner Top Bar */}
        <div
          onClick={() => setAiSuggestionsOpen(!aiSuggestionsOpen)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">AI Reorder Suggestions</h2>
              <p className="text-xs text-gray-500">
                {reorderSuggestions.length} products across {suggestionSupplierCount} suppliers need
                reordering
              </p>
            </div>
          </div>

          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            {aiSuggestionsOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Banner Expandable Content */}
        {aiSuggestionsOpen && (
          <div className="border-t border-gray-100 divide-y divide-gray-100">
            {Object.keys(suggestionsBySupplier).length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No inventory replenishment alerts at this moment. All stock levels are sufficient.
              </div>
            ) : (
              Object.entries(suggestionsBySupplier).map(([supplierName, items]) => (
                <div key={supplierName} className="p-4 sm:p-5">
                  {/* Supplier Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                      {supplierName}
                    </span>
                    <button
                      onClick={() => handleCreatePoFromSuggestion(supplierName)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Create PO</span>
                    </button>
                  </div>

                  {/* Suggestion Item List */}
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white overflow-hidden">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-gray-900 uppercase">
                            {item.productName}
                          </div>
                          <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                            {item.sku}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Expected to stock out in {item.daysUntilStockout} days based on{" "}
                            {item.dailyDemand} units/day demand
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold text-gray-900">
                            {item.suggestedUnits} units
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {item.currentStock} in stock
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Order # Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Order #..."
              value={searchOrderNumber}
              onChange={(e) => setSearchOrderNumber(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-700 transition-all cursor-pointer"
            >
              <option value="All statuses">All statuses</option>
              <option value="Ordered">Ordered</option>
              <option value="Received">Received</option>
              <option value="Partial Received">Partial Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Supplier Filter */}
          <div>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-700 transition-all cursor-pointer"
            >
              <option value="All suppliers">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="relative">
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-700 transition-all"
            />
          </div>

          {/* Date To */}
          <div className="relative">
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-700 transition-all"
            />
          </div>
        </div>

        {/* Count Indicator */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span>{filteredOrders.length} orders</span>
          </div>

          {(searchOrderNumber ||
            filterStatus !== "All statuses" ||
            filterSupplier !== "All suppliers" ||
            filterDateFrom ||
            filterDateTo) && (
            <button
              onClick={() => {
                setSearchOrderNumber("");
                setFilterStatus("All statuses");
                setFilterSupplier("All suppliers");
                setFilterDateFrom("");
                setFilterDateTo("");
              }}
              className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Purchase Orders Table Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200/80 bg-gray-50/50">
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  ORDER
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  SUPPLIER
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  STATUS
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No purchase orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Order Column */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 text-sm">{po.poNumber}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{po.date}</div>
                    </td>

                    {/* Supplier Column */}
                    <td className="px-6 py-4 text-gray-700 font-medium text-sm">
                      {po.supplierName}
                    </td>

                    {/* Status Column */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          po.status === "Ordered"
                            ? "bg-[#eef2ff] text-[#4338ca] border border-[#c7d2fe]"
                            : po.status === "Received"
                            ? "bg-[#e6f4ea] text-[#137333] border border-green-200/60"
                            : po.status === "Partial Received"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Eye / View Details */}
                        <button
                          onClick={() => setSelectedPoDetails(po)}
                          className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="View order details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Print */}
                        <button
                          onClick={() => handlePrintPo(po)}
                          className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="Print PO"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* If Ordered or Partial Received: show Receive Stock and Cancel */}
                        {(po.status === "Ordered" || po.status === "Partial Received") && (
                          <>
                            {/* Receive Stock */}
                            <button
                              onClick={() => handleOpenReceiveStock(po)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Receive stock"
                            >
                              <Truck className="w-4 h-4" />
                            </button>

                            {/* Cancel PO */}
                            <button
                              onClick={() => setCancelCandidate(po)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Cancel order"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Order Modal (Exact replica of new_purchase_order_modal_1791363658081.png) */}
      {isNewPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">New purchase order</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Pick a supplier, add the items you want to buy, and record the agreed unit costs.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNewPoModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreatePoSubmit} className="p-6 space-y-4">
              {poFormError && (
                <div className="p-2.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {poFormError}
                </div>
              )}

              {/* Supplier Picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Supplier *
                </label>
                <select
                  required
                  value={newPoSupplierId}
                  onChange={(e) => setNewPoSupplierId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 transition-all cursor-pointer"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Line items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">Line items</span>
                  <button
                    type="button"
                    onClick={handleAddPoLine}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add line</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {newPoLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50/70 border border-gray-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                    >
                      {/* Product Selector */}
                      <div className="flex-1">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">
                          Product
                        </label>
                        <select
                          required
                          value={line.productId}
                          onChange={(e) => handlePoLineProductChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 cursor-pointer"
                        >
                          <option value="">Select product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Qty */}
                      <div className="w-20">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={line.quantity}
                          onChange={(e) =>
                            setNewPoLines((prev) =>
                              prev.map((l, i) =>
                                i === idx ? { ...l, quantity: Number(e.target.value) || 1 } : l
                              )
                            )
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>

                      {/* Unit cost */}
                      <div className="w-24">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">
                          Unit cost
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.unitCost}
                          onChange={(e) =>
                            setNewPoLines((prev) =>
                              prev.map((l, i) =>
                                i === idx ? { ...l, unitCost: Number(e.target.value) || 0 } : l
                              )
                            )
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                      </div>

                      {/* Remove Line */}
                      {newPoLines.length > 1 && (
                        <div className="flex items-end pb-0.5">
                          <button
                            type="button"
                            onClick={() => handleRemovePoLine(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={newPoNotes}
                  onChange={(e) => setNewPoNotes(e.target.value)}
                  placeholder="Optional internal notes..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 resize-none transition-all"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-sm font-semibold text-gray-800">
                  Estimated total{" "}
                  <span className="font-bold text-gray-900">${estimatedPoTotal.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsNewPoModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
                  >
                    Create order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Details Modal (Exact replica of po_details_modal_1791363832070.png) */}
      {selectedPoDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedPoDetails.poNumber}
                    </h2>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedPoDetails.status === "Ordered"
                          ? "bg-[#eef2ff] text-[#4338ca] border border-[#c7d2fe]"
                          : selectedPoDetails.status === "Received"
                          ? "bg-[#e6f4ea] text-[#137333] border border-green-200/60"
                          : selectedPoDetails.status === "Partial Received"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {selectedPoDetails.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Ordered {selectedPoDetails.date}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPoDetails(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Supplier Info Box */}
              <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                  SUPPLIER
                </div>
                <div className="text-sm font-bold text-gray-900 mt-0.5">
                  {selectedPoDetails.supplierName}
                </div>
                {(selectedPoDetails.supplierPhone || selectedPoDetails.supplierEmail) && (
                  <div className="text-xs text-gray-600 mt-1">
                    {selectedPoDetails.supplierPhone}{" "}
                    {selectedPoDetails.supplierEmail && `· ${selectedPoDetails.supplierEmail}`}
                  </div>
                )}
                {selectedPoDetails.supplierAddress && (
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedPoDetails.supplierAddress}
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-semibold">
                      <th className="px-4 py-2.5">ITEM</th>
                      <th className="px-3 py-2.5 text-center">QTY</th>
                      <th className="px-3 py-2.5 text-center">RECV.</th>
                      <th className="px-3 py-2.5 text-right">UNIT</th>
                      <th className="px-4 py-2.5 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedPoDetails.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 text-xs">
                            {item.productName}
                          </div>
                          <div className="text-[11px] font-mono text-gray-400">{item.sku}</div>
                        </td>
                        <td className="px-3 py-3 text-center font-medium text-gray-800">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-3 text-center font-medium text-gray-800">
                          {item.receivedQuantity}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-700">
                          ${item.unitCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          ${item.totalCost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50/80 border-t border-gray-200 font-bold text-gray-900">
                      <td colSpan={4} className="px-4 py-2.5 text-right uppercase text-[11px]">
                        TOTAL
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm">
                        ${selectedPoDetails.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notes */}
              {selectedPoDetails.notes && (
                <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                    NOTES
                  </div>
                  <div className="text-xs text-gray-700 mt-1">{selectedPoDetails.notes}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2.5 bg-gray-50/40">
              {(selectedPoDetails.status === "Ordered" ||
                selectedPoDetails.status === "Partial Received") && (
                <button
                  type="button"
                  onClick={() => handleOpenReceiveStock(selectedPoDetails)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>Receive stock</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handlePrintPo(selectedPoDetails)}
                className="px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPoDetails(null)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Stock Modal (Exact replica of receive_stock_modal_1791363945363.png) */}
      {receiveStockPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Receive — {receiveStockPo.poNumber}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Supplier: {receiveStockPo.supplierName}. Enter batch numbers and quantities to add
                  to stock.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReceiveStockPo(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items list */}
            <form onSubmit={handleConfirmReceiveStock} className="p-6 space-y-4">
              {receiveFormError && (
                <div className="p-2.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {receiveFormError}
                </div>
              )}

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {receiveStockPo.items.map((item) => {
                  const lineData = receiveLines[item.productId] || {
                    receivedQty: item.quantity - item.receivedQuantity,
                    batchNumber: "",
                    expiryDate: "",
                    location: "Main",
                    reorderLevel: 0,
                  };
                  const remaining = Math.max(0, item.quantity - item.receivedQuantity);

                  return (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50/80 border border-gray-200 rounded-xl space-y-3"
                    >
                      <div>
                        <div className="text-sm font-bold text-gray-900">{item.productName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          SKU {item.sku} · Ordered {item.quantity} · Received{" "}
                          {item.receivedQuantity} · Remaining {remaining} · Unit cost $
                          {item.unitCost.toFixed(2)}
                        </div>
                      </div>

                      {/* Inputs Row 1: Qty, Batch *, Expiry */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            value={lineData.receivedQty}
                            onChange={(e) =>
                              setReceiveLines((prev) => ({
                                ...prev,
                                [item.productId]: {
                                  ...prev[item.productId],
                                  receivedQty: Number(e.target.value) || 0,
                                },
                              }))
                            }
                            className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            Batch *
                          </label>
                          <input
                            type="text"
                            placeholder="Batch / lot number"
                            value={lineData.batchNumber}
                            onChange={(e) =>
                              setReceiveLines((prev) => ({
                                ...prev,
                                [item.productId]: {
                                  ...prev[item.productId],
                                  batchNumber: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            Expiry
                          </label>
                          <input
                            type="date"
                            value={lineData.expiryDate}
                            onChange={(e) =>
                              setReceiveLines((prev) => ({
                                ...prev,
                                [item.productId]: {
                                  ...prev[item.productId],
                                  expiryDate: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                          />
                        </div>
                      </div>

                      {/* Inputs Row 2: Location, Reorder Level */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            Location
                          </label>
                          <input
                            type="text"
                            value={lineData.location}
                            onChange={(e) =>
                              setReceiveLines((prev) => ({
                                ...prev,
                                [item.productId]: {
                                  ...prev[item.productId],
                                  location: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            Reorder level
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={lineData.reorderLevel}
                            onChange={(e) =>
                              setReceiveLines((prev) => ({
                                ...prev,
                                [item.productId]: {
                                  ...prev[item.productId],
                                  reorderLevel: Number(e.target.value) || 0,
                                },
                              }))
                            }
                            className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setReceiveStockPo(null)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm receive</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {cancelCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-gray-900 mb-2">Cancel purchase order</h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to cancel{" "}
              <strong className="text-gray-800">{cancelCandidate.poNumber}</strong>? The order
              status will be updated to Cancelled.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCancelCandidate(null)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
              >
                Yes, Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

