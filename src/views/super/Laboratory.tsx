"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, Kpi, Pill, Btn } from "@/components/admin/ui";
import {
  DataTable,
  Drawer,
  Chips,
  exportCSV,
  Modal,
  ConfirmDialog,
  type Column,
} from "@/components/admin/crud";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FlaskConical,
  Building2,
  Boxes,
  Users,
  Search,
  Download,
  BadgeCheck,
  ShieldAlert,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  RefreshCw,
  Eye,
  Plus,
  Loader2,
  KeyRound,
  Copy,
  ExternalLink,
  Cpu,
  Activity,
  Microscope,
} from "lucide-react";

export type LabFacilityRow = {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  hospital_name: string;
  license_no: string;
  pathologist: string;
  phone: string | null;
  email: string;
  address: string | null;
  hours: string;
  status: "active" | "maintenance" | "inactive";
  tests_count: number;
  orders_today: number;
  created_at: string;
};

type Stats = {
  total: number;
  active: number;
  tests: number;
  staff: number;
};

type CredsResult = {
  email: string;
  password?: string;
  facility?: string;
  alreadyProvisioned?: boolean;
};

type NewLabForm = {
  name: string;
  code: string;
  hospital_id: string;
  license_no: string;
  pathologist: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  status: "active" | "maintenance" | "inactive";
};

const initialForm: NewLabForm = {
  name: "",
  code: "MAIN-LAB",
  hospital_id: "",
  license_no: "",
  pathologist: "",
  phone: "",
  email: "",
  address: "",
  hours: "24/7",
  status: "active",
};

const STATUS_TONES: Record<string, "ok" | "warn" | "default"> = {
  active: "ok",
  maintenance: "warn",
  inactive: "default",
};

