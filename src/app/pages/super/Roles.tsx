'use client';
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Btn, Pill } from "@/components/admin/ui";
import { toast } from "sonner";

const roles = [
  { name: "Super Admin", users: 4, perms: 64, scope: "Platform" },
  { name: "Hospital Admin", users: 48, perms: 42, scope: "Tenant" },
  { name: "HR Admin", users: 38, perms: 18, scope: "Tenant" },
  { name: "Finance Admin", users: 32, perms: 22, scope: "Tenant" },
  { name: "Lab Admin", users: 21, perms: 15, scope: "Tenant" },
  { name: "Pharmacy Admin", users: 19, perms: 14, scope: "Tenant" },
  { name: "Doctor", users: 612, perms: 28, scope: "Clinical" },
  { name: "Patient", users: 11873, perms: 8, scope: "Self" },
];

const Roles = () => (
  <SuperLayout title="User Role Management" subtitle="Granular permissions across the platform">
    <Card className="p-5">
      <SectionTitle title="Roles & Permissions" action={<Btn onClick={() => toast.success("Role created")}>+ New Role</Btn>} />
      <div className="grid md:grid-cols-2 gap-3">
        {roles.map(r => (
          <div key={r.name} className="rounded-xl bg-muted/40 p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-primary">{r.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{r.users.toLocaleString()} users · {r.perms} permissions</p>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone="info">{r.scope}</Pill>
              <Btn variant="ghost" onClick={() => toast.info(`Editing ${r.name}`)}>Configure</Btn>
            </div>
          </div>
        ))}
      </div>
    </Card>
  </SuperLayout>
);
export default Roles;
