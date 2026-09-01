"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, KeyRound, X, CalendarDays, MapPin, BadgeCheck, Loader2, Package, ShieldPlus, Receipt } from "lucide-react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { mediaUrl } from "@/lib/media";
import { Pill } from "@/components/admin/ui";
import { Modal, ConfirmDialog } from "@/components/admin/crud";
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
  | "subdistrict" | "beds" | "doctor_count" | "created_at" | "logo_url"
> & { status: string };

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  suspended: "Suspended",
};

type ApproveResult = {
  hospital: string;
  /** Absent on the view and reset paths — only approve can report this. */
  alreadyProvisioned?: boolean;
  email: string;
  password?: string;
  /**
   * Whether the password was stored so it can be read back later. Absent on
   * view and reset, where being readable is the whole point.
   */
  saved?: boolean;
};

const Page = () => {
  const [creds, setCreds] = useState<ApproveResult | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Resetting replaces a password the hospital admin may be using right now,
  // so it gets its own confirmation rather than firing on the click that
  // discovered there was nothing saved.
  const [pendingReset, setPendingReset] = useState<H | null>(null);
  // An approved hospital whose login was never created — see `no_admin_login`
  // in the login route. Its row shows the key icon, not Approve, so the offer
  // to provision has to come from here.
  const [pendingProvision, setPendingProvision] = useState<H | null>(null);
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
   * so a second press reports the existing admin instead of creating another.
   *
   * The password is still only RETURNED on the first press, but since HF-73 it
   * is also stored, so the key icon on the row can read it back afterwards.
   * `saved: false` means that storing failed and this really is the only time
   * it will be shown — the modal says so in that case.
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

  /**
   * Reads the stored admin password back. The counterpart to approve showing
   * it once — before HF-73 that modal was the only place it ever appeared.
   */
  const viewLogin = async (h: H) => {
    setBusyId(h.id);
    try {
      const res = await fetch(`/api/v1/hospitals/${h.id}/login`);
      const body = await res.json();
      if (!res.ok) {
        // Approved before the secret table existed, so nothing was stored.
        // Offer to replace it rather than leaving the button dead.
        if (body?.error?.code === "no_saved_password") {
          setPendingReset(h);
          return;
        }
        // Approved without ever being provisioned — the bulk of the seeded
        // directory. Approve is idempotent and creates the missing login, so
        // offer that instead of a toast pointing at a button this row lacks.
        if (body?.error?.code === "no_admin_login") {
          setPendingProvision(h);
          return;
        }
        toast.error("Could not load login", { description: body?.error?.message ?? "Please try again." });
        return;
      }
      setCreds(body.data as ApproveResult);
    } catch {
      toast.error("Could not load login", { description: "The request failed. Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  const resetLogin = async (h: H) => {
    setBusyId(h.id);
    try {
      const res = await fetch(`/api/v1/hospitals/${h.id}/login`, { method: "PUT" });
      const body = await res.json();
      if (!res.ok) {
        toast.error("Could not reset password", { description: body?.error?.message ?? "Please try again." });
        return;
      }
      setCreds(body.data as ApproveResult);
      toast.success("Password reset");
    } catch {
      toast.error("Could not reset password", { description: "The request failed. Please try again." });
    } finally {
      setBusyId(null);
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
        // Pending hospitals get Approve, which is what creates the login.
        // Once there is a login, the key icon reads it back — the same
        // affordance /admin/doctors has for doctors.
        rowActions: h => (
          <>
            {h.status === "pending" ? (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); void approve(h); }}
                disabled={approving === h.id}
                title="Approve and create the admin login"
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold border border-border hover:bg-muted disabled:opacity-50">
                <BadgeCheck className="h-3.5 w-3.5" />
                {approving === h.id ? "Approving…" : "Approve"}
              </button>
            ) : (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); void viewLogin(h); }}
                disabled={busyId === h.id}
                title="View this hospital's admin login"
                className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 disabled:opacity-50">
                {busyId === h.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              </button>
            )}
            {/*
              Plans and roles live on their own screens, so these hand the
              hospital over rather than duplicating those forms here. Real
              links, not click handlers, so middle-click and keyboard still
              work; the stopPropagation is only to keep the row itself from
              opening the hospital editor underneath.
            */}
            <Link
              href={`/super/package-management?assign=${h.id}`}
              onClick={e => e.stopPropagation()}
              title={`Assign a package to ${h.name}`}
              aria-label={`Assign a package to ${h.name}`}
              className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 inline-flex">
              <Package className="h-4 w-4" />
            </Link>
            <Link
              href={`/super/roles?hospital=${h.id}`}
              onClick={e => e.stopPropagation()}
              title={`Create a role for ${h.name}`}
              aria-label={`Create a role for ${h.name}`}
              className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 inline-flex">
              <ShieldPlus className="h-4 w-4" />
            </Link>
            <Link
              href={`/super/billing?hospital=${h.id}`}
              onClick={e => e.stopPropagation()}
              title={`Invoices for ${h.name}`}
              aria-label={`Invoices for ${h.name}`}
              className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 inline-flex">
              <Receipt className="h-4 w-4" />
            </Link>
          </>
        ),
        columns: [
          {
            key: "name", label: "Hospital", sortable: true, accessor: r => r.name,
            // The logo rides in the name cell rather than taking a column of
            // its own — most hospitals have no logo yet, and a column of empty
            // squares reads as broken. Initial as the fallback.
            render: r => {
              const logo = mediaUrl(r.logo_url);
              return (
                <span className="inline-flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-lg overflow-hidden bg-muted/50 border border-border/60 grid place-items-center shrink-0 text-[11px] font-bold text-muted-foreground">
                    {logo
                      ? <img src={logo} alt="" className="h-full w-full object-cover" />
                      : (r.name?.[0]?.toUpperCase() ?? "?")}
                  </span>
                  <span className="font-semibold text-primary">{r.name}</span>
                </span>
              );
            },
          },
          { key: "location", label: "Location", sortable: true, accessor: r => r.location || "" },
          { key: "district", label: "District", accessor: r => r.district || "" },
          // accessor drives sorting, render drives display. A directory row
          // usually has no bed count, and showing "0" would claim it has none.
          { key: "beds", label: "Beds", sortable: true, accessor: r => Number(r.beds ?? 0), render: r => r.beds ?? "—" },
          { key: "doctor_count", label: "Doctors", accessor: r => Number(r.doctor_count ?? 0), render: r => r.doctor_count ?? "—" },
          { key: "created_at", label: "Added", sortable: true, accessor: r => (r.created_at || "").slice(0, 10) },
          { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{STATUS_LABELS[r.status] ?? r.status}</Pill> },
        ],
        fields: HOSPITAL_FIELDS,
      }} />

      <ConfirmDialog
        open={!!pendingReset}
        onClose={() => setPendingReset(null)}
        onConfirm={() => pendingReset && void resetLogin(pendingReset)}
        title="Reset this hospital admin's password?"
        description={
          pendingReset
            ? `${pendingReset.name} was approved before its password could be stored, so there is nothing to show. The old password can't be recovered, only replaced. Resetting sets a new one you can view here from now on — and locks out whoever is using the old one.`
            : undefined
        }
      />

      <ConfirmDialog
        open={!!pendingProvision}
        onClose={() => setPendingProvision(null)}
        onConfirm={() => pendingProvision && void approve(pendingProvision)}
        title="Create this hospital's admin login?"
        description={
          pendingProvision
            ? `${pendingProvision.name} is already approved but never had an admin login created, so there is nothing to show. Creating one now generates the password you can view here from now on. It uses the hospital's main email — or the owner's — as the username, so add one first if neither is set.`
            : undefined
        }
      />

      <Modal
        open={!!creds}
        onClose={() => setCreds(null)}
        title={creds?.saved === undefined ? "Hospital admin login" : "Management admin credentials generated"}
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
                <span className="font-semibold text-primary">{creds.hospital}</span>&apos;s admin can sign
                in with these. Share them securely —{" "}
                {creds.saved === false ? (
                  <>saving this password for later failed, so it is shown{" "}
                    <span className="font-semibold text-primary">only once</span>. Copy it now, or use the
                    key icon on the row to reset it.</>
                ) : (
                  <>you can come back to the key icon on this row and view them again at any time.</>
                )}
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
