"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePharmacy } from "@/context/PharmacyContext";
import { Product } from "@/types/pharmacy";
import { MarginInsightsBanner } from "@/components/Products/MarginInsightsBanner";
import { ProductsTable } from "@/components/Products/ProductsTable";
import { AddProductModal } from "@/components/Products/AddProductModal";
import { EditProductModal } from "@/components/Products/EditProductModal";
import {
  Plus,
  Upload,
  Search,
  Filter,
  Package,
} from "lucide-react";

export default function ProductsPage() {
  const {
    products: rawProducts,
    marginInsights: rawMargin,
    currencySymbol,
    addProduct,
    updateProduct,
    deleteProduct,
  } = usePharmacy();

  const products = rawProducts || [];
  const marginInsights = rawMargin || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    (products || []).forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtering
  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => {
      if (selectedCategory !== "ALL" && p.category !== selectedCategory) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesGeneric = p.genericName?.toLowerCase().includes(q);
        const matchesSku = p.sku?.toLowerCase().includes(q);
        const matchesMfr = p.manufacturer?.toLowerCase().includes(q);
        if (!matchesName && !matchesGeneric && !matchesSku && !matchesMfr) {
          return false;
        }
      }

      return true;
    });
  }, [products, searchTerm, selectedCategory]);

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
            <span className="text-blue-600 font-semibold">Products</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Product Catalog</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {products.length} Products
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage pharmaceuticals, generics, pricing, prescription policies, and SKUs
          </p>
        </div>

        {/* Top Actions: Bulk Import & Add Product */}
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
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Margin Insights Collapsible Banner */}
      <MarginInsightsBanner
        insights={marginInsights}
        currencySymbol={currencySymbol}
      />

      {/* Filters Bar: Search & Category Dropdown */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, generic name, SKU, or manufacturer..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 placeholder-slate-400 transition-all"
          />
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <ProductsTable
        products={filteredProducts}
        onEdit={(p) => setEditingProduct(p)}
        onDelete={(id) => deleteProduct(id)}
        currencySymbol={currencySymbol}
      />

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={(newProd) => addProduct(newProd)}
        currencySymbol={currencySymbol}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        product={editingProduct}
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        onSubmit={(id, data) => updateProduct(id, data)}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}

