"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi, SectionTitle } from "@/components/admin/ui";
import { DataTable, Toolbar, Modal, Chips, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { useFormatters } from "@/lib/appSettings";
import {
  Truck, CheckCircle2, Navigation, Activity,
  Phone, Wind, Plus,
} from "lucide-react";

type Ambulance = {
  id: string;
  vehicle_number: string;
  vehicle_model?: string | null;
  type: "basic" | "icu" | "ac" | "cardiac";
  driver_name: string;
  driver_phone: string;
  status: "available" | "on_trip" | "maintenance" | "out_of_service";
  has_oxygen: boolean;
  has_ventilator: boolean;
  base_charge: number;
  charge_per_km: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function AmbulanceView() {
  const { formatCurrency } = useFormatters();
  const { push } = useNotifications();
  const { items: fleet, isLoading, create, update, remove } = useResourceCrud<Ambulance>("ambulance-fleet");

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Ambulance | null>(null);
  const [saving, setSaving] = useState(false);

  // Form draft
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleModel, setVehicleModel] = useState("Toyota HiAce High-Roof");
  const [type, setType] = useState<"basic" | "icu" | "ac" | "cardiac">("icu");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [status, setStatus] = useState<"available" | "on_trip" | "maintenance" | "out_of_service">("available");
  const [hasOxygen, setHasOxygen] = useState(true);
  const [hasVentilator, setHasVentilator] = useState(false);
  const [baseCharge, setBaseCharge] = useState("1500");
  const [chargePerKm, setChargePerKm] = useState("50");
  const [notes, setNotes] = useState("");

  // KPI calculations
  const totalAmbulances = fleet.length;
  const availableCount = fleet.filter((a) => a.status === "available").length;
  const onTripCount = fleet.filter((a) => a.status === "on_trip").length;
  const maintenanceCount = fleet.filter((a) => a.status === "maintenance" || a.status === "out_of_service").length;
  const criticalUnitsCount = fleet.filter((a) => a.type === "icu" || a.type === "cardiac" || a.has_ventilator).length;

  const filteredFleet = useMemo(() => {
    return fleet.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (!q) return true;
      const term = q.toLowerCase();
      return (
        a.vehicle_number.toLowerCase().includes(term) ||
        (a.vehicle_model && a.vehicle_model.toLowerCase().includes(term)) ||
        a.driver_name.toLowerCase().includes(term) ||
        a.driver_phone.toLowerCase().includes(term)
      );
    });
  }, [fleet, statusFilter, typeFilter, q]);

  const handleOpenAdd = () => {
    setEditing(null);
    setVehicleNumber("");
    setVehicleModel("Toyota HiAce High-Roof");
    setType("icu");
    setDriverName("");
    setDriverPhone("");
    setStatus("available");
    setHasOxygen(true);
    setHasVentilator(false);
    setBaseCharge("1500");
    setChargePerKm("50");
    setNotes("");
    setAddOpen(true);
  };

  const handleOpenEdit = (amb: Ambulance) => {
    setEditing(amb);
    setVehicleNumber(amb.vehicle_number);
    setVehicleModel(amb.vehicle_model || "");
    setType(amb.type);
    setDriverName(amb.driver_name);
    setDriverPhone(amb.driver_phone);
    setStatus(amb.status);
    setHasOxygen(amb.has_oxygen);
    setHasVentilator(amb.has_ventilator);
    setBaseCharge(String(amb.base_charge ?? 0));
    setChargePerKm(String(amb.charge_per_km ?? 0));
    setNotes(amb.notes || "");
    setAddOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim() || !driverName.trim() || !driverPhone.trim()) {
      push({ title: "Please fill required fields (Vehicle number, driver name & phone)", tone: "bad" });
      return;
    }

    const payload = {
      vehicle_number: vehicleNumber.trim(),
      vehicle_model: vehicleModel.trim() || undefined,
      type,
      driver_name: driverName.trim(),
      driver_phone: driverPhone.trim(),
      status,
      has_oxygen: hasOxygen,
      has_ventilator: hasVentilator,
      base_charge: Number(baseCharge) || 0,
      charge_per_km: Number(chargePerKm) || 0,
      notes: notes.trim() || undefined,
    };

    if (editing) {
      const ok = await update(editing.id, payload);
      if (ok) {
        push({ title: "Ambulance vehicle updated", tone: "ok" });
        setAddOpen(false);
      }
    } else {
      const ok = await create(payload);
      if (ok) {
        push({ title: "Ambulance vehicle registered", tone: "ok" });
        setAddOpen(false);
      }
    }
  };

  const handleQuickStatus = async (id: string, newStatus: Ambulance["status"]) => {
    const ok = await update(id, { status: newStatus });
    if (ok) {
      push({
        title: `Vehicle marked as ${newStatus.replace("_", " ")}`,
        tone: newStatus === "available" ? "ok" : newStatus === "on_trip" ? "warn" : "info",
      });
    }
  };

  const columns: Column<Ambulance>[] = [
    {
      key: "vehicle_number",
      label: "Vehicle & Specs",
      render: (r) => (
        <div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{r.vehicle_number}</span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
            <span>{r.vehicle_model || "Standard Ambulance"}</span>
            <span className="capitalize font-medium text-emerald-600 dark:text-emerald-400">
              {r.type.toUpperCase()}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "driver_name",
      label: "Driver / Pilot",
      render: (r) => (
        <div>
          <div className="font-medium text-zinc-800 dark:text-zinc-200">{r.driver_name}</div>
          <a
            href={`tel:${r.driver_phone}`}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
          >
            <Phone className="w-3 h-3" />
            <span>{r.driver_phone}</span>
          </a>
        </div>
      ),
    },
    {
      key: "equipment",
      label: "Medical Equipment",
      render: (r) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {r.has_oxygen && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
              <Wind className="w-2.5 h-2.5" /> O₂ Oxygen
            </span>
          )}
          {r.has_ventilator && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <Activity className="w-2.5 h-2.5" /> Ventilator
            </span>
          )}
          {!r.has_oxygen && !r.has_ventilator && (
            <span className="text-xs text-zinc-400">Basic Transport</span>
          )}
        </div>
      ),
    },
    {
      key: "tariff",
      label: "Emergency Fare Tariff",
      render: (r) => (
        <div className="text-xs text-zinc-700 dark:text-zinc-300 font-mono">
          <div>Base: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(r.base_charge)}</span></div>
          <div className="text-[11px] text-zinc-500">+{formatCurrency(r.charge_per_km)}/km</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Availability",
      render: (r) => {
        const toneMap: Record<Ambulance["status"], "ok" | "warn" | "default" | "bad"> = {
          available: "ok",
          on_trip: "warn",
          maintenance: "default",
          out_of_service: "bad",
        };
        const labelMap: Record<Ambulance["status"], string> = {
          available: "Available",
          on_trip: "On Mission / Trip",
          maintenance: "Maintenance",
          out_of_service: "Out of Service",
        };
        return <Pill tone={toneMap[r.status]}>{labelMap[r.status]}</Pill>;
      },
    },
    {
      key: "quick_action",
      label: "Quick Dispatch",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.status === "available" ? (
            <button
              type="button"
              onClick={() => handleQuickStatus(r.id, "on_trip")}
              className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium hover:bg-amber-500/20 transition-colors flex items-center gap-1"
            >
              <Navigation className="w-3 h-3" /> Dispatch
            </button>
          ) : r.status === "on_trip" ? (
            <button
              type="button"
              onClick={() => handleQuickStatus(r.id, "available")}
              className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" /> Return to Base
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleQuickStatus(r.id, "available")}
              className="text-xs px-2 py-1 rounded bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 font-medium hover:bg-zinc-500/20 transition-colors flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" /> Mark Ready
            </button>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="text-right">
          <RowActions
            onEdit={() => handleOpenEdit(r)}
            onDelete={async () => {
              if (confirm(`Remove vehicle ${r.vehicle_number} from fleet?`)) {
                await remove(r.id);
              }
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Ambulance Fleet & Emergency Dispatch"
      subtitle="Real-time ambulance tracking, driver contacts, medical life-support equipment, and trip tariffs."
    >
      <div className="space-y-6">
        {/* Fleet KPI Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            label="Total Fleet Size"
            value={totalAmbulances}
            icon={Truck}
            hint="Hospital emergency vehicles"
          />
          <Kpi
            label="Available On-Base"
            value={availableCount}
            icon={CheckCircle2}
            hint="Ready for instant dispatch"
            tone="ok"
          />
          <Kpi
            label="Dispatched / On Trip"
            value={onTripCount}
            icon={Navigation}
            hint="En route or hospital transfers"
            tone="accent"
          />
          <Kpi
            label="Critical Care (ICU/O₂)"
            value={criticalUnitsCount}
            icon={Activity}
            hint="Ventilator & life support"
            tone="primary"
          />
        </div>

        {/* Fleet Directory Card */}
        <Card>
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle
                title="Ambulance Roster & Availability"
              />
              <div className="flex items-center gap-2">
                <Btn
                  variant="outline"
                  onClick={() => exportCSV(filteredFleet, "ambulance-fleet.csv")}
                  className="text-xs py-1.5 px-3"
                >
                  Export CSV
                </Btn>
                <Btn
                  variant="primary"
                  onClick={handleOpenAdd}
                  className="text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Ambulance
                </Btn>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Chips
                options={[
                  { value: "all", label: `All Vehicles (${fleet.length})` },
                  { value: "available", label: `Available (${availableCount})` },
                  { value: "on_trip", label: `On Mission (${onTripCount})` },
                  { value: "maintenance", label: `Maintenance (${maintenanceCount})` },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />

              <div className="flex items-center gap-2">
                <Chips
                  options={[
                    { value: "all", label: "All Types" },
                    { value: "icu", label: "ICU" },
                    { value: "cardiac", label: "Cardiac" },
                    { value: "basic", label: "Basic" },
                  ]}
                  value={typeFilter}
                  onChange={setTypeFilter}
                />
              </div>
            </div>
          </div>

          <Toolbar
            search={q}
            onSearch={setQ}
          />

          <DataTable
            rows={filteredFleet}
            columns={columns}
            empty="No ambulance vehicles found matching current criteria."
          />
        </Card>
      </div>

      {/* Add / Edit Ambulance Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={editing ? "Edit Ambulance Vehicle" : "Register New Ambulance"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Vehicle Registration Number *
              </label>
              <input
                type="text"
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. DHK-METRO-CHA-11-2045"
                className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-transparent text-zinc-900 dark:text-zinc-100 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Vehicle Model / Make
              </label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="e.g. Toyota HiAce High-Roof"
                className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-transparent text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Ambulance Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Ambulance["type"])}
                className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-transparent text-zinc-900 dark:text-zinc-100"
              >
                <option value="basic">Basic Life Support (BLS)</option>
                <option value="ac">Air Conditioned (AC)</option>
                <option value="icu">Intensive Care Unit (ICU)</option>
                <option value="cardiac">Cardiac Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Current Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Ambulance["status"])}
                className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-transparent text-zinc-900 dark:text-zinc-100"
              >
                <option value="available">Available (On-Base)</option>
                <option value="on_trip">On Mission / Dispatched</option>
                <option value="maintenance">Under Maintenance</option>
                <option value="out_of_service">Out of Service</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Driver / Pilot Name *
              </label>
              <input
                type="text"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Mohammad Rafiq"
                className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-transparent text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Driver Contact Phone *
              </label>
              <input
                type="tel"
                required
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="e.g. +880 1712-345678"
                className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-transparent text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Life support flags */}
          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
              Life Support & Medical Fit-outs
            </span>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={hasOxygen}
                  onChange={(e) => setHasOxygen(e.target.checked)}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Wind className="w-3.5 h-3.5 text-cyan-500" />
                Medical Oxygen Cylinder & Mask
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={hasVentilator}
                  onChange={(e) => setHasVentilator(e.target.checked)}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Activity className="w-3.5 h-3.5 text-purple-500" />
                Transport Ventilator Onboard
              </label>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Base Callout Fee (Tk)
              </label>
              <input
                type="number"
                min="0"
                value={baseCharge}
                onChange={(e) => setBaseCharge(e.target.value)}
                className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-transparent text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Per-Kilometre Rate (Tk)
              </label>
              <input
                type="number"
                min="0"
                value={chargePerKm}
                onChange={(e) => setChargePerKm(e.target.value)}
                className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-transparent text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Internal Vehicle Notes / Maintenance Log
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Next fitness check due in 3 months; equipped with suction unit."
              className="w-full text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-transparent text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Btn variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update Vehicle" : "Register Ambulance"}
            </Btn>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
