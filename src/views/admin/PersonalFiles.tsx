"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import type { PersonalFileRow } from "@/redux/api/resources";

/**
 * Folders offered by the form. Free text in the database (0062) — a hospital
 * that files its paperwork differently can still store it; this list only
 * stops the same folder being typed two ways.
 */
const FOLDERS = ["Contracts", "Licenses", "Policies", "Confidential", "HR", "Other"];

/** Stored lowercase, like every other status in the schema. */
const FILE_STATUSES = ["active", "draft", "archived"] as const;

/** 740 KB rather than 757760. Binary units, which is what a file manager shows. */
const humanSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
};

const Page = () => {
  const t = useTranslations("admin.personalFiles");
  const { formatDate } = useFormatters();
  const statusLabel = (value: string) =>
    (FILE_STATUSES as readonly string[]).includes(value)
      ? t(`statuses.${value as (typeof FILE_STATUSES)[number]}`)
      : value;
  const statuses = FILE_STATUSES.map(value => ({ value, label: statusLabel(value) }));

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<PersonalFileRow> config={{
        storeKey: "personal-files",
        resource: "personal-files",
        searchFields: ["title", "folder", "owner"],
        statuses,
        columns: [
          { key: "folder", label: t("columns.folder"), sortable: true, accessor: r => r.folder },
          {
            key: "title", label: t("columns.file"), sortable: true, accessor: r => r.title,
            render: r => (
              // Never the bucket's public address — /api/v1/documents checks
              // the caller and hands back a link good for a minute.
              r.file_key
                ? <a href={`/api/v1/documents?key=${encodeURIComponent(r.file_key)}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
                    <FileText className="h-3.5 w-3.5 shrink-0" />{r.title}
                  </a>
                : <span className="font-semibold text-primary">{r.title}</span>
            ),
          },
          { key: "owner", label: t("columns.owner"), render: r => <span>{r.owner || "—"}</span> },
          { key: "size_bytes", label: t("columns.size"), sortable: true, accessor: r => String(r.size_bytes ?? ""), render: r => <span>{humanSize(r.size_bytes)}</span> },
          { key: "updated_at", label: t("columns.updated"), sortable: true, accessor: r => r.updated_at, render: r => <span>{formatDate(r.updated_at)}</span> },
          { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill> },
        ],
        fields: [
          { name: "folder", label: t("fields.folder"), type: "select", options: FOLDERS },
          { name: "title", label: t("fields.title"), type: "text", required: true },
          { name: "owner", label: t("fields.owner"), type: "text" },
          // The size posts itself from the upload — see sizeField.
          {
            name: "file_key", label: t("fields.document"), type: "document", sizeField: "size_bytes",
            hint: t("documentHint"),
          },
          { name: "status", label: t("fields.status"), type: "select", options: statuses },
          { name: "notes", label: t("fields.notes"), type: "textarea" },
        ],
      }} />
    </AdminLayout>
  );
};

export default Page;
