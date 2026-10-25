"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePharmacy } from "@/context/PharmacyContext";
import { InventoryTable } from "@/components/Inventory/InventoryTable";
import { AddInventoryModal } from "@/components/Inventory/AddInventoryModal";
import {
  Plus,
  Upload,
  Search,
  AlertTriangle,
  Clock,
  Boxes,
} from "lucide-react";

export default function InventoryPage() {
  const {
    inventory: rawInventory,
    products: rawProducts,
    addInventory,
    deleteInventory,
  } = usePharmacy();

  const inventory = rawInventory || [];
  const products = rawProducts || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterExpiringSoon, setFilterExpiringSoon] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter logic
  const filteredInventory = useMemo(() => {
    return (inventory || []).filter((item) => {
      if (filterLowStock) {
        const isLow = item.quantity <= item.reorderLevel;
        if (!isLow) return false;
      }

      if (filterExpiringSoon) {
        const isExpiring = item.status === "EXPIRING_SOON" || item.status === "EXPIRED";
        if (!isExpiring) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesProduct = item.productName.toLowerCase().includes(q);
        const matchesGeneric = item.genericName?.toLowerCase().includes(q);
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesBatch = item.batchNumber.toLowerCase().includes(q);
        const matchesLocation = item.location.toLowerCase().includes(q);

        if (
          !matchesProduct &&
          !matchesGeneric &&
          !matchesSku &&
          !matchesBatch &&
          !matchesLocation
        ) {
          return false;
        }
      }

      return true;
    });
  }, [inventory, searchTerm, filterLowStock, filterExpiringSoon]);

  return (
    <div className="w-full space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Inventory</span>
            <span>/</span>
            <span className="text-blue-600 font-semibold">Stock Management</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Stock Management</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {inventory.length} Batches
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time pharmacy batch quantities, storage locations, and expiry dates
          </p>
        </div>

        {/* Top Actions: Bulk Import & Add Inventory */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/pharmacy/products/bulk-import"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Import</span>
          </Link>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Inventory</span>
          </button>
        </div>
      </div>

      {/* Filters & Control Bar: Search & Quick Filter Badges */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search inventory..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 placeholder-slate-400 transition-all"
          />
        </div>

        {/* Quick Filter Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterLowStock
                ? "bg-rose-600 text-white shadow-2xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-800"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock</span>
          </button>

          <button
            onClick={() => setFilterExpiringSoon(!filterExpiringSoon)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filterExpiringSoon
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expiring Soon</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <InventoryTable
        inventory={filteredInventory}
        onDelete={(id) => deleteInventory(id)}
      />

      {/* Add Inventory Modal */}
      <AddInventoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        products={products}
        onSubmit={(newItem) => addInventory(newItem)}
      />
    </div>
  );
}

