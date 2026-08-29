"use client";

import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import type { ContactMessageRow } from "@/redux/api/resources";

/**
 * Matches the check constraint on contact_messages.status in 0031. Stored
 * lowercase, so the value is not what a human should read — hence
 * { value, label } rather than plain strings.
 */
const STATUSES = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];

const statusLabel = (value: string) =>
  STATUSES.find(s => s.value === value)?.label ?? value;

/**
 * Dates arrive as ISO strings from PostgREST. Rendered in the viewer's locale
 * rather than the hospital's, because this inbox belongs to the platform.
 */
const formatReceived = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

/** Enough of the message to recognise it in a row; the drawer shows all of it. */
const preview = (text: string) =>
  text.length > 90 ? `${text.slice(0, 90).trimEnd()}…` : text;

const Page = () => (
  <SuperLayout title="Contact Messages" subtitle="Enquiries submitted through the public contact form">
    <ResourcePage<ContactMessageRow> config={{
      storeKey: "super-contact-messages",
      resource: "contact-messages",
      exportName: "contact-messages",
      addLabel: "Log Message",

      searchFields: ["name", "email", "subject", "message"],
      statuses: STATUSES,

      columns: [
        { key: "created_at", label: "Received", sortable: true, accessor: r => r.created_at,
          render: r => <span className="text-xs whitespace-nowrap">{formatReceived(r.created_at)}</span> },
        { key: "name", label: "From", sortable: true, accessor: r => r.name,
          render: r => (
            <div>
              <div className="font-semibold text-primary">{r.name}</div>
              <a href={`mailto:${r.email}`} className="text-xs text-primary-glow hover:underline">{r.email}</a>
            </div>
          ) },
        { key: "subject", label: "Subject", sortable: true, accessor: r => r.subject },
        { key: "message", label: "Message", render: r => <span className="text-xs">{preview(r.message)}</span> },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
      ],

      /**
       * Editable so the inbox can be triaged, and so an enquiry that arrived by
       * phone can be logged in the same place. The sender's own words are
       * editable too — a typo in an address is worth fixing when you are the
       * one who has to reply to it.
       */
      fields: [
        { name: "name", label: "Full name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "subject", label: "Subject", type: "text", required: true },
        { name: "message", label: "Message", type: "textarea", required: true, fullWidth: true },
        { name: "status", label: "Status", type: "select", options: STATUSES },
      ],
    }} />
  </SuperLayout>
);

export default Page;
