"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  Globe,
  FileText,
  Percent,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Building2,
  Clock,
  Receipt,
  BadgeCheck,
  ArrowRight,
  ShieldCheck,
  DollarSign,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";

type SettingsTab = "business" | "localization" | "invoice" | "tax";

interface BusinessForm {
  pharmacyName: string;
  email: string;
  address: string;
  phone: string;
  registrationNumber: string;
  taxId: string;
}

interface LocalizationForm {
  currency: string;
  dateFormat: string;
  timeZone: string;
}

interface InvoiceForm {
  invoicePrefix: string;
  invoiceFooter: string;
  paymentTerms: string;
}

interface TaxForm {
  applyTax: boolean;
  taxLabel: string;
  rate: number;
}

const DEFAULT_BUSINESS: BusinessForm = {
  pharmacyName: "HealthFlow Pharma",
  email: "admin@pharmacy.com",
  address: "House 14, Road 5, Dhanmondi, Dhaka-1205",
  phone: "+880 1711-234567",
  registrationNumber: "DGDA-PH-98421",
  taxId: "BIN-847291048",
};

const DEFAULT_LOCALIZATION: LocalizationForm = {
  currency: "USD",
  dateFormat: "MM/DD/YYYY",
  timeZone: "UTC",
};

const DEFAULT_INVOICE: InvoiceForm = {
  invoicePrefix: "INV",
  invoiceFooter: "Thank you for trusting us with your health. Please keep this receipt for returns.",
  paymentTerms: "Payment is due immediately at counter upon dispensing.",
};

const DEFAULT_TAX: TaxForm = {
  applyTax: true,
  taxLabel: "VAT",
  rate: 16,
};

const SETTINGS_STORAGE_KEY = "pharmacynext_system_settings_v1";

