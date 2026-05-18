'use client';
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Pill, Btn } from "@/components/admin/ui";
import { toast } from "sonner";

const items = [
  { n: "Stripe", d: "Subscription billing & payments", on: true },
  { n: "Twilio", d: "SMS notifications & OTP", on: true },
  { n: "SendGrid", d: "Transactional email", on: true },
  { n: "Google Calendar", d: "Doctor schedule sync", on: false },
  { n: "Zoom", d: "Telehealth video sessions", on: true },
  { n: "AWS S3", d: "Medical records storage", on: true },
];

const Integrations = () => (
  <SuperLayout title="Integrations" subtitle="Third-party services & APIs">
    <Card className="p-5">
      <SectionTitle title="Connected Services" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(i => (
          <div key={i.n} className="rounded-xl bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-primary">{i.n}</p>
              <Pill tone={i.on ? "ok" : "default"}>{i.on ? "Connected" : "Off"}</Pill>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{i.d}</p>
            <Btn variant="ghost" className="mt-3" onClick={() => toast.info(`Configuring ${i.n}`)}>Configure</Btn>
          </div>
        ))}
      </div>
    </Card>
  </SuperLayout>
);
export default Integrations;
