"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi, SectionTitle } from "@/components/admin/ui";
import { DataTable, Toolbar, Modal, Chips, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useFormatters } from "@/lib/appSettings";
import {
  FileText, AlertCircle, ShieldAlert,
  Calendar, Users, Eye, Plus, BookOpen,
} from "lucide-react";

type HospitalCircular = {
  id: string;
  tenant_id?: string;
  circular_number: string;
  title: string;
  category: "administrative" | "clinical_protocol" | "emergency" | "holiday_policy" | "infection_control" | "general";
  priority: "normal" | "urgent" | "critical";
  target_audience: "all_staff" | "doctors_only" | "nurses_only" | "administrative" | "clinical_staff";
  published_date: string;
  valid_until?: string | null;
  content: string;
  status: "draft" | "published" | "archived";
  created_at?: string;
  updated_at?: string;
};

const CATEGORIES = [
  { key: "administrative", label: "Administrative" },
  { key: "clinical_protocol", label: "Clinical Protocol" },
  { key: "emergency", label: "Emergency Directive" },
  { key: "infection_control", label: "Infection Control" },
  { key: "holiday_policy", label: "Holiday / Policy" },
  { key: "general", label: "General Notice" },
] as const;

export default function CircularsView() {
  const { formatDate } = useFormatters();
  const { items: circulars, create, update, remove } = useResourceCrud<HospitalCircular>("hospital-circulars");

  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [previewing, setPreviewing] = useState<HospitalCircular | null>(null);
  const [editing, setEditing] = useState<HospitalCircular | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [circularNumber, setCircularNumber] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<HospitalCircular["category"]>("administrative");
  const [priority, setPriority] = useState<HospitalCircular["priority"]>("normal");
  const [targetAudience, setTargetAudience] = useState<HospitalCircular["target_audience"]>("all_staff");
  const [publishedDate, setPublishedDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<HospitalCircular["status"]>("published");

  // KPI Calculations
  const totalCirculars = circulars.length;
  const activePublished = circulars.filter(c => c.status === "published").length;
  const criticalCount = circulars.filter(c => c.priority === "critical" || c.priority === "urgent").length;
  const clinicalProtocols = circulars.filter(c => c.category === "clinical_protocol").length;

  const filteredCirculars = useMemo(() => {
    return circulars.filter((c) => {
      if (catFilter !== "all" && c.category !== catFilter) return false;
      if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      const term = q.toLowerCase();
      return (
        c.circular_number.toLowerCase().includes(term) ||
        c.title.toLowerCase().includes(term) ||
        c.content.toLowerCase().includes(term)
      );
    });
  }, [circulars, catFilter, priorityFilter, statusFilter, q]);

  const handleOpenAdd = () => {
    setEditing(null);
    const year = new Date().getFullYear();
    const nextSeq = String(circulars.length + 1).padStart(3, "0");
    setCircularNumber(`CIR-${year}/${nextSeq}`);
    setTitle("");
    setCategory("administrative");
    setPriority("normal");
    setTargetAudience("all_staff");
    setPublishedDate(new Date().toISOString().slice(0, 10));
    setValidUntil("");
    setContent("");
    setStatus("published");
    setAddOpen(true);
  };

  const handleOpenEdit = (c: HospitalCircular) => {
    setEditing(c);
    setCircularNumber(c.circular_number);
    setTitle(c.title);
    setCategory(c.category);
    setPriority(c.priority);
    setTargetAudience(c.target_audience);
    setPublishedDate(c.published_date);
    setValidUntil(c.valid_until || "");
    setContent(c.content);
    setStatus(c.status);
    setAddOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Omit<HospitalCircular, "id"> = {
        circular_number: circularNumber.trim(),
        title: title.trim(),
        category,
        priority,
        target_audience: targetAudience,
        published_date: publishedDate,
        valid_until: validUntil || undefined,
        content: content.trim(),
        status,
      };

      if (editing) {
        await update(editing.id, payload);
      } else {
        await create(payload);
      }
      setAddOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const priorityTone = (p: HospitalCircular["priority"]) => {
    switch (p) {
      case "critical": return "bad";
      case "urgent": return "warn";
      default: return "info";
    }
  };

  const columns: Column<HospitalCircular>[] = [
    {
      key: "circular_number",
      label: "Circular No. & Priority",
      sortable: true,
      render: (c) => (
        <div>
          <div className="font-mono text-xs font-bold text-primary">
            {c.circular_number}
          </div>
          <div className="mt-1">
            <Pill tone={priorityTone(c.priority)}>
              {c.priority.toUpperCase()}
            </Pill>
          </div>
        </div>
      ),
    },
    {
      key: "title",
      label: "Notice Title & Category",
      sortable: true,
      render: (c) => (
        <div className="max-w-md">
          <div className="font-semibold text-foreground hover:text-primary cursor-pointer line-clamp-1" onClick={() => setPreviewing(c)}>
            {c.title}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {c.category.replace(/_/g, " ").toUpperCase()}
          </div>
        </div>
      ),
    },
    {
      key: "target_audience",
      label: "Target Audience",
      render: (c) => (
        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {c.target_audience.replace(/_/g, " ").toUpperCase()}
        </div>
      ),
    },
    {
      key: "published_date",
      label: "Published Date",
      sortable: true,
      render: (c) => (
        <div>
          <div className="text-xs font-medium text-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {formatDate(c.published_date)}
          </div>
          {c.valid_until && (
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Valid until: {formatDate(c.valid_until)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (c) => (
        <Pill tone={c.status === "published" ? "ok" : c.status === "draft" ? "warn" : "default"}>
          {c.status.toUpperCase()}
        </Pill>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setPreviewing(c)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-card transition"
            title="Read notice"
          >
            <Eye className="h-4 w-4" />
          </button>
          <RowActions
            onEdit={() => handleOpenEdit(c)}
            onDelete={async () => {
              if (confirm("Delete this circular?")) {
                await remove(c.id);
              }
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Hospital Circulars & Administrative Notices"
      subtitle="Official administrative memorandums, clinical protocols, emergency guidelines, and internal hospital directives"
    >
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            label="Total Circulars"
            value={totalCirculars}
            trend="Official Records"
            icon={FileText}
            tone="default"
          />
          <Kpi
            label="Active Published Notices"
            value={activePublished}
            trend="Notice Board"
            icon={BookOpen}
            tone="ok"
          />
          <Kpi
            label="Urgent / Critical Notices"
            value={criticalCount}
            trend="High Priority"
            icon={ShieldAlert}
            tone="destructive"
          />
          <Kpi
            label="Clinical Protocols"
            value={clinicalProtocols}
            trend="Medical"
            icon={AlertCircle}
            tone="accent"
          />
        </div>

        {/* Main Card */}
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <SectionTitle
              title="Official Notice Board & Circulars"
              action={
                <div className="flex items-center gap-2">
                  <Btn variant="outline" className="text-xs px-3 py-1.5" onClick={() => exportCSV(filteredCirculars as unknown as Record<string, unknown>[], "hospital-circulars")}>
                    Export CSV
                  </Btn>
                  <Btn variant="primary" className="text-xs px-3 py-1.5" onClick={handleOpenAdd}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Issue New Circular
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
              <span className="text-xs font-semibold text-muted-foreground">Category:</span>
              <Chips
                options={[
                  { value: "all", label: "All Categories" },
                  { value: "administrative", label: "Administrative" },
                  { value: "clinical_protocol", label: "Clinical Protocol" },
                  { value: "emergency", label: "Emergency" },
                  { value: "infection_control", label: "Infection Control" },
                ]}
                value={catFilter}
                onChange={setCatFilter}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Priority:</span>
              <Chips
                options={[
                  { value: "all", label: "All Priorities" },
                  { value: "critical", label: "Critical" },
                  { value: "urgent", label: "Urgent" },
                  { value: "normal", label: "Normal" },
                ]}
                value={priorityFilter}
                onChange={setPriorityFilter}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Status:</span>
              <Chips
                options={[
                  { value: "all", label: "All" },
                  { value: "published", label: "Published" },
                  { value: "draft", label: "Draft" },
                  { value: "archived", label: "Archived" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={filteredCirculars}
            empty="No circulars or notices found matching the selected filter."
          />
        </Card>
      </div>

      {/* View Notice Preview Modal */}
      <Modal
        open={!!previewing}
        onClose={() => setPreviewing(null)}
        title={previewing?.title || "Hospital Notice"}
      >
        {previewing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs border-b border-border pb-3">
              <div>
                <span className="text-muted-foreground">Memo No: </span>
                <span className="font-mono font-bold text-foreground">{previewing.circular_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={priorityTone(previewing.priority)}>
                  {previewing.priority.toUpperCase()}
                </Pill>
                <Pill tone="default">
                  {previewing.category.replace(/_/g, " ").toUpperCase()}
                </Pill>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Audience: <strong className="text-foreground">{previewing.target_audience.replace(/_/g, " ").toUpperCase()}</strong></span>
              <span>Issued: <strong className="text-foreground">{formatDate(previewing.published_date)}</strong></span>
            </div>

            <div className="bg-card/70 border border-border/60 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground/90 max-h-96 overflow-y-auto">
              {previewing.content}
            </div>

            <div className="flex justify-end pt-2">
              <Btn variant="outline" onClick={() => setPreviewing(null)}>
                Close
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={editing ? "Edit Administrative Circular" : "Issue New Hospital Circular"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Circular Memo No. <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={circularNumber}
                onChange={(e) => setCircularNumber(e.target.value)}
                placeholder="CIR-2026/001"
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as HospitalCircular["priority"])}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical / Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Title / Subject <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Revised Infection Control Protocols in ICU & OT"
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HospitalCircular["category"])}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as HospitalCircular["target_audience"])}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              >
                <option value="all_staff">All Hospital Staff</option>
                <option value="clinical_staff">All Clinical Staff</option>
                <option value="doctors_only">Doctors & Consultants Only</option>
                <option value="nurses_only">Nursing Staff Only</option>
                <option value="administrative">Administrative & Support Staff</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Issue Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={publishedDate}
                onChange={(e) => setPublishedDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground/80 mb-1">
                Valid Until (Optional)
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Notice Content & Directives <span className="text-destructive">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the full circular notice, protocol directives, or administrative order..."
              rows={5}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-1">
              Publication Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as HospitalCircular["status"])}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
            >
              <option value="published">PUBLISHED (Active on Notice Board)</option>
              <option value="draft">DRAFT (Internal Review)</option>
              <option value="archived">ARCHIVED</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Btn variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" type="submit" disabled={saving}>
              {saving ? "Publishing..." : editing ? "Update Notice" : "Issue Notice"}
            </Btn>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
