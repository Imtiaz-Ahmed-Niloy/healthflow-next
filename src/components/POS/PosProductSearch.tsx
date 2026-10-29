"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  X,
  Plus,
  Check,
  Package,
  Barcode,
  ArrowRight,
  Clock,
  History,
  Sparkles,
  Repeat,
  AlertTriangle,
  Pill,
  Layers,
  CircleDot,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export type DispenseUnit = "Box" | "Strip" | "Unit";

export interface PosProduct {
  id: string;
  name: string;
  genericName?: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  requiresPrescription?: boolean;
  dosage?: string;
  expiryDate?: string;
  supportsUnitDispensing?: boolean;
  packSize?: number;
  unitsPerStrip?: number;
  stripPrice?: number;
  unitPrice?: number;
  defaultUnit?: DispenseUnit;
}

interface PosProductSearchProps {
  products: PosProduct[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectProduct: (product: PosProduct, quantity?: number, unit?: DispenseUnit) => void;
  currencySymbol?: string;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export const RECENT_USES_STORAGE_KEY = "pharmacynext_pos_recent_uses_v1";
export const MAX_RECENT_USES = 9;

export function getRecentProductIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(RECENT_USES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, MAX_RECENT_USES);
      }
    }
  } catch {
    // Ignore error
  }
  return [];
}

