"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Monitor,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  FileCheck,
  Edit2,
  Trash2,
  CheckCircle2,
  Wifi,
  WifiOff,
  User,
  X,
  Search,
  Check,
  Landmark,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";
import { PharmacyBranch, PosTerminal } from "@/types/pharmacy";

export default function BranchesManagementPage() {
  const {
    branches,
    addBranch,
    updateBranch,
    deleteBranch,
    addTerminalToBranch,
    updateTerminal,
    deleteTerminal,
  } = usePharmacy();

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals state
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isEditBranchOpen, setIsEditBranchOpen] = useState(false);
  const [isDeleteBranchOpen, setIsDeleteBranchOpen] = useState(false);
  const [isAddTerminalOpen, setIsAddTerminalOpen] = useState(false);

  // Selected Branch & Terminal
  const [selectedBranch, setSelectedBranch] = useState<PharmacyBranch | null>(null);
  const [selectedTerminal, setSelectedTerminal] = useState<PosTerminal | null>(null);

  // Branch Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isMainBranch, setIsMainBranch] = useState(false);
  const [branchStatus, setBranchStatus] = useState<"ACTIVE" | "MAINTENANCE" | "INACTIVE">("ACTIVE");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [drugLicenseNo, setDrugLicenseNo] = useState("");
  const [vatRegistrationNo, setVatRegistrationNo] = useState("");
  const [pharmacistInCharge, setPharmacistInCharge] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [branchFormError, setBranchFormError] = useState("");

  // Terminal Form state
  const [termName, setTermName] = useState("");
  const [termCode, setTermCode] = useState("");
  const [termIp, setTermIp] = useState("");
  const [termStatus, setTermStatus] = useState<"ONLINE" | "OFFLINE" | "BUSY">("ONLINE");
  const [termFormError, setTermFormError] = useState("");

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        branch.name.toLowerCase().includes(q) ||
        branch.code.toLowerCase().includes(q) ||
        branch.address.toLowerCase().includes(q) ||
        branch.drugLicenseNo.toLowerCase().includes(q) ||
        branch.pharmacistInCharge.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || branch.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [branches, searchTerm, statusFilter]);

  // Aggregate metrics
  const totalBranches = branches.length;
  const totalTerminals = branches.reduce((acc, b) => acc + (b.terminals?.length || 0), 0);
  const onlineTerminals = branches.reduce(
    (acc, b) => acc + (b.terminals?.filter((t) => t.status === "ONLINE")?.length || 0),
    0
  );

  // Open Add Branch
  const handleOpenAddBranch = () => {
    setName("");
    setCode(`BR-0${branches.length + 1}`);
    setIsMainBranch(false);
    setBranchStatus("ACTIVE");
    setAddress("");
    setPhone("");
    setEmail("");
    setDrugLicenseNo(`DL-NY-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setVatRegistrationNo(`VAT-8921-000${branches.length + 1}`);
    setPharmacistInCharge("");
    setOperatingHours("08:30 AM - 10:00 PM (Daily)");
    setBranchFormError("");
    setIsAddBranchOpen(true);
  };

  // Open Edit Branch
  const handleOpenEditBranch = (branch: PharmacyBranch) => {
    setSelectedBranch(branch);
    setName(branch.name);
    setCode(branch.code);
    setIsMainBranch(branch.isMainBranch);
    setBranchStatus(branch.status);
    setAddress(branch.address);
    setPhone(branch.phone);
    setEmail(branch.email);
    setDrugLicenseNo(branch.drugLicenseNo);
    setVatRegistrationNo(branch.vatRegistrationNo);
    setPharmacistInCharge(branch.pharmacistInCharge);
    setOperatingHours(branch.operatingHours);
    setBranchFormError("");
    setIsEditBranchOpen(true);
  };

  // Save Add Branch
  const handleSubmitAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !drugLicenseNo.trim()) {
      setBranchFormError("Branch Name, Code, and Drug License Number are required.");
      return;
    }

    addBranch({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      isMainBranch,
      status: branchStatus,
      address: address.trim() || "Address pending",
      phone: phone.trim() || "N/A",
      email: email.trim() || "branch@pharmacynext.com",
      drugLicenseNo: drugLicenseNo.trim(),
      vatRegistrationNo: vatRegistrationNo.trim(),
      pharmacistInCharge: pharmacistInCharge.trim() || "Unassigned",
      operatingHours: operatingHours.trim() || "09:00 AM - 09:00 PM",
      terminals: [
        {
          id: `t-${Date.now()}-1`,
          name: "Counter 1 - Main Front Register",
          terminalCode: `${code.trim().toUpperCase()}-R1`,
          status: "ONLINE",
          ipAddress: "192.168.1.101",
          lastPing: "Just now",
        },
      ],
    });

    setIsAddBranchOpen(false);
  };

  // Save Edit Branch
  const handleSubmitEditBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    if (!name.trim() || !code.trim() || !drugLicenseNo.trim()) {
      setBranchFormError("Branch Name, Code, and Drug License Number are required.");
      return;
    }

    updateBranch(selectedBranch.id, {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      isMainBranch,
      status: branchStatus,
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      drugLicenseNo: drugLicenseNo.trim(),
      vatRegistrationNo: vatRegistrationNo.trim(),
      pharmacistInCharge: pharmacistInCharge.trim(),
      operatingHours: operatingHours.trim(),
    });

    setIsEditBranchOpen(false);
  };

  // Confirm Delete Branch
  const handleConfirmDeleteBranch = () => {
    if (!selectedBranch) return;
    deleteBranch(selectedBranch.id);
    setIsDeleteBranchOpen(false);
  };

  // Open Add Terminal
  const handleOpenAddTerminal = (branch: PharmacyBranch) => {
    setSelectedBranch(branch);
    const count = (branch.terminals?.length || 0) + 1;
    setTermName(`Counter ${count} - Checkout Desk`);
    setTermCode(`${branch.code}-REG-0${count}`);
    setTermIp(`192.168.${branch.code.replace(/\D/g, "") || "1"}.10${count}`);
    setTermStatus("ONLINE");
    setTermFormError("");
    setIsAddTerminalOpen(true);
  };

  // Submit Add Terminal
  const handleSubmitAddTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    if (!termName.trim() || !termCode.trim()) {
      setTermFormError("Terminal Name and Register Code are required.");
      return;
    }

    addTerminalToBranch(selectedBranch.id, {
      name: termName.trim(),
      terminalCode: termCode.trim().toUpperCase(),
      ipAddress: termIp.trim(),
      status: termStatus,
      lastPing: "Just now",
    });

    setIsAddTerminalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0e6245] flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Pharmacy Branches & POS Registers
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Multi-branch outlet configuration, government drug licensing, Pharmacist-in-Charge credentials, and counter registers.
          </p>
        </div>

        <button
          onClick={handleOpenAddBranch}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0e6245] hover:bg-[#0b4d37] text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Branch</span>
        </button>
      </div>

      {/* Metric Cards (Emerald Gradient Dashboard Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Outlets */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-900/25 bg-gradient-to-br from-emerald-600 to-emerald-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Active Outlets
              </span>
              <Building2 className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {totalBranches}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Licensed dispensary locations
            </div>
          </div>
        </div>

        {/* POS Terminals */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-900/25 bg-gradient-to-br from-green-600 to-emerald-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                POS Terminals
              </span>
              <Monitor className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {totalTerminals}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Configured checkout counters
            </div>
          </div>
        </div>

        {/* Registers Online */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-900/25 bg-gradient-to-br from-teal-600 to-emerald-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Registers Online
              </span>
              <Wifi className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {onlineTerminals}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Active registers ready to sell
            </div>
          </div>
        </div>

        {/* Compliance PICs */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-950/30 bg-gradient-to-br from-emerald-800 to-emerald-950">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Compliance PICs
              </span>
              <ShieldCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {totalBranches}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Pharmacists-in-Charge assigned
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search branches by name, code, address, license number, or PIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">All Branch Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            {(searchTerm || statusFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("ALL");
                }}
                className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Branches List */}
      <div className="space-y-6">
        {filteredBranches.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center text-slate-500">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No pharmacy branches match your search</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the search filter.</p>
          </div>
        ) : (
          filteredBranches.map((branch) => {
            return (
              <div
                key={branch.id}
                className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Branch Top Banner */}
                <div className="px-6 py-4 bg-[#f8faf8] border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#0e6245] flex items-center justify-center font-bold">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">{branch.name}</h2>
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono font-semibold rounded-md">
                          {branch.code}
                        </span>
                        {branch.isMainBranch && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-[#0e6245] border border-emerald-200 text-[10px] font-bold rounded-md">
                            Headquarters
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${
                            branch.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {branch.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {branch.address}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Branch Action Buttons */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      onClick={() => handleOpenAddTerminal(branch)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0e6245] border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Register</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditBranch(branch)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Branch Info"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!branch.isMainBranch && (
                      <button
                        onClick={() => {
                          setSelectedBranch(branch);
                          setIsDeleteBranchOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Branch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Regulatory & Operating Metadata Grid */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white border-b border-slate-100 text-xs">
                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <div className="text-slate-400 flex items-center gap-1 mb-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Drug License No.</span>
                    </div>
                    <div className="font-semibold text-slate-900 font-mono text-xs">
                      {branch.drugLicenseNo}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <div className="text-slate-400 flex items-center gap-1 mb-1 font-medium">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>VAT / Tax ID</span>
                    </div>
                    <div className="font-semibold text-slate-900 font-mono text-xs">
                      {branch.vatRegistrationNo || "Pending Registration"}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <div className="text-slate-400 flex items-center gap-1 mb-1 font-medium">
                      <User className="w-3.5 h-3.5 text-teal-600" />
                      <span>Pharmacist-in-Charge</span>
                    </div>
                    <div className="font-semibold text-slate-900">{branch.pharmacistInCharge}</div>
                  </div>

                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <div className="text-slate-400 flex items-center gap-1 mb-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Operating Hours</span>
                    </div>
                    <div className="font-semibold text-slate-900">{branch.operatingHours}</div>
                  </div>
                </div>

                {/* POS Registers / Terminals Drawer */}
                <div className="p-6 bg-[#fafcfa]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-slate-500" />
                      <span>Configured Checkout Counters & Terminals ({branch.terminals?.length || 0})</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {branch.terminals?.map((terminal) => {
                      const isOnline = terminal.status === "ONLINE";
                      const isBusy = terminal.status === "BUSY";

                      return (
                        <div
                          key={terminal.id}
                          className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                  {terminal.terminalCode}
                                </span>
                                <h4 className="font-semibold text-slate-900 text-xs mt-1">
                                  {terminal.name}
                                </h4>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  isOnline
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isBusy
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isOnline
                                      ? "bg-emerald-500 animate-pulse"
                                      : isBusy
                                      ? "bg-amber-500"
                                      : "bg-slate-400"
                                  }`}
                                />
                                {terminal.status}
                              </span>
                            </div>

                            <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                              {terminal.currentCashier && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span>Cashier: <strong>{terminal.currentCashier}</strong></span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                                <Wifi className="w-3 h-3 text-slate-400" />
                                <span>IP: {terminal.ipAddress || "192.168.1.1"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 text-[10px]">
                              Ping: {terminal.lastPing || "Active"}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteTerminal(branch.id, terminal.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Delete Register"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================== */}
      {/* 1. ADD / EDIT BRANCH MODAL */}
      {/* ============================================================== */}
      {(isAddBranchOpen || isEditBranchOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-[#f8faf8] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0e6245] flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {isAddBranchOpen ? "Add New Pharmacy Branch" : "Edit Branch Details"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Register outlet location, regulatory drug license, and operating parameters
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddBranchOpen(false);
                  setIsEditBranchOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={isAddBranchOpen ? handleSubmitAddBranch : handleSubmitEditBranch}
              className="p-6 space-y-4 overflow-y-auto"
            >
              {branchFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {branchFormError}
                </div>
              )}

              {/* Branch Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Downtown Health Annex"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="BR-02"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 450 Broadway St, New York, NY"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Contact
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="branch@pharmacynext.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Legal License & VAT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Drug License No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={drugLicenseNo}
                    onChange={(e) => setDrugLicenseNo(e.target.value)}
                    placeholder="DL-NY-2025-1029"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tax / VAT Registration ID
                  </label>
                  <input
                    type="text"
                    value={vatRegistrationNo}
                    onChange={(e) => setVatRegistrationNo(e.target.value)}
                    placeholder="VAT-8921-9902"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Pharmacist-in-Charge & Operating Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pharmacist-in-Charge (PIC)
                  </label>
                  <input
                    type="text"
                    value={pharmacistInCharge}
                    onChange={(e) => setPharmacistInCharge(e.target.value)}
                    placeholder="Dr. Mark Vance, RPh"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                    placeholder="08:00 AM - 10:00 PM (Daily)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Main Headquarters Checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="mainBranchCheck"
                  checked={isMainBranch}
                  onChange={(e) => setIsMainBranch(e.target.checked)}
                  className="w-4 h-4 text-[#0e6245] rounded border-slate-300 accent-[#0e6245]"
                />
                <label htmlFor="mainBranchCheck" className="text-xs font-medium text-slate-700">
                  Designate as Central Headquarters / Main Branch
                </label>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddBranchOpen(false);
                    setIsEditBranchOpen(false);
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#0e6245] hover:bg-[#0b4d37] rounded-xl shadow-sm transition-all"
                >
                  {isAddBranchOpen ? "Create Branch" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. ADD REGISTER / TERMINAL MODAL */}
      {/* ============================================================== */}
      {isAddTerminalOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-[#f8faf8] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0e6245] flex items-center justify-center font-bold">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Add POS Register</h3>
                  <p className="text-xs text-slate-500">
                    To <span className="font-semibold text-slate-800">{selectedBranch.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddTerminalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddTerminal} className="p-6 space-y-4">
              {termFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {termFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Register / Counter Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  placeholder="e.g. Counter 3 - Drive-Thru Window"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Terminal Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={termCode}
                    onChange={(e) => setTermCode(e.target.value)}
                    placeholder="REG-03"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    IP Address
                  </label>
                  <input
                    type="text"
                    value={termIp}
                    onChange={(e) => setTermIp(e.target.value)}
                    placeholder="192.168.1.103"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Terminal Status
                </label>
                <select
                  value={termStatus}
                  onChange={(e) => setTermStatus(e.target.value as "ONLINE" | "OFFLINE" | "BUSY")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="ONLINE">Online (Ready to Sell)</option>
                  <option value="BUSY">Busy (In Transaction)</option>
                  <option value="OFFLINE">Offline (Closed Counter)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddTerminalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#0e6245] hover:bg-[#0b4d37] rounded-xl shadow-sm transition-all"
                >
                  Register Counter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DELETE BRANCH CONFIRMATION MODAL */}
      {/* ============================================================== */}
      {isDeleteBranchOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Delete Pharmacy Branch?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove <strong>{selectedBranch.name}</strong> ({selectedBranch.code})? All associated registers and terminal links will be decommissioned.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsDeleteBranchOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBranch}
                className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all"
              >
                Yes, Delete Branch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

