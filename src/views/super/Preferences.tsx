"use client";

import { useTranslations } from "next-intl";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Btn, Pill } from "@/components/admin/ui";
import { toast } from "sonner";

const Preferences = () => {
  const t = useTranslations("super.preferences");
  const tc = useTranslations("common");
  const profile = [
    [t("displayName"), "Root Operator"],
    [t("email"), "root@demo.pro"],
    [t("phone"), "+1 (555) 010-0001"],
  ];
  const security = [
    [t("security.twoFactor"), t("security.twoFactorValue")],
    [t("security.timeout"), t("security.timeoutValue")],
    [t("security.ip"), t("security.ipValue")],
  ];
  return (
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionTitle title={t("profile")} action={<Btn onClick={() => toast.success(t("saved"))}>{tc("save")}</Btn>} />
          <div className="space-y-4 text-sm">
            {profile.map(([l, v]) => (
              <div key={l}>
                <p className="text-[10px] tracking-widest text-muted-foreground uppercase">{l}</p>
                <input defaultValue={v} className="mt-1 w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle title={t("security.title")} />
          {security.map(([title, d]) => (
            <div key={title} className="rounded-xl bg-muted/40 p-4 mb-2 flex items-center justify-between">
              <div>
                <p className="font-semibold text-primary text-sm">{title}</p>
                <p className="text-xs text-muted-foreground">{d}</p>
              </div>
              <Pill tone="ok">{t("active")}</Pill>
            </div>
          ))}
        </Card>
      </div>
    </SuperLayout>
  );
};
export default Preferences;
