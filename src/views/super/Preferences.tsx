"use client";

import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Btn, Pill } from "@/components/admin/ui";
import { toast } from "sonner";

const Preferences = () => (
  <SuperLayout title="Preferences" subtitle="Personal super-admin settings">
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-5">
        <SectionTitle title="Profile" action={<Btn onClick={() => toast.success("Saved")}>Save</Btn>} />
        <div className="space-y-4 text-sm">
          {[["Display name", "Root Operator"], ["Email", "root@demo.pro"], ["Phone", "+1 (555) 010-0001"]].map(([l, v]) => (
            <div key={l}>
              <p className="text-[10px] tracking-widest text-muted-foreground">{l.toUpperCase()}</p>
              <input defaultValue={v} className="mt-1 w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Security" />
        {[
          ["Two-Factor Auth", "Hardware key + TOTP"],
          ["Session timeout", "15 minutes"],
          ["IP restriction", "Whitelist only"],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl bg-muted/40 p-4 mb-2 flex items-center justify-between">
            <div>
              <p className="font-semibold text-primary text-sm">{t}</p>
              <p className="text-xs text-muted-foreground">{d}</p>
            </div>
            <Pill tone="ok">Active</Pill>
          </div>
        ))}
      </Card>
    </div>
  </SuperLayout>
);
export default Preferences;

