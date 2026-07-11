"use client";

import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Btn, Pill } from "@/components/admin/ui";
import { toast } from "sonner";

const Field = ({ l, v }: { l: string; v: string }) => (
  <div>
    <p className="text-[10px] tracking-widest text-muted-foreground">{l.toUpperCase()}</p>
    <input defaultValue={v} className="mt-1 w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
  </div>
);

const GlobalSettings = () => (
  <SuperLayout title="Global Settings" subtitle="Platform-wide configuration">
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-5">
        <SectionTitle title="Platform Identity" action={<Btn onClick={() => toast.success("Saved")}>Save</Btn>} />
        <div className="space-y-4">
          <Field l="Brand name" v="HealthFlow" />
          <Field l="Support email" v="support@healthflow.pro" />
          <Field l="Default timezone" v="UTC" />
          <Field l="Default currency" v="USD" />
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Feature Flags" />
        <div className="space-y-2">
          {[
            ["AI Chatbot", true], ["Voice Telehealth", true], ["Public Blog", true],
            ["Self-service signup", false], ["Beta: Predictive Bed AI", true],
          ].map(([k, on]) => (
            <div key={k as string} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
              <span className="font-semibold text-primary text-sm">{k as string}</span>
              <Pill tone={on ? "ok" : "default"}>{on ? "Enabled" : "Disabled"}</Pill>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <SectionTitle title="Compliance & Region" />
        <div className="grid sm:grid-cols-3 gap-4">
          <Field l="Data residency" v="us-east-1" />
          <Field l="GDPR mode" v="Enabled" />
          <Field l="HIPAA logging" v="Strict" />
        </div>
      </Card>
    </div>
  </SuperLayout>
);
export default GlobalSettings;

