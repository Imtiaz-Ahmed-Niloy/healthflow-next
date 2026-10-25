"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  FileSpreadsheet,
  FileText,
  Printer,
  Settings,
  Filter,
  Calendar,
  Wallet,
  Tag,
  Receipt,
  PieChart,
  Edit,
  Trash2,
  X,
  Check,
  CheckCircle2,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";
import { Expense } from "@/types/pharmacy";

export default function ExpensesPage() {
  const {
    expenses,
    expenseCategories,
    addExpense,
    updateExpense,
    deleteExpense,
    addExpenseCategory,
    user,
  } = usePharmacy();

  // Date filters (defaults around target period Sep-Oct 2026)
  const [filterFrom, setFilterFrom] = useState("2026-09-07");
  const [filterTo, setFilterTo] = useState("2026-10-07");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<Expense | null>(null);

  // Form states
  const [formCategory, setFormCategory] = useState("Insurance");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState("2026-10-07");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState("");

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Category filter
      if (selectedCategory !== "All Categories" && exp.category !== selectedCategory) {
        return false;
      }

      // Date range filter
      if (filterFrom) {
        const fromTs = new Date(filterFrom).getTime();
        if (exp.timestamp < fromTs) return false;
      }

      if (filterTo) {
        const toTs = new Date(filterTo).getTime() + 86400000;
        if (exp.timestamp > toTs) return false;
      }

      return true;
    });
  }, [expenses, selectedCategory, filterFrom, filterTo]);

  // Aggregate metrics
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);
  }, [filteredExpenses]);

  // Highest category in filtered set
  const highestCategory = useMemo(() => {
    if (filteredExpenses.length === 0) return { name: "None", amount: 0, percent: 0 };
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });

    let topCat = "Supplies";
    let maxAmt = 0;
    Object.entries(catMap).forEach(([cat, amt]) => {
      if (amt > maxAmt) {
        maxAmt = amt;
        topCat = cat;
      }
    });

    const percent = totalAmount > 0 ? (maxAmt / totalAmount) * 100 : 0;
    return { name: topCat, amount: maxAmt, percent };
  }, [filteredExpenses, totalAmount]);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormCategory(expenseCategories[0] || "Supplies");
    setFormAmount("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormDescription("");
    setFormError("");
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setFormCategory(exp.category);
    setFormAmount(exp.amount.toString());
    // Convert DD/MM/YYYY to YYYY-MM-DD for date input
    if (exp.date.includes("/")) {
      const p = exp.date.split("/");
      setFormDate(`${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`);
    } else {
      setFormDate(exp.date);
    }
    setFormDescription(exp.description);
    setFormError("");
    setIsAddModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("Please enter a valid amount greater than 0.");
      return;
    }

    if (!formDate) {
      setFormError("Please select a date.");
      return;
    }

    // Format DD/MM/YYYY
    const dParts = formDate.split("-");
    const formattedDate = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;
    const timestamp = new Date(formDate).getTime();

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        category: formCategory,
        amount: amt,
        date: formattedDate,
        timestamp,
        description: formDescription.trim() || "Expense",
      });
    } else {
      addExpense({
        category: formCategory,
        amount: amt,
        date: formattedDate,
        timestamp,
        description: formDescription.trim() || "Expense",
        recordedBy: user?.name || "Pharmacy Admin",
      });
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteExpense = () => {
    if (deleteCandidate) {
      deleteExpense(deleteCandidate.id);
      setDeleteCandidate(null);
    }
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    addExpenseCategory(newCategoryName.trim());
    setNewCategoryName("");
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["DATE,CATEGORY,DESCRIPTION,AMOUNT,RECORDED BY"];
    const rows = filteredExpenses.map(
      (e) => `"${e.date}","${e.category}","${e.description}","${e.amount.toFixed(2)}","${e.recordedBy}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Expenses
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Expense Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track business expenses</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Excel */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel</span>
          </button>

          {/* CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>CSV</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span>Print</span>
          </button>

          {/* Categories */}
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            <Settings className="w-4 h-4 text-gray-500" />
            <span>Categories</span>
          </button>

          {/* Add Expense */}
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards (Emerald Gradient Dashboard Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Expenses Card */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-900/25 bg-gradient-to-br from-emerald-600 to-emerald-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Total Expenses
              </span>
              <Wallet className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              ${totalAmount.toFixed(2)}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              For selected period
            </div>
          </div>
        </div>

        {/* Highest Category Card */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-900/25 bg-gradient-to-br from-green-600 to-emerald-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Highest Category
              </span>
              <PieChart className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold truncate text-white" title={highestCategory.name}>
              {highestCategory.name}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              {highestCategory.percent.toFixed(1)}% of total (${highestCategory.amount.toFixed(2)})
            </div>
          </div>
        </div>

        {/* Recorded Entries Card */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-900/25 bg-gradient-to-br from-teal-600 to-emerald-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Total Entries
              </span>
              <Receipt className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {filteredExpenses.length}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Recorded expense items
            </div>
          </div>
        </div>

        {/* Average Expense Card */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-950/30 bg-gradient-to-br from-emerald-800 to-emerald-950">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Average Expense
              </span>
              <Tag className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              ${filteredExpenses.length > 0 ? (totalAmount / filteredExpenses.length).toFixed(2) : "0.00"}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Per recorded transaction
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span>Filters</span>
          </div>

          {/* From */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">From</span>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          {/* To */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">To</span>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex-1 sm:max-w-xs">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 cursor-pointer"
            >
              <option value="All Categories">All Categories</option>
              {expenseCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {(selectedCategory !== "All Categories" || filterFrom || filterTo) && (
            <button
              onClick={() => {
                setSelectedCategory("All Categories");
                setFilterFrom("");
                setFilterTo("");
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium self-end sm:self-center cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Expenses Ledger Table Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200/80 bg-gray-50/50">
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  DATE
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  CATEGORY
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  DESCRIPTION
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  AMOUNT
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  RECORDED BY
                </th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No expense records found for the selected period.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date */}
                    <td className="px-6 py-4 text-xs font-mono text-gray-600">{exp.date}</td>

                    {/* Category */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 border border-gray-200 text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {exp.category}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-6 py-4 text-gray-800 text-xs">{exp.description}</td>

                    {/* Amount */}
                    <td className="px-6 py-4 font-bold text-gray-900 text-xs">
                      ${exp.amount.toFixed(2)}
                    </td>

                    {/* Recorded By */}
                    <td className="px-6 py-4 text-gray-600 text-xs">{exp.recordedBy}</td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit expense"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate(exp)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Expense Modal (Exact replica of add_expense_modal.png) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 pb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {editingExpense ? "Edit Expense" : "Add Expense"}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveExpense} className="px-6 pb-6 space-y-4">
              {formError && (
                <div className="p-2.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 transition-all cursor-pointer"
                >
                  {expenseCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 transition-all"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional description..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 resize-none transition-all"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
                >
                  {editingExpense ? "Save Changes" : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Expense Categories</h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex flex-wrap gap-2 mb-5 max-h-48 overflow-y-auto p-1">
              {expenseCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-gray-700 border border-gray-200"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  {cat}
                </span>
              ))}
            </div>

            {/* Add new category form */}
            <form onSubmit={handleAddCategorySubmit} className="space-y-3 pt-3 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700">Add New Category</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Legal Fees, Licenses"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                >
                  Add
                </button>
              </div>
            </form>

            <div className="mt-5 text-right">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete expense</h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to remove the expense of{" "}
              <strong className="text-gray-800">${deleteCandidate.amount.toFixed(2)}</strong> for{" "}
              <strong className="text-gray-800">{deleteCandidate.category}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExpense}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

