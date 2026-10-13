"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { StateBlock, usePharmacyError } from "@/components/pharmacy/ui";
import { Btn, Card, SectionTitle } from "@/components/admin/ui";
import { Field, Input, TextArea } from "@/components/admin/crud";
import type { PharmacySettings } from "@/lib/pharmacy";
import { usePharmacySettingsQuery, useSavePharmacySettingsMutation } from "@/redux/api/pharmacy";

const Form = ({ settings, hospital }: { settings: PharmacySettings; hospital: string | null }) => {
  const t = useTranslations("pharmacy.settings");
  const tc = useTranslations("pharmacy.common");
  const tt = useTranslations("pharmacy.tiers");
  const describe = usePharmacyError();
  const [save, { isLoading }] = useSavePharmacySettingsMutation();
  const [loyaltyOn, setLoyaltyOn] = useState(settings.loyalty_enabled);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Every field is a plain input with the column's own name, so the form is the request.
    // The one checkbox is the exception: unticked, a form leaves it out altogether.
    const form = new FormData(event.currentTarget);
    const body = { ...Object.fromEntries(form.entries()), loyalty_enabled: form.get("loyalty_enabled") === "on" };
    try {
      await save(body as unknown as Partial<PharmacySettings>).unwrap();
      toast.success(t("saved"));
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  const text = (name: keyof PharmacySettings) => ({ name, defaultValue: (settings[name] as string | number | null) ?? "" });
  const year = new Date().getFullYear();

  return (
    <form onSubmit={submit} className="space-y-6 max-w-4xl">
      <Card className="p-5">
        <SectionTitle title={t("identity")} />
        <p className="text-sm text-muted-foreground -mt-2 mb-4">{t("identityHint", { hospital: hospital ?? "—" })}</p>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label={t("fields.pharmacy_name")}><Input {...text("pharmacy_name")} placeholder={hospital ?? ""} /></Field>
          <Field label={t("fields.license_no")}><Input {...text("license_no")} /></Field>
          <Field label={t("fields.phone")}><Input {...text("phone")} type="tel" /></Field>
          <Field label={t("fields.email")}><Input {...text("email")} type="email" /></Field>
          <Field label={t("fields.tax_id")}><Input {...text("tax_id")} maxLength={100} /></Field>
        </div>
        <Field label={t("fields.address")}><TextArea {...text("address")} rows={2} /></Field>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionTitle title={t("tax")} />
          <div className="grid grid-cols-2 gap-x-4">
            <Field label={t("fields.tax_label")}><Input {...text("tax_label")} required maxLength={20} /></Field>
            <Field label={t("fields.tax_rate")}><Input {...text("tax_rate")} type="number" min={0} max={100} step="any" required /></Field>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">{t("taxHint")}</p>
        </Card>

        <Card className="p-5">
          <SectionTitle title={t("numbering")} />
          <div className="grid grid-cols-2 gap-x-4">
            <Field label={t("fields.invoice_prefix")}><Input {...text("invoice_prefix")} required maxLength={10} pattern="[A-Za-z0-9]{1,10}" /></Field>
            <Field label={t("fields.po_prefix")}><Input {...text("po_prefix")} required maxLength={10} pattern="[A-Za-z0-9]{1,10}" /></Field>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">{t("numberingHint", { example: `${settings.invoice_prefix.toUpperCase()}-${year}-000042` })}</p>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle title={t("wording")} />
        <Field label={t("fields.receipt_footer")}><Input {...text("receipt_footer")} maxLength={500} /></Field>
        <Field label={t("fields.return_policy")}><TextArea {...text("return_policy")} rows={2} maxLength={500} /></Field>
        <Field label={t("fields.payment_terms")}><Input {...text("payment_terms")} maxLength={500} /></Field>
      </Card>

      {/* The customers screen links here: /pharmacy/settings#loyalty */}
      <div id="loyalty" className="scroll-mt-24">
      <Card className="p-5">
        <SectionTitle title={t("loyalty")} />
        <p className="text-sm text-muted-foreground -mt-2 mb-4">{t("loyaltyHint")}</p>
        <label className="flex items-center gap-2 text-sm font-semibold mb-4">
          <input type="checkbox" name="loyalty_enabled" checked={loyaltyOn} onChange={e => setLoyaltyOn(e.target.checked)} /> {t("fields.loyalty_enabled")}
        </label>
        {/* Kept in the form when switched off, so the rules are not lost by turning points off for a while. */}
        <div className={loyaltyOn ? "" : "opacity-50"}>
          <div className="grid sm:grid-cols-3 gap-x-4">
            <Field label={t("fields.loyalty_spend_per_point")} hint={t("spendHint")}>
              <Input {...text("loyalty_spend_per_point")} type="number" min={0.01} step="any" required />
            </Field>
            <Field label={t("fields.loyalty_point_value")} hint={t("valueHint")}>
              <Input {...text("loyalty_point_value")} type="number" min={0} step="any" required />
            </Field>
            <Field label={t("fields.loyalty_min_redeem")}>
              <Input {...text("loyalty_min_redeem")} type="number" min={1} step={1} required />
            </Field>
          </div>
          <p className="text-sm font-semibold text-primary mb-2">{t("tiers")}</p>
          <p className="text-[11px] text-muted-foreground mb-3">{t("tiersHint")}</p>
          <div className="grid sm:grid-cols-3 gap-x-4">
            {(["silver", "gold", "platinum"] as const).map(tier => (
              <div key={tier}>
                <Field label={t("tierAt", { tier: tt(tier) })}>
                  <Input {...text(`loyalty_${tier}_at`)} type="number" min={1} step={1} required />
                </Field>
                <Field label={t("tierRate", { tier: tt(tier) })}>
                  <Input {...text(`loyalty_${tier}_rate`)} type="number" min={1} max={10} step="any" required />
                </Field>
              </div>
            ))}
          </div>
        </div>
      </Card>
      </div>

      <Card className="p-5">
        <SectionTitle title={t("alerts")} />
        <div className="max-w-xs">
          <Field label={t("fields.expiring_soon_days")} hint={t("alertsHint")}>
            <Input {...text("expiring_soon_days")} type="number" min={1} max={730} step={1} required />
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t("regional")}</p>
        <Btn type="submit" disabled={isLoading}>{isLoading ? tc("saving") : tc("save")}</Btn>
      </div>
    </form>
  );
};

const Page = () => {
  const t = useTranslations("pharmacy.settings");
  const { data, isLoading, error, refetch } = usePharmacySettingsQuery();

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")} needs="administer">
      {data?.data
        // Keyed on the saved row, so the inputs pick up what the server kept after a save.
        ? <Form key={JSON.stringify(data.data)} settings={data.data} hospital={data.hospital} />
        : <StateBlock loading={isLoading} error={error} onRetry={refetch} rows={6} />}
    </PharmacyLayout>
  );
};

export default Page;
