"use client";

import React, { useState } from "react";
import {
  X,
  Boxes,
  Package,
  Barcode,
  Calendar,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { Product, InventoryItem } from "@/types/pharmacy";

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSubmit: (item: Omit<InventoryItem, "id" | "status" | "expiryTimestamp">) => void;
}

export const AddInventoryModal: React.FC<AddInventoryModalProps> = ({
  isOpen,
  onClose,
  products,
  onSubmit,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products[0]?.id || ""
  );
  const [batchNumber, setBatchNumber] = useState<string>("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [location, setLocation] = useState<string>("Main");
  const [reorderLevel, setReorderLevel] = useState<number | "">(20);
  const [expiryDate, setExpiryDate] = useState<string>("");

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    // Convert date YYYY-MM-DD from input to DD/MM/YYYY
    let formattedDate = expiryDate;
    if (expiryDate.includes("-")) {
      const parts = expiryDate.split("-");
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    const finalBatch =
      batchNumber.trim() ||
      `BT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    onSubmit({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      genericName: selectedProduct.genericName,
      sku: selectedProduct.sku,
      batchNumber: finalBatch,
      quantity: typeof quantity === "number" ? quantity : 0,
      reorderLevel: typeof reorderLevel === "number" ? reorderLevel : 20,
      location: location.trim() || "Main",
      expiryDate: formattedDate || "31/12/2027",
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Inventory</h2>
              <p className="text-xs text-slate-500">
                Receive and record new batch stock into the pharmacy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Select Product */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span>Product</span>
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Batch Number & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-slate-400" />
                <span>Batch Number</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. BT-587423"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-slate-400" />
                <span>Quantity</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                value={quantity}
                onChange={(e) =>
                  setQuantity(e.target.value === "" ? "" : parseInt(e.target.value))
                }
                placeholder="Enter quantity"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder-slate-400"
              />
            </div>
          </div>

          {/* Location & Reorder Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Storage Location</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. A1, Branch, Cold Storage"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                <span>Reorder Level</span>
              </label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) =>
                  setReorderLevel(e.target.value === "" ? "" : parseInt(e.target.value))
                }
                placeholder="e.g. 20"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder-slate-400"
              />
            </div>
          </div>

          {/* Expiry Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Expiry Date</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
            >
              Add Inventory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
