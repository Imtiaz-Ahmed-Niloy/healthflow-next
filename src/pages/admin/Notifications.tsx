"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Pill, SectionTitle } from "@/components/admin/ui";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { formatDistanceToNow } from "date-fns";
import { Btn } from "@/components/admin/ui";

const Notifications = () => {
  const { items, markAllRead, clear } = useNotifications();
  return (
    <AdminLayout title="Notifications" subtitle="System-wide alerts & activity feed">
      <Card className="p-5">
        <SectionTitle title={`${items.length} notifications`} action={<div className="flex gap-2">
          <Btn variant="outline" onClick={markAllRead}>Mark all read</Btn>
          <Btn variant="danger" onClick={clear}>Clear all</Btn>
        </div>} />
        <ul className="space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No notifications</p>}
          {items.map(n => (
            <li key={n.id} className={`rounded-xl p-4 ${n.read ? "bg-muted/30" : "bg-card border border-border/60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-primary">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(n.ts, { addSuffix: true })}</p>
                </div>
                <Pill tone={(n.tone || "default") as never}>{n.tone || "info"}</Pill>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </AdminLayout>
  );
};
export default Notifications;

