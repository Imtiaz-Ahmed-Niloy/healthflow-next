"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi, SectionTitle } from "@/components/admin/ui";
import { DataTable, Toolbar, Modal, Chips, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useFormatters } from "@/lib/appSettings";
import { toast } from "sonner";
import type { EmployeeRow } from "@/redux/api/resources";
import {
  LogOut, CheckCircle2, Clock, FileCheck,
  Calendar, Plus,
} from "lucide-react";

type ExitClearance = {
  id: string;
  tenant_id?: string;
  employee_id: string;
  resignation_date: string;
  last_working_day: string;
  reason_for_leaving?: string | null;
  pharmacy_cleared: boolean;
  pharmacy_notes?: string | null;
  it_assets_cleared: boolean;
  it_notes?: string | null;
  library_records_cleared: boolean;
  accounts_finance_cleared: boolean;
  accounts_notes?: string | null;
  hr_admin_cleared: boolean;
  final_settlement_status: "pending" | "calculated" | "disbursed" | "on_hold";
  service_certificate_issued: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  employees?: {
    id: string;
    name: string;
    emp_id: string;
    department?: string | null;
    designation?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
};

export default function ClearanceView() {
  const { formatDate } = useFormatters();
  const { items: clearances, create, update, remove } = useResourceCrud<ExitClearance>("exit-clearances");
  const { items: staffList } = useResourceCrud<EmployeeRow>("employees");

  const [q, setQ] = useState("");
  const [settlementFilter, setSettlementFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ExitClearance | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [employeeId, setEmployeeId] = useState("");
  const [resignationDate, setResignationDate] = useState(new Date().toISOString().slice(0, 10));
  const [lastWorkingDay, setLastWorkingDay] = useState(new Date().toISOString().slice(0, 10));
  const [reasonForLeaving, setReasonForLeaving] = useState("");
  const [pharmacyCleared, setPharmacyCleared] = useState(false);
  const [pharmacyNotes, setPharmacyNotes] = useState("");
  const [itAssetsCleared, setItAssetsCleared] = useState(false);
  const [itNotes, setItNotes] = useState("");
  const [libraryRecordsCleared, setLibraryRecordsCleared] = useState(false);
  const [accountsFinanceCleared, setAccountsFinanceCleared] = useState(false);
  const [accountsNotes, setAccountsNotes] = useState("");
  const [hrAdminCleared, setHrAdminCleared] = useState(false);
  const [finalSettlementStatus, setFinalSettlementStatus] = useState<ExitClearance["final_settlement_status"]>("pending");
  const [serviceCertificateIssued, setServiceCertificateIssued] = useState(false);
  const [notes, setNotes] = useState("");

  // KPI Calculations
  const totalClearances = clearances.length;
  const inProgress = clearances.filter(c => !c.hr_admin_cleared || c.final_settlement_status !== "disbursed").length;
  const fullyCleared = clearances.filter(c => c.hr_admin_cleared && c.accounts_finance_cleared && c.it_assets_cleared && c.pharmacy_cleared).length;
  const certificatesIssued = clearances.filter(c => c.service_certificate_issued).length;

  const filteredClearances = useMemo(() => {
    return clearances.filter((c) => {
      if (settlementFilter !== "all" && c.final_settlement_status !== settlementFilter) return false;
      if (statusFilter === "cleared" && !c.hr_admin_cleared) return false;
      if (statusFilter === "pending_clearance" && c.hr_admin_cleared) return false;
      if (!q) return true;
      const term = q.toLowerCase();
      const staffName = c.employees?.name?.toLowerCase() || "";
      const empId = c.employees?.emp_id?.toLowerCase() || "";
      const dept = c.employees?.department?.toLowerCase() || "";
      return (
        staffName.includes(term) ||
        empId.includes(term) ||
        dept.includes(term) ||
        (c.reason_for_leaving && c.reason_for_leaving.toLowerCase().includes(term)) ||
        (c.notes && c.notes.toLowerCase().includes(term))
      );
    });
  }, [clearances, settlementFilter, statusFilter, q]);

  const handleOpenAdd = () => {
    setEditing(null);
    setEmployeeId(staffList[0]?.id || "");
    setResignationDate(new Date().toISOString().slice(0, 10));
    setLastWorkingDay(new Date().toISOString().slice(0, 10));
    setReasonForLeaving("");
    setPharmacyCleared(false);
    setPharmacyNotes("");
    setItAssetsCleared(false);
    setItNotes("");
    setLibraryRecordsCleared(false);
    setAccountsFinanceCleared(false);
    setAccountsNotes("");
    setHrAdminCleared(false);
    setFinalSettlementStatus("pending");
    setServiceCertificateIssued(false);
    setNotes("");
    setAddOpen(true);
  };

  const handleOpenEdit = (c: ExitClearance) => {
    setEditing(c);
    setEmployeeId(c.employee_id);
    setResignationDate(c.resignation_date);
    setLastWorkingDay(c.last_working_day);
    setReasonForLeaving(c.reason_for_leaving || "");
    setPharmacyCleared(c.pharmacy_cleared);
    setPharmacyNotes(c.pharmacy_notes || "");
    setItAssetsCleared(c.it_assets_cleared);
    setItNotes(c.it_notes || "");
    setLibraryRecordsCleared(c.library_records_cleared);
    setAccountsFinanceCleared(c.accounts_finance_cleared);
    setAccountsNotes(c.accounts_notes || "");
    setHrAdminCleared(c.hr_admin_cleared);
    setFinalSettlementStatus(c.final_settlement_status);
    setServiceCertificateIssued(c.service_certificate_issued);
    setNotes(c.notes || "");
    setAddOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error("Select an employee");
      return;
    }
    setSaving(true);
    try {
      const payload: Omit<ExitClearance, "id"> = {
        employee_id: employeeId,
        resignation_date: resignationDate,
        last_working_day: lastWorkingDay,
        reason_for_leaving: reasonForLeaving.trim() || undefined,
        pharmacy_cleared: pharmacyCleared,
        pharmacy_notes: pharmacyNotes.trim() || undefined,
        it_assets_cleared: itAssetsCleared,
        it_notes: itNotes.trim() || undefined,
        library_records_cleared: libraryRecordsCleared,
        accounts_finance_cleared: accountsFinanceCleared,
        accounts_notes: accountsNotes.trim() || undefined,
        hr_admin_cleared: hrAdminCleared,
        final_settlement_status: finalSettlementStatus,
        service_certificate_issued: serviceCertificateIssued,
        notes: notes.trim() || undefined,
      };

      if (editing) {
        await update(editing.id, payload);
      } else {
        await create(payload);
      }
      setAddOpen(false);
    } catch {
      toast.error(editing ? "Failed to update exit clearance" : "Failed to initiate exit clearance");
    } finally {
      setSaving(false);
    }
  };

  const settlementTone = (s: ExitClearance["final_settlement_status"]) => {
    switch (s) {
      case "disbursed": return "ok";
      case "calculated": return "info";
      case "pending": return "warn";
      case "on_hold": return "bad";
      default: return "default";
    }
  };

  const columns: Column<ExitClearance>[] = [
    {
      key: "employee_id",
      label: "Employee & Department",
      sortable: true,
      render: (c) => (
        <div>
          <div className="font-bold text-foreground">
            {c.employees?.name || "Employee"}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{c.employees?.emp_id || "—"}</span>
            {c.employees?.department && <span>· {c.employees.department}</span>}
          </div>
        </div>
      ),
    },
    {
      key: "timeline",
      label: "Exit Timeline",
      sortable: true,
      render: (c) => (
        <div>
          <div className="text-xs text-foreground flex items-center gap-1 font-medium">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            Last Day: {formatDate(c.last_working_day)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Resigned: {formatDate(c.resignation_date)}
          </div>
        </div>
      ),
    },
    {
      key: "clearance_checklist",
      label: "Clearance Handover Checklist",
      render: (c) => (
        <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
          <Pill tone={c.pharmacy_cleared ? "ok" : "warn"}>
            Rx {c.pharmacy_cleared ? "✓" : "..."}
          </Pill>
          <Pill tone={c.it_assets_cleared ? "ok" : "warn"}>
            IT {c.it_assets_cleared ? "✓" : "..."}
          </Pill>
          <Pill tone={c.accounts_finance_cleared ? "ok" : "warn"}>
            Accounts {c.accounts_finance_cleared ? "✓" : "..."}
          </Pill>
          <Pill tone={c.hr_admin_cleared ? "ok" : "warn"}>
            HR {c.hr_admin_cleared ? "✓" : "..."}
          </Pill>
        </div>
      ),
    },
    {
      key: "final_settlement_status",
      label: "Final Settlement",
      render: (c) => (
        <Pill tone={settlementTone(c.final_settlement_status)}>
          {c.final_settlement_status.toUpperCase()}
        </Pill>
      ),
    },
    {
      key: "certificate",
      label: "Service Certificate",
      render: (c) => (
        <Pill tone={c.service_certificate_issued ? "ok" : "default"}>
          {c.service_certificate_issued ? "ISSUED" : "PENDING"}
        </Pill>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (c) => (
        <RowActions
          onEdit={() => handleOpenEdit(c)}
          onDelete={async () => {
            if (confirm("Delete this exit clearance record?")) {
              await remove(c.id);
            }
          }}
        />
      ),
    },
  ];

  return (
    <AdminLayout
      title="Employee Offboarding & Exit Clearance"
      subtitle="Multi-department handover checklists, pharmacy stock verification, IT assets recovery, final settlement and service certificates"
    >
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            label="Total Exit Handshakes"
            value={totalClearances}
            trend="Cases"
            icon={LogOut}
            tone="default"
          />
          <Kpi
            label="In-Progress Clearances"
            value={inProgress}
            trend="Pending Sign-offs"
            icon={Clock}
            tone="accent"
          />
          <Kpi
            label="100% Cleared Staff"
            value={fullyCleared}
            trend="Complete"
            icon={CheckCircle2}
            tone="ok"
          />
          <Kpi
            label="Certificates Issued"
            value={certificatesIssued}
            trend="Relieving letters"
            icon={FileCheck}
            tone="primary"
          />
        </div>

        {/* Main Card */}
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <SectionTitle
              title="Offboarding & Relieving Workflow"
              action={
                <div className="flex items-center gap-2">
                  <Btn variant="outline" className="text-xs px-3 py-1.5" onClick={() => exportCSV(filteredClearances as unknown as Record<string, unknown>[], "exit-clearances")}>
                    Export CSV
                  </Btn>
                  <Btn variant="primary" className="text-xs px-3 py-1.5" onClick={handleOpenAdd}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Initiate Clearance
                  </Btn>
                </div>
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Toolbar
              search={q}
              onSearch={setQ}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Settlement:</span>
              <Chips
                options={[
                  { value: "all", label: "All Settlements" },
                  { value: "pending", label: "Pending" },
                  { value: "calculated", label: "Calculated" },
                  { value: "disbursed", label: "Disbursed" },
                  { value: "on_hold", label: "On Hold" },
                ]}
                value={settlementFilter}
                onChange={setSettlementFilter}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Clearance:</span>
              <Chips
                options={[
                  { value: "all", label: "All" },
                  { value: "cleared", label: "Fully Cleared" },
                  { value: "pending_clearance", label: "Pending Sign-offs" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={filteredClearances}
            empty="No offboarding clearance records found."
          />
        </Card>
      </div>

      {/* Modal Form */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={editing ? "Update Exit Clearance & Checklist" : "Initiate Staff Exit Clearance"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Select Resigning Staff Member <span className="text-destructive">*</span>
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              required
            >
              <option value="">— Select an employee —</option>
              {staffList.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.emp_id}) — {emp.department || "General"} {emp.designation ? `· ${emp.designation}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Resignation Notice Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={resignationDate}
                onChange={(e) => setResignationDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Last Working Day <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={lastWorkingDay}
                onChange={(e) => setLastWorkingDay(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Reason for Leaving / Resignation Details
            </label>
            <input
              type="text"
              value={reasonForLeaving}
              onChange={(e) => setReasonForLeaving(e.target.value)}
              placeholder="e.g. Higher studies, career relocation, personal reasons"
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
            />
          </div>

          {/* Department Clearances Checklist Card */}
          <div className="p-3.5 bg-card/60 border border-border/80 rounded-xl space-y-3">
            <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Department Clearance Sign-offs
            </h4>

            {/* Pharmacy Clearance */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={pharmacyCleared}
                  onChange={(e) => setPharmacyCleared(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                1. Pharmacy & Dispensary Clearance
              </label>
              <input
                type="text"
                value={pharmacyNotes}
                onChange={(e) => setPharmacyNotes(e.target.value)}
                placeholder="No outstanding medicine liabilities or dispensary stock discrepancy..."
                className="w-full px-2.5 py-1.5 border border-border/70 rounded-lg bg-card text-xs text-foreground"
              />
            </div>

            {/* IT Assets Clearance */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={itAssetsCleared}
                  onChange={(e) => setItAssetsCleared(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                2. IT Equipment & System Access Clearance
              </label>
              <input
                type="text"
                value={itNotes}
                onChange={(e) => setItNotes(e.target.value)}
                placeholder="Hospital laptop, biometric ID card returned, email and ERP access revoked..."
                className="w-full px-2.5 py-1.5 border border-border/70 rounded-lg bg-card text-xs text-foreground"
              />
            </div>

            {/* Accounts Clearance */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={accountsFinanceCleared}
                  onChange={(e) => setAccountsFinanceCleared(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                3. Accounts & Financial Dues Clearance
              </label>
              <input
                type="text"
                value={accountsNotes}
                onChange={(e) => setAccountsNotes(e.target.value)}
                placeholder="Salary advance repaid, petty cash balance verified..."
                className="w-full px-2.5 py-1.5 border border-border/70 rounded-lg bg-card text-xs text-foreground"
              />
            </div>

            {/* HR Admin Clearance */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={hrAdminCleared}
                  onChange={(e) => setHrAdminCleared(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                4. HR & Administration Final Approval
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Final Settlement Status
              </label>
              <select
                value={finalSettlementStatus}
                onChange={(e) => setFinalSettlementStatus(e.target.value as ExitClearance["final_settlement_status"])}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              >
                <option value="pending">PENDING</option>
                <option value="calculated">CALCULATED</option>
                <option value="disbursed">DISBURSED / PAID</option>
                <option value="on_hold">ON HOLD</option>
              </select>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={serviceCertificateIssued}
                  onChange={(e) => setServiceCertificateIssued(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                Service / Relieving Certificate Issued
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Administrative & Handover Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Exit interview comments, replacement recruitment status..."
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Btn variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update Clearance" : "Initiate Clearance"}
            </Btn>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
