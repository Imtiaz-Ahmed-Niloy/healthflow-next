"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi, SectionTitle } from "@/components/admin/ui";
import { DataTable, Toolbar, Modal, Chips, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useFormatters } from "@/lib/appSettings";
import { toast } from "sonner";
import {
  Briefcase, Users, UserCheck, Building,
  Calendar, Plus, Clock,
} from "lucide-react";

type JobOpening = {
  id: string;
  tenant_id?: string;
  job_title: string;
  department: string;
  employment_type: "full_time" | "part_time" | "contract" | "locum" | "intern";
  experience_required?: string | null;
  vacancies: number;
  closing_date?: string | null;
  job_description?: string | null;
  requirements?: string | null;
  status: "draft" | "active" | "interviewing" | "closed" | "cancelled";
  created_at?: string;
  updated_at?: string;
};

const EMPLOYMENT_TYPES = [
  { key: "full_time", label: "Full Time" },
  { key: "part_time", label: "Part Time" },
  { key: "contract", label: "Contractual" },
  { key: "locum", label: "Locum / Visiting" },
  { key: "intern", label: "Clinical Intern" },
] as const;

export default function RecruitmentView() {
  const { formatDate } = useFormatters();
  const { items: jobs, create, update, remove } = useResourceCrud<JobOpening>("job-openings");

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<JobOpening | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState<JobOpening["employment_type"]>("full_time");
  const [experienceRequired, setExperienceRequired] = useState("2+ years clinical experience");
  const [vacancies, setVacancies] = useState("1");
  const [closingDate, setClosingDate] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [status, setStatus] = useState<JobOpening["status"]>("active");

  // KPI Calculations
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => j.status === "active").length;
  const interviewingJobs = jobs.filter(j => j.status === "interviewing").length;
  const totalOpenPositions = jobs
    .filter(j => j.status === "active" || j.status === "interviewing")
    .reduce((sum, j) => sum + (Number(j.vacancies) || 1), 0);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (typeFilter !== "all" && j.employment_type !== typeFilter) return false;
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (!q) return true;
      const term = q.toLowerCase();
      return (
        j.job_title.toLowerCase().includes(term) ||
        j.department.toLowerCase().includes(term) ||
        (j.experience_required && j.experience_required.toLowerCase().includes(term)) ||
        (j.job_description && j.job_description.toLowerCase().includes(term)) ||
        (j.requirements && j.requirements.toLowerCase().includes(term))
      );
    });
  }, [jobs, typeFilter, statusFilter, q]);

  const handleOpenAdd = () => {
    setEditing(null);
    setJobTitle("");
    setDepartment("General Clinical");
    setEmploymentType("full_time");
    setExperienceRequired("2+ years clinical experience");
    setVacancies("1");
    setClosingDate("");
    setJobDescription("");
    setRequirements("Relevant clinical qualification & valid council registration.");
    setStatus("active");
    setAddOpen(true);
  };

  const handleOpenEdit = (job: JobOpening) => {
    setEditing(job);
    setJobTitle(job.job_title);
    setDepartment(job.department);
    setEmploymentType(job.employment_type);
    setExperienceRequired(job.experience_required || "");
    setVacancies(String(job.vacancies));
    setClosingDate(job.closing_date || "");
    setJobDescription(job.job_description || "");
    setRequirements(job.requirements || "");
    setStatus(job.status);
    setAddOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Omit<JobOpening, "id"> = {
        job_title: jobTitle.trim(),
        department: department.trim(),
        employment_type: employmentType,
        experience_required: experienceRequired.trim() || undefined,
        vacancies: Math.max(1, parseInt(vacancies, 10) || 1),
        closing_date: closingDate || undefined,
        job_description: jobDescription.trim() || undefined,
        requirements: requirements.trim() || undefined,
        status,
      };

      if (editing) {
        await update(editing.id, payload);
      } else {
        await create(payload);
      }
      setAddOpen(false);
    } catch {
      toast.error(editing ? "Failed to update job" : "Failed to create job opening");
    } finally {
      setSaving(false);
    }
  };

  const statusTone = (st: JobOpening["status"]) => {
    switch (st) {
      case "active": return "ok";
      case "interviewing": return "warn";
      case "draft": return "default";
      case "closed": return "info";
      case "cancelled": return "bad";
      default: return "default";
    }
  };

  const columns: Column<JobOpening>[] = [
    {
      key: "job_title",
      label: "Job Title & Department",
      sortable: true,
      render: (j) => (
        <div>
          <div className="font-bold text-foreground">
            {j.job_title}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Building className="h-3 w-3" />
            <span>{j.department}</span>
          </div>
        </div>
      ),
    },
    {
      key: "employment_type",
      label: "Type & Experience",
      render: (j) => (
        <div>
          <div className="text-xs font-semibold text-primary">
            {j.employment_type.replace(/_/g, " ").toUpperCase()}
          </div>
          {j.experience_required && (
            <div className="text-[11px] text-muted-foreground">
              {j.experience_required}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "vacancies",
      label: "Vacancies",
      sortable: true,
      render: (j) => (
        <Pill tone="info">
          {j.vacancies} {j.vacancies === 1 ? "Post" : "Posts"}
        </Pill>
      ),
    },
    {
      key: "closing_date",
      label: "Application Deadline",
      sortable: true,
      render: (j) => (
        <div className="text-xs font-medium text-foreground flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {j.closing_date ? formatDate(j.closing_date) : "Open Until Filled"}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (j) => (
        <Pill tone={statusTone(j.status)}>
          {j.status.toUpperCase()}
        </Pill>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (j) => (
        <RowActions
          onEdit={() => handleOpenEdit(j)}
          onDelete={async () => {
            if (confirm("Remove this job opening?")) {
              await remove(j.id);
            }
          }}
        />
      ),
    },
  ];

  return (
    <AdminLayout
      title="Hospital Recruitment & Job Openings"
      subtitle="Departmental staff requisitions, clinical vacancies, employment criteria and applicant hiring pipeline"
    >
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            label="Active Vacancies"
            value={activeJobs}
            trend="Open"
            icon={Briefcase}
            tone="ok"
          />
          <Kpi
            label="Total Posts to Hire"
            value={totalOpenPositions}
            trend="Staff requisition"
            icon={Users}
            tone="default"
          />
          <Kpi
            label="Interviewing Stage"
            value={interviewingJobs}
            trend="Screening"
            icon={UserCheck}
            tone="accent"
          />
          <Kpi
            label="Total Requisitions"
            value={totalJobs}
            trend="All positions"
            icon={Clock}
            tone="primary"
          />
        </div>

        {/* Main Card */}
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <SectionTitle
              title="Job Openings & Requisitions"
              action={
                <div className="flex items-center gap-2">
                  <Btn variant="outline" className="text-xs px-3 py-1.5" onClick={() => exportCSV(filteredJobs as unknown as Record<string, unknown>[], "job-openings")}>
                    Export CSV
                  </Btn>
                  <Btn variant="primary" className="text-xs px-3 py-1.5" onClick={handleOpenAdd}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    New Job Opening
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
                  { value: "full_time", label: "Full Time" },
                  { value: "part_time", label: "Part Time" },
                  { value: "contract", label: "Contract" },
                  { value: "locum", label: "Locum" },
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
                  { value: "active", label: "Active" },
                  { value: "interviewing", label: "Interviewing" },
                  { value: "closed", label: "Closed" },
                  { value: "draft", label: "Draft" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={filteredJobs}
            empty="No job openings found matching the filter."
          />
        </Card>
      </div>

      {/* Modal Form */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={editing ? "Edit Job Opening" : "Create New Job Opening"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Job Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Medical Officer (SMO) - Emergency Care"
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Department <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Cardiology, Emergency, ICU"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as JobOpening["employment_type"])}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Number of Vacancies
              </label>
              <input
                type="number"
                min="1"
                value={vacancies}
                onChange={(e) => setVacancies(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Experience Required
              </label>
              <input
                type="text"
                value={experienceRequired}
                onChange={(e) => setExperienceRequired(e.target.value)}
                placeholder="e.g. 2-5 years clinical experience"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Application Deadline
              </label>
              <input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Requisition Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as JobOpening["status"])}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              >
                <option value="active">ACTIVE (Accepting Applications)</option>
                <option value="interviewing">INTERVIEWING</option>
                <option value="draft">DRAFT</option>
                <option value="closed">CLOSED</option>
                <option value="cancelled">CANCELLED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Job Description & Duties
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Clinical responsibilities, shift patterns, departmental role..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Minimum Qualifications & Skills
            </label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Degrees required (MBBS/FCPS/Diploma in Nursing), statutory license (BMDC/BNMC)..."
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Btn variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update Opening" : "Create Opening"}
            </Btn>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