export default function SystemSettingsPage() {
  const { user, setCurrencySymbol, currencySymbol } = usePharmacy();
  const [activeTab, setActiveTab] = useState<SettingsTab>("business");

  // Form states
  const [business, setBusiness] = useState<BusinessForm>(DEFAULT_BUSINESS);
  const [localization, setLocalization] = useState<LocalizationForm>(DEFAULT_LOCALIZATION);
  const [invoice, setInvoice] = useState<InvoiceForm>(DEFAULT_INVOICE);
  const [tax, setTax] = useState<TaxForm>(DEFAULT_TAX);

  // Status feedback toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Load persisted settings on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.business) setBusiness(parsed.business);
        if (parsed.localization) setLocalization(parsed.localization);
        if (parsed.invoice) setInvoice(parsed.invoice);
        if (parsed.tax) setTax(parsed.tax);
      } else if (user?.storeName) {
        setBusiness((prev) => ({ ...prev, pharmacyName: user.storeName }));
      }
    } catch (e) {
      console.error("Error reading saved settings", e);
    }
  }, [user]);

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const allSettings = { business, localization, invoice, tax };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(allSettings));

      // Synchronize currency symbol with PharmacyContext
      if (localization.currency === "USD") setCurrencySymbol("$");
      else if (localization.currency === "EUR") setCurrencySymbol("€");
      else if (localization.currency === "GBP") setCurrencySymbol("£");
      else if (localization.currency === "BDT") setCurrencySymbol("৳");
      else if (localization.currency === "INR") setCurrencySymbol("₹");
      else if (localization.currency === "AED") setCurrencySymbol("AED");
      else if (localization.currency === "SAR") setCurrencySymbol("SAR");

      window.dispatchEvent(new Event("pharmacy_settings_updated"));
      showToast("System settings saved successfully!");
    } catch (e) {
      console.error("Error saving settings", e);
    }
  };

  const handleReset = () => {
    if (activeTab === "business") setBusiness(DEFAULT_BUSINESS);
    else if (activeTab === "localization") setLocalization(DEFAULT_LOCALIZATION);
    else if (activeTab === "invoice") setInvoice(DEFAULT_INVOICE);
    else if (activeTab === "tax") setTax(DEFAULT_TAX);

    showToast("Reset current tab to default values", "info");
  };

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white text-slate-900 shadow-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-emerald-700 font-semibold">Settings</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>System Settings</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Configuration
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your pharmacy business profile, localization, invoice numbering, and tax rules
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/pharmacy/pos"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <span>Open Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save All</span>
          </button>
        </div>
      </div>

      {/* Top 4 Quick Metric / Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Store */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              Pharmacy Store
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {business.pharmacyName || "Pharmacy"}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {business.phone || "Active Store"}
            </div>
          </div>
        </div>

        {/* Card 2: Currency & Region */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/80 text-blue-700 flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              Currency & Region
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {localization.currency} ({currencySymbol})
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {localization.timeZone}
            </div>
          </div>
        </div>

        {/* Card 3: Invoicing */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100/80 text-purple-700 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              Invoice Prefix
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {invoice.invoicePrefix || "INV"}-XXXXXX
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {localization.dateFormat}
            </div>
          </div>
        </div>

        {/* Card 4: Sales Tax / VAT */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100/80 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              Tax Rate ({tax.taxLabel || "VAT"})
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {tax.applyTax ? `${tax.rate}% Active` : "Exempt / Off"}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {tax.applyTax ? "Computed at register" : "No tax added"}
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Tabs Bar */}
        <div className="border-b border-slate-100 bg-[#f8faf9]/80 px-6">
          <div className="flex -mb-px space-x-2 sm:space-x-6 overflow-x-auto">
            {/* Tab 1: Business */}
            <button
              type="button"
              onClick={() => setActiveTab("business")}
              className={`group inline-flex items-center py-3.5 px-3 border-b-2 font-semibold text-xs focus:outline-none transition-colors duration-150 ${
                activeTab === "business"
                  ? "border-emerald-700 text-emerald-800 bg-white rounded-t-lg shadow-2xs"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Store
                className={`mr-2 h-4 w-4 transition-colors ${
                  activeTab === "business" ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"
                }`}
              />
              Business Details
            </button>

            {/* Tab 2: Localization */}
            <button
              type="button"
              onClick={() => setActiveTab("localization")}
              className={`group inline-flex items-center py-3.5 px-3 border-b-2 font-semibold text-xs focus:outline-none transition-colors duration-150 ${
                activeTab === "localization"
                  ? "border-emerald-700 text-emerald-800 bg-white rounded-t-lg shadow-2xs"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Globe
                className={`mr-2 h-4 w-4 transition-colors ${
                  activeTab === "localization" ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"
                }`}
              />
              Localization & Currency
            </button>

            {/* Tab 3: Invoice */}
            <button
              type="button"
              onClick={() => setActiveTab("invoice")}
              className={`group inline-flex items-center py-3.5 px-3 border-b-2 font-semibold text-xs focus:outline-none transition-colors duration-150 ${
                activeTab === "invoice"
                  ? "border-emerald-700 text-emerald-800 bg-white rounded-t-lg shadow-2xs"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <FileText
                className={`mr-2 h-4 w-4 transition-colors ${
                  activeTab === "invoice" ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"
                }`}
              />
              Invoice & Receipts
            </button>

            {/* Tab 4: Tax */}
            <button
              type="button"
              onClick={() => setActiveTab("tax")}
              className={`group inline-flex items-center py-3.5 px-3 border-b-2 font-semibold text-xs focus:outline-none transition-colors duration-150 ${
                activeTab === "tax"
                  ? "border-emerald-700 text-emerald-800 bg-white rounded-t-lg shadow-2xs"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Percent
                className={`mr-2 h-4 w-4 transition-colors ${
                  activeTab === "tax" ? "text-emerald-700" : "text-slate-400 group-hover:text-slate-600"
                }`}
              />
              Sales Tax & VAT
            </button>
          </div>
        </div>

        {/* Section Header Description */}
        <div className="px-6 py-4 bg-[#f8faf9] border-b border-slate-100 flex items-center justify-between">
          <div>
            {activeTab === "business" && (
              <>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Store className="h-4 w-4 text-emerald-700" />
                  Pharmacy Business Information
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Legal name, drug authority registration, contact phone number, and physical store address
                </p>
              </>
            )}

            {activeTab === "localization" && (
              <>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-700" />
                  Regional & Currency Formatting
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set active monetary symbol, calendar date representation, and pharmacy time zone
                </p>
              </>
            )}

            {activeTab === "invoice" && (
              <>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-700" />
                  Invoice Templates & Thermal Receipts
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure order numbering prefix, receipt footer message, and customer return policies
                </p>
              </>
            )}

            {activeTab === "tax" && (
              <>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Percent className="h-4 w-4 text-emerald-700" />
                  Taxation & VAT Computation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure default sales tax rate and custom receipt label applied during checkout
                </p>
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 shadow-2xs">
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Auto-synced</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* TAB 1: BUSINESS */}
            {activeTab === "business" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pharmacy Commercial Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HealthCare Pharmacy Ltd."
                      value={business.pharmacyName}
                      onChange={(e) =>
                        setBusiness({ ...business, pharmacyName: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Appears on thermal receipts, customer invoices, and reports
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Contact Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@pharmacy.com"
                      value={business.email}
                      onChange={(e) =>
                        setBusiness({ ...business, email: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Used for automated system notifications and supplier purchase orders
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Store Physical Address
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter complete street address, area, city, and postal code"
                    value={business.address}
                    onChange={(e) =>
                      setBusiness({ ...business, address: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Printed at top of customer receipts
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Store Helpline / Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+880 1711-234567"
                      value={business.phone}
                      onChange={(e) =>
                        setBusiness({ ...business, phone: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Direct hotline for customer inquiries
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Drug License / Registration No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DGDA-PH-98421"
                      value={business.registrationNumber}
                      onChange={(e) =>
                        setBusiness({
                          ...business,
                          registrationNumber: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Regulatory pharmacy accreditation
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Business Tax ID / BIN
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BIN-847291048"
                      value={business.taxId}
                      onChange={(e) =>
                        setBusiness({ ...business, taxId: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      For tax audit compliance on tax receipts
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LOCALIZATION */}
            {activeTab === "localization" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Base Currency
                    </label>
                    <select
                      value={localization.currency}
                      onChange={(e) =>
                        setLocalization({
                          ...localization,
                          currency: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs"
                    >
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="AED">AED (AED) - UAE Dirham</option>
                      <option value="SAR">SAR (SAR) - Saudi Riyal</option>
                    </select>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Currently active symbol across registers: <span className="font-bold text-slate-800">{currencySymbol}</span>
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date Display Format
                    </label>
                    <select
                      value={localization.dateFormat}
                      onChange={(e) =>
                        setLocalization({
                          ...localization,
                          dateFormat: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/07/2026)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 07/10/2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
                    </select>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Formatting for receipts, orders, and batch expiry dates
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Store Time Zone
                    </label>
                    <select
                      value={localization.timeZone}
                      onChange={(e) =>
                        setLocalization({
                          ...localization,
                          timeZone: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                      <option value="America/New_York">America/New_York (EST/EDT)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    </select>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Timestamp on every shift opening and transaction
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#f8faf9] border border-slate-200/80 space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Live Preview of Formatted Currency
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900 shadow-2xs">
                      Subtotal: {currencySymbol}1,250.00
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-emerald-700 shadow-2xs">
                      Discount: -{currencySymbol}50.00
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900 shadow-2xs">
                      Grand Total: {currencySymbol}1,200.00
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: INVOICE */}
            {activeTab === "invoice" && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice Prefix Code
                  </label>
                  <div className="flex items-center gap-2 max-w-sm">
                    <input
                      type="text"
                      placeholder="INV"
                      value={invoice.invoicePrefix}
                      onChange={(e) =>
                        setInvoice({ ...invoice, invoicePrefix: e.target.value.toUpperCase() })
                      }
                      className="w-32 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs uppercase"
                    />
                    <span className="text-xs font-bold text-slate-500">
                      - 20261007-0042
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Prefix identifier generated for POS receipts and order slips
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Receipt Footer Note
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter greeting or thank you note to be printed on receipts"
                    value={invoice.invoiceFooter}
                    onChange={(e) =>
                      setInvoice({ ...invoice, invoiceFooter: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Printed at the very bottom of customer 80mm thermal slips
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Terms & Return Policy Notice
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Specify conditions regarding medicine returns, cold chain restrictions, etc."
                    value={invoice.paymentTerms}
                    onChange={(e) =>
                      setInvoice({ ...invoice, paymentTerms: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Printed below invoice items on formal full-page A4 PDF/paper invoices
                  </span>
                </div>
              </div>
            )}

            {/* TAB 4: TAX */}
            {activeTab === "tax" && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-[#f8faf9] border border-slate-200/80">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tax.applyTax}
                      onChange={(e) =>
                        setTax({ ...tax, applyTax: e.target.checked })
                      }
                      className="h-4 w-4 text-emerald-700 focus:ring-emerald-600 border-slate-300 rounded cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Enable Automated Sales Tax / VAT Calculation
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        When enabled, POS checkout and invoice calculations automatically compute tax on eligible sales
                      </div>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tax Custom Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VAT, GST, Sales Tax"
                      value={tax.taxLabel}
                      onChange={(e) =>
                        setTax({ ...tax, taxLabel: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Printed line item label on customer breakdown receipts
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Standard Percentage Rate (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="0"
                        value={tax.rate}
                        onChange={(e) =>
                          setTax({ ...tax, rate: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-3.5 py-2 pr-8 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors shadow-2xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        %
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Percentage applied to pre-tax invoice subtotal
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Form Footer Action Bar */}
            <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

