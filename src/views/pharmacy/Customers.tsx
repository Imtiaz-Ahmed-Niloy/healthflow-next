"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Eye, Gift, History, Settings, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { PagedResource } from "@/components/pharmacy/PagedResource";
import { Pager, StateBlock, TierPill, Tile, usePharmacyCan, usePharmacyError } from "@/components/pharmacy/ui";
import { Btn, Pill } from "@/components/admin/ui";
import { Chips, Field, Input, Modal, type Column } from "@/components/admin/crud";
import type { FieldDef } from "@/components/admin/ResourcePage";
import { useFormatters } from "@/lib/appSettings";
import { LOYALTY_TIERS, type LedgerKind, type LoyaltyTier, type PharmacyCustomer, type PharmacySettings } from "@/lib/pharmacy";
import {
  pharmacyCustomersApi, pharmacyLedgerApi, useAdjustPointsMutation, useLoyaltySummaryQuery, usePharmacySettingsQuery,
} from "@/redux/api/pharmacy";

const KIND_TONE: Record<LedgerKind, "ok" | "warn" | "bad" | "info"> = {
  earned: "ok", bonus: "ok", restored: "ok", credit_added: "info",
  redeemed: "warn", credit_used: "warn", adjusted: "bad", reversed: "bad",
};

/** Where the next tier starts, or null at the top. */
const nextTier = (settings: PharmacySettings, tier: LoyaltyTier) =>
  tier === "bronze" ? { tier: "silver" as const, at: settings.loyalty_silver_at }
  : tier === "silver" ? { tier: "gold" as const, at: settings.loyalty_gold_at }
  : tier === "gold" ? { tier: "platinum" as const, at: settings.loyalty_platinum_at }
  : null;

