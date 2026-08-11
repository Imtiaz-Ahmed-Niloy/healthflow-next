"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, X, CalendarDays, MapPin, BadgeCheck } from "lucide-react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { Modal } from "@/components/admin/crud";
import { statusTone } from "@/components/admin/crud";
import { BD_DIVISIONS, BD_LOCATIONS } from "@/data/bdLocations";
import { BD_UPAZILAS } from "@/data/bdUpazilas";
import { HOSPITAL_FIELDS, HOSPITAL_STEPS } from "@/data/hospitalFields";
import type { Database } from "@/lib/supabase/types";

/**
 * One list for every hospital in Bangladesh, filtered by status. There is no
 * separate onboarding queue — `pending` IS the queue.
 *
 * Field names are Postgres column names throughout; the form posts straight to
 * /api/v1/hospitals. Approving a hospital provisions its admin login, which is
 * why credentials appear on approve rather than on create: most rows here are
 * directory listings that will never have a login.
 */

type TenantRow = Database["public"]["Tables"]["tenants"]["Row"];

/** What the table and form work with. `id` and `status` satisfy ResourcePage. */
type H = Pick<
  TenantRow,
  | "id" | "name" | "slug" | "location" | "region" | "division" | "district"
  | "subdistrict" | "beds" | "doctor_count" | "created_at" | "trade_license"
> & { status: string };

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  suspended: "Suspended",
};

type ApproveResult = {
  hospital: string;
  alreadyProvisioned: boolean;
  email: string;
  password?: string;
};

