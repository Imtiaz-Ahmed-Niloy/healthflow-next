"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, Kpi, Pill, SectionTitle, Btn } from "@/components/admin/ui";
import { Avatar } from "@/components/common/Avatar";
import { useFormatters } from "@/lib/appSettings";
import { useListResourceQuery, useUpdateResourceMutation } from "@/redux/api/createResourceApi";
import type { IdentityDocumentRow } from "@/redux/api/resources";
import { BadgeCheck, FileText, ShieldQuestion, XCircle, Clock3 } from "lucide-react";

/**
 * Patient identity verification (0068).
 *
 * A patient uploads a birth certificate, NID or passport; this is where a
 * super admin looks at it and decides. A verified document is what puts the
 * badge on their name — and, if something ever happens to a patient in a
 * hospital's care, it is how the platform can say who they actually are.
 *
 * The decision is recorded against the person who made it: the trigger in 0068
 * stamps reviewed_by and reviewed_at, so "who approved this" always has an
 * answer.
 */

const KIND_LABEL: Record<string, string> = {
  birth_certificate: "Birth certificate",
  nid: "National ID",
  passport: "Passport",
};

/**
 * Whose papers these are (0070). A patient may send their own and their
 * emergency contact's, and the two are checked against different questions —
 * so the queue says which it is looking at rather than leaving it to be
 * guessed from the name on the scan.
 */
const HOLDER_LABEL: Record<string, string> = {
  self: "Their own",
  emergency_contact: "Emergency contact",
};

const STATUS_TONE: Record<string, "ok" | "warn" | "bad"> = {
  verified: "ok",
  pending: "warn",
  rejected: "bad",
};

type Filter = "pending" | "verified" | "rejected" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "Waiting" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const Verification = () => {
  const { formatDateTime } = useFormatters();
  const [filter, setFilter] = useState<Filter>("pending");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const { data, isLoading, isError, refetch } = useListResourceQuery({
    resource: "identity-documents",
    limit: 100,
    filters: filter === "all" ? undefined : { status: filter },
  });

  // Counts for the tiles come from their own queries, so they describe every
  // submission rather than the page in front of you.
  const pendingCount = useListResourceQuery({ resource: "identity-documents", limit: 1, filters: { status: "pending" } }).data?.meta?.total;
  const verifiedCount = useListResourceQuery({ resource: "identity-documents", limit: 1, filters: { status: "verified" } }).data?.meta?.total;
  const rejectedCount = useListResourceQuery({ resource: "identity-documents", limit: 1, filters: { status: "rejected" } }).data?.meta?.total;

  const [update, { isLoading: saving }] = useUpdateResourceMutation();

  const rows = useMemo(
    () => ((data?.data ?? []) as unknown as IdentityDocumentRow[]),
    [data],
  );

  const decide = async (row: IdentityDocumentRow, status: "verified" | "rejected", reviewNote?: string) => {
    const result = await update({
      resource: "identity-documents",
      id: row.id,
      body: { status, review_note: reviewNote ?? null },
    });

    if ("error" in result) {
      toast.error("Couldn't record that decision.");
      return;
    }
    toast.success(status === "verified" ? "Patient verified" : "Document rejected");
    setRejecting(null);
    setNote("");
    void refetch();
  };

  return (
    <SuperLayout title="Patient Verification" subtitle="Identity documents, checked by a human">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Kpi icon={Clock3} label="Waiting on you" value={pendingCount === undefined ? "—" : String(pendingCount)}
          tone={pendingCount ? "destructive" : "primary"} />
        <Kpi icon={BadgeCheck} label="Verified" value={verifiedCount === undefined ? "—" : String(verifiedCount)} tone="accent" />
        <Kpi icon={XCircle} label="Rejected" value={rejectedCount === undefined ? "—" : String(rejectedCount)} tone="chip" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-6">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              filter === f.value ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-muted/60"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <Card className="p-5 mt-4">
        <SectionTitle
          title={FILTERS.find(f => f.value === filter)?.label ?? "Submissions"}
          action={<Pill tone="info">{rows.length} shown</Pill>}
        />

        {isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <div className="py-12 text-center">
            <ShieldQuestion className="h-6 w-6 text-destructive mx-auto mb-3" />
            <p className="text-sm text-foreground/80">Couldn&apos;t load the submissions.</p>
            <Btn variant="outline" className="mt-4" onClick={() => void refetch()}>Try again</Btn>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {filter === "pending" ? "Nothing waiting. Every submission has been dealt with." : "Nothing here."}
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {rows.map(row => (
              <div key={row.id} className="py-4">
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar src={row.profiles?.avatar_url} name={row.profiles?.full_name ?? "Patient"} className="h-11 w-11" />

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-primary flex items-center gap-1.5">
                      {row.profiles?.full_name ?? "Unnamed patient"}
                      {row.status === "verified" && row.holder === "self"
                        && <BadgeCheck className="h-4 w-4 text-primary-glow" aria-label="Verified" />}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground">
                        {HOLDER_LABEL[row.holder] ?? row.holder}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {KIND_LABEL[row.kind] ?? row.kind}
                      {/* The number is half of what is being checked: read it
                          off the scan and see whether the two agree. */}
                      {row.document_number ? ` · No. ${row.document_number}` : " · no number given"}
                      {row.profiles?.email ? ` · ${row.profiles.email}` : ""}
                      {row.profiles?.phone ? ` · ${row.profiles.phone}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatDateTime(row.submitted_at)}
                      {row.reviewed_at && ` · reviewed ${formatDateTime(row.reviewed_at)}`}
                    </p>
                    {row.review_note && (
                      <p className="text-xs text-destructive mt-1">Note to the patient: {row.review_note}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/api/v1/documents?key=${encodeURIComponent(row.file_key)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-chip"
                    >
                      <FileText className="h-3.5 w-3.5" /> Open document
                    </a>

                    <Pill tone={STATUS_TONE[row.status] ?? "info"}>{row.status}</Pill>

                    {row.status !== "verified" && (
                      <button type="button" disabled={saving} onClick={() => decide(row, "verified")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-60">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verify
                      </button>
                    )}
                    {row.status !== "rejected" && (
                      <button type="button" disabled={saving}
                        onClick={() => { setRejecting(rejecting === row.id ? null : row.id); setNote(""); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-60">
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    )}
                  </div>
                </div>

                {rejecting === row.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Why? The patient reads this — e.g. the photo is cut off."
                      className="flex-1 min-w-[260px] bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Btn variant="danger" onClick={() => decide(row, "rejected", note.trim() || undefined)} disabled={saving}>
                      Reject document
                    </Btn>
                    <Btn variant="outline" onClick={() => setRejecting(null)}>Cancel</Btn>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </SuperLayout>
  );
};

export default Verification;
