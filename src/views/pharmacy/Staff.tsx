"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Search,
  KeyRound,
  Building2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Sliders,
  X,
  Check,
  Phone,
  Mail,
  Lock,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";
import { StaffMember, StaffRole, RolePermissions } from "@/types/pharmacy";
import { defaultRolePermissions } from "@/data/mockData";

export default function StaffManagementPage() {
  const { staffMembers, branches, addStaffMember, updateStaffMember, deleteStaffMember } =
    usePharmacy();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected staff for actions
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Revealed PINs map (id -> boolean)
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Add/Edit Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("cashier");
  const [branchId, setBranchId] = useState("");
  const [posPin, setPosPin] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [formError, setFormError] = useState("");

  // Permission Matrix Modal State
  const [permissionsState, setPermissionsState] = useState<RolePermissions>({
    canVoidSales: false,
    canApplyManualDiscount: true,
    canPriceOverride: false,
    canViewCostMargins: false,
    canOpenDrawerNoSale: false,
    canModifyInventory: false,
    canManageStaff: false,
    canViewFinancialReports: false,
  });

  // Toggle PIN visibility
  const togglePinVisibility = (id: string) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staffMembers.filter((staff) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        staff.name.toLowerCase().includes(q) ||
        staff.email.toLowerCase().includes(q) ||
        staff.phone.toLowerCase().includes(q) ||
        staff.posPin.includes(q);

      const matchesRole = roleFilter === "ALL" || staff.role === roleFilter;
      const matchesBranch = branchFilter === "ALL" || staff.branchId === branchFilter;
      const matchesStatus = statusFilter === "ALL" || staff.status === statusFilter;

      return matchesSearch && matchesRole && matchesBranch && matchesStatus;
    });
  }, [staffMembers, searchTerm, roleFilter, branchFilter, statusFilter]);

  // Executive Stats
  const totalStaff = staffMembers.length;
  const activeStaff = staffMembers.filter((s) => s.status === "ACTIVE").length;
  const pharmacistsCount = staffMembers.filter((s) => s.role === "pharmacist").length;
  const cashiersCount = staffMembers.filter((s) => s.role === "cashier").length;

  // Open Add Modal
  const handleOpenAdd = () => {
    setName("");
    setEmail("");
    setPhone("");
    setRole("cashier");
    setBranchId(branches[0]?.id || "br-1");
    setPosPin(Math.floor(1000 + Math.random() * 9000).toString());
    setStatus("ACTIVE");
    setFormError("");
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setName(staff.name);
    setEmail(staff.email);
    setPhone(staff.phone);
    setRole(staff.role);
    setBranchId(staff.branchId);
    setPosPin(staff.posPin);
    setStatus(staff.status);
    setFormError("");
    setIsEditModalOpen(true);
  };

  // Open Permission Modal
  const handleOpenPermissions = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setPermissionsState({
      ...defaultRolePermissions[staff.role],
      ...(staff.customPermissions || {}),
    });
    setIsPermModalOpen(true);
  };

  // Save Add Staff
  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !posPin.trim()) {
      setFormError("Name, Email, and 4-digit POS PIN are required.");
      return;
    }
    if (!/^\d{4}$/.test(posPin)) {
      setFormError("POS PIN must be exactly 4 numeric digits (0000-9999).");
      return;
    }

    const branchObj = branches.find((b) => b.id === branchId);
    const branchName = branchObj ? branchObj.name : "Main Central Pharmacy";

    addStaffMember({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || "N/A",
      role,
      branchId: branchId || "br-1",
      branchName,
      posPin,
      status,
      customPermissions: { ...defaultRolePermissions[role] },
    });

    setIsAddModalOpen(false);
  };

  // Save Edit Staff
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    if (!name.trim() || !email.trim() || !posPin.trim()) {
      setFormError("Name, Email, and 4-digit POS PIN are required.");
      return;
    }
    if (!/^\d{4}$/.test(posPin)) {
      setFormError("POS PIN must be exactly 4 numeric digits.");
      return;
    }

    const branchObj = branches.find((b) => b.id === branchId);
    const branchName = branchObj ? branchObj.name : selectedStaff.branchName;

    updateStaffMember(selectedStaff.id, {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role,
      branchId,
      branchName,
      posPin,
      status,
    });

    setIsEditModalOpen(false);
  };

  // Save Permissions
  const handleSavePermissions = () => {
    if (!selectedStaff) return;
    updateStaffMember(selectedStaff.id, {
      customPermissions: permissionsState,
    });
    setIsPermModalOpen(false);
  };

  // Reset to role preset
  const handleResetToRolePreset = () => {
    if (!selectedStaff) return;
    setPermissionsState({ ...defaultRolePermissions[selectedStaff.role] });
  };

  // Delete Staff
  const handleConfirmDelete = () => {
    if (!selectedStaff) return;
    deleteStaffMember(selectedStaff.id);
    setIsDeleteModalOpen(false);
  };

  const getRoleBadge = (roleStr: StaffRole) => {
    switch (roleStr) {
      case "superadmin":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "admin":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pharmacist":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "inventory_manager":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "cashier":
      default:
        return "bg-teal-100 text-teal-800 border-teal-200";
    }
  };

  const formatRoleLabel = (roleStr: StaffRole) => {
    switch (roleStr) {
      case "superadmin":
        return "Super Admin";
      case "admin":
        return "Pharmacy Admin";
      case "pharmacist":
        return "Registered Pharmacist";
      case "inventory_manager":
        return "Inventory Manager";
      case "cashier":
        return "Cashier / Counter";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0e6245] flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Staff & Role-Based Access Control
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage pharmacy employees, credentials, POS quick-PINs, and granular operational permissions.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0e6245] hover:bg-[#0b4d37] text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Metric Cards (Emerald Gradient Dashboard Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Team */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-900/25 bg-gradient-to-br from-emerald-600 to-emerald-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Total Team
              </span>
              <Users className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {totalStaff}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Employees across branches
            </div>
          </div>
        </div>

        {/* Active Status */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-900/25 bg-gradient-to-br from-green-600 to-emerald-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Active Status
              </span>
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {activeStaff}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Active accounts enabled
            </div>
          </div>
        </div>

        {/* Pharmacists */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-900/25 bg-gradient-to-br from-teal-600 to-emerald-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Pharmacists
              </span>
              <ShieldCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {pharmacistsCount}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Licensed clinical staff
            </div>
          </div>
        </div>

        {/* Front Cashiers */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-950/30 bg-gradient-to-br from-emerald-800 to-emerald-950">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Front Cashiers
              </span>
              <KeyRound className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {cashiersCount}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Assigned to POS registers
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
              placeholder="Search staff by name, email, phone, or PIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">All Roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Pharmacy Admin</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="cashier">Cashier</option>
              <option value="inventory_manager">Inventory Manager</option>
            </select>

            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            {(searchTerm || roleFilter !== "ALL" || branchFilter !== "ALL" || statusFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("ALL");
                  setBranchFilter("ALL");
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

      {/* Staff Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7faf8] border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Staff Member</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Assigned Branch</th>
                <th className="px-4 py-3.5">POS Quick PIN</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Last Login</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No staff members found</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing filters or search term.</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const isPinRevealed = revealedPins[staff.id];
                  const initials = staff.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={staff.id} className="hover:bg-[#f9fbf9] transition-colors">
                      {/* Name & Contact */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#0e6245] font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{staff.name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{staff.email}</span>
                              {staff.phone && staff.phone !== "N/A" && (
                                <>
                                  <span>•</span>
                                  <span>{staff.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadge(
                            staff.role
                          )}`}
                        >
                          {formatRoleLabel(staff.role)}
                        </span>
                      </td>

                      {/* Branch */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{staff.branchName}</span>
                        </div>
                      </td>

                      {/* POS PIN */}
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>{isPinRevealed ? staff.posPin : "••••"}</span>
                          <button
                            type="button"
                            onClick={() => togglePinVisibility(staff.id)}
                            className="text-slate-400 hover:text-slate-600 transition-colors ml-1"
                            title={isPinRevealed ? "Hide PIN" : "Show PIN"}
                          >
                            {isPinRevealed ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                            staff.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              staff.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {staff.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-4 text-xs text-slate-500">
                        {staff.lastLogin || "Never"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Permissions Button */}
                          <button
                            onClick={() => handleOpenPermissions(staff)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#0e6245] rounded-lg text-xs font-medium transition-colors"
                            title="Configure RBAC Permissions"
                          >
                            <Sliders className="w-3.5 h-3.5 text-slate-500" />
                            <span>Permissions</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(staff)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Staff Info"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => {
                              setSelectedStaff(staff);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. PERMISSION MATRIX MODAL (RBAC) */}
      {/* ============================================================== */}
      {isPermModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#f8faf8] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0e6245] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Granular Access Permissions (RBAC)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Custom rules for <span className="font-semibold text-slate-800">{selectedStaff.name}</span> ({formatRoleLabel(selectedStaff.role)})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPermModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600">
                <span>Current Role Default: <strong>{formatRoleLabel(selectedStaff.role)}</strong></span>
                <button
                  type="button"
                  onClick={handleResetToRolePreset}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
                >
                  Reset to Role Defaults
                </button>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: "canVoidSales",
                    title: "Can Void Finalized Sales",
                    desc: "Permit cashier to cancel, reverse, or void completed sales transactions.",
                  },
                  {
                    key: "canApplyManualDiscount",
                    title: "Can Apply Manual Discounts",
                    desc: "Allow applying custom percent or dollar discounts at checkout.",
                  },
                  {
                    key: "canPriceOverride",
                    title: "Can Override Selling Price",
                    desc: "Allow changing medicine unit price directly on the POS screen.",
                  },
                  {
                    key: "canViewCostMargins",
                    title: "Can View Cost Price & Profit Margins",
                    desc: "Disclose supplier acquisition cost and profit percentages on stock items.",
                  },
                  {
                    key: "canOpenDrawerNoSale",
                    title: "Can Open Cash Drawer Without Sale",
                    desc: "Enable manual cash drawer kick button for counting or making change.",
                  },
                  {
                    key: "canModifyInventory",
                    title: "Can Modify Inventory & Write-offs",
                    desc: "Allow manual batch quantity adjustments and stock write-offs.",
                  },
                  {
                    key: "canManageStaff",
                    title: "Can Manage Staff & Logins",
                    desc: "Allow creating new staff, modifying PINs, and changing permissions.",
                  },
                  {
                    key: "canViewFinancialReports",
                    title: "Can View Financial & Sales Reports",
                    desc: "Permit access to revenue summaries, profit reports, and expense logs.",
                  },
                ].map((item) => {
                  const permKey = item.key as keyof RolePermissions;
                  const isChecked = Boolean(permissionsState[permKey]);

                  return (
                    <label
                      key={item.key}
                      className="flex items-start justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer transition-all"
                    >
                      <div className="pr-4">
                        <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          setPermissionsState((prev) => ({
                            ...prev,
                            [permKey]: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 mt-1 text-[#0e6245] focus:ring-emerald-500 rounded border-slate-300 accent-[#0e6245]"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#f8faf8] border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPermModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium rounded-xl hover:bg-slate-200/60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0e6245] hover:bg-[#0b4d37] rounded-xl shadow-sm transition-all"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. ADD / EDIT STAFF MODAL */}
      {/* ============================================================== */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-[#f8faf8] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0e6245] flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {isAddModalOpen ? "Add New Staff Member" : "Edit Staff Member"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAddModalOpen
                      ? "Create credentials and assign a pharmacy branch"
                      : `Update details for ${selectedStaff?.name}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={isAddModalOpen ? handleSubmitAdd : handleSubmitEdit}
              className="p-6 space-y-4"
            >
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Emily Carter, RPh"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="emily@pharmacynext.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Role & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    System Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="superadmin">Super Admin</option>
                    <option value="admin">Pharmacy Admin</option>
                    <option value="pharmacist">Registered Pharmacist</option>
                    <option value="cashier">Cashier</option>
                    <option value="inventory_manager">Inventory Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* POS PIN & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    4-Digit POS Register PIN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={posPin}
                    onChange={(e) => setPosPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 1234"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono tracking-widest text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <span className="text-[10px] text-slate-400">Used for fast login at counter</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="ACTIVE">Active (Can Login)</option>
                    <option value="INACTIVE">Inactive (Disabled)</option>
                  </select>
                </div>
              </div>

              {/* Form Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#0e6245] hover:bg-[#0b4d37] rounded-xl shadow-sm transition-all"
                >
                  {isAddModalOpen ? "Save Staff Member" : "Update Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DELETE CONFIRMATION MODAL */}
      {/* ============================================================== */}
      {isDeleteModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Remove Staff Member?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete <strong>{selectedStaff.name}</strong>? This will revoke POS PIN access and remove login credentials.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all"
              >
                Yes, Remove Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