const Page = () => {
  const [creds, setCreds] = useState<ApproveResult | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter state
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const districtOptions = useMemo(() => (division ? BD_LOCATIONS[division] || [] : []), [division]);
  const upazilaOptions = useMemo(() => (district ? BD_UPAZILAS[district] || [] : []), [district]);

  const filterFn = (h: H) => {
    if (division && h.division !== division) return false;
    if (district && h.district !== district) return false;
    if (subdistrict && (h.subdistrict || "").toLowerCase() !== subdistrict.toLowerCase()) return false;
    const added = (h.created_at || "").slice(0, 10);
    if (dateFrom && (!added || added < dateFrom)) return false;
    if (dateTo && (!added || added > dateTo)) return false;
    return true;
  };

  const hasFilter = !!(division || district || subdistrict || dateFrom || dateTo);
  const clearFilters = () => { setDivision(""); setDistrict(""); setSubdistrict(""); setDateFrom(""); setDateTo(""); };

  const extraFilters = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1.5 bg-muted/40 rounded-full pl-3 pr-1 py-0.5">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
        <select value={division} onChange={e => { setDivision(e.target.value); setDistrict(""); setSubdistrict(""); }}
          className="h-7 bg-transparent text-xs outline-none pr-1" aria-label="Division">
          <option value="">Division</option>
          {BD_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={district} onChange={e => { setDistrict(e.target.value); setSubdistrict(""); }}
          disabled={!division} aria-label="District"
          className="h-7 bg-transparent text-xs outline-none pr-1 disabled:opacity-50">
          <option value="">District</option>
          {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {upazilaOptions.length > 0 ? (
          <select value={subdistrict} onChange={e => setSubdistrict(e.target.value)}
            disabled={!district} aria-label="Subdistrict"
            className="h-7 bg-transparent text-xs outline-none pr-1 disabled:opacity-50">
            <option value="">Subdistrict</option>
            {upazilaOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <input value={subdistrict} onChange={e => setSubdistrict(e.target.value)}
            disabled={!district} placeholder="Subdistrict" aria-label="Subdistrict"
            className="h-7 w-28 bg-transparent text-xs outline-none disabled:opacity-50" />
        )}
      </div>
      <div className="inline-flex items-center gap-1.5 bg-muted/40 rounded-full pl-3 pr-2 py-0.5">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="h-7 bg-transparent text-xs outline-none" aria-label="From date" />
        <span className="text-xs text-muted-foreground">→</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="h-7 bg-transparent text-xs outline-none" aria-label="To date" />
      </div>
      {hasFilter && (
        <button onClick={clearFilters}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-xs font-semibold border border-border hover:bg-muted">
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      )}
    </div>
  );

  /**
   * Approving provisions the hospital_admin login. The endpoint is idempotent,
   * so a second press reports the existing admin instead of creating another —
   * but the password is only ever returned on the first, so it is shown once and
   * never stored.
   */
  const approve = async (h: H) => {
    setApproving(h.id);
    try {
      const res = await fetch(`/api/v1/hospitals/${h.id}/approve`, { method: "POST" });
      const body = await res.json();

      if (!res.ok) {
        toast.error("Could not approve", { description: body?.error?.message ?? "Please try again." });
        return;
      }

      const result = body.data as ApproveResult;
      setRefreshKey(k => k + 1);

      if (result.alreadyProvisioned) {
        toast.success("Hospital approved", {
          description: `${result.email} already has the admin login for this hospital.`,
        });
        return;
      }

      setCreds(result);
      toast.success("Approved and admin login created");
    } catch {
      toast.error("Could not approve", { description: "The request failed. Please try again." });
    } finally {
      setApproving(null);
    }
  };

  const copy = (v: string, label: string) => {
    navigator.clipboard.writeText(v);
    toast.success(`${label} copied`);
  };

  return (
    <SuperLayout title="Hospital Management" subtitle="Every hospital, filtered by status">
      <ResourcePage<H> key={refreshKey} config={{
        storeKey: "super-hospitals",
        resource: "hospitals",
        searchFields: ["name", "region", "location"],
        statuses: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
        extraFilters,
        filterFn,
        steps: HOSPITAL_STEPS,
        rowActions: h => (h.status === "pending" ? (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); void approve(h); }}
            disabled={approving === h.id}
            title="Approve and create the admin login"
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold border border-border hover:bg-muted disabled:opacity-50">
            <BadgeCheck className="h-3.5 w-3.5" />
            {approving === h.id ? "Approving…" : "Approve"}
          </button>
        ) : null),
        columns: [
          { key: "name", label: "Hospital", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          { key: "location", label: "Location", sortable: true, accessor: r => r.location || "" },
          { key: "district", label: "District", accessor: r => r.district || "" },
          { key: "trade_license", label: "Trade licence", accessor: r => r.trade_license || "" },
          // accessor drives sorting, render drives display. A directory row
          // usually has no bed count, and showing "0" would claim it has none.
          { key: "beds", label: "Beds", sortable: true, accessor: r => Number(r.beds ?? 0), render: r => r.beds ?? "—" },
          { key: "doctor_count", label: "Doctors", accessor: r => Number(r.doctor_count ?? 0), render: r => r.doctor_count ?? "—" },
          { key: "created_at", label: "Added", sortable: true, accessor: r => (r.created_at || "").slice(0, 10) },
          { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{STATUS_LABELS[r.status] ?? r.status}</Pill> },
        ],
        fields: HOSPITAL_FIELDS,
      }} />

      <Modal
        open={!!creds}
        onClose={() => setCreds(null)}
        title="Management admin credentials generated"
        footer={
          <button onClick={() => setCreds(null)}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">
            Done
          </button>
        }>
        {creds && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
              <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-primary">{creds.hospital}</span> is approved and its
                admin can now sign in. Share these securely — the password is shown
                {" "}<span className="font-semibold text-primary">only once</span> and cannot be retrieved again.
              </p>
            </div>
            {[
              { label: "Email", value: creds.email },
              { label: "Password", value: creds.password ?? "" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5">{label.toUpperCase()}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted/40 rounded-lg px-3 py-2 text-sm font-mono break-all">{value}</code>
                  <button onClick={() => copy(value, label)}
                    className="p-2 rounded-lg border border-border hover:bg-muted" title={`Copy ${label}`}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </SuperLayout>
  );
};
export default Page;
