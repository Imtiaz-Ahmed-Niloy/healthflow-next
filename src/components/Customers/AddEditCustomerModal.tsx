"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  UserPlus,
  Edit3,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Coins,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Customer, LoyaltyTier } from "@/types/pharmacy";
import { usePharmacy } from "@/context/PharmacyContext";

interface AddEditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
  prefillPhone?: string;
  onSaved?: (customer: Customer) => void;
}

export function AddEditCustomerModal({
  isOpen,
  onClose,
  customerToEdit,
  prefillPhone,
  onSaved,
}: AddEditCustomerModalProps) {
  const { addCustomer, updateCustomer, user } = usePharmacy();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [loyaltyTier, setLoyaltyTier] = useState<LoyaltyTier>("Bronze");
  const [initialBonusPoints, setInitialBonusPoints] = useState<string>("100");
  const [allergiesInput, setAllergiesInput] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (customerToEdit) {
        setName(customerToEdit.name);
        setPhone(customerToEdit.phone);
        setEmail(customerToEdit.email || "");
        setAddress(customerToEdit.address || "");
        setLoyaltyTier(customerToEdit.loyaltyTier);
        setInitialBonusPoints(customerToEdit.points.toString());
        setAllergiesInput(customerToEdit.allergies?.join(", ") || "");
        setNotes(customerToEdit.notes || "");
      } else {
        setName("");
        setPhone(prefillPhone || "");
        setEmail("");
        setAddress("");
        setLoyaltyTier("Bronze");
        setInitialBonusPoints("100"); // 100 welcome reward points
        setAllergiesInput("");
        setNotes("");
      }
    }
  }, [isOpen, customerToEdit, prefillPhone]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const parsedAllergies = allergiesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const pad = (n: number) => n.toString().padStart(2, "0");
    const now = new Date();
    const todayStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const pts = parseInt(initialBonusPoints, 10) || 0;

    if (customerToEdit) {
      updateCustomer(customerToEdit.id, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        loyaltyTier,
        allergies: parsedAllergies,
        notes: notes.trim() || undefined,
      });
      if (onSaved) onSaved({ ...customerToEdit, name, phone, loyaltyTier });
    } else {
      const welcomeHistory =
        pts > 0
          ? [
              {
                id: `lph-${Date.now()}`,
                date: todayStr,
                timestamp: Date.now(),
                type: "BONUS" as const,
                points: pts,
                reason: "Loyalty Program Welcome Gift Bonus",
                processedBy: user?.name || "Pharmacy Admin",
              },
            ]
          : [];

      const newCustomer = addCustomer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        loyaltyTier,
        points: pts,
        lifetimePointsEarned: pts,
        lifetimePointsRedeemed: 0,
        totalSpent: 0,
        totalOrders: 0,
        balance: 0,
        joinedDate: todayStr,
        lastVisit: todayStr,
        status: "ACTIVE",
        allergies: parsedAllergies,
        notes: notes.trim() || undefined,
        pointsHistory: welcomeHistory,
      });

      if (onSaved) onSaved(newCustomer);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#f8faf9]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              {customerToEdit ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {customerToEdit ? "Edit Customer Profile" : "Register Loyalty Customer"}
              </h2>
              <p className="text-xs text-slate-500">
                {customerToEdit
                  ? "Update customer details and contact info"
                  : "Enrolls patient into rewards program with phone lookup"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Email & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@domain.com"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Street Address / City
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Health Ave, Suite 10"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Loyalty Tier & Initial Bonus */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Membership Tier
              </label>
              <select
                value={loyaltyTier}
                onChange={(e) => setLoyaltyTier(e.target.value as LoyaltyTier)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
              >
                <option value="Bronze">🥉 Bronze (1.0x Base Multiplier)</option>
                <option value="Silver">🥈 Silver (1.25x Multiplier)</option>
                <option value="Gold">🥇 Gold (1.5x Multiplier)</option>
                <option value="Platinum">💎 Platinum (2.0x VIP Multiplier)</option>
              </select>
            </div>

            {!customerToEdit && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Welcome Reward Points
                </label>
                <div className="relative">
                  <Coins className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                  <input
                    type="number"
                    min="0"
                    value={initialBonusPoints}
                    onChange={(e) => setInitialBonusPoints(e.target.value)}
                    placeholder="100"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 placeholder-slate-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Drug Allergies */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Drug Allergies <span className="text-slate-400 font-normal">(Comma separated)</span>
            </label>
            <input
              type="text"
              value={allergiesInput}
              onChange={(e) => setAllergiesInput(e.target.value)}
              placeholder="e.g. Penicillin, Sulfa drugs, Aspirin"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
            />
          </div>

          {/* Medical & Pharmacy Notes */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Pharmacy & Patient Care Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Monthly hypertension refill, senior discount eligible, prefers generic syrups..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {customerToEdit ? "Save Profile Changes" : "Save & Enroll Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
