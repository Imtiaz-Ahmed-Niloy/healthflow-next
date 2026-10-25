"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, Kpi, Pill, Btn } from "@/components/admin/ui";
import {
  DataTable, Drawer, Chips, exportCSV, Modal, ConfirmDialog,
  type Column,
} from "@/components/admin/crud";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Pill as PillIcon, Building2, Boxes, Users, Search, Download,
  BadgeCheck, ShieldAlert, Phone, Mail, MapPin,
  Clock, CheckCircle2, RefreshCw, Eye, Plus, Loader2, KeyRound, Copy,
} from "lucide-react";

export type PharmacyBranchRow = {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  is_main: boolean;
  status: "active" | "maintenance" | "inactive";
  address: string | null;
  phone: string | null;
  email: string | null;
  license_no: string | null;
  vat_no: string | null;
  pharmacist_in_charge: string | null;
  opening_hours: string | null;
  created_at: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    status: string;
    location: string | null;
    division: string | null;
    district: string | null;
    address?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
  } | null;
};

type Stats = {
  total: number;
  active: number;
  products: number;
  staff: number;
};

type CredsResult = {
  email: string;
  password?: string;
  pharmacy?: string;
  hospital?: string;
  alreadyProvisioned?: boolean;
  saved?: boolean;
};

type NewPharmacyForm = {
  name: string;
  code: string;
  is_main: boolean;
  status: "active" | "maintenance" | "inactive";
  license_no: string;
  vat_no: string;
  pharmacist_in_charge: string;
  phone: string;
  email: string;
  address: string;
  opening_hours: string;
};

const initialForm: NewPharmacyForm = {
  name: "",
  code: "MAIN",
  is_main: true,
  status: "active",
  license_no: "",
  vat_no: "",
  pharmacist_in_charge: "",
  phone: "",
  email: "",
  address: "",
  opening_hours: "24/7",
};

const STATUS_TONES: Record<string, "ok" | "warn" | "default"> = {
  active: "ok",
  maintenance: "warn",
  inactive: "default",
};

