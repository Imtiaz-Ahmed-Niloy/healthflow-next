"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { StateBlock, usePharmacyError } from "@/components/pharmacy/ui";
import { Btn, Card, SectionTitle } from "@/components/admin/ui";
import { Field, Select } from "@/components/admin/crud";
import { INTERACTION_LEVELS, type InteractionLevel, type PharmacySettings } from "@/lib/pharmacy";
import { usePharmacySettingsQuery, useSavePharmacySettingsMutation } from "@/redux/api/pharmacy";

const FEATURES = ["ai_assistant", "ai_interactions", "ai_predictions", "ai_expiry"] as const;
type Feature = (typeof FEATURES)[number];
/** The two that send pharmacy data to the model, and so need the server's key. */
const NEEDS_KEY: Feature[] = ["ai_assistant", "ai_interactions"];

const Form = ({ settings, configured }: { settings: PharmacySettings; configured: boolean }) => {
  const t = useTranslations("pharmacy.aiSettings");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const [save, { isLoading }] = useSavePharmacySettingsMutation();
  const [on, setOn] = useState<Record<Feature, boolean>>({
    ai_assistant: settings.ai_assistant, ai_interactions: settings.ai_interactions,
    ai_predictions: settings.ai_predictions, ai_expiry: settings.ai_expiry,
  });
  const [level, setLevel] = useState<InteractionLevel>(settings.ai_interaction_level);

  const submit = async () => {
    try {
      await save({ ...on, ai_interaction_level: level }).unwrap();
      toast.success(t("saved"));
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card className="p-5">
        <SectionTitle title={t("keyTitle")} />
        <p className={`flex items-center gap-2 text-sm font-semibold ${configured ? "text-emerald-700" : "text-destructive"}`}>
          {configured ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {configured ? t("keyReady") : t("keyMissing")}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{t("keyWhy")}</p>
        {!configured && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-foreground/80">
            <li>{t("steps.one")}</li>
            <li>{t("steps.two")} <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">ANTHROPIC_API_KEY</code></li>
            <li>{t("steps.three")}</li>
          </ol>
        )}
        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground"><KeyRound className="h-3.5 w-3.5 shrink-0" /> {t("keyNote")}</p>
      </Card>

      <Card className="p-5">
        <SectionTitle title={t("featuresTitle")} />
        <ul className="space-y-3">
          {FEATURES.map(feature => (
            <li key={feature}>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1" checked={on[feature]} onChange={event => setOn(current => ({ ...current, [feature]: event.target.checked }))} />
                <span>
                  <span className="text-sm font-semibold text-primary">{t(`features.${feature}.title`)}</span>
                  <span className="block text-xs text-muted-foreground">{t(`features.${feature}.body`)}</span>
                  {NEEDS_KEY.includes(feature) && <span className="block text-[11px] text-amber-700">{t("sendsData")}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <SectionTitle title={t("advancedTitle")} />
        <div className="max-w-sm">
          <Field label={t("level")} hint={t("levelHint")}>
            <Select value={level} onChange={event => setLevel(event.target.value as InteractionLevel)}>
              {INTERACTION_LEVELS.map(value => <option key={value} value={value}>{t(`levels.${value}`)}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Btn onClick={submit} disabled={isLoading}>{isLoading ? tc("saving") : t("save")}</Btn>
      </div>
    </div>
  );
};

const Page = () => {
  const t = useTranslations("pharmacy.aiSettings");
  const { data, isLoading, error, refetch } = usePharmacySettingsQuery();

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")} needs="administer">
      {data?.data
        ? <Form key={JSON.stringify(data.data)} settings={data.data} configured={data.ai_configured} />
        : <StateBlock loading={isLoading} error={error} onRetry={refetch} rows={5} />}
    </PharmacyLayout>
  );
};

export default Page;