export function saveRecentProductId(id: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const current = getRecentProductIds();
    const updated = [id, ...current.filter((it) => it !== id)].slice(
      0,
      MAX_RECENT_USES
    );
    localStorage.setItem(RECENT_USES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

// Helper to highlight matching text chunks
function HighlightMatch({ text, query }: { text?: string; query: string }) {
  if (!text) return null;
  if (!query || !query.trim()) return <span>{text}</span>;

  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-emerald-100/90 text-emerald-800 font-bold px-0.5 rounded-sm"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}

export function PosProductSearch({
  products,
  searchQuery,
  setSearchQuery,
  onSelectProduct,
  currencySymbol = "$",
  selectedCategory = "All",
  onSelectCategory,
}: PosProductSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [recentProductIds, setRecentProductIds] = useState<string[]>([]);
  const [activeGenericFilter, setActiveGenericFilter] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse quantity multiplier prefix if cashier types e.g. "3* para" or "2x amox"
  const parsedSearch = useMemo(() => {
    const trimmed = searchQuery.trim();
    const qtyMatch = trimmed.match(/^(\d+)\s*[*xX]\s*(.*)$/);
    if (qtyMatch) {
      return {
        multiplier: Math.max(1, parseInt(qtyMatch[1], 10) || 1),
        cleanQuery: qtyMatch[2].trim(),
      };
    }
    return {
      multiplier: 1,
      cleanQuery: trimmed,
    };
  }, [searchQuery]);

  // Load tracked recent 9 uses from localStorage or initialize with first 9 products
  useEffect(() => {
    const loaded = getRecentProductIds();
    if (loaded.length >= MAX_RECENT_USES) {
      setRecentProductIds(loaded);
    } else {
      const existingSet = new Set(loaded);
      const combined = [...loaded];
      for (const p of products) {
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
        // Ignore storage errors
      }
    }
  }, [products]);

  // Global keyboard shortcut to focus search: '/' or 'Ctrl+K'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (
        (e.key === "/" && !isInput) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to dismiss suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute the exact 9 recent used products
  const recentProducts = useMemo(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    const list: PosProduct[] = [];

    recentProductIds.forEach((id) => {
      const p = productMap.get(id);
      if (p) list.push(p);
    });

    if (list.length < MAX_RECENT_USES) {
      for (const p of products) {
        if (!list.some((item) => item.id === p.id)) {
          list.push(p);
          if (list.length >= MAX_RECENT_USES) break;
        }
      }
    }

    return list.slice(0, MAX_RECENT_USES);
  }, [products, recentProductIds]);

  // Compute generic substitutes map count
  const genericSubstituteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.genericName) {
        const key = p.genericName.toLowerCase().trim();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Suggestions: Prioritizes substitutes first if filter active, otherwise catalog with recent rank
  const suggestions = useMemo(() => {
    // 1. If Generic Substitute Filter is active
    if (activeGenericFilter) {
      const gFilter = activeGenericFilter.toLowerCase().trim();
      return products.filter((p) =>
        p.genericName?.toLowerCase().trim() === gFilter
      );
    }

    const q = parsedSearch.cleanQuery.toLowerCase();

    // 2. If no query, return recent 9 uses
    if (!q) {
      return recentProducts;
    }

    // 3. Search across the entire catalog with intelligent ranking
    const recentSet = new Set(recentProductIds);
    const matches = products.filter((p) => {
      const matchesName = p.name.toLowerCase().includes(q);
      const matchesGeneric = p.genericName?.toLowerCase().includes(q);
      const matchesSku = p.sku.toLowerCase().includes(q);
      const matchesCategory = p.category.toLowerCase().includes(q);
      return matchesName || matchesGeneric || matchesSku || matchesCategory;
    });

    // Sort: Exact SKU matches first, then recent items, then alphabetically
    matches.sort((a, b) => {
      const aSkuExact = a.sku.toLowerCase() === q ? 1 : 0;
      const bSkuExact = b.sku.toLowerCase() === q ? 1 : 0;
      if (aSkuExact !== bSkuExact) return bSkuExact - aSkuExact;

      const aRecent = recentSet.has(a.id) ? 1 : 0;
      const bRecent = recentSet.has(b.id) ? 1 : 0;
      if (aRecent !== bRecent) return bRecent - aRecent;

      return a.name.localeCompare(b.name);
    });

    return matches.slice(0, 12);
  }, [activeGenericFilter, parsedSearch.cleanQuery, recentProducts, products, recentProductIds]);

  // Reset activeIndex whenever suggestions list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions]);

  // Handle adding product with visual feedback & tracking recent use
  const handleAddProduct = (
    product: PosProduct,
    quantity = parsedSearch.multiplier,
    unit: DispenseUnit = product.defaultUnit || "Box"
  ) => {
    onSelectProduct(product, quantity, unit);
    const updated = saveRecentProductId(product.id);
    setRecentProductIds(updated);
    setLastAddedId(product.id);
    const unitLabel = unit !== "Box" ? ` [${unit}]` : "";
    setToastMessage(`Added ${quantity > 1 ? `${quantity}x ` : ""}"${product.name}"${unitLabel}`);

    setTimeout(() => {
      setLastAddedId(null);
    }, 1200);

    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Quick action: Filter by generic substitute
  const handleFilterSubstitutes = (genericName?: string) => {
    if (!genericName) return;
    setActiveGenericFilter(genericName);
    setIsOpen(true);
  };

  const handleClearGenericFilter = () => {
    setActiveGenericFilter(null);
    inputRef.current?.focus();
  };

  // Keyboard navigation within suggestions & barcode enter detection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setActiveIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length
        );
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const q = parsedSearch.cleanQuery.toLowerCase();

      // Check for exact barcode/SKU scan match first
      const exactSkuMatch = products.find(
        (p) => p.sku.toLowerCase() === q
      );

      if (exactSkuMatch) {
        handleAddProduct(exactSkuMatch, parsedSearch.multiplier);
        setSearchQuery("");
        setIsOpen(false);
        return;
      }

      if (suggestions.length > 0 && suggestions[activeIndex]) {
        handleAddProduct(suggestions[activeIndex], parsedSearch.multiplier);
        setSearchQuery("");
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (activeGenericFilter) {
        setActiveGenericFilter(null);
      } else {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
  };

  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Bar Input */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4 text-emerald-600 transition-colors" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (activeGenericFilter) setActiveGenericFilter(null);
            setIsOpen(true);
          }}
          onFocus={() => {
            const current = getRecentProductIds();
            if (current.length > 0) {
              setRecentProductIds(current);
            }
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search brand, generic formula, scan SKU, or type '3* name' for quantity..."
          className="w-full pl-10 pr-32 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-xs font-medium"
        />

        {/* Right Action Icons & Badges */}
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {parsedSearch.multiplier > 1 && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
              Qty: {parsedSearch.multiplier}x
            </span>
          )}

          {hasSearch ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveGenericFilter(null);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-mono bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200">
              <span>/</span>
              <span>or</span>
              <span>Ctrl K</span>
            </div>
          )}

          {/* Barcode scanner cue */}
          <div
            className="hidden md:flex items-center text-slate-400 px-1 py-0.5"
            title="Scan barcode or type SKU with USB gun"
          >
            <Barcode className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Floating Mini Toast Notification */}
      {toastMessage && (
        <div className="absolute -top-9 right-0 bg-emerald-800 text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-md flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150 z-50">
          <Check className="w-3.5 h-3.5 text-emerald-300" />
          <span className="truncate max-w-[260px]">{toastMessage}</span>
        </div>
      )}

      {/* Suggestions Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Active Generic Substitute Banner */}
          {activeGenericFilter && (
            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-900">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-slate-700" />
                <span className="font-semibold">
                  Showing Generic Substitutes for:
                </span>
                <span className="font-bold underline decoration-slate-400">
                  {activeGenericFilter}
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded-full font-bold">
                  {suggestions.length} available
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearGenericFilter}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
              >
                <span>Clear Filter</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Dropdown Header */}
          <div className="px-3.5 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-medium">
              {activeGenericFilter ? (
                <span className="text-slate-600 font-semibold text-xs">
                  Available Formulations & Brands
                </span>
              ) : hasSearch ? (
                <>
                  <Search className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold text-slate-700">
                    Suggested Products ({suggestions.length}{" "}
                    {suggestions.length === 1 ? "match" : "matches"})
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold text-slate-800">
                    Recent Uses
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full ml-0.5">
                    Fast Pick
                  </span>
                </>
              )}
            </div>

            {hasSearch ? (
              <span className="text-[11px] text-slate-400">
                Press{" "}
                <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono">
                  ↵ Enter
                </kbd>{" "}
                to add {parsedSearch.multiplier > 1 ? `(${parsedSearch.multiplier}x)` : ""}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <History className="w-3 h-3 text-slate-400" />
                <span>Frequently dispensed</span>
              </span>
            )}
          </div>

          {/* Dropdown Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100/70">
            {suggestions.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
                  <Package className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  No products found
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No medications match &quot;
                  <span className="font-semibold text-slate-700">
                    {parsedSearch.cleanQuery}
                  </span>
                  &quot;. Try checking for typos or searching by generic formula or SKU.
                </p>
                {selectedCategory !== "All" && onSelectCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory("All");
                    }}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    <span>Search across all categories</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              suggestions.map((product, index) => {
                const isSelected = index === activeIndex;
                const isRecentlyAdded = lastAddedId === product.id;
                const recentRank = recentProductIds.indexOf(product.id);
                const isRecent = recentRank >= 0;
                const substituteCount = product.genericName
                  ? genericSubstituteCounts[product.genericName.toLowerCase().trim()] || 1
                  : 1;

                const stockBadge =
                  product.stock > 20 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {product.stock} in stock
                    </span>
                  ) : product.stock > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      {product.stock} left (Low)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      Out of stock
                    </span>
                  );

                return (
                  <div
                    key={product.id}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleAddProduct(product)}
                    className={`group px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-emerald-50/70 border-l-4 border-emerald-600 pl-2.5"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Left: Product Info with Recency & Rx Badges */}
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Rx Only pill */}
                        {product.requiresPrescription && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-0.5">
                            <Pill className="w-2.5 h-2.5 text-red-600" />
                            Rx Only
                          </span>
                        )}

                        <span className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                          <HighlightMatch
                            text={product.name}
                            query={parsedSearch.cleanQuery}
                          />
                        </span>

                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          <HighlightMatch
                            text={product.category}
                            query={parsedSearch.cleanQuery}
                          />
                        </span>

                        {/* Recent pill badge */}
                        {isRecent && !hasSearch && (
                          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50/90 border border-emerald-200/60 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Recent #{recentRank + 1}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        {product.genericName && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFilterSubstitutes(product.genericName);
                            }}
                            className="truncate italic hover:text-slate-900 hover:underline cursor-pointer flex items-center gap-1"
                            title="Click to view all brands sharing this generic molecule"
                          >
                            <span>
                              <HighlightMatch
                                text={product.genericName}
                                query={parsedSearch.cleanQuery}
                              />
                            </span>
                          </button>
                        )}
                        {product.genericName && (
                          <span className="text-slate-300">•</span>
                        )}
                        <span className="font-mono text-[11px] text-slate-400">
                          SKU:{" "}
                          <HighlightMatch
                            text={product.sku}
                            query={parsedSearch.cleanQuery}
                          />
                        </span>

                        {product.expiryDate && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] text-slate-400">
                              Exp: {product.expiryDate}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Generic Substitute Trigger */}
                      {product.genericName && substituteCount > 1 && !activeGenericFilter && (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFilterSubstitutes(product.genericName);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                          >
                            <Repeat className="w-2.5 h-2.5 text-slate-700" />
                            <span>
                              {substituteCount - 1} Generic Substitute{substituteCount > 2 ? "s" : ""} Available
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Unit Dispensing Quick Buttons */}
                      {product.supportsUnitDispensing && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-medium">Dispense:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddProduct(product, parsedSearch.multiplier, "Box");
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                            title={`Dispense Full Box @ ${formatCurrency(product.price, currencySymbol)}`}
                          >
                            <Package className="w-3 h-3 text-slate-700 shrink-0" />
                            <span>Box</span>
                          </button>

                          {product.stripPrice && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddProduct(product, parsedSearch.multiplier, "Strip");
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                              title={`Dispense 1 Strip @ ${formatCurrency(product.stripPrice, currencySymbol)}`}
                            >
                              <Layers className="w-3 h-3 text-slate-700 shrink-0" />
                              <span>Strip</span>
                            </button>
                          )}

                          {product.unitPrice && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddProduct(product, parsedSearch.multiplier, "Unit");
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                              title={`Dispense Single Tablet @ ${formatCurrency(product.unitPrice, currencySymbol)}`}
                            >
                              <CircleDot className="w-3 h-3 text-slate-700 shrink-0" />
                              <span>Tab</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Stock, Price & Add Button */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right flex flex-col items-end">
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          {formatCurrency(product.price, currencySymbol)}
                        </span>
                        <div className="mt-0.5">{stockBadge}</div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddProduct(product);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          isRecentlyAdded
                            ? "bg-emerald-600 text-white shadow-xs"
                            : isSelected
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 group-hover:bg-emerald-600 group-hover:text-white"
                        }`}
                        title={
                          parsedSearch.multiplier > 1
                            ? `Add ${parsedSearch.multiplier} units to order`
                            : "Add to order"
                        }
                      >
                        {isRecentlyAdded ? (
                          <Check className="w-4 h-4 animate-in zoom-in" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer */}
          <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.2 bg-white border border-slate-200 rounded font-mono text-[10px]">
                  ↑
                </kbd>
                <kbd className="px-1 py-0.2 bg-white border border-slate-200 rounded font-mono text-[10px]">
                  ↓
                </kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-slate-200 rounded font-mono text-[10px]">
                  ↵ Enter
                </kbd>
                <span>Add</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-slate-200 rounded font-mono text-[10px]">
                  Esc
                </kbd>
                <span>Close</span>
              </span>
            </div>

            <span className="text-slate-400 hidden sm:inline">
              Tip: type &quot;3* name&quot; for quantity or scan barcode
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
