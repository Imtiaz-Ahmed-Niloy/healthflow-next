"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, Kpi, Pill, SectionTitle, Btn } from "@/components/admin/ui";
import { Avatar } from "@/components/common/Avatar";
import { useFormatters } from "@/lib/appSettings";
import { useConfirmAction } from "@/components/common/ConfirmProvider";
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

const KINDS = ["birth_certificate", "nid", "passport"] as const;

/**
 * Whose papers these are (0070). A patient may send their own and their
 * emergency contact's, and the two are checked against different questions —
 * so the queue says which it is looking at rather than leaving it to be
 * guessed from the name on the scan.
 */
const HOLDERS = ["self", "emergency_contact"] as const;

const STATUS_TONE: Record<string, "ok" | "warn" | "bad"> = {
  verified: "ok",
  pending: "warn",
  rejected: "bad",
};

const FILTERS = ["pending", "verified", "rejected", "all"] as const;
type Filter = (typeof FILTERS)[number];

const Verification = () => {
  const t = useTranslations("super.verification");
  const tc = useTranslations("common");
  const kindLabel = (value: string) =>
    (KINDS as readonly string[]).includes(value) ? t(`kinds.${value as (typeof KINDS)[number]}`) : value;
  const holderLabel = (value: string) =>
    (HOLDERS as readonly string[]).includes(value) ? t(`holders.${value as (typeof HOLDERS)[number]}`) : value;
  const statusLabel = (value: string) =>
    value === "pending" || value === "verified" || value === "rejected" ? t(`statuses.${value}`) : value;

  const { formatDateTime } = useFormatters();
  // Verify asks first. Reject needs no second question: it already opens
  // the note box, and its own button there is the confirmation.
  const confirmAction = useConfirmAction();
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
      toast.error(t("decisionFailed"));
      return;
    }
    toast.success(status === "verified" ? t("verifiedToast") : t("rejectedToast"));
    setRejecting(null);
    setNote("");
    void refetch();
  };

  return (
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Kpi icon={Clock3} label={t("kpis.waiting")} value={pendingCount === undefined ? "—" : String(pendingCount)}
          tone={pendingCount ? "destructive" : "primary"} />
        <Kpi icon={BadgeCheck} label={t("filters.verified")} value={verifiedCount === undefined ? "—" : String(verifiedCount)} tone="accent" />
        <Kpi icon={XCircle} label={t("filters.rejected")} value={rejectedCount === undefined ? "—" : String(rejectedCount)} tone="chip" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-6">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              filter === f ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-muted/60"
            }`}>
            {t(`filters.${f}`)}
          </button>
        ))}
      </div>

      <Card className="p-5 mt-4">
        <SectionTitle
          title={t(`filters.${filter}`)}
          action={<Pill tone="info">{t("shown", { count: rows.length })}</Pill>}
        />

        {isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{tc("loading")}</p>
        ) : isError ? (
          <div className="py-12 text-center">
            <ShieldQuestion className="h-6 w-6 text-destructive mx-auto mb-3" />
            <p className="text-sm text-foreground/80">{t("loadFailed")}</p>
            <Btn variant="outline" className="mt-4" onClick={() => void refetch()}>{t("tryAgain")}</Btn>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {filter === "pending" ? t("nothingWaiting") : t("nothingHere")}
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {rows.map(row => (
              <div key={row.id} className="py-4">
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar src={row.profiles?.avatar_url} name={row.profiles?.full_name ?? t("patient")} className="h-11 w-11" />

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-primary flex items-center gap-1.5">
                      {row.profiles?.full_name ?? t("unnamed")}
                      {row.status === "verified" && row.holder === "self"
                        && <BadgeCheck className="h-4 w-4 text-primary-glow" aria-label={t("filters.verified")} />}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground">
                        {holderLabel(row.holder)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {kindLabel(row.kind)}
                      {/* The number is half of what is being checked: read it
                          off the scan and see whether the two agree. */}
                      {row.document_number ? ` · ${t("number", { number: row.document_number })}` : ` · ${t("noNumber")}`}
                      {row.profiles?.email ? ` · ${row.profiles.email}` : ""}
                      {row.profiles?.phone ? ` · ${row.profiles.phone}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("submitted", { when: formatDateTime(row.submitted_at) })}
                      {row.reviewed_at && ` · ${t("reviewed", { when: formatDateTime(row.reviewed_at) })}`}
                    </p>
                    {row.review_note && (
                      <p className="text-xs text-destructive mt-1">{t("noteToPatient", { note: row.review_note })}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/api/v1/documents?key=${encodeURIComponent(row.file_key)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-chip"
                    >
                      <FileText className="h-3.5 w-3.5" /> {t("open")}
                    </a>

                    <Pill tone={STATUS_TONE[row.status] ?? "info"}>{statusLabel(row.status)}</Pill>

                    {row.status !== "verified" && (
                      <button type="button" disabled={saving}
                        onClick={async () => { if (await confirmAction(t("verify"), { name: row.profiles?.full_name })) void decide(row, "verified"); }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-60">
                        <BadgeCheck className="h-3.5 w-3.5" /> {t("verify")}
                      </button>
                    )}
                    {row.status !== "rejected" && (
                      <button type="button" disabled={saving}
                        onClick={() => { setRejecting(rejecting === row.id ? null : row.id); setNote(""); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-60">
                        <XCircle className="h-3.5 w-3.5" /> {t("reject")}
                      </button>
                    )}
                  </div>
                </div>

                {rejecting === row.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder={t("rejectPlaceholder")}
                      className="flex-1 min-w-[260px] bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Btn variant="danger" onClick={() => decide(row, "rejected", note.trim() || undefined)} disabled={saving}>
                      {t("rejectDocument")}
                    </Btn>
                    <Btn variant="outline" onClick={() => setRejecting(null)}>{tc("cancel")}</Btn>
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
