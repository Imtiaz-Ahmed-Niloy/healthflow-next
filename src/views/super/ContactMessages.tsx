"use client";

import { useLocale, useTranslations } from "next-intl";
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
const STATUSES = ["new", "read", "replied", "archived"] as const;

/**
 * Dates arrive as ISO strings from PostgREST. Rendered in the viewer's
 * language rather than the hospital's settings, because this inbox belongs to
 * the platform.
 */
const formatReceived = (iso: string, locale: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US", { dateStyle: "medium", timeStyle: "short" });
};

/** Enough of the message to recognise it in a row; the drawer shows all of it. */
const preview = (text: string) =>
  text.length > 90 ? `${text.slice(0, 90).trimEnd()}…` : text;

const Page = () => {
  const t = useTranslations("super.contactMessages");
  const locale = useLocale();
  const statusLabel = (value: string) =>
    (STATUSES as readonly string[]).includes(value) ? t(`statuses.${value as (typeof STATUSES)[number]}`) : value;
  const statuses = STATUSES.map(value => ({ value, label: statusLabel(value) }));

  return (
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<ContactMessageRow> config={{
        storeKey: "super-contact-messages",
        resource: "contact-messages",
        exportName: "contact-messages",
        addLabel: t("add"),

        searchFields: ["name", "email", "subject", "message"],
        statuses,

        columns: [
          { key: "created_at", label: t("columns.received"), sortable: true, accessor: r => r.created_at,
            render: r => <span className="text-xs whitespace-nowrap">{formatReceived(r.created_at, locale)}</span> },
          { key: "name", label: t("columns.from"), sortable: true, accessor: r => r.name,
            render: r => (
              <div>
                <div className="font-semibold text-primary">{r.name}</div>
                <a href={`mailto:${r.email}`} className="text-xs text-primary-glow hover:underline">{r.email}</a>
              </div>
            ) },
          { key: "subject", label: t("columns.subject"), sortable: true, accessor: r => r.subject },
          { key: "message", label: t("columns.message"), render: r => <span className="text-xs">{preview(r.message)}</span> },
          { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
        ],

        /**
         * Editable so the inbox can be triaged, and so an enquiry that arrived by
         * phone can be logged in the same place. The sender's own words are
         * editable too — a typo in an address is worth fixing when you are the
         * one who has to reply to it.
         */
        fields: [
          { name: "name", label: t("fields.name"), type: "text", required: true },
          { name: "email", label: t("fields.email"), type: "email", required: true },
          { name: "subject", label: t("columns.subject"), type: "text", required: true },
          { name: "message", label: t("columns.message"), type: "textarea", required: true, fullWidth: true },
          { name: "status", label: t("columns.status"), type: "select", options: statuses },
        ],
      }} />
    </SuperLayout>
  );
};

export default Page;
