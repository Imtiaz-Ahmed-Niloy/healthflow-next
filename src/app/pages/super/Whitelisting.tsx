'use client';
import { useEffect, useState } from "react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Btn, Pill } from "@/components/admin/ui";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getWhitelist, setWhitelist, type WhitelistEntry } from "@/lib/tenants";

const seed: WhitelistEntry[] = [
  { v: "203.0.113.0/24", type: "IP Range", note: "Greenfield HQ", status: "active" },
  { v: "*.partner-lab.com", type: "Domain", note: "Partner labs API", status: "active" },
  { v: "198.51.100.42", type: "IP", note: "Auditor", status: "pending" },
];

const Whitelisting = () => {
  const [list, setList] = useState<WhitelistEntry[]>(() => getWhitelist(seed));
  const [val, setVal] = useState("");

  useEffect(() => { setWhitelist(list); }, [list]);

  // Refresh when other tabs/pages provision tenants
  useEffect(() => {
    const sync = () => setList(getWhitelist(seed));
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return (
    <SuperLayout title="Whitelisting" subtitle="Approved IPs, domains & integrations">
      <Card className="p-5">
        <SectionTitle title="Allowlist" />
        <div className="flex gap-2 mb-4">
          <input value={val} onChange={e => setVal(e.target.value)} placeholder="IP, range or domain"
            className="flex-1 bg-muted/40 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
          <Btn onClick={() => { if (!val) return; setList([{ v: val, type: "Custom", note: "Manually added", status: "active" }, ...list]); setVal(""); toast.success("Added"); }}>Add</Btn>
        </div>
        <ul className="space-y-2">
          {list.map((i, idx) => (
            <li key={`${i.v}-${idx}`} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
              <div>
                <p className="font-mono text-sm text-primary">{i.v}</p>
                <p className="text-xs text-muted-foreground">{i.type} · {i.note}</p>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={i.status === "active" ? "ok" : "warn"}>{i.status}</Pill>
                <button onClick={() => { setList(list.filter((_, k) => k !== idx)); toast.success("Removed"); }} className="text-destructive p-2"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </SuperLayout>
  );
};
export default Whitelisting;
