'use client';
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Pill, Btn } from "@/components/admin/ui";
import { toast } from "sonner";

const logs = [
  { ts: "2026-05-06 09:42", user: "root@demo.pro", action: "Hospital created", target: "Northstar Medical", level: "info" },
  { ts: "2026-05-06 09:21", user: "mgmt@greenfield", action: "Role permission changed", target: "HR Admin", level: "warn" },
  { ts: "2026-05-06 08:58", user: "system", action: "Failed login attempts (5)", target: "203.0.113.42", level: "bad" },
  { ts: "2026-05-06 08:33", user: "billing-bot", action: "Invoice generated", target: "INV-20406", level: "ok" },
  { ts: "2026-05-06 07:14", user: "root@demo.pro", action: "Package updated", target: "Pro Plan", level: "info" },
];
const tone = (l: string) => l === "bad" ? "bad" : l === "warn" ? "warn" : l === "ok" ? "ok" : "info";

const Logs = () => (
  <SuperLayout title="Log Reports" subtitle="System audit trail & security events">
    <Card className="p-5">
      <SectionTitle title="Recent Events" action={<Btn variant="outline" onClick={() => toast.success("Exported CSV")}>Export</Btn>} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
            <tr><th className="py-2">Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Severity</th></tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} className="border-t border-border/40">
                <td className="py-3 font-mono text-xs">{l.ts}</td>
                <td className="font-semibold text-primary">{l.user}</td>
                <td>{l.action}</td>
                <td className="text-muted-foreground">{l.target}</td>
                <td><Pill tone={tone(l.level) as never}>{l.level.toUpperCase()}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </SuperLayout>
);
export default Logs;
