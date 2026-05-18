'use client';
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, Kpi, SectionTitle, Btn, Pill } from "@/components/admin/ui";
import { Receipt, Wallet, AlertCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const invoices = [
  { id: "INV-20406", tenant: "Greenfield Hospital", amt: 1999, due: "May 12", status: "paid" },
  { id: "INV-20405", tenant: "Sunrise Clinic Group", amt: 499, due: "May 10", status: "paid" },
  { id: "INV-20404", tenant: "Metro Diagnostics", amt: 499, due: "May 02", status: "overdue" },
  { id: "INV-20403", tenant: "Wellbeing Centre", amt: 99, due: "Apr 30", status: "pending" },
  { id: "INV-20402", tenant: "Northstar Medical", amt: 1999, due: "Apr 28", status: "paid" },
];
const tone = (s: string) => s === "paid" ? "ok" : s === "overdue" ? "bad" : "warn";

const Billing = () => (
  <SuperLayout title="Billing" subtitle="Subscription invoices across tenants">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Kpi icon={Wallet} label="Collected (MTD)" value="$184K" trend="+12%" />
      <Kpi icon={Receipt} label="Outstanding" value="$12.4K" tone="chip" />
      <Kpi icon={AlertCircle} label="Overdue" value="$3.1K" tone="destructive" />
      <Kpi icon={TrendingUp} label="ARR Forecast" value="$2.98M" tone="accent" />
    </div>

    <Card className="p-5 mt-6">
      <SectionTitle title="Recent Invoices" action={<Btn variant="outline" onClick={() => toast.success("Exported")}>Export</Btn>} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
            <tr><th className="py-2">Invoice</th><th>Tenant</th><th>Amount</th><th>Due</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {invoices.map(i => (
              <tr key={i.id} className="border-t border-border/40">
                <td className="py-3 font-mono text-xs text-primary font-semibold">{i.id}</td>
                <td>{i.tenant}</td>
                <td>${i.amt.toLocaleString()}</td>
                <td className="text-muted-foreground">{i.due}</td>
                <td><Pill tone={tone(i.status) as never}>{i.status}</Pill></td>
                <td><Btn variant="ghost" onClick={() => toast.info(i.id)}>View</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </SuperLayout>
);
export default Billing;
