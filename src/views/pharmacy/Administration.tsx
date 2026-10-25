"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  Users,
  FileText,
  Building2,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Sliders,
  Monitor,
  Activity,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";

export default function AdministrationHubPage() {
  const { staffMembers, branches, auditLogs } = usePharmacy();

  const totalStaff = staffMembers.length;
  const activeStaff = staffMembers.filter((s) => s.status === "ACTIVE").length;
  const totalBranches = branches.length;
  const totalTerminals = branches.reduce((acc, b) => acc + (b.terminals?.length || 0), 0);
  const criticalAuditLogs = auditLogs.filter((l) => l.severity === "CRITICAL" || l.severity === "HIGH").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0e6245] via-[#117a56] to-[#0f766e] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-100 text-xs font-semibold mb-3 border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Governance & Administration Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Pharmacy Administration & Compliance
          </h1>
          <p className="text-emerald-100/90 text-xs sm:text-sm mt-2 leading-relaxed">
            Manage pharmacy employees, fine-tune role-based permission boundaries, inspect immutable security audit trails, and oversee multi-branch outlet licensing and POS terminals.
          </p>
        </div>
      </div>

      {/* 3 Core Modules Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module 1: Staff & RBAC */}
        <Link
          href="/pharmacy/administration/staff"
          className="group glass-panel card-sheen glass-panel-hover rounded-2xl p-6 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 group-hover:bg-[#0e6245] text-[#0e6245] group-hover:text-white flex items-center justify-center transition-colors mb-4">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-[#0e6245] transition-colors">
                Staff & Roles (RBAC)
              </h2>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {totalStaff} Staff
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Create and manage pharmacists, cashiers, and managers. Set 4-digit POS register PINs and toggle granular permission switches.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0e6245]">
            <span>Manage Team & PINs</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 2: Audit Logs */}
        <Link
          href="/pharmacy/administration/audit-logs"
          className="group glass-panel card-sheen glass-panel-hover rounded-2xl p-6 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 group-hover:bg-amber-600 text-amber-700 group-hover:text-white flex items-center justify-center transition-colors mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                Audit Trail & Logs
              </h2>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {auditLogs.length} Events
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Immutable journal recording sales voids, price overrides, stock write-offs, cash drawer pops, and permission changes with IP addresses.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-700">
            <span>Inspect Security Journal</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Module 3: Branches & POS Registers */}
        <Link
          href="/pharmacy/administration/branches"
          className="group glass-panel card-sheen glass-panel-hover rounded-2xl p-6 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-teal-50 group-hover:bg-teal-700 text-teal-700 group-hover:text-white flex items-center justify-center transition-colors mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                Branches & Registers
              </h2>
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                {totalBranches} Branches
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Multi-branch dispensary management, Drug License Numbers, VAT/Tax details, Pharmacist-in-Charge credentials, and checkout counters.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700">
            <span>Configure Outlets</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Quick Security & Network Pulse */}
      <div className="glass-panel card-sheen rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Security Activity Stream</h3>
            <p className="text-xs text-slate-500">Latest operations recorded across all registers</p>
          </div>
          <Link
            href="/pharmacy/administration/audit-logs"
            className="text-xs font-semibold text-[#0e6245] hover:underline"
          >
            View Full Audit Log →
          </Link>
        </div>

        <div className="divide-y divide-slate-100 mt-2">
          {auditLogs.slice(0, 4).map((log) => (
            <div key={log.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    log.severity === "CRITICAL"
                      ? "bg-rose-500 animate-pulse"
                      : log.severity === "HIGH"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                />
                <div>
                  <div className="font-semibold text-slate-900">{log.action}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Operator: {log.staffName} ({log.staffRole}) • {log.branchName}
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-slate-500 whitespace-nowrap">
                {log.formattedTime}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

