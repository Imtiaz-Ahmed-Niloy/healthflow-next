"use client";

import React, { useState } from "react";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  DollarSign,
  Calendar,
  Award,
  Coins,
  Gift,
  Settings as SettingsIcon,
  Sparkles,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";
import { Customer } from "@/types/pharmacy";
import { formatCurrency } from "@/lib/utils";
import { CustomerPhoneSearch } from "@/components/Customers/CustomerPhoneSearch";
import { CustomerDatabaseTable } from "@/components/Customers/CustomerDatabaseTable";
import { AwardPointsModal } from "@/components/Customers/AwardPointsModal";
import { RedeemPointsModal } from "@/components/Customers/RedeemPointsModal";
import { CustomerDetailModal } from "@/components/Customers/CustomerDetailModal";
import { AddEditCustomerModal } from "@/components/Customers/AddEditCustomerModal";
import { LoyaltySettingsModal } from "@/components/Customers/LoyaltySettingsModal";

export default function CustomersPage() {
  const { customers, loyaltySettings, currencySymbol } = usePharmacy();

  // Modals state
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Active target customer for modals
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [prefillPhone, setPrefillPhone] = useState<string>("");

  // Handlers
  const handleOpenAward = (customer?: Customer) => {
    setSelectedCustomer(customer || null);
    setAwardModalOpen(true);
  };

  const handleOpenRedeem = (customer: Customer) => {
    setSelectedCustomer(customer);
    setRedeemModalOpen(true);
  };

  const handleOpenDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailModalOpen(true);
  };

  const handleOpenAddCustomer = (phone?: string) => {
    setSelectedCustomer(null);
    setPrefillPhone(phone || "");
    setAddEditModalOpen(true);
  };

  const handleOpenEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPrefillPhone("");
    setAddEditModalOpen(true);
  };

  // Top Statistics Calculations
  const totalPoints = customers.reduce((sum, c) => sum + (c.points || 0), 0);
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const totalOrders = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
  const pointsLiability = Number(
    (totalPoints / (loyaltySettings.redemptionRate || 100)).toFixed(2)
  );

  const platinumCount = customers.filter((c) => c.loyaltyTier === "Platinum").length;
  const goldCount = customers.filter((c) => c.loyaltyTier === "Gold").length;
  const silverCount = customers.filter((c) => c.loyaltyTier === "Silver").length;
  const bronzeCount = customers.filter((c) => c.loyaltyTier === "Bronze").length;

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-emerald-700 font-semibold">Customers</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Customer Loyalty & Rewards
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search customer records by phone, manage loyalty tiers, and award points on pharmacy purchases
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenAward()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Award Purchase Points</span>
          </button>

          <button
            onClick={() => handleOpenAddCustomer()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-700" />
            <span>Add Member</span>
          </button>

          <button
            onClick={() => setSettingsModalOpen(true)}
            className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
            title="Configure Loyalty Program Rules"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Enrolled Customers */}
        <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/25">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-emerald-200" />
              <p className="text-sm font-medium text-emerald-100">Enrolled Customers</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-white">
              {customers.length}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-200">
              <span className="inline-flex items-center font-semibold text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 mr-1.5" />
                Active Profiles
              </span>
              <span>• Registered loyalty members</span>
            </div>
          </div>
        </div>

        {/* Card 2: Outstanding Reward Points */}
        <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-green-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/25">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-emerald-200" />
              <p className="text-sm font-medium text-emerald-100">Reward Points Pool</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-white">
              {totalPoints.toLocaleString()}{" "}
              <span className="text-sm font-normal text-emerald-200">pts</span>
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-200">
              <span>≈ {formatCurrency(pointsLiability, currencySymbol)} redemption liability</span>
            </div>
          </div>
        </div>

        {/* Card 3: Loyalty Member Revenue */}
        <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-teal-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/25">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-teal-200" />
              <p className="text-sm font-medium text-emerald-100">Member Sales Revenue</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-white">
              {formatCurrency(totalRevenue, currencySymbol)}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-200">
              <span className="font-semibold text-white">{totalOrders} purchases</span>
              <span>• Lifetime member orders</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tier Distribution */}
        <div className="rounded-lg relative overflow-hidden p-5 bg-gradient-to-br from-emerald-800 to-emerald-950 text-white border-0 shadow-lg shadow-emerald-950/30 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <p className="text-sm font-medium text-emerald-200">Tiers Breakdown</p>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mt-2 text-center">
              <div className="bg-white/10 border border-white/15 py-1.5 rounded-lg">
                <div className="text-[10px] font-bold text-emerald-200">Platinum</div>
                <div className="text-xs font-bold text-white mt-0.5">{platinumCount}</div>
              </div>
              <div className="bg-white/10 border border-white/15 py-1.5 rounded-lg">
                <div className="text-[10px] font-bold text-emerald-200">Gold</div>
                <div className="text-xs font-bold text-white mt-0.5">{goldCount}</div>
              </div>
              <div className="bg-white/10 border border-white/15 py-1.5 rounded-lg">
                <div className="text-[10px] font-bold text-emerald-200">Silver</div>
                <div className="text-xs font-bold text-white mt-0.5">{silverCount}</div>
              </div>
              <div className="bg-white/10 border border-white/15 py-1.5 rounded-lg">
                <div className="text-[10px] font-bold text-emerald-200">Bronze</div>
                <div className="text-xs font-bold text-white mt-0.5">{bronzeCount}</div>
              </div>
            </div>
            <div className="text-[10px] text-emerald-300/80 mt-2 text-center">
              Bronze (1x) • Silver (1.25x) • Gold (1.5x) • VIP (2x)
            </div>
          </div>
        </div>
      </div>

      {/* Feature 1: Customer Phone Search Feature */}
      <CustomerPhoneSearch
        onAwardPoints={(c) => handleOpenAward(c)}
        onRedeemPoints={(c) => handleOpenRedeem(c)}
        onViewDetails={(c) => handleOpenDetail(c)}
        onAddCustomerWithPhone={(phone) => handleOpenAddCustomer(phone)}
      />

      {/* Feature 2: Customer Database Table */}
      <CustomerDatabaseTable
        onAwardPoints={(c) => handleOpenAward(c)}
        onRedeemPoints={(c) => handleOpenRedeem(c)}
        onViewDetails={(c) => handleOpenDetail(c)}
        onEditCustomer={(c) => handleOpenEditCustomer(c)}
      />

      {/* Modals */}
      <AwardPointsModal
        isOpen={awardModalOpen}
        onClose={() => setAwardModalOpen(false)}
        targetCustomer={selectedCustomer}
      />

      <RedeemPointsModal
        isOpen={redeemModalOpen}
        onClose={() => setRedeemModalOpen(false)}
        customer={selectedCustomer}
      />

      <CustomerDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        customer={selectedCustomer}
        onAwardPoints={(c) => {
          setDetailModalOpen(false);
          handleOpenAward(c);
        }}
        onRedeemPoints={(c) => {
          setDetailModalOpen(false);
          handleOpenRedeem(c);
        }}
        onEditCustomer={(c) => {
          setDetailModalOpen(false);
          handleOpenEditCustomer(c);
        }}
      />

      <AddEditCustomerModal
        isOpen={addEditModalOpen}
        onClose={() => setAddEditModalOpen(false)}
        customerToEdit={selectedCustomer}
        prefillPhone={prefillPhone}
        onSaved={(c) => {
          setSelectedCustomer(c);
        }}
      />

      <LoyaltySettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
}

