"use client";

import React, { useState, useMemo } from "react";
import {
  Boxes,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  Calendar,
  ThermometerSnowflake,
  Cpu,
  ArrowDownToLine,
  X,
} from "lucide-react";
import { LabLayout } from "@/components/lab/LabLayout";
import { INITIAL_REAGENTS, ReagentItem } from "@/lib/limsStore";
import { toast } from "sonner";

export default function LabInventoryView() {
  const [reagents, setReagents] = useState<ReagentItem[]>(INITIAL_REAGENTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Reagent Form
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<ReagentItem["category"]>("Reagents");
  const [newAnalyzer, setNewAnalyzer] = useState("Sysmex XN-1000");
  const [newLotNumber, setNewLotNumber] = useState("");
  const [newStock, setNewStock] = useState("10");
  const [newThreshold, setNewThreshold] = useState("5");
  const [newUnit, setNewUnit] = useState("Packs");
  const [newExpiry, setNewExpiry] = useState("2026-12-31");
  const [newStorage, setNewStorage] = useState("2°C – 8°C");

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = reagents.length;
    const lowStock = reagents.filter((r) => r.status === "low" || r.status === "critical").length;
    const adequate = reagents.filter((r) => r.status === "adequate").length;
    const expiringSoon = reagents.filter((r) => {
      const exp = new Date(r.expiryDate).getTime();
      const now = new Date("2026-10-24").getTime();
      const diffDays = (exp - now) / (1000 * 3600 * 24);
      return diffDays <= 30;
    }).length;

    return { total, lowStock, adequate, expiringSoon };
  }, [reagents]);

  // Handle restock
  const handleRestock = (id: string) => {
    setReagents((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const newCount = r.stock + 10;
        return {
          ...r,
          stock: newCount,
          status: newCount > r.minThreshold ? "adequate" : "low",
        };
      })
    );
    toast.success("Added +10 units to stock");
  };

  const handleAddReagent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newLotNumber.trim()) {
      toast.error("Please fill in name and lot number");
      return;
    }

    const stockNum = parseInt(newStock) || 0;
    const minNum = parseInt(newThreshold) || 1;

    const item: ReagentItem = {
      id: `reg-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      analyzer: newAnalyzer,
      lotNumber: newLotNumber.trim(),
      stock: stockNum,
      minThreshold: minNum,
      unit: newUnit,
      expiryDate: newExpiry,
      storageCondition: newStorage,
      status: stockNum <= minNum ? (stockNum === 0 ? "critical" : "low") : "adequate",
    };

    setReagents([item, ...reagents]);
    toast.success(`Reagent '${item.name}' added to inventory!`);
    setIsAddModalOpen(false);
    setNewName("");
    setNewLotNumber("");
  };

  const filteredReagents = useMemo(() => {
    return reagents.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.analyzer.toLowerCase().includes(q) ||
          r.lotNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reagents, categoryFilter, statusFilter, searchTerm]);

  return (
    <LabLayout
      title="Reagents & Lab Inventory"
      subtitle="Laboratory reagent packs, calibrator control sera, vacuum tubes & cold-chain stock management"
      actions={
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Receive New Lot
        </button>
      }
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Total SKUs</span>
            <Boxes className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-foreground">{metrics.total}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Tracked materials</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Adequate Stock</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            {metrics.adequate}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Healthy buffer</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-amber-600 dark:text-amber-400">
            {metrics.lowStock}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Below reorder point</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Expiring &lt; 30 Days</span>
            <Clock className="h-4 w-4 text-destructive" />
          </div>
          <div className="mt-2 text-2xl font-bold font-display text-destructive">
            {metrics.expiringSoon}
          </div>
          <p className="text-[11px] text-destructive/80 mt-0.5">Immediate usage priority</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reagents, analyzers, or lot numbers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="Reagents">Reagents</option>
            <option value="Calibrators & Controls">Calibrators & Controls</option>
            <option value="Consumables">Consumables (Vials)</option>
            <option value="Kits">Rapid Test Kits</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Levels</option>
            <option value="adequate">Adequate</option>
            <option value="low">Low Stock</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Reagents Table */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground">
                <th className="py-3 px-4 font-semibold">REAGENT NAME & CATEGORY</th>
                <th className="py-3 px-4 font-semibold">ASSIGNED ANALYZER</th>
                <th className="py-3 px-4 font-semibold">LOT NUMBER</th>
                <th className="py-3 px-4 font-semibold">STORAGE TEMP</th>
                <th className="py-3 px-4 font-semibold">EXPIRATION DATE</th>
                <th className="py-3 px-4 font-semibold">CURRENT ON-HAND</th>
                <th className="py-3 px-4 font-semibold">STATUS</th>
                <th className="py-3 px-4 text-right font-semibold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredReagents.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-foreground">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground">{item.category}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-foreground/90">{item.analyzer}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                    {item.lotNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ThermometerSnowflake className="h-3 w-3 text-sky-500" />
                      {item.storageCondition}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-foreground">{item.expiryDate}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-sm text-foreground">{item.stock}</span>{" "}
                    <span className="text-[11px] text-muted-foreground">
                      {item.unit} (Min: {item.minThreshold})
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === "adequate"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : item.status === "low"
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-destructive text-destructive-foreground animate-pulse"
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleRestock(item.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition"
                    >
                      + Restock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Lot Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-semibold text-base text-foreground">Receive Reagent Lot</h3>
                <p className="text-xs text-muted-foreground">Log new diagnostic kit or consumable batch</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddReagent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Reagent / Material Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Roche Cobas Total Bilirubin Reagent"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                  >
                    <option value="Reagents">Reagents</option>
                    <option value="Calibrators & Controls">Calibrators & Controls</option>
                    <option value="Consumables">Consumables</option>
                    <option value="Kits">Kits</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Target Instrument</label>
                  <input
                    type="text"
                    value={newAnalyzer}
                    onChange={(e) => setNewAnalyzer(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Lot Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LOT-2026-B8"
                    value={newLotNumber}
                    onChange={(e) => setNewLotNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Expiration Date *</label>
                  <input
                    type="date"
                    required
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Quantity Received</label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Reorder Point</label>
                  <input
                    type="number"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Package Unit</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="e.g. Box, Cassette"
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Storage Condition</label>
                <select
                  value={newStorage}
                  onChange={(e) => setNewStorage(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl focus:outline-none"
                >
                  <option value="2°C – 8°C (Refrigerated)">2°C – 8°C (Refrigerated)</option>
                  <option value="-20°C (Deep Freeze)">-20°C (Deep Freeze)</option>
                  <option value="15°C – 25°C (Room Temp)">15°C – 25°C (Room Temp)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Confirm & Receive Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </LabLayout>
  );
}
