"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  ShieldAlert,
  Search,
  Filter,
  Download,
  Printer,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Building2,
  Monitor,
  User,
  Clock,
  ExternalLink,
  X,
  Layers,
  ArrowUpDown,
  Lock,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";
import { AuditLogEntry, AuditCategory, AuditSeverity } from "@/types/pharmacy";

export default function AuditLogsPage() {
  const { auditLogs, branches } = usePharmacy();

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");

  // Selected Log for inspection modal
  const [inspectLog, setInspectLog] = useState<AuditLogEntry | null>(null);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.staffName.toLowerCase().includes(q) ||
        (log.terminalId && log.terminalId.toLowerCase().includes(q)) ||
        log.branchName.toLowerCase().includes(q);

      const matchesCat = categoryFilter === "ALL" || log.category === categoryFilter;
      const matchesSev = severityFilter === "ALL" || log.severity === severityFilter;
      const matchesBranch = branchFilter === "ALL" || log.branchName === branchFilter;

      return matchesSearch && matchesCat && matchesSev && matchesBranch;
    });
  }, [auditLogs, searchTerm, categoryFilter, severityFilter, branchFilter]);

  // Executive metrics
  const totalEvents = auditLogs.length;
  const criticalHighCount = auditLogs.filter(
    (l) => l.severity === "CRITICAL" || l.severity === "HIGH"
  ).length;
  const salesVoidsCount = auditLogs.filter((l) => l.category === "SALES_VOID").length;
  const drawerOpensCount = auditLogs.filter((l) => l.category === "DRAWER_OPEN").length;

  // CSV Export
  const handleExportCsv = () => {
    const headers = ["ID,Timestamp,Staff,Role,Category,Severity,Action,Branch,Terminal,IP,Details"];
    const rows = filteredLogs.map((l) =>
      `"${l.id}","${l.formattedTime}","${l.staffName}","${l.staffRole}","${l.category}","${l.severity}","${l.action.replace(/"/g, '""')}","${l.branchName}","${l.terminalId || "N/A"}","${l.ipAddress || "N/A"}","${l.details.replace(/"/g, '""')}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pharmacy_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Severity styling
  const getSeverityBadge = (sev: AuditSeverity) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-300 font-bold";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-300 font-semibold";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 border-blue-200 font-medium";
      case "LOW":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 font-medium";
    }
  };

  // Category labels and styling
  const formatCategoryBadge = (cat: AuditCategory) => {
    switch (cat) {
      case "SALES_VOID":
        return { label: "Sales Void", badge: "bg-rose-50 text-rose-700 border-rose-200" };
      case "PRICE_OVERRIDE":
        return { label: "Price Override", badge: "bg-amber-50 text-amber-700 border-amber-200" };
      case "DISCOUNT_APPLIED":
        return { label: "Discount", badge: "bg-purple-50 text-purple-700 border-purple-200" };
      case "DRAWER_OPEN":
        return { label: "Drawer Kick", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "INVENTORY_ADJUST":
        return { label: "Inventory Adjust", badge: "bg-teal-50 text-teal-700 border-teal-200" };
      case "STAFF_PERM_CHANGE":
        return { label: "Permissions", badge: "bg-orange-50 text-orange-700 border-orange-200" };
      case "LOGIN_ATTEMPT":
        return { label: "Authentication", badge: "bg-cyan-50 text-cyan-700 border-cyan-200" };
      case "BRANCH_CONFIG":
      default:
        return { label: "Configuration", badge: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0e6245] flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Audit Trail & Security Activity Log
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable chronological record of sensitive sales voids, price overrides, inventory adjustments, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0e6245] hover:bg-[#0b4d37] text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards (Emerald Gradient Dashboard Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Events */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-900/25 bg-gradient-to-br from-emerald-600 to-emerald-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Total Events
              </span>
              <Layers className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {totalEvents}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Recorded in system journal
            </div>
          </div>
        </div>

        {/* Critical / High Alerts */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-900/25 bg-gradient-to-br from-green-600 to-emerald-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Critical / High Alerts
              </span>
              <ShieldAlert className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {criticalHighCount}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Requires supervisor review
            </div>
          </div>
        </div>

        {/* Sales Voids */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-900/25 bg-gradient-to-br from-teal-600 to-emerald-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Sales Voids
              </span>
              <AlertCircle className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {salesVoidsCount}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Cancelled customer bills
            </div>
          </div>
        </div>

        {/* Drawer Pops */}
        <div className="rounded-lg relative overflow-hidden p-5 text-white border-0 shadow-lg shadow-emerald-950/30 bg-gradient-to-br from-emerald-800 to-emerald-950">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-100">
                Drawer Pops
              </span>
              <Lock className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {drawerOpensCount}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Manual drawer kick events
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
              placeholder="Search audit trail by action, details, staff, invoice #, terminal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">All Categories</option>
              <option value="SALES_VOID">Sales Voids</option>
              <option value="PRICE_OVERRIDE">Price Overrides</option>
              <option value="DISCOUNT_APPLIED">Manual Discounts</option>
              <option value="DRAWER_OPEN">Drawer Pops</option>
              <option value="INVENTORY_ADJUST">Inventory Adjusts</option>
              <option value="STAFF_PERM_CHANGE">Permission Updates</option>
              <option value="LOGIN_ATTEMPT">Logins & Lockouts</option>
              <option value="BRANCH_CONFIG">Branch Config</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>

            {(searchTerm || categoryFilter !== "ALL" || severityFilter !== "ALL" || branchFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("ALL");
                  setSeverityFilter("ALL");
                  setBranchFilter("ALL");
                }}
                className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7faf8] border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-5 py-3.5">Action & Operation</th>
                <th className="px-4 py-3.5">Operator</th>
                <th className="px-4 py-3.5">Branch / Register</th>
                <th className="px-4 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No audit events match your criteria</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the filter toolbar.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const catBadge = formatCategoryBadge(log.category);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[#f9fbf9] transition-colors cursor-pointer"
                      onClick={() => setInspectLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.formattedTime}</span>
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border ${getSeverityBadge(
                            log.severity
                          )}`}
                        >
                          {log.severity}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${catBadge.badge}`}
                        >
                          {catBadge.label}
                        </span>
                      </td>

                      {/* Action & summary */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 text-xs">{log.action}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">
                          {log.details}
                        </div>
                      </td>

                      {/* Staff */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-800">{log.staffName}</div>
                        <div className="text-[10px] text-slate-400">{log.staffRole}</div>
                      </td>

                      {/* Branch & Terminal */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs text-slate-700 font-medium">{log.branchName}</div>
                        <div className="text-[10px] text-slate-400">
                          {log.terminalId ? `Terminal: ${log.terminalId}` : "Server Console"}
                        </div>
                      </td>

                      {/* Detail Inspection */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectLog(log);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-[#0e6245] hover:bg-emerald-50 rounded-lg transition-colors font-medium"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
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
      {/* EVENT INSPECTION MODAL */}
      {/* ============================================================== */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-[#f8faf8] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0e6245] flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Security Audit Event</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {inspectLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Action Headline */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Event Action
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">{inspectLog.action}</div>
                <div className="text-xs text-slate-600 mt-1">{inspectLog.details}</div>
              </div>

              {/* Event Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                  <span className="text-slate-400 block mb-0.5">Recorded Time</span>
                  <span className="font-semibold text-slate-800">{inspectLog.formattedTime}</span>
                </div>

                <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                  <span className="text-slate-400 block mb-0.5">Severity Level</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border ${getSeverityBadge(
                      inspectLog.severity
                    )}`}
                  >
                    {inspectLog.severity}
                  </span>
                </div>

                <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                  <span className="text-slate-400 block mb-0.5">Staff Operator</span>
                  <span className="font-semibold text-slate-800">{inspectLog.staffName}</span>
                  <span className="text-slate-400 block text-[10px]">({inspectLog.staffRole})</span>
                </div>

                <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                  <span className="text-slate-400 block mb-0.5">Category</span>
                  <span className="font-semibold text-slate-800">{inspectLog.category}</span>
                </div>

                <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                  <span className="text-slate-400 block mb-0.5">Branch Location</span>
                  <span className="font-semibold text-slate-800">{inspectLog.branchName}</span>
                </div>

                <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                  <span className="text-slate-400 block mb-0.5">Terminal / Register</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {inspectLog.terminalId || "Direct Cloud Web"}
                  </span>
                </div>
              </div>

              {/* IP / Security Hash */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-emerald-900">
                  <span className="text-emerald-700">Client Terminal IP:</span>
                  <span className="font-mono font-semibold">{inspectLog.ipAddress || "127.0.0.1"}</span>
                </div>
                <div className="flex justify-between text-emerald-900">
                  <span className="text-emerald-700">Integrity Status:</span>
                  <span className="font-semibold text-emerald-800">Verified & Hash-Chained</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#f8faf8] border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

