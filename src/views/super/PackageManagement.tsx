"use client";

import { useMemo, useState } from "react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { toast } from "sonner";
import {
  Pencil, Trash2, Plus, Gift, Search, X, AlertCircle, Loader2, ArrowUp, ArrowDown, ChevronsUpDown,
} from "lucide-react";
import {
  hospitalPackagesApi, offersApi, packagesApi,
  type HospitalPackageRow, type HospitalPackageWrite, type OfferRow, type OfferWrite,
} from "@/redux/api/resources";
import { useListResourceQuery } from "@/redux/api/createResourceApi";
import { Label } from "@/components/ui/label";

/**
 * Which plan each hospital is on, at what price, and the offers behind the
 * discounts.
 *
 * Three tables feed this screen: `packages` is the plan catalogue, `offers`
 * the discount codes, and `hospital_packages` the assignment joining a
 * hospital to a plan with its commercial terms. A trigger keeps
 * `tenants.package_id` in step with the assignment, so the dashboard's plan
 * distribution stays correct without this screen touching it.
 *
 * Money is shown in USD because that is what the screen has always shown;
 * `packages` stores no currency, so nothing here can infer one.
 */

type PackageStatus = "active" | "trial" | "suspended" | "expired";

const STATUS_TONE: Record<PackageStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700",
  trial: "bg-amber-500/15 text-amber-700",
  suspended: "bg-rose-500/15 text-rose-700",
  expired: "bg-muted text-muted-foreground",
};

const STATUSES: PackageStatus[] = ["active", "trial", "suspended", "expired"];

/** Net of discount, in the plan's own billing cycle. */
const netPrice = (basePrice: number, discountPct: number) => basePrice * (1 - discountPct / 100);

/** Normalised to a month so yearly and monthly rows can be added together. */
const monthlyValue = (row: Pick<HospitalPackageRow, "base_price" | "discount_pct" | "billing_cycle">) =>
  netPrice(Number(row.base_price), Number(row.discount_pct)) / (row.billing_cycle === "yearly" ? 12 : 1);

const money = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 0 });

/**
 * Tailwind cannot see a class name built at runtime, so the tone of a stat
 * tile is a full class string rather than an interpolated fragment. The
 * previous `text-${tone}` compiled to nothing and every tile rendered in the
 * default colour.
 */
const Stat = ({ label, value, tone = "text-primary" }: { label: string; value: string; tone?: string }) => (
  <div className="bg-card rounded-2xl border border-border/60 p-5">
    <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{label}</p>
    <p className={`mt-1 font-display text-2xl ${tone}`}>{value}</p>
  </div>
);

type SortKey = "hospital" | "plan" | "base" | "net" | "status" | "renew";
type SortState = { key: SortKey; asc: boolean };

/**
 * Defined at module scope, not inside the page.
 *
 * A component declared in a render body is a new component type on every
 * render, so React unmounts and remounts the whole subtree each time — here,
 * on every keystroke in the search box.
 */