const Pharmacy = () => {
  const t = useTranslations("super.pharmacy");
  const tc = useTranslations("common");

  const [pharmacies, setPharmacies] = useState<PharmacyBranchRow[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, products: 0, staff: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [creating, setCreating] = useState(false);

  // Filters & search
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected for drawer
  const [selected, setSelected] = useState<PharmacyBranchRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewPharmacyForm>(initialForm);

  // Credential modal & reset state
  const [creds, setCreds] = useState<CredsResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingReset, setPendingReset] = useState<PharmacyBranchRow | null>(null);

  const fetchPharmacies = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/super/pharmacies");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (json.data) {
        setPharmacies(json.data.pharmacies || []);
        if (json.data.stats) setStats(json.data.stats);
      }
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setLoading(false);
    }
  }, [tc]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await fetchPharmacies();
  }, [fetchPharmacies]);

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      try {
        const res = await fetch("/api/v1/super/pharmacies");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (!ignore && json.data) {
          setPharmacies(json.data.pharmacies || []);
          if (json.data.stats) setStats(json.data.stats);
        }
      } catch {
        if (!ignore) toast.error(tc("networkError"));
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    init();
    return () => {
      ignore = true;
    };
  }, [tc]);

  const handleUpdateStatus = async (id: string, newStatus: "active" | "maintenance" | "inactive") => {
    setUpdating(true);
    try {
      const res = await fetch("/api/v1/super/pharmacies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Update failed");

      setPharmacies((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      toast.success(t("statusUpdated"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("updateFailed"));
    } finally {
      setUpdating(false);
    }
  };

  const copy = (v: string, label: string) => {
    navigator.clipboard.writeText(v);
    toast.success(t("copied", { label }));
  };

  const viewLogin = async (p: PharmacyBranchRow) => {
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/v1/super/pharmacies/${p.id}/login`);
      const body = await res.json();
      if (!res.ok) {
        if (body?.error?.code === "no_saved_password") {
          setPendingReset(p);
          return;
        }
        toast.error(t("loadFailed"), { description: body?.error?.message ?? tc("networkError") });
        return;
      }
      setCreds(body.data as CredsResult);
    } catch {
      toast.error(t("loadFailed"), { description: tc("networkError") });
    } finally {
      setBusyId(null);
    }
  };

  const resetLogin = async (p: PharmacyBranchRow) => {
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/v1/super/pharmacies/${p.id}/login`, { method: "PUT" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(t("resetFailed"), { description: body?.error?.message ?? tc("networkError") });
        return;
      }
      setCreds(body.data as CredsResult);
      toast.success(t("resetDone"));
    } catch {
      toast.error(t("resetFailed"), { description: tc("networkError") });
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("form.nameRequired"));
      return;
    }
    if (!form.code.trim()) {
      toast.error(t("form.codeRequired"));
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/v1/super/pharmacies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim(),
          is_main: form.is_main,
          status: form.status,
          license_no: form.license_no.trim() || null,
          vat_no: form.vat_no.trim() || null,
          pharmacist_in_charge: form.pharmacist_in_charge.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          opening_hours: form.opening_hours.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create pharmacy");
      }

      toast.success(t("form.success"));
      setCreateOpen(false);
      setForm(initialForm);
      await fetchPharmacies();
      if (json.data?.creds) {
        setCreds(json.data.creds as CredsResult);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return pharmacies.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q) {
        const matchName = p.name?.toLowerCase().includes(q);
        const matchCode = p.code?.toLowerCase().includes(q);
        const matchAddress = (p.address || p.tenant?.address || "")?.toLowerCase().includes(q);
        const matchLicense = p.license_no?.toLowerCase().includes(q);
        const matchPharmacist = p.pharmacist_in_charge?.toLowerCase().includes(q);
        const matchPhone = p.phone?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchAddress && !matchLicense && !matchPharmacist && !matchPhone) return false;
      }
      return true;
    });
  }, [pharmacies, query, statusFilter]);

  const handleExportCSV = () => {
    const rows = filtered.map((p) => ({
      Pharmacy: p.name,
      Code: p.code,
      IsMain: p.is_main ? "Yes" : "No",
      License: p.license_no || "N/A",
      PharmacistInCharge: p.pharmacist_in_charge || "N/A",
      Phone: p.phone || "N/A",
      Email: p.email || "N/A",
      Status: p.status,
      Address: p.address || p.tenant?.address || "N/A",
    }));
    exportCSV(rows, `pharmacy-management-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const columns: Column<PharmacyBranchRow>[] = [
    {
      key: "pharmacy",
      label: t("columns.pharmacy"),
      sortable: true,
      accessor: (r) => r.name,
      render: (r) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">{r.name}</span>
            {r.is_main && (
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                {t("mainBranch")}
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
            Code: {r.code}
          </div>
        </div>
      ),
    },
    {
      key: "location",
      label: t("columns.location"),
      sortable: true,
      accessor: (r) => r.address || r.tenant?.address || "",
      render: (r) => (
        <div className="text-xs text-foreground/85 flex items-start gap-1 max-w-[220px]">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <span className="line-clamp-2">
            {r.address || r.tenant?.address || r.tenant?.location || "Not specified"}
          </span>
        </div>
      ),
    },
    {
      key: "license",
      label: t("columns.license"),
      sortable: true,
      accessor: (r) => r.license_no || "",
      render: (r) => (
        <div>
          {r.license_no ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-semibold">
              <BadgeCheck className="h-3.5 w-3.5" />
              {r.license_no}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground/60 text-xs italic">
              <ShieldAlert className="h-3.5 w-3.5" />
              Pending verification
            </span>
          )}
        </div>
      ),
    },
    {
      key: "pharmacist_in_charge",
      label: t("columns.inCharge"),
      sortable: true,
      accessor: (r) => r.pharmacist_in_charge || "",
      render: (r) => (
        <span className="text-sm font-medium text-foreground/90">
          {r.pharmacist_in_charge || "—"}
        </span>
      ),
    },
    {
      key: "contact",
      label: t("columns.contact"),
      render: (r) => (
        <div className="text-xs space-y-0.5">
          {r.phone && (
            <div className="flex items-center gap-1.5 text-foreground/80">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{r.phone}</span>
            </div>
          )}
          {r.email && (
            <div className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[160px]">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{r.email}</span>
            </div>
          )}
          {!r.phone && !r.email && <span className="text-muted-foreground/50">—</span>}
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
          {t(`statuses.${r.status}`)}
        </Pill>
      ),
    },
  ];

  return (
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi
          icon={Building2}
          label={t("stats.total")}
          value={loading ? "—" : stats.total.toLocaleString()}
          tone="primary"
        />
        <Kpi
          icon={PillIcon}
          label={t("stats.active")}
          value={loading ? "—" : stats.active.toLocaleString()}
          tone="accent"
        />
        <Kpi
          icon={Boxes}
          label={t("stats.products")}
          value={loading ? "—" : stats.products.toLocaleString()}
          tone="chip"
        />
        <Kpi
          icon={Users}
          label={t("stats.staff")}
          value={loading ? "—" : stats.staff.toLocaleString()}
          tone="primary"
        />
      </div>

      <Card className="p-5">
        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Chips
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: t("filters.all") },
                { value: "active", label: t("filters.active") },
                { value: "maintenance", label: t("filters.maintenance") },
                { value: "inactive", label: t("filters.inactive") },
              ]}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 md:w-64 min-w-[180px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                className="w-full pl-9 pr-3 py-1.5 bg-muted/40 border border-border/50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={handleRefresh}
              title="Refresh"
              className="p-2 rounded-xl border border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-primary transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Btn onClick={handleExportCSV} variant="outline" className="gap-1.5 text-xs py-1.5 px-3">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Btn>
            <Btn onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs py-1.5 px-3.5 shadow-soft">
              <Plus className="h-4 w-4" />
              {t("newPharmacy")}
            </Btn>
          </div>
        </div>

        {/* Pharmacy Branches Table */}
        <DataTable
          rows={filtered}
          columns={columns}
          empty={t("empty")}
          actions={(r) => (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void viewLogin(r);
                }}
                disabled={busyId === r.id}
                className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 disabled:opacity-50"
                title={t("viewLogin")}
                aria-label={t("viewLogin")}
              >
                {busyId === r.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <KeyRound className="h-4 w-4 text-primary" />
                )}
              </button>
              <button
                onClick={() => {
                  setSelected(r);
                  setDrawerOpen(true);
                }}
                className="p-1.5 rounded-lg hover:bg-muted text-foreground/70"
                title={t("details.title")}
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          )}
        />
      </Card>

      {/* Add New Pharmacy Dialog / Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display text-primary">
              <PillIcon className="h-5 w-5 text-primary" />
              {t("addPharmacy")}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {t("addPharmacySubtitle")}
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            {/* Name and Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="pharmacy_name" className="text-xs font-semibold">
                  {t("form.name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pharmacy_name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("form.namePlaceholder")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pharmacy_code" className="text-xs font-semibold">
                  {t("form.code")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pharmacy_code"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder={t("form.codePlaceholder")}
                />
              </div>
            </div>

            {/* Drug License & VAT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="license_no" className="text-xs font-semibold">
                  {t("form.license")}
                </Label>
                <Input
                  id="license_no"
                  value={form.license_no}
                  onChange={(e) => setForm({ ...form, license_no: e.target.value })}
                  placeholder={t("form.licensePlaceholder")}
                />
                <p className="text-[10px] text-muted-foreground">{t("form.licenseHint")}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vat_no" className="text-xs font-semibold">
                  {t("form.vatNo")}
                </Label>
                <Input
                  id="vat_no"
                  value={form.vat_no}
                  onChange={(e) => setForm({ ...form, vat_no: e.target.value })}
                  placeholder={t("form.vatNoPlaceholder")}
                />
              </div>
            </div>

            {/* Pharmacist in Charge */}
            <div className="space-y-1.5">
              <Label htmlFor="pharmacist" className="text-xs font-semibold">
                {t("form.pharmacist")}
              </Label>
              <Input
                id="pharmacist"
                value={form.pharmacist_in_charge}
                onChange={(e) => setForm({ ...form, pharmacist_in_charge: e.target.value })}
                placeholder={t("form.pharmacistPlaceholder")}
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold">
                  {t("form.phone")}
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder={t("form.phonePlaceholder")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  {t("form.email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={t("form.emailPlaceholder")}
                />
              </div>
            </div>

            {/* Operating Hours */}
            <div className="space-y-1.5">
              <Label htmlFor="hours" className="text-xs font-semibold">
                {t("form.hours")}
              </Label>
              <Input
                id="hours"
                value={form.opening_hours}
                onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
                placeholder={t("form.hoursPlaceholder")}
              />
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-semibold">
                {t("form.address")}
              </Label>
              <Textarea
                id="address"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t("form.addressPlaceholder")}
              />
            </div>

            {/* Primary Main Branch Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_main"
                checked={form.is_main}
                onChange={(e) => setForm({ ...form, is_main: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="is_main" className="text-xs font-medium cursor-pointer">
                {t("form.isMain")}
              </Label>
            </div>

            {/* Status Options */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold">{t("form.status")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["active", "maintenance", "inactive"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, status: s })}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      form.status === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/60 hover:bg-muted text-foreground"
                    }`}
                  >
                    {t(`statuses.${s}`)}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/40 gap-2">
              <Btn variant="outline" onClick={() => setCreateOpen(false)}>
                {tc("cancel")}
              </Btn>
              <Btn type="submit" disabled={creating} className="gap-2">
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("form.creating")}
                  </>
                ) : (
                  t("form.submit")
                )}
              </Btn>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={t("details.title")}
      >
        {selected && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-card border border-border/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-primary">{selected.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">Code: {selected.code}</p>
                </div>
                <Pill tone={STATUS_TONES[selected.status] || "default"}>
                  {t(`statuses.${selected.status}`)}
                </Pill>
              </div>

              {selected.is_main && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("mainBranch")}
                </div>
              )}
            </div>

            {/* Facility & Organization */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("details.organization")}
              </h4>
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1.5 text-sm">
                <div className="font-semibold text-primary">{selected.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    Independent Pharmacy Facility
                  </span>
                  {selected.code && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      · Outlet: {selected.code}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Regulatory Compliance & Licensing */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Compliance & Licensing
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    {t("columns.license")}
                  </span>
                  <p className="font-mono text-xs font-bold text-foreground mt-1">
                    {selected.license_no || "Not Registered"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    {t("details.vatNo")}
                  </span>
                  <p className="font-mono text-xs font-bold text-foreground mt-1">
                    {selected.vat_no || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Personnel & Contact */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Management & Contact
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    {t("columns.inCharge")}
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {selected.pharmacist_in_charge || "Unassigned"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {t("details.phone")}
                    </span>
                    <p className="text-xs font-medium text-foreground mt-1">
                      {selected.phone || "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {t("details.email")}
                    </span>
                    <p className="text-xs font-medium text-foreground mt-1 truncate">
                      {selected.email || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hours & Address */}
            <div className="space-y-2 text-xs">
              {selected.opening_hours && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">{t("details.hours")}</span>
                    <p className="font-medium text-foreground">{selected.opening_hours}</p>
                  </div>
                </div>
              )}
              {selected.address && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">{t("details.address")}</span>
                    <p className="font-medium text-foreground">{selected.address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick action: View Login Credentials */}
            <div className="pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => void viewLogin(selected)}
                disabled={busyId === selected.id}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-border/60 hover:bg-muted font-semibold text-xs text-foreground transition-colors disabled:opacity-50"
              >
                {busyId === selected.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <KeyRound className="h-4 w-4 text-primary" />
                )}
                {t("viewLogin")}
              </button>
            </div>

            {/* Status changer action */}
            {!selected.id.startsWith("virtual-") && (
              <div className="pt-4 border-t border-border/60 space-y-2">
                <span className="text-xs font-bold text-foreground">{t("details.changeStatus")}</span>
                <div className="grid grid-cols-3 gap-2">
                  {(["active", "maintenance", "inactive"] as const).map((s) => (
                    <button
                      key={s}
                      disabled={updating || selected.status === s}
                      onClick={() => handleUpdateStatus(selected.id, s)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selected.status === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 hover:bg-muted text-foreground"
                      }`}
                    >
                      {t(`statuses.${s}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!pendingReset}
        onClose={() => setPendingReset(null)}
        onConfirm={() => pendingReset && void resetLogin(pendingReset)}
        title={t("resetTitle")}
        description={pendingReset ? t("resetBody", { name: pendingReset.name }) : undefined}
      />

      <Modal
        open={!!creds}
        onClose={() => setCreds(null)}
        title={creds?.saved === undefined ? t("loginTitle") : t("generatedTitle")}
        footer={
          <button
            onClick={() => setCreds(null)}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground"
          >
            {t("done")}
          </button>
        }
      >
        {creds && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
              <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                {t.rich(creds.saved === false ? "credsOnce" : "credsSaved", {
                  pharmacy: creds.pharmacy || creds.hospital || "Pharmacy",
                  b: (chunks) => <span className="font-semibold text-primary">{chunks}</span>,
                })}
              </p>
            </div>
            {[
              { label: t("email"), value: creds.email },
              { label: t("password"), value: creds.password ?? "" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5 uppercase">
                  {label}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted/40 rounded-lg px-3 py-2 text-sm font-mono break-all">
                    {value}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(value, label)}
                    className="p-2 rounded-lg border border-border hover:bg-muted"
                    title={t("copy", { label })}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const target = pharmacies.find(
                    (p) => p.name === creds.pharmacy || p.name === creds.hospital || p.id === busyId
                  );
                  if (target) {
                    setPendingReset(target);
                  }
                }}
                className="text-xs text-muted-foreground hover:text-destructive underline"
              >
                {t("resetPassword")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </SuperLayout>
  );
};

export default Pharmacy;