export default function SuperLaboratoryView() {
  const t = useTranslations("super.lab");
  const tc = useTranslations("common");

  const [labs, setLabs] = useState<LabFacilityRow[]>([]);
  const [hospitals, setHospitals] = useState<{ id: string; name: string }[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, tests: 0, staff: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [creating, setCreating] = useState(false);

  // Filters & search
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected for drawer
  const [selected, setSelected] = useState<LabFacilityRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewLabForm>(initialForm);

  // Credential modal & reset state
  const [creds, setCreds] = useState<CredsResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingReset, setPendingReset] = useState<LabFacilityRow | null>(null);

  const fetchLabs = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/super/labs");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (json.data) {
        setLabs(json.data.labs || []);
        if (json.data.hospitals) setHospitals(json.data.hospitals);
        if (json.data.stats) setStats(json.data.stats);
      }
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setLoading(false);
    }
  }, [tc]);

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  const handleUpdateStatus = async (
    id: string,
    newStatus: "active" | "maintenance" | "inactive"
  ) => {
    setUpdating(true);
    try {
      const res = await fetch("/api/v1/super/labs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");

      setLabs((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("updateFailed"));
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("form.nameRequired"));
      return;
    }
    if (!form.email.trim()) {
      toast.error("Valid administrator email is required");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/v1/super/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create laboratory");
      }

      setCreateOpen(false);
      setForm(initialForm);
      toast.success(t("form.success"));

      if (json.data) {
        setLabs((prev) => [json.data, ...prev]);
        setStats((prev) => ({
          ...prev,
          total: prev.total + 1,
          active: prev.active + 1,
        }));
      }

      // Display newly generated admin credentials
      if (json.creds) {
        setCreds({
          email: json.creds.email,
          password: json.creds.password,
          facility: json.creds.facility || form.name,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create laboratory");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenReset = (lab: LabFacilityRow) => {
    setPendingReset(lab);
  };

  const handleConfirmReset = async () => {
    if (!pendingReset) return;
    const lab = pendingReset;
    setPendingReset(null);
    setBusyId(lab.id);

    try {
      const res = await fetch(`/api/v1/super/labs/${lab.id}/login`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || t("resetFailed"));

      setCreds({
        email: body.email || lab.email,
        password: body.password,
        facility: lab.name,
      });
      toast.success(t("resetDone"));
    } catch (err: any) {
      toast.error(err.message || t("resetFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("copied", { label }));
  };

  // Filtered rows
  const filtered = useMemo(() => {
    return labs.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        l.hospital_name.toLowerCase().includes(q) ||
        (l.pathologist || "").toLowerCase().includes(q) ||
        (l.license_no || "").toLowerCase().includes(q)
      );
    });
  }, [labs, query, statusFilter]);

  const columns: Column<LabFacilityRow>[] = [
    {
      key: "name",
      label: t("columns.facility"),
      sortable: true,
      accessor: (r) => r.name,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <FlaskConical className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-foreground truncate">{r.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[10px] text-primary font-bold">{r.code}</span>
              <span className="text-[10px] text-muted-foreground truncate">
                · {r.hospital_name}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "license_no",
      label: t("columns.license"),
      accessor: (r) => r.license_no,
      render: (r) => (
        <div>
          <span className="font-mono text-xs font-semibold text-foreground">
            {r.license_no || "DGHS-REG-PENDING"}
          </span>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
            <BadgeCheck className="h-3 w-3" /> ISO 15189 Certified
          </div>
        </div>
      ),
    },
    {
      key: "pathologist",
      label: t("columns.pathologist"),
      accessor: (r) => r.pathologist,
      render: (r) => (
        <div>
          <div className="font-medium text-xs text-foreground">{r.pathologist}</div>
          <div className="text-[10px] text-muted-foreground">Consultant Pathologist</div>
        </div>
      ),
    },
    {
      key: "email",
      label: t("columns.contact"),
      accessor: (r) => r.email,
      render: (r) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1 text-muted-foreground truncate">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{r.email}</span>
          </div>
          {r.phone && (
            <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{r.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: t("columns.status"),
      sortable: true,
      accessor: (r) => r.status,
      render: (r) => (
        <Pill tone={STATUS_TONES[r.status] || "default"}>
          {t(`statuses.${r.status}` as any) || r.status}
        </Pill>
      ),
    },
    {
      key: "actions",
      label: t("columns.actions"),
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href="/lab/dashboard"
            target="_blank"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition"
            title="Launch LIMS Panel"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Open LIMS</span>
          </Link>

          <button
            type="button"
            disabled={busyId === r.id}
            onClick={() => handleOpenReset(r)}
            className="p-1.5 rounded-lg border border-border/80 text-foreground/70 hover:text-primary hover:bg-muted transition"
            title="Reset / View Admin Credentials"
          >
            {busyId === r.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSelected(r);
              setDrawerOpen(true);
            }}
            className="p-1.5 rounded-lg border border-border/80 text-foreground/70 hover:text-foreground hover:bg-muted transition"
            title="View Facility Details"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi
            icon={FlaskConical}
            label={t("stats.total")}
            value={stats.total}
            hint="Platform clinical facilities"
            tone="default"
          />
          <Kpi
            icon={CheckCircle2}
            label={t("stats.active")}
            value={stats.active}
            hint="Operating LIMS panels"
            tone="ok"
          />
          <Kpi
            icon={Microscope}
            label={t("stats.tests")}
            value={stats.tests}
            hint="Catalogued clinical tests"
            tone="default"
          />
          <Kpi
            icon={Users}
            label={t("stats.staff")}
            value={stats.staff}
            hint="Pathologists & technicians"
            tone="default"
          />
        </div>

        {/* Action Bar & Filters */}
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("addLab")}</span>
              </button>

              <button
                type="button"
                onClick={() => exportCSV(filtered, "laboratories-export.csv")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted text-foreground transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Status Chips */}
          <div className="mt-4 pt-3 border-t border-border/60">
            <Chips
              value={statusFilter as any}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: "all", label: t("filters.all") },
                { value: "active", label: t("filters.active") },
                { value: "maintenance", label: t("filters.maintenance") },
                { value: "inactive", label: t("filters.inactive") },
              ]}
            />
          </div>
        </Card>

        {/* Data Table */}
        <Card className="p-4 sm:p-5">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>{tc("loading")}</span>
            </div>
          ) : (
            <DataTable<LabFacilityRow>
              rows={filtered}
              columns={columns}
              empty={t("empty")}
            />
          )}
        </Card>
      </div>

      {/* Facility Details Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selected?.name ?? t("details.title")}
        description={t("details.subtitle")}
      >
        {selected && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("details.code")}</span>
                <span className="font-mono font-bold text-primary">{selected.code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("details.license")}</span>
                <span className="font-semibold text-foreground">{selected.license_no}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("details.organization")}</span>
                <span className="font-semibold text-foreground">{selected.hospital_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pathologist</span>
                <span className="font-semibold text-foreground">{selected.pathologist}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("details.hours")}</span>
                <span className="font-medium text-foreground">{selected.hours}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60 space-y-2">
              <h5 className="font-semibold text-xs text-foreground uppercase tracking-wide">
                Direct Contact
              </h5>
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-primary" /> {selected.email}
              </p>
              <p className="text-muted-foreground flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-primary" /> {selected.phone || "—"}
              </p>
              <p className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {selected.address || "—"}
              </p>
            </div>

            <div className="pt-2 border-t border-border/60 space-y-2">
              <label className="block font-semibold text-foreground">
                {t("details.changeStatus")}
              </label>
              <div className="flex items-center gap-2">
                {(["active", "maintenance", "inactive"] as const).map((s) => (
                  <button
                    key={s}
                    disabled={updating}
                    onClick={() => handleUpdateStatus(selected.id, s)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize border transition ${
                      selected.status === s
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/30 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {t(`statuses.${s}` as any)}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border/60">
              <Link
                href="/lab/dashboard"
                target="_blank"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Launch LIMS Panel for this Lab</span>
              </Link>
            </div>
          </div>
        )}
      </Drawer>

      {/* Provision New Laboratory Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <span>{t("addLab")}</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">{t("addLabSubtitle")}</p>
          </DialogHeader>

          <form onSubmit={handleCreateLab} className="space-y-4 pt-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">{t("form.name")} *</Label>
              <Input
                required
                placeholder={t("form.namePlaceholder")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">{t("form.code")} *</Label>
                <Input
                  required
                  placeholder={t("form.codePlaceholder")}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="mt-1 font-mono uppercase"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{t("form.hospital")}</Label>
                <select
                  value={form.hospital_id}
                  onChange={(e) => setForm({ ...form, hospital_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-xs focus:outline-none"
                >
                  <option value="">Standalone Diagnostic Center</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">{t("form.license")}</Label>
                <Input
                  placeholder={t("form.licensePlaceholder")}
                  value={form.license_no}
                  onChange={(e) => setForm({ ...form, license_no: e.target.value })}
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">{t("form.licenseHint")}</p>
              </div>

              <div>
                <Label className="text-xs font-semibold">{t("form.pathologist")}</Label>
                <Input
                  placeholder={t("form.pathologistPlaceholder")}
                  value={form.pathologist}
                  onChange={(e) => setForm({ ...form, pathologist: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">{t("form.email")} *</Label>
                <Input
                  required
                  type="email"
                  placeholder={t("form.emailPlaceholder")}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{t("form.phone")}</Label>
                <Input
                  placeholder={t("form.phonePlaceholder")}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">{t("form.hours")}</Label>
                <Input
                  placeholder={t("form.hoursPlaceholder")}
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{t("form.status")}</Label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as "active" | "maintenance" | "inactive",
                    })
                  }
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-xs focus:outline-none"
                >
                  <option value="active">Active (Production)</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">{t("form.address")}</Label>
              <Input
                placeholder={t("form.addressPlaceholder")}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted text-muted-foreground"
              >
                {tc("cancel")}
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
              >
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{creating ? t("form.creating") : t("form.submit")}</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generated Credentials Result Modal */}
      <Dialog open={!!creds} onOpenChange={(open) => !open && setCreds(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <span>{t("generatedTitle")}</span>
            </DialogTitle>
          </DialogHeader>

          {creds && (
            <div className="space-y-4 pt-2 text-xs">
              <p
                className="text-muted-foreground text-xs leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: t("credsSaved", { facility: creds.facility || "Laboratory" }),
                }}
              />

              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3 font-mono">
                <div>
                  <span className="text-[10px] font-sans font-semibold uppercase text-muted-foreground">
                    {t("email")}
                  </span>
                  <div className="flex items-center justify-between mt-1 p-2 rounded-lg bg-card border border-border">
                    <span className="select-all text-foreground font-semibold">{creds.email}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(creds.email, t("email"))}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {creds.password && (
                  <div>
                    <span className="text-[10px] font-sans font-semibold uppercase text-muted-foreground">
                      {t("password")}
                    </span>
                    <div className="flex items-center justify-between mt-1 p-2 rounded-lg bg-card border border-border">
                      <span className="select-all text-primary font-bold tracking-wider">
                        {creds.password}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(creds.password!, t("password"))}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Link
                  href="/lab/dashboard"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Launch LIMS Panel</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setCreds(null)}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {t("done")}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Reset Confirmation Dialog */}
      <ConfirmDialog
        open={!!pendingReset}
        onClose={() => setPendingReset(null)}
        onConfirm={handleConfirmReset}
        title={t("resetTitle")}
        description={
          pendingReset ? t("resetBody", { name: pendingReset.name }) : undefined
        }
      />
    </SuperLayout>
  );
}
