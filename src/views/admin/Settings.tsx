"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle } from "@/components/admin/ui";
import { Field, Select } from "@/components/admin/crud";
import { toast } from "sonner";
import { useAppSettings, setAppSettings, useFormatters } from "@/lib/appSettings";
import { isLocale } from "@/i18n/config";
import { useChangeLocale } from "@/i18n/useChangeLocale";
import { useRoleLabel } from "@/i18n/useRoleLabel";

const TABS = ["preferences", "roles", "security", "audit"] as const;
type Tab = (typeof TABS)[number];

/** The roles RBAC is edited for, by the value the token carries. */
const ROLES = ["super_admin", "hospital_admin", "hr_admin", "finance_admin", "lab_admin", "pharmacy_admin"] as const;
const RESOURCES = ["doctors", "patients", "lab", "pharmacy", "finance", "hr"] as const;
const ACTIONS = ["view", "create", "edit", "delete", "approve"] as const;

const TIMEZONES: string[] =
  typeof Intl !== "undefined" && (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
    ? (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone")
    : ["UTC","America/New_York","Europe/London","Asia/Dhaka","Asia/Kolkata","Asia/Tokyo"];

const DATE_FORMATS = [
  "MMM DD, YYYY",
  "DD MMM YYYY",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD-MM-YYYY",
  "dddd, MMM DD, YYYY",
];

/** The security tiles: a fixed list, each with the tone its pill takes. */
const SECURITY = [
  { key: "twoFactor", tone: "ok" },
  { key: "sessionTimeout", tone: "ok" },
  { key: "auditLogging", tone: "ok" },
  { key: "passwordPolicy", tone: "ok" },
  { key: "ipAllowlist", tone: "info" },
  { key: "failedLogins", tone: "warn" },
] as const;

const Settings = () => {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("common");
  const roleLabel = useRoleLabel();
  const [tab, setTab] = useState<Tab>("preferences");
  const [role, setRole] = useState<(typeof ROLES)[number]>(ROLES[0]);
  const [, setPerms] = useState<Record<string, boolean>>({});
  const k = (r: string, a: string) => `${role}|${r}|${a}`;
  const settings = useAppSettings();
  const { formatDate, formatCurrency } = useFormatters();
  // The same switch as the top bar's: a cookie the server renders by.
  const { locale, change: changeLocale } = useChangeLocale();

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="inline-flex items-center gap-1 bg-muted/40 rounded-full p-1 mb-5 flex-wrap">
        {TABS.map(key => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold ${tab === key ? "bg-card text-primary shadow-soft" : "text-muted-foreground"}`}>{t(`tabs.${key}`)}</button>
        ))}
      </div>

      {tab === "preferences" && (
        <Card className="p-5 max-w-2xl">
          <SectionTitle title={t("preferences")} action={<Btn onClick={() => toast.success(t("applied"))}>{tc("save")}</Btn>} />
          <Field label={t("timezone")}>
            <Select value={settings.timezone} onChange={e => setAppSettings({ timezone: e.target.value })}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </Select>
          </Field>
          <Field label={t("language")}>
            <Select value={locale} onChange={e => { if (isLocale(e.target.value)) changeLocale(e.target.value); }}>
              <option value="en">English (US)</option>
              <option value="bn">বাংলা (Bangla)</option>
            </Select>
          </Field>
          <Field label={t("dateFormat")}>
            <Select value={settings.dateFormat} onChange={e => setAppSettings({ dateFormat: e.target.value })}>
              {DATE_FORMATS.map(f => (
                <option key={f} value={f}>{f} ({formatDate(new Date(), f)})</option>
              ))}
            </Select>
          </Field>
          <Field label={t("currency")}>
            <Select value={settings.currency} onChange={e => setAppSettings({ currency: e.target.value as never })}>
              <option value="USD">USD ($)</option>
              <option value="BDT">{t("taka")} (৳)</option>
              <option value="GBP">{t("pound")} (£)</option>
            </Select>
          </Field>
          <div className="mt-4 rounded-xl bg-muted/40 p-4 text-xs">
            <p className="text-[10px] tracking-widest text-muted-foreground mb-1">{t("livePreview")}</p>
            <p>{t("dateLabel")} <span className="font-semibold text-primary">{formatDate(new Date())}</span></p>
            <p>{t("amountLabel")} <span className="font-semibold text-primary">{formatCurrency(1234.5)}</span></p>
          </div>
        </Card>
      )}

      {tab === "roles" && (
        <Card className="p-5">
          <SectionTitle title={t("rbac")} action={
            <Select value={role} onChange={e => setRole(e.target.value as (typeof ROLES)[number])}>
              {ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </Select>
          } />
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
              <tr><th className="py-2">{t("resource")}</th>{ACTIONS.map(a => <th key={a} className="text-center">{t(`actions.${a}`)}</th>)}</tr>
            </thead>
            <tbody>
              {RESOURCES.map(r => (
                <tr key={r} className="border-t border-border/40">
                  <td className="py-2 font-semibold text-primary">{t(`resources.${r}`)}</td>
                  {ACTIONS.map(a => (
                    <td key={a} className="text-center">
                      <input type="checkbox" aria-label={`${t(`resources.${r}`)} · ${t(`actions.${a}`)}`}
                        defaultChecked={a === "view"} onChange={e => setPerms(p => ({ ...p, [k(r, a)]: e.target.checked }))} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end"><Btn onClick={() => toast.success(t("permissionsSaved", { role: roleLabel(role) }))}>{t("savePermissions")}</Btn></div>
        </Card>
      )}

      {tab === "security" && (
        <Card className="p-5">
          <SectionTitle title={t("securityPosture")} />
          <div className="grid sm:grid-cols-3 gap-4">
            {SECURITY.map(({ key, tone }) => (
              <div key={key} className="rounded-xl bg-muted/40 p-4">
                <p className="font-semibold text-primary">{t(`security.${key}.title`)}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-2">{t(`security.${key}.detail`)}</p>
                <Pill tone={tone as never}>{tone === "ok" ? t("tones.active") : tone === "warn" ? t("tones.attention") : t("tones.info")}</Pill>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "audit" && (
        <Card className="p-5">
          <SectionTitle title={t("recentActivity")} />
          <ul className="space-y-2 text-sm">
            {[
              ["09:42", "hospital_admin", t("activity.createdDoctor")],
              ["09:21", "finance_admin", t("activity.approvedPayroll")],
              ["08:55", "hr_admin", t("activity.approvedLeave")],
              ["08:33", "lab_admin", t("activity.publishedResult")],
            ].map(([time, who, what], i) => (
              <li key={i} className="flex justify-between bg-muted/40 px-4 py-2 rounded-xl">
                <span className="font-mono text-xs text-muted-foreground">{time}</span>
                <span className="font-semibold text-primary">{who}</span>
                <span className="text-foreground/70">{what}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AdminLayout>
  );
};
export default Settings;
