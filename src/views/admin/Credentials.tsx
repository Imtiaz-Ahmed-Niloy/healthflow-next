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
  Award, ShieldCheck, AlertTriangle,
  Calendar, Plus, ShieldAlert,
} from "lucide-react";

type StaffCredential = {
  id: string;
  tenant_id?: string;
  employee_id: string;
  title: string;
  credential_type: "medical_license" | "nursing_license" | "clinical_certification" | "life_support" | "fellowship" | "other";
  registration_number: string;
  issuing_authority: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  verification_status: "pending" | "verified" | "expired" | "rejected";
  document_url?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  employees?: {
    id: string;
    name: string;
    emp_id: string;
    department?: string | null;
    designation?: string | null;
  } | null;
};

const CREDENTIAL_TYPES = [
  { key: "medical_license", label: "Medical License (BMDC)" },
  { key: "nursing_license", label: "Nursing License (BNMC)" },
  { key: "clinical_certification", label: "Clinical Certification" },
  { key: "life_support", label: "Life Support (BLS / ACLS)" },
  { key: "fellowship", label: "Fellowship / Specialty" },
  { key: "other", label: "Other Official License" },
] as const;

// Expiry calculation helper
const getDaysUntilExpiry = (expiryStr?: string | null) => {
  if (!expiryStr) return null;
  const exp = new Date(expiryStr);
  const diffTime = exp.getTime() - Date.now();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function CredentialsView() {
  const { formatDate } = useFormatters();
  const { items: credentials, create, update, remove } = useResourceCrud<StaffCredential>("staff-credentials");
  const { items: staffList } = useResourceCrud<EmployeeRow>("employees");

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<StaffCredential | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [employeeId, setEmployeeId] = useState("");
  const [title, setTitle] = useState("BMDC Full Registration");
  const [credentialType, setCredentialType] = useState<StaffCredential["credential_type"]>("medical_license");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("BMDC");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<StaffCredential["verification_status"]>("pending");
  const [documentUrl, setDocumentUrl] = useState("");
  const [notes, setNotes] = useState("");

  // KPI Calculations
  const totalCredentials = credentials.length;
  const verifiedCount = credentials.filter(c => c.verification_status === "verified").length;
  const expiringSoonCount = credentials.filter(c => {
    const days = getDaysUntilExpiry(c.expiry_date);
    return days !== null && days >= 0 && days <= 30;
  }).length;
  const expiredCount = credentials.filter(c => {
    const days = getDaysUntilExpiry(c.expiry_date);
    return c.verification_status === "expired" || (days !== null && days < 0);
  }).length;

  const filteredCredentials = useMemo(() => {
    return credentials.filter((c) => {
      if (typeFilter !== "all" && c.credential_type !== typeFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "expiring_soon") {
          const days = getDaysUntilExpiry(c.expiry_date);
          if (days === null || days < 0 || days > 30) return false;
        } else if (statusFilter === "expired") {
          const days = getDaysUntilExpiry(c.expiry_date);
          if (c.verification_status !== "expired" && (days === null || days >= 0)) return false;
        } else if (c.verification_status !== statusFilter) {
          return false;
        }
      }
      if (!q) return true;
      const term = q.toLowerCase();
      const staffName = c.employees?.name?.toLowerCase() || "";
      const empId = c.employees?.emp_id?.toLowerCase() || "";
      return (
        c.title.toLowerCase().includes(term) ||
        c.registration_number.toLowerCase().includes(term) ||
        c.issuing_authority.toLowerCase().includes(term) ||
        staffName.includes(term) ||
        empId.includes(term) ||
        (c.notes && c.notes.toLowerCase().includes(term))
      );
    });
  }, [credentials, typeFilter, statusFilter, q]);

  const handleOpenAdd = () => {
    setEditing(null);
    setEmployeeId(staffList[0]?.id || "");
    setTitle("BMDC Full Registration");
    setCredentialType("medical_license");
    setRegistrationNumber("");
    setIssuingAuthority("Bangladesh Medical & Dental Council (BMDC)");
    setIssueDate(new Date().toISOString().slice(0, 10));
    setExpiryDate("");
    setVerificationStatus("verified");
    setDocumentUrl("");
    setNotes("");
    setAddOpen(true);
  };

  const handleOpenEdit = (cred: StaffCredential) => {
    setEditing(cred);
    setEmployeeId(cred.employee_id);
    setTitle(cred.title);
    setCredentialType(cred.credential_type);
    setRegistrationNumber(cred.registration_number);
    setIssuingAuthority(cred.issuing_authority);
    setIssueDate(cred.issue_date || "");
    setExpiryDate(cred.expiry_date || "");
    setVerificationStatus(cred.verification_status);
    setDocumentUrl(cred.document_url || "");
    setNotes(cred.notes || "");
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
      const payload: Omit<StaffCredential, "id"> = {
        employee_id: employeeId,
        title: title.trim(),
        credential_type: credentialType,
        registration_number: registrationNumber.trim(),
        issuing_authority: issuingAuthority.trim(),
        issue_date: issueDate || undefined,
        expiry_date: expiryDate || undefined,
        verification_status: verificationStatus,
        document_url: documentUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editing) {
        await update(editing.id, payload);
      } else {
        await create(payload);
      }
      setAddOpen(false);
    } catch {
      toast.error(editing ? "Failed to update credential" : "Failed to register credential");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<StaffCredential>[] = [
    {
      key: "employee_id",
      label: "Staff Member",
      sortable: true,
      render: (c) => (
        <div>
          <div className="font-bold text-foreground">
            {c.employees?.name || "Staff Member"}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{c.employees?.emp_id || "—"}</span>
            {c.employees?.designation && <span>· {c.employees.designation}</span>}
          </div>
        </div>
      ),
    },
    {
      key: "title",
      label: "Credential / License",
      sortable: true,
      render: (c) => (
        <div>
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <Award className="h-4 w-4 text-primary shrink-0" />
            {c.title}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {c.credential_type.replace(/_/g, " ").toUpperCase()}
          </div>
        </div>
      ),
    },
    {
      key: "registration_number",
      label: "Registration No. & Authority",
      render: (c) => (
        <div>
          <div className="font-mono text-xs font-semibold text-primary">
            {c.registration_number}
          </div>
          <div className="text-xs text-muted-foreground">
            {c.issuing_authority}
          </div>
        </div>
      ),
    },
    {
      key: "expiry_date",
      label: "Validity & Expiry",
      sortable: true,
      render: (c) => {
        if (!c.expiry_date) {
          return <span className="text-xs text-muted-foreground">Permanent / Lifetime</span>;
        }
        const days = getDaysUntilExpiry(c.expiry_date);
        const isExpired = days !== null && days < 0;
        const isExpiringSoon = days !== null && days >= 0 && days <= 30;

        return (
          <div>
            <div className="text-xs font-medium text-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {formatDate(c.expiry_date)}
            </div>
            {isExpired ? (
              <span className="text-[11px] font-bold text-destructive">
                Expired {Math.abs(days!)}d ago
              </span>
            ) : isExpiringSoon ? (
              <span className="text-[11px] font-bold text-amber-600">
                Expires in {days} days!
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Valid ({days}d remaining)
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "verification_status",
      label: "Verification",
      render: (c) => {
        const days = getDaysUntilExpiry(c.expiry_date);
        if (days !== null && days < 0) {
          return <Pill tone="bad">EXPIRED</Pill>;
        }
        switch (c.verification_status) {
          case "verified": return <Pill tone="ok">VERIFIED</Pill>;
          case "pending": return <Pill tone="warn">PENDING</Pill>;
          case "expired": return <Pill tone="bad">EXPIRED</Pill>;
          case "rejected": return <Pill tone="bad">REJECTED</Pill>;
          default: return <Pill tone="default">UNKNOWN</Pill>;
        }
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (c) => (
        <RowActions
          onEdit={() => handleOpenEdit(c)}
          onDelete={async () => {
            if (confirm("Delete this credential record?")) {
              await remove(c.id);
            }
          }}
        />
      ),
    },
  ];

  return (
    <AdminLayout
      title="Staff Credentials & License Registry"
      subtitle="BMDC registrations, Nursing Council licenses, BLS/ACLS certificates, and clinical license expiry tracking"
    >
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            label="Total Credentials Tracked"
            value={totalCredentials}
            trend="Registered"
            icon={Award}
            tone="default"
          />
          <Kpi
            label="Verified Licenses"
            value={verifiedCount}
            trend="Authenticated"
            icon={ShieldCheck}
            tone="ok"
          />
          <Kpi
            label="Expiring Soon (30d)"
            value={expiringSoonCount}
            trend="Needs Renewal"
            icon={AlertTriangle}
            tone="accent"
          />
          <Kpi
            label="Expired Licenses"
            value={expiredCount}
            trend="Audit Required"
            icon={ShieldAlert}
            tone="destructive"
          />
        </div>

        {/* Main Card */}
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <SectionTitle
              title="Official Staff Licenses & Certifications"
              action={
                <div className="flex items-center gap-2">
                  <Btn variant="outline" className="text-xs px-3 py-1.5" onClick={() => exportCSV(filteredCredentials as unknown as Record<string, unknown>[], "staff-credentials")}>
                    Export CSV
                  </Btn>
                  <Btn variant="primary" className="text-xs px-3 py-1.5" onClick={handleOpenAdd}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Register License
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
              <span className="text-xs font-semibold text-muted-foreground">Type:</span>
              <Chips
                options={[
                  { value: "all", label: "All Types" },
                  { value: "medical_license", label: "BMDC (Doctor)" },
                  { value: "nursing_license", label: "BNMC (Nurse)" },
                  { value: "clinical_certification", label: "Clinical Cert" },
                  { value: "life_support", label: "BLS/ACLS" },
                ]}
                value={typeFilter}
                onChange={setTypeFilter}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Status:</span>
              <Chips
                options={[
                  { value: "all", label: "All" },
                  { value: "verified", label: "Verified" },
                  { value: "pending", label: "Pending" },
                  { value: "expiring_soon", label: "Expiring Soon" },
                  { value: "expired", label: "Expired" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={filteredCredentials}
            empty="No credentials found matching the selected filter."
          />
        </Card>
      </div>

      {/* Register / Edit Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={editing ? "Edit Staff Credential" : "Register Staff License / Credential"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Select Staff Member <span className="text-destructive">*</span>
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

          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              License / Credential Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. BMDC Full Medical Practitioner Registration"
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Credential Category
              </label>
              <select
                value={credentialType}
                onChange={(e) => setCredentialType(e.target.value as StaffCredential["credential_type"])}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              >
                {CREDENTIAL_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Registration / License No. <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. A-12345 or N-54321"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Issuing Authority <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                placeholder="e.g. BMDC, BNMC, AHA"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Verification Status
              </label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value as StaffCredential["verification_status"])}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              >
                <option value="verified">VERIFIED</option>
                <option value="pending">PENDING AUDIT</option>
                <option value="expired">EXPIRED</option>
                <option value="rejected">REJECTED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Expiry Date (Leave blank if permanent)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Document Reference / URL
            </label>
            <input
              type="text"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="e.g. R2 storage key or scan document link"
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Compliance Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special authorization limits, verification comments..."
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Btn variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update Credential" : "Register Credential"}
            </Btn>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