const SortHead = ({
  label, sortKey, sort, onSort, align = "left",
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) => {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.asc ? ArrowUp : ArrowDown;
  return (
    <th className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}
      aria-sort={active ? (sort.asc ? "ascending" : "descending") : "none"}>
      <button
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
        className={`inline-flex items-center gap-1 hover:text-primary transition ${active ? "text-primary" : ""} ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
};

/**
 * Hides the "Discounts & Offers" table and its editor.
 *
 * Only that card is hidden — offers themselves are untouched and still power
 * the ACTIVE OFFERS stat, the assignments table's Offer column, and the
 * "Applied Offer" picker in the assignment editor, so an offer already attached
 * to a hospital keeps working and stays visible where it is applied. The table
 * is the only place offers can be created, edited or deleted, so while this is
 * false the catalogue is read-only from this screen.
 *
 * Flip to true to bring the section back.
 */
const SHOW_OFFERS_SECTION = false;

const PackageManagement = () => {
  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "hospital", asc: true });

  const [editing, setEditing] = useState<HospitalPackageRow | null>(null);
  const [editingOffer, setEditingOffer] = useState<OfferRow | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const plansQuery = packagesApi.useList({ limit: 100 });
  const offersQuery = offersApi.useList({ limit: 100 });

  /**
   * Deliberately unfiltered.
   *
   * Plan and status are real columns and could filter in Postgres, but the
   * search box matches a hospital name on the embedded `tenants` row, which
   * PostgREST's `or` cannot reach — so that one has to be local regardless.
   * Splitting them meant `rows` shrank for two filters and not the third, and
   * the stat tiles silently became "totals for the current plan filter".
   *
   * One source of rows, all three filters applied to it: the tiles measure
   * every assignment and the table measures what you asked for.
   */
  const packagesQuery = hospitalPackagesApi.useList({ limit: 100 });

  const [removePackage] = hospitalPackagesApi.useRemove();
  const [removeOffer] = offersApi.useRemove();

  const plans = useMemo(() => plansQuery.data?.data ?? [], [plansQuery.data]);
  const offers = useMemo(() => offersQuery.data?.data ?? [], [offersQuery.data]);
  const rows = useMemo(() => packagesQuery.data?.data ?? [], [packagesQuery.data]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matched = rows.filter((row) => {
      if (planFilter !== "all" && row.package_id !== planFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (needle && !(row.tenants?.name ?? "").toLowerCase().includes(needle)) return false;
      return true;
    });

    const value = (row: HospitalPackageRow) => {
      switch (sort.key) {
        case "hospital": return (row.tenants?.name ?? "").toLowerCase();
        case "plan": return (row.packages?.name ?? "").toLowerCase();
        case "base": return Number(row.base_price);
        case "net": return netPrice(Number(row.base_price), Number(row.discount_pct));
        case "status": return row.status;
        case "renew": return row.renew_date ?? "";
      }
    };

    return [...matched].sort((a, b) => {
      const [x, y] = [value(a), value(b)];
      if (x === y) return 0;
      return (x < y ? -1 : 1) * (sort.asc ? 1 : -1);
    });
  }, [rows, q, planFilter, statusFilter, sort]);

  // Totals describe every assignment, not the filtered view — a tile that
  // moved when you typed in the search box would be measuring the search.
  const activeCount = rows.filter((r) => r.status === "active").length;
  const trialCount = rows.filter((r) => r.status === "trial").length;
  const mrr = rows.filter((r) => r.status === "active").reduce((sum, r) => sum + monthlyValue(r), 0);
  const activeOffers = offers.filter((o) => o.active).length;

  const hasFilter = q !== "" || planFilter !== "all" || statusFilter !== "all";
  const clearFilters = () => { setQ(""); setPlanFilter("all"); setStatusFilter("all"); };

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true }));

  const blankAssignment = (): HospitalPackageRow => ({
    id: "",
    tenant_id: "",
    package_id: plans[0]?.id ?? "",
    base_price: Number(plans[0]?.price_monthly ?? 0),
    discount_pct: 0,
    offer_id: null,
    billing_cycle: "monthly",
    status: "active",
    start_date: new Date().toISOString().slice(0, 10),
    renew_date: null,
    notes: null,
    created_at: "",
    updated_at: "",
    tenants: null,
    packages: null,
    offers: null,
  });

  const deleteAssignment = async (row: HospitalPackageRow) => {
    setRemoving(row.id);
    try {
      await removePackage(row.id).unwrap();
      toast.success("Package removed");
    } catch {
      toast.error("Could not remove package", { description: "Please try again." });
    } finally {
      setRemoving(null);
    }
  };

  const deleteOffer = async (offer: OfferRow) => {
    setRemoving(offer.id);
    try {
      await removeOffer(offer.id).unwrap();
      toast.success("Offer deleted");
    } catch (cause) {
      // An offer still attached to an assignment is set null there, not
      // blocked — so a failure here is genuinely unexpected.
      const message =
        (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? "Please try again.";
      toast.error("Could not delete offer", { description: message });
    } finally {
      setRemoving(null);
    }
  };

  const loading = packagesQuery.isLoading || plansQuery.isLoading;
  const failed = packagesQuery.error || plansQuery.error || offersQuery.error;

  return (
    <SuperLayout title="Package Management" subtitle="Assign plans, apply discounts and offers per hospital">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="ACTIVE PACKAGES" value={String(activeCount)} />
        <Stat label="TRIAL" value={String(trialCount)} tone="text-amber-600" />
        <Stat label="MONTHLY REVENUE" value={`$${money(mrr)}`} tone="text-emerald-600" />
        <Stat label="ACTIVE OFFERS" value={String(activeOffers)} tone="text-primary-glow" />
      </div>

      {failed && (
        <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 text-destructive p-4 mb-4">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">Could not load package data. Refresh to try again.</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border/60 p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search hospitals…"
            aria-label="Search hospitals"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          aria-label="Filter by plan"
          className="px-3 py-2 rounded-lg bg-background border border-border text-sm"
        >
          <option value="all">All plans</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="px-3 py-2 rounded-lg bg-background border border-border text-sm"
        >
          <option value="all">All status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        {hasFilter && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
        <button
          onClick={() => setEditing(blankAssignment())}
          disabled={plans.length === 0}
          title={plans.length === 0 ? "Create a plan first" : undefined}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Plus className="h-4 w-4" /> Assign Package
        </button>
      </div>

      {/* Packages table */}
      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-chip/40 text-[11px] tracking-widest font-bold text-muted-foreground">
              <tr>
                <SortHead label="Hospital" sortKey="hospital" sort={sort} onSort={toggleSort} />
                <SortHead label="Plan" sortKey="plan" sort={sort} onSort={toggleSort} />
                <th className="text-left px-4 py-3">Cycle</th>
                <SortHead label="Base" sortKey="base" sort={sort} onSort={toggleSort} align="right" />
                <th className="text-right px-4 py-3">Discount</th>
                <SortHead label="Net" sortKey="net" sort={sort} onSort={toggleSort} align="right" />
                <th className="text-left px-4 py-3">Offer</th>
                <SortHead label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
                <SortHead label="Renews" sortKey="renew" sort={sort} onSort={toggleSort} />
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/40">
                    <td colSpan={10} className="px-4 py-4">
                      <div className="h-4 bg-muted/60 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                    {rows.length === 0
                      ? "No hospital is on a package yet. Use “Assign Package” to put one on a plan."
                      : "No packages match these filters."}
                  </td>
                </tr>
              ) : (
                visible.map((row) => {
                  const base = Number(row.base_price);
                  const discount = Number(row.discount_pct);
                  const net = netPrice(base, discount);
                  return (
                    <tr key={row.id} className="border-t border-border/40 hover:bg-chip/20">
                      <td className="px-4 py-3 font-semibold text-primary">
                        {row.tenants?.name ?? <span className="text-muted-foreground italic">Unknown hospital</span>}
                      </td>
                      <td className="px-4 py-3">{row.packages?.name ?? "—"}</td>
                      <td className="px-4 py-3 capitalize">{row.billing_cycle}</td>
                      <td className="px-4 py-3 text-right">${money(base)}</td>
                      <td className="px-4 py-3 text-right">
                        {discount > 0
                          ? <span className="text-emerald-600 font-semibold">-{discount}%</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">${money(net)}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.offers?.code ?? <span className="text-muted-foreground font-sans">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${STATUS_TONE[row.status as PackageStatus] ?? ""}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.renew_date ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditing(row)}
                            aria-label={`Edit package for ${row.tenants?.name ?? "hospital"}`}
                            className="p-1.5 rounded hover:bg-primary/10 text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void deleteAssignment(row)}
                            disabled={removing === row.id}
                            aria-label={`Remove package for ${row.tenants?.name ?? "hospital"}`}
                            className="p-1.5 rounded hover:bg-destructive/10 text-destructive disabled:opacity-40"
                          >
                            {removing === row.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />}
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

      {/* Offers */}
      {SHOW_OFFERS_SECTION && (
      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl text-primary">Discounts &amp; Offers</h2>
          </div>
          <button
            onClick={() => setEditingOffer({
              id: "", code: "", label: "", discount_pct: 10, package_id: null,
              valid_until: null, active: true, created_at: "", updated_at: "", packages: null,
            })}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New Offer
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-chip/40 text-[11px] tracking-widest font-bold text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Label</th>
                <th className="text-left px-4 py-3">Applies To</th>
                <th className="text-right px-4 py-3">Discount</th>
                <th className="text-left px-4 py-3">Valid Until</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {offersQuery.isLoading ? (
                <tr><td colSpan={7} className="px-4 py-6"><div className="h-4 bg-muted/60 rounded animate-pulse" /></td></tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No offers yet. Create one to discount a plan.
                  </td>
                </tr>
              ) : (
                offers.map((offer) => {
                  const expired = !!offer.valid_until && offer.valid_until < new Date().toISOString().slice(0, 10);
                  return (
                    <tr key={offer.id} className="border-t border-border/40 hover:bg-chip/20">
                      <td className="px-4 py-3 font-mono font-bold text-primary">{offer.code}</td>
                      <td className="px-4 py-3">{offer.label || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3">{offer.packages?.name ?? "All plans"}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-semibold">-{Number(offer.discount_pct)}%</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {offer.valid_until ?? "—"}
                        {expired && <span className="ml-1 text-[10px] font-bold uppercase text-rose-600">expired</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${offer.active ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          {offer.active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditingOffer(offer)} aria-label={`Edit offer ${offer.code}`}
                            className="p-1.5 rounded hover:bg-primary/10 text-primary">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => void deleteOffer(offer)} disabled={removing === offer.id}
                            aria-label={`Delete offer ${offer.code}`}
                            className="p-1.5 rounded hover:bg-destructive/10 text-destructive disabled:opacity-40">
                            {removing === offer.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />}
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
      )}

      {editing && (
        <AssignmentEditor
          row={editing}
          plans={plans}
          offers={offers}
          takenTenantIds={rows.filter((r) => r.id !== editing.id).map((r) => r.tenant_id)}
          onClose={() => setEditing(null)}
        />
      )}

      {SHOW_OFFERS_SECTION && editingOffer && (
        <OfferEditor offer={editingOffer} plans={plans} onClose={() => setEditingOffer(null)} />
      )}
    </SuperLayout>
  );
};

/* ------------------------------------------------------------ editors --- */

type Plan = { id: string; name: string; price_monthly: number };

const AssignmentEditor = ({
  row, plans, offers, takenTenantIds, onClose,
}: {
  row: HospitalPackageRow;
  plans: Plan[];
  offers: OfferRow[];
  takenTenantIds: string[];
  onClose: () => void;
}) => {
  const isNew = row.id === "";
  const [draft, setDraft] = useState(row);
  const [hospitalQuery, setHospitalQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const [createAssignment] = hospitalPackagesApi.useCreate();
  const [updateAssignment] = hospitalPackagesApi.useUpdate();

  /**
   * Hospitals are searched server-side rather than loaded in full: the list
   * endpoint caps at 100 rows and `tenants` holds every hospital in
   * Bangladesh, so a plain dropdown would silently stop showing most of them.
   */
  const hospitals = useListResourceQuery({ resource: "hospitals", limit: 20, q: hospitalQuery || undefined });
  const hospitalRows = (hospitals.data?.data ?? []) as { id: string; name: string; status: string }[];

  const taken = new Set(takenTenantIds);

  const selectedPlan = plans.find((p) => p.id === draft.package_id);
  const base = Number(draft.base_price);
  const discount = Number(draft.discount_pct);

  const save = async () => {
    if (!draft.tenant_id) {
      toast.error("Select a hospital");
      return;
    }
    if (!draft.package_id) {
      toast.error("Select a plan");
      return;
    }
    // Mirrors the hospital_packages_renew_after_start check constraint, so a
    // reversed pair is caught before the round trip.
    if (draft.renew_date && draft.renew_date < draft.start_date) {
      toast.error("Renewal date cannot be before the start date");
      return;
    }

    const body: HospitalPackageWrite = {
      tenant_id: draft.tenant_id,
      package_id: draft.package_id,
      base_price: base,
      discount_pct: discount,
      offer_id: draft.offer_id,
      billing_cycle: draft.billing_cycle as "monthly" | "yearly",
      status: draft.status as PackageStatus,
      start_date: draft.start_date,
      renew_date: draft.renew_date,
      notes: draft.notes,
    };

    setSaving(true);
    try {
      if (isNew) await createAssignment(body).unwrap();
      else await updateAssignment(draft.id, body).unwrap();
      toast.success(isNew ? "Package assigned" : "Package updated");
      onClose();
    } catch (cause) {
      const message =
        (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? "Please try again.";
      toast.error("Could not save package", {
        // A unique violation on tenant_id is the one a super admin will hit.
        description: message === "Already exists" ? "That hospital is already on a package." : message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={isNew ? "Assign Package" : "Edit Package"}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Hospital" full>
          {isNew ? (
            <>
              <input
                value={hospitalQuery}
                onChange={(e) => setHospitalQuery(e.target.value)}
                placeholder="Search hospitals…"
                aria-label="Search hospitals"
                className="w-full px-3 py-2 mb-2 rounded-lg bg-background border border-border text-sm"
              />
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border/50">
                {hospitals.isFetching ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
                ) : hospitalRows.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No hospitals found.</p>
                ) : (
                  hospitalRows.map((hospital) => {
                    const already = taken.has(hospital.id);
                    const chosen = draft.tenant_id === hospital.id;
                    return (
                      <button
                        key={hospital.id}
                        onClick={() => !already && setDraft({ ...draft, tenant_id: hospital.id })}
                        disabled={already}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition ${
                          chosen ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/50"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <span className="truncate">{hospital.name}</span>
                        {already && <span className="text-[10px] uppercase font-bold shrink-0">on a plan</span>}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <p className="px-3 py-2 rounded-lg bg-muted/40 text-sm font-semibold text-primary">
              {row.tenants?.name ?? "Unknown hospital"}
            </p>
          )}
        </Field>

        <Field label="Plan">
          <select
            value={draft.package_id}
            onChange={(e) => {
              const plan = plans.find((p) => p.id === e.target.value);
              // Base price follows the plan only while it still matches the
              // old plan's list price — otherwise a negotiated figure would be
              // wiped by switching tier.
              const wasListPrice = base === Number(selectedPlan?.price_monthly ?? -1);
              setDraft({
                ...draft,
                package_id: e.target.value,
                base_price: wasListPrice || isNew ? Number(plan?.price_monthly ?? base) : base,
              });
            }}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (${Number(p.price_monthly)})</option>
            ))}
          </select>
        </Field>

        <Field label="Base Price (USD)">
          <input
            type="number" min={0} step="0.01" value={draft.base_price}
            onChange={(e) => setDraft({ ...draft, base_price: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          />
        </Field>

        <Field label="Discount (%)">
          <input
            type="number" min={0} max={100} value={draft.discount_pct}
            onChange={(e) => setDraft({ ...draft, discount_pct: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          />
        </Field>

        <Field label="Billing Cycle">
          <select
            value={draft.billing_cycle}
            onChange={(e) => setDraft({ ...draft, billing_cycle: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </Field>

        <Field label="Status">
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </Field>

        <Field label="Start Date">
          <input
            type="date" value={draft.start_date}
            onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          />
        </Field>

        <Field label="Renews On">
          <input
            type="date" value={draft.renew_date ?? ""} min={draft.start_date}
            onChange={(e) => setDraft({ ...draft, renew_date: e.target.value || null })}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          />
        </Field>

        <Field label="Applied Offer" full>
          <select
            value={draft.offer_id ?? ""}
            onChange={(e) => {
              const offer = offers.find((o) => o.id === e.target.value);
              setDraft({
                ...draft,
                offer_id: e.target.value || null,
                discount_pct: offer ? Number(offer.discount_pct) : discount,
              });
            }}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          >
            <option value="">— None —</option>
            {offers
              .filter((o) => o.active && (!o.package_id || o.package_id === draft.package_id))
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} — {o.label || "no label"} ({Number(o.discount_pct)}%)
                </option>
              ))}
          </select>
        </Field>

        <Field label="Notes" full>
          <textarea
            value={draft.notes ?? ""} rows={3}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          />
        </Field>
      </div>

      <div className="flex justify-between items-center mt-5 pt-4 border-t border-border/50">
        <p className="text-sm">
          <span className="text-muted-foreground">Net price:</span>{" "}
          <span className="font-bold text-primary">
            ${netPrice(base, discount).toFixed(2)} / {draft.billing_cycle === "yearly" ? "year" : "mo"}
          </span>
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 rounded-lg border border-border text-sm font-semibold disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => void save()} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const OfferEditor = ({
  offer, plans, onClose,
}: {
  offer: OfferRow;
  plans: Plan[];
  onClose: () => void;
}) => {
  const isNew = offer.id === "";
  const [draft, setDraft] = useState(offer);
  const [saving, setSaving] = useState(false);

  const [createOffer] = offersApi.useCreate();
  const [updateOffer] = offersApi.useUpdate();

  const save = async () => {
    const code = draft.code.trim().toUpperCase();
    if (!code) {
      toast.error("Code required");
      return;
    }

    const body: OfferWrite = {
      code,
      label: draft.label,
      discount_pct: Number(draft.discount_pct),
      package_id: draft.package_id,
      valid_until: draft.valid_until,
      active: draft.active,
    };

    setSaving(true);
    try {
      if (isNew) await createOffer(body).unwrap();
      else await updateOffer(draft.id, body).unwrap();
      toast.success("Offer saved");
      onClose();
    } catch (cause) {
      const message =
        (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? "Please try again.";
      toast.error("Could not save offer", {
        description: message === "Already exists" ? `The code ${code} is already in use.` : message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Offer / Discount Code">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Code">
          <input
            value={draft.code}
            onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
            placeholder="WELCOME20"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono"
          />
        </Field>
        <Field label="Discount (%)">
          <input
            type="number" min={0} max={100} value={draft.discount_pct}
            onChange={(e) => setDraft({ ...draft, discount_pct: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          />
        </Field>
        <Field label="Label" full>
          <input
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            placeholder="Welcome 20% off first year"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          />
        </Field>
        <Field label="Applies To">
          <select
            value={draft.package_id ?? ""}
            onChange={(e) => setDraft({ ...draft, package_id: e.target.value || null })}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          >
            <option value="">All Plans</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Valid Until">
          <input
            type="date" value={draft.valid_until ?? ""}
            onChange={(e) => setDraft({ ...draft, valid_until: e.target.value || null })}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          />
        </Field>
        <Field label="Status" full>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            Offer is active
          </label>
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border/50">
        <button onClick={onClose} disabled={saving}
          className="px-4 py-2 rounded-lg border border-border text-sm font-semibold disabled:opacity-50">
          Cancel
        </button>
        <button onClick={() => void save()} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Save Offer"}
        </button>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------- shared --- */

const Field = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={full ? "col-span-2" : ""}>
    <Label className="block text-[11px] tracking-widest font-bold text-muted-foreground mb-1.5">{label}</Label>
    {children}
  </div>
);

const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose} role="presentation">
    <div className="bg-card rounded-2xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center justify-between p-5 border-b border-border/50 sticky top-0 bg-card z-10">
        <h3 className="font-display text-xl text-primary">{title}</h3>
        <button onClick={onClose} aria-label="Close" className="p-1.5 rounded hover:bg-muted">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

export default PackageManagement;