/** One customer: where they stand, and every point and taka of credit that has moved. */
const CustomerDetail = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const t = useTranslations("pharmacy.customers");
  const tc = useTranslations("pharmacy.common");
  const tt = useTranslations("pharmacy.tiers");
  const describe = usePharmacyError();
  const can = usePharmacyCan();
  const { formatCurrency, formatDateTime } = useFormatters();
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState(false);
  const { data: settingsData } = usePharmacySettingsQuery();
  // Read fresh rather than from the list: points change with every sale.
  const { data: found, refetch: reload } = pharmacyCustomersApi.useGet(id);
  const { data: ledger, isLoading, error, refetch } = pharmacyLedgerApi.useList({ page, limit: 10, filters: { customer_id: id } });
  const [adjust, { isLoading: saving }] = useAdjustPointsMutation();

  // A copy from an earlier look may still be in the cache; what is shown must be now.
  useEffect(() => { reload(); }, [reload]);

  const customer = found?.data;
  const settings = settingsData?.data;
  if (!customer || !settings) return null;

  const close = () => { setPage(1); setAdjusting(false); onClose(); };
  const next = nextTier(settings, customer.tier);
  const lines = ledger?.data ?? [];

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await adjust({ customer_id: customer.id, points: Number(form.get("points")), reason: String(form.get("reason") ?? "") }).unwrap();
      toast.success(t("pointsSaved"));
      setAdjusting(false);
      reload();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <Modal open onClose={close} title={customer.name} size="lg"
      footer={<>
        <Link href={`/pharmacy/sales?customer=${customer.id}`}><Btn variant="outline"><History className="h-4 w-4" /> {t("viewSales")}</Btn></Link>
        {can("administer") && settings.loyalty_enabled && !adjusting && (
          <Btn variant="outline" onClick={() => setAdjusting(true)}><Award className="h-4 w-4" /> {t("adjustPoints")}</Btn>
        )}
      </>}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-4">
        {settings.loyalty_enabled && <TierPill tier={customer.tier} />}
        {customer.phone && <span>{customer.phone}</span>}
        {customer.email && <span>{customer.email}</span>}
        {!customer.is_active && <Pill>{tc("inactive")}</Pill>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label={t("points")} value={customer.points} hint={t("lifetime", { count: customer.lifetime_points })} />
        <Tile label={t("storeCredit")} value={formatCurrency(Number(customer.store_credit))} tone={Number(customer.store_credit) > 0 ? "good" : "default"} />
        <Tile label={t("spent")} value={formatCurrency(Number(customer.total_spent))} hint={t("ordersCount", { count: customer.orders_count })} />
        <Tile label={t("columns.balance")} value={formatCurrency(Number(customer.balance_due))} tone={Number(customer.balance_due) > 0 ? "bad" : "default"} />
      </div>

      {settings.loyalty_enabled && (
        <p className="mt-3 text-xs text-muted-foreground">
          {next
            ? t("toNextTier", { count: Math.max(next.at - customer.lifetime_points, 0), tier: tt(next.tier) })
            : t("topTier")}
        </p>
      )}
      {customer.allergies && <p className="mt-2 text-sm font-semibold text-destructive">{t("allergiesLine", { list: customer.allergies })}</p>}

      {adjusting && (
        <form onSubmit={submit} className="mt-4 rounded-xl bg-muted/40 p-4">
          <div className="grid sm:grid-cols-[140px_1fr] gap-x-4">
            <Field label={t("pointsChange")} required hint={t("pointsChangeHint")}>
              <Input name="points" type="number" step={1} required autoFocus placeholder="+50" />
            </Field>
            <Field label={t("pointsReason")} required><Input name="reason" required maxLength={300} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="outline" onClick={() => setAdjusting(false)}>{tc("cancel")}</Btn>
            <Btn type="submit" disabled={saving}>{saving ? tc("saving") : tc("save")}</Btn>
          </div>
        </form>
      )}

      <h4 className="mt-5 mb-2 text-sm font-semibold text-primary">{t("ledgerTitle")}</h4>
      {isLoading || error || lines.length === 0 ? (
        <StateBlock loading={isLoading} error={error} onRetry={refetch} empty={t("noLedger")} rows={3} />
      ) : (
        <ul className="space-y-1.5 text-sm">
          {lines.map(line => (
            <li key={line.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2">
                  <Pill tone={KIND_TONE[line.kind]}>{t(`kinds.${line.kind}`)}</Pill>
                  {line.reference && <span className="font-mono text-xs text-primary">{line.reference}</span>}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {formatDateTime(line.created_at)} · {line.created_by_name ?? "—"}{line.reason ? ` · ${line.reason}` : ""}
                </p>
              </div>
              <span className={`tabular-nums font-semibold ${(line.points || Number(line.amount)) < 0 ? "text-destructive" : "text-emerald-700"}`}>
                {line.points !== 0
                  ? t("pointsDelta", { count: `${line.points > 0 ? "+" : ""}${line.points}` })
                  : `${Number(line.amount) > 0 ? "+" : ""}${formatCurrency(Number(line.amount))}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {ledger?.meta && <Pager page={ledger.meta.page} totalPages={ledger.meta.totalPages} total={ledger.meta.total} onPage={setPage} />}
    </Modal>
  );
};

/**
 * Points by hand, outside a sale: a bonus given, or points taken for a reward
 * handed over at the counter. Both are the same correction underneath
 * (pharmacy_adjust_points) with a reason on the customer's history.
 */
const PointsDialog = ({ target, onClose }: { target: { customer: PharmacyCustomer; mode: "award" | "redeem" } | null; onClose: () => void }) => {
  const t = useTranslations("pharmacy.customers");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const { formatCurrency } = useFormatters();
  const { data: settingsData } = usePharmacySettingsQuery();
  const [adjust, { isLoading }] = useAdjustPointsMutation();
  const [points, setPoints] = useState("");
  const [spent, setSpent] = useState("");
  const [reason, setReason] = useState("");

  if (!target) return null;
  const { customer, mode } = target;
  const settings = settingsData?.data;
  const count = Math.max(Math.floor(Number(points)) || 0, 0);
  const worth = count * Number(settings?.loyalty_point_value ?? 1);
  const tooMany = mode === "redeem" && count > customer.points;

  const close = () => { setPoints(""); setSpent(""); setReason(""); onClose(); };

  // What a purchase of this size would have earned, for a sale that was rung up without the customer on it.
  const fromSpend = (value: string) => {
    setSpent(value);
    const per = Number(settings?.loyalty_spend_per_point ?? 100);
    if (Number(value) > 0 && per > 0) setPoints(String(Math.floor(Number(value) / per)));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await adjust({
        customer_id: customer.id,
        points: mode === "award" ? count : -count,
        reason: reason.trim() || (mode === "award" ? t("awardReason") : t("redeemReason")),
      }).unwrap();
      toast.success(t("pointsSaved"));
      close();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <Modal open onClose={close} title={mode === "award" ? t("awardTitle", { name: customer.name }) : t("redeemTitle", { name: customer.name })} size="sm">
      <form onSubmit={submit}>
        <p className="text-sm text-muted-foreground -mt-1 mb-4">{t("pointsNow", { count: customer.points })}</p>
        {mode === "award" && (
          <Field label={t("purchaseAmount")} hint={t("purchaseAmountHint")}>
            <Input value={spent} onChange={e => fromSpend(e.target.value)} type="number" min={0} step="any" placeholder="0.00" />
          </Field>
        )}
        <Field label={t("pointsChange")} required>
          <Input value={points} onChange={e => setPoints(e.target.value.replace(/\D/g, ""))} inputMode="numeric" required autoFocus placeholder="0" />
        </Field>
        {mode === "redeem" && count > 0 && (
          <p className={`-mt-2 mb-4 text-sm font-semibold ${tooMany ? "text-destructive" : "text-primary"}`}>
            {tooMany ? describe({ data: { error: { code: "redeem_too_many" } } }) : t("redeemWorth", { amount: formatCurrency(worth) })}
          </p>
        )}
        <Field label={t("pointsReason")}><Input value={reason} onChange={e => setReason(e.target.value)} maxLength={300} /></Field>
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={close}>{tc("cancel")}</Btn>
          <Btn type="submit" disabled={isLoading || count <= 0 || tooMany}>{isLoading ? tc("saving") : tc("save")}</Btn>
        </div>
      </form>
    </Modal>
  );
};

const Page = () => {
  const t = useTranslations("pharmacy.customers");
  const tc = useTranslations("pharmacy.common");
  const tt = useTranslations("pharmacy.tiers");
  const can = usePharmacyCan();
  const [pointsFor, setPointsFor] = useState<{ customer: PharmacyCustomer; mode: "award" | "redeem" } | null>(null);
  const { formatCurrency, formatDate } = useFormatters();
  const [tier, setTier] = useState<"all" | LoyaltyTier>("all");
  const [viewing, setViewing] = useState<string | null>(null);
  const { data: settingsData } = usePharmacySettingsQuery();
  const { data: summaryData } = useLoyaltySummaryQuery();
  const loyaltyOn = Boolean(settingsData?.data.loyalty_enabled);
  const summary = summaryData?.data;

  const columns: Column<PharmacyCustomer>[] = [
    { key: "customer", label: t("columns.customer"), render: r => (
      <div>
        <p className="font-semibold text-primary flex items-center gap-2">
          {r.name}
          {loyaltyOn && <TierPill tier={r.tier} />}
          {!r.is_active && <Pill>{tc("inactive")}</Pill>}
        </p>
        {r.address && <p className="text-xs text-muted-foreground truncate max-w-xs">{r.address}</p>}
      </div>
    ) },
    { key: "contact", label: t("columns.contact"), render: r => (
      <div className="text-sm">
        <p>{r.phone ?? "—"}</p>
        {r.email && <p className="text-xs text-muted-foreground">{r.email}</p>}
      </div>
    ) },
    { key: "orders", label: t("columns.orders"), render: r => (
      <div className="tabular-nums">
        {r.orders_count}
        <p className="text-[11px] text-muted-foreground">{formatCurrency(Number(r.total_spent))}</p>
      </div>
    ) },
    ...(loyaltyOn ? [{ key: "points", label: t("columns.points"), render: (r: PharmacyCustomer) => <span className="tabular-nums font-semibold">{r.points}</span> }] : []),
    { key: "credit", label: t("columns.credit"), render: r => (
      <span className={`tabular-nums ${Number(r.store_credit) > 0 ? "font-semibold text-emerald-700" : "text-muted-foreground"}`}>
        {formatCurrency(Number(r.store_credit))}
      </span>
    ) },
    { key: "balance", label: t("columns.balance"), render: r => (
      <span className={`tabular-nums font-semibold ${Number(r.balance_due) > 0 ? "text-destructive" : "text-muted-foreground"}`}>
        {formatCurrency(Number(r.balance_due))}
      </span>
    ) },
    { key: "lastVisit", label: t("columns.lastVisit"), render: r => (r.last_visit ? formatDate(r.last_visit) : t("never")) },
  ];

  const fields: FieldDef[] = [
    { name: "name", label: tc("name"), type: "text", required: true, fullWidth: true },
    { name: "phone", label: tc("phone"), type: "tel" },
    { name: "email", label: tc("email"), type: "email" },
    { name: "address", label: tc("address"), type: "textarea" },
    { name: "allergies", label: t("fields.allergies"), type: "text", fullWidth: true },
    { name: "notes", label: tc("notes"), type: "textarea" },
    { name: "is_active", label: tc("status"), type: "select", options: [{ value: "true", label: tc("active") }, { value: "false", label: tc("inactive") }] },
  ];

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")}>
      <PagedResource<PharmacyCustomer>
        resource="pharmacy-customers"
        columns={columns}
        fields={fields}
        searchPlaceholder={t("searchPlaceholder")}
        addLabel={t("add")}
        newTitle={t("newTitle")}
        editTitle={t("editTitle")}
        empty={t("noCustomers")}
        formNote={t("hint")}
        exportName="pharmacy-customers"
        defaults={{ is_active: true }}
        filters={{ tier: tier === "all" ? undefined : tier }}
        above={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Tile icon={Users} label={t("stats.customers")} value={summary?.customers ?? 0}
              hint={loyaltyOn ? t("stats.members", { count: summary?.members ?? 0 }) : undefined} />
            {loyaltyOn && <Tile icon={Award} label={t("stats.points")} value={Number(summary?.points ?? 0)} />}
            <Tile icon={Wallet} label={t("stats.credit")} value={formatCurrency(Number(summary?.store_credit ?? 0))} />
            {loyaltyOn && (
              <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-soft">
                <p className="text-xs font-semibold text-muted-foreground">{t("stats.tiers")}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {LOYALTY_TIERS.map(name => (
                    <div key={name} className="flex justify-between"><dt className="text-muted-foreground">{tt(name)}</dt><dd className="tabular-nums font-semibold">{summary?.[name] ?? 0}</dd></div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        }
        toolbar={loyaltyOn ? (
          <Chips value={tier} onChange={setTier}
            options={[{ value: "all" as const, label: tc("all") }, ...LOYALTY_TIERS.map(name => ({ value: name, label: tt(name) }))]} />
        ) : undefined}
        beside={can("administer") ? (
          <Link href="/pharmacy/settings#loyalty"><Btn variant="outline"><Settings className="h-4 w-4" /> {t("loyaltyRules")}</Btn></Link>
        ) : undefined}
        sorts={[
          { value: "created_at:desc", label: t("sorts.newest") },
          { value: "name:asc", label: t("sorts.name") },
          { value: "points:desc", label: t("sorts.points") },
          { value: "total_spent:desc", label: t("sorts.spent") },
          { value: "balance_due:desc", label: t("sorts.owes") },
        ]}
        rowActions={row => (
          <>
            <button type="button" onClick={() => setViewing(row.id)} title={t("view")} aria-label={t("view")}
              className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 inline-flex">
              <Eye className="h-4 w-4" />
            </button>
            {loyaltyOn && can("administer") && <>
              <button type="button" onClick={() => setPointsFor({ customer: row, mode: "award" })} title={t("award")} aria-label={t("award")}
                className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 inline-flex"><Award className="h-4 w-4" /></button>
              <button type="button" onClick={() => setPointsFor({ customer: row, mode: "redeem" })} title={t("redeem")} aria-label={t("redeem")}
                disabled={row.points <= 0} className="p-1.5 rounded-lg hover:bg-muted text-foreground/70 inline-flex disabled:opacity-40"><Gift className="h-4 w-4" /></button>
            </>}
          </>
        )}
      />
      <PointsDialog key={pointsFor ? `${pointsFor.customer.id}-${pointsFor.mode}` : "none"} target={pointsFor} onClose={() => setPointsFor(null)} />
      {!loyaltyOn && can("administer") && (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("loyaltyOff")} <Link href="/pharmacy/settings#loyalty" className="font-semibold text-primary underline">{t("loyaltyRules")}</Link>
        </p>
      )}
      {viewing && <CustomerDetail key={viewing} id={viewing} onClose={() => setViewing(null)} />}
    </PharmacyLayout>
  );
};

export default Page;
