'use client';
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Pill } from "@/components/admin/ui";

const trail = [
  { ts: "2026-05-06 09:42:11", who: "root@demo.pro", what: "tenant.create", target: "Northstar Medical", ip: "203.0.113.4" },
  { ts: "2026-05-06 09:21:02", who: "mgmt@greenfield", what: "role.update", target: "HR Admin", ip: "198.51.100.7" },
  { ts: "2026-05-06 08:33:55", who: "billing-bot", what: "invoice.create", target: "INV-20406", ip: "—" },
  { ts: "2026-05-06 07:14:18", who: "root@demo.pro", what: "package.update", target: "Pro Plan", ip: "203.0.113.4" },
];
const Page = () => (
  <SuperLayout title="Audit Trail" subtitle="Immutable record of admin actions">
    <Card className="p-5">
      <SectionTitle title="All actions" />
      <div className="overflow-x-auto"><table className="w-full text-sm min-w-[700px]">
        <thead className="text-left text-[10px] tracking-widest text-muted-foreground"><tr><th className="py-2">Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>IP</th></tr></thead>
        <tbody>{trail.map((t, i) => (
          <tr key={i} className="border-t border-border/40">
            <td className="py-3 font-mono text-xs">{t.ts}</td>
            <td className="font-semibold text-primary">{t.who}</td>
            <td><Pill tone="info">{t.what}</Pill></td>
            <td>{t.target}</td>
            <td className="font-mono text-xs text-muted-foreground">{t.ip}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </Card>
  </SuperLayout>
);
export default Page;
