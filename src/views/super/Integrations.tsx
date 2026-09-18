"use client";

import { useTranslations } from "next-intl";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Pill, Btn } from "@/components/admin/ui";
import { toast } from "sonner";

/** Product names stay as they are; what each one does is translated. */
const items = [
  { n: "Stripe", d: "stripe", on: true },
  { n: "Twilio", d: "twilio", on: true },
  { n: "SendGrid", d: "sendgrid", on: true },
  { n: "Google Calendar", d: "calendar", on: false },
  { n: "Zoom", d: "zoom", on: true },
  { n: "AWS S3", d: "s3", on: true },
] as const;

const Integrations = () => {
  const t = useTranslations("super.integrations");
  return (
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      <Card className="p-5">
        <SectionTitle title={t("connected")} />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(i => (
            <div key={i.n} className="rounded-xl bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-primary">{i.n}</p>
                <Pill tone={i.on ? "ok" : "default"}>{i.on ? t("on") : t("off")}</Pill>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{t(`services.${i.d}`)}</p>
              <Btn variant="ghost" className="mt-3" onClick={() => toast.info(t("configuring", { name: i.n }))}>{t("configure")}</Btn>
            </div>
          ))}
        </div>
      </Card>
    </SuperLayout>
  );
};
export default Integrations;
