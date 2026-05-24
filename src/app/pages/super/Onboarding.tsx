'use client';
import { useState } from "react";
import { Eye, EyeOff, Copy } from "lucide-react";
import { toast } from "sonner";
import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { provisionTenant } from "@/lib/tenants";

type O = {
  id: string; hospital: string; plan: string; contact: string;
  stage: string; status: string; username?: string; password?: string; createdAt?: string;
};

const seed: O[] = [
  { id: "o1", hospital: "Northstar Medical", plan: "Enterprise", contact: "ceo@northstar.com", stage: "KYC", status: "Pending", username: "admin.northstar421", password: "Ab3!kQ9mNz2P" },
  { id: "o2", hospital: "Wellbeing Centre", plan: "Pro", contact: "ops@wellbeing.com", stage: "Contract", status: "Pending", username: "admin.wellbeing188", password: "Yp7@nR4kLq8X" },
  { id: "o3", hospital: "Sunrise Clinic", plan: "Starter", contact: "admin@sunrise.com", stage: "Live", status: "Approved", username: "admin.sunrise902", password: "Mz9#tJ3pVx5Q" },
];

const PasswordCell = ({ value }: { value?: string }) => {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-muted-foreground">—</span>;
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    toast.success("Password copied");
  };
  return (
    <div className="inline-flex items-center gap-1.5">
      <code className="font-mono text-xs">{show ? value : "••••••••"}</code>
      <button onClick={(e) => { e.stopPropagation(); setShow(s => !s); }}
        className="p-1 rounded hover:bg-muted" title={show ? "Hide" : "Show"}>
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button onClick={copy} className="p-1 rounded hover:bg-muted" title="Copy">
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const handleApproved = (row: O) => {
  if (row.status !== "Approved") return;
  if (!row.username || !row.password) {
    toast.error("Missing credentials", { description: "User ID or password not set on this entry." });
    return;
  }
  const t = provisionTenant({
    hospital: row.hospital,
    username: row.username,
    password: row.password,
    plan: row.plan,
    contact: row.contact,
  });
  toast.success("Hospital admin panel provisioned", {
    description: `${t.hospital} added to whitelist · login enabled at /signin`,
  });
};

const Page = () => (
  <SuperLayout title="Onboarding Queue" subtitle="New tenants pipeline & login credentials">
    <ResourcePage<O> config={{
      storeKey: "onboarding", seed, searchFields: ["hospital", "contact", "username"],
      statuses: ["Pending", "Approved", "Rejected"],
      onUpdate: handleApproved,
      columns: [
        { key: "hospital", label: "Hospital", sortable: true, accessor: r => r.hospital, render: r => <span className="font-semibold text-primary">{r.hospital}</span> },
        { key: "plan", label: "Plan" },
        { key: "contact", label: "Contact" },
        { key: "username", label: "User ID", render: r => <code className="font-mono text-xs">{r.username || "—"}</code> },
        { key: "password", label: "Password", render: r => <PasswordCell value={r.password} /> },
        { key: "stage", label: "Stage" },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "hospital", label: "Hospital", type: "text", required: true },
        { name: "plan", label: "Plan", type: "select", options: ["Starter", "Pro", "Enterprise"] },
        { name: "contact", label: "Contact email", type: "email" },
        { name: "username", label: "Admin user ID", type: "text" },
        { name: "password", label: "Admin password", type: "text" },
        { name: "stage", label: "Stage", type: "select", options: ["KYC", "Contract", "Provisioning", "Live"] },
        { name: "status", label: "Status", type: "select", options: ["Pending", "Approved", "Rejected"] },
      ],
    }} />
  </SuperLayout>
);
export default Page;
