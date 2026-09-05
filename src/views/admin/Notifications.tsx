"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle } from "@/components/admin/ui";
import { Chips } from "@/components/admin/crud";
import { useNotifications, type Notif } from "@/components/admin/NotificationProvider";
import { formatDistanceToNow } from "date-fns";
import {
  BedDouble, LogOut, ArrowRightLeft, CalendarCheck, ClipboardList, CheckCircle2,
  FileText, Receipt, FlaskConical, PackageMinus, Bell,
} from "lucide-react";

/**
 * The hospital's notice board (0073), not this browser's toast history.
 *
 * A row here was written by whoever did the thing and is visible to every
 * admin in the hospital; the unread mark is each person's own, so clearing
 * yours leaves your colleague's alone. Anything still local to this tab — the
 * "Saved" acknowledgements push() raises — is shown too, marked as such,
 * because it is genuinely a different kind of thing.
 */

/** The icon for each kind the app raises. Falls back for anything newer. */
const KIND_ICON: Record<string, typeof Bell> = {
  "patient.admitted": BedDouble,
  "patient.discharged": LogOut,
  "patient.transferred": ArrowRightLeft,
  "appointment.booked": CalendarCheck,
  "requisition.raised": ClipboardList,
  "requisition.approved": CheckCircle2,
  "work_order.created": FileText,
  "invoice.paid": Receipt,
  "certificate.issued": FileText,
  "lab.result_ready": FlaskConical,
  "stock.low": PackageMinus,
};

/**
 * Where a notification's subject lives in the panel. Only the entity types the
 * app actually stamps appear here; anything else renders unlinked rather than
 * guessing a URL that 404s.
 */
const ENTITY_HREF: Record<string, string> = {
  admissions: "/admin/admissions",
  appointments: "/admin/appointments",
  procurement_requisitions: "/admin/procurement",
  work_orders: "/admin/procurement",
  finance_invoices: "/admin/invoices",
  certificates: "/admin/administration",
  lab_orders: "/admin/laboratory",
  pharmacy_items: "/admin/pharmacy",
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "feed", label: "Hospital" },
  { value: "local", label: "This device" },
] as const;

const NotificationRow = ({ n }: { n: Notif }) => {
  const Icon = (n.kind && KIND_ICON[n.kind]) || Bell;
  const href = n.entityType ? ENTITY_HREF[n.entityType] : undefined;

  const inner = (
    <div className={`flex items-start gap-4 rounded-xl p-4 transition ${
      n.read ? "bg-muted/30" : "bg-card border border-border/60 shadow-soft"
    } ${href ? "hover:border-primary/50" : ""}`}>
      <div className={`h-9 w-9 shrink-0 rounded-xl grid place-items-center ${
        n.tone === "bad" ? "bg-destructive/10 text-destructive"
          : n.tone === "warn" ? "bg-yellow-100 text-yellow-800"
          : n.tone === "ok" ? "bg-accent/40 text-primary"
          : "bg-muted text-muted-foreground"
      }`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className={`${n.read ? "font-medium text-foreground/80" : "font-semibold text-primary"}`}>
            {n.title}
          </p>
          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-glow" />}
        </div>
        {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(n.ts, { addSuffix: true })}
          </span>
          {!n.persisted && (
            // Worth saying out loud: this one is not on the notice board, so a
            // colleague is not seeing it and it will not survive this browser.
            <Pill tone="default">This device only</Pill>
          )}
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href} className="block">{inner}</Link> : inner;
};

const Notifications = () => {
  const { items, unread, isLoading, markAllRead, clear } = useNotifications();
  const [filter, setFilter] = useState<string>("all");

  const rows = useMemo(() => items.filter(n => {
    if (filter === "unread") return !n.read;
    if (filter === "feed") return n.persisted;
    if (filter === "local") return !n.persisted;
    return true;
  }), [items, filter]);

  const localCount = items.filter(n => !n.persisted).length;

  return (
    <AdminLayout
      title="Notifications"
      subtitle="What happened in this hospital, and what you have not read yet"
    >
      <Card className="p-5">
        <SectionTitle
          title={unread ? `${unread} unread` : "All caught up"}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Chips value={filter} onChange={setFilter} options={FILTERS as unknown as { value: string; label: string }[]} />
              <Btn variant="outline" onClick={markAllRead} disabled={!unread}>Mark all read</Btn>
              {/* Only the local ones can be cleared — the hospital's feed is
                  not one person's to erase for everybody else. */}
              <Btn variant="ghost" onClick={clear} disabled={!localCount}>
                Clear this device
              </Btn>
            </div>
          }
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {rows.map(n => <li key={n.id}><NotificationRow n={n} /></li>)}
            {!rows.length && (
              <p className="text-sm text-muted-foreground text-center py-12">
                {filter === "unread" ? "Nothing unread." : "Nothing here yet."}
              </p>
            )}
          </ul>
        )}
      </Card>
    </AdminLayout>
  );
};

export default Notifications;
