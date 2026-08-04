"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle } from "@/components/admin/ui";
import { Field, Select } from "@/components/admin/crud";
import { toast } from "sonner";
import { useAppSettings, setAppSettings, formatDate, formatCurrency } from "@/lib/appSettings";

const tabs = ["Preferences", "Roles", "Security", "Audit"] as const;
type Tab = typeof tabs[number];
const roles = ["Super Admin", "Hospital Admin", "HR Admin", "Finance Admin", "Lab Admin", "Pharmacy Admin"];
const resources = ["Doctors", "Patients", "Lab", "Pharmacy", "Finance", "HR"];
const actions = ["View", "Create", "Edit", "Delete", "Approve"];

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

const Settings = () => {
  const [tab, setTab] = useState<Tab>("Preferences");
  const [role, setRole] = useState(roles[0]);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const k = (r: string, a: string) => `${role}|${r}|${a}`;
  const settings = useAppSettings();

  return (
    <AdminLayout title="Settings" subtitle="Preferences, RBAC, security & audit">
      <div className="inline-flex items-center gap-1 bg-muted/40 rounded-full p-1 mb-5 flex-wrap">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold ${tab === t ? "bg-card text-primary shadow-soft" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      {tab === "Preferences" && (
        <Card className="p-5 max-w-2xl">
          <SectionTitle title="Hospital Preferences" action={<Btn onClick={() => toast.success("Preferences applied site-wide")}>Save</Btn>} />
          <Field label="Timezone">
            <Select value={settings.timezone} onChange={e => setAppSettings({ timezone: e.target.value })}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </Select>
          </Field>
          <Field label="Default Language">
            <Select value={settings.language} onChange={e => setAppSettings({ language: e.target.value })}>
              <option value="en">English (US)</option>
              <option value="bn">বাংলা (Bangla)</option>
            </Select>
          </Field>
          <Field label="Date Format">
            <Select value={settings.dateFormat} onChange={e => setAppSettings({ dateFormat: e.target.value })}>
              {DATE_FORMATS.map(f => (
                <option key={f} value={f}>{f} ({formatDate(new Date(), { ...settings, dateFormat: f })})</option>
              ))}
            </Select>
          </Field>
          <Field label="Currency">
            <Select value={settings.currency} onChange={e => setAppSettings({ currency: e.target.value as never })}>
              <option value="USD">USD ($)</option>
              <option value="BDT">Taka (৳)</option>
              <option value="GBP">Pound (£)</option>
            </Select>
          </Field>
          <div className="mt-4 rounded-xl bg-muted/40 p-4 text-xs">
            <p className="text-[10px] tracking-widest text-muted-foreground mb-1">LIVE PREVIEW</p>
            <p>Date: <span className="font-semibold text-primary">{formatDate(new Date(), settings)}</span></p>
            <p>Amount: <span className="font-semibold text-primary">{formatCurrency(1234.5, settings)}</span></p>
          </div>
        </Card>
      )}

      {tab === "Roles" && (
        <Card className="p-5">
          <SectionTitle title="Role-Based Access Control" action={<Select value={role} onChange={e => setRole(e.target.value)}>{roles.map(r => <option key={r}>{r}</option>)}</Select>} />
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
              <tr><th className="py-2">Resource</th>{actions.map(a => <th key={a} className="text-center">{a}</th>)}</tr>
            </thead>
            <tbody>
              {resources.map(r => (
                <tr key={r} className="border-t border-border/40">
                  <td className="py-2 font-semibold text-primary">{r}</td>
                  {actions.map(a => (
                    <td key={a} className="text-center">
                      <input type="checkbox" defaultChecked={a === "View"} onChange={e => setPerms(p => ({ ...p, [k(r, a)]: e.target.checked }))} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end"><Btn onClick={() => toast.success(`Permissions for ${role} saved`)}>Save Permissions</Btn></div>
        </Card>
      )}

      {tab === "Security" && (
        <Card className="p-5">
          <SectionTitle title="Security Posture" />
          <div className="grid sm:grid-cols-3 gap-4">
            {[["Two-Factor Auth", "Enforced for all admins", "ok"], ["Session Timeout", "30 minutes inactivity", "ok"], ["Audit Logging", "All actions tracked", "ok"], ["Password Policy", "12+ chars, mixed case", "ok"], ["IP Allowlist", "3 ranges configured", "info"], ["Failed Logins (24h)", "5 attempts blocked", "warn"]].map(([t, d, tone]) => (
              <div key={t} className="rounded-xl bg-muted/40 p-4">
                <p className="font-semibold text-primary">{t}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-2">{d}</p>
                <Pill tone={tone as never}>{tone === "ok" ? "Active" : tone === "warn" ? "Attention" : "Info"}</Pill>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "Audit" && (
        <Card className="p-5">
          <SectionTitle title="Recent Admin Activity" />
          <ul className="space-y-2 text-sm">
            {[
              ["09:42", "hospital_admin", "Created doctor record Dr. Karim"],
              ["09:21", "finance_admin", "Approved payroll PR-2026-04"],
              ["08:55", "hr_admin", "Approved leave LV-2"],
              ["08:33", "lab_admin", "Published result for L-1004"],
            ].map(([t, u, a], i) => (
              <li key={i} className="flex justify-between bg-muted/40 px-4 py-2 rounded-xl">
                <span className="font-mono text-xs text-muted-foreground">{t}</span>
                <span className="font-semibold text-primary">{u}</span>
                <span className="text-foreground/70">{a}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AdminLayout>
  );
};
export default Settings;

